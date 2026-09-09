import { useState, type FormEvent } from 'react'
import { Building } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { criarAcesso, entrar, entrarDemo, redefinirAcesso } from './auth'
import { criarAcessoN0, entrarN0, entrarDemoN0, redefinirAcessoN0 } from './authN0'
import { usePlanos } from './planos'
import { abrirSuporteWhatsApp } from './suporte'
import { useMarcaSite } from '../configuracaoIcones'
import { CARIMBO_BUILD } from '../buildInfo'
import morfoLogoUrl from '../assets/morfo-padrao-branco.svg'
import produtoLogoUrl from '../assets/morfofinp-padrao-branco.svg'

// Site institucional deslogado do MorfoFinP (08/09/2026, Roteiro de
// Parametrização Morfo, Etapa 4/G22-G25) — expande o que a Etapa 8
// (05/09/2026) tinha deixado como uma tela de login isolada, com "Ver
// planos" só num pop-up. Rafael pediu (levantamento desta rodada) pra já
// construir a aparência completa do padrão oficial, mesmo sem backend:
// cabeçalho fixo com navegação entre páginas (Entrar / Planos / Perguntas
// frequentes), cada uma como página de verdade — não mais um modal em cima
// do formulário — e um vínculo de volta pro ecossistema Morfo (G22).
//
// O que NÃO foi replicado do Kit de Estrutura Mínima Morfo (arquivo
// "esqueletomorfo.jsx", ~4200 linhas): o painel de configuração do N0 pra
// editar/reordenar páginas do site, upload de logo própria, tema
// claro/escuro/automático independente e o sistema de composição de 2 logos
// (Morfo + Produto) com posicionamento configurável — tudo isso é
// parametrização de ADMINISTRADOR, só faz sentido de verdade com o backend
// (Backlog #028) gerenciando um tenant real. O que importa pro usuário
// visitante (estrutura em páginas, cabeçalho, link de volta, planos, FAQ)
// está aqui. O restante fica para quando o backend entrar em pauta.
const CARREGANDO = Symbol('carregando')

// Correção de fidelidade visual ao Roteiro de Parametrização Morfo (08/09/2026,
// achado real do Rafael: "a tela de login está totalmente fora do padrão do
// roteiro, nem cor, nem layout, nada"). O Bloco 1 (acima) tinha registrado
// "cor de marca mantida a do MorfoFinP (--azul) — G24 pede fidelidade de
// layout/estrutura ao MorfoLoc, não a paleta" — essa leitura estava ERRADA: o
// próprio roteiro (item "Identidade", seção 2c) é explícito que "o padrão a
// aplicar é visual (cor, tipografia, layout, gradiente)" pro site
// deslogado/Login, INDEPENDENTE do tema do ambiente logado (Situação,
// Lançamentos etc., que continua escuro/próprio do produto — mesmo princípio
// do MorfoVida real: "tema do site/login independente do tema do app
// logado"). G24 (fidelidade ao MorfoLoc) é sobre o cabeçalho/painel N0
// especificamente, não uma isenção geral de cor pro resto da área deslogada.
// Os valores abaixo são os PADRÃO do Kit (`Kit de Estrutura Mínima (Morfo) -
// esqueleto-morfo.jsx`, função `siteGradienteDe`/constantes de cor no topo do
// arquivo) — MorfoFinP ainda não definiu `siteConfig.cor1/cor2` próprios,
// então usa o gradiente oficial da Morfo tal como está no Kit, sem inventar
// variação.
const GRADIENTE_SITE = 'linear-gradient(160deg, #E8825A, #5E2E97 40%, #6214A8)'
const COR_ROXA = '#5E2E97'
const COR_VERMELHA = '#D2483B'
const COR_INK = '#1C1B22'
const COR_TXT2 = '#6B6558'
const COR_TXT3 = '#8B8579'
const COR_LINHA = '#E7E3DC'

// Proporção real dos 2 arquivos oficiais (medida no próprio SVG, nunca
// esticar — mesma regra já aplicada nos documentos do Anexo A, ver Lições
// Aprendidas). Morfo usa a variante "Padrão" (empilhada: triângulo sobre o
// nome) — a mesma que o comentário original do Kit documenta como a certa
// pra Login; o produto usa a variante "Padrão" dele (lockup largo, o mesmo
// já usado na capa/cabeçalho dos documentos do Anexo A).
const MORFO_RATIO = 103.227255 / 97.234443 // ≈ 1.0616
const PRODUTO_RATIO = 777.767 / 126.317 // ≈ 6.1576

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#fff',
  border: `1px solid ${COR_LINHA}`,
  borderRadius: 10,
  padding: '10px 12px',
  color: COR_INK,
  fontSize: 14,
}
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12.5,
  color: COR_TXT2,
  margin: '12px 0 4px',
  fontWeight: 600,
}
const cardBrancoStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 16,
  padding: 16,
}

// 'entrarN0' (08/09/2026, G59 — "critério de aceite binário do encaixe"):
// login do NÍVEL N0, separado do login de tenant acima ("Login separa os
// níveis" — G59 regra 1).
//
// CORREÇÃO REAL (08/09/2026, mesma rodada do build 005→006): a versão
// anterior deixava esta página FORA de `NAV_PAGINAS` de propósito — um link
// discreto no rodapé, visualmente secundário, pra não competir com
// Entrar/Planos/FAQ. Rafael pediu explicitamente pra reverter essa
// separação: "deixe o botão de acesso do adm junto com o do n1, igual" —
// ou seja, no MESMO grupo/linha do botão de acesso do tenant (N1, a aba
// "Entrar"), com o MESMO estilo visual, não mais um tratamento diferente.
// Corrigido: o botão de acesso administrador virou uma 4ª aba renderizada
// no mesmo cabeçalho fixo (`CabecalhoSite`), lado a lado com Entrar/Planos/
// FAQ, com o styling idêntico (mesma pílula, mesmo tamanho, mesma regra de
// destaque quando ativa). Continua fora do array `NAV_PAGINAS` só por
// motivo técnico (esse array é iterado por `.map()`; o botão de admin é
// renderizado logo em seguida, à parte, dentro do mesmo `<div>` de
// navegação) — nunca mais por intenção de parecer diferente.
type PaginaSite = 'entrar' | 'planos' | 'faq' | 'entrarN0'

const NAV_PAGINAS: { id: PaginaSite; titulo: string }[] = [
  { id: 'entrar', titulo: 'Entrar' },
  { id: 'planos', titulo: 'Planos' },
  { id: 'faq', titulo: 'Perguntas frequentes' },
]

// Cabeçalho do site (G24: fidelidade estrutural ao padrão MorfoLoc — logo do
// produto + vínculo de volta pro ecossistema Morfo + navegação por páginas).
// Composição de 2 logos (Morfo + MorfoFinP, decisão 34 do Kit) — sem isso o
// vínculo de volta do G22 fica só um texto, não a marca em si.
function CabecalhoSite({
  pagina,
  onNavegar,
  selo,
}: {
  pagina: PaginaSite
  onNavegar: (p: PaginaSite) => void
  // "Marca do site institucional" (08/09/2026, G59 — item aprovado pro N0,
  // editável em DevApp → Parâmetros → Marca). Fallback pro texto fixo de
  // sempre quando o N0 ainda não configurou nada.
  selo: string
}) {
  return (
    <div style={{ flexShrink: 0 }}>
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '20px 20px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <img src={morfoLogoUrl} alt="Morfo" style={{ height: 40, width: 40 * MORFO_RATIO, display: 'block', marginBottom: 8 }} />
        <img
          src={produtoLogoUrl}
          alt="MorfoFinP"
          style={{ height: 24, width: 24 * PRODUTO_RATIO, display: 'block', marginBottom: 8 }}
        />
        {/* Vínculo de volta pro site institucional da Morfo (G22) — placeholder: o
            subdomínio real do ecossistema Morfo ainda não existe (pendência já
            registrada em Decisões.md), então este não é um link clicável de verdade
            ainda, só a indicação visual de que o produto faz parte do ecossistema. */}
        <span
          title="Link real assim que o site institucional da Morfo publicar este produto"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.5)',
            borderRadius: 999,
            padding: '2px 9px',
          }}
        >
          {selo}
        </span>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>Controle financeiro pessoal.</p>
      </div>
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', justifyContent: 'center', gap: 4, padding: '0 20px 14px', flexWrap: 'wrap' }}>
        {NAV_PAGINAS.map((pg) => (
          <button
            key={pg.id}
            type="button"
            onClick={() => onNavegar(pg.id)}
            style={{
              background: pagina === pg.id ? '#fff' : 'transparent',
              color: pagina === pg.id ? COR_ROXA : '#fff',
              border: pagina === pg.id ? 'none' : '1px solid rgba(255,255,255,0.55)',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {pg.titulo}
          </button>
        ))}
        {/* Acesso administrador Morfo: saiu daqui em 08/09/2026 (pedido do
            Rafael, mesmo dia) — agora vive junto do botão "Entrar como
            empresa-tenant (demo)" em `PaginaEntrar`, mesmo tamanho/cor,
            os dois emparelhados na tela de Login (não mais uma aba de
            navegação separada aqui no cabeçalho). */}
      </div>
    </div>
  )
}

function RodapeSite({
  whatsappNumero,
  whatsappMensagemPadrao,
}: {
  whatsappNumero: string | undefined
  whatsappMensagemPadrao: string | undefined
}) {
  return (
    <div style={{ flexShrink: 0, textAlign: 'center', padding: '16px 20px 22px' }}>
      <button
        type="button"
        onClick={() => abrirSuporteWhatsApp(whatsappMensagemPadrao ?? 'Oi! Tenho uma dúvida antes de usar o MorfoFinP.', whatsappNumero)}
        style={{ background: 'none', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', padding: 0, marginBottom: 10 }}
      >
        Precisa de ajuda? Fale com o suporte
      </button>
      {/* Carimbo {versão}.{build} no rodapé do Login — regra G52, antes ausente
          nesta tela (achado na mesma auditoria de fidelidade de 08/09/2026). */}
      <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>MorfoFinP · Desenvolvido por Morfo</p>
      <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'rgba(255,255,255,0.45)' }}>{CARIMBO_BUILD}</p>
      {/* Acesso administrador Morfo (08/09/2026): morou aqui até a rodada do
          build 005→006 (link/botão à parte, ver histórico em `PaginaSite`
          acima) — agora é uma aba igual às do tenant, no cabeçalho
          (`CabecalhoSite`). "Voltar ao site" também some daqui: voltar é só
          clicar em "Entrar" no mesmo cabeçalho, mesma mecânica de trocar de
          página que já existe pra Entrar/Planos/FAQ, sem precisar de um
          botão exclusivo pra isso. */}
    </div>
  )
}

function PaginaEntrar({ onNavegar }: { onNavegar: (p: PaginaSite) => void }) {
  const config = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO)
  const temCredencial = config !== CARREGANDO && Boolean(config?.credencialEmail && config?.credencialSenha)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)
  const [processandoDemo, setProcessandoDemo] = useState(false)
  const [mostrarRedefinir, setMostrarRedefinir] = useState(false)

  // Acesso demo/rápido (G44 regra 3 / G60, ver `entrarDemo()` em `auth.ts`) —
  // nunca toca em `email`/`senha`/`confirmarSenha` do formulário, é um
  // caminho paralelo, não um preenchimento automático dele.
  async function entrarSemSenha() {
    setProcessandoDemo(true)
    try {
      await entrarDemo()
    } finally {
      setProcessandoDemo(false)
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!email.trim()) {
      setErro('Preencha o e-mail.')
      return
    }
    if (!email.includes('@')) {
      setErro('Digite um e-mail válido (com @).')
      return
    }
    if (senha.length < 4) {
      setErro('A senha precisa ter pelo menos 4 caracteres.')
      return
    }

    setProcessando(true)
    try {
      if (!temCredencial) {
        if (senha !== confirmarSenha) {
          setErro('As duas senhas precisam ser iguais.')
          return
        }
        await criarAcesso(email, senha)
      } else {
        const ok = await entrar(email, senha)
        if (!ok) {
          setErro('E-mail ou senha incorretos.')
          return
        }
      }
      // Sucesso: `sessaoAtiva` já foi gravado — `AppRoot.tsx` troca de tela
      // sozinho (useLiveQuery reativo), nada mais a fazer aqui.
    } finally {
      setProcessando(false)
    }
  }

  async function confirmarRedefinir() {
    setProcessando(true)
    await redefinirAcesso()
    setMostrarRedefinir(false)
    setEmail('')
    setSenha('')
    setConfirmarSenha('')
    setErro(null)
    setProcessando(false)
  }

  // Aguardando a 1ª leitura do Dexie — evita mostrar "Criar acesso" por um
  // instante antes de saber se já existe credencial (flash de tela errada
  // toda vez que o Rafael abre o app já logado). `config === undefined`
  // NÃO entra aqui (é um caso real e permanente: banco sem credencial
  // nenhuma) — só o sentinela distingue "carregando" de "vazio de verdade".
  if (config === CARREGANDO) return null

  return (
    <div style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
      <form onSubmit={salvar} style={cardBrancoStyle}>
        <h2 style={{ marginTop: 0, marginBottom: 4, color: COR_INK, fontSize: 16 }}>
          {temCredencial ? 'Entrar' : 'Criar acesso'}
        </h2>

        <label htmlFor="login-email" style={labelStyle}>
          E-mail
        </label>
        <input
          id="login-email"
          // `type="text"`, não `"email"` — de propósito (bug real encontrado na
          // Etapa 8): `type="email"` faz o NAVEGADOR validar o formato no
          // submit, mesmo sem `required`, e bloqueia `onSubmit` em silêncio
          // quando o texto não tem "@". A validação de formato é só a nossa,
          // em `salvar()` acima, sempre com mensagem visível.
          type="text"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ ...inputStyle, borderColor: erro && (!email.trim() || !email.includes('@')) ? COR_VERMELHA : COR_LINHA }}
        />

        <label htmlFor="login-senha" style={labelStyle}>
          Senha
        </label>
        <input
          id="login-senha"
          type="password"
          autoComplete={temCredencial ? 'current-password' : 'new-password'}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{ ...inputStyle, borderColor: erro && senha.length < 4 ? COR_VERMELHA : COR_LINHA }}
        />

        {!temCredencial && (
          <>
            <label htmlFor="login-confirmar-senha" style={labelStyle}>
              Confirmar senha
            </label>
            <input
              id="login-confirmar-senha"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              style={{ ...inputStyle, borderColor: erro && senha !== confirmarSenha ? COR_VERMELHA : COR_LINHA }}
            />
          </>
        )}

        {erro && <p style={{ color: COR_VERMELHA, fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>{erro}</p>}

        <button
          type="submit"
          disabled={processando}
          style={{
            width: '100%',
            marginTop: 16,
            background: COR_ROXA,
            border: 'none',
            borderRadius: 10,
            padding: 12,
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {processando ? 'Aguarde…' : temCredencial ? 'Entrar' : 'Criar acesso e entrar'}
        </button>

        {!temCredencial && (
          <p style={{ color: COR_TXT3, fontSize: 11.5, marginTop: 10, marginBottom: 0 }}>
            1ª vez usando esta versão do app — escolha um e-mail e senha pra você mesmo. Sem
            conexão com nenhuma conta externa (Google, etc.) e sem backend real ainda (Backlog
            #028) — é só a entrada oficial do app a partir de agora.
          </p>
        )}
      </form>

      {/* "ACESSO RÁPIDO PARA TESTE" (G60) — porte EXATO do Kit (fonte
          L7246-7250): divisor de texto + 1 atalho de demo, nunca um botão
          "de resolução" (isso agora é o par de botões flutuantes 📱/🖥️/🕐,
          `FerramentasTesteFlutuantes`, no componente raiz `AppRoot.tsx`).
          Retirar antes de publicar (Backlog #030). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.35)' }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 700 }}>
          ACESSO RÁPIDO PARA TESTE
        </span>
        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.35)' }} />
      </div>
      <button
        type="button"
        disabled={processandoDemo}
        onClick={entrarSemSenha}
        style={{
          display: 'block',
          width: '100%',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: 10,
          padding: 11,
          color: '#fff',
          fontWeight: 600,
          fontSize: 13.5,
          cursor: 'pointer',
        }}
      >
        {processandoDemo ? 'Aguarde…' : 'Entrar como empresa-tenant (demo)'}
      </button>
      {/* "Aceitar convite de usuário (demo)" (3º atalho do Kit, só Modelo
          Completo): NÃO PORTADO — não se aplica. MorfoFinP não tem convite
          de usuário por link (app de uso pessoal, 1 pessoa só — ver Decisão
          20/Etapa 8, "sem convite de equipe"); fabricar um botão pra um
          fluxo que não existe seria pior que omiti-lo. Exceção registrada em
          Decisões.md (Método item 8). */}
      {/* Acesso administrador Morfo (08/09/2026, pedido do Rafael, mesmo
          dia): logo abaixo do botão de tenant demo, mesmo tamanho/cor —
          os dois emparelhados na mesma tela, não mais uma aba separada no
          cabeçalho do site. */}
      <button
        type="button"
        onClick={() => onNavegar('entrarN0')}
        style={{
          display: 'block',
          width: '100%',
          marginTop: 10,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.35)',
          borderRadius: 10,
          padding: 11,
          color: '#fff',
          fontWeight: 600,
          fontSize: 13.5,
          cursor: 'pointer',
        }}
      >
        Acesso administrador Morfo
      </button>

      {temCredencial && (
        <button
          type="button"
          onClick={() => setMostrarRedefinir(true)}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 14,
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 12.5,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Esqueceu a senha?
        </button>
      )}

      {mostrarRedefinir && (
        <div
          onClick={() => setMostrarRedefinir(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardBrancoStyle, width: '100%', maxWidth: 420 }}>
            <h2 style={{ marginTop: 0, color: COR_INK, fontSize: 16 }}>Redefinir acesso</h2>
            <p style={{ color: COR_TXT2, fontSize: 13.5 }}>
              Sem backend, não existe recuperação de senha por e-mail — a única opção é cadastrar
              um e-mail/senha novo agora. <strong>Seus lançamentos, categorias e contas não são
              afetados</strong> — só o e-mail/senha de entrada são apagados.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                style={{ flex: 1, background: 'none', border: `1px solid ${COR_LINHA}`, borderRadius: 10, padding: 12, color: COR_INK, cursor: 'pointer', fontSize: 14 }}
                onClick={() => setMostrarRedefinir(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{ flex: 1, background: COR_VERMELHA, border: `1px solid ${COR_VERMELHA}`, borderRadius: 10, padding: 12, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                disabled={processando}
                onClick={confirmarRedefinir}
              >
                {processando ? 'Aguarde…' : 'Redefinir e cadastrar de novo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Login do N0 (08/09/2026, G59, regra 1: "login separa os níveis" —
// administrador Morfo entra direto no painel N0 do Kit, com nada do
// aplicativo de negócio). Mirror deliberado de `PaginaEntrar` acima (mesmo
// fluxo criar/entrar/redefinir, mesma validação honesta de `type="text"` +
// `inputMode="email"`, mesmo motivo — `type="email"` bloqueia submit em
// silêncio), mas em CREDENCIAL SEPARADA (`src/kit/authN0.ts`) e com um
// campo a mais (Nome) pra alimentar o registro de "Usuários Morfo" (ver
// `UsuarioN0` em `db.ts`). Tema visualmente distinto (roxo escuro, cor do
// painel N0) — sinaliza que esta não é a entrada normal do tenant.
const N0_BG = '#201E28'
const N0_ACCENT = '#8B7CF6'

function PaginaEntrarN0() {
  const config = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO)
  const temCredencial = config !== CARREGANDO && Boolean(config?.credencialEmailN0 && config?.credencialSenhaN0)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)
  const [processandoDemo, setProcessandoDemo] = useState(false)
  const [mostrarRedefinir, setMostrarRedefinir] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!email.trim()) {
      setErro('Preencha o e-mail.')
      return
    }
    if (!email.includes('@')) {
      setErro('Digite um e-mail válido (com @).')
      return
    }
    if (senha.length < 4) {
      setErro('A senha precisa ter pelo menos 4 caracteres.')
      return
    }

    setProcessando(true)
    try {
      if (!temCredencial) {
        if (senha !== confirmarSenha) {
          setErro('As duas senhas precisam ser iguais.')
          return
        }
        await criarAcessoN0(email, senha, nome)
      } else {
        const ok = await entrarN0(email, senha)
        if (!ok) {
          setErro('E-mail ou senha incorretos.')
          return
        }
      }
      // Sucesso: `sessaoAtivaN0` já foi gravado — `AppRoot.tsx` troca de
      // tela sozinho (useLiveQuery reativo), nada mais a fazer aqui.
    } finally {
      setProcessando(false)
    }
  }

  // Acesso demo/rápido do N0 — ver `entrarDemoN0()` em `authN0.ts` e a nota
  // gêmea em `entrarSemSenha()` de `PaginaEntrar` acima (G44 regra 3).
  async function entrarSemSenhaN0() {
    setProcessandoDemo(true)
    try {
      await entrarDemoN0()
    } finally {
      setProcessandoDemo(false)
    }
  }

  async function confirmarRedefinir() {
    setProcessando(true)
    await redefinirAcessoN0()
    setMostrarRedefinir(false)
    setNome('')
    setEmail('')
    setSenha('')
    setConfirmarSenha('')
    setErro(null)
    setProcessando(false)
  }

  if (config === CARREGANDO) return null

  return (
    <div style={{ width: '100%', maxWidth: 360, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: N0_ACCENT,
            border: `1px solid ${N0_ACCENT}`,
            borderRadius: 999,
            padding: '3px 10px',
          }}
        >
          Painel do administrador Morfo
        </span>
      </div>
      <form
        onSubmit={salvar}
        style={{ background: N0_BG, borderRadius: 16, padding: 16, border: `1px solid ${N0_ACCENT}44` }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 4, color: '#fff', fontSize: 16 }}>
          {temCredencial ? 'Entrar como administrador' : 'Criar acesso de administrador'}
        </h2>
        <p style={{ color: '#9B96A8', fontSize: 11.5, marginTop: 0, marginBottom: 12 }}>
          Este login leva direto ao painel N0 (tenants, financeiro, auditoria, parâmetros) — nunca ao
          aplicativo de negócio.
        </p>

        {!temCredencial && (
          <>
            <label htmlFor="login-n0-nome" style={{ display: 'block', fontSize: 12.5, color: '#9B96A8', margin: '0 0 4px', fontWeight: 600 }}>
              Nome
            </label>
            <input
              id="login-n0-nome"
              type="text"
              autoComplete="name"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={{ width: '100%', background: '#141319', border: `1px solid ${N0_ACCENT}44`, borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 14 }}
            />
          </>
        )}

        <label htmlFor="login-n0-email" style={{ display: 'block', fontSize: 12.5, color: '#9B96A8', margin: '12px 0 4px', fontWeight: 600 }}>
          E-mail
        </label>
        <input
          id="login-n0-email"
          type="text"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', background: '#141319', border: `1px solid ${erro && (!email.trim() || !email.includes('@')) ? '#F5615C' : N0_ACCENT + '44'}`, borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 14 }}
        />

        <label htmlFor="login-n0-senha" style={{ display: 'block', fontSize: 12.5, color: '#9B96A8', margin: '12px 0 4px', fontWeight: 600 }}>
          Senha
        </label>
        <input
          id="login-n0-senha"
          type="password"
          autoComplete={temCredencial ? 'current-password' : 'new-password'}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          style={{ width: '100%', background: '#141319', border: `1px solid ${erro && senha.length < 4 ? '#F5615C' : N0_ACCENT + '44'}`, borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 14 }}
        />

        {!temCredencial && (
          <>
            <label htmlFor="login-n0-confirmar-senha" style={{ display: 'block', fontSize: 12.5, color: '#9B96A8', margin: '12px 0 4px', fontWeight: 600 }}>
              Confirmar senha
            </label>
            <input
              id="login-n0-confirmar-senha"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              style={{ width: '100%', background: '#141319', border: `1px solid ${erro && senha !== confirmarSenha ? '#F5615C' : N0_ACCENT + '44'}`, borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 14 }}
            />
          </>
        )}

        {erro && <p style={{ color: '#F5615C', fontSize: 12.5, marginTop: 8, fontWeight: 600 }}>{erro}</p>}

        <button
          type="submit"
          disabled={processando}
          style={{ width: '100%', marginTop: 16, background: N0_ACCENT, border: 'none', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          {processando ? 'Aguarde…' : temCredencial ? 'Entrar' : 'Criar acesso e entrar'}
        </button>
      </form>

      {/* "ACESSO RÁPIDO PARA TESTE" (G60) — mesmo padrão exato da página N1
          (ver `PaginaEntrar` acima), atalho próprio do N0. Retirar antes de
          publicar (Backlog #030). */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px' }}>
        <div style={{ flex: 1, height: 1, background: `${N0_ACCENT}44` }} />
        <span style={{ fontSize: 11, color: '#9B96A8', fontWeight: 700 }}>ACESSO RÁPIDO PARA TESTE</span>
        <div style={{ flex: 1, height: 1, background: `${N0_ACCENT}44` }} />
      </div>
      <button
        type="button"
        disabled={processandoDemo}
        onClick={entrarSemSenhaN0}
        style={{
          display: 'block',
          width: '100%',
          background: `${N0_ACCENT}22`,
          border: `1px solid ${N0_ACCENT}`,
          borderRadius: 10,
          padding: 11,
          color: '#fff',
          fontWeight: 600,
          fontSize: 13.5,
          cursor: 'pointer',
        }}
      >
        {processandoDemo ? (
          'Aguarde…'
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Building size={16} />
            Entrar como Admin Morfo (demo)
          </span>
        )}
      </button>

      {temCredencial && (
        <button
          type="button"
          onClick={() => setMostrarRedefinir(true)}
          style={{ display: 'block', width: '100%', marginTop: 14, background: 'none', border: 'none', color: '#fff', fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}
        >
          Esqueceu a senha de administrador?
        </button>
      )}

      {mostrarRedefinir && (
        <div
          onClick={() => setMostrarRedefinir(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', zIndex: 50 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: N0_BG, border: `1px solid ${N0_ACCENT}44`, borderRadius: 16, padding: 16, width: '100%', maxWidth: 420 }}>
            <h2 style={{ marginTop: 0, color: '#fff', fontSize: 16 }}>Redefinir acesso de administrador</h2>
            <p style={{ color: '#9B96A8', fontSize: 13.5 }}>
              Sem backend, não existe recuperação de senha por e-mail — a única opção é cadastrar um
              e-mail/senha novo agora. Isso não afeta a sessão nem os dados de nenhum tenant.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                style={{ flex: 1, background: 'none', border: `1px solid ${N0_ACCENT}44`, borderRadius: 10, padding: 12, color: '#fff', cursor: 'pointer', fontSize: 14 }}
                onClick={() => setMostrarRedefinir(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{ flex: 1, background: '#F5615C', border: '1px solid #F5615C', borderRadius: 10, padding: 12, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
                disabled={processando}
                onClick={confirmarRedefinir}
              >
                {processando ? 'Aguarde…' : 'Redefinir e cadastrar de novo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Página própria de Planos (G25: "diferente do site institucional, o site do
// produto se estrutura em páginas separadas... Planos/Contratação só modelo
// Completo") — antes era um modal em cima do Login, agora é uma página de
// verdade, acessível pelo menu do cabeçalho mesmo sem estar logado.
function PaginaPlanos({ onEscolher }: { onEscolher: () => void }) {
  const planos = usePlanos()
  return (
    <div style={{ width: '100%', maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, textAlign: 'center', color: '#fff' }}>Planos</h2>
      {planos.length === 0 && (
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12.5, textAlign: 'center' }}>
          Nenhum plano cadastrado ainda pelo painel N0.
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {planos.map((p) => (
          <div
            key={p.id}
            style={{
              ...cardBrancoStyle,
              border: `1.5px solid ${p.destaque ? COR_ROXA : COR_LINHA}`,
              // Fundo SÓLIDO, nunca translúcido — este card fica direto sobre o
              // gradiente da página (não sobre outro card escuro como no tema do
              // ambiente logado), então um `rgba(...)` de baixa opacidade deixa o
              // gradiente vazar por baixo e o texto escuro perde contraste (mesma
              // classe de bug já documentada neste arquivo pra fundo translúcido).
              background: p.destaque ? '#F3EDFA' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
              <strong style={{ fontSize: 15, color: COR_INK }}>{p.nome}</strong>
              <span style={{ fontSize: 15, fontWeight: 800, color: COR_ROXA, whiteSpace: 'nowrap' }}>
                {p.valorMensal > 0 ? `R$ ${p.valorMensal.toFixed(2)}/mês` : 'Grátis'}
              </span>
            </div>
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {p.funcionalidades.map((f) => (
                <li key={f} style={{ fontSize: 12.5, color: COR_TXT2 }}>
                  {f}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={onEscolher}
              style={{
                marginTop: 12,
                width: '100%',
                background: p.destaque ? COR_ROXA : 'none',
                color: p.destaque ? '#fff' : COR_ROXA,
                border: `1px solid ${COR_ROXA}`,
                borderRadius: 10,
                padding: 10,
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              Criar acesso com este plano
            </button>
          </div>
        ))}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11.5, marginTop: 12, textAlign: 'center' }}>
        Placeholder: nome, preço e funcionalidades ainda não são reais (depende de definição
        comercial + backend, Backlog #028) — depois de entrar, dá pra trocar de plano em Minha
        Assinatura.
      </p>
    </div>
  )
}

// Perguntas frequentes (G25) — conteúdo escrito a partir do que já está
// decidido/documentado do MorfoFinP (Decisões.md, Estado Atual.md), não
// texto de marketing inventado: a Biblioteca do Produto ainda não tem
// argumentos de venda formais (Comercial/Marketing), então esta página fica
// só com o que é FATO sobre o produto hoje — pendência de conteúdo comercial
// de verdade registrada em Decisões.md (G25/2d: nunca bloqueia, só registra).
const FAQ_ITENS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: 'O que é o MorfoFinP?',
    resposta:
      'Um app de controle financeiro pessoal: resumo do mês, metas por categoria, lançamentos, carteira de contas e planejamento — derivado de uma planilha que já era usada no dia a dia.',
  },
  {
    pergunta: 'Meus dados ficam salvos onde?',
    resposta:
      'Direto no seu navegador/dispositivo (armazenamento local), sem servidor externo por trás ainda. Isso significa que os dados não saem do seu aparelho por conta própria.',
  },
  {
    pergunta: 'Preciso pagar alguma coisa?',
    resposta:
      'Os planos mostrados na página de Planos ainda são um rascunho (placeholder) — o preço e o que cada um inclui de verdade ainda não foram definidos.',
  },
  {
    pergunta: 'Dá pra usar no celular?',
    resposta: 'Sim, o app funciona no navegador do celular ou do computador, sem precisar instalar nada de uma loja de aplicativos.',
  },
]

function PaginaFAQ() {
  return (
    <div style={{ width: '100%', maxWidth: 560, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, textAlign: 'center', color: '#fff' }}>Perguntas frequentes</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FAQ_ITENS.map((item) => (
          <div key={item.pergunta} style={cardBrancoStyle}>
            <strong style={{ fontSize: 13.5, color: COR_INK }}>{item.pergunta}</strong>
            <p style={{ fontSize: 12.5, margin: '6px 0 0', color: COR_TXT2 }}>{item.resposta}</p>
          </div>
        ))}
      </div>
      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11.5, marginTop: 12, textAlign: 'center' }}>
        Placeholder: perguntas escritas a partir do que já está decidido sobre o produto — sem
        conteúdo comercial (Marketing/Vendas) definido ainda na Biblioteca do Produto.
      </p>
    </div>
  )
}

export default function LoginView() {
  const [pagina, setPagina] = useState<PaginaSite>('entrar')
  const { seloEcossistema, whatsappNumero, whatsappMensagemPadrao } = useMarcaSite()

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: GRADIENTE_SITE }}>
      <CabecalhoSite pagina={pagina} onNavegar={setPagina} selo={seloEcossistema ?? 'parte do ecossistema Morfo'} />
      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '24px 20px' }}>
        {pagina === 'entrar' && <PaginaEntrar onNavegar={setPagina} />}
        {pagina === 'planos' && <PaginaPlanos onEscolher={() => setPagina('entrar')} />}
        {pagina === 'faq' && <PaginaFAQ />}
        {pagina === 'entrarN0' && <PaginaEntrarN0 />}
      </div>
      <RodapeSite whatsappNumero={whatsappNumero} whatsappMensagemPadrao={whatsappMensagemPadrao} />
    </div>
  )
}
