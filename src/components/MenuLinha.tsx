import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// Menu "⋮" por linha (Categorias e Grupos) — extraído em 05/09/2026 (bug
// reportado pelo Rafael: "janelas de submenus estourando pra fora da tela")
// pra existir em UM lugar só. Antes disso, o grupo e a categoria tinham cada
// um sua própria cópia quase idêntica deste bloco (`.menu-linha-wrap` +
// botão "⋮" + camada de fechar-ao-clicar-fora + `.menu-linha-popover`) — ver
// histórico em `Categorias.tsx`.
//
// O BUG DE VERDADE: `.menu-linha-popover` é `position: absolute; right: 0`
// ancorado no próprio `.menu-linha-wrap` (`position: relative`). Isso é
// perfeito quando sobra espaço à ESQUERDA do wrap — mas numa tela estreita
// (medido: 390px), a linha de grupo/categoria ocupa quase toda a largura,
// então o wrap fica perto da borda esquerda da tela. Um popover de 180px
// (`min-width`) "crescendo pra esquerda" a partir de um wrap tão à esquerda
// não cabe: a borda esquerda do popover fica com coordenada X NEGATIVA,
// ou seja, literalmente fora da área visível da tela (medido com Playwright:
// x: -59.2px num viewport de 390px). Não é um problema de CSS "errado" — é
// inerente a `right: 0` sem nenhum ajuste pra quando o espaço não existe.
//
// A CORREÇÃO: medir a posição real do popover DEPOIS de renderizado
// (`getBoundingClientRect`, só possível com o elemento já no DOM) e, se ele
// ultrapassar a borda esquerda OU direita da tela (com uma margem de 8px),
// aplicar um `transform: translateX(...)` que empurra o popover de volta pra
// dentro da área visível. Isso é feito em `useLayoutEffect` (não
// `useEffect`) de propósito: `useLayoutEffect` roda de forma síncrona ANTES
// do navegador pintar a tela, então a correção (quando necessária) já sai
// pronta no primeiro frame visível — sem o "pulo"/flicker que apareceria se
// a correção só chegasse depois do primeiro paint.
//
// Reaproveita a MESMA classe CSS `.menu-linha-popover` (nada mudou no
// index.css) — só o `transform` inline por cima, quando preciso.
export default function MenuLinha({
  aberto,
  onAbrirFechar,
  onFechar,
  children,
}: {
  aberto: boolean
  onAbrirFechar: () => void
  onFechar: () => void
  children: ReactNode
}) {
  const botaoRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [estiloCorrecao, setEstiloCorrecao] = useState<CSSProperties>({})

  /* 12/09/2026 — 2ª causa do mesmo sintoma, reportada de novo pelo Rafael
     ("cadastro de Categorias e Grupos tem submenus estourando tela, exemplo
     quando clico nos 3 pontinhos deles, esconde quase todo"): a correção de
     05/09 só empurrava o popover na HORIZONTAL, e ele continuava ancorado
     dentro da linha — ou seja, (a) se a linha estiver perto do fim da tela,
     o painel abre pra baixo e some no rodapé, e (b) qualquer ancestral com
     recorte próprio corta o que passa da borda dele.

     Agora o painel é renderizado num PORTAL no `<body>`, em coordenadas
     `position: fixed` calculadas a partir do botão: nenhum ancestral pode
     recortá-lo, e quando não cabe abaixo ele abre PRA CIMA. A correção
     horizontal de antes continua, agora aplicada na mesma medição. */
  useLayoutEffect(() => {
    if (!aberto) { setEstiloCorrecao({}); return }
    const botao = botaoRef.current
    const el = popoverRef.current
    if (!botao || !el) return
    const MARGEM = 8
    const b = botao.getBoundingClientRect()
    const p = el.getBoundingClientRect()
    const cabeAbaixo = b.bottom + 4 + p.height <= window.innerHeight - MARGEM
    const top = cabeAbaixo ? b.bottom + 4 : Math.max(MARGEM, b.top - 4 - p.height)
    let left = b.right - p.width
    if (left + p.width > window.innerWidth - MARGEM) left = window.innerWidth - MARGEM - p.width
    if (left < MARGEM) left = MARGEM
    setEstiloCorrecao({ position: 'fixed', top, left, right: 'auto', maxHeight: window.innerHeight - 2 * MARGEM, overflowY: 'auto' })
  }, [aberto])

  return (
    <div className="menu-linha-wrap">
      <button type="button" ref={botaoRef} className="botao-menu-linha" aria-label="Mais ações" onClick={onAbrirFechar}>
        ⋮
      </button>
      {aberto && createPortal(
        <>
          {/* Camada invisível pra fechar o popover ao clicar fora dele. */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 60 }} onClick={onFechar} />
          <div className="menu-linha-popover" ref={popoverRef} style={{ zIndex: 61, ...estiloCorrecao }}>
            {children}
          </div>
        </>,
        document.body,
      )}
    </div>
  )
}
