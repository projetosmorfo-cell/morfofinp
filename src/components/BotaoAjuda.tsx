import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'

/* Ícone "ⓘ" que abre uma bolha de texto curto explicando um termo da tela —
   build 100 (18/09/2026), pedido do Rafael: o rótulo "Total aplicando o
   comprometido" precisa de um "i" que explique o que é "comprometido", sem
   esse texto virar parágrafo permanente ocupando espaço no card.

   Mesmo mecanismo de posicionamento do `MenuLinha.tsx` (portal no `<body>`,
   `position: fixed`, medição pós-render pra nunca estourar a borda da tela)
   — só que o conteúdo é um texto fixo, não uma lista de ações, então não faz
   sentido herdar o componente de menu pra isso. */
export default function BotaoAjuda({
  texto,
  rotulo = 'O que é isso',
}: {
  texto: string
  rotulo?: string
}) {
  const [aberto, setAberto] = useState(false)
  const botaoRef = useRef<HTMLButtonElement>(null)
  const bolhaRef = useRef<HTMLDivElement>(null)
  const [estilo, setEstilo] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!aberto) { setEstilo({}); return }
    const botao = botaoRef.current
    const el = bolhaRef.current
    if (!botao || !el) return
    const MARGEM = 8
    const b = botao.getBoundingClientRect()
    const p = el.getBoundingClientRect()
    const cabeAbaixo = b.bottom + 4 + p.height <= window.innerHeight - MARGEM
    const top = cabeAbaixo ? b.bottom + 4 : Math.max(MARGEM, b.top - 4 - p.height)
    let left = b.left
    if (left + p.width > window.innerWidth - MARGEM) left = window.innerWidth - MARGEM - p.width
    if (left < MARGEM) left = MARGEM
    setEstilo({ position: 'fixed', top, left })
  }, [aberto])

  return (
    <span className="botao-ajuda-wrap">
      <button
        type="button"
        ref={botaoRef}
        className="botao-ajuda"
        aria-label={rotulo}
        onClick={(e) => { e.stopPropagation(); setAberto((a) => !a) }}
        data-testid="botao-ajuda"
      >
        ⓘ
      </button>
      {aberto && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={(e) => { e.stopPropagation(); setAberto(false) }} />
          <div className="botao-ajuda-bolha" ref={bolhaRef} style={{ zIndex: 91, ...estilo }} onClick={(e) => e.stopPropagation()} data-testid="botao-ajuda-bolha">
            {texto}
          </div>
        </>,
        document.body,
      )}
    </span>
  )
}
