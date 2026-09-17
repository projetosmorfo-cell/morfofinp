/* Backup, restauração e exclusão total dos dados do app (10/09/2026, pedido do
   Rafael: "crie um botão geral pra fazer backup de tudo, lançamentos,
   recorrências, categorias, grupos, ícones, configurações, tudo, e outro
   botão pra restaurar tudo. Criar, se já não tiver, um botão de excluir tudo,
   limpando o app").

   POR QUE ISSO EXISTE AGORA: até aqui o app não tinha nenhuma saída de
   segurança. O dado vive só no aparelho — desinstalar o app, limpar o
   armazenamento pelas configurações do Android ou trocar de celular apagava
   tudo, sem recuperação. Isso vale enquanto não existir servidor (Backlog
   028) e continua valendo depois, como cópia local.

   O QUE ENTRA NO ARQUIVO: TODAS as 11 tabelas do banco, sem exceção — é um
   retrato do banco inteiro, não uma seleção. "Recorrência" não é uma tabela
   à parte: um lançamento fixo/parcelado é um registro de `lancamentos` com
   `recorrencia`/`periodicidade`/`serieId` preenchidos, então exportar a
   tabela já leva a série junto. "Ícones e configurações" moram no registro
   único de `configuracoes` (que carrega também tema, modo de visão, ordem
   dos menus e a plataforma N0 inteira — tenants, planos, marca, layout).

   FORMATO: um JSON só, com cabeçalho (versão do arquivo, versão do schema
   Dexie, data e contagem por tabela). O cabeçalho é o que permite a
   restauração recusar um arquivo que não é deste app antes de apagar
   qualquer coisa. */
import { vincularPagamentosAntigos } from './faturaPagamento'
import { db } from './db'

export const VERSAO_ARQUIVO_BACKUP = 1
const MARCA_ARQUIVO = 'morfofinp-backup'

/* A lista é escrita à mão, e não derivada de `db.tables`, de propósito: se
   uma tabela nova for criada e ninguém acrescentar aqui, o teste de
   `tabelasForaDoBackup()` (usado na tela) acusa — melhor um aviso visível do
   que um backup silenciosamente incompleto. */
export const TABELAS_BACKUP = [
  'contas',
  'categorias',
  'grupos',
  'lancamentos',
  'metas',
  'saldosInformados',
  'usuarios',
  'configuracoes',
  'planos',
  'usuariosN0',
  'notificacoesPendentes',
  /* 16/09/2026 (build 080): o de/para aprendido a cada confirmação de
     notificação. Entra no backup na MESMA rodada em que a tabela nasce —
     regra da build 027; backup incompleto é pior que backup ausente, e este é
     um cadastro que o Rafael administra à mão. */
  'aprendizadosNotificacao',
] as const

export type TabelaBackup = (typeof TABELAS_BACKUP)[number]

export interface ArquivoBackup {
  marca: typeof MARCA_ARQUIVO
  versaoArquivo: number
  versaoSchema: number
  nomeBanco: string
  geradoEm: string
  app: string
  build: number
  contagens: Record<string, number>
  dados: Record<string, unknown[]>
}

/* Confere se alguma tabela do banco ficou de fora da lista acima — a tela
   mostra isso como aviso em vez de deixar passar batido. */
export function tabelasForaDoBackup(): string[] {
  return db.tables.map((t) => t.name).filter((n) => !TABELAS_BACKUP.includes(n as TabelaBackup))
}

export async function montarBackup(build: number): Promise<ArquivoBackup> {
  const dados: Record<string, unknown[]> = {}
  const contagens: Record<string, number> = {}
  for (const nome of TABELAS_BACKUP) {
    const linhas = await db.table(nome).toArray()
    dados[nome] = linhas
    contagens[nome] = linhas.length
  }
  return {
    marca: MARCA_ARQUIVO,
    versaoArquivo: VERSAO_ARQUIVO_BACKUP,
    versaoSchema: db.verno,
    nomeBanco: db.name,
    geradoEm: new Date().toISOString(),
    app: 'MorfoFinP',
    build,
    contagens,
    dados,
  }
}

/* Nome do arquivo de backup — formato pedido pelo Rafael na build 089:
   `Bkp MorfoFinp <Usuário> DDMMAAAA HHMM.json`.

   Por que a data vai DD-MM-AAAA e não AAAA-MM-DD: ele lê esses arquivos numa
   pasta do Drive, na ordem em que o Windows mostra, e o formato pedido é o
   que ele reconhece de bater o olho. A ordenação por nome deixa de ser
   cronológica — quem precisa da ordem usa a data de modificação do arquivo,
   que continua correta.

   O nome do usuário passa por `nomeParaArquivo`: um backup vai parar no
   Drive, no WhatsApp e no cartão de memória do celular, e caractere proibido
   em nome de arquivo (Windows: \\ / : * ? " < > |) faz a gravação falhar de
   um jeito que parece "o backup não funciona". Acento fica, espaço fica —
   os dois são válidos nos três sistemas e o Rafael pediu o nome legível. */
export function nomeParaArquivo(nome: string | undefined | null): string {
  const limpo = (nome ?? '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    /* Caracteres de controle quebram o nome do arquivo sem aparecer na tela —
       por isso eles são justamente o que precisa ser removido aqui. A regra
       `no-control-regex` existe para pegar quem põe um caractere de controle
       numa busca por engano; este é o caso oposto, e desligar a regra NA
       LINHA é o que o projeto faz desde a build 047 em vez de reescrever o
       código para enganar o lint. */
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
  return limpo || 'Sem usuario'
}

export function nomeArquivoBackup(usuario?: string, agora = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  const data = `${p(agora.getDate())}${p(agora.getMonth() + 1)}${agora.getFullYear()}`
  const hora = `${p(agora.getHours())}${p(agora.getMinutes())}`
  return `Bkp MorfoFinp ${nomeParaArquivo(usuario)} ${data} ${hora}.json`
}

/* Quem é o "Usuário" do nome do arquivo: o usuário logado no ambiente deste
   aparelho. Lê do banco (nunca de um valor de render), então serve tanto pra
   tela quanto pra um script. Sem sessão — ou num ambiente sem usuário
   cadastrado — cai no nome do próprio ambiente, e depois no genérico: o
   backup nunca deixa de ser gerado por falta de nome. */
export async function usuarioDoBackup(): Promise<string> {
  try {
    const cfg = await db.configuracoes.get(1)
    const platform = cfg?.platformN0
    const tenant =
      platform?.tenants?.find((t) => t.id === (cfg?.loggedTenantIdN1 || 't0')) ??
      platform?.tenants?.find((t) => t.id === 't0')
    const user = tenant?.users?.find((u) => u.id === cfg?.loggedUserIdN1)
    return user?.name || user?.login || tenant?.ownerName || tenant?.companyName || 'Sem usuario'
  } catch {
    return 'Sem usuario'
  }
}

export interface ResumoBackup {
  contagens: Record<string, number>
  geradoEm: string
  build: number
  versaoSchema: number
  nomeBanco: string
}

/* Lê e VALIDA o arquivo antes de qualquer escrita. Nunca apaga nada aqui:
   quem apaga é `restaurarBackup`, e só depois desta validação passar e o
   usuário confirmar na tela. */
export function lerArquivoBackup(texto: string): { ok: true; arquivo: ArquivoBackup; resumo: ResumoBackup } | { ok: false; erro: string } {
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    return { ok: false, erro: 'Este arquivo não é um backup do MorfoFinP (não é um JSON válido).' }
  }
  const a = bruto as Partial<ArquivoBackup>
  if (!a || typeof a !== 'object' || a.marca !== MARCA_ARQUIVO) {
    return { ok: false, erro: 'Este arquivo não é um backup do MorfoFinP.' }
  }
  if (typeof a.versaoArquivo !== 'number' || a.versaoArquivo > VERSAO_ARQUIVO_BACKUP) {
    return { ok: false, erro: `Este backup foi feito por uma versão MAIS NOVA do app (formato ${a.versaoArquivo}). Atualize o app antes de restaurar.` }
  }
  if (!a.dados || typeof a.dados !== 'object') {
    return { ok: false, erro: 'O arquivo está incompleto: não tem a seção de dados.' }
  }
  const faltando = TABELAS_BACKUP.filter((t) => !Array.isArray((a.dados as Record<string, unknown>)[t]))
  // Tabela ausente não invalida o arquivo (um backup mais ANTIGO pode ter sido
  // feito antes de uma tabela existir) — ela só entra como vazia na restauração.
  return {
    ok: true,
    arquivo: a as ArquivoBackup,
    resumo: {
      contagens: a.contagens ?? {},
      geradoEm: a.geradoEm ?? '',
      build: a.build ?? 0,
      versaoSchema: a.versaoSchema ?? 0,
      nomeBanco: a.nomeBanco ?? '',
      ...(faltando.length ? {} : {}),
    },
  }
}

/* SUBSTITUI o conteúdo do banco pelo do arquivo. Roda tudo dentro de UMA
   transação do Dexie: se qualquer tabela falhar no meio, nada é gravado e o
   banco continua exatamente como estava — nunca um estado meio restaurado. */
export async function restaurarBackup(arquivo: ArquivoBackup): Promise<Record<string, number>> {
  const tabelas = TABELAS_BACKUP.map((n) => db.table(n))
  const aplicados: Record<string, number> = {}
  await db.transaction('rw', tabelas, async () => {
    for (const nome of TABELAS_BACKUP) {
      const linhas = (arquivo.dados[nome] as unknown[]) || []
      await db.table(nome).clear()
      if (linhas.length) await db.table(nome).bulkPut(linhas)
      aplicados[nome] = linhas.length
    }
  })
  /* Build 090: um backup de antes da 090 traz pagamentos de fatura sem
     `faturaCartaoId`/`faturaMes` — a mesma dedução que roda na abertura do
     app roda aqui, senão a fatura só voltaria a "saber" que foi paga depois
     de fechar e abrir o app. */
  await vincularPagamentosAntigos()
  return aplicados
}

/* Apaga TUDO — as 11 tabelas, incluindo cadastros, configurações e a sessão.
   Diferente de "Limpar todos os dados", que só apaga lançamentos e preserva
   categorias/contas/grupos. Depois disso o app volta ao estado de instalação
   nova: ao reabrir, a semente de demonstração é recriada por `seedIfEmpty()`
   e o Login volta a pedir cadastro. */
export async function apagarTudo(): Promise<Record<string, number>> {
  const tabelas = TABELAS_BACKUP.map((n) => db.table(n))
  const apagados: Record<string, number> = {}
  await db.transaction('rw', tabelas, async () => {
    for (const nome of TABELAS_BACKUP) {
      apagados[nome] = await db.table(nome).count()
      await db.table(nome).clear()
    }
  })
  return apagados
}

export function totalDeRegistros(contagens: Record<string, number>): number {
  return Object.values(contagens).reduce((s, n) => s + n, 0)
}

export const ROTULO_TABELA: Record<string, string> = {
  contas: 'Contas e carteiras',
  categorias: 'Categorias',
  grupos: 'Grupos',
  lancamentos: 'Lançamentos (inclui as séries fixas e parceladas)',
  metas: 'Metas',
  saldosInformados: 'Saldos informados',
  usuarios: 'Usuários (legado)',
  configuracoes: 'Configurações, ícones, tema e painel N0',
  planos: 'Planos',
  usuariosN0: 'Usuários Morfo (legado)',
  notificacoesPendentes: 'Notificações bancárias',
}
