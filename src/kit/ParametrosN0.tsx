/* Achado do diff literal desta rodada (item 10 do CONTRATO: valor a valor).
   Este arquivo tinha uma cópia local das cores do N0, e o roxo estava em
   `#8B7CF6` — o Kit usa `#6C3FFF` (L53-L55), e como token CSS
   (`var(--mloc-dev-*)`), não hex solto. Agora vem de `kitBase.tsx`, que é a
   transcrição do Kit: mesma cor, e passa a acompanhar o `shell.css`. */
import { useState, type ReactNode } from 'react'
import { MessageCircle, Check } from 'lucide-react'
import {
  usePlatformN0, paramsGlobais, atualizarDefaultParams, atualizarChatConfig, salvarAlertSettings,
  atualizarLayoutConfig, atualizarBrandingN0, defaultAlertSettings, cleanupModeLabel,
  BRANDING_APP_LOGADO_PADRAO,
  MENU_POSICOES, normalizarMenuPosModo, posicaoMenuDe,
  ITENS_NAV_N1, ITENS_NAV_N0, ITEM_PROTEGIDO_N1, ITEM_PROTEGIDO_N0,
  DIAS_SEMANA, type CleanupMode, type AlertSettings, type DiaSemana,
  type LayoutConfig, type PosicaoMenu, type MenuPosModo,
} from './kitPlatform'
import { DEV_CARD, AMBER, GREEN, alpha, Toggle, Segmented, SecaoLayout, SectionLabel, primaryBtn, readImageAsDataUrl, LOGO_MAX_KB, DEV_ACCENT } from './kitBase'
import { useMarcaSite, salvarMarcaSite } from '../configuracaoIcones'

// N0 → Parâmetros: os grupos do Kit `esqueleto-morfo-v1.jsx` portados na
// Decisão 55 (Parte B) — "Assinatura e Bloqueio" (L1712-L1729), "Ambiente dos
// Clientes" (L1731-L1766), "Gerenciar Chat" (L1768-L1780), "Marca"
// (L1782-L1815), "Meus Alertas" (L2353 › `AlertSettingsView`, L3257-L3294) e
// "Layout do Sistema" (L2046-L2144).
//
// ADAPTAÇÕES registradas (nunca em silêncio):
//  • O Kit abre cada valor numérico numa folha (`paramRow` → sheet de edição);
//    aqui o campo é editado direto no cartão. Mesmo dado, mesma persistência,
//    um toque a menos — o Kit usa a folha porque o mesmo `paramRow` serve
//    também pra sobrescrever o parâmetro POR CLIENTE (escopo "billing"), o
//    que aqui não existe: o MorfoFinP tem um cliente real só.
//  • "Layout do Sistema": o campo `modo` (fixo/vertical/horizontal/gaveta)
//    segue FORA por decisão de produto da Etapa 4 (coluna única de 430px) —
//    o restante do grupo entra igual ao Kit. Registrado na própria tela.
//  • Nenhum parâmetro aqui dispara rotina automática (limpeza por retenção,
//    envio de aviso de fim de teste, resposta automática fora do horário):
//    são valores guardados, exatamente como no Kit, que também não tem
//    agendador — o efeito real chega com o backend (Backlog 028). A tela diz
//    isso onde é o caso, em vez de deixar parecer que já age sozinho.

const DEV_TXT2 = '#9B96A8'
// Mesmo roxo que `DevApp.tsx` usa no painel N0 (não o `DEV_ACCENT` de
// `kitBase.tsx`, que resolve pro roxo do Kit) — as telas novas ficam dentro
// do mesmo painel, misturar os dois tons apareceria na hora.

export function TituloTela({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 12, color: DEV_TXT2, margin: '0 2px 12px', lineHeight: 1.5 }}>{children}</p>
}

function CartaoDev({ children }: { children: ReactNode }) {
  return <div style={{ background: DEV_CARD, borderRadius: 14, padding: 14, marginBottom: 10 }}>{children}</div>
}

/* ---- Kit L1713-L1715 (`paramRow`): rótulo + valor numérico + sufixo ---- */
function LinhaParam({ label, valor, sufixo, min, max, onSalvar, hint }: {
  label: string; valor: number; sufixo?: string; min?: number; max?: number; onSalvar: (v: number) => void; hint?: string
}) {
  const [rascunho, setRascunho] = useState<string | null>(null)
  const mostrado = rascunho ?? String(valor)
  return <CartaoDev>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: DEV_TXT2, marginTop: 3, lineHeight: 1.45 }}>{hint}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <input
          type="number" min={min} max={max} value={mostrado}
          onChange={(e) => setRascunho(e.target.value)}
          onBlur={() => { const n = Number(mostrado); if (Number.isFinite(n)) onSalvar(n); setRascunho(null) }}
          style={{ width: 68, padding: '9px 10px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, textAlign: 'right', outline: 'none' }}
        />
        {sufixo && <span style={{ fontSize: 11.5, color: DEV_TXT2 }}>{sufixo}</span>}
      </div>
    </div>
  </CartaoDev>
}

function CampoTextoDev({ label, valor, onSalvar, linhas = 3 }: { label: string; valor: string; onSalvar: (v: string) => void; linhas?: number }) {
  const [rascunho, setRascunho] = useState<string | null>(null)
  return <CartaoDev>
    <div style={{ fontSize: 12, color: DEV_TXT2, marginBottom: 8 }}>{label}</div>
    <textarea
      rows={linhas} value={rascunho ?? valor}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={() => { if (rascunho != null) onSalvar(rascunho); setRascunho(null) }}
      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 13, lineHeight: 1.5, outline: 'none', resize: 'vertical' }}
    />
  </CartaoDev>
}

/* ================= Assinatura e Bloqueio (Kit L1712-L1729) ================= */
export function SubParametrosAssinatura({ irParaChat }: { irParaChat: () => void }) {
  const platform = usePlatformN0()
  const dp = paramsGlobais(platform)
  const tw = dp.trialWarning
  return <>
    <TituloTela>Valores padrão da assinatura de qualquer cliente novo. Sem backend de cobrança (Backlog 028), eles são o parâmetro guardado — nenhuma cobrança é disparada por aqui.</TituloTela>
    <LinhaParam label="Tolerância após vencimento" sufixo=" dia(s)" valor={dp.toleranceDays} min={0} onSalvar={(v) => void atualizarDefaultParams({ toleranceDays: v })} />
    <LinhaParam label="Dia de vencimento padrão" valor={dp.dueDay} min={1} max={28} onSalvar={(v) => void atualizarDefaultParams({ dueDay: v })} />
    <LinhaParam label="Dias de teste grátis" sufixo=" dia(s)" valor={dp.trialDays} min={0} onSalvar={(v) => void atualizarDefaultParams({ trialDays: v })} />
    <CartaoDev>
      <div style={{ fontSize: 12, color: DEV_TXT2, marginBottom: 8 }}>Aviso automático de fim de teste (chat)</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{tw.diasAntes} dia(s) antes do fim{tw.repetirTodoDia ? ' · repete todo dia' : ' · avisa uma vez'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 4px' }}>
        <input type="number" min={1} value={tw.diasAntes} onChange={(e) => void atualizarDefaultParams({ trialWarning: { ...tw, diasAntes: Number(e.target.value) || 1 } })}
          style={{ width: 68, padding: '9px 10px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, textAlign: 'right', outline: 'none' }} />
        <span style={{ fontSize: 11.5, color: DEV_TXT2, flex: 1 }}>dia(s) antes</span>
        <Toggle value={tw.repetirTodoDia} onChange={(v) => void atualizarDefaultParams({ trialWarning: { ...tw, repetirTodoDia: v } })} />
        <span style={{ fontSize: 11.5, color: DEV_TXT2 }}>repetir todo dia</span>
      </div>
    </CartaoDev>
    <CampoTextoDev label="Texto do aviso" valor={tw.texto} onSalvar={(v) => void atualizarDefaultParams({ trialWarning: { ...tw, texto: v } })} />
    {/* Kit L1727: atalho pra as outras mensagens automáticas, sem duplicar tela */}
    <button type="button" onClick={irParaChat} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: DEV_ACCENT, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: '4px 2px 0' }}>
      <MessageCircle size={13} /> Ver outras mensagens automáticas do chat
    </button>
  </>
}

/* ================= Ambiente dos Clientes (Kit L1731-L1766) ================= */
const MODOS_ACESSO: { v: 'total' | 'consulta'; l: string; d: string }[] = [
  { v: 'total', l: 'Acesso total', d: 'Pode tudo, como hoje' },
  { v: 'consulta', l: 'Somente consulta', d: 'Só visualiza — não cria, edita nem exclui nada' },
]
const MODOS_LIMPEZA: { v: CleanupMode; l: string }[] = [
  { v: 'never', l: 'Nunca excluir' }, { v: 'immediate_cancel', l: 'Imediato no cancelamento' },
  { v: 'immediate_tolerance', l: 'Imediato na tolerância' }, { v: 'days', l: 'X dias depois' },
]
export function SubParametrosAmbiente() {
  const platform = usePlatformN0()
  const dp = paramsGlobais(platform)
  return <>
    <TituloTela>Regras que valem pro ambiente de qualquer cliente.</TituloTela>
    <LinhaParam label="Prazo do pré-cadastro" hint="0 = sem prazo" sufixo=" dia(s)" valor={dp.precadastroMaxDias} min={0} onSalvar={(v) => void atualizarDefaultParams({ precadastroMaxDias: v })} />
    <LinhaParam label="Exibir/Ocultar — manter últimos (painel adm.)" hint="Quantos registros de cobrança ficam visíveis nas telas agregadas do N0." sufixo=" registro(s)" valor={dp.paymentCardsVisibleCount} min={1} onSalvar={(v) => void atualizarDefaultParams({ paymentCardsVisibleCount: v })} />

    <SectionLabel dark>Acesso de suporte</SectionLabel>
    <CartaoDev>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Respeitar autorização de acesso</div>
          <div style={{ fontSize: 11.5, color: DEV_TXT2, marginTop: 2, lineHeight: 1.45 }}>Ligado: só entra no ambiente do cliente se ele autorizou o acesso de suporte. Desligado: sempre permite entrar.</div>
        </div>
        <Toggle value={!!dp.respeitarAutorizacaoAcesso} onChange={(v) => void atualizarDefaultParams({ respeitarAutorizacaoAcesso: v })} />
      </div>
    </CartaoDev>
    <CartaoDev>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Modo de acesso do suporte no ambiente do cliente</div>
      <div style={{ fontSize: 11.5, color: DEV_TXT2, marginBottom: 10, lineHeight: 1.45 }}>Independente da autorização acima, define o que o suporte pode fazer ao acessar o ambiente de qualquer cliente (via "Entrar como este tenant").</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {MODOS_ACESSO.map((o) => {
          const ativo = (dp.modoAcessoSuporte || 'total') === o.v
          return <button key={o.v} type="button" onClick={() => void atualizarDefaultParams({ modoAcessoSuporte: o.v })}
            style={{ flex: 1, textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', border: `1.5px solid ${ativo ? DEV_ACCENT : 'rgba(255,255,255,0.12)'}`, background: ativo ? alpha(DEV_ACCENT, 13.3) : 'transparent' }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: ativo ? DEV_ACCENT : '#fff' }}>{o.l}</div>
            <div style={{ fontSize: 10.5, color: DEV_TXT2, marginTop: 2, lineHeight: 1.4 }}>{o.d}</div>
          </button>
        })}
      </div>
    </CartaoDev>

    <SectionLabel dark>Retenção de dados</SectionLabel>
    <CartaoDev>
      <div style={{ fontSize: 12, color: DEV_TXT2 }}>Depois de bloqueado/encerrado</div>
      <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 10 }}>
        {cleanupModeLabel(dp.cleanupMode)}{dp.cleanupMode === 'days' ? ` (${dp.dataRetentionDays}d)` : ''}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {MODOS_LIMPEZA.map((o) => {
          const ativo = dp.cleanupMode === o.v
          return <button key={o.v} type="button" onClick={() => void atualizarDefaultParams({ cleanupMode: o.v })}
            style={{ display: 'flex', alignItems: 'center', gap: 9, textAlign: 'left', padding: '9px 11px', borderRadius: 10, cursor: 'pointer', border: `1.5px solid ${ativo ? DEV_ACCENT : 'transparent'}`, background: 'rgba(255,255,255,0.05)' }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, border: `2px solid ${ativo ? DEV_ACCENT : DEV_TXT2}`, background: ativo ? DEV_ACCENT : 'transparent', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{o.l}</span>
          </button>
        })}
      </div>
    </CartaoDev>
    {dp.cleanupMode === 'days' && <LinhaParam label="Apagar depois de" sufixo=" dia(s)" valor={dp.dataRetentionDays} min={1} onSalvar={(v) => void atualizarDefaultParams({ dataRetentionDays: v })} />}
    <div style={{ background: alpha(AMBER, 10.2), border: `1.5px solid ${alpha(AMBER, 33.3)}`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 11.5, color: '#fff', lineHeight: 1.55 }}>
        Igual ao Kit: a retenção é um <strong>parâmetro guardado</strong> — nenhuma limpeza roda sozinha por prazo. Quem apaga dado de fato é você, nas telas "Limpar Dados" (o Kit também documenta essa mesma limitação).
      </div>
    </div>
  </>
}

/* ================= Gerenciar Chat (Kit L1768-L1780) ================= */
export function SubParametrosChat() {
  const platform = usePlatformN0()
  const chat = paramsGlobais(platform).chat
  const horarios = chat.businessHours!
  const setDia = (d: DiaSemana, patch: Partial<{ active: boolean; open: string; close: string }>) =>
    void atualizarChatConfig({ businessHours: { ...horarios, [d]: { ...horarios[d], ...patch } } })
  return <>
    <TituloTela>Mensagens automáticas e horário de atendimento do chat de suporte (N0 ↔ N1).</TituloTela>
    <CampoTextoDev label="Mensagem automática na 1ª mensagem do cliente" valor={chat.autoReplyFirstMessage || ''} onSalvar={(v) => void atualizarChatConfig({ autoReplyFirstMessage: v })} />
    <CampoTextoDev label="Mensagem fora do horário de atendimento" valor={chat.outOfHoursMessage || ''} onSalvar={(v) => void atualizarChatConfig({ outOfHoursMessage: v })} />
    <CampoTextoDev label="Mensagem de retomada (follow-up)" valor={chat.followUpMessage || ''} onSalvar={(v) => void atualizarChatConfig({ followUpMessage: v })} linhas={2} />
    <LinhaParam label="Enviar follow-up depois de" sufixo=" hora(s)" valor={chat.followUpHours || 24} min={1} onSalvar={(v) => void atualizarChatConfig({ followUpHours: v })} />
    {/* Kit L2532 — faltava aqui até 10/09/2026 (Decisão 58). Vale pros dois
        lados da conversa (cliente e suporte): é o limite que o botão de anexo
        do chat aplica antes de guardar a imagem (`ChatConversa.tsx`). */}
    <LinhaParam label="Tamanho máximo de imagem anexada" sufixo=" KB" valor={chat.maxImageKB || 3072} min={64} max={10240} onSalvar={(v) => void atualizarChatConfig({ maxImageKB: v })} />

    <SectionLabel dark>Horário de atendimento</SectionLabel>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
      {DIAS_SEMANA.map(({ k, l }) => {
        const c = horarios[k]
        return <span key={k} style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, color: c.active ? GREEN : DEV_TXT2, background: c.active ? alpha(GREEN, 13.3) : 'rgba(255,255,255,0.06)' }}>
          {l}{c.active ? ` ${c.open}-${c.close}` : ''}
        </span>
      })}
    </div>
    {DIAS_SEMANA.map(({ k, l }) => {
      const c = horarios[k]
      return <CartaoDev key={k}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', width: 38 }}>{l}</span>
          <Toggle value={c.active} onChange={(v) => setDia(k, { active: v })} />
          {c.active && <>
            <input type="time" value={c.open} onChange={(e) => setDia(k, { open: e.target.value })} style={{ padding: '7px 8px', borderRadius: 9, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12.5, outline: 'none' }} />
            <span style={{ color: DEV_TXT2, fontSize: 12 }}>até</span>
            <input type="time" value={c.close} onChange={(e) => setDia(k, { close: e.target.value })} style={{ padding: '7px 8px', borderRadius: 9, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 12.5, outline: 'none' }} />
          </>}
          {!c.active && <span style={{ fontSize: 12, color: DEV_TXT2 }}>sem atendimento</span>}
        </div>
      </CartaoDev>
    })}
  </>
}

/* ================= Meus Alertas (Kit L2353 / L3257-L3294) ================= */
export function SubParametrosAlertas({ notify }: { notify: (m: string) => void }) {
  const platform = usePlatformN0()
  const [s, setS] = useState<AlertSettings>(platform.alertSettings ?? defaultAlertSettings())
  const set = <K extends keyof AlertSettings>(key: K, patch: Partial<AlertSettings[K]>) => setS((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  return <>
    <TituloTela>Essas notificações avisam sobre as assinaturas SaaS das empresas. Sem backend (Backlog 028) elas ficam guardadas como preferência — nada é disparado por aqui ainda.</TituloTela>
    <CartaoDev>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Pagamento a vencer</div><div style={{ fontSize: 11.5, color: DEV_TXT2 }}>Avisa antes do vencimento</div></div>
        <Toggle value={s.vencendo.enabled} onChange={(v) => set('vencendo', { enabled: v })} />
      </div>
      {s.vencendo.enabled && <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="number" min={1} value={s.vencendo.diasAntes} onChange={(e) => set('vencendo', { diasAntes: Number(e.target.value) || 1 })}
          style={{ width: 68, padding: '9px 10px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, fontWeight: 700, textAlign: 'right', outline: 'none' }} />
        <span style={{ fontSize: 12, color: DEV_TXT2 }}>dia(s) antes</span>
      </div>}
    </CartaoDev>
    <CartaoDev>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Pagamento em atraso</div><div style={{ fontSize: 11.5, color: DEV_TXT2 }}>Avisa quando vencer e continuar pendente</div></div>
        <Toggle value={s.atraso.enabled} onChange={(v) => set('atraso', { enabled: v })} />
      </div>
      {s.atraso.enabled && <div style={{ marginTop: 12 }}>
        <Segmented value={s.atraso.frequencia} onChange={(v) => set('atraso', { frequencia: v })} options={[{ value: 'diario', label: 'Diário' }, { value: 'semanal', label: 'Semanal' }]} />
      </div>}
    </CartaoDev>
    <CartaoDev>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Resumo financeiro</div><div style={{ fontSize: 11.5, color: DEV_TXT2 }}>Envia um resumo periódico do financeiro</div></div>
        <Toggle value={s.resumo.enabled} onChange={(v) => set('resumo', { enabled: v })} />
      </div>
      {s.resumo.enabled && <div style={{ marginTop: 12 }}>
        <Segmented value={s.resumo.frequencia} onChange={(v) => set('resumo', { frequencia: v })} options={[{ value: 'semanal', label: 'Semanal' }, { value: 'mensal', label: 'Mensal' }]} />
      </div>}
    </CartaoDev>
    <button type="button" style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT }} onClick={() => { void salvarAlertSettings(s); notify('Preferências de alerta salvas') }}>
      <Check size={16} /> Salvar preferências de alerta
    </button>
  </>
}

/* ================= Marca (Kit L1782-L1815) ================= */
function LinhaLogo({ titulo, hint, valor, onEscolher, onLimpar }: { titulo: string; hint: string; valor?: string; onEscolher: () => void; onLimpar: () => void }) {
  return <CartaoDev>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 46, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
        {valor ? <img src={valor} alt={titulo} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 9, color: DEV_TXT2 }}>padrão</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{titulo}</div>
        <div style={{ fontSize: 11, color: DEV_TXT2, marginTop: 2, lineHeight: 1.4 }}>{hint}</div>
      </div>
      <button type="button" onClick={onEscolher} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: DEV_ACCENT, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: '7px 12px', borderRadius: 999 }}>enviar</button>
      {valor && <button type="button" onClick={onLimpar} style={{ background: 'none', border: 'none', color: DEV_TXT2, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', padding: '7px 4px' }}>limpar</button>}
    </div>
  </CartaoDev>
}

export function SubParametrosMarca({ notify }: { notify: (m: string) => void }) {
  const platform = usePlatformN0()
  const marca = useMarcaSite()
  const b = platform.brandingN0 || {}
  const escolher = (campo: 'morfoTopo' | 'morfoDocs' | 'produtoTopo' | 'produtoDocs' | 'appLogadoClara' | 'appLogadoEscura') => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*,.svg'
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return
      if (f.size / 1024 > LOGO_MAX_KB) { notify('Imagem acima de 3MB'); return }
      await atualizarBrandingN0({ [campo]: await readImageAsDataUrl(f) })
      notify('Logo atualizada')
    }
    input.click()
  }
  return <>
    <TituloTela>Logos por contexto (Kit) e o canal de suporte do produto. Sem envio, valem as logos oficiais embutidas — imagem ou SVG, até 3MB.</TituloTela>
    <SectionLabel dark>Logo da Morfo (empresa)</SectionLabel>
    <LinhaLogo titulo="Pro topo das telas" hint="Substitui a logo horizontal padrão da faixa de marca do N0" valor={b.morfoTopo} onEscolher={() => escolher('morfoTopo')} onLimpar={() => { void atualizarBrandingN0({ morfoTopo: undefined }); notify('Voltou pra logo padrão') }} />
    <LinhaLogo titulo="Pra documentos" hint="Usada nos documentos oficiais da Morfo (contratos de assinatura, recibos SaaS)" valor={b.morfoDocs} onEscolher={() => escolher('morfoDocs')} onLimpar={() => { void atualizarBrandingN0({ morfoDocs: undefined }); notify('Voltou pra logo padrão') }} />
    <SectionLabel dark>Logo do MorfoFinP (produto)</SectionLabel>
    <LinhaLogo titulo="Pro topo das telas" hint="Substitui a wordmark padrão da faixa de marca" valor={b.produtoTopo} onEscolher={() => escolher('produtoTopo')} onLimpar={() => { void atualizarBrandingN0({ produtoTopo: undefined }); notify('Voltou pra logo padrão') }} />
    <LinhaLogo titulo="Pra documentos" hint="Usada em materiais e documentos do produto" valor={b.produtoDocs} onEscolher={() => escolher('produtoDocs')} onLimpar={() => { void atualizarBrandingN0({ produtoDocs: undefined }); notify('Voltou pra logo padrão') }} />

    {/* ---- Logo do APP LOGADO (N1) — 10/09/2026. Rafael: "mesmo eu colocando
         a logo no parâmetro não reflete em lugar algum ... o logo não é só
         carregar ele, tem alinhamento, tamanho, espaçamento etc."
         As 4 linhas do Kit pra faixa de marca (logo, posição, tamanho,
         espaçamento) aplicadas ao cabeçalho do N1, e o que se edita aqui vale
         na tela na hora — `BarraMarcaN1` (App.tsx) lê exatamente estes
         campos, com a prévia abaixo desenhada com os mesmos valores. ---- */}
    <SectionLabel dark>Logo do app logado (N1)</SectionLabel>
    <LinhaLogo
      titulo="Variante clara (tema escuro)"
      hint="É a que aparece no cabeçalho quando o app está no tema escuro"
      valor={b.appLogadoClara}
      onEscolher={() => escolher('appLogadoClara')}
      onLimpar={() => { void atualizarBrandingN0({ appLogadoClara: BRANDING_APP_LOGADO_PADRAO.appLogadoClara }); notify('Voltou pra logo oficial') }}
    />
    <LinhaLogo
      titulo="Variante escura/colorida (tema claro)"
      hint="É a que aparece no cabeçalho quando o app está no tema claro"
      valor={b.appLogadoEscura}
      onEscolher={() => escolher('appLogadoEscura')}
      onLimpar={() => { void atualizarBrandingN0({ appLogadoEscura: BRANDING_APP_LOGADO_PADRAO.appLogadoEscura }); notify('Voltou pra logo oficial') }}
    />
    <CartaoDev>
      <div style={{ fontSize: 12, color: DEV_TXT2, marginBottom: 8 }}>Alinhamento na barra</div>
      <Segmented
        value={b.appLogadoPos || 'esquerda'}
        onChange={(v) => void atualizarBrandingN0({ appLogadoPos: v })}
        options={[{ value: 'esquerda', label: 'Esquerda' }, { value: 'centro', label: 'Centro' }, { value: 'direita', label: 'Direita' }]}
      />
    </CartaoDev>
    <LinhaParam label="Altura da logo" hint="Altura em pixels; a largura acompanha sozinha" sufixo="px" min={12} max={64}
      valor={b.appLogadoAltura ?? BRANDING_APP_LOGADO_PADRAO.appLogadoAltura}
      onSalvar={(v) => void atualizarBrandingN0({ appLogadoAltura: Math.min(64, Math.max(12, v)) })} />
    <LinhaParam label="Espaçamento vertical" hint="Respiro acima e abaixo, dentro da barra" sufixo="px" min={0} max={40}
      valor={b.appLogadoEspacoV ?? BRANDING_APP_LOGADO_PADRAO.appLogadoEspacoV}
      onSalvar={(v) => void atualizarBrandingN0({ appLogadoEspacoV: Math.min(40, Math.max(0, v)) })} />
    <LinhaParam label="Espaçamento lateral" hint="Respiro nas laterais, dentro da barra" sufixo="px" min={0} max={40}
      valor={b.appLogadoEspacoH ?? BRANDING_APP_LOGADO_PADRAO.appLogadoEspacoH}
      onSalvar={(v) => void atualizarBrandingN0({ appLogadoEspacoH: Math.min(40, Math.max(0, v)) })} />
    <div style={{ borderRadius: 14, marginBottom: 10, background: '#141319', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: `${b.appLogadoEspacoV ?? 8}px ${b.appLogadoEspacoH ?? 14}px`,
        justifyContent: b.appLogadoPos === 'centro' ? 'center' : undefined,
        flexDirection: b.appLogadoPos === 'direita' ? 'row-reverse' : 'row',
      }}>
        {b.appLogadoClara
          ? <img src={b.appLogadoClara} alt="Logo do app" style={{ height: b.appLogadoAltura ?? 22, width: 'auto', display: 'block' }} />
          : <span style={{ fontSize: 12, fontWeight: 800, color: '#7aa2ff' }}>MorfoFinP</span>}
        <span style={{ marginLeft: b.appLogadoPos === 'esquerda' ? 'auto' : undefined, display: 'flex', gap: 6, opacity: 0.6 }}>
          <span style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.12)' }} />
          <span style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.12)' }} />
          <span style={{ width: 22, height: 22, borderRadius: 999, background: 'rgba(255,255,255,0.12)' }} />
        </span>
      </div>
      <div style={{ fontSize: 10.5, color: DEV_TXT2, textAlign: 'center', padding: '0 0 8px' }}>Prévia do cabeçalho do app logado (tema escuro)</div>
    </div>

    <SectionLabel dark>Como vai ficar no topo</SectionLabel>
    <div style={{ borderRadius: 14, padding: '12px 0 14px', marginBottom: 16, background: '#141319', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <img src={b.morfoTopo || '/icon-192.png'} alt="Morfo" style={{ height: 15, maxWidth: 92, objectFit: 'contain', filter: b.morfoTopo ? 'none' : 'brightness(0) invert(1)', opacity: 0.92 }} />
        <span style={{ width: 1, height: 13, background: 'rgba(255,255,255,0.18)', flexShrink: 0 }} />
        {/* MESMA altura da logo da Morfo ao lado (10/09/2026, pedido do
            Rafael: as duas logos ocupam o mesmo espaço vertical) — era 11px
            contra 15px, o que fazia a segunda parecer minúscula. */}
        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', opacity: 0.92 }}>{b.produtoTopo ? <img src={b.produtoTopo} alt="MorfoFinP" style={{ height: 15, maxWidth: 92, objectFit: 'contain' }} /> : 'MorfoFinP'}</span>
      </div>
      <div style={{ fontSize: 10.5, color: DEV_TXT2, textAlign: 'center', paddingTop: 8 }}>Prévia da faixa de marca do N0 (posição fixa)</div>
    </div>

    {/* Página Externa (Login): as logos já são parametrizáveis em N0 › Site MorfoFinP (Decisão 49) — atalho registrado aqui pra não existirem 2 lugares gravando o mesmo campo */}
    <SectionLabel dark>Página Externa (tela de Login)</SectionLabel>
    <div style={{ background: alpha(AMBER, 10.2), border: `1.5px solid ${alpha(AMBER, 33.3)}`, borderRadius: 12, padding: 12, marginBottom: 16, fontSize: 11.5, color: '#fff', lineHeight: 1.55 }}>
      As logos da tela de Login (Morfo e MorfoFinP) já são editáveis em <strong>Parâmetros › Site MorfoFinP › Cabeçalho / Página de Entrar</strong>, junto da composição e posição delas. Ficam lá pra não existirem dois lugares gravando o mesmo campo.
    </div>

    <SectionLabel dark>Canal de suporte</SectionLabel>
    <CartaoDev>
      <div style={{ fontSize: 12, color: DEV_TXT2, marginBottom: 6 }}>Número do WhatsApp (só dígitos, com DDI)</div>
      <input value={marca.whatsappNumero ?? ''} onChange={(e) => void salvarMarcaSite({ marcaWhatsappNumero: e.target.value })}
        style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14, outline: 'none' }} />
    </CartaoDev>
    <CampoTextoDev label="Mensagem pré-preenchida" valor={marca.whatsappMensagemPadrao ?? ''} onSalvar={(v) => void salvarMarcaSite({ marcaWhatsappMensagemPadrao: v })} linhas={2} />
  </>
}

/* ================= Layout do Sistema (Kit L2046-L2144) ================= */
/* ---- "Menus do N1" / "Menus do N0" (Kit L1603-L1700, `renderMenusNivel`),
   portados em 10/09/2026 (Decisão 58). Duas coisas por nível, cada uma valendo
   pro app de verdade: onde cada menu aparece (Barra × "⋮" × Ocultar) e onde
   fica o botão "⋮" (as 5 posições do Kit).

   Mecânica do Kit mantida: tudo é RASCUNHO até tocar em Salvar, e enquanto
   houver pendência o título da sessão mostra o selo NÃO SALVO (por isso o
   rascunho mora no componente de fora — a sessão recolhe e desmonta o
   conteúdo, o rascunho não pode ir junto). O botão Salvar aparece no topo e
   no fim, igual ao Kit (item 162).

   Fora do Kit de propósito: "Ordem dos menus" (a deste produto é do próprio
   ambiente, ver a sessão logo abaixo) e a dependência do "Modo de navegação"
   (aqui é sempre o rodapé fixo — Etapa 4). ---- */
type DraftMenus = { posicao: Record<string, PosicaoMenu> | null; menuPos: { modo: MenuPosModo } | null }

function extrairDraftMenus(lc: LayoutConfig, nivel: 'N1' | 'N0'): DraftMenus {
  return nivel === 'N1'
    ? { posicao: lc.posicaoN1 || null, menuPos: lc.menuPosN1 || null }
    : { posicao: lc.posicaoN0 || null, menuPos: lc.menuPosN0 || null }
}

function MenusDoNivel({ nivel, draft, setDraft, sujo, onSalvar }: {
  nivel: 'N1' | 'N0'
  draft: DraftMenus
  setDraft: (f: (d: DraftMenus) => DraftMenus) => void
  sujo: boolean
  onSalvar: () => void
}) {
  const itens = nivel === 'N1' ? ITENS_NAV_N1 : ITENS_NAV_N0
  const protegido = nivel === 'N1' ? ITEM_PROTEGIDO_N1 : ITEM_PROTEGIDO_N0
  const btnModo = normalizarMenuPosModo(draft.menuPos?.modo)
  const setPos = (k: string, v: PosicaoMenu) => setDraft((d) => ({ ...d, posicao: { ...(d.posicao || {}), [k]: v } }))
  const resetBtn = (temValor: boolean, limpar: () => void) => temValor && (
    <button type="button" onClick={limpar} style={{ background: 'none', border: 'none', color: DEV_ACCENT, fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', padding: 0 }}>
      Restaurar padrão da Morfo
    </button>
  )
  const botaoSalvar = (
    <button type="button" onClick={onSalvar} disabled={!sujo}
      style={{ ...primaryBtn, width: '100%', background: sujo ? DEV_ACCENT : 'rgba(255,255,255,0.12)', opacity: sujo ? 1 : 0.6, cursor: sujo ? 'pointer' : 'default', justifyContent: 'center' }}>
      <Check size={16} /> {sujo ? `Salvar alterações dos menus do ${nivel}` : 'Tudo salvo — sem alterações pendentes'}
    </button>
  )
  return <>
    <p style={{ fontSize: 11, color: DEV_TXT2, margin: '0 2px 8px', lineHeight: 1.5 }}>
      As alterações desta sessão só passam a valer quando você tocar em <strong style={{ color: '#fff' }}>Salvar</strong> (no topo ou no fim dela) — enquanto houver mudança pendente, o título mostra o selo NÃO SALVO.
    </p>
    {sujo && <div style={{ marginBottom: 10 }}>{botaoSalvar}</div>}

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '12px 2px 6px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: DEV_TXT2 }}>Posição dos menus (Barra × "⋮" × Ocultar)</div>
      {resetBtn(!!draft.posicao, () => setDraft((d) => ({ ...d, posicao: null })))}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {itens.map((it) => (
        <div key={it.key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '7px 10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', flex: 1, minWidth: 90 }}>{it.label}</span>
          <div style={{ width: 208 }}>
            <Segmented
              value={posicaoMenuDe(draft.posicao || undefined, it, protegido)}
              onChange={(v) => setPos(it.key, v)}
              options={[
                { value: 'rodape' as const, label: 'Barra' },
                { value: 'menu' as const, label: '"⋮"' },
                ...(it.key === protegido ? [] : [{ value: 'oculto' as const, label: 'Ocultar' }]),
              ]}
            />
          </div>
        </div>
      ))}
    </div>

    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '14px 2px 6px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: DEV_TXT2 }}>Posição do botão "⋮"</div>
      {resetBtn(!!draft.menuPos, () => setDraft((d) => ({ ...d, menuPos: null })))}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {MENU_POSICOES.map((o) => (
        <button key={o.v} type="button" onClick={() => setDraft((d) => ({ ...d, menuPos: { modo: o.v } }))}
          style={{ display: 'flex', alignItems: 'flex-start', gap: 10, textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: btnModo === o.v ? `1.5px solid ${DEV_ACCENT}` : '1.5px solid transparent', background: 'rgba(255,255,255,0.05)', cursor: 'pointer' }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, border: `2px solid ${btnModo === o.v ? DEV_ACCENT : DEV_TXT2}`, background: btnModo === o.v ? DEV_ACCENT : 'transparent', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#fff' }}>{o.l}</div>
            <div style={{ fontSize: 10.5, color: DEV_TXT2, marginTop: 1, lineHeight: 1.4 }}>{o.d}</div>
          </div>
        </button>
      ))}
    </div>

    <div style={{ marginTop: 14 }}>{botaoSalvar}</div>
  </>
}

export function SubParametrosLayout({ notify }: { notify: (m: string) => void }) {
  const platform = usePlatformN0()
  const lc = platform.layoutConfig || {}
  const set = (patch: Parameters<typeof atualizarLayoutConfig>[0]) => void atualizarLayoutConfig(patch)

  const salvoN1 = extrairDraftMenus(lc, 'N1')
  const salvoN0 = extrairDraftMenus(lc, 'N0')
  const [draftN1, setDraftN1] = useState<DraftMenus>(salvoN1)
  const [draftN0, setDraftN0] = useState<DraftMenus>(salvoN0)
  const sujoN1 = JSON.stringify(draftN1) !== JSON.stringify(salvoN1)
  const sujoN0 = JSON.stringify(draftN0) !== JSON.stringify(salvoN0)
  const selo = (sujo: boolean) => sujo
    ? <span style={{ fontSize: 9.5, fontWeight: 900, color: '#3D2E00', background: AMBER, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap' }}>NÃO SALVO</span>
    : undefined
  function salvarMenus(nivel: 'N1' | 'N0') {
    const d = nivel === 'N1' ? draftN1 : draftN0
    // Campo vazio (null) volta a ser AUSÊNCIA de configuração — é o
    // "Restaurar padrão da Morfo" chegando ao dado, não um objeto vazio
    // gravado por cima (que faria o item aparecer como "cliente fora do
    // padrão" pra sempre).
    void atualizarLayoutConfig(nivel === 'N1'
      ? { posicaoN1: d.posicao ?? undefined, menuPosN1: d.menuPos ?? undefined }
      : { posicaoN0: d.posicao ?? undefined, menuPosN0: d.menuPos ?? undefined })
    notify(`Menus do ${nivel} salvos — valendo a partir de agora`)
  }

  return <>
    <TituloTela>Vale pro app inteiro (N1 e N0). Toque no título laranja de uma sessão pra abrir ou recolher — tudo nasce recolhido.</TituloTela>
    <div style={{ background: alpha(AMBER, 10.2), border: `1.5px solid ${alpha(AMBER, 33.3)}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ fontSize: 11.5, color: '#fff', lineHeight: 1.55 }}>
        O campo <strong>"Modo de navegação"</strong> do Kit (fixo / trilho vertical / faixa horizontal / gaveta) fica de fora deste produto por decisão de layout da Etapa 4: o MorfoFinP é sempre coluna única de 430px, com a barra de abas fixa no rodapé. Todo o resto do grupo está aqui.
      </div>
    </div>

    <SecaoLayout dark titulo="Menus do N1 (empresa)" badge={selo(sujoN1)}>
      <MenusDoNivel nivel="N1" draft={draftN1} setDraft={setDraftN1} sujo={sujoN1} onSalvar={() => salvarMenus('N1')} />
    </SecaoLayout>

    <SecaoLayout dark titulo="Menus do N0 (Morfo ADM)" badge={selo(sujoN0)}>
      <MenusDoNivel nivel="N0" draft={draftN0} setDraft={setDraftN0} sujo={sujoN0} onSalvar={() => salvarMenus('N0')} />
    </SecaoLayout>

    <SecaoLayout dark titulo="Ordem dos menus (N1 e N0)">
      <div style={{ fontSize: 12, color: DEV_TXT2, lineHeight: 1.55 }}>
        A ordem da barra de abas do N1 e a ordem da tela de Configurações são editáveis pelo próprio ambiente, em <strong style={{ color: '#fff' }}>Configurações › Layout e Menus</strong> (Decisões 7 e 34) — por isso ela NÃO é repetida aqui: seriam duas fontes de verdade pra mesma coisa. Nenhum item pode ser escondido por lá — só reposicionado —, e o N0 usa a mesma peça de rodapé do N1 (Decisão 50).
      </div>
    </SecaoLayout>

    <SecaoLayout dark titulo="Personalização avançada (N1 e N0)">
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C9C4D4', marginBottom: 8 }}>Ícones no topo das telas</div>
      <div style={{ fontSize: 11, color: DEV_TXT2, marginBottom: 10, lineHeight: 1.45 }}>Desligar tira o ícone do topo; a ação continua acessível pelos menus.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {([{ k: 'busca', l: 'Busca (N1 e N0)' }, { k: 'chat', l: 'Chat (N0)' }, { k: 'exportar', l: 'Exportar (N0)' }] as const).map((ic) => (
          <div key={ic.k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Toggle value={lc.topoIcones?.[ic.k] !== false} onChange={(v) => set({ topoIcones: { ...(lc.topoIcones || {}), [ic.k]: v } })} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#fff' }}>{ic.l}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C9C4D4', marginBottom: 6 }}>Posição dos ícones (busca, exportar, ⋮...)</div>
      <div style={{ marginBottom: 16 }}>
        <Segmented value={lc.iconesTopo || 'direita'} onChange={(v) => { set({ iconesTopo: v }); notify('Posição dos ícones atualizada') }} options={[{ value: 'direita', label: 'À direita (atual)' }, { value: 'esquerda', label: 'À esquerda' }]} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C9C4D4', marginBottom: 6 }}>Linha de marca (logos Morfo/MorfoFinP, tag Administrador)</div>
      <div style={{ marginBottom: 16 }}>
        <Segmented value={lc.brandPos || 'topo'} onChange={(v) => set({ brandPos: v })} options={[{ value: 'topo', label: 'No topo (atual)' }, { value: 'oculta', label: 'Oculta (topo limpo)' }]} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C9C4D4', marginBottom: 6 }}>Tamanho da linha de marca</div>
      <div style={{ marginBottom: 16 }}>
        <Segmented value={lc.brandEscala || 'normal'} onChange={(v) => set({ brandEscala: v })} options={[{ value: 'compacta', label: 'Compacta' }, { value: 'normal', label: 'Normal' }, { value: 'grande', label: 'Grande' }]} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C9C4D4', marginBottom: 6 }}>Linha de filtro de dados teste (Real/Teste/Ambos)</div>
      <div style={{ marginBottom: 16 }}>
        <Segmented value={lc.filtroDadosPos || 'topo'} onChange={(v) => set({ filtroDadosPos: v })} options={[{ value: 'topo', label: 'No topo' }, { value: 'rodape', label: 'No rodapé' }]} />
      </div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#C9C4D4', marginBottom: 6 }}>Densidade dos títulos de tela</div>
      <Segmented value={lc.densidade || 'confortavel'} onChange={(v) => set({ densidade: v })} options={[{ value: 'confortavel', label: 'Confortável' }, { value: 'compacta', label: 'Compacta (estilo web)' }]} />
    </SecaoLayout>

    <SecaoLayout dark titulo="Clientes fora do padrão (layout próprio)">
      <div style={{ fontSize: 12, color: DEV_TXT2, lineHeight: 1.55 }}>
        Nenhum cliente com layout próprio — o MorfoFinP tem um ambiente real só (<strong style={{ color: '#fff' }}>t0</strong>), que segue o padrão desta tela. ✓
      </div>
    </SecaoLayout>
  </>
}
