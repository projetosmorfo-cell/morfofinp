import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react'
import { Check, ChevronLeft, X, type LucideIcon } from 'lucide-react'
import { MORFO_HORIZONTAL_URI, MORFO_SIMBOLO_URI, PRODUTO_WORDMARK_URI } from './kitLogos'

// Base compartilhada do Kit de Estrutura Mínima Morfo (09/09/2026, Decisão 48).
//
// Cada bloco abaixo é a transcrição LITERAL (TSX) do trecho correspondente de
// `Kit de Estrutura Mínima (Morfo) - esqueleto-morfo.jsx` (versão recebida em
// 09/09/2026, 7501 linhas, G63) — a linha de origem está anotada em cada
// bloco pra o diff literal (G54 regra 6) ser reproduzível: `sed -n 'N p'`
// no arquivo do Kit contra o bloco daqui. Valores (cores, tamanhos, textos)
// NÃO foram "adaptados": o que é diferente do Kit está marcado com
// "ADAPTAÇÃO" e o motivo — nunca em silêncio.
//
// Por que TSX e não colar o .jsx inteiro: o MorfoFinP é Vite + React +
// TypeScript (Decisão 6/G44 regra 4 — mudança de stack já tratada nas
// Etapas 4-8); a diferença é só tipagem, o JSX e os valores são os mesmos.

/* ---- Kit L24: alpha() ---- */
export const alpha = (cor: string, pct: number) => `color-mix(in srgb, ${cor} ${pct}%, transparent)`

/* ---- Kit L30-L53: constantes de cor (var(--mloc-*, fallback) — sem o <style>
   do shell do Kit definindo as variáveis, resolve sempre pro fallback claro,
   que é exatamente o tema do site/Login) ---- */
export const TXT2 = 'var(--mloc-text2, #6B6558)' /* texto secundário */
export const TXT3 = 'var(--mloc-text3, #8B8579)' /* texto apagado/rotulo */
export const SOFT = 'var(--mloc-soft, #00000008)' /* fundo de botão de ícone/segmented */
export const BRANCO = 'var(--mloc-branco, #fff)' /* superfície de card do N1 — acompanha o tema; NÃO usar pra texto */
export const INK = 'var(--mloc-ink, #1C1B22)'
export const PAPER = 'var(--mloc-paper, #F7F5F2)'
export const PURPLE = 'var(--mloc-purple, #5E2E97)'
export const PURPLE_DEEP = 'var(--mloc-purple-deep, #6214A8)'
export const CORAL = 'var(--mloc-coral, #E8825A)'
export const GREEN = 'var(--mloc-green, #2E9E5B)'
export const AMBER = 'var(--mloc-amber, #D9A227)'
export const RED = 'var(--mloc-red, #D2483B)'
export const LINE = 'var(--mloc-line, #E7E3DC)'

/* ---- Kit L142: fmtBRL ---- */
export const fmtBRL = (v: unknown) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/* ---- Kit L210: versão do esqueleto Morfo (mostrada no rodapé do Login) ---- */
export const KIT_BUILD = '2.0'

/* ---- Kit L226: TELA_CHEIA_BASE ---- */
export const TELA_CHEIA_BASE: CSSProperties = { position: 'fixed', top: 'var(--mloc-tela-top, 0px)', bottom: 'var(--mloc-tela-bottom, 0px)', left: 0, right: 0, margin: '0 auto', width: '100%', maxWidth: 'var(--mloc-tela-maxw, var(--mloc-maxw, 430px))', borderRadius: 'var(--mloc-tela-radius, 0px)', border: 'var(--mloc-tela-border, none)', boxShadow: 'var(--mloc-tela-shadow, none)' }

/* ---- Kit L429-L433: endereço no padrão brasileiro ---- */
export interface Endereco { cep: string; logradouro: string; numero: string; complemento: string; bairro: string; cidade: string; uf: string; latitude: string; longitude: string }
export function emptyAddress(cidade = ''): Endereco {
  const [cid, uf] = String(cidade).split('/')
  return { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: (cid || '').trim(), uf: (uf || '').trim(), latitude: '', longitude: '' }
}
export function normalizeAddress(a: Partial<Endereco> | string | null | undefined): Endereco { return (a && typeof a === 'object') ? { ...emptyAddress(), ...a } : emptyAddress(typeof a === 'string' ? a : '') }

/* ---- Kit L974-L977: iconBtnStyle, Field, inputStyle, Segmented ---- */
export const iconBtnStyle: CSSProperties = { width: 36, height: 36, borderRadius: 10, border: 'none', background: SOFT, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }
export function Field({ label, children, dark, right }: { label: ReactNode; children: ReactNode; dark?: boolean; right?: ReactNode }) { return <label style={{ display: 'block', marginBottom: 14 }}><span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, fontWeight: 700, color: dark ? '#C9C4D4' : TXT2, marginBottom: 6 }}><span>{label}</span>{right}</span>{children}</label> }
export const inputStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 13px', borderRadius: 10, border: `1.5px solid ${LINE}`, fontSize: 15, background: BRANCO, color: INK, outline: 'none' }
export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) { return <div style={{ display: 'flex', background: SOFT, borderRadius: 10, padding: 3, flexWrap: 'wrap', gap: 3 }}>{options.map(opt => <button key={opt.value} onClick={() => onChange(opt.value)} style={{ flex: '1 1 auto', padding: '9px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12.5, background: value === opt.value ? BRANCO : 'transparent', color: value === opt.value ? INK : TXT3, boxShadow: value === opt.value ? '0 1px 4px rgba(0,0,0,0.12)' : 'none', whiteSpace: 'nowrap' }}>{opt.label}</button>)}</div> }

/* ---- Kit L980: EmptyState ---- */
export function EmptyState({ icon: Icon, title, hint, dark }: { icon: LucideIcon; title: ReactNode; hint: ReactNode; dark?: boolean }) { return <div style={{ textAlign: 'center', padding: '48px 24px', color: dark ? '#9B96A8' : TXT3 }}><Icon size={30} style={{ marginBottom: 10, opacity: 0.6 }} /><div style={{ fontWeight: 700, color: dark ? '#fff' : INK, fontSize: 15 }}>{title}</div><div style={{ fontSize: 13.5, marginTop: 4 }}>{hint}</div></div> }

/* ---- Kit L995-L999: Sheet ---- */
export function Sheet({ title, onClose, children, resetScrollKey }: { title: ReactNode; onClose: () => void; children: ReactNode; resetScrollKey?: unknown }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0 }, [resetScrollKey])
  return <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,27,34,0.5)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}><div ref={bodyRef} onClick={e => e.stopPropagation()} style={{ background: PAPER, width: '100%', maxWidth: 'var(--mloc-sheet-maxw, var(--mloc-maxw, 430px))', maxHeight: 'calc(100% - 40px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: '20px 20px 0 0', padding: '18px 16px 28px' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}><h2 style={{ fontSize: 17, fontWeight: 800, color: INK, margin: 0 }}>{title}</h2><button onClick={onClose} style={iconBtnStyle}><X size={18} color={INK} /></button></div>{children}</div></div>
}

/* ---- Kit L1000-L1008: botões ---- */
export const primaryBtn: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: PURPLE, color: '#fff', border: 'none', borderRadius: 11, padding: '13px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
export const secondaryBtn: CSSProperties = { ...primaryBtn, background: BRANCO, color: INK, border: `1.5px solid ${LINE}` }
export const linkBtnSmall: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', minHeight: 24, padding: '0 2px' }

/* ---- Kit L1011: SectionLabel ---- */
export function SectionLabel({ children, right, dark }: { children: ReactNode; right?: ReactNode; dark?: boolean }) { return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '18px 0 10px' }}><div style={{ fontSize: 12.5, fontWeight: 800, color: dark ? '#9B96A8' : TXT3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{children}</div>{right}</div> }

/* ---- Kit L1151-L1161: PhoneComWhats ---- */
export function PhoneComWhats({ phone, setPhone, hasWhatsapp, setHasWhatsapp, label }: { phone: string; setPhone: (v: string) => void; hasWhatsapp: boolean; setHasWhatsapp: (v: boolean) => void; label?: string }) {
  return <>
    <Field label={label || 'Telefone'}><input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 90000-0000" /></Field>
    <button onClick={() => setHasWhatsapp(!hasWhatsapp)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, marginTop: -8, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}>
      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${hasWhatsapp ? '#25D366' : TXT3}`, background: hasWhatsapp ? '#25D366' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{hasWhatsapp && <Check size={13} color="#fff" />}</div>
      <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>Este número tem WhatsApp</span>
    </button>
  </>
}

/* ---- Kit L2475 / L2490 / L2595: validações e erro de campo ---- */
export function validaTelefone(v: string) { if (!v || !v.trim()) return true; const d = v.replace(/\D/g, ''); return d.length === 10 || d.length === 11 }
export function FieldError({ show, text }: { show: unknown; text: ReactNode }) { return show ? <div style={{ fontSize: 11, color: RED, marginTop: -10, marginBottom: 12, fontWeight: 600 }}>{text}</div> : null }
export function validaEmailEnvio(v: unknown) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim()) }

/* ---- Kit L2854-L2870: AddressFieldsBasic ---- */
export function AddressFieldsBasic({ value, onChange }: { value: Partial<Endereco> | string | null; onChange: (v: Endereco) => void }) {
  const a = normalizeAddress(value)
  const setA = (patch: Partial<Endereco>) => onChange({ ...a, ...patch })
  return <>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      <Field label="CEP"><input style={inputStyle} value={a.cep} onChange={e => setA({ cep: e.target.value })} placeholder="00000-000" /></Field>
      <Field label="Número"><input style={inputStyle} value={a.numero} onChange={e => setA({ numero: e.target.value })} /></Field>
    </div>
    <Field label="Logradouro"><input style={inputStyle} value={a.logradouro} onChange={e => setA({ logradouro: e.target.value })} placeholder="Rua, avenida, estrada..." /></Field>
    <Field label="Complemento"><input style={inputStyle} value={a.complemento} onChange={e => setA({ complemento: e.target.value })} /></Field>
    <Field label="Bairro"><input style={inputStyle} value={a.bairro} onChange={e => setA({ bairro: e.target.value })} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
      <Field label="Cidade"><input style={inputStyle} value={a.cidade} onChange={e => setA({ cidade: e.target.value })} /></Field>
      <Field label="UF"><input style={inputStyle} maxLength={2} value={a.uf} onChange={e => setA({ uf: e.target.value.toUpperCase() })} /></Field>
    </div>
  </>
}

/* ---- Kit L935-L973: TopBar.
   ADAPTAÇÃO (única deste arquivo, registrada na Decisão 48): a TopBar do Kit lê
   dois contextos do ambiente LOGADO (`LayoutContext` — ícones à esquerda/
   direita e densidade — e `NavExtrasContext` — o menu "⋮" do N1) que não
   existem no MorfoFinP (o N1 dele tem o próprio cabeçalho, Etapa 4). Abaixo
   está a TopBar do Kit renderizada com os VALORES PADRÃO desses contextos
   (row, padding "16px 16px 14px", sem "⋮"), que é exatamente o que a página
   do site abre no popup mobile do Login (L7108: só `title` + `onBack`). Os
   ramos de `subtitle`/logo do tenant não são alcançados pelo Login e ficaram
   de fora — o JSX que sobra é o mesmo do Kit, linha a linha. ---- */
export function TopBar({ title, onBack, right, dark }: { title: ReactNode; onBack?: () => void; right?: ReactNode; dark?: boolean }) {
  return <div style={{ background: dark ? 'var(--mloc-dev-bg, #141319)' : PAPER, position: 'sticky', top: 0, zIndex: 5, borderBottom: dark ? 'none' : `1px solid ${LINE}` }}>
    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {onBack && <button onClick={onBack} style={{ ...iconBtnStyle, background: dark ? 'rgba(255,255,255,0.08)' : SOFT }}><ChevronLeft size={20} color={dark ? '#fff' : INK} /></button>}
        <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
          <h1 style={{ fontSize: 19, fontWeight: 800, color: dark ? '#fff' : INK, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>{right}</div>
    </div>
  </div>
}

/* ---- Kit L6479-L6496: renderRico ---- */
export function renderRico(texto: string | undefined) {
  const inline = (t: string, kp: string) => {
    const out: ReactNode[] = []; let rest = t; let n = 0
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/
    while (rest) {
      const m = rest.match(re)
      if (!m || m.index === undefined) { out.push(rest); break }
      if (m.index > 0) out.push(rest.slice(0, m.index))
      const tok = m[0]; n++
      if (tok.startsWith('**')) out.push(<strong key={`${kp}b${n}`}>{tok.slice(2, -2)}</strong>)
      else if (tok.startsWith('[')) { const mm = tok.match(/\[([^\]]+)\]\(([^)]+)\)/)!; out.push(<a key={`${kp}l${n}`} href={mm[2]} target="_blank" rel="noreferrer" style={{ color: PURPLE, fontWeight: 700 }}>{mm[1]}</a>) }
      else out.push(<em key={`${kp}i${n}`}>{tok.slice(1, -1)}</em>)
      rest = rest.slice(m.index + tok.length)
    }
    return out
  }
  return (texto || '').split('\n').map((linha, i) => <div key={i} style={{ minHeight: linha.trim() ? undefined : 10 }}>{inline(linha, `l${i}`)}</div>)
}

/* ---- Kit L6497-L6506: páginas padrão do site ---- */
export interface SitePage { id: string; titulo: string; visivel?: boolean; conteudo?: string; imagemUri?: string | null; fixa?: boolean }
export function sitePagesPadrao(): SitePage[] {
  return [
    { id: 'sobre', titulo: 'Sobre a Morfo', visivel: true, conteudo: 'A Morfo é a empresa desenvolvedora desta plataforma de gestão.\n\nTelefone/WhatsApp: (11) 4000-0000\nE-mail: projetos.morfo@gmail.com\nChat: disponível dentro do sistema, no menu Ajuda.' },
    { id: 'contato', titulo: 'Contato', visivel: true, conteudo: 'Fale com a Morfo:\n\nTelefone/WhatsApp: (11) 4000-0000\nE-mail: projetos.morfo@gmail.com\n\nClientes já ativos também contam com o chat de suporte dentro do sistema.' },
  ]
}

/* ---- Forma do objeto `platform` que o Login do Kit consome (subconjunto
   usado por LoginView/site/sheets — só os campos lidos por esses trechos). ---- */
export interface KitUser { id: string; name?: string; login: string; senha: string; email?: string; status?: string; token?: string; phone?: string }
export interface KitTenant { id: string; companyName: string; users: KitUser[] }
export interface KitPlan { id: string; name: string; monthlyValue: number; destaque?: boolean; description?: string; features?: string[]; porte?: string; userLimit?: number; itemLimit?: number | null; restrictions?: { exportacaoDetalhada?: boolean; layoutPersonalizado?: boolean }; gratuito?: boolean; validadeDias?: number; ficticio?: boolean }
export interface SiteWebLayout { modo?: 'horizontal' | 'vertical'; fixagemVertical?: 'usuario_escolhe' | 'sempre_fixo' | 'sempre_recolhido'; header?: Partial<SiteHeaderCfg> }
export interface SiteHeaderCfg { composicao: 'morfo' | 'produto' | 'morfo_produto'; logoMorfo: 'quadrada' | 'horizontal'; logoProduto: 'quadrada' | 'horizontal'; logoMorfoUri: string | null; logoProdutoUri: string | null; posicao: 'esquerda' | 'centro' | 'direita'; posicaoMorfo?: 'esquerda' | 'centro' | 'direita'; posicaoProduto?: 'esquerda' | 'centro' | 'direita'; altura: 'estreita' | 'larga'; espaco: 'nenhum' | 'cima' | 'baixo' | 'ambos'; frasePos: 'acima' | 'abaixo' | 'centro' | 'esquerda' | 'direita' }
export interface LoginPageCfg { composicao: 'ambos' | 'morfo' | 'produto'; posicao: 'esquerda' | 'centro' | 'direita'; logoMorfo: 'quadrada' | 'horizontal'; logoProduto: 'quadrada' | 'horizontal'; frase: string | null; frasePos: 'acima' | 'abaixo' | 'centro' | 'esquerda' | 'direita' | 'ocultar' }
export interface SiteConfig { cor1?: string; cor2?: string; subtitulo?: string; rodape?: string; fraseCor?: 'fundo_escuro' | 'fundo_claro' | 'destaque'; webLayout?: SiteWebLayout; loginPage?: Partial<LoginPageCfg>; loginPageMobile?: Partial<LoginPageCfg>; loginPageIndex?: number; planosPageIndex?: number }
export interface KitPlatform {
  devUsers: KitUser[]
  tenants: KitTenant[]
  plans?: KitPlan[]
  siteConfig?: SiteConfig
  sitePages?: SitePage[]
  siteMenu?: { tipo?: 'fixo' | 'cortina' }
  branding?: { morfoTopo?: string; morfoExterna?: string; produtoExterna?: string; produtoTopo?: string }
}
export const KIT_LOGOS = { MORFO_SIMBOLO_URI, MORFO_HORIZONTAL_URI, PRODUTO_WORDMARK_URI }
