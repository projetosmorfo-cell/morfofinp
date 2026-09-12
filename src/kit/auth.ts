import { db } from '../db'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'
import { atualizarTenantN0, tenantUsersComMigracao, TENANT_N1_ID, loginJaEmUsoGlobalmente, lerPlatformN0Persistida, type UsuarioTenant } from './kitPlatform'

// Autenticação real (05/09/2026, Roteiro de Parametrização Morfo, Etapa 8 —
// Login/Ambiente Logado).
//
// REESCRITO em 10/09/2026 (Decisão 54, Parte B — Rafael escolheu trocar o
// login pra multiusuário também "pra perfis valerem de verdade"). Antes: 1
// credencial única (`credencialEmail`/`credencialSenha`) — agora a lista
// real de usuários vive em `tenant.users` (tenant real = `t0`, ver
// `kitPlatform.ts`), cada um com o próprio `perfilId`; `loggedUserIdN1` diz
// qual está logado. MIGRAÇÃO (`tenantUsersComMigracao`): a credencial única
// antiga continua funcionando pra login — é adicionada à lista real
// (id estável `ID_LOGIN_MIGRADO_N1`, perfil "admin") na primeira vez que
// roda, sem exigir recadastro. Ninguém perde acesso por causa desta rodada.
//
// PLACEHOLDER DE SEGURANÇA, não de fluxo: sem backend (Decisão 6/Backlog
// #028), não existe autenticação de verdade possível num app 100%
// client-side — quem tem acesso ao arquivo/perfil do navegador já tem
// acesso ao IndexedDB inteiro de qualquer forma, com ou sem "senha".
//
// Nenhuma função aqui recebe/chama callback de navegação: `AppRoot.tsx` lê
// `sessaoAtiva` via `useLiveQuery` (reativo) — gravar/zerar esse campo já
// basta pra trocar de tela sozinho.

// Garante que `t0.users` (persistido) inclua a migração da credencial
// única antiga, se existir — grava só quando algo muda. Chamado no início
// de toda função de login desta camada (idempotente). Diferente do N0,
// `t0.users` NUNCA está vazio (nasce com o usuário de exemplo do Kit, ver
// `gerarPlatformN0`), então não precisa de um "admin padrão" de fallback.
async function garantirTenantUsersMigrados(): Promise<UsuarioTenant[]> {
  const config = await db.configuracoes.get(1)
  const platform = await lerPlatformN0Persistida()
  const t0 = platform.tenants.find((t) => t.id === TENANT_N1_ID)
  const migrados = tenantUsersComMigracao(t0?.users, config)
  const mudou = JSON.stringify(migrados) !== JSON.stringify(t0?.users ?? [])
  if (mudou) await atualizarTenantN0(TENANT_N1_ID, (t) => ({ ...t, users: migrados }))
  return migrados
}

async function entrarComoTenantUserId(userId: string | undefined, tenantId?: string): Promise<void> {
  /* 12/09/2026: o login passou a valer pra QUALQUER ambiente cadastrado no
     N0, não só o deste aparelho — quando o usuário logado é de outro
     ambiente, `loggedTenantIdN1` guarda qual (ver `useTenantN1`). Sem
     `tenantId`, o comportamento é o de sempre: o ambiente `t0`. */
  if (tenantId && tenantId !== TENANT_N1_ID) {
    const platform = await lerPlatformN0Persistida()
    const t = platform.tenants.find((x) => x.id === tenantId)
    const u = (userId && t?.users?.find((x) => x.id === userId)) || t?.users?.[0]
    await salvarConfiguracaoIcones({ sessaoAtiva: true, loggedUserIdN1: u?.id, loggedTenantIdN1: tenantId })
    return
  }
  const users = await garantirTenantUsersMigrados()
  const user = (userId && users.find((u) => u.id === userId)) || users[0]
  await salvarConfiguracaoIcones({ sessaoAtiva: true, loggedUserIdN1: user?.id, loggedTenantIdN1: TENANT_N1_ID })
}

// Autocadastro ("Contratar um plano") — cria o ÚNICO usuário do ambiente
// com os dados preenchidos no site e já loga como ele.
//
// 11/09/2026 (Decisão 67): o ambiente do cliente passou a ser de um usuário
// só (o do plano contratado), então este cadastro SUBSTITUI a lista de
// usuários em vez de acrescentar mais um — e o site deixa de oferecer
// "Contratar um plano" quando já existe usuário, justamente pra este
// caminho nunca passar por cima de um acesso em uso (ver `LoginView.tsx`).
// Os dados pessoais (nome, e-mail, telefone) ficam no próprio usuário e são
// editáveis depois em Configuração → Meus Dados.
export async function criarAcesso(
  login: string,
  senha: string,
  dados?: { nome?: string; email?: string; telefone?: string; cpf?: string; nomeAmbiente?: string },
): Promise<void> {
  const loginN = login.trim().toLowerCase()
  const platform = await lerPlatformN0Persistida()
  if (loginJaEmUsoGlobalmente({ devUsers: platform.devUsers, tenants: platform.tenants }, loginN, { tenantId: TENANT_N1_ID })) return
  const novo: UsuarioTenant = {
    id: `u-${Date.now().toString(36)}`,
    name: dados?.nome?.trim() || loginN,
    login: loginN,
    senha,
    email: dados?.email?.trim() || '',
    phone: dados?.telefone?.trim() || '',
    perfilId: 'admin',
    status: 'ativo',
    createdAt: new Date().toISOString(),
  }
  const nomeAmbiente = dados?.nomeAmbiente?.trim()
  const cpf = dados?.cpf?.trim()
  await atualizarTenantN0(TENANT_N1_ID, (t) => ({ ...t, users: [novo], ...(cpf ? { doc: cpf } : {}), ...(nomeAmbiente ? { companyName: nomeAmbiente } : {}) }))
  await salvarConfiguracaoIcones({ sessaoAtiva: true, loggedUserIdN1: novo.id })
}

// Retorna `true` (e já marca a sessão como ativa, como o usuário que
// bateu) se login+senha baterem com algum `t0.users[]`, `false` caso
// contrário — nunca lança exceção, a tela mostra a mensagem.
export async function entrar(login: string, senha: string): Promise<boolean> {
  const loginN = login.trim().toLowerCase()
  const users = await garantirTenantUsersMigrados()
  const user = users.find((u) => u.login.trim().toLowerCase() === loginN && u.senha === senha && u.status !== 'inativo')
  if (!user) return false
  await salvarConfiguracaoIcones({ sessaoAtiva: true, loggedUserIdN1: user.id })
  return true
}

export async function sair(): Promise<void> {
  await salvarConfiguracaoIcones({ sessaoAtiva: false, loggedUserIdN1: undefined, loggedTenantIdN1: undefined })
}

// Acesso demo/rápido, sem digitar credencial (08/09/2026, G44 regra 3).
// Loga como o 1º usuário de `t0.users` (migrando a credencial única antiga
// se existir; senão o próprio usuário de exemplo que o tenant real já
// nasce com, ver `gerarPlatformN0`) — nunca deixa quem só quer validar o
// MVP travado numa tela de senha.
export async function entrarDemo(): Promise<void> {
  await entrarComoTenantUserId(undefined)
}

// Chamado pelo adaptador de Login (`LoginView.tsx`) quando `LoginViewKit`
// já resolveu QUAL usuário bateu, ou quando um atalho aponta um usuário
// específico — nunca refaz checagem de senha.
export async function entrarComoTenantUser(userId?: string, tenantId?: string): Promise<void> {
  await entrarComoTenantUserId(userId, tenantId)
}

// "Esqueci minha senha" — como não existe backend/servidor de recuperação
// de verdade, a única saída honesta é apagar os usuários cadastrados e
// recomeçar do zero (mesmo efeito que a versão anterior tinha sobre a
// credencial única). NUNCA toca em lançamentos/categorias/contas/metas/
// grupos/ícones — só em `t0.users`/perfis/sessão.
export async function redefinirAcesso(): Promise<void> {
  await atualizarTenantN0(TENANT_N1_ID, (t) => ({ ...t, users: [] }))
  await salvarConfiguracaoIcones({ sessaoAtiva: false, loggedUserIdN1: undefined })
}
