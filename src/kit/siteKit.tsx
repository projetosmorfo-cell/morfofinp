import type { CSSProperties, ReactNode } from 'react'
import { FileText, List } from 'lucide-react'
import { KIT_LOGOS, sitePagesPadrao, type KitPlatform, type LoginPageCfg, type SiteConfig, type SiteHeaderCfg, type SitePage } from './kitBase'
import type { ConfiguracaoIcones } from '../db'
import produtoLogoUrl from '../assets/morfofinp-padrao-branco.svg'

// Camada do SITE do Kit de Estrutura Mínima Morfo — Kit L6904-L7034, transcrição
// literal (09/09/2026, Decisão 48; separada de `LoginView.tsx` na Decisão 49
// porque o painel N0 → Parâmetros → "Site MorfoFinP" usa as mesmas peças na
// prévia, exatamente como o Kit faz em L2146-L2343). Nada aqui é do produto —
// exceto `NOME_PRODUTO` (L211 do Kit) e o bloco `montarPlatformSite` no fim.

/* Kit L211: NOME_PRODUTO = "MorfoMod" no Kit → "MorfoFinP" aqui (identidade
   do produto, a única coisa que muda por produto — G55). */
export const NOME_PRODUTO = 'MorfoFinP'



/* =====================================================================
   1. CAMADA DO SITE — Kit L6904-L7034
   ===================================================================== */

/* Kit L6904-L6912 */
export function siteWebLayoutDe(platform: KitPlatform) {
  const w = platform?.siteConfig?.webLayout || {}
  const header: SiteHeaderCfg = { composicao: 'morfo_produto', logoMorfo: 'quadrada', logoProduto: 'horizontal', logoMorfoUri: null, logoProdutoUri: null, posicao: 'centro', altura: 'estreita', espaco: 'nenhum', frasePos: 'abaixo', ...(w.header || {}) }
  header.posicaoMorfo = header.posicaoMorfo || header.posicao || 'centro'
  header.posicaoProduto = header.posicaoProduto || header.posicao || 'centro'
  return { modo: w.modo || 'horizontal', fixagemVertical: w.fixagemVertical || 'usuario_escolhe', header }
}
/* Kit L6914-L6919 */
export function fraseCorStyle(sc: SiteConfig | undefined): CSSProperties {
  const v = sc?.fraseCor || 'fundo_escuro'
  if (v === 'fundo_claro') return { color: '#2A2733' }
  if (v === 'destaque') return { color: '#fff', background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: 999, padding: '3px 12px', display: 'inline-block' }
  return { color: 'rgba(255,255,255,0.85)' }
}
/* Kit L6922 / L6928 / L6929-L6936 */
export const SITE_LOGIN_PAGE_ID = '__login'
export const SITE_PLANOS_PAGE_ID = '__planos'
export function sitePagesDe(platform: KitPlatform): SitePage[] { return platform?.sitePages || sitePagesPadrao() }
export function paginasSiteComLogin(platform: KitPlatform, soVisiveis: boolean): SitePage[] {
  const custom = sitePagesDe(platform).filter(pg => !soVisiveis || pg.visivel).slice()
  const idxLogin = Math.max(0, Math.min(platform?.siteConfig?.loginPageIndex ?? 0, custom.length))
  const comLogin = custom.slice(); comLogin.splice(idxLogin, 0, { id: SITE_LOGIN_PAGE_ID, titulo: 'Entrar', fixa: true })
  const idxPlanos = Math.max(0, Math.min(platform?.siteConfig?.planosPageIndex ?? comLogin.length, comLogin.length))
  comLogin.splice(idxPlanos, 0, { id: SITE_PLANOS_PAGE_ID, titulo: 'Planos', fixa: true })
  return comLogin
}
/* Kit L6938-L6943 */
export function logoHeaderSite(platform: KitPlatform, marca: 'morfo' | 'produto', forma: string, uriPropria: string | null) {
  if (uriPropria) return uriPropria
  const b = platform?.branding || {}
  if (marca === 'morfo') return forma === 'horizontal' ? (b.morfoTopo || KIT_LOGOS.MORFO_HORIZONTAL_URI) : (b.morfoExterna || KIT_LOGOS.MORFO_SIMBOLO_URI)
  return forma === 'quadrada' ? (b.produtoExterna || KIT_LOGOS.PRODUTO_WORDMARK_URI) : (b.produtoTopo || KIT_LOGOS.PRODUTO_WORDMARK_URI)
}
/* Kit L6944-L6978 */
export function SiteHeaderWeb({ platform, cfg }: { platform: KitPlatform; cfg: ReturnType<typeof siteWebLayoutDe> }) {
  const h = cfg.header
  const sc = platform.siteConfig || {}
  const frase = sc.subtitulo ?? 'Plataforma de gestão para o seu negócio'
  const logoH = h.altura === 'larga' ? 42 : 26
  const padTop = (h.altura === 'larga' ? 14 : 8) + (h.espaco === 'cima' || h.espaco === 'ambos' ? 14 : 0)
  const padBottom = (h.altura === 'larga' ? 14 : 8) + (h.espaco === 'baixo' || h.espaco === 'ambos' ? 14 : 0)
  const temMorfo = h.composicao === 'morfo' || h.composicao === 'morfo_produto'
  const temProduto = h.composicao === 'produto' || h.composicao === 'morfo_produto'
  const imgMorfo = temMorfo ? <img key="lm" src={logoHeaderSite(platform, 'morfo', h.logoMorfo, h.logoMorfoUri)} alt="Morfo" style={{ height: logoH, maxWidth: 170, objectFit: 'contain' }} /> : null
  const imgProduto = temProduto ? <img key="lp" src={logoHeaderSite(platform, 'produto', h.logoProduto, h.logoProdutoUri)} alt={NOME_PRODUTO} style={{ height: Math.round(logoH * 0.82), maxWidth: 170, objectFit: 'contain' }} /> : null
  const zonas: Record<'esquerda' | 'centro' | 'direita', ReactNode[]> = { esquerda: [], centro: [], direita: [] }
  if (imgMorfo) zonas[h.posicaoMorfo!].push(imgMorfo)
  if (imgProduto) {
    if (imgMorfo && h.posicaoMorfo === h.posicaoProduto) zonas[h.posicaoProduto!].push(<span key="dv" style={{ width: 1, height: Math.round(logoH * 0.7), background: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />)
    zonas[h.posicaoProduto!].push(imgProduto)
  }
  /* 'ocultar' (Kit item 186): a frase some por completo e as zonas de logo
     ficam com o espaço dela — por isso é aqui, no elemento, e não em cada um
     dos cinco pontos de posição abaixo. */
  const fraseEl = frase && h.frasePos !== 'ocultar' ? <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...fraseCorStyle(sc) }}>{frase}</div> : null
  if (h.frasePos === 'centro' && fraseEl) zonas.centro.push(<div key="frc">{fraseEl}</div>)
  const linhaLogos = <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    {h.frasePos === 'esquerda' && fraseEl}
    <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 10 }}>{zonas.esquerda}</div>
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexShrink: 0 }}>{zonas.centro}</div>
    <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>{zonas.direita}</div>
    {h.frasePos === 'direita' && fraseEl}
  </div>
  return <div style={{ padding: `${padTop}px 22px ${padBottom}px`, background: 'rgba(0,0,0,0.18)', borderBottom: '1px solid rgba(255,255,255,0.14)' }}>
    {h.frasePos === 'acima' && fraseEl && <div style={{ textAlign: 'center', marginBottom: 4 }}>{fraseEl}</div>}
    {linhaLogos}
    {h.frasePos === 'abaixo' && fraseEl && <div style={{ textAlign: 'center', marginTop: 4 }}>{fraseEl}</div>}
  </div>
}
/* Kit L6985 */
export function loginPageCfgDe(sc: SiteConfig | undefined, chave?: 'loginPage' | 'loginPageMobile'): LoginPageCfg { return { composicao: 'ambos', posicao: 'centro', logoMorfo: 'quadrada', logoProduto: 'quadrada', frase: null, frasePos: 'abaixo', ...((sc || {})[chave || 'loginPage'] || {}) } }
/* Kit L6986-L7014 */
export function BlocoLogosLogin({ platform, lp, sc }: { platform: KitPlatform; lp: LoginPageCfg; sc: SiteConfig }) {
  const frase = lp.frase != null && lp.frase !== '' ? lp.frase : (sc.subtitulo ?? 'Plataforma de gestão para o seu negócio')
  const alinha = lp.posicao === 'esquerda' ? 'flex-start' : lp.posicao === 'direita' ? 'flex-end' : 'center'
  const temMorfo = lp.composicao !== 'produto'
  const temProduto = lp.composicao !== 'morfo'
  const logoMorfoEl = temMorfo ? <div key="lm" style={{ width: 76, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><img src={logoHeaderSite(platform, 'morfo', lp.logoMorfo || 'quadrada', null)} alt="Morfo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div> : null
  const logoProdutoEl = temProduto ? <img key="lp" src={logoHeaderSite(platform, 'produto', lp.logoProduto || 'quadrada', null)} alt={NOME_PRODUTO} style={{ height: 46, display: 'block', maxWidth: 220, objectFit: 'contain' }} /> : null
  const logos = <>{logoMorfoEl}{logoProdutoEl}</>
  const fraseOculta = lp.frasePos === 'ocultar'
  const fraseEl = frase && !fraseOculta ? <div style={{ fontSize: 13, ...fraseCorStyle(sc) }}>{frase}</div> : null
  if (lp.frasePos === 'esquerda' || lp.frasePos === 'direita') return <div style={{ display: 'flex', alignItems: 'center', justifyContent: alinha, gap: 14, marginBottom: 20 }}>
    {lp.frasePos === 'esquerda' && fraseEl}
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>{logos}</div>
    {lp.frasePos === 'direita' && fraseEl}
  </div>
  if (lp.frasePos === 'centro' && temMorfo && temProduto) return <div style={{ display: 'flex', flexDirection: 'column', alignItems: alinha, gap: 8, marginBottom: 20 }}>
    {logoMorfoEl}
    {fraseEl}
    {logoProdutoEl}
  </div>
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: alinha, gap: 8, marginBottom: 20 }}>
    {lp.frasePos === 'acima' && fraseEl}
    {logos}
    {(lp.frasePos === 'abaixo' || (lp.frasePos === 'centro' && !(temMorfo && temProduto))) && fraseEl}
  </div>
}
/* Kit L7016-L7020 */
export function SiteNavHorizontalWeb({ paginas, ativa, onOpen }: { paginas: SitePage[]; ativa: string | undefined; onOpen: (pg: SitePage) => void }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 14px', background: 'rgba(0,0,0,0.12)', borderBottom: '1px solid rgba(255,255,255,0.12)', overflowX: 'auto' }}>
    {paginas.map(pg => <button key={pg.id} onClick={() => onOpen(pg)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 13px', border: 'none', background: 'transparent', color: ativa === pg.id ? '#fff' : 'rgba(255,255,255,0.72)', fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: ativa === pg.id ? '2px solid #fff' : '2px solid transparent' }}><FileText size={13} /> {pg.titulo}</button>)}
  </div>
}
/* Kit L7022-L7034 */
export function SiteNavVerticalWeb({ paginas, ativa, onOpen, fixado, podeAlternar, onSetFixado, onAbrir, onHoverIn, onHoverOut }: { paginas: SitePage[]; ativa: string | undefined; onOpen: (pg: SitePage) => void; fixado: boolean; podeAlternar: boolean; onSetFixado: (v: boolean) => void; onAbrir: () => void; onHoverIn: () => void; onHoverOut: () => void }) {
  if (fixado) return <div style={{ width: 220, flexShrink: 0, background: 'rgba(0,0,0,0.22)', borderRight: '1px solid rgba(255,255,255,0.14)', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px 8px' }}>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)' }}>MENU</span>
      {podeAlternar && <button onClick={() => onSetFixado(false)} style={{ background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 800 }}>SOLTAR</button>}
    </div>
    {paginas.map(pg => <button key={pg.id} onClick={() => onOpen(pg)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px', borderRadius: 10, border: 'none', background: ativa === pg.id ? 'rgba(255,255,255,0.14)' : 'transparent', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}><FileText size={14} /> {pg.titulo}</button>)}
  </div>
  return <div role="button" tabIndex={0} onClick={onAbrir} onKeyDown={e => { if (e.key === 'Enter') onAbrir() }} onMouseEnter={onHoverIn} onMouseLeave={onHoverOut} title="Menu do site" style={{ width: 42, flexShrink: 0, background: 'rgba(0,0,0,0.22)', borderRight: '1px solid rgba(255,255,255,0.14)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 8, cursor: 'pointer' }}>
    <List size={16} color="#fff" />
    <span style={{ writingMode: 'vertical-rl', fontSize: 9, fontWeight: 900, letterSpacing: 1, color: 'rgba(255,255,255,0.8)' }}>MENU DO SITE</span>
  </div>
}

/* =====================================================================
   ADAPTADOR MorfoFinP — o que o Kit chama de `platform.siteConfig`/`sitePages`/
   `siteMenu`/`branding`, lido do singleton `db.configuracoes` (Decisão 49:
   editável em N0 → Parâmetros → Site MorfoFinP). Ausente = valor padrão do
   Kit (dado do MorfoMod, G55) — mesmo mecanismo `?? padrão` que o Kit usa.
   ===================================================================== */

// Perguntas frequentes (G25) — a página existia no site anterior do produto
// (Decisão 27) e é PRESERVADA como 3ª página padrão (configuração, G44 regra
// 3), ao lado das 2 páginas padrão do Kit. Editável/excluível no N0 como
// qualquer outra página. Formato de texto rico do Kit (`renderRico`).
export const CONTEUDO_FAQ = [
  '**O que é o MorfoFinP?**\nUm app de controle financeiro pessoal: resumo do mês, metas por categoria, lançamentos, carteira de contas e planejamento — derivado de uma planilha que já era usada no dia a dia.',
  '**Meus dados ficam salvos onde?**\nDireto no seu navegador/dispositivo (armazenamento local), sem servidor externo por trás ainda. Isso significa que os dados não saem do seu aparelho por conta própria.',
  '**Preciso pagar alguma coisa?**\nOs planos mostrados na página de Planos ainda são um rascunho (placeholder) — o preço e o que cada um inclui de verdade ainda não foram definidos.',
  '**Dá pra usar no celular?**\nSim, o app funciona no navegador do celular ou do computador, sem precisar instalar nada de uma loja de aplicativos.',
].join('\n\n')

export function sitePagesPadraoProduto(): SitePage[] {
  return [...sitePagesPadrao(), { id: 'faq', titulo: 'Perguntas frequentes', visivel: true, conteudo: CONTEUDO_FAQ }]
}

export type PlatformSite = Pick<KitPlatform, 'siteConfig' | 'sitePages' | 'siteMenu' | 'branding'>

export function montarPlatformSite(config: ConfiguracaoIcones | undefined): PlatformSite {
  return {
    siteConfig: config?.siteConfig ?? {},
    sitePages: config?.sitePages ?? sitePagesPadraoProduto(),
    siteMenu: config?.siteMenu,
    // Identidade do produto (G55) pelo mecanismo de branding do próprio Kit:
    // wordmark do MorfoFinP no lugar do "morfoMod" de exemplo; logos Morfo
    // continuam as do Kit (`KIT_LOGOS`, via `logoHeaderSite`).
    branding: { produtoExterna: produtoLogoUrl, produtoTopo: produtoLogoUrl },
  }
}
