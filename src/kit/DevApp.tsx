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
} from './kitPlatform'
import { PerfisAcessoContent } from './PerfisAcesso'
import { LayoutContext, TopIconMenu, UserHoverIcon, IconesDeTela, type ItemMenuTopo } from './TopoIcones'
import { ExportSheet, type ExportRow } from './ExportSheet'
import { RotateCcw, LogOut, AlertTriangle, Timer, ShieldAlert, UserPlus, Plus, FileBadge, Settings, MessageCircle } from 'lucide-react'
import { alpha, GREEN, AMBER, RED, SectionLabel, DEV_BG, DEV_CARD, DEV_ACCENT, Segmented, AddressFieldsBasic, normalizeAddress, validaCPF, validaTelefone, validaEmailEnvio, type Endereco } from './kitBase'
import { ESPACO_LINHA, InfoDot, IndicatorStrip, QuickAction, TotalRegistros, formatMoneyShort } from './PadraoUI'
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

/* ---- N0 Início — reconstruído nesta rodada a partir de `DevInicioScreen` do
   Kit (L5690-L5765). Item 18 do CONTRATO DE EXECUÇÃO: "atalhos do N0 Início" e
   "seção Situações que precisam de atenção", conferidos individualmente.

   O que existia antes: 4 KPIs numa grade 2×2 e nada mais — sem atalhos, sem a
   seção de atenção. A grade 2×2 é justamente o que o Padrão de Interface (seção
   3) manda trocar pela faixa de indicadores de uma linha. ---- */
function AbaInicio({ filtroDados, onIrPara }: { filtroDados: FiltroDados; onIrPara: (aba: AbaN0) => void }) {
  const platform = usePlatformN0()
  const tenants = filtrarTenantsPorDados(platform.tenants, filtroDados)
  const [exportOpen, setExportOpen] = useState(false)

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
        acoes={<IconesDeTela dark onExportar={() => setExportOpen(true)} />}
      />
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
        <QuickAction dark icon={MessageCircle} label="Suporte" onClick={() => onIrPara('tenants')}
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

function AbaTenants({ onEntrarComoTenant, filtroDados }: { onEntrarComoTenant: () => void; filtroDados: FiltroDados }) {
  const { tenants: todos, defaultParams } = usePlatformN0()
  const tenants = filtrarTenantsPorDados(todos, filtroDados)
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [chatAberto, setChatAberto] = useState(false)
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */
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
    return (
      <div>
        <TopoN0 titulo={t.companyName} subtitulo={t.real ? 'Tenant real' : 'Tenant de exemplo'} onVoltarSub={() => setSelecionadoId(null)} />
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
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {/* "Entrar como este tenant" (08/09/2026, G59): REAL só pro
              tenant `t0` (o único de verdade — mesmo banco Dexie local, sem
              barreira de backend pra atravessar). Continua desabilitado
              pros 3 exemplos fictícios — não existe "aplicativo" de
              verdade pra entrar neles. É o ÚNICO caminho N0→N1 (G59). */}
          <button
            type="button"
            disabled={!t.real}
            title={t.real ? undefined : 'Tenant de exemplo (fictício) — não existe aplicativo de verdade pra entrar'}
            onClick={t.real ? onEntrarComoTenant : undefined}
            style={{
              background: t.real ? DEV_ACCENT : 'rgba(255,255,255,0.05)',
              border: t.real ? 'none' : '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: t.real ? '#fff' : DEV_TXT3,
              padding: '10px 12px',
              textAlign: 'left',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: t.real ? 'pointer' : 'not-allowed',
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
        </div>
        <p style={{ fontSize: 11, color: DEV_TXT3, lineHeight: 1.6, marginTop: 14 }}>
          {t.real
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
        acoes={<IconesDeTela dark onExportar={() => setExportOpen(true)} />}
      />
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

function AbaFinanceiro({ filtroDados }: { filtroDados: FiltroDados }) {
  const { tenants: todos } = usePlatformN0()
  const tenants = filtrarTenantsPorDados(todos, filtroDados)
  const mrrTotal = tenants.reduce((soma, t) => soma + mrrDoTenant(t), 0)
  const cobrando = tenants.filter((t) => mrrDoTenant(t) > 0)
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */
  const linhasFin: ExportRow[] = tenants.map((t) => ({
    companyName: t.companyName, status: statusDoTenant(t), mrr: fmtBRL(mrrDoTenant(t)), plano: planoLabelDoTenant(t),
  }))
  return (
    <div>
      <TopoN0
        titulo="Financeiro"
        subtitulo="Cobrança das assinaturas dos tenants"
        acoes={<IconesDeTela dark onExportar={() => setExportOpen(true)} />}
      />
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
          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: DEV_CARD,
                borderRadius: 12,
                padding: '11px 14px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.companyName}
                </div>
                <div style={{ fontSize: 11, color: DEV_TXT2 }}>{planoLabelDoTenant(t)}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: status === 'inadimplente' ? STATUS_COR.inadimplente : '#fff' }}>
                {fmtBRL(mrrDoTenant(t))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AbaAuditoria() {
  const { tenants } = usePlatformN0()
  const eventos = tenants
    .flatMap((t) => (t.accessLog ?? []).map((ev) => ({ ...ev, tenant: t.companyName })))
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */
  const linhasAud: ExportRow[] = eventos.map((ev) => ({
    ts: ev.ts.replace('T', ' ').slice(0, 16), tenant: ev.tenant, action: ev.action,
  }))
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {eventos.length === 0 && <p style={{ fontSize: 12, color: DEV_TXT3 }}>Nenhum evento registrado ainda.</p>}
        {eventos.map((ev) => (
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
function SubParametrosUsuarios({ onVoltarSub }: { onVoltarSub: () => void }) {
  const platform = usePlatformN0()
  const devUsers = platform.devUsers ?? []
  const perfis = platform.perfisMorfo ?? perfisPadraoN0()
  const [editando, setEditando] = useState<DevUserN0 | 'novo' | null>(null)
  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [perfilId, setPerfilId] = useState('admin')
  const [erro, setErro] = useState('')
  // CPF / E-mail / Telefone / Endereço (10/09/2026, Decisão 58): o Kit
  // (`DevUserMorfoSheet`, L1471) sempre teve os quatro, com validação de
  // máscara; aqui só existiam nome/login/senha/perfil.
  const [cpf, setCpf] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState<Endereco>(normalizeAddress(null))

  function abrirEdicao(u: DevUserN0) {
    setEditando(u); setNome(u.name); setLogin(u.login); setSenha(u.senha); setPerfilId(u.perfilId || 'admin'); setErro('')
    setCpf(u.cpf || ''); setEmail(u.email || ''); setTelefone(u.phone || ''); setEndereco(normalizeAddress(u.address))
  }
  function abrirNovo() {
    setEditando('novo'); setNome(''); setLogin(''); setSenha(''); setPerfilId('admin'); setErro('')
    setCpf(''); setEmail(''); setTelefone(''); setEndereco(normalizeAddress(null))
  }

  const cpfOk = validaCPF(cpf)
  const telOk = !!telefone.trim() && validaTelefone(telefone)
  const mailOk = validaEmailEnvio(email)
  const endOk = !!(endereco.cep.trim() && endereco.logradouro.trim() && endereco.cidade.trim() && endereco.uf.trim())

  // Última proteção de admin (G59/Kit `contaAdminsAtivos`): nunca deixar o
  // painel N0 sem NENHUM administrador ativo — sem backend/recuperação de
  // senha de verdade, isso trancaria o próprio Rafael pra fora do painel.
  function ehUltimoAdminAtivo(u: DevUserN0): boolean {
    return (u.perfilId || 'admin') === 'admin' && u.status !== 'inativo' && contaAdminsAtivos(devUsers) <= 1
  }

  async function salvar() {
    const loginN = login.trim().toLowerCase()
    if (!nome.trim() || !loginN || !senha.trim()) { setErro('Preencha nome, login e senha.'); return }
    // Mesma regra de gravação do Kit (`canSave`, L1485): nome + CPF + e-mail
    // + telefone + endereço + login + senha + perfil.
    if (!cpfOk) { setErro('CPF inválido.'); return }
    if (!mailOk) { setErro('E-mail inválido.'); return }
    if (!telOk) { setErro('Telefone inválido (use DDD + número).'); return }
    if (!endOk) { setErro('Preencha CEP, logradouro, cidade e UF.'); return }
    const idAtual = editando !== 'novo' && editando ? editando.id : undefined
    if (loginJaEmUsoGlobalmente({ devUsers, tenants: platform.tenants }, loginN, { devUserId: idAtual })) {
      setErro('Esse login já está em uso (N0 ou N1).'); return
    }
    if (editando !== 'novo' && editando && ehUltimoAdminAtivo(editando) && perfilId !== 'admin') {
      setErro('Este é o único administrador ativo — mude o perfil de outro usuário antes, ou crie um 2º administrador.'); return
    }
    const campos = { name: nome.trim(), login: loginN, senha, perfilId, cpf: cpf.trim(), email: email.trim(), phone: telefone.trim(), address: endereco }
    await atualizarDevUsersN0((lista) => {
      if (editando === 'novo') return [...lista, { id: `dev-${Date.now().toString(36)}`, ...campos, status: 'ativo', createdAt: new Date().toISOString() }]
      return lista.map((u) => (u.id === editando?.id ? { ...u, ...campos } : u))
    })
    setEditando(null)
  }

  async function alternarAtivo(u: DevUserN0) {
    if (u.status !== 'inativo' && ehUltimoAdminAtivo(u)) { setErro('Não é possível inativar o único administrador ativo.'); return }
    await atualizarDevUsersN0((lista) => lista.map((x) => (x.id === u.id ? { ...x, status: x.status === 'inativo' ? 'ativo' : 'inativo' } : x)))
  }

  if (editando !== null) {
    return (
      <div>
        <TopoN0 titulo={editando === 'novo' ? 'Novo administrador' : 'Editar administrador'} onVoltarSub={() => setEditando(null)} />
        <label style={labelN0Style} htmlFor="devuser-nome">Nome completo</label>
        <input id="devuser-nome" style={campoN0Style} value={nome} onChange={(e) => setNome(e.target.value)} />
        <label style={labelN0Style} htmlFor="devuser-cpf">CPF</label>
        <input id="devuser-cpf" style={campoN0Style} value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
        {cpf.trim() !== '' && !cpfOk && <div style={{ fontSize: 11, color: '#F5615C', fontWeight: 700, marginTop: 4 }}>CPF inválido</div>}
        <label style={labelN0Style} htmlFor="devuser-email">E-mail</label>
        <input id="devuser-email" type="email" style={campoN0Style} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@morfo.com.br" />
        {email.trim() !== '' && !mailOk && <div style={{ fontSize: 11, color: '#F5615C', fontWeight: 700, marginTop: 4 }}>E-mail inválido</div>}
        <label style={labelN0Style} htmlFor="devuser-tel">Telefone</label>
        <input id="devuser-tel" style={campoN0Style} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" />
        {telefone.trim() !== '' && !telOk && <div style={{ fontSize: 11, color: '#F5615C', fontWeight: 700, marginTop: 4 }}>Telefone inválido (use DDD + número)</div>}
        <SectionLabel dark>Endereço</SectionLabel>
        <AddressFieldsBasic dark value={endereco} onChange={setEndereco} />
        <label style={labelN0Style} htmlFor="devuser-login">Usuário (login)</label>
        <input id="devuser-login" style={campoN0Style} value={login} onChange={(e) => setLogin(e.target.value)} />
        <label style={labelN0Style} htmlFor="devuser-senha">Senha</label>
        <input id="devuser-senha" style={campoN0Style} value={senha} onChange={(e) => setSenha(e.target.value)} />
        <label style={labelN0Style} htmlFor="devuser-perfil">Perfil de acesso</label>
        <select id="devuser-perfil" style={campoN0Style} value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
          {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        {erro && <div style={{ fontSize: 12, color: '#F5615C', marginTop: 10, fontWeight: 700 }}>{erro}</div>}
        <button type="button" onClick={salvar} style={{ width: '100%', marginTop: 16, background: DEV_ACCENT, border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Salvar administrador
        </button>
      </div>
    )
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
            <button type="button" onClick={() => abrirEdicao(u)} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>
              Editar
            </button>
            <button
              type="button"
              onClick={() => alternarAtivo(u)}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              {u.status !== 'inativo' ? 'Ativo' : 'Inativo'}
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={abrirNovo} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: `1px dashed ${DEV_ACCENT}66`, borderRadius: 10, padding: 12, color: DEV_ACCENT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        + Novo administrador
      </button>
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

type SubParametros = 'alertas' | 'assinatura' | 'ambiente' | 'chat' | 'testesCliente' | 'limpezasCliente'
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
        position: 'fixed',
        inset: 0,
        background: DEV_BG,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
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
        {aba === 'inicio' && podeVerFuncN0('inicio') && <AbaInicio filtroDados={filtroDados} onIrPara={setAba} />}
        {aba === 'tenants' && podeVerFuncN0('tenants') && <AbaTenants onEntrarComoTenant={onEntrarComoTenant} filtroDados={filtroDados} />}
        {aba === 'financeiro' && podeVerFuncN0('financeiro') && <AbaFinanceiro filtroDados={filtroDados} />}
        {aba === 'auditoria' && podeVerFuncN0('auditoria') && <AbaAuditoria />}
        {aba === 'parametros' && podeVerFuncN0('parametros') && <AbaParametros podeVerFuncN0={podeVerFuncN0} />}
        {aba === 'indicadores' && podeVerFuncN0('indicadores') && <IndicadoresDevScreen filtroDados={filtroDados} />}
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
          setAba(k as AbaN0)
        }}
      />
    </div>
    </LayoutContext.Provider>
  )
}
