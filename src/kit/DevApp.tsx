/* Achado do diff literal desta rodada (item 10 do CONTRATO: valor a valor).
   Este arquivo tinha uma cópia local das cores do N0, e o roxo estava em
   `#8B7CF6` — o Kit usa `#6C3FFF` (L53-L55), e como token CSS
   (`var(--mloc-dev-*)`), não hex solto. Agora vem de `kitBase.tsx`, que é a
   transcrição do Kit: mesma cor, e passa a acompanhar o `shell.css`. */
import { useState, type ComponentType, type ReactNode } from 'react'
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
import RodapeAbas from './RodapeAbas'
import IndicadoresDevScreen from './indicadoresKit'
import ChatConversa from './ChatConversa'
import {
  usePlatformN0,
  tenantCanceledExpired,
  tenantBlocked,
  installmentDisplayStatus,
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
  salvarPlatformN0,
  TENANT_N1_ID,
  daysUntil,
  addDays,
  normalizarMenuPosModo,
  posicaoMenuDe,
  ITENS_NAV_N0,
  ITEM_PROTEGIDO_N0,
  type PosicaoMenu,
  type FiltroDados,
  type TenantKit,
  type DevUserN0,
  type Parcela,
} from './kitPlatform'
import { PerfisAcessoContent } from './PerfisAcesso'
import { LayoutContext, TopIconMenu, UserHoverIcon, IconesDeTela, type ItemMenuTopo } from './TopoIcones'
import { ExportSheet, type ExportRow } from './ExportSheet'
import { RotateCcw, LogOut, AlertTriangle, Timer, ShieldAlert, UserPlus, Plus, FileBadge, Settings, MessageCircle, Pencil, Trash2, Check, Search, Building2, Wallet, Link2, Copy, CheckCircle2, Lock, Unlock } from 'lucide-react'
import { alpha, uid, GREEN, AMBER, RED, SectionLabel, DEV_BG, DEV_CARD, DEV_ACCENT, Segmented, Sheet, Field, FieldError, inputStyle, primaryBtn, Toggle, PhoneComWhats, AddressFieldsBasic, normalizeAddress, validaCPF, validaTelefone, validaEmailEnvio, EmptyState, type Endereco } from './kitBase'
import { ESPACO_LINHA, InfoDot, IndicatorStrip, QuickAction, TotalRegistros, formatMoneyShort, SearchBox } from './PadraoUI'
// Telas novas de Parâmetros (10/09/2026, Decisão 55 — Parte B)
import {
  SubParametrosAssinatura, SubParametrosAmbiente, SubParametrosChat,
  SubParametrosAlertas, SubParametrosMarca, SubParametrosLayout,
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
// 2. "Entrar como este tenant" (impersonate) passou de PERMANENTEMENTE
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
  { key: 'tenants', label: 'Tenants', Icone: BuildingOffice2Icon },
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
          style={{
            background: 'none',
            border: 'none',
            color: DEV_TXT2,
            fontSize: 12.5,
            fontWeight: 700,
            padding: 0,
            marginBottom: 10,
            cursor: 'pointer',
          }}
        >
          ‹ Voltar
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <h2 style={{ fontSize: 17, margin: 0, color: '#fff', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{titulo}</h2>
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
      Tenants marcados <strong style={{ color: DEV_TXT2 }}>(exemplo)</strong> são dado fictício (os próprios tenants
      de demonstração do Kit) — só pra mostrar como esta tela funciona com vários tenants. Nenhuma ação aqui muda
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
function FiltroDadosBar({ filtroDados, setFiltroDados }: { filtroDados: FiltroDados; setFiltroDados: (v: FiltroDados) => void }) {
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
    </div>
  )
}

const campoN0Style: React.CSSProperties = {
  width: '100%',
  background: '#141319',
  border: `1px solid ${DEV_ACCENT}44`,
  borderRadius: 10,
  padding: '10px 12px',
  color: '#fff',
  fontSize: 13.5,
}
const labelN0Style: React.CSSProperties = {
  display: 'block',
  fontSize: 11.5,
  color: DEV_TXT2,
  margin: '10px 0 4px',
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
function AbaInicio({ filtroDados, onIrPara, onAbrirSuporte }: { filtroDados: FiltroDados; onIrPara: (aba: AbaN0) => void; onAbrirSuporte: () => void }) {
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
        <QuickAction dark icon={Plus} label="Criar ambiente de teste" onClick={() => onIrPara('tenants')}
          info="Cria uma empresa em período de avaliação, com login e senha definidos por você." />
        <QuickAction dark icon={ShieldAlert} label={`Pré-cadastros${pendLiberacao.length ? ` (${pendLiberacao.length})` : ''}`} onClick={() => onIrPara('tenants')}
          info="Ambientes que se cadastraram sozinhos pela tela de Login e escolheram pagar por boleto — ficam aguardando a compensação. Pix e cartão liberam na hora." />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
        <QuickAction dark icon={FileBadge} label="Gerenciar planos" onClick={() => onIrPara('parametros')}
          info="Cria e edita os planos de assinatura vendidos às empresas clientes: preço, limites e recursos." />
        <QuickAction dark icon={Settings} label="Parâmetros gerais" onClick={() => onIrPara('parametros')}
          info="Valores padrão aplicados aos ambientes: tolerância, vencimento, teste grátis, retenção e mais." />
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {/* Correção de auditoria (cluster Parâmetros x Kit): este atalho
            entrava na aba Tenants inteira (achar o cliente certo era manual)
            — o Kit abre direto a caixa de entrada agregada de conversas
            (`DevChatGeralScreen`, L6370). Agora abre `CentralSuporteN0`. */}
        <QuickAction dark icon={MessageCircle} label="Suporte" onClick={onAbrirSuporte}
          info="Fale com as empresas clientes pelo chat de suporte."
          badge={suporteNaoLido > 0
            ? <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: RED, padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap' }}>{suporteNaoLido} Nova{suporteNaoLido > 1 ? 's' : ''}</span>
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
                onClick={() => void atualizarTenantN0(t.id, (tt) => ({ ...tt, chatLastReadMorfo: null }))}
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
function NovoClienteSheet({ diasTestePadrao, onClose }: { diasTestePadrao: number; onClose: () => void }) {
  const planos = useTodosPlanos().filter((p) => p.ativo)
  const [nome, setNome] = useState('')
  const [phone, setPhone] = useState('')
  const [hasWhatsapp, setHasWhatsapp] = useState(true)
  const [email, setEmail] = useState('')
  const [doc, setDoc] = useState('')
  const [tipoPlano, setTipoPlano] = useState<'trial' | 'pagante'>('trial')
  const [planoId, setPlanoId] = useState<string>(planos[0]?.id ? String(planos[0].id) : '')
  const [dias, setDias] = useState(String(diasTestePadrao))
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [liberar, setLiberar] = useState(true)
  const [erro, setErro] = useState('')

  const phoneOk = validaTelefone(phone)
  const docOk = !doc.trim() || validaCPF(doc)
  const emailOk = validaEmailEnvio(email)
  const planoEscolhido = planos.find((p) => String(p.id) === planoId)
  const podeSalvar = !!nome.trim() && phoneOk && emailOk && docOk && !!login.trim() && senha.trim().length >= 4
    && (tipoPlano === 'trial' || !!planoEscolhido)

  async function salvar() {
    const loginN = login.trim().toLowerCase()
    const platform = await lerPlatformN0Persistida()
    if (loginJaEmUsoGlobalmente(platform, loginN)) { setErro('Esse login já está em uso (N0 ou N1).'); return }
    const hoje = new Date().toISOString().slice(0, 10)
    const mensalidade = tipoPlano === 'pagante' ? (planoEscolhido?.valorMensal ?? 0) : 0
    const novo: TenantKit = {
      id: `t-${uid()}`,
      companyName: nome.trim(),
      ownerName: nome.trim(),
      phone: phone.trim(),
      hasWhatsapp,
      email: email.trim(),
      doc: doc.trim() || undefined,
      createdAt: hoje,
      plan: tipoPlano,
      planId: tipoPlano === 'pagante' && planoEscolhido ? String(planoEscolhido.id) : null,
      manualBlock: false,
      onboarding: liberar ? 'completo' : 'pendente_liberacao',
      /* Achado 11/09/2026 (reconciliação `kitPlatform.ts`): grava desde
         quando este pré-cadastro está pendente, pro housekeeping automático
         (`verificarVencimentoPrecadastro`) saber quando o prazo do parâmetro
         "Prazo do pré-cadastro" (Parâmetros N0) vence e encerrar sozinho. */
      onboardingSince: liberar ? undefined : hoje,
      trial: tipoPlano === 'trial' ? { days: Number(dias) || diasTestePadrao, startDate: hoje } : null,
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
        name: nome.trim(), login: loginN, senha, email: email.trim(), phone: phone.trim(),
        status: liberar ? 'ativo' : 'pendente_aprovacao', perfilId: 'admin', createdAt: hoje,
      }],
      userLimit: 1,
      // `ator: 'suporte'` (achado no diff desta rodada, 11/09/2026): marca a
      // entrada como ação da Morfo, não do cliente — é o que faz o bloco
      // "Ações do suporte no meu ambiente" (SuporteChat.tsx) listar isso.
      accessLog: [{ id: uid(), ts: new Date().toISOString().slice(0, 19), action: liberar ? 'Cliente cadastrado pela Morfo, com acesso liberado' : 'Cliente cadastrado pela Morfo, aguardando liberação', ator: 'suporte' }],
      real: true,
    }
    await salvarPlatformN0({ ...platform, tenants: [...platform.tenants, novo] })
    onClose()
  }

  return <Sheet dark title="Novo cliente" onClose={onClose}>
    <Field dark label="Nome do cliente"><input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Maria Silva" /></Field>
    <PhoneComWhats phone={phone} setPhone={setPhone} hasWhatsapp={hasWhatsapp} setHasWhatsapp={setHasWhatsapp} />
    <FieldError show={phone.trim() && !phoneOk} text="Telefone inválido (use DDD + número)" />
    <Field dark label="E-mail"><input style={inputStyle} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" /></Field>
    <FieldError show={email.trim() && !emailOk} text="E-mail inválido" />
    <Field dark label="CPF (opcional)"><input style={inputStyle} inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00" /></Field>
    <FieldError show={doc.trim() && !docOk} text="CPF inválido" />

    <SectionLabel dark>Plano</SectionLabel>
    <Field dark label="Como este cliente entra"><Segmented value={tipoPlano} onChange={setTipoPlano} options={[{ value: 'trial' as const, label: 'Período de teste' }, { value: 'pagante' as const, label: 'Plano pago' }]} /></Field>
    {tipoPlano === 'trial'
      ? <Field dark label="Dias de teste"><input style={inputStyle} type="number" value={dias} onChange={(e) => setDias(e.target.value)} /></Field>
      : planos.length === 0
        ? <p style={{ fontSize: 12, color: AMBER, margin: '0 0 14px', lineHeight: 1.5 }}>Nenhum plano ativo cadastrado. Cadastre um em Parâmetros › Gerenciar Planos, ou cadastre este cliente em período de teste.</p>
        : <Field dark label="Plano contratado"><select style={inputStyle} value={planoId} onChange={(e) => setPlanoId(e.target.value)}>
            {planos.map((p) => <option key={p.id} value={String(p.id)}>{p.nome} — {p.gratuito ? 'gratuito' : fmtBRL(p.valorMensal)}</option>)}
          </select></Field>}

    <SectionLabel dark>Acesso do cliente</SectionLabel>
    <Field dark label="Login"><input style={inputStyle} value={login} onChange={(e) => setLogin(e.target.value)} placeholder="ex: mariasilva" autoCapitalize="none" /></Field>
    <Field dark label="Senha inicial"><input style={inputStyle} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mín. 4 caracteres" /></Field>
    <div style={{ marginBottom: 14 }} data-testid="n0-liberar-agora">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Toggle value={liberar} onChange={setLiberar} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Liberar acesso agora</span>
      </div>
      <span style={{ fontSize: 12.5, color: '#C9C4D4', display: 'block', marginTop: 6, lineHeight: 1.5 }}>
        {liberar
          ? 'Acesso liberado: o cliente já entra com o login e a senha acima.'
          : 'Sem liberar agora: fica como pré-cadastro aguardando liberação — você libera depois na ficha dele.'}
      </span>
    </div>
    {erro && <p style={{ fontSize: 12.5, color: RED, fontWeight: 700, margin: '0 0 10px' }}>{erro}</p>}
    <button type="button" disabled={!podeSalvar} onClick={() => void salvar()}
      style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT, opacity: podeSalvar ? 1 : 0.5, cursor: podeSalvar ? 'pointer' : 'not-allowed' }}>
      Cadastrar cliente
    </button>
    {!podeSalvar && <p style={{ fontSize: 11.5, color: DEV_TXT3, margin: '8px 0 0', lineHeight: 1.5 }}>
      Faltando: {[!nome.trim() && 'nome', !phoneOk && 'telefone válido', !emailOk && 'e-mail válido', !docOk && 'CPF válido', !login.trim() && 'login', senha.trim().length < 4 && 'senha (mín. 4)', tipoPlano === 'pagante' && !planoEscolhido && 'plano'].filter(Boolean).join(' · ')}.
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
      accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: 'Dados do cliente editados pela Morfo', ator: 'suporte' }],
    }))
    onClose()
  }

  return (
    <Sheet dark title="Editar dados do cliente" onClose={onClose}>
      <Field dark label="Nome do cliente"><input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <PhoneComWhats phone={phone} setPhone={setPhone} hasWhatsapp={hasWhatsapp} setHasWhatsapp={setHasWhatsapp} />
      <FieldError show={phone.trim() && !phoneOk} text="Telefone inválido (use DDD + número)" />
      <Field dark label="E-mail"><input style={inputStyle} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <FieldError show={email.trim() && !emailOk} text="E-mail inválido" />
      <Field dark label="CPF (opcional)"><input style={inputStyle} inputMode="numeric" value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="000.000.000-00" /></Field>
      <FieldError show={doc.trim() && !docOk} text="CPF inválido" />
      <button type="button" disabled={!podeSalvar} onClick={() => void salvar()}
        style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT, opacity: podeSalvar ? 1 : 0.5, cursor: podeSalvar ? 'pointer' : 'not-allowed' }}>
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

function AbaTenants({ onEntrarComoTenant, filtroDados }: { onEntrarComoTenant: () => void; filtroDados: FiltroDados }) {
  const { tenants: todos, defaultParams } = usePlatformN0()
  const tenants = filtrarTenantsPorDados(todos, filtroDados)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [chatAberto, setChatAberto] = useState(false)
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */
  const [novoAberto, setNovoAberto] = useState(false) /* Decisão 67 */
  const [editarAberto, setEditarAberto] = useState(false) /* Correção de auditoria — cluster Tenants x Kit, ver EditarClienteSheet */
  const [excluirAberto, setExcluirAberto] = useState(false) /* idem — ver ExcluirClienteSheet */
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false) /* idem — ver ConfirmarBloqueioSheet */
  const selecionado = selecionadoId ? tenants.find((t) => t.id === selecionadoId) : undefined

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
        accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: x.manualBlock ? 'Desbloqueio manual' : 'Bloqueio manual', ator: 'suporte' }],
      }))
      setConfirmBlockOpen(false)
    }
    const toggleManualBlock = () => (t.manualBlock ? applyToggleManualBlock() : setConfirmBlockOpen(true))
    return (
      <div>
        <TopoN0 titulo={t.companyName} subtitulo={ehAppDesteAparelho ? 'Ambiente deste aparelho' : t.real ? 'Cliente cadastrado' : 'Tenant de exemplo'} onVoltarSub={() => setSelecionadoId(null)}
          acoes={<button type="button" title="Editar dados do cliente" aria-label="Editar dados do cliente" onClick={() => setEditarAberto(true)}
            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Pencil size={15} color="#fff" />
          </button>} />
        {editarAberto && <EditarClienteSheet tenant={t} onClose={() => setEditarAberto(false)} />}
        {excluirAberto && <ExcluirClienteSheet tenant={t} ehAppDesteAparelho={ehAppDesteAparelho} onClose={() => setExcluirAberto(false)} onExcluido={() => { setExcluirAberto(false); setSelecionadoId(null) }} />}
        {confirmBlockOpen && <ConfirmarBloqueioSheet tenant={t} onClose={() => setConfirmBlockOpen(false)} onConfirm={applyToggleManualBlock} />}
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
          {/* Acesso do cliente (11/09/2026, Decisão 67): 1 usuário por
              ambiente, então a ficha mostra o login dele e se já está
              liberado — sem isso, cadastrar acesso e não conseguir conferir
              seria meio caminho. A senha nunca é exibida. */}
          {(t.users ?? []).map((u) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontSize: 12, color: DEV_TXT2 }}>Acesso</span>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: u.status === 'ativo' ? '#fff' : AMBER, textAlign: 'right' }}>
                {u.login}{u.status === 'ativo' ? '' : ' · aguardando liberação'}
              </span>
            </div>
          ))}
        </div>
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
              onClick={() => void atualizarTenantN0(t.id, (x) => ({
                ...x,
                onboarding: 'completo',
                users: x.users.map((u) => (u.status === 'ativo' ? u : { ...u, status: 'ativo' })),
                accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: 'Acesso liberado pela Morfo', ator: 'suporte' }],
              }))}
              style={{ background: GREEN, border: 'none', borderRadius: 10, color: '#fff', padding: '10px 12px', textAlign: 'left', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Liberar acesso deste cliente
            </button>
          )}
          {/* "Entrar como este tenant" (08/09/2026, G59): REAL só pro
              tenant `t0`, o ambiente deste aparelho (mesmo banco Dexie
              local, sem barreira de backend pra atravessar) — ver
              `ehAppDesteAparelho` acima. Continua desabilitado pros exemplos
              fictícios e, desde a Decisão 67, também pros clientes
              cadastrados pela Morfo. É o ÚNICO caminho N0→N1 (G59). */}
          <button
            type="button"
            disabled={!ehAppDesteAparelho}
            title={ehAppDesteAparelho ? undefined : 'Só o ambiente deste aparelho tem aplicativo de verdade pra entrar — os demais dependem de servidor (Backlog #028)'}
            onClick={ehAppDesteAparelho ? onEntrarComoTenant : undefined}
            style={{
              background: ehAppDesteAparelho ? DEV_ACCENT : 'rgba(255,255,255,0.05)',
              border: ehAppDesteAparelho ? 'none' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: ehAppDesteAparelho ? '#fff' : DEV_TXT3,
              padding: '10px 12px',
              textAlign: 'left',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: ehAppDesteAparelho ? 'pointer' : 'not-allowed',
            }}
          >
            Entrar como este tenant (impersonate)
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
        <p style={{ fontSize: 11, color: DEV_TXT3, lineHeight: 1.6, marginTop: 14 }}>
          {ehAppDesteAparelho
            ? 'Entrar como este tenant abre o aplicativo de negócio em modo consulta, com um aviso permanente e um jeito de voltar ao painel N0 — não é uma troca de sessão, você continua logado como administrador.'
            : 'Ações acima ficam desabilitadas de propósito — exigem tenant real e servidor (Backlog #028); a tela já está pronta pra quando isso existir.'}
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
      {novoAberto && <NovoClienteSheet diasTestePadrao={defaultParams?.trialDays ?? 15} onClose={() => setNovoAberto(false)} />}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tenants.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelecionadoId(t.id)}
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
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.companyName}
              </div>
              <div style={{ fontSize: 11, color: DEV_TXT2, marginTop: 2 }}>{planoLabelDoTenant(t)}</div>
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
      <label style={labelN0Style}>Nova situação</label>
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
      accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: `Parcela de ${fmtDate(parcelaAlterar.dueDate)} marcada como ${PARCELA_ROTULO[novoStatus]}${motivo ? ` — ${motivo}` : ''}`, ator: 'suporte' }],
    }))
    setParcelaAlterar(null)
  }

  async function marcarParcelaPaga(inst: Parcela, method: string) {
    if (!tenant) return
    await atualizarTenantN0(tenant.id, (x) => ({
      ...x,
      billing: x.billing ? { ...x.billing, installments: x.billing.installments.map((i) => (i.id === inst.id ? { ...i, paid: true, paidDate: new Date().toISOString().slice(0, 10), method, cancelada: false, perda: false } : i)) } : x.billing,
      onboarding: 'completo',
      accessLog: [...(x.accessLog ?? []), { id: uid(), ts: new Date().toISOString().slice(0, 19), action: 'Pagamento de parcela confirmado pela Morfo', ator: 'suporte' }],
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
        subtitulo="Cobrança das assinaturas dos tenants"
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

/* Auditoria do cluster Financeiro/Auditoria x Kit (11/09/2026): o Kit
   filtra `platform.auditLog`, um log GLOBAL separado do `tenant.accessLog`
   — decisão de produto já tomada e documentada (`kitPlatform.ts`, nota
   acima de `verificarVencimentoPrecadastro`): o MorfoFinP unifica os dois
   num só (`accessLog`), então esta tela já lê tudo que existe pra ler, sem
   duplicar. O que realmente faltava era a CAPACIDADE DE ACHAR algo nessa
   lista — o Kit tem busca por texto + filtro por cliente/tipo/usuário/
   origem/período (`SearchFilterRow` + `FilterSheet`, Kit L6029/L6030); esta
   tela não tinha filtro NENHUM, só a lista cronológica inteira. Adicionados
   busca por texto e filtro por cliente (os 2 mais usados, e os que fazem
   sentido com os campos que `RegistroAcesso` realmente tem — `id/ts/action/
   ator`, sem `tipo` próprio). Tipo/Usuário/Origem (N0×N1×suporte) e período
   De-Até do Kit ficam de fora: exigiriam ou um campo `tipo` que
   `RegistroAcesso` não tem, ou peças de filtro (`FilterSheet`,
   `MultiFilterChips`, `DateFilterBar`) que não existem em `kitBase.tsx`/
   `PadraoUI.tsx` — fora do escopo de um agente que só edita `DevApp.tsx`. */
function AbaAuditoria() {
  const { tenants } = usePlatformN0()
  const [query, setQuery] = useState('')
  const [tenantFiltro, setTenantFiltro] = useState('')
  const eventos = tenants
    .flatMap((t) => (t.accessLog ?? []).map((ev) => ({ ...ev, tenant: t.companyName, tenantId: t.id })))
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
  const q = query.trim().toLowerCase()
  const filtrados = eventos.filter((ev) =>
    (!tenantFiltro || ev.tenantId === tenantFiltro) &&
    (!q || ev.action.toLowerCase().includes(q) || ev.tenant.toLowerCase().includes(q)))
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */
  const linhasAud: ExportRow[] = filtrados.map((ev) => ({
    ts: ev.ts.replace('T', ' ').slice(0, 16), tenant: ev.tenant, action: ev.action,
  }))
  const filtroAtivo = !!tenantFiltro || !!q
  return (
    <div>
      <TopoN0
        titulo="Auditoria"
        subtitulo="Log de ações de N0/N1/tenant"
        acoes={<IconesDeTela dark onExportar={() => setExportOpen(true)} />}
      />
      {exportOpen && <ExportSheet dark title="Auditoria" filenameBase="morfofinp-n0-auditoria"
        screenColumns={[
          { key: 'ts', label: 'Quando' },
          { key: 'tenant', label: 'Ambiente' },
          { key: 'action', label: 'Ação' },
        ]}
        screenRows={linhasAud}
        detailColumns={[
          { key: 'ts', label: 'Quando' },
          { key: 'tenant', label: 'Ambiente' },
          { key: 'action', label: 'Ação' },
        ]}
        detailRows={linhasAud}
        onClose={() => setExportOpen(false)} />}
      <AvisoDadoFicticio />
      <SearchBox dark value={query} onChange={setQuery} placeholder="Buscar por ação ou empresa..." />
      <div style={{ margin: '10px 0 14px' }}>
        <select value={tenantFiltro} onChange={(e) => setTenantFiltro(e.target.value)} style={campoN0Style}>
          <option value="">Todos os clientes</option>
          {tenants.map((t) => <option key={t.id} value={t.id}>{t.companyName}</option>)}
        </select>
      </div>
      {filtroAtivo && <TotalRegistros dark n={filtrados.length} label={filtrados.length === 1 ? 'registro' : 'registros'} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: filtroAtivo ? 8 : 0 }}>
        {filtrados.length === 0 && (
          <p style={{ fontSize: 12, color: DEV_TXT3 }}>
            {eventos.length === 0 ? 'Nenhum evento registrado ainda.' : 'Nenhum registro encontrado. Ajuste a busca ou o filtro.'}
          </p>
        )}
        {filtrados.map((ev) => (
          <div key={ev.id} style={{ background: DEV_CARD, borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ fontSize: 11, color: DEV_TXT2 }}>{ev.ts.replace('T', ' ').slice(0, 16)}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', marginTop: 2 }}>{ev.tenant}</div>
            <div style={{ fontSize: 12, color: DEV_TXT2, marginTop: 1 }}>{ev.action}</div>
          </div>
        ))}
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
  const [valorMensal, setValorMensal] = useState('0')
  const [limiteUsuarios, setLimiteUsuarios] = useState('3')
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
    setValorMensal(String(p.valorMensal))
    setLimiteUsuarios(String(p.limiteUsuarios ?? PLANO_PADRAO_KIT.limiteUsuarios))
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
    setLimiteUsuarios(String(PLANO_PADRAO_KIT.limiteUsuarios))
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

  // Regra de gravação do Kit: `canSave = name && (gratuito ? validadeDias > 0 : monthlyValue > 0)`.
  const podeSalvar = Boolean(nome.trim()) && (gratuito ? Number(validadeDias) > 0 : Number(valorMensal.replace(',', '.')) > 0)

  async function salvar() {
    if (!podeSalvar) return
    const dados = {
      nome: nome.trim(),
      porte,
      gratuito,
      validadeDias: gratuito ? Number(validadeDias) : null,
      valorMensal: gratuito ? 0 : Number(valorMensal.replace(',', '.')) || 0,
      limiteUsuarios: Number(limiteUsuarios) || 1,
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
      limiteUsuarios: Number(limiteUsuarios) || 1,
      restricoes: { exportacaoDetalhada: expDetalhada, layoutPersonalizado: layoutPersonalizado },
      funcionalidades: listaFuncionalidades,
    })
    return (
      <div>
        <TopoN0 titulo={editandoId === 'novo' ? 'Novo plano' : 'Editar plano'} onVoltarSub={() => setEditandoId(null)} />
        <label style={labelN0Style} htmlFor="plano-nome">Nome do plano</label>
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
            <label style={labelN0Style} htmlFor="plano-valor">Valor mensal (R$)</label>
            <input id="plano-valor" style={campoN0Style} value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} />
          </>
        )}

        <label style={labelN0Style} htmlFor="plano-usuarios">Limite de usuários</label>
        <input id="plano-usuarios" type="number" min="1" style={campoN0Style} value={limiteUsuarios} onChange={(e) => setLimiteUsuarios(e.target.value)} />

        <label style={labelN0Style} htmlFor="plano-desc">Descrição curta</label>
        <input id="plano-desc" style={campoN0Style} value={descricaoCurta} onChange={(e) => setDescricaoCurta(e.target.value)} placeholder="Uma frase sobre pra quem é esse plano" />

        <label style={labelN0Style} htmlFor="plano-func">Funcionalidades (uma por linha)</label>
        <textarea id="plano-func" style={{ ...campoN0Style, minHeight: 90, fontFamily: 'inherit', resize: 'vertical' }} value={funcionalidades} onChange={(e) => setFuncionalidades(e.target.value)} placeholder={'5 usuários\nSuporte prioritário'} />

        <label style={labelN0Style}>Acesso liberado neste plano</label>
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
          <p style={{ fontSize: 11, color: DEV_TXT2, margin: '6px 2px 0' }}>
            {nome.trim() ? (gratuito ? 'Informe a validade em dias (maior que zero).' : 'Informe o valor mensal (maior que zero) ou marque “Plano gratuito, com validade”.') : 'Informe o nome do plano.'}
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
              {p.porte ?? PLANO_PADRAO_KIT.porte} · {p.limiteUsuarios ?? PLANO_PADRAO_KIT.limiteUsuarios} usuário(s)
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
      <label style={labelN0Style} htmlFor="devuser-nome">Nome completo</label>
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
      <label style={labelN0Style} htmlFor="devuser-perfil">Perfil de acesso</label>
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
      titulo={editando === 'novo' ? 'Novo administrador' : 'Editar administrador'} onFechar={() => setEditando(null)} />
  }

  return (
    <div>
      <TopoN0 titulo="Usuários Morfo (administradores)" subtitulo="Login/senha reais de quem acessa o painel N0" onVoltarSub={onVoltarSub} />
      <p style={{ fontSize: 11, color: DEV_TXT3, lineHeight: 1.6, marginTop: 0, marginBottom: 14 }}>
        Cada linha aqui é uma credencial de verdade (login/senha, não só um registro informativo) — o mesmo dado que
        a tela de Login usa pra autenticar no painel N0. O perfil de acesso decide o que cada administrador pode ver
        e fazer (ver "Gerenciador Permissões MorfoMod").
      </p>
      {erro && <div style={{ fontSize: 12, color: '#F5615C', marginBottom: 10, fontWeight: 700 }}>{erro}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {devUsers.length === 0 && <p style={{ fontSize: 12, color: DEV_TXT3 }}>Nenhum administrador registrado ainda.</p>}
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
        + Novo administrador
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
  | 'marca' | 'planos' | 'usuarios' | 'permissoes' | 'testesMorfo' | 'limpezasMorfo' | 'layout' | 'site' | null

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

// `podeVerFuncN0` (10/09/2026, Decisão 54 Parte B) — gating real por perfil
// de acesso, derivado de `perfilMorfoLogado` no shell (`DevApp` abaixo) e
// repassado por prop; cada sub-item de Parâmetros só aparece quando
// `nivelAcesso` devolve algo além de `null` pra `parametros.<chave>`.
function AbaParametros({ podeVerFuncN0 }: { podeVerFuncN0: (k: string) => boolean }) {
  const [sub, setSub] = useState<SubParametros>(null)

  const voltar = () => setSub(null)
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
  if (sub === 'layout') return <TelaGrupoN0 titulo="Layout do Sistema" subtitulo="Vale pro N1 e pro N0" onVoltarSub={voltar} render={(n) => <SubParametrosLayout notify={n} />} />
  if (sub === 'testesCliente') return <TelaGrupoN0 titulo="Gerar Teste no Cliente" subtitulo="Massa fictícia no ambiente de um cliente" onVoltarSub={voltar} render={(n) => <SubTesteCliente notify={n} />} />
  if (sub === 'testesMorfo') return <TelaGrupoN0 titulo="Gerar Teste Morfo" subtitulo="Massa fictícia nos registros do painel N0" onVoltarSub={voltar} render={(n) => <SubTesteMorfo notify={n} />} />
  if (sub === 'limpezasCliente') return <TelaGrupoN0 titulo="Limpar Dados do Cliente" subtitulo="Teste e reais — checagem dupla" onVoltarSub={voltar} render={(n) => <SubLimpezaCliente notify={n} />} />
  if (sub === 'limpezasMorfo') return <TelaGrupoN0 titulo="Limpar Dados da Morfo" subtitulo="Teste e reais — checagem dupla" onVoltarSub={voltar} render={(n) => <SubLimpezaMorfo notify={n} />} />

  // Kit L509-L513 / L1600-L1700: os itens de Parâmetros agrupados pelas MESMAS
  // 3 sessões da árvore de permissão (`FUNCOES_PERFIL_N0`), na ordem do Kit.
  const todosItens: { chave: Exclude<SubParametros, null>; titulo: string; hint: string; sessao: string }[] = [
    { sessao: 'Meus Dados/Ambiente', chave: 'meusDados', titulo: 'Meus Dados', hint: 'Seu cadastro de administrador: nome, contato, login e senha' },
    { sessao: 'Meus Dados/Ambiente', chave: 'alertas', titulo: 'Meus Alertas', hint: 'Avisos de vencimento, atraso e resumo financeiro das assinaturas' },
    { sessao: 'Ambiente do Cliente', chave: 'assinatura', titulo: 'Assinatura e Bloqueio', hint: 'Tolerância, dia de vencimento, dias de teste e aviso de fim de teste' },
    { sessao: 'Ambiente do Cliente', chave: 'ambiente', titulo: 'Ambiente dos Clientes', hint: 'Pré-cadastro, acesso de suporte (autorização e modo) e retenção de dados' },
    { sessao: 'Ambiente do Cliente', chave: 'chat', titulo: 'Gerenciar Chat', hint: 'Mensagem automática, follow-up e horário de atendimento por dia' },
    { sessao: 'Ambiente do Cliente', chave: 'testesCliente', titulo: 'Gerar Teste no Cliente', hint: 'Massa de dados fictícios dentro do ambiente de um cliente (só ambiente vazio)' },
    { sessao: 'Ambiente do Cliente', chave: 'limpezasCliente', titulo: 'Limpar Dados do Cliente', hint: 'Apaga dados de teste ou reais do ambiente — checagem dupla' },
    { sessao: 'Ambiente MorfoFinP ADM', chave: 'marca', titulo: 'Marca', hint: 'Logos da Morfo e do produto por contexto + canal de suporte (WhatsApp)' },
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{it.titulo}</div>
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

export default function DevApp({ onEntrarComoTenant }: { onEntrarComoTenant: () => void }) {
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
  const abasVisiveis = ABAS.filter((a) => podeVerFuncN0(a.key))

  const [abaEscolhida, setAba] = useState<AbaN0>('inicio')
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
      {aba !== 'auditoria' && <FiltroDadosBar filtroDados={filtroDados} setFiltroDados={setFiltroDados} />}

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {suporteGeralAberto ? (
          <CentralSuporteN0 onClose={() => setSuporteGeralAberto(false)} />
        ) : (
          <>
            {aba === 'inicio' && podeVerFuncN0('inicio') && <AbaInicio filtroDados={filtroDados} onIrPara={setAba} onAbrirSuporte={() => setSuporteGeralAberto(true)} />}
            {aba === 'tenants' && podeVerFuncN0('tenants') && <AbaTenants onEntrarComoTenant={onEntrarComoTenant} filtroDados={filtroDados} />}
            {aba === 'financeiro' && podeVerFuncN0('financeiro') && <AbaFinanceiro filtroDados={filtroDados} />}
            {aba === 'auditoria' && podeVerFuncN0('auditoria') && <AbaAuditoria />}
            {aba === 'parametros' && podeVerFuncN0('parametros') && <AbaParametros podeVerFuncN0={podeVerFuncN0} />}
            {aba === 'indicadores' && podeVerFuncN0('indicadores') && <IndicadoresDevScreen filtroDados={filtroDados} />}
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
          setAba(k as AbaN0)
        }}
      />
    </div>
    </LayoutContext.Provider>
  )
}
