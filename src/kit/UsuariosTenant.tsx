import { useState } from 'react'
import {
  useTenantN1,
  atualizarTenantN0,
  TENANT_N1_ID,
  perfisPadraoN1,
  perfilDoUsuario,
  contaAdminsAtivos,
  loginJaEmUsoGlobalmente,
  usePlatformN0,
  type UsuarioTenant,
} from './kitPlatform'
import { usePlanoAtual } from './planoAtual'
import { validaTelefone, validaEmailEnvio } from './kitBase'

// N1 → engrenagem → "Usuários" (10/09/2026, Decisão 54 Parte B — login
// multiusuário de verdade). CRUD de `t0.users` — a MESMA lista que
// `LoginView.tsx`/`auth.ts` usam pra autenticar (login/senha reais, perfil
// de acesso, status), não um registro à parte. Mesmo padrão visual das
// outras telas de configuração do N1 (`Contas.tsx`): `.cabecalho-fixo` +
// `.botao-voltar-config`, `label`/`input` simples, classes globais
// (`.cartao`, `.primario`, `var(--borda)`/`var(--azul)`/`var(--vermelho)`),
// nunca as cores do `kitBase.tsx` (essas ficam só pro Gerenciador de
// Permissões — `PermissoesTenant.tsx` — que é transcrição literal de tela do
// Kit, mesmo padrão já usado por `ChatConversa.tsx`/`SuporteChat.tsx` de
// adaptar cor ao tema do app quando o conteúdo é nativo do MorfoFinP).
export default function UsuariosTenant({ aoVoltar }: { aoVoltar: () => void }) {
  const tenant = useTenantN1()
  const platform = usePlatformN0()
  const users = tenant?.users ?? []
  const perfis = tenant?.perfisAcesso ?? perfisPadraoN1()

  const [editando, setEditando] = useState<UsuarioTenant | 'novo' | null>(null)
  const [nome, setNome] = useState('')
  const [login, setLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [perfilId, setPerfilId] = useState('admin')
  const [erro, setErro] = useState('')
  // Telefone e e-mail (10/09/2026, Decisão 58): o Kit (`AddUserSheet`, usado
  // por `UsuariosTenantView` L4716) sempre cadastrou os dois — o tipo
  // `UsuarioTenant` já os previa, mas nenhuma tela preenchia.
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')

  function abrirEdicao(u: UsuarioTenant) {
    setEditando(u); setNome(u.name); setLogin(u.login); setSenha(u.senha); setPerfilId(u.perfilId || 'admin'); setErro('')
    setTelefone(u.phone || ''); setEmail(u.email || '')
  }
  function abrirNovo() {
    setEditando('novo'); setNome(''); setLogin(''); setSenha(''); setPerfilId('admin'); setErro('')
    setTelefone(''); setEmail('')
  }

  /* Limite de usuários (Kit L4710/L5597 — `UserLimitBar` + `countUserSlots`):
     conta só quem NÃO está inativo, e o limite é "definido pela Morfo".
     Qual limite vale: o do PLANO contratado, quando ele traz um
     (`limiteUsuarios`, campo novo de "Gerenciar Planos" nesta mesma rodada) —
     que é como o Kit modela isso ("o limite é definido pela Morfo") —, senão
     o `userLimit` gravado no próprio ambiente, senão 3. */
  const planoAtual = usePlanoAtual()
  const limiteUsuarios = planoAtual?.limiteUsuarios ?? tenant?.userLimit ?? 3
  const usados = users.filter((u) => u.status !== 'inativo').length
  const noLimite = usados >= limiteUsuarios

  // Última proteção de admin (mesmo critério do N0, `contaAdminsAtivos` do
  // Kit): nunca deixar este tenant sem NENHUM usuário administrador ativo —
  // sem backend/recuperação de senha de verdade, isso trancaria o Rafael
  // pra fora do próprio app de uso diário.
  function ehUltimoAdminAtivo(u: UsuarioTenant): boolean {
    return (u.perfilId || 'admin') === 'admin' && u.status !== 'inativo' && contaAdminsAtivos(users) <= 1
  }

  async function salvar() {
    const loginN = login.trim().toLowerCase()
    if (!nome.trim() || !loginN || !senha.trim()) { setErro('Preencha nome, login e senha.'); return }
    if (editando === 'novo' && noLimite) { setErro(`Limite de ${limiteUsuarios} usuários atingido — inative alguém antes de cadastrar outro.`); return }
    if (telefone.trim() && !validaTelefone(telefone)) { setErro('Telefone inválido (use DDD + número).'); return }
    if (email.trim() && !validaEmailEnvio(email)) { setErro('E-mail inválido.'); return }
    const idAtual = editando !== 'novo' && editando ? editando.id : undefined
    if (loginJaEmUsoGlobalmente({ devUsers: platform.devUsers, tenants: platform.tenants }, loginN, { tenantId: TENANT_N1_ID, userId: idAtual })) {
      setErro('Esse login já está em uso (N0 ou N1).'); return
    }
    if (editando !== 'novo' && editando && ehUltimoAdminAtivo(editando) && perfilId !== 'admin') {
      setErro('Este é o único administrador ativo — mude o perfil de outro usuário antes.'); return
    }
    await atualizarTenantN0(TENANT_N1_ID, (t) => ({
      ...t,
      users: editando === 'novo'
        ? [...t.users, { id: `u-${Date.now().toString(36)}`, name: nome.trim(), login: loginN, senha, perfilId, phone: telefone.trim(), email: email.trim(), status: 'ativo', createdAt: new Date().toISOString() }]
        : t.users.map((u) => (u.id === editando?.id ? { ...u, name: nome.trim(), login: loginN, senha, perfilId, phone: telefone.trim(), email: email.trim() } : u)),
    }))
    setEditando(null)
  }

  async function alternarAtivo(u: UsuarioTenant) {
    if (u.status !== 'inativo' && ehUltimoAdminAtivo(u)) { setErro('Não é possível inativar o único administrador ativo.'); return }
    // Reativar volta a ocupar vaga (Kit L4726): com o limite atingido, não dá.
    if (u.status === 'inativo' && noLimite) { setErro(`Limite de ${limiteUsuarios} usuários atingido — não é possível reativar.`); return }
    await atualizarTenantN0(TENANT_N1_ID, (t) => ({ ...t, users: t.users.map((x) => (x.id === u.id ? { ...x, status: x.status === 'inativo' ? 'ativo' : 'inativo' } : x)) }))
  }

  if (editando !== null) {
    return (
      <>
        <div className="cabecalho-fixo">
          <button type="button" className="botao-voltar-config" onClick={() => setEditando(null)}>‹ Voltar</button>
          <h1>{editando === 'novo' ? 'Novo usuário' : 'Editar usuário'}</h1>
        </div>
        <label htmlFor="tenant-user-nome">Nome</label>
        <input id="tenant-user-nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
        <label htmlFor="tenant-user-login">Login</label>
        <input id="tenant-user-login" type="text" value={login} onChange={(e) => setLogin(e.target.value)} />
        <label htmlFor="tenant-user-senha">Senha</label>
        <input id="tenant-user-senha" type="text" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <label htmlFor="tenant-user-tel">Telefone</label>
        <input id="tenant-user-tel" type="text" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" />
        <label htmlFor="tenant-user-email">E-mail</label>
        <input id="tenant-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com.br" />
        <label htmlFor="tenant-user-perfil">Perfil de acesso</label>
        <select id="tenant-user-perfil" value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>
          {perfis.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        {erro && <p style={{ color: 'var(--vermelho)', fontSize: 13, fontWeight: 600 }}>{erro}</p>}
        <button type="button" className="primario" onClick={salvar}>Salvar usuário</button>
      </>
    )
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>‹ Voltar</button>
        <h1>Usuários</h1>
      </div>
      <p className="texto-fraco">
        Login/senha reais de quem acessa este ambiente — a mesma credencial que a tela de Login usa. O perfil de
        acesso decide o que cada usuário pode ver e fazer (ver "Permissões").
      </p>
      {/* Barra de uso do limite — Kit `UserLimitBar` (L5597). */}
      <p style={{ fontSize: 12.5, fontWeight: 700, color: noLimite ? 'var(--vermelho)' : 'var(--texto-fraco)', margin: '6px 0 2px' }}>
        {usados} de {limiteUsuarios} usuários{noLimite ? ' · limite atingido' : ''}
      </p>
      <p className="texto-fraco" style={{ fontSize: 12, marginTop: 0 }}>
        O limite é definido pela Morfo e conta apenas usuários ativos — inativos não ocupam vaga.
      </p>
      {erro && <p style={{ color: 'var(--vermelho)', fontSize: 13, fontWeight: 600 }}>{erro}</p>}
      <h2>Cadastrados</h2>
      <div className="cartao">
        {users.length === 0 && <p className="texto-fraco">Nenhum usuário cadastrado ainda.</p>}
        {users.map((u) => (
          <div key={u.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
            <div style={{ opacity: u.status !== 'inativo' ? 1 : 0.5 }}>
              {u.name}
              {u.status === 'inativo' && <span className="texto-fraco"> · inativo</span>}
            </div>
            <div className="texto-fraco">{u.login} · {perfilDoUsuario(perfis, u)?.nome ?? '—'}</div>
            {(u.phone || u.email) && <div className="texto-fraco" style={{ fontSize: 12 }}>{[u.phone, u.email].filter(Boolean).join(' · ')}</div>}
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--azul)', cursor: 'pointer', padding: 0 }} onClick={() => abrirEdicao(u)}>
                Editar
              </button>
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', padding: 0 }} onClick={() => alternarAtivo(u)}>
                {u.status !== 'inativo' ? 'Inativar' : 'Reativar'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {noLimite ? (
        <p style={{ fontSize: 12.5, color: 'var(--vermelho)', background: 'rgba(210,72,59,0.08)', borderRadius: 10, padding: '10px 12px' }}>
          Limite de {limiteUsuarios} usuários atingido. Inative alguém ou fale com a Morfo (Suporte) para liberar mais vagas.
        </p>
      ) : (
        <button type="button" className="primario" onClick={abrirNovo}>+ Novo usuário</button>
      )}
    </>
  )
}
