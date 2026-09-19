/* Quais contas são CARTÃO DE CRÉDITO — leitura síncrona (14/09/2026).
 *
 * POR QUE ISTO EXISTE. Até a build 063 o status de um lançamento saía só do
 * campo `pago`, e `pago` respondia duas perguntas ao mesmo tempo:
 *
 *   1. "isso já aconteceu?"        (o gasto existe, consome meta)
 *   2. "o dinheiro já saiu daqui?" (liquidação)
 *
 * Em conta corrente as duas coincidem. No cartão, não: a compra acontece hoje
 * e o dinheiro sai do banco no mês seguinte, quando a fatura vence — e quem
 * liquida não é a compra, é a fatura, que baixa dezenas de lançamentos de uma
 * vez (ver "Pagar esta fatura" em `Carteira.tsx`).
 *
 * O efeito disso, medido em setembro/2026 com a base entregue na build 063:
 * 23 compras do cartão apareciam como **"Atrasado", em vermelho**, quando a
 * fatura sequer tinha fechado. Nada estava atrasado.
 *
 * A REGRA QUE PASSOU A VALER (escolha do Rafael, 14/09/2026): o status olha a
 * CONTA e a DATA, não só o `pago`.
 *
 *   compra de cartão com data já passada  → "No cartão" = JÁ ACONTECEU
 *   compra de cartão com data futura      → "A pagar"   = comprometido
 *   conta corrente não paga, data passada → "Atrasado"  = ação dele de verdade
 *
 * O único item do cartão que pode ficar "A pagar"/"Atrasado" é a FATURA — que
 * é um lançamento na conta que paga, não no cartão. É o compromisso real.
 *
 * POR QUE UM CACHE SÍNCRONO, e não um parâmetro. `statusDoLancamento` é função
 * pura, chamada de seis componentes que hoje não carregam a lista de contas.
 * Enfiar `contas` por prop em todos eles espalharia a dependência sem ganho.
 * O padrão usado aqui é o MESMO já adotado por `hojeSimulado.ts`: um cache em
 * memória sincronizado por `liveQuery` (a API por trás de `useLiveQuery`,
 * utilizável fora de componente) assim que o módulo é importado.
 *
 * Janela de carregamento: até o primeiro `liveQuery` resolver, o conjunto está
 * vazio e uma compra de cartão não paga cairia em "Atrasado". Na prática não
 * aparece — o `App` não renderiza nada antes de a configuração chegar do banco
 * (`if (!modoPronto) return null`), o que já custa pelo menos uma ida ao
 * IndexedDB. Mesmo no pior caso é um frame, e nunca afeta número nenhum: só a
 * cor e o rótulo.
 */
import { liveQuery } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type Conta, type Lancamento } from './db'
import { dataVencimentoFatura, mesFaturaDoLancamento, situacaoDaFatura, DIA_FECHAMENTO_PADRAO } from './faturaCiclo'
import { hojeEfetivoISO } from './hojeSimulado'

let cartoesCache: ReadonlySet<number> = new Set<number>()
/* Build 100 (18/09/2026) — cache das CONTAS inteiras (não só o `Set` de ids),
   pra `faturaVencidaENaoPaga` conseguir ler `diaFechamento`/`diaVencimento`
   sem precisar de prop nenhuma — mesmo padrão síncrono do cache acima. */
let contasCache: readonly Conta[] = []
let categoriasCache: readonly Categoria[] = []
let lancamentosCache: readonly Lancamento[] = []

function montar(contas: { id?: number; tipo?: string }[]): ReadonlySet<number> {
  const s = new Set<number>()
  for (const c of contas) if (c.tipo === 'cartao' && c.id != null) s.add(c.id)
  return s
}

liveQuery(() => db.contas.toArray()).subscribe({
  next: (contas) => {
    cartoesCache = montar(contas)
    contasCache = contas
  },
  error: (erro) => {
    // Nunca deixa o app quebrar por causa disso — no pior caso o status volta
    // a se comportar como antes (só pelo `pago`).
    console.error('contasCartao: falha sincronizando com o banco', erro)
  },
})

liveQuery(() => db.categorias.toArray()).subscribe({
  next: (categorias) => { categoriasCache = categorias },
  error: (erro) => console.error('contasCartao: falha sincronizando categorias', erro),
})

liveQuery(() => db.lancamentos.toArray()).subscribe({
  next: (lancamentos) => { lancamentosCache = lancamentos },
  error: (erro) => console.error('contasCartao: falha sincronizando lançamentos', erro),
})

/** Esta conta é um cartão de crédito? `undefined` (sem conta) nunca é. */
export function ehContaDeCartao(contaId: number | undefined | null): boolean {
  return contaId != null && cartoesCache.has(contaId)
}

/* Build 100 (18/09/2026) — a fatura de UM lançamento de cartão já VENCEU
   (passou o dia de pagamento) e segue sem estar 100% paga? `statusDoLancamento`
   usa isso pra escolher entre "No cartão" (dentro do prazo — o normal) e
   "Vencido" (igual a qualquer outro pendente que passou da data), pedido do
   Rafael: *"quando passado a data de pagamento da fatura mudar pra Vencido
   igual aos demais"*. Mesmo cache síncrono de `ehContaDeCartao` — recalcula
   com `situacaoDaFatura` (a MESMA função da Carteira), nunca uma segunda
   regra de "pagou ou não" escrita aqui. */
export function faturaVencidaENaoPaga(contaId: number, mesFatura: string): boolean {
  const conta = contasCache.find((c) => c.id === contaId)
  if (!conta || conta.tipo !== 'cartao' || !conta.diaVencimento) return false
  const vencimento = dataVencimentoFatura(conta, mesFatura)
  if (!vencimento || hojeEfetivoISO() <= vencimento) return false
  const categoriaPorId = new Map(categoriasCache.map((c) => [c.id!, c]))
  const situacao = situacaoDaFatura(lancamentosCache as Lancamento[], categoriaPorId, conta, mesFatura)
  return !situacao.quitada
}

/* Build 101 (Decisão 121), pedido do Rafael: "lançamentos de meses
   anteriores mesmo com fatura paga aparecem como 'No cartão' e deveriam
   aparecer como 'Pago', somente quando não pago que devem ser 'No Cartão'".
   Antes, `statusDoLancamento` nunca devolvia "Pago" pra cartão (ver o
   comentário na própria função) — regra que continua valendo enquanto a
   fatura NÃO está 100% quitada (quem paga é ela inteira, não a compra
   avulsa). Mas quando `situacaoDaFatura(...).quitada` já é `true`, a compra
   deixou de ser "ainda por resolver": o dinheiro já saiu, de verdade, então
   "Pago" volta a ser a leitura certa. MESMA função `situacaoDaFatura`, nunca
   uma segunda regra de "pagou ou não" escrita aqui — só sem o filtro de
   vencimento já passado que `faturaVencidaENaoPaga` tem (aqui importa só se
   quitou, não se já venceu). */
export function faturaQuitada(contaId: number, mesFatura: string): boolean {
  const conta = contasCache.find((c) => c.id === contaId)
  if (!conta || conta.tipo !== 'cartao') return false
  const categoriaPorId = new Map(categoriasCache.map((c) => [c.id!, c]))
  const situacao = situacaoDaFatura(lancamentosCache as Lancamento[], categoriaPorId, conta, mesFatura)
  return situacao.quitada
}

/** O mês de fatura efetivo de um lançamento de cartão, lendo `diaFechamento`
    do cache — pra quem só tem o lançamento (ex.: `statusDoLancamento`) e não
    quer carregar a conta inteira por prop. */
export function mesFaturaDoLancamentoPeloCache(l: Pick<Lancamento, 'contaId' | 'dataCompetencia' | 'faturaOverride'>): string | null {
  const conta = contasCache.find((c) => c.id === l.contaId)
  if (!conta) return null
  return mesFaturaDoLancamento(conta.diaFechamento ?? DIA_FECHAMENTO_PADRAO, l)
}

/**
 * Para componente React que precisa RE-RENDERIZAR quando as contas mudam
 * (ex.: alguém acabou de cadastrar um cartão) — o valor em si não é usado,
 * o que importa é a inscrição.
 */
export function useContasCartao(): ReadonlySet<number> {
  const contas = useLiveQuery(() => db.contas.toArray(), [])
  return montar(contas ?? [])
}
