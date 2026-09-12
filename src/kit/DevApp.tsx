/* Achado do diff literal desta rodada (item 10 do CONTRATO: valor a valor).
   Este arquivo tinha uma cópia local das cores do N0, e o roxo estava em
   `#8B7CF6` — o Kit usa `#6C3FFF` (L53-L55), e como token CSS
   (`var(--mloc-dev-*)`), não hex solto. Agora vem de `kitBase.tsx`, que é a
   transcrição do Kit: mesma cor, e passa a acompanhar o `shell.css`. */
import { useRef, useState, type ComponentType, type ReactNode, useEffect } from 'react'
import { aplicarMascaraValor, formatarMoeda, paraNumero } from '../formatoMoeda'
import { emTituloCaso } from '../tituloCaso'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  HomeIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline'
import { db } from '../db'
import { sairN0 } from './authN0'
import { useTodosPlanos, criarPlano, atualizarPlano, inativarPlano, reativarPlano, recursosAutomaticos, PLANO_PADRAO_KIT, type Plano } from './planos'
import SiteParametrosN0 from './SiteParametrosN0'
import PadraoCategoriasN0 from './PadraoCategoriasN0'
import { contarLancamentosFicticios, apagarTodosDadosDeTeste, temDadosDeTesteNaPlataforma } from './massaTeste'
import RodapeAbas from './RodapeAbas'
import IndicadoresDevScreen from './indicadoresKit'
import ChatConversa from './ChatConversa'
import {
  usePlatformN0,
  tenantCanceledExpired,
  tenantBlocked,
  installmentDisplayStatus,
  confirmarPagamento,
  fmtDate,
  hasUnreadMorfo,
  chatDiaLabel,
  filtrarTenantsPorDados,
  OPCOES_FILTRO_DADOS,
  FUNCOES_PERFIL_N0,
  nivelAcesso,
  perfisPadraoN0,
  perfilDoUsuario,
  contaAdminsAtivos,
  loginJaEmUsoGlobalmente,
  atualizarPerfisMorfo,
  atualizarDevUsersN0,
  atualizarTenantN0,
  lerPlatformN0Persistida,
  gerarParcelasPendentes,
  paramsGlobais,
  instCobravel,
  forcarPagamentoMVP,
  salvarPlatformN0,
  TENANT_N1_ID,
  daysUntil,
  addDays,
  todayISO,
  normalizarMenuPosModo,
  posicaoMenuDe,
  ITENS_NAV_N0,
  ITEM_PROTEGIDO_N0,
  type PosicaoMenu,
  type FiltroDados,
  type TenantKit,
  type DevUserN0,
  type UsuarioTenant,
  type Parcela,
  AUDIT_TIPOS,
  ATOR_INFO,
  ehTenantDeTeste,
} from './kitPlatform'
import { PerfisAcessoContent, ConfirmDeleteSheet } from './PerfisAcesso'
import { LayoutContext, TopIconMenu, UserHoverIcon, IconesDeTela, type ItemMenuTopo } from './TopoIcones'
import { ExportSheet, type ExportRow } from './ExportSheet'
import { usarBotaoVoltar } from '../voltarAndroid'
import { NOME_PRODUTO } from './siteKit'
import { RotateCcw, LogOut, AlertTriangle, Timer, ShieldAlert, UserPlus, Plus, FileBadge, Settings, MessageCircle, Pencil, Trash2, Check, Search, Building2, Wallet, Link2, Copy, CheckCircle2, Lock, Unlock, Filter, ChevronRight } from 'lucide-react'
import { alpha, uid, MultiFilterChips, dangerBtn, GREEN, AMBER, RED, SectionLabel, DEV_BG, DEV_CARD, DEV_ACCENT, Segmented, Sheet, Field, FieldError, inputStyle, primaryBtn, secondaryBtn, Toggle, PhoneComWhats, AddressFieldsBasic, normalizeAddress, validaCPF, validaTelefone, validaEmailEnvio, EmptyState, type Endereco } from './kitBase'
import { ESPACO_LINHA, InfoDot, IndicatorStrip, QuickAction, TotalRegistros, formatMoneyShort, SearchBox } from './PadraoUI'
import FolhaCompartilhar, { type DadosCompartilhamento } from './FolhaCompartilhar'
import { montarLinkPreCadastro } from './preCadastroLink'
// Telas novas de Parâmetros (10/09/2026, Decisão 55 — Parte B)
import {
  SubParametrosAssinatura, SubParametrosAmbiente, SubParametrosChat,
  SubParametrosAlertas, SubParametrosMarca, SubParametrosLayout, SubParametrosUrls,
} from './ParametrosN0'
import { SubTesteCliente, SubTesteMorfo, SubLimpezaCliente, SubLimpezaMorfo } from './TesteELimpezaN0'

// Painel N0 ("Morfo/dev") — camada de administração da plataforma, adaptada
// do Kit de Estrutura Mínima Morfo (`DevApp`, seção 2). Roteiro de
// Parametrização Morfo, Etapa 4 (04/09/2026) — esqueleto — expandido pro
// layout completo do padrão MorfoLoc no Bloco 2 do site institucional
// deslogado (08/09/2026, Decisão 22).
//
// REESCRITO em 08/09/2026 (G59 — "critério de aceite binário do encaixe",
// achado real MorfoFinP 08/09, ver Lição 16 do Project): duas mudanças
// estruturais em relação à versão anterior:
// 1. Acesso deixou de ser um botão dentro de Manutenção (N1) — agora só
//    existe por login próprio (`src/kit/LoginView.tsx` → "Acesso
//    administrador Morfo" → `src/kit/authN0.ts`). `AppRoot.tsx` renderiza
//    este componente quando `sessaoAtivaN0` está ativa, ponto — nenhuma
//    prop de "voltar pro ambiente" existe mais (isso era o atalho N0↔N1
//    proibido). O botão do topo agora é "Sair" (zera só `sessaoAtivaN0`).
// 2. "Entrar como este cliente" (impersonate) passou de PERMANENTEMENTE
//    desabilitado pra REAL pro único tenant de verdade (`t0`) — é o ÚNICO
//    caminho N0→N1 permitido por G59 (`onEntrarComoTenant`, ver
//    `AppRoot.tsx`). Continua desabilitado pros 3 tenants de exemplo
//    (fictícios — não existe "aplicativo" de verdade pra entrar).
// 3. `AbaParametros` deixou de ser só cartões informativos (opacity 0.7) —
//    os 3 itens aprovados pelo Rafael (categorização N0×N1 de 08/09) agora
//    são telas reais e funcionais: Gerenciar Planos (Dexie, `planos.ts`),
//    Marca do site institucional (`configuracaoIcones.ts`), Usuários Morfo
//    (Dexie, `db.usuariosN0`).
//
// POR QUE AINDA TEM DADO FICTÍCIO em Início/Tenants/Financeiro/Auditoria: o
// MorfoFinP não tem backend (Decisão 6, Backlog #028) e hoje só existe 1
// tenant de verdade (o próprio Rafael) — os outros 3 são os tenants de
// demonstração do PRÓPRIO Kit (ver `kitPlatform.ts`).
//
// CORRIGIDO em 10/09/2026 (Decisão 53): estas 4 abas usavam um array
// `TENANTS_FICTICIOS` local, com nomes INVENTADOS (Ana Beatriz Souza/Carlos
// Eduardo Lima/Fernanda Ramos) diferentes dos nomes que a aba Indicadores
// (nova nesta mesma rodada) usa — Empresa Modelo/Cliente Demo Ltda/Comércio
// Exemplo Ltda, os tenants LITERAIS do Kit (`kitPlatform.ts`,
// `gerarPlatformN0`). Isso fazia o mesmo painel N0 mostrar 2 conjuntos de
// dado fictício diferentes ao mesmo tempo (MRR de R$79,80 aqui contra
// R$498,00 em Indicadores, por exemplo) — inconsistência que o próprio
// Rafael certamente notaria ao comparar as abas. Todas as 4 abas abaixo
// passaram a consumir `usePlatformN0()`, a mesma fonte única de verdade que
// Indicadores/Chat usam — um painel N0 inteiro, um só conjunto de números.

const DEV_TXT2 = '#9B96A8'
const DEV_TXT3 = '#6b6674'

type AbaN0 = 'inicio' | 'tenants' | 'financeiro' | 'auditoria' | 'parametros' | 'indicadores'

// Ordem igual ao Kit (item 129/131 do Kit): Indicadores por último, depois
// de Parâmetros (10/09/2026, Decisão 53 — a aba nunca tinha existido aqui).
/* Ícone de aba dentro do "⋮" (10/09/2026, Decisão 58) — mesma ponte do N1
   (`iconeDeAbaNoMenu` em `App.tsx`): o menu chama `<icon size color/>`, o
   Heroicon quer width/height. Cache pra não criar componente novo por render. */
const cacheIconeMenuN0 = new Map<unknown, ComponentType<{ size?: number; color?: string }>>()
function iconeDeAbaNoMenuN0(Ico: typeof HomeIcon): ComponentType<{ size?: number; color?: string }> {
  const pronto = cacheIconeMenuN0.get(Ico)
  if (pronto) return pronto
  const Novo = ({ size = 16, color }: { size?: number; color?: string }) => <Ico width={size} height={size} color={color} />
  cacheIconeMenuN0.set(Ico, Novo)
  return Novo
}

const ABAS: { key: AbaN0; label: string; Icone: typeof HomeIcon }[] = [
  { key: 'inicio', label: 'Início', Icone: HomeIcon },
  { key: 'tenants', label: 'Clientes', Icone: BuildingOffice2Icon },
  { key: 'financeiro', label: 'Financeiro', Icone: BanknotesIcon },
  { key: 'auditoria', label: 'Auditoria', Icone: ClipboardDocumentListIcon },
  { key: 'parametros', label: 'Parâmetros', Icone: Cog6ToothIcon },
  { key: 'indicadores', label: 'Indicadores', Icone: ChartBarIcon },
]

// ---- Derivação de status/MRR a partir de `TenantKit` (ver nota acima) ----

type StatusTenant = 'ativo' | 'teste' | 'inadimplente' | 'bloqueado'

// Mesmo critério de "MRR ativo" que a aba Indicadores usa
// (`indicadoresKit.tsx`, `tenantMrrAtivo`) — pagante e não cancelado/expirado.
function tenantMrrAtivo(t: TenantKit): boolean {
  return t.plan === 'pagante' && !tenantCanceledExpired(t)
}

function tenantTemParcelaVencida(t: TenantKit): boolean {
  return (t.billing?.installments ?? []).some((i) => installmentDisplayStatus(i, t.billing?.toleranceDays) === 'vencido')
}

// Status exibido por tenant: bloqueio manual/cancelamento/trial vencido
// prevalecem sobre inadimplência (o Kit trata isso como "acesso suspenso",
// mais grave que "só tem parcela vencida").
function statusDoTenant(t: TenantKit): StatusTenant {
  if (tenantBlocked(t)) return 'bloqueado'
  if (t.plan === 'trial') return 'teste'
  if (tenantTemParcelaVencida(t)) return 'inadimplente'
  return 'ativo'
}

function mrrDoTenant(t: TenantKit): number {
  return tenantMrrAtivo(t) ? (t.billing?.monthlyValue ?? 0) : 0
}

function planoLabelDoTenant(t: TenantKit): string {
  if (t.plan === 'trial') return 'Período de teste'
  if (!t.billing) return t.real ? '— (sem cobrança/backend ainda)' : 'Pagante (sem cobrança cadastrada)'
  return `Pagante — R$ ${t.billing.monthlyValue.toFixed(2)}/mês`
}

const STATUS_ROTULO: Record<StatusTenant, string> = {
  ativo: 'Ativo',
  teste: 'Em teste',
  inadimplente: 'Inadimplente',
  bloqueado: 'Bloqueado',
}
const STATUS_COR: Record<StatusTenant, string> = {
  ativo: '#3DDC97',
  teste: '#F5C451',
  inadimplente: '#F5615C',
  bloqueado: '#8b8b8b',
}

function fmtBRL(v: number): string {
  if (v === 0) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---- Parcelas de cobrança: status/forma de pagamento (cluster Financeiro
// x Kit, 11/09/2026) — equivalentes locais de `STATUS_MAP`/`METHODS`/
// `methodLabel`/`instCobravel` do Kit (App.jsx). Ficam aqui, não em
// `kitPlatform.ts`, porque só telas deste arquivo (Financeiro/Auditoria)
// exibem parcela a parcela — o resto do app já lida só com o agregado
// (`mrrDoTenant`). Sem os campos de desconto/acréscimo do Kit
// (`baseAmount`/`adjDiscount`/`adjSurcharge`) porque a interface `Parcela`
// deste produto (`kitPlatform.ts`) não os tem — ver nota em
// `AlterarStatusParcelaSheet`.
const METODOS_PAGAMENTO: { v: string; label: string }[] = [
  { v: 'pix', label: 'Pix' },
  { v: 'boleto', label: 'Boleto' },
  { v: 'cartao_credito', label: 'Cartão crédito' },
  { v: 'cartao_debito', label: 'Cartão débito' },
]
function metodoLabel(m?: string | null): string {
  return METODOS_PAGAMENTO.find((x) => x.v === m)?.label ?? '—'
}
type StatusParcela = 'pago' | 'pendente' | 'vencido' | 'perda' | 'cancelada'
const PARCELA_ROTULO: Record<StatusParcela, string> = {
  pago: 'Pago', pendente: 'A vencer', vencido: 'Vencido', perda: 'Perda', cancelada: 'Cancelada',
}
const PARCELA_COR: Record<StatusParcela, string> = {
  pago: GREEN, pendente: AMBER, vencido: RED, perda: DEV_TXT3, cancelada: DEV_TXT3,
}
function ParcelaBadge({ status }: { status: StatusParcela }) {
  return (
    <span style={{ fontSize: 10.5, fontWeight: 800, color: PARCELA_COR[status], background: `${PARCELA_COR[status]}22`, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}>
      {PARCELA_ROTULO[status]}
    </span>
  )
}
// Kit `instCobravel` (App.jsx L112): só uma parcela em aberto de verdade
// (não paga, não perdida, não cancelada) pode ser cobrada.
function instCobravelLocal(i: Parcela): boolean {
  return !i.paid && !i.cancelada && !i.perda
}
// Link de WhatsApp com mensagem pré-preenchida — mesmo padrão de
// `whatsappLink` do Kit, sem depender de biblioteca externa. Prefixa DDI 55
// quando o telefone só tem DDD+número (10/11 dígitos); mantém como está se
// já vier com DDI (ligações internacionais, cadastro manual completo).
function linkWhatsApp(phone: string | undefined, texto: string): string {
  const digitos = (phone ?? '').replace(/\D/g, '')
  const numero = digitos ? (digitos.length <= 11 ? `55${digitos}` : digitos) : ''
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

// ---- Peças de UI compartilhadas desta tela -------------------------------

/* `acoes` = a linha de ícones da própria tela (Buscar · Chat · Exportar ·
   Incluir), exatamente onde `DevStandardTopIcons` (Kit L5667) os coloca: na
   linha do TÍTULO, não na linha das logos. O "⋮", o ícone de usuário e a tag
   ADMINISTRADOR ficam na barra de cima (shell), como no Kit. */
function TopoN0({ titulo, subtitulo, onVoltarSub, acoes }: { titulo: string; subtitulo?: string; onVoltarSub?: () => void; acoes?: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {onVoltarSub && (
        <button
          type="button"
          onClick={onVoltarSub}
          /* Item 17 da lista de 12/09/2026: "o botão voltar tem borda e fundo
             em algumas telas e em outras não — padronize com borda e fundo em
             todas as telas e popups". Este era o caso sem nenhum dos dois
             (texto puro). Agora é a mesma pílula com fundo e borda que o N1
             usa (`.botao-voltar-config`), na paleta escura do painel. */
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: 999,
            color: '#fff',
            fontSize: 12.5,
            fontWeight: 700,
            padding: '7px 14px 7px 11px',
            marginBottom: 10,
            cursor: 'pointer',
          }}
        >
          ‹ Voltar
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ fontSize: 17, margin: 0, color: '#fff', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emTituloCaso(titulo)}</h2>
        {acoes && <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>{acoes}</div>}
      </div>
      {subtitulo && <p style={{ fontSize: 12, color: DEV_TXT2, margin: '4px 0 0' }}>{subtitulo}</p>}
    </div>
  )
}

/* `KpiCard` (grade 2×2 de cards) foi removido nesta rodada: o Padrão de
   Interface Morfo (UI), seção 3, substitui essa grade pela faixa de
   indicadores de uma linha (`IndicatorStrip`), que é o que o Kit usa em Início
   e Financeiro do N0. Nenhum dado deixou de aparecer — os mesmos números estão
   na faixa, e o texto explicativo de cada um passou a ter lugar próprio na
   folha do ⓘ, que antes não existia. */

function Badge({ status }: { status: StatusTenant }) {
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 800,
        color: STATUS_COR[status],
        background: `${STATUS_COR[status]}22`,
        borderRadius: 999,
        padding: '3px 9px',
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_ROTULO[status]}
    </span>
  )
}

function AvisoDadoFicticio() {
  return (
    <p style={{ fontSize: 11.5, color: DEV_TXT3, lineHeight: 1.6, marginTop: 0, marginBottom: 16 }}>
      Clientes marcados <strong style={{ color: DEV_TXT2 }}>(exemplo)</strong> são dado fictício (os próprios
      clientes de demonstração do Kit) — só pra mostrar como esta tela funciona com vários. Nenhuma ação aqui muda
      dado real (sem backend ainda, Backlog #028).
    </p>
  )
}

// Filtro global "Dados Reais/Dados Teste/Ambos" (10/09/2026, Decisão 54,
// Parte B) — transcrição literal do Kit (`FiltroDadosBar`, L6399-L6408):
// fica fixa no nível do shell do N0 (acima do conteúdo de cada aba),
// persiste ao trocar de aba, vale pras 4 telas agregadas (Início, Tenants,
// Financeiro, Indicadores) — Auditoria fica de fora, igual ao Kit.
// Adaptação única: o "ⓘ" do Kit (`InfoDot`) virou um `title` nativo do
// navegador — mesmo texto, sem portar o componente de popover só pra isso.
/* 12/09/2026 — a barra só existe quando há dado de teste DE VERDADE, e agora
   com a saída junto (bug reportado pelo Rafael: "diz que tem dados de teste
   gerados, mas não tem, nem me dá opção de apagar"). Antes ela era fixa em
   toda aba, usando um critério diferente do da tela de limpeza — ver
   `ehTenantDeTeste` em `kitPlatform.ts`. */
function FiltroDadosBar({ filtroDados, setFiltroDados, onLimpar }: { filtroDados: FiltroDados; setFiltroDados: (v: FiltroDados) => void; onLimpar: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(245,166,35,0.14)',
        borderBottom: '1px solid rgba(245,166,35,0.27)',
        padding: '8px 14px',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Ver:</span>
      {OPCOES_FILTRO_DADOS.map((opt) => (
        <button
          key={opt.v}
          type="button"
          title={opt.info}
          onClick={() => setFiltroDados(opt.v)}
          style={{
            padding: '5px 10px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            fontWeight: 800,
            fontSize: 11,
            background: filtroDados === opt.v ? '#F5A623' : 'rgba(255,255,255,0.12)',
            color: filtroDados === opt.v ? '#3D2E00' : '#fff',
          }}
        >
          {opt.l}
        </button>
      ))}
      <button
        type="button"
        data-testid="n0-apagar-dados-teste"
        onClick={onLimpar}
        title="Apaga ambientes, usuários, planos e lançamentos de teste"
        style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.28)', background: 'transparent', color: '#fff', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}
      >
        Apagar dados de teste
      </button>
    </div>
  )
}

/* Campo e rótulo dos FORMULÁRIOS do N0 (Usuários Morfo, Meus Dados, Planos).
   12/09/2026, itens 20 e 24 do Rafael ("campos editáveis despadronizados",
   "campos fora do padrão"): eram fundo quase preto com borda roxa fininha e
   fonte 13.5 — diferentes de TODO o resto do painel, onde o campo editável é
   `rgba(255,255,255,0.05)` com borda clara (ver `LinhaParam`/`CampoTextoDev`
   em ParametrosN0.tsx, e os campos de horário do Chat). Agora é o mesmo
   desenho em todos: a borda mais clara é o que faz o campo parecer editável,
   que era a reclamação. Os 3 formulários usam estas duas constantes, então a
   padronização vale para os três de uma vez. */
const campoN0Style: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.05)',
  border: '1.5px solid rgba(255,255,255,0.18)',
  borderRadius: 10,
  padding: '11px 12px',
  color: '#fff',
  fontSize: 14,
  outline: 'none',
}
const labelN0Style: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  color: DEV_TXT2,
  margin: '12px 0 6px',
  fontWeight: 700,
}

// ---- Abas -----------------------------------------------------------------

/* ===================== Busca global (N0) =====================
   Auditoria do cluster Início/Financeiro/Auditoria x Kit (11/09/2026): o Kit
   mostra uma lupa no topo de quase toda tela do N0 (`DevStandardTopIcons`,
   Kit L5667) que abre `DevGlobalSearchScreen` (Kit L5613) — procura em
   empresas clientes (nome, responsável, telefone, cidade, login) e nas
   parcelas da assinatura (empresa, mês/vencimento). Não existia NENHUM jeito
   de buscar aqui — nem o ícone (nenhuma aba passava `onBuscar` pro
   `IconesDeTela`, que já suporta a prop), nem uma tela equivalente.

   Adaptação: como folha (`Sheet`), não como tela própria — este painel não
   tem uma pilha de navegação genérica tipo `push()` do Kit, é abas com
   estado local (mesmo padrão já usado por `ExportSheet` em toda aba). Sem
   busca por cidade (o cadastro de cliente deste produto, Decisão 67, não
   pede endereço da empresa — só o Kit, que atende PJ, tem isso). Reaberta a
   partir de Início e Financeiro, as 2 telas deste cluster onde o Kit também
   mostra a lupa (Auditoria já tem busca própria — ver `AbaAuditoria` — e o
   Kit nem mostra a lupa padrão lá, só o campo de busca da própria tela). */
function BuscaGlobalN0Sheet({ onClose, onAbrirTenant, onAbrirParcela }: {
  onClose: () => void
  onAbrirTenant: (id: string) => void
  onAbrirParcela: (tenantId: string) => void
}) {
  const platform = usePlatformN0()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const tenantsAchados = q
    ? platform.tenants
        .filter((t) =>
          (t.companyName || '').toLowerCase().includes(q) ||
          (t.ownerName || '').toLowerCase().includes(q) ||
          (t.phone || '').includes(query) ||
          (t.users ?? []).some((u) => (u.login || '').toLowerCase().includes(q)))
        .slice(0, 12)
    : []
  const parcelasAchadas = q
    ? platform.tenants
        .flatMap((t) => (t.billing?.installments ?? [])
          .filter((i) => (t.companyName || '').toLowerCase().includes(q) || fmtDate(i.dueDate).includes(q))
          .map((i) => ({ inst: i, tenant: t })))
        .slice(0, 12)
    : []
  const nada = !!q && tenantsAchados.length === 0 && parcelasAchadas.length === 0

  return (
    <Sheet dark title="Buscar em tudo" onClose={onClose}>
      <SearchBox dark value={query} onChange={setQuery} placeholder="Empresa, responsável, telefone, login..." />
      <div style={{ marginTop: 14 }}>
        {!q && <EmptyState dark icon={Search} title="Busca em tudo" hint="Digite o nome de uma empresa, do responsável, o telefone ou o login." />}
        {nada && <EmptyState dark icon={Search} title="Nada encontrado" hint="Tente outro termo." />}
        {tenantsAchados.length > 0 && (
          <>
            <SectionLabel dark>Empresas clientes</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {tenantsAchados.map((t) => (
                <button key={t.id} type="button" onClick={() => onAbrirTenant(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: DEV_CARD, border: 'none', borderRadius: 12, padding: '11px 12px', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${DEV_ACCENT}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Building2 size={16} color={DEV_ACCENT} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.companyName}</div>
                    <div style={{ fontSize: 11.5, color: DEV_TXT2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ownerName}{t.phone ? ` · ${t.phone}` : ''}</div>
                  </div>
                  <Badge status={statusDoTenant(t)} />
                </button>
              ))}
              <TotalRegistros dark n={tenantsAchados.length} label={tenantsAchados.length === 1 ? 'empresa' : 'empresas'} />
            </div>
          </>
        )}
        {parcelasAchadas.length > 0 && (
          <>
            <SectionLabel dark>Parcelas da assinatura</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {parcelasAchadas.map(({ inst, tenant: t }) => (
                <button key={inst.id} type="button" onClick={() => onAbrirParcela(t.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: DEV_CARD, border: 'none', borderRadius: 12, padding: '11px 12px', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: `${GREEN}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Wallet size={16} color={GREEN} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.companyName}</div>
                    <div style={{ fontSize: 11.5, color: DEV_TXT2 }}>{fmtDate(inst.dueDate)} · {fmtBRL(inst.amount)}</div>
                  </div>
                  <ParcelaBadge status={installmentDisplayStatus(inst, t.billing?.toleranceDays) as StatusParcela} />
                </button>
              ))}
              <TotalRegistros dark n={parcelasAchadas.length} label={parcelasAchadas.length === 1 ? 'parcela' : 'parcelas'} />
            </div>
          </>
        )}
      </div>
    </Sheet>
  )
}

/* ---- N0 Início — reconstruído nesta rodada a partir de `DevInicioScreen` do
   Kit (L5690-L5765). Item 18 do CONTRATO DE EXECUÇÃO: "atalhos do N0 Início" e
   "seção Situações que precisam de atenção", conferidos individualmente.

   O que existia antes: 4 KPIs numa grade 2×2 e nada mais — sem atalhos, sem a
   seção de atenção. A grade 2×2 é justamente o que o Padrão de Interface (seção
   3) manda trocar pela faixa de indicadores de uma linha. ---- */
function AbaInicio({ filtroDados, onIrPara, onAbrirSuporte }: { filtroDados: FiltroDados; onIrPara: (aba: AbaN0, opcoes?: { sub?: SubParametros; acaoTenants?: AcaoTenants }) => void; onAbrirSuporte: () => void }) {
  const platform = usePlatformN0()
  const tenants = filtrarTenantsPorDados(platform.tenants, filtroDados)
  const [exportOpen, setExportOpen] = useState(false)
  const [buscaAberta, setBuscaAberta] = useState(false) /* Correção de auditoria — cluster Início x Kit, ver BuscaGlobalN0Sheet */

  const bloqueados = tenants.filter((t) => tenantBlocked(t)).length
  const trials = tenants.filter((t) => t.plan === 'trial').length
  const pagantes = tenants.filter((t) => t.billing && t.plan === 'pagante')
  const mrr = pagantes.reduce((s, t) => s + mrrDoTenant(t), 0)

  /* Kit L5693-L5698: as 5 origens de "situação que precisa de atenção". */
  const allInst = pagantes.flatMap((t) => (t.billing?.installments ?? []).map((i) => ({ ...i, tenantId: t.id })))
  const atencaoPagamento = allInst
    .filter((i) => installmentDisplayStatus(i) !== 'pago' && (daysUntil(i.dueDate) ?? 999) <= 7)
    .sort((a, b) => (daysUntil(a.dueDate) ?? 0) - (daysUntil(b.dueDate) ?? 0))
  const trialsAcabando = tenants
    .filter((t) => t.plan === 'trial' && !tenantBlocked(t) && t.trial && (daysUntil(addDays(t.trial.startDate, t.trial.days)) ?? 999) <= 7)
  const pendLiberacao = tenants.filter((t) => t.onboarding === 'pendente_liberacao')
  const pendUsers = tenants.flatMap((t) => (t.users ?? []).filter((u) => u.status === 'pendente_aprovacao').map((u) => ({ ...u, tenant: t })))
  const encerrando = tenants.filter((t) => t.cancellation && !tenantCanceledExpired(t))
  const totalAtencao = atencaoPagamento.length + trialsAcabando.length + pendLiberacao.length + pendUsers.length + encerrando.length
  const temAlertas = totalAtencao > 0

  /* Contador de conversas de suporte não lidas — o mesmo selo "N Nova(s)" que
     o Kit põe no atalho de Suporte (L5741). */
  const suporteNaoLido = platform.tenants.filter((t) => hasUnreadMorfo(t)).length

  const linhasExport: ExportRow[] = tenants.map((t) => ({
    companyName: t.companyName,
    status: statusDoTenant(t),
    mrr: fmtBRL(mrrDoTenant(t)),
    plano: t.plan ?? '—',
    real: t.ficticio ? 'não (exemplo)' : 'sim',
  }))

  const alerta = (chave: string, Icone: typeof AlertTriangle, cor: string, titulo: string, texto: string) => (
    <div key={chave} onClick={() => onIrPara('tenants')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: alpha(cor, 9.4), borderRadius: 12, padding: '10px 12px', cursor: 'pointer' }}>
      <Icone size={16} color={cor} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</div>
        <div style={{ fontSize: 11.5, color: DEV_TXT2 }}>{texto}</div>
      </div>
    </div>
  )

  return (
    <div>
      <TopoN0
        titulo="Visão geral"
        subtitulo="Resumo da plataforma Morfo"
        acoes={<IconesDeTela dark onBuscar={() => setBuscaAberta(true)} onExportar={() => setExportOpen(true)} />}
      />
      {buscaAberta && <BuscaGlobalN0Sheet
        onClose={() => setBuscaAberta(false)}
        onAbrirTenant={() => { setBuscaAberta(false); onIrPara('tenants') }}
        onAbrirParcela={() => { setBuscaAberta(false); onIrPara('financeiro') }}
      />}
      {exportOpen && <ExportSheet dark title="Visão geral" filenameBase="morfofinp-n0-visao-geral"
        screenColumns={[
          { key: 'companyName', label: 'Ambiente' },
          { key: 'status', label: 'Situação' },
          { key: 'mrr', label: 'Mensalidade' },
        ]}
        screenRows={linhasExport}
        detailColumns={[
          { key: 'companyName', label: 'Ambiente' },
          { key: 'status', label: 'Situação' },
          { key: 'mrr', label: 'Mensalidade' },
          { key: 'plano', label: 'Plano' },
          { key: 'real', label: 'Dado real' },
        ]}
        detailRows={linhasExport}
        onClose={() => setExportOpen(false)} />}
      <AvisoDadoFicticio />

      {/* Kit L5705: card do MRR, primeiro bloco do container — sem espaço
          acima, o vão pro bloco seguinte é o ritmo único de 10px. */}
      <div onClick={() => onIrPara('financeiro')} style={{ background: DEV_CARD, borderRadius: 14, padding: 14, margin: `0 0 ${ESPACO_LINHA}px`, cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: DEV_TXT2, textTransform: 'uppercase', letterSpacing: 0.4 }}>Receita recorrente (MRR)</div>
          <InfoDot dark titulo="Receita recorrente (MRR)" info="Receita recorrente mensal: a soma das mensalidades de todos os clientes pagantes ativos. Toque no card pra abrir o Financeiro." />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: GREEN }}>{fmtBRL(mrr)}<span style={{ fontSize: 13 }}>/mês</span></span>
          <span style={{ fontSize: 12, color: DEV_TXT2 }}>{pagantes.length} pagante(s) ›</span>
        </div>
      </div>

      {/* Kit L5712 + Padrão UI seção 3: faixa de indicadores de UMA linha, no
          lugar da grade 2×2 de cards que existia aqui. */}
      <IndicatorStrip dark style={{ marginBottom: ESPACO_LINHA }} items={[
        { info: 'Empresas clientes cadastradas na plataforma.', label: 'Clientes', value: tenants.length, sub: 'empresas', color: '#fff', onClick: () => onIrPara('tenants') },
        { info: 'Ambientes em período de avaliação gratuita — o funil de conversão.', label: 'Em teste', value: trials, sub: 'ambientes', color: AMBER, onClick: () => onIrPara('tenants') },
        { info: 'Empresas com acesso bloqueado (pagamento vencido além da tolerância ou bloqueio manual).', label: 'Bloqueados', value: bloqueados, sub: 'acesso', color: bloqueados ? RED : GREEN, onClick: () => onIrPara('tenants') },
        { info: 'Assinaturas encerradas com acesso ainda ativo até a data combinada.', label: 'Em encerramento', value: encerrando.length, sub: 'ainda com acesso', color: encerrando.length ? AMBER : GREEN, onClick: () => onIrPara('tenants') },
      ]} />

      {/* Kit L5718-L5742: os atalhos. */}
      <SectionLabel dark>Atalhos</SectionLabel>
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        {/* 12/09/2026 (pedido do Rafael): cada atalho leva ao DESTINO, não à
            aba genérica — "Criar ambiente de teste" abre a folha de cadastro
            de cliente em Período de teste, e "Pré-cadastros" abre a MESMA
            folha já marcada como Pré-cadastro (item 2, 12/09/2026; antes este
            atalho abria a lista filtrada em quem aguarda liberação — essa
            lista continua alcançável pelo filtro da própria aba Tenants). */}
        {/* Build 056 (12/09/2026, pedido do Rafael): "inverter posição dos
            cards de gerar ambiente de testes com o de pré-cadastro" — o
            pré-cadastro vem primeiro, que é a porta de entrada mais comum
            (registrar interesse) e a que tem contador de pendência. */}
        <QuickAction dark icon={ShieldAlert} label={`Pré-cadastros${pendLiberacao.length ? ` (${pendLiberacao.length})` : ''}`} onClick={() => onIrPara('tenants', { acaoTenants: 'novoPreCadastro' })}
          info="Registra o interesse de um cliente com o mínimo: e-mail, telefone, login e senha. O acesso fica aguardando liberação." />
        <QuickAction dark icon={Plus} label="Criar ambiente de teste" onClick={() => onIrPara('tenants', { acaoTenants: 'novo' })}
          info="Cria uma empresa em período de avaliação, com login e senha definidos por você." />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <QuickAction dark icon={FileBadge} label="Gerenciar planos" onClick={() => onIrPara('parametros', { sub: 'planos' })}
          info="Cria e edita os planos de assinatura vendidos às empresas clientes: preço, limites e recursos." />
        <QuickAction dark icon={Settings} label="Parâmetros gerais" onClick={() => onIrPara('parametros')}
          info="Valores padrão aplicados aos ambientes: tolerância, vencimento, teste grátis, retenção e mais." />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {/* Correção de auditoria (cluster Parâmetros x Kit): este atalho
            entrava na aba Tenants inteira (achar o cliente certo era manual)
            — o Kit abre direto a caixa de entrada agregada de conversas
            (`DevChatGeralScreen`, L6370). Agora abre `CentralSuporteN0`. */}
        {/* Item 21 da lista de 12/09/2026: "o atalho de suporte não anima
            quando há mensagens não lidas e deveria". O selo com a contagem já
            existia, mas parado — agora o atalho treme (`mloc-shake`) e o selo
            pulsa (`mloc-badge-pulse`), as mesmas duas classes que o resto do
            app já usa pra mensagem não lida. */}
        <QuickAction dark icon={MessageCircle} label="Suporte" onClick={onAbrirSuporte}
          shake={suporteNaoLido > 0}
          info="Fale com as empresas clientes pelo chat de suporte."
          badge={suporteNaoLido > 0
            ? <span className="mloc-badge-pulse" style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: RED, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>{suporteNaoLido} Nova{suporteNaoLido > 1 ? 's' : ''}</span>
            : null} />
      </div>

      {/* Kit L5745-L5760: "Situações que precisam de atenção", com o
          totalizador nos DOIS extremos (padrão do sistema, seção 11). */}
      <SectionLabel dark>Situações que precisam de atenção</SectionLabel>
      {temAlertas && <TotalRegistros dark n={totalAtencao} label="situação(ões)" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!temAlertas && <div style={{ fontSize: 13.5, color: DEV_TXT3, padding: '6px 2px' }}>Nada pedindo atenção agora. 👍</div>}
        {atencaoPagamento.map((i) => {
          const t = tenants.find((x) => x.id === i.tenantId)
          const st = installmentDisplayStatus(i)
          const d = daysUntil(i.dueDate) ?? 0
          return alerta(`pag-${i.id}`, AlertTriangle, st === 'vencido' ? RED : AMBER, t?.companyName ?? '—',
            `${fmtBRL(i.amount)} · ${st === 'vencido' ? `mensalidade vencida há ${Math.abs(d)}d` : `mensalidade vence em ${d}d`}`)
        })}
        {trialsAcabando.map((t) => {
          const d = daysUntil(addDays(t.trial!.startDate, t.trial!.days)) ?? 0
          return alerta(`trial-${t.id}`, Timer, AMBER, t.companyName,
            d < 0 ? 'teste expirado' : d === 0 ? 'teste termina hoje' : `teste termina em ${d}d`)
        })}
        {pendLiberacao.map((t) => alerta(`lib-${t.id}`, ShieldAlert, AMBER, t.companyName, 'Pré-cadastro aguardando pagamento ou liberação'))}
        {pendUsers.map((u) => alerta(`user-${u.id}`, UserPlus, AMBER, `${u.name ?? u.login} · ${u.tenant.companyName}`, 'Usuário aguardando liberação'))}
        {encerrando.map((t) => alerta(`enc-${t.id}`, Timer, AMBER, t.companyName,
          `Encerrando · acesso até ${fmtDate(t.cancellation!.accessUntil)} (${Math.max(0, daysUntil(t.cancellation!.accessUntil) ?? 0)}d)`))}
        {temAlertas && <TotalRegistros dark n={totalAtencao} label="situação(ões)" />}
      </div>
    </div>
  )
}

/* ===================== Central de Suporte (N0) =====================
   Correção de auditoria (cluster Parâmetros x Kit, 11/09/2026): o Kit tem
   uma tela própria pra ver TODAS as conversas de chat de uma vez —
   `DevChatGeralScreen` (App.jsx L6370-L6406), acessada pelo atalho "Suporte"
   da Início, com o mesmo selo "N Nova(s)" de não-lidas. Aqui o atalho já
   existia com o contador certo (`hasUnreadMorfo`), mas levava pra dentro da
   aba Tenants inteira — sem caixa de entrada, achar a conversa certa era
   manual (abrir Tenants, achar a empresa, entrar na ficha, achar "Suporte").
   Essa tela fecha essa lacuna: lista só quem tem conversa, ordenada por
   não-lida primeiro e depois mensagem mais recente, com busca por empresa ou
   palavra — igual ao Kit — e abre a MESMA peça de conversa (`ChatConversa`,
   perspectiva="suporte") que `AbaTenants` já usa a partir da ficha do
   cliente (não duplica lógica de chat, só a lista que falta). */
function CentralSuporteN0({ onClose }: { onClose: () => void }) {
  const platform = usePlatformN0()
  const [busca, setBusca] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)

  const conversas = platform.tenants
    .filter((t) => (t.supportMessages || []).length > 0)
    .map((t) => {
      const msgs = t.supportMessages
      return { tenant: t, ultima: msgs[msgs.length - 1], naoLida: hasUnreadMorfo(t) }
    })
    .sort((a, b) => Number(b.naoLida) - Number(a.naoLida) || new Date(b.ultima.ts).getTime() - new Date(a.ultima.ts).getTime())

  const q = busca.trim().toLowerCase()
  const filtradas = !q
    ? conversas
    : conversas.filter((c) => c.tenant.companyName.toLowerCase().includes(q) || c.tenant.supportMessages.some((m) => (m.text || '').toLowerCase().includes(q)))
  const naoLidas = conversas.filter((c) => c.naoLida).length

  const selecionado = tenantId ? platform.tenants.find((t) => t.id === tenantId) : undefined
  if (selecionado) {
    return (
      <div>
        <TopoN0 titulo={`Suporte — ${selecionado.companyName}`} onVoltarSub={() => setTenantId(null)} />
        <ChatConversa tenant={selecionado} chatConfig={platform.defaultParams?.chat} perspectiva="suporte" />
      </div>
    )
  }

  return (
    <div>
      <TopoN0 titulo="Central de Suporte" subtitulo="Todas as conversas de chat com os clientes" onVoltarSub={onClose} />
      <div style={{ marginBottom: 10 }}>
        <SearchBox dark value={busca} onChange={setBusca} placeholder="Buscar por empresa ou palavra na conversa" />
      </div>
      {naoLidas > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: alpha(DEV_ACCENT, 12.5), border: `1px solid ${alpha(DEV_ACCENT, 33.3)}`, borderRadius: 12, padding: '9px 12px', marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: DEV_ACCENT, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: '#fff', fontWeight: 700 }}>{naoLidas} conversa(s) com mensagem não lida</span>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtradas.length === 0 && (
          <div style={{ fontSize: 13, color: DEV_TXT2, textAlign: 'center', padding: '30px 0' }}>
            {q ? `Nada encontrado com "${busca}".` : 'Nenhuma conversa ainda.'}
          </div>
        )}
        {filtradas.map(({ tenant: t, ultima, naoLida }) => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div
              onClick={() => setTenantId(t.id)}
              style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10, background: DEV_CARD, borderRadius: 12, padding: '11px 13px', cursor: 'pointer', border: naoLida ? `1.5px solid ${DEV_ACCENT}` : '1px solid transparent' }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: alpha(DEV_ACCENT, 13.3), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <BuildingOffice2Icon width={17} height={17} color={DEV_ACCENT} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: naoLida ? 800 : 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.companyName}</span>
                  <span style={{ fontSize: 10, color: DEV_TXT2, flexShrink: 0 }}>
                    {chatDiaLabel(ultima.ts) === 'Hoje' ? new Date(ultima.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : chatDiaLabel(ultima.ts)}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: naoLida ? '#C9C4D4' : DEV_TXT2, fontWeight: naoLida ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ultima.from === 'suporte' ? 'Você: ' : ''}{ultima.imageUrl ? '📷 Imagem' : ultima.text}
                </div>
                <span style={{ display: 'inline-block', marginTop: 4, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3, padding: '2px 7px', borderRadius: 999, color: naoLida ? '#fff' : DEV_TXT2, background: naoLida ? DEV_ACCENT : 'rgba(255,255,255,0.06)' }}>
                  {naoLida ? 'NÃO LIDA' : 'LIDA'}
                </span>
              </div>
            </div>
            {/* Kit L6393 (SwipeRow "Não lida"): sem gesto de arrastar aqui — vira
                botão explícito com o mesmo efeito (marcar como não lida de novo). */}
            {!naoLida && (
              <button
                type="button"
                title="Marcar como não lida"
                aria-label="Marcar como não lida"
                onClick={() => void atualizarTenantN0(t.id, (tt) => ({ ...tt, chatLastReadMorfo: null, chatMarcadaNaoLidaMorfo: true }))}
                style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <MessageCircle size={15} color={DEV_ACCENT} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ===================== Novo cliente (N0) =====================
   11/09/2026, Decisão 67 — pedido do Rafael: "n0 tem que conseguir cadastrar
   novo cliente e preencher dados dele e liberar acesso". Antes disto a aba
   Tenants era SÓ leitura: não havia botão de incluir em lugar nenhum (era o
   bug que ele relatou, "não tem botão pra incluir").

   Base: `NewTenantSheet` do Kit (L5197-L5234) — mesmos campos, mesma ordem,
   mesmas validações (telefone/e-mail/documento) e o mesmo botão desabilitado
   até tudo estar válido. ADAPTAÇÕES, todas por causa do que este produto é:
   - Documento: só CPF. O Kit oferece PF/PJ porque o cliente dele é empresa;
     o MorfoFinP é app de finanças PESSOAIS, de uso individual (Decisão 67).
   - "Nome da empresa" virou "Nome do cliente", e é ele que vira o nome do
     ambiente (`companyName`) — mesmo caminho que o autocadastro do site já
     usa desde a Decisão 67.
   - Plano: além do período de teste do Kit, dá pra já nascer num plano pago
     escolhido entre os cadastrados em Parâmetros › Gerenciar Planos.
   - "Liberar acesso agora": ligado = o cliente já entra com o login/senha
     definidos aqui; desligado = fica como pré-cadastro aguardando liberação
     (`onboarding: 'pendente_liberacao'` + usuário `pendente_aprovacao`, os
     mesmos estados que a aba Início já lista em "Situações que precisam de
     atenção") e é liberado depois pelo botão na ficha do cliente.
   - Massa de dados fictícios do Kit fica FORA: aqui o dado do ambiente mora
     no Dexie do aparelho (ver `massaTeste.ts`), não dentro do tenant — gerar
     massa por aqui escreveria em cima do movimento real de quem estiver
     usando o app. Massa continua onde já estava: Parâmetros › Gerar Teste. */
function sugerirLogin(email: string, telefone: string, nome: string): string {
  const base = (email.split('@')[0] || telefone.replace(/\D/g, '') || nome)
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
  return base.slice(0, 18) || `cliente${Math.floor(Math.random() * 900 + 100)}`
}
function sugerirSenha(): string {
  return String(Math.floor(Math.random() * 900000) + 100000)
}

function NovoClienteSheet({ diasTestePadrao, modoInicial, urls, onClose, notify, aoCompartilhar }: {
  diasTestePadrao: number
  /* Com qual opção de "Como este cliente entra" a folha abre (item 2,
     12/09/2026): o atalho "Pré-cadastros" da tela Início abre em
     'precadastro'; "Criar ambiente de teste" abre em 'trial'; o botão de
     incluir da lista abre no padrão. A folha é a MESMA nos três caminhos — ele
     pediu explicitamente que ela mostre a escolha no topo "independente de
     quando for aberta", pra dar pra mudar de ideia sem sair e voltar. */
  modoInicial?: 'precadastro' | 'trial' | 'pagante'
  urls: { apk?: string; site?: string; appWeb?: string }
  onClose: () => void
  notify: (m: string) => void
  /* Abre a folha de compartilhamento com a mensagem do cenário certo
     (12/09/2026, build 053) — quem monta o texto é `FolhaCompartilhar`. */
  aoCompartilhar: (dados: DadosCompartilhamento) => void
}) {
  const planos = useTodosPlanos().filter((p) => p.ativo)
  const [nome, setNome] = useState('')
  const [phone, setPhone] = useState('')
  /* 12/09/2026 (build 054), pedido do Rafael: a flag "Tem WhatsApp" nasce
     DESMARCADA. Marcada por padrão, ela afirmava uma coisa que ninguém
     conferiu — e é ela que decide se o convite pode sair por WhatsApp. */
  const [hasWhatsapp, setHasWhatsapp] = useState(false)
  const [email, setEmail] = useState('')
  const [doc, setDoc] = useState('')
  const [tipoPlano, setTipoPlano] = useState<'precadastro' | 'trial' | 'pagante'>(modoInicial ?? 'trial')
  const [planoId, setPlanoId] = useState<string>(planos[0]?.id ? String(planos[0].id) : '')
  const [dias, setDias] = useState(String(diasTestePadrao))
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [liberar, setLiberar] = useState(true)
  const [erro, setErro] = useState('')

  const ehPrecadastro = tipoPlano === 'precadastro'

  /* FICHA ENXUTA POR TIPO (12/09/2026, build 053). O Rafael, revendo a versão
     anterior: "eu pedi pra ser ficha enxuta e não pra só tirar a
     obrigatoriedade, tire os campos da tela conforme seleciono tipo de
     cadastro (nome pode voltar a ser obrigatório e em todos tipos de
     cadastro), se for Pré-Cadastro pedir somente telefone e e-mail e obrigar
     apenas um deles, isso apenas pra o N0, já pro usuário quando entrar deve
     preencher todo o resto, se for Ambiente de Teste, pedir ficha normal com
     os campos obrigatórios".

     Então, no pré-cadastro, CPF / plano / login / senha / "liberar agora" não
     ficam opcionais: eles SOMEM. O login e a senha nascem sugeridos por aqui
     (ver `sugerirLogin`/`sugerirSenha`) porque o ambiente precisa de um
     usuário pra existir — mas ninguém entra com eles enquanto o acesso não
     for liberado, e a Morfo pode trocá-los na ficha antes de liberar. */
  const phoneOk = ehPrecadastro
    ? (!phone.trim() || validaTelefone(phone))
    : (!!phone.trim() && validaTelefone(phone))
  const emailOk = ehPrecadastro ? (!email.trim() || validaEmailEnvio(email)) : validaEmailEnvio(email)
  /* "obrigar apenas um deles" — telefone OU e-mail, nunca os dois. */
  const contatoOk = ehPrecadastro ? (!!phone.trim() || !!email.trim()) : true
  const planoEscolhido = planos.find((p) => String(p.id) === planoId)
  const docOk = ehPrecadastro ? true : (!!doc.trim() && validaCPF(doc))
  /* "nome pode voltar a ser obrigatório e em todos tipos de cadastro". */
  const nomeOk = !!nome.trim()
  const acessoOk = ehPrecadastro ? true : (!!login.trim() && senha.trim().length >= 4)
  const podeSalvar = nomeOk && phoneOk && emailOk && contatoOk && docOk && acessoOk
    && (tipoPlano !== 'pagante' || !!planoEscolhido)

  async function salvar(compartilhar: boolean) {
    const platform = await lerPlatformN0Persistida()
    let loginN = login.trim().toLowerCase()
    let senhaFinal = senha
    if (ehPrecadastro) {
      /* Login sugerido: se o sugerido já existir, acrescenta um sufixo até
         achar um livre — nunca deixa dois acessos com o mesmo login (a mesma
         regra que `loginJaEmUsoGlobalmente` impõe no cadastro manual). */
      const base = sugerirLogin(email.trim(), phone.trim(), nome.trim())
      loginN = base
      let n = 1
      while (loginJaEmUsoGlobalmente(platform, loginN)) { loginN = `${base}${n}`; n++ }
      senhaFinal = sugerirSenha()
    } else if (loginJaEmUsoGlobalmente(platform, loginN)) {
      setErro('Esse login já está em uso (N0 ou N1).'); return
    }
    const hoje = new Date().toISOString().slice(0, 10)
    const mensalidade = tipoPlano === 'pagante' ? (planoEscolhido?.valorMensal ?? 0) : 0
    /* Pré-cadastro nasce SEM acesso liberado, por definição — é isso que o
       estado 'pendente_liberacao' significa na aba Início. */
    const liberarAgora = ehPrecadastro ? false : liberar
    /* Um pré-cadastro ainda não escolheu plano: entra como período de teste
       (o mesmo que o Kit faz), e a conversão pra pagante acontece na ficha
       dele, pelo botão que já existe. */
    const planoDoTenant: 'trial' | 'pagante' = tipoPlano === 'pagante' ? 'pagante' : 'trial'
    const nomeFinal = nome.trim()
    const idTenant = `t-${uid()}`
    const novo: TenantKit = {
      id: idTenant,
      companyName: nomeFinal,
      ownerName: nomeFinal,
      phone: phone.trim(),
      hasWhatsapp,
      email: email.trim(),
      doc: doc.trim() || undefined,
      createdAt: hoje,
      plan: planoDoTenant,
      planId: tipoPlano === 'pagante' && planoEscolhido ? String(planoEscolhido.id) : null,
      manualBlock: false,
      onboarding: liberarAgora ? 'completo' : 'pendente_liberacao',
      /* Achado 11/09/2026 (reconciliação `kitPlatform.ts`): grava desde
         quando este pré-cadastro está pendente, pro housekeeping automático
         (`verificarVencimentoPrecadastro`) saber quando o prazo do parâmetro
         "Prazo do pré-cadastro" (Parâmetros N0) vence e encerrar sozinho. */
      onboardingSince: liberarAgora ? undefined : hoje,
      trial: planoDoTenant === 'trial' ? { days: Number(dias) || diasTestePadrao, startDate: hoje } : null,
      billing: tipoPlano === 'pagante' && mensalidade > 0
        ? { monthlyValue: mensalidade, dueDay: platform.defaultParams?.dueDay ?? 5, toleranceDays: platform.defaultParams?.toleranceDays ?? 5, installments: [] }
        : null,
      supportAuthorized: false,
      supportMessages: [],
      chatLastReadTenant: null,
      chatLastReadMorfo: null,
      /* 1 usuário por ambiente (Decisão 67): o acesso do cliente é este, e é
         o único. `demo` fica de fora de propósito — é acesso de verdade. */
      users: [{
        id: `u-${uid()}`,
        name: nomeFinal, login: loginN, senha: senhaFinal, email: email.trim(), phone: phone.trim(),
        status: liberarAgora ? 'ativo' : 'pendente_aprovacao', perfilId: 'admin', createdAt: hoje,
      }],
      userLimit: 1,
      // `ator: 'admin'` (achado no diff desta rodada, 11/09/2026): marca a
      // entrada como ação da Morfo, não do cliente — é o que faz o bloco
      // "Ações do suporte no meu ambiente" (SuporteChat.tsx) listar isso.
      accessLog: [{ id: uid(), ts: new Date().toISOString().slice(0, 19), action: ehPrecadastro ? 'Pré-cadastro criado pela Morfo, aguardando liberação' : liberarAgora ? 'Cliente cadastrado pela Morfo, com acesso liberado' : 'Cliente cadastrado pela Morfo, aguardando liberação', ator: 'admin' }],
      real: true,
    }
    await salvarPlatformN0({ ...platform, tenants: [...platform.tenants, novo] })
    if (compartilhar) {
      /* Dois cenários bem diferentes, é isso que o Rafael descreveu:
         pré-cadastro manda o LINK pra completar o cadastro; ambiente de teste
         "já pula a etapa de pré-cadastro e envia mensagem e-mail ou whatsapp
         já com url pra download liberando acesso". */
      aoCompartilhar(ehPrecadastro
        ? {
            cenario: 'convite',
            nomeProduto: NOME_PRODUTO,
            nomeCliente: nomeFinal,
            telefone: phone.trim(),
            email: email.trim(),
            linkPreCadastro: montarLinkPreCadastro(urls.appWeb ?? '', {
              tenantId: idTenant, nome: nomeFinal, telefone: phone.trim(), email: email.trim(), login: loginN,
            }),
            linkSite: urls.site,
          }
        : {
            cenario: 'testeDireto',
            nomeProduto: NOME_PRODUTO,
            nomeCliente: nomeFinal,
            telefone: phone.trim(),
            email: email.trim(),
            login: loginN,
            senha: senhaFinal,
            contexto: planoDoTenant === 'trial'
              ? `Você tem ${Number(dias) || diasTestePadrao} dias de teste a partir de hoje.`
              : `Plano contratado: ${planoEscolhido?.nome ?? ''}.`,
            linkApp: urls.apk,
            linkSite: urls.site,
          })
    } else {
      notify(ehPrecadastro ? 'Pré-cadastro criado' : 'Cliente cadastrado')
    }
    onClose()
  }

  return <Sheet dark title={ehPrecadastro ? 'Novo pré-cadastro' : 'Novo cliente'} onClose={onClose}>
    {/* Item 2 (12/09/2026): a escolha de COMO o cliente entra aparece logo no
        topo, "independente de quando for aberta" — inclusive quando a folha
        veio de um atalho que já escolheu por ela. Assim dá pra corrigir a
        escolha sem fechar e reabrir por outro caminho. */}
    <Field dark label="Como este cliente entra">
      <Segmented value={tipoPlano} onChange={setTipoPlano} options={[
        { value: 'precadastro' as const, label: 'Pré-cadastro' },
        { value: 'trial' as const, label: 'Período de teste' },
        { value: 'pagante' as const, label: 'Plano pago' },
      ]} />
    </Field>
    {ehPrecadastro && (
      <p style={{ fontSize: 12, color: '#C9C4D4', margin: '-6px 0 14px', lineHeight: 1.5 }}>
        Aqui só o essencial: nome e uma forma de falar com a pessoa (telefone
        <strong style={{ color: '#fff' }}> ou </strong>e-mail). O resto do cadastro quem preenche é ela, pelo link
        que você manda em seguida. O acesso fica <strong style={{ color: '#fff' }}>aguardando liberação</strong>.
      </p>
    )}
    <Field dark label="Nome do cliente"><input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Silva" /></Field>
    <FieldError show={!nomeOk} text="Informe o nome do cliente (obrigatório)" />
    <PhoneComWhats phone={phone} setPhone={setPhone} hasWhatsapp={hasWhatsapp} setHasWhatsapp={setHasWhatsapp}
      label={ehPrecadastro ? 'Telefone (WhatsApp)' : 'Telefone'} />
    <FieldError show={!phoneOk} text={phone.trim() ? 'Telefone inválido (use DDD + número)' : 'Informe o telefone (obrigatório)'} />
    <Field dark label="E-mail"><input style={inputStyle} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" /></Field>
    <FieldError show={!emailOk} text={email.trim() ? 'E-mail inválido' : 'Informe o e-mail (obrigatório)'} />
    <FieldError show={!contatoOk} text="Preencha pelo menos o telefone ou o e-mail" />
    {!ehPrecadastro && <>
      <Field dark label="CPF"><input style={inputStyle} inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00" /></Field>
      <FieldError show={!docOk} text={doc.trim() ? 'CPF inválido' : 'Informe o CPF (obrigatório)'} />
    </>}

    {!ehPrecadastro && <SectionLabel dark>Plano</SectionLabel>}
    {tipoPlano === 'trial'
      ? <Field dark label="Dias de teste"><input style={inputStyle} type="number" value={dias} onChange={(e) => setDias(e.target.value)} /></Field>
      : tipoPlano === 'pagante'
        ? (planos.length === 0
            ? <p style={{ fontSize: 12, color: AMBER, margin: '0 0 14px', lineHeight: 1.5 }}>Nenhum plano ativo cadastrado. Cadastre um em Parâmetros › Gerenciar Planos, ou cadastre este cliente em período de teste.</p>
            : <Field dark label="Plano contratado"><select style={inputStyle} value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
                {planos.map((p) => <option key={p.id} value={String(p.id)}>{p.nome} — {p.gratuito ? 'gratuito' : fmtBRL(p.valorMensal)}</option>)}
              </select></Field>)
        : null}

    {!ehPrecadastro && <>
      <SectionLabel dark>Acesso do cliente</SectionLabel>
      <Field dark label="Login"><input style={inputStyle} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="ex: mariasilva" autoCapitalize="none" /></Field>
      <FieldError show={!login.trim()} text="Informe o login (obrigatório)" />
      <Field dark label="Senha inicial"><input style={inputStyle} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mín. 4 caracteres" /></Field>
      <FieldError show={senha.trim().length < 4} text="A senha precisa ter pelo menos 4 caracteres" />
      <div style={{ marginBottom: 14 }} data-testid="n0-liberar-agora">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Toggle value={liberar} onChange={setLiberar} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Liberar acesso agora</span>
        </div>
        <span style={{ fontSize: 12.5, color: '#C9C4D4', display: 'block', marginTop: 6, lineHeight: 1.5 }}>
          {liberar
            ? 'Acesso liberado: o cliente já entra com o login e a senha acima.'
            : 'Sem liberar agora: fica aguardando liberação — você libera depois na ficha dele.'}
        </span>
      </div>
    </>}
    {erro && <p style={{ fontSize: 12.5, color: RED, fontWeight: 700, margin: '0 0 10px' }}>{erro}</p>}
    <button type="button" disabled={!podeSalvar} data-testid="n0-salvar-compartilhar" onClick={() => void salvar(true)}
      style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT, opacity: podeSalvar ? 1 : 0.5, cursor: podeSalvar ? 'pointer' : 'not-allowed' }}>
      {ehPrecadastro ? 'Salvar e compartilhar link' : 'Salvar e compartilhar acesso'}
    </button>
    <button type="button" disabled={!podeSalvar} data-testid="n0-salvar" onClick={() => void salvar(false)}
      style={{ ...secondaryBtn, width: '100%', marginTop: 8, opacity: podeSalvar ? 1 : 0.5, cursor: podeSalvar ? 'pointer' : 'not-allowed' }}>
      Só salvar
    </button>
    {!podeSalvar && <p data-testid="n0-faltando" style={{ fontSize: 11.5, color: RED, fontWeight: 700, margin: '8px 0 0', lineHeight: 1.5 }}>
      Faltando: {[!nomeOk && 'nome', !contatoOk && 'telefone ou e-mail', !phoneOk && 'telefone válido', !emailOk && 'e-mail válido', !docOk && 'CPF válido', !ehPrecadastro && !login.trim() && 'login', !ehPrecadastro && senha.trim().length < 4 && 'senha (mín. 4)', tipoPlano === 'pagante' && !planoEscolhido && 'plano'].filter(Boolean).join(' · ')}.
    </p>}
  </Sheet>
}

/* ===================== Editar cliente (N0) =====================
   Auditoria do cluster Tenants x Kit (11/09/2026): o Kit tem um ícone de
   lápis no topo da ficha do tenant (`DevTenantDetailScreen`, Kit L6191) que
   abre `EditTenantSheet` (Kit L6347) pra editar os dados cadastrais da
   empresa a qualquer momento, depois do cadastro. Aqui não existia NENHUM
   jeito de corrigir nome/telefone/e-mail/CPF de um cliente já cadastrado —
   só `NovoClienteSheet`, e só pro cadastro inicial. Mesmos campos do Kit,
   adaptados ao modelo PF deste produto (Decisão 67: sem razão social/CNPJ,
   que no Kit só existem porque o cliente dele é PJ). */
function EditarClienteSheet({ tenant, onClose }: { tenant: TenantKit; onClose: () => void }) {
  const [nome, setNome] = useState(tenant.companyName)
  const [phone, setPhone] = useState(tenant.phone ?? '')
  const [hasWhatsapp, setHasWhatsapp] = useState(tenant.hasWhatsapp !== false)
  const [email, setEmail] = useState(tenant.email ?? '')
  const [doc, setDoc] = useState(tenant.doc ?? '')

  const phoneOk = validaTelefone(phone)
  const emailOk = validaEmailEnvio(email)
  const docOk = !doc.trim() || validaCPF(doc)
  const podeSalvar = !!nome.trim() && phoneOk && emailOk && docOk

  async function salvar() {
    await atualizarTenantN0(tenant.id, (x) => ({
      ...x,
      companyName: nome.trim(),
      ownerName: nome.trim(),
      phone: phone.trim(),
      hasWhatsapp,
      email: email.trim(),
      doc: doc.trim() || undefined,
      accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: 'Dados do cliente editados pela Morfo', ator: 'admin' }],
    }))
    onClose()
  }

  return (
    <Sheet dark title="Editar dados do cliente" onClose={onClose}>
      <Field dark label="Nome do cliente"><input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <PhoneComWhats phone={phone} setPhone={setPhone} hasWhatsapp={hasWhatsapp} setHasWhatsapp={setHasWhatsapp} />
      <FieldError show={!phoneOk} text={phone.trim() ? 'Telefone inválido (use DDD + número)' : 'Informe o telefone (obrigatório)'} />
      <Field dark label="E-mail"><input style={inputStyle} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <FieldError show={!emailOk} text={email.trim() ? 'E-mail inválido' : 'Informe o e-mail (obrigatório)'} />
      <Field dark label="CPF (opcional)"><input style={inputStyle} inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00" /></Field>
      <FieldError show={doc.trim() && !docOk} text="CPF inválido" />
      <button type="button" disabled={!podeSalvar} onClick={() => void salvar()}
        style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT, opacity: podeSalvar ? 1 : 0.5, cursor: podeSalvar ? 'pointer' : 'not-allowed' }}>
        <Check size={16} /> Salvar alterações
      </button>
    </Sheet>
  )
}

/* ===================== Editar acesso (login/senha) do cliente (N0) =====================
   Achado 11/09/2026, revisão pedida pelo Rafael: a ficha do cliente só
   mostrava o login do usuário (`t.users`), sem NENHUM jeito de editar
   login/senha pelo N0 — precisava apagar o cliente inteiro e recadastrar só
   pra trocar uma senha esquecida. A rodada de auditoria anterior tinha
   corretamente decidido NÃO portar "adicionar 2º usuário/limite de
   usuários" do Kit (Decisão 67: 1 usuário por ambiente) — mas confundiu
   isso com "não precisa editar o único que existe", que é uma coisa
   diferente e nunca foi decidida assim. Corrigido aqui: edição do usuário
   único do cliente (nome/login/senha), mesma validação de login duplicado
   já usada em EditarClienteSheet/FormularioDevUser
   (`loginJaEmUsoGlobalmente`). */
function EditarAcessoClienteSheet({ tenant, usuario, devUsers, tenants, onClose }: {
  tenant: TenantKit; usuario: UsuarioTenant; devUsers: DevUserN0[]; tenants: TenantKit[]; onClose: () => void
}) {
  const [nome, setNome] = useState(usuario.name)
  const [login, setLogin] = useState(usuario.login)
  const [senha, setSenha] = useState(usuario.senha)
  const [erro, setErro] = useState('')

  async function salvar() {
    const loginN = login.trim().toLowerCase()
    if (!nome.trim() || !loginN || !senha.trim()) { setErro('Preencha nome, login e senha.'); return }
    if (loginJaEmUsoGlobalmente({ devUsers, tenants }, loginN, { tenantId: tenant.id, userId: usuario.id })) {
      setErro('Esse login já está em uso (N0 ou N1).'); return
    }
    await atualizarTenantN0(tenant.id, (x) => ({
      ...x,
      users: (x.users ?? []).map((u) => (u.id === usuario.id ? { ...u, name: nome.trim(), login: loginN, senha } : u)),
      accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: 'Login/senha do cliente editados pela Morfo', ator: 'admin' }],
    }))
    onClose()
  }

  return (
    <Sheet dark title="Editar acesso do cliente" onClose={onClose}>
      <Field dark label="Nome do usuário"><input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <Field dark label="Usuário (login)"><input style={inputStyle} value={login} onChange={(e) => setLogin(e.target.value)} /></Field>
      <Field dark label="Senha"><input style={inputStyle} value={senha} onChange={(e) => setSenha(e.target.value)} /></Field>
      <FieldError show={!!erro} text={erro} />
      <button type="button" disabled={!nome.trim() || !login.trim() || !senha.trim()} onClick={() => void salvar()}
        style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT, opacity: (nome.trim() && login.trim() && senha.trim()) ? 1 : 0.5, cursor: (nome.trim() && login.trim() && senha.trim()) ? 'pointer' : 'not-allowed' }}>
        <Check size={16} /> Salvar alterações
      </button>
    </Sheet>
  )
}

/* ===================== Excluir cliente (N0) =====================
   Mesma auditoria: o Kit sempre oferece excluir uma empresa, com
   confirmação e bloqueio se ela tiver assinatura paga ativa (Kit L5791-95
   `askDelete`, L5871 `ConfirmDeleteSheet`, L3480 `BlockedDeleteSheet`). Aqui
   não existia NENHUM jeito de remover um cliente cadastrado por engano —
   nem os de exemplo. Mesma regra do Kit (bloqueia pagante) + uma trava a
   mais que o Kit não precisa: nunca deixa excluir `t0`, porque não é um
   tenant substituível — é o ambiente deste aparelho, onde mora o app de
   verdade do Rafael. */
function ExcluirClienteSheet({ tenant, ehAppDesteAparelho, onClose, onExcluido }: {
  tenant: TenantKit; ehAppDesteAparelho: boolean; onClose: () => void; onExcluido: () => void
}) {
  const [entendi, setEntendi] = useState(false)

  if (ehAppDesteAparelho) {
    return (
      <Sheet dark title="Não é possível excluir" onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: RED, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
          <ShieldAlert size={17} /> Ambiente deste aparelho
        </div>
        <p style={{ fontSize: 13, color: '#C9C4D4', marginTop: 0, lineHeight: 1.5 }}>
          {tenant.companyName} é o ambiente deste aparelho — onde está o aplicativo de verdade. Não é um tenant de
          exemplo, não pode ser excluído por aqui.
        </p>
        <button type="button" onClick={onClose} style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT }}>Entendi</button>
      </Sheet>
    )
  }

  if (tenant.plan === 'pagante') {
    return (
      <Sheet dark title="Não é possível excluir" onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: RED, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
          <ShieldAlert size={17} /> Existem vínculos ativos
        </div>
        <p style={{ fontSize: 13, color: '#C9C4D4', marginTop: 0 }}>Encerre ou resolva os itens abaixo antes de excluir:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: DEV_CARD, borderRadius: 10, padding: '10px 12px' }}>
            <AlertTriangle size={15} color={RED} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>Assinatura ativa ({fmtBRL(tenant.billing?.monthlyValue ?? 0)}/mês)</span>
          </div>
        </div>
        <button type="button" onClick={onClose} style={{ ...primaryBtn, width: '100%', marginTop: 6, background: DEV_ACCENT }}>Entendi</button>
      </Sheet>
    )
  }

  async function confirmar() {
    const platform = await lerPlatformN0Persistida()
    await salvarPlatformN0({ ...platform, tenants: platform.tenants.filter((x) => x.id !== tenant.id) })
    onExcluido()
  }

  return (
    <Sheet dark title="Excluir cliente" onClose={onClose}>
      <p style={{ fontSize: 13.5, color: '#C9C4D4', lineHeight: 1.5, marginTop: 0 }}>
        Tem certeza que quer excluir {tenant.companyName}? Essa ação não pode ser desfeita.
      </p>
      <button type="button" onClick={() => setEntendi((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${entendi ? RED : '#9B96A8'}`, background: entendi ? RED : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {entendi && <Check size={13} color="#fff" />}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', textAlign: 'left' }}>Entendo que essa ação não pode ser desfeita</span>
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onClose} style={{ ...primaryBtn, flex: 1, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>Cancelar</button>
        <button type="button" disabled={!entendi} onClick={() => void confirmar()} style={{ ...primaryBtn, flex: 1, background: RED, opacity: entendi ? 1 : 0.5, cursor: entendi ? 'pointer' : 'not-allowed' }}>
          <Trash2 size={16} /> Excluir
        </button>
      </div>
    </Sheet>
  )
}

/* ===================== Bloquear/Desbloquear cliente (N0) =====================
   Lacuna real (11/09/2026, investigação encomendada): `manualBlock` já existe
   no tipo `TenantKit` e já é combinado por `tenantBlocked()` (`kitPlatform.ts`)
   com pendência de pagamento/trial vencido pra decidir o status "bloqueado" do
   badge acima — mas nenhuma tela deste produto setava a flag pra um cliente
   REAL, só a massa de teste (`massaTeste.ts`) já nascia com alguns tenants
   fictícios em `manualBlock: true`. Botão + confirmação adaptados do Kit
   (`DevTenantDetailScreen`): confirmação só ao BLOQUEAR (ação que tira o
   acesso de alguém) — desbloquear é imediato. Não existe um `ConfirmDeleteSheet`
   genérico neste produto (`ExcluirClienteSheet` acima monta a própria
   confirmação inline) — esta folha segue o mesmo padrão local: `Sheet` do
   `kitBase.tsx` + Cancelar/Confirmar. */
function ConfirmarBloqueioSheet({ tenant, onClose, onConfirm }: { tenant: TenantKit; onClose: () => void; onConfirm: () => void }) {
  return (
    <Sheet dark title="Bloquear empresa" onClose={onClose}>
      <p style={{ fontSize: 13.5, color: '#C9C4D4', lineHeight: 1.5, marginTop: 0 }}>
        Bloquear {tenant.companyName}? O ambiente fica inacessível pros usuários da empresa até ser desbloqueado
        manualmente — cadastro, histórico e dados continuam intactos.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onClose} style={{ ...primaryBtn, flex: 1, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>Cancelar</button>
        <button type="button" onClick={onConfirm} style={{ ...primaryBtn, flex: 1, background: RED }}>
          <Lock size={16} /> Bloquear
        </button>
      </div>
    </Sheet>
  )
}


/* ===== Virar pagante / estender teste (12/09/2026) =========================
   Pedido do Rafael: "N0, cliente não pagante não tem botão pra torná-lo
   pagante, nem pra escolher o plano, nem pra dar novo prazo — isso tem que
   ser um fluxo completo com permissão pra eu mudar; exemplo: 'Cliente Demo
   Ltda' está travado, não tenho o que fazer pra mudar ele pra pagante".

   As duas ações mexem no MESMO dado que a ficha já mostra (`plan`, `trial`,
   `billing`) e deixam registro no histórico do cliente (`accessLog`), como
   toda ação da Morfo dentro do ambiente de um cliente. */
/* Extrato de cobranças na FICHA do cliente (12/09/2026, build 052).

   Pedido do Rafael: "na tela do cliente tem que mostrar o extrato de
   pagamentos (últimos, respeitando a quantidade limite pra mostrar da config)
   e com função de exibir todos e recolher".

   Existia extrato, mas só dentro do Financeiro — para conferir a cobrança de
   um cliente era preciso sair da ficha dele, trocar de aba e achá-lo de novo.
   Aqui é a versão de leitura: as parcelas mais recentes primeiro, o corte pela
   configuração da plataforma (`paymentCardsVisibleCount`, o mesmo parâmetro do
   Kit que diz quantos cartões de pagamento aparecem) e a confirmação do
   pagamento que o cliente informou — que é a única ação daqui que destrava o
   acesso dele. Cobrar, alterar status e dar baixa manual continuam no
   Financeiro, que é onde essa operação vive. */
function ExtratoCobrancasCliente({ tenant }: { tenant: TenantKit }) {
  const platform = usePlatformN0()
  const limite = Math.max(1, paramsGlobais(platform).paymentCardsVisibleCount)
  const [verTodas, setVerTodas] = useState(false)
  const [confirmarForcar, setConfirmarForcar] = useState(false)
  const todas = (tenant.billing?.installments ?? []).slice().sort((a, b) => b.dueDate.localeCompare(a.dueDate))
  if (tenant.plan !== 'pagante' && todas.length === 0) return null
  const visiveis = verTodas ? todas : todas.slice(0, limite)
  const emAberto = todas.filter(instCobravel).reduce((acc, i) => acc + i.amount, 0)
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: DEV_TXT2, fontWeight: 700 }}>Extrato de pagamentos</span>
        <span style={{ fontSize: 11.5, color: emAberto ? AMBER : DEV_TXT3 }}>
          {emAberto ? `${fmtBRL(emAberto)} em aberto` : 'nada em aberto'}
        </span>
      </div>
      {todas.length === 0 ? (
        <p style={{ fontSize: 12, color: DEV_TXT3, margin: 0 }}>Nenhuma cobrança gerada ainda.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visiveis.map((i) => {
            const st = installmentDisplayStatus(i, tenant.billing?.toleranceDays) as StatusParcela
            return (
              <div key={i.id} data-testid={`n0-ficha-parcela-${i.id}`} style={{ background: DEV_CARD, borderRadius: 12, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#fff' }}>Vence {fmtDate(i.dueDate)}</div>
                    <div style={{ fontSize: 11.5, color: DEV_TXT2 }}>
                      {fmtBRL(i.amount)}{i.paid ? ` · pago ${fmtDate(i.paidDate)}` : ''}
                    </div>
                  </div>
                  <ParcelaBadge status={st} />
                </div>
                {i.pagamentoInformadoEm && !i.paid && (
                  <button type="button" data-testid={`n0-ficha-confirmar-${i.id}`}
                    onClick={() => void confirmarPagamento(tenant.id, i.id)}
                    style={{ ...primaryBtn, background: GREEN, padding: '8px 10px', fontSize: 12.5, marginTop: 8 }}>
                    <Check size={13} /> Confirmar pagamento e liberar acesso
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {todas.length > limite && (
        <button type="button" data-testid="n0-ficha-extrato-todos" onClick={() => setVerTodas((v) => !v)}
          style={{ background: 'none', border: 'none', color: DEV_ACCENT, fontWeight: 700, fontSize: 12, padding: '8px 0 0', cursor: 'pointer' }}>
          {verTodas ? 'Recolher' : `Exibir todos (${todas.length})`}
        </button>
      )}
      {/* ===== FORCAR_PAGAMENTO_MVP — REMOVER NA PUBLICAÇÃO EM PRODUÇÃO =====
          Ver o bloco de comentário de `forcarPagamentoMVP` em
          `kitPlatform.ts`: apagar aquela função e este bloco tira a ferramenta
          inteira. O aviso fica VISÍVEL na tela de propósito — quem usar precisa
          saber que está registrando um pagamento que não aconteceu. */}
      {emAberto > 0 && (
        <div style={{ marginTop: 12, border: `1px dashed ${AMBER}`, borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11.5, color: DEV_TXT2, lineHeight: 1.45, marginBottom: 8 }}>
            <strong style={{ color: AMBER }}>Ferramenta de MVP.</strong> Marca as cobranças em aberto como pagas sem
            pagamento nenhum, só pra testar a liberação do acesso. Fica no log como forçado. Sai quando existir cobrança
            de verdade.
          </div>
          {confirmarForcar ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" data-testid="n0-forcar-pagamento-sim"
                onClick={() => { void forcarPagamentoMVP(tenant.id); setConfirmarForcar(false) }}
                style={{ ...primaryBtn, background: AMBER, padding: '9px 12px', fontSize: 12.5, flex: 1 }}>
                Sim, forçar {fmtBRL(emAberto)}
              </button>
              <button type="button" onClick={() => setConfirmarForcar(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, color: '#fff', padding: '9px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flex: 1 }}>
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" data-testid="n0-forcar-pagamento" onClick={() => setConfirmarForcar(true)}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, color: '#fff', padding: '9px 12px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', width: '100%' }}>
              Forçar pagamento (MVP)
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ConverterPaganteSheet({ tenant, onClose }: { tenant: TenantKit; onClose: () => void }) {
  const planos = useTodosPlanos().filter((p) => p.ativo)
  /* BUG REAL corrigido em 12/09/2026 (build 052), relatado pelo Rafael: "já
     carrega um plano no campo mas se gravo critica que tem que escolher".

     A causa é clássica e vale pra qualquer folha deste painel: `useTodosPlanos`
     é reativo (lê o Dexie), então no PRIMEIRO render a lista vem vazia. O
     estado inicial `planos[0]?.id` nascia `''` e nunca mais era revisto — mas o
     `<select>`, sem `value` casando com nenhuma `<option>`, exibe a primeira da
     lista assim que ela chega. A tela mostrava um plano escolhido e o estado
     dizia que nada estava escolhido.

     A correção não é um efeito que "conserta depois": é derivar no render. Se o
     id guardado não casa com nenhum plano vivo, vale o primeiro da lista — o
     mesmo que a pessoa está vendo. Mesma ideia pro valor: enquanto ninguém
     digitar nada, ele acompanha o plano selecionado. */
  const [planoEscolhido, setPlanoId] = useState<string>('')
  const planoId = planos.some((p) => String(p.id) === planoEscolhido)
    ? planoEscolhido
    : (planos[0]?.id != null ? String(planos[0].id) : '')
  const plano = planos.find((p) => String(p.id) === planoId)
  const [valorDigitado, setValor] = useState<string | null>(null)
  const valor = valorDigitado ?? formatarMoeda(plano?.valorMensal ?? 0)
  const [diaVenc, setDiaVenc] = useState('5')
  const [erro, setErro] = useState('')

  async function salvar() {
    const v = paraNumero(valor)
    const dia = Number(diaVenc)
    if (!plano) { setErro('Escolha um plano.'); return }
    /* 12/09/2026: converter pra pagante exige valor > 0. Os planos placeholder
       nascem com valor zero, e aceitar zero criava uma assinatura "pagante"
       sem nenhuma cobrança — o cliente entrava no Financeiro sem extrato e sem
       nada a vencer, que é justamente o oposto do que esta tela promete.
       Plano gratuito tem caminho próprio (a flag de validade no cadastro do
       plano), não passa por aqui. */
    if (!Number.isFinite(v) || v <= 0) { setErro('Informe o valor mensal da assinatura (maior que zero).'); return }
    if (!Number.isFinite(dia) || dia < 1 || dia > 28) { setErro('Dia de vencimento entre 1 e 28.'); return }
    await atualizarTenantN0(tenant.id, (x) => ({
      ...x,
      plan: 'pagante',
      planId: plano.id != null ? String(plano.id) : null,
      trial: null,
      manualBlock: false,
      billing: {
        monthlyValue: v,
        dueDay: dia,
        toleranceDays: x.billing?.toleranceDays ?? 5,
        installments: x.billing?.installments ?? [],
      },
      accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: `${tenant.plan === 'pagante' ? 'Plano alterado pela Morfo' : 'Convertido para pagante'} — plano ${plano.nome}, R$ ${v.toFixed(2)}/mês`, ator: 'admin' }],
    }))
    /* Item de 12/09/2026: a cobrança nasce JUNTO com a conversão, não na
       próxima abertura do painel. `gerarParcelasPendentes` é idempotente e já
       garante uma parcela em aberto (ver `kitPlatform.ts`); aqui ela é
       chamada sobre o cliente JÁ atualizado, nunca sobre a cópia que este
       render capturou — senão ela leria o plano antigo. */
    const atual = (await lerPlatformN0Persistida()).tenants.find((x) => x.id === tenant.id)
    if (atual) {
      const patch = gerarParcelasPendentes(atual)
      if (patch) await atualizarTenantN0(tenant.id, (x) => ({ ...x, ...patch }))
    }
    onClose()
  }

  return (
    <Sheet dark title={tenant.plan === 'pagante' ? 'Trocar de plano' : 'Tornar pagante'} onClose={onClose}>
      <Field dark label="Plano">
        <select style={inputStyle} value={planoId} onChange={(e) => { setPlanoId(e.target.value); const p = planos.find((x) => String(x.id) === e.target.value); setValor(p ? formatarMoeda(p.valorMensal) : null) }}>
          {planos.length === 0 && <option value="">Nenhum plano ativo cadastrado</option>}
          {planos.map((p) => <option key={p.id} value={String(p.id)}>{p.nome}</option>)}
        </select>
      </Field>
      <Field dark label="Valor mensal (R$)"><input style={inputStyle} inputMode="numeric" value={valor} onChange={(e) => setValor(aplicarMascaraValor(e.target.value))} /></Field>
      <Field dark label="Dia do vencimento"><input type="number" min="1" max="28" style={inputStyle} value={diaVenc} onChange={(e) => setDiaVenc(e.target.value)} /></Field>
      <FieldError show={!!erro} text={erro} />
      <button type="button" onClick={() => void salvar()} style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT }}>
        <Check size={16} /> {tenant.plan === 'pagante' ? 'Salvar plano e valor' : 'Converter para pagante'}
      </button>
    </Sheet>
  )
}

function NovoPrazoTesteSheet({ tenant, onClose }: { tenant: TenantKit; onClose: () => void }) {
  const [dias, setDias] = useState('15')
  const [erro, setErro] = useState('')
  /* Item 10 da lista de 12/09/2026: "o botão de liberar mais teste não pode
     estar amarrado ao de tornar pagante — não segue necessariamente esse
     fluxo". Antes esta folha forçava `plan: 'trial'` sempre: dar mais prazo a
     um cliente PAGANTE rebaixava o plano dele sem ninguém pedir. Agora mexer
     no plano é uma escolha explícita, desmarcada por padrão pra quem já paga. */
  const [mudarPlano, setMudarPlano] = useState(tenant.plan !== 'pagante')
  async function salvar() {
    const d = Number(dias)
    if (!Number.isFinite(d) || d < 1) { setErro('Informe um número de dias maior que zero.'); return }
    await atualizarTenantN0(tenant.id, (x) => ({
      ...x,
      ...(mudarPlano ? { plan: 'trial' as const } : {}),
      manualBlock: false,
      trial: { days: d, startDate: todayISO() },
      accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: `Novo prazo de teste: ${d} dias a partir de hoje${mudarPlano ? ' (plano voltou para período de teste)' : ' (plano mantido)'}`, ator: 'admin' }],
    }))
    onClose()
  }
  return (
    <Sheet dark title="Novo prazo de teste" onClose={onClose}>
      <div style={{ fontSize: 12, color: DEV_TXT2, marginBottom: 10, lineHeight: 1.5 }}>
        Reinicia o período de avaliação a partir de hoje. Também desfaz um bloqueio manual, se houver.
      </div>
      <button type="button" onClick={() => setMudarPlano((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', textAlign: 'left', marginBottom: 10 }}>
        <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${mudarPlano ? DEV_ACCENT : 'rgba(255,255,255,0.35)'}`, background: mudarPlano ? DEV_ACCENT : 'transparent', flexShrink: 0 }} />
        Também mudar o plano para &ldquo;período de teste&rdquo;
      </button>
      <Field dark label="Dias de teste"><input type="number" min="1" style={inputStyle} value={dias} onChange={(e) => setDias(e.target.value)} /></Field>
      <FieldError show={!!erro} text={erro} />
      <button type="button" onClick={() => void salvar()} style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT }}>
        <Check size={16} /> Aplicar novo prazo
      </button>
    </Sheet>
  )
}

/* 'novo' = folha de cadastro em Período de teste (atalho "Criar ambiente de
   teste"); 'novoPreCadastro' = mesma folha já marcada como Pré-cadastro
   (atalho "Pré-cadastros", item 2 de 12/09/2026); 'preCadastros' = a LISTA
   filtrada em quem aguarda liberação, alcançável pelo filtro da própria aba. */
export type AcaoTenants = 'novo' | 'novoPreCadastro' | 'preCadastros' | undefined

/* Barra de LIMITE × USO por cliente (12/09/2026, pedido do Rafael: "N0,
   Clientes deve ter as barras de controle de limites x uso igual tem no
   kit").

   ADAPTAÇÃO registrada: no Kit as barras são "usuários usados × limite do
   plano" e "registros de Entidade A × limite". Nenhuma das duas existe mais
   aqui — o ambiente é de um usuário só (Decisão 67) e não há teto de
   lançamentos (app local, sem custo por registro; o limite de usuários foi
   removido do produto inteiro nesta mesma rodada). O limite REAL que este
   produto tem é o TEMPO: o período de teste e o prazo de tolerância da
   mensalidade. São esses dois que a barra mostra — mesma forma do Kit
   (rótulo, usado/total e barra), com o que de fato limita alguma coisa. */
function BarraUso({ rotulo, usado, total, cor }: { rotulo: string; usado: number; total: number; cor: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (usado / total) * 100)) : 0
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: DEV_TXT2, marginBottom: 3 }}>
        <span>{rotulo}</span>
        <span>{Math.round(usado)} de {Math.round(total)}</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.10)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 999 }} />
      </div>
    </div>
  )
}

/* Qual barra cabe pra este cliente — teste em andamento, ou tolerância da
   mensalidade vencida. Sem nenhum limite ativo, não desenha nada (nunca uma
   barra decorativa "0 de 0"). */
function BarrasLimiteTenant({ t }: { t: TenantKit }) {
  if (t.plan === 'trial' && t.trial) {
    const total = t.trial.days
    const restam = daysUntil(addDays(t.trial.startDate, t.trial.days)) ?? 0
    const usado = Math.max(0, Math.min(total, total - restam))
    return <BarraUso rotulo="Período de teste" usado={usado} total={total} cor={restam <= 3 ? RED : restam <= 7 ? AMBER : GREEN} />
  }
  const tol = t.billing?.toleranceDays ?? 0
  const vencida = (t.billing?.installments ?? []).find((i) => !i.paid && (daysUntil(i.dueDate) ?? 99) < 0)
  if (vencida && tol > 0) {
    const atraso = Math.abs(daysUntil(vencida.dueDate) ?? 0)
    return <BarraUso rotulo="Tolerância da mensalidade" usado={Math.min(atraso, tol)} total={tol} cor={atraso >= tol ? RED : AMBER} />
  }
  return null
}

function AbaTenants({ onEntrarComoTenant, filtroDados, acaoInicial, clienteInicial, aoAbrirClienteInicial }: {
  onEntrarComoTenant: (tenantId: string) => void
  filtroDados: FiltroDados
  acaoInicial?: AcaoTenants
  clienteInicial?: string | null
  aoAbrirClienteInicial?: () => void
}) {
  const { tenants: todos, defaultParams, devUsers, urlsProduto } = usePlatformN0()
  const tenants = filtrarTenantsPorDados(todos, filtroDados)
  /* Folha de compartilhamento (12/09/2026, build 053) — a MESMA peça pros
     três cenários; quem abre diz qual é. Fica no nível da aba (e não dentro
     da folha de cadastro) porque ela também é aberta pelo botão de liberar
     acesso, que vive na ficha do cliente. */
  const [compartilhar, setCompartilhar] = useState<DadosCompartilhamento | null>(null)
  /* Abre já na ficha do cliente quando o painel volta de um acesso ao ambiente
     dele (12/09/2026). O aviso ao shell ("já usei, pode esquecer") sai no mount
     — sem isso, sair da ficha e voltar pra aba reabriria a mesma ficha. */
  const [selecionadoId, setSelecionadoId] = useState<string | null>(clienteInicial ?? null)
  useEffect(() => { if (clienteInicial) aoAbrirClienteInicial?.() }, [clienteInicial, aoAbrirClienteInicial])
  const [chatAberto, setChatAberto] = useState(false)
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */
  /* `acaoInicial` vem do atalho do Início (12/09/2026): 'novo' abre direto a
     folha de cadastro de cliente ("Criar ambiente de teste"), 'preCadastros'
     abre a lista já filtrada em quem está aguardando liberação. */
  const [novoAberto, setNovoAberto] = useState(acaoInicial === 'novo' || acaoInicial === 'novoPreCadastro') /* Decisão 67 */
  const modoInicialNovo = acaoInicial === 'novoPreCadastro' ? ('precadastro' as const) : undefined
  /* Aviso curto da própria aba — a folha de cadastro precisa dizer o que
     aconteceu ao compartilhar (compartilhado × copiado × não deu). */
  const [avisoTenants, setAvisoTenants] = useState('')
  const [soPreCadastros, setSoPreCadastros] = useState(acaoInicial === 'preCadastros')
  const [editarAberto, setEditarAberto] = useState(false) /* Correção de auditoria — cluster Tenants x Kit, ver EditarClienteSheet */
  const [excluirAberto, setExcluirAberto] = useState(false) /* idem — ver ExcluirClienteSheet */
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false) /* idem — ver ConfirmarBloqueioSheet */
  /* Achado 11/09/2026 (revisão pedida pelo Rafael): "1 usuário por ambiente"
     (Decisão 67) nunca decidiu que esse usuário ficaria sem edição — são
     duas coisas sem relação (não ter vários usuários ≠ não poder editar o
     único que existe). A ficha do cliente só mostrava o login, sem nenhum
     jeito de corrigir login/senha dele pelo N0 — ver EditarAcessoClienteSheet. */
  const [editarAcessoFor, setEditarAcessoFor] = useState<UsuarioTenant | null>(null)
  const [converterAberto, setConverterAberto] = useState(false) /* 12/09/2026 — ver ConverterPaganteSheet */
  const [novoPrazoAberto, setNovoPrazoAberto] = useState(false)
  const listaTenants = soPreCadastros
    ? tenants.filter((t) => t.onboarding === 'pendente_liberacao' || (t.users ?? []).some((u) => u.status !== 'ativo'))
    : tenants
  const selecionado = selecionadoId ? tenants.find((t) => t.id === selecionadoId) : undefined
  /* Botão voltar do Android: fecha a conversa, depois a ficha do cliente,
     antes de deixar o shell tratar (12/09/2026). */
  usarBotaoVoltar(() => {
    if (chatAberto) { setChatAberto(false); return true }
    if (selecionadoId) { setSelecionadoId(null); return true }
    return false
  })

  // Conversa de suporte deste tenant, do lado N0 (10/09/2026, Decisão 53,
  // ponto 3) — mesma peça (`ChatConversa.tsx`) que o N1 usa em
  // `SuporteChat.tsx`, só com `perspectiva="suporte"` (bolha própria à
  // direita, marca `chatLastReadMorfo`). Adaptado do Kit
  // `DevSupportChatScreen` (L6089-L6107) — funciona pra qualquer tenant com
  // conversa (não só o real, já que os tenants de exemplo do Kit já nascem
  // com mensagens de demonstração — ver `kitPlatform.ts`).
  if (selecionado && chatAberto) {
    const t = selecionado
    return (
      <div>
        <TopoN0 titulo={`Suporte — ${t.companyName}`} onVoltarSub={() => setChatAberto(false)} />
        <ChatConversa tenant={t} chatConfig={defaultParams?.chat} perspectiva="suporte" />
      </div>
    )
  }

  if (selecionado) {
    const t = selecionado
    /* Só o ambiente DESTE aparelho (`t0`) tem aplicativo de verdade pra
       entrar: o dado do N1 mora no Dexie do próprio celular. Antes desta
       rodada a condição era `t.real`, o que bastava enquanto `t0` era o único
       tenant real que existia — com o cadastro de cliente pela Morfo
       (Decisão 67) passaram a existir outros tenants reais, e "entrar" neles
       abriria o app COM O DADO DO RAFAEL, o que seria errado e enganoso.
       Depende de servidor (Backlog #028), como as demais ações desabilitadas. */
    const ehAppDesteAparelho = t.id === TENANT_N1_ID
    /* Bloqueio manual (11/09/2026): sem trava especial pro ambiente deste
       aparelho além do que já existe — a proteção do `t0` contra ficar
       travado por BUG mora na própria tela de bloqueio do lado N1
       (`AppRoot.tsx`/`AmbienteBloqueado.tsx`, gate de `tenantBlocked()`), não
       aqui. Se o próprio Rafael (ou o N0) bloquear `t0` de propósito, o
       bloqueio vale igual a qualquer outro tenant — ação válida, não bug. */
    const applyToggleManualBlock = () => {
      void atualizarTenantN0(t.id, (x) => ({
        ...x,
        manualBlock: !x.manualBlock,
        accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: x.manualBlock ? 'Desbloqueio manual' : 'Bloqueio manual', ator: 'admin' }],
      }))
      setConfirmBlockOpen(false)
    }
    const toggleManualBlock = () => (t.manualBlock ? applyToggleManualBlock() : setConfirmBlockOpen(true))
    return (
      <div>
        <TopoN0 titulo={t.companyName} subtitulo={ehAppDesteAparelho ? 'Ambiente deste aparelho' : t.real ? 'Cliente cadastrado' : 'Cliente de exemplo'} onVoltarSub={() => setSelecionadoId(null)}
          acoes={<button type="button" title="Editar dados do cliente" aria-label="Editar dados do cliente" onClick={() => setEditarAberto(true)}
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Pencil size={15} color="#fff" />
          </button>} />
        {editarAberto && <EditarClienteSheet tenant={t} onClose={() => setEditarAberto(false)} />}
        {excluirAberto && <ExcluirClienteSheet tenant={t} ehAppDesteAparelho={ehAppDesteAparelho} onClose={() => setExcluirAberto(false)} onExcluido={() => { setExcluirAberto(false); setSelecionadoId(null) }} />}
        {confirmBlockOpen && <ConfirmarBloqueioSheet tenant={t} onClose={() => setConfirmBlockOpen(false)} onConfirm={applyToggleManualBlock} />}
        {editarAcessoFor && <EditarAcessoClienteSheet tenant={t} usuario={editarAcessoFor} devUsers={devUsers ?? []} tenants={todos} onClose={() => setEditarAcessoFor(null)} />}
        {/* Item 18 (pedido do Rafael, 12/09/2026): cliente não pagante precisa de
            um caminho completo pra virar pagante, escolher plano ou ganhar novo
            prazo — antes ele ficava travado sem nada a fazer na ficha. */}
        {converterAberto && <ConverterPaganteSheet tenant={t} onClose={() => setConverterAberto(false)} />}
        {novoPrazoAberto && <NovoPrazoTesteSheet tenant={t} onClose={() => setNovoPrazoAberto(false)} />}
        {compartilhar && <FolhaCompartilhar dados={compartilhar} onClose={() => setCompartilhar(null)}
          notify={(m) => { setAvisoTenants(m); window.setTimeout(() => setAvisoTenants(''), 4000) }} />}
        {avisoTenants && (
          <div data-testid="n0-aviso-ficha" style={{ background: alpha(GREEN, 0.16), border: `1px solid ${alpha(GREEN, 0.4)}`, color: '#fff', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>
            {avisoTenants}
          </div>
        )}
        <div style={{ background: DEV_CARD, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: DEV_TXT2 }}>Status</span>
            <Badge status={statusDoTenant(t)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: DEV_TXT2 }}>Plano</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{planoLabelDoTenant(t)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: DEV_TXT2 }}>Cliente desde</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{fmtDate(t.createdAt)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: DEV_TXT2 }}>Cobrança mensal</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{fmtBRL(mrrDoTenant(t))}</span>
          </div>
          {/* WhatsApp do cliente (achado 11/09/2026, mesma revisão do
              login/senha): o Kit mostra um atalho de WhatsApp direto na ficha
              do cliente (ao lado do nome/telefone do responsável) — aqui o
              telefone nem aparecia. `linkWhatsApp` já existe neste arquivo
              (usado hoje só pra cobrança de parcela); reaproveitado aqui. */}
          {t.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: DEV_TXT2 }}>Contato</span>
              <a href={linkWhatsApp(t.phone, `Olá ${t.ownerName || t.companyName}, aqui é da Morfo.`)} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#25D366', background: 'rgba(37,211,102,0.1)', padding: '3px 8px', borderRadius: 999, textDecoration: 'none' }}>
                <MessageCircle size={11} /> {t.phone}
              </a>
            </div>
          )}
          {/* Autorização de suporte (achado 11/09/2026): `supportAuthorized`
              já existe no dado e já é alternado pelo próprio cliente em
              `SuporteChat.tsx` (N1) — só não aparecia em lugar nenhum do
              lado N0, então a Morfo não tinha como saber se pode acessar o
              ambiente do cliente sem perguntar de novo. */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: DEV_TXT2 }}>Acesso de suporte</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: t.supportAuthorized ? GREEN : DEV_TXT3, background: (t.supportAuthorized ? GREEN : DEV_TXT3) + '22', padding: '2px 8px', borderRadius: 999 }}>
              {t.supportAuthorized ? 'Autorizado' : 'Não autorizado'}
            </span>
          </div>
          {/* Acesso do cliente (11/09/2026, Decisão 67): 1 usuário por
              ambiente, então a ficha mostra o login dele e se já está
              liberado — sem isso, cadastrar acesso e não conseguir conferir
              seria meio caminho. A senha nunca é exibida aqui (só dentro do
              formulário de edição, ver EditarAcessoClienteSheet). */}
          {(t.users ?? []).map((u) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, color: DEV_TXT2 }}>Acesso</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: u.status === 'ativo' ? '#fff' : AMBER, textAlign: 'right' }}>
                  {u.login}{u.status === 'ativo' ? '' : ' · aguardando liberação'}
                </span>
                <button type="button" title="Editar login e senha do cliente" aria-label="Editar login e senha do cliente"
                  onClick={() => setEditarAcessoFor(u)}
                  style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Pencil size={11} color="#fff" />
                </button>
              </span>
            </div>
          ))}
        </div>
        <ExtratoCobrancasCliente tenant={t} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {/* Liberar acesso (11/09/2026, Decisão 67 — "n0 tem que conseguir
              cadastrar novo cliente e preencher dados dele e liberar
              acesso"): só aparece quando existe alguém aguardando. Muda o
              usuário pra `ativo` e o ambiente pra `completo`, exatamente os
              dois estados que a aba Início usa pra listar a pendência. */}
          {(t.users ?? []).some((u) => u.status !== 'ativo') && (
            <button
              type="button"
              data-testid="n0-liberar-acesso"
              /* 12/09/2026 (build 053): liberar e AVISAR viraram um gesto só.
                 O Rafael: "quando o N0 liberar clicando no botão, abrir tela
                 com link preenchido permitindo mudar, mas ao confirmar mandar
                 mensagem novamente podendo escolher se e-mail ou whatsapp com
                 novo texto liberando acesso de testes" — e com o link de
                 download do aplicativo dentro. Liberar sem avisar deixava o
                 cliente esperando por um acesso que já existia. */
              onClick={() => {
                const usuario = (t.users ?? [])[0]
                void atualizarTenantN0(t.id, (x) => ({
                  ...x,
                  onboarding: 'completo',
                  users: x.users.map((u) => (u.status === 'ativo' ? u : { ...u, status: 'ativo' })),
                  accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: 'Acesso liberado pela Morfo', ator: 'admin' }],
                }))
                setCompartilhar({
                  cenario: 'liberacao',
                  nomeProduto: NOME_PRODUTO,
                  nomeCliente: t.companyName,
                  telefone: t.phone,
                  email: t.email,
                  login: usuario?.login,
                  senha: usuario?.senha,
                  contexto: t.plan === 'trial' && t.trial
                    ? `Você tem ${t.trial.days} dias de teste a partir de hoje.`
                    : undefined,
                  linkApp: urlsProduto?.apk,
                  linkSite: urlsProduto?.site,
                })
              }}
              style={{ background: GREEN, border: 'none', borderRadius: 10, color: '#fff', padding: '10px 12px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Liberar acesso deste cliente
            </button>
          )}
          {/* Fluxo de plano do cliente (12/09/2026): trial → pagante, e novo
              prazo de teste. Antes, um cliente em teste/bloqueado não tinha
              nenhuma ação possível na ficha. */}
          {/* Item 11 (12/09/2026): "não encontrei a troca de plano pela
              Morfo". A ação existia, mas só aparecia pra quem AINDA não era
              pagante — num cliente que já paga, não havia como trocar o plano
              dele. Agora aparece sempre, com o rótulo certo pra cada caso. */}
          <button
            type="button"
            data-testid="n0-tornar-pagante"
            onClick={() => setConverterAberto(true)}
            /* 12/09/2026: "trocar plano não precisa estar destacado". Tornar
               pagante é a ação principal de um cliente em teste e continua
               destacada; trocar o plano de quem já paga é manutenção, e passa
               a usar o mesmo fundo neutro das outras ações da ficha. */
            style={{ background: t.plan === 'pagante' ? 'rgba(255,255,255,0.08)' : DEV_ACCENT, border: 'none', borderRadius: 10, color: '#fff', padding: '10px 12px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
          >
            {t.plan === 'pagante' ? 'Trocar de plano / valor' : 'Tornar pagante (escolher plano)'}
          </button>
          <button
            type="button"
            data-testid="n0-novo-prazo"
            onClick={() => setNovoPrazoAberto(true)}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, color: '#fff', padding: '10px 12px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
          >
            {t.plan === 'pagante' ? 'Voltar para período de teste (novo prazo)' : 'Dar novo prazo de teste'}
          </button>
          {/* "Entrar como este cliente" (08/09/2026, G59) — 12/09/2026, itens
              13/14/15: passou a valer pra QUALQUER ambiente, não só o do
              aparelho. Antes ficava travado nos demais porque todo dado era
              global: entrar em outro cliente mostraria os dados deste
              aparelho, que foi exatamente o que o Rafael reportou. Com o
              escopo por ambiente (`src/ambiente.ts`), entrar num cliente abre
              o ambiente DELE — vazio, se ele ainda não tem nada. Continua
              sendo o ÚNICO caminho N0→N1 (G59). */}
          <button
            type="button"
            data-testid="n0-entrar-como-tenant"
            onClick={() => onEntrarComoTenant(t.id)}
            style={{
              background: DEV_ACCENT,
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              padding: '10px 12px',
              textAlign: 'left',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Entrar como este cliente (impersonate)
          </button>
          <button
            type="button"
            onClick={() => setChatAberto(true)}
            className={hasUnreadMorfo(t) ? 'mloc-shake' : ''}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              padding: '10px 12px',
              textAlign: 'left',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
            }}
          >
            <span>Ver conversa (suporte)</span>
            {t.supportMessages.length > 0 && (
              <span style={{ fontSize: 11, color: DEV_TXT2, fontWeight: 400 }}>{t.supportMessages.length} mensagem(ns)</span>
            )}
            {/* Selo vermelho pulsante de não lida (10/09/2026, Decisão 53/54
                — Parte A): transcrição literal do Kit (L5895,
                DEV_CARD como cor da borda do selo, igual ao botão "Suporte
                via Chat" da ficha do tenant). */}
            {hasUnreadMorfo(t) && (
              <span
                className="mloc-badge-pulse"
                style={{
                  position: 'absolute',
                  top: -4,
                  right: 6,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 999,
                  background: '#E02D2D',
                  border: '2px solid ' + DEV_CARD,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9.5,
                  fontWeight: 900,
                  color: '#fff',
                }}
              >
                !
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={toggleManualBlock}
            style={{
              background: DEV_CARD,
              border: 'none',
              borderRadius: 10,
              color: t.manualBlock ? GREEN : RED,
              padding: '10px 12px',
              textAlign: 'left',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {t.manualBlock ? <><Unlock size={15} /> Desbloquear</> : <><Lock size={15} /> Bloquear</>}
          </button>
          {['Suspender acesso', 'Forçar nova cobrança'].map((acao) => (
            <button
              key={acao}
              type="button"
              disabled
              title="Precisa de backend real (Backlog #028) — indisponível nesta fase"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                color: DEV_TXT3,
                padding: '10px 12px',
                textAlign: 'left',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'not-allowed',
              }}
            >
              {acao}
            </button>
          ))}
          {/* Correção de auditoria (cluster Tenants x Kit): "Excluir cliente" não
              existia — ver ExcluirClienteSheet acima (mesma regra do Kit: bloqueia
              pagante, e aqui também bloqueia o ambiente deste aparelho). */}
          <button
            type="button"
            onClick={() => setExcluirAberto(true)}
            style={{
              background: 'rgba(210,72,59,0.12)',
              border: 'none',
              borderRadius: 10,
              color: RED,
              padding: '10px 12px',
              textAlign: 'left',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Trash2 size={15} /> Excluir cliente
          </button>
        </div>
        {/* Histórico (achado 11/09/2026): o Kit mostra, na própria ficha do
            cliente, os últimos eventos do `accessLog` dele (aba "Histórico")
            — aqui o log já é gravado desde sempre (bloqueio, edição, acesso
            liberado, parcela paga, etc. — ver os vários `accessLog: [...]`
            acima e na Auditoria), só não aparecia em lugar nenhum na ficha:
            pra ver o que aconteceu com ESTE cliente era preciso ir pra
            Auditoria (aba separada) e procurar pelo nome. Mostrado aqui só
            os 5 mais recentes — a Auditoria continua sendo o lugar certo
            pra ver tudo. */}
        {(t.accessLog ?? []).length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: DEV_TXT2, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 6 }}>Histórico recente</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(t.accessLog ?? []).slice().reverse().slice(0, 5).map((a) => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: DEV_CARD, borderRadius: 10, padding: '8px 12px' }}>
                  <ShieldAlert size={13} color={DEV_ACCENT} />
                  <span style={{ fontSize: 12, color: '#C9C4D4', flex: 1 }}>
                    {a.action} · {new Date(a.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p style={{ fontSize: 11, color: DEV_TXT3, lineHeight: 1.6, marginTop: 14 }}>
          {ehAppDesteAparelho
            ? 'Entrar como este cliente abre o aplicativo de negócio em modo consulta, com um aviso permanente e um jeito de voltar ao painel N0 — não é uma troca de sessão, você continua logado como administrador.'
            : 'Ações acima ficam desabilitadas de propósito — exigem cliente real e servidor (Backlog #028); a tela já está pronta pra quando isso existir.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <TopoN0
        titulo="Tenants"
        subtitulo={`${tenants.length} ambientes`}
        acoes={<IconesDeTela dark onExportar={() => setExportOpen(true)}
          incluir={<button type="button" title="Cadastrar novo cliente" aria-label="Cadastrar novo cliente" data-testid="n0-incluir-cliente"
            onClick={() => setNovoAberto(true)}
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none', background: DEV_ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={18} color="#fff" />
          </button>} />}
      />
      {avisoTenants && (
        <div data-testid="n0-aviso-tenants" style={{ background: alpha(GREEN, 0.16), border: `1px solid ${alpha(GREEN, 0.4)}`, color: '#fff', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>
          {avisoTenants}
        </div>
      )}
      {novoAberto && <NovoClienteSheet diasTestePadrao={defaultParams?.trialDays ?? 15} modoInicial={modoInicialNovo}
        urls={urlsProduto ?? {}}
        aoCompartilhar={setCompartilhar}
        notify={(m) => { setAvisoTenants(m); window.setTimeout(() => setAvisoTenants(''), 4000) }}
        onClose={() => setNovoAberto(false)} />}
      {compartilhar && <FolhaCompartilhar dados={compartilhar} onClose={() => setCompartilhar(null)}
        notify={(m) => { setAvisoTenants(m); window.setTimeout(() => setAvisoTenants(''), 4000) }} />}
      {exportOpen && <ExportSheet dark title="Tenants" filenameBase="morfofinp-n0-tenants"
        screenColumns={[
          { key: 'companyName', label: 'Ambiente' },
          { key: 'plano', label: 'Plano' },
          { key: 'status', label: 'Situação' },
        ]}
        screenRows={tenants.map((t) => ({ companyName: t.companyName, plano: planoLabelDoTenant(t), status: statusDoTenant(t) }))}
        detailColumns={[
          { key: 'companyName', label: 'Ambiente' },
          { key: 'plano', label: 'Plano' },
          { key: 'status', label: 'Situação' },
          { key: 'mrr', label: 'Mensalidade' },
          { key: 'usuarios', label: 'Usuários' },
          { key: 'real', label: 'Dado real' },
        ]}
        detailRows={tenants.map((t) => ({
          companyName: t.companyName, plano: planoLabelDoTenant(t), status: statusDoTenant(t),
          mrr: fmtBRL(mrrDoTenant(t)), usuarios: (t.users ?? []).length, real: t.ficticio ? 'não (exemplo)' : 'sim',
        }))}
        onClose={() => setExportOpen(false)} />}
      <AvisoDadoFicticio />
      {soPreCadastros && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: alpha(AMBER, 12), border: `1px solid ${alpha(AMBER, 30)}`, borderRadius: 10, padding: '8px 10px', marginBottom: 8 }}>
          <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#fff' }}>Mostrando só pré-cadastros aguardando liberação</span>
          <button type="button" onClick={() => setSoPreCadastros(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11.5, padding: '4px 10px', cursor: 'pointer' }}>Ver todos</button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {listaTenants.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelecionadoId(t.id)}
            /* Item 10 da lista de 12/09/2026: "destacar cliente não pagante".
               O cliente que não paga ganha uma tarja lateral âmbar e um selo
               NÃO PAGANTE ao lado do nome — antes, só o rótulo do plano em
               cinza dizia isso, no meio de todo o resto. */
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: DEV_CARD,
              border: 'none',
              borderLeft: t.plan === 'pagante' ? '3px solid transparent' : `3px solid ${AMBER}`,
              borderRadius: 12,
              padding: '12px 14px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.companyName}
                </span>
                {t.plan !== 'pagante' && (
                  <span data-testid="n0-selo-nao-pagante" style={{ flexShrink: 0, fontSize: 9, fontWeight: 800, letterSpacing: 0.3, color: AMBER, background: `${AMBER}22`, borderRadius: 999, padding: '2px 7px' }}>
                    NÃO PAGANTE
                  </span>
                )}
                {/* Item 21: pontinho vermelho animado quando esse cliente tem
                    mensagem que a Morfo ainda não leu. */}
                {hasUnreadMorfo(t) && (
                  <span data-testid="n0-ponto-nao-lida" className="mloc-badge-pulse" aria-label="Mensagem não lida deste cliente"
                    style={{ flexShrink: 0, width: 8, height: 8, borderRadius: '50%', background: RED }} />
                )}
              </div>
              <div style={{ fontSize: 11, color: DEV_TXT2, marginTop: 2 }}>{planoLabelDoTenant(t)}</div>
              <BarrasLimiteTenant t={t} />
            </div>
            <Badge status={statusDoTenant(t)} />
            <ChevronRightIcon width={16} height={16} color={DEV_TXT2} />
          </button>
        ))}
      </div>
    </div>
  )
}

/* ===================== Parcela: detalhe / alterar status / cobrar (N0) =====================
   Auditoria do cluster Financeiro x Kit (11/09/2026): o Kit tem 3 peças pra
   trabalhar UMA parcela de cobrança — `InstallmentDetailSheet` (Kit L2843),
   `AlterarStatusPagamentoSheet` (Kit L1116) e `PaymentLinkSheet` (Kit
   L2770) —, nenhuma existia aqui: a aba Financeiro só mostrava o valor
   agregado da mensalidade (`mrrDoTenant`) por tenant, sem listar as
   parcelas em si, sem jeito de marcar uma como paga/vencida/perdida e sem
   fluxo de cobrança. `t.billing.installments` já existia no modelo de dados
   (`kitPlatform.ts`) e já era usado por `tenantTemParcelaVencida` — só não
   tinha tela nenhuma que o exibisse item a item. */
function DetalheParcelaSheet({ tenant, inst, onClose, onAlterarStatus, onCobrar }: {
  tenant: TenantKit; inst: Parcela; onClose: () => void
  onAlterarStatus: () => void; onCobrar: () => void
}) {
  const st = installmentDisplayStatus(inst, tenant.billing?.toleranceDays) as StatusParcela
  const linha = (label: string, value: ReactNode) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <span style={{ fontSize: 12.5, color: DEV_TXT2 }}>{label}</span>
      <span style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{value}</span>
    </div>
  )
  return (
    <Sheet dark title="Detalhes da parcela" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{fmtBRL(inst.amount)}</div>
        <ParcelaBadge status={st} />
      </div>
      <div style={{ fontSize: 13.5, color: DEV_TXT2, marginBottom: 10 }}>{tenant.companyName}</div>
      {linha('Vencimento', fmtDate(inst.dueDate))}
      {inst.paid
        ? <>{linha('Pago em', fmtDate(inst.paidDate))}{linha('Forma de pagamento', metodoLabel(inst.method))}</>
        : linha('Situação', st === 'vencido' ? 'Vencido, aguardando pagamento' : (st === 'perda' || st === 'cancelada') ? PARCELA_ROTULO[st] : 'Aguardando pagamento')}
      <button type="button" onClick={onAlterarStatus}
        style={{ ...primaryBtn, width: '100%', marginTop: 16, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
        <Pencil size={15} /> Alterar situação do pagamento
      </button>
      {instCobravelLocal(inst) && (
        <button type="button" onClick={onCobrar} style={{ ...primaryBtn, width: '100%', marginTop: 10, background: DEV_ACCENT }}>
          <Link2 size={16} /> Cobrar
        </button>
      )}
      {instCobravelLocal(inst) && tenant.hasWhatsapp !== false && tenant.phone && (
        <a
          href={linkWhatsApp(tenant.phone, `Olá ${tenant.ownerName || tenant.companyName}! Cobrança em aberto: ${fmtBRL(inst.amount)}, vencimento ${fmtDate(inst.dueDate)}.`)}
          target="_blank" rel="noreferrer"
          style={{ ...primaryBtn, width: '100%', marginTop: 10, background: 'rgba(37,211,102,0.14)', color: '#25D366', textDecoration: 'none' }}
        >
          <MessageCircle size={16} /> Enviar cobrança por WhatsApp
        </a>
      )}
    </Sheet>
  )
}

/* Kit `AlterarStatusPagamentoSheet` tem também "Desconto (R$)"/"Acréscimo
   (R$)" (campos `adjDiscount`/`adjSurcharge`/`baseAmount` na parcela) — a
   interface `Parcela` deste produto (`kitPlatform.ts`) não tem esses
   campos, então não dá pra portar sem mudar o modelo de dados (fora do
   escopo desta rodada, que edita só `DevApp.tsx`). O resto — trocar a
   situação entre pago/a vencer/vencido/perda/cancelada, com motivo — é
   igual ao Kit. */
function AlterarStatusParcelaSheet({ tenant, inst, onClose, onSave }: {
  tenant: TenantKit; inst: Parcela; onClose: () => void
  onSave: (patch: Partial<Parcela>, novoStatus: StatusParcela, motivo: string) => void
}) {
  const atual = installmentDisplayStatus(inst, tenant.billing?.toleranceDays) as StatusParcela
  const [novo, setNovo] = useState<StatusParcela>(atual)
  const [method, setMethod] = useState(inst.method || 'pix')
  const [paidDate, setPaidDate] = useState(inst.paidDate || new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(inst.dueDate)
  const [motivo, setMotivo] = useState('')
  const hoje = new Date().toISOString().slice(0, 10)
  const precisaVencimentoFuturo = novo === 'pendente' && dueDate <= hoje
  const precisaVencimentoPassado = novo === 'vencido' && dueDate > hoje
  const podeSalvar = !precisaVencimentoFuturo && !precisaVencimentoPassado

  const opcoes: { v: StatusParcela; l: string }[] = [
    { v: 'pago', l: 'Pago' },
    { v: 'pendente', l: 'Em aberto (a vencer)' },
    { v: 'vencido', l: 'Vencido' },
    { v: 'perda', l: 'Perda (não vai ser cobrado)' },
    { v: 'cancelada', l: 'Cancelada (sem cobrança)' },
  ]

  function salvar() {
    if (!podeSalvar) return
    const patch: Partial<Parcela> =
      novo === 'pago' ? { paid: true, paidDate, method, cancelada: false, perda: false }
      : novo === 'perda' ? { paid: false, perda: true, cancelada: false }
      : novo === 'cancelada' ? { paid: false, cancelada: true, perda: false }
      : { paid: false, cancelada: false, perda: false, dueDate }
    onSave(patch, novo, motivo.trim())
  }

  return (
    <Sheet dark title="Alterar situação do pagamento" onClose={onClose}>
      <div style={{ background: DEV_CARD, borderRadius: 12, padding: 12, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, color: DEV_TXT2 }}>Situação atual</span>
        <ParcelaBadge status={atual} />
      </div>
      <label style={labelN0Style}>Nova Situação</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        {opcoes.map((o) => (
          <button
            key={o.v} type="button" onClick={() => setNovo(o.v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left', padding: '10px 11px', borderRadius: 9,
              border: `1.5px solid ${novo === o.v ? DEV_ACCENT : 'rgba(255,255,255,0.14)'}`,
              background: novo === o.v ? `${DEV_ACCENT}1A` : 'transparent', cursor: 'pointer',
            }}
          >
            <div style={{ width: 16, height: 16, borderRadius: 999, border: `2px solid ${novo === o.v ? DEV_ACCENT : DEV_TXT2}`, background: novo === o.v ? DEV_ACCENT : 'transparent', flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{o.l}</span>
          </button>
        ))}
      </div>
      {novo === 'pago' && (
        <>
          <Field dark label="Data do pagamento"><input style={inputStyle} type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} /></Field>
          <Field dark label="Forma de pagamento"><Segmented value={method} onChange={setMethod} options={METODOS_PAGAMENTO.map((m) => ({ value: m.v, label: m.label }))} /></Field>
        </>
      )}
      {(novo === 'pendente' || novo === 'vencido') && (
        <>
          <Field dark label="Data de vencimento"><input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          {precisaVencimentoFuturo && <p style={{ fontSize: 11.5, color: RED, margin: '-10px 2px 14px' }}>Para ficar "a vencer", o vencimento precisa ser depois de hoje.</p>}
          {precisaVencimentoPassado && <p style={{ fontSize: 11.5, color: RED, margin: '-10px 2px 14px' }}>Para ficar "vencido", o vencimento precisa ser hoje ou antes.</p>}
        </>
      )}
      {(novo === 'perda' || novo === 'cancelada') && <p style={{ fontSize: 11.5, color: DEV_TXT3, margin: '-6px 2px 14px' }}>Essa parcela sai da cobrança e dos indicadores de inadimplência.</p>}
      <Field dark label="Motivo (opcional, fica registrado)"><input style={inputStyle} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: acordo com o cliente" /></Field>
      <button type="button" disabled={!podeSalvar} onClick={salvar}
        style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT, opacity: podeSalvar ? 1 : 0.5, cursor: podeSalvar ? 'pointer' : 'not-allowed' }}>
        <Check size={16} /> Salvar alteração
      </button>
    </Sheet>
  )
}

/* Kit `PaymentLinkSheet`: gera um código fictício de cobrança (Pix/boleto/
   link — nenhum é conectado a um gateway real, nem no Kit) pra copiar ou
   enviar por WhatsApp, com atalho pra já marcar como pago. Mesmo caráter de
   demonstração do Kit — este produto não tem backend de pagamento
   (Backlog #028), igual as outras ações que dependem disso. */
function CobrarParcelaSheet({ tenant, inst, onClose, onMarcarPago }: {
  tenant: TenantKit; inst: Parcela; onClose: () => void; onMarcarPago: (method: string) => void
}) {
  const [method, setMethod] = useState('pix')
  const [gerado, setGerado] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const codigo = method === 'pix'
    ? `00020126MORFOFINP${inst.id}5204000053039865802BR`
    : method === 'boleto'
      ? `34191.79001 01043.510047 91020.150008 8 96060000${Math.round(inst.amount)}`
      : `morfofinp.app/pagar/${inst.id}`
  const texto = `Cobrança MorfoFinP — ${tenant.companyName} — ${fmtBRL(inst.amount)} (vence ${fmtDate(inst.dueDate)}):\n${codigo}`

  return (
    <Sheet dark title="Cobrar / pagar" onClose={onClose}>
      <div style={{ fontSize: 13, color: DEV_TXT2, marginBottom: 14 }}>{tenant.companyName} · {fmtBRL(inst.amount)} · vence {fmtDate(inst.dueDate)}</div>
      <Field dark label="Forma de pagamento">
        <Segmented value={method} onChange={(v) => { setMethod(v); setGerado(false) }} options={[{ value: 'pix', label: 'Pix' }, { value: 'boleto', label: 'Boleto' }, { value: 'link', label: 'Link' }]} />
      </Field>
      {!gerado ? (
        <button type="button" onClick={() => setGerado(true)} style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT }}>
          <Link2 size={16} /> Gerar cobrança
        </button>
      ) : (
        <>
          <div style={{ background: '#141319', border: `1px solid ${DEV_ACCENT}44`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: DEV_TXT3, marginBottom: 6 }}>
              {method === 'pix' ? 'PIX COPIA E COLA' : method === 'boleto' ? 'LINHA DIGITÁVEL' : 'LINK DE PAGAMENTO'}
            </div>
            <div style={{ fontSize: 12.5, color: '#fff', wordBreak: 'break-all', fontFamily: 'monospace' }}>{codigo}</div>
          </div>
          <button
            type="button"
            onClick={() => { void navigator.clipboard?.writeText(codigo); setCopiado(true); setTimeout(() => setCopiado(false), 1500) }}
            style={{ ...primaryBtn, width: '100%', marginBottom: 8, background: 'rgba(255,255,255,0.08)', color: '#fff' }}
          >
            {copiado ? <Check size={16} color={GREEN} /> : <Copy size={16} />} {copiado ? 'Copiado' : 'Copiar'}
          </button>
          {tenant.hasWhatsapp !== false && tenant.phone && (
            <a href={linkWhatsApp(tenant.phone, texto)} target="_blank" rel="noreferrer"
              style={{ ...primaryBtn, width: '100%', marginBottom: 8, background: 'rgba(37,211,102,0.14)', color: '#25D366', textDecoration: 'none' }}>
              <MessageCircle size={16} /> Enviar por WhatsApp
            </a>
          )}
          <button type="button" onClick={() => onMarcarPago(method)} style={{ ...primaryBtn, width: '100%', marginTop: 4, background: GREEN }}>
            <CheckCircle2 size={16} /> Marcar como pago
          </button>
        </>
      )}
    </Sheet>
  )
}

function AbaFinanceiro({ filtroDados }: { filtroDados: FiltroDados }) {
  const { tenants: todos } = usePlatformN0()
  const tenants = filtrarTenantsPorDados(todos, filtroDados)
  const mrrTotal = tenants.reduce((soma, t) => soma + mrrDoTenant(t), 0)
  const cobrando = tenants.filter((t) => mrrDoTenant(t) > 0)
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */
  const [buscaAberta, setBuscaAberta] = useState(false) /* Correção de auditoria — cluster Financeiro x Kit, ver BuscaGlobalN0Sheet */
  const [tenantId, setTenantId] = useState<string | null>(null) /* Correção de auditoria — extrato por tenant, ver DevFinanceiroTenantScreen no Kit */
  const [parcelaDetalhe, setParcelaDetalhe] = useState<Parcela | null>(null)
  const [parcelaAlterar, setParcelaAlterar] = useState<Parcela | null>(null)
  const [parcelaCobrar, setParcelaCobrar] = useState<Parcela | null>(null)
  const linhasFin: ExportRow[] = tenants.map((t) => ({
    companyName: t.companyName, status: statusDoTenant(t), mrr: fmtBRL(mrrDoTenant(t)), plano: planoLabelDoTenant(t),
  }))

  /* Kit L6436-L6437: "Recebido no mês" e "Vencido" — os 2 primeiros
     indicadores de `DevFinanceiroGeralScreen`, que não existiam aqui (só o
     MRR total e a contagem de cobranças ativas, que já não são do Kit
     financeiro geral e sim mais próximas de indicadores fixos). Churn e
     Ticket médio do Kit ficam de fora de propósito — já cobertos pela aba
     Indicadores (ARPA/NRR), que é a mesma fonte de dados; duplicar aqui
     criaria 2 números "quase iguais mas calculados diferente" pra Rafael
     comparar, o problema que a Decisão 53 já corrigiu uma vez neste
     arquivo (ver comentário no topo do arquivo). */
  const hojeMes = new Date().toISOString().slice(0, 7)
  const allInst = tenants.flatMap((t) => (t.billing?.installments ?? []).map((i) => ({ ...i, tenantId: t.id })))
  const recebidoMes = allInst.filter((i) => i.paid && (i.paidDate ?? '').slice(0, 7) === hojeMes).reduce((s, i) => s + i.amount, 0)
  const vencidoInst = allInst.filter((i) => installmentDisplayStatus(i) === 'vencido')
  const vencidoTotal = vencidoInst.reduce((s, i) => s + i.amount, 0)

  const tenant = tenantId ? tenants.find((t) => t.id === tenantId) : undefined

  async function salvarStatusParcela(patch: Partial<Parcela>, novoStatus: StatusParcela, motivo: string) {
    if (!tenant || !parcelaAlterar) return
    await atualizarTenantN0(tenant.id, (x) => ({
      ...x,
      billing: x.billing ? { ...x.billing, installments: x.billing.installments.map((i) => (i.id === parcelaAlterar.id ? { ...i, ...patch } : i)) } : x.billing,
      accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: `Parcela de ${fmtDate(parcelaAlterar.dueDate)} marcada como ${PARCELA_ROTULO[novoStatus]}${motivo ? ` — ${motivo}` : ''}`, ator: 'admin' }],
    }))
    setParcelaAlterar(null)
  }

  async function marcarParcelaPaga(inst: Parcela, method: string) {
    if (!tenant) return
    await atualizarTenantN0(tenant.id, (x) => ({
      ...x,
      billing: x.billing ? { ...x.billing, installments: x.billing.installments.map((i) => (i.id === inst.id ? { ...i, paid: true, paidDate: new Date().toISOString().slice(0, 10), method, cancelada: false, perda: false } : i)) } : x.billing,
      onboarding: 'completo',
      accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: 'Pagamento de parcela confirmado pela Morfo', ator: 'admin' }],
    }))
    setParcelaCobrar(null)
  }

  // ---- Extrato de um tenant (Kit `DevFinanceiroTenantScreen`, L6521) -----
  if (tenant) {
    const installments = (tenant.billing?.installments ?? []).slice().sort((a, b) => b.dueDate.localeCompare(a.dueDate))
    const recebido = installments.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0)
    const emAberto = installments.filter((i) => instCobravelLocal(i)).reduce((s, i) => s + i.amount, 0)
    return (
      <div>
        <TopoN0 titulo={tenant.companyName} subtitulo={`Extrato · ${fmtBRL(tenant.billing?.monthlyValue ?? 0)}/mês`} onVoltarSub={() => setTenantId(null)} />
        {parcelaDetalhe && (
          <DetalheParcelaSheet
            tenant={tenant} inst={parcelaDetalhe} onClose={() => setParcelaDetalhe(null)}
            onAlterarStatus={() => { setParcelaAlterar(parcelaDetalhe); setParcelaDetalhe(null) }}
            onCobrar={() => { setParcelaCobrar(parcelaDetalhe); setParcelaDetalhe(null) }}
          />
        )}
        {parcelaAlterar && <AlterarStatusParcelaSheet tenant={tenant} inst={parcelaAlterar} onClose={() => setParcelaAlterar(null)} onSave={salvarStatusParcela} />}
        {parcelaCobrar && <CobrarParcelaSheet tenant={tenant} inst={parcelaCobrar} onClose={() => setParcelaCobrar(null)} onMarcarPago={(m) => void marcarParcelaPaga(parcelaCobrar, m)} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {installments.length === 0 && <p style={{ fontSize: 12, color: DEV_TXT3 }}>Sem parcelas de cobrança cadastradas.</p>}
          {installments.map((i) => {
            const st = installmentDisplayStatus(i, tenant.billing?.toleranceDays) as StatusParcela
            return (
              <div key={i.id} style={{ background: DEV_CARD, borderRadius: 12, padding: 12 }}>
                <div onClick={() => setParcelaDetalhe(i)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#fff' }}>Vence {fmtDate(i.dueDate)}</div>
                    <div style={{ fontSize: 11.5, color: DEV_TXT2 }}>{fmtBRL(i.amount)}{i.paid ? ` · pago ${fmtDate(i.paidDate)} (${metodoLabel(i.method)})` : ''}</div>
                  </div>
                  <ParcelaBadge status={st} />
                </div>
                {/* 12/09/2026, item 3: quando o CLIENTE avisa que pagou (pelo
                    "Já paguei" da tela de regularização), a parcela fica
                    aguardando ESTA confirmação — e é ela que libera o acesso
                    de volta. Sem servidor não há baixa automática; quando
                    houver (Backlog 028), o gateway ocupa este lugar. */}
                {i.pagamentoInformadoEm && !i.paid && (
                  <div data-testid={`n0-aguardando-${i.id}`} style={{ marginTop: 8, background: alpha(AMBER, 0.14), border: `1px solid ${alpha(AMBER, 0.4)}`, borderRadius: 10, padding: '9px 10px' }}>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, marginBottom: 7 }}>
                      Cliente informou o pagamento em {fmtDate(i.pagamentoInformadoEm)}
                    </div>
                    <button type="button" data-testid={`n0-confirmar-pagamento-${i.id}`}
                      onClick={() => void confirmarPagamento(tenant.id, i.id)}
                      style={{ ...primaryBtn, background: GREEN, padding: '9px 12px', fontSize: 13 }}>
                      <Check size={14} /> Confirmar pagamento e liberar acesso
                    </button>
                  </div>
                )}
                {instCobravelLocal(i) && (
                  <button type="button" onClick={() => setParcelaCobrar(i)} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'none', border: 'none', color: DEV_ACCENT, fontWeight: 700, fontSize: 12, padding: 0, cursor: 'pointer' }}>
                    <Link2 size={13} /> Cobrar
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ background: DEV_CARD, borderRadius: 14, padding: 14, marginTop: 12, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: DEV_TXT2 }}>Recebido</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: GREEN }}>{fmtBRL(recebido)}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: DEV_TXT2 }}>Em aberto</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: emAberto ? AMBER : '#fff' }}>{fmtBRL(emAberto)}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopoN0
        titulo="Financeiro"
        subtitulo="Cobrança das assinaturas dos clientes"
        acoes={<IconesDeTela dark onBuscar={() => setBuscaAberta(true)} onExportar={() => setExportOpen(true)} />}
      />
      {buscaAberta && (
        <BuscaGlobalN0Sheet
          onClose={() => setBuscaAberta(false)}
          onAbrirTenant={(id) => { setBuscaAberta(false); setTenantId(id) }}
          onAbrirParcela={(id) => { setBuscaAberta(false); setTenantId(id) }}
        />
      )}
      {exportOpen && <ExportSheet dark title="Financeiro" filenameBase="morfofinp-n0-financeiro"
        screenColumns={[
          { key: 'companyName', label: 'Ambiente' },
          { key: 'status', label: 'Situação' },
          { key: 'mrr', label: 'Mensalidade' },
        ]}
        screenRows={linhasFin}
        detailColumns={[
          { key: 'companyName', label: 'Ambiente' },
          { key: 'plano', label: 'Plano' },
          { key: 'status', label: 'Situação' },
          { key: 'mrr', label: 'Mensalidade' },
        ]}
        detailRows={linhasFin}
        onClose={() => setExportOpen(false)} />}
      <AvisoDadoFicticio />
      <IndicatorStrip dark style={{ marginBottom: 8 }} items={[
        { label: 'Recebido no mês', value: formatMoneyShort(recebidoMes), full: fmtBRL(recebidoMes), sub: 'confirmado', color: GREEN,
          info: 'Pagamentos de assinatura confirmados no mês corrente.' },
        { label: 'Vencido', value: formatMoneyShort(vencidoTotal), full: fmtBRL(vencidoTotal), sub: `${vencidoInst.length} parcela(s)`, color: vencidoInst.length ? RED : GREEN,
          info: 'Parcelas de assinatura vencidas e não pagas.' },
      ]} />
      {/* Padrão de Interface Morfo (UI), seção 3: grade de cards vira faixa de
          indicadores de uma linha. O valor de dinheiro usa o formato curto
          (seção 4) — na coluna estreita "R$ 7.400,00" viraria "R$ 7,…" e não
          informaria nada; o valor cheio aparece na folha do ⓘ. */}
      <IndicatorStrip dark style={{ marginBottom: ESPACO_LINHA }} items={[
        { label: 'MRR total', value: formatMoneyShort(mrrTotal), full: fmtBRL(mrrTotal), sub: 'por mês', color: GREEN,
          info: 'Soma das mensalidades de todos os ambientes que estão cobrando agora.' },
        { label: 'Cobranças ativas', value: cobrando.length, sub: `de ${tenants.length} ambientes`, color: '#fff',
          info: 'Quantos ambientes têm mensalidade sendo cobrada, do total exibido pelo filtro atual.' },
      ]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tenants.map((t) => {
          const status = statusDoTenant(t)
          const temParcelas = !!(t.billing?.installments?.length)
          return (
            <div
              key={t.id}
              onClick={temParcelas ? () => setTenantId(t.id) : undefined}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: DEV_CARD,
                borderRadius: 12,
                padding: '11px 14px',
                cursor: temParcelas ? 'pointer' : 'default',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.companyName}
                </div>
                <div style={{ fontSize: 11, color: DEV_TXT2 }}>{planoLabelDoTenant(t)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: status === 'inadimplente' ? STATUS_COR.inadimplente : '#fff' }}>
                  {fmtBRL(mrrDoTenant(t))}
                </div>
                {temParcelas && <ChevronRightIcon width={14} height={14} color={DEV_TXT2} />}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Auditoria do N0 — filtros do Kit (12/09/2026, item 19 do Rafael: "Auditoria
   completamente diferente do Kit, implementar os filtros do print").
   Transcrição de `AuditoriaScreen` (Kit L5662-L5745): busca por texto, filtro
   por Cliente, chips de "Tipo de alteração", e um disclosure "Filtros
   avançados" com Usuário, Origem (N0 × N1) e período De/Até — mais
   `TotalRegistros` e o badge de tipo/ator em cada linha.

   ADAPTAÇÃO (mesma de sempre, ver `kitPlatform.ts`): o Kit lê
   `platform.auditLog` (log global separado); aqui a fonte é o
   `tenants[].accessLog`, que já é o log unificado deste produto. Os campos
   `tipo`/`atorNome`/`atorUserId` entraram no `RegistroAcesso` nesta rodada —
   registro antigo, sem eles, aparece como "Geral"/"Admin Morfo", nunca some
   da lista. O "Exibir/Ocultar — manter últimos X" do Kit fica de fora: este
   painel nunca teve esse parâmetro de contagem visível para a auditoria, e
   inventá-lo aqui criaria um parâmetro sem tela que o configure. */
function AbaAuditoria() {
  const platform = usePlatformN0()
  const { tenants } = platform
  const [query, setQuery] = useState('')
  const [tenantFiltro, setTenantFiltro] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState<string[]>([])
  const [atorFiltro, setAtorFiltro] = useState<string[]>([])
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')
  const [avancadosAbertos, setAvancadosAbertos] = useState(false)
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */

  const eventos = tenants
    .flatMap((t) => (t.accessLog ?? []).map((ev) => ({ ...ev, tenant: t.companyName, tenantId: t.id })))
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))

  /* Kit L5686-L5689: as pessoas do N0 e as de TODOS os N1, com a empresa no
     rótulo pra distinguir homônimos entre ambientes diferentes. */
  const usuariosOptions = [
    ...(platform.devUsers ?? []).map((u) => ({ v: u.id, l: `${u.name} (Morfo/N0)` })),
    ...tenants.flatMap((t) => (t.users ?? []).map((u) => ({ v: u.id, l: `${u.name} — ${t.companyName} (N1)` }))),
  ]

  const q = query.trim().toLowerCase()
  const filtrados = eventos.filter((ev) => {
    if (tenantFiltro && ev.tenantId !== tenantFiltro) return false
    if (tipoFiltro.length && !tipoFiltro.includes(ev.tipo ?? 'geral')) return false
    if (atorFiltro.length && !atorFiltro.includes(ev.ator ?? 'admin')) return false
    if (usuarioFiltro && ev.atorUserId !== usuarioFiltro) return false
    if (dataDe && ev.ts.slice(0, 10) < dataDe) return false
    if (dataAte && ev.ts.slice(0, 10) > dataAte) return false
    if (q && !(ev.action.toLowerCase().includes(q) || ev.tenant.toLowerCase().includes(q))) return false
    return true
  })

  const linhasAud: ExportRow[] = filtrados.map((ev) => ({
    ts: ev.ts.replace('T', ' ').slice(0, 16), tenant: ev.tenant,
    tipo: AUDIT_TIPOS[ev.tipo ?? 'geral'], ator: (ATOR_INFO[ev.ator ?? 'admin'] ?? ATOR_INFO.admin).l,
    action: ev.action,
  }))
  const colunasAud = [
    { key: 'ts', label: 'Quando' },
    { key: 'tenant', label: 'Ambiente' },
    { key: 'tipo', label: 'Tipo' },
    { key: 'ator', label: 'Origem' },
    { key: 'action', label: 'Ação' },
  ]
  const avancadosAtivos = !!(usuarioFiltro || atorFiltro.length || dataDe || dataAte)
  const filtroAtivo = avancadosAtivos || !!tenantFiltro || !!q || tipoFiltro.length > 0
  const campoEscuro: React.CSSProperties = { ...inputStyle, background: DEV_CARD, color: '#fff', border: 'none' }

  return (
    <div>
      <TopoN0
        titulo="Auditoria"
        subtitulo="Log de ações do painel e dos clientes"
        acoes={<IconesDeTela dark onExportar={() => setExportOpen(true)} />}
      />
      {exportOpen && <ExportSheet dark title="Auditoria" filenameBase="morfofinp-n0-auditoria"
        screenColumns={colunasAud} screenRows={linhasAud}
        detailColumns={colunasAud} detailRows={linhasAud}
        onClose={() => setExportOpen(false)} />}
      <AvisoDadoFicticio />
      <p style={{ fontSize: 11.5, color: DEV_TXT2, margin: '12px 2px 10px', lineHeight: 1.5 }}>
        Todos os logs de alteração, do N0 (painel administrativo) e do N1 (cada cliente no seu próprio
        ambiente) — incluindo o que o suporte fizer dentro do ambiente de um cliente.
      </p>
      <div style={{ marginBottom: 10 }}>
        <SearchBox dark value={query} onChange={setQuery} placeholder="Buscar por texto da ação ou empresa" />
      </div>
      <Field dark label="Cliente">
        <select value={tenantFiltro} onChange={(e) => setTenantFiltro(e.target.value)} style={campoEscuro}>
          <option value="">Todos os clientes</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.companyName}</option>)}
        </select>
      </Field>
      <div style={{ marginBottom: 10 }}>
        <MultiFilterChips dark title="Tipo de alteração" allLabel="Todas"
          options={Object.entries(AUDIT_TIPOS).map(([v, l]) => ({ v, l }))}
          selected={tipoFiltro} setSelected={(f: (sel: string[]) => string[]) => setTipoFiltro(f)} />
      </div>
      <div style={{ marginBottom: 6 }}>
        <button type="button" onClick={() => setAvancadosAbertos((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer' }}>
          <Filter size={14} color={DEV_TXT2} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', flex: 1, textAlign: 'left' }}>
            Filtros avançados{avancadosAtivos ? ' · ativos' : ''}
          </span>
          <ChevronRight size={16} color={DEV_TXT2} style={{ transform: avancadosAbertos ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>
        {avancadosAbertos && <>
          <Field dark label="Usuário">
            <select value={usuarioFiltro} onChange={(e) => setUsuarioFiltro(e.target.value)} style={campoEscuro}>
              <option value="">Todos os usuários</option>
              {usuariosOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </Field>
          <div style={{ marginBottom: 10 }}>
            <MultiFilterChips dark title="Origem (N0 × N1)" allLabel="Todas"
              options={[{ v: 'admin', l: 'Morfo' }, { v: 'n1', l: 'Cliente (N1)' }, { v: 'suporte', l: 'Suporte (dentro do ambiente)' }]}
              selected={atorFiltro} setSelected={(f: (sel: string[]) => string[]) => setAtorFiltro(f)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
            <Field dark label="De"><input type="date" style={campoEscuro} value={dataDe} onChange={(e) => setDataDe(e.target.value)} /></Field>
            <Field dark label="Até"><input type="date" style={campoEscuro} value={dataAte} onChange={(e) => setDataAte(e.target.value)} /></Field>
          </div>
        </>}
      </div>
      <TotalRegistros dark n={filtrados.length} label={filtrados.length === 1 ? 'registro' : 'registros'} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
        {filtrados.length === 0 && (
          <div style={{ fontSize: 13.5, color: DEV_TXT2, textAlign: 'center', padding: '24px 0' }}>
            {eventos.length === 0 ? 'Nenhum evento registrado ainda.' : `Nenhum registro encontrado.${filtroAtivo ? ' Ajuste a busca ou os filtros.' : ''}`}
          </div>
        )}
        {filtrados.map((ev) => {
          const info = ATOR_INFO[ev.ator ?? 'admin'] ?? ATOR_INFO.admin
          return (
            <div key={ev.id} style={{ background: DEV_CARD, borderRadius: 12, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: DEV_ACCENT, background: alpha(DEV_ACCENT, 13.3), padding: '2px 7px', borderRadius: 999 }}>{AUDIT_TIPOS[ev.tipo ?? 'geral']}</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: info.cor, background: alpha(info.cor, 13.3), padding: '2px 7px', borderRadius: 999 }}>{info.l}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.tenant}</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#C9C4D4' }}>{ev.action}</div>
              <div style={{ fontSize: 10.5, color: DEV_TXT2, marginTop: 3 }}>{ev.ts.replace('T', ' ').slice(0, 16)}{ev.atorNome ? ` · ${ev.atorNome}` : ''}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Parâmetros: sub-telas reais e funcionais (08/09/2026, G59) ----------

/* Linha de marcação (checkbox + rótulo + explicação) do formulário de plano —
   é o `toggleRow` do Kit (`EditPlanoSheet`, L1379), com as cores do N0 deste
   projeto. Fica aqui e não em `kitBase` porque só o N0 usa esse padrão de
   marcação com hint; o resto do app usa `Toggle`. */
function MarcacaoN0({ marcado, onAlternar, rotulo, hint, cor = GREEN }: {
  marcado: boolean; onAlternar: () => void; rotulo: string; hint?: string; cor?: string
}) {
  return (
    <button type="button" onClick={onAlternar} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${marcado ? cor : DEV_TXT2}`, background: marcado ? cor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, color: '#fff', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>{marcado && '✓'}</div>
      <div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{rotulo}</span>
        {hint && <div style={{ fontSize: 11, color: DEV_TXT2, marginTop: 1, lineHeight: 1.4 }}>{hint}</div>}
      </div>
    </button>
  )
}

/* Gerenciar Planos — formulário completo, campo a campo igual ao
   `EditPlanoSheet` do Kit (L1370-L1421), portado em 10/09/2026 a pedido do
   Rafael ("quero todos os parâmetros iguais com todos os recursos de
   preenchimento igual ao kit e que eles efetivamente funcionem").

   O que veio do Kit e não existia aqui: Porte, "Plano gratuito, com validade"
   + Validade (dias) no lugar do valor mensal, Limite de usuários, Descrição
   curta, os dois "Acesso liberado neste plano", Informações adicionais e a
   Prévia automática da tela de venda.

   Uma ÚNICA divergência deliberada, e ela é do produto, não do formulário: o
   Kit tem "Limite de registros — Entidade A", que no MorfoFinP não existe —
   não há teto de lançamentos (app 100% local, sem custo por registro). Por
   isso o campo não foi criado nem entra na prévia (ver `recursosAutomaticos`
   em `planos.ts`). */
function SubParametrosPlanos({ onVoltarSub }: { onVoltarSub: () => void }) {
  const planos = useTodosPlanos()
  const [editandoId, setEditandoId] = useState<number | 'novo' | null>(null)
  const [nome, setNome] = useState('')
  const [porte, setPorte] = useState<'Pequeno' | 'Médio' | 'Grande'>('Pequeno')
  const [gratuito, setGratuito] = useState(false)
  const [validadeDias, setValidadeDias] = useState('15')
  const [valorMensal, setValorMensal] = useState(formatarMoeda(0))
  const [descricaoCurta, setDescricaoCurta] = useState('')
  const [funcionalidades, setFuncionalidades] = useState('')
  const [adicionais, setAdicionais] = useState('')
  const [destaque, setDestaque] = useState(false)
  const [expDetalhada, setExpDetalhada] = useState(false)
  const [layoutPersonalizado, setLayoutPersonalizado] = useState(false)

  function abrirEdicao(p: Plano) {
    setEditandoId(p.id ?? null)
    setNome(p.nome)
    setPorte(p.porte ?? PLANO_PADRAO_KIT.porte)
    setGratuito(Boolean(p.gratuito))
    setValidadeDias(p.validadeDias ? String(p.validadeDias) : '15')
    setValorMensal(formatarMoeda(p.valorMensal))
    setDescricaoCurta(p.descricaoCurta ?? '')
    setFuncionalidades(p.funcionalidades.join('\n'))
    setAdicionais('')
    setDestaque(Boolean(p.destaque))
    setExpDetalhada(Boolean(p.restricoes?.exportacaoDetalhada))
    setLayoutPersonalizado(Boolean(p.restricoes?.layoutPersonalizado))
  }
  function abrirNovo() {
    setEditandoId('novo')
    setNome('')
    setPorte(PLANO_PADRAO_KIT.porte)
    setGratuito(false)
    setValidadeDias('15')
    setValorMensal('0')
    setDescricaoCurta('')
    setFuncionalidades('')
    setAdicionais('')
    setDestaque(false)
    setExpDetalhada(false)
    setLayoutPersonalizado(false)
  }

  // Lista final de funcionalidades = "Funcionalidades" + "Informações
  // adicionais" (o Kit guarda as duas no MESMO campo `features` — aqui elas
  // são dois textareas que se juntam no salvar, que é o comportamento que o
  // texto de ajuda do próprio Kit descreve: "o que você escrever aqui entra
  // como complemento, no fim da lista").
  const listaFuncionalidades = [...funcionalidades.split('\n'), ...adicionais.split('\n')]
    .map((f) => f.trim())
    .filter(Boolean)

  /* 12/09/2026 (Rafael: "aqui nos planos o botão salvar não está habilitando
     quando edito as permissões, só quando marco plano gratuito, não deveria
     ser assim"). O Kit exige `valorMensal > 0` ou "gratuito com validade" pra
     habilitar o Salvar — com os planos semeados em R$ 0,00, mexer só nos
     acessos deixava o botão morto e a edição se perdia. Agora o único
     obrigatório é o NOME (o que de fato identifica o plano); um plano sem
     valor e sem validade fica salvo, com o aviso abaixo do botão dizendo
     como ele vai aparecer pro cliente. */
  const podeSalvar = Boolean(nome.trim())
  const semPreco = !gratuito && !(paraNumero(valorMensal) > 0)

  async function salvar() {
    if (!podeSalvar) return
    const dados = {
      nome: nome.trim(),
      porte,
      gratuito,
      validadeDias: gratuito ? Number(validadeDias) : null,
      valorMensal: gratuito ? 0 : paraNumero(valorMensal),
      descricaoCurta: descricaoCurta.trim(),
      funcionalidades: listaFuncionalidades,
      destaque,
      restricoes: { exportacaoDetalhada: expDetalhada, layoutPersonalizado: layoutPersonalizado },
      ativo: true,
    }
    if (editandoId === 'novo') {
      await criarPlano(dados)
    } else if (typeof editandoId === 'number') {
      await atualizarPlano(editandoId, dados)
    }
    setEditandoId(null)
  }

  if (editandoId !== null) {
    const previa = recursosAutomaticos({
      restricoes: { exportacaoDetalhada: expDetalhada, layoutPersonalizado: layoutPersonalizado },
      funcionalidades: listaFuncionalidades,
    })
    return (
      <div>
        <TopoN0 titulo={editandoId === 'novo' ? 'Novo plano' : 'Editar plano'} onVoltarSub={() => setEditandoId(null)} />
        <label style={labelN0Style} htmlFor="plano-nome">Nome do Plano</label>
        <input id="plano-nome" style={campoN0Style} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Plano Médio" />

        <label style={labelN0Style}>Porte</label>
        <Segmented
          value={porte}
          onChange={(v) => setPorte(v)}
          options={[{ value: 'Pequeno' as const, label: 'Pequeno' }, { value: 'Médio' as const, label: 'Médio' }, { value: 'Grande' as const, label: 'Grande' }]}
        />

        <div style={{ marginTop: 14 }}>
          <MarcacaoN0
            marcado={gratuito}
            onAlternar={() => setGratuito((v) => !v)}
            rotulo="Plano gratuito, com validade"
            hint="Sem cobrança — o ambiente expira sozinho depois da validade, igual um teste (o cliente pode ativar direto pela venda, sem passar por pagamento)."
          />
        </div>

        {gratuito ? (
          <>
            <label style={labelN0Style} htmlFor="plano-validade">Validade (dias)</label>
            <input id="plano-validade" type="number" min="1" style={campoN0Style} value={validadeDias} onChange={(e) => setValidadeDias(e.target.value)} />
          </>
        ) : (
          <>
            {/* Item 11 da lista de 12/09/2026: "campo de valor do plano com
                máscara em todas as telas". Passa a usar a MESMA máscara de
                moeda do resto do app (`formatoMoeda.ts`) — digitar 9900 vira
                99,00, e não existe mais a chance de gravar "99.9" ou "99,9,9". */}
            <label style={labelN0Style} htmlFor="plano-valor">Valor mensal (R$)</label>
            <input id="plano-valor" inputMode="numeric" style={campoN0Style} value={valorMensal}
              onChange={(e) => setValorMensal(aplicarMascaraValor(e.target.value))} />
          </>
        )}

        <label style={labelN0Style} htmlFor="plano-desc">Descrição Curta</label>
        <input id="plano-desc" style={campoN0Style} value={descricaoCurta} onChange={(e) => setDescricaoCurta(e.target.value)} placeholder="Uma frase sobre pra quem é esse plano" />

        <label style={labelN0Style} htmlFor="plano-func">Funcionalidades (uma por linha)</label>
        <textarea id="plano-func" style={{ ...campoN0Style, minHeight: 90, fontFamily: 'inherit', resize: 'vertical' }} value={funcionalidades} onChange={(e) => setFuncionalidades(e.target.value)} placeholder={'5 usuários\nSuporte prioritário'} />

        <label style={labelN0Style}>Acesso Liberado Neste Plano</label>
        <MarcacaoN0
          marcado={expDetalhada}
          onAlternar={() => setExpDetalhada((v) => !v)}
          rotulo="Exportação detalhada"
          hint="Em toda tela com exportação, libera a opção “Versão detalhada” (CSV/PDF com todos os dados de cada registro), além da versão simples que sempre fica disponível."
        />
        <MarcacaoN0
          marcado={layoutPersonalizado}
          onAlternar={() => setLayoutPersonalizado((v) => !v)}
          rotulo="Layout e menus personalizados"
          hint="Libera, na engrenagem do cliente, a tela “Layout e Menus”: modo de navegação, ordem dos menus e escolher menu a menu se fica no rodapé fixo ou dentro do “⋮” — por cima do padrão definido pela Morfo."
        />

        <label style={labelN0Style} htmlFor="plano-adicionais">Informações adicionais (opcional, uma por linha)</label>
        <textarea id="plano-adicionais" style={{ ...campoN0Style, minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }} value={adicionais} onChange={(e) => setAdicionais(e.target.value)} placeholder={'Suporte prioritário\nOnboarding assistido'} />
        <p style={{ fontSize: 11, color: DEV_TXT2, margin: '6px 2px 0', lineHeight: 1.4 }}>
          A lista de recursos que aparece pro cliente é montada sozinha a partir dos campos acima (limites e acessos).
          O que você escrever aqui entra como complemento, no fim da lista.
        </p>

        <MarcacaoN0
          marcado={destaque}
          onAlternar={() => setDestaque((v) => !v)}
          rotulo="Destacar como “mais escolhido” na venda"
          cor={DEV_ACCENT}
        />

        <label style={labelN0Style}>Prévia — como aparece na tela de venda</label>
        <div style={{ background: DEV_CARD, borderRadius: 12, padding: 12 }}>
          {previa.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#C9C4D4', padding: '2px 0' }}>
              <span style={{ color: GREEN, fontWeight: 900 }}>✓</span> {f}
            </div>
          ))}
        </div>

        <button type="button" onClick={salvar} disabled={!podeSalvar} style={{ width: '100%', marginTop: 16, background: DEV_ACCENT, border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: podeSalvar ? 1 : 0.5 }}>
          Salvar plano
        </button>
        {!podeSalvar && (
          <p style={{ fontSize: 11, color: DEV_TXT2, margin: '6px 2px 0' }}>Informe o nome do plano.</p>
        )}
        {podeSalvar && semPreco && (
          <p style={{ fontSize: 11, color: DEV_TXT2, margin: '6px 2px 0' }}>
            Sem valor mensal e sem validade: este plano vai aparecer como <strong style={{ color: '#fff' }}>Grátis</strong> pro cliente, sem prazo pra expirar.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <TopoN0 titulo="Gerenciar Planos" subtitulo="Catálogo consumido por Minha Assinatura (N1) e Planos (site)" onVoltarSub={onVoltarSub} />
      <p style={{ fontSize: 11, color: DEV_TXT3, lineHeight: 1.6, marginTop: 0, marginBottom: 14 }}>
        Placeholder de conteúdo comercial — nome/preço continuam inventados até existir definição real e backend
        (Backlog #028). O que mudou: agora é editável aqui, não fixo em código.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {planos.map((p) => (
          <div key={p.id} style={{ background: DEV_CARD, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong style={{ fontSize: 13, color: p.ativo ? '#fff' : DEV_TXT3 }}>
                {p.nome} {p.destaque && <span style={{ color: DEV_ACCENT }}>★</span>} {!p.ativo && '(inativo)'}
              </strong>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: DEV_TXT2, whiteSpace: 'nowrap' }}>
                {p.gratuito ? `Grátis · ${p.validadeDias ?? 0} dias` : p.valorMensal > 0 ? `R$ ${p.valorMensal.toFixed(2)}` : 'Grátis'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: DEV_TXT3, marginTop: 3 }}>
              {p.porte ?? PLANO_PADRAO_KIT.porte}
              {p.descricaoCurta ? ` · ${p.descricaoCurta}` : ''}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={() => abrirEdicao(p)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 11.5, cursor: 'pointer' }}>
                Editar
              </button>
              <button
                type="button"
                onClick={() => (p.ativo ? p.id !== undefined && inativarPlano(p.id) : p.id !== undefined && reativarPlano(p.id))}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 11.5, cursor: 'pointer' }}
              >
                {p.ativo ? 'Inativar' : 'Reativar'}
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={abrirNovo} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: `1px dashed ${DEV_ACCENT}66`, borderRadius: 10, padding: 12, color: DEV_ACCENT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        + Novo plano
      </button>
    </div>
  )
}


// N0 → Parâmetros → Site MorfoFinP (09/09/2026, Decisão 49): grupo "Site
// {PRODUTO}" do Kit (L2146-L2343), portado literalmente em
// `SiteParametrosN0.tsx` — este wrapper é só o título/voltar no padrão desta
// tela (o `telaGrupo` do Kit).
function SubParametrosSite({ onVoltarSub }: { onVoltarSub: () => void }) {
  return (
    <div>
      <TopoN0 titulo="Site MorfoFinP" subtitulo="Parâmetros do site deslogado — valores padrão do Kit (MorfoMod) até você alterar" onVoltarSub={onVoltarSub} />
      <SiteParametrosN0 />
    </div>
  )
}

// REESCRITO em 10/09/2026 (Decisão 54 Parte B — login virou multiusuário de
// verdade): antes gerenciava `db.usuariosN0` (nome/e-mail, registro
// desconectado do login real — o próprio comentário antigo desta tela dizia
// "não um mecanismo de autenticação multiusuário de verdade"). Agora
// gerencia `platformN0.devUsers` — a MESMA lista que `LoginView.tsx`/
// `authN0.ts` usam pra autenticar de verdade (login/senha reais, perfil de
// acesso, status). `db.usuariosN0` fica retirado desta tela (a tabela em si
// segue no schema, sem uso — não é removida do Dexie, só não gerenciada mais
// por aqui, mesmo padrão de "campo aditivo abandonado" já usado no projeto).
/* Formulário de um administrador Morfo — usado em DOIS lugares: por
   "Usuários Morfo" (a lista, onde a Morfo cadastra/edita qualquer
   administrador) e por "Meus Dados" (11/09/2026, pedido do Rafael: "usuário
   adm morfo não tá permitindo editar dados e deve permitir ... dados dele
   como usuário"), onde o administrador logado edita o próprio cadastro sem
   passar pela lista. Mesma tela, mesmos campos e mesmas validações; muda só
   quem pode trocar o perfil de acesso (em Meus Dados o campo aparece
   somente leitura — mudar o próprio nível é decisão de quem administra a
   plataforma, não de quem está logado). */
function FormularioDevUser({ alvo, devUsers, tenants, perfis, podeTrocarPerfil = true, titulo, onFechar }: {
  alvo: DevUserN0 | 'novo'
  devUsers: DevUserN0[]
  tenants: TenantKit[]
  perfis: ReturnType<typeof perfisPadraoN0>
  podeTrocarPerfil?: boolean
  titulo: string
  onFechar: () => void
}) {
  const base = alvo === 'novo' ? null : alvo
  const [nome, setNome] = useState(base?.name ?? '')
  const [login, setLogin] = useState(base?.login ?? '')
  const [senha, setSenha] = useState(base?.senha ?? '')
  const [perfilId, setPerfilId] = useState(base?.perfilId || 'admin')
  const [cpf, setCpf] = useState(base?.cpf ?? '')
  const [email, setEmail] = useState(base?.email ?? '')
  const [telefone, setTelefone] = useState(base?.phone ?? '')
  const [endereco, setEndereco] = useState<Endereco>(normalizeAddress(base?.address ?? null))
  const [erro, setErro] = useState('')

  /* 11/09/2026 — Rafael, usando a build 036: "usuário adm morfo não tá
     permitindo editar dados e deve permitir". Causa real: a Decisão 58 portou
     a regra de gravação do Kit (`canSave`, L1485), que EXIGE CPF + e-mail +
     telefone + endereço completo pra salvar. O administrador padrão (o do
     Kit, `morfomod`) não tem nenhum desses campos — então abrir "Editar",
     trocar o nome ou a senha e salvar sempre parava em "CPF inválido.". Na
     prática, o acesso do painel era ineditável.
     ADAPTAÇÃO: obrigatórios aqui são só nome, login e senha (o que de fato
     forma uma credencial). CPF, e-mail, telefone e endereço continuam no
     formulário e continuam validados — mas só quando preenchidos, e um campo
     vazio nunca impede de salvar. O Kit exige porque o cadastro dele alimenta
     documento fiscal; aqui não alimenta nada disso ainda. */
  const cpfOk = !cpf.trim() || validaCPF(cpf)
  const telOk = !telefone.trim() || validaTelefone(telefone)
  const mailOk = !email.trim() || validaEmailEnvio(email)

  // Última proteção de admin (G59/Kit `contaAdminsAtivos`): nunca deixar o
  // painel N0 sem NENHUM administrador ativo — sem backend/recuperação de
  // senha de verdade, isso trancaria o próprio Rafael pra fora do painel.
  function ehUltimoAdminAtivo(u: DevUserN0): boolean {
    return (u.perfilId || 'admin') === 'admin' && u.status !== 'inativo' && contaAdminsAtivos(devUsers) <= 1
  }

  async function salvar() {
    const loginN = login.trim().toLowerCase()
    if (!nome.trim() || !loginN || !senha.trim()) { setErro('Preencha nome, login e senha.'); return }
    if (!cpfOk) { setErro('CPF inválido — corrija ou deixe o campo vazio.'); return }
    if (!mailOk) { setErro('E-mail inválido — corrija ou deixe o campo vazio.'); return }
    if (!telOk) { setErro('Telefone inválido (use DDD + número) — corrija ou deixe o campo vazio.'); return }
    if (loginJaEmUsoGlobalmente({ devUsers, tenants }, loginN, { devUserId: base?.id })) {
      setErro('Esse login já está em uso (N0 ou N1).'); return
    }
    if (base && ehUltimoAdminAtivo(base) && perfilId !== 'admin') {
      setErro('Este é o único administrador ativo — mude o perfil de outro usuário antes, ou crie um 2º administrador.'); return
    }
    const campos = { name: nome.trim(), login: loginN, senha, perfilId, cpf: cpf.trim(), email: email.trim(), phone: telefone.trim(), address: endereco }
    await atualizarDevUsersN0((lista) => {
      if (!base) return [...lista, { id: `dev-${uid()}`, ...campos, status: 'ativo', createdAt: new Date().toISOString() }]
      return lista.map((u) => (u.id === base.id ? { ...u, ...campos } : u))
    })
    onFechar()
  }

  return (
    <div>
      <TopoN0 titulo={titulo} onVoltarSub={onFechar} />
      <label style={labelN0Style} htmlFor="devuser-nome">Nome Completo</label>
      <input id="devuser-nome" style={campoN0Style} value={nome} onChange={(e) => setNome(e.target.value)} />
      <label style={labelN0Style} htmlFor="devuser-cpf">CPF (opcional)</label>
      <input id="devuser-cpf" style={campoN0Style} value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
      {cpf.trim() !== '' && !cpfOk && <div style={{ fontSize: 11, color: '#F5615C', fontWeight: 700, marginTop: 4 }}>CPF inválido</div>}
      <label style={labelN0Style} htmlFor="devuser-email">E-mail (opcional)</label>
      <input id="devuser-email" type="email" style={campoN0Style} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@morfo.com.br" />
      {email.trim() !== '' && !mailOk && <div style={{ fontSize: 11, color: '#F5615C', fontWeight: 700, marginTop: 4 }}>E-mail inválido</div>}
      <label style={labelN0Style} htmlFor="devuser-tel">Telefone (opcional)</label>
      <input id="devuser-tel" style={campoN0Style} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" />
      {telefone.trim() !== '' && !telOk && <div style={{ fontSize: 11, color: '#F5615C', fontWeight: 700, marginTop: 4 }}>Telefone inválido (use DDD + número)</div>}
      <SectionLabel dark>Endereço (opcional)</SectionLabel>
      <AddressFieldsBasic dark value={endereco} onChange={setEndereco} />
      <label style={labelN0Style} htmlFor="devuser-login">Usuário (login)</label>
      <input id="devuser-login" style={campoN0Style} value={login} onChange={(e) => setLogin(e.target.value)} />
      <label style={labelN0Style} htmlFor="devuser-senha">Senha</label>
      <input id="devuser-senha" style={campoN0Style} value={senha} onChange={(e) => setSenha(e.target.value)} />
      <label style={labelN0Style} htmlFor="devuser-perfil">Perfil de Acesso</label>
      {podeTrocarPerfil ? (
        <select id="devuser-perfil" style={campoN0Style} value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
          {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      ) : (
        <>
          <input id="devuser-perfil" style={{ ...campoN0Style, opacity: 0.7 }} value={perfis.find((p) => p.id === perfilId)?.nome ?? perfilId} readOnly />
          <div style={{ fontSize: 11, color: DEV_TXT3, marginTop: 4, lineHeight: 1.5 }}>
            O seu próprio nível de acesso é definido em Parâmetros › Usuários Morfo.
          </div>
        </>
      )}
      {erro && <div style={{ fontSize: 12, color: '#F5615C', marginTop: 10, fontWeight: 700 }}>{erro}</div>}
      <button type="button" data-testid="n0-salvar-usuario" onClick={() => void salvar()} style={{ width: '100%', marginTop: 16, background: DEV_ACCENT, border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        Salvar
      </button>
    </div>
  )
}

/* N0 → Parâmetros → Meus Dados (11/09/2026): o administrador logado editando
   o próprio cadastro — o equivalente, no painel da Morfo, ao "Meus Dados" que
   o ambiente do cliente já tinha. Antes disso o único caminho era Usuários
   Morfo → achar a si mesmo na lista → Editar. */
function SubParametrosMeusDadosN0({ onVoltarSub }: { onVoltarSub: () => void }) {
  const platform = usePlatformN0()
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  const devUsers = platform.devUsers ?? []
  const perfis = platform.perfisMorfo ?? perfisPadraoN0()
  const eu = devUsers.find((u) => u.id === config?.loggedDevUserId) ?? devUsers[0]
  if (!eu) {
    return (
      <div>
        <TopoN0 titulo="Meus Dados" onVoltarSub={onVoltarSub} />
        <p style={{ fontSize: 12.5, color: DEV_TXT3, lineHeight: 1.6 }}>
          Não foi possível identificar o administrador logado nesta sessão. Saia e entre de novo para editar os seus dados.
        </p>
      </div>
    )
  }
  return <FormularioDevUser alvo={eu} devUsers={devUsers} tenants={platform.tenants} perfis={perfis} podeTrocarPerfil={false} titulo="Meus Dados" onFechar={onVoltarSub} />
}

/* Correção de auditoria (cluster Parâmetros x Kit, 11/09/2026): o Kit sempre
   oferece "Excluir" na lista de Usuários Morfo (App.jsx L2144, com
   confirmação — `ConfirmDeleteSheet`, L2160), protegido só por posição
   (`idx > 0`, não pode excluir o 1º da lista). Aqui não existia NENHUM jeito
   de remover um administrador cadastrado por engano — só Editar/Ativo-
   Inativo. Mesma casca de confirmação em 2 passos já usada em
   `ExcluirClienteSheet` (padrão estabelecido neste arquivo), com uma trava
   mais robusta que a do Kit: nunca deixa excluir o ÚLTIMO administrador
   ATIVO (`contaAdminsAtivos`, já usado pra bloquear inativar/trocar perfil)
   — sem backend/recuperação de senha de verdade, excluir por posição fixa
   poderia trancar o próprio Rafael fora do painel se ele reordenasse ou
   criasse usuários. */
function ExcluirDevUsuarioSheet({ usuario, onClose, onExcluido }: { usuario: DevUserN0; onClose: () => void; onExcluido: () => void }) {
  const [entendi, setEntendi] = useState(false)

  async function confirmar() {
    await atualizarDevUsersN0((lista) => lista.filter((u) => u.id !== usuario.id))
    onExcluido()
  }

  return (
    <Sheet dark title="Excluir usuário" onClose={onClose}>
      <p style={{ fontSize: 13.5, color: '#C9C4D4', lineHeight: 1.5, marginTop: 0 }}>
        Excluir {usuario.name}? Ele perde o acesso ao painel imediatamente. Essa ação não pode ser desfeita.
      </p>
      <button type="button" onClick={() => setEntendi((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${entendi ? RED : '#9B96A8'}`, background: entendi ? RED : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {entendi && <Check size={13} color="#fff" />}
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', textAlign: 'left' }}>Entendo que essa ação não pode ser desfeita</span>
      </button>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={onClose} style={{ ...primaryBtn, flex: 1, background: 'rgba(255,255,255,0.08)', color: '#fff' }}>Cancelar</button>
        <button type="button" disabled={!entendi} onClick={() => void confirmar()} style={{ ...primaryBtn, flex: 1, background: RED, opacity: entendi ? 1 : 0.5, cursor: entendi ? 'pointer' : 'not-allowed' }}>
          <Trash2 size={16} /> Excluir
        </button>
      </div>
    </Sheet>
  )
}

function SubParametrosUsuarios({ onVoltarSub }: { onVoltarSub: () => void }) {
  const platform = usePlatformN0()
  const devUsers = platform.devUsers ?? []
  const perfis = platform.perfisMorfo ?? perfisPadraoN0()
  const [editando, setEditando] = useState<DevUserN0 | 'novo' | null>(null)
  const [excluindo, setExcluindo] = useState<DevUserN0 | null>(null)
  const [erro, setErro] = useState('')

  function ehUltimoAdminAtivo(u: DevUserN0): boolean {
    return (u.perfilId || 'admin') === 'admin' && u.status !== 'inativo' && contaAdminsAtivos(devUsers) <= 1
  }

  async function alternarAtivo(u: DevUserN0) {
    if (u.status !== 'inativo' && ehUltimoAdminAtivo(u)) { setErro('Não é possível inativar o único administrador ativo.'); return }
    await atualizarDevUsersN0((lista) => lista.map((x) => (x.id === u.id ? { ...x, status: x.status === 'inativo' ? 'ativo' : 'inativo' } : x)))
  }

  function pedirExclusao(u: DevUserN0) {
    if (ehUltimoAdminAtivo(u)) { setErro('Não é possível excluir o único administrador ativo — crie ou libere outro antes.'); return }
    setErro('')
    setExcluindo(u)
  }

  if (editando !== null) {
    return <FormularioDevUser alvo={editando} devUsers={devUsers} tenants={platform.tenants} perfis={perfis}
      titulo={editando === 'novo' ? 'Novo usuário Morfo' : 'Editar usuário Morfo'} onFechar={() => setEditando(null)} />
  }

  return (
    <div>
      <TopoN0 titulo="Usuários Morfo" subtitulo="Login/senha reais de quem acessa o painel N0" onVoltarSub={onVoltarSub} />
      <p style={{ fontSize: 11, color: DEV_TXT3, lineHeight: 1.6, marginTop: 0, marginBottom: 14 }}>
        Cada linha aqui é uma credencial de verdade (login/senha, não só um registro informativo) — o mesmo dado que
        a tela de Login usa pra autenticar no painel N0. O perfil de acesso decide o que cada administrador pode ver
        e fazer (ver "Gerenciador Permissões MorfoMod").
      </p>
      {erro && <div style={{ fontSize: 12, color: '#F5615C', marginBottom: 10, fontWeight: 700 }}>{erro}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {devUsers.length === 0 && <p style={{ fontSize: 12, color: DEV_TXT3 }}>Nenhum usuário Morfo registrado ainda.</p>}
        {devUsers.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: DEV_CARD, borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: u.status !== 'inativo' ? '#fff' : DEV_TXT3 }}>{u.name}</div>
              <div style={{ fontSize: 11, color: DEV_TXT2 }}>{u.login} · {perfilDoUsuario(perfis, u)?.nome ?? '—'}</div>
            </div>
            <button type="button" onClick={() => setEditando(u)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>
              Editar
            </button>
            <button
              type="button"
              onClick={() => void alternarAtivo(u)}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              {u.status !== 'inativo' ? 'Ativo' : 'Inativo'}
            </button>
            <button
              type="button"
              title="Excluir usuário"
              aria-label="Excluir usuário"
              onClick={() => pedirExclusao(u)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
            >
              <Trash2 size={14} color={RED} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setEditando('novo')} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: `1px dashed ${DEV_ACCENT}66`, borderRadius: 10, padding: 12, color: DEV_ACCENT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        + Novo usuário Morfo
      </button>
      {excluindo && <ExcluirDevUsuarioSheet usuario={excluindo} onClose={() => setExcluindo(null)} onExcluido={() => setExcluindo(null)} />}
    </div>
  )
}

// N0 → Parâmetros → Gerenciador Permissões MorfoMod (10/09/2026, Decisão 54
// Parte B) — `PerfisAcessoContent` (`PerfisAcesso.tsx`, transcrição literal
// do Kit) com `FUNCOES_PERFIL_N0`/`platformN0.perfisMorfo`/`devUsers`.
function SubParametrosPermissoes({ onVoltarSub }: { onVoltarSub: () => void }) {
  const platform = usePlatformN0()
  const perfis = platform.perfisMorfo ?? perfisPadraoN0()
  const devUsers = platform.devUsers ?? []
  const [msg, setMsg] = useState('')
  function notify(m: string) { setMsg(m); setTimeout(() => setMsg(''), 2000) }
  return (
    <div>
      <TopoN0 titulo="Gerenciador Permissões MorfoMod" subtitulo="Perfis de acesso ao painel N0" onVoltarSub={onVoltarSub} />
      {msg && <div style={{ fontSize: 12, color: DEV_ACCENT, marginBottom: 10, fontWeight: 700 }}>{msg}</div>}
      <PerfisAcessoContent
        funcs={FUNCOES_PERFIL_N0}
        perfis={perfis}
        users={devUsers}
        dark
        notify={notify}
        salvarPerfis={(novos) => void atualizarPerfisMorfo(() => novos)}
        migrarUsuarios={(deId, paraId) => void atualizarDevUsersN0((lista) => lista.map((u) => ((u.perfilId || 'admin') === deId ? { ...u, perfilId: paraId } : u)))}
      />
    </div>
  )
}

type SubParametros = 'meusDados' | 'alertas' | 'assinatura' | 'ambiente' | 'chat' | 'testesCliente' | 'limpezasCliente'
  | 'marca' | 'urls' | 'planos' | 'usuarios' | 'permissoes' | 'testesMorfo' | 'limpezasMorfo' | 'layout' | 'site'
  | 'padraoCategorias' | null

// Casca comum das telas novas de Parâmetros (10/09/2026, Decisão 55 — Parte
// B): cabeçalho com "‹ Voltar" + a faixa de aviso curta, no mesmo padrão que
// as sub-telas já existentes usam via `TopoN0`.
function TelaGrupoN0({ titulo, subtitulo, onVoltarSub, render }: { titulo: string; subtitulo?: string; onVoltarSub: () => void; render: (notify: (m: string) => void) => ReactNode }) {
  const [msg, setMsg] = useState('')
  function notify(m: string) { setMsg(m); window.setTimeout(() => setMsg(''), 2500) }
  return (
    <div>
      <TopoN0 titulo={titulo} subtitulo={subtitulo} onVoltarSub={onVoltarSub} />
      {msg && <div style={{ fontSize: 12, color: DEV_ACCENT, marginBottom: 10, fontWeight: 700 }}>{msg}</div>}
      {render(notify)}
    </div>
  )
}

/* Folha de "Apagar dados de teste" (12/09/2026) — o caminho de um toque a
   partir da barra do topo. Dupla confirmação, como toda ação destrutiva do
   painel, e a contagem do que vai sair é lida na hora, não estimada. */
function ApagarDadosTesteSheet({ onClose }: { onClose: () => void }) {
  const platform = usePlatformN0()
  const qtdLanc = useLiveQuery(() => contarLancamentosFicticios(), [], 0)
  const planosFic = useLiveQuery(async () => (await db.planos.toArray()).filter((p) => p.ficticio).length, [], 0)
  const [etapa, setEtapa] = useState(0)
  const [resultado, setResultado] = useState<string | null>(null)
  const ambientes = platform.tenants.filter(ehTenantDeTeste).length
  const usuarios = (platform.devUsers ?? []).filter((u, i) => i > 0 && u.ficticio).length

  async function apagar() {
    const r = await apagarTodosDadosDeTeste()
    setResultado(`${r.ambientes} ambiente(s), ${r.usuarios} usuário(s), ${r.planos} plano(s) e ${r.lancamentos} lançamento(s) de teste apagados.`)
    setEtapa(0)
  }

  return (
    <Sheet dark title="Apagar dados de teste" onClose={onClose}>
      {resultado ? (
        <>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#fff', margin: '0 0 14px' }}>{resultado}</p>
          <button type="button" style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT }} onClick={onClose}>Fechar</button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#C9C4D4', margin: '0 0 12px' }}>
            Sai TODO o dado de demonstração do painel: os ambientes de exemplo, os usuários Morfo e os planos marcados
            como teste, e os lançamentos de teste do ambiente deste aparelho.
          </p>
          <div style={{ background: DEV_CARD, borderRadius: 12, padding: '11px 13px', fontSize: 12.5, color: '#fff', lineHeight: 1.8, marginBottom: 14 }}>
            {ambientes} ambiente(s) de teste<br />
            {usuarios} usuário(s) Morfo de teste<br />
            {planosFic} plano(s) de teste<br />
            {qtdLanc} lançamento(s) de teste
          </div>
          <p style={{ fontSize: 11.5, lineHeight: 1.6, color: '#9B96A8', margin: '0 0 14px' }}>
            Não toca no ambiente deste aparelho, em cliente cadastrado pela Morfo, nos seus lançamentos, nos planos reais
            nem no seu acesso de administrador.
          </p>
          <button type="button" data-testid="n0-confirmar-apagar-teste" style={{ ...dangerBtn, width: '100%' }} onClick={() => setEtapa(1)}>
            <Trash2 size={16} /> Apagar dados de teste
          </button>
        </>
      )}
      {etapa === 1 && (
        <ConfirmDeleteSheet dark title="Confirmação final" confirmLabel="Apagar de vez" confirmIcon={Trash2} irreversible
          message="Os dados de teste serão apagados agora. Os seus dados reais continuam onde estão."
          onConfirm={() => void apagar()} onClose={() => setEtapa(0)} />
      )}
    </Sheet>
  )
}

// `podeVerFuncN0` (10/09/2026, Decisão 54 Parte B) — gating real por perfil
// de acesso, derivado de `perfilMorfoLogado` no shell (`DevApp` abaixo) e
// repassado por prop; cada sub-item de Parâmetros só aparece quando
// `nivelAcesso` devolve algo além de `null` pra `parametros.<chave>`.
function AbaParametros({ podeVerFuncN0, subInicial }: { podeVerFuncN0: (k: string) => boolean; subInicial?: SubParametros }) {
  const [sub, setSub] = useState<SubParametros>(subInicial ?? null)

  const voltar = () => setSub(null)
  /* Botão voltar do Android: dentro de um grupo de parâmetros, volta pra
     lista de grupos em vez de sair do app (12/09/2026). */
  usarBotaoVoltar(() => { if (sub) { setSub(null); return true } return false })
  if (sub === 'planos') return <SubParametrosPlanos onVoltarSub={voltar} />
  if (sub === 'site') return <SubParametrosSite onVoltarSub={voltar} />
  if (sub === 'meusDados') return <SubParametrosMeusDadosN0 onVoltarSub={voltar} />
  if (sub === 'usuarios') return <SubParametrosUsuarios onVoltarSub={voltar} />
  if (sub === 'permissoes') return <SubParametrosPermissoes onVoltarSub={voltar} />
  // Telas novas da Decisão 55 (Parte B) — cada uma é a transcrição do grupo
  // correspondente do Kit; a casca (voltar + toast) é a mesma pra todas.
  if (sub === 'alertas') return <TelaGrupoN0 titulo="Meus Alertas" subtitulo="Notificações do administrador Morfo" onVoltarSub={voltar} render={(n) => <SubParametrosAlertas notify={n} />} />
  if (sub === 'assinatura') return <TelaGrupoN0 titulo="Assinatura e Bloqueio" subtitulo="Padrões de cobrança e período de teste" onVoltarSub={voltar} render={() => <SubParametrosAssinatura irParaChat={() => setSub('chat')} />} />
  if (sub === 'ambiente') return <TelaGrupoN0 titulo="Ambiente dos Clientes" subtitulo="Acesso de suporte e retenção de dados" onVoltarSub={voltar} render={() => <SubParametrosAmbiente />} />
  if (sub === 'chat') return <TelaGrupoN0 titulo="Gerenciar Chat" subtitulo="Mensagens automáticas e horário de atendimento" onVoltarSub={voltar} render={() => <SubParametrosChat />} />
  if (sub === 'marca') return <TelaGrupoN0 titulo="Marca" subtitulo="Logos por contexto e canal de suporte" onVoltarSub={voltar} render={(n) => <SubParametrosMarca notify={n} />} />
  /* Build 053: os endereços do produto (.apk e site) — ver `SubParametrosUrls`. */
  if (sub === 'urls') return <TelaGrupoN0 titulo="URLs" subtitulo="Download do aplicativo e site do produto" onVoltarSub={voltar} render={() => <SubParametrosUrls />} />
  if (sub === 'layout') return <TelaGrupoN0 titulo="Layout do Sistema" subtitulo="Vale pro N1 e pro N0" onVoltarSub={voltar} render={(n) => <SubParametrosLayout notify={n} />} />
  if (sub === 'testesCliente') return <TelaGrupoN0 titulo="Gerar Teste no Cliente" subtitulo="Massa fictícia no ambiente de um cliente" onVoltarSub={voltar} render={(n) => <SubTesteCliente notify={n} />} />
  if (sub === 'testesMorfo') return <TelaGrupoN0 titulo="Gerar Teste Morfo" subtitulo="Massa fictícia nos registros do painel N0" onVoltarSub={voltar} render={(n) => <SubTesteMorfo notify={n} />} />
  if (sub === 'limpezasCliente') return <TelaGrupoN0 titulo="Limpar Dados do Cliente" subtitulo="Teste e reais — checagem dupla" onVoltarSub={voltar} render={(n) => <SubLimpezaCliente notify={n} />} />
  if (sub === 'limpezasMorfo') return <TelaGrupoN0 titulo="Limpar Dados da Morfo" subtitulo="Teste e reais — checagem dupla" onVoltarSub={voltar} render={(n) => <SubLimpezaMorfo notify={n} />} />
  /* Item 7 (12/09/2026): as configurações de Categorias/Grupos/ícones do N1,
     aqui como padrão da plataforma. Ver `padraoCategorias.ts`. */
  if (sub === 'padraoCategorias') return <TelaGrupoN0 titulo="Categorias e Grupos (padrão)" subtitulo="Padrão que os ambientes não editados recebem" onVoltarSub={voltar} render={(n) => <PadraoCategoriasN0 notify={n} />} />

  // Kit L509-L513 / L1600-L1700: os itens de Parâmetros agrupados pelas MESMAS
  // 3 sessões da árvore de permissão (`FUNCOES_PERFIL_N0`), na ordem do Kit.
  const todosItens: { chave: Exclude<SubParametros, null>; titulo: string; hint: string; sessao: string }[] = [
    { sessao: 'Meus Dados/Ambiente', chave: 'meusDados', titulo: 'Meus Dados', hint: 'Seu cadastro de administrador: nome, contato, login e senha' },
    { sessao: 'Meus Dados/Ambiente', chave: 'alertas', titulo: 'Meus Alertas', hint: 'Avisos de vencimento, atraso e resumo financeiro das assinaturas' },
    { sessao: 'Ambiente do Cliente', chave: 'assinatura', titulo: 'Assinatura e Bloqueio', hint: 'Tolerância, dia de vencimento, dias de teste e aviso de fim de teste' },
    { sessao: 'Ambiente do Cliente', chave: 'ambiente', titulo: 'Ambiente dos Clientes', hint: 'Pré-cadastro, acesso de suporte (autorização e modo) e retenção de dados' },
    { sessao: 'Ambiente do Cliente', chave: 'chat', titulo: 'Gerenciar Chat', hint: 'Mensagem automática, follow-up e horário de atendimento por dia' },
    { sessao: 'Ambiente do Cliente', chave: 'padraoCategorias', titulo: 'Categorias e Grupos (padrão)', hint: 'Cadastro-modelo de grupos, categorias, metas e ícones — ambientes não editados recebem' },
    { sessao: 'Ambiente do Cliente', chave: 'testesCliente', titulo: 'Gerar Teste no Cliente', hint: 'Massa de dados fictícios dentro do ambiente de um cliente (só ambiente vazio)' },
    { sessao: 'Ambiente do Cliente', chave: 'limpezasCliente', titulo: 'Limpar Dados do Cliente', hint: 'Apaga dados de teste ou reais do ambiente — checagem dupla' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'marca', titulo: 'Marca', hint: 'Logos da Morfo e do produto por contexto + canal de suporte (WhatsApp)' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'urls', titulo: 'URLs', hint: 'Link de download do aplicativo (.apk) e endereço do site — usados em toda mensagem ao cliente' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'planos', titulo: 'Gerenciar Planos', hint: 'Nome, preço e funcionalidades dos planos (Dexie, editável)' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'usuarios', titulo: 'Usuários Morfo (administradores)', hint: 'Login/senha reais de quem acessa este painel N0' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'permissoes', titulo: 'Permissões Morfo', hint: 'Perfis de acesso e o que cada um pode ver/editar no painel N0' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'testesMorfo', titulo: 'Gerar Teste Morfo', hint: 'Empresas, usuários e planos fictícios — tudo nasce marcado como TESTE' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'limpezasMorfo', titulo: 'Limpar Dados da Morfo', hint: 'Apaga registros de teste ou reais da base do painel — checagem dupla' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'layout', titulo: 'Layout do Sistema', hint: 'Ícones do topo, linha de marca, densidade e posição do filtro de dados' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'site', titulo: 'Site MorfoFinP', hint: 'Cabeçalho, logos, frase de apresentação, cores, páginas e menu do site deslogado' },
  ]
  const itens = todosItens.filter((it) => podeVerFuncN0(`parametros.${it.chave}`))
  const sessoes = ['Meus Dados/Ambiente', 'Ambiente do Cliente', 'Ambiente MorfoFinP ADM'].filter((s) => itens.some((i) => i.sessao === s))
  return (
    <div>
      <TopoN0 titulo="Parâmetros" subtitulo="Configuração da plataforma" />
      {sessoes.map((sessao) => (
        <div key={sessao}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: DEV_TXT2, textTransform: 'uppercase', letterSpacing: 0.4, margin: '18px 0 10px' }}>{sessao}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {itens.filter((it) => it.sessao === sessao).map((it) => (
              <button
                key={it.chave}
                type="button"
                onClick={() => setSub(it.chave)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: DEV_CARD,
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{emTituloCaso(it.titulo)}</div>
                  <div style={{ fontSize: 11, color: DEV_TXT2, marginTop: 2, lineHeight: 1.5 }}>{it.hint}</div>
                </div>
                <ChevronRightIcon width={16} height={16} color={DEV_TXT2} />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DevApp({ onEntrarComoTenant, clienteParaReabrir, aoReabrirCliente }: {
  onEntrarComoTenant: (tenantId: string) => void
  /* 12/09/2026 (build 052): id do cliente cuja ficha deve reabrir assim que o
     painel voltar — é o que faz "sair do acesso ao ambiente" cair na ficha
     dele, e não na tela inicial (ver `AppRoot.tsx`). */
  clienteParaReabrir?: string | null
  aoReabrirCliente?: () => void
}) {
  // Gating real por perfil de acesso (10/09/2026, Decisão 54 Parte B):
  // `loggedDevUserId` (gravado por `authN0.ts` no login) resolve QUEM está
  // logado; `perfilDoUsuario`/`nivelAcesso` (literais do Kit, `kitPlatform.ts`)
  // resolvem o que esse perfil pode ver. Sem perfil configurado ainda
  // (`perfisMorfo` ausente) ou sem usuário resolvido, cai no perfil "admin"
  // padrão (`perfisPadraoN0()`) — nunca tranca ninguém fora por acidente.
  const platform = usePlatformN0()
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  const usuarioMorfoLogado = platform.devUsers?.find((u) => u.id === config?.loggedDevUserId)
  const perfilMorfoLogado = perfilDoUsuario(platform.perfisMorfo ?? perfisPadraoN0(), usuarioMorfoLogado)
  const podeVerFuncN0 = (k: string) => nivelAcesso(perfilMorfoLogado, k) !== null
  /* Ordem das abas do N0 = padrão salvo em Parâmetros › Layout do Sistema
     (12/09/2026). Aba fora da ordem salva vai pro fim, na ordem do código —
     nunca some. */
  const ordemN0 = platform.layoutConfig?.ordemAbasN0
  const abasVisiveis = (ordemN0 && ordemN0.length
    ? [...ordemN0.map((k) => ABAS.find((a) => a.key === k)).filter((a): a is typeof ABAS[number] => !!a),
       ...ABAS.filter((a) => !ordemN0.includes(a.key))]
    : ABAS
  ).filter((a) => podeVerFuncN0(a.key))

  const [abaEscolhida, setAba] = useState<AbaN0>(clienteParaReabrir ? 'tenants' : 'inicio')
  /* 12/09/2026 (build 052): toque no rodapé sempre leva pra tela PRINCIPAL da
     aba — mesma regra do N1 (ver `App.tsx`). Aqui o passo de dentro é a ficha
     de um cliente, a sub-tela de Parâmetros e a conversa aberta no suporte;
     todos são estado local da aba, então este contador entra na `key` de cada
     uma e remonta a aba no estado inicial. */
  const [resetAbaN0, setResetAbaN0] = useState(0)
  // Se a aba escolhida deixar de estar visível (perfil trocado/reduzido pra
  // este usuário), cai na 1ª aba que ainda é visível — derivado direto no
  // render (sem efeito) pra nunca piscar a aba antiga por 1 frame.
  const aba = abasVisiveis.some((a) => a.key === abaEscolhida) ? abaEscolhida : (abasVisiveis[0]?.key ?? abaEscolhida)
  const [saindo, setSaindo] = useState(false)
  // Central de Suporte (correção de auditoria, cluster Parâmetros x Kit) —
  // overlay de nível do shell, igual em espírito ao `push`/pilha do Kit:
  // fica por cima da aba atual (preserva onde o usuário estava) até fechar.
  const [suporteGeralAberto, setSuporteGeralAberto] = useState(false)
  // Filtro "Dados Reais/Dados Teste/Ambos" (Decisão 54, Parte B) — estado de
  // sessão, no nível do shell (não persiste no Dexie, mesma natureza de
  // filtro/UI temporária do Kit); padrão "ambos" preserva o comportamento
  // de sempre (soma real+fictício), até o Rafael trocar.
  const [filtroDados, setFiltroDados] = useState<FiltroDados>('ambos')
  /* A barra só existe quando há dado de teste vivo (12/09/2026) — e o filtro
     volta pra "ambos" quando o último dado de teste é apagado, senão ficaria
     preso num recorte cuja barra não está mais na tela pra desfazer. */
  const qtdLancFicticiosShell = useLiveQuery(() => contarLancamentosFicticios(), [], 0)
  const temDadosTeste = temDadosDeTesteNaPlataforma(platform, qtdLancFicticiosShell)
  const [apagarTesteAberto, setApagarTesteAberto] = useState(false)
  const filtroEfetivo = temDadosTeste ? filtroDados : 'ambos'
  /* Atalhos do Início (12/09/2026, pedido do Rafael): cada um leva pro
     DESTINO de verdade (não só pra aba), e sempre no TOPO da rolagem —
     "todos os atalhos devem levar pra tela destino no topo da rolagem". */
  const areaConteudoRef = useRef<HTMLDivElement>(null)
  const [subParametrosInicial, setSubParametrosInicial] = useState<SubParametros>(null)
  const [acaoTenants, setAcaoTenants] = useState<AcaoTenants>(undefined)
  const irPara = (destino: AbaN0, opcoes?: { sub?: SubParametros; acaoTenants?: AcaoTenants }) => {
    setSubParametrosInicial(opcoes?.sub ?? null)
    setAcaoTenants(opcoes?.acaoTenants)
    setAba(destino)
    requestAnimationFrame(() => areaConteudoRef.current?.scrollTo({ top: 0 }))
  }

  /* "Posição dos menus" e "Posição do botão ⋮" do N0 (10/09/2026, Decisão 58
     — Parâmetros → Layout do Sistema → "Menus do N0"). Mesma mecânica do N1
     (`App.tsx`): cada menu vai pra barra, pro "⋮" ou pra lugar nenhum, e o
     "⋮" tem as 5 posições do Kit. Sem nada configurado, tudo fica onde
     sempre esteve. */
  const posDeMenuN0 = (chave: string): PosicaoMenu => {
    const item = ITENS_NAV_N0.find((i) => i.key === chave)
    if (!item) return 'rodape'
    return posicaoMenuDe(platform.layoutConfig?.posicaoN0, item, ITEM_PROTEGIDO_N0)
  }
  const menuPosN0 = normalizarMenuPosModo(platform.layoutConfig?.menuPosN0?.modo)
  const acoesN0: Record<string, { label: string; Icone: typeof HomeIcon; icon: ItemMenuTopo['icon']; onClick: () => void; danger?: boolean }> = {
    atualizar: { label: 'Atualizar', Icone: ArrowPathIcon, icon: RotateCcw, onClick: () => window.location.reload() },
    sair: { label: saindo ? 'Saindo…' : 'Sair', Icone: ArrowRightOnRectangleIcon, icon: LogOut, onClick: () => { setSaindo(true); void sairN0() }, danger: true },
  }
  const abasNaBarra = abasVisiveis.filter((a) => posDeMenuN0(a.key) === 'rodape')
  const itensMaisN0: ItemMenuTopo[] = [
    ...abasVisiveis
      .filter((a) => posDeMenuN0(a.key) === 'menu')
      .map((a) => ({ icon: iconeDeAbaNoMenuN0(a.Icone), label: a.label, onClick: () => setAba(a.key) })),
    ...Object.entries(acoesN0)
      .filter(([k]) => posDeMenuN0(k) === 'menu')
      .map(([, a]) => ({ icon: a.icon, label: a.label, onClick: a.onClick, danger: a.danger })),
  ]
  /* Botão voltar do Android (12/09/2026) — ver `src/voltarAndroid.ts`. As
     telas de dentro (ficha de cliente, sub-parâmetro, extrato) registram o
     próprio tratador; aqui fica só o nível do shell. */
  usarBotaoVoltar(() => {
    if (suporteGeralAberto) { setSuporteGeralAberto(false); return true }
    if (abasVisiveis.length > 0 && aba !== abasVisiveis[0].key) { setAba(abasVisiveis[0].key); return true }
    return false
  })

  const menuN0NoTopo = menuPosN0 === 'topo' || menuPosN0 === 'topo_esquerda'
  const botaoMaisN0 = menuN0NoTopo ? <TopIconMenu dark items={itensMaisN0} /> : null
  const entradasRodapeN0 = (() => {
    const base: { key: AbaN0 | string; label: string; Icone: typeof HomeIcon; custom?: ReactNode }[] = [
      ...abasNaBarra,
      ...Object.entries(acoesN0)
        .filter(([k]) => posDeMenuN0(k) === 'rodape')
        .map(([k, a]) => ({ key: k, label: a.label, Icone: a.Icone })),
    ]
    if (menuN0NoTopo || !itensMaisN0.length) return base
    const entradaMais = {
      key: '__mais',
      label: 'Mais',
      Icone: EllipsisVerticalIcon,
      custom: <TopIconMenu dark items={itensMaisN0} panelDir={{ vertical: 'up', horizontal: menuPosN0 === 'rodape_direita' ? 'right' : 'left' }} />,
    }
    if (menuPosN0 === 'rodape_esquerda') return [entradaMais, ...base]
    if (menuPosN0 === 'rodape_direita') return [...base, entradaMais]
    const meio = Math.ceil(base.length / 2)
    return [...base.slice(0, meio), entradaMais, ...base.slice(meio)]
  })()

  return (
    /* Kit L7097/L7102: o N0 inteiro roda dentro do LayoutContext (quais ícones
       de topo aparecem, posição, densidade — editável em Parâmetros → Layout do
       Sistema) e da classe `.mloc-forcar-escuro`, que força a paleta escura na
       subárvore toda independentemente do tema do usuário. A classe só passou a
       ter efeito nesta rodada, com o `shell.css` carregado (G44 regra 11a). */
    <LayoutContext.Provider value={platform.layoutConfig ?? { iconesTopo: 'direita' }}>
    <div
      className="mloc-forcar-escuro"
      style={{
        // Corrigido 11/09/2026 (achado na comparação visual pixel a pixel
        // contra o Projeto Modelo): `position: fixed; inset: 0` fazia o N0
        // ocupar a JANELA DE VERDADE do navegador, ignorando o `max-width`
        // de coluna única do `#root` (decisão de produto da Etapa 4: "sempre
        // coluna única", registrada em Decisões.md) — só o N0 escapava
        // disso, Login/N1 nunca usaram `position: fixed` no próprio raiz e
        // por isso sempre ficaram contidos. No Kit isso não acontece porque
        // a moldura dele usa `transform` (que cria um novo "containing
        // block" pra `position: fixed`); aqui a simulação de largura usa só
        // `max-width` (adaptação G44 registrada em `SimulacaoResolucao.tsx`),
        // que não contém elemento `fixed`. Troca pra `flex: 1` (preenche o
        // container flex-column pai, igual ao resto do app) resolve sem
        // precisar mexer no mecanismo de simulação de largura.
        flex: 1,
        minHeight: 0,
        background: DEV_BG,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: 16,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {menuPosN0 === 'topo_esquerda' && botaoMaisN0}
          <h1 style={{ fontSize: 15, margin: 0, fontWeight: 800, color: DEV_ACCENT }}>Painel N0 — Morfo</h1>
        </span>
        {/* Kit L5427-L5450 (item 167/199): na linha das logos ficam o ícone de
            pessoa do usuário logado e o "⋮" — nesta ordem, com o "⋮" por
            último, pra ser ELE quem ocupa o canto direito de fato. "Sair"
            deixou de ser botão solto e virou item do "⋮", junto de "Atualizar"
            (Kit L5665: "Dentro do ⋮ ficam Atualizar, Alertas e Sair").
            Sair continua só zerando `sessaoAtivaN0` (G59) — nunca leva pra
            dentro de um tenant. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <UserHoverIcon dark label={usuarioMorfoLogado?.name || usuarioMorfoLogado?.login} />
          {menuPosN0 === 'topo' && botaoMaisN0}
        </div>
      </div>

      {/* Igual ao Kit: a barra fica no nível do shell (acima do conteúdo de
          cada aba), persiste ao trocar de aba — só não aparece em
          Auditoria, mesma exceção do Kit. */}
      {aba !== 'auditoria' && temDadosTeste && (
        <FiltroDadosBar filtroDados={filtroDados} setFiltroDados={setFiltroDados} onLimpar={() => setApagarTesteAberto(true)} />
      )}
      {apagarTesteAberto && <ApagarDadosTesteSheet onClose={() => setApagarTesteAberto(false)} />}

      <div ref={areaConteudoRef} style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {suporteGeralAberto ? (
          <CentralSuporteN0 onClose={() => setSuporteGeralAberto(false)} />
        ) : (
          <>
            {aba === 'inicio' && podeVerFuncN0('inicio') && <AbaInicio key={`inicio-${resetAbaN0}`} filtroDados={filtroEfetivo} onIrPara={irPara} onAbrirSuporte={() => setSuporteGeralAberto(true)} />}
            {aba === 'tenants' && podeVerFuncN0('tenants') && <AbaTenants key={`tenants-${acaoTenants ?? 'lista'}-${resetAbaN0}`} acaoInicial={acaoTenants} clienteInicial={clienteParaReabrir} aoAbrirClienteInicial={aoReabrirCliente} onEntrarComoTenant={onEntrarComoTenant} filtroDados={filtroEfetivo} />}
            {aba === 'financeiro' && podeVerFuncN0('financeiro') && <AbaFinanceiro key={`financeiro-${resetAbaN0}`} filtroDados={filtroEfetivo} />}
            {aba === 'auditoria' && podeVerFuncN0('auditoria') && <AbaAuditoria key={`auditoria-${resetAbaN0}`} />}
            {aba === 'parametros' && podeVerFuncN0('parametros') && <AbaParametros key={`param-${subParametrosInicial ?? 'lista'}-${resetAbaN0}`} subInicial={subParametrosInicial} podeVerFuncN0={podeVerFuncN0} />}
            {aba === 'indicadores' && podeVerFuncN0('indicadores') && <IndicadoresDevScreen key={`indic-${resetAbaN0}`} filtroDados={filtroEfetivo} />}
          </>
        )}
      </div>

      {/* Rodapé extraído pra `RodapeAbas.tsx` (Decisão 50) — mesmos valores de
          sempre; o N1 usa a mesma peça. Só as abas que o perfil logado pode
          ver aparecem (Decisão 54 Parte B). */}
      <RodapeAbas
        abas={entradasRodapeN0}
        ativa={aba}
        onTrocar={(k) => {
          const acao = acoesN0[k]
          if (acao) { acao.onClick(); return }
          setSuporteGeralAberto(false)
          setSubParametrosInicial(null)
          setAcaoTenants(undefined)
          setAba(k as AbaN0)
          setResetAbaN0((n) => n + 1)
        }}
      />
    </div>
    </LayoutContext.Provider>
  )
}
