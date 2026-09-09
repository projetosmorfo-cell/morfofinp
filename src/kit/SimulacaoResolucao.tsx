import { useEffect, type ReactNode } from 'react'
import { useSimulacaoResolucao, salvarSimulacaoResolucao } from '../configuracaoIcones'
import { useHojeSimuladoISO } from '../hojeSimulado'

// Ferramenta de teste do MVP — REESCRITA em 08/09/2026 (Roteiro de
// Parametrização Morfo, G60: "achado real — o MorfoFinP reconstruiu a tela
// de Login sem os atalhos [do Kit] e depois criou botões de resolução
// próprios, diferentes"). A versão anterior (Decisão 36) tinha 2 botões de
// TEXTO ("Ver como Web"/"Ver como Mobile"), embutidos dentro do formulário
// de Login — exatamente o padrão que G60 proíbe. Esta versão porta o padrão
// EXATO do Kit (`esqueleto-morfo.jsx`, fonte L11077/L11081): 2 botões
// FLUTUANTES, ícone-só, cantos opostos do rodapé, sempre visíveis (Login, N0
// e N1) — nunca dentro de uma tela específica.
//
// Adaptação necessária (G44 — "Kit vira especificação, não vira arquivo pra
// colar" quando a stack diverge), registrada em Decisões.md: o Kit alterna
// entre "mobile 430px" × "web 100%" porque o layout dele É responsivo (larga
// de verdade em web). O MorfoFinP tomou a decisão de produto, na Etapa 4
// (antes deste roteiro), de ser SEMPRE coluna única — não existe (nem vai
// existir) um 2º layout "largo" real. Por isso aqui só existe 1 modo
// simulado ("web", força `#root` pra 100% da largura do navegador — MESMO
// valor literal do Kit) além do padrão (sem override, que já É a largura
// real de produção, ~480px — o equivalente ao "mobile" do Kit, sem precisar
// de um 2º valor arbitrário). O botão de área alterna entre os dois, ícone
// espelhando o estado atual exatamente como o Kit faz (mesmo botão, ícone
// muda com o estado).
export function SimulacaoResolucaoFrame({ children }: { children: ReactNode }) {
  const modo = useSimulacaoResolucao()
  const web = modo === 'web'

  // A largura de verdade quem trava é `#root` (CSS: `max-width: 480px`,
  // sempre). Simular "web" sobrescreve o `max-width` inline pra `100%`
  // (mesmo valor do Kit) sem duplicar a árvore de layout. Sempre desfaz no
  // cleanup (troca de modo ou desmontagem) — nunca deixa um valor "preso".
  useEffect(() => {
    const el = document.getElementById('root')
    if (!el) return
    if (web) {
      el.style.maxWidth = '100%'
    } else {
      el.style.removeProperty('max-width')
    }
    return () => {
      el.style.removeProperty('max-width')
    }
  }, [web])

  // Achado real na verificação desta rodada (G60): a versão anterior
  // retornava uma árvore de JSX DIFERENTE conforme `web` (fragmento simples
  // × div com banner) — como a posição de `children` na árvore do React
  // mudava de forma, o React desmontava e remontava tudo por baixo a cada
  // clique no botão de área, perdendo estado local (ex.: qual página do
  // Login estava selecionada, formulário em preenchimento). Corrigido
  // mantendo SEMPRE a mesma forma de árvore (o wrapper e o slot do banner
  // sempre existem; só o CONTEÚDO do banner é condicional) — `children`
  // nunca muda de posição/profundidade, nunca remonta.
  // `key` explícita nos 2 filhos: sem isso, o React reconcilia por ÍNDICE
  // (sem chave), e o banner aparecendo/sumindo empurra `children` do índice
  // 0 pro índice 1 — o que ainda causaria desmontagem por posição, mesmo
  // com o wrapper estável. Com `key`, o React casa cada filho consigo mesmo
  // pelo nome, nunca pela posição.
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {web && (
        <div
          key="banner"
          style={{
            flexShrink: 0,
            textAlign: 'center',
            padding: '6px 10px',
            background: '#3B2F00',
            color: '#FFD666',
            fontSize: 11.5,
            fontWeight: 700,
          }}
        >
          Simulação de resolução — Web (100%) · ferramenta de teste do MVP, sai antes de publicar
          (Backlog #030)
        </div>
      )}
      <div key="conteudo" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

// Par de botões flutuantes 📱/🖥️ + 🕐 — porte exato do Kit (fonte
// L11077/L11081): `position: fixed`, `bottom: 8`, 30×30, círculo, fundo
// translúcido escuro (âmbar quando o modo está ativo), cantos opostos.
// Renderizado no componente RAIZ (`AppRoot.tsx`), nunca replicado tela por
// tela (G60, sub-regra b) — fica visível em Login, N0 e N1 igualmente,
// porque `AppRoot` é o único lugar comum aos três.
export function FerramentasTesteFlutuantes({ onAbrirFerramentaData }: { onAbrirFerramentaData: () => void }) {
  const modo = useSimulacaoResolucao()
  const dataSimulada = useHojeSimuladoISO()
  const web = modo === 'web'

  function alternarArea() {
    salvarSimulacaoResolucao(web ? undefined : 'web')
  }

  const base: React.CSSProperties = {
    position: 'fixed',
    bottom: 8,
    zIndex: 90,
    width: 30,
    height: 30,
    borderRadius: 999,
    border: 'none',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 14,
  }

  return (
    <>
      <button
        type="button"
        onClick={alternarArea}
        title={
          web
            ? 'Ferramenta de teste MVP: voltar pra largura normal de produção (~480px)'
            : 'Ferramenta de teste MVP: alternar pra área simulada WEB (100% da largura do navegador)'
        }
        style={{ ...base, left: 12, background: web ? '#f59e0b' : 'rgba(0,0,0,0.35)' }}
      >
        {web ? '📱' : '🖥️'}
      </button>
      <button
        type="button"
        onClick={onAbrirFerramentaData}
        title="Ferramenta de teste MVP: manipular data de hoje"
        style={{ ...base, right: 12, background: dataSimulada ? '#f59e0b' : 'rgba(0,0,0,0.35)' }}
      >
        🕐
      </button>
    </>
  )
}
