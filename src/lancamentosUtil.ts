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
