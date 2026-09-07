import { hojeEfetivoISO } from './hojeSimulado'

// "Hoje" vem de `hojeEfetivoISO()` (05/09/2026, Etapa 7 — Ferramentas de
// teste): a data real do sistema, a não ser que o Rafael tenha uma data
// simulada ativa (ver `src/kit/SimularData.tsx`) — nesse caso, "mês atual"
// passa a ser o mês da data simulada, consistente com `statusPagamento.ts`/
// `recorrencia.ts`. Afeta `ehMesAtual` (ResumoDoMes/Situação/Planejamento —
// gate da projeção "vai entrar/vai sair futuro") e `podeAvancar`
// (SeletorMes — até onde dá pra navegar mês afora). NÃO afeta `mesInicial()`
// abaixo, de propósito — ver comentário lá.
export function mesAtualISO() {
  return hojeEfetivoISO().slice(0, 7) // yyyy-mm
}

// Soma (ou subtrai) meses a um "yyyy-mm", sem depender de dia do mês.
export function somarMes(mesISO: string, delta: number): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const d = new Date(ano, mes - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const NOMES_MES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export function formatarMes(mesISO: string): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  const nome = NOMES_MES[mes - 1]
  return `${nome[0].toUpperCase()}${nome.slice(1)} de ${ano}`
}

// Mês inicial pra abrir o app: o mês atual de verdade, ou o último mês com
// dados reais semeados (agosto/2026) se o app for aberto depois disso — assim
// ele sempre abre num mês com informação, e dá pra avançar manualmente até o
// mês corrente de verdade (mesmo que vazio).
export const ULTIMO_MES_COM_DADOS_REAIS = '2026-08'

// Usa a data REAL do sistema direto (nunca `mesAtualISO()`/`hojeEfetivoISO()`
// simulada) de propósito (05/09/2026, Etapa 7): a tela inicial que abre não
// deve pular pro mês de uma simulação que o Rafael talvez tenha deixado
// ativa numa sessão anterior — isso seria surpreendente logo na abertura do
// app, o oposto do que a Decisão 6 pediu pra evitar. Simular data continua
// afetando tudo o resto (status, projeção, navegação de mês) assim que o app
// já está aberto — só o PONTO DE PARTIDA fica de fora.
export function mesInicial(): string {
  const atual = new Date().toISOString().slice(0, 7)
  return atual > ULTIMO_MES_COM_DADOS_REAIS ? ULTIMO_MES_COM_DADOS_REAIS : atual
}

// Props comuns de tela — todas recebem o mês selecionado (fixo no cabeçalho,
// mantido ao trocar de aba); só as telas "de mês" (Resumo, Situação,
// Lançamentos) de fato o usam, Categorias ignora.
//
// `aoAbrirLancamento` abre o modal de detalhe/edição de lançamento por cima
// da tela atual (ver App.tsx) — nunca troca de tela, então quem chamou nunca
// perde estado (categoria expandida, mês selecionado etc.) ao fechar. Passe
// um `id` pra editar um lançamento existente, ou omita pra criar um novo
// (opcionalmente sugerindo a categoria já selecionada).
// 04/09/2026, rodada seguinte — revisão de UI (achado central): Resumo e
// Situação pararam de renderizar o bloco "por grupo" (Fixo/Variável/
// Objetivos/Segurança) do zero cada uma — ele agora vive só em Planejamento,
// e as duas linkam pra lá com este atalho, em vez de duplicar a barra e
// arriscar os números divergirem entre telas (ver nota em Planejamento.tsx).
export interface TelaProps {
  mes: string
  aoMudarMes: (mes: string) => void
  aoAbrirLancamento: (opcoes?: { id?: number; categoriaIdSugerida?: number; contaIdSugerida?: number }) => void
  aoAbrirPlanejamento: () => void
}
