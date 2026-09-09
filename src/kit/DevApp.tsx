import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  HomeIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { db } from '../db'
import { sairN0 } from './authN0'
import { useTodosPlanos, criarPlano, atualizarPlano, inativarPlano, reativarPlano, type Plano } from './planos'
import { useMarcaSite, salvarMarcaSite } from '../configuracaoIcones'
import SiteParametrosN0 from './SiteParametrosN0'

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
// tenant de verdade (o próprio Rafael). Continua igual à Decisão 22 — só
// Tenants ganhou a ação real de impersonar o tenant t0, o resto permanece
// front-end de validação de layout com dado marcado "(exemplo)".

const DEV_BG = '#141319'
const DEV_CARD = '#201E28'
const DEV_ACCENT = '#8B7CF6'
const DEV_TXT2 = '#9B96A8'
const DEV_TXT3 = '#6b6674'

type AbaN0 = 'inicio' | 'tenants' | 'financeiro' | 'auditoria' | 'parametros'

const ABAS: { key: AbaN0; label: string; Icone: typeof HomeIcon }[] = [
  { key: 'inicio', label: 'Início', Icone: HomeIcon },
  { key: 'tenants', label: 'Tenants', Icone: BuildingOffice2Icon },
  { key: 'financeiro', label: 'Financeiro', Icone: BanknotesIcon },
  { key: 'auditoria', label: 'Auditoria', Icone: ClipboardDocumentListIcon },
  { key: 'parametros', label: 'Parâmetros', Icone: Cog6ToothIcon },
]

// ---- Dados fictícios (ver nota acima) ------------------------------------

type StatusTenant = 'ativo' | 'teste' | 'inadimplente'

interface TenantFicticio {
  id: string
  nome: string
  plano: string
  status: StatusTenant
  desde: string
  mrr: number
  real: boolean
}

const TENANTS_FICTICIOS: TenantFicticio[] = [
  { id: 't0', nome: 'MorfoFinP — Rafael', plano: '— (sem cobrança/backend ainda)', status: 'ativo', desde: '05/09/2026', mrr: 0, real: true },
  { id: 't1', nome: 'Ana Beatriz Souza (exemplo)', plano: 'Completo', status: 'ativo', desde: '12/03/2026', mrr: 39.9, real: false },
  { id: 't2', nome: 'Carlos Eduardo Lima (exemplo)', plano: 'Essencial', status: 'teste', desde: '28/08/2026', mrr: 0, real: false },
  { id: 't3', nome: 'Fernanda Ramos (exemplo)', plano: 'Completo', status: 'inadimplente', desde: '02/01/2026', mrr: 39.9, real: false },
]

const AUDITORIA_FICTICIA = [
  { data: '08/09/2026 09:14', quem: 'Ana Beatriz Souza (exemplo)', acao: 'Trocou de plano: Essencial → Completo' },
  { data: '07/09/2026 21:02', quem: 'Fernanda Ramos (exemplo)', acao: 'Cobrança recusada (cartão vencido)' },
  { data: '05/09/2026 18:40', quem: 'MorfoFinP — Rafael', acao: 'Criou acesso (autocadastro)' },
  { data: '28/08/2026 10:11', quem: 'Carlos Eduardo Lima (exemplo)', acao: 'Início de teste gratuito' },
]

const STATUS_ROTULO: Record<StatusTenant, string> = {
  ativo: 'Ativo',
  teste: 'Em teste',
  inadimplente: 'Inadimplente',
}
const STATUS_COR: Record<StatusTenant, string> = {
  ativo: '#3DDC97',
  teste: '#F5C451',
  inadimplente: '#F5615C',
}

function fmtBRL(v: number): string {
  if (v === 0) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ---- Peças de UI compartilhadas desta tela -------------------------------

function TopoN0({ titulo, subtitulo, onVoltarSub }: { titulo: string; subtitulo?: string; onVoltarSub?: () => void }) {
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
      <h2 style={{ fontSize: 17, margin: 0, color: '#fff' }}>{titulo}</h2>
      {subtitulo && <p style={{ fontSize: 12, color: DEV_TXT2, margin: '4px 0 0' }}>{subtitulo}</p>}
    </div>
  )
}

function KpiCard({ label, valor, sub }: { label: string; valor: string; sub?: string }) {
  return (
    <div style={{ background: DEV_CARD, borderRadius: 14, padding: '14px 14px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: DEV_TXT2, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 4 }}>{valor}</div>
      {sub && <div style={{ fontSize: 11, color: DEV_TXT2, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

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
      Tenants marcados <strong style={{ color: DEV_TXT2 }}>(exemplo)</strong> são dado fictício — só pra mostrar como
      esta tela funciona com vários tenants. Nenhuma ação aqui muda dado real (sem backend ainda, Backlog #028).
    </p>
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

function AbaInicio() {
  const ativos = TENANTS_FICTICIOS.filter((t) => t.status === 'ativo').length
  const mrrTotal = TENANTS_FICTICIOS.reduce((soma, t) => soma + t.mrr, 0)
  const inadimplentes = TENANTS_FICTICIOS.filter((t) => t.status === 'inadimplente').length
  return (
    <div>
      <TopoN0 titulo="Visão geral" subtitulo="Resumo da plataforma Morfo" />
      <AvisoDadoFicticio />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <KpiCard label="Tenants ativos" valor={String(ativos)} sub={`${TENANTS_FICTICIOS.length} no total`} />
        <KpiCard label="MRR" valor={fmtBRL(mrrTotal)} sub="receita recorrente/mês" />
        <KpiCard label="Inadimplentes" valor={String(inadimplentes)} sub="cobrança pendente" />
        <KpiCard label="Usuários Morfo" valor="1" sub="administradores" />
      </div>
      <p style={{ fontSize: 11.5, color: DEV_TXT3, lineHeight: 1.6, marginTop: 20 }}>
        Os números acima somam os tenants de exemplo desta tela — quando o backend real existir, passam a somar
        tenants de verdade automaticamente, sem mudar a estrutura da tela.
      </p>
    </div>
  )
}

function AbaTenants({ onEntrarComoTenant }: { onEntrarComoTenant: () => void }) {
  const [selecionado, setSelecionado] = useState<TenantFicticio | null>(null)

  if (selecionado) {
    const t = selecionado
    return (
      <div>
        <TopoN0 titulo={t.nome} subtitulo={t.real ? 'Tenant real' : 'Tenant de exemplo'} onVoltarSub={() => setSelecionado(null)} />
        <div style={{ background: DEV_CARD, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: DEV_TXT2 }}>Status</span>
            <Badge status={t.status} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: DEV_TXT2 }}>Plano</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{t.plano}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: DEV_TXT2 }}>Cliente desde</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{t.desde}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: DEV_TXT2 }}>Cobrança mensal</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{fmtBRL(t.mrr)}</span>
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
      <TopoN0 titulo="Tenants" subtitulo={`${TENANTS_FICTICIOS.length} ambientes`} />
      <AvisoDadoFicticio />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TENANTS_FICTICIOS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSelecionado(t)}
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
                {t.nome}
              </div>
              <div style={{ fontSize: 11, color: DEV_TXT2, marginTop: 2 }}>{t.plano}</div>
            </div>
            <Badge status={t.status} />
            <ChevronRightIcon width={16} height={16} color={DEV_TXT2} />
          </button>
        ))}
      </div>
    </div>
  )
}

function AbaFinanceiro() {
  const mrrTotal = TENANTS_FICTICIOS.reduce((soma, t) => soma + t.mrr, 0)
  const cobrando = TENANTS_FICTICIOS.filter((t) => t.mrr > 0)
  return (
    <div>
      <TopoN0 titulo="Financeiro" subtitulo="Cobrança das assinaturas dos tenants" />
      <AvisoDadoFicticio />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <KpiCard label="MRR total" valor={fmtBRL(mrrTotal)} />
        <KpiCard label="Cobranças ativas" valor={String(cobrando.length)} sub={`de ${TENANTS_FICTICIOS.length} tenants`} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TENANTS_FICTICIOS.map((t) => (
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
                {t.nome}
              </div>
              <div style={{ fontSize: 11, color: DEV_TXT2 }}>{t.plano}</div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: t.status === 'inadimplente' ? STATUS_COR.inadimplente : '#fff' }}>
              {fmtBRL(t.mrr)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AbaAuditoria() {
  return (
    <div>
      <TopoN0 titulo="Auditoria" subtitulo="Log de ações de N0/N1/tenant" />
      <AvisoDadoFicticio />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {AUDITORIA_FICTICIA.map((ev, i) => (
          <div key={i} style={{ background: DEV_CARD, borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ fontSize: 11, color: DEV_TXT2 }}>{ev.data}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', marginTop: 2 }}>{ev.quem}</div>
            <div style={{ fontSize: 12, color: DEV_TXT2, marginTop: 1 }}>{ev.acao}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---- Parâmetros: sub-telas reais e funcionais (08/09/2026, G59) ----------

function SubParametrosPlanos({ onVoltarSub }: { onVoltarSub: () => void }) {
  const planos = useTodosPlanos()
  const [editandoId, setEditandoId] = useState<number | 'novo' | null>(null)
  const [nome, setNome] = useState('')
  const [valorMensal, setValorMensal] = useState('0')
  const [funcionalidades, setFuncionalidades] = useState('')
  const [destaque, setDestaque] = useState(false)

  function abrirEdicao(p: Plano) {
    setEditandoId(p.id ?? null)
    setNome(p.nome)
    setValorMensal(String(p.valorMensal))
    setFuncionalidades(p.funcionalidades.join('\n'))
    setDestaque(Boolean(p.destaque))
  }
  function abrirNovo() {
    setEditandoId('novo')
    setNome('')
    setValorMensal('0')
    setFuncionalidades('')
    setDestaque(false)
  }

  async function salvar() {
    const dados = {
      nome: nome.trim(),
      valorMensal: Number(valorMensal.replace(',', '.')) || 0,
      funcionalidades: funcionalidades.split('\n').map((f) => f.trim()).filter(Boolean),
      destaque,
      ativo: true,
    }
    if (!dados.nome) return
    if (editandoId === 'novo') {
      await criarPlano(dados)
    } else if (typeof editandoId === 'number') {
      await atualizarPlano(editandoId, dados)
    }
    setEditandoId(null)
  }

  if (editandoId !== null) {
    return (
      <div>
        <TopoN0 titulo={editandoId === 'novo' ? 'Novo plano' : 'Editar plano'} onVoltarSub={() => setEditandoId(null)} />
        <label style={labelN0Style} htmlFor="plano-nome">Nome</label>
        <input id="plano-nome" style={campoN0Style} value={nome} onChange={(e) => setNome(e.target.value)} />
        <label style={labelN0Style} htmlFor="plano-valor">Valor mensal (R$, 0 = grátis)</label>
        <input id="plano-valor" style={campoN0Style} value={valorMensal} onChange={(e) => setValorMensal(e.target.value)} />
        <label style={labelN0Style} htmlFor="plano-func">Funcionalidades (1 por linha)</label>
        <textarea id="plano-func" style={{ ...campoN0Style, minHeight: 90, fontFamily: 'inherit' }} value={funcionalidades} onChange={(e) => setFuncionalidades(e.target.value)} />
        <button type="button" onClick={() => setDestaque((v) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}>
          <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${destaque ? DEV_ACCENT : DEV_TXT3}`, background: destaque ? DEV_ACCENT : 'transparent' }} />
          <span style={{ fontSize: 12.5 }}>Destacar como plano recomendado</span>
        </button>
        <button type="button" onClick={salvar} disabled={!nome.trim()} style={{ width: '100%', marginTop: 16, background: DEV_ACCENT, border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: nome.trim() ? 1 : 0.5 }}>
          Salvar plano
        </button>
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
                {p.valorMensal > 0 ? `R$ ${p.valorMensal.toFixed(2)}` : 'Grátis'}
              </span>
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

function SubParametrosMarca({ onVoltarSub }: { onVoltarSub: () => void }) {
  const marca = useMarcaSite()
  const [numero, setNumero] = useState(marca.whatsappNumero ?? '')
  const [mensagem, setMensagem] = useState(marca.whatsappMensagemPadrao ?? '')
  const [salvo, setSalvo] = useState(false)

  async function salvar() {
    await salvarMarcaSite({
      marcaWhatsappNumero: numero.trim() || undefined,
      marcaWhatsappMensagemPadrao: mensagem.trim() || undefined,
    })
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  return (
    <div>
      <TopoN0 titulo="Marca — canal de suporte" subtitulo="Consumido pelo botão Suporte (WhatsApp) do ambiente logado" onVoltarSub={onVoltarSub} />
      <p style={{ fontSize: 11, color: DEV_TXT3, lineHeight: 1.6, marginTop: 0, marginBottom: 14 }}>
        Deixe em branco pra usar o padrão do código. Frase de apresentação, cores, logos e páginas do site
        deslogado ficam em "Site MorfoFinP" (Decisão 49 — o antigo "selo do ecossistema" virou a frase de
        apresentação do Kit).
      </p>
      <label style={labelN0Style} htmlFor="marca-whats-numero">Número do WhatsApp de suporte</label>
      <input id="marca-whats-numero" style={campoN0Style} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="5511986897908" />
      <label style={labelN0Style} htmlFor="marca-whats-msg">Mensagem padrão do suporte</label>
      <input id="marca-whats-msg" style={campoN0Style} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Oi! Preciso de ajuda com o MorfoFinP." />
      <button type="button" onClick={salvar} style={{ width: '100%', marginTop: 16, background: DEV_ACCENT, border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
        {salvo ? 'Salvo!' : 'Salvar'}
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

function SubParametrosUsuarios({ onVoltarSub }: { onVoltarSub: () => void }) {
  const usuarios = useLiveQuery(() => db.usuariosN0.toArray(), []) ?? []
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')

  async function adicionar() {
    if (!nome.trim() || !email.trim()) return
    await db.usuariosN0.add({ nome: nome.trim(), email: email.trim().toLowerCase(), ativo: true, criadoEm: new Date().toISOString() })
    setNome('')
    setEmail('')
  }

  async function alternarAtivo(id: number | undefined, ativo: boolean) {
    if (id === undefined) return
    await db.usuariosN0.update(id, { ativo: !ativo })
  }

  return (
    <div>
      <TopoN0 titulo="Usuários Morfo (administradores)" subtitulo="Registro de quem tem acesso ao painel N0" onVoltarSub={onVoltarSub} />
      <p style={{ fontSize: 11, color: DEV_TXT3, lineHeight: 1.6, marginTop: 0, marginBottom: 14 }}>
        Sem backend (Backlog #028), a entrada em si continua usando UMA credencial só (e-mail/senha cadastrados no
        login de administrador) — esta lista é o registro de quem deveria ter acesso, não um mecanismo de
        autenticação multiusuário de verdade.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {usuarios.length === 0 && <p style={{ fontSize: 12, color: DEV_TXT3 }}>Nenhum administrador registrado ainda.</p>}
        {usuarios.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: DEV_CARD, borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: u.ativo ? '#fff' : DEV_TXT3 }}>{u.nome}</div>
              <div style={{ fontSize: 11, color: DEV_TXT2 }}>{u.email}</div>
            </div>
            <button
              type="button"
              onClick={() => alternarAtivo(u.id, u.ativo)}
              style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, color: '#fff', padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}
            >
              {u.ativo ? 'Ativo' : 'Inativo'}
            </button>
          </div>
        ))}
      </div>
      <label style={labelN0Style} htmlFor="usuario-n0-nome">Nome</label>
      <input id="usuario-n0-nome" style={campoN0Style} value={nome} onChange={(e) => setNome(e.target.value)} />
      <label style={labelN0Style} htmlFor="usuario-n0-email">E-mail</label>
      <input id="usuario-n0-email" style={campoN0Style} value={email} onChange={(e) => setEmail(e.target.value)} />
      <button type="button" onClick={adicionar} disabled={!nome.trim() || !email.trim()} style={{ width: '100%', marginTop: 12, background: 'rgba(255,255,255,0.08)', border: `1px dashed ${DEV_ACCENT}66`, borderRadius: 10, padding: 12, color: DEV_ACCENT, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: nome.trim() && email.trim() ? 1 : 0.5 }}>
        + Registrar administrador
      </button>
    </div>
  )
}

type SubParametros = 'planos' | 'site' | 'marca' | 'usuarios' | null

function AbaParametros() {
  const [sub, setSub] = useState<SubParametros>(null)

  if (sub === 'planos') return <SubParametrosPlanos onVoltarSub={() => setSub(null)} />
  if (sub === 'site') return <SubParametrosSite onVoltarSub={() => setSub(null)} />
  if (sub === 'marca') return <SubParametrosMarca onVoltarSub={() => setSub(null)} />
  if (sub === 'usuarios') return <SubParametrosUsuarios onVoltarSub={() => setSub(null)} />

  const itens: { chave: Exclude<SubParametros, null>; titulo: string; hint: string }[] = [
    { chave: 'planos', titulo: 'Gerenciar Planos', hint: 'Nome, preço e funcionalidades dos planos (Dexie, editável)' },
    { chave: 'site', titulo: 'Site MorfoFinP', hint: 'Cabeçalho, logos, frase de apresentação, cores, páginas e menu do site deslogado (padrão do Kit)' },
    { chave: 'marca', titulo: 'Marca — canal de suporte', hint: 'Número e mensagem do WhatsApp de suporte' },
    { chave: 'usuarios', titulo: 'Usuários Morfo (administradores)', hint: 'Registro de quem tem acesso a este painel N0' },
  ]
  return (
    <div>
      <TopoN0 titulo="Parâmetros" subtitulo="Configuração da plataforma" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {itens.map((it) => (
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
  )
}

export default function DevApp({ onEntrarComoTenant }: { onEntrarComoTenant: () => void }) {
  const [aba, setAba] = useState<AbaN0>('inicio')
  const [saindo, setSaindo] = useState(false)

  return (
    <div
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
        <h1 style={{ fontSize: 15, margin: 0, fontWeight: 800, color: DEV_ACCENT }}>Painel N0 — Morfo</h1>
        {/* "Sair" (08/09/2026, G59) — substitui o antigo "‹ Voltar pro
            ambiente": aquele botão trocava de camada sem passar por login
            nenhum (o atalho N0↔N1 que G59 proíbe). Sair aqui só zera
            `sessaoAtivaN0` — o administrador volta pra tela de Login (ou
            pro N1, se por acaso já tiver uma sessão de tenant própria
            ativa no mesmo navegador) — nunca pra dentro do tenant direto. */}
        <button
          type="button"
          disabled={saindo}
          onClick={async () => {
            setSaindo(true)
            await sairN0()
          }}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {aba === 'inicio' && <AbaInicio />}
        {aba === 'tenants' && <AbaTenants onEntrarComoTenant={onEntrarComoTenant} />}
        {aba === 'financeiro' && <AbaFinanceiro />}
        {aba === 'auditoria' && <AbaAuditoria />}
        {aba === 'parametros' && <AbaParametros />}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: DEV_BG,
          padding: '6px 4px calc(env(safe-area-inset-bottom, 6px) + 6px)',
          flexShrink: 0,
        }}
      >
        {ABAS.map(({ key, label, Icone }) => {
          const ativo = aba === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setAba(key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '7px 2px',
              }}
            >
              <Icone width={20} height={20} color={ativo ? DEV_ACCENT : '#7A7686'} strokeWidth={ativo ? 2.4 : 2} />
              <span style={{ fontSize: 9.5, fontWeight: 700, color: ativo ? DEV_ACCENT : '#7A7686' }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
