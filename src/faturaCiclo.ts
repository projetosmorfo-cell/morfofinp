// Ciclo de fatura de cartão — extraído de `Carteira.tsx` (16/09/2026, item 12)
// pra ficar disponível também em `DetalheLancamento.tsx` (o formulário
// precisa da mesma janela pra descobrir quais lançamentos entram na fatura
// que uma categoria "Pagamento de fatura" está quitando). Nenhuma regra
// mudou — é a mesma função, só movida pra um módulo compartilhado em vez de
// duplicada.

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
