/* COR DO TEXTO DA LINHA DE DATA — build 101 (18/09/2026), pedido do Rafael.
 *
 * *"Criar parametro pro N0 salvar como padrão e tbm pro N1 editar, pra cor
 * do texto da linha de data na lista de Lançamento simples e pra completa e
 * mostrar ambas na mesma prévisualização."*
 *
 * UM valor só, aplicado às DUAS listagens (Completa — `.sessao-data`, tela
 * Lançamentos — e Simples — `.sessao-data-simples`, drill-in de categoria/
 * fatura na Carteira): hoje as duas já usam exatamente o mesmo tom
 * (`var(--texto-fraco)`), então um parâmetro único mantém essa consistência
 * em vez de a pessoa poder deixá-las diferentes sem querer. Se um dia fizer
 * sentido separar os dois, o padrão já está aqui (ver `EscopoPublicacao`) —
 * só duplicar a chave.
 *
 * SEM PERSONALIZAÇÃO = SEM HEX GRAVADO, DE PROPÓSITO. O tom de hoje
 * (`--texto-fraco`) muda entre tema claro/escuro sozinho; gravar um hex fixo
 * como "padrão" quebraria essa adaptação num dos dois temas. Por isso o
 * valor é `string | undefined`: undefined é "continua seguindo o tema", e só
 * a partir do momento em que a pessoa (ou o N0) escolhe uma cor da paleta é
 * que existe um hex gravado — que passa a valer IGUAL nos dois temas (é uma
 * escolha deliberada, avisada na tela).
 *
 * AS TRÊS CAMADAS são as mesmas do resto do app (fábrica → publicado pelo N0
 * → personalizado por este ambiente) — mesmo desenho de `zoomListas.ts`.
 */
import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import { db } from './db'
import { AMBIENTE_DESTE_APARELHO, ambienteDoBanco } from './ambiente'
import { salvarConfiguracaoIcones } from './configuracaoIcones'
import type { EscopoPublicacao } from './notificacaoParametros'

/** `undefined` = sem personalização, segue o tom do tema (claro/escuro). */
export const COR_DATA_LISTA_PADRAO: string | undefined = undefined

/* Build 104 (19/09/2026) — sentinel só pra fronteira com `PreviaLista`, NUNCA
 * gravado no banco. Resolve um bug relatado pelo Rafael: "no N1 a prévia está
 * mudando o 'Como está hoje' e o 'Como vai ficar'".
 *
 * A causa: `PreviaLista` recebe a cor por variável CSS, e quando `corData` é
 * `undefined` ela OMITE a variável de propósito — é o que deixa o quadro de
 * zoom/ícones (que não fala de cor) herdar a cor em vigor no app. Mas
 * `CorDataLista.tsx`/`CorDataListaN0.tsx` também usam `undefined` pra dizer
 * "sem cor escolhida, tom do tema" — e como o N1 grava a escolha DIRETO no
 * banco a cada clique (sem rascunho), o quadro "Como está hoje" (que quer um
 * valor FIXO) acabava herdando a variável global, que muda a cada clique no
 * quadro "Como vai ficar" ao lado. O N0 nunca mostrou o problema por outro
 * motivo: lá a cor sendo testada é rascunho em `useState`, nunca chega a
 * tocar a variável global antes de publicar.
 *
 * A correção: todo quadro que representa um valor de referência FIXO (não o
 * "como vai ficar" ao vivo) passa este sentinel em vez de `undefined` cru —
 * `PreviaLista` então fixa `var(--texto-fraco)` explicitamente no próprio
 * quadro, em vez de deixar a variável ausente (e herdável). Ver o cabeçalho
 * de `PreviaLista.tsx`. */
export const COR_DATA_LISTA_TEMA = 'tema' as const

/** O que o N0 publica. Mesma forma de `ZoomListasN0`. */
export interface CorDataListaN0 {
  versao: number
  atualizadoEm: string
  escopo: EscopoPublicacao
  /** Ausente = o padrão de fábrica (segue o tema) também pra cliente novo. */
  cor?: string
}

interface ConfigParcial {
  ambienteAtivoId?: string
  corDataListaPorAmbiente?: Record<string, string>
  corDataListaVersaoPorAmbiente?: Record<string, number>
  platformN0?: { corDataLista?: CorDataListaN0 }
}

/** Fábrica + o que o N0 publicou — o "padrão do app hoje", sem a camada do cliente. */
export function padraoDoAppCorData(publicado: CorDataListaN0 | undefined): string | undefined {
  return publicado?.cor ?? COR_DATA_LISTA_PADRAO
}

function comporCorData(publicado: CorDataListaN0 | undefined, doAmbiente: string | undefined): string | undefined {
  return doAmbiente ?? padraoDoAppCorData(publicado)
}

/* Cache do último valor lido — mesma razão do `cacheZoom` em `zoomListas.ts`:
   `useCorDataLista` nasce com o valor certo no primeiro render. */
let cacheCor: string | undefined = COR_DATA_LISTA_PADRAO

function lerDaConfig(cfg: ConfigParcial | undefined) {
  const amb = cfg?.ambienteAtivoId || AMBIENTE_DESTE_APARELHO
  const proprio = cfg?.corDataListaPorAmbiente?.[amb]
  const publicado = cfg?.platformN0?.corDataLista
  return {
    proprio,
    publicado,
    efetivo: comporCorData(publicado, proprio),
  }
}

liveQuery(() => db.configuracoes.get(1)).subscribe({
  next: (cfg) => {
    cacheCor = lerDaConfig(cfg as ConfigParcial | undefined).efetivo
  },
  error: (e) => { console.error('corDataLista: falha lendo configuração', e) },
})

/** Versão reativa, pra tela que edita e pra quem precisa re-renderizar. */
export function useCorDataLista(): {
  efetivo: string | undefined
  proprio: string | undefined
  padraoApp: string | undefined
} {
  const [estado, setEstado] = useState(() => ({
    efetivo: cacheCor,
    proprio: undefined as string | undefined,
    padraoApp: COR_DATA_LISTA_PADRAO,
  }))
  useEffect(() => {
    const ins = liveQuery(() => db.configuracoes.get(1)).subscribe({
      next: (c) => {
        const r = lerDaConfig(c as ConfigParcial | undefined)
        setEstado({ efetivo: r.efetivo, proprio: r.proprio, padraoApp: padraoDoAppCorData(r.publicado) })
      },
      error: () => { /* nunca derruba a tela */ },
    })
    return () => ins.unsubscribe()
  }, [])
  return estado
}

/**
 * Escreve a cor em vigor na variável CSS do `<html>`. Montado UMA vez, no
 * `App` — cascateia pra árvore inteira. Sem cor (`undefined`), REMOVE a
 * variável — é o que deixa `.sessao-data`/`.sessao-data-simples` caírem de
 * volta no `var(--texto-fraco)` do CSS (ver o fallback na declaração das
 * duas classes, `index.css`), continuando a acompanhar o tema.
 */
export function useAplicarCorDataLista(): void {
  const { efetivo } = useCorDataLista()
  useEffect(() => {
    if (efetivo) document.documentElement.style.setProperty('--cor-data-lista', efetivo)
    else document.documentElement.style.removeProperty('--cor-data-lista')
  }, [efetivo])
}

/* --- Escrita pelo lado do CLIENTE ----------------------------------------- */

/** Personaliza a cor DESTE ambiente (camada 3). `undefined` = sem cor própria. */
export async function definirCorDataListaDoUsuario(cor: string | undefined): Promise<void> {
  const cfg = await db.configuracoes.get(1)
  const amb = await ambienteDoBanco()
  const mapa = { ...(cfg?.corDataListaPorAmbiente ?? {}) }
  if (cor) mapa[amb] = cor
  else delete mapa[amb]
  await salvarConfiguracaoIcones({ corDataListaPorAmbiente: mapa })
}

/**
 * "Voltar ao padrão do app": apaga a camada deste ambiente. O que volta a
 * valer é o que o N0 publica HOJE — nunca uma constante congelada aqui.
 */
export async function restaurarCorDataListaPadraoDoApp(): Promise<void> {
  const cfg = await db.configuracoes.get(1)
  const amb = await ambienteDoBanco()
  const mapa = { ...(cfg?.corDataListaPorAmbiente ?? {}) }
  delete mapa[amb]
  await salvarConfiguracaoIcones({ corDataListaPorAmbiente: mapa })
}

/* --- Aplicação da publicação do N0 (roda no mount do App) ------------------ */

/**
 * Espelho de `aplicarZoomN0()`. Só faz trabalho de verdade no escopo 'todos'
 * — é ele que APAGA a personalização do ambiente. Nunca lança: falhar aqui
 * não pode impedir o app de abrir.
 */
export async function aplicarCorDataListaN0(): Promise<boolean> {
  try {
    const cfg = await db.configuracoes.get(1)
    const pub = (cfg as ConfigParcial | undefined)?.platformN0?.corDataLista
    if (!pub) return false
    const amb = await ambienteDoBanco()
    const aplicadas = cfg?.corDataListaVersaoPorAmbiente ?? {}
    if ((aplicadas[amb] ?? 0) >= pub.versao) return false
    const patch: Record<string, unknown> = {
      corDataListaVersaoPorAmbiente: { ...aplicadas, [amb]: pub.versao },
    }
    if (pub.escopo === 'todos') {
      const mapa = { ...(cfg?.corDataListaPorAmbiente ?? {}) }
      delete mapa[amb]
      patch.corDataListaPorAmbiente = mapa
    }
    await salvarConfiguracaoIcones(patch)
    return true
  } catch {
    return false
  }
}

/**
 * Quais ambientes DESTE APARELHO escolheram uma cor própria — é o que a
 * tela do N0 lista antes de publicar no escopo 'todos'.
 */
export async function ambientesComCorDataListaPropria(): Promise<{ ambiente: string; cor: string }[]> {
  const cfg = await db.configuracoes.get(1)
  const mapa = cfg?.corDataListaPorAmbiente ?? {}
  return Object.entries(mapa).map(([ambiente, cor]) => ({ ambiente, cor }))
}
