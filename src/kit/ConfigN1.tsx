import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import {
  useTemaPreferido, salvarTemaPreferido, type TemaPreferido,
  useMemoriaDescricaoDias, salvarMemoriaDescricaoDias, MEMORIA_DESCRICAO_DIAS_PADRAO,
} from '../configuracaoIcones'
import {
  useTenantN1, atualizarTenantN0, TENANT_N1_ID, loginJaEmUsoGlobalmente,
  lerPlatformN0Persistida, type UsuarioTenant, type TenantKit,
} from './kitPlatform'
import { readImageAsDataUrl, LOGO_MAX_KB } from './kitBase'
import ZonasIdentidade, { identidadeTemLogoENome } from './IdentidadeTenant'

// N1 → engrenagem: as 4 telas de Configurações do Kit que ainda não existiam
// aqui (10/09/2026, Decisão 55 — Parte B): "Meus Dados" (Kit L3848-L3880),
// "Meu Ambiente" (L3886+, `ParametrosAmbienteView`), "Aparência"
// (L4090/L4110 + `TemaPicker` L4758-L4780) e "Ajuda" (L4119-L4149).
//
// Estilo: nativo do app (`.cabecalho-fixo`/`.cartao`/`var(--texto)`), como
// `Contas.tsx`/`UsuariosTenant.tsx` — não o `kitBase` claro. É a mesma
// escolha já registrada na Decisão 54 pra `UsuariosTenant.tsx`: tela do
// ambiente do produto segue o tema do produto.
//
// ADAPTAÇÃO registrada em "Meus Dados": no Kit é o cadastro FISCAL da empresa
// cliente (nome fantasia, razão social, CNPJ, endereço fiscal). O tenant do
// MorfoFinP é uma PESSOA usando um app de finanças pessoais — não há CNPJ nem
// nota fiscal a emitir. A tela virou o cadastro do próprio usuário logado
// (nome, login, e-mail, telefone e TROCA DE SENHA), que é o que "meus dados"
// significa neste produto — e resolve um buraco real: até aqui não existia
// nenhum caminho pro usuário trocar a própria senha depois do login
// multiusuário da Decisão 54 (só um administrador, pela tela de Usuários).

const estiloInput: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 10,
  border: '1px solid var(--borda)', background: 'var(--bg)', color: 'var(--texto)', fontSize: 15, outline: 'none',
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: 'block', marginBottom: 14 }}>
    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--texto-fraco)', marginBottom: 6 }}>{label}</span>
    {children}
  </label>
}

/* Igual ao `Campo`, mas com <div> no lugar de <label>. Um <label> que envolve
   um GRUPO de botões empresta o próprio texto ao primeiro deles como nome
   acessível — na prática, o botão "Logo + nome" passava a se chamar "O que
   mostrar (logo quadrada" pra leitor de tela e pra teste automatizado.
   Achado por teste em 10/09/2026. */
function CampoGrupo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 14 }}>
    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--texto-fraco)', marginBottom: 6 }}>{label}</span>
    {children}
  </div>
}

function Cabecalho({ titulo, aoVoltar }: { titulo: string; aoVoltar: () => void }) {
  return <div className="cabecalho-fixo">
    <button type="button" className="botao-voltar-config" onClick={aoVoltar}>‹ Voltar</button>
    <h1>{titulo}</h1>
  </div>
}

/* Segmentado no estilo NATIVO do app (as abas `.abas-tela` que Categorias e
   Manutenção já usam) — não o `Segmented` do `kitBase`, que é sempre claro.
   Mesma função, mesmo comportamento, respeitando o tema. */
function SegmentadoN1({ valor, onEscolher, opcoes }: {
  valor: string
  onEscolher: (v: string) => void
  opcoes: { v: string; l: string }[]
}) {
  return <div className="abas-tela" role="tablist">
    {opcoes.map((o) => (
      <button key={o.v} type="button" role="tab" aria-selected={valor === o.v}
        className={`aba-tela-item ${valor === o.v ? 'ativa' : ''}`}
        onClick={() => onEscolher(o.v)}>
        {o.l}
      </button>
    ))}
  </div>
}

function Aviso({ msg }: { msg: string }) {
  if (!msg) return null
  return <p style={{ color: 'var(--azul)', fontSize: 13, fontWeight: 700, margin: '0 0 10px' }}>{msg}</p>
}

/* ================= Meus Dados (Kit L3848-L3880, adaptado) ================= */
export function MeusDadosN1({ aoVoltar }: { aoVoltar: () => void }) {
  const tenant = useTenantN1()
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  const eu = tenant?.users.find((u) => u.id === config?.loggedUserIdN1)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Partial<UsuarioTenant> | null>(null)
  const [senha1, setSenha1] = useState('')
  const [senha2, setSenha2] = useState('')
  const atual = { ...(eu || {}), ...(form || {}) }

  function notify(m: string) { setMsg(m); window.setTimeout(() => setMsg(''), 2500) }

  async function salvar() {
    if (!eu) return
    const nome = (atual.name || '').trim()
    const login = (atual.login || '').trim()
    if (!nome) { notify('Informe o nome.'); return }
    if (!login) { notify('Informe o login.'); return }
    const platform = await lerPlatformN0Persistida()
    if (loginJaEmUsoGlobalmente(platform, login, { tenantId: TENANT_N1_ID, userId: eu.id })) { notify('Esse login já está em uso (N0 ou N1).'); return }
    if (senha1 || senha2) {
      if (senha1.length < 4) { notify('A senha nova precisa ter pelo menos 4 caracteres.'); return }
      if (senha1 !== senha2) { notify('As duas senhas não conferem.'); return }
    }
    await atualizarTenantN0(TENANT_N1_ID, (t) => ({
      ...t,
      /* `demo: false`: editar os próprios dados aqui é o que transforma o
         usuário de demonstração (com que o ambiente nasce) no acesso pessoal
         de verdade — e é isso que fecha a porta do atalho "Entrar como
         empresa cliente (demo)" no Login (11/09/2026, Decisão 67). */
      users: t.users.map((u) => (u.id === eu.id ? { ...u, name: nome, login, email: atual.email, phone: atual.phone, senha: senha1 ? senha1 : u.senha, demo: false } : u)),
    }))
    setSenha1(''); setSenha2(''); setForm(null)
    notify(senha1 ? 'Dados e senha atualizados.' : 'Dados atualizados.')
  }

  return <>
    <Cabecalho titulo="Meus Dados" aoVoltar={aoVoltar} />
    <Aviso msg={msg} />
    {!eu ? (
      <div className="cartao"><p style={{ margin: 0, fontSize: 13.5, color: 'var(--texto-fraco)', lineHeight: 1.6 }}>
        Não foi possível identificar o usuário logado nesta sessão. Saia e entre de novo para editar os seus dados.
      </p></div>
    ) : (
      <div className="cartao">
        <Campo label="Nome"><input style={estiloInput} value={atual.name || ''} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></Campo>
        <Campo label="Login (é com ele que você entra)"><input style={estiloInput} value={atual.login || ''} onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))} /></Campo>
        <Campo label="E-mail"><input style={estiloInput} inputMode="email" value={atual.email || ''} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></Campo>
        <Campo label="Telefone"><input style={estiloInput} inputMode="tel" value={atual.phone || ''} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(11) 90000-0000" /></Campo>
        <div style={{ borderTop: '1px solid var(--borda)', margin: '4px 0 14px' }} />
        <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: '0 0 12px', lineHeight: 1.5 }}>
          Trocar a senha: preencha os dois campos abaixo. Deixe em branco pra manter a senha atual.
        </p>
        <Campo label="Senha nova"><input style={estiloInput} type="password" value={senha1} onChange={(e) => setSenha1(e.target.value)} /></Campo>
        <Campo label="Repita a senha nova"><input style={estiloInput} type="password" value={senha2} onChange={(e) => setSenha2(e.target.value)} /></Campo>
        <button type="button" className="primario" style={{ width: '100%' }} onClick={() => void salvar()}>Salvar</button>
      </div>
    )}
  </>
}

/* ================= Meu Ambiente (Kit L3886+, adaptado) ================= */
export function MeuAmbienteN1({ aoVoltar }: { aoVoltar: () => void }) {
  const tenant = useTenantN1()
  const [msg, setMsg] = useState('')
  const [nome, setNome] = useState<string | null>(null)
  function notify(m: string) { setMsg(m); window.setTimeout(() => setMsg(''), 2500) }

  /* Conjunto COMPLETO do Kit (`ParametrosAmbienteView`, L4160-L4235), no
     lugar do upload único de antes — 10/09/2026, pedido do Rafael: "o logo
     não é só carregar ele, tem alinhamento, tamanho, espaçamento etc., tudo
     isso tem no kit ... e que eles efetivamente funcionem, sejam aplicados
     quando preenchidos". Cada campo aqui muda a barra do topo do N1 na hora
     (ver `BarraMarcaN1` em `App.tsx`). */
  const logoQuadrada = tenant?.logoQuadradaUri ?? tenant?.logoUri
  const logoHoriz = tenant?.logoHorizUri
  const temLogo = !!(logoQuadrada || logoHoriz)
  const logoTopo = tenant?.logoTopo ?? (logoHoriz && !logoQuadrada ? 'horizontal' : 'quadrada')
  const logoModo = tenant?.logoModo ?? 'logo_nome'
  const logoPos = tenant?.logoPos ?? 'esquerda'
  /* Composição logo × nome (10/09/2026, pedido do Rafael) — ver os campos em
     `TenantKit` (`kitPlatform.ts`). Só faz sentido quando os DOIS aparecem
     (modo "Logo + nome" com a logo quadrada); nos outros modos há um
     elemento só e a composição não muda nada, por isso os controles ficam
     escondidos ali embaixo. */
  const logoComposicao = tenant?.logoComposicao ?? 'juntos'
  const logoOrdem = tenant?.logoOrdem ?? 'logo_nome'
  const nomePos = tenant?.nomePos ?? 'direita'
  const logoDocs = tenant?.logoDocs ?? logoTopo
  const mostraLogoENome = identidadeTemLogoENome(tenant)

  async function escolherLogo(slot: 'logoQuadradaUri' | 'logoHorizUri') {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*,.svg'
    input.onchange = async () => {
      const f = input.files?.[0]; if (!f) return
      if (f.size / 1024 > LOGO_MAX_KB) { notify('Imagem acima de 3MB.'); return }
      const uri = await readImageAsDataUrl(f)
      /* `logoUri: undefined` junto: o campo único antigo migra pro slot
         quadrado na 1ª troca, como o Kit faz — pra não sobrar dois valores
         disputando a mesma tela. */
      await atualizarTenantN0(TENANT_N1_ID, (t) => ({ ...t, [slot]: uri, ...(slot === 'logoQuadradaUri' ? { logoUri: undefined } : {}) }))
      notify('Logotipo atualizado.')
    }
    input.click()
  }

  const patch = (p: Partial<TenantKit>) => void atualizarTenantN0(TENANT_N1_ID, (t) => ({ ...t, ...p }))

  return <>
    <Cabecalho titulo="Meu Ambiente" aoVoltar={aoVoltar} />
    <Aviso msg={msg} />
    <div className="cartao">
      <Campo label="Nome do ambiente">
        <input style={estiloInput} value={nome ?? tenant?.companyName ?? ''} onChange={(e) => setNome(e.target.value)} />
      </Campo>
      <button type="button" className="primario" style={{ width: '100%', marginBottom: 6 }}
        onClick={async () => { const v = (nome ?? '').trim(); if (!v) { notify('Informe um nome.'); return } await atualizarTenantN0(TENANT_N1_ID, (t) => ({ ...t, companyName: v })); setNome(null); notify('Nome do ambiente atualizado.') }}>
        Salvar nome
      </button>
    </div>

    <div className="cartao">
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Meu logotipo</div>
      <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: '0 0 12px', lineHeight: 1.5 }}>
        Dois arquivos, como no Kit: a <strong>quadrada</strong> (o símbolo da marca) e a <strong>horizontal</strong>
        (a versão deitada, que já traz o nome escrito). Imagem ou SVG, até 3MB cada.
      </p>
      {([
        ['logoQuadradaUri', 'Logo quadrada', 'Símbolo/ícone da sua marca, formato quadrado.', logoQuadrada],
        ['logoHorizUri', 'Logo horizontal', 'Versão deitada, geralmente com o nome escrito na própria logo.', logoHoriz],
      ] as const).map(([slot, titulo, hint, valorAtual]) => (
        <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid var(--borda)' }}>
          <div style={{ width: 46, height: 46, borderRadius: 10, background: 'var(--bg)', border: '1px solid var(--borda)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
            {valorAtual
              ? <img src={valorAtual} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <span style={{ fontSize: 10, color: 'var(--texto-fraco)' }}>vazio</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{titulo}</div>
            <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)', lineHeight: 1.4 }}>{hint}</div>
          </div>
          <button type="button" style={{ marginTop: 0, padding: '8px 12px', fontSize: 12, flexShrink: 0 }} onClick={() => void escolherLogo(slot)}>
            {valorAtual ? 'Trocar' : 'Enviar'}
          </button>
          {valorAtual && (
            <button type="button" aria-label={`Remover ${titulo}`} style={{ marginTop: 0, background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
              onClick={() => { patch(slot === 'logoQuadradaUri' ? { logoQuadradaUri: undefined, logoUri: undefined } : { logoHorizUri: undefined }); notify('Logotipo removido.') }}>
              ✕
            </button>
          )}
        </div>
      ))}
    </div>

    {temLogo && (
      <div className="cartao">
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>Como a logo aparece</div>

        <CampoGrupo label="Qual usar no topo das telas">
          <SegmentadoN1
            valor={logoTopo}
            onEscolher={(v) => patch({ logoTopo: v as 'quadrada' | 'horizontal' })}
            opcoes={[
              ...(logoQuadrada ? [{ v: 'quadrada', l: 'Quadrada' }] : []),
              ...(logoHoriz ? [{ v: 'horizontal', l: 'Horizontal' }] : []),
            ]}
          />
        </CampoGrupo>

        {logoTopo === 'quadrada' && logoQuadrada && (
          <CampoGrupo label="O que mostrar (logo quadrada)">
            <SegmentadoN1
              valor={logoModo}
              onEscolher={(v) => patch({ logoModo: v as 'logo_nome' | 'so_logo' | 'so_nome' })}
              opcoes={[{ v: 'logo_nome', l: 'Logo + nome' }, { v: 'so_logo', l: 'Só logo' }, { v: 'so_nome', l: 'Só nome' }]}
            />
          </CampoGrupo>
        )}
        {logoTopo === 'horizontal' && (
          <p style={{ fontSize: 11.5, color: 'var(--texto-fraco)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Com a logo horizontal, o nome escrito não aparece — ele já faz parte da própria logo.
          </p>
        )}

        {/* Composição (pedido do Rafael, 10/09/2026): só aparece quando a
            logo E o nome estão os dois na tela — é o único caso em que
            "juntos ou separados" e "qual de cada lado" querem dizer algo. */}
        {mostraLogoENome && (
          <>
            <CampoGrupo label="Logo e nome">
              <SegmentadoN1
                valor={logoComposicao}
                onEscolher={(v) => patch({ logoComposicao: v as 'juntos' | 'separados' })}
                opcoes={[{ v: 'juntos', l: 'Juntos' }, { v: 'separados', l: 'Separados' }]}
              />
            </CampoGrupo>
            {logoComposicao === 'juntos' ? (
              <CampoGrupo label="Qual vem primeiro">
                <SegmentadoN1
                  valor={logoOrdem}
                  onEscolher={(v) => patch({ logoOrdem: v as 'logo_nome' | 'nome_logo' })}
                  opcoes={[{ v: 'logo_nome', l: 'Logo, depois nome' }, { v: 'nome_logo', l: 'Nome, depois logo' }]}
                />
              </CampoGrupo>
            ) : (
              <p style={{ fontSize: 11.5, color: 'var(--texto-fraco)', margin: '0 0 12px', lineHeight: 1.5 }}>
                Separados: escolha embaixo o lado da logo e o lado do nome — um em cada ponta do topo.
              </p>
            )}
          </>
        )}

        <CampoGrupo label={logoComposicao === 'separados' && mostraLogoENome ? 'Posição da logo' : 'Posição no topo'}>
          <SegmentadoN1
            valor={logoPos}
            onEscolher={(v) => patch({ logoPos: v as 'esquerda' | 'centro' | 'direita' })}
            opcoes={[{ v: 'esquerda', l: 'Esquerda' }, { v: 'centro', l: 'Centro' }, { v: 'direita', l: 'Direita' }]}
          />
        </CampoGrupo>

        {mostraLogoENome && logoComposicao === 'separados' && (
          <CampoGrupo label="Posição do nome">
            <SegmentadoN1
              valor={nomePos}
              onEscolher={(v) => patch({ nomePos: v as 'esquerda' | 'centro' | 'direita' })}
              opcoes={[{ v: 'esquerda', l: 'Esquerda' }, { v: 'centro', l: 'Centro' }, { v: 'direita', l: 'Direita' }]}
            />
          </CampoGrupo>
        )}

        <div style={{ fontSize: 12.5, fontWeight: 700, margin: '4px 0 6px' }}>Como vai ficar no topo</div>
        <div style={{ background: 'var(--bg)', border: '1px solid var(--borda)', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
          {/* A prévia usa a MESMA função que a barra do topo usa de verdade
              (`zonasIdentidadeTenant`), pra não existir um segundo desenho que
              possa discordar do real. */}
          <ZonasIdentidade tenant={tenant} altura={16} />
        </div>

        <CampoGrupo label="Qual usar nos documentos oficiais">
          <SegmentadoN1
            valor={logoDocs}
            onEscolher={(v) => patch({ logoDocs: v as 'quadrada' | 'horizontal' })}
            opcoes={[
              ...(logoQuadrada ? [{ v: 'quadrada', l: 'Quadrada' }] : []),
              ...(logoHoriz ? [{ v: 'horizontal', l: 'Horizontal' }] : []),
            ]}
          />
        </CampoGrupo>
        <p style={{ fontSize: 11.5, color: 'var(--texto-fraco)', margin: 0, lineHeight: 1.5 }}>
          Vale pros arquivos que o app gera (a exportação em PDF de cada tela).
        </p>
      </div>
    )}

    <MemoriaDescricaoParametro onAviso={notify} />
  </>
}

/* Parâmetro de nível 1 do ambiente (10/09/2026, pedido do Rafael): quantos
   DIAS pra trás o campo "O que foi" do lançamento olha pra sugerir descrições
   já usadas. Mora aqui, e não em Layout/Manutenção, porque é uma preferência
   do ambiente do cliente — o mesmo lugar onde estão nome e logotipo. */
function MemoriaDescricaoParametro({ onAviso }: { onAviso: (m: string) => void }) {
  const salvo = useMemoriaDescricaoDias()
  const [rascunho, setRascunho] = useState<string | null>(null)
  const valor = rascunho ?? String(salvo)
  return <div className="cartao">
    <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Memória do campo "O que foi"</div>
    <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: '0 0 12px', lineHeight: 1.5 }}>
      Ao digitar no campo "O que foi" de um lançamento, o app sugere descrições que você já usou —
      e, ao escolher uma, preenche junto a categoria e o "pago com" daquele lançamento. Este número
      diz quantos <strong>dias pra trás</strong> ele procura. Padrão: {MEMORIA_DESCRICAO_DIAS_PADRAO} dias.
      Zero desliga a sugestão (o campo continua sendo texto livre, como sempre).
    </p>
    <Campo label="Dias pra trás">
      <input
        type="number"
        min={0}
        max={3650}
        inputMode="numeric"
        style={estiloInput}
        value={valor}
        onChange={(e) => setRascunho(e.target.value)}
      />
    </Campo>
    <button type="button" className="primario" style={{ width: '100%' }}
      onClick={async () => {
        const n = Number(valor)
        if (!Number.isFinite(n) || n < 0) { onAviso('Informe um número de dias válido.'); return }
        await salvarMemoriaDescricaoDias(n)
        setRascunho(null)
        onAviso(n === 0 ? 'Sugestão de descrição desligada.' : `Memória ajustada para ${Math.round(n)} dias.`)
      }}>
      Salvar
    </button>
  </div>
}

/* ================= Aparência (Kit L4739-L4780, `TemaPicker`) ================= */
// Mecanismo idêntico ao Kit: atributo no <html> + bloco de CSS só de
// variáveis (`src/index.css`). Persistência no Dexie (ver `configuracaoIcones.ts`).
function aplicarTema(valor: TemaPreferido) {
  document.documentElement.setAttribute('data-mloc-tema', valor)
}
const OPCOES_TEMA: { v: TemaPreferido; l: string }[] = [
  { v: 'claro', l: 'Claro' }, { v: 'escuro', l: 'Escuro' }, { v: 'auto', l: 'Automático' },
]
/* Aplica o tema salvo assim que o app abre — montado uma vez em `AppRoot`. */
export function AplicadorDeTema() {
  const tema = useTemaPreferido()
  useEffect(() => { aplicarTema(tema) }, [tema])
  return null
}
export function AparenciaN1({ aoVoltar }: { aoVoltar: () => void }) {
  const tema = useTemaPreferido()
  return <>
    <Cabecalho titulo="Aparência" aoVoltar={aoVoltar} />
    <div className="cartao">
      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 2 }}>Tema das telas</div>
      <p style={{ fontSize: 12, color: 'var(--texto-fraco)', margin: '0 0 12px', lineHeight: 1.5 }}>
        "Automático" acompanha a configuração do seu celular. Recurso <strong>experimental</strong> — o app foi desenhado escuro, então no tema claro pode sobrar alguma tela fora do tom; se não ficar bom, é só avisar que a gente remove.
      </p>
      <div style={{ display: 'flex', gap: 6 }}>
        {OPCOES_TEMA.map((o) => {
          const on = tema === o.v
          return <button key={o.v} type="button" onClick={() => void salvarTemaPreferido(o.v)}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: on ? '#fff' : 'var(--texto)', background: on ? 'var(--azul)' : 'var(--bg)', border: `1.5px solid ${on ? 'var(--azul)' : 'var(--borda)'}` }}>
            {o.l}
          </button>
        })}
      </div>
    </div>
  </>
}

/* ================= Ajuda (Kit L4119-L4149) ================= */
export function AjudaN1({ aoVoltar, abrirSuporte, abrirTour, temNaoLida }: {
  aoVoltar: () => void; abrirSuporte: () => void; abrirTour: () => void; temNaoLida?: boolean
}) {
  const card = (titulo: string, resumo: string, onClick: () => void, badge?: boolean) => (
    <button type="button" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', background: 'var(--bg-elevado)', border: '1px solid var(--borda)', borderRadius: 14, padding: 14, marginBottom: 10, cursor: 'pointer', textAlign: 'left', color: 'var(--texto)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7 }}>
          {titulo}
          {badge && <span style={{ minWidth: 8, height: 8, borderRadius: 999, background: 'var(--vermelho)' }} />}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--texto-fraco)', marginTop: 2, lineHeight: 1.4 }}>{resumo}</div>
      </div>
      <span style={{ color: 'var(--texto-fraco)' }}>›</span>
    </button>
  )
  return <>
    <Cabecalho titulo="Ajuda" aoVoltar={aoVoltar} />
    {card('Suporte Morfo (chat)', 'Fale com o time da Morfo pelo chat interno', abrirSuporte, temNaoLida)}
    {card('Tour guiado', 'Rever o passo a passo de uso do sistema, na tela real', abrirTour)}
  </>
}
