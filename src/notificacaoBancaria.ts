// Notificação bancária (09/09/2026) — lado JS da leitura de notificações do
// app do banco/cartão. O lado nativo (Android) está em
// `plugins/notificacao-bancaria/` (NotificationListenerService + plugin
// Capacitor). Fluxo completo:
//
//   app do banco posta notificação
//     → Android entrega ao serviço nativo do MorfoFinP (com "Acesso a
//       notificações" ligado pela pessoa em Configurações)
//     → serviço filtra (texto com "R$"), guarda numa fila nativa persistente
//       e avisa a pessoa ("Movimentação detectada — toque pra confirmar")
//     → quando o app está aberto: evento `notificacaoRecebida` chega aqui na
//       hora; quando estava fechado: ao abrir, `sincronizarPendentesNativas()`
//       lê a fila nativa
//     → cada item vira um `NotificacaoPendente` no Dexie (status 'pendente')
//     → tela "Notificações bancárias": Confirmar (abre o formulário de
//       lançamento já preenchido, `descricaoOriginal` = texto cru) ou Descartar
//
// NUNCA grava lançamento sozinho. Só funciona de verdade no app Android
// instalado (`.apk`); no navegador (`MorfoFinP.html`, dev server) o plugin
// não existe — `ehNativo()` é false e as funções nativas viram no-op, mas a
// tela e o fluxo Dexie continuam funcionando (dá pra testar com a
// "notificação de teste", ferramenta de MVP — ver BACKLOG.md item 030).
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import { db, type NotificacaoPendente } from './db'
import { marcaDoAmbiente } from './ambiente'

interface ItemNativo {
  id: string
  pacote: string
  app: string
  titulo: string
  texto: string
  recebidoEm: number // epoch ms
}

interface NotificacaoBancariaPlugin {
  verificarAcesso(): Promise<{ concedido: boolean }>
  abrirConfiguracaoAcesso(): Promise<void>
  verificarPermissaoAviso(): Promise<{ concedida: boolean }>
  solicitarPermissaoAviso(): Promise<{ concedida: boolean }>
  obterPendentes(): Promise<{ itens: ItemNativo[] }>
  confirmarRecebidas(opcoes: { ids: string[] }): Promise<void>
  definirPacotesIgnorados(opcoes: { pacotes: string[] }): Promise<void>
  obterPacotesIgnorados(): Promise<{ pacotes: string[] }>
  addListener(evento: 'notificacaoRecebida', cb: (item: ItemNativo) => void): Promise<PluginListenerHandle>
}

const Nativo = registerPlugin<NotificacaoBancariaPlugin>('NotificacaoBancaria')

/** true só dentro do app Android/iOS empacotado pelo Capacitor. */
export function ehNativo(): boolean {
  return Capacitor.isNativePlatform()
}

// --- Leitura do texto (heurística, sempre confirmada pela pessoa) ---

// "R$ 1.234,56" / "R$1234,56" / "R$ 50" → número positivo. Pega o PRIMEIRO
// valor do texto — em notificação de banco é quase sempre o da transação.
export function extrairValor(texto: string): number | undefined {
  const m = /R\$\s*([\d.]+)(?:,(\d{1,2}))?/.exec(texto)
  if (!m) return undefined
  const inteiro = m[1].replace(/\./g, '')
  const centavos = (m[2] ?? '0').padEnd(2, '0')
  const n = Number(`${inteiro}.${centavos}`)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

// Palpite de entrada × saída pelas palavras do texto. Saída é o padrão
// (a grande maioria das notificações de banco/cartão é compra/débito).
const PALAVRAS_ENTRADA = /\b(recebeu|recebido|recebida|recebimento|cr[eé]dito em conta|creditad[oa]|dep[oó]sito|entrada|estorno|reembolso|pix recebido|voc[eê] recebeu)\b/i
export function inferirTipo(texto: string): 'saida' | 'entrada' {
  return PALAVRAS_ENTRADA.test(texto) ? 'entrada' : 'saida'
}

// --- Fila nativa → Dexie ---

function paraPendente(item: ItemNativo): NotificacaoPendente {
  const textoCompleto = [item.titulo, item.texto].filter(Boolean).join(' — ')
  return {
    idNativo: item.id,
    pacote: item.pacote,
    app: item.app || item.pacote,
    titulo: item.titulo ?? '',
    texto: item.texto ?? '',
    recebidoEm: new Date(item.recebidoEm || Date.now()).toISOString(),
    valor: extrairValor(textoCompleto),
    tipo: inferirTipo(textoCompleto),
    status: 'pendente',
  }
}

/** Grava no Dexie se ainda não existir (dedupe por `idNativo`). Retorna true se gravou. */
export async function registrarNotificacao(item: ItemNativo): Promise<boolean> {
  const jaExiste = await db.notificacoesPendentes.where('idNativo').equals(item.id).count()
  if (jaExiste > 0) return false
  await db.notificacoesPendentes.add({ ...paraPendente(item), ...marcaDoAmbiente() })
  return true
}

/**
 * Lê tudo que o serviço nativo capturou enquanto o app estava fechado, grava
 * no Dexie e SÓ DEPOIS apaga da fila nativa — se o app fechar no meio, o
 * item continua na fila e entra na próxima abertura (nunca se perde).
 * No navegador não faz nada (retorna 0).
 */
export async function sincronizarPendentesNativas(): Promise<number> {
  if (!ehNativo()) return 0
  const { itens } = await Nativo.obterPendentes()
  if (!itens || itens.length === 0) return 0
  let novas = 0
  for (const it of itens) {
    if (await registrarNotificacao(it)) novas++
  }
  await Nativo.confirmarRecebidas({ ids: itens.map((i) => i.id) })
  return novas
}

/** Recebe ao vivo enquanto o app está aberto. Retorna função pra parar de ouvir. */
export async function ouvirNotificacoesAoVivo(): Promise<() => void> {
  if (!ehNativo()) return () => {}
  const handle = await Nativo.addListener('notificacaoRecebida', (item) => {
    // A mesma notificação também fica na fila nativa — `registrarNotificacao`
    // ignora a duplicata pelo `idNativo` quando `sincronizarPendentesNativas`
    // rodar de novo.
    registrarNotificacao(item).then((nova) => {
      if (nova) Nativo.confirmarRecebidas({ ids: [item.id] })
    })
  })
  return () => { handle.remove() }
}

// --- Permissões / configuração (só nativo) ---

export async function acessoConcedido(): Promise<boolean> {
  if (!ehNativo()) return false
  const r = await Nativo.verificarAcesso()
  return !!r?.concedido
}

export async function abrirConfiguracaoAcesso(): Promise<void> {
  if (!ehNativo()) return
  await Nativo.abrirConfiguracaoAcesso()
}

/* Só CONFERE (não abre diálogo nenhum) — usada pelo popup de permissões e
   pela tela de Notificações bancárias pra mostrar ligado/desligado. */
export async function avisoConcedido(): Promise<boolean> {
  if (!ehNativo()) return false
  try {
    const r = await Nativo.verificarPermissaoAviso()
    return !!r?.concedida
  } catch {
    return false
  }
}

export async function solicitarPermissaoAviso(): Promise<boolean> {
  if (!ehNativo()) return false
  const r = await Nativo.solicitarPermissaoAviso()
  return !!r?.concedida
}

export async function obterPacotesIgnorados(): Promise<string[]> {
  if (!ehNativo()) return []
  const r = await Nativo.obterPacotesIgnorados()
  return r?.pacotes ?? []
}

export async function ignorarPacote(pacote: string): Promise<void> {
  if (!ehNativo()) return
  const atuais = await obterPacotesIgnorados()
  if (!atuais.includes(pacote)) await Nativo.definirPacotesIgnorados({ pacotes: [...atuais, pacote] })
}

export async function deixarDeIgnorarPacote(pacote: string): Promise<void> {
  if (!ehNativo()) return
  const atuais = await obterPacotesIgnorados()
  await Nativo.definirPacotesIgnorados({ pacotes: atuais.filter((p) => p !== pacote) })
}

// --- Ações da tela ---

export async function descartarNotificacao(id: number): Promise<void> {
  await db.notificacoesPendentes.update(id, { status: 'descartada' })
}

export async function marcarConfirmada(id: number, lancamentoId?: number): Promise<void> {
  await db.notificacoesPendentes.update(id, { status: 'confirmada', lancamentoId })
}

export async function limparHistorico(): Promise<number> {
  return db.notificacoesPendentes.where('status').anyOf(['confirmada', 'descartada']).delete()
}

/**
 * FERRAMENTA DE TESTE DO MVP (BACKLOG.md item 030 — remover em produção):
 * cria uma notificação falsa, com o mesmo formato que o serviço nativo
 * geraria, pra validar o fluxo Confirmar/Descartar no navegador, onde o
 * plugin não existe.
 */
export async function criarNotificacaoDeTeste(): Promise<void> {
  const exemplos = [
    { app: 'Bradesco', pacote: 'com.bradesco', titulo: 'Compra aprovada', texto: 'Compra no cartão final 1234 aprovada: R$ 87,90 em MERCADO EXEMPLO em ' + new Date().toLocaleDateString('pt-BR') },
    { app: 'Porto Seguro Cartões', pacote: 'br.com.portoseguro.cartoes', titulo: 'Transação aprovada', texto: 'Você fez uma compra de R$ 1.234,56 em LOJA EXEMPLO. Se não reconhece, ligue pra central.' },
    { app: 'Bradesco', pacote: 'com.bradesco', titulo: 'Pix recebido', texto: 'Você recebeu um Pix de R$ 250,00 de FULANO DE TAL.' },
  ]
  const ex = exemplos[Math.floor(Math.random() * exemplos.length)]
  await registrarNotificacao({
    id: 'teste-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    pacote: ex.pacote,
    app: ex.app,
    titulo: ex.titulo,
    texto: ex.texto,
    recebidoEm: Date.now(),
  })
}
