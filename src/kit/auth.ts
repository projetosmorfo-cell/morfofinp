import { db } from '../db'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'

// Autenticação real (05/09/2026, Roteiro de Parametrização Morfo, Etapa 8 —
// Login/Ambiente Logado). Rafael escolheu explicitamente "Trocar a entrada
// de verdade" quando perguntado (esta etapa era uma das duas tratadas como
// "grave/estrutural" — a outra foi a Etapa 7 — porque muda o ponto de
// entrada REAL do app, ao contrário de Etapas 4-6, que só adicionaram
// telas alcançáveis por Manutenção sem mudar nada do fluxo padrão).
//
// PLACEHOLDER DE SEGURANÇA, não de fluxo: sem backend (Decisão 6/Backlog
// #028), não existe autenticação de verdade possível num app 100%
// client-side — quem tem acesso ao arquivo/perfil do navegador já tem
// acesso ao IndexedDB inteiro de qualquer forma, com ou sem "senha". O
// valor real desta camada é abrir o app por uma tela de entrada de
// verdade (like a Etapa 8 pede), não proteger dado.
//
// Nenhuma função aqui recebe/chama callback de navegação: `AppRoot.tsx` lê
// `sessaoAtiva` via `useLiveQuery` (reativo, mesmo padrão de `modoVisao`/
// `ordemAbas`/`planoId`) — gravar/zerar esse campo já basta pra trocar de
// tela sozinho.

export async function criarAcesso(email: string, senha: string): Promise<void> {
  await salvarConfiguracaoIcones({
    credencialEmail: email.trim().toLowerCase(),
    credencialSenha: senha,
    sessaoAtiva: true,
  })
}

// Retorna `true` (e já marca a sessão como ativa) se a credencial bater,
// `false` caso contrário — nunca lança exceção, a tela mostra a mensagem.
export async function entrar(email: string, senha: string): Promise<boolean> {
  const atual = await db.configuracoes.get(1)
  const bate = atual?.credencialEmail === email.trim().toLowerCase() && atual?.credencialSenha === senha
  if (bate) await salvarConfiguracaoIcones({ sessaoAtiva: true })
  return bate
}

export async function sair(): Promise<void> {
  await salvarConfiguracaoIcones({ sessaoAtiva: false })
}

// Acesso demo/rápido, sem digitar credencial (08/09/2026, G44 regra 3 — o
// Kit real traz, na própria tela de Login, um atalho de demo pra entrar
// sem precisar logar antes; a ausência disso foi identificada como gap
// real na Decisão 31/Lição 16, e reforçada pelo Rafael: "eu quero validar
// o MVP, só isso", sem travar numa tela de senha). Pular a digitação não
// abre risco novo nenhum — a "senha" nunca protegeu dado de verdade (ver
// nota grande no topo deste arquivo). Se já existe uma credencial salva
// (mesmo navegador/perfil de uma sessão anterior), só reativa a sessão; se
// não existe nenhuma ainda, cria uma credencial demo fixa — nunca deixa
// quem só quer validar o MVP travado numa tela de cadastro.
export async function entrarDemo(): Promise<void> {
  const atual = await db.configuracoes.get(1)
  if (atual?.credencialEmail) {
    await salvarConfiguracaoIcones({ sessaoAtiva: true })
  } else {
    await criarAcesso('demo@morfofinp.local', 'demo123')
  }
}

// "Esqueci minha senha" — como não existe backend/servidor de recuperação
// de verdade, a única saída honesta é permitir cadastrar uma credencial
// nova (a antiga, afinal, nunca foi uma senha "de verdade" — ver comentário
// acima). NUNCA toca em lançamentos/categorias/contas/metas/grupos/ícones —
// só nos 2 campos de credencial e na sessão. Existe pra nunca deixar o
// Rafael genuinamente trancado pra fora do próprio app (mesma preocupação
// de segurança de acesso diário já registrada na Decisão 6).
export async function redefinirAcesso(): Promise<void> {
  await salvarConfiguracaoIcones({
    credencialEmail: undefined,
    credencialSenha: undefined,
    sessaoAtiva: false,
  })
}
