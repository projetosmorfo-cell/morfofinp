import { useState, type ReactNode } from 'react'
import { BRANCO, DEV_CARD, GREEN, INK, LINE, PAPER, RED, SOFT, TXT2, TXT3, iconBtnStyle } from './kitBase'
import { X } from 'lucide-react'

// Biblioteca de gráficos e cartões de indicador do Kit de Estrutura Mínima
// Morfo — transcrição literal (10/09/2026, Decisão 53), linha de origem
// anotada em cada bloco. Usada pela tela de Indicadores do N0.
//
// RECONFERIDO em 11/09/2026 contra o Projeto Modelo atual: todas as funções
// aqui (InfoDot, KpiCard, VizCard, VizLine, VizGroupedBars, VizRankBars,
// VizWaterfall, MiniBarChart, paleta VIZ_LIGHT/VIZ_DARK) idênticas função a
// função, valor a valor. O Projeto Modelo também tem `VizStacked100` e
// `VizMeter` — NÃO portados aqui, e não é lacuna: nenhum dos dois é usado
// por NENHUMA tela do Projeto Modelo atual (biblioteca com componente sem
// chamador, achado ao grepar o arquivo inteiro) — nada os teria exercitado
// mesmo lá.

/* ---- Kit L4580-L4586: paleta categórica (a ORDEM dos slots é fixa — foi ela
   que passou no verificador de daltonismo; não embaralhar) ---- */
export const VIZ_LIGHT = ['#7B3FC4', '#E8825A', '#3B7DD8', '#1F9D6B', '#C0398A', '#E0A32D']
export const VIZ_DARK = ['#8A66EA', '#D06A38', '#3B7DD8', '#1E9668', '#B02F79', '#B8860F']
const GRID = 'var(--mloc-grid, #EDEAE2)'
const vizPal = (dark?: boolean) => (dark ? VIZ_DARK : VIZ_LIGHT)
const vizInk = (dark?: boolean) => (dark ? '#C9C4D4' : TXT2)
const vizMuted = (dark?: boolean) => (dark ? '#9B96A8' : TXT3)
const vizGrid = (dark?: boolean) => (dark ? 'rgba(255,255,255,0.07)' : GRID)
const vizSurface = (dark?: boolean) => (dark ? DEV_CARD : BRANCO)

/* ---- Kit L1169-L1191: InfoDot (ⓘ com folha explicativa) ---- */
export function InfoDot({ info, titulo, dark }: { info?: ReactNode; titulo?: ReactNode; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  if (!info) return null
  return <>
    <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setOpen(true) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setOpen(true) } }} title="O que é isso?" style={{ width: 24, height: 24, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 999, border: `1.5px solid ${dark ? '#9B96A8' : TXT3}`, color: dark ? '#9B96A8' : TXT3, fontSize: 9.5, fontWeight: 800, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>i</span>
    </span>
    {/* Corrigido 11/09/2026 (comparação visual pixel a pixel contra o Projeto
        Modelo): este painel é implementação própria (não usa o `Sheet`
        compartilhado de `kitBase.tsx`) — 2 divergências reais achadas:
        (1) `<h2>` sem `textTransform: 'none'` herdava o `text-transform:
        uppercase` global de `index.css` (mesma classe do bug já corrigido no
        título do `Sheet`); (2) o painel inteiro (fundo/título/botão
        fechar/texto) ignorava a prop `dark` — sempre claro, mesmo dentro do
        painel N0 (que força tema escuro via `.mloc-forcar-escuro`). O Kit já
        tem essa correção (comentário "item 17, Padrão UI" na fonte). */}
    {open && <div onClick={(e) => { e.stopPropagation(); setOpen(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(28,27,34,0.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: dark ? DEV_CARD : PAPER, width: '100%', maxWidth: 'var(--mloc-sheet-maxw, var(--mloc-maxw, 430px))', borderRadius: '20px 20px 0 0', padding: '18px 16px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: dark ? '#fff' : INK, margin: 0, textTransform: 'none' }}>{titulo}</h2>
          <button onClick={() => setOpen(false)} style={{ ...iconBtnStyle, background: dark ? 'rgba(255,255,255,0.08)' : SOFT }}><X size={18} color={dark ? '#fff' : INK} /></button>
        </div>
        <p style={{ fontSize: 13.5, color: dark ? '#C9C4D4' : TXT2, lineHeight: 1.65, margin: 0 }}>{info}</p>
      </div>
    </div>}
  </>
}

/* ---- Kit L1192-L1199: KpiCard ---- */
export function KpiCard({ label, value, sub, color, onClick, dark, small, info }: { label: string; value: ReactNode; sub?: ReactNode; color?: string; onClick?: () => void; dark?: boolean; small?: boolean; info?: ReactNode }) {
  return <div onClick={onClick} style={{ background: dark ? DEV_CARD : BRANCO, border: dark ? 'none' : `1px solid ${LINE}`, borderRadius: 14, padding: small ? '11px 10px' : '13px 14px', cursor: onClick ? 'pointer' : 'default', minWidth: 0 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
      <div style={{ fontSize: String(label).length > 9 ? (small ? 9 : 10) : (small ? 10 : 11), fontWeight: 700, color: dark ? '#9B96A8' : TXT3, textTransform: 'uppercase', letterSpacing: String(label).length > 9 ? 0 : 0.2, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'break-word' }}>{label}</div>
      <InfoDot info={info} titulo={label} dark={dark} />
    </div>
    <div style={{ fontSize: small ? 16 : 22, fontWeight: 800, color, lineHeight: 1.3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
    <div style={{ fontSize: small ? 10 : 11, color: dark ? '#9B96A8' : TXT3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
  </div>
}

/* ---- Kit L4589-L4595: VizLegend (obrigatória a partir de 2 séries) ---- */
function VizLegend({ items, dark }: { items: { label: ReactNode; color: string }[]; dark?: boolean }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
    {items.map((it, i) => <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: vizInk(dark), fontWeight: 600 }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: it.color, flexShrink: 0 }} />{it.label}
    </span>)}
  </div>
}

/* ---- Kit L4596-L4607: VizCard ---- */
export function VizCard({ title, hint, children, dark, right, info }: { title: ReactNode; hint?: ReactNode; children: ReactNode; dark?: boolean; right?: ReactNode; info?: ReactNode }) {
  return <div style={{ background: vizSurface(dark), border: dark ? 'none' : `1px solid ${LINE}`, borderRadius: 14, padding: 14, marginBottom: 10 }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: hint ? 2 : 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 800, color: dark ? '#fff' : INK }}>{title}</div><InfoDot info={info} titulo={title} dark={dark} /></div>
      {right}
    </div>
    {hint && <div style={{ fontSize: 11.5, color: vizMuted(dark), lineHeight: 1.45, marginBottom: 10 }}>{hint}</div>}
    {children}
  </div>
}

export interface PontoViz { label: string; value: number; display?: string }

/* ---- Kit L4608-L4637: VizLine ---- */
export function VizLine({ data, dark, color, height = 110, suffix, alvo }: { data: PontoViz[]; dark?: boolean; color?: string; height?: number; suffix?: string; alvo?: number }) {
  const [sel, setSel] = useState<number | null>(null)
  const vals = data.map(d => d.value)
  const max = Math.max(1, ...vals), min = Math.min(0, ...vals)
  const span = Math.max(1, max - min)
  const w = 100, h = height
  const x = (i: number) => data.length <= 1 ? w / 2 : (i / (data.length - 1)) * w
  const y = (v: number) => h - ((v - min) / span) * (h - 22) - 11
  const linha = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.value)}`).join(' ')
  const cor = color || vizPal(dark)[0]
  return <div>
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block', overflow: 'visible' }}>
        {[0, 0.5, 1].map(f => <line key={f} x1="0" x2={w} y1={11 + f * (h - 22)} y2={11 + f * (h - 22)} stroke={vizGrid(dark)} strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
        {alvo != null && alvo >= min && alvo <= max && <line x1="0" x2={w} y1={y(alvo)} y2={y(alvo)} stroke={vizMuted(dark)} strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
        <path d={linha} fill="none" stroke={cor} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => <circle key={i} cx={x(i)} cy={y(d.value)} r={sel === i ? 4 : 2.6} fill={cor} stroke={vizSurface(dark)} strokeWidth="2" vectorEffect="non-scaling-stroke" onClick={() => setSel(sel === i ? null : i)} style={{ cursor: 'pointer' }} />)}
      </svg>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
      {data.map((d, i) => <button key={i} onClick={() => setSel(sel === i ? null : i)} style={{ flex: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 9.5, fontWeight: sel === i ? 800 : 600, color: sel === i ? (dark ? '#fff' : INK) : vizMuted(dark), textTransform: 'capitalize' }}>{d.label}</button>)}
    </div>
    <div style={{ fontSize: 11.5, color: vizInk(dark), marginTop: 6, minHeight: 16, fontWeight: 700 }}>
      {sel != null ? <span style={{ textTransform: 'capitalize' }}>{data[sel].label}: {data[sel].display ?? data[sel].value}{suffix || ''}</span>
        : <span style={{ fontWeight: 500, color: vizMuted(dark) }}>Toque num ponto pra ver o valor</span>}
    </div>
  </div>
}

/* ---- Kit L4661-L4678: VizGroupedBars ---- */
export function VizGroupedBars({ data, series, dark, height = 130, fmt }: { data: Record<string, string | number>[]; series: { key: string; label: string }[]; dark?: boolean; height?: number; fmt?: (v: number) => string }) {
  const pal = vizPal(dark)
  const max = Math.max(1, ...data.flatMap(d => series.map(s => Number(d[s.key]) || 0)))
  return <div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, borderBottom: `1px solid ${vizGrid(dark)}` }}>
      {data.map((d, i) => <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 2, height: '100%', minWidth: 0 }}>
        {series.map((s, si) => { const v = Number(d[s.key]) || 0; const hh = Math.max(2, (v / max) * (height - 10))
          return <div key={s.key} title={`${s.label}: ${fmt ? fmt(v) : v}`} style={{ flex: 1, maxWidth: 14, height: hh, background: pal[si % pal.length], borderRadius: '4px 4px 0 0' }} /> })}
      </div>)}
    </div>
    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
      {data.map((d, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9.5, color: vizMuted(dark), textTransform: 'capitalize', minWidth: 0 }}>{d.label}</div>)}
    </div>
    <VizLegend dark={dark} items={series.map((s, si) => ({ label: s.label, color: pal[si % pal.length] }))} />
  </div>
}

/* ---- Kit L4680-L4697: VizRankBars ---- */
export function VizRankBars({ data, dark, color, fmt, emptyHint }: { data: PontoViz[]; dark?: boolean; color?: string; fmt?: (v: number) => string; emptyHint?: string }) {
  const max = Math.max(1, ...data.map(d => d.value))
  const cor = color || vizPal(dark)[0]
  if (!data.length) return <div style={{ fontSize: 12, color: vizMuted(dark), padding: '6px 0' }}>{emptyHint || 'Sem dados no período.'}</div>
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {data.map((d, i) => <div key={i}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: dark ? '#fff' : INK, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</span>
        <span style={{ fontSize: 11.5, color: vizInk(dark), fontWeight: 800, flexShrink: 0 }}>{fmt ? fmt(d.value) : d.value}</span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: vizGrid(dark), overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(2, (d.value / max) * 100)}%`, height: '100%', background: cor, borderRadius: 4 }} />
      </div>
    </div>)}
  </div>
}

/* ---- Kit L4699-L4719: VizWaterfall (cascata do MRR) ---- */
export function VizWaterfall({ inicio, passos, fim, dark, height = 140, fmt }: { inicio: number; passos: { label: string; value: number }[]; fim: number; dark?: boolean; height?: number; fmt?: (v: number) => string }) {
  const seq: { label: string; base: number; valor: number; tipo: 'ancora' | 'sobe' | 'desce'; raw?: number }[] = []; let acc = inicio
  seq.push({ label: 'Início', base: 0, valor: inicio, tipo: 'ancora' })
  passos.forEach(p => { const base = p.value >= 0 ? acc : acc + p.value; seq.push({ label: p.label, base, valor: Math.abs(p.value), tipo: p.value >= 0 ? 'sobe' : 'desce', raw: p.value }); acc += p.value })
  seq.push({ label: 'Fim', base: 0, valor: fim, tipo: 'ancora' })
  const max = Math.max(1, ...seq.map(s => s.base + s.valor))
  const cor = (t: string) => t === 'ancora' ? (dark ? '#6B6779' : '#B8B2A6') : t === 'sobe' ? GREEN : RED
  return <div>
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height, borderBottom: `1px solid ${vizGrid(dark)}` }}>
      {seq.map((s, i) => { const hh = Math.max(2, (s.valor / max) * (height - 24)); const bot = (s.base / max) * (height - 24)
        return <div key={i} style={{ flex: 1, height: '100%', position: 'relative', minWidth: 0 }}>
          <div style={{ position: 'absolute', bottom: bot, left: 0, right: 0, height: hh, background: cor(s.tipo), borderRadius: 4 }} />
          <div style={{ position: 'absolute', bottom: bot + hh + 2, left: 0, right: 0, textAlign: 'center', fontSize: 8.5, fontWeight: 800, color: vizInk(dark), whiteSpace: 'nowrap' }}>{fmt ? fmt((s.tipo === 'ancora' ? s.valor : (s.raw ?? s.valor)) || 0) : s.valor}</div>
        </div> })}
    </div>
    <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
      {seq.map((s, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: vizMuted(dark), minWidth: 0, lineHeight: 1.2 }}>{s.label}</div>)}
    </div>
    <VizLegend dark={dark} items={[{ label: 'Saldo', color: dark ? '#6B6779' : '#B8B2A6' }, { label: 'Entrou', color: GREEN }, { label: 'Saiu', color: RED }]} />
  </div>
}

/* ---- Kit L4776-L4785: MiniBarChart ---- */
export function MiniBarChart({ data, color, dark, height = 120 }: { data: PontoViz[]; color?: string; dark?: boolean; height?: number }) {
  const max = Math.max(1, ...data.map(d => d.value))
  return <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '8px 4px 0' }}>
    {data.map((d, i) => { const h = Math.max(2, Math.round((d.value / max) * (height - 30))); return <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, color: dark ? '#C9C4D4' : TXT3 }}>{d.value}</div>
      <div style={{ width: '100%', maxWidth: 28, height: h, background: color, borderRadius: 4 }} />
      <div style={{ fontSize: 9, color: dark ? '#9B96A8' : TXT3, textAlign: 'center', whiteSpace: 'nowrap' }}>{d.label}</div>
    </div> })}
  </div>
}
