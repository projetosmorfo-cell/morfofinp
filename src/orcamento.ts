/* Quem consome meta — a regra corrigida (13/09/2026, versão Ideal).
 *
 * O ERRO QUE EXISTIA: o app só contava `Aporte` contra a meta do grupo;
 * `Gasto de cofrinho` ficava de fora, sempre. Quando o Rafael encurta o
 * caminho — gasta direto pela conta em vez de aportar e depois sacar — o app
 * não via que aquilo consumiu o envelope do mês.
 *
 * Medido em agosto/2026, grupo Objetivos: o app mostrava `R$ 0 de R$ 1.671`
 * ("falta guardar tudo") quando ele já tinha consumido R$ 2.224 — estourado em
 * R$ 553. Erro de R$ 2.224 com o SINAL INVERTIDO.
 *
 * A CORREÇÃO: o que decide não é a categoria, é a CONTA de onde o dinheiro
 * saiu.
 *
 *   "Investimento — Usar" pago com   | consome meta? | baixa o cofrinho? | entra no Saiu?
 *   ---------------------------------|---------------|-------------------|----------------
 *   conta corrente ou cartão         | SIM           | não               | sim
 *   o próprio cofrinho               | não           | SIM               | não
 *
 * Razão: o dinheiro que já está no cofrinho JÁ CONSUMIU A META QUANDO FOI
 * APORTADO. Contar de novo na saída é contagem dupla. Gasto pago pelo próprio
 * cofrinho é movimento de ESTOQUE, não do mês — não toca meta, nem
 * Entrou/Saiu, nem Saldo Livre.
 *
 * Conferido no histórico inteiro: os gastos de cofrinho saíram todos de
 * Bradesco ou cartão. Nenhum do cofrinho. A correção vale para 100% do
 * histórico — nenhum dado é reescrito, só a conta feita em cima deles.
 */
import type { Categoria, Conta, Lancamento, Natureza } from './db'

/** Naturezas que consomem meta INDEPENDENTE da conta de origem. */
const SEMPRE_ORCAMENTAVEIS: Natureza[] = ['Consumo', 'Aporte']

/** Natureza que consome meta só quando o dinheiro NÃO saiu do próprio cofrinho. */
const ORCAMENTAVEL_SE_NAO_FOR_DO_COFRE: Natureza = 'Gasto de cofrinho'

/**
 * Uma categoria pode consumir meta? Usado onde só existe o CADASTRO (tela de
 * metas, soma de "quanto já distribuí no grupo") — ali não há lançamento nem
 * conta, e a pergunta é sobre o envelope, não sobre um movimento.
 */
export function categoriaConsomeMeta(natureza: Natureza): boolean {
  return SEMPRE_ORCAMENTAVEIS.includes(natureza) || natureza === ORCAMENTAVEL_SE_NAO_FOR_DO_COFRE
}

/**
 * ESTE lançamento consome meta? A pergunta que vale para qualquer soma de
 * realizado (Hoje, Planejamento, Resumo). Precisa da conta de origem: é ela
 * que decide no caso do gasto de cofrinho.
 *
 * `contasCofre` é o conjunto de ids de conta tipo 'cofre'. Passe o conjunto
 * pronto (montado uma vez por render), nunca busque conta a conta dentro de um
 * laço sobre centenas de lançamentos.
 */
export function lancamentoConsomeMeta(
  lancamento: Pick<Lancamento, 'contaId' | 'transferenciaId'>,
  natureza: Natureza,
  contasCofre: ReadonlySet<number>,
): boolean {
  // perna de transferência nunca é gasto — é dinheiro mudando de lugar
  if (lancamento.transferenciaId != null) return false
  if (SEMPRE_ORCAMENTAVEIS.includes(natureza)) return true
  if (natureza !== ORCAMENTAVEL_SE_NAO_FOR_DO_COFRE) return false
  // gasto de cofrinho: só consome meta se saiu de uma conta que NÃO é cofre
  return lancamento.contaId == null || !contasCofre.has(lancamento.contaId)
}

/** Monta o conjunto de ids de conta tipo 'cofre' — passe a lista já carregada. */
export function idsDeCofre(contas: readonly Conta[] | undefined): ReadonlySet<number> {
  const s = new Set<number>()
  for (const c of contas ?? []) if (c.tipo === 'cofre' && c.id != null) s.add(c.id)
  return s
}

/**
 * Um gasto de cofrinho pago pelo PRÓPRIO cofrinho não é saída do mês — é baixa
 * de estoque. Fora da meta, fora de Entrou/Saiu, fora do Saldo Livre.
 */
export function ehBaixaDeEstoqueDoCofre(
  lancamento: Pick<Lancamento, 'contaId'>,
  natureza: Natureza,
  contasCofre: ReadonlySet<number>,
): boolean {
  return (
    natureza === ORCAMENTAVEL_SE_NAO_FOR_DO_COFRE &&
    lancamento.contaId != null &&
    contasCofre.has(lancamento.contaId)
  )
}

/** Açúcar: resolve a natureza pela categoria antes de perguntar. */
export function consomeMetaPorCategoria(
  lancamento: Pick<Lancamento, 'contaId' | 'categoriaId' | 'transferenciaId'>,
  categoriaPorId: ReadonlyMap<number, Categoria>,
  contasCofre: ReadonlySet<number>,
): boolean {
  const cat = lancamento.categoriaId == null ? undefined : categoriaPorId.get(lancamento.categoriaId)
  if (!cat) return false
  return lancamentoConsomeMeta(lancamento, cat.natureza, contasCofre)
}
