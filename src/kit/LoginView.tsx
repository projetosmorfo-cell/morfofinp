import { useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { ArrowRight, Building, Check, CheckCircle2, FileText, KeyRound, List, Mail, QrCode, UserPlus, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  AMBER, BRANCO, CORAL, GREEN, INK, LINE, PAPER, PURPLE, PURPLE_DEEP, RED, TXT2, TXT3, KIT_BUILD, KIT_LOGOS, TELA_CHEIA_BASE,
  AddressFieldsBasic, EmptyState, Field, FieldError, PhoneComWhats, SectionLabel, Segmented, Sheet, TopBar,
  alpha, fmtBRL, inputStyle, linkBtnSmall, normalizeAddress, primaryBtn, renderRico, secondaryBtn, sitePagesPadrao, validaEmailEnvio, validaTelefone,
  type Endereco, type KitPlan, type KitPlatform, type KitUser, type LoginPageCfg, type SiteConfig, type SiteHeaderCfg, type SitePage,
} from './kitBase'
import { criarAcesso, entrarDemo } from './auth'
import { entrarDemoN0, N0_PADRAO_KIT } from './authN0'
import { useMarcaSite, useSimulacaoResolucao } from '../configuracaoIcones'
import { usePlanos } from './planos'
import { salvarPlanoId } from './planoAtual'
import { linkSuporteWhatsApp } from './suporte'
import { CARIMBO_BUILD } from '../buildInfo'
import produtoLogoUrl from '../assets/morfofinp-padrao-branco.svg'

// Site deslogado + Login do MorfoFinP = o código do Kit (09/09/2026, Decisão 48).
//
// Achado real do Rafael (G63/G54): o Login entregue até o build 012 NÃO era o
// Login do Kit — "parte do ecossistema Morfo", "Perguntas frequentes",
// "ENTRAR", "Entrar como empresa-tenant (demo)" e "Acesso administrador
// Morfo" não existem em lugar nenhum do `esqueleto-morfo-v1.jsx`; o "PASSOU"
// de "Login = código do Kit" tinha sido herdado da verificação antiga
// (Decisão 32/G59), de antes do Kit trocar — só o ícone apontado foi conferido,
// nunca a tela inteira. Esta versão REGENERA o Login inteiro a partir do Kit
// atual e o diff literal (G54 regra 6) está no relatório da entrega.
//
// Organização deste arquivo (cada bloco anota a linha de origem no Kit):
//   1. camada do site (Kit L6904-L7034): siteWebLayoutDe, fraseCorStyle,
//      paginasSiteComLogin, logoHeaderSite, SiteHeaderWeb, loginPageCfgDe,
//      BlocoLogosLogin, SiteNavHorizontalWeb, SiteNavVerticalWeb
//   2. folhas do Login (Kit L6826-L6894): ForgotPasswordSheet, AceitarConviteSheet
//   3. contratação (Kit L7216-L7241, L7315-L7395): planFeaturesAuto, PlanoCard,
//      ContratarPacoteFlow
//   4. LoginViewKit (Kit L7035-L7213) — a tela em si, literal
//   5. ADAPTADOR MorfoFinP (único trecho que não é do Kit): monta o objeto
//      `platform` que o Kit consome a partir do Dexie (credenciais N0/N1,
//      planos, marca) e traduz `onLogin`/`onSelfRegister` pras sessões do
//      produto. É a "configuração do produto por cima" da G44 regra 3 —
//      nunca código paralelo de tela.
//
// Toda diferença em relação ao texto do Kit está marcada "ADAPTAÇÃO" com o
// motivo. O que não está marcado é transcrição literal (só com tipos TS).

/* =====================================================================
   1. CAMADA DO SITE — Kit L6904-L7034
   ===================================================================== */

/* Kit L6904-L6912 */
function siteWebLayoutDe(platform: KitPlatform) {
  const w = platform?.siteConfig?.webLayout || {}
  const header: SiteHeaderCfg = { composicao: 'morfo_produto', logoMorfo: 'quadrada', logoProduto: 'horizontal', logoMorfoUri: null, logoProdutoUri: null, posicao: 'centro', altura: 'estreita', espaco: 'nenhum', frasePos: 'abaixo', ...(w.header || {}) }
  header.posicaoMorfo = header.posicaoMorfo || header.posicao || 'centro'
  header.posicaoProduto = header.posicaoProduto || header.posicao || 'centro'
  return { modo: w.modo || 'horizontal', fixagemVertical: w.fixagemVertical || 'usuario_escolhe', header }
}
/* Kit L6914-L6919 */
function fraseCorStyle(sc: SiteConfig | undefined): CSSProperties {
  const v = sc?.fraseCor || 'fundo_escuro'
  if (v === 'fundo_claro') return { color: '#2A2733' }
  if (v === 'destaque') return { color: '#fff', background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: 999, padding: '3px 12px', display: 'inline-block' }
  return { color: 'rgba(255,255,255,0.85)' }
}
/* Kit L6922 / L6928 / L6929-L6936 */
const SITE_LOGIN_PAGE_ID = '__login'
const SITE_PLANOS_PAGE_ID = '__planos'
function sitePagesDe(platform: KitPlatform): SitePage[] { return platform?.sitePages || sitePagesPadrao() }
function paginasSiteComLogin(platform: KitPlatform, soVisiveis: boolean): SitePage[] {
  const custom = sitePagesDe(platform).filter(pg => !soVisiveis || pg.visivel).slice()
  const idxLogin = Math.max(0, Math.min(platform?.siteConfig?.loginPageIndex ?? 0, custom.length))
  const comLogin = custom.slice(); comLogin.splice(idxLogin, 0, { id: SITE_LOGIN_PAGE_ID, titulo: 'Entrar', fixa: true })
  const idxPlanos = Math.max(0, Math.min(platform?.siteConfig?.planosPageIndex ?? comLogin.length, comLogin.length))
  comLogin.splice(idxPlanos, 0, { id: SITE_PLANOS_PAGE_ID, titulo: 'Planos', fixa: true })
  return comLogin
}
/* Kit L6938-L6943 */
function logoHeaderSite(platform: KitPlatform, marca: 'morfo' | 'produto', forma: string, uriPropria: string | null) {
  if (uriPropria) return uriPropria
  const b = platform?.branding || {}
  if (marca === 'morfo') return forma === 'horizontal' ? (b.morfoTopo || KIT_LOGOS.MORFO_HORIZONTAL_URI) : (b.morfoExterna || KIT_LOGOS.MORFO_SIMBOLO_URI)
  return forma === 'quadrada' ? (b.produtoExterna || KIT_LOGOS.PRODUTO_WORDMARK_URI) : (b.produtoTopo || KIT_LOGOS.PRODUTO_WORDMARK_URI)
}
/* Kit L6944-L6978 */
function SiteHeaderWeb({ platform, cfg }: { platform: KitPlatform; cfg: ReturnType<typeof siteWebLayoutDe> }) {
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
  const fraseEl = frase ? <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', ...fraseCorStyle(sc) }}>{frase}</div> : null
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
function loginPageCfgDe(sc: SiteConfig | undefined, chave?: 'loginPage' | 'loginPageMobile'): LoginPageCfg { return { composicao: 'ambos', posicao: 'centro', logoMorfo: 'quadrada', logoProduto: 'quadrada', frase: null, frasePos: 'abaixo', ...((sc || {})[chave || 'loginPage'] || {}) } }
/* Kit L6986-L7014 */
function BlocoLogosLogin({ platform, lp, sc }: { platform: KitPlatform; lp: LoginPageCfg; sc: SiteConfig }) {
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
function SiteNavHorizontalWeb({ paginas, ativa, onOpen }: { paginas: SitePage[]; ativa: string | undefined; onOpen: (pg: SitePage) => void }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 14px', background: 'rgba(0,0,0,0.12)', borderBottom: '1px solid rgba(255,255,255,0.12)', overflowX: 'auto' }}>
    {paginas.map(pg => <button key={pg.id} onClick={() => onOpen(pg)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 13px', border: 'none', background: 'transparent', color: ativa === pg.id ? '#fff' : 'rgba(255,255,255,0.72)', fontWeight: 800, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: ativa === pg.id ? '2px solid #fff' : '2px solid transparent' }}><FileText size={13} /> {pg.titulo}</button>)}
  </div>
}
/* Kit L7022-L7034 */
function SiteNavVerticalWeb({ paginas, ativa, onOpen, fixado, podeAlternar, onSetFixado, onAbrir, onHoverIn, onHoverOut }: { paginas: SitePage[]; ativa: string | undefined; onOpen: (pg: SitePage) => void; fixado: boolean; podeAlternar: boolean; onSetFixado: (v: boolean) => void; onAbrir: () => void; onHoverIn: () => void; onHoverOut: () => void }) {
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
   2. FOLHAS DO LOGIN — Kit L6826-L6894
   ===================================================================== */

/* Kit L6826-L6856 */
function ForgotPasswordSheet({ platform, onClose }: { platform: KitPlatform; onClose: () => void }) {
  const [login, setLogin] = useState(''); const [enviado, setEnviado] = useState(false); const [erro, setErro] = useState('')
  const localizarConta = (loginBuscado: string) => {
    const dev = (platform?.devUsers || []).find(u => u.login === loginBuscado)
    if (dev) return { email: dev.email }
    for (const t of platform?.tenants || []) {
      const u = t.users.find(u => u.login === loginBuscado)
      if (u) return { email: u.email }
    }
    return null
  }
  const enviar = () => {
    const conta = localizarConta(login.trim())
    if (!conta) { setErro('Não encontramos nenhuma conta com esse login.'); return }
    if (!conta.email) { setErro('Essa conta não tem e-mail cadastrado. Fale com a Morfo pra redefinir a senha.'); return }
    setErro(''); setEnviado(true)
  }
  if (enviado) return <Sheet title="Verifique seu e-mail" onClose={onClose}>
    <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{ width: 56, height: 56, borderRadius: 999, background: alpha(GREEN, 10.2), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Mail size={26} color={GREEN} /></div>
      <p style={{ fontSize: 13, color: TXT2, lineHeight: 1.6, marginBottom: 20 }}>Encontramos a conta do login <strong>{login}</strong> e enviamos um link de redefinição de senha pro e-mail cadastrado nela.</p>
      <button style={{ ...primaryBtn, width: '100%' }} onClick={onClose}>Entendi</button>
    </div>
  </Sheet>
  return <Sheet title="Esqueci minha senha" onClose={onClose}>
    <p style={{ fontSize: 12.5, color: TXT3, marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>Digite seu login (funciona tanto pra usuário {NOME_PRODUTO} ADM quanto pra usuário de uma empresa cliente). Enviamos um link de redefinição pro e-mail cadastrado nele.</p>
    <Field label="Login"><input style={inputStyle} value={login} onChange={e => { setLogin(e.target.value); setErro('') }} placeholder="seu login" onKeyDown={e => e.key === 'Enter' && login.trim() && enviar()} /></Field>
    {erro && <div style={{ fontSize: 12.5, color: RED, marginBottom: 10, fontWeight: 600 }}>{erro}</div>}
    <button disabled={!login.trim()} style={{ ...primaryBtn, width: '100%', opacity: login.trim() ? 1 : 0.5 }} onClick={enviar}><Mail size={16} /> Enviar link de redefinição</button>
  </Sheet>
}
/* Kit L573-L579 */
function loginJaEmUsoGlobalmente(platform: KitPlatform, login: string, exclude?: { devUserId?: string; tenantId?: string; userId?: string }) {
  const alvo = (login || '').trim().toLowerCase()
  if (!alvo || alvo === '-') return false
  const bate = (u: KitUser) => u && (u.login || '').trim().toLowerCase() === alvo
  if ((platform.devUsers || []).some(u => bate(u) && u.id !== exclude?.devUserId)) return true
  return (platform.tenants || []).some(t => (t.users || []).some(u => bate(u) && !(t.id === exclude?.tenantId && u.id === exclude?.userId)))
}
/* Kit L6867-L6894 */
function AceitarConviteSheet({ platform, setPlatform, onClose, onEntrar }: { platform: KitPlatform; setPlatform: Dispatch<SetStateAction<KitPlatform>>; onClose: () => void; onEntrar: (tenantId: string, userId: string) => void }) {
  const pendentes = platform.tenants.flatMap(t => t.users.filter(u => u.status === 'pendente_aprovacao' && u.token).map(u => ({ ...u, tenant: t })))
  const [tokenSelecionado, setTokenSelecionado] = useState(pendentes[0]?.token || '')
  const [nome, setNome] = useState(''); const [senha, setSenha] = useState(''); const [erro, setErro] = useState('')
  const escolhido = pendentes.find(p => p.token === tokenSelecionado)
  const aceitar = () => {
    if (!escolhido) { setErro('Escolha um convite.'); return }
    if (!nome.trim() || !senha.trim()) { setErro('Preencha seu nome e uma senha.'); return }
    const loginGerado = nome.trim().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)
    if (loginJaEmUsoGlobalmente(platform, loginGerado, { tenantId: escolhido.tenant.id, userId: escolhido.id })) { setErro(`O login gerado a partir do seu nome ("${loginGerado}") já está em uso em outro ambiente — tente com o nome completo ou de um jeito um pouco diferente.`); return }
    setPlatform(p => ({ ...p, tenants: p.tenants.map(t => t.id !== escolhido.tenant.id ? t : { ...t, users: t.users.map(u => u.id === escolhido.id ? { ...u, name: nome.trim(), login: loginGerado, senha, status: 'ativo' } : u) }) }))
    onEntrar(escolhido.tenant.id, escolhido.id)
  }
  return <Sheet title="Aceitar convite" onClose={onClose}>
    <p style={{ fontSize: 12.5, color: TXT3, marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>Demonstração — sem link/URL real, escolha abaixo qual convite pendente você está aceitando.</p>
    {pendentes.length === 0 ? <EmptyState icon={Mail} title="Nenhum convite pendente" hint='Peça pra Morfo gerar um em Empresas → detalhe da empresa → "Gerar link de pré-cadastro".' /> : <>
      <Field label="Convite"><select style={inputStyle} value={tokenSelecionado} onChange={e => setTokenSelecionado(e.target.value)}>
        {pendentes.map(p => <option key={p.id} value={p.token}>{p.tenant.companyName}{(p.phone || p.email) ? ` · ${[p.phone, p.email].filter(Boolean).join(' · ')}` : ''}</option>)}
      </select></Field>
      <Field label="Seu nome"><input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} /></Field>
      <Field label="Escolha uma senha"><input type="password" style={inputStyle} value={senha} onChange={e => setSenha(e.target.value)} /></Field>
      {erro && <div style={{ fontSize: 12.5, color: RED, marginBottom: 10, fontWeight: 600 }}>{erro}</div>}
      <button style={{ ...primaryBtn, width: '100%' }} onClick={aceitar}><Check size={16} /> Concluir cadastro e entrar</button>
    </>}
  </Sheet>
}

/* =====================================================================
   3. CONTRATAÇÃO — Kit L7216-L7241 e L7315-L7395
   ===================================================================== */

/* Kit L7216-L7226.
   ADAPTAÇÃO (G44 regra 3, configuração do produto): as 4 linhas automáticas
   do Kit vêm de campos de plano que só existem no domínio de exemplo do Kit
   (`itemLimit` = "registros de Entidade A", `userLimit`, `restrictions`). O
   plano do MorfoFinP (`PlanoRegistro`, cadastrado no N0 → Gerenciar Planos)
   não tem esses campos — quando NENHUM deles existe, a lista é só o texto
   livre do plano (`features`), em vez de imprimir "undefined usuários" /
   "Registros de Entidade A". Com os campos presentes, o cálculo é o do Kit. */
function planFeaturesAuto(plano: KitPlan | undefined) {
  if (!plano) return []
  if (plano.userLimit == null && plano.itemLimit === undefined && !plano.restrictions) return [...(plano.features || [])]
  const r = plano.restrictions || {}
  const list = [
    plano.itemLimit ? `Até ${plano.itemLimit} registros de Entidade A` : 'Registros de Entidade A ilimitados',
    `${plano.userLimit} usuário${(plano.userLimit ?? 0) > 1 ? 's' : ''}`,
    r.exportacaoDetalhada ? 'Exportação detalhada (CSV/PDF completo)' : 'Exportação simples',
    r.layoutPersonalizado ? 'Layout e menus personalizáveis' : 'Layout padrão da Morfo',
  ]
  return [...list, ...(plano.features || [])]
}
/* Kit L7227-L7241 */
function PlanoCard({ plano, selected, onSelect }: { plano: KitPlan; selected: boolean; onSelect: () => void }) {
  return <button onClick={onSelect} style={{ textAlign: 'left', width: '100%', padding: 16, borderRadius: 16, border: `2px solid ${selected ? PURPLE : LINE}`, background: selected ? alpha(PURPLE, 3.9) : BRANCO, cursor: 'pointer', position: 'relative' }}>
    {plano.destaque && <div style={{ position: 'absolute', top: -10, right: 14, background: CORAL, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 999 }}>MAIS ESCOLHIDO</div>}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div><div style={{ fontWeight: 800, fontSize: 16, color: INK }}>{plano.name}</div>{plano.porte && <div style={{ fontSize: 11.5, color: TXT3 }}>Porte {plano.porte}</div>}</div>
      {plano.gratuito
        ? <div style={{ textAlign: 'right' }}><div style={{ fontSize: 18, fontWeight: 800, color: GREEN }}>Grátis</div><div style={{ fontSize: 10.5, color: TXT3 }}>por {plano.validadeDias} dias</div></div>
        : <div style={{ textAlign: 'right' }}><div style={{ fontSize: 21, fontWeight: 800, color: PURPLE }}>{fmtBRL(plano.monthlyValue)}</div><div style={{ fontSize: 10.5, color: TXT3 }}>/mês</div></div>}
    </div>
    {plano.description && <div style={{ fontSize: 12.5, color: TXT2, marginTop: 8 }}>{plano.description}</div>}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
      {planFeaturesAuto(plano).map((f, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: TXT2 }}><Check size={13} color={GREEN} /> {f}</div>)}
    </div>
  </button>
}
/* Kit L7315-L7395 */
export interface SelfRegisterPayload { companyName: string; ownerName: string; phone: string; hasWhatsapp: boolean; email: string; city: string; fiscalAddress: Endereco; login: string; senha: string; planoContratado: KitPlan | undefined; paymentMethod: string | null; primeiraCobrancaPaga: boolean; autoLiberado: boolean }
function ContratarPacoteFlow({ plans, onClose, onFinish }: { plans: KitPlan[]; onClose: () => void; onFinish: (payload: SelfRegisterPayload) => void }) {
  const [step, setStep] = useState(1)
  const [planId, setPlanId] = useState(plans.find(p => p.destaque)?.id || plans[0]?.id || '')
  const [companyName, setCompanyName] = useState(''); const [ownerName, setOwnerName] = useState(''); const [phone, setPhone] = useState(''); const [hasWhatsapp, setHasWhatsapp] = useState(true); const [email, setEmail] = useState(''); const [login, setLogin] = useState(''); const [senha, setSenha] = useState('')
  const [fiscalAddress, setFiscalAddress] = useState<Endereco>(normalizeAddress(null))
  const [method, setMethod] = useState<'pix' | 'cartao_credito' | 'boleto'>('pix'); const [processando, setProcessando] = useState(false)
  const plano = plans.find(p => p.id === planId)
  const phoneOk = validaTelefone(phone)
  const enderecoFiscalOk = fiscalAddress.cep.trim() && fiscalAddress.logradouro.trim() && fiscalAddress.cidade.trim() && fiscalAddress.uf.trim()
  const dadosCompletos = companyName.trim() && ownerName.trim() && login.trim() && senha.trim() && phoneOk && validaEmailEnvio(email) && enderecoFiscalOk

  const confirmarPagamento = () => {
    setProcessando(true)
    setTimeout(() => {
      const autoLiberado = method !== 'boleto'
      onFinish({ companyName, ownerName, phone, hasWhatsapp, email: email.trim(), city: `${fiscalAddress.cidade}/${fiscalAddress.uf}`, fiscalAddress, login, senha, planoContratado: plano, paymentMethod: method, primeiraCobrancaPaga: autoLiberado, autoLiberado })
      setProcessando(false); setStep(4)
    }, 900)
  }
  const confirmarGratuito = () => {
    setProcessando(true)
    setTimeout(() => {
      onFinish({ companyName, ownerName, phone, hasWhatsapp, email: email.trim(), city: `${fiscalAddress.cidade}/${fiscalAddress.uf}`, fiscalAddress, login, senha, planoContratado: plano, paymentMethod: null, primeiraCobrancaPaga: false, autoLiberado: true })
      setProcessando(false); setStep(4)
    }, 500)
  }

  return <Sheet title={step === 1 ? 'Escolha seu plano' : step === 2 ? 'Dados da empresa' : step === 3 ? 'Pagamento' : 'Tudo certo!'} onClose={onClose} resetScrollKey={step}>
    <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>{(plano?.gratuito ? [1, 2, 4] : [1, 2, 3, 4]).map(n => <div key={n} style={{ flex: 1, height: 3, borderRadius: 999, background: n <= step ? PURPLE : LINE }} />)}</div>

    {step === 1 && <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {plans.map(pl => <PlanoCard key={pl.id} plano={pl} selected={pl.id === planId} onSelect={() => setPlanId(pl.id)} />)}
      </div>
      <button disabled={!planId} style={{ ...primaryBtn, width: '100%', opacity: planId ? 1 : 0.5 }} onClick={() => setStep(2)}>Continuar <ArrowRight size={15} /></button>
    </>}

    {step === 2 && <>
      <div style={{ background: alpha(PURPLE, 3.9), border: `1px solid ${alpha(PURPLE, 20)}`, borderRadius: 12, padding: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{plano?.name}</span>{plano?.gratuito ? <span style={{ fontSize: 13, fontWeight: 800, color: GREEN }}>Grátis por {plano.validadeDias} dias</span> : <span style={{ fontSize: 13, fontWeight: 800, color: PURPLE }}>{fmtBRL(plano?.monthlyValue)}/mês</span>}
      </div>
      <Field label="Nome da empresa"><input style={inputStyle} value={companyName} onChange={e => setCompanyName(e.target.value)} /></Field>
      <Field label="Seu nome"><input style={inputStyle} value={ownerName} onChange={e => setOwnerName(e.target.value)} /></Field>
      <PhoneComWhats phone={phone} setPhone={setPhone} hasWhatsapp={hasWhatsapp} setHasWhatsapp={setHasWhatsapp} />
      <FieldError show={phone.trim() && !phoneOk} text="Telefone inválido (use DDD + número)" />
      <Field label="E-mail"><input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="empresa@exemplo.com" /></Field>
      <FieldError show={email.trim() && !validaEmailEnvio(email)} text="E-mail inválido" />
      <SectionLabel>Endereço fiscal</SectionLabel>
      <AddressFieldsBasic value={fiscalAddress} onChange={setFiscalAddress} />
      <Field label="Escolha um login"><input style={inputStyle} value={login} onChange={e => setLogin(e.target.value)} /></Field>
      <Field label="Escolha uma senha"><input style={inputStyle} type="password" value={senha} onChange={e => setSenha(e.target.value)} /></Field>
      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...secondaryBtn, flex: 1 }} onClick={() => setStep(1)}>Voltar</button>
        <button disabled={!dadosCompletos || processando} style={{ ...primaryBtn, flex: 1, opacity: (dadosCompletos && !processando) ? 1 : 0.5 }} onClick={() => plano?.gratuito ? confirmarGratuito() : setStep(3)}>{plano?.gratuito ? (processando ? 'Ativando...' : <>Ativar plano gratuito <Check size={15} /></>) : <>Continuar <ArrowRight size={15} /></>}</button>
      </div>
    </>}

    {step === 3 && !plano?.gratuito && <>
      <div style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12.5, color: TXT3 }}>{plano?.name} · primeira mensalidade</span><span style={{ fontSize: 15, fontWeight: 800, color: GREEN }}>{fmtBRL(plano?.monthlyValue)}</span></div>
      </div>
      <Field label="Forma de pagamento"><Segmented value={method} onChange={setMethod} options={[{ value: 'pix', label: 'Pix' }, { value: 'cartao_credito', label: 'Cartão' }, { value: 'boleto', label: 'Boleto' }]} /></Field>
      {method === 'pix' && <div style={{ textAlign: 'center', padding: '20px 0' }}><QrCode size={90} color={INK} style={{ margin: '0 auto' }} /><p style={{ fontSize: 12, color: TXT3, marginTop: 10 }}>Simulação — em um pagamento real, o QR code apareceria aqui.</p></div>}
      {method === 'cartao_credito' && <><Field label="Número do cartão"><input style={inputStyle} placeholder="0000 0000 0000 0000" /></Field><div style={{ display: 'flex', gap: 8 }}><Field label="Validade"><input style={inputStyle} placeholder="MM/AA" /></Field><Field label="CVV"><input style={inputStyle} placeholder="000" /></Field></div></>}
      {method === 'boleto' && <div style={{ background: alpha(AMBER, 7.8), border: `1px solid ${alpha(AMBER, 26.7)}`, borderRadius: 12, padding: 12, margin: '6px 0 16px' }}><p style={{ fontSize: 12.5, color: INK, margin: 0, lineHeight: 1.5 }}>O boleto leva até 2 dias úteis pra compensar. Seu acesso já fica disponível (restrito) enquanto isso — a Morfo libera tudo assim que o pagamento cair, ou você pode acompanhar o status.</p></div>}
      <div style={{ display: 'flex', gap: 8, marginTop: method === 'pix' ? 0 : 6 }}>
        <button style={{ ...secondaryBtn, flex: 1 }} onClick={() => setStep(2)}>Voltar</button>
        <button disabled={processando} style={{ ...primaryBtn, flex: 1, opacity: processando ? 0.6 : 1 }} onClick={confirmarPagamento}>{processando ? 'Processando...' : <>Confirmar pagamento <Check size={15} /></>}</button>
      </div>
    </>}

    {step === 4 && <div style={{ textAlign: 'center', padding: '12px 0' }}>
      <div style={{ width: 64, height: 64, borderRadius: 999, background: alpha(GREEN, 10.2), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><CheckCircle2 size={32} color={GREEN} /></div>
      <div style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 8 }}>{plano?.gratuito ? 'Plano gratuito ativado!' : method === 'boleto' ? 'Cadastro feito!' : 'Pagamento confirmado!'}</div>
      <p style={{ fontSize: 13, color: TXT2, lineHeight: 1.5, marginBottom: 20 }}>{plano?.gratuito ? `Seu ambiente do ${plano?.name} já está liberado, grátis por ${plano.validadeDias} dias. Bem-vindo à ${NOME_PRODUTO}!` : method === 'boleto' ? 'Assim que o boleto compensar (até 2 dias úteis), seu ambiente é liberado por completo. Enquanto isso você já pode entrar e configurar o básico.' : `Seu ambiente do ${plano?.name} já está liberado. Bem-vindo à ${NOME_PRODUTO}!`}</p>
      <button style={{ ...primaryBtn, width: '100%' }} onClick={onClose}>Entrar agora <ArrowRight size={15} /></button>
    </div>}
  </Sheet>
}

/* =====================================================================
   4. LOGINVIEW — Kit L7035-L7213 (literal)
   ===================================================================== */

/* Kit L211: NOME_PRODUTO = "MorfoMod" no Kit → "MorfoFinP" aqui (identidade
   do produto, a única coisa que muda por produto — G55). No Kit o nome
   aparece literal nos textos ("MorfoMod ADM", "Bem-vindo à MorfoMod!",
   rodapé "MorfoMod · Desenvolvido por Morfo Sistemas") — aqui os mesmos
   textos passam por esta constante, como o próprio Kit faz em NOME_PRODUTO. */
const NOME_PRODUTO = 'MorfoFinP'

type LoginLevel = 'dev' | 'tenant'
function LoginViewKit({ platform, setPlatform, areaWeb, onLogin, onSelfRegister }: { platform: KitPlatform; setPlatform: Dispatch<SetStateAction<KitPlatform>>; areaWeb: boolean; onLogin: (level: LoginLevel, tenantId: string | null, userId?: string) => void; onSelfRegister: (payload: SelfRegisterPayload) => void }) {
  const [login, setLogin] = useState(''); const [senha, setSenha] = useState(''); const [error, setError] = useState(''); const [selfOpen, setSelfOpen] = useState(false); const [forgotOpen, setForgotOpen] = useState(false)
  const [aceitarConviteOpen, setAceitarConviteOpen] = useState(false)
  const [sitePageOpen, setSitePageOpen] = useState<SitePage | null>(null)
  const paginasSite: SitePage[] = [...sitePagesDe(platform).filter(pg => pg.visivel), { id: SITE_PLANOS_PAGE_ID, titulo: 'Planos', fixa: true }]
  const abrirPaginaMobile = (pg: SitePage) => { if (pg.id === SITE_PLANOS_PAGE_ID) { setSelfOpen(true); return } setSitePageOpen(pg) }
  const siteMenuTipo = platform.siteMenu?.tipo || 'fixo'
  const [cortinaAberta, setCortinaAberta] = useState(false)
  const [cortinaFixada, setCortinaFixada] = useState(false)
  const wcfg = siteWebLayoutDe(platform)
  const [siteVertFixadoUsuario, setSiteVertFixadoUsuario] = useState(false)
  const siteVertFixado = wcfg.fixagemVertical === 'sempre_fixo' || (wcfg.fixagemVertical === 'usuario_escolhe' && siteVertFixadoUsuario)
  const sitePodeAlternar = wcfg.fixagemVertical === 'usuario_escolhe'
  const [siteVertAberto, setSiteVertAberto] = useState(false)
  const [paginaAtivaWeb, setPaginaAtivaWeb] = useState(SITE_LOGIN_PAGE_ID)
  const siteHoverT = useRef<ReturnType<typeof setTimeout> | null>(null)
  const siteHoverIn = () => { if (siteHoverT.current) clearTimeout(siteHoverT.current); setSiteVertAberto(true) }
  const siteHoverOut = () => { if (siteHoverT.current) clearTimeout(siteHoverT.current); siteHoverT.current = setTimeout(() => setSiteVertAberto(false), 300) }
  const submit = () => {
    /* ADAPTAÇÃO (1 linha): o login do MorfoFinP é guardado normalizado
       (`criarAcesso` grava trim + minúsculas) — a comparação usa a mesma
       normalização, senão "Rafael@x" nunca bateria com "rafael@x". No Kit a
       comparação é literal (`u.login === login`). Senha continua literal. */
    const loginN = login.trim().toLowerCase()
    const dev = platform.devUsers.find(u => u.login === loginN && u.senha === senha)
    if (dev) { onLogin('dev', null, dev.id); return }
    for (const t of platform.tenants) { const u = t.users.find(u => u.login === loginN && u.senha === senha && u.status === 'ativo'); if (u) { onLogin('tenant', t.id, u.id); return } }
    setError('Login ou senha inválidos')
  }
  const onEnterKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') submit() }
  const sc = platform.siteConfig || {}
  const gradienteSite = sc.cor1 && sc.cor2 ? `linear-gradient(160deg, ${sc.cor1}, ${sc.cor2})` : `linear-gradient(160deg, ${CORAL}, ${PURPLE} 40%, ${PURPLE_DEEP})`
  const cartaoLogin = <div style={{ background: BRANCO, borderRadius: 18, padding: 20 }}>
    <Field label="Login"><input style={inputStyle} value={login} onChange={e => setLogin(e.target.value)} onKeyDown={onEnterKey} placeholder="seu login" /></Field>
    <Field label="Senha"><input style={inputStyle} type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={onEnterKey} placeholder="sua senha" /></Field>
    <button onClick={() => setForgotOpen(true)} style={{ ...linkBtnSmall, display: 'block', color: PURPLE, fontSize: 12, fontWeight: 700, padding: 0, marginBottom: 14 }}>Esqueci minha senha</button>
    {error && <div style={{ fontSize: 12.5, color: RED, marginBottom: 10, fontWeight: 600 }}>{error}</div>}
    <button style={{ ...primaryBtn, width: '100%', marginBottom: 8 }} onClick={submit}><KeyRound size={16} /> Entrar</button>
    <button style={{ ...primaryBtn, width: '100%', marginBottom: 14, background: CORAL }} onClick={() => setSelfOpen(true)}><UserPlus size={16} /> Contratar um plano</button>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}><div style={{ flex: 1, height: 1, background: LINE }} /><span style={{ fontSize: 11, color: TXT3, fontWeight: 700 }}>ACESSO RÁPIDO PARA TESTE</span><div style={{ flex: 1, height: 1, background: LINE }} /></div>
    <button style={{ ...secondaryBtn, width: '100%', marginBottom: 8 }} onClick={() => onLogin('tenant', platform.tenants[0].id)}>Entrar como empresa cliente (demo)</button>
    <button style={{ ...secondaryBtn, width: '100%', marginBottom: 8 }} onClick={() => onLogin('dev', null)}><Building size={16} /> Entrar como Admin Morfo (demo)</button>
    <button style={{ ...secondaryBtn, width: '100%' }} onClick={() => setAceitarConviteOpen(true)}><Mail size={16} /> Aceitar convite de usuário (demo)</button>
  </div>
  const rodapeInfo = <>
    <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 18 }}>Protótipo MVP · dados de demonstração · <strong>{KIT_BUILD}</strong></div>
    <div style={{ textAlign: 'center', fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>Desenvolvido por Morfo Sistemas</div>
    {/* ADAPTAÇÃO (G52 — carimbo de build do produto, regra do Roteiro, não do
        Kit): 3ª linha, mesmo estilo da 2ª, com o número real da entrega. O Kit
        mostra só a versão do esqueleto (KIT_BUILD) porque não tem contador de
        entrega; o MorfoFinP tem (Decisão 33) e o Rafael exige que ele apareça. */}
    <div style={{ textAlign: 'center', fontSize: 10.5, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>{NOME_PRODUTO} {CARIMBO_BUILD}</div>
  </>
  const overlaysComuns = <>
    {selfOpen && <ContratarPacoteFlow plans={(platform.plans || []).filter(p => !p.ficticio)} onClose={() => setSelfOpen(false)} onFinish={onSelfRegister} />}
    {forgotOpen && <ForgotPasswordSheet platform={platform} onClose={() => setForgotOpen(false)} />}
    {aceitarConviteOpen && <AceitarConviteSheet platform={platform} setPlatform={setPlatform} onClose={() => setAceitarConviteOpen(false)} onEntrar={(tenantId, userId) => { setAceitarConviteOpen(false); onLogin('tenant', tenantId, userId) }} />}
  </>
  const popupPaginaMobile = sitePageOpen && <div className="mloc-tela-cheia" style={{ ...TELA_CHEIA_BASE, background: PAPER, zIndex: 60, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
    <TopBar title={sitePageOpen.titulo} onBack={() => setSitePageOpen(null)} />
    <div style={{ padding: 16 }}>
      {sitePageOpen.imagemUri && <img src={sitePageOpen.imagemUri} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 14, marginBottom: 14 }} />}
      <div style={{ fontSize: 14.5, color: TXT2, lineHeight: 1.8 }}>{renderRico(sitePageOpen.conteudo)}</div>
      <div style={{ marginTop: 22, borderTop: `1px solid ${LINE}`, paddingTop: 12, fontSize: 11, color: TXT3 }}>{platform.siteConfig?.rodape ?? `${NOME_PRODUTO} · Desenvolvido por Morfo Sistemas`}</div>
    </div>
  </div>
  if (areaWeb) {
    const paginasNavWeb = paginasSiteComLogin(platform, true)
    const paginaWebAtiva = paginasNavWeb.find(pg => pg.id === paginaAtivaWeb) || paginasNavWeb.find(pg => pg.id === SITE_LOGIN_PAGE_ID)
    const abrirPaginaWeb = (pg: SitePage) => { if (pg.id === SITE_PLANOS_PAGE_ID) { setSelfOpen(true); setSiteVertAberto(false); return } setPaginaAtivaWeb(pg.id); setSiteVertAberto(false) }
    const lp = loginPageCfgDe(sc)
    const blocoLogosLogin = <BlocoLogosLogin platform={platform} lp={lp} sc={sc} />
    return <div className="mloc-sempre-claro" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: gradienteSite }}>
      <div className="mloc-site-full" style={{ flexShrink: 0 }}>
        <SiteHeaderWeb platform={platform} cfg={wcfg} />
        {wcfg.modo === 'horizontal' && <SiteNavHorizontalWeb paginas={paginasNavWeb} ativa={paginaWebAtiva?.id} onOpen={abrirPaginaWeb} />}
      </div>
      <div className="mloc-site-full" style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative' }}>
        {wcfg.modo === 'vertical' && <SiteNavVerticalWeb paginas={paginasNavWeb} ativa={paginaWebAtiva?.id} onOpen={abrirPaginaWeb}
          fixado={siteVertFixado} podeAlternar={sitePodeAlternar} onSetFixado={setSiteVertFixadoUsuario}
          onAbrir={() => setSiteVertAberto(true)} onHoverIn={siteHoverIn} onHoverOut={siteHoverOut} />}
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 28 }}>
          {(!paginaWebAtiva || paginaWebAtiva.id === SITE_LOGIN_PAGE_ID)
            ? <div style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>
              {blocoLogosLogin}
              {cartaoLogin}
              {rodapeInfo}
            </div>
            : <div style={{ width: '100%', maxWidth: 820, margin: '0 auto', background: BRANCO, borderRadius: 16, padding: '20px 22px' }}>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: INK, margin: '0 0 12px' }}>{paginaWebAtiva.titulo}</h1>
              {paginaWebAtiva.imagemUri && <img src={paginaWebAtiva.imagemUri} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 14, marginBottom: 14 }} />}
              <div style={{ fontSize: 14.5, color: TXT2, lineHeight: 1.8 }}>{renderRico(paginaWebAtiva.conteudo)}</div>
              <div style={{ marginTop: 22, borderTop: `1px solid ${LINE}`, paddingTop: 12, fontSize: 11, color: TXT3 }}>{sc.rodape ?? `${NOME_PRODUTO} · Desenvolvido por Morfo Sistemas`}</div>
            </div>}
        </div>
        {wcfg.modo === 'vertical' && !siteVertFixado && siteVertAberto && <div onClick={() => setSiteVertAberto(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 56, display: 'flex' }}>
          <div onClick={e => e.stopPropagation()} onMouseEnter={siteHoverIn} onMouseLeave={siteHoverOut} style={{ width: 240, background: `linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.22)), ${gradienteSite}`, height: '100%', padding: '14px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, boxShadow: '4px 0 16px rgba(0,0,0,0.35)', borderRight: '1px solid rgba(255,255,255,0.14)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px 10px' }}>
              <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)' }}>MENU DO SITE</span>
              <span style={{ display: 'flex', gap: 4 }}>
                {sitePodeAlternar && <button onClick={() => { setSiteVertFixadoUsuario(true); setSiteVertAberto(false) }} style={{ background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 800 }}>FIXAR</button>}
                <button onClick={() => setSiteVertAberto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#fff" /></button>
              </span>
            </div>
            {paginasNavWeb.map(pg => <button key={pg.id} onClick={() => abrirPaginaWeb(pg)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 10, border: 'none', background: paginaWebAtiva?.id === pg.id ? 'rgba(255,255,255,0.14)' : 'transparent', color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', textAlign: 'left' }}><FileText size={15} /> {pg.titulo}</button>)}
          </div>
        </div>}
      </div>
      {overlaysComuns}
    </div>
  }
  const lpMobile = loginPageCfgDe(sc, 'loginPageMobile')
  return <div className="mloc-sempre-claro" style={{ minHeight: '100%', maxHeight: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: 28, background: gradienteSite }}>
    <div style={{ marginBottom: paginasSite.length > 0 && siteMenuTipo === 'fixo' ? 14 : 24 }}>
      <BlocoLogosLogin platform={platform} lp={lpMobile} sc={sc} />
    </div>
    {paginasSite.length > 0 && siteMenuTipo === 'fixo' && <div style={{ margin: '-10px -28px 24px' }}>
      <SiteNavHorizontalWeb paginas={paginasSite} ativa={sitePageOpen?.id} onOpen={abrirPaginaMobile} />
    </div>}
    {cartaoLogin}
    {rodapeInfo}
    {overlaysComuns}
    {popupPaginaMobile}
    {paginasSite.length > 0 && siteMenuTipo === 'cortina' && <>
      <button onClick={() => setCortinaAberta(true)} title="Menu do site" style={{ position: 'fixed', top: 100, left: 'calc(50% - 215px)', zIndex: 55, border: 'none', background: 'rgba(255,255,255,0.22)', color: '#fff', borderRadius: '0 12px 12px 0', padding: '12px 6px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}><List size={16} /><span style={{ fontSize: 8.5, fontWeight: 800, writingMode: 'vertical-rl' }}>MENU</span></button>
      {(cortinaAberta || cortinaFixada) && <div onClick={() => { if (!cortinaFixada) setCortinaAberta(false) }} style={{ position: 'fixed', top: 0, bottom: 0, left: 0, right: 0, margin: '0 auto', width: '100%', maxWidth: 'var(--mloc-maxw, 430px)', background: cortinaFixada ? 'transparent' : 'rgba(0,0,0,0.45)', zIndex: 56, display: 'flex', pointerEvents: cortinaFixada ? 'none' : 'auto' }}>
        <div onClick={e => e.stopPropagation()} style={{ width: 220, maxWidth: '75%', background: `linear-gradient(rgba(0,0,0,0.22), rgba(0,0,0,0.22)), ${gradienteSite}`, height: '100%', padding: '14px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, pointerEvents: 'auto', boxShadow: '4px 0 16px rgba(0,0,0,0.35)', borderRight: '1px solid rgba(255,255,255,0.14)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 6px 10px' }}>
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.5, color: 'rgba(255,255,255,0.7)' }}>MENU DO SITE</span>
            <span style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setCortinaFixada(v => !v)} style={{ background: cortinaFixada ? 'rgba(255,255,255,0.16)' : 'none', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 4, color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: 800 }}>{cortinaFixada ? 'FIXADO' : 'FIXAR'}</button>
              <button onClick={() => { setCortinaFixada(false); setCortinaAberta(false) }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#fff" /></button>
            </span>
          </div>
          {paginasSite.map(pg => <button key={pg.id} onClick={() => { abrirPaginaMobile(pg); if (!cortinaFixada) setCortinaAberta(false) }} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px', borderRadius: 10, border: 'none', background: sitePageOpen?.id === pg.id ? 'rgba(255,255,255,0.14)' : 'transparent', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', textAlign: 'left' }}><FileText size={14} /> {pg.titulo}</button>)}
        </div>
      </div>}
    </>}
  </div>
}

/* =====================================================================
   5. ADAPTADOR MorfoFinP — "configuração do produto por cima" (G44 regra 3)
   ===================================================================== */

// Formata o número do WhatsApp guardado como "5511986897908" pra "(11) 98689-7908",
// o mesmo formato que as páginas padrão do Kit usam ("(11) 4000-0000").
function formatarTelefoneBR(numero: string): string {
  const d = numero.replace(/\D/g, '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return numero
}

// Perguntas frequentes (G25) — a página existia no site anterior do produto
// (Decisão 27) e é PRESERVADA como configuração (`platform.sitePages`), no
// mecanismo de páginas do próprio Kit — nunca mais como uma tela própria.
// Conteúdo idêntico ao que já estava no ar (fatos do produto, sem marketing
// inventado), só no formato de texto rico do Kit (`renderRico`: **negrito**).
const CONTEUDO_FAQ = [
  '**O que é o MorfoFinP?**\nUm app de controle financeiro pessoal: resumo do mês, metas por categoria, lançamentos, carteira de contas e planejamento — derivado de uma planilha que já era usada no dia a dia.',
  '**Meus dados ficam salvos onde?**\nDireto no seu navegador/dispositivo (armazenamento local), sem servidor externo por trás ainda. Isso significa que os dados não saem do seu aparelho por conta própria.',
  '**Preciso pagar alguma coisa?**\nOs planos mostrados na página de Planos ainda são um rascunho (placeholder) — o preço e o que cada um inclui de verdade ainda não foram definidos.',
  '**Dá pra usar no celular?**\nSim, o app funciona no navegador do celular ou do computador, sem precisar instalar nada de uma loja de aplicativos.',
].join('\n\n')

const CARREGANDO = Symbol('carregando')

export default function LoginView() {
  const config = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO)
  const planosDexie = usePlanos()
  const { whatsappNumero, whatsappMensagemPadrao } = useMarcaSite()
  const areaWeb = useSimulacaoResolucao() === 'web'

  // Aguardando a 1ª leitura do Dexie — `config === undefined` NÃO entra aqui
  // (é o caso real de banco sem credencial nenhuma); só o sentinela distingue
  // "carregando" de "vazio de verdade" (bug real da Etapa 8, ver histórico).
  if (config === CARREGANDO) return null

  // --- platform.devUsers: administrador Morfo (N0). Sem credencial N0 gravada
  // ainda, vale o usuário padrão do Kit (`generatePlatform`, L646:
  // login "morfomod", senha "306583", e-mail projetos.morfo@gmail.com — G55,
  // mesmo dado do MorfoLoc); com credencial gravada, ela manda.
  const devUsers: KitUser[] = config?.credencialEmailN0 && config?.credencialSenhaN0
    ? [{ id: 'n0', name: 'Admin Morfo', login: config.credencialEmailN0, senha: config.credencialSenhaN0, email: config.credencialEmailN0 }]
    : [{ id: 'n0', name: N0_PADRAO_KIT.nome, login: N0_PADRAO_KIT.login, senha: N0_PADRAO_KIT.senha, email: N0_PADRAO_KIT.email }]
  // --- platform.tenants: a empresa cliente (N1) é o próprio usuário do app
  // (1 tenant, `t0` — mesmo id usado por DevApp → "Entrar como este tenant").
  // O usuário só existe depois de "Contratar um plano" (ou do atalho demo).
  const tenantUsers: KitUser[] = config?.credencialEmail && config?.credencialSenha
    ? [{ id: 'u0', name: config.credencialEmail, login: config.credencialEmail, senha: config.credencialSenha, email: config.credencialEmail, status: 'ativo' }]
    : []
  // --- platform.plans: catálogo real do N0 (Gerenciar Planos, Dexie), na
  // forma que o Kit lê (`name`/`monthlyValue`/`features`).
  const plans: KitPlan[] = planosDexie.map(p => ({ id: String(p.id), name: p.nome, monthlyValue: p.valorMensal, destaque: p.destaque, features: p.funcionalidades }))
  // --- platform.sitePages: as 2 páginas padrão do Kit (Sobre a Morfo,
  // Contato — G55) + FAQ do produto (config preservada, ver CONTEUDO_FAQ).
  // Configuração do produto por cima: o telefone-exemplo do Kit
  // ("(11) 4000-0000") vira o WhatsApp de suporte real do MorfoFinP (Decisão
  // 20 — número escolhido pelo Rafael; editável em N0 → Parâmetros → Marca) e
  // a página Contato ganha o link direto — é assim que o canal de suporte
  // do site deslogado continua funcionando dentro da estrutura do Kit.
  const numeroSuporte = whatsappNumero || linkSuporteWhatsApp().match(/wa\.me\/(\d+)/)?.[1] || ''
  const telefoneSuporte = numeroSuporte ? formatarTelefoneBR(numeroSuporte) : '(11) 4000-0000'
  const linkWhats = linkSuporteWhatsApp(whatsappMensagemPadrao, whatsappNumero)
  const sitePages: SitePage[] = [
    ...sitePagesPadrao().map(pg => ({ ...pg, conteudo: (pg.conteudo || '').replace('(11) 4000-0000', telefoneSuporte) + (pg.id === 'contato' ? `\n\n[Falar no WhatsApp](${linkWhats})` : '') })),
    { id: 'faq', titulo: 'Perguntas frequentes', visivel: true, conteudo: CONTEUDO_FAQ },
  ]
  const platform: KitPlatform = {
    devUsers,
    tenants: [{ id: 't0', companyName: NOME_PRODUTO, users: tenantUsers }],
    plans,
    sitePages,
    // Identidade do produto (G55: "a única coisa que muda por produto") — pelo
    // mecanismo de branding do próprio Kit: wordmark do MorfoFinP no lugar do
    // "morfoMod" de exemplo; logos Morfo continuam as do Kit.
    branding: { produtoExterna: produtoLogoUrl, produtoTopo: produtoLogoUrl },
  }

  // AceitarConviteSheet só chama setPlatform quando existe convite pendente
  // (`status: "pendente_aprovacao"` com token) — o MorfoFinP não gera convite
  // (app de 1 usuário, sem backend), então a folha sempre cai no EmptyState
  // do Kit e este setter nunca é acionado. Fica como no-op declarado.
  const setPlatform: Dispatch<SetStateAction<KitPlatform>> = () => {}

  // onLogin do Kit → sessões do produto (persistidas no Dexie; `AppRoot.tsx`
  // troca de tela sozinho via useLiveQuery). 'dev' = N0, 'tenant' = N1.
  // Sem credencial gravada ainda (1º uso / atalho demo), `entrarDemo*()` cria
  // a credencial — N0 nasce com os valores padrão do Kit (G55).
  const onLogin = (level: LoginLevel) => {
    if (level === 'dev') void entrarDemoN0()
    else void entrarDemo()
  }
  // onSelfRegister do Kit → "Contratar um plano" vira a credencial N1 do
  // produto (login/senha escolhidos no passo 2) + plano contratado (Minha
  // Assinatura). Os demais dados do passo 2 (empresa, telefone, e-mail,
  // endereço fiscal) são coletados pelo fluxo do Kit mas, sem backend/tenant
  // real (Backlog #028), não têm onde ficar — pendência nomeada na Decisão 48.
  const onSelfRegister = (payload: SelfRegisterPayload) => {
    void (async () => {
      const planoId = payload.planoContratado ? Number(payload.planoContratado.id) : NaN
      if (!Number.isNaN(planoId)) await salvarPlanoId(planoId)
      await criarAcesso(payload.login, payload.senha)
    })()
  }

  // Raiz: no Kit, `App()` (L7460-L7461) envolve o Login numa coluna com
  // `maxWidth: var(--mloc-maxw)` (430px mobile / 100% web) e a fonte do
  // esqueleto. Aqui a coluna já é o `#root` do produto (480px, Etapa 4 — mesma
  // adaptação registrada na Decisão 37 pro botão de área simulada), então só
  // a variável e a fonte são declaradas, com o valor do produto.
  return <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, sans-serif", ['--mloc-maxw' as string]: areaWeb ? '100%' : '480px' } as CSSProperties}>
    <LoginViewKit platform={platform} setPlatform={setPlatform} areaWeb={areaWeb} onLogin={onLogin} onSelfRegister={onSelfRegister} />
  </div>
}
