/* LIMPAR O CACHE DO APP — a mesma rotina para os três botões que precisam
   dela (build 099, 18/09/2026): "Limpar cache do app", "Limpar dados" e
   "Restaurar padrão de fábrica". Pedido do Rafael: "essa restauração ou o
   limpar dados deve limpar cache tbm".

   Cada mecanismo é tentado de forma independente — a falha de um (ex.:
   Service Worker não suportado sob `file://`, que é o caso normal e esperado,
   não um erro de verdade) nunca impede o outro de rodar. O IndexedDB (os
   dados do app) NUNCA é tocado aqui — quem limpa dados é quem chamou. */
export interface ResultadoCache {
  swRemovidos: number
  cachesRemovidos: number
  /** Service Worker indisponível nesta origem (o normal sob `file://`). */
  swIndisponivel: boolean
  cachesErro: boolean
}

export async function limparCacheDoNavegador(): Promise<ResultadoCache> {
  let swRemovidos = 0
  let swIndisponivel = false
  try {
    if ('serviceWorker' in navigator) {
      const registros = await navigator.serviceWorker.getRegistrations()
      for (const r of registros) {
        await r.unregister()
        swRemovidos++
      }
    } else {
      swIndisponivel = true
    }
  } catch {
    swIndisponivel = true
  }

  let cachesRemovidos = 0
  let cachesErro = false
  try {
    if ('caches' in window) {
      const chaves = await caches.keys()
      for (const k of chaves) {
        await caches.delete(k)
        cachesRemovidos++
      }
    }
  } catch {
    cachesErro = true
  }
  return { swRemovidos, cachesRemovidos, swIndisponivel, cachesErro }
}

/** Uma frase curta pra encaixar no resultado de quem chamou. */
export function resumoCache(r: ResultadoCache): string {
  const partes: string[] = []
  if (r.swRemovidos > 0) partes.push(`${r.swRemovidos} Service Worker(s)`)
  if (r.cachesRemovidos > 0) partes.push(`${r.cachesRemovidos} cache(s) de versão antiga`)
  if (partes.length > 0) return `Cache limpo: ${partes.join(' e ')}.`
  return 'Cache verificado: nada de versão antiga guardado neste navegador.'
}
