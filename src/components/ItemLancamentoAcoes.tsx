import { useRef, useState } from 'react'
import { db, type Categoria, type Lancamento } from '../db'
import { statusDoLancamento, FUNDO_STATUS } from '../statusPagamento'
import ConfirmacaoAcao from './ConfirmacaoAcao'
import LinhaLancamentoCompleta from './LinhaLancamentoCompleta'

// Item 11 (15/09/2026): wrapper de arrastar-pra-esquerda + painel de 3 ações
// (Duplicar · Editar · Excluir), extraído de `Lancamentos.tsx` (que só tinha
// "Excluir") pra virar um componente compartilhado — usado agora também no
// drill-in de uma conta em Carteira.tsx, que antes não tinha o gesto nenhum.
// Layout em flexbox (não grid compartilhado) porque o `transform` do
// arrasto é incompatível com `display:contents`.
const LARGURA_ACAO = 70
const LARGURA_PAINEL = LARGURA_ACAO * 3

export default function ItemLancamentoAcoes({
  lancamento,
  categoria,
  origemLabel,
  onAbrir,
  onDuplicar,
}: {
  lancamento: Lancamento
  categoria?: Categoria
  origemLabel?: string
  /** Abre em edição (clique no conteúdo, ou botão "Editar" do painel). */
  onAbrir: () => void
  /** Abre já em modo "clonando" (`DetalheLancamento`, `abrirClonando`). */
  onDuplicar: () => void
}) {
  const [arrastadoX, setArrastadoX] = useState(0)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const inicioX = useRef<number | null>(null)
  const arrastando = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    inicioX.current = e.touches[0].clientX
    arrastando.current = false
  }

  function onTouchMove(e: React.TouchEvent) {
    if (inicioX.current == null) return
    const delta = e.touches[0].clientX - inicioX.current
    if (Math.abs(delta) > 8) arrastando.current = true
    setArrastadoX(Math.max(-LARGURA_PAINEL, Math.min(0, delta)))
  }

  function onTouchEnd() {
    setArrastadoX(arrastadoX < -LARGURA_PAINEL / 2 ? -LARGURA_PAINEL : 0)
    inicioX.current = null
  }

  function onClickConteudo() {
    if (arrastando.current || arrastadoX !== 0) {
      setArrastadoX(0)
      arrastando.current = false
      return
    }
    onAbrir()
  }

  const status = statusDoLancamento(lancamento)

  return (
    <div className="item-lancamento">
      <div className="item-lancamento-acoes">
        <button
          type="button"
          className="item-lancamento-acao acao-duplicar"
          onClick={() => {
            setArrastadoX(0)
            onDuplicar()
          }}
        >
          Duplicar
        </button>
        <button
          type="button"
          className="item-lancamento-acao acao-editar"
          onClick={() => {
            setArrastadoX(0)
            onAbrir()
          }}
        >
          Editar
        </button>
        <button
          type="button"
          className="item-lancamento-acao acao-excluir"
          onClick={() => setConfirmandoExclusao(true)}
        >
          Excluir
        </button>
      </div>
      <div
        className={`item-lancamento-conteudo ${FUNDO_STATUS[status]}`}
        style={{ transform: `translateX(${arrastadoX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <LinhaLancamentoCompleta
          lancamento={lancamento}
          categoria={categoria}
          origemLabel={origemLabel}
          onAbrir={onClickConteudo}
        />
      </div>

      {confirmandoExclusao && (
        /* Build 093 (item 5): a confirmação única do app (`ConfirmacaoAcao`),
           no lugar do modal próprio com "Confirmar exclusão" à esquerda. */
        <ConfirmacaoAcao
          titulo={`Excluir "${lancamento.descricao}"?`}
          testid="confirmacao-excluir-lancamento"
          aviso="O lançamento é apagado de vez e sai de todos os totais. Não dá pra desfazer."
          onCancelar={() => {
            setConfirmandoExclusao(false)
            setArrastadoX(0)
          }}
          onConfirmar={() => {
            db.lancamentos.delete(lancamento.id!)
            setConfirmandoExclusao(false)
          }}
        />
      )}
    </div>
  )
}
