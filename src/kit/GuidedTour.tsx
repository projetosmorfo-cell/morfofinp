import { useEffect, useState } from 'react'
import { SUBTITULO_PLANEJAMENTO } from '../subtitulosTelas'

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
// o tour nunca trava (acontece quando um menu está em "Ocultar" no Layout do
// Sistema e o passo dele sobrou no roteiro).
//
// COMO ELE ABRE (revisto na build 087, com o fim das versões): pelo CONVITE
// que aparece uma vez, quando o plano fica pronto, e à mão em Configuração →
// Ajuda → "Tour guiado". A abertura automática a cada início do app existia só
// na versão Light e saiu com ela — junto com o botão "Não exibir novamente",
// que só fazia sentido contra essa abertura automática.
// Diferente do Kit original, que também tinha um
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
//
// CORREÇÃO (reabertura método novo, 11/09/2026): a passagem anterior conferiu
// "o motor existe e funciona parecido", mas não pedaço a pedaço. Achado real:
// o div do recorte/contorno tinha `pointerEvents: 'none'`, deixando cliques
// atravessarem pro elemento real embaixo — o Kit bloqueia clique de propósito
// dentro do recorte ("olhe, não toque", comentário do Kit em `GuidedTour`),
// pra nunca disparar uma ação real sem querer no meio do tour guiado.
// Corrigido removendo o `pointerEvents: 'none'` (ver o div do recorte abaixo).
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
  /* `passos` é FILTRADO por quem chama (`App.tsx` tira o passo de tela que não
     está na navegação). Se o filtro levar tudo — todo menu em "Ocultar", por
     exemplo —, `passos[i]` é `undefined` e o render quebrava no `passo.titulo`,
     derrubando o app inteiro: um clique em "Tour guiado" que não produz efeito
     visível nenhum. O guard devolve o controle a quem abriu em vez de estourar
     (build 087). */
  const passo = passos[i] as PassoTour | undefined
  const ultimo = i === passos.length - 1

  useEffect(() => {
    if (!passo) { onFinalizar(); return }
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

  if (!passo) return null

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
          {/* CORREÇÃO (reabertura método novo, 11/09/2026): este div tinha `pointerEvents: 'none'`, deixando
              cliques atravessarem pro elemento real destacado embaixo — o Kit desenha o recorte "olhe, não
              toque" de propósito (bloqueador transparente sobre o próprio recorte, ver GuidedTour do Kit,
              L4045-4047), pra nunca disparar uma ação real sem querer no meio do tour. Sem `pointerEvents`
              aqui (padrão "auto"), o próprio box do contorno volta a bloquear o clique, igual ao Kit. */}
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
            }}
          />
        </>
      ) : (
        <div style={{ position: 'fixed', inset: 0, background: corMascara }} />
      )}
      <div
        data-testid="tour-cartao"
        data-tour-passo={passo.dataTour ?? ''}
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
        {/* A MESMA mensagem em dois momentos (item 6): ao escolher não exibir
            mais, e no fim do passo a passo — nos dois casos dizendo onde
            reabrir. */}
        {ultimo && (
          <p className="texto-fraco" style={{ fontSize: 11.5, lineHeight: 1.5, margin: '12px 0 0' }}>
            {ONDE_REABRIR_TOUR}
          </p>
        )}
      </div>
    </div>
  )
}

/* Roteiro real do MFinp (não genérico como o do Kit): as QUATRO abas do
   rodapé, na mesma ordem em que elas aparecem lá, mais "Novo lançamento", o
   "⋮" e os quatro passos de Configuração que fecham o tour.
   Conferido elemento a elemento na build 087 — todo `dataTour` daqui existe
   numa tela do app de hoje. */
/* Mensagem única de "onde reabrir" — usada no fim do tour e ao recusar o
   convite. O texto cita o rótulo EXATO do item ("Tour guiado", em
   `AjudaN1`); até a build 086 dizia "Ver tour guiado", que não é o nome de
   nada na tela. */
export const ONDE_REABRIR_TOUR =
  'Pra ver este passo a passo de novo: toque no ⋮ no topo → Configuração → Ajuda → Tour guiado.'

export const TOUR_STEPS_N1: PassoTour[] = [
  /* Item 7 (12/09/2026): os textos das telas principais são os MESMOS
     subtítulos que aparecem nelas — `src/subtitulosTelas.ts`, fonte única. */
  /* Build 086: o passo do Resumo saiu junto com a tela, e o de "Situação"
     deixou de existir como passo próprio — a aba `situacao` É a tela Hoje nas
     duas versões agora, então há UM passo só para ela. */
  { dataTour: 'nav-tab-situacao', tela: 'situacao', titulo: 'Hoje', texto: 'A tela do dia: quanto está livre de verdade, quanto ainda dá pra economizar até o fim do mês e, no ritmo atual, se os gastos variáveis estouram ou sobram.' },
  { dataTour: 'nav-tab-lancamentos', tela: 'lancamentos', titulo: 'Lançamentos', texto: 'A tela principal do app — todos os seus lançamentos do mês, com busca e filtros.' },
  { dataTour: 'lancamentos-incluir', tela: 'lancamentos', titulo: 'Novo lançamento', texto: 'Toque no + pra cadastrar um novo lançamento.' },
  { dataTour: 'nav-tab-carteira', tela: 'carteira', titulo: 'Carteira', texto: 'Seus cofrinhos e contas — saldo e histórico de cada um.' },
  { dataTour: 'nav-tab-planejamento', tela: 'planejamento', titulo: 'Planejamento', texto: `${SUBTITULO_PLANEJAMENTO}. Grupo a grupo e categoria a categoria, com o previsto somado — é o acompanhamento detalhado.` },
  { dataTour: 'n1-mais-opcoes', titulo: 'Mais opções', texto: 'Aqui ficam quatro coisas: Configuração (a tela única com todos os parâmetros — Meus Dados, Categorias, Grupos e Metas, Contas e carteiras, Layout e Menus e o resto), Suporte / Chat, Atualizar e Sair.' },
  /* Item 6 (12/09/2026): "depois do menu principal, encerrar explicando passo
     a passo em Configurações: Contas e Carteiras e depois Categorias e
     Grupos, mostrando cadastro de Metas de categoria e de grupo". Estes quatro passos
     abrem a própria tela de Configuração e apontam pro destino de verdade —
     `dataTour` está nos itens da lista (ver ConfiguracoesN1.tsx). */
  { dataTour: 'cfg-contas', tela: 'config:configuracoes', titulo: '1º passo — Contas e Carteiras', texto: 'Comece por aqui: cadastre onde o seu dinheiro fica (conta corrente, cartão, cofrinho). Todo lançamento é pago por uma dessas.' },
  { dataTour: 'cfg-categorias', tela: 'config:configuracoes', titulo: '2º passo — Categorias, Grupos e Metas', texto: 'Depois venha aqui: é onde o gasto ganha nome e entra num grupo.' },
  { dataTour: 'cfg-categorias', tela: 'config:configuracoes', titulo: 'Meta da categoria', texto: 'Na aba "Categorias e Metas", cada categoria tem a sua META — quanto você quer gastar nela por mês. É esse número que pinta a barra de vermelho quando estoura.' },
  { dataTour: 'cfg-categorias', tela: 'config:configuracoes', titulo: 'Meta do grupo', texto: 'Na aba "Grupos e Metas", cada grupo recebe um percentual da sua receita fixa do mês — é a meta do grupo. A soma das metas das categorias dele deveria caber dentro dessa meta.' },
]

/* Build 087: o parâmetro `modo` SAIU. Ele era o resto da época de três
   versões, quando o passo da aba `situacao` trocava de conteúdo conforme a
   tela que ela renderizava; na 086 já não escolhia nada e agora não existe
   versão nenhuma para escolher. O único filtro que resta é o de `App.tsx`, por
   `telasVisiveis` — um passo cuja aba está em "Ocultar" no Layout do Sistema
   sai do roteiro. A função continua existindo (em vez de exportar só a
   constante) porque é o ponto único por onde o roteiro passa. */
export function passosTourN1(): PassoTour[] {
  return TOUR_STEPS_N1
}
