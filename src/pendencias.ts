/* Pendências de meses que já viraram (12/09/2026, 2ª parte do item 11).

   Pedido do Rafael, literal: "sempre que virar o mês e tiver pagamentos com
   status em aberto/pendentes, não pagos nem recebidos, deve aparecer uma tarja
   fixa em destaque no topo do app informando que tem pagamentos/recebimentos
   com status em aberto e mostra quais meses na mensagem como link — ao clicar,
   setar o mês em questão".

   Por que isso passou a ser necessário AGORA: na mesma rodada, a geração de
   recorrentes deixou de marcar como pago o que já venceu (`recorrencia.ts`) —
   marcar sozinho é errado, o app não sabe se a conta saiu do banco. Sem
   marcação automática, alguém precisa AVISAR que ficou coisa em aberto para
   trás; é esta tarja. As duas mudanças são as duas metades do mesmo pedido.

   Regras de recorte, todas deliberadas:

   • Só MÊS JÁ VIRADO. O mês corrente sempre tem conta a pagar — avisar sobre
     ele seria alarme permanente, e alarme permanente vira ruído invisível.
   • Entrada e saída juntas. Ele disse "pagamentos/recebimentos": salário que
     não caiu é tão pendente quanto conta que não foi paga.
   • Transferência entre contas fica de fora (é movimento entre lugares, não
     compromisso), na mesma exclusão que Resumo e Planejamento já fazem.
   • `pago === false` estrito: `undefined` é todo o histórico importado, que
     nasceu liquidado — tratá-lo como pendente acenderia a tarja com 774
     lançamentos antigos no primeiro segundo. */

import { db, type Lancamento } from './db'
import { hojeEfetivoISO } from './hojeSimulado'
import { lerDoAmbiente } from './ambiente'

export interface MesPendente {
  /** `AAAA-MM`. */
  mes: string
  /** Quantos lançamentos em aberto naquele mês (entradas + saídas). */
  quantidade: number
  /** Soma do que está a pagar (positiva). */
  aPagar: number
  /** Soma do que está a receber (positiva). */
  aReceber: number
}

/** Meses já encerrados que ainda têm lançamento em aberto, do mais recente ao mais antigo. */
export async function mesesComPendencia(hojeISOForcado?: string): Promise<MesPendente[]> {
  const hoje = hojeISOForcado ?? hojeEfetivoISO()
  const mesAtual = hoje.slice(0, 7)
  const lancamentos = await lerDoAmbiente(db.lancamentos.toArray())
  const porMes = new Map<string, MesPendente>()

  for (const l of lancamentos as Lancamento[]) {
    if (l.pago !== false) continue
    if (l.transferenciaId != null) continue
    const mes = l.dataCompetencia.slice(0, 7)
    if (mes >= mesAtual) continue // mês corrente não conta — ver nota acima
    const atual = porMes.get(mes) ?? { mes, quantidade: 0, aPagar: 0, aReceber: 0 }
    atual.quantidade++
    if (l.valor < 0) atual.aPagar += -l.valor
    else atual.aReceber += l.valor
    porMes.set(mes, atual)
  }

  return [...porMes.values()].sort((a, b) => b.mes.localeCompare(a.mes))
}
