/* ============================================================================
   Padrão de Interface Morfo (UI) — peças transcritas do Kit
   `esqueleto-morfo-v1.jsx` (KIT_BUILD 2.0), que já nasce com o padrão aplicado
   (o próprio código do Kit cita "Padrão UI, seção N" em cada ponto).

   Etapa 6 desta rodada. Linhas de origem no Kit:
     L238  ESPACO_LINHA · L147 formatMoneyShort (seção 4)
     L1243 InfoDot · L1283 faixaValorFontSize · L1289 faixaRotuloEstilo
     L1293 IndicatorStrip (seção 3) · L1332 QuickAction · L1360 DevQuickAction (seção 9)
     L1010 TotalRegistros · L2995 FilterButton · L1024 SearchBox
     L3012 SearchFilterRow (seção 5) · L3047 DismissibleTip (seção 6)
     L7823 FLUT_SIZE / FLUT_BOTTOM (seção 15)

   ADAPTAÇÃO (G44 regra 3): `DismissibleTip` guarda o estado no `localStorage`
   do navegador em vez do `mlocStorage` do Kit — é uma conveniência por
   aparelho (quantas vezes a dica já apareceu), não dado do produto, e o
   fallback do Kit ("se o armazenamento falhar, a dica só continua aparecendo,
   nunca derruba a tela") está preservado literalmente.
   ========================================================================= */
import { useEffect, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Search, X, Filter, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { alpha, INK, TXT2, TXT3, LINE, BRANCO, RED, ACCENT, PURPLE, PAPER, DEV_BG, DEV_CARD, DEV_ACCENT, Sheet } from './kitBase'

/* ---- Kit L238 (seção 2): ritmo único de espaçamento entre blocos. ---- */
export const ESPACO_LINHA = 10

/* ---- Kit L7823 (seção 15): botão flutuante — alvo mínimo de toque e
   distância do rodapé, pra nunca ficar por cima da barra de abas. ---- */
export const FLUT_SIZE = 44
export const FLUT_BOTTOM = 74

/* ---- Kit L147 (seção 4): dinheiro em espaço estreito. ADITIVO — nunca
   substitui o formato completo em detalhe/folha/extrato. ---- */
export const formatMoneyShort = (v: unknown) => {
  const n = Number(v) || 0
  const abs = Math.abs(n)
  if (abs >= 1000000) return `R$ ${(n / 1000000).toFixed(1).replace('.', ',')} mi`
  if (abs >= 1000) return `R$ ${(n / 1000).toFixed(1).replace('.', ',')} mil`
  return `R$ ${Math.round(n).toLocaleString('pt-BR')}`
}

/* ---- Kit L1243: o ⓘ. Gatilho é <span role="button">, nunca <button> — ele
   vive dentro de cards que já são botões, e botão dentro de botão é HTML
   inválido (bug real registrado no Kit). Alvo de toque fixo em 24×24. ---- */
export function InfoDot({ info, titulo, dark }: { info?: ReactNode; titulo?: ReactNode; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  if (!info) return null
  return <>
    <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); setOpen(true) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setOpen(true) } }} title="O que é isso?" style={{ width: 24, height: 24, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 999, border: `1.5px solid ${dark ? '#9B96A8' : TXT3}`, color: dark ? '#9B96A8' : TXT3, fontSize: 9.5, fontWeight: 800, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>i</span>
    </span>
    {open && <Sheet title={titulo ?? 'O que é isso?'} dark={dark} onClose={() => setOpen(false)}>
      <div style={{ fontSize: 13, lineHeight: 1.55, color: dark ? '#C9C4D4' : TXT2 }}>{info}</div>
    </Sheet>}
  </>
}

/* ---- Kit L1283/L1289 (seção 3): a faixa é UMA linha só; a fonte encolhe
   conforme o comprimento do valor, em vez de quebrar linha ou cortar. ---- */
export function faixaValorFontSize(value: unknown) {
  const len = String(value ?? '').length
  if (len <= 5) return 19
  if (len <= 8) return 15.5
  return 13
}
export function faixaRotuloEstilo(label: unknown): CSSProperties {
  const len = String(label ?? '').length
  return len <= 9 ? { fontSize: 9.5, letterSpacing: 0.3 } : { fontSize: 8.5, letterSpacing: 0 }
}

export interface ItemFaixa {
  label: string
  value: ReactNode
  full?: ReactNode
  sub?: string
  info?: ReactNode
  color?: string
  onClick?: () => void
}

/* ---- Kit L1293 (seção 3): a faixa de indicadores — substitui a grade 2×2 de
   cards. Uma linha, ~72px, com um ⓘ no fim que abre a folha explicando cada
   indicador (é lá que mora o texto longo, nunca na faixa). ---- */
export function IndicatorStrip({ items, dark, style, sheetTitle }: {
  items: (ItemFaixa | false | null | undefined)[]
  dark?: boolean; style?: CSSProperties; sheetTitle?: string
}) {
  const [infoOpen, setInfoOpen] = useState(false)
  const list = (items || []).filter(Boolean) as ItemFaixa[]
  const lineTok = dark ? 'rgba(255,255,255,0.08)' : LINE
  if (list.length === 0) return null
  return <>
    <div style={{ display: 'flex', alignItems: 'stretch', background: dark ? DEV_CARD : BRANCO, border: dark ? 'none' : `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden', ...style }}>
      {list.map((it, i) => <div key={i} role={it.onClick ? 'button' : undefined} tabIndex={it.onClick ? 0 : undefined} onClick={it.onClick} onKeyDown={it.onClick ? ((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); it.onClick!() } }) : undefined}
        style={{ flex: 1, minWidth: 0, padding: '9px 3px', textAlign: 'center', cursor: it.onClick ? 'pointer' : 'default', borderLeft: i === 0 ? 'none' : `1px solid ${lineTok}` }}>
        <div style={{ fontSize: faixaValorFontSize(it.value), fontWeight: 800, lineHeight: 1.15, color: it.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.value}</div>
        <div style={{ ...faixaRotuloEstilo(it.label), fontWeight: 700, lineHeight: 1.25, marginTop: 2, textTransform: 'uppercase', color: dark ? '#9B96A8' : TXT3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</div>
      </div>)}
      <button onClick={() => setInfoOpen(true)} title="O que cada indicador significa" style={{ flexShrink: 0, background: 'none', border: 'none', borderLeft: `1px solid ${lineTok}`, padding: '0 9px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, borderRadius: 999, border: `1.5px solid ${dark ? '#9B96A8' : TXT3}`, color: dark ? '#9B96A8' : TXT3, fontSize: 9.5, fontWeight: 800, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>i</span>
      </button>
    </div>
    {infoOpen && <Sheet title={sheetTitle || 'O que cada indicador significa'} dark={dark} onClose={() => setInfoOpen(false)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {list.map((it, i) => <div key={i}>
          <div style={{ fontSize: 17, fontWeight: 800, color: it.color, lineHeight: 1.25 }}>{it.full ?? it.value}</div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: dark ? '#fff' : INK, marginTop: 2 }}>{it.label}</div>
          {it.sub && <div style={{ fontSize: 12, color: dark ? '#9B96A8' : TXT3, marginTop: 1 }}>{it.sub}</div>}
          {it.info && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: dark ? '#C9C4D4' : TXT2, marginTop: 5 }}>{it.info}</div>}
        </div>)}
      </div>
    </Sheet>}
  </>
}

/* ---- Kit L1332/L1360 (seção 9): atalho compacto de 52px — ícone · rótulo ·
   (selo + ⓘ) numa linha só, rótulo com clamp de 2 linhas. `dark` escolhe a
   variante do N0. ---- */
export function QuickAction({ icon: Icon, label, onClick, info, badge, dark }: {
  icon: LucideIcon; label: ReactNode; onClick: () => void
  info?: ReactNode; badge?: ReactNode; dark?: boolean
}) {
  return <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, background: dark ? DEV_CARD : 'var(--mloc-quickaction, #1C1B22)', color: '#fff', border: 'none', borderRadius: 12, padding: '9px 11px', minHeight: 52, cursor: 'pointer', textAlign: 'left' }}>
    <Icon size={17} color={dark ? DEV_ACCENT : '#fff'} style={{ flexShrink: 0 }} />
    <span style={{ flex: 1, minWidth: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>{badge}<InfoDot dark info={info} titulo={label} /></div>
  </div>
}

/* ---- Kit L1010 (seção 11): totalizador da lista. O padrão do sistema é um
   imediatamente ACIMA do primeiro card e outro logo APÓS o último — decisão
   explícita do Rafael, não remover. ---- */
export function TotalRegistros({ n, label, dark }: { n: number; label?: string; dark?: boolean }) {
  return <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color: dark ? '#9B96A8' : TXT3, padding: '0 2px' }}>{n} {label || (n === 1 ? 'registro' : 'registros')}</div>
}

/* ---- Kit L1024 / L2995 / L3012 (seção 5): linha única de busca + filtro. O
   botão tem 44×44 e o selo conta GRUPOS de filtro ligados — "nunca existe
   filtro escondido sem aviso". ---- */
export function SearchBox({ value, onChange, placeholder, dark }: { value: string; onChange: (v: string) => void; placeholder?: string; dark?: boolean }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: dark ? DEV_CARD : BRANCO, border: dark ? 'none' : `1.5px solid ${LINE}`, borderRadius: 11, padding: '10px 12px' }}>
    <Search size={16} color={dark ? '#9B96A8' : TXT3} />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14.5, background: 'transparent', color: dark ? '#fff' : INK }} />
    {value && <X size={15} color={dark ? '#9B96A8' : TXT3} style={{ cursor: 'pointer' }} onClick={() => onChange('')} />}
  </div>
}
export function FilterButton({ dark, active, count, onClick }: { dark?: boolean; active?: boolean; count: number; onClick: () => void }) {
  return <div style={{ position: 'relative', flexShrink: 0 }}>
    <button onClick={onClick} title="Filtros" aria-label={active ? `Filtros — ${count} ativo${count === 1 ? '' : 's'}` : 'Filtros'} style={{
      width: 44, height: 44, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
      background: active ? ACCENT : (dark ? DEV_CARD : BRANCO),
      border: active ? `1.5px solid ${ACCENT}` : `1.5px solid ${dark ? 'transparent' : LINE}`,
    }}>
      <Filter size={18} color={active ? '#fff' : (dark ? '#9B96A8' : TXT3)} />
    </button>
    {active && count > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, background: RED, border: `2px solid ${dark ? DEV_BG : PAPER}`, color: '#fff', fontSize: 9.5, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{count}</span>}
  </div>
}
export function SearchFilterRow({ dark, search, activeCount, onOpenFilter, style }: {
  dark?: boolean
  search?: { value: string; onChange: (v: string) => void; placeholder?: string }
  activeCount: number; onOpenFilter: () => void; style?: CSSProperties
}) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...style }}>
    {search ? <div style={{ flex: 1, minWidth: 0 }}><SearchBox dark={dark} value={search.value} onChange={search.onChange} placeholder={search.placeholder || 'Filtrar esta lista por…'} /></div> : <div style={{ flex: 1 }} />}
    <FilterButton dark={dark} active={activeCount > 0} count={activeCount} onClick={onOpenFilter} />
  </div>
}

/* ---- Kit L3047 (seção 6): dica dispensável. Some de vez no "X" e sozinha
   depois de 3 exibições; uma chave por tela. ADAPTAÇÃO: `localStorage` no
   lugar do `mlocStorage`. ---- */
export function DismissibleTip({ dark, screenKey, children, style }: { dark?: boolean; screenKey: string; children: ReactNode; style?: CSSProperties }) {
  const storageKey = `morfofinp:tip:${screenKey}`
  const [ready, setReady] = useState(false)
  const [visible, setVisible] = useState(false)
  const [semArmazenamento, setSemArmazenamento] = useState(false)
  useEffect(() => {
    let st = { dismissed: false, shown: 0 }; let falhou = false
    try { const r = localStorage.getItem(storageKey); if (r) { try { st = JSON.parse(r) } catch { /* valor corrompido — trata como dica nova */ } } } catch { falhou = true }
    if (falhou) { setSemArmazenamento(true); setVisible(true); setReady(true); return }
    if (st.dismissed || (st.shown || 0) >= 3) { setVisible(false); setReady(true); return }
    setVisible(true); setReady(true)
    try { localStorage.setItem(storageKey, JSON.stringify({ dismissed: false, shown: (st.shown || 0) + 1 })) } catch { /* sem armazenamento: a dica só continua aparecendo */ }
  }, [storageKey])
  const dispensar = () => { setVisible(false); if (!semArmazenamento) { try { localStorage.setItem(storageKey, JSON.stringify({ dismissed: true, shown: 3 })) } catch { /* idem */ } } }
  if (!ready || !visible) return null
  return <div style={{ background: dark ? 'rgba(255,255,255,0.06)' : alpha(ACCENT, 5), borderRadius: 10, padding: '7px 8px 7px 10px', display: 'flex', alignItems: 'flex-start', gap: 8, ...style }}>
    <div style={{ flex: 1, fontSize: 11.5, color: dark ? '#C9C4D4' : TXT2, lineHeight: 1.45 }}>{children}</div>
    <button onClick={dispensar} title="Dispensar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0, lineHeight: 0 }}><X size={13} color={dark ? '#9B96A8' : TXT3} /></button>
  </div>
}

/* ---- Kit L1057-L1087 (Padrão UI, seção 8): linhas compactas de 44px
   agrupadas em UM cartão. Substituem os cartões grandes de ~76px — 11 deles
   somavam mais que a área útil e empurravam "Sair" pra fora da primeira
   dobra. O agrupamento é por FREQUÊNCIA DE USO, não por origem do parâmetro.
   A última linha do grupo perde o separador automaticamente. ---- */
export function GroupLabelCompact({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return <div style={{ fontSize: 11.5, fontWeight: 800, color: dark ? '#9B96A8' : TXT3, textTransform: 'uppercase', letterSpacing: 0.4, margin: '12px 2px 6px' }}>{children}</div>
}
export function MenuGroupCard({ dark, children }: { dark?: boolean; children: ReactNode }) {
  return <div style={{ background: dark ? DEV_CARD : BRANCO, border: dark ? 'none' : `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden', marginBottom: 10 }}>{children}</div>
}
export interface ItemMenuCompacto {
  key: string
  icon: LucideIcon
  titulo: ReactNode
  resumo?: ReactNode
  onClick: () => void
  badge?: boolean
  cor?: string
  destrutivo?: boolean
  dataTour?: string
}
export function MenuRowCompact({ icon: Icone, titulo, resumo, onClick, badge, cor, dark, destrutivo, last, dataTour }: ItemMenuCompacto & { dark?: boolean; last?: boolean }) {
  const corFinal = destrutivo ? RED : (cor || (dark ? DEV_ACCENT : PURPLE))
  return <button onClick={onClick} data-tour={dataTour} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', background: 'none', border: 'none', borderBottom: last ? 'none' : `1px solid ${dark ? 'rgba(255,255,255,0.08)' : LINE}`, padding: '6px 12px', minHeight: 44, cursor: 'pointer', textAlign: 'left' }}>
    <div style={{ position: 'relative', width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icone size={18} color={corFinal} />
      {badge && <span className="mloc-badge-pulse" style={{ position: 'absolute', top: -6, right: -5, minWidth: 13, height: 13, borderRadius: 999, background: RED, border: `2px solid ${dark ? DEV_CARD : BRANCO}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#fff' }}>!</span>}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, color: destrutivo ? RED : (dark ? '#fff' : INK) }}>{titulo}</div>
      {resumo && <div style={{ fontSize: 11, color: dark ? '#9B96A8' : TXT3, lineHeight: 1.3, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resumo}</div>}
    </div>
    <ChevronRight size={16} color={dark ? '#9B96A8' : TXT3} style={{ flexShrink: 0 }} />
  </button>
}
export function MenuGroup({ dark, items }: { dark?: boolean; items: (ItemMenuCompacto | false | null | undefined)[] }) {
  const visiveis = items.filter(Boolean) as ItemMenuCompacto[]
  if (visiveis.length === 0) return null
  return <MenuGroupCard dark={dark}>{visiveis.map((it, i) => <MenuRowCompact {...it} key={it.key} dark={dark} last={i === visiveis.length - 1} />)}</MenuGroupCard>
}
