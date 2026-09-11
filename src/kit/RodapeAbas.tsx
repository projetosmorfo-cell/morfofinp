import { useLayoutEffect, useRef, type ComponentType, type ReactNode, type SVGProps } from 'react'

// Barra de abas do rodapé — UMA peça só pra N0 e N1 (09/09/2026, Decisão 50).
// Pedido do Rafael: "quero no N1 a mesma configuração padrão de menus
// principais no rodapé igual ao N0, referência é o N0 com ícones e texto".
// Este componente é o rodapé que o `DevApp` (N0) já tinha (ícone Heroicons
// 20px + rótulo 9.5px/700, cor de destaque no ativo), extraído sem mudar
// nenhum valor — o N0 passou a usar daqui, e o N1 (`App.tsx` → `Rodape`)
// também, com as abas dele. Mesmo código = mesma aparência, sem 2ª cópia.

export const RODAPE_ACENTO = '#8B7CF6' // DEV_ACCENT do DevApp
export const RODAPE_INATIVO = '#7A7686'
export const RODAPE_FUNDO = '#141319' // DEV_BG do DevApp

/* 11/09/2026 — a barra do N1 não seguia o tema claro: ficava sempre escura.
   Causa exata: `nav.rodape` no `index.css` SEMPRE apontou pras variáveis de
   tema (`--bg-elevado`/`--borda`), mas esta peça pinta o fundo por estilo
   INLINE — e inline sempre vence folha de estilo, então a cor do N0 (escura,
   fixa) valia nos dois temas. Correção: o N0 continua com os valores fixos
   dele (é escuro por definição, `.mloc-forcar-escuro`); o N1 passa a usar
   tokens de tema (`--rodape-*`, definidos no `index.css` junto das demais
   variáveis de cor). Nenhum tamanho/ícone/rótulo mudou — só a cor. */
const CORES_TEMA = {
  fundo: 'var(--rodape-fundo, var(--bg-elevado))',
  borda: 'var(--rodape-borda, var(--borda))',
  acento: 'var(--rodape-acento, #8B7CF6)',
  inativo: 'var(--rodape-inativo, var(--texto-fraco))',
}

export interface AbaRodape<K extends string> {
  key: K
  label: string
  Icone: ComponentType<SVGProps<SVGSVGElement>>
  // Conteúdo extra abaixo do rótulo (ex.: marca de "tela principal" do N1) —
  // opcional, o N0 não usa.
  extra?: ReactNode
  dataTour?: string
  /* Conteúdo que SUBSTITUI o botão desta posição, ocupando o mesmo espaço
     (10/09/2026, Decisão 58): é assim que o botão "⋮" entra na barra quando
     o parâmetro "Posição do botão ⋮" manda ele pro rodapé — nunca flutuando
     por cima do conteúdo, exatamente como o Kit descreve as três opções de
     rodapé. */
  custom?: ReactNode
}

export default function RodapeAbas<K extends string>({ abas, ativa, onTrocar, className, dark = true }: {
  abas: AbaRodape<K>[]
  ativa: K
  onTrocar: (k: K) => void
  className?: string
  /* `true` (padrão) = paleta fixa escura do painel N0. O N1 passa `false` e
     as cores vêm do tema escolhido pela pessoa (ver CORES_TEMA acima). */
  dark?: boolean
}) {
  const cores = dark
    ? { fundo: RODAPE_FUNDO, borda: 'rgba(255,255,255,0.08)', acento: RODAPE_ACENTO, inativo: RODAPE_INATIVO }
    : CORES_TEMA
  const ref = useRef<HTMLElement>(null)
  // Publica a altura real da barra em `--rodape-altura` (Decisão 51): os
  // botões flutuantes de teste (`SimulacaoResolucao.tsx`) ficam logo acima
  // dela em vez de cobrir a 1ª/última aba (Backlog 031). Medida de verdade
  // (`getBoundingClientRect`), não um número fixo — inclui safe-area do
  // celular. Zera ao desmontar (Login não tem barra).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const raiz = document.documentElement
    const medir = () => raiz.style.setProperty('--rodape-altura', `${Math.round(el.getBoundingClientRect().height)}px`)
    medir()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(medir) : null
    ro?.observe(el)
    return () => {
      ro?.disconnect()
      raiz.style.setProperty('--rodape-altura', '0px')
    }
  }, [])
  return (
    <nav
      ref={ref}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        borderTop: `1px solid ${cores.borda}`,
        background: cores.fundo,
        padding: '6px 4px calc(env(safe-area-inset-bottom, 6px) + 6px)',
        flexShrink: 0,
      }}
    >
      {abas.map(({ key, label, Icone, extra, dataTour, custom }) => {
        const ativo = ativa === key
        if (custom) {
          return (
            <div key={key} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px 2px' }}>
              {custom}
            </div>
          )
        }
        return (
          <button
            key={key}
            type="button"
            className={ativo ? 'ativo' : ''}
            onClick={() => onTrocar(key)}
            data-tour={dataTour}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '7px 2px',
            }}
          >
            <Icone width={20} height={20} color={ativo ? cores.acento : cores.inativo} strokeWidth={ativo ? 2.4 : 2} />
            <span style={{ fontSize: 9.5, fontWeight: 700, color: ativo ? cores.acento : cores.inativo }}>{label}</span>
            {extra}
          </button>
        )
      })}
    </nav>
  )
}
