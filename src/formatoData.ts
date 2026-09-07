// Cabeçalho de sessão por data, compartilhado entre as duas listagens
// (Completa e Simples) — 31/08/2026, mesmo dia: antes cada tela tinha sua
// própria função local com formatos ligeiramente diferentes (maiúsculas +
// vírgula, ex. "SÁB., 22 DE AGOSTO"); unificado aqui no formato pedido
// explicitamente pelo Rafael: "31 de Agosto (Seg)".
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function formatarCabecalhoData(dataISO: string): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia)
  return `${dia} de ${MESES[mes - 1]} (${DIAS_SEMANA[d.getDay()]})`
}
