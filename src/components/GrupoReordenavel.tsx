import { useRef, useState } from 'react'
import { db, type Categoria, type Lancamento } from '../db'
import ItemLancamentoAcoes from './ItemLancamentoAcoes'
import { MarcadorLinha, type Selecao } from './SelecaoETotais'

// Item 12 (15/09/2026) — press-and-hold drag-to-reorder, escopado por DIA:
// arrastar um lançamento nunca o tira do dia que já está (não existe alça
// entre dias diferentes — cada dia é um `GrupoReordenavel` isolado, com a
// própria lista de ids). A alça (⠿) fica à esquerda de cada linha; segurar
// nela por ~400ms entra em modo de arrasto (com feedback visual), soltar
// grava a ordem inteira do dia em `Lancamento.ordemManual` (todo item do
// grupo ganha um valor, 0..N-1 — nunca deixa mistura ambígua de "com ordem"
// e "sem ordem" dentro do mesmo dia).
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

  function onPointerUpOuCancelar() {
    limparTimer()
    commitarOrdem()
    arrastandoIdRef.current = null
    setEmArrasto(null)
    setOrdemArrasto(null)
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
