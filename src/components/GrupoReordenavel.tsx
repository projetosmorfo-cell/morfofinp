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
// Pointer Events (não touch/mouse separados, como o arrasto de excluir/
// duplicar/editar em `ItemLancamentoAcoes.tsx`) — unifica mouse e toque num
// só handler, o que casa bem com um gesto de posição contínua (mover sobre
// as linhas vizinhas), diferente do swipe horizontal que só precisa de
// direção.
const ATRASO_PRESSIONAR_MS = 400

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

  /* Build 090 — bloqueia a rolagem da página SÓ durante o arrasto (ver
     cabeçalho). Listener nativo porque o do React é passivo. */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const bloquearRolagem = (e: TouchEvent) => {
      if (arrastandoIdRef.current != null && e.cancelable) e.preventDefault()
    }
    el.addEventListener('touchmove', bloquearRolagem, { passive: false })
    return () => el.removeEventListener('touchmove', bloquearRolagem)
  }, [])

  function limparTimer() {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function onPointerDownLinha(id: number, e: React.PointerEvent) {
    limparTimer()
    const alvo = e.currentTarget
    const pointerId = e.pointerId
    timerRef.current = setTimeout(() => {
      arrastandoIdRef.current = id
      setEmArrasto(id)
      try {
        alvo.setPointerCapture(pointerId)
      } catch {
        // Alguns navegadores/ambientes de teste não suportam captura de
        // ponteiro — o arrasto continua funcionando via listener no
        // contêiner, só sem a garantia de receber o evento fora do elemento.
      }
    }, ATRASO_PRESSIONAR_MS)
  }

  function commitarOrdem() {
    if (arrastandoIdRef.current == null) return
    const ordemFinal = ordemArrasto ?? idsAtuais
    ordemFinal.forEach((id, i) => {
      db.lancamentos.update(id, { ordemManual: i })
    })
  }

  /* Build 090: soltar depois de um arrasto de verdade dispara um `click` na
     linha (o ponteiro estava capturado por ela), e o clique abre o
     lançamento — a pessoa reordenava e o formulário abria por cima. O próximo
     clique depois de um arrasto é engolido na captura; um toque comum (sem
     arrasto) continua abrindo normalmente. */
  const engolirProximoCliqueRef = useRef(false)

  function onPointerUpOuCancelar() {
    limparTimer()
    if (arrastandoIdRef.current != null) engolirProximoCliqueRef.current = true
    commitarOrdem()
    arrastandoIdRef.current = null
    setEmArrasto(null)
    setOrdemArrasto(null)
  }

  function onClickCaptureContainer(e: React.MouseEvent) {
    if (!engolirProximoCliqueRef.current) return
    engolirProximoCliqueRef.current = false
    e.stopPropagation()
    e.preventDefault()
  }

  function onPointerMoveContainer(e: React.PointerEvent) {
    if (arrastandoIdRef.current == null || !containerRef.current) return
    const y = e.clientY
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
    const atual = ordemArrasto ?? idsAtuais
    const indiceAtual = atual.indexOf(arrastandoIdRef.current)
    if (indiceAtual === -1 || indiceAtual === novoIndex) return
    const nova = [...atual]
    nova.splice(indiceAtual, 1)
    nova.splice(novoIndex, 0, arrastandoIdRef.current)
    setOrdemArrasto(nova)
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
            className={`linha-selecionavel linha-reordenavel ${emArrasto === id ? 'em-arrasto' : ''}`}
            onPointerDown={selecao.ativa ? undefined : (e) => onPointerDownLinha(id, e)}
            onPointerUp={limparTimer}
            onPointerLeave={limparTimer}
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
