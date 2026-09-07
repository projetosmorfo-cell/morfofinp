import { db, type Categoria, type GrupoRegistro } from './db'
import type { EstiloIcone } from './icones'

// Padrão de ícones do sistema (04/09/2026, pedido do Rafael) — depois de
// escolher manualmente o ícone/estilo/cor de cada categoria e grupo em
// "Categorias e Grupos", ele pediu pra essa escolha virar o PADRÃO OFICIAL
// do app: (1) toda geração/publicação futura do MVP já nasce com esses
// ícones (ver `seed.ts`, que consulta este arquivo ao semear categoria/grupo
// novo); (2) um botão "Restaurar Padrão" em Categorias.tsx (geral, e por
// item) devolve qualquer categoria/grupo pra este valor, mesmo depois de
// alguém mexer.
//
// A chave é o NOME da categoria/grupo, não o id (que muda de banco pra
// banco) — mesmo raciocínio já usado em `Categoria.grupo`. Isso é
// preenchido a partir da exportação feita pela tela Manutenção (botão
// "Exportar configuração de ícones") — nunca adivinhado.
export interface IconePadrao {
  icone: string
  iconeEstilo: EstiloIcone
  iconeCor: string
}

// Preenchido em 04/09/2026 com a exportação real que o Rafael mandou de
// volta (tela Manutenção → "Exportar configuração de ícones"), rodando no
// MVP que ele já estava usando — nenhum valor aqui foi adivinhado.
export const ICONES_PADRAO_CATEGORIA: Record<string, IconePadrao> = {
  Casa: { icone: 'casa', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  CNPJ: { icone: 'escritorio', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Mercado: { icone: 'mercado', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  'Carro - Man/Imp/Seg': { icone: 'transporte', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  'Saúde - Fixo': { icone: 'saude', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Pets: { icone: 'pet', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Celular: { icone: 'telefone', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Alimentação: { icone: 'alimentacao', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Compras: { icone: 'presente', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  'Carro - Variável': { icone: 'combustivel', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Fitness: { icone: 'academia', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  'Diversão e Lazer': { icone: 'bar', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  'Saúde - Variável': { icone: 'saude', iconeEstilo: 'preenchido', iconeCor: '#ef4444' },
  Família: { icone: 'familia', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  'Assinaturas e serviços': { icone: 'streaming', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Cigarro: { icone: 'churrasco', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Transporte: { icone: 'transporte', iconeEstilo: 'preenchido', iconeCor: '#3b82f6' },
  'Juros e Taxas': { icone: 'impostos', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  'Impostos e Taxas': { icone: 'impostos', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  'Dívidas e empréstimos': { icone: 'cambio', iconeEstilo: 'preenchido', iconeCor: '#ef4444' },
  Emprestimo: { icone: 'cambio', iconeEstilo: 'preenchido', iconeCor: '#ef4444' },
  Custos: { icone: 'impostos', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Inesperado: { icone: 'cambio', iconeEstilo: 'preenchido', iconeCor: '#ef4444' },
  Outros: { icone: 'cambio', iconeEstilo: 'preenchido', iconeCor: '#22c55e' },
  Reembolsável: { icone: 'desfazer', iconeEstilo: 'preenchido', iconeCor: '#ef4444' },
  Diferença: { icone: 'planejamentoLista', iconeEstilo: 'preenchido', iconeCor: '#3b82f6' },
  Salário: { icone: 'ferramentas', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  Reembolso: { icone: 'refazer', iconeEstilo: 'preenchido', iconeCor: '#22c55e' },
  'Outras receitas': { icone: 'cambio', iconeEstilo: 'preenchido', iconeCor: '#22c55e' },
  Investimentos: { icone: 'documentoFinanceiro', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
  '# Objetivos': { icone: 'negocio', iconeEstilo: 'borda', iconeCor: '#22c55e' },
  '# Segurança': { icone: 'viagem', iconeEstilo: 'borda', iconeCor: '#22c55e' },
  '$ Objetivos - Metas': { icone: 'negocio', iconeEstilo: 'borda', iconeCor: '#ef4444' },
  '$ Segurança - Reserva': { icone: 'viagem', iconeEstilo: 'borda', iconeCor: '#ef4444' },
  '$ Segurança - Invest': { icone: 'viagem', iconeEstilo: 'borda', iconeCor: '#ef4444' },
  Transferências: { icone: 'transferencia', iconeEstilo: 'preenchido', iconeCor: '#eab308' },
  'Pagamento de fatura': { icone: 'cartao', iconeEstilo: 'colorido', iconeCor: '#3b82f6' },
}

export const ICONES_PADRAO_GRUPO: Record<string, IconePadrao> = {
  Fixo: { icone: 'cofreDigital', iconeEstilo: 'preenchido', iconeCor: '#3b82f6' },
  Variável: { icone: 'cadeadoAberto', iconeEstilo: 'preenchido', iconeCor: '#3b82f6' },
  Objetivos: { icone: 'negocio', iconeEstilo: 'preenchido', iconeCor: '#3b82f6' },
  Segurança: { icone: 'viagem', iconeEstilo: 'preenchido', iconeCor: '#3b82f6' },
}

// Usado por `seed.ts` — mescla o padrão (se existir pro nome) em cima de uma
// categoria/grupo recém-semeado, sem sobrescrever nada que a semente já
// tenha definido explicitamente (nenhuma semente define ícone hoje, mas a
// regra fica correta se um dia definir).
export function comIconePadraoCategoria<T extends Omit<Categoria, 'id'>>(c: T): T {
  const padrao = ICONES_PADRAO_CATEGORIA[c.nome]
  if (!padrao || c.icone) return c
  return { ...c, icone: padrao.icone, iconeEstilo: padrao.iconeEstilo, iconeCor: padrao.iconeCor }
}

export function comIconePadraoGrupo<T extends Omit<GrupoRegistro, 'id'>>(g: T): T {
  const padrao = ICONES_PADRAO_GRUPO[g.nome]
  if (!padrao || g.icone) return g
  return { ...g, icone: padrao.icone, iconeEstilo: padrao.iconeEstilo, iconeCor: padrao.iconeCor }
}

// Gera o texto que a tela Manutenção mostra pra Rafael copiar e me mandar —
// sempre exporta TODAS as categorias/grupos (mesmo os que ficaram no ícone
// genérico "outros"), porque isso também é uma escolha válida a preservar
// como padrão.
export async function exportarConfiguracaoIcones(): Promise<string> {
  const [categorias, grupos] = await Promise.all([db.categorias.toArray(), db.grupos.toArray()])
  const paraExport = (icone?: string, iconeEstilo?: EstiloIcone, iconeCor?: string): IconePadrao => ({
    icone: icone ?? 'outros',
    iconeEstilo: iconeEstilo ?? 'colorido',
    iconeCor: iconeCor ?? '#3b82f6',
  })
  const saida = {
    categorias: Object.fromEntries(
      categorias.map((c) => [c.nome, paraExport(c.icone, c.iconeEstilo, c.iconeCor)]),
    ),
    grupos: Object.fromEntries(grupos.map((g) => [g.nome, paraExport(g.icone, g.iconeEstilo, g.iconeCor)])),
  }
  return JSON.stringify(saida, null, 2)
}

// Aplica o padrão salvo a TODAS as categorias/grupos existentes no banco
// (botão "Restaurar Padrão" geral). Só mexe em quem tem padrão cadastrado —
// uma categoria/grupo sem entrada aqui (ex.: criado depois, sem
// correspondente no padrão) fica intocado.
export async function restaurarPadraoIconesGeral(): Promise<number> {
  let alterados = 0
  await db.transaction('rw', db.categorias, db.grupos, async () => {
    const categorias = await db.categorias.toArray()
    for (const c of categorias) {
      const padrao = ICONES_PADRAO_CATEGORIA[c.nome]
      if (!padrao) continue
      await db.categorias.update(c.id!, {
        icone: padrao.icone,
        iconeEstilo: padrao.iconeEstilo,
        iconeCor: padrao.iconeCor,
      })
      alterados++
    }
    const grupos = await db.grupos.toArray()
    for (const g of grupos) {
      const padrao = ICONES_PADRAO_GRUPO[g.nome]
      if (!padrao) continue
      await db.grupos.update(g.id!, {
        icone: padrao.icone,
        iconeEstilo: padrao.iconeEstilo,
        iconeCor: padrao.iconeCor,
      })
      alterados++
    }
  })
  return alterados
}

export async function restaurarPadraoIconeCategoria(id: number, nome: string) {
  const padrao = ICONES_PADRAO_CATEGORIA[nome]
  if (!padrao) return
  await db.categorias.update(id, { icone: padrao.icone, iconeEstilo: padrao.iconeEstilo, iconeCor: padrao.iconeCor })
}

export async function restaurarPadraoIconeGrupo(id: number, nome: string) {
  const padrao = ICONES_PADRAO_GRUPO[nome]
  if (!padrao) return
  await db.grupos.update(id, { icone: padrao.icone, iconeEstilo: padrao.iconeEstilo, iconeCor: padrao.iconeCor })
}
