// Modelo de permissão por perfil × funcionalidade — adaptado do Kit de
// Estrutura Mínima Morfo (`Kit de Estrutura Mínima (Morfo) - esqueletomorfo.jsx`,
// seção "3) MODELO DE PERMISSÃO POR PERFIL × FUNCIONALIDADE"), Roteiro de
// Parametrização Morfo, Etapa 4 (04/09/2026).
//
// Cada usuário tem um `perfilId`; cada perfil tem `{ permissoes: { <funcKey>:
// "editar" | "visualizar" } }`. `nivelAcesso(perfil, k)` resolve o nível,
// caindo pro pai quando a chave é um submenu ("config.xxx") e só o pai
// ("config") tem valor definido — mesma função do Kit, portada sem mudança
// (é genérica, não tem nada de negócio específico).
//
// Adaptação de domínio (roteiro, seção 4: "o Kit vira especificação, não vira
// arquivo pra colar" quando a stack/domínio diverge): as chaves do Kit
// (entidadeA/entidadeB/clientes/financeiro/indicadores) foram trocadas pelas
// telas reais do MorfoFinP (resumo/situacao/lancamentos/carteira/planejamento
// + as 3 telas de configuração). `FUNCOES_PERFIL_N0` do Kit (auditoria,
// parâmetros com sub-itens de assinatura/marca/planos) foi reduzida a um
// esqueleto mínimo — o painel N0 real (com dado de tenant de verdade) só
// existe quando o backend for construído (Backlog #028); por ora
// `DevApp.tsx` é um placeholder que nem usa permissão de verdade ainda.
//
// Escopo desta rodada (Etapa 4): o MorfoFinP ainda não tem tela de Login nem
// cadastro de usuário (isso é Backlog #029/Etapa 8) — então, na prática, hoje
// só existe UM usuário implícito (Rafael, perfil "admin", tudo liberado). O
// módulo abaixo já fica pronto/testável pra quando isso existir, mas nada no
// app hoje BLOQUEIA nenhuma tela por permissão — seria prematuro gatear o uso
// diário do Rafael por um sistema de perfil que ainda não tem pra quem
// diferenciar.

export type NivelAcesso = 'editar' | 'visualizar' | null

export interface FuncaoPerfil {
  k: string
  l: string
  sub?: FuncaoPerfil[]
}

export interface PerfilAcesso {
  id: string
  nome: string
  fixo?: boolean
  permissoes: Record<string, 'editar' | 'visualizar' | 'nenhum'>
}

// Funcionalidades do ambiente logado (N1) — as 5 abas do rodapé + as 3 telas
// de configuração (Categorias e Grupos, Contas e carteiras, Manutenção) +
// dois itens que só existem quando as Etapas 5 e 8 do roteiro construírem o
// resto (usuários do tenant, minha assinatura) — presentes aqui só pra a
// forma do menu já nascer certa, sem função nenhuma ainda (nivelAcesso nunca
// é consultado pra eles nesta rodada).
export const FUNCOES_PERFIL_N1: FuncaoPerfil[] = [
  { k: 'resumo', l: 'Resumo' },
  { k: 'situacao', l: 'Situação' },
  { k: 'lancamentos', l: 'Lançamentos' },
  { k: 'carteira', l: 'Carteira' },
  { k: 'planejamento', l: 'Planejamento' },
  {
    k: 'config',
    l: 'Configurações',
    sub: [
      { k: 'config.categorias', l: 'Categorias e Grupos' },
      { k: 'config.contas', l: 'Contas e carteiras' },
      { k: 'config.manutencao', l: 'Manutenção' },
      { k: 'config.layout', l: 'Layout do rodapé' },
      // Ainda sem tela real — Backlog #029 (login/usuários) e #028 (assinatura, depende de backend).
      { k: 'config.usuarios', l: 'Usuários' },
      { k: 'config.minhaAssinatura', l: 'Minha Assinatura' },
    ],
  },
]

// Painel N0 (Morfo/dev) — reduzido ao mínimo nesta rodada: sem dado real de
// tenant (isso depende do backend, Backlog #028), então só existe a
// funcionalidade "início" (a lista-placeholder de tenants em DevApp.tsx).
export const FUNCOES_PERFIL_N0: FuncaoPerfil[] = [{ k: 'inicio', l: 'Início' }]

export function nivelAcesso(perfil: PerfilAcesso | null | undefined, k: string): NivelAcesso {
  if (!perfil?.permissoes) return 'editar'
  const v = perfil.permissoes[k]
  if (v) return v === 'nenhum' ? null : v
  const dot = k.indexOf('.')
  if (dot > 0) {
    const pai = perfil.permissoes[k.slice(0, dot)]
    return pai && pai !== 'nenhum' ? pai : null
  }
  return null
}

function permTodas(funcs: FuncaoPerfil[], nivel: 'editar' | 'visualizar'): Record<string, 'editar' | 'visualizar'> {
  const p: Record<string, 'editar' | 'visualizar'> = {}
  funcs.forEach((f) => {
    p[f.k] = nivel
  })
  return p
}

// Perfil padrão do ambiente logado (N1). "admin" é fixo (não editável/
// excluível, igual ao Kit) — é o único perfil realmente em uso hoje (Rafael).
// "membro" já fica pronto pro dia em que o MorfoFinP servir mais de uma
// pessoa na mesma base (ex.: casal dividindo as finanças) — visualiza tudo,
// não edita configuração — mas nenhuma tela consulta isso ainda nesta rodada.
export function perfisPadraoN1(): PerfilAcesso[] {
  return [
    { id: 'admin', nome: 'Administrador', fixo: true, permissoes: permTodas(FUNCOES_PERFIL_N1, 'editar') },
    { id: 'membro', nome: 'Membro', permissoes: permTodas(FUNCOES_PERFIL_N1, 'visualizar') },
  ]
}

export function perfisPadraoN0(): PerfilAcesso[] {
  return [{ id: 'admin', nome: 'Administrador', fixo: true, permissoes: permTodas(FUNCOES_PERFIL_N0, 'editar') }]
}

export function perfilDoUsuario(perfis: PerfilAcesso[], perfilId: string | undefined): PerfilAcesso {
  return perfis.find((p) => p.id === (perfilId || 'admin')) ?? perfis.find((p) => p.id === 'admin') ?? perfis[0]
}
