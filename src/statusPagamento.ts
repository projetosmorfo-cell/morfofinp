import type { Lancamento } from './db'
import { hojeEfetivoISO } from './hojeSimulado'
import { ehContaDeCartao } from './contasCartao'

// Situação de pagamento de um lançamento — derivada, nunca guardada como
// rótulo (só o boolean `pago` é persistido; "atrasado" é calculado comparando
// a data com hoje). 30/08/2026. "Hoje" vem de `hojeEfetivoISO()` (05/09/2026,
// Etapa 7 — Ferramentas de teste) — a data real do sistema, a não ser que o
// Rafael tenha uma data simulada ativa (ver `src/kit/SimularData.tsx`).
export type StatusPagamento =
  | 'pago'
  | 'recebido'
  | 'atrasado'
  | 'a_pagar'
  | 'a_receber'
  /* Compra de CARTÃO que já aconteceu e ainda está na fatura em aberto
     (14/09/2026). Não é pendência: o dinheiro sai quando a fatura vencer, e
     quem baixa é o botão "Pagar esta fatura", de uma vez. Ver o cabeçalho de
     `contasCartao.ts` para o porquê. */
  | 'no_cartao'

export function statusDoLancamento(
  l: Pick<Lancamento, 'valor' | 'pago' | 'dataCompetencia' | 'contaId'>,
): StatusPagamento {
  const ehEntrada = l.valor >= 0
  const pago = l.pago !== false // undefined = pago (compat com lançamento antigo/importado)
  if (pago) return ehEntrada ? 'recebido' : 'pago'
  const hoje = hojeEfetivoISO()
  /* Cartão vem ANTES da checagem de atraso, de propósito: uma compra de ontem
     não paga é exatamente o caso que aparecia em vermelho sem nada estar
     atrasado. `<=` e não `<` — a compra de hoje também já aconteceu. */
  if (ehContaDeCartao(l.contaId) && l.dataCompetencia <= hoje) return 'no_cartao'
  if (l.dataCompetencia < hoje) return 'atrasado'
  return ehEntrada ? 'a_receber' : 'a_pagar'
}

/**
 * Este lançamento JÁ ACONTECEU? É a pergunta que separa realizado de
 * comprometido em toda tela de número (Hoje, Resumo, Situação, Planejamento,
 * referência histórica da Calibragem) — nunca `pago !== false` direto, senão
 * a compra de cartão do dia 2 vira "ainda vai acontecer" até a fatura vencer.
 */
export function jaAconteceu(
  l: Pick<Lancamento, 'valor' | 'pago' | 'dataCompetencia' | 'contaId'>,
): boolean {
  const s = statusDoLancamento(l)
  return s === 'pago' || s === 'recebido' || s === 'no_cartao'
}

export const ROTULO_STATUS: Record<StatusPagamento, string> = {
  pago: 'Pago',
  recebido: 'Recebido',
  atrasado: 'Atrasado',
  a_pagar: 'A pagar',
  a_receber: 'A receber',
  no_cartao: 'No cartão',
}

/* Fundo da linha — o que JÁ ACONTECEU × o que AINDA NÃO (13/09/2026).
 *
 * Regra do Rafael, literal: "os lançamentos têm que ter cores de fundo
 * diferentes, diferenciando o que ainda não aconteceu do que já aconteceu.
 * Isso vale para tudo, em qualquer lugar que mostre lançamento."
 *
 * Por isso pago/recebido também têm classe própria agora, em vez de string
 * vazia: antes só o pendente era destacado, então numa lista só de pagos (ou
 * só de pendentes) não existia diferença nenhuma para comparar — era a
 * reclamação. As três cores são tokens de tema (`index.css`), nunca hex fixo:
 * os valores antigos eram escuros cravados, que no tema claro viravam
 * tarjas pretas. */
export const FUNDO_STATUS: Record<StatusPagamento, string> = {
  pago: 'status-fundo-feito',
  recebido: 'status-fundo-feito',
  atrasado: 'status-fundo-atrasado',
  a_pagar: 'status-fundo-pendente',
  a_receber: 'status-fundo-pendente',
  // já aconteceu — mesmo fundo de quem já saiu; o que muda é a tarja
  no_cartao: 'status-fundo-feito',
}

export const CLASSE_STATUS: Record<StatusPagamento, string> = {
  pago: 'status-pill-pago',
  recebido: 'status-pill-pago',
  atrasado: 'status-pill-atrasado',
  a_pagar: 'status-pill-pendente',
  a_receber: 'status-pill-pendente',
  no_cartao: 'status-pill-cartao',
}

/* Build 090 (17/09/2026), pedido do Rafael: "a linha de data sempre deve ter
   a mesma cor de fundo do lançamento imediatamente abaixo dela". A linha de
   data é o cabeçalho do primeiro item da sessão — ela veste o fundo DELE,
   pela mesma tabela `FUNDO_STATUS` (nunca uma segunda regra de cor). Sessão
   vazia cai no fundo de "feito", o caso normal. */
export function fundoDaLinhaDeData(itens: Pick<Lancamento, 'valor' | 'pago' | 'dataCompetencia' | 'contaId'>[]): string {
  const primeiro = itens[0]
  return primeiro ? FUNDO_STATUS[statusDoLancamento(primeiro)] : FUNDO_STATUS.pago
}
