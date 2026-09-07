// Modelo de negócio Completo (05/09/2026, Roteiro de Parametrização Morfo,
// Etapa 5) — adaptado de `ContratarPacoteFlow`/`MinhaAssinaturaView`/
// `TrocarPlanoSheet` do Kit de Estrutura Mínima.
//
// PLACEHOLDER, não catálogo real: nome, preço e lista de funcionalidades de
// cada plano abaixo são INVENTADOS só pra validar o FLUXO (ver plano atual,
// trocar de plano, encerrar) — o Rafael nunca definiu preço/plano de
// verdade pro MorfoFinP em nenhum documento do Project. Isso é consistente
// com a Decisão 6 (front-end primeiro, backend depois): sem backend real,
// não existe cobrança de verdade de qualquer forma, então o conteúdo exato
// dos planos pode — e deve — ser definido depois, quando o Backlog #028
// (backend real) entrar em pauta. Nenhuma tela aqui cobra nada de verdade.
export interface Plano {
  id: string
  nome: string
  valorMensal: number
  destaque?: boolean
  funcionalidades: string[]
}

export const PLANOS_STUB: Plano[] = [
  {
    id: 'essencial',
    nome: 'Essencial (placeholder)',
    valorMensal: 0,
    funcionalidades: ['Resumo, Situação, Lançamentos, Carteira, Planejamento', 'Categorias e contas ilimitadas'],
  },
  {
    id: 'completo',
    nome: 'Completo (placeholder)',
    valorMensal: 0,
    destaque: true,
    funcionalidades: [
      'Tudo do Essencial',
      'Layout do rodapé personalizável',
      'Suporte prioritário (quando existir canal de suporte de verdade)',
    ],
  },
]

export function planoPorId(id: string | undefined): Plano | undefined {
  return PLANOS_STUB.find((p) => p.id === id)
}

export function planoPadrao(): Plano {
  return PLANOS_STUB.find((p) => p.destaque) ?? PLANOS_STUB[0]
}
