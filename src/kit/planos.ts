import { useLiveQuery } from 'dexie-react-hooks'
import { db, type PlanoRegistro } from '../db'

// Modelo de negócio Completo (05/09/2026, Etapa 5) — migrado de array TS
// fixo (`PLANOS_STUB`) pra tabela Dexie de verdade em 08/09/2026 (G59,
// "Gerenciar Planos" é item aprovado pro N0: precisa ser tela real e
// funcional, não só exibição — ver `db.ts`/`PlanoRegistro` e
// `src/kit/DevApp.tsx` → Parâmetros → Gerenciar Planos).
//
// PLACEHOLDER, não catálogo real: nome, preço e funcionalidades continuam
// INVENTADOS só pra validar o FLUXO — o Rafael nunca definiu preço/plano de
// verdade. Isso não muda com esta rodada: só QUEM edita mudou (painel N0
// em vez de mexer em código), não a natureza do dado.
export type Plano = PlanoRegistro

// Hook de leitura — usado tanto pelo N1 (Minha Assinatura, Planos do site)
// quanto pelo painel N0 (lista de gerenciamento). Só planos `ativo: true`
// pra quem consome como catálogo (N1); o painel N0 usa `useTodosPlanos()`
// abaixo, que também mostra os descontinuados (pra reativar/editar).
export function usePlanos(): Plano[] {
  const planos = useLiveQuery(() => db.planos.toArray(), [])
  return (planos ?? []).filter((p) => p.ativo)
}

export function useTodosPlanos(): Plano[] {
  const planos = useLiveQuery(() => db.planos.toArray(), [])
  return planos ?? []
}

export function usePlanoPorId(id: number | undefined): Plano | undefined {
  const planos = useTodosPlanos()
  return planos.find((p) => p.id === id)
}

export function usePlanoPadrao(): Plano | undefined {
  const planos = usePlanos()
  return planos.find((p) => p.destaque) ?? planos[0]
}

export async function criarPlano(dados: Omit<PlanoRegistro, 'id'>) {
  return db.planos.add(dados)
}

export async function atualizarPlano(id: number, patch: Partial<Omit<PlanoRegistro, 'id'>>): Promise<void> {
  await db.planos.update(id, patch)
}

// Nunca exclui de verdade um plano que algum tenant já usou (o `planoId`
// gravado em `configuracoes` viraria uma referência quebrada) — "excluir"
// aqui é sempre inativar (`ativo: false`), reversível. Exclusão física só
// faz sentido pra um plano recém-criado, então não existe função separada:
// inativar cobre o caso real com segurança.
export async function inativarPlano(id: number): Promise<void> {
  await db.planos.update(id, { ativo: false })
}

export async function reativarPlano(id: number): Promise<void> {
  await db.planos.update(id, { ativo: true })
}
