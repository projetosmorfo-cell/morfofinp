import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'
import { usePlanoPorId, usePlanoPadrao, type Plano } from './planos'

// Hook fino, mesmo padrão de `useModoVisao`/`useOrdemAbas` em
// `configuracaoIcones.ts` — singleton `db.configuracoes`, sem bump de
// schema. Vive em `src/kit/` (não em `configuracaoIcones.ts`) porque é
// especificamente do Modelo de negócio Completo (Etapa 5), não de
// preferência visual do app.
export function usePlanoAtual(): Plano | undefined {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  const doId = usePlanoPorId(config?.planoId)
  const padrao = usePlanoPadrao()
  return doId ?? padrao
}

// Reaproveita `salvarConfiguracaoIcones` (grava parcial, preserva os demais
// campos do singleton) em vez de duplicar a lógica de "ler o atual, aplicar
// os defaults, gravar de volta" já resolvida lá.
export async function salvarPlanoId(planoId: number) {
  await salvarConfiguracaoIcones({ planoId })
}
