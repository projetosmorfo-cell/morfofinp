import { useEffect, useState } from 'react'
import ResumoDoMes from './screens/ResumoDoMes'
import Situacao from './screens/Situacao'
import Lancamentos from './screens/Lancamentos'
import Carteira from './screens/Carteira'
import Planejamento from './screens/Planejamento'
import Categorias from './screens/Categorias'
import Contas from './screens/Contas'
import Manutencao from './screens/Manutencao'
import NotificacoesBancarias from './screens/NotificacoesBancarias'
import MinhaAssinatura from './kit/MinhaAssinatura'
import GuidedTour, { TOUR_STEPS_N1, type PassoTour } from './kit/GuidedTour'
import SimularData, { BannerDataSimulada } from './kit/SimularData'
import RodapeAbas from './kit/RodapeAbas'
import { ArrowPathIcon, ArrowRightOnRectangleIcon, CalendarDaysIcon, ChartPieIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon, EllipsisVerticalIcon, ListBulletIcon, ScaleIcon, WalletIcon } from '@heroicons/react/24/outline'
import DetalheLancamento from './components/DetalheLancamento'
import { mesInicial } from './mes'
import { avancarSeriesFixasPendentes } from './recorrencia'
import { migrarPctGrupo, useModoVisao, useOrdemAbas, useOrdemMenuEngrenagem, useTemaEfetivo } from './configuracaoIcones'
import { TopIconMenu, UserHoverIcon, ThemeToggleIcon } from './kit/TopoIcones'
import { Settings, MessageCircle, RefreshCw, LogOut } from 'lucide-react'
import SuporteChat from './kit/SuporteChat'
import ZonasIdentidade from './kit/IdentidadeTenant'
import {
  useTenantN1, hasUnreadTenant, usePlatformN0,
  normalizarMenuPosModo, posicaoMenuDe, ITENS_NAV_N1, ITEM_PROTEGIDO_N1,
  type TenantKit, type MenuPosModo, type PosicaoMenu,
} from './kit/kitPlatform'
import type { ItemMenuTopo } from './kit/TopoIcones'
import type { ComponentType, SVGProps } from 'react'
import { sair } from './kit/auth'
// 4 telas de Configurações do Kit portadas na Decisão 55 (Parte B)
import { MeusDadosN1, MeuAmbienteN1, AparenciaN1, AjudaN1 } from './kit/ConfigN1'
import ConfiguracoesN1, { type ChaveConfigN1 } from './kit/ConfiguracoesN1'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type NotificacaoPendente } from './db'
import { sincronizarPendentesNativas, ouvirNotificacoesAoVivo, marcarConfirmada } from './notificacaoBancaria'

// Categorias saiu daqui em 30/08/2026 (rodada seguinte) — deixou de ser aba
// do rodapé e virou item do menu de configurações (engrenagem, ver
// `MenuEngrenagem`/`configAberta` abaixo), junto com a nova tela Contas.
// "Manutenção" (01/09/2026, 3ª rodada do dia) entrou no mesmo menu — ver
// `src/screens/Manutencao.tsx` pro motivo (limpar versão antiga do app
// grudada no navegador sem apagar os lançamentos do Rafael).
// Ícones (Heroicons outline, mesma biblioteca do rodapé do N0 — Decisão 50):
// o rodapé do N1 passou a ser a MESMA peça do N0 (`RodapeAbas`), ícone + texto.
const TELAS = {
  resumo: { rotulo: 'Resumo', Componente: ResumoDoMes, Icone: ChartPieIcon },
  situacao: { rotulo: 'Situação', Componente: Situacao, Icone: ScaleIcon },
  lancamentos: { rotulo: 'Lançamentos', Componente: Lancamentos, Icone: ListBulletIcon },
  carteira: { rotulo: 'Carteira', Componente: Carteira, Icone: WalletIcon },
  planejamento: { rotulo: 'Planejamento', Componente: Planejamento, Icone: CalendarDaysIcon },
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
// 'suporte' (10/09/2026, Decisão 53): deixou de ser uma ação direta que
// abria WhatsApp — agora é uma tela de verdade (chat interno, ver
// `src/kit/SuporteChat.tsx`), no mesmo grupo das outras telas de
// configuração.
// 'usuarios'/'permissoes' existiram entre 10/09 e 11/09/2026 (Decisão 54
// Parte B) e foram REMOVIDOS na Decisão 67: o ambiente do cliente é de um
// usuário só — o do plano contratado —, com acesso total. Quem cadastra
// cliente e libera acesso é o painel N0; o usuário edita os próprios dados
// em "Meus Dados". As telas `UsuariosTenant.tsx`/`PermissoesTenant.tsx`
// foram apagadas; `PerfisAcesso.tsx` continua, porque o N0 usa.
// 'configuracoes' (10/09/2026): a TELA ÚNICA de parâmetros — ver
// `src/kit/ConfiguracoesN1.tsx`. 'layout' e 'limpar' são as duas metades
// de `Manutencao` reaproveitadas como destinos separados (prop `secao`),
// pra cada parâmetro cair na sessão do Kit que lhe cabe.
type Config = 'configuracoes' | 'categorias' | 'contas' | 'notificacoes' | 'manutencao' | 'layout' | 'limpar' | 'assinatura' | 'ferramentasTeste' | 'suporte' | 'meusDados' | 'meuAmbiente' | 'aparencia' | 'ajuda'

// 'notificacoes' (09/09/2026): tela "Notificações bancárias" — ver
// `src/screens/NotificacoesBancarias.tsx` e `src/notificacaoBancaria.ts`.
const ROTULO_CONFIG: Record<'meusDados' | 'categorias' | 'contas' | 'notificacoes' | 'meuAmbiente' | 'assinatura' | 'aparencia' | 'ajuda' | 'manutencao' | 'suporte', string> = {
  meusDados: 'Meus Dados',
  categorias: 'Categorias e Grupos',
  contas: 'Contas e carteiras',
  notificacoes: 'Notificações bancárias',
  meuAmbiente: 'Meu Ambiente',
  assinatura: 'Minha Assinatura',
  aparencia: 'Aparência',
  ajuda: 'Ajuda',
  manutencao: 'Manutenção',
  suporte: 'Suporte',
}

// Itens do menu de engrenagem, TODOS os que hoje existem nesse popover —
// os 5 de `ROTULO_CONFIG` (telas de config, "Suporte" incluso desde
// 10/09/2026) mais 'sair' (08/09/2026, correção pós-G59: Rafael pediu que o
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
// 10/09/2026 — esta lista deixou de descrever o popover "⋮" (que agora tem 4
// itens fixos) e passou a descrever a TELA ÚNICA de Configurações: são os
// itens que a tela mostra, e a ordem salva aqui reordena cada um DENTRO da
// sua sessão do Kit. Duas saíram e duas entraram, todas com o mesmo destino
// de antes: 'aparencia' saiu porque o tema virou ícone fixo no topo (Padrão
// UI, seção 16 — a TELA continua existindo no código); 'suporte' saiu porque
// virou item fixo do "⋮" e já está dentro de "Ajuda"; 'layout' e 'limpar'
// entraram porque as duas metades de Manutenção viraram destinos separados.
const ITENS_MENU_ENGRENAGEM_PADRAO = ['meusDados', 'categorias', 'contas', 'notificacoes', 'ajuda', 'meuAmbiente', 'assinatura', 'layout', 'manutencao', 'limpar', 'sair'] as const
type ItemMenuEngrenagem = (typeof ITENS_MENU_ENGRENAGEM_PADRAO)[number]
export const ROTULO_MENU_ENGRENAGEM: Record<ItemMenuEngrenagem, string> = {
  meusDados: ROTULO_CONFIG.meusDados,
  categorias: ROTULO_CONFIG.categorias,
  contas: ROTULO_CONFIG.contas,
  notificacoes: ROTULO_CONFIG.notificacoes,
  ajuda: ROTULO_CONFIG.ajuda,
  meuAmbiente: ROTULO_CONFIG.meuAmbiente,
  assinatura: ROTULO_CONFIG.assinatura,
  layout: 'Layout e Menus',
  manutencao: 'Manutenção e dados',
  limpar: 'Limpar todos os dados',
  sair: 'Sair',
}

type Tela = keyof typeof TELAS

/* Ícone de aba (Heroicon) usado dentro do "⋮" (10/09/2026, Decisão 58) — o
   menu chama `<icon size color/>` (assinatura lucide), o Heroicon quer
   width/height. Um wrapper por ícone, guardado em cache pra não nascer um
   componente novo a cada render (o que remontaria o item a cada abertura). */
const cacheIconeMenu = new Map<unknown, ComponentType<{ size?: number; color?: string }>>()
function iconeDeAbaNoMenu(Ico: ComponentType<SVGProps<SVGSVGElement>>): ComponentType<{ size?: number; color?: string }> {
  const pronto = cacheIconeMenu.get(Ico)
  if (pronto) return pronto
  const Novo = ({ size = 16, color }: { size?: number; color?: string }) => <Ico width={size} height={size} color={color} />
  cacheIconeMenu.set(Ico, Novo)
  return Novo
}

/* Uma entrada da barra de menus do rodapé: pode ser uma ABA (troca de tela)
   ou uma AÇÃO (Configuração, Suporte, Atualizar, Sair), porque o parâmetro
   "Posição dos menus" do N0 deixa qualquer um dos dois viver na barra. */
interface EntradaRodapeN1 {
  key: string
  label: string
  Icone: ComponentType<SVGProps<SVGSVGElement>>
  extra?: React.ReactNode
  dataTour?: string
  custom?: React.ReactNode
  aoTocar?: () => void
}

function Rodape({
  tela,
  entradas,
  onTrocarTela,
}: {
  tela: Tela
  entradas: EntradaRodapeN1[]
  onTrocarTela: (t: Tela) => void
}) {
  // Decisão 50 (09/09/2026): mesma peça do rodapé do N0 (`RodapeAbas`),
  // ícone + texto — a marca verde de "tela principal" (Lançamentos, pedido
  // do Rafael de 04/09) continua, agora como `extra` abaixo do rótulo.
  return (
    <RodapeAbas
      className="rodape"
      /* 11/09/2026: no N1 as cores vêm do tema (claro/escuro/automático) —
         o painel N0 continua escuro fixo. Ver `RodapeAbas.tsx`. */
      dark={false}
      abas={entradas}
      ativa={tela}
      onTrocar={(k) => {
        const e = entradas.find((x) => x.key === k)
        if (e?.aoTocar) { e.aoTocar(); return }
        onTrocarTela(k as Tela)
      }}
    />
  )
}

interface AlvoLancamento {
  id?: number
  categoriaIdSugerida?: number
  contaIdSugerida?: number
  // Lançamento nascendo de uma notificação bancária (09/09/2026): o
  // formulário abre pré-preenchido com o que foi lido do texto, e ao salvar
  // a notificação vira 'confirmada' — ver `NotificacoesBancarias.tsx`.
  notificacao?: NotificacaoPendente
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
/* ---- Barra de marca do N1 — Kit `TenantBrandBar` (L910-L960) + item 199.
   Até esta rodada o MorfoFinP tinha, no lugar disso, um botão de engrenagem
   FLUTUANTE (`.botao-engrenagem`, position:fixed) e nenhum ícone de usuário
   logado nem de tema. O item 18 do CONTRATO DE EXECUÇÃO pede exatamente estes
   três, na linha do topo: tema, usuário e "⋮".

   10/09/2026 (pedido do Rafael, 2 itens): (a) a marca deixou de ser o TEXTO
   "MorfoFinP" e passou a ser a LOGO do produto — variante clara no tema
   escuro, variante colorida no tema claro —, lida do parâmetro de layout do
   app logado (`brandingN0.appLogadoClara/appLogadoEscura/appLogadoPos/
   appLogadoAltura`, já preenchido em `gerarPlatformN0()`); (b) o "⋮" tinha
   13 itens numa lista plana e ESTOURAVA a altura da tela (bug relatado:
   "os 3 pontinhos está abrindo os menus escondidos cortando tela") — agora
   tem APENAS 4: Configuração (→ tela única de parâmetros), Suporte / Chat,
   Atualizar (efeito real) e Sair. Nenhum destino sumiu: os 13 continuam
   todos alcançáveis, agora de dentro de `ConfiguracoesN1.tsx`, separados
   pelas 3 sessões do Kit.

   Ordem dos ícones (Kit L913-L917, item 199): tema → usuário → "⋮", pra o "⋮"
   ficar de fato no canto direito. ---- */

function BarraMarcaN1({
  chatNaoLida,
  nomeUsuario,
  tenant,
  itensMais,
  menuPos,
}: {
  chatNaoLida?: boolean
  nomeUsuario?: string
  tenant?: TenantKit
  /* Itens do "⋮" e onde ele fica — montados em `App()` porque agora dependem
     do parâmetro "Posição dos menus" do N0 (um menu de rodapé pode ter vindo
     pra cá, e um item daqui pode ter ido pro rodapé). */
  itensMais: ItemMenuTopo[]
  menuPos: MenuPosModo
}) {
  const tema = useTemaEfetivo()
  const branding = usePlatformN0().brandingN0
  // Logo CLARA em tema escuro, logo COLORIDA em tema claro — os dois arquivos
  // vêm do parâmetro de layout do app logado, já preenchido em
  // `gerarPlatformN0()` (`kitPlatform.ts`), nunca de um caminho fixo aqui.
  const logo = tema === 'claro'
    ? (branding?.appLogadoEscura || branding?.appLogadoClara)
    : (branding?.appLogadoClara || branding?.appLogadoEscura)
  const altura = branding?.appLogadoAltura || 22
  const pos = branding?.appLogadoPos || 'esquerda'
  /* Espaçamento vem do MESMO parâmetro (N0 → Parâmetros → Marca → "Logo do
     app logado"), então o que se edita lá muda a barra na hora — era esse o
     "não reflete em lugar algum" do Rafael. */
  const espV = branding?.appLogadoEspacoV ?? 8
  const espH = branding?.appLogadoEspacoH ?? 14

  /* Identidade do AMBIENTE (Kit `TenantBrandBar`, L910-L960): a logo do
     produto é da Morfo; o que vem depois do divisor é do cliente, conforme
     "Meu Ambiente" (logo quadrada × horizontal, o que mostrar, juntos ×
     separados, posição de cada um). A montagem mora em `ZonasIdentidade`
     (`kit/IdentidadeTenant.tsx`), compartilhada com a prévia da própria tela
     de "Meu Ambiente". Sem nada cadastrado, nada aparece — a barra fica
     exatamente como estava. */
  const temIdentidadeTenant = !!(tenant?.logoQuadradaUri || tenant?.logoUri || tenant?.logoHorizUri || tenant?.companyName)

  /* O "⋮" só aparece nesta barra nas duas posições de topo; nas três de
     rodapé ele é desenhado pelo próprio rodapé (ver `Rodape`/`entradasRodape`
     em `App()`). Sem item nenhum, `TopIconMenu` já não renderiza nada. */
  const menuNoTopo = menuPos === 'topo' || menuPos === 'topo_esquerda'
  const botaoMais = menuNoTopo ? <TopIconMenu items={itensMais} hasUnread={chatNaoLida} /> : null
  return (
    <div
      className="barra-marca-n1"
      style={{
        padding: `${espV}px ${espH}px`,
        ...(pos === 'centro' ? { justifyContent: 'center' } : pos === 'direita' ? { flexDirection: 'row-reverse' } : {}),
      }}
    >
      {menuPos === 'topo_esquerda' && botaoMais}
      {logo
        ? <img src={logo} alt="MorfoFinP" style={{ height: altura, width: 'auto', display: 'block', flexShrink: 0 }} />
        : <span className="barra-marca-n1-nome">MorfoFinP</span>}
      {temIdentidadeTenant && (
        <>
          <span style={{ width: 1, height: Math.max(12, altura - 6), background: 'var(--borda)', flexShrink: 0 }} />
          {/* MESMA altura da logo do produto (10/09/2026, pedido do Rafael:
              "a segunda logo está minúscula, ela deve ocupar o mesmo espaço
              verticalmente da primeira"). Antes era `altura - 4`, o que numa
              logo QUADRADA ao lado de uma wordmark deitada fazia a do cliente
              parecer bem menor do que ela é. */}
          <ZonasIdentidade tenant={tenant} altura={altura} />
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: pos === 'esquerda' && !temIdentidadeTenant ? 'auto' : undefined }}>
        <ThemeToggleIcon />
        <UserHoverIcon label={nomeUsuario} />
        {/* `data-tour` do passo "Configurações" do tour guiado mora dentro do
            TopIconMenu (`n1-mais-opcoes`); o passo foi reapontado pra lá. */}
        {menuPos === 'topo' && botaoMais}
      </div>
    </div>
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

  // Pra onde o "‹ Voltar" de uma tela de configuração leva (10/09/2026): as
  // telas alcançadas de dentro de Configurações voltam PRA Configurações; as
  // alcançadas direto (banner de notificação, "Suporte / Chat" do "⋮")
  // voltam pro app. Antes disso todas voltavam pro app, porque não existia
  // tela intermediária nenhuma.
  const [voltaPara, setVoltaPara] = useState<Config | null>(null)
  const fecharConfig = () => { setConfigAberta(voltaPara); setVoltaPara(null) }

  // "Atualizar" do "⋮" com EFEITO REAL (pedido do Rafael, 10/09/2026) — não
  // é `location.reload()`: recarregar a página não geraria recorrente nenhum
  // se a data já tivesse virado com o app aberto. O que ele faz, na ordem:
  // 1) `avancarSeriesFixasPendentes()` — gera toda ocorrência de série fixa
  //    que já deveria existir até hoje (o mesmo que roda no boot);
  // 2) `sincronizarPendentesNativas()` — puxa as notificações bancárias que
  //    o serviço nativo capturou desde a última sincronização;
  // 3) reposiciona o mês selecionado no mês de hoje (`mesInicial()`), que é
  //    o que faz status Atrasado/A pagar/A receber e projeção recalcularem
  //    quando a virada de dia/mês aconteceu com o app aberto.
  // Tudo o mais é reativo (`useLiveQuery`), então se atualiza sozinho.
  const [atualizando, setAtualizando] = useState(false)
  const atualizarAgora = async () => {
    if (atualizando) return
    setAtualizando(true)
    try {
      await avancarSeriesFixasPendentes()
      await sincronizarPendentesNativas()
      setMes(mesInicial())
    } finally {
      setAtualizando(false)
    }
  }

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

  /* ACESSO TOTAL no ambiente do cliente (11/09/2026, Decisão 67).
     Entre 10/09 e 11/09 existiu aqui um gating por perfil de acesso (o
     modelo do Kit, pensado pra empresa com equipe): cada aba e cada item de
     configuração só aparecia se o perfil do usuário logado liberasse. Isso
     caiu junto com as telas de Usuários e Permissões — este produto é de uso
     individual, um usuário por plano contratado, e esse usuário vê tudo.
     Mantido como função (em vez de apagar as chamadas espalhadas) pra deixar
     evidente onde o gating existia, caso um dia volte a fazer sentido. */
  const tenantN1 = useTenantN1()
  const configN1 = useLiveQuery(() => db.configuracoes.get(1), [])
  // Quem está logado — usado só pra mostrar o nome na barra do topo.
  const usuarioTenantLogado = tenantN1?.users.find((u) => u.id === configN1?.loggedUserIdN1)
  const podeVerFuncN1 = (_k: string) => true

  // Visão Light × Premium (04/09/2026) — configuração persistida em
  // `db.configuracoes` (ver `useModoVisao`), trocada pela tela Manutenção.
  const modoVisao = useModoVisao()
  const telasBase = (modoVisao === 'light' ? TELAS_LIGHT : (Object.keys(TELAS) as Tela[])).filter((t) => podeVerFuncN1(t))

  // Ordem do rodapé personalizável (04/09/2026, Roteiro de Parametrização
  // Morfo, Etapa 4 — Kit de Estrutura Mínima, "Layout": adaptação da seção
  // "Ordem dos menus" de `LayoutTenantScreen` do Kit, ver Manutencao.tsx).
  // Aplica só REORDENAÇÃO sobre as abas já visíveis por `modoVisao`/perfil
  // acima — nunca esconde/mostra aba além do que os dois já decidiram. Uma
  // aba salva na ordem que não está mais visível (ex.: salvou a ordem em
  // Premium, depois trocou pra Light, ou o perfil perdeu acesso) é ignorada;
  // uma aba nova nunca prevista na ordem salva vai pro final, na ordem
  // padrão.
  const ordemSalva = useOrdemAbas()
  const telasOrdenadas = ordemSalva
    ? [
        ...ordemSalva.filter((k): k is Tela => telasBase.includes(k as Tela)),
        ...telasBase.filter((k) => !ordemSalva.includes(k)),
      ]
    : telasBase

  /* "Posição dos menus" e "Posição do botão ⋮" (10/09/2026, Decisão 58 —
     N0 → Parâmetros → Layout do Sistema → "Menus do N1"). Decide, menu a
     menu, se ele fica na barra do rodapé, dentro do "⋮" ou em lugar nenhum.
     Sem nada configurado, cada item cai no padrão dele (`ITENS_NAV_N1`), que
     é exatamente o app como sempre foi. */
  const layoutCfg = usePlatformN0().layoutConfig
  const posDeMenu = (chave: string): PosicaoMenu => {
    const item = ITENS_NAV_N1.find((i) => i.key === chave)
    if (!item) return 'rodape'
    return posicaoMenuDe(layoutCfg?.posicaoN1, item, ITEM_PROTEGIDO_N1)
  }
  const menuPosN1 = normalizarMenuPosModo(layoutCfg?.menuPosN1?.modo)
  // Telas que ainda EXISTEM pra navegação (barra ou "⋮"); só 'oculto' some.
  const telasVisiveis = telasOrdenadas.filter((t) => posDeMenu(t) !== 'oculto')

  // Ordem do menu de engrenagem personalizável (08/09/2026, correção
  // pós-G59, "Layout do menu de configurações" em Manutencao.tsx) — mesma
  // lógica de reposição-só de `telasVisiveis` acima: uma chave salva que
  // não existe mais (nunca acontece hoje, mas por segurança) é ignorada;
  // uma chave nova (ex.: "sair", inexistente numa ordem salva antes desta
  // correção) sempre aparece, no final, nunca desaparece por estar
  // "faltando" numa ordem salva antiga — é isso que garante que "Sair"
  // nunca pode ser removido do menu, só reposicionado.
  const ordemMenuSalva = useOrdemMenuEngrenagem()
  const ordemMenuEngrenagem: ItemMenuEngrenagem[] = (ordemMenuSalva
    ? [
        ...ordemMenuSalva.filter((k): k is ItemMenuEngrenagem => ITENS_MENU_ENGRENAGEM_PADRAO.includes(k as ItemMenuEngrenagem)),
        ...ITENS_MENU_ENGRENAGEM_PADRAO.filter((k) => !ordemMenuSalva.includes(k)),
      ]
    : [...ITENS_MENU_ENGRENAGEM_PADRAO]
  ).filter((item) => item === 'sair' || podeVerFuncN1(`config.${item}`))

  // Se a visão virar Light enquanto a pessoa está numa aba que só existe na
  // Premium (Situação/Planejamento), volta pro Resumo sozinho — nunca deixa
  // a tela aberta sem nenhuma aba correspondente marcada como ativa no
  // rodapé reduzido.
  // Vale também pra "Ocultar" do parâmetro de posição dos menus: se a tela
  // aberta foi ocultada, cai na 1ª que sobrou (e não num 'resumo' fixo, que
  // também pode estar oculto).
  useEffect(() => {
    if (!telasVisiveis.includes(tela)) setTela(telasVisiveis[0] ?? 'resumo')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modoVisao, telasVisiveis.join(',')])

  // No carregamento, avança toda série de lançamento "fixo" que já deveria
  // ter gerado uma nova ocorrência até hoje — é a "geração dinâmica por
  // ciclo" (ver src/recorrencia.ts).
  useEffect(() => {
    avancarSeriesFixasPendentes()
    // Correção única do percentual do ícone de grupo numa base que já existe
    // (11/09/2026) — ver `migrarPctGrupo()` em `src/configuracaoIcones.ts`.
    migrarPctGrupo()
  }, [])

  // Notificação bancária (09/09/2026): ao abrir o app, puxa o que o serviço
  // nativo Android capturou enquanto o app estava fechado; enquanto aberto,
  // ouve as novas ao vivo; e sempre que o app volta pro primeiro plano (a
  // pessoa tocou no aviso "movimentação detectada"), sincroniza de novo. No
  // navegador tudo isso é no-op (ver `ehNativo()`).
  useEffect(() => {
    sincronizarPendentesNativas()
    let parar = () => {}
    ouvirNotificacoesAoVivo().then((fn) => { parar = fn })
    const aoVoltar = () => { if (document.visibilityState === 'visible') sincronizarPendentesNativas() }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      parar()
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])
  const qtdNotificacoesPendentes = useLiveQuery(() => db.notificacoesPendentes.where('status').equals('pendente').count(), []) ?? 0

  // Chat interno N1↔N0 não lido (10/09/2026, Decisão 53/54 — Parte A):
  // mesma expressão do Kit (`hasUnreadTenant`, ver kitPlatform.ts) aplicada
  // ao tenant único do MorfoFinP — alimenta o shake/badge do botão de
  // engrenagem (ver `MenuEngrenagem` acima).
  const chatNaoLida = tenantN1 ? hasUnreadTenant(tenantN1) : false

  const { Componente } = TELAS[tela]
  const aoAbrirLancamento = (opcoes?: AlvoLancamento) => setLancamentoAberto(opcoes ?? {})

  /* ---- Montagem dos menus a partir do parâmetro do N0 (Decisão 58) -------
     Uma lista só, com as 5 abas e as 4 ações, cada uma indo pro lugar que o
     parâmetro mandar: barra do rodapé, "⋮", ou fora. */
  const ACOES_N1: Record<string, { label: string; labelBarra?: string; Icone: ComponentType<SVGProps<SVGSVGElement>>; icon: ItemMenuTopo['icon']; onClick: () => void; danger?: boolean; hasUnread?: boolean }> = {
    // `label` é o texto no "⋮" (igual ao de sempre); `labelBarra` é o texto
    // curto de quando o item vai pra barra do rodapé, onde a fonte é 9,5px.
    config: { label: 'Configuração', labelBarra: 'Config.', Icone: Cog6ToothIcon, icon: Settings, onClick: () => setConfigAberta('configuracoes') },
    suporte: { label: 'Suporte / Chat', labelBarra: 'Suporte', Icone: ChatBubbleLeftRightIcon, icon: MessageCircle, onClick: () => setConfigAberta('suporte'), hasUnread: chatNaoLida },
    atualizar: { label: atualizando ? 'Atualizando…' : 'Atualizar', Icone: ArrowPathIcon, icon: RefreshCw, onClick: () => { void atualizarAgora() } },
    sair: { label: 'Sair', Icone: ArrowRightOnRectangleIcon, icon: LogOut, onClick: () => { void sair() }, danger: true },
  }

  const itensMais: ItemMenuTopo[] = [
    // Abas que o parâmetro mandou pro "⋮" — mesma ordem da barra.
    ...telasVisiveis
      .filter((t) => posDeMenu(t) === 'menu')
      .map((t) => ({ icon: iconeDeAbaNoMenu(TELAS[t].Icone), label: TELAS[t].rotulo, onClick: () => setTela(t) })),
    // Ações que continuam (ou passaram a ficar) no "⋮".
    ...Object.entries(ACOES_N1)
      .filter(([k]) => posDeMenu(k) === 'menu')
      .map(([, a]) => ({ icon: a.icon, label: a.label, onClick: a.onClick, danger: a.danger, hasUnread: a.hasUnread })),
  ]

  const menuNoRodape = menuPosN1 === 'rodape' || menuPosN1 === 'rodape_esquerda' || menuPosN1 === 'rodape_direita'
  const entradasAbas: EntradaRodapeN1[] = telasVisiveis
    .filter((t) => posDeMenu(t) === 'rodape')
    .map((chave) => ({
      key: chave,
      label: TELAS[chave].rotulo,
      Icone: TELAS[chave].Icone,
      // data-tour (05/09/2026, Etapa 6 — Tour guiado): ver
      // `src/kit/GuidedTour.tsx`/`TOUR_STEPS_N1`.
      dataTour: `nav-tab-${chave}`,
      extra: chave === 'lancamentos' ? <span className="rodape-destaque-principal" /> : undefined,
    }))
  const entradasAcoes: EntradaRodapeN1[] = Object.entries(ACOES_N1)
    .filter(([k]) => posDeMenu(k) === 'rodape')
    .map(([k, a]) => ({ key: k, label: a.labelBarra ?? a.label, Icone: a.Icone, aoTocar: a.onClick }))
  const entradaMais: EntradaRodapeN1 | null = menuNoRodape && itensMais.length
    ? {
        key: '__mais',
        label: 'Mais',
        Icone: EllipsisVerticalIcon,
        // O painel precisa abrir PRA CIMA aqui, senão nasce fora da tela.
        custom: <TopIconMenu items={itensMais} hasUnread={chatNaoLida} panelDir={{ vertical: 'up', horizontal: menuPosN1 === 'rodape_direita' ? 'right' : 'left' }} />,
      }
    : null
  const entradasRodape: EntradaRodapeN1[] = (() => {
    const base = [...entradasAbas, ...entradasAcoes]
    if (!entradaMais) return base
    if (menuPosN1 === 'rodape_esquerda') return [entradaMais, ...base]
    if (menuPosN1 === 'rodape_direita') return [...base, entradaMais]
    const meio = Math.ceil(base.length / 2)
    return [...base.slice(0, meio), entradaMais, ...base.slice(meio)]
  })()

  return (
    <>
      {/* Kit `TenantBrandBar` (L910): a linha de marca é a PRIMEIRA linha fixa
          do app, fora da área de telas — nunca coberta por tela ou folha
          nenhuma. Substitui o botão de engrenagem flutuante. */}
      <BarraMarcaN1
        chatNaoLida={chatNaoLida}
        nomeUsuario={usuarioTenantLogado?.name || usuarioTenantLogado?.login}
        tenant={tenantN1}
        itensMais={itensMais}
        menuPos={menuPosN1}
      />
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
      {qtdNotificacoesPendentes > 0 && configAberta !== 'notificacoes' && (
        // Aviso de notificação bancária pendente — mesmo padrão de layout dos
        // outros banners (bloco normal antes de <main>, nunca position:fixed).
        //
        // BUG REAL achado no Playwright antes de entregar (09/09/2026): a 1ª
        // versão tinha o botão "Ver" na ponta direita — exatamente embaixo
        // do botão de engrenagem (`.botao-engrenagem`, position:fixed no
        // canto superior direito), que interceptava o clique; o teste travou
        // com "botao-engrenagem intercepts pointer events". Corrigido: o
        // banner inteiro é o botão (área grande, sem depender da ponta) e
        // reserva 64px à direita (44px do botão + folga) pra nunca disputar
        // espaço com a engrenagem.
        <button
          type="button"
          data-testid="banner-notificacoes"
          onClick={() => setConfigAberta('notificacoes')}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 64px 10px 14px', background: '#2b2140', color: '#fff', border: 'none', borderRadius: 0, width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
        >
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {qtdNotificacoesPendentes} notificação(ões) do banco pra confirmar
          </span>
          <span style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Ver ›</span>
        </button>
      )}
      <main>
        {configAberta ? (
          configAberta === 'configuracoes' ? (
            <>
              <div className="cabecalho-fixo">
                <button type="button" className="botao-voltar-config" onClick={fecharConfig}>
                  ‹ Voltar
                </button>
                <h1>Configurações</h1>
              </div>
              <ConfiguracoesN1
                ordem={ordemMenuEngrenagem}
                chatNaoLida={chatNaoLida}
                podeVer={(k) => podeVerFuncN1(`config.${k}`)}
                onAbrir={(k: ChaveConfigN1) => {
                  if (k === 'sair') { void sair(); return }
                  setVoltaPara('configuracoes')
                  setConfigAberta(k as Config)
                }}
              />
            </>
          ) : configAberta === 'categorias' ? (
            <Categorias
              mes={mes}
              aoMudarMes={setMes}
              aoAbrirLancamento={aoAbrirLancamento}
              aoAbrirPlanejamento={() => setTela('planejamento')}
              aoVoltar={fecharConfig}
            />
          ) : configAberta === 'contas' ? (
            <Contas aoVoltar={fecharConfig} />
          ) : configAberta === 'assinatura' ? (
            <MinhaAssinatura aoVoltar={fecharConfig} />
          ) : configAberta === 'notificacoes' ? (
            <NotificacoesBancarias
              aoVoltar={fecharConfig}
              aoConfirmar={(n) => setLancamentoAberto({ notificacao: n })}
            />
          ) : configAberta === 'ferramentasTeste' ? (
            <SimularData aoVoltar={fecharConfig} />
          ) : configAberta === 'suporte' ? (
            <SuporteChat aoVoltar={fecharConfig} />
          ) : configAberta === 'meusDados' ? (
            <MeusDadosN1 aoVoltar={fecharConfig} />
          ) : configAberta === 'meuAmbiente' ? (
            <MeuAmbienteN1 aoVoltar={fecharConfig} />
          ) : configAberta === 'aparencia' ? (
            <AparenciaN1 aoVoltar={fecharConfig} />
          ) : configAberta === 'ajuda' ? (
            <AjudaN1
              aoVoltar={fecharConfig}
              abrirSuporte={() => { setVoltaPara('ajuda'); setConfigAberta('suporte') }}
              abrirTour={() => { setConfigAberta(null); setTourAberto(true) }}
              temNaoLida={chatNaoLida}
            />
          ) : configAberta === 'layout' ? (
            <Manutencao
              secao="layout"
              aoVoltar={fecharConfig}
              onAbrirTour={() => setTourAberto(true)}
              onAbrirFerramentasTeste={() => setConfigAberta('ferramentasTeste')}
            />
          ) : (
            <Manutencao
              secao="dados"
              focarLimparDados={configAberta === 'limpar'}
              aoVoltar={fecharConfig}
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
      {!configAberta && <Rodape tela={tela} entradas={entradasRodape} onTrocarTela={setTela} />}
      {lancamentoAberto && (
        <DetalheLancamento
          alvoId={lancamentoAberto.id}
          categoriaIdSugerida={lancamentoAberto.categoriaIdSugerida}
          contaIdSugerida={lancamentoAberto.contaIdSugerida}
          aoMudarMes={setMes}
          sugestao={
            lancamentoAberto.notificacao
              ? {
                  data: lancamentoAberto.notificacao.recebidoEm.slice(0, 10),
                  descricao: lancamentoAberto.notificacao.titulo || lancamentoAberto.notificacao.app,
                  valor: lancamentoAberto.notificacao.valor,
                  tipo: lancamentoAberto.notificacao.tipo,
                  descricaoOriginal: [lancamentoAberto.notificacao.titulo, lancamentoAberto.notificacao.texto].filter(Boolean).join(' — '),
                }
              : undefined
          }
          aoSalvarComSucesso={
            lancamentoAberto.notificacao?.id != null
              ? () => { marcarConfirmada(lancamentoAberto.notificacao!.id!) }
              : undefined
          }
          onFechar={() => setLancamentoAberto(null)}
        />
      )}
      {/* Tour guiado (Etapa 6) — renderizado como IRMÃO de tudo acima, no
          nível mais alto, de propósito (ver comentário no topo de
          `GuidedTour.tsx`: um `transform` CSS em ancestral desalinharia o
          recorte `position: fixed`). O app não tem nenhum wrapper com
          transform hoje, mas isso evita o problema por construção. */}
      {tourAberto && (
        /* Só explica tela que a pessoa REALMENTE tem no rodapé agora
           (10/09/2026, pedido do Rafael: "o tour não deve mostrar a
           explicação do menu Situação quando o modo é Light"). Vale pra
           qualquer tela ausente, não só a Situação: em Light e também quando
           um menu é posto em "Ocultar" no Layout do Sistema (N0), o passo
           correspondente sai do roteiro em vez de descrever algo que não
           existe na tela. */
        <GuidedTour
          passos={TOUR_STEPS_N1.filter((p) => !p.tela || (telasVisiveis as string[]).includes(p.tela))}
          onIrPara={onIrParaPassoTour}
          onFinalizar={() => setTourAberto(false)}
        />
      )}
    </>
  )
}
