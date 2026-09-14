/* Referência histórica por categoria — "o pulo do gato" da Calibragem
   (build 063, pedido do Rafael).

   O que ele pediu, literal:

     "Se a pessoa não sabe quanto colocar de meta numa categoria, ela olha
      pro que já gastou. Faça as suas metas baseada nos valores anteriores,
      numa média, num mês fechado."

   Então ao lado da meta de cada categoria aparece UM valor de referência, e a
   pessoa escolhe qual referência quer ver — as duas com a mesma unidade
   (R$ por mês), para poder comparar direto com a meta ao lado:

     • último mês fechado          — o retrato mais recente
     • média dos últimos 6 fechados — o comportamento, sem o mês atípico

   DUAS DECISÕES registradas:

   1. MÊS FECHADO é relativo a HOJE, nunca ao mês que está na tela. Se fosse
      relativo à tela, navegar para março mudaria a referência de todas as
      categorias — e a meta que se está calibrando é a de aqui pra frente, não
      a de um mês que já passou.

   2. A média divide pela quantidade de meses da JANELA (6), não pelo número de
      meses em que a categoria teve movimento. Uma categoria que só apareceu em
      2 dos 6 meses tem, de fato, uma média mensal menor — dividir por 2 daria
      "quanto custa quando acontece", que é outra pergunta e inflaria a meta.

   O que conta como realizado é a MESMA regra do resto do app
   (`lancamentoConsomeMeta`): pago, consumindo meta, com o gasto pago pelo
   próprio cofrinho de fora. Nenhuma conta nova nasce aqui. */

import type { Categoria, Lancamento } from './db'
import { somarMes } from './mes'
import { lancamentoConsomeMeta } from './orcamento'
import { jaAconteceu } from './statusPagamento'

/** Quantos meses fechados entram na média. */
export const JANELA_MEDIA_MESES = 6

export type BaseReferencia = 'ultimo' | 'media6'

export const ROTULO_REFERENCIA: Record<BaseReferencia, string> = {
  ultimo: 'Último mês fechado',
  media6: `Média de ${JANELA_MEDIA_MESES} meses`,
}

/** Rótulo curto, para caber no cabeçalho de uma coluna estreita. */
export const ROTULO_REFERENCIA_CURTO: Record<BaseReferencia, string> = {
  ultimo: 'Último mês',
  media6: `Média ${JANELA_MEDIA_MESES}m`,
}

/** A outra opção — o botão alterna entre duas, então isto é o destino do toque. */
export function outraReferencia(b: BaseReferencia): BaseReferencia {
  return b === 'ultimo' ? 'media6' : 'ultimo'
}

/**
 * Os meses fechados da janela, do mais recente para o mais antigo.
 * `mesAtual` é o mês de HOJE (`mesAtualISO()`), não o mês da tela.
 */
export function mesesFechados(mesAtual: string, quantos: number): string[] {
  const meses: string[] = []
  for (let i = 1; i <= quantos; i++) meses.push(somarMes(mesAtual, -i))
  return meses
}

export interface ReferenciaPorCategoria {
  /** categoriaId → R$ por mês, já na base escolhida. */
  valores: ReadonlyMap<number, number>
  /** Os meses considerados (o mais antigo primeiro), para escrever na tela. */
  meses: string[]
  /** Existe algum lançamento nesses meses? Sem isso a coluna não tem o que dizer. */
  temHistorico: boolean
}

/**
 * Quanto cada categoria consumiu por mês, na base escolhida.
 *
 * Valores devolvidos são POSITIVOS (o app guarda saída como negativo) — a
 * coluna fica comparável com a meta, que também é positiva.
 */
export function referenciaPorCategoria(
  lancamentos: readonly Lancamento[],
  categorias: readonly Categoria[],
  contasCofre: ReadonlySet<number>,
  mesAtual: string,
  base: BaseReferencia,
): ReferenciaPorCategoria {
  const quantos = base === 'ultimo' ? 1 : JANELA_MEDIA_MESES
  const meses = mesesFechados(mesAtual, quantos)
  const noPeriodo = new Set(meses)
  const catPorId = new Map<number, Categoria>()
  for (const c of categorias) if (c.id != null) catPorId.set(c.id, c)

  const soma = new Map<number, number>()
  let algum = false
  for (const l of lancamentos) {
    if (!noPeriodo.has(l.dataCompetencia.slice(0, 7))) continue
    /* `jaAconteceu`, não `pago` (14/09/2026): a referência histórica conta o
       que de fato foi gasto no mês fechado. Compra de cartão fica sem `pago`
       até a fatura ser quitada — descartá-la aqui esvaziaria a coluna
       inteira de quem gasta pelo cartão. */
    if (!jaAconteceu(l)) continue
    const cat = l.categoriaId == null ? undefined : catPorId.get(l.categoriaId)
    if (!cat || cat.id == null) continue
    if (!lancamentoConsomeMeta(l, cat.natureza, contasCofre)) continue
    algum = true
    soma.set(cat.id, (soma.get(cat.id) ?? 0) + Math.abs(l.valor))
  }

  const valores = new Map<number, number>()
  for (const [id, total] of soma) valores.set(id, total / quantos)

  return { valores, meses: [...meses].reverse(), temHistorico: algum }
}
