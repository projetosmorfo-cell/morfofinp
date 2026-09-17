import { useEffect, useRef, useState } from 'react'
import Hoje from './screens/Hoje'
import Lancamentos from './screens/Lancamentos'
import Carteira from './screens/Carteira'
import Planejamento from './screens/Planejamento'
import Categorias from './screens/Categorias'
import Contas from './screens/Contas'
import Calibragem from './screens/Calibragem'
import Manutencao from './screens/Manutencao'
import NotificacoesBancarias from './screens/NotificacoesBancarias'
import ParametrosNotificacao from './screens/ParametrosNotificacao'
import MinhaAssinatura from './kit/MinhaAssinatura'
import GuidedTour, { passosTourN1, ONDE_REABRIR_TOUR, type PassoTour } from './kit/GuidedTour'
import BoasVindas, { ConviteTour, useEstadoOnboarding, usePlanoPronto } from './components/BoasVindas'
import SimularData, { BannerDataSimulada } from './kit/SimularData'
import RodapeAbas from './kit/RodapeAbas'
import { ArrowPathIcon, ArrowRightOnRectangleIcon, CalendarDaysIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon, EllipsisVerticalIcon, ListBulletIcon, ScaleIcon, WalletIcon } from '@heroicons/react/24/outline'
import DetalheLancamento from './components/DetalheLancamento'
import { mesInicial, formatarMes, type PagamentoFaturaAbertura } from './mes'
import { mesesComPendencia } from './pendencias'
import { avancarSeriesFixasPendentes } from './recorrencia'
import { migrarComportamentoDosGrupos, migrarGruposAntigosParaInvestimento, migrarIconeVariavel, migrarTipoDosGrupos } from './gruposUtil'
import { aplicarPadraoSeNaoEditado } from './kit/padraoCategorias'
import { aplicarPacoteN0SeNaoEscolhido } from './pacotesIcones'
import { vincularPagamentosAntigos } from './faturaPagamento'
import { garantirContaCofrinho } from './contasCofrinho'
import { migrarReceitaFixa } from './baseMeta'
import { usarBotaoVoltar } from './voltarAndroid'
import { PopupPermissoesNotificacao, usarAvisoPermissoes } from './components/PermissoesNotificacao'

/* Sentinela de "consulta ainda não respondeu" (mesmo padrão de `AppRoot.tsx`). */
const CARREGANDO = Symbol('carregando')
import { migrarFimDasVersoes, migrarPctGrupo, salvarConfiguracaoIcones, useOrdemAbas, useOrdemMenuEngrenagem, useTemaEfetivo } from './configuracaoIcones'
import { TopIconMenu, UserHoverIcon, ThemeToggleIcon } from './kit/TopoIcones'
import { Settings, MessageCircle, RefreshCw, LogOut } from 'lucide-react'
import SuporteChat from './kit/SuporteChat'
import {
  useTenantN1, hasUnreadTenant, usePlatformN0, situacaoCobranca, paramsGlobais,
  normalizarMenuPosModo, posicaoMenuDe, ITENS_NAV_N1, ITEM_PROTEGIDO_N1,
  usePosicaoN1Proprio, useMenuPosN1Proprio, daysUntil, addDays,
  type MenuPosModo, type PosicaoMenu,
} from './kit/kitPlatform'
import type { ItemMenuTopo } from './kit/TopoIcones'
import type { ComponentType, SVGProps } from 'react'
import { sair } from './kit/auth'
// 4 telas de Configurações do Kit portadas na Decisão 55 (Parte B)
import { MeusDadosN1, MeuAmbienteN1, AparenciaN1, AjudaN1 } from './kit/ConfigN1'
import ConfiguracoesN1, { type ChaveConfigN1 } from './kit/ConfiguracoesN1'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Conta, type NotificacaoPendente } from './db'
import { sincronizarPendentesNativas, ouvirNotificacoesAoVivo, marcarConfirmada, separarPendentes } from './notificacaoBancaria'
import { aplicarParametrosN0, paramsNotificacaoAtuais } from './notificacaoParametros'
import { acharDePara, ensinarDePara } from './vinculoNotificacao'
import { analisarNotificacao, casarContaDaNotificacao } from './parseNotificacao'
import { lerDoAmbiente } from './ambiente'

// Categorias saiu daqui em 30/08/2026 (rodada seguinte) — deixou de ser aba
// do rodapé e virou item do menu de configurações (engrenagem, ver
// `MenuEngrenagem`/`configAberta` abaixo), junto com a nova tela Contas.
// "Manutenção" (01/09/2026, 3ª rodada do dia) entrou no mesmo menu — ver
// `src/screens/Manutencao.tsx` pro motivo (limpar versão antiga do app
// grudada no navegador sem apagar os lançamentos do Rafael).
// Ícones (Heroicons outline, mesma biblioteca do rodapé do N0 — Decisão 50):
// o rodapé do N1 passou a ser a MESMA peça do N0 (`RodapeAbas`), ícone + texto.
/* AS ABAS DO APP (build 087 — as VERSÕES acabaram; estas quatro são as de
 * todo mundo).
 *
 * A chave `situacao` sobreviveu ao fim da tela `Situacao.tsx` DE PROPÓSITO:
 * ela é a chave persistida em `ordemAbas` (Layout e Menus), em `data-tour`
 * (`nav-tab-situacao`) e em `LayoutConfig.posicaoN1` publicada pelo N0.
 * Renomeá-la para 'hoje' quebraria a ordem que o Rafael já salvou e a posição
 * de menu já publicada pela plataforma, sem ganho nenhum — o RÓTULO é o que a
 * pessoa lê, e ele já é "Hoje".
 *
 * A chave `resumo` FOI REMOVIDA: a tela Resumo do Mês saiu junto com a
 * Premium. Uma `ordemAbas` gravada que ainda a cite é ignorada sozinha — a
 * ordem só reordena abas que existem. */
const TELAS = {
  situacao: { rotulo: 'Hoje', Componente: Hoje, Icone: ScaleIcon },
  lancamentos: { rotulo: 'Lançamentos', Componente: Lancamentos, Icone: ListBulletIcon },
  carteira: { rotulo: 'Carteira', Componente: Carteira, Icone: WalletIcon },
  planejamento: { rotulo: 'Planejamento', Componente: Planejamento, Icone: CalendarDaysIcon },
} as const

/* A LIGHT FOI ELIMINADA na build 087, e com ela o conceito de versão.
 * Rafael: *"não to achando que a light tenha que ficar sem o planejamento,
 * pois os valores das metas não podem ficar fixo e sem permitir edição… vamos
 * eliminar de vez a light tbm, ficaremos só com uma"*.
 *
 * O motivo, que é o que impede a volta: a Light cortava justamente a aba onde
 * as metas se EDITAM, enquanto todas as outras telas mostram o RESULTADO
 * dessas metas. Não havia corte de aba que salvasse esse desenho.
 *
 * Diferença de acesso, quando o app for comercializado, se monta em
 * PERMISSIONAMENTO (`podeVerFuncN1` logo abaixo, os perfis do Kit) — nunca
 * ramificando o layout de novo. Ver `migrarFimDasVersoes()` em
 * `src/configuracaoIcones.ts`. */

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
type Config = 'calibragem' | 'configuracoes' | 'categorias' | 'contas' | 'notificacoes' | 'notificacoesPendentes' | 'notificacoesRegras' | 'manutencao' | 'layout' | 'limpar' | 'assinatura' | 'ferramentasTeste' | 'suporte' | 'meusDados' | 'meuAmbiente' | 'aparencia' | 'ajuda'

// 'notificacoes' (09/09/2026): tela "Notificações bancárias" — ver
// `src/screens/NotificacoesBancarias.tsx` e `src/notificacaoBancaria.ts`.
const ROTULO_CONFIG: Record<'meusDados' | 'categorias' | 'contas' | 'notificacoes' | 'notificacoesRegras' | 'meuAmbiente' | 'assinatura' | 'aparencia' | 'ajuda' | 'manutencao' | 'suporte', string> = {
  meusDados: 'Meus Dados',
  categorias: 'Categorias, Grupos e Metas',
  contas: 'Contas e carteiras',
  notificacoes: 'Notificações bancárias',
  /* Build 080: as REGRAS da leitura de notificação, de nível usuário —
     tela própria, na mesma sessão "Do dia a dia" das notificações. */
  notificacoesRegras: 'Regras de Notificação Bancária',
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
// 12/09/2026: 'limpar' e 'sair' saíram desta lista (pedido do Rafael) — as
// duas ações continuam existindo DENTRO de "Manutenção e Saída", e "Sair"
// segue fixo no "⋮" (e agora protegido contra "Ocultar", ver
// ITEM_PROTEGIDO_N1 em kitPlatform.ts).
const ITENS_MENU_ENGRENAGEM_PADRAO = ['meusDados', 'categorias', 'contas', 'notificacoes', 'notificacoesRegras', 'ajuda', 'meuAmbiente', 'assinatura', 'layout', 'manutencao'] as const
type ItemMenuEngrenagem = (typeof ITENS_MENU_ENGRENAGEM_PADRAO)[number]
export const ROTULO_MENU_ENGRENAGEM: Record<ItemMenuEngrenagem, string> = {
  meusDados: ROTULO_CONFIG.meusDados,
  categorias: ROTULO_CONFIG.categorias,
  contas: ROTULO_CONFIG.contas,
  notificacoes: ROTULO_CONFIG.notificacoes,
  notificacoesRegras: ROTULO_CONFIG.notificacoesRegras,
  ajuda: ROTULO_CONFIG.ajuda,
  meuAmbiente: ROTULO_CONFIG.meuAmbiente,
  assinatura: ROTULO_CONFIG.assinatura,
  layout: 'Layout e Menus',
  manutencao: 'Manutenção e Saída',
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

/* Notificação bancária → campos já preenchidos do formulário (16/09/2026).
 *
 * O que muda em relação à build 078: a descrição deixa de ser o TÍTULO da
 * notificação ("Compra aprovada", "BRADESCO" — que é o assunto, não o que
 * aconteceu) e passa a ser o NOME DA CONTRAPARTE lido do texto ("Padaria
 * Central", "Flavia de Oliveira Barros Passaro"); a conta vem casada com a
 * carteira quando dá pra ter certeza, e EM BRANCO quando não dá; e o
 * "já foi pago" nasce false quando o banco disse que a transação só está
 * agendada.
 *
 * `descricaoOriginal` continua sendo o TEXTO CRU da notificação, nunca o nome
 * limpo — é o ponto inteiro daquele campo (Decisão 24): guardar o que o banco
 * de fato escreveu, pra conciliação futura.
 */
function sugestaoDaNotificacao(
  n: NotificacaoPendente,
  contas: Conta[],
  aprendizados: import('./db').AprendizadoNotificacao[] = [],
) {
  const params = paramsNotificacaoAtuais()
  const a = analisarNotificacao(n, params)
  /* Build 080 — o DE/PARA aprendido entra ANTES da leitura automática: se o
     Rafael já disse uma vez que "PJBANK" é "PJ Bank", na categoria X, é isso
     que o formulário abre preenchido. É o "corrigi uma vez e ficou" do pedido.
     A leitura do texto continua valendo pra tudo que ele ainda não ensinou. */
  const dePara = params.aplicarDeParaAutomaticamente ? acharDePara(a.contraparte, aprendizados) : undefined
  // "está agendada pra amanhã" → a data sugerida anda 1 dia. Só quando o
  // texto diz "amanhã" com todas as letras (ver `deslocamentoDias`).
  const contaId = dePara?.contaId ?? casarContaDaNotificacao(a, n, contas)
  const base = new Date(n.recebidoEm.slice(0, 10) + 'T12:00:00')
  base.setDate(base.getDate() + a.deslocamentoDias)
  const data = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(base.getDate()).padStart(2, '0')}`
  return {
    data,
    descricao: dePara?.descricao ?? a.descricaoSugerida ?? n.titulo ?? n.app,
    categoriaId: dePara?.categoriaId,
    valor: a.valor,
    tipo: a.tipo,
    pago: a.pagoSugerido,
    contaId,
    contaEmBranco: contaId == null,
    descricaoOriginal: [n.titulo, n.texto].filter(Boolean).join(' — '),
  }
}

interface AlvoLancamento {
  id?: number
  categoriaIdSugerida?: number
  contaIdSugerida?: number
  // Lançamento nascendo de uma notificação bancária (09/09/2026): o
  // formulário abre pré-preenchido com o que foi lido do texto, e ao salvar
  // a notificação vira 'confirmada' — ver `NotificacoesBancarias.tsx`.
  notificacao?: NotificacaoPendente
  // Item 11 (15/09/2026): abrir já em modo "clonando" — usado pelo atalho de
  // duplicar revelado ao arrastar a linha (Lançamentos e o drill-in de
  // Carteira, ver `ItemLancamentoAcoes.tsx`). Mesmo mecanismo do botão
  // "Clonar este lançamento" já existente dentro do formulário — só pula o
  // passo de abrir em edição e clicar em Clonar manualmente.
  abrirClonando?: boolean
  // Build 090: "Pagar esta fatura" (Carteira) abre o formulário já como
  // pagamento daquela fatura — ver `PagamentoFaturaAbertura` em `mes.ts`.
  pagamentoFatura?: PagamentoFaturaAbertura
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
  itensMais,
  menuPos,
}: {
  chatNaoLida?: boolean
  nomeUsuario?: string
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
  /* 12/09/2026 (pedido do Rafael: "não deve mais ter o campo 'Nome do
     ambiente', não deve mais mostrar no topo também; e na config retirar
     todas as configs de logo e aplicar a config contida no adm Morfo").
     A barra do topo passou a mostrar SÓ a identidade do produto, vinda do
     N0 (Parâmetros › Marca › "Logo do app logado") — nome e logo do próprio
     ambiente saíram daqui e da tela "Meu Ambiente". `ZonasIdentidade`
     continua no projeto porque o N0 usa na prévia da marca. */

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: pos === 'esquerda' ? 'auto' : undefined }}>
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
export interface ModoConsultaN0 {
  onVoltar: () => void
  /** Nome do cliente em que a Morfo entrou — some na tarja fina do topo. */
  nomeCliente?: string
  /** Usuário DELE — é o nome que o ícone de usuário do cabeçalho mostra. */
  nomeUsuario?: string
}

export default function App({ modoConsultaN0 }: { modoConsultaN0?: ModoConsultaN0 }) {
  // Navegação por estado do React, sem router e sem depender da URL —
  // funciona igual em qualquer lugar, inclusive abrindo o arquivo direto
  // (file://), onde bibliotecas baseadas em window.location/URL quebram.
  /* Nasce em 'situacao' — a tela Hoje, 1ª aba para todo mundo. Enquanto
     existiam versões, cravar isto aqui abria a versão errada fora da tela
     dela; sem versões o conflito não existe, e a derivação de `telaAtiva`
     continua cobrindo uma aba ocultada no layout. */
  const [tela, setTela] = useState<Tela>('situacao')

  // Mês selecionado — vive aqui (não em cada tela) pra ficar fixo ao trocar
  // de aba: as abas "de mês" (Hoje, Lançamentos, Carteira, Planejamento) obedecem esse
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
  /* 12/09/2026 (build 052, pedido do Rafael): "independente da tela que eu
     estiver, se eu clicar num menu do rodapé, deve ir pra tela principal
     dele". Trocar `tela` não bastava: o passo de dentro (detalhe de conta na
     Carteira, grupo aberto no Planejamento, categoria expandida) é estado
     LOCAL da tela, então tocar na aba que já está ativa não fazia nada e
     tocar em outra e voltar trazia o drill-in de volta.
     Este contador entra na `key` da tela renderizada: todo toque no rodapé
     remonta a tela ativa, que volta ao estado inicial dela. É de propósito que
     seja geral em vez de um "voltar" por tela — qualquer drill-in novo já
     nasce coberto, sem ninguém precisar lembrar. O mês selecionado não se
     perde: ele mora aqui no App, não dentro da tela. */
  const [resetTela, setResetTela] = useState(0)

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

  // Item 14 (16/09/2026): puxar pra baixo no topo do `<main>` (único
  // contêiner com rolagem do app) dispara a MESMA ação de "Atualizar" do
  // "⋮" — nunca uma lógica própria. Só arma o gesto quando o toque começa
  // com `scrollTop === 0` (senão um puxão dentro de uma lista rolada
  // dispararia a atualização por engano); solta acima do limiar chama
  // `atualizarAgora()`, abaixo dele só recolhe sem fazer nada.
  const mainRef = useRef<HTMLElement>(null)
  const [puxando, setPuxando] = useState(0)
  const puxadoRef = useRef<{ y0: number; ativo: boolean } | null>(null)
  const LIMIAR_PUXAR = 64
  const onTouchStartMain = (e: React.TouchEvent<HTMLElement>) => {
    const el = mainRef.current
    if (!el || el.scrollTop > 0 || atualizando) { puxadoRef.current = null; return }
    puxadoRef.current = { y0: e.touches[0].clientY, ativo: true }
  }
  const onTouchMoveMain = (e: React.TouchEvent<HTMLElement>) => {
    const ref = puxadoRef.current
    if (!ref || !ref.ativo) return
    const dy = e.touches[0].clientY - ref.y0
    if (dy <= 0) { setPuxando(0); return }
    setPuxando(Math.min(dy, LIMIAR_PUXAR * 1.6))
  }
  const onTouchEndMain = () => {
    const dy = puxando
    puxadoRef.current = null
    setPuxando(0)
    if (dy >= LIMIAR_PUXAR) void atualizarAgora()
  }

  // Tour guiado (05/09/2026, Roteiro de Parametrização Morfo, Etapa 6) —
  // aberto manualmente via Manutenção → "Ver tour guiado" (ver
  // `src/kit/GuidedTour.tsx`). Fecha qualquer tela de configuração aberta
  // (senão o tour tentaria apontar pro rodapé/engrenagem por baixo de
  // Categorias/Contas/Manutenção, que não existem enquanto essas telas
  // estão abertas).
  const [tourAberto, setTourAberto] = useState(false)
  /* Item 6 da lista de 12/09/2026: o tour passou a ABRIR SOZINHO toda vez que
     o app abre, até a pessoa escolher "Não exibir novamente". `abertoAuto`
     distingue os dois caminhos: só no automático o botão de desligar aparece
     (abrir à mão pela Ajuda e oferecer "não exibir" seria contraditório). */
  const [avisoTour, setAvisoTour] = useState('')
  const onIrParaPassoTour = (passo: PassoTour) => {
    /* Passo dentro de Configuração (`tela: 'config:...'`) abre a tela de
       parâmetros em vez de trocar de aba — é lá que moram os dois destinos
       que o tour explica no fim. */
    if (passo.tela?.startsWith('config:')) {
      setConfigAberta(passo.tela.slice('config:'.length) as Config)
      return
    }
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
  /* Build 090: `useLiveQuery` devolve `undefined` tanto "ainda carregando"
     quanto "não existe registro" — o popup de permissões precisa distinguir
     os dois (ver `usarAvisoPermissoes`). O sentinela `CARREGANDO` vira `null`
     depois que a consulta responde, exista registro ou não. */
  const configN1Carregada = useLiveQuery(async () => (await db.configuracoes.get(1)) ?? null, [], CARREGANDO)
  // Quem está logado — usado só pra mostrar o nome na barra do topo.
  const usuarioTenantLogado = tenantN1?.users.find((u) => u.id === configN1?.loggedUserIdN1)
  const podeVerFuncN1 = (_k: string) => true

  /* Build 087: as quatro abas são as mesmas para todo mundo — não existe mais
     um modo gravado escolhendo o conjunto, e portanto não existe mais a janela
     entre o mount e o fim da migração em que uma tela poderia receber um modo
     morto (o cuidado que a build 086 precisou tomar). O único filtro que
     sobra é o permissionamento, que hoje libera tudo. */
  const telasBase = (Object.keys(TELAS) as Tela[]).filter((t) => podeVerFuncN1(t))

  // Ordem do rodapé personalizável (04/09/2026, Roteiro de Parametrização
  // Morfo, Etapa 4 — Kit de Estrutura Mínima, "Layout": adaptação da seção
  // "Ordem dos menus" de `LayoutTenantScreen` do Kit, ver Manutencao.tsx).
  // Aplica só REORDENAÇÃO sobre as abas já visíveis acima — nunca esconde nem
  // mostra aba. Uma aba salva na ordem que não está mais visível (ordem antiga
  // citando uma aba que deixou de existir, ou um menu posto em "Ocultar" pelo
  // Layout do Sistema) é ignorada;
  // uma aba nova nunca prevista na ordem salva vai pro final, na ordem
  // padrão.
  /* Ordem das abas: a do PRÓPRIO ambiente manda; sem ela, vale o padrão que
     a Morfo salvou no N0 (12/09/2026 — ver `LayoutConfig.ordemAbasN1`). É
     isso que faz "Redefinir padrão" (Layout e Menus) funcionar: apagar a
     ordem local passa a seguir a da plataforma, sem reordenar quem já mexeu. */
  const layoutCfg = usePlatformN0().layoutConfig
  const ordemSalva = useOrdemAbas() ?? layoutCfg?.ordemAbasN1
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
     é exatamente o app como sempre foi.

     Camada extra (11/09/2026, achado real da comparação pixel a pixel: o
     Kit tem uma 2ª camada aqui, `tenant.layoutConfig` por cima do padrão da
     plataforma — `LayoutTenantScreen`, autoatendimento do PRÓPRIO ambiente
     — e o MorfoFinP só tinha a de cima). `posicaoN1Proprio`/
     `menuPosN1Proprio` (ver `kit/kitPlatform.ts`) são essa 2ª camada:
     aplicadas DEPOIS do padrão da Morfo (`layoutCfg?.posicaoN1`), na mesma
     ordem do Kit (tenant vence, Morfo é só o "chão"). `posicaoMenuDe` já
     resolve "sem nada gravado, cai no padrão" nos dois níveis — chamado 2x
     em cascata: 1ª vez com o padrão da Morfo tratado como "padrão do
     item", 2ª vez com o mapa do próprio ambiente por cima disso. Editado
     em `screens/Manutencao.tsx` → "Layout e Menus" → "Posição dos menus",
     atrás do gate de plano (`Plano.restricoes.layoutPersonalizado`). */
  const posicaoProprio = usePosicaoN1Proprio()
  const menuPosProprio = useMenuPosN1Proprio()
  const posDeMenu = (chave: string): PosicaoMenu => {
    const item = ITENS_NAV_N1.find((i) => i.key === chave)
    if (!item) return 'rodape'
    const padraoMorfo = posicaoMenuDe(layoutCfg?.posicaoN1, item, ITEM_PROTEGIDO_N1)
    return posicaoMenuDe(posicaoProprio, { key: item.key, padrao: padraoMorfo }, ITEM_PROTEGIDO_N1)
  }
  const menuPosN1 = normalizarMenuPosModo(menuPosProprio?.modo ?? layoutCfg?.menuPosN1?.modo)
  // Telas que ainda EXISTEM pra navegação (barra ou "⋮"); só 'oculto' some.
  const telasVisiveis = telasOrdenadas.filter((t) => posDeMenu(t) !== 'oculto')
  /* Desde a build 086 a aba `situacao` É a tela Hoje nas duas versões, então
     o rótulo vem direto de `TELAS` e não depende mais do modo. */
  const rotuloDaTela = (t: Tela) => TELAS[t].rotulo

  /* ver a nota logo abaixo: a aba MOSTRADA é derivada, não corrigida por efeito */
  const telaAtiva: Tela = telasVisiveis.includes(tela) ? tela : (telasVisiveis[0] ?? 'situacao')

  /* Item 3 (16/09/2026): toda troca de TELA abre no topo.
     BUG REAL que isso corrige: `<main>` é o ÚNICO contêiner com rolagem do app
     (regra da build 050), e ele NÃO desmonta quando o conteúdo dentro dele
     troca — então a rolagem de onde a pessoa estava continuava valendo na tela
     seguinte. Abrir "Configurações" a partir do "⋮" depois de rolar qualquer
     lista caía no meio da lista de configurações; o mesmo valia pra toda tela
     de configuração e pra troca de aba.
     O gatilho é a tela EXIBIDA (`configAberta ?? telaAtiva`) mais `resetTela`
     (o contador que o toque no rodapé incrementa) — então tocar na aba já ativa
     continua voltando pro topo dela, como sempre. O que NÃO entra aqui é o
     passo de DENTRO de uma tela (conta aberta na Carteira, categoria expandida,
     modal de lançamento): nada disso muda `tela`/`configAberta`, então o estado
     e a posição de leitura de um drill-in seguem preservados. */
  const telaExibida = configAberta ?? telaAtiva
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [telaExibida, resetTela])

  // Ordem do menu de engrenagem personalizável (08/09/2026, correção
  // pós-G59, "Layout do menu de configurações" em Manutencao.tsx) — mesma
  // lógica de reposição-só de `telasVisiveis` acima: uma chave salva que
  // não existe mais (nunca acontece hoje, mas por segurança) é ignorada;
  // uma chave nova (ex.: "sair", inexistente numa ordem salva antes desta
  // correção) sempre aparece, no final, nunca desaparece por estar
  // "faltando" numa ordem salva antiga — é isso que garante que "Sair"
  // nunca pode ser removido do menu, só reposicionado.
  /* 12/09/2026 (pedido do Rafael): "Ordem da tela de Configurações" deixou
     de ser editável no N1 e passou a ser SÓ padrão da plataforma, definido
     em N0 › Parâmetros › Layout do Sistema (`LayoutConfig.ordemConfigN1`).
     Uma ordem antiga gravada no ambiente ainda é respeitada como fallback —
     ninguém perde o que já tinha ajustado. */
  const ordemMenuLocalAntiga = useOrdemMenuEngrenagem()
  const ordemMenuSalva = layoutCfg?.ordemConfigN1 ?? ordemMenuLocalAntiga
  const ordemMenuEngrenagem: ItemMenuEngrenagem[] = (ordemMenuSalva
    ? [
        ...ordemMenuSalva.filter((k): k is ItemMenuEngrenagem => ITENS_MENU_ENGRENAGEM_PADRAO.includes(k as ItemMenuEngrenagem)),
        ...ITENS_MENU_ENGRENAGEM_PADRAO.filter((k) => !ordemMenuSalva.includes(k)),
      ]
    : [...ITENS_MENU_ENGRENAGEM_PADRAO]
  ).filter((item) => podeVerFuncN1(`config.${item}`))

  /* Se uma aba sair da navegação ("Ocultar" no parâmetro de posição dos
     menus) enquanto a pessoa está nela, a tela cai sozinha na 1ª que sobrou —
     nunca fica aberta sem nenhuma aba correspondente marcada no rodapé. (Até a
     build 086 o outro gatilho era trocar para a Light, que tirava o
     Planejamento; a Light não existe mais.)

     A aba mostrada é DERIVADA, nunca corrigida por efeito. Antes isso era um
     `useEffect` + `setTela`, e ele trocava a aba com base na lista do
     primeiro render — um palpite enquanto a configuração não chegou do banco.
     `setTela` é irreversível, então a escolha original se perdia (foi assim
     que a antiga Premium passou a abrir fora do Resumo e não voltava mais).
     Derivando, `tela` continua guardando a escolha da pessoa; se ela não
     estiver visível agora, mostramos a 1ª que está — e quando ela voltar a
     escolha original reaparece sozinha. */

  // No carregamento, avança toda série de lançamento "fixo" que já deveria
  // ter gerado uma nova ocorrência até hoje — é a "geração dinâmica por
  // ciclo" (ver src/recorrencia.ts).
  useEffect(() => {
    avancarSeriesFixasPendentes()
    // Correção única do percentual do ícone de grupo numa base que já existe
    // (11/09/2026) — ver `migrarPctGrupo()` em `src/configuracaoIcones.ts`.
    migrarPctGrupo()
    // Tipo de grupo (entrada × saída) numa base que já existe: atribui o tipo
    // a cada grupo e move pro grupo "Receita" toda categoria de receita que
    // estiver dentro de grupo de saída (11/09/2026) — roda uma vez só, ver
    // `migrarTipoDosGrupos()` em `src/gruposUtil.ts`.
    /* As migrações de CADASTRO rodam EM SEQUÊNCIA, não em paralelo (build
       062). Elas leem e gravam as mesmas tabelas e a ordem importa: o tipo do
       grupo precisa existir antes da fusão, a fusão precisa acontecer antes
       de o padrão do N0 ser aplicado (senão o padrão recria o grupo que a
       fusão acabou de inativar), e o comportamento se apoia no tipo. Disparar
       as quatro soltas era uma corrida esperando para acontecer. */
    void (async () => {
      // Tipo de grupo (entrada × saída) numa base que já existe: atribui o
      // tipo a cada grupo e move pro grupo "Receita" toda categoria de receita
      // que estiver dentro de grupo de saída (11/09/2026) — roda uma vez só,
      // ver `migrarTipoDosGrupos()` em `src/gruposUtil.ts`.
      await migrarTipoDosGrupos()
      /* Fusão dos grupos antigos ("Objetivos" e "Segurança") no
         "Investimento" (build 062). A base virou 50/30/20 só na planilha e no
         arquivo de backup — dentro do app nunca houve migração, e quem já
         usava continuou com os quatro grupos na tela. Move as categorias,
         soma os percentuais e INATIVA os antigos; não apaga nada. */
      await migrarGruposAntigosParaInvestimento()
      /* Comportamento do grupo (fixo × variável × guardar) numa base que já
         existe (build 061): preenche pelo nome UMA vez, e daí em diante quem
         manda é o cadastro — a regra deixou de viver no código-fonte. Ver
         `migrarComportamentoDosGrupos()` em `src/gruposUtil.ts`. */
      await migrarComportamentoDosGrupos()
      /* Build 090: ícone padrão do grupo Variável virou cadeado aberto
         colorido — só troca o valor de fábrica antigo. */
      await migrarIconeVariavel()
      /* O app passou a exigir PELO MENOS UM cofrinho cadastrado (build 086,
         pergunta do Rafael: "na carteira o cofrinho aparece mas no cadastro de
         contas ele não aparece"). Instalação antiga podia não ter nenhuma
         conta de tipo 'cofre', porque o cofrinho da Carteira sempre foi um
         card VIRTUAL somado por natureza. Aditiva: cria a conta e nada mais —
         nenhum lançamento é tocado. Ver `src/contasCofrinho.ts`. */
      await garantirContaCofrinho()
      /* FIM DAS VERSÕES (build 087): o campo `modoVisao` é APAGADO do banco,
         venha ele com 'light', 'premium', 'ideal' ou 'completa'. Nenhum caminho
         de código ramifica mais por ele — o conjunto de abas é constante —,
         então esta migração é só limpeza: ninguém pode "estar" numa versão.
         Ver `migrarFimDasVersoes()`. */
      await migrarFimDasVersoes()
      // Padrão de Categorias/Grupos/ícones definido pela Morfo no N0
      // (12/09/2026, item 7): só é aplicado enquanto ESTE ambiente não tiver
      // sido editado pelo próprio dono, e nunca apaga nada — ver
      // `src/kit/padraoCategorias.ts`.
      await aplicarPadraoSeNaoEditado()
      /* Pacote de ícones publicado pelo N0 (build 089). Só age quando ESTE
         ambiente nunca escolheu um pacote — a escolha do dono do ambiente
         nunca é sobrescrita —, e não faz nada enquanto o N0 não tiver
         publicado: esta build oferece as três propostas, não repinta o
         cadastro de quem já usa o app sem pedir. Ver `src/pacotesIcones.ts`. */
      await aplicarPacoteN0SeNaoEscolhido()
      /* Build 090: pagamento de fatura gravado antes desta build só era
         reconhecido pelos filhos (`faturaId`). Deduz cartão+fatura e grava
         `faturaCartaoId`/`faturaMes` no pagamento — é o que deixa "Fatura
         ainda não paga" descontar o que já foi pago. Ver
         `src/faturaPagamento.ts`. */
      await vincularPagamentosAntigos()
      /* Parâmetros da notificação bancária publicados pelo N0 (build 080).
         Mesma mecânica do padrão de categorias logo acima, aplicada a
         PARÂMETRO: no escopo "só quem nunca mexeu" a composição das camadas já
         entrega o valor novo sozinha, e no escopo "para todos" esta chamada é
         que APAGA a personalização deste ambiente. Ver
         `src/notificacaoParametros.ts`. */
      await aplicarParametrosN0()
    })()
    /* Base das metas: marca a receita fixa numa base que veio de antes da
       build 051 e nunca recebeu a flag (bug real de 12/09/2026 — ver
       `migrarReceitaFixa` em `src/baseMeta.ts`). Roda uma vez só. */
    void migrarReceitaFixa()
    /* A ABERTURA AUTOMÁTICA DO TOUR SAIU NA BUILD 087, junto com a Light.
       Ela só existia lá: desde 13/09/2026 vale o "onboarding invertido" —
       explicar telas vazias não ensina nada, então na versão completa o tour é
       OFERECIDO uma única vez, quando o plano fica pronto (`mostrarConviteTour`
       abaixo, e o cabeçalho de `src/components/BoasVindas.tsx`). Com uma versão
       só, o convite é o único caminho automático, e o manual continua em
       Configuração → Ajuda → Tour guiado.
       Órfãos que saíram junto, por consequência: o estado `tourAbertoAuto` e o
       botão "Não exibir novamente" do próprio tour, que só aparecia na abertura
       automática. `tourNaoExibir` CONTINUA — é ele que "Agora não" grava ao
       recusar o convite. */
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
  /* Popup de permissões da notificação bancária (12/09/2026, pedido do
     Rafael) — só no app instalado e só enquanto falta alguma das duas; tem
     "Lembrar mais tarde" (volta no dia seguinte) e "Não mostrar novamente".
     Ver `src/components/PermissoesNotificacao.tsx`. */
  const avisoPermissoes = usarAvisoPermissoes(configN1Carregada === CARREGANDO ? undefined : (configN1 ?? null))
  /* 16/09/2026: o aviso do topo conta só o que PARECE movimentação de
     dinheiro. Propaganda do banco que passou pelo filtro nativo (genérico de
     propósito) não infla mais o contador — ela fica na seção "Ignoradas" da
     tela, não é apagada. Ver `separarPendentes()`. */
  const qtdNotificacoesPendentes = useLiveQuery(
    async () => separarPendentes(await lerDoAmbiente(db.notificacoesPendentes.where('status').equals('pendente').toArray())).transacionais.length,
    [],
  ) ?? 0
  /* Contas da carteira, só pra casar o banco da notificação com uma conta já
     cadastrada (16/09/2026). Se não casar, o formulário abre com a conta EM
     BRANCO — pedido literal do Rafael; nunca chutar uma conta. */
  const contasParaNotificacao = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), []) ?? []
  /* De/para aprendido (build 080) — alimenta a sugestão do formulário. */
  const aprendizadosNotificacao = useLiveQuery(() => lerDoAmbiente(db.aprendizadosNotificacao.toArray()), []) ?? []
  const sugestaoNotificacao = lancamentoAberto?.notificacao
    ? sugestaoDaNotificacao(lancamentoAberto.notificacao, contasParaNotificacao, aprendizadosNotificacao)
    : undefined
  /* Meses já virados com pagamento/recebimento ainda em aberto (item 11,
     12/09/2026). `useLiveQuery` sobre a tabela inteira: assim que a pessoa
     marca a tarja de um lançamento como paga, a tarja se recalcula sozinha —
     e some quando o último pendente do mês é quitado. */
  const mesesPendentes = useLiveQuery(() => mesesComPendencia(), []) ?? []
  const [pendenciasDispensadas, setPendenciasDispensadas] = useState(false)
  /* Situação da assinatura deste ambiente (item 3) — a MESMA função que o
     gate de bloqueio usa em `AppRoot`, pra tarja e bloqueio nunca discordarem. */
  const tenantAtual = useTenantN1()
  const plataformaAtual = usePlatformN0()
  const situacaoCobrancaN1 = tenantAtual ? situacaoCobranca(tenantAtual, paramsGlobais(plataformaAtual)) : null
  const [avisoCobrancaDispensado, setAvisoCobrancaDispensado] = useState(false)
  /* Fim do PERÍODO DE TESTE se aproximando (12/09/2026, build 054). O Rafael:
     "deve seguir parâmetros de dias de aviso antes de vencer e mostrar tarja...
     o mesmo deve ocorrer com ambiente de teste vencido".

     `trialWarning` (N0 › Parâmetros › Assinatura e Bloqueio) existia desde a
     Decisão 55 mas era um parâmetro sem consumidor NENHUM neste produto — no
     Kit ele dispara mensagem automática no chat; aqui nada lia. Agora a tarja
     lê `diasAntes` e o `texto` configurados, e o bloqueio no dia seguinte ao
     fim já era tratado por `tenantBlocked` (que manda pro mesmo passo a passo
     de contratação da mensalidade vencida). */
  const trialCfg = paramsGlobais(plataformaAtual).trialWarning
  const diasAteFimDoTeste = tenantAtual?.plan === 'trial' && tenantAtual.trial
    ? daysUntil(addDays(tenantAtual.trial.startDate, tenantAtual.trial.days))
    : null
  const avisarFimDoTeste = diasAteFimDoTeste != null
    && diasAteFimDoTeste >= 0 && diasAteFimDoTeste <= (trialCfg?.diasAntes ?? 3)

  // Chat interno N1↔N0 não lido (10/09/2026, Decisão 53/54 — Parte A):
  // mesma expressão do Kit (`hasUnreadTenant`, ver kitPlatform.ts) aplicada
  // ao tenant único do MorfoFinP — alimenta o shake/badge do botão de
  // engrenagem (ver `MenuEngrenagem` acima).
  const chatNaoLida = tenantN1 ? hasUnreadTenant(tenantN1) : false

  /* Desde a build 086 a aba "situacao" mostra a tela HOJE nas duas versões —
     a tela `Situacao.tsx` foi apagada junto com a Premium, então o slot não
     troca mais de componente por modo. */
  const Componente = TELAS[telaAtiva].Componente
  const aoAbrirLancamento = (opcoes?: AlvoLancamento) => setLancamentoAberto(opcoes ?? {})

  /* Botão voltar do Android (12/09/2026, pedido do Rafael) — desempilha o
     que estiver aberto, na ordem em que a pessoa abriu; só quando já está na
     primeira aba é que o app é minimizado (ver `src/voltarAndroid.ts`). */
  usarBotaoVoltar(() => {
    if (lancamentoAberto) { setLancamentoAberto(null); return true }
    if (tourAberto) { setTourAberto(false); return true }
    if (configAberta) { fecharConfig(); return true }
    if (telasVisiveis.length > 0 && telaAtiva !== telasVisiveis[0]) { setTela(telasVisiveis[0]); return true }
    return false
  })

  /* ---- Montagem dos menus a partir do parâmetro do N0 (Decisão 58) -------
     Uma lista só, com as 5 abas e as 4 ações, cada uma indo pro lugar que o
     parâmetro mandar: barra do rodapé, "⋮", ou fora. */
  const ACOES_N1: Record<string, { label: string; labelBarra?: string; Icone: ComponentType<SVGProps<SVGSVGElement>>; icon: ItemMenuTopo['icon']; onClick: () => void; danger?: boolean; hasUnread?: boolean }> = {
    // `label` é o texto no "⋮" (igual ao de sempre); `labelBarra` é o texto
    // curto de quando o item vai pra barra do rodapé, onde a fonte é 9,5px.
    config: { label: 'Configuração', labelBarra: 'Config.', Icone: Cog6ToothIcon, icon: Settings, onClick: () => setConfigAberta('configuracoes') },
    suporte: { label: 'Suporte / Chat', labelBarra: 'Suporte', Icone: ChatBubbleLeftRightIcon, icon: MessageCircle, onClick: () => setConfigAberta('suporte'), hasUnread: chatNaoLida },
    atualizar: { label: atualizando ? 'Atualizando…' : 'Atualizar', Icone: ArrowPathIcon, icon: RefreshCw, onClick: () => { void atualizarAgora() } },
    /* Em modo consulta "Sair" sai do CLIENTE, não da conta (build 063, pedido
       do Rafael: "se eu clicar nos três pontinhos do cliente e clicar em sair,
       é a mesma coisa que eu sair do impersonate"). Chamar `sair()` aqui seria
       pior que inútil: apagaria a sessão N1 do dono do ambiente — que nem é
       quem está mexendo — e deixaria o administrador Morfo dentro de um app
       sem dono. */
    sair: modoConsultaN0
      ? { label: 'Sair do cliente', labelBarra: 'Sair', Icone: ArrowRightOnRectangleIcon, icon: LogOut, onClick: modoConsultaN0.onVoltar, danger: true }
      : { label: 'Sair', Icone: ArrowRightOnRectangleIcon, icon: LogOut, onClick: () => { void sair() }, danger: true },
  }

  const itensMais: ItemMenuTopo[] = [
    // Abas que o parâmetro mandou pro "⋮" — mesma ordem da barra.
    ...telasVisiveis
      .filter((t) => posDeMenu(t) === 'menu')
      .map((t) => ({ icon: iconeDeAbaNoMenu(TELAS[t].Icone), label: rotuloDaTela(t), onClick: () => setTela(t) })),
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
      label: rotuloDaTela(chave),
      Icone: TELAS[chave].Icone,
      // data-tour (05/09/2026, Etapa 6 — Tour guiado): ver
      // `src/kit/GuidedTour.tsx`/`TOUR_STEPS_N1`.
      dataTour: `nav-tab-${chave}`,
      /* A marca verde permanente sob "Lançamentos" SAIU na build 085, a pedido
         do Rafael: *"retire a barrinha verde destaque no menu Lançamentos, não
         precisa mais destacar ele"*. O destaque que ficou é o do item ATIVO
         (cor mais forte + peso + pílula de fundo, ver `RodapeAbas.tsx`). */
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

  /* ONBOARDING INVERTIDO (13/09/2026, versão Ideal) — boas-vindas → 3 passos →
     tour, nessa ordem. Ver o cabeçalho de `src/components/BoasVindas.tsx`.
     As três consultas são pequenas (categorias, grupos e metas do ambiente) e
     existem aqui só pra saber QUANDO o plano ficou pronto: é o fim do passo 2
     que dispara o convite do tour, e o passo 2 é concluído em outra tela. */
  const onboarding = useEstadoOnboarding()
  const catsOnboarding = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const gruposOnboarding = useLiveQuery(() => lerDoAmbiente(db.grupos.toArray()), [])
  const metasOnboarding = useLiveQuery(() => lerDoAmbiente(db.metas.toArray()), [])
  /* "Plano pronto" = o momento em que a tela Hoje troca o cartão de 3 passos
     pelos dois números. Ver `usePlanoPronto` — o passo 3 é opcional de
     propósito, esperar por ele adiaria o convite pra sempre em quem nunca
     preenche meta por categoria. */
  const planoPronto = usePlanoPronto(catsOnboarding, gruposOnboarding, metasOnboarding)
  /* NUNCA em modo consulta: quem está ali é o administrador Morfo dentro do
     ambiente de um cliente, não o dono do ambiente. Dar as boas-vindas a ele
     (a) rouba do cliente a primeira tela, marcando-a como lida por ele, e
     (b) cobriria o "‹ Voltar ao painel N0", que é o único caminho de saída —
     bug real pego pelo t050b, não relatado. */
  const mostrarBoasVindas =
    !modoConsultaN0 && onboarding.pronto && !onboarding.boasVindasVistas
  const mostrarConviteTour =
    !modoConsultaN0 &&
    onboarding.pronto &&
    onboarding.boasVindasVistas &&
    !onboarding.tourConviteFeito &&
    !configN1?.tourNaoExibir &&
    planoPronto &&
    !tourAberto
  const aceitarConviteTour = () => {
    void salvarConfiguracaoIcones({ tourConviteFeito: true })
    setTourAberto(true)
  }
  /* Recusou: some e não volta a perguntar. `tourNaoExibir` junto porque a
     resposta é sobre o tour, não sobre esta tela — quem disse "agora não" aqui
     não deveria receber o tour automático ao trocar de versão depois. Fica
     em Configuração → Ajuda, e a mensagem diz exatamente isso. */
  const recusarConviteTour = () => {
    void salvarConfiguracaoIcones({ tourConviteFeito: true, tourNaoExibir: true })
    setAvisoTour(ONDE_REABRIR_TOUR)
  }

  /* O GUARD DE "CONFIGURAÇÃO AINDA NÃO CHEGOU" SAIU NA BUILD 087.
     Ele existia por UMA razão: até a configuração chegar do banco, o modo de
     visão era um PALPITE, e o palpite escolhia quais abas existiam e qual era a
     primeira — trocar de aba com base nele era irreversível. Sem modo, não há
     palpite: as quatro abas são constantes desde o primeiro quadro. O que ainda
     chega depois (ordem das abas, menus ocultos) só REORDENA o que já está na
     tela, e reordenar num quadro não perde nada. */

  /* A tela de abertura ocupa o app inteiro: nada por trás dela tem conteúdo
     ainda, e mostrar rodapé/telas vazias por baixo só dilui a única coisa que
     a pessoa precisa ler agora. */
  if (mostrarBoasVindas) {
    return (
      <BoasVindas
        aoComecar={() => {
          void salvarConfiguracaoIcones({ boasVindasVistas: true })
        }}
      />
    )
  }

  return (
    <>
      {/* Kit `TenantBrandBar` (L910): a linha de marca é a PRIMEIRA linha fixa
          do app, fora da área de telas — nunca coberta por tela ou folha
          nenhuma. Substitui o botão de engrenagem flutuante. */}
      <BarraMarcaN1
        chatNaoLida={chatNaoLida}
        nomeUsuario={
          /* Em modo consulta o cabeçalho é o DO CLIENTE: o ícone de usuário
             mostra o usuário dele, não o do dono do aparelho (que nem está
             logado aqui). Era o pedaço que faltava pro "cabeçalho completo do
             cliente". */
          modoConsultaN0
            ? modoConsultaN0.nomeUsuario
            : usuarioTenantLogado?.name || usuarioTenantLogado?.login
        }
        itensMais={itensMais}
        menuPos={menuPosN1}
      />
      {modoConsultaN0 && (
        /* Tarja de impersonação (G59) — bloco normal do fluxo, irmão ANTES de
           `<main>`, nunca `position: fixed` (evita o bug já documentado de
           cobrir o cabeçalho sticky de cada tela).

           Build 063: era um bloco de duas linhas com um botão grande, e o
           Rafael pediu o contrário — "eu quero enxergar a tela inteira do
           cliente". Virou UMA linha fina: o que o administrador precisa é
           lembrar onde está, não um painel. A saída não some junto — ela
           passou a ser "Sair" no "⋮" do próprio cabeçalho do cliente (ver
           `ACOES_N1.sair`), que é onde ele foi procurar, e continua aqui como
           um "sair" pequeno ao lado do aviso. */
        <div className="tarja-consulta-n0" data-testid="tarja-consulta-n0">
          <span>
            Modo consulta{modoConsultaN0.nomeCliente ? ` · ${modoConsultaN0.nomeCliente}` : ''}
          </span>
          <button type="button" onClick={modoConsultaN0.onVoltar} data-testid="sair-consulta-n0">
            Sair ›
          </button>
        </div>
      )}
      {/* Item 6: ao escolher "Não exibir novamente", a mesma mensagem de
          onde reabrir aparece aqui — some no toque. */}
      {avisoTour && (
        <button
          type="button"
          data-testid="aviso-tour"
          onClick={() => setAvisoTour('')}
          style={{ flexShrink: 0, width: '100%', textAlign: 'left', border: 'none', background: '#1e3a5f', color: '#fff', padding: '10px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', font: 'inherit' }}
        >
          {avisoTour}
        </button>
      )}
      <BannerDataSimulada />
      {avisarFimDoTeste && !avisoCobrancaDispensado && (
        <div
          data-testid="banner-fim-teste"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px 9px 14px', background: '#4a3a12', color: '#ffe6a8', borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>
            {diasAteFimDoTeste === 0
              ? 'Seu período de teste termina hoje.'
              : `Seu período de teste termina em ${diasAteFimDoTeste} dia(s).`}
            {trialCfg?.texto ? ` ${trialCfg.texto}` : ''}
          </span>
          <button
            type="button"
            aria-label="Dispensar aviso de fim de teste"
            onClick={() => setAvisoCobrancaDispensado(true)}
            style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 18, lineHeight: 1, padding: 6, cursor: 'pointer', flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}
      {situacaoCobrancaN1 && (situacaoCobrancaN1.estado === 'avisando' || situacaoCobrancaN1.estado === 'vencido_na_tolerancia') && !avisoCobrancaDispensado && (
        /* Item 3 (12/09/2026): aviso ANTES de bloquear. Quantos dias antes vem
           do parâmetro "Dias de aviso antes do vencimento" (N0 › Parâmetros ›
           Assinatura e Bloqueio). Depois do dia do vencimento, enquanto durar a
           tolerância, a tarja fica vermelha e diz quando o acesso será
           cortado — quem já venceu a tolerância nem vê o app (cai em
           `RegularizarAcesso`). Bloco normal do fluxo, nunca `position:
           fixed`, mesma regra dos outros banners. */
        <div
          data-testid="banner-cobranca"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px 9px 14px', background: situacaoCobrancaN1.estado === 'avisando' ? '#4a3a12' : '#4a1d1d', color: situacaoCobrancaN1.estado === 'avisando' ? '#ffe6a8' : '#ffc9c9', borderBottom: '1px solid rgba(255,255,255,0.12)' }}
        >
          <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.4 }}>
            {situacaoCobrancaN1.estado === 'avisando'
              ? `Sua mensalidade vence em ${situacaoCobrancaN1.diasParaVencer} dia(s).`
              : `Mensalidade vencida há ${Math.abs(situacaoCobrancaN1.diasParaVencer ?? 0)} dia(s). Regularize para não perder o acesso.`}
          </span>
          <button
            type="button"
            aria-label="Dispensar aviso de cobrança"
            data-testid="cobranca-dispensar"
            onClick={() => setAvisoCobrancaDispensado(true)}
            style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 18, lineHeight: 1, padding: 6, cursor: 'pointer', flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}
      {qtdNotificacoesPendentes > 0 && configAberta !== 'notificacoes' && configAberta !== 'notificacoesPendentes' && (
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
          onClick={() => setConfigAberta('notificacoesPendentes')}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 64px 10px 14px', background: '#2b2140', color: '#fff', border: 'none', borderRadius: 0, width: '100%', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
        >
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            {qtdNotificacoesPendentes} notificação(ões) do banco pra confirmar
          </span>
          <span style={{ background: 'rgba(255,255,255,0.18)', borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>Ver ›</span>
        </button>
      )}
      {mesesPendentes.length > 0 && !pendenciasDispensadas && !configAberta && (
        /* Item 11 (12/09/2026): a contrapartida de "recorrente nunca nasce
           pago". Como nada mais é quitado sozinho, é esta tarja que avisa que
           ficou coisa em aberto em mês que já virou — cada mês é um link que
           leva a tela pra ele. Bloco normal do fluxo, irmão ANTES de <main>,
           nunca `position: fixed` (mesmo cuidado dos outros banners: fixo no
           topo cobriria o cabeçalho `sticky` de cada tela). */
        <div
          data-testid="banner-pendencias"
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px 9px 14px', background: '#4a2d12', color: '#ffd9a8', borderBottom: '1px solid #6b4520' }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              Há pagamentos/recebimentos em aberto em mês que já fechou
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
              {mesesPendentes.map((p) => (
                <button
                  key={p.mes}
                  type="button"
                  data-testid={`pendencia-${p.mes}`}
                  onClick={() => setMes(p.mes)}
                  title={`${p.quantidade} em aberto em ${formatarMes(p.mes)}`}
                  style={{ background: 'rgba(255,255,255,0.14)', color: '#ffd9a8', border: '1px solid rgba(255,217,168,0.35)', borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', font: 'inherit', lineHeight: 1.4 }}
                >
                  {formatarMes(p.mes)} ({p.quantidade})
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            aria-label="Dispensar aviso de pendências"
            data-testid="pendencias-dispensar"
            onClick={() => setPendenciasDispensadas(true)}
            style={{ background: 'none', border: 'none', color: '#ffd9a8', fontSize: 18, lineHeight: 1, padding: 6, cursor: 'pointer', flexShrink: 0 }}
          >
            ×
          </button>
        </div>
      )}
      <main
        ref={mainRef}
        onTouchStart={onTouchStartMain}
        onTouchMove={onTouchMoveMain}
        onTouchEnd={onTouchEndMain}
      >
        {(puxando > 0 || atualizando) && (
          <div
            data-testid="puxar-para-atualizar"
            style={{
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              height: atualizando ? 36 : Math.min(puxando, LIMIAR_PUXAR),
              overflow: 'hidden', color: 'var(--texto-fraco)', fontSize: 12,
              transition: atualizando ? 'height 0.15s' : 'none',
            }}
          >
            {atualizando ? 'Atualizando…' : puxando >= LIMIAR_PUXAR ? 'Solte pra atualizar' : 'Puxe pra atualizar'}
          </div>
        )}
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
              aoAbrirCalibragem={() => setConfigAberta('calibragem')}
              aoVoltar={fecharConfig}
            />
          ) : configAberta === 'calibragem' ? (
            /* Calibragem (build 059) — chamada pelo aviso da tela Hoje, pela
               faixa do Planejamento e pelo ⚖ do cabeçalho dele. Não entra no
               menu "⋮": não é um destino de configuração, é uma ação do plano. */
            <Calibragem mes={mes} aoVoltar={fecharConfig} aoAbrirLancamento={aoAbrirLancamento} />
          ) : configAberta === 'contas' ? (
            <Contas aoVoltar={fecharConfig} />
          ) : configAberta === 'assinatura' ? (
            /* "Falar com a Morfo" desta tela usa a MESMA navegação pro chat
               que o resto do app já usa (nada de mecanismo novo): abre
               'suporte' e marca a volta pra cá, igual à tela de Ajuda logo
               abaixo — ao fechar o chat, a pessoa cai de volta na assinatura,
               não no topo das Configurações. */
            <MinhaAssinatura
              aoVoltar={fecharConfig}
              onAbrirSuporte={() => { setVoltaPara('assinatura'); setConfigAberta('suporte') }}
              temNaoLida={chatNaoLida}
            />
          ) : configAberta === 'notificacoes' || configAberta === 'notificacoesPendentes' ? (
            /* Duas portas, uma tela: por Configurações vem a tela completa
               (permissões do Android, histórico, ferramenta de teste); pelo
               AVISO do topo vem só a lista de pendentes — 11/09/2026, pedido
               do Rafael: o aviso promete "confirmar movimentação", então é só
               isso que a tela dele mostra. */
            /* Build 080: UMA tela só, com abas. O aviso do topo continua
               entrando por 'notificacoesPendentes' — a diferença agora é só
               qual ABA abre primeiro, nunca o que a tela mostra. */
            <NotificacoesBancarias
              abaInicial="pendentes"
              aoVoltar={fecharConfig}
              aoConfirmar={(n) => setLancamentoAberto({ notificacao: n })}
              aoAbrirLancamento={(id) => setLancamentoAberto({ id })}
              aoAbrirParametros={() => setConfigAberta('notificacoesRegras')}
            />
          ) : configAberta === 'notificacoesRegras' ? (
            <ParametrosNotificacao aoVoltar={fecharConfig} />
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
              onAbrirFerramentasTeste={() => setConfigAberta('ferramentasTeste')}
              onIrParaAssinatura={() => { setVoltaPara('layout'); setConfigAberta('assinatura') }}
            />
          ) : (
            <Manutencao
              secao="dados"
              focarLimparDados={configAberta === 'limpar'}
              aoVoltar={fecharConfig}
              onAbrirFerramentasTeste={() => setConfigAberta('ferramentasTeste')}
              onIrParaAssinatura={() => { setVoltaPara(configAberta); setConfigAberta('assinatura') }}
            />
          )
        ) : (
          <Componente
            key={`${telaAtiva}:${resetTela}`}
            mes={mes}
            aoMudarMes={setMes}
            aoAbrirLancamento={aoAbrirLancamento}
            aoAbrirPlanejamento={() => setTela('planejamento')}
              aoAbrirCalibragem={() => setConfigAberta('calibragem')}
          />
        )}
      </main>
      {!configAberta && (
        <Rodape
          tela={telaAtiva}
          entradas={entradasRodape}
          onTrocarTela={(t) => { setTela(t); setResetTela((n) => n + 1) }}
        />
      )}
      {lancamentoAberto && (
        <DetalheLancamento
          alvoId={lancamentoAberto.id}
          categoriaIdSugerida={sugestaoNotificacao?.categoriaId ?? lancamentoAberto.categoriaIdSugerida}
          contaIdSugerida={sugestaoNotificacao?.contaId ?? lancamentoAberto.contaIdSugerida}
          abrirClonando={lancamentoAberto.abrirClonando}
          pagamentoFatura={lancamentoAberto.pagamentoFatura}
          aoMudarMes={setMes}
          sugestao={sugestaoNotificacao}
          aoSalvarComSucesso={
            lancamentoAberto.notificacao?.id != null
              ? (escolha) => {
                  const notif = lancamentoAberto.notificacao!
                  marcarConfirmada(notif.id!)
                  /* Build 080: toda confirmação ENSINA. É o mesmo aprendizado
                     do caminho de vínculo (`vinculoNotificacao.ts`) — os dois
                     casos são a pessoa dizendo o que aquele texto significa. */
                  if (paramsNotificacaoAtuais().aprenderDePara) {
                    const a = analisarNotificacao(notif, paramsNotificacaoAtuais())
                    void ensinarDePara({
                      contraparte: a.contraparte,
                      rotulo: a.contraparteBruta ?? a.contraparte,
                      descricao: escolha.descricao,
                      categoriaId: escolha.categoriaId,
                      contaId: escolha.contaId,
                    })
                  }
                }
              : undefined
          }
          onFechar={() => setLancamentoAberto(null)}
        />
      )}
      {avisoPermissoes.aberto && (
        <PopupPermissoesNotificacao
          estado={avisoPermissoes.estado}
          aoMudar={avisoPermissoes.setEstado}
          aoAdiar={avisoPermissoes.adiar}
          aoNuncaMais={avisoPermissoes.nuncaMais}
        />
      )}
      {/* Tour guiado (Etapa 6) — renderizado como IRMÃO de tudo acima, no
          nível mais alto, de propósito (ver comentário no topo de
          `GuidedTour.tsx`: um `transform` CSS em ancestral desalinharia o
          recorte `position: fixed`). O app não tem nenhum wrapper com
          transform hoje, mas isso evita o problema por construção. */}
      {tourAberto && (
        /* Só explica tela que a pessoa REALMENTE tem na navegação agora
           (10/09/2026, pedido do Rafael). Com o fim das versões (build 087) a
           única coisa que ainda tira uma aba da navegação é o "Ocultar" do
           Layout do Sistema (N0) — nesse caso o passo sai do roteiro em vez de
           descrever algo que não existe na tela. */
        <GuidedTour
          passos={passosTourN1().filter((p) => !p.tela || p.tela.startsWith('config:') || (telasVisiveis as string[]).includes(p.tela))}
          onIrPara={onIrParaPassoTour}
          /* Terminar o tour VOLTA PRA TELA INICIAL. Os últimos passos abrem a
             tela de Configuração pra apontar Contas e Categorias — sem isso o
             app fica parado lá quando o passo a passo acaba, que foi
             exatamente o que aconteceu na build 058. */
          onFinalizar={() => {
            setTourAberto(false)
            setConfigAberta(null)
            const inicial = telasVisiveis[0]
            if (inicial) setTela(inicial)
          }}
        />
      )}
      {/* Convite do tour — uma vez só, no fim do passo 2 (ver o cabeçalho de
          `BoasVindas.tsx`). Fica por último de propósito: é o elemento mais
          alto da pilha, acima de qualquer tela. */}
      {mostrarConviteTour && (
        <ConviteTour aoAceitar={aceitarConviteTour} aoRecusar={recusarConviteTour} />
      )}
    </>
  )
}
