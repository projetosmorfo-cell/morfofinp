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
/* BUG REAL corrigido em 12/09/2026 (build 052), relatado pelo Rafael: na
   Central de Suporte, "marcar como não lida" funcionava às vezes e às vezes
   não.

   A causa é a definição, não o clique. "Não lida" era DERIVADA: existe alguma
   mensagem DO CLIENTE mais nova que o carimbo de leitura. O botão só apagava o
   carimbo — o que só produz efeito numa conversa em que o cliente já escreveu
   alguma coisa. Numa conversa em que só o suporte falou (o aviso automático de
   fim de teste, por exemplo), apagar o carimbo não mudava nada e a conversa
   continuava "LIDA", sem nenhum sinal de que o clique tinha sido registrado.

   Marcar como não lida é uma decisão de quem está atendendo ("volto nessa
   depois"), então virou estado EXPLÍCITO — e a regra derivada continua valendo
   por cima dela, para a mensagem nova do cliente seguir acendendo o aviso
   sozinha. Abrir a conversa limpa as duas coisas. */
export function hasUnreadMorfo(t: Pick<TenantKit, 'supportMessages' | 'chatLastReadMorfo' | 'chatMarcadaNaoLidaMorfo'>) {
  if (t.chatMarcadaNaoLidaMorfo) return true
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
/* Critério ÚNICO de "isto é dado de teste" (12/09/2026 — bug real reportado
   pelo Rafael: "a barra do topo diz que tem dados de teste gerados, mas não
   tem, nem me dá opção de apagar").

   Causa: existiam DOIS critérios em telas diferentes. A barra de filtro
   considerava teste tudo que não fosse `real` — o que inclui os 3 ambientes
   de exemplo que a plataforma sempre semeou —, enquanto a tela de limpeza
   listava só o que tem `ficticio: true`, marca que só a massa gerada recebia.
   Resultado: a barra aparecia sempre, e o que ela acusava não aparecia em
   lugar nenhum pra apagar. Agora as duas telas usam esta função. */
export const ehTenantDeTeste = (t: TenantKit) => !!t.ficticio
export function filtrarTenantsPorDados(tenants: TenantKit[], filtroDados: FiltroDados): TenantKit[] {
  const temDadosTeste = tenants.some(ehTenantDeTeste)
  return tenants.filter((t) => !temDadosTeste || filtroDados === 'ambos' || (filtroDados === 'real' ? !ehTenantDeTeste(t) : ehTenantDeTeste(t)))
}

/* ---- Kit L150 / L155: situação de uma parcela da assinatura ---- */
export function installmentDisplayStatus(inst: Parcela, toleranceDays?: number) { if (inst.paid) return 'pago'; if (inst.cancelada) return 'cancelada'; if (inst.perda) return 'perda'; return (daysUntil(inst.dueDate) ?? 0) < -(toleranceDays || 0) ? 'vencido' : 'pendente' }
export function instCobravel(i: Parcela) { return !i.paid && !i.cancelada && !i.perda }
/* ---- Kit L744-L760 (resumido ao que o MorfoFinP tem hoje: bloqueio manual,
   trial vencido e cancelamento expirado; as travas que dependem de cobrança
   real chegam com o backend, Backlog 028) ---- */
export function tenantCanceledExpired(t: TenantKit) { return !!(t.cancellation && (daysUntil(t.cancellation.accessUntil) ?? 0) < 0) }
/* ---- Cobrança × acesso (12/09/2026, item 3) ----------------------------
   Até aqui `tenantBlocked` só olhava bloqueio manual, cancelamento expirado e
   teste vencido: uma mensalidade podia vencer e passar da tolerância sem
   consequência nenhuma no app do cliente. O pedido do Rafael fecha esse ciclo:
   avisa antes de vencer, bloqueia quando vence, e libera de novo quando o
   pagamento é confirmado. */

/** Parcelas que ainda contam como dívida (não pagas, não canceladas, não perda). */
export function parcelasEmAberto(t: TenantKit): Parcela[] {
  return (t.billing?.installments ?? []).filter(instCobravel).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

/** A parcela em aberto mais antiga — é ela que decide aviso e bloqueio. */
export function parcelaMaisAntigaEmAberto(t: TenantKit): Parcela | null {
  return parcelasEmAberto(t)[0] ?? null
}

/** Bloqueio POR PAGAMENTO: existe parcela vencida além do prazo de tolerância. */
export function bloqueadoPorPagamento(t: TenantKit, toleranceDays?: number): boolean {
  const tol = toleranceDays ?? t.billing?.toleranceDays ?? 0
  return parcelasEmAberto(t).some((i) => (daysUntil(i.dueDate) ?? 0) < -tol)
}

export type EstadoCobranca =
  | 'ok'                      // nada em aberto, ou vencimento ainda longe
  | 'avisando'                // dentro da janela de aviso, ainda não venceu
  | 'vencido_na_tolerancia'   // passou do dia, mas ainda dentro da tolerância
  | 'bloqueado'               // passou da tolerância — acesso cortado
  | 'aguardando_confirmacao'  // cliente informou o pagamento; a Morfo ainda não confirmou

export interface SituacaoCobranca {
  estado: EstadoCobranca
  /** Dias até o vencimento da parcela mais antiga em aberto (negativo = atrasado). */
  diasParaVencer: number | null
  parcela: Parcela | null
  emAberto: Parcela[]
  totalEmAberto: number
}

export function situacaoCobranca(t: TenantKit, params?: Partial<GlobalParams>): SituacaoCobranca {
  const emAberto = parcelasEmAberto(t)
  const parcela = emAberto[0] ?? null
  const total = emAberto.reduce((s, i) => s + i.amount, 0)
  const base: SituacaoCobranca = { estado: 'ok', diasParaVencer: null, parcela, emAberto, totalEmAberto: total }
  if (!parcela) return base
  const dias = daysUntil(parcela.dueDate) ?? 0
  const tol = params?.toleranceDays ?? t.billing?.toleranceDays ?? 0
  const aviso = params?.avisoVencimentoDiasAntes ?? 5
  /* Pagamento informado manda em tudo: mesmo vencido, o estado é "aguardando"
     — quem está esperando é a Morfo confirmar, não o cliente pagar. */
  if (emAberto.some((i) => !!i.pagamentoInformadoEm)) return { ...base, estado: 'aguardando_confirmacao', diasParaVencer: dias }
  if (dias < -tol) return { ...base, estado: 'bloqueado', diasParaVencer: dias }
  if (dias < 0) return { ...base, estado: 'vencido_na_tolerancia', diasParaVencer: dias }
  if (dias <= aviso) return { ...base, estado: 'avisando', diasParaVencer: dias }
  return { ...base, diasParaVencer: dias }
}

export function tenantBlocked(t: TenantKit, toleranceDays?: number) {
  if (t.manualBlock) return true
  if (tenantCanceledExpired(t)) return true
  if (t.plan === 'trial' && t.trial) return (daysUntil(addDays(t.trial.startDate, t.trial.days)) ?? 0) < 0
  /* 12/09/2026, item 3: mensalidade vencida além da tolerância bloqueia. Um
     pagamento já informado pelo cliente NÃO destrava sozinho — ele continua
     bloqueado, vendo o extrato com "aguardando confirmação", como pedido. */
  if (t.plan === 'pagante' && bloqueadoPorPagamento(t, toleranceDays)) return true
  return false
}

/* ---- Tipos (o formato que `makeTenant` do Kit produz, L465-L489) ---- */
export interface MensagemChat { id: string; from: 'cliente' | 'suporte'; text: string; imageUrl?: string | null; ts: string; automatica?: boolean; followUpEnviado?: boolean }
/* `pagamentoInformadoEm` (12/09/2026, item 3): data em que o CLIENTE avisou
   que pagou. Não libera nada sozinho — quem confirma é a Morfo, na ficha do
   cliente, e é a confirmação que marca `paid`. Enquanto está informado e não
   confirmado, o acesso segue bloqueado e a tela de planos mostra o status
   ("aguardando confirmação"), que é exatamente o que ele pediu. Sem servidor
   não existe baixa automática de pagamento; quando houver (Backlog 028), o
   gateway substitui a confirmação manual e nada mais muda. */
export interface Parcela { id: string; dueDate: string; amount: number; paid: boolean; paidDate?: string | null; method?: string; cancelada?: boolean; perda?: boolean; pagamentoInformadoEm?: string | null }
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
/* `tipo`/`atorNome`/`atorUserId` (12/09/2026, item 19 do Rafael — Auditoria do
   N0 com os filtros do Kit): campos ADITIVOS e opcionais. O Kit guarda isso num
   log global (`platform.auditLog`); aqui o log continua sendo um só
   (`tenants[].accessLog`, decisão já registrada acima de
   `verificarVencimentoPrecadastro`) — são os mesmos campos, no registro que já
   existe. Registro antigo sem eles cai nos padrões ('geral'/'admin'). */
export type TipoAuditoria = 'cliente' | 'financeiro' | 'assinatura' | 'usuario' | 'acesso' | 'ambiente' | 'layout' | 'geral'
export interface RegistroAcesso { id: string; ts: string; action: string; ator?: string; tipo?: TipoAuditoria; atorNome?: string; atorUserId?: string }
/* Kit L2497 (AUDIT_TIPOS) e L5652 (ATOR_INFO), literais. */
export const AUDIT_TIPOS: Record<string, string> = { cliente: 'Cliente', financeiro: 'Financeiro', assinatura: 'Assinatura', usuario: 'Usuário', acesso: 'Acesso', ambiente: 'Ambiente', layout: 'Layout', geral: 'Geral' }
/* Item 12 da lista de 12/09/2026: "os logs mostrados como Suporte
   (impersonado) deveriam ser Morfo — não foram feitos acessando o ambiente do
   cliente, e sim pela tela gerencial da Morfo". As ações do painel N0 passaram
   a registrar `admin`; `suporte` fica reservado pro que é feito DENTRO do
   ambiente do cliente, em modo consulta. */
export const ATOR_INFO: Record<string, { l: string; cor: string }> = {
  admin: { l: 'Morfo', cor: '#9B96A8' },
  suporte: { l: 'Suporte (dentro do ambiente)', cor: 'var(--mloc-amber, #D9A227)' },
  n1: { l: 'Cliente (N1)', cor: 'var(--mloc-purple, #5E2E97)' },
}
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
  /* Desde quando este tenant está em `onboarding: 'pendente_liberacao'` —
     usado por `verificarVencimentoPrecadastro` (Projeto Modelo, achado
     11/09/2026) pra saber quando o prazo do parâmetro `precadastroMaxDias`
     vence. Gravado no momento em que o pré-cadastro nasce (`NovoClienteSheet`
     em `DevApp.tsx`, sem "liberar acesso agora"); ausente = usa `createdAt`
     como aproximação (tenant antigo, gravado antes deste campo existir). */
  onboardingSince?: string
  /* Última data (ISO) em que o aviso automático de fim de teste (parâmetro
     `trialWarning`) foi enviado pro chat deste tenant — usado por
     `avisoTrialSeNecessario` pra não repetir o aviso todo housekeeping
     quando `trialWarning.repetirTodoDia` é falso. */
  trialAvisoUltimoEnvio?: string
  trial?: { days: number; startDate: string } | null
  billing?: { monthlyValue: number; dueDay: number; toleranceDays: number; installments: Parcela[] } | null
  cancellation?: { accessUntil: string } | null
  supportAuthorized?: boolean
  supportMessages: MensagemChat[]
  chatLastReadTenant?: string | null
  chatLastReadMorfo?: string | null
  /* Marcação manual de "não lida" feita pela Morfo na Central de Suporte —
     ver `hasUnreadMorfo`. Aditivo e opcional: ausente = comportamento
     derivado de sempre. */
  chatMarcadaNaoLidaMorfo?: boolean
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
  avisoVencimentoDiasAntes: number
  trialWarning: TrialWarningCfg
  chat: ChatConfig
}
export function defaultGlobalParams(): GlobalParams {
  return {
    toleranceDays: 5, dataRetentionDays: 90, cleanupMode: 'days', trialDays: 15, dueDay: 5,
    paymentCardsVisibleCount: 3, precadastroMaxDias: 15, respeitarAutorizacaoAcesso: false,
    modoAcessoSuporte: 'total',
    /* Quantos dias ANTES do vencimento o ambiente do cliente passa a mostrar
       a tarja de aviso (item 3, 12/09/2026). É diferente de
       `alertSettings.vencendo.diasAntes`, que é a notificação do ADMIN Morfo
       sobre as assinaturas — este aqui é o que o cliente vê no app dele. */
    avisoVencimentoDiasAntes: 5,
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
  { key: 'tenants', label: 'Clientes', padrao: 'rodape' },
  { key: 'financeiro', label: 'Financeiro', padrao: 'rodape' },
  { key: 'auditoria', label: 'Auditoria', padrao: 'rodape' },
  { key: 'parametros', label: 'Parâmetros', padrao: 'rodape' },
  { key: 'indicadores', label: 'Indicadores', padrao: 'rodape' },
  { key: 'atualizar', label: 'Atualizar', padrao: 'menu' },
  { key: 'sair', label: 'Sair', padrao: 'menu' },
]
/* Itens que NUNCA aceitam "Ocultar" (12/09/2026, pedido do Rafael: "menu
   Sair, na config dos 3 pontinhos, deve ser igual ao 'Configuração', não
   permitir ocultar"). Esconder a saída tranca a pessoa dentro do ambiente
   do mesmo jeito que esconder as Configurações — as duas são portas, não
   conteúdo. Continuam reposicionáveis (barra × "⋮"), só não somem. */
export const ITEM_PROTEGIDO_N1 = ['config', 'sair'] as const
export const ITEM_PROTEGIDO_N0 = ['parametros', 'sair'] as const

/* Posição efetiva de um item, com o padrão do próprio item por baixo (Lição
   39): config salva por um build anterior não tem o mapa, e o item novo que
   aparecer depois nasce no lugar certo em vez de sumir. O item protegido
   nunca fica oculto, nem que o dado diga isso. */
export function posicaoMenuDe(
  mapa: Record<string, PosicaoMenu> | undefined,
  item: { key: string; padrao: PosicaoMenu },
  protegido: string | readonly string[],
): PosicaoMenu {
  const v = mapa?.[item.key] ?? item.padrao
  const lista = typeof protegido === 'string' ? [protegido] : protegido
  if (lista.includes(item.key) && v === 'oculto') return item.padrao
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
  /* ORDEM dos menus como PADRÃO DA PLATAFORMA (12/09/2026, pedido do
     Rafael: "precisa evoluir pra permitir as mesmas configs dentro do N0 e
     gravar como padrão [...] os que já mexeram não devem ser restartados,
     apenas define o padrão, e dentro do N1 deve ter botão pra Redefinir o
     padrão"). Isso REVOGA a nota anterior de "não repetir aqui": a ordem do
     rodapé do N1 continua editável pelo próprio ambiente, mas o que está
     aqui é o padrão de fábrica que vale pra quem nunca mexeu — e é o que o
     botão "Redefinir padrão" do N1 devolve. A ordem da TELA DE
     CONFIGURAÇÕES do N1 passou a ser SÓ daqui (saiu do N1 por pedido do
     mesmo dia). */
  ordemAbasN1?: string[]
  ordemConfigN1?: string[]
  ordemAbasN0?: string[]
}

// Override de "Posição dos menus" / "Posição do botão ⋮" DO PRÓPRIO
// AMBIENTE (11/09/2026, comparação visual pixel a pixel contra o Projeto
// Modelo — achado real: o Kit tem essa seção em `LayoutTenantScreen`, a
// camada de autoatendimento do tenant, e o MorfoFinP só tinha a camada de
// cima — `posicaoN1`/`menuPosN1` no `LayoutConfig` acima, o padrão que a
// MORFO define pra plataforma inteira, editado em `DevApp.tsx`). Mesmo
// padrão fino de `usePlanoAtual`/`salvarPlanoId` (`planoAtual.ts`) —
// singleton `db.configuracoes`, sem bump de schema, sempre lê/grava só a
// própria chave. Consumido em `App.tsx` como camada por cima do padrão da
// Morfo (exatamente como o Kit: `tenant.layoutConfig` por cima de
// `modoPadraoMorfo`) e editado em `screens/Manutencao.tsx` → "Layout e
// Menus" → "Posição dos menus", atrás do gate de plano
// (`Plano.restricoes.layoutPersonalizado`).
export function usePosicaoN1Proprio(): Record<string, PosicaoMenu> | undefined {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  return config?.posicaoN1Proprio
}

// Grava só a chave do item alterado, preservando as demais já gravadas —
// nunca substitui o mapa inteiro. `valor: undefined` apaga a chave (é o
// que o botão "Restaurar padrão da Morfo" usa, item a item — mesma regra
// já registrada no comentário de `posicaoN1Proprio` em `db.ts`).
export async function salvarPosicaoN1Proprio(chave: string, valor: PosicaoMenu | undefined) {
  const config = await db.configuracoes.get(1)
  const mapaAtual: Record<string, PosicaoMenu> = { ...(config?.posicaoN1Proprio ?? {}) }
  if (valor === undefined) {
    delete mapaAtual[chave]
  } else {
    mapaAtual[chave] = valor
  }
  await salvarConfiguracaoIcones({ posicaoN1Proprio: mapaAtual })
}

export function useMenuPosN1Proprio(): { modo?: MenuPosModo } | undefined {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  return config?.menuPosN1Proprio
}

export async function salvarMenuPosN1Proprio(modo: MenuPosModo | undefined) {
  await salvarConfiguracaoIcones({ menuPosN1Proprio: modo === undefined ? undefined : { modo } })
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
/* Item 7 (12/09/2026) — o cadastro-modelo da plataforma. Os nomes dos campos
   são os mesmos de `Categoria`/`GrupoRegistro`/`Meta` (`db.ts`): esta é a
   MESMA configuração do N1, só que guardada como padrão, nunca uma segunda
   modelagem paralela. */
export interface GrupoPadraoN0 { nome: string; icone?: string; iconeEstilo?: string; iconeCor?: string; percentual: number }
/* Build 056 (12/09/2026): `aceitavelMensal`/`esperadoMensal` continuam no tipo
   SÓ pra ler padrão gravado por uma build anterior sem quebrar — nenhuma tela
   do N0 os edita e `aplicarPadrao` não os escreve mais. Valor é do ambiente
   (N1); o padrão da plataforma é estrutura. */
export interface CategoriaPadraoN0 { nome: string; grupo: string; natureza: string; aceitavelMensal?: number; esperadoMensal?: number; /* 12/09/2026: a flag entra no padrão da plataforma junto com o resto do cadastro — sem ela, um ambiente que recebe o padrão nasce com a base de metas zerada. */ receitaFixa?: boolean; icone?: string; iconeEstilo?: string; iconeCor?: string }
export interface PadraoCategoriasN0 {
  versao: number
  atualizadoEm: string
  grupos: GrupoPadraoN0[]
  categorias: CategoriaPadraoN0[]
  /* Os 3 percentuais de tamanho de ícone (`configuracaoIcones.ts`) — fazem
     parte do mesmo pedido ("Categorias/Grupos/ícones"). */
  pctCompleta?: number
  pctCategoria?: number
  pctGrupo?: number
}

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
  /* Padrão de Categorias/Grupos/ícones da PLATAFORMA (12/09/2026, item 7 do
     Rafael: "o N0 deveria ter as mesmas configurações de Categorias/Grupos/
     ícones, e ao salvar, virariam o novo padrão pros N1 que não editaram —
     e já carregar o padrão atual lá"). Guarda o cadastro-modelo que todo
     ambiente novo recebe; `versao` sobe a cada salvamento e é o que um N1
     compara com o que já aplicou (`padraoCatVersaoAplicada`, `db.configuracoes`)
     pra saber se tem padrão novo pra receber. Ver `padraoCategorias.ts`. */
  padraoCategorias?: PadraoCategoriasN0
  /* URLs do produto (12/09/2026, build 053 — pedido do Rafael: "nas configs do
     N0, ter novo menu pra URLs, lá devo preencher com a url pra download do
     apk", e mais adiante "coloque tbm a URL do Website... mostrar como
     opcional sempre no compartilhamento").

     Moram aqui, e não em `defaultParams`, porque não são regra de negócio de
     assinatura — são endereços da plataforma, do mesmo naipe das logos de
     `brandingN0`. Quem monta mensagem de convite/liberação lê daqui
     (`compartilharAcesso.ts`); nenhum texto tem endereço escrito à mão. */
  urlsProduto?: {
    /** Link direto do .apk (instalação fora da loja). */
    apk?: string
    /** Site institucional do produto — opcional em toda mensagem. */
    site?: string
    /* Endereço onde o PRÓPRIO APLICATIVO está publicado na web (build
       hospedado). Separado do `site` desde a build 054, por um motivo achado
       em uso real: o Rafael cadastrou o site da Morfo em `site`, o link de
       pré-cadastro foi montado em cima dele, e abrir o link caiu na home da
       Morfo — que não é o aplicativo e não sabe o que fazer com o endereço.
       Site institucional e aplicativo publicado são coisas diferentes, e só o
       segundo consegue abrir a tela de completar cadastro. */
    appWeb?: string
  }
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
  { k: 'tenants', l: 'Clientes' },
  { k: 'financeiro', l: 'Financeiro' },
  { k: 'auditoria', l: 'Auditoria' },
  /* ---- Kit L524-L539: a árvore de "Parâmetros" desmembrada pelas MESMAS 3
     sessões da tela real, cada item com a sua `sessao` (10/09/2026, Decisão
     55 — Parte B). As 5 chaves que já existiam (planos/site/marca/usuarios/
     permissoes) mantêm o NOME que já estava gravado nos perfis do Rafael —
     renomeá-las pras do Kit (usuariosMorfo/permissoesMorfo) apagaria em
     silêncio a permissão já configurada; as 9 novas usam o nome do Kit. ---- */
  { k: 'parametros', l: 'Parâmetros', sub: [
    /* `parametros.meusDados` (11/09/2026): o administrador logado editando o
       próprio cadastro — no Kit esse grupo existe só do lado do cliente; aqui
       o painel da Morfo também precisava dele (pedido do Rafael). */
    { k: 'parametros.meusDados', l: 'Meus Dados', sessao: 'Meus Dados/Ambiente' },
    { k: 'parametros.alertas', l: 'Meus Alertas', sessao: 'Meus Dados/Ambiente' },
    { k: 'parametros.assinatura', l: 'Assinatura e Bloqueio', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.ambiente', l: 'Ambiente dos Clientes', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.chat', l: 'Gerenciar Chat', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.padraoCategorias', l: 'Categorias e Grupos (padrão)', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.testesCliente', l: 'Gerar Teste no Cliente', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.limpezasCliente', l: 'Limpar Dados do Cliente (teste e reais)', sessao: 'Ambiente do Cliente' },
    { k: 'parametros.marca', l: 'Marca', sessao: 'Ambiente MorfoFinP ADM' },
    { k: 'parametros.urls', l: 'URLs', sessao: 'Ambiente MorfoFinP ADM' },
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
    { k: 'config.categorias', l: 'Categorias, Grupos e Metas' },
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
/* ---- Referência: `nivelAcesso` no Projeto Modelo. RECONFERIDO em
   11/09/2026: não é mais "literal" — o Projeto Modelo atual devolve
   `perfil.permissoes[pai] || null` puro, o que devolveria a STRING
   "nenhum" (valor truthy) quando o item-pai está explicitamente marcado
   "nenhum". Esta versão do MorfoFinP já tratava esse caso (`pai !== 'nenhum'
   ? pai : null`) — não é lacuna, é correção que o MorfoFinP já tinha sobre
   o próprio bug do Projeto Modelo. Mantido como está. ---- */
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
/* ---- Referência: `perfisPadraoN0` no Projeto Modelo, chaves adaptadas ao
   MorfoFinP (`clientes` do Projeto Modelo ≈ `tenants` aqui, já renomeado na
   Decisão 54). RECONFERIDO em 11/09/2026 contra o Projeto Modelo atual —
   achada divergência real: "Financeiro" lá também vê `clientes: visualizar`
   e "Negócios" também vê `financeiro: visualizar` (cada perfil enxerga o
   dado do outro em modo leitura, só não edita); esta versão não tinha
   nenhum dos dois. Corrigido abaixo (as duas chaves acrescentadas). ---- */
export function perfisPadraoN0(): PerfilAcesso[] {
  return [
    { id: 'admin', nome: 'Administrador', fixo: true, permissoes: permTodas(FUNCOES_PERFIL_N0, 'editar') },
    { id: 'financeiro', nome: 'Financeiro', permissoes: { inicio: 'visualizar', tenants: 'visualizar', financeiro: 'editar', indicadores: 'visualizar' } },
    { id: 'negocios', nome: 'Negócios', permissoes: { inicio: 'visualizar', tenants: 'editar', financeiro: 'visualizar', indicadores: 'visualizar' } },
    { id: 'atendente', nome: 'Atendente', permissoes: { inicio: 'visualizar', tenants: 'visualizar' } },
  ]
}
/* ---- Referência: `perfisPadraoN1` no Projeto Modelo, chaves adaptadas ao
   MorfoFinP. CORRIGIDO em 11/09/2026: o comentário antigo dizia que o
   Projeto Modelo tem 4 perfis padrão (admin/visualizacao/financeiro/
   operacional) — reconferido agora, o Projeto Modelo ATUAL só tem 3
   (admin/visualizacao/operacional, sem "financeiro"). O MorfoFinP ganhou
   esse 4º perfil numa rodada anterior (adaptação G44 regra 3, abaixo) e ele
   continua fazendo sentido pro produto (separar quem só mexe no registro
   financeiro de quem só mexe no operacional) — mantido, só a citação da
   fonte foi corrigida pra não overclaim o Projeto Modelo. Adaptação G44
   regra 3: o perfil "financeiro" do Projeto Modelo (quando existia)
   visualizava tudo e só EDITAVA a função "financeiro" — o análogo mais
   próximo em MorfoFinP (sem uma função de mesmo nome) é editar só
   "lancamentos" (o registro financeiro em si), visualizando o resto. */
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
    id: uid(), ficticio: true, companyName: 'Empresa Modelo', ownerName: 'Ana Souza', phone: '(11) 98689-7908', hasWhatsapp: true, email: 'contato@empresamodelo.com.br',
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
      /* 12/09/2026: o texto deste evento de exemplo citava "Limite de
         usuários", que saiu do produto inteiro a pedido do Rafael — como ele
         aparece na Auditoria e no histórico do cliente, era o último lugar da
         tela onde a expressão sobrevivia. Trocado por um evento real do
         produto. */
      { id: uid(), ts: '2026-06-30T15:22:00', action: 'Plano alterado pela Morfo' },
      { id: uid(), ts: '2026-03-02T11:45:00', action: 'Convertido de teste para pagante' },
    ],
  }
  const t2: TenantKit = {
    id: uid(), ficticio: true, companyName: 'Cliente Demo Ltda', ownerName: 'Renata Souza', phone: '(51) 99123-4455', hasWhatsapp: true, email: 'renata@clientedemo.com.br',
    createdAt: addDays(todayISO(), -10), plan: 'trial', planId: null, manualBlock: false, onboarding: 'completo',
    trial: { days: 15, startDate: addDays(todayISO(), -10) }, billing: null,
    supportAuthorized: false, supportMessages: [], chatLastReadTenant: null, chatLastReadMorfo: null,
    users: [{ id: uid(), name: 'Renata Souza', login: 'renata', senha: '1234', status: 'ativo', perfilId: 'admin', createdAt: addDays(todayISO(), -10) }],
    userLimit: 3, accessLog: [],
  }
  const t3: TenantKit = {
    id: uid(), ficticio: true, companyName: 'Comércio Exemplo Ltda', ownerName: 'Diego Ferreira', phone: '(13) 99665-3344', hasWhatsapp: true, email: 'diego@comercioexemplo.com.br',
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
  return { ...p, brandingN0: { ...BRANDING_APP_LOGADO_PADRAO, ...(p.brandingN0 || {}) }, tenants: p.tenants.map(comMarcaDeExemplo) }
}

/* Base que já existe: os 3 ambientes de exemplo foram gravados antes de a
   marca `ficticio` existir. Sem isto eles continuariam invisíveis pra tela de
   limpeza — que é metade do bug acima. Um ambiente cadastrado pela Morfo
   sempre nasce com `real: true`, e a massa gerada já nasce com `ficticio`,
   então só os semeados caem nesta regra; nenhum ambiente de cliente é
   marcado como teste por engano. */
function comMarcaDeExemplo(t: TenantKit): TenantKit {
  if (t.real || t.ficticio !== undefined) return t
  return { ...t, ficticio: true }
}

/* ---- Housekeeping da plataforma (achado 11/09/2026, ao reconferir
   `kitPlatform.ts` contra o Projeto Modelo atual): duas funções novas que o
   Projeto Modelo ganhou depois do porte original, `verificarVencimentoPrecadastro`
   e `avisoTrialSeNecessario` — e os parâmetros que elas aplicam
   (`precadastroMaxDias`, `trialWarning`) JÁ existiam aqui como `GlobalParams`
   reais, com valor de fábrica genuíno e até tela de edição própria
   (`ParametrosN0.tsx`, "Prazo do pré-cadastro"; `trialWarning` tem texto
   padrão pronto) — mas sem NENHUM código que os aplicasse. Ou seja: dois
   parâmetros editáveis pelo admin que não faziam nada, o tipo de lacuna mais
   enganosa que existe (pior que "faltando", porque parece que já funciona).
   Trazidas agora, por causa da decisão do Rafael de trazer tudo que for
   novo — mesma lógica do Projeto Modelo, adaptada à persistência em Dexie
   (ver `runPlatformHousekeeping`/`usePlatformN0` abaixo). Nenhuma função de
   log GLOBAL separada foi trazida (o Projeto Modelo grava tanto em
   `tenant.accessLog` quanto num `platform.auditLog` à parte) — o MorfoFinP
   já unifica os dois: `AbaAuditoria` em `DevApp.tsx` lê direto de
   `tenants[].accessLog`, então só gravar ali já basta pra aparecer em
   Auditoria, sem duplicar a entrada num log que este produto não tem. */
/* Pré-cadastro (ou reativação) vencido pelo prazo configurado
   (`precadastroMaxDias`) — encerra automaticamente e registra em
   `accessLog` (aparece em Auditoria). Só se aplica a `onboarding ===
   'pendente_liberacao'`: o Projeto Modelo também cobre `'reativando'`, mas
   o MorfoFinP não tem esse segundo estado de onboarding (achado nesta
   rodada — o único fluxo de reativação existente é o de PLANOS, sem relação
   com onboarding de tenant), por isso a checagem cobre só o estado que este
   produto realmente tem. */
export function verificarVencimentoPrecadastro(t: TenantKit, maxDias: number | undefined): Partial<TenantKit> | null {
  if (!maxDias || t.cancellation) return null
  if (t.onboarding !== 'pendente_liberacao') return null
  const desde = t.onboardingSince || t.createdAt
  if (!desde || (daysUntil(addDays(desde, maxDias)) ?? 0) >= 0) return null
  return {
    cancellation: { accessUntil: addDays(todayISO(), -1) },
    accessLog: [
      { id: uid(), ts: agoraISO(), action: `Encerrado automaticamente por vencimento de prazo do pré-cadastro (${maxDias} dia(s) sem completar o pagamento)` },
      ...(t.accessLog || []),
    ].slice(0, 50),
  }
}
/* Aviso automático no chat, vindo da Morfo, X dias antes do ambiente de
   teste (trial) expirar — respeita o parâmetro `trialWarning` (dias antes,
   texto, repetir todo dia ou avisar só uma vez). Mesma regra do Projeto
   Modelo (item 141 de lá, 2026-08-11): se o aviso NUNCA foi enviado, dispara
   assim que faltar `diasAntes` dias ou menos — mesmo que o salto de data da
   ferramenta de teste já tenha passado direto da janela sem nunca disparar
   — garantindo que o aviso sempre sai pelo menos uma vez; se já foi
   enviado, só repete dentro da janela original, no modo "repetir todo dia". */
export function avisoTrialSeNecessario(t: TenantKit, trialWarning: TrialWarningCfg | undefined): Partial<TenantKit> | null {
  if (t.plan !== 'trial' || !trialWarning || !t.trial) return null
  const diasAntes = trialWarning.diasAntes ?? 0
  if (diasAntes <= 0) return null
  const expiry = addDays(t.trial.startDate, t.trial.days)
  const diasRestantes = daysUntil(expiry) ?? 0
  const hoje = todayISO()
  if (t.trialAvisoUltimoEnvio) {
    if (!trialWarning.repetirTodoDia) return null
    if (t.trialAvisoUltimoEnvio === hoje) return null
    if (diasRestantes < 0 || diasRestantes > diasAntes) return null
  } else {
    if (diasRestantes > diasAntes) return null
  }
  return {
    trialAvisoUltimoEnvio: hoje,
    supportMessages: [...(t.supportMessages || []), { id: uid(), from: 'suporte', text: trialWarning.texto, imageUrl: null, ts: agoraISO(), automatica: true }],
  }
}
/* Roda as duas checagens acima pra todos os tenants da plataforma —
   idempotente (devolve `null` quando não há nada vencendo, então quem chama
   sabe que não precisa gravar nada). Usa `paramsGlobais` (não
   `p.defaultParams` direto) de propósito: mesma classe de bug já documentada
   no Projeto Modelo (item 215) — uma plataforma persistida ANTES de
   `trialWarning` existir teria esse campo `undefined`, e sem o merge de
   fábrica o aviso ficaria permanentemente desligado sem erro nenhum. */
/* Item 11 da lista de 12/09/2026: "ao virar o dia de pagamento, gerar o
   próximo pagamento como 'a vencer' e mostrar no Financeiro, dentro do cliente
   no N0 e na tela de assinatura do N1".

   Antes, a cobrança de um cliente pagante só existia se alguém lançasse à
   mão: `billing.installments` nascia vazio na conversão pra pagante e nunca
   crescia sozinho. Agora, a cada abertura do painel, todo cliente pagante
   ganha as parcelas que já deveriam existir até o mês corrente, sempre com
   `paid: false` (ou seja, "a vencer"/"vencido" conforme a data e a tolerância
   — quem decide o rótulo é `installmentDisplayStatus`, que já existe).

   É idempotente: a parcela é identificada pela DATA de vencimento, então rodar
   de novo não duplica nada. Também não cria nada retroativo além de 12 meses,
   pra um cliente antigo não nascer com uma lista gigante. */
export function gerarParcelasPendentes(t: TenantKit): Partial<TenantKit> | null {
  if (t.plan !== 'pagante' || !t.billing || !(t.billing.monthlyValue > 0)) return null
  const hoje = new Date(todayISO() + 'T00:00:00')
  const dia = Math.min(Math.max(1, t.billing.dueDay || 1), 28)
  const existentes = new Set((t.billing.installments || []).map((i) => i.dueDate))
  const inicio = t.createdAt ? new Date(t.createdAt + 'T00:00:00') : hoje
  const novas: Parcela[] = []
  for (let k = 12; k >= 0; k--) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() - k, dia)
    if (ref < inicio) continue
    if (ref > hoje) continue // só depois que o dia vira é que a parcela passa a existir
    const iso = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`
    if (existentes.has(iso)) continue
    existentes.add(iso)
    novas.push({ id: uid(), dueDate: iso, amount: t.billing.monthlyValue, paid: false, paidDate: null })
  }
  /* 12/09/2026 (build 052): além das vencidas, o cliente pagante SEMPRE tem
     uma cobrança em aberto — a próxima. O laço acima só cria parcela com
     vencimento já passado, então um cliente que virou pagante no dia 12 com
     vencimento no dia 20 ficava sem nada no Financeiro até o dia 20 chegar, e
     quem quitava tudo ficava com o extrato zerado. O Rafael pediu o oposto:
     "quando mudo pra cliente pagante já tem que nascer um pagamento a vencer".
     Só entra quando não sobrou nenhuma em aberto, então não empilha meses
     futuros — e continua idempotente, porque a chave é a data. */
  const apos = [...(t.billing.installments || []), ...novas]
  if (!apos.some(instCobravel)) {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth(), dia)
    if (ref <= hoje) ref.setMonth(ref.getMonth() + 1)
    const iso = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-${String(ref.getDate()).padStart(2, '0')}`
    if (!existentes.has(iso)) {
      existentes.add(iso)
      novas.push({ id: uid(), dueDate: iso, amount: t.billing.monthlyValue, paid: false, paidDate: null })
    }
  }
  if (novas.length === 0) return null
  const todas = [...(t.billing.installments || []), ...novas].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return {
    billing: { ...t.billing, installments: todas },
    accessLog: [...(t.accessLog ?? []), { id: uid(), ts: agoraISO(), action: `${novas.length} cobrança(s) gerada(s) automaticamente (a vencer)`, ator: 'admin' }],
  }
}

export function runPlatformHousekeeping(p: PlatformN0): { tenants: TenantKit[] } | null {
  const globais = paramsGlobais(p)
  let mudou = false
  const tenants = p.tenants.map((t) => {
    let novo = t
    const patchPrecadastro = verificarVencimentoPrecadastro(novo, globais.precadastroMaxDias)
    if (patchPrecadastro) { novo = { ...novo, ...patchPrecadastro }; mudou = true }
    const patchAviso = avisoTrialSeNecessario(novo, globais.trialWarning)
    if (patchAviso) { novo = { ...novo, ...patchAviso }; mudou = true }
    const patchCobranca = gerarParcelasPendentes(novo)
    if (patchCobranca) { novo = { ...novo, ...patchCobranca }; mudou = true }
    return novo
  })
  return mudou ? { tenants } : null
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
  /* Housekeeping (achado 11/09/2026 — ver bloco de comentário acima de
     `runPlatformHousekeeping`): reavalia vencimento de pré-cadastro e aviso
     de fim de teste toda vez que a plataforma é lida OU a data simulada
     muda. Depende de `config` inteiro (não de `platformSalva`) de propósito:
     `hojeSimuladoISO` mora no MESMO singleton `db.configuracoes` (ver
     `hojeSimulado.ts`) — se a checagem dependesse só de `platformSalva`,
     avançar a data pela ferramenta de teste sem tocar em nenhum tenant não
     dispararia o efeito, e a funcionalidade continuaria sem nenhuma forma
     de testar. Idempotente: `runPlatformHousekeeping` devolve `null` quando
     não há nada vencendo, então isto não entra em loop de gravação. */
  useEffect(() => {
    if (carregando || !platformSalva) return
    const hk = runPlatformHousekeeping(platformSalva)
    if (hk) void salvarPlatformN0({ ...platformSalva, tenants: hk.tenants })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregando, config])
  return comBrandingPadrao(platformSalva ?? gerarPlatformN0())
}
export async function salvarPlatformN0(p: PlatformN0) {
  await salvarConfiguracaoIcones({ platformN0: p })
}
export async function atualizarTenantN0(tenantId: string, patch: (t: TenantKit) => TenantKit) {
  const atual = (await db.configuracoes.get(1))?.platformN0 ?? gerarPlatformN0()
  await salvarPlatformN0({ ...atual, tenants: atual.tenants.map(t => (t.id === tenantId ? patch(t) : t)) })
}
/* ---- Ações de cobrança (12/09/2026, item 3) ----
   Duas metades do mesmo fluxo: o CLIENTE informa que pagou (não libera nada) e
   a MORFO confirma (é a confirmação que libera). Ficam aqui, junto do resto do
   modelo, pra N0 e N1 usarem a mesma escrita e o mesmo registro de auditoria —
   se cada lado tivesse a sua, um dia divergiriam. */

/** O cliente avisa que pagou uma parcela. Marca, registra e NÃO libera acesso. */
export async function informarPagamento(tenantId: string, parcelaId: string) {
  await atualizarTenantN0(tenantId, (t) => {
    if (!t.billing) return t
    return {
      ...t,
      billing: {
        ...t.billing,
        installments: (t.billing.installments ?? []).map((i) =>
          i.id === parcelaId ? { ...i, pagamentoInformadoEm: todayISO() } : i),
      },
      accessLog: [...(t.accessLog ?? []), { id: uid(), ts: agoraISO(), action: 'Cliente informou o pagamento — aguardando confirmação da Morfo', ator: 'tenant' }],
    }
  })
}

/** A Morfo confirma o pagamento. É ISTO que quita a parcela e libera o acesso. */
export async function confirmarPagamento(tenantId: string, parcelaId: string) {
  await atualizarTenantN0(tenantId, (t) => {
    if (!t.billing) return t
    return {
      ...t,
      billing: {
        ...t.billing,
        installments: (t.billing.installments ?? []).map((i) =>
          i.id === parcelaId ? { ...i, paid: true, paidDate: todayISO(), pagamentoInformadoEm: null } : i),
      },
      accessLog: [...(t.accessLog ?? []), { id: uid(), ts: agoraISO(), action: 'Pagamento confirmado pela Morfo — acesso liberado', ator: 'admin' }],
    }
  })
}

/* =====================================================================
   FERRAMENTA DE MVP — REMOVER ANTES DA PUBLICAÇÃO EM PRODUÇÃO
   ---------------------------------------------------------------------
   Pedido do Rafael em 12/09/2026: "N0, permitir Forçar pagamento em modo de
   MVP (anotar também essa função para ser retirada na publicação em
   produção)".

   Por que existe: sem servidor não há gateway nem baixa automática, e o
   caminho honesto de teste (cliente informa que pagou → Morfo confirma)
   precisa de duas pessoas em dois aparelhos. Isto quita todas as cobranças
   em aberto de um cliente de uma vez, para conferir num aparelho só o que
   acontece quando o acesso é liberado.

   Por que é perigoso em produção: registra pagamento que ninguém fez. O log de
   auditoria por isso NÃO mente — ele diz "forçado (ferramenta de MVP)", nunca
   "pagamento confirmado".

   Como remover quando houver backend (Backlog #035): apagar esta função e o
   bloco `FORCAR_PAGAMENTO_MVP` em `DevApp.tsx`. Nada mais depende dela.
   ===================================================================== */
export async function forcarPagamentoMVP(tenantId: string) {
  let quitadas = 0
  await atualizarTenantN0(tenantId, (t) => {
    if (!t.billing) return t
    const installments = (t.billing.installments ?? []).map((i) => {
      if (!instCobravel(i)) return i
      quitadas++
      return { ...i, paid: true, paidDate: todayISO(), pagamentoInformadoEm: null, method: 'mvp' }
    })
    if (quitadas === 0) return t
    return {
      ...t,
      billing: { ...t.billing, installments },
      accessLog: [...(t.accessLog ?? []), {
        id: uid(),
        ts: agoraISO(),
        action: `${quitadas} cobrança(s) marcada(s) como paga(s) à força (ferramenta de MVP, sem pagamento real)`,
        ator: 'admin',
        tipo: 'financeiro' as TipoAuditoria,
      }],
    }
  })
  return quitadas
}

/* Conveniência do lado N1: o app do produto é sempre o tenant `t0`. */
export const TENANT_N1_ID = 't0'
/* 12/09/2026 (bug real relatado pelo Rafael: "pegando usuário e senha dos
   clientes que já existem, não to conseguindo logar com eles, acusa login ou
   senha inválidos"): o Login só enxergava os usuários de `t0`, então a
   credencial de um cliente cadastrado no N0 nunca batia. Agora o Login
   procura em TODOS os ambientes e grava qual entrou (`loggedTenantIdN1`);
   este hook devolve esse ambiente — sem nada gravado, segue sendo `t0`.

   Limitação honesta, a mesma de sempre: o MOVIMENTO (lançamentos) vive no
   IndexedDB do aparelho, não dentro do tenant — entrar como outro cliente
   mostra o nome/plano dele, mas os dados continuam sendo os deste aparelho
   enquanto não existir backend (Backlog #028). */
export function useTenantN1(): TenantKit | undefined {
  const p = usePlatformN0()
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  const id = config?.loggedTenantIdN1 || TENANT_N1_ID
  return p.tenants.find(t => t.id === id) ?? p.tenants.find(t => t.id === TENANT_N1_ID)
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
/* Grava o padrão da plataforma subindo `versao` — é a subida de versão que
   faz cada N1 não-editado receber o padrão novo na abertura seguinte. */
export async function salvarPadraoCategoriasN0(dados: Omit<PadraoCategoriasN0, 'versao' | 'atualizadoEm'>) {
  const atual = await lerPlatformN0Persistida()
  const versao = (atual.padraoCategorias?.versao ?? 0) + 1
  await salvarPlatformN0({ ...atual, padraoCategorias: { ...dados, versao, atualizadoEm: agoraISO() } })
  return versao
}
export async function atualizarUrlsN0(patch: Partial<NonNullable<PlatformN0['urlsProduto']>>) {
  const atual = await lerPlatformN0Persistida()
  await salvarPlatformN0({ ...atual, urlsProduto: { ...(atual.urlsProduto || {}), ...patch } })
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
