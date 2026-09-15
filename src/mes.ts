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

// Mês inicial pra abrir o app: sempre o mês atual DE VERDADE.
//
// 15/09/2026 — correção de bug real reportado pelo Rafael ("abre em
// agosto/15-08-2026 em vez de hoje"). `ULTIMO_MES_COM_DADOS_REAIS` (fixado em
// '2026-08' desde 30/08/2026, quando a semente ainda não cobria setembro)
// nunca foi atualizado depois que a semente passou a incluir setembro em
// aberto (`MES_EM_ABERTO_NA_SEMENTE`, build 063) — o clamp continuava
// forçando agosto pra sempre, mesmo com o app já sabendo lidar com o mês
// corrente vazio/em aberto. Removido: o app agora sempre abre no mês real,
// sem nenhum teto artificial. Se um dia a semente for descontinuada e um mês
// muito à frente do último dado real precisar de um teto de novo, isso volta
// a ser decisão explícita do Rafael, não um valor esquecido no código.
export function mesInicial(): string {
  return new Date().toISOString().slice(0, 7)
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
  aoAbrirLancamento: (opcoes?: { id?: number; categoriaIdSugerida?: number; contaIdSugerida?: number; abrirClonando?: boolean }) => void
  aoAbrirPlanejamento: () => void
  /** Abre a tela de Calibragem (build 059) — os percentuais vistos juntos. */
  aoAbrirCalibragem?: () => void
}
