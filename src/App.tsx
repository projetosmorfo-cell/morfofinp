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
import { useModoVisao, useOrdemAbas, useMarcaSite, useOrdemMenuEngrenagem } from './configuracaoIcones'
import { abrirSuporteWhatsApp } from './kit/suporte'
import { sair } from './kit/auth'

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

// Itens do menu de engrenagem, TODOS os que hoje existem nesse popover —
// os 4 de `ROTULO_CONFIG` (telas de config) mais 'suporte' (ação direta,
// WhatsApp) e 'sair' (08/09/2026, correção pós-G59: Rafael pediu que o
// menu com "Sair" pudesse ser reposicionado mas NUNCA permitir remover um
// item — ver `Manutencao.tsx` → "Layout do menu de configurações" e
// `useOrdemMenuEngrenagem`/`salvarOrdemMenuEngrenagem` em
// `configuracaoIcones.ts`, mesmo padrão já usado pro rodapé desde a
// Etapa 4). Esta constante é a única fonte de verdade de QUAIS itens
// existem — a ordem (`ordemMenuEngrenagem`) só decide a SEQUÊNCIA deles,
// nunca se aparecem ou não: um item desta lista SEMPRE aparece no menu,
// numa posição ou noutra, exatamente como as 5 abas do rodapé já
// garantem (`ordemAbas`) — não existe (e não deve existir) um jeito de
// esconder/remover nenhum dos dois.
const ITENS_MENU_ENGRENAGEM_PADRAO = ['categorias', 'contas', 'assinatura', 'manutencao', 'suporte', 'sair'] as const
type ItemMenuEngrenagem = (typeof ITENS_MENU_ENGRENAGEM_PADRAO)[number]
const ROTULO_MENU_ENGRENAGEM: Record<ItemMenuEngrenagem, string> = {
  ...ROTULO_CONFIG,
  suporte: 'Suporte (WhatsApp)',
  sair: 'Sair',
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
//
// Reordenável (08/09/2026, correção pós-G59) — `ordem` vem de
// `useOrdemMenuEngrenagem()` em `App.tsx`; qualquer chave de
// `ITENS_MENU_ENGRENAGEM_PADRAO` ausente da ordem salva (ordem antiga, de
// antes de "Sair" existir aqui, por exemplo) é acrescentada no final,
// nunca omitida — mesma lógica já usada pra `telasVisiveis`/`ordemAbas`
// alguns parágrafos abaixo. "Sair" chama `sair()` de `auth.ts` direto
// (mesma função que a seção "Conta" de `Manutencao.tsx` já usava) — o
// popover fecha sozinho e `AppRoot.tsx` troca pra `LoginView` assim que
// `sessaoAtiva` vira `false` (reativo via `useLiveQuery`), mesmo padrão
// de sempre.
function MenuEngrenagem({
  ordem,
  onEscolher,
  whatsappNumero,
  whatsappMensagem,
}: {
  ordem: ItemMenuEngrenagem[]
  onEscolher: (c: Config) => void
  whatsappNumero: string | undefined
  whatsappMensagem: string | undefined
}) {
  const [aberto, setAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)
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
            {ordem.map((item) => {
              if (item === 'suporte') {
                return (
                  <button key={item} type="button" onClick={() => { abrirSuporteWhatsApp(whatsappMensagem, whatsappNumero); setAberto(false) }}>
                    {ROTULO_MENU_ENGRENAGEM.suporte}
                  </button>
                )
              }
              if (item === 'sair') {
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={saindo}
                    onClick={async () => {
                      setSaindo(true)
                      await sair()
                      // Sem `setSaindo(false)`/`setAberto(false)` no sucesso:
                      // `AppRoot.tsx` já desmonta este componente inteiro
                      // assim que `sessaoAtiva` vira `false`.
                    }}
                  >
                    {saindo ? 'Saindo…' : ROTULO_MENU_ENGRENAGEM.sair}
                  </button>
                )
              }
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onEscolher(item)
                    setAberto(false)
                  }}
                >
                  {ROTULO_MENU_ENGRENAGEM[item]}
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}

// `modoConsultaN0` (08/09/2026, G59 — rebuild N0/N1): presente só quando o
// administrador Morfo entrou aqui via "entrar como" (impersonação, o ÚNICO
// caminho N0→N1 permitido — ver `src/kit/AppRoot.tsx`). NUNCA existe um
// caminho de volta N1→N0 além deste — G59 proíbe explicitamente qualquer
// item de menu/botão dentro do N1 que leve pro painel N0 (o antigo "Abrir
// painel N0" de `Manutencao.tsx` foi removido nesta mesma rodada).
export default function App({ modoConsultaN0 }: { modoConsultaN0?: { onVoltar: () => void } }) {
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

  const { whatsappNumero, whatsappMensagemPadrao } = useMarcaSite()

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

  // Ordem do menu de engrenagem personalizável (08/09/2026, correção
  // pós-G59, "Layout do menu de configurações" em Manutencao.tsx) — mesma
  // lógica de reposição-só de `telasVisiveis` acima: uma chave salva que
  // não existe mais (nunca acontece hoje, mas por segurança) é ignorada;
  // uma chave nova (ex.: "sair", inexistente numa ordem salva antes desta
  // correção) sempre aparece, no final, nunca desaparece por estar
  // "faltando" numa ordem salva antiga — é isso que garante que "Sair"
  // nunca pode ser removido do menu, só reposicionado.
  const ordemMenuSalva = useOrdemMenuEngrenagem()
  const ordemMenuEngrenagem: ItemMenuEngrenagem[] = ordemMenuSalva
    ? [
        ...ordemMenuSalva.filter((k): k is ItemMenuEngrenagem => ITENS_MENU_ENGRENAGEM_PADRAO.includes(k as ItemMenuEngrenagem)),
        ...ITENS_MENU_ENGRENAGEM_PADRAO.filter((k) => !ordemMenuSalva.includes(k)),
      ]
    : [...ITENS_MENU_ENGRENAGEM_PADRAO]

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
      {modoConsultaN0 && (
        // Banner de impersonação (G59) — mesmo padrão de layout de
        // `BannerDataSimulada` (bloco normal do fluxo, irmão ANTES de
        // `<main>`, nunca `position: fixed` — evita o bug real já
        // documentado de cobrir o cabeçalho sticky de cada tela). Sempre
        // visível enquanto o administrador Morfo está "vendo como" o
        // tenant real — nunca escondível, e o único jeito de sair é
        // "Voltar ao painel N0" (nunca "sair da conta", que apagaria a
        // sessão N1 do próprio Rafael sem necessidade).
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            padding: '8px 14px',
            background: '#3B1E63',
            color: '#fff',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700 }}>Modo consulta — administrador Morfo, vendo como este tenant</span>
          <button
            type="button"
            onClick={modoConsultaN0.onVoltar}
            style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
          >
            ‹ Voltar ao painel N0
          </button>
        </div>
      )}
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
      <MenuEngrenagem ordem={ordemMenuEngrenagem} onEscolher={setConfigAberta} whatsappNumero={whatsappNumero} whatsappMensagem={whatsappMensagemPadrao} />
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
