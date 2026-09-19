/* Pagamento de fatura — o lado que GRAVA (build 090, 17/09/2026).

   Decisão do Rafael nesta build: a fatura só é paga pelo botão "Pagar esta
   fatura" da Carteira, que abre a tela de lançamento já preenchida (cartão,
   fatura, saída, valor, categoria). A tela de lançamento NÃO oferece mais
   "Cartão desta fatura / Mês da fatura" nem deixa escolher à mão a categoria
   "Pagamento de fatura". Cada pagamento carrega `faturaCartaoId` + `faturaMes`
   (ver `db.ts`), e é isso que permite:

   - "Fatura ainda não paga" DESCONTAR o que já foi pago;
   - pagar uma PARTE sem quitar a fatura inteira;
   - editar um pagamento (inclusão = edição, mesma tela) e a fatura refletir.

   A leitura (quanto falta, se está quitada) mora em `faturaCiclo.ts`
   (`situacaoDaFatura`). Aqui ficam só as duas escritas: marcar os filhos
   quando a fatura fecha a conta, e vincular pagamentos antigos. */
import { db, type Lancamento } from './db'
import { DIA_FECHAMENTO_PADRAO, mesFaturaDoLancamento, situacaoDaFatura } from './faturaCiclo'

/** Reavalia a fatura `cartaoId`+`mesISO` depois de gravar/editar/excluir um
 *  pagamento. Algum real pago (mesmo que não quite o ciclo inteiro) → todo
 *  item do ciclo vira `pago: true` com `faturaId` apontando pro ÚLTIMO
 *  pagamento. Nenhum pagamento ainda → não mexe em item nenhum (marcar
 *  `pago` à mão continua sendo escolha da pessoa nesse caso).
 *
 *  Build 104 (19/09/2026), pedido do Rafael: "independente do valor pago se
 *  100% ou qualquer valor da fatura maior que 0 deve dar baixa nos
 *  lançamentos como pago daquela fatura" — o gatilho de "dar baixa" deixa de
 *  esperar `s.quitada` (100% do ciclo) e passa a valer a partir do PRIMEIRO
 *  real pago (`s.pago > 0`), reversão deliberada da build 090/Decisão 121
 *  ("pagar uma parte não quita nada"). Isso muda só a ETIQUETA visual de cada
 *  compra do ciclo (Pago/A pagar em `statusPagamento.ts`) — a MATEMÁTICA da
 *  fatura (`total`/`pago`/`restante`/`residuoAnterior` em
 *  `situacaoDaFatura`) nunca olhou pra esse flag e continua exata, somando
 *  os valores reais. Consequência aceita e deliberada: como não existe hoje
 *  um passo que DESFAZ essa baixa em massa (nenhum caminho do app reverte
 *  `pago`/`faturaId` dos itens se o pagamento for depois excluído ou
 *  reduzido — mesma lacuna que já existia pro caso de 100%, só que agora
 *  disparada mais cedo), editar pra menos ou apagar um pagamento parcial não
 *  desmarca as compras já baixadas; corrigir isso, se um dia for preciso, é
 *  decisão nova, separada desta. */
export async function reavaliarQuitacao(cartaoId: number, mesISO: string): Promise<{ quitada: boolean; restante: number }> {
  const [cartao, categorias, todos] = await Promise.all([
    db.contas.get(cartaoId),
    db.categorias.toArray(),
    db.lancamentos.toArray(),
  ])
  if (!cartao) return { quitada: false, restante: 0 }
  const porId = new Map(categorias.map((c) => [c.id!, c]))
  const s = situacaoDaFatura(todos, porId, cartao, mesISO)
  if (s.pago > 0) {
    const ultimo = s.pagamentos[s.pagamentos.length - 1]
    const pendentes = s.itens.filter((l) => l.pago !== true || l.faturaId !== ultimo.id)
    /* Build 101 (Decisão 121) — bug real reportado pelo Rafael: pagar a
       DIFERENÇA de uma fatura paga a menor (a 2ª escrita que finalmente
       quita o ciclo) travava em "Salvando" — o lançamento gravava (confirmado
       ao reabrir o app), mas a tela ficava presa. Causa mais provável: esta
       função disparava UM `db.lancamentos.update` por item pendente — pra um
       ciclo com muitas compras, dezenas de escritas separadas, cada uma
       notificando sozinha TODO `liveQuery` do app (Carteira, cache de cartão,
       notificações, filtros…), em cascata. Numa fatura recém-aberta (poucos
       itens) isso nem aparece; numa quitação de ciclo cheio, sim. Trocado por
       UMA escrita só (`where(...).modify(...)`, mesmo idioma já usado em
       `alternarPago`/`lancamentosUtil.ts`): uma transação, uma notificação. */
    if (pendentes.length > 0) {
      await db.lancamentos
        .where('id')
        .anyOf(pendentes.map((l) => l.id!))
        .modify({ pago: true, faturaId: ultimo.id })
    }
  }
  return { quitada: s.quitada, restante: s.restante }
}

/** Pagamentos gravados ANTES da build 090 não dizem qual fatura pagam — só
 *  os filhos apontam pra eles (`faturaId`). Deduz cartão+mês a partir do
 *  primeiro filho e grava. Idempotente e barato (roda a cada abertura e
 *  depois de restaurar backup): quem já tem os dois campos é pulado. Um
 *  pagamento sem filho nenhum (ex.: gravado pela tela de lançamento numa
 *  categoria comum) fica como está — não há de onde deduzir. */
export async function vincularPagamentosAntigos(): Promise<number> {
  try {
    const [categorias, contas, todos] = await Promise.all([
      db.categorias.toArray(),
      db.contas.toArray(),
      db.lancamentos.toArray(),
    ])
    const naturezaPorCat = new Map(categorias.map((c) => [c.id!, c.natureza]))
    const contaPorId = new Map(contas.map((c) => [c.id!, c]))
    const semVinculo = todos.filter(
      (l) => naturezaPorCat.get(l.categoriaId) === 'Pagamento de fatura' && (l.faturaCartaoId == null || !l.faturaMes),
    )
    if (semVinculo.length === 0) return 0
    const filhosPorPagamento = new Map<number, Lancamento[]>()
    for (const l of todos) {
      if (l.faturaId == null) continue
      const lista = filhosPorPagamento.get(l.faturaId) ?? []
      lista.push(l)
      filhosPorPagamento.set(l.faturaId, lista)
    }
    let n = 0
    for (const p of semVinculo) {
      const filhos = filhosPorPagamento.get(p.id!) ?? []
      const filho = filhos.find((f) => contaPorId.get(f.contaId)?.tipo === 'cartao')
      if (!filho) continue
      const cartao = contaPorId.get(filho.contaId)!
      const mes = mesFaturaDoLancamento(cartao.diaFechamento ?? DIA_FECHAMENTO_PADRAO, filho)
      await db.lancamentos.update(p.id!, { faturaCartaoId: cartao.id, faturaMes: mes })
      n++
    }
    return n
  } catch {
    return 0
  }
}
