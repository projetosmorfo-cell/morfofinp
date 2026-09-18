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
import { analisarNotificacao, extrairValorTexto, ehProvavelRepeticao } from './parseNotificacao'
import { paramsNotificacaoAtuais, type ParametrosNotificacao } from './notificacaoParametros'

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

// --- Leitura do texto ---
//
// 16/09/2026: a inteligência de leitura saiu daqui e virou `parseNotificacao.ts`
// (módulo PURO, sem Dexie, testável com um script Node sobre o corpus de
// textos reais do Rafael). Este arquivo voltou a ser só orquestração: fila
// nativa → Dexie → tela. As duas funções antigas continuam exportadas porque
// eram a API pública deste módulo, mas agora só delegam.

/** @deprecated use `analisarNotificacao()` de `parseNotificacao.ts`. */
export function extrairValor(texto: string): number | undefined {
  return extrairValorTexto(texto)
}

/** @deprecated use `analisarNotificacao()` de `parseNotificacao.ts`. */
export function inferirTipo(texto: string): 'saida' | 'entrada' {
  return analisarNotificacao({ texto }).tipo
}

/**
 * Notificações PENDENTES que parecem movimentação de dinheiro de verdade —
 * é o que a tela lista e o que o aviso do topo conta. O que não passa no
 * `transacional` (propaganda do banco, aviso de app) NÃO é apagado: fica na
 * seção recolhida "Ignoradas", porque classificação errada tem que ser
 * reversível pelo Rafael (mesmo princípio do status 'descartada').
 */
export function separarPendentes(
  lista: NotificacaoPendente[],
  p: ParametrosNotificacao = paramsNotificacaoAtuais(),
) {
  const transacionais: NotificacaoPendente[] = []
  const ignoradas: NotificacaoPendente[] = []
  for (const n of lista) {
    if (analisarNotificacao(n, p).transacional) transacionais.push(n)
    else ignoradas.push(n)
  }
  return { transacionais, ignoradas }
}

/**
 * Provável repetição do MESMO compromisso (item 4 do pedido de 16/09/2026):
 * o banco manda uma notificação quando agenda ("está agendada pra amanhã") e
 * outra quando conclui ("estava agendada para hoje, foi concluída") — dois
 * textos, um só lançamento. Devolve a outra notificação, se houver, pra tela
 * AVISAR. Nunca descarta sozinha.
 */
export function acharRepeticao(
  alvo: NotificacaoPendente,
  candidatas: NotificacaoPendente[],
  p: ParametrosNotificacao = paramsNotificacaoAtuais(),
): NotificacaoPendente | undefined {
  const a = analisarNotificacao(alvo, p)
  const chaveA = { valor: a.valor, contraparte: a.contraparte, pacote: alvo.pacote, recebidoEm: alvo.recebidoEm }
  for (const c of candidatas) {
    if (c.id != null && c.id === alvo.id) continue
    const b = analisarNotificacao(c, p)
    const chaveB = { valor: b.valor, contraparte: b.contraparte, pacote: c.pacote, recebidoEm: c.recebidoEm }
    if (ehProvavelRepeticao(chaveA, chaveB, p.janelaRepeticaoDias)) return c
  }
  return undefined
}

// --- Fila nativa → Dexie ---

function paraPendente(item: ItemNativo): NotificacaoPendente {
  /* `valor`/`tipo` continuam gravados porque já existiam no schema e o
     histórico depende deles. O RESTO da análise (nome, movimento, agendado)
     NÃO é gravado de propósito: a tela re-analisa o texto cru na hora de
     exibir, então uma notificação capturada por uma build antiga ganha as
     regras novas de graça, sem migração e sem campo que possa divergir do
     texto. Ver o cabeçalho de `parseNotificacao.ts`. */
  const a = analisarNotificacao(item)
  return {
    idNativo: item.id,
    pacote: item.pacote,
    app: item.app || item.pacote,
    titulo: item.titulo ?? '',
    texto: item.texto ?? '',
    recebidoEm: new Date(item.recebidoEm || Date.now()).toISOString(),
    valor: a.valor,
    tipo: a.tipo,
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

/**
 * Build 080 — REVERSIBILIDADE, em um toque. Toda linha da aba "Ignoradas" tem
 * volta: o que o classificador de propaganda recusou e o que o Rafael
 * descartou voltam pra Pendentes por aqui. Nada nunca é apagado neste fluxo —
 * classificação errada tem que ser desfeita sem custo, e uma notificação
 * confirmada por engano volta a ser pendente sem apagar o lançamento que ela
 * gerou (desfazer o lançamento é ação da tela de lançamento, não desta).
 */
export async function voltarParaPendentes(id: number): Promise<void> {
  await db.notificacoesPendentes.update(id, { status: 'pendente' })
}

export async function marcarConfirmada(id: number, lancamentoId?: number): Promise<void> {
  await db.notificacoesPendentes.update(id, { status: 'confirmada', lancamentoId })
}

/**
 * LIMPAR O HISTÓRICO (build 099 ganhou botão e limpeza automática).
 * Apaga só o que já foi TRATADO — confirmada ou descartada/ignorada —, nunca
 * uma pendente. Com `maisVelhasQueDias` apaga só as mais velhas que isso
 * (a limpeza automática); sem, apaga o histórico inteiro (o botão).
 * O aprendizado do motor NÃO mora aqui (ver `retencaoHistoricoDias` em
 * `notificacaoParametros.ts`) — apagar histórico não desensina nada.
 */
export async function limparHistorico(maisVelhasQueDias?: number): Promise<number> {
  const tratadas = db.notificacoesPendentes.where('status').anyOf(['confirmada', 'descartada'])
  if (maisVelhasQueDias == null) return tratadas.delete()
  /* `recebidoEm` é ISO completo no banco — a comparação vai por epoch. */
  const limite = Date.now() - maisVelhasQueDias * 86_400_000
  return tratadas.filter((n) => (Date.parse(n.recebidoEm) || 0) < limite).delete()
}

/** A limpeza automática pela idade: roda ao abrir a tela e a cada sincronização. */
export async function limparHistoricoPorIdade(): Promise<number> {
  const dias = paramsNotificacaoAtuais().retencaoHistoricoDias
  if (!dias || dias <= 0) return 0
  return limparHistorico(dias)
}

/**
 * FERRAMENTA DE TESTE DO MVP (BACKLOG.md item 030 — remover em produção):
 * cria uma notificação falsa, com o mesmo formato que o serviço nativo
 * geraria, pra validar o fluxo Confirmar/Descartar no navegador, onde o
 * plugin não existe.
 */
export async function criarNotificacaoDeTeste(): Promise<void> {
  /* Corpus de teste — inclui os textos REAIS que o Rafael mandou do celular
     dele em 16/09/2026 (Bradesco e as três propagandas da Porto), que são
     exatamente os casos que calibraram `parseNotificacao.ts`: agendamento ×
     conclusão do mesmo R$ 80,00, nome que precisa parar na vírgula, conta de
     telefone programada, e marketing que NÃO pode virar lançamento. */
  const exemplos = [
    { app: 'Bradesco', pacote: 'com.bradesco', titulo: 'BRADESCO', texto: 'A transação de R$ 80,00 para FLAVIA DE OLIVEIRA BARROS PASSARO, que estava agendada para hoje, foi concluída.' },
    { app: 'Bradesco', pacote: 'com.bradesco', titulo: 'BRADESCO', texto: 'A transação de R$ 398,80 para PJBANK está agendada pra amanhã.' },
    { app: 'Bradesco', pacote: 'com.bradesco', titulo: 'BRADESCO', texto: 'O pagamento da conta de telefone no valor de R$ 56,99 para TIM SA CELULAR está programado pra amanhã. Lembre-se de deixar saldo suficiente em conta para o valor ser debitado.' },
    { app: 'Bradesco', pacote: 'com.bradesco', titulo: 'Compra aprovada', texto: 'Compra aprovada no cartão final 1234 em PADARIA CENTRAL no valor de R$ 34,90' },
    { app: 'Bradesco', pacote: 'com.bradesco', titulo: 'Pix recebido', texto: 'Você recebeu um Pix de R$ 2.500,00 de EMPRESA XYZ LTDA' },
    { app: 'Bradesco', pacote: 'com.bradesco', titulo: 'Pix', texto: 'Você enviou um Pix de R$ 150,00 para João da Silva' },
    { app: 'Porto Seguro Cartões', pacote: 'br.com.portoseguro.cartoes', titulo: 'Transação aprovada', texto: 'Você fez uma compra de R$ 129,90 em MERCADO LIVRE*LOJA' },
    { app: 'Porto', pacote: 'br.com.portoseguro.cliente', titulo: 'Dia do Cliente com 15% OFF para você!', texto: 'Use o cupom CLIENTE15 e garanta 15% OFF no reparo do seu carro. Solicite um orçamento e garanta seu desconto apenas hoje' },
    { app: 'Porto', pacote: 'br.com.portoseguro.cliente', titulo: 'Controle seus gastos!', texto: 'Ative o assistente de pagamentos na sua Conta Porto Bank e acompanhe seus boletos com praticidade.' },
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

/**
 * FERRAMENTA DE TESTE DO MVP (build 080): o PAR de notificações de uma
 * transferência entre contas próprias — o app de origem avisando a saída e o
 * de destino avisando a entrada, mesmo valor, segundos de diferença. É o único
 * jeito de exercitar a fase 4 no navegador, onde o plugin nativo não existe.
 * Os nomes de app são os das contas reais da Carteira do Rafael (Bradesco e
 * C6), porque o sinal forte da detecção é justamente os DOIS casarem com conta
 * cadastrada.
 */
export async function criarParTransferenciaDeTeste(): Promise<void> {
  const agora = Date.now()
  const marca = Math.random().toString(36).slice(2, 8)
  await registrarNotificacao({
    id: `teste-transf-saida-${agora}-${marca}`,
    pacote: 'com.bradesco',
    app: 'Bradesco',
    titulo: 'BRADESCO',
    texto: 'Você enviou uma transferência de R$ 500,00 para RAFAEL BARROS. Saldo atualizado.',
    recebidoEm: agora,
  })
  await registrarNotificacao({
    id: `teste-transf-entrada-${agora}-${marca}`,
    pacote: 'com.c6bank.app',
    app: 'C6 Bank',
    titulo: 'C6 Bank',
    texto: 'Você recebeu um Pix de R$ 500,00 de RAFAEL BARROS',
    recebidoEm: agora + 40_000,
  })
}
