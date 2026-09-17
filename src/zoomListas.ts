/* ZOOM DAS FONTES DAS LISTAS — build 094 (17/09/2026), item 2 do Rafael.
 *
 * O PEDIDO, nas palavras dele: *"um campo que coloque % que quer aumentar das
 * fontes da lista de Lançamentos (menu Lançamentos e Carteiras), esse
 * percentual = 0 significa que quer o padrão de hoje, mas pode aumentar ou
 * diminuir (…) esse percentual não é pra igualar o tamanho das fontes visto
 * que temos titulo, numero, tarja, conta, etc cada um num tamanho, então mexer
 * nesse percentual não deve igualar todos em mesmo tamanho, mas sim que deve
 * aplicar esse aumento no tamanho atual hoje de cada um. permitir colocar
 * negativo tbm, assim as fontes devem diminuir, é como se fosse um zoom."*
 *
 * COMO ISSO É FEITO, e por que assim: cada elemento da lista continua com o
 * SEU tamanho declarado no CSS (título 13px, conta 12px, data 12px, valor
 * 16px, tarja 11px) — o que muda é que cada declaração virou
 * `calc(<o tamanho de sempre> * var(--zoom-lista))`. Um fator só multiplicando
 * cinco bases diferentes é exatamente "zoom": as proporções entre eles ficam
 * intactas, e em 0% o `calc` devolve o mesmo pixel de antes. A alternativa
 * óbvia — escrever um tamanho por elemento — acabaria igualando tudo no
 * primeiro descuido, que é o que ele mandou não fazer.
 *
 * ONDE O FATOR ENTRA: numa variável CSS no `<html>`, escrita por
 * `useAplicarZoomListas()` (chamado uma vez, no `App`). Por ser variável CSS,
 * QUALQUER elemento pode redefini-la para si e seus filhos — é isso que
 * permite os quadros de prévia (ver `PreviaLista.tsx`) mostrarem o tamanho de
 * hoje e o resultado lado a lado, usando a MESMA marcação da lista de verdade
 * em vez de uma imitação que envelheceria sozinha.
 *
 * AS TRÊS CAMADAS são as mesmas do resto do app (fábrica → publicado pelo N0 →
 * personalizado por este ambiente), com o mesmo escopo de publicação
 * ('naoEditados' × 'todos') de `notificacaoParametros.ts`. Ver lá o desenho
 * completo e a ressalva honesta sobre o que dá pra saber sem servidor.
 */
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from './db'
import { AMBIENTE_DESTE_APARELHO, ambienteDoBanco } from './ambiente'
import { salvarConfiguracaoIcones } from './configuracaoIcones'
import type { EscopoPublicacao } from './notificacaoParametros'

/** 0 = o tamanho de hoje. É o padrão de fábrica e o valor de "sem opinião". */
export const ZOOM_LISTAS_PADRAO = 0

/* Limites do campo. O mínimo não é −100 por um motivo prático: a partir de
   uns −50% a tarja de status (11px de base) fica ilegível antes de qualquer
   outra coisa, e um campo que aceita um valor que ninguém consegue ler é um
   campo que engana. O máximo é generoso — quem precisa de fonte grande
   precisa de verdade. */
export const ZOOM_LISTAS_MIN = -40
export const ZOOM_LISTAS_MAX = 100
export const ZOOM_LISTAS_PASSO = 5

/** Prende o valor na faixa e arredonda — toda escrita passa por aqui. */
export function normalizarZoom(pct: number): number {
  if (!Number.isFinite(pct)) return ZOOM_LISTAS_PADRAO
  return Math.min(ZOOM_LISTAS_MAX, Math.max(ZOOM_LISTAS_MIN, Math.round(pct)))
}

/** O fator que vai pra variável CSS: 0% → 1, +20% → 1.2, −10% → 0.9. */
export function fatorDoZoom(pct: number): number {
  return 1 + normalizarZoom(pct) / 100
}

/** O que o N0 publica. Mesma forma de `ParametrosNotificacaoN0`. */
export interface ZoomListasN0 {
  versao: number
  atualizadoEm: string
  escopo: EscopoPublicacao
  pct: number
}

interface ConfigParcial {
  ambienteAtivoId?: string
  zoomListasPorAmbiente?: Record<string, number>
  zoomVersaoPorAmbiente?: Record<string, number>
  platformN0?: { zoomListas?: ZoomListasN0 }
}

/** Fábrica + o que o N0 publicou — o "padrão do app hoje", sem a camada do cliente. */
export function padraoDoAppZoom(publicado: ZoomListasN0 | undefined): number {
  return normalizarZoom(publicado?.pct ?? ZOOM_LISTAS_PADRAO)
}

function comporZoom(publicado: ZoomListasN0 | undefined, doAmbiente: number | undefined): number {
  return normalizarZoom(doAmbiente ?? padraoDoAppZoom(publicado))
}

/* Cache do último valor lido. Existe só pra `useZoomListas` já nascer com o
   valor certo no primeiro render — sem ele a lista abriria no tamanho de
   fábrica e saltaria pro tamanho escolhido um quadro depois. */
let cacheZoom = ZOOM_LISTAS_PADRAO

function lerDaConfig(cfg: ConfigParcial | undefined) {
  const amb = cfg?.ambienteAtivoId || AMBIENTE_DESTE_APARELHO
  const proprio = cfg?.zoomListasPorAmbiente?.[amb]
  const publicado = cfg?.platformN0?.zoomListas
  return { proprio, publicado, efetivo: comporZoom(publicado, proprio) }
}

liveQuery(() => db.configuracoes.get(1)).subscribe({
  next: (cfg) => { cacheZoom = lerDaConfig(cfg as ConfigParcial | undefined).efetivo },
  error: (e) => { console.error('zoomListas: falha lendo configuração', e) },
})

/** Versão reativa, pra tela que edita e pra quem precisa re-renderizar. */
export function useZoomListas(): { efetivo: number; proprio: number | undefined; padraoApp: number } {
  const [estado, setEstado] = useState(() => ({
    efetivo: cacheZoom,
    proprio: undefined as number | undefined,
    padraoApp: ZOOM_LISTAS_PADRAO,
  }))
  useEffect(() => {
    const ins = liveQuery(() => db.configuracoes.get(1)).subscribe({
      next: (c) => {
        const { proprio, publicado, efetivo } = lerDaConfig(c as ConfigParcial | undefined)
        setEstado({ efetivo, proprio, padraoApp: padraoDoAppZoom(publicado) })
      },
      error: () => { /* nunca derruba a tela */ },
    })
    return () => ins.unsubscribe()
  }, [])
  return estado
}

/**
 * Escreve o fator em vigor na variável CSS do `<html>`. Montado UMA vez, no
 * `App` — a variável cascateia para a árvore inteira, então nenhuma lista
 * precisa saber que existe zoom. Os quadros de prévia redefinem a mesma
 * variável para si (ver `PreviaLista.tsx`) e ficam imunes a este valor.
 */
export function useAplicarZoomListas(): void {
  const { efetivo } = useZoomListas()
  useEffect(() => {
    document.documentElement.style.setProperty('--zoom-lista', String(fatorDoZoom(efetivo)))
  }, [efetivo])
}

/* --- Escrita pelo lado do CLIENTE ----------------------------------------- */

/** Personaliza o zoom DESTE ambiente (camada 3). */
export async function definirZoomDoUsuario(pct: number): Promise<void> {
  const cfg = await db.configuracoes.get(1)
  const amb = await ambienteDoBanco()
  const mapa = { ...(cfg?.zoomListasPorAmbiente ?? {}) }
  mapa[amb] = normalizarZoom(pct)
  await salvarConfiguracaoIcones({ zoomListasPorAmbiente: mapa })
}

/**
 * "Voltar ao padrão do app": apaga a camada deste ambiente. O que volta a
 * valer é o que o N0 publica HOJE — nunca uma constante congelada aqui.
 */
export async function restaurarZoomPadraoDoApp(): Promise<void> {
  const cfg = await db.configuracoes.get(1)
  const amb = await ambienteDoBanco()
  const mapa = { ...(cfg?.zoomListasPorAmbiente ?? {}) }
  delete mapa[amb]
  await salvarConfiguracaoIcones({ zoomListasPorAmbiente: mapa })
}

/* --- Aplicação da publicação do N0 (roda no mount do App) ------------------ */

/**
 * Espelho de `aplicarParametrosN0()`. Só faz trabalho de verdade no escopo
 * 'todos' — é ele que APAGA a personalização do ambiente. No 'naoEditados' a
 * composição das camadas já entrega o valor novo sozinha; o que fica aqui é a
 * marca de versão, sem a qual uma imposição seria refeita a cada abertura e o
 * cliente nunca mais conseguiria escolher o próprio tamanho.
 * Nunca lança: falhar aqui não pode impedir o app de abrir.
 */
export async function aplicarZoomN0(): Promise<boolean> {
  try {
    const cfg = await db.configuracoes.get(1)
    const pub = (cfg as ConfigParcial | undefined)?.platformN0?.zoomListas
    if (!pub) return false
    const amb = await ambienteDoBanco()
    const aplicadas = cfg?.zoomVersaoPorAmbiente ?? {}
    if ((aplicadas[amb] ?? 0) >= pub.versao) return false
    const patch: Record<string, unknown> = {
      zoomVersaoPorAmbiente: { ...aplicadas, [amb]: pub.versao },
    }
    if (pub.escopo === 'todos') {
      const mapa = { ...(cfg?.zoomListasPorAmbiente ?? {}) }
      delete mapa[amb]
      patch.zoomListasPorAmbiente = mapa
    }
    await salvarConfiguracaoIcones(patch)
    return true
  } catch {
    return false
  }
}

/**
 * Quais ambientes DESTE APARELHO escolheram um tamanho próprio — é o que a
 * tela do N0 lista antes de publicar no escopo 'todos'. Sem servidor é tudo
 * que dá pra saber de verdade, e a tela diz isso com todas as letras.
 */
export async function ambientesComZoomProprio(): Promise<{ ambiente: string; pct: number }[]> {
  const cfg = await db.configuracoes.get(1)
  const mapa = cfg?.zoomListasPorAmbiente ?? {}
  return Object.entries(mapa).map(([ambiente, pct]) => ({ ambiente, pct }))
}
