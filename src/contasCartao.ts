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
import { db } from './db'

let cartoesCache: ReadonlySet<number> = new Set<number>()

function montar(contas: { id?: number; tipo?: string }[]): ReadonlySet<number> {
  const s = new Set<number>()
  for (const c of contas) if (c.tipo === 'cartao' && c.id != null) s.add(c.id)
  return s
}

liveQuery(() => db.contas.toArray()).subscribe({
  next: (contas) => {
    cartoesCache = montar(contas)
  },
  error: (erro) => {
    // Nunca deixa o app quebrar por causa disso — no pior caso o status volta
    // a se comportar como antes (só pelo `pago`).
    console.error('contasCartao: falha sincronizando com o banco', erro)
  },
})

/** Esta conta é um cartão de crédito? `undefined` (sem conta) nunca é. */
export function ehContaDeCartao(contaId: number | undefined | null): boolean {
  return contaId != null && cartoesCache.has(contaId)
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
