import { db, type Natureza } from './db'
import { lerDoAmbiente, marcaDoAmbiente } from './ambiente'

// Categorias "de sistema" — usadas internamente por ações do app (transferência
// entre contas, pagamento de fatura), não cadastradas manualmente pelo Rafael
// em Categorias, mas com natureza pensada pra já ficar de fora dos cálculos
// certos (ver ResumoDoMes.tsx: 'Pagamento de fatura' e 'Transferência' são
// excluídas de Entrou/Saiu — é movimento de caixa entre lugares, não receita/
// despesa real). `seed.ts` já cria "Pagamento de fatura" (natureza homônima);
// "Transferência entre contas" é nova nesta rodada. As duas funções abaixo
// acham a categoria existente pelo nome ou criam na hora, se por algum motivo
// não existir ainda — nunca falha silenciosamente, sempre devolve um id
// válido pra usar no `categoriaId` do lançamento.
async function obterOuCriarCategoriaPorNome(nome: string, natureza: Natureza): Promise<number> {
  const existente = (await lerDoAmbiente(db.categorias.where('nome').equals(nome).toArray()))[0]
  if (existente) return existente.id!

  const grupos = await lerDoAmbiente(db.grupos.toArray())
  const grupoPadrao = grupos.find((g) => g.nome === 'Fixo' && g.ativo) ?? grupos.find((g) => g.ativo) ?? grupos[0]
  const nomeGrupo = grupoPadrao?.nome ?? 'Fixo'
  if (!grupoPadrao) {
    await db.grupos.add({ nome: nomeGrupo, ativo: true, ...marcaDoAmbiente() })
  }

  const novoId = await db.categorias.add({
    ...marcaDoAmbiente(),
    nome,
    grupo: nomeGrupo,
    natureza,
    aceitavelMensal: 0,
    ativa: true,
  })
  return novoId!
}

// Categoria "Transferência entre contas" — não é mais atribuída automaticamente
// (31/08/2026, rodada seguinte, ponto 3 do feedback): a partir desta rodada o
// Rafael escolhe a categoria de cada perna da transferência livremente, igual
// a um lançamento comum, então essa categoria de sistema virou só mais um
// item na lista (continua existindo pra quem já a usou, e pode ser escolhida
// de novo por quem quiser, mas `DetalheLancamento.tsx` não a força mais).
// Função mantida por completude/histórico — sem chamador ativo no momento.
export function obterOuCriarCategoriaTransferencia(): Promise<number> {
  return obterOuCriarCategoriaPorNome('Transferência entre contas', 'Transferência')
}

// Reaproveita a categoria "Pagamento de fatura" já semeada (ver seed.ts) —
// só cria de novo se por algum motivo o cadastro não existir mais (defensivo).
export function obterOuCriarCategoriaPagamentoFatura(): Promise<number> {
  return obterOuCriarCategoriaPorNome('Pagamento de fatura', 'Pagamento de fatura')
}
