import type { Lancamento } from './db'
import { hojeEfetivoISO } from './hojeSimulado'

// Situação de pagamento de um lançamento — derivada, nunca guardada como
// rótulo (só o boolean `pago` é persistido; "atrasado" é calculado comparando
// a data com hoje). 30/08/2026. "Hoje" vem de `hojeEfetivoISO()` (05/09/2026,
// Etapa 7 — Ferramentas de teste) — a data real do sistema, a não ser que o
// Rafael tenha uma data simulada ativa (ver `src/kit/SimularData.tsx`).
export type StatusPagamento = 'pago' | 'recebido' | 'atrasado' | 'a_pagar' | 'a_receber'

export function statusDoLancamento(l: Pick<Lancamento, 'valor' | 'pago' | 'dataCompetencia'>): StatusPagamento {
  const ehEntrada = l.valor >= 0
  const pago = l.pago !== false // undefined = pago (compat com lançamento antigo/importado)
  if (pago) return ehEntrada ? 'recebido' : 'pago'
  if (l.dataCompetencia < hojeEfetivoISO()) return 'atrasado'
  return ehEntrada ? 'a_receber' : 'a_pagar'
}

export const ROTULO_STATUS: Record<StatusPagamento, string> = {
  pago: 'Pago',
  recebido: 'Recebido',
  atrasado: 'Atrasado',
  a_pagar: 'A pagar',
  a_receber: 'A receber',
}

// Classe CSS aplicada no fundo da linha/pill — pago/recebido usa o fundo
// normal (sem destaque, é a maioria dos lançamentos); atrasado e a
// pagar/receber ganham um fundo diferenciado pra chamar atenção sem virar
// alarme (ver .status-pago-fundo* no index.css).
export const FUNDO_STATUS: Record<StatusPagamento, string> = {
  pago: '',
  recebido: '',
  atrasado: 'status-fundo-atrasado',
  a_pagar: 'status-fundo-pendente',
  a_receber: 'status-fundo-pendente',
}

export const CLASSE_STATUS: Record<StatusPagamento, string> = {
  pago: 'status-pill-pago',
  recebido: 'status-pill-pago',
  atrasado: 'status-pill-atrasado',
  a_pagar: 'status-pill-pendente',
  a_receber: 'status-pill-pendente',
}
