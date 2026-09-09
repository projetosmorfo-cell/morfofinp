import { db } from '../db'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'

// Autenticação do NÍVEL N0 (08/09/2026, Roteiro de Parametrização Morfo,
// G59 — "critério de aceite binário do encaixe"). Mirror deliberado de
// `src/kit/auth.ts` (N1), mas em campos SEPARADOS do singleton
// (`credencialEmailN0`/`credencialSenhaN0`/`sessaoAtivaN0`, ver `db.ts`) —
// G59 exige "login separa os níveis": administrador (Morfo) e empresa
// (tenant) são credenciais independentes, nunca a mesma sessão.
//
// PLACEHOLDER DE SEGURANÇA, mesma ressalva de `auth.ts`: sem backend
// (Decisão 6/Backlog #028), não existe autenticação real possível num app
// 100% client-side. Texto puro de propósito.
//
// Nenhuma função aqui recebe/chama callback de navegação — `AppRoot.tsx` lê
// `sessaoAtivaN0` via `useLiveQuery` (reativo), igual já fazia com
// `sessaoAtiva` de N1.

export async function criarAcessoN0(email: string, senha: string, nome: string): Promise<void> {
  const emailNormalizado = email.trim().toLowerCase()
  await salvarConfiguracaoIcones({
    credencialEmailN0: emailNormalizado,
    credencialSenhaN0: senha,
    sessaoAtivaN0: true,
  })
  // Registra o 1º administrador na lista real de "Usuários Morfo" (ver
  // `UsuarioN0` em db.ts) — sem isso, a tela de Parâmetros → Usuários Morfo
  // do painel N0 nasceria sempre vazia mesmo já existindo uma credencial
  // válida logada.
  const jaExiste = await db.usuariosN0.where('email').equals(emailNormalizado).count()
  if (jaExiste === 0) {
    await db.usuariosN0.add({
      nome: nome.trim() || emailNormalizado,
      email: emailNormalizado,
      ativo: true,
      criadoEm: new Date().toISOString(),
    })
  }
}

// Retorna `true` (e já marca a sessão N0 como ativa) se a credencial bater,
// `false` caso contrário — nunca lança exceção, a tela mostra a mensagem.
export async function entrarN0(email: string, senha: string): Promise<boolean> {
  const atual = await db.configuracoes.get(1)
  const bate = atual?.credencialEmailN0 === email.trim().toLowerCase() && atual?.credencialSenhaN0 === senha
  if (bate) await salvarConfiguracaoIcones({ sessaoAtivaN0: true })
  return bate
}

export async function sairN0(): Promise<void> {
  await salvarConfiguracaoIcones({ sessaoAtivaN0: false })
}

// Usuário administrador Morfo PADRÃO do Kit (`generatePlatform`, L646 do
// `Kit de Estrutura Mínima (Morfo) - esqueleto-morfo.jsx`, 09/09/2026):
// `{ name: "Admin Morfo", login: "morfomod", senha: "306583", email:
// "projetos.morfo@gmail.com" }`. G55: parâmetro/dado-padrão do esqueleto vem
// com o MESMO valor do MorfoLoc — antes desta rodada o demo N0 nascia com
// "admin@morfo.local"/"demo123", valor inventado aqui (Decisão 48).
export const N0_PADRAO_KIT = { nome: 'Admin Morfo', login: 'morfomod', senha: '306583', email: 'projetos.morfo@gmail.com' } as const

// Acesso demo/rápido do N0, sem digitar credencial — mesma lógica e mesmo
// motivo de `entrarDemo()` (N1, ver `auth.ts`), G44 regra 3 / Decisão 31 /
// Lição 16. Se já existe credencial N0 salva, só reativa a sessão; senão,
// grava como credencial o usuário padrão do Kit (e já registra o
// administrador em "Usuários Morfo", via `criarAcessoN0`) — é o mesmo
// caminho que o botão "Entrar" do Login segue quando a pessoa digita
// "morfomod"/"306583" num banco ainda sem credencial N0.
export async function entrarDemoN0(): Promise<void> {
  const atual = await db.configuracoes.get(1)
  if (atual?.credencialEmailN0) {
    await salvarConfiguracaoIcones({ sessaoAtivaN0: true })
  } else {
    await criarAcessoN0(N0_PADRAO_KIT.login, N0_PADRAO_KIT.senha, N0_PADRAO_KIT.nome)
  }
}

// "Esqueci minha senha" do N0 — mesma lógica honesta de `redefinirAcesso()`
// (N1): sem backend/recuperação real, a única saída é cadastrar credencial
// nova. NUNCA toca em lançamentos/categorias/contas/grupos/ícones/planos/
// usuariosN0 — só nos 2 campos de credencial N0 e na sessão N0.
export async function redefinirAcessoN0(): Promise<void> {
  await salvarConfiguracaoIcones({
    credencialEmailN0: undefined,
    credencialSenhaN0: undefined,
    sessaoAtivaN0: false,
  })
}
