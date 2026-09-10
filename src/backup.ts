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

export function nomeArquivoBackup(agora = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `morfofinp-backup-${agora.getFullYear()}${p(agora.getMonth() + 1)}${p(agora.getDate())}-${p(agora.getHours())}${p(agora.getMinutes())}.json`
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
