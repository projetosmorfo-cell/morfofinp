import { useEffect, useState } from 'react'

// Tour guiado (spotlight) — Roteiro de Parametrização Morfo, Etapa 6
// (05/09/2026), adaptado quase literal de `GuidedTour` no Kit de Estrutura
// Mínima (que por sua vez portou do MorfoLoc real). Aponta pra elementos DE
// VERDADE da tela (via atributo `data-tour` + `document.querySelector`),
// nunca uma cópia/ilustração — por isso mede a posição real do elemento a
// cada passo (`getBoundingClientRect`) em vez de coordenadas fixas. Cada
// passo pode trazer `tela` pra navegar o app pro lugar certo ANTES de medir
// (ver `onIrPara` em `App.tsx`) — trocar de aba pode levar mais de um
// quadro pra o elemento existir de verdade no DOM, por isso a medição tenta
// de novo via `requestAnimationFrame` (até ~20 tentativas); se não achar
// depois de todas as tentativas, cai num cartão centralizado sem recorte —
// o tour nunca trava (ex.: Rafael desligou a visão Premium e "Situação" não
// existe no rodapé agora — o tour segue em frente mesmo assim).
//
// Só abre manualmente (botão "Ver tour guiado" em Manutenção) — nunca
// dispara sozinho. Diferente do Kit original, que também tinha um
// `OnboardingTour` em slideshow disparando automaticamente no 1º acesso do
// tenant: esse NÃO foi portado nesta etapa (ver CLAUDE.md/Decisões — o
// MFinp já está em uso diário há meses, não existe um "1º acesso" de
// verdade pra disparar automaticamente, e um popup surpresa na abertura do
// app é exatamente o tipo de risco que a Decisão 6 pediu pra evitar).
//
// IMPORTANTE (mesmo aprendizado documentado no Kit): este componente
// precisa ser renderizado como IRMÃO de qualquer container com `transform`
// CSS, nunca dentro dele — um `transform` em ancestral vira "containing
// block" de `position: fixed` filho e desalinha o recorte. O MFinp não tem
// nenhum wrapper de transição de tela com transform hoje, mas por
// segurança `<GuidedTour>` é renderizado no nível mais alto de `App.tsx`,
// como o último filho.
export interface PassoTour {
  dataTour?: string
  tela?: string
  titulo: string
  texto: string
}

interface Recorte {
  top: number
  left: number
  width: number
  height: number
}

export default function GuidedTour({
  passos,
  onIrPara,
  onFinalizar,
}: {
  passos: PassoTour[]
  onIrPara: (passo: PassoTour) => void
  onFinalizar: () => void
}) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<Recorte | null>(null)
  const passo = passos[i]
  const ultimo = i === passos.length - 1

  useEffect(() => {
    onIrPara(passo)
    let raf: number | null = null
    let cancelado = false
    let tentativas = 0
    const tentar = () => {
      if (cancelado) return
      const el = passo.dataTour ? document.querySelector(`[data-tour="${passo.dataTour}"]`) : null
      const r = el ? el.getBoundingClientRect() : null
      if (r && r.width > 0 && r.height > 0) {
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
        return
      }
      tentativas++
      if (tentativas < 20) raf = requestAnimationFrame(tentar)
      else setRect(null)
    }
    setRect(null)
    raf = requestAnimationFrame(tentar)
    const medir = () => tentar()
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => {
      cancelado = true
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  const pad = 6
  const recorte =
    rect && rect.width > 0
      ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
      : null
  const corMascara = 'rgba(0,0,0,0.55)'

  let estiloCartao: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%,-50%)',
    width: 300,
  }
  if (recorte && typeof window !== 'undefined') {
    const espacoAbaixo = window.innerHeight - (recorte.top + recorte.height)
    const espacoAcima = recorte.top
    const left = Math.min(Math.max(recorte.left, 12), Math.max(12, window.innerWidth - 312))
    if (espacoAbaixo > 170) {
      estiloCartao = { position: 'fixed', left, top: recorte.top + recorte.height + 14, width: 300 }
    } else if (espacoAcima > 170) {
      estiloCartao = { position: 'fixed', left, top: Math.max(12, recorte.top - 14), width: 300, transform: 'translateY(-100%)' }
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 95 }}>
      {recorte ? (
        <>
          {/* 4 retângulos ao redor do recorte, em vez de 1 máscara com
              mix-blend-mode — mais simples e mais compatível entre navegadores. */}
          <div style={{ position: 'fixed', left: 0, top: 0, right: 0, height: Math.max(0, recorte.top), background: corMascara }} />
          <div style={{ position: 'fixed', left: 0, top: recorte.top, width: Math.max(0, recorte.left), height: recorte.height, background: corMascara }} />
          <div style={{ position: 'fixed', left: recorte.left + recorte.width, top: recorte.top, right: 0, height: recorte.height, background: corMascara }} />
          <div style={{ position: 'fixed', left: 0, top: recorte.top + recorte.height, right: 0, bottom: 0, background: corMascara }} />
          <div
            style={{
              position: 'fixed',
              left: recorte.left,
              top: recorte.top,
              width: recorte.width,
              height: recorte.height,
              borderRadius: 10,
              border: '2px solid var(--azul)',
              boxShadow: '0 0 0 3px rgba(59,130,246,0.25)',
              pointerEvents: 'none',
            }}
          />
        </>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: corMascara }} />
      )}
      <div
        style={{
          ...estiloCartao,
          background: 'var(--bg-elevado)',
          border: '1px solid var(--borda)',
          borderRadius: 14,
          padding: 16,
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          boxSizing: 'border-box',
          zIndex: 96,
          color: 'var(--texto)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="texto-fraco" style={{ fontSize: 11.5, fontWeight: 800 }}>
            {i + 1} / {passos.length}
          </span>
          <button
            type="button"
            onClick={onFinalizar}
            style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            Pular
          </button>
        </div>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{passo.titulo}</div>
        <div className="texto-fraco" style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 14 }}>
          {passo.texto}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {i > 0 && (
            <button
              type="button"
              style={{ flex: 1, marginTop: 0, padding: '9px', background: 'none', border: '1px solid var(--borda)', borderRadius: 10, cursor: 'pointer' }}
              onClick={() => setI((v) => v - 1)}
            >
              Voltar
            </button>
          )}
          <button
            type="button"
            className="primario"
            style={{ flex: 1, marginTop: 0, padding: '9px' }}
            onClick={() => (ultimo ? onFinalizar() : setI((v) => v + 1))}
          >
            {ultimo ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Roteiro real do MFinp (não genérico como o do Kit) — as 5 abas do rodapé
// + "Novo lançamento" + engrenagem, essa ordem por ser a mesma do rodapé
// (esquerda pra direita). "Situação" pode não existir se o Rafael estiver
// em visão Light — o tour não trava nesse caso (ver comentário no topo do
// arquivo), só mostra um cartão centralizado sem recorte pra esse passo.
export const TOUR_STEPS_N1: PassoTour[] = [
  { dataTour: 'nav-tab-resumo', tela: 'resumo', titulo: 'Resumo', texto: 'Visão geral do mês selecionado: quanto entrou, quanto saiu e o resultado até agora.' },
  { dataTour: 'nav-tab-situacao', tela: 'situacao', titulo: 'Situação', texto: 'Margem comprometida e sobra real do mês — a visão mais técnica, some se você estiver na visão Light.' },
  { dataTour: 'nav-tab-lancamentos', tela: 'lancamentos', titulo: 'Lançamentos', texto: 'A tela principal do app — todos os seus lançamentos do mês, com busca e filtros.' },
  { dataTour: 'lancamentos-incluir', tela: 'lancamentos', titulo: 'Novo lançamento', texto: 'Toque no + pra cadastrar um novo lançamento.' },
  { dataTour: 'nav-tab-carteira', tela: 'carteira', titulo: 'Carteira', texto: 'Seus cofrinhos e contas — saldo e histórico de cada um.' },
  { dataTour: 'nav-tab-planejamento', tela: 'planejamento', titulo: 'Planejamento', texto: 'Planejado × Realizado × Previsto — pra isso que este app existe.' },
  { dataTour: 'botao-engrenagem', titulo: 'Configurações', texto: 'Aqui você encontra Categorias e Grupos, Contas e carteiras, e Manutenção — inclusive este mesmo tour, sempre que quiser rever.' },
]
