import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'
import { hojeEfetivoISO } from '../hojeSimulado'
import { uid, type Endereco } from './kitBase'
import { LOGO_PRODUTO_BRANCA, LOGO_PRODUTO_COR } from './logosProduto'

// Modelo de plataforma do Kit de Estrutura Mínima Morfo — tenants, cobrança,
// trial, chat e as funções de data/estado que as telas do N0 usam
// (10/09/2026, Decisão 53). Transcrição literal do Kit
// `esqueleto-morfo-v1.jsx`, com a linha de origem anotada em cada bloco.
//
// Por que este arquivo existe: as telas do N0 do Kit (Indicadores, Financeiro,
// Central de Suporte) NÃO recebem números prontos — elas CALCULAM tudo a
// partir de `platform.tenants[].billing/trial/cancellation/createdAt/
// supportMessages`. Sem o tenant no formato do Kit, essas telas viram fachada
// (o que G59 proíbe). Os tenants de demonstração abaixo são os do PRÓPRIO Kit
// (`generatePlatform`, L644-L697), valor a valor (G55) — não mais os 3 nomes
// inventados que o MorfoFinP tinha desde a Decisão 22.
//
// ADAPTAÇÃO (persistência, registrada na Decisão 53): o Kit guarda a
// `platform` inteira numa chave de `localStorage` (`savePlatform`, L771-L772).
// Aqui ela é um campo do singleton `db.configuracoes` (`platformN0`) — mesmo
// "1 blob só", no armazenamento que o produto já usa (Dexie), reativo via
// `useLiveQuery`. Nenhum outro valor muda.

/* ---- Kit L123-L124: data de hoje (respeita a ferramenta de teste) ----
   No Kit é `__dateOverride`; aqui é `hojeEfetivoISO()` (Etapa 7), o mesmo
   mecanismo do produto — mesma função, nome diferente. */
export const todayISO = () => hojeEfetivoISO()
/* ---- Kit L140-L144: aritmética de datas ---- */
export const addDays = (iso: string, n: number) => { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
export const fmtDate = (iso: string | null | undefined) => { if (!iso) return '—'; const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }
export const daysUntil = (iso: string | null | undefined) => { if (!iso) return null; return Math.round((new Date(iso).getTime() - new Date(todayISO()).getTime()) / 86400000) }
/* ---- Kit L136: carimbo de hora que respeita a data simulada ---- */
export const agoraISO = () => new Date().toISOString()

/* ---- Kit L4567-L4571: rótulos dos últimos N meses ---- */
export function monthsRangeLabels(n: number) {
  const out: { key: string; label: string }[] = []; const hoje = new Date(todayISO() + 'T00:00:00')
  for (let i = n - 1; i >= 0; i--) { const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1); out.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') }) }
  return out
}

/* ---- Kit L620-L634: agrupamento das mensagens do chat por dia ---- */
export function chatDiaLabel(ts: string) {
  const d = new Date(ts); const diaISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  if (diaISO === todayISO()) return 'Hoje'
  if (diaISO === addDays(todayISO(), -1)) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export function agruparMensagensPorDia(mensagens: MensagemChat[]) {
  const grupos: { label: string; itens: MensagemChat[] }[] = []
  mensagens.forEach(m => {
    const label = chatDiaLabel(m.ts)
    let g = grupos.find(x => x.label === label)
    if (!g) { g = { label, itens: [] }; grupos.push(g) }
    g.itens.push(m)
  })
  return grupos
}
/* ---- Kit L3642-L3646 ---- */
export function chatReadTs(mensagens: MensagemChat[] | undefined) {
  const agora = new Date().toISOString()
  const ultima = mensagens && mensagens[mensagens.length - 1]
  return ultima && ultima.ts > agora ? ultima.ts : agora
}
/* ---- Kit L4518 / L5895: "tem mensagem não lida?" pra cada lado da conversa
   — transcrição literal, mesma expressão que o Kit usa pra decidir o
   mloc-shake/mloc-badge-pulse dos botões de acesso rápido (10/09/2026,
   Decisão 53/54 — Parte A do feedback do Rafael: os botões não tremiam nem
   mostravam selo porque esta checagem nunca tinha sido escrita). ---- */
export function hasUnreadTenant(t: Pick<TenantKit, 'supportMessages' | 'chatLastReadTenant'>) {
  return (t.supportMessages || []).some((m) => m.from === 'suporte' && (!t.chatLastReadTenant || m.ts > t.chatLastReadTenant))
}
export function hasUnreadMorfo(t: Pick<TenantKit, 'supportMessages' | 'chatLastReadMorfo'>) {
  return (t.supportMessages || []).some((m) => m.from === 'cliente' && (!t.chatLastReadMorfo || m.ts > t.chatLastReadMorfo))
}
/* ---- Kit L3661-L3668 ---- */
export function comFollowUpSeNecessario(mensagens: MensagemChat[] | undefined, chatConfig: ChatConfig | undefined): MensagemChat[] {
  if (!mensagens || mensagens.length === 0 || !chatConfig?.followUpHours) return mensagens || []
  const ultima = mensagens[mensagens.length - 1]
  if (ultima.from !== 'suporte' || ultima.followUpEnviado) return mensagens
  const horasPassadas = (Date.now() - new Date(ultima.ts).getTime()) / 3600000
  if (horasPassadas < chatConfig.followUpHours) return mensagens
  const followUp: MensagemChat = { id: uid(), from: 'suporte', text: chatConfig.followUpMessage || 'Ainda por aí? Ficamos à disposição se precisar de algo.', imageUrl: null, ts: agoraISO(), automatica: true }
  return [...mensagens.slice(0, -1), { ...ultima, followUpEnviado: true }, followUp]
}

/* ---- Kit L6391-L6397: filtro global "Dados Reais/Dados Teste/Ambos" das
   telas agregadas do N0 (Início, Clientes/Tenants, Financeiro, Indicadores)
   — transcrição literal (10/09/2026, Decisão 54, Parte B). `temDadosTeste`
   é o que faz o filtro ser um no-op quando não existe nenhum tenant
   fictício (nunca acontece no MorfoFinP hoje, que sempre nasce com os 3
   tenants de exemplo do Kit ao lado do tenant real `t0` — mas mantido pra
   ficar igual ao Kit se um dia isso mudar). Campo `t.real` do MorfoFinP é o
   inverso do `t.ficticio` do Kit (`real: true` só em `t0`). */
export type FiltroDados = 'real' | 'teste' | 'ambos'
export const OPCOES_FILTRO_DADOS: { v: FiltroDados; l: string; info: string }[] = [
  { v: 'real', l: 'Dados Reais', info: 'Considera só as empresas reais — qualquer empresa fictícia gerada pela massa de dados de teste é ignorada em Início, Clientes, Financeiro e Indicadores.' },
  { v: 'teste', l: 'Dados Teste', info: 'Considera só as empresas fictícias, geradas pela massa de dados de teste — as empresas reais são ignoradas em Início, Clientes, Financeiro e Indicadores.' },
  { v: 'ambos', l: 'Ambos', info: 'Soma empresas reais e fictícias juntas — é como os números sempre foram calculados. Se você gerou massa de dados de teste, os números aqui ficam maiores/diferentes dos reais de verdade.' },
]
export function filtrarTenantsPorDados(tenants: TenantKit[], filtroDados: FiltroDados): TenantKit[] {
  const temDadosTeste = tenants.some((t) => !t.real)
  return tenants.filter((t) => !temDadosTeste || filtroDados === 'ambos' || (filtroDados === 'real' ? !!t.real : !t.real))
}

/* ---- Kit L150 / L155: situação de uma parcela da assinatura ---- */
export function installmentDisplayStatus(inst: Parcela, toleranceDays?: number) { if (inst.paid) return 'pago'; if (inst.cancelada) return 'cancelada'; if (inst.perda) return 'perda'; return (daysUntil(inst.dueDate) ?? 0) < -(toleranceDays || 0) ? 'vencido' : 'pendente' }
export function instCobravel(i: Parcela) { return !i.paid && !i.cancelada && !i.perda }
/* ---- Kit L744-L760 (resumido ao que o MorfoFinP tem hoje: bloqueio manual,
   trial vencido e cancelamento expirado; as travas que dependem de cobrança
   real chegam com o backend, Backlog 028) ---- */
export function tenantCanceledExpired(t: TenantKit) { return !!(t.cancellation && (daysUntil(t.cancellation.accessUntil) ?? 0) < 0) }
export function tenantBlocked(t: TenantKit) {
  if (t.manualBlock) return true
  if (tenantCanceledExpired(t)) return true
  if (t.plan === 'trial' && t.trial) return (daysUntil(addDays(t.trial.startDate, t.trial.days)) ?? 0) < 0
  return false
}

/* ---- Tipos (o formato que `makeTenant` do Kit produz, L465-L489) ---- */
export interface MensagemChat { id: string; from: 'cliente' | 'suporte'; text: string; imageUrl?: string | null; ts: string; automatica?: boolean; followUpEnviado?: boolean }
export interface Parcela { id: string; dueDate: string; amount: number; paid: boolean; paidDate?: string | null; method?: string; cancelada?: boolean; perda?: boolean }
/* `demo: true` marca o usuário de DEMONSTRAÇÃO que o ambiente `t0` já nasce
   com ele (login "rafael"/senha "1234", herdado da massa do Kit). Ele existe
   só pra quem quer olhar o app sem cadastrar nada — e é justamente ele que o
   atalho "Entrar como empresa cliente (demo)" usa. A marca serve pro Login
   saber que AINDA NÃO existe acesso de verdade (ver `acessoAberto` em
   `LoginView.tsx`): assim que alguém contrata um plano (o usuário novo
   SUBSTITUI a lista, ver `auth.ts`) ou edita os próprios dados em Meus Dados
   (a marca cai fora, ver `ConfigN1.tsx`), os atalhos sem senha somem e
   login+senha passa a ser o único caminho — 11/09/2026, Decisão 67. */
export interface UsuarioTenant { id: string; name: string; login: string; senha: string; phone?: string; email?: string; status: string; role?: string; perfilId?: string; createdAt?: string; demo?: boolean }
export interface RegistroAcesso { id: string; ts: string; action: string; ator?: string }
export interface TenantKit {
  id: string
  companyName: string
  ownerName?: string
  phone?: string
  hasWhatsapp?: boolean
  email?: string
  createdAt: string
  plan: 'trial' | 'pagante'
  planId?: string | null
  manualBlock?: boolean
  onboarding?: string
  trial?: { days: number; startDate: string } | null
  billing?: { monthlyValue: number; dueDay: number; toleranceDays: number; installments: Parcela[] } | null
  cancellation?: { accessUntil: string } | null
  supportAuthorized?: boolean
  supportMessages: MensagemChat[]
  chatLastReadTenant?: string | null
  chatLastReadMorfo?: string | null
  users: UsuarioTenant[]
  userLimit?: number
  accessLog?: RegistroAcesso[]
  real?: boolean
  /* Documento do cliente — no Kit são dois campos (`docType` PF/PJ + `doc`,
     ver `NewTenantSheet` L5197); aqui é só CPF, porque o MorfoFinP é app de
     uso individual (11/09/2026, Decisão 67). Opcional: o cadastro pela Morfo
     não exige documento pra liberar acesso. */
  doc?: string
  /* ---- Decisão 55 (Parte B). `ficticio` é o campo do PRÓPRIO Kit (L1927:
     `platform.tenants.filter(t => t.ficticio)`) — marca empresa criada pela
     massa de teste do N0, e é o que faz "Limpar Dados Testes Morfo" nunca
     enxergar uma empresa real. Convive com `real` (que só marca `t0`, o
     ambiente de verdade deste aparelho): um tenant de DEMONSTRAÇÃO do Kit
     (`t1`/`t2`/`t3`) não é nenhum dos dois — não é o ambiente real e também
     não foi gerado por massa, então nunca some numa limpeza de teste.
     `env` é o volume de dados operacionais do ambiente daquele cliente (Kit:
     `t.env.entidadesA` + `t.env.ambienteTeste`); aqui guarda a CONTAGEM,
     porque só `t0` tem banco de verdade — ver `massaTeste.ts`. ---- */
  ficticio?: boolean
  env?: { registros?: number; ambienteTeste?: boolean }
  /* Logotipo do ambiente (Kit: `env.company.logoSquareUri`, "Meu Ambiente")
     — Decisão 55 (Parte B). Data URL, até 3MB, igual ao Kit. */
  logoUri?: string
  /* Logotipo do AMBIENTE, com o conjunto completo do Kit
     (`ParametrosAmbienteView`, L4160-L4235) — 10/09/2026. Rafael: "o logo não
     é só carregar ele, tem alinhamento, tamanho, espaçamento etc., tudo isso
     tem no kit". São dois arquivos (quadrado e horizontal), qual deles vai no
     topo, o que mostrar junto (logo+nome × só logo), a posição e qual serve
     pros documentos. `logoUri` (campo único antigo) é migrado pra
     `logoQuadradaUri` na 1ª leitura, igual o Kit faz. */
  logoQuadradaUri?: string
  logoHorizUri?: string
  logoTopo?: 'quadrada' | 'horizontal'
  /* 'so_nome' (Kit L946, `modo !== "so_nome"`): faltava aqui — o Kit tem os
     TRÊS modos desde sempre. Entrou em 10/09/2026 (Decisão 58). */
  logoModo?: 'logo_nome' | 'so_logo' | 'so_nome'
  /* Composição da logo com o nome (10/09/2026, pedido do Rafael: "deve ter
     parâmetro pra escolher se juntos ou separados, qual esquerda e qual
     direita"). Mesma mecânica que o Kit já usa no cabeçalho do site, onde
     cada logo tem a SUA posição (`posicaoMorfo`/`posicaoProduto`): posições
     iguais = lado a lado ("juntos"); posições diferentes = cada um na sua
     ponta ("separados"). Aqui isso vira um par explícito:
       - 'juntos'    → logo e nome no MESMO lugar, na ordem escolhida em
                       `logoOrdem` (logo antes do nome, ou o contrário);
       - 'separados' → `logoPos` vale pra logo e `nomePos` pro nome.
     Ausente = 'juntos', que é o app como sempre foi. */
  logoComposicao?: 'juntos' | 'separados'
  logoOrdem?: 'logo_nome' | 'nome_logo'
  logoPos?: 'esquerda' | 'centro' | 'direita'
  nomePos?: 'esquerda' | 'centro' | 'direita'
  logoDocs?: 'quadrada' | 'horizontal'
  /* ---- Perfis de acesso deste tenant (10/09/2026, Decisão 54 Parte B —
     Gerenciador de Perfis e Permissões). Kit L493: "N1: tenant.perfisAcesso
     (lazy — perfisPadraoN1() quando ausente)". Só `t0` (o tenant real) usa
     isto de fato — os 3 fictícios nunca logam de verdade. ---- */
  perfisAcesso?: PerfilAcesso[]
}
export interface ChatConfig {
  followUpHours?: number; followUpMessage?: string; maxImageKB?: number; enabled?: boolean
  /* ---- Kit L592-L602 (defaultGlobalParams › chat), portados na Decisão 55:
     mensagem automática de 1ª resposta, mensagem de fora do horário e o
     horário de atendimento por dia da semana — tela "Gerenciar Chat". ---- */
  autoReplyFirstMessage?: string
  outOfHoursMessage?: string
  businessHours?: Record<DiaSemana, { active: boolean; open: string; close: string }>
}
export type DiaSemana = 'dom' | 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab'
export const DIAS_SEMANA: { k: DiaSemana; l: string }[] = [
  { k: 'dom', l: 'Dom' }, { k: 'seg', l: 'Seg' }, { k: 'ter', l: 'Ter' }, { k: 'qua', l: 'Qua' },
  { k: 'qui', l: 'Qui' }, { k: 'sex', l: 'Sex' }, { k: 'sab', l: 'Sáb' },
]
/* ---- Kit L581-L604 (`defaultGlobalParams`) — parâmetros globais da
   plataforma, portados na Decisão 55 (Parte B). Valores idênticos ao Kit
   (G55); o texto do aviso de fim de teste troca "MorfoMod" pelo nome do
   produto, mesma adaptação `NOME_PRODUTO` já usada no Login (Decisão 48). */
export interface TrialWarningCfg { diasAntes: number; texto: string; repetirTodoDia: boolean }
export type CleanupMode = 'never' | 'immediate_cancel' | 'immediate_tolerance' | 'days'
export interface GlobalParams {
  toleranceDays: number
  dataRetentionDays: number
  cleanupMode: CleanupMode
  trialDays: number
  dueDay: number
  paymentCardsVisibleCount: number
  precadastroMaxDias: number
  respeitarAutorizacaoAcesso: boolean
  modoAcessoSuporte: 'total' | 'consulta'
  trialWarning: TrialWarningCfg
  chat: ChatConfig
}
export function defaultGlobalParams(): GlobalParams {
  return {
    toleranceDays: 5, dataRetentionDays: 90, cleanupMode: 'days', trialDays: 15, dueDay: 5,
    paymentCardsVisibleCount: 3, precadastroMaxDias: 15, respeitarAutorizacaoAcesso: false,
    modoAcessoSuporte: 'total',
    trialWarning: { diasAntes: 3, texto: 'Seu período de teste no MorfoFinP termina em breve! Fale com a gente pra continuar usando sem interrupção.', repetirTodoDia: false },
    chat: { ...CHAT_CONFIG_PADRAO },
  }
}
/* ---- Kit L1325, literal ---- */
export function cleanupModeLabel(m: CleanupMode | undefined) {
  return ({ never: 'Nunca excluir', immediate_cancel: 'Imediato no cancelamento', immediate_tolerance: 'Imediato na tolerância', days: 'X dias depois' } as Record<string, string>)[m || ''] || String(m || '—')
}
/* ---- Kit L422-L426 (`defaultAlertSettings`) — preferências de notificação
   do PRÓPRIO admin Morfo sobre as assinaturas SaaS ("Meus Alertas"). ---- */
export interface AlertSettings {
  vencendo: { enabled: boolean; diasAntes: number }
  atraso: { enabled: boolean; frequencia: 'diario' | 'semanal' }
  resumo: { enabled: boolean; frequencia: 'semanal' | 'mensal' }
}
export function defaultAlertSettings(): AlertSettings {
  return { vencendo: { enabled: true, diasAntes: 3 }, atraso: { enabled: true, frequencia: 'diario' }, resumo: { enabled: false, frequencia: 'semanal' } }
}
/* ---- Kit L2078-L2119 (grupo "layout" › Personalização avançada) — só os
   campos que existem de verdade no MorfoFinP. ADAPTAÇÃO registrada: o campo
   `modo` do Kit (fixo/vertical/horizontal/gaveta) segue FORA por decisão de
   produto da Etapa 4 (coluna única de 430px) — o resto do grupo entra. */
/* Onde cada item de navegação aparece (Kit L1690, "Posição dos menus"):
   'rodape' = na barra de menus; 'menu' = dentro do "⋮"; 'oculto' = em lugar
   nenhum. O item que dá acesso às Configurações NUNCA aceita 'oculto' —
   escondê-lo trancaria a pessoa sem caminho de volta (regra do Kit). */
export type PosicaoMenu = 'rodape' | 'menu' | 'oculto'
/* Posição do botão "⋮" (Kit `MENU_POSICOES`, L867). As cinco opções do Kit,
   sem exceção. */
export type MenuPosModo = 'topo' | 'topo_esquerda' | 'rodape' | 'rodape_esquerda' | 'rodape_direita'
export const MENU_POSICOES: { v: MenuPosModo; l: string; d: string }[] = [
  { v: 'topo', l: 'Canto superior direito (padrão)', d: 'Junto dos outros ícones, no topo de cada tela — como sempre foi.' },
  { v: 'topo_esquerda', l: 'Canto superior esquerdo', d: 'Encaixado na própria barra do topo, à esquerda da logo — a logo e o resto deslocam pra direita. Nunca flutua por cima do conteúdo.' },
  { v: 'rodape', l: 'No rodapé (centralizado)', d: 'Entra como um menu no MEIO da barra de navegação inferior — nunca flutua por cima do conteúdo.' },
  { v: 'rodape_esquerda', l: 'Canto inferior esquerdo — primeiro', d: 'Entra como o PRIMEIRO menu da barra de navegação inferior, ocupando um espaço igual ao dos outros menus — nunca flutua.' },
  { v: 'rodape_direita', l: 'Canto inferior direito — último', d: 'Entra como o ÚLTIMO menu da barra de navegação inferior, ocupando um espaço igual ao dos outros menus — nunca flutua.' },
]
export function normalizarMenuPosModo(v: string | undefined): MenuPosModo {
  return MENU_POSICOES.some((o) => o.v === v) ? (v as MenuPosModo) : 'topo'
}

/* Itens de navegação de cada nível (Kit `ITENS_NAV_PARAM`, L1624) — só chave,
   rótulo e o padrão de posição. Sem ícone de propósito: quem desenha o menu
   de verdade (`App.tsx` no N1, `DevApp.tsx` no N0) já tem os ícones, e trazer
   ícone pra cá criaria dependência de `App.tsx` dentro de `kitPlatform`.
   `protegido` = o item que nunca aceita "Ocultar". */
export const ITENS_NAV_N1: { key: string; label: string; padrao: PosicaoMenu }[] = [
  { key: 'resumo', label: 'Resumo', padrao: 'rodape' },
  { key: 'situacao', label: 'Situação', padrao: 'rodape' },
  { key: 'lancamentos', label: 'Lançamentos', padrao: 'rodape' },
  { key: 'carteira', label: 'Carteira', padrao: 'rodape' },
  { key: 'planejamento', label: 'Planejamento', padrao: 'rodape' },
  { key: 'config', label: 'Configuração', padrao: 'menu' },
  { key: 'suporte', label: 'Suporte / Chat', padrao: 'menu' },
  { key: 'atualizar', label: 'Atualizar', padrao: 'menu' },
  { key: 'sair', label: 'Sair', padrao: 'menu' },
]
export const ITENS_NAV_N0: { key: string; label: string; padrao: PosicaoMenu }[] = [
  { key: 'inicio', label: 'Início', padrao: 'rodape' },
  { key: 'tenants', label: 'Tenants', padrao: 'rodape' },
  { key: 'financeiro', label: 'Financeiro', padrao: 'rodape' },
  { key: 'auditoria', label: 'Auditoria', padrao: 'rodape' },
  { key: 'parametros', label: 'Parâmetros', padrao: 'rodape' },
  { key: 'indicadores', label: 'Indicadores', padrao: 'rodape' },
  { key: 'atualizar', label: 'Atualizar', padrao: 'menu' },
  { key: 'sair', label: 'Sair', padrao: 'menu' },
]
export const ITEM_PROTEGIDO_N1 = 'config'
export const ITEM_PROTEGIDO_N0 = 'parametros'

/* Posição efetiva de um item, com o padrão do próprio item por baixo (Lição
   39): config salva por um build anterior não tem o mapa, e o item novo que
   aparecer depois nasce no lugar certo em vez de sumir. O item protegido
   nunca fica oculto, nem que o dado diga isso. */
export function posicaoMenuDe(
  mapa: Record<string, PosicaoMenu> | undefined,
  item: { key: string; padrao: PosicaoMenu },
  protegido: string,
): PosicaoMenu {
  const v = mapa?.[item.key] ?? item.padrao
  if (item.key === protegido && v === 'oculto') return item.padrao
  return v
}

export interface LayoutConfig {
  topoIcones?: { busca?: boolean; chat?: boolean; exportar?: boolean }
  iconesTopo?: 'direita' | 'esquerda'
  brandPos?: 'topo' | 'oculta'
  brandEscala?: 'compacta' | 'normal' | 'grande'
  filtroDadosPos?: 'topo' | 'rodape'
  densidade?: 'confortavel' | 'compacta'
  /* Kit L1603 — "Menus do N1" / "Menus do N0", cada nível com os seus três
     campos e o próprio botão Salvar (rascunho até salvar). Portados em
     10/09/2026 (Decisão 58): faltavam por completo aqui, e o Rafael pediu
     paridade campo a campo com o Kit.
     `ordemN1`/`ordemN0` ficam de fora DE PROPÓSITO: a ordem dos menus neste
     produto é editada pelo próprio ambiente, em Configurações → Layout e
     Menus (Decisões 7 e 34), e duplicá-la aqui criaria duas fontes de
     verdade pra mesma coisa — ver `Manutencao.tsx`. */
  posicaoN1?: Record<string, PosicaoMenu>
  menuPosN1?: { modo: MenuPosModo }
  posicaoN0?: Record<string, PosicaoMenu>
  menuPosN0?: { modo: MenuPosModo }
}
/* ---- Kit L489-L493: "perfil = { id, nome, fixo?, permissoes: { <funcKey>:
   "editar"|"visualizar" } }". Chave ausente = sem acesso (nem vê). O perfil
   "admin" é fixo: acesso total, nunca editável nem excluível; usuário sem
   `perfilId` é tratado como admin (compatibilidade com dado pré-existente). */
export interface PerfilAcesso { id: string; nome: string; fixo?: boolean; permissoes: Record<string, 'editar' | 'visualizar' | 'nenhum' | undefined> }
/* ---- Kit L494-L497 (item 143): funcionalidade com SUBMENUS em árvore —
   cada submenu tem seu próprio Sem acesso/Visualiza/Edita, com herança do
   nível do menu pai quando não há valor explícito (ver `nivelAcesso`). ---- */
export interface FuncaoPerfil { k: string; l: string; sessao?: string; sub?: { k: string; l: string; sessao?: string }[] }
/* ---- Usuário administrador da plataforma (N0) — Kit `platform.devUsers`.
   Só existe de verdade a partir do 1º login/autocadastro N0 (ver
   `authN0.ts`); ausente/vazio = ninguém configurado ainda. ---- */
/* `cpf`/`address` entraram em 10/09/2026 (Decisão 58) — o Kit
   (`DevUserMorfoSheet`, L1471) sempre cadastrou os dois; aqui o tipo tinha
   e-mail e telefone mas nenhum dos dois campos era preenchido por tela
   nenhuma. Todos opcionais: usuário gravado antes disso continua válido. */
export interface DevUserN0 { id: string; name: string; login: string; senha: string; cpf?: string; email?: string; phone?: string; address?: Endereco; status?: string; perfilId?: string; createdAt?: string; ficticio?: boolean }
export interface PlatformN0 {
  tenants: TenantKit[]
  defaultParams?: Partial<GlobalParams>
  devUsers?: DevUserN0[]
  perfisMorfo?: PerfilAcesso[]
  /* Decisão 55 (Parte B) */
  alertSettings?: AlertSettings
  layoutConfig?: LayoutConfig
  /* Kit L1782-L1814 (grupo "marca"): logo por contexto. `morfoExterna`/
     `produtoExterna` já eram consumidas pelo Login (Decisão 48/49) via
     `siteKit.tsx`; `morfoTopo`/`produtoTopo` passam a valer pra faixa de
     marca do N0, e as `*Docs` ficam registradas pro dia em que existir
     documento gerado pelo app (o Kit também só as guarda). */
  /* `appLogadoClara`/`appLogadoEscura` (10/09/2026, pedido do Rafael): a logo
     que aparece no CABEÇALHO DO APP LOGADO (N1) — clara pra fundo escuro,
     colorida pra fundo claro. Nasce preenchida com as duas variantes oficiais
     do produto (`logosProduto.ts`); trocar a logo do app é trocar este
     parâmetro em N0 → Parâmetros → Marca, nunca o código. `appLogadoPos` e
     `appLogadoAltura` completam o "parâmetro de layout do app logado". */
  brandingN0?: {
    morfoTopo?: string; morfoDocs?: string; produtoTopo?: string; produtoDocs?: string
    appLogadoClara?: string; appLogadoEscura?: string
    appLogadoPos?: 'esquerda' | 'centro' | 'direita'
    appLogadoAltura?: number
    /* Espaçamento interno da barra (px), vertical e horizontal — os mesmos
       dois controles que o Kit expõe pra faixa de marca. */
    appLogadoEspacoV?: number
    appLogadoEspacoH?: number
  }
}

/* ---- Gerenciador de Perfis e Permissões (10/09/2026, Decisão 54, Parte B)
   — transcrição do modelo do Kit (L489-L567), com as chaves de função
   adaptadas às telas que o MorfoFinP TEM DE VERDADE (o Kit tem outras —
   "Entidade A" no N1, sub-árvore de Auditoria por camada de origem no N0 —
   que não existem aqui; G44 regra 3: adaptar as CHAVES à realidade do
   produto, nunca a MECÂNICA — `nivelAcesso`/`permTodas`/o modelo de dado em
   si são idênticos ao Kit). */
export const FUNCOES_PERFIL_N0: FuncaoPerfil[] = [
  { k: 'inicio', l: 'Início' },
  { k: 'tenants', l: 'Tenants' },
  { k: 'financeiro', l: 'Financeiro' },
  { k: 'auditoria', l: 'Auditoria' },
  /* ---- Kit L524-L539: a árvore de "Parâmetros" desmembrada pelas MESMAS 3
     sessões da tela real, cada item com a sua `sessao` (10/09/2026, Decisão
     55 — Parte B). As 5 chaves que já existiam (planos/site/marca/usuarios/
     permissoes) mantêm o NOME que já estava gravado nos perfis do Rafael —
     renomeá-las pras do Kit (usuariosMorfo/permissoesMorfo) apagaria em
     silêncio a permissão já configurada; as 9 novas usam o nome do Kit. ---- */
  { k: 'parametros', l: 'Parâmetros', sub: [
    { k: 'parametros.alertas', l: 'Meus Alertas', sessao: 'Meus Dados/Ambiente' },
    { k: 'parametros.assinatura', l: 'Assinatura e Bloqueio', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.ambiente', l: 'Ambiente dos Clientes', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.chat', l: 'Gerenciar Chat', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.testesCliente', l: 'Gerar Teste no Cliente', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.limpezasCliente', l: 'Limpar Dados do Cliente (teste e reais)', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.marca', l: 'Marca', sessao: 'Ambiente MorfoFinP ADM' },
    { k: 'parametros.planos', l: 'Gerenciar Planos', sessao: 'Ambiente MorfoFinP ADM' },
    { k: 'parametros.usuarios', l: 'Usuários Morfo', sessao: 'Ambiente MorfoFinP ADM' },
    { k: 'parametros.permissoes', l: 'Permissões Morfo', sessao: 'Ambiente MorfoFinP ADM' },
    { k: 'parametros.testesMorfo', l: 'Gerar Teste Morfo', sessao: 'Ambiente MorfoFinP ADM' },
    { k: 'parametros.limpezasMorfo', l: 'Limpar Dados da Morfo (teste e reais)', sessao: 'Ambiente MorfoFinP ADM' },
    { k: 'parametros.layout', l: 'Layout do Sistema', sessao: 'Ambiente MorfoFinP ADM' },
    { k: 'parametros.site', l: 'Site MorfoFinP', sessao: 'Ambiente MorfoFinP ADM' },
  ] },
  { k: 'indicadores', l: 'Indicadores' },
]
export const FUNCOES_PERFIL_N1: FuncaoPerfil[] = [
  { k: 'resumo', l: 'Resumo' },
  { k: 'situacao', l: 'Situação' },
  { k: 'lancamentos', l: 'Lançamentos' },
  { k: 'carteira', l: 'Carteira' },
  { k: 'planejamento', l: 'Planejamento' },
  /* ---- Kit L502-L507: as 4 últimas entradas (meusDados/meuAmbiente/
     aparencia/ajuda) entraram na Decisão 55 (Parte B), junto das telas. ---- */
  { k: 'config', l: 'Configurações', sub: [
    { k: 'config.meusDados', l: 'Meus Dados' },
    { k: 'config.categorias', l: 'Categorias e Grupos' },
    { k: 'config.contas', l: 'Contas e carteiras' },
    { k: 'config.notificacoes', l: 'Notificações bancárias' },
    { k: 'config.meuAmbiente', l: 'Meu Ambiente' },
    { k: 'config.assinatura', l: 'Minha Assinatura' },
    { k: 'config.aparencia', l: 'Aparência' },
    { k: 'config.ajuda', l: 'Ajuda' },
    { k: 'config.manutencao', l: 'Manutenção' },
    { k: 'config.suporte', l: 'Suporte' },
    /* `config.usuarios` e `config.permissoes` existiram aqui entre 10/09 e
       11/09/2026 (Decisão 54, Parte B). Saíram junto das telas: o ambiente do
       cliente é de UM usuário só, com acesso total (Decisão 67) — não existe
       mais o que gatear nem a quem dar perfil diferente dentro do N1. Os
       perfis em si (`perfisPadraoN1`) continuam, porque o N0 ainda os usa
       como referência de funcionalidade do produto. */
  ] },
]
/* ---- Kit L542-L549 (nivelAcesso), literal ---- */
export function nivelAcesso(perfil: PerfilAcesso | undefined, k: string): 'editar' | 'visualizar' | null {
  if (!perfil?.permissoes) return 'editar'
  const v = perfil.permissoes[k]
  if (v) return v === 'nenhum' ? null : v
  const dot = k.indexOf('.')
  if (dot > 0) { const pai = perfil.permissoes[k.slice(0, dot)]; return pai && pai !== 'nenhum' ? pai : null }
  return null
}
/* ---- Kit L550, literal ---- */
export function permTodas(funcs: FuncaoPerfil[], nivel: 'editar' | 'visualizar'): Record<string, 'editar' | 'visualizar'> {
  const p: Record<string, 'editar' | 'visualizar'> = {}
  funcs.forEach((f) => { p[f.k] = nivel })
  return p
}
/* ---- Kit L558-L565 (perfisPadraoN0), chaves adaptadas ao MorfoFinP ---- */
export function perfisPadraoN0(): PerfilAcesso[] {
  return [
    { id: 'admin', nome: 'Administrador', fixo: true, permissoes: permTodas(FUNCOES_PERFIL_N0, 'editar') },
    { id: 'financeiro', nome: 'Financeiro', permissoes: { inicio: 'visualizar', financeiro: 'editar', indicadores: 'visualizar' } },
    { id: 'negocios', nome: 'Negócios', permissoes: { inicio: 'visualizar', tenants: 'editar', indicadores: 'visualizar' } },
    { id: 'atendente', nome: 'Atendente', permissoes: { inicio: 'visualizar', tenants: 'visualizar' } },
  ]
}
/* ---- Kit L551-L557 (perfisPadraoN1), chaves adaptadas ao MorfoFinP.
   Kit tem 4 perfis padrão (admin/visualizacao/financeiro/operacional) — esta
   função tinha só 3 (faltava "financeiro", achado ao reconferir contra o Kit
   nesta rodada, 10/09/2026). Adaptação G44 regra 3: o Kit's "financeiro"
   visualiza tudo e só EDITA a função "financeiro" — o análogo mais próximo
   em MorfoFinP (sem uma função de mesmo nome) é editar só "lancamentos"
   (o registro financeiro em si), visualizando o resto. */
export function perfisPadraoN1(): PerfilAcesso[] {
  return [
    { id: 'admin', nome: 'Administrador', fixo: true, permissoes: permTodas(FUNCOES_PERFIL_N1, 'editar') },
    { id: 'visualizacao', nome: 'Visualização', permissoes: permTodas(FUNCOES_PERFIL_N1, 'visualizar') },
    { id: 'financeiro', nome: 'Financeiro', permissoes: { resumo: 'visualizar', situacao: 'visualizar', lancamentos: 'editar', carteira: 'visualizar', planejamento: 'visualizar' } },
    { id: 'operacional', nome: 'Operacional', permissoes: { resumo: 'visualizar', lancamentos: 'editar', carteira: 'editar' } },
  ]
}
/* ---- Kit L566, literal ---- */
export function perfilDoUsuario<U extends { perfilId?: string }>(perfis: PerfilAcesso[], user: U | null | undefined): PerfilAcesso | undefined {
  return perfis.find((p) => p.id === (user?.perfilId || 'admin')) || perfis.find((p) => p.id === 'admin') || perfis[0]
}
/* ---- Kit L567, literal ---- */
export function contaAdminsAtivos(users: { status?: string; perfilId?: string }[] | undefined): number {
  return (users || []).filter((u) => u.status !== 'inativo' && (u.perfilId || 'admin') === 'admin').length
}
/* ---- Kit L568-L579 (item 202): login único no sistema INTEIRO (N0 +
   todos os N1), não só dentro de um ambiente — mesmo bug real documentado
   no Kit ("cadastrei um usuário em cada ambiente com mesmo login e mesma
   senha, não deveria deixar"). ---- */
export function loginJaEmUsoGlobalmente(
  platform: { devUsers?: DevUserN0[]; tenants: TenantKit[] },
  login: string,
  exclude?: { devUserId?: string; tenantId?: string; userId?: string },
): boolean {
  const alvo = (login || '').trim().toLowerCase()
  if (!alvo || alvo === '-') return false
  const bate = (u: { login: string; id: string }) => u && u.login.trim().toLowerCase() === alvo
  if ((platform.devUsers || []).some((u) => bate(u) && u.id !== exclude?.devUserId)) return true
  return (platform.tenants || []).some((t) => (t.users || []).some((u) => bate(u) && !(t.id === exclude?.tenantId && u.id === exclude?.userId)))
}

/* ---- Migração do login de credencial única pro modelo multiusuário
   (10/09/2026, Decisão 54, Parte B — "login multiusuário também, pra
   perfis valerem de verdade"). Rafael já usa o app com um login/senha
   próprios (Etapa 8, `credencialEmail`/`credencialEmailN0`, campo único
   por nível) — essas duas funções PRESERVAM esse acesso, adicionando-o à
   lista de usuários real (`devUsers`/`tenant.users`) na primeira vez que o
   login roda depois desta mudança, em vez de exigir recadastro. Puras
   (nunca gravam sozinhas) — quem chama decide persistir; usam um id
   ESTÁVEL (não `uid()`) pra o mesmo dado migrado nunca virar 2 usuários
   diferentes em leituras repetidas antes da persistência. */
export const ID_LOGIN_MIGRADO_N0 = 'legado-n0'
export const ID_LOGIN_MIGRADO_N1 = 'legado-n1'
export function devUsersComMigracao(
  devUsers: DevUserN0[] | undefined,
  configN0: { credencialEmailN0?: string; credencialSenhaN0?: string } | undefined,
  adminPadrao: { nome: string; login: string; senha: string; email: string },
): DevUserN0[] {
  let lista = devUsers ? [...devUsers] : []
  if (configN0?.credencialEmailN0 && configN0?.credencialSenhaN0) {
    const loginAntigo = configN0.credencialEmailN0.trim().toLowerCase()
    if (!lista.some((u) => u.login.trim().toLowerCase() === loginAntigo)) {
      lista = [...lista, { id: ID_LOGIN_MIGRADO_N0, name: 'Admin Morfo', login: configN0.credencialEmailN0, senha: configN0.credencialSenhaN0, email: configN0.credencialEmailN0, perfilId: 'admin', status: 'ativo', createdAt: todayISO() }]
    }
  }
  if (lista.length === 0) {
    lista = [{ id: ID_LOGIN_MIGRADO_N0, name: adminPadrao.nome, login: adminPadrao.login, senha: adminPadrao.senha, email: adminPadrao.email, perfilId: 'admin', status: 'ativo', createdAt: todayISO() }]
  }
  return lista
}
export function tenantUsersComMigracao(
  users: UsuarioTenant[] | undefined,
  configN1: { credencialEmail?: string; credencialSenha?: string } | undefined,
): UsuarioTenant[] {
  let lista = users ? [...users] : []
  if (configN1?.credencialEmail && configN1?.credencialSenha) {
    const loginAntigo = configN1.credencialEmail.trim().toLowerCase()
    if (!lista.some((u) => u.login.trim().toLowerCase() === loginAntigo)) {
      lista = [...lista, { id: ID_LOGIN_MIGRADO_N1, name: configN1.credencialEmail, login: configN1.credencialEmail, senha: configN1.credencialSenha, email: configN1.credencialEmail, perfilId: 'admin', status: 'ativo', createdAt: todayISO() }]
    }
  }
  return lista
}

/* ---- Kit L425 (defaultGlobalParams › chat): valores padrão do MorfoMod (G55) ---- */
export const CHAT_CONFIG_PADRAO: ChatConfig = {
  enabled: true, followUpHours: 24, followUpMessage: 'Ainda por aí? Ficamos à disposição se precisar de algo.', maxImageKB: 3072,
  autoReplyFirstMessage: 'Olá! Recebemos sua mensagem. Assim que possível retornaremos — você será avisado aqui no app.',
  outOfHoursMessage: 'No momento estamos fora do horário de atendimento. Deixe sua mensagem que respondemos assim que possível.',
  businessHours: {
    seg: { active: true, open: '08:00', close: '18:00' }, ter: { active: true, open: '08:00', close: '18:00' },
    qua: { active: true, open: '08:00', close: '18:00' }, qui: { active: true, open: '08:00', close: '18:00' },
    sex: { active: true, open: '08:00', close: '18:00' }, sab: { active: false, open: '08:00', close: '12:00' },
    dom: { active: false, open: '08:00', close: '12:00' },
  },
}

/* ---- Kit L644-L697 (`generatePlatform`): a massa de demonstração do próprio
   Kit — mesmos nomes, datas, valores e mensagens (G55). O tenant `t0` é o
   ambiente REAL do MorfoFinP (o app deste dispositivo), acrescentado porque
   aqui o N1 existe de verdade; ele nasce sem cobrança (não há backend). ---- */
export function gerarPlatformN0(): PlatformN0 {
  const t0: TenantKit = {
    id: 't0', companyName: 'MorfoFinP — Rafael', ownerName: 'Rafael', email: 'projetos.morfo@gmail.com',
    createdAt: '2026-09-05', plan: 'pagante', planId: null, manualBlock: false, onboarding: 'completo',
    trial: null, billing: null, supportAuthorized: false, supportMessages: [], chatLastReadTenant: null, chatLastReadMorfo: null,
    users: [{ id: uid(), name: 'Rafael', login: 'rafael', senha: '1234', status: 'ativo', perfilId: 'admin', createdAt: '2026-09-05', demo: true }],
    userLimit: 1, accessLog: [], real: true,
  }
  const t1: TenantKit = {
    id: uid(), companyName: 'Empresa Modelo', ownerName: 'Ana Souza', phone: '(11) 98689-7908', hasWhatsapp: true, email: 'contato@empresamodelo.com.br',
    createdAt: '2026-01-15', plan: 'pagante', planId: null, manualBlock: false, onboarding: 'completo', trial: null,
    billing: { monthlyValue: 249, dueDay: 5, toleranceDays: 5, installments: [
      { id: uid(), dueDate: '2026-05-05', amount: 249, paid: true, paidDate: '2026-05-05', method: 'pix' },
      { id: uid(), dueDate: '2026-06-05', amount: 249, paid: true, paidDate: '2026-06-05', method: 'pix' },
      { id: uid(), dueDate: '2026-07-05', amount: 249, paid: true, paidDate: '2026-07-04', method: 'cartao_credito' },
    ] },
    supportAuthorized: true,
    supportMessages: [
      { id: uid(), from: 'cliente', text: 'Consegue me ajudar a entender minha fatura?', ts: addDays(todayISO(), -6) + 'T10:00:00' },
      { id: uid(), from: 'suporte', text: 'Claro! Qualquer dúvida específica me chama.', ts: addDays(todayISO(), -6) + 'T10:05:00' },
    ],
    chatLastReadTenant: addDays(todayISO(), -6) + 'T10:06:00',
    chatLastReadMorfo: addDays(todayISO(), -6) + 'T10:06:00',
    users: [{ id: uid(), name: 'Ana Souza', login: 'anasouza', senha: '1234', status: 'ativo', perfilId: 'admin', createdAt: '2026-01-15' }],
    userLimit: 5,
    accessLog: [
      { id: uid(), ts: '2026-06-30T15:22:00', action: 'Limite de usuários alterado para 5' },
      { id: uid(), ts: '2026-03-02T11:45:00', action: 'Convertido de teste para pagante' },
    ],
  }
  const t2: TenantKit = {
    id: uid(), companyName: 'Cliente Demo Ltda', ownerName: 'Renata Souza', phone: '(51) 99123-4455', hasWhatsapp: true, email: 'renata@clientedemo.com.br',
    createdAt: addDays(todayISO(), -10), plan: 'trial', planId: null, manualBlock: false, onboarding: 'completo',
    trial: { days: 15, startDate: addDays(todayISO(), -10) }, billing: null,
    supportAuthorized: false, supportMessages: [], chatLastReadTenant: null, chatLastReadMorfo: null,
    users: [{ id: uid(), name: 'Renata Souza', login: 'renata', senha: '1234', status: 'ativo', perfilId: 'admin', createdAt: addDays(todayISO(), -10) }],
    userLimit: 3, accessLog: [],
  }
  const t3: TenantKit = {
    id: uid(), companyName: 'Comércio Exemplo Ltda', ownerName: 'Diego Ferreira', phone: '(13) 99665-3344', hasWhatsapp: true, email: 'diego@comercioexemplo.com.br',
    createdAt: '2026-02-20', plan: 'pagante', planId: null, manualBlock: true, onboarding: 'completo', trial: null,
    billing: { monthlyValue: 249, dueDay: 15, toleranceDays: 5, installments: [
      { id: uid(), dueDate: '2026-06-15', amount: 249, paid: true, paidDate: '2026-06-15', method: 'pix' },
      { id: uid(), dueDate: '2026-07-15', amount: 249, paid: true, paidDate: '2026-07-14', method: 'pix' },
    ] },
    supportAuthorized: false, supportMessages: [], chatLastReadTenant: null, chatLastReadMorfo: null,
    users: [{ id: uid(), name: 'Diego Ferreira', login: 'diego', senha: '1234', status: 'ativo', perfilId: 'admin', createdAt: '2026-02-20' }],
    userLimit: 3,
    accessLog: [{ id: uid(), ts: '2026-07-20T09:00:00', action: 'Bloqueio manual' }],
  }
  /* Kit L696: `{ devUsers, alertSettings, tenants, plans, defaultParams }` */
  /* `brandingN0` nasce PREENCHIDO com as duas variantes oficiais da logo do
     produto — é o "parâmetro de layout do app logado já preenchido" que o
     Rafael pediu: o cabeçalho do N1 lê daqui, e trocar a logo é editar o
     parâmetro em N0 → Parâmetros → Marca. */
  return {
    tenants: [t0, t1, t2, t3],
    defaultParams: defaultGlobalParams(),
    alertSettings: defaultAlertSettings(),
    brandingN0: { ...BRANDING_APP_LOGADO_PADRAO },
  }
}

/* BUG REAL corrigido em 10/09/2026 (reproduzido, não suposto): quem já usava
   o app tinha `platformN0` GRAVADO no Dexie de uma build anterior a estes
   campos existirem. Como `usePlatformN0()` devolve o registro persistido tal
   e qual, `brandingN0` chegava `undefined` e o cabeçalho do N1 caía no texto
   "MorfoFinP" — exatamente o que o Rafael reportou ("não está mostrando a
   logo, e sim um texto"). Numa instalação nova nada disso aparecia, porque
   ali a plataforma é gerada na hora, já com os campos. Daí este padrão: todo
   campo NOVO de `brandingN0` tem o seu valor de fábrica aqui, e a leitura
   mescla este objeto por baixo do que está gravado — o que o usuário editou
   sempre vence, o que ele nunca editou nunca chega vazio. */
export const BRANDING_APP_LOGADO_PADRAO = {
  appLogadoClara: LOGO_PRODUTO_BRANCA,
  appLogadoEscura: LOGO_PRODUTO_COR,
  appLogadoPos: 'esquerda' as const,
  appLogadoAltura: 22,
  appLogadoEspacoV: 8,
  appLogadoEspacoH: 14,
}

/* Mescla os valores de fábrica por baixo do que está gravado. Usada em toda
   leitura da plataforma (persistida ou recém-gerada). */
function comBrandingPadrao(p: PlatformN0): PlatformN0 {
  return { ...p, brandingN0: { ...BRANDING_APP_LOGADO_PADRAO, ...(p.brandingN0 || {}) } }
}

/* ---- Persistência (ver ADAPTAÇÃO no topo) ---- */
//
// BUG REAL corrigido em 10/09/2026 (achado por teste — G54, não reportado
// pelo Rafael): `t1`/`t2`/`t3` nascem com `id: uid()` (aleatório) dentro de
// `gerarPlatformN0()`. Antes desta correção, `usePlatformN0()` chamava
// `gerarPlatformN0()` de novo A CADA RENDER sempre que `platformN0` ainda não
// tinha sido salvo no Dexie (o caso normal logo após instalar/abrir o app
// pela 1ª vez) — cada chamada gerava um conjunto NOVO de ids aleatórios.
// Resultado: clicar num tenant na aba Tenants (`setSelecionadoId(t.id)`)
// nunca abria o detalhe — no próximo render, `usePlatformN0()` já tinha
// devolvido tenants com ids DIFERENTES dos que o clique capturou, então
// `tenants.find(t => t.id === selecionadoId)` nunca achava nada. Corrigido
// gravando a plataforma gerada no Dexie assim que ela é lida pela 1ª vez
// (efeito colateral controlado, uma única vez por instalação) — dali em
// diante toda leitura vem do MESMO registro persistido, ids estáveis entre
// renders. Mesma classe de ambiguidade "carregando vs. vazio de verdade" já
// documentada na Etapa 8 (`LoginView.tsx`) — resolvida aqui com o mesmo
// sentinela.
const CARREGANDO_PLATFORM = Symbol('carregando-platform')
export function usePlatformN0(): PlatformN0 {
  const config = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO_PLATFORM as never)
  const carregando = config === (CARREGANDO_PLATFORM as never)
  const platformSalva = carregando ? undefined : (config as { platformN0?: PlatformN0 } | undefined)?.platformN0
  const jaTentouSemear = useRef(false)
  useEffect(() => {
    if (carregando || platformSalva || jaTentouSemear.current) return
    jaTentouSemear.current = true
    void salvarPlatformN0(gerarPlatformN0())
  }, [carregando, platformSalva])
  return comBrandingPadrao(platformSalva ?? gerarPlatformN0())
}
export async function salvarPlatformN0(p: PlatformN0) {
  await salvarConfiguracaoIcones({ platformN0: p })
}
export async function atualizarTenantN0(tenantId: string, patch: (t: TenantKit) => TenantKit) {
  const atual = (await db.configuracoes.get(1))?.platformN0 ?? gerarPlatformN0()
  await salvarPlatformN0({ ...atual, tenants: atual.tenants.map(t => (t.id === tenantId ? patch(t) : t)) })
}
/* Conveniência do lado N1: o app do produto é sempre o tenant `t0`. */
export const TENANT_N1_ID = 't0'
export function useTenantN1(): TenantKit | undefined {
  const p = usePlatformN0()
  return p.tenants.find(t => t.id === TENANT_N1_ID)
}
/* ---- CRUD de `devUsers`/`perfisMorfo` (10/09/2026, Decisão 54 Parte B) —
   mesmo padrão de `atualizarTenantN0`: lê o registro persistido de verdade
   (nunca um valor de render antigo), aplica o patch, grava de volta. Usado
   por `authN0.ts` (login/migração) e pela tela "Gerenciador Permissões
   MorfoMod"/"Gerenciar Usuários MorfoMod". */
export async function lerPlatformN0Persistida(): Promise<PlatformN0> {
  return comBrandingPadrao((await db.configuracoes.get(1))?.platformN0 ?? gerarPlatformN0())
}
export async function atualizarDevUsersN0(patch: (devUsers: DevUserN0[]) => DevUserN0[]) {
  const atual = await lerPlatformN0Persistida()
  const novo = patch(atual.devUsers ?? [])
  await salvarPlatformN0({ ...atual, devUsers: novo })
  return novo
}
export async function atualizarPerfisMorfo(patch: (perfis: PerfilAcesso[]) => PerfilAcesso[]) {
  const atual = await lerPlatformN0Persistida()
  const novo = patch(atual.perfisMorfo ?? perfisPadraoN0())
  await salvarPlatformN0({ ...atual, perfisMorfo: novo })
  return novo
}
export async function atualizarPerfisAcessoTenant(tenantId: string, patch: (perfis: PerfilAcesso[]) => PerfilAcesso[]) {
  let novo: PerfilAcesso[] = []
  await atualizarTenantN0(tenantId, (t) => { novo = patch(t.perfisAcesso ?? perfisPadraoN1()); return { ...t, perfisAcesso: novo } })
  return novo
}

/* ---- Parâmetros globais, alertas, layout e marca (10/09/2026, Decisão 55 —
   Parte B). Mesmo padrão de `atualizarTenantN0`: lê o registro PERSISTIDO
   (nunca um valor capturado num render antigo), aplica o patch, grava de
   volta — o que evita a corrida de dados que já foi bug real neste projeto
   (Etapa 7) quando duas telas gravam o mesmo singleton em sequência. ---- */
export function paramsGlobais(p: PlatformN0 | undefined): GlobalParams {
  return { ...defaultGlobalParams(), ...(p?.defaultParams || {}), chat: { ...CHAT_CONFIG_PADRAO, ...(p?.defaultParams?.chat || {}) } }
}
export async function atualizarDefaultParams(patch: Partial<GlobalParams>) {
  const atual = await lerPlatformN0Persistida()
  await salvarPlatformN0({ ...atual, defaultParams: { ...paramsGlobais(atual), ...patch } })
}
export async function atualizarChatConfig(patch: Partial<ChatConfig>) {
  const atual = await lerPlatformN0Persistida()
  const globais = paramsGlobais(atual)
  await salvarPlatformN0({ ...atual, defaultParams: { ...globais, chat: { ...globais.chat, ...patch } } })
}
export async function salvarAlertSettings(s: AlertSettings) {
  const atual = await lerPlatformN0Persistida()
  await salvarPlatformN0({ ...atual, alertSettings: s })
}
export async function atualizarLayoutConfig(patch: Partial<LayoutConfig>) {
  const atual = await lerPlatformN0Persistida()
  await salvarPlatformN0({ ...atual, layoutConfig: { ...(atual.layoutConfig || {}), ...patch } })
}
export async function atualizarBrandingN0(patch: Partial<NonNullable<PlatformN0['brandingN0']>>) {
  const atual = await lerPlatformN0Persistida()
  await salvarPlatformN0({ ...atual, brandingN0: { ...(atual.brandingN0 || {}), ...patch } })
}
export async function salvarTenantsN0(patch: (tenants: TenantKit[]) => TenantKit[]) {
  const atual = await lerPlatformN0Persistida()
  await salvarPlatformN0({ ...atual, tenants: patch(atual.tenants) })
}
/* Aplica um patch em vários campos de uma vez — usado pela geração de massa
   de teste, que cria empresas + usuários + planos na mesma confirmação
   (Kit L1862-L1869: um único `setPlatform` com tudo dentro). */
export async function atualizarPlatformN0(patch: (p: PlatformN0) => PlatformN0) {
  const atual = await lerPlatformN0Persistida()
  await salvarPlatformN0(patch(atual))
}
