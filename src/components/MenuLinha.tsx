import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

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
  const popoverRef = useRef<HTMLDivElement>(null)
  const [estiloCorrecao, setEstiloCorrecao] = useState<CSSProperties>({})

  // oxlint avisa "set-state-in-effect" aqui (react/set-state-in-effect) —
  // esperado e seguro neste caso específico: não dá pra "derivar durante o
  // render" porque a correção depende da posição REAL do elemento já
  // renderizado no DOM (`getBoundingClientRect`), que só existe depois do
  // React montar o popover. É exatamente o padrão "medir e corrigir antes
  // do paint" que `useLayoutEffect` existe para viabilizar.
  useLayoutEffect(() => {
    // Fechado: zera a correção. Garante que, na PRÓXIMA vez que abrir, a
    // medição abaixo comece da posição natural (só CSS, sem transform
    // residual de uma correção anterior) — sem isso, a 2ª abertura mediria
    // a posição já corrigida da 1ª, e o cálculo ficaria errado.
    if (!aberto) {
      setEstiloCorrecao({})
      return
    }
    const el = popoverRef.current
    if (!el) return

    const MARGEM = 8
    const rect = el.getBoundingClientRect()
    let deslocamento = 0
    if (rect.right > window.innerWidth - MARGEM) {
      deslocamento = window.innerWidth - MARGEM - rect.right
    }
    if (rect.left + deslocamento < MARGEM) {
      deslocamento = MARGEM - rect.left
    }
    setEstiloCorrecao(deslocamento !== 0 ? { transform: `translateX(${deslocamento}px)` } : {})
  }, [aberto])

  return (
    <div className="menu-linha-wrap">
      <button type="button" className="botao-menu-linha" aria-label="Mais ações" onClick={onAbrirFechar}>
        ⋮
      </button>
      {aberto && (
        <>
          {/* Camada invisível pra fechar o popover ao clicar fora dele —
              mesmo padrão do `.menu-engrenagem` em App.tsx. */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={onFechar} />
          <div className="menu-linha-popover" ref={popoverRef} style={estiloCorrecao}>
            {children}
          </div>
        </>
      )}
    </div>
  )
}
