import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'
import { planoPorId, planoPadrao, type Plano } from './planos'

// Hook fino, mesmo padrão de `useModoVisao`/`useOrdemAbas` em
// `configuracaoIcones.ts` — singleton `db.configuracoes`, sem bump de
// schema. Vive em `src/kit/` (não em `configuracaoIcones.ts`) porque é
// especificamente do Modelo de negócio Completo (Etapa 5), não de
// preferência visual do app.
export function usePlanoAtual(): Plano {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  return planoPorId(config?.planoId) ?? planoPadrao()
}

// Reaproveita `salvarConfiguracaoIcones` (grava parcial, preserva os demais
// campos do singleton) em vez de duplicar a lógica de "ler o atual, aplicar
// os defaults, gravar de volta" já resolvida lá.
export async function salvarPlanoId(planoId: string) {
  await salvarConfiguracaoIcones({ planoId })
}
