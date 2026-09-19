import type { Lancamento } from './db'
import { hojeEfetivoISO } from './hojeSimulado'
import { ehContaDeCartao, faturaTevePagamento, faturaVencidaENaoPaga, mesFaturaDoLancamentoPeloCache } from './contasCartao'

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
  /* Build 100 (18/09/2026), pedido do Rafael: uma compra de cartão com data
     FUTURA (ainda não aconteceu) nunca é "A pagar" — isso é o compromisso de
     uma conta corrente, que a pessoa decide pagar ou não dia a dia. Um
     cartão não: a compra já está decidida (foi feita), só ainda não entrou
     na fatura. "A Faturar" — some sozinha assim que a data chega (vira "No
     cartão") ou quando ele muda o status manualmente antes disso. */
  | 'a_faturar'
  /* Build 100: a fatura à qual esta compra pertence já passou do dia de
     vencimento e segue sem estar 100% paga — vira pendência de verdade,
     igual a qualquer outro atraso (ver `faturaVencidaENaoPaga`). */
  | 'vencido_cartao'

export function statusDoLancamento(
  l: Pick<Lancamento, 'valor' | 'pago' | 'dataCompetencia' | 'contaId' | 'faturaOverride'>,
): StatusPagamento {
  const ehEntrada = l.valor >= 0
  const pago = l.pago !== false // undefined = pago (compat com lançamento antigo/importado)
  const hoje = hojeEfetivoISO()
  const cartao = ehContaDeCartao(l.contaId)

  if (cartao) {
    /* Cartão nunca é "Pago" enquanto a FATURA não fechou de verdade — quem
       paga é ela inteira, de uma vez (o botão "Pagar esta fatura"). `pago
       === true` aqui não significa "dinheiro saiu": significa "Rafael
       confirmou manualmente que isso já é real" — e pra cartão isso é
       exatamente o que "No cartão" quer dizer, então uma marcação manual
       (mesmo com data futura) entra direto em "No cartão", nunca em "Pago"
       por si só.
       Build 101/104 (Decisão 121), pedido do Rafael: quando a fatura à qual
       esta compra pertence já recebeu QUALQUER pagamento (mesmo parcial, não
       precisa ser 100%), a leitura muda — a compra mostra "Pago", igual a
       qualquer outro lançamento liquidado. Ver `faturaTevePagamento`. */
    if (pago || l.dataCompetencia <= hoje) {
      const mesFatura = mesFaturaDoLancamentoPeloCache(l)
      if (mesFatura && faturaTevePagamento(l.contaId, mesFatura)) return 'pago'
      if (mesFatura && faturaVencidaENaoPaga(l.contaId, mesFatura)) return 'vencido_cartao'
      return 'no_cartao'
    }
    return 'a_faturar'
  }

  if (pago) return ehEntrada ? 'recebido' : 'pago'
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
  a_faturar: 'A faturar',
  vencido_cartao: 'Vencido',
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
  // Build 100: "A Faturar" usa o MESMO fundo amarelo de "A pagar" — é
  // comprometido igual, só que a palavra é outra (ver comentário do tipo).
  a_faturar: 'status-fundo-pendente',
  vencido_cartao: 'status-fundo-atrasado',
}

/* Build 104 (19/09/2026), pedido do Rafael: quando o vínculo com a
   notificação foi feito SOZINHO pelo app (ver `avaliarAutoVinculo()` em
   `vinculoNotificacao.ts`), o rótulo ganha "Auto" no final — "Pago Auto",
   "Recebido Auto", "No Cartão Auto" — pra ficar óbvio, na própria lista, que
   ninguém olhou aquele vínculo antes de ele acontecer. Só entra nos três
   status que a automação de fato produz; os demais (a pagar, atrasado...)
   nunca vêm de um vínculo, então nunca ganham o sufixo. Mesma tabela
   `ROTULO_STATUS` por trás — nunca um segundo texto escrito à parte. */
export function rotuloDoStatus(status: StatusPagamento, l?: Pick<Lancamento, 'vinculoOrigem'>): string {
  const base = ROTULO_STATUS[status]
  if (!l?.vinculoOrigem?.automatico) return base
  return status === 'pago' || status === 'recebido' || status === 'no_cartao' ? `${base} Auto` : base
}

export const CLASSE_STATUS: Record<StatusPagamento, string> = {
  pago: 'status-pill-pago',
  recebido: 'status-pill-pago',
  atrasado: 'status-pill-atrasado',
  a_pagar: 'status-pill-pendente',
  a_receber: 'status-pill-pendente',
  no_cartao: 'status-pill-cartao',
  // Build 100, pedido do Rafael: "com fundo (...) amarelo igual ao A Pagar"
  // — MESMA classe/cor de "A pagar", só o texto muda ("A faturar").
  a_faturar: 'status-pill-pendente',
  vencido_cartao: 'status-pill-atrasado',
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
