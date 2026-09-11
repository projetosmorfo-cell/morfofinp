import { useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from 'react'
import { ArrowRight, Building, Check, CheckCircle2, FileText, KeyRound, List, Mail, QrCode, UserPlus, X } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  AMBER, BRANCO, CORAL, GREEN, INK, LINE, PAPER, PURPLE, PURPLE_DEEP, RED, TXT2, TXT3, KIT_BUILD, TELA_CHEIA_BASE,
  EmptyState, Field, FieldError, PhoneComWhats, SectionLabel, Segmented, Sheet, TopBar,
  alpha, fmtBRL, inputStyle, linkBtnSmall, primaryBtn, renderRico, secondaryBtn, validaEmailEnvio, validaTelefone,
  type KitPlan, type KitPlatform, type KitUser, type SitePage,
} from './kitBase'
import { NOME_PRODUTO, SITE_LOGIN_PAGE_ID, SITE_PLANOS_PAGE_ID, BlocoLogosLogin, SiteHeaderWeb, SiteNavHorizontalWeb, SiteNavVerticalWeb, loginPageCfgDe, montarPlatformSite, paginasSiteComLogin, sitePagesDe, siteWebLayoutDe } from './siteKit'
import { criarAcesso, entrarComoTenantUser } from './auth'
import { entrarComoDevUser, N0_PADRAO_KIT } from './authN0'
import { usePlatformN0, devUsersComMigracao, tenantUsersComMigracao, TENANT_N1_ID } from './kitPlatform'
import { useSimulacaoResolucao } from '../configuracaoIcones'
import { usePlanos, recursosAutomaticos } from './planos'
import { salvarPlanoId } from './planoAtual'
import { CARIMBO_BUILD } from '../buildInfo'

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
//   1. camada do site (Kit L6904-L7034) → `siteKit.tsx` (Decisão 49: também
//      usada pela prévia de N0 → Parâmetros → Site MorfoFinP, como no Kit)
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
//
// RECONFERIDO em 11/09/2026 contra o Projeto Modelo atual (7855 linhas — os
// números "Kit LNNN" abaixo são do arquivo de quando este porte foi feito,
// 09/09/2026, e podem não bater mais com a linha exata de hoje; achar por
// nome de função, não pelo número). `ForgotPasswordSheet`, `AceitarConviteSheet`,
// `LoginView`/`LoginViewKit`, `planFeaturesAuto`, `PlanoCard`, `ContratarPacoteFlow`
// comparados função a função: sem divergência nova — as únicas diferenças
// continuam sendo as ADAPTAÇÕES já marcadas neste arquivo (login normalizado,
// cadastro de pessoa física em vez de empresa, carimbo de build). O recurso de convite por LINK real do Projeto Modelo (`gerarLinkPreCadastro`,
// item 220 de lá) não tem equivalente aqui por desenho — o MorfoFinP cadastra
// o pré-cadastro direto pelo N0 (`NovoClienteSheet`, `DevApp.tsx`), sem
// backend nem roteamento por URL (Decisão 6, Backlog #028); `AceitarConviteSheet`
// fica como no Kit, mas nunca recebe convite de verdade (já documentado acima,
// "Fica como no-op declarado").

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
/* ADAPTAÇÃO (11/09/2026, Decisão 67). No Kit este passo é o cadastro FISCAL
   de uma empresa (razão social, endereço fiscal, cidade) porque lá o cliente
   é uma empresa com equipe. Aqui o cliente é UMA pessoa e o ambiente é dela:
   o passo pede os dados do próprio usuário — nome, login, senha, e-mail e
   telefone —, e é esse usuário que fica como o único acesso do ambiente.
   `companyName` continua no payload porque é o NOME DO AMBIENTE no resto do
   app (barra do topo, painel N0); recebe o nome da pessoa. */
export interface SelfRegisterPayload { companyName: string; ownerName: string; phone: string; hasWhatsapp: boolean; email: string; login: string; senha: string; planoContratado: KitPlan | undefined; paymentMethod: string | null; primeiraCobrancaPaga: boolean; autoLiberado: boolean }
function ContratarPacoteFlow({ plans, onClose, onFinish }: { plans: KitPlan[]; onClose: () => void; onFinish: (payload: SelfRegisterPayload) => void }) {
  const [step, setStep] = useState(1)
  const [planId, setPlanId] = useState(plans.find(p => p.destaque)?.id || plans[0]?.id || '')
  const [ownerName, setOwnerName] = useState(''); const [phone, setPhone] = useState(''); const [hasWhatsapp, setHasWhatsapp] = useState(true); const [email, setEmail] = useState(''); const [login, setLogin] = useState(''); const [senha, setSenha] = useState('')
  const [method, setMethod] = useState<'pix' | 'cartao_credito' | 'boleto'>('pix'); const [processando, setProcessando] = useState(false)
  const plano = plans.find(p => p.id === planId)
  const phoneOk = validaTelefone(phone)
  const dadosCompletos = ownerName.trim() && login.trim() && senha.trim() && phoneOk && validaEmailEnvio(email)

  const confirmarPagamento = () => {
    setProcessando(true)
    setTimeout(() => {
      const autoLiberado = method !== 'boleto'
      onFinish({ companyName: ownerName.trim(), ownerName, phone, hasWhatsapp, email: email.trim(), login, senha, planoContratado: plano, paymentMethod: method, primeiraCobrancaPaga: autoLiberado, autoLiberado })
      setProcessando(false); setStep(4)
    }, 900)
  }
  const confirmarGratuito = () => {
    setProcessando(true)
    setTimeout(() => {
      onFinish({ companyName: ownerName.trim(), ownerName, phone, hasWhatsapp, email: email.trim(), login, senha, planoContratado: plano, paymentMethod: null, primeiraCobrancaPaga: false, autoLiberado: true })
      setProcessando(false); setStep(4)
    }, 500)
  }

  return <Sheet title={step === 1 ? 'Escolha seu plano' : step === 2 ? 'Seus dados' : step === 3 ? 'Pagamento' : 'Tudo certo!'} onClose={onClose} resetScrollKey={step}>
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
      <Field label="Seu nome"><input style={inputStyle} value={ownerName} onChange={e => setOwnerName(e.target.value)} /></Field>
      <PhoneComWhats phone={phone} setPhone={setPhone} hasWhatsapp={hasWhatsapp} setHasWhatsapp={setHasWhatsapp} />
      <FieldError show={phone.trim() && !phoneOk} text="Telefone inválido (use DDD + número)" />
      <Field label="E-mail"><input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" /></Field>
      <FieldError show={email.trim() && !validaEmailEnvio(email)} text="E-mail inválido" />
      <SectionLabel>Acesso</SectionLabel>
      <Field label="Escolha um login"><input style={inputStyle} value={login} onChange={e => setLogin(e.target.value)} /></Field>
      <Field label="Escolha uma senha"><input style={inputStyle} type="password" value={senha} onChange={e => setSenha(e.target.value)} /></Field>
      <p style={{ fontSize: 12, color: TXT3, lineHeight: 1.5, margin: '2px 0 12px' }}>
        É com esse login e senha que você entra no app. O ambiente é individual: só este acesso existe.
      </p>
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
  /* Nada no cartão de login é mais condicionado a "já existe acesso cadastrado"
     (11/09/2026): contratação e atalhos de teste aparecem sempre, como no Kit.
     A marca `demo: true` do usuário de demonstração continua existindo no dado
     (é ela que distingue o acesso da massa do Kit de um acesso de verdade), só
     não decide mais o que a tela mostra. */
  const sc = platform.siteConfig || {}
  const gradienteSite = sc.cor1 && sc.cor2 ? `linear-gradient(160deg, ${sc.cor1}, ${sc.cor2})` : `linear-gradient(160deg, ${CORAL}, ${PURPLE} 40%, ${PURPLE_DEEP})`
  const cartaoLogin = <div style={{ background: BRANCO, borderRadius: 18, padding: 20 }}>
    <Field label="Login"><input style={inputStyle} value={login} onChange={e => setLogin(e.target.value)} onKeyDown={onEnterKey} placeholder="seu login" /></Field>
    <Field label="Senha"><input style={inputStyle} type="password" value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={onEnterKey} placeholder="sua senha" /></Field>
    <button onClick={() => setForgotOpen(true)} style={{ ...linkBtnSmall, display: 'block', color: PURPLE, fontSize: 12, fontWeight: 700, padding: 0, marginBottom: 14 }}>Esqueci minha senha</button>
    {error && <div style={{ fontSize: 12.5, color: RED, marginBottom: 10, fontWeight: 600 }}>{error}</div>}
    <button style={{ ...primaryBtn, width: '100%', marginBottom: 8 }} onClick={submit}><KeyRound size={16} /> Entrar</button>
    {/* "Contratar um plano" — SEMPRE visível, como no Kit (11/09/2026, pedido do
        Rafael: "sim quero de volte, pois uma coisa não tem relação com a outra,
        posso querer contratar com outro acesso, nunca deveria ter deduzido
        nada"). A build 036 (Decisão 67) escondia este botão a partir do 1º
        acesso cadastrado, por dedução de que "ambiente individual = um plano
        só"; contratar de novo com outro acesso é caso de uso legítimo. */}
    <button style={{ ...primaryBtn, width: '100%', marginBottom: 14, background: CORAL }} onClick={() => setSelfOpen(true)}><UserPlus size={16} /> Contratar um plano</button>
    {/* ACESSO RÁPIDO PARA TESTE — SEMPRE visível, como no Kit (11/09/2026,
        pedido do Rafael: "pq não tem mais o botão de acesso pra teste? os de
        acesso sem login do n0 e do n1? quero que volte"). A build 036 escondia
        esta seção junto com o botão de contratação assim que existisse um acesso
        de verdade, e o botão de contratação junto; os dois voltaram a ser fixos.
        CONSEQUÊNCIA, registrada de propósito: estes botões entram SEM SENHA, e o
        movimento vive no aparelho (não dentro do usuário), então quem abrir o
        app aqui entra e vê tudo mesmo sem saber a senha. É o preço de ter o
        atalho sempre à mão, e é reversível a qualquer momento. */}
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

const CARREGANDO = Symbol('carregando')

export default function LoginView() {
  const config = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO)
  const planosDexie = usePlanos()
  const areaWeb = useSimulacaoResolucao() === 'web'
  const platformN0Persistida = usePlatformN0()

  // Aguardando a 1ª leitura do Dexie — `config === undefined` NÃO entra aqui
  // (é o caso real de banco sem credencial nenhuma); só o sentinela distingue
  // "carregando" de "vazio de verdade" (bug real da Etapa 8, ver histórico).
  if (config === CARREGANDO) return null

  // --- platform.devUsers: lista REAL de administradores Morfo (N0),
  // `platformN0.devUsers` (10/09/2026, Decisão 54 Parte B — login virou
  // multiusuário "pra perfis valerem de verdade"). Aqui é só a VISÃO usada
  // pelo `LoginViewKit`/`submit()` (nunca grava nada) — migra a credencial
  // única antiga (`credencialEmailN0`/`credencialSenhaN0`) se existir, ou cai
  // no admin padrão do Kit (G55) se a lista real ainda estiver vazia. A
  // migração de verdade (persistida) só acontece quando alguém efetivamente
  // loga, em `authN0.ts` (`garantirDevUsersMigrados`).
  const devUsers: KitUser[] = devUsersComMigracao(platformN0Persistida.devUsers, config, N0_PADRAO_KIT)
    .map(u => ({ id: u.id, name: u.name, login: u.login, senha: u.senha, email: u.email, status: u.status }))
  // --- platform.tenants: a empresa cliente (N1) é o próprio usuário do app
  // (1 tenant, `t0` — mesmo id usado por DevApp → "Entrar como este tenant").
  // Lista REAL de usuários, `t0.users` (Decisão 54 Parte B), com a mesma
  // migração da credencial única antiga. Continua vazia até "Contratar um
  // plano" (ou o atalho demo) criar o 1º usuário.
  const t0Persistido = platformN0Persistida.tenants.find(t => t.id === TENANT_N1_ID)
  // `demo` vai junto de propósito: é ele que distingue o usuário de
  // demonstração da massa do Kit de um acesso de verdade (Decisão 67). Hoje
  // nenhuma parte da TELA depende disso — contratação e atalhos são fixos —,
  // mas a marca continua sendo o dado que diz qual acesso é qual.
  const tenantUsers: KitUser[] = tenantUsersComMigracao(t0Persistido?.users, config)
    .map(u => ({ id: u.id, name: u.name, login: u.login, senha: u.senha, email: u.email, status: u.status, demo: u.demo }))
  // --- platform.plans: catálogo real do N0 (Gerenciar Planos, Dexie), na
  // forma que o Kit lê (`name`/`monthlyValue`/`features`).
  const plans: KitPlan[] = planosDexie.map(p => ({ id: String(p.id), name: p.nome, monthlyValue: p.valorMensal, destaque: p.destaque, features: recursosAutomaticos(p) }))
  const platform: KitPlatform = {
    devUsers,
    tenants: [{ id: 't0', companyName: NOME_PRODUTO, users: tenantUsers }],
    plans,
    // siteConfig / sitePages / siteMenu / branding: editáveis em N0 →
    // Parâmetros → Site MorfoFinP (Decisão 49), com os valores padrão do Kit
    // (MorfoMod, G55) quando ainda não configurados — ver `siteKit.tsx`.
    ...montarPlatformSite(config),
  }

  // AceitarConviteSheet só chama setPlatform quando existe convite pendente
  // (`status: "pendente_aprovacao"` com token) — o MorfoFinP não gera convite
  // (app de 1 usuário, sem backend), então a folha sempre cai no EmptyState
  // do Kit e este setter nunca é acionado. Fica como no-op declarado.
  const setPlatform: Dispatch<SetStateAction<KitPlatform>> = () => {}

  // onLogin do Kit → sessões do produto (persistidas no Dexie; `AppRoot.tsx`
  // troca de tela sozinho via useLiveQuery). 'dev' = N0, 'tenant' = N1.
  // `LoginViewKit`'s `submit()` já resolveu QUAL usuário bateu (`userId`) —
  // os botões de atalho demo chamam sem `userId`, e `entrarComoDevUser`/
  // `entrarComoTenantUser` caem no 1º usuário da lista (migrando a
  // credencial antiga ou criando o admin padrão do Kit se a lista ainda
  // estiver vazia — mesmo efeito que `entrarDemoN0()`/`entrarDemo()` tinham).
  const onLogin = (level: LoginLevel, _tenantId: string | null, userId?: string) => {
    if (level === 'dev') void entrarComoDevUser(userId)
    else void entrarComoTenantUser(userId)
  }
  /* "Contratar um plano" cria o ÚNICO usuário do ambiente com os dados que a
     pessoa acabou de preencher, guarda o plano contratado (Minha Assinatura)
     e nomeia o ambiente com o nome dela. Isso encerra a pendência da Decisão
     48 ("os dados do passo 2 não têm onde ficar"): agora todos eles moram no
     usuário, e ele mesmo os edita depois em Configuração → Meus Dados. */
  const onSelfRegister = (payload: SelfRegisterPayload) => {
    void (async () => {
      const planoId = payload.planoContratado ? Number(payload.planoContratado.id) : NaN
      if (!Number.isNaN(planoId)) await salvarPlanoId(planoId)
      await criarAcesso(payload.login, payload.senha, {
        nome: payload.ownerName,
        email: payload.email,
        telefone: payload.phone,
        nomeAmbiente: payload.companyName,
      })
    })()
  }

  // Raiz: no Kit, `App()` (L7460-L7461) envolve o Login numa coluna com
  // `maxWidth: var(--mloc-maxw)` (430px mobile / 100% web) e a fonte do
  // esqueleto. Aqui a coluna já é o `#root` do produto (430px desde a
  // Decisão 50 — o mesmo valor do Kit), então só a variável e a fonte são
  // declaradas.
  return <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative', fontFamily: "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, sans-serif", ['--mloc-maxw' as string]: areaWeb ? '100%' : '430px' } as CSSProperties}>
    <LoginViewKit platform={platform} setPlatform={setPlatform} areaWeb={areaWeb} onLogin={onLogin} onSelfRegister={onSelfRegister} />
  </div>
}
