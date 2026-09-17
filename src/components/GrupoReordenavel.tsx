import { useEffect, useRef, useState } from 'react'
import { db, type Categoria, type Lancamento } from '../db'
import ItemLancamentoAcoes from './ItemLancamentoAcoes'
import { MarcadorLinha, type Selecao } from './SelecaoETotais'

// Item 12 (15/09/2026) — press-and-hold drag-to-reorder, escopado por DIA:
// arrastar um lançamento nunca o tira do dia que já está (não existe alça
// entre dias diferentes — cada dia é um `GrupoReordenavel` isolado, com a
// própria lista de ids). O gesto nasce na própria linha (a alça ⠿ saiu na
// build 076): segurar por ~400ms entra em modo de arrasto (com feedback
// visual), soltar grava a ordem inteira do dia em `Lancamento.ordemManual`
// (todo item do grupo ganha um valor, 0..N-1 — nunca deixa mistura ambígua
// de "com ordem" e "sem ordem" dentro do mesmo dia).
//
// Build 090 (17/09/2026) — o gesto "selecionava o texto da tela" em vez de
// arrastar. Três coisas faltavam, todas invisíveis quando funcionam:
// 1. `user-select: none` na LINHA (`.linha-reordenavel`, index.css) — a regra
//    tinha ficado na alça que não existe mais.
// 2. Bloquear a ROLAGEM só enquanto o arrasto está ativo: o `touchmove` do
//    React é passivo (não aceita `preventDefault`), então é um listener
//    nativo com `{ passive: false }` no contêiner. Fora do arrasto a lista
//    rola normalmente — `touch-action: none` na linha inteira mataria o
//    scroll de quem só quer descer a lista.
// 3. Engolir o `contextmenu` da linha: no Android o long-press abre o menu
//    de contexto/seleção exatamente aos ~500ms, logo depois do nosso timer.
//
// Build 092 (17/09/2026) — REINCIDÊNCIA no celular: "segurar e arrastar
// ainda não está funcionando". A 090 provou o gesto com mouse e com toque
// SIMULADO (CDP) no Chromium headless, e os dois passam — mas o Android real
// não. CAUSA (hipótese forte, fundamentada no comportamento documentado do
// Chrome, não reproduzível aqui): o `html` tem `touch-action: pan-y` (shell
// do Kit). Com pan-y, o Chrome/WebView entrega a rolagem vertical ao
// compositor SEM esperar o JS: o `touchmove` vertical chega NÃO CANCELÁVEL
// (o `preventDefault` da 090 era ignorado) e, assim que a rolagem começa, o
// navegador dispara `pointercancel` — o arrasto morria e a lista rolava.
// Correção em duas partes:
// 1. No TOQUE o gesto passa a viver em Touch Events nativos (touchstart/
//    touchmove/touchend), que continuam chegando mesmo quando o navegador
//    decide rolar — o `pointercancel` deixa de matar o arrasto. Pointer
//    Events ficam só pro mouse/caneta.
// 2. Enquanto o arrasto está ativo, o `<main>` (único contêiner de rolagem
//    do N1) recebe `overflow: hidden` — não existe mais o que rolar, então
//    o dedo move a linha e não a página, independente de o `touchmove` ser
//    cancelável ou não. Restaurado ao soltar.
// `touch-action: none` na linha resolveria de um jeito só, mas mataria o
// scroll de quem só quer descer a lista (a linha É a lista inteira).
//
// Build 093 (17/09/2026) — TERCEIRA REINCIDÊNCIA: "consigo mover apenas uma
// linha pra baixo, pois a tela rola junto". A 092 ainda dependia de o
// navegador ACEITAR o `preventDefault` do `touchmove` — e com `touch-action:
// pan-y` no `html` o Android decide sozinho, na primeira movimentação, que o
// gesto é rolagem; daí em diante todo `touchmove` chega não-cancelável e o
// `overflow: hidden` do `<main>` não segura o compositor que já começou.
// O que muda agora é a PREMISSA: a linha reordenável tem `touch-action:
// none` (index.css, `.linha-reordenavel.toque-proprio`) — o navegador NUNCA
// inicia rolagem nativa a partir de um toque que começa numa linha; quem
// rola é este componente:
//   • dedo se move ANTES dos 400ms → ROLAGEM EMULADA: `main.scrollTop` segue
//     o dedo, e ao soltar continua por inércia (rAF, atrito 0,95/quadro);
//   • dedo parado por 400ms → ARRASTO: a linha segue o dedo, a lista não se
//     move (e perto das bordas do `<main>` rola devagar pra alcançar o resto).
// Com isso o `touchmove` é SEMPRE cancelável e não existe mais disputa com o
// compositor — é determinístico, não depende de timing do navegador. O
// deslizar horizontal (Duplicar/Editar/Excluir, `ItemLancamentoAcoes`) segue
// pelos handlers dele: um gesto predominantemente horizontal não emula
// rolagem. Com a seleção múltipla ativa a classe sai e a rolagem volta a ser
// nativa (não há gesto próprio nesse modo).
const ATRASO_PRESSIONAR_MS = 400
const FOLGA_MOVIMENTO_PX = 10
const BORDA_AUTO_ROLAGEM_PX = 48
const PASSO_AUTO_ROLAGEM_PX = 8
const ATRITO_INERCIA = 0.95

export default function GrupoReordenavel({
  itens,
  categoriaPorId,
  contaPorId,
  aoAbrirLancamento,
  selecao,
}: {
  itens: Lancamento[] // já vem ordenado (data → `compararDentroDoDia`)
  categoriaPorId: Map<number, Categoria>
  contaPorId: Map<number, { nome: string }>
  aoAbrirLancamento: (o?: { id?: number; abrirClonando?: boolean }) => void
  selecao: Selecao
}) {
  const idsAtuais = itens.map((l) => l.id!)
  const chaveAtual = idsAtuais.join(',')

  // Ordem exibida DURANTE um arrasto em andamento — sincronizada com `itens`
  // sempre que a fonte mudar por um motivo que não seja o próprio arrasto
  // (novo lançamento, exclusão, filtro, troca de ordenação). Ajuste de
  // estado derivado de prop durante o render, com `useState` guardando a
  // última chave vista (não `useRef` — ler `ref.current` durante o render é
  // desaconselhado; `useState` é o padrão oficial do React pra esse caso,
  // "Adjusting state when a prop changes"). Roda antes da pintura, sem
  // piscar — não é um `useEffect`.
  const [ordemArrasto, setOrdemArrasto] = useState<number[] | null>(null)
  const [chaveAnterior, setChaveAnterior] = useState(chaveAtual)
  if (chaveAnterior !== chaveAtual) {
    setChaveAnterior(chaveAtual)
    if (ordemArrasto !== null) setOrdemArrasto(null)
  }

  const idsExibidos = ordemArrasto ?? idsAtuais
  const porId = new Map(itens.map((l) => [l.id!, l]))

  const arrastandoIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [emArrasto, setEmArrasto] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  /* Espelhos em ref do que os listeners NATIVOS de toque precisam ler — eles
     são registrados uma vez e não enxergam o estado/props do render atual. */
  const ordemRef = useRef<number[] | null>(null)
  ordemRef.current = ordemArrasto
  const idsAtuaisRef = useRef(idsAtuais)
  idsAtuaisRef.current = idsAtuais
  const selecaoAtivaRef = useRef(selecao.ativa)
  selecaoAtivaRef.current = selecao.ativa
  const engolirProximoCliqueRef = useRef(false)

  function limparTimer() {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  /* Build 092: trava/destrava a rolagem do `<main>` durante o arrasto (ver
     cabeçalho). */
  function travarRolagem(travar: boolean) {
    const main = containerRef.current?.closest('main') as HTMLElement | null
    if (!main) return
    main.style.overflowY = travar ? 'hidden' : ''
  }

  function ativarArrasto(id: number) {
    arrastandoIdRef.current = id
    setEmArrasto(id)
    travarRolagem(true)
    try {
      navigator.vibrate?.(25)
    } catch {
      // sem vibração, sem problema — é só um aviso tátil de "pegou"
    }
  }

  function moverPara(y: number) {
    if (arrastandoIdRef.current == null || !containerRef.current) return
    const linhas = [...containerRef.current.querySelectorAll<HTMLElement>('[data-linha-id]')]
    if (linhas.length === 0) return
    let novoIndex = linhas.length - 1
    for (let i = 0; i < linhas.length; i++) {
      const rect = linhas[i].getBoundingClientRect()
      if (y < rect.top + rect.height / 2) {
        novoIndex = i
        break
      }
    }
    const atual = ordemRef.current ?? idsAtuaisRef.current
    const indiceAtual = atual.indexOf(arrastandoIdRef.current)
    if (indiceAtual === -1 || indiceAtual === novoIndex) return
    const nova = [...atual]
    nova.splice(indiceAtual, 1)
    nova.splice(novoIndex, 0, arrastandoIdRef.current)
    ordemRef.current = nova
    setOrdemArrasto(nova)
  }

  function commitarOrdem() {
    if (arrastandoIdRef.current == null) return
    const ordemFinal = ordemRef.current ?? idsAtuaisRef.current
    ordemFinal.forEach((id, i) => {
      db.lancamentos.update(id, { ordemManual: i })
    })
  }

  /* Build 090: soltar depois de um arrasto de verdade dispara um `click` na
     linha, e o clique abre o lançamento — a pessoa reordenava e o formulário
     abria por cima. O próximo clique depois de um arrasto é engolido na
     captura; um toque comum (sem arrasto) continua abrindo normalmente. */
  function encerrar() {
    limparTimer()
    if (arrastandoIdRef.current != null) engolirProximoCliqueRef.current = true
    commitarOrdem()
    arrastandoIdRef.current = null
    travarRolagem(false)
    setEmArrasto(null)
    setOrdemArrasto(null)
    ordemRef.current = null
  }

  /* ---- TOQUE: Touch Events nativos + rolagem emulada (build 093, ver cabeçalho) ---- */
  const inerciaRef = useRef<number | null>(null)
  function pararInercia() {
    if (inerciaRef.current != null) {
      cancelAnimationFrame(inerciaRef.current)
      inerciaRef.current = null
    }
  }
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const mainDe = () => el.closest('main') as HTMLElement | null
    let toqueId: number | null = null
    let x0 = 0
    let y0 = 0
    let scrollTop0 = 0
    /* 'segurando' = ainda nos 400ms; 'rolando' = rolagem emulada; 'horizontal'
       = gesto do painel de ações (nada a fazer aqui); 'arrastando' = reordenar. */
    let modo: 'segurando' | 'rolando' | 'horizontal' | 'arrastando' = 'segurando'
    let yAnt = 0
    let tAnt = 0
    let velocidade = 0 // px por ms, positivo = dedo descendo
    const acharToque = (e: TouchEvent) => [...e.changedTouches].find((t) => t.identifier === toqueId) ?? null
    const onTouchStart = (e: TouchEvent) => {
      pararInercia()
      if (selecaoAtivaRef.current || toqueId != null || e.touches.length !== 1) return
      const linha = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-linha-id]')
      if (!linha || !el.contains(linha)) return
      const t = e.changedTouches[0]
      toqueId = t.identifier
      x0 = t.clientX
      y0 = t.clientY
      yAnt = y0
      tAnt = e.timeStamp
      velocidade = 0
      scrollTop0 = mainDe()?.scrollTop ?? 0
      modo = 'segurando'
      const id = Number(linha.dataset.linhaId)
      limparTimer()
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        if (modo !== 'segurando') return
        modo = 'arrastando'
        ativarArrasto(id)
      }, ATRASO_PRESSIONAR_MS)
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = acharToque(e)
      if (!t) return
      const dx = t.clientX - x0
      const dy = t.clientY - y0
      if (modo === 'segurando') {
        if (Math.abs(dx) <= FOLGA_MOVIMENTO_PX && Math.abs(dy) <= FOLGA_MOVIMENTO_PX) return
        // Mexeu antes dos 400ms: é rolagem (vertical) ou o deslizar do painel
        // de ações (horizontal). O timer cai — não é começo de arrasto.
        limparTimer()
        modo = Math.abs(dy) >= Math.abs(dx) ? 'rolando' : 'horizontal'
      }
      if (modo === 'horizontal') return
      if (e.cancelable) e.preventDefault()
      if (modo === 'rolando') {
        const main = mainDe()
        if (main) main.scrollTop = scrollTop0 - dy
        const dt = e.timeStamp - tAnt
        if (dt > 0) velocidade = (t.clientY - yAnt) / dt
        yAnt = t.clientY
        tAnt = e.timeStamp
        return
      }
      // arrastando
      moverPara(t.clientY)
      const main = mainDe()
      if (main) {
        const r = main.getBoundingClientRect()
        if (t.clientY < r.top + BORDA_AUTO_ROLAGEM_PX) main.scrollTop -= PASSO_AUTO_ROLAGEM_PX
        else if (t.clientY > r.bottom - BORDA_AUTO_ROLAGEM_PX) main.scrollTop += PASSO_AUTO_ROLAGEM_PX
      }
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (!acharToque(e)) return
      toqueId = null
      const modoFinal = modo
      modo = 'segurando'
      if (modoFinal === 'rolando') {
        limparTimer()
        // Inércia: continua na velocidade do dedo, perdendo 5% por quadro.
        const main = mainDe()
        let v = velocidade * 16.7 // px por quadro
        if (main && Math.abs(v) > 0.5 && e.type === 'touchend') {
          const passo = () => {
            main.scrollTop -= v
            v *= ATRITO_INERCIA
            inerciaRef.current = Math.abs(v) < 0.5 ? null : requestAnimationFrame(passo)
          }
          inerciaRef.current = requestAnimationFrame(passo)
        }
        return
      }
      encerrar()
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      pararInercia()
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
    // Os handlers leem tudo por ref; registrar uma vez basta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ---- MOUSE/CANETA: Pointer Events (o toque é ignorado aqui, de propósito
     — no toque o `pointercancel` da rolagem mataria o gesto; ver cabeçalho) ---- */
  const ehToque = (e: React.PointerEvent) => e.pointerType === 'touch'

  function onPointerDownLinha(id: number, e: React.PointerEvent) {
    if (ehToque(e)) return
    limparTimer()
    const alvo = e.currentTarget
    const pointerId = e.pointerId
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      ativarArrasto(id)
      try {
        alvo.setPointerCapture(pointerId)
      } catch {
        // Alguns navegadores/ambientes de teste não suportam captura de
        // ponteiro — o arrasto continua funcionando via listener no
        // contêiner, só sem a garantia de receber o evento fora do elemento.
      }
    }, ATRASO_PRESSIONAR_MS)
  }

  function onPointerUpOuCancelar(e: React.PointerEvent) {
    if (ehToque(e)) return
    encerrar()
  }

  function onClickCaptureContainer(e: React.MouseEvent) {
    if (!engolirProximoCliqueRef.current) return
    engolirProximoCliqueRef.current = false
    e.stopPropagation()
    e.preventDefault()
  }

  function onPointerMoveContainer(e: React.PointerEvent) {
    if (ehToque(e)) return
    moverPara(e.clientY)
  }

  return (
    <div
      ref={containerRef}
      onPointerMove={onPointerMoveContainer}
      onPointerUp={onPointerUpOuCancelar}
      onPointerCancel={onPointerUpOuCancelar}
      onClickCapture={onClickCaptureContainer}
    >
      {idsExibidos.map((id) => {
        const l = porId.get(id)
        if (!l) return null
        return (
          <div
            key={id}
            data-linha-id={id}
            data-testid={`linha-reordenavel-${id}`}
            className={`linha-selecionavel linha-reordenavel ${selecao.ativa ? '' : 'toque-proprio'} ${emArrasto === id ? 'em-arrasto' : ''}`}
            onPointerDown={selecao.ativa ? undefined : (e) => onPointerDownLinha(id, e)}
            onPointerUp={(e) => { if (!ehToque(e)) limparTimer() }}
            onPointerLeave={(e) => { if (!ehToque(e)) limparTimer() }}
            onContextMenu={(e) => {
              // Build 090: o long-press do Android dispara o menu de contexto
              // (seleção de texto) no meio do gesto — só enquanto se segura ou
              // arrasta; um clique com o botão direito no desktop continua igual.
              if (timerRef.current != null || arrastandoIdRef.current != null) e.preventDefault()
            }}
          >
            {selecao.ativa && (
              <MarcadorLinha marcado={selecao.estaMarcado(l.id!)} onAlternar={() => selecao.alternar(l.id!)} />
            )}
            <ItemLancamentoAcoes
              lancamento={l}
              categoria={categoriaPorId.get(l.categoriaId)}
              origemLabel={contaPorId.get(l.contaId)?.nome}
              onAbrir={() => (selecao.ativa ? selecao.alternar(l.id!) : aoAbrirLancamento({ id: l.id }))}
              onDuplicar={() => aoAbrirLancamento({ id: l.id, abrirClonando: true })}
            />
          </div>
        )
      })}
    </div>
  )
}
