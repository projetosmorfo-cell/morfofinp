import { db, type Lancamento } from './db'

// Alternar status de pagamento clicando direto na tarja (sem abrir o
// formulário de edição) — 31/08/2026, rodada seguinte. Antes disso, cada
// tela tinha sua própria função inline fazendo só `db.lancamentos.update(id,
// {pago: !atual})`, o que nunca sincronizava as duas pernas de uma
// transferência (só `DetalheLancamento.tsx`, ao SALVAR o formulário, fazia
// isso). Bug real reportado pelo Rafael: clicar na tarja de um lado da
// transferência deixava o outro lado "manco" (com status diferente do par).
// Função única, usada em toda lista de lançamento do app (Lançamentos,
// categoria expandida, Carteira) — ponto único de verdade pra esse
// comportamento, em vez de reimplementar em cada tela.
export async function alternarPago(l: Pick<Lancamento, 'id' | 'pago' | 'transferenciaId'>): Promise<void> {
  if (l.id == null) return
  const novoPago = !(l.pago !== false)
  if (l.transferenciaId) {
    await db.lancamentos.where('transferenciaId').equals(l.transferenciaId).modify({ pago: novoPago })
  } else {
    await db.lancamentos.update(l.id, { pago: novoPago })
  }
}

// Item 12 (15/09/2026) — desempate de ordenação DENTRO do mesmo dia: usada
// depois de comparar por `dataCompetencia` (crescente ou decrescente,
// conforme o botão de ordenação da tela) — a ordem dentro de um dia nunca
// inverte com esse botão, só a ordem dos PRÓPRIOS dias. `ordemManual` (ver
// `db.ts`) vem do arrasto de press-and-hold em Lançamentos; sem ele, cai no
// `id` (auto-incremento do Dexie), que é uma proxy estável e simples pra
// "ordem de criação" — mesma estratégia já documentada no projeto pra outros
// casos de "sem preferência explícita, usa quando foi criado".
export function compararDentroDoDia(
  a: Pick<Lancamento, 'id' | 'ordemManual'>,
  b: Pick<Lancamento, 'id' | 'ordemManual'>,
): number {
  if (a.ordemManual != null && b.ordemManual != null) return a.ordemManual - b.ordemManual
  if (a.ordemManual != null) return -1
  if (b.ordemManual != null) return 1
  return (a.id ?? 0) - (b.id ?? 0)
}
