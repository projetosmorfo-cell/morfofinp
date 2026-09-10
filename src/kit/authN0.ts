import { db } from '../db'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'
import { devUsersComMigracao, lerPlatformN0Persistida, salvarPlatformN0, loginJaEmUsoGlobalmente, type DevUserN0 } from './kitPlatform'

// Autenticação do NÍVEL N0 (08/09/2026, Roteiro de Parametrização Morfo,
// G59 — "critério de aceite binário do encaixe"). Mirror deliberado de
// `src/kit/auth.ts` (N1), mas em campos SEPARADOS do singleton
// (`sessaoAtivaN0`/`loggedDevUserId`, ver `db.ts`) — G59 exige "login separa
// os níveis": administrador (Morfo) e empresa (tenant) são credenciais
// independentes, nunca a mesma sessão.
//
// REESCRITO em 10/09/2026 (Decisão 54, Parte B — "Gerenciador de Perfis e
// Permissões MorfoMod", Rafael escolheu explicitamente trocar o login pra
// multiusuário "pra perfis valerem de verdade"). Antes: 1 credencial única
// (`credencialEmailN0`/`credencialSenhaN0`) — perfil nunca podia valer nada
// porque só existia 1 sessão N0 possível. Agora: a lista real de usuários
// vive em `platformN0.devUsers` (ver `kitPlatform.ts`), cada um com o
// próprio `perfilId` — `loggedDevUserId` diz qual deles está logado.
//
// MIGRAÇÃO (`devUsersComMigracao`): a credencial única antiga
// (`credencialEmailN0`/`credencialSenhaN0`) continua funcionando pra
// login — na primeira vez que qualquer função daqui roda depois desta
// mudança, ela é adicionada à lista real de usuários (id estável
// `ID_LOGIN_MIGRADO_N0`, perfil "admin") em vez de se perder. Ninguém
// perde acesso por causa desta rodada.
//
// PLACEHOLDER DE SEGURANÇA, mesma ressalva de sempre: sem backend
// (Decisão 6/Backlog #028), não existe autenticação real possível num app
// 100% client-side. Texto puro de propósito.

// Usuário administrador Morfo PADRÃO do Kit (`generatePlatform`, L646 do
// `esqueleto-morfo-v1.jsx`): `{ name: "Admin Morfo", login: "morfomod",
// senha: "306583", email: "projetos.morfo@gmail.com" }` (G55).
export const N0_PADRAO_KIT = { nome: 'Admin Morfo', login: 'morfomod', senha: '306583', email: 'projetos.morfo@gmail.com' } as const

// Garante que `platformN0.devUsers` (persistido) inclua a migração da
// credencial única antiga (se existir) e, se ainda estiver vazio, o
// administrador padrão do Kit — grava só quando algo muda. Chamado no
// início de toda função de login desta camada (idempotente).
async function garantirDevUsersMigrados(): Promise<DevUserN0[]> {
  const config = await db.configuracoes.get(1)
  const platform = await lerPlatformN0Persistida()
  const migrados = devUsersComMigracao(platform.devUsers, config, N0_PADRAO_KIT)
  const mudou = JSON.stringify(migrados) !== JSON.stringify(platform.devUsers ?? [])
  if (mudou) await salvarPlatformN0({ ...platform, devUsers: migrados })
  return migrados
}

async function entrarComoDevUserId(userId: string | undefined): Promise<void> {
  const devUsers = await garantirDevUsersMigrados()
  const user = (userId && devUsers.find((u) => u.id === userId)) || devUsers[0]
  await salvarConfiguracaoIcones({ sessaoAtivaN0: true, loggedDevUserId: user?.id })
}

// Autocadastro (1ª vez / "criar acesso") — cadastra um usuário NOVO em
// `platformN0.devUsers` (perfil "admin", primeiro acesso de verdade) e já
// loga como ele. Usado hoje só como caminho de fallback (a tela de Login
// atual do MorfoFinP, transcrita do Kit — Decisão 48 — não tem um
// formulário de "criar acesso N0" próprio, só os botões de teste rápido e
// o login com credencial já existente); mantido pra qualquer fluxo futuro
// que precise abrir um 2º/3º administrador.
export async function criarAcessoN0(login: string, senha: string, nome: string): Promise<void> {
  const loginN = login.trim().toLowerCase()
  const devUsers = await garantirDevUsersMigrados()
  const platform = await lerPlatformN0Persistida()
  if (loginJaEmUsoGlobalmente({ devUsers, tenants: platform.tenants }, loginN)) return
  const novo: DevUserN0 = { id: `dev-${Date.now().toString(36)}`, name: nome.trim() || loginN, login: loginN, senha, email: loginN, perfilId: 'admin', status: 'ativo', createdAt: new Date().toISOString() }
  const lista = [...devUsers, novo]
  await salvarPlatformN0({ ...platform, devUsers: lista })
  await salvarConfiguracaoIcones({ sessaoAtivaN0: true, loggedDevUserId: novo.id })
}

// Retorna `true` (e já marca a sessão N0 como ativa, como o usuário que
// bateu) se login+senha baterem com algum `devUsers[]`, `false` caso
// contrário — nunca lança exceção, a tela mostra a mensagem.
export async function entrarN0(login: string, senha: string): Promise<boolean> {
  const loginN = login.trim().toLowerCase()
  const devUsers = await garantirDevUsersMigrados()
  const user = devUsers.find((u) => u.login.trim().toLowerCase() === loginN && u.senha === senha && u.status !== 'inativo')
  if (!user) return false
  await salvarConfiguracaoIcones({ sessaoAtivaN0: true, loggedDevUserId: user.id })
  return true
}

export async function sairN0(): Promise<void> {
  await salvarConfiguracaoIcones({ sessaoAtivaN0: false, loggedDevUserId: undefined })
}

// Acesso demo/rápido do N0, sem digitar credencial — mesma lógica e mesmo
// motivo de `entrarDemo()` (N1, ver `auth.ts`), G44 regra 3 / Decisão 31 /
// Lição 16. Loga como o 1º usuário de `platformN0.devUsers` (migrando a
// credencial única antiga ou criando o admin padrão do Kit se a lista
// ainda estiver vazia) — é o mesmo caminho que o botão "Entrar" segue
// quando a pessoa digita "morfomod"/"306583" num banco ainda sem nenhum
// administrador cadastrado.
export async function entrarDemoN0(): Promise<void> {
  await entrarComoDevUserId(undefined)
}

// Chamado pelo adaptador de Login (`LoginView.tsx`) quando `LoginViewKit`
// já resolveu QUAL usuário bateu (`submit()`, checagem literal do Kit) ou
// quando um botão de atalho aponta um usuário específico — nunca faz
// checagem de senha de novo (isso já foi feito por quem chamou).
export async function entrarComoDevUser(userId?: string): Promise<void> {
  await entrarComoDevUserId(userId)
}

// "Esqueci minha senha" do N0 — mesma lógica honesta de `redefinirAcesso()`
// (N1): sem backend/recuperação real, a única saída é apagar os
// administradores cadastrados e recomeçar do zero (mesmo efeito que a
// versão anterior tinha sobre a credencial única). NUNCA toca em
// lançamentos/categorias/contas/grupos/ícones/planos — só em
// `devUsers`/perfis/sessão N0.
export async function redefinirAcessoN0(): Promise<void> {
  const platform = await lerPlatformN0Persistida()
  await salvarPlatformN0({ ...platform, devUsers: [] })
  await salvarConfiguracaoIcones({ sessaoAtivaN0: false, loggedDevUserId: undefined })
}
