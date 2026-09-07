import { useEffect, useState } from 'react'
import ResumoDoMes from './screens/ResumoDoMes'
import Situacao from './screens/Situacao'
import Lancamentos from './screens/Lancamentos'
import Carteira from './screens/Carteira'
import Planejamento from './screens/Planejamento'
import Categorias from './screens/Categorias'
import Contas from './screens/Contas'
import Manutencao from './screens/Manutencao'
import MinhaAssinatura from './kit/MinhaAssinatura'
import GuidedTour, { TOUR_STEPS_N1, type PassoTour } from './kit/GuidedTour'
import SimularData, { BannerDataSimulada } from './kit/SimularData'
import DetalheLancamento from './components/DetalheLancamento'
import { mesInicial } from './mes'
import { avancarSeriesFixasPendentes } from './recorrencia'
import { useModoVisao, useOrdemAbas } from './configuracaoIcones'

// Categorias saiu daqui em 30/08/2026 (rodada seguinte) — deixou de ser aba
// do rodapé e virou item do menu de configurações (engrenagem, ver
// `MenuEngrenagem`/`configAberta` abaixo), junto com a nova tela Contas.
// "Manutenção" (01/09/2026, 3ª rodada do dia) entrou no mesmo menu — ver
// `src/screens/Manutencao.tsx` pro motivo (limpar versão antiga do app
// grudada no navegador sem apagar os lançamentos do Rafael).
const TELAS = {
  resumo: { rotulo: 'Resumo', Componente: ResumoDoMes },
  situacao: { rotulo: 'Situação', Componente: Situacao },
  lancamentos: { rotulo: 'Lançamentos', Componente: Lancamentos },
  carteira: { rotulo: 'Carteira', Componente: Carteira },
  planejamento: { rotulo: 'Planejamento', Componente: Planejamento },
} as const

// Visão "Light" (04/09/2026, pedido do Rafael) — rodapé reduzido, escondendo
// só "Situação" (a tela de margem comprometida/sobra real — a mais técnica
// das 5). Planejamento (Planejado × Realizado × Previsto) FICA em Light —
// correção no mesmo dia: Rafael apontou que é "pra isso que existe esse
// app", então não faz sentido escondê-lo atrás do modo avançado. Nada foi
// removido do app: Situação continua existindo no código e reaparece assim
// que a visão volta pra "Premium" — é só o rodapé que filtra, mesmo
// `tela`/mês selecionado por baixo.
const TELAS_LIGHT: Tela[] = ['resumo', 'lancamentos', 'carteira', 'planejamento']

// 'assinatura' (05/09/2026, Etapa 5) ficou de propósito FORA de
// `ROTULO_CONFIG` até a Etapa 8 existir — só era alcançável por dentro de
// Manutenção → "Minha Assinatura", mesmo padrão de acesso provisório do
// painel N0. Com a Etapa 8 (Login/Ambiente Logado) construída, este é o
// lugar definitivo: promovido pro menu de engrenagem principal, saiu do
// acesso provisório em Manutenção. `ferramentasTeste` continua de fora de
// `ROTULO_CONFIG` (é ferramenta de teste, nunca aparece no menu principal —
// ver `src/kit/SimularData.tsx`), assim como `manutencao` continua dando
// acesso ao painel N0 (painel de desenvolvedor/Morfo, sem relação com o
// tenant logado — ver `src/kit/AppRoot.tsx`).
type Config = 'categorias' | 'contas' | 'manutencao' | 'assinatura' | 'ferramentasTeste'

const ROTULO_CONFIG: Record<'categorias' | 'contas' | 'assinatura' | 'manutencao', string> = {
  categorias: 'Categorias e Grupos',
  contas: 'Contas e carteiras',
  assinatura: 'Minha Assinatura',
  manutencao: 'Manutenção',
}

type Tela = keyof typeof TELAS

function Rodape({
  tela,
  telasVisiveis,
  onTrocar,
}: {
  tela: Tela
  telasVisiveis: Tela[]
  onTrocar: (t: Tela) => void
}) {
  return (
    <nav className="rodape">
      {telasVisiveis.map((chave) => (
        <button
          key={chave}
          type="button"
          className={chave === tela ? 'ativo' : ''}
          onClick={() => onTrocar(chave)}
          // data-tour (05/09/2026, Etapa 6 — Tour guiado): ver
          // `src/kit/GuidedTour.tsx`/`TOUR_STEPS_N1`.
          data-tour={`nav-tab-${chave}`}
        >
          {TELAS[chave].rotulo}
          {/* 04/09/2026, mesmo dia (pedido do Rafael): "Lançamentos" ganha uma
              marca permanente indicando que é a tela principal do app,
              com 4 ou 5 abas no rodapé (Light/Premium) — não é o mesmo
              indicador de "ativo" (cor azul), que muda com a navegação. */}
          {chave === 'lancamentos' && <span className="rodape-destaque-principal" />}
        </button>
      ))}
    </nav>
  )
}

interface AlvoLancamento {
  id?: number
  categoriaIdSugerida?: number
  contaIdSugerida?: number
}

// Engrenagem fixa no topo (30/08/2026) — abre um popover com as duas telas
// de cadastro que deixaram de ser aba do rodapé. Fica fora do fluxo normal
// de telas/mês porque é config, não uma "aba de mês".
function MenuEngrenagem({ onEscolher }: { onEscolher: (c: Config) => void }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <button
        type="button"
        className="botao-engrenagem"
        aria-label="Configurações"
        onClick={() => setAberto((v) => !v)}
        data-tour="botao-engrenagem"
      >
        ⚙
      </button>
      {aberto && (
        <>
          {/* Camada invisível pra fechar o popover ao clicar fora dele. */}
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setAberto(false)} />
          <div className="menu-engrenagem">
            {(Object.keys(ROTULO_CONFIG) as (keyof typeof ROTULO_CONFIG)[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onEscolher(c)
                  setAberto(false)
                }}
              >
                {ROTULO_CONFIG[c]}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  )
}

// `onAbrirPainelN0` (04/09/2026, Roteiro de Parametrização Morfo, Etapa 4):
// acesso temporário ao painel N0 (Morfo/dev), passado por `AppRoot.tsx` —
// ver `src/kit/AppRoot.tsx` pro porquê de não ser uma tela de Login de
// verdade ainda (Backlog #029, Etapa 8 do roteiro).
export default function App({ onAbrirPainelN0 }: { onAbrirPainelN0: () => void }) {
  // Navegação por estado do React, sem router e sem depender da URL —
  // funciona igual em qualquer lugar, inclusive abrindo o arquivo direto
  // (file://), onde bibliotecas baseadas em window.location/URL quebram.
  const [tela, setTela] = useState<Tela>('resumo')

  // Mês selecionado — vive aqui (não em cada tela) pra ficar fixo ao trocar
  // de aba: as abas "de mês" (Resumo, Situação, Lançamentos) obedecem esse
  // mesmo mês.
  const [mes, setMes] = useState(mesInicial)

  // Detalhe/edição de lançamento abre como MODAL por cima da tela atual, não
  // como troca de tela — assim, ao salvar/cancelar/fechar, a pessoa volta
  // exatamente pra onde estava (mesma tela, mesmo mês, mesma categoria
  // expandida), porque a tela de baixo nunca desmonta (30/08/2026, ver
  // spec de "categorias recolhíveis com navegação contextual").
  const [lancamentoAberto, setLancamentoAberto] = useState<AlvoLancamento | null>(null)

  // Tela de configuração aberta por cima do conteúdo principal (Categorias
  // ou Contas, via engrenagem) — igual em espírito ao modal de lançamento:
  // substitui só o `<main>`, preserva mês/tela de baixo, tem botão voltar
  // em vez de fechar em X. Esconde o rodapé enquanto aberta (é uma
  // excursão de cadastro, não uma aba de navegação normal).
  const [configAberta, setConfigAberta] = useState<Config | null>(null)

  // Tour guiado (05/09/2026, Roteiro de Parametrização Morfo, Etapa 6) —
  // aberto manualmente via Manutenção → "Ver tour guiado" (ver
  // `src/kit/GuidedTour.tsx`). Fecha qualquer tela de configuração aberta
  // (senão o tour tentaria apontar pro rodapé/engrenagem por baixo de
  // Categorias/Contas/Manutenção, que não existem enquanto essas telas
  // estão abertas).
  const [tourAberto, setTourAberto] = useState(false)
  const onIrParaPassoTour = (passo: PassoTour) => {
    setConfigAberta(null)
    if (passo.tela) setTela(passo.tela as Tela)
  }

  // Visão Light × Premium (04/09/2026) — configuração persistida em
  // `db.configuracoes` (ver `useModoVisao`), trocada pela tela Manutenção.
  const modoVisao = useModoVisao()
  const telasBase = modoVisao === 'light' ? TELAS_LIGHT : (Object.keys(TELAS) as Tela[])

  // Ordem do rodapé personalizável (04/09/2026, Roteiro de Parametrização
  // Morfo, Etapa 4 — Kit de Estrutura Mínima, "Layout": adaptação da seção
  // "Ordem dos menus" de `LayoutTenantScreen` do Kit, ver Manutencao.tsx).
  // Aplica só REORDENAÇÃO sobre as abas já visíveis por `modoVisao` acima —
  // nunca esconde/mostra aba (isso continua sendo só o Light×Premium
  // existente). Uma aba salva na ordem que não está mais visível (ex.:
  // salvou a ordem em Premium, depois trocou pra Light) é ignorada; uma aba
  // nova nunca prevista na ordem salva vai pro final, na ordem padrão.
  const ordemSalva = useOrdemAbas()
  const telasVisiveis = ordemSalva
    ? [
        ...ordemSalva.filter((k): k is Tela => telasBase.includes(k as Tela)),
        ...telasBase.filter((k) => !ordemSalva.includes(k)),
      ]
    : telasBase

  // Se a visão virar Light enquanto a pessoa está numa aba que só existe na
  // Premium (Situação/Planejamento), volta pro Resumo sozinho — nunca deixa
  // a tela aberta sem nenhuma aba correspondente marcada como ativa no
  // rodapé reduzido.
  useEffect(() => {
    if (!telasVisiveis.includes(tela)) setTela('resumo')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoVisao])

  // No carregamento, avança toda série de lançamento "fixo" que já deveria
  // ter gerado uma nova ocorrência até hoje — é a "geração dinâmica por
  // ciclo" (ver src/recorrencia.ts).
  useEffect(() => {
    avancarSeriesFixasPendentes()
  }, [])

  const { Componente } = TELAS[tela]
  const aoAbrirLancamento = (opcoes?: AlvoLancamento) => setLancamentoAberto(opcoes ?? {})

  return (
    <>
      <BannerDataSimulada />
      <main>
        {configAberta ? (
          configAberta === 'categorias' ? (
            <Categorias
              mes={mes}
              aoMudarMes={setMes}
              aoAbrirLancamento={aoAbrirLancamento}
              aoAbrirPlanejamento={() => setTela('planejamento')}
              aoVoltar={() => setConfigAberta(null)}
            />
          ) : configAberta === 'contas' ? (
            <Contas aoVoltar={() => setConfigAberta(null)} />
          ) : configAberta === 'assinatura' ? (
            <MinhaAssinatura aoVoltar={() => setConfigAberta(null)} />
          ) : configAberta === 'ferramentasTeste' ? (
            <SimularData aoVoltar={() => setConfigAberta(null)} />
          ) : (
            <Manutencao
              aoVoltar={() => setConfigAberta(null)}
              onAbrirPainelN0={onAbrirPainelN0}
              onAbrirTour={() => setTourAberto(true)}
              onAbrirFerramentasTeste={() => setConfigAberta('ferramentasTeste')}
            />
          )
        ) : (
          <Componente
            mes={mes}
            aoMudarMes={setMes}
            aoAbrirLancamento={aoAbrirLancamento}
            aoAbrirPlanejamento={() => setTela('planejamento')}
          />
        )}
      </main>
      {!configAberta && <Rodape tela={tela} telasVisiveis={telasVisiveis} onTrocar={setTela} />}
      <MenuEngrenagem onEscolher={setConfigAberta} />
      {lancamentoAberto && (
        <DetalheLancamento
          alvoId={lancamentoAberto.id}
          categoriaIdSugerida={lancamentoAberto.categoriaIdSugerida}
          contaIdSugerida={lancamentoAberto.contaIdSugerida}
          aoMudarMes={setMes}
          onFechar={() => setLancamentoAberto(null)}
        />
      )}
      {/* Tour guiado (Etapa 6) — renderizado como IRMÃO de tudo acima, no
          nível mais alto, de propósito (ver comentário no topo de
          `GuidedTour.tsx`: um `transform` CSS em ancestral desalinharia o
          recorte `position: fixed`). O app não tem nenhum wrapper com
          transform hoje, mas isso evita o problema por construção. */}
      {tourAberto && (
        <GuidedTour passos={TOUR_STEPS_N1} onIrPara={onIrParaPassoTour} onFinalizar={() => setTourAberto(false)} />
      )}
    </>
  )
}
