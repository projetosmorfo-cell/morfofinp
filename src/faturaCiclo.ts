// Ciclo de fatura de cartão — extraído de `Carteira.tsx` (16/09/2026, item 12)
// pra ficar disponível também em `DetalheLancamento.tsx`. Na build 090 o
// módulo cresceu: além da janela, ele passou a ser o ÚNICO lugar que sabe
// (a) quais lançamentos pertencem a um ciclo (respeitando `faturaOverride`),
// (b) em que mês de fatura uma data cai, (c) como se chama uma fatura pra
// pessoa ("Fatura de outubro (fecha 09/out · vence 15/out)") e (d) quanto de
// uma fatura ainda falta pagar. Carteira e formulário leem daqui — nunca
// duas fórmulas parecidas.
import type { Categoria, Conta, Lancamento } from './db'
import { somarMes } from './mes'

export function ultimoDiaDoMes(ano: number, mesIndice0: number): number {
  return new Date(ano, mesIndice0 + 1, 0).getDate()
}

// Janela FECHADA de uma fatura específica, identificada pelo mês em que ela
// FECHA (mesISO = "yyyy-mm") — do dia seguinte ao fechamento do mês anterior
// até o dia ANTERIOR ao fechamento deste mês (o próprio dia de fechamento já
// pertence à fatura SEGUINTE — conferido contra o Organizze, ver Carteira.tsx).
export function janelaFatura(diaFechamento: number, mesISO: string): { inicio: string; fim: string } {
  const [ano, mesUm] = mesISO.split('-').map(Number)
  const mesIdx = mesUm - 1
  const diaFechoEsteMes = Math.min(diaFechamento, ultimoDiaDoMes(ano, mesIdx))
  const fim = new Date(ano, mesIdx, diaFechoEsteMes)
  fim.setDate(fim.getDate() - 1)

  const anoAnterior = mesIdx === 0 ? ano - 1 : ano
  const mesAnteriorIdx = mesIdx === 0 ? 11 : mesIdx - 1
  const diaFechoMesAnterior = Math.min(diaFechamento, ultimoDiaDoMes(anoAnterior, mesAnteriorIdx))
  const inicio = new Date(anoAnterior, mesAnteriorIdx, diaFechoMesAnterior)

  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { inicio: iso(inicio), fim: iso(fim) }
}

export const DIA_FECHAMENTO_PADRAO = 9

/** Mês de fatura ("yyyy-mm", o mês em que ela FECHA) em que uma DATA cai,
 *  pela regra da janela acima: do dia de fechamento em diante a compra já é
 *  da fatura do mês seguinte. Ex.: fecha dia 9 → compra em 12/set cai na
 *  fatura de outubro; compra em 05/set cai na de setembro. */
export function mesFaturaDaData(diaFechamento: number, dataISO: string): string {
  const mes = dataISO.slice(0, 7)
  const [ano, mesUm] = mes.split('-').map(Number)
  const dia = Number(dataISO.slice(8, 10))
  // Mesmo recorte de `janelaFatura`: fecha "dia 31" num mês de 30 é dia 30.
  const fechaNesteMes = Math.min(diaFechamento, ultimoDiaDoMes(ano, mesUm - 1))
  return dia >= fechaNesteMes ? somarMes(mes, 1) : mes
}

/** Mês de fatura EFETIVO de um lançamento de cartão — a data decide, e
 *  `faturaOverride` puxa pro ciclo vizinho (ver `db.ts`). */
export function mesFaturaDoLancamento(diaFechamento: number, l: Pick<Lancamento, 'dataCompetencia' | 'faturaOverride'>): string {
  const base = mesFaturaDaData(diaFechamento, l.dataCompetencia)
  if (l.faturaOverride === 'anterior') return somarMes(base, -1)
  if (l.faturaOverride === 'proxima') return somarMes(base, 1)
  return base
}

/** Os lançamentos DE UM CARTÃO que pertencem à fatura de `mesISO` —
 *  exatamente a regra que `Carteira.tsx` usava inline (data dentro da
 *  janela, com `faturaOverride` deslocando pro ciclo vizinho). */
export function lancamentosDoCiclo<T extends Pick<Lancamento, 'dataCompetencia' | 'faturaOverride'>>(
  lancamentosDoCartao: T[],
  diaFechamento: number,
  mesISO: string,
): T[] {
  return lancamentosDoCartao.filter((l) => mesFaturaDoLancamento(diaFechamento, l) === mesISO)
}

const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function diaMesCurto(dataISO: string): string {
  const [, m, d] = dataISO.split('-')
  return `${d}/${MES_CURTO[Number(m) - 1]}`
}

/** Data em que a fatura de `mesISO` FECHA (o dia de fechamento, naquele mês —
 *  limitado ao último dia do mês, ex.: fecha dia 31 em fevereiro). */
export function dataFechamentoFatura(diaFechamento: number, mesISO: string): string {
  const [ano, mesUm] = mesISO.split('-').map(Number)
  const dia = Math.min(diaFechamento, ultimoDiaDoMes(ano, mesUm - 1))
  return `${mesISO}-${String(dia).padStart(2, '0')}`
}

/** Data em que a fatura de `mesISO` VENCE. Se o dia de vencimento vem
 *  DEPOIS do dia de fechamento, é no mesmo mês (fecha 09/out, vence 15/out);
 *  se vem antes, já é no mês seguinte (fecha 25/set, vence 05/out). Sem dia
 *  de vencimento cadastrado, `undefined`. */
export function dataVencimentoFatura(conta: Pick<Conta, 'diaFechamento' | 'diaVencimento'>, mesISO: string): string | undefined {
  if (!conta.diaVencimento) return undefined
  const fecha = conta.diaFechamento ?? DIA_FECHAMENTO_PADRAO
  const mesVenc = conta.diaVencimento >= fecha ? mesISO : somarMes(mesISO, 1)
  const [ano, mesUm] = mesVenc.split('-').map(Number)
  const dia = Math.min(conta.diaVencimento, ultimoDiaDoMes(ano, mesUm - 1))
  return `${mesVenc}-${String(dia).padStart(2, '0')}`
}

/** O nome da fatura como a pessoa lê — decisão do Rafael (17/09/2026, build
 *  090): "Fatura de outubro (fecha 09/out · vence 15/out)". O mês é o mês
 *  em que ela fecha; a data de vencimento só entra quando existe. */
export function rotuloFatura(conta: Pick<Conta, 'diaFechamento' | 'diaVencimento'>, mesISO: string): string {
  const fecha = conta.diaFechamento ?? DIA_FECHAMENTO_PADRAO
  const mesNome = MES_LONGO[Number(mesISO.slice(5, 7)) - 1]
  const vence = dataVencimentoFatura(conta, mesISO)
  const detalhe = [`fecha ${diaMesCurto(dataFechamentoFatura(fecha, mesISO))}`, vence ? `vence ${diaMesCurto(vence)}` : '']
    .filter(Boolean)
    .join(' · ')
  return `Fatura de ${mesNome} (${detalhe})`
}

/** Situação de pagamento de UMA fatura (build 090). Antes disso "Fatura
 *  ainda não paga" mostrava sempre o total bruto do ciclo e o número sumia
 *  da tela quando a fatura era quitada; pagar uma PARTE marcava a fatura
 *  inteira como paga. Agora: total = compras − estornos do ciclo; pago = soma
 *  dos lançamentos de "Pagamento de fatura" ligados a este cartão+mês
 *  (`faturaCartaoId` + `faturaMes`); restante = total − pago; quitada quando
 *  não resta nada e houve pelo menos um pagamento. */
export type SituacaoFatura = {
  itens: Lancamento[]        // compras/estornos do ciclo (sem os pagamentos)
  pagamentos: Lancamento[]   // os lançamentos de pagamento desta fatura
  total: number
  pago: number
  restante: number
  quitada: boolean
}

export function situacaoDaFatura(
  todosLancamentos: Lancamento[],
  categoriaPorId: Map<number, Categoria> | ((id: number) => Categoria | undefined),
  cartao: Pick<Conta, 'id' | 'diaFechamento'>,
  mesISO: string,
): SituacaoFatura {
  const natureza = (l: Lancamento) =>
    (typeof categoriaPorId === 'function' ? categoriaPorId(l.categoriaId) : categoriaPorId.get(l.categoriaId))?.natureza
  const doCartao = todosLancamentos.filter((l) => l.contaId === cartao.id)
  const itens = lancamentosDoCiclo(doCartao, cartao.diaFechamento ?? DIA_FECHAMENTO_PADRAO, mesISO).filter(
    (l) => natureza(l) !== 'Pagamento de fatura',
  )
  const pagamentos = todosLancamentos
    .filter((l) => natureza(l) === 'Pagamento de fatura' && l.faturaCartaoId === cartao.id && l.faturaMes === mesISO)
    .sort((a, b) => a.dataCompetencia.localeCompare(b.dataCompetencia))
  const saidas = itens.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0)
  const entradas = itens.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0)
  const total = arred(saidas - entradas)
  const pago = arred(pagamentos.reduce((s, l) => s + Math.abs(l.valor), 0))
  const restante = arred(total - pago)
  return { itens, pagamentos, total, pago, restante, quitada: pagamentos.length > 0 && restante <= 0.005 }
}

function arred(v: number): number {
  return Math.round(v * 100) / 100
}
