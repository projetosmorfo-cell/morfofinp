/* O NÚMERO DE CADA LUGAR DA CARTEIRA — uma função só (build 094, 17/09/2026).
 *
 * Pedido do Rafael, com print: *"os números de fora das carteiras não estão
 * batendo com os de dentro, os de fora estão errados, devem mostrar o total
 * que tem dentro."*
 *
 * O QUE ESTAVA ACONTECENDO (medido na base dele, setembro/2026):
 *
 *   • Bradesco — card de fora "Saldo atual" R$ 19.383,04, drill-in "Total
 *     acumulado" R$ 17.380,07. Os dois estavam certos pela sua PRÓPRIA
 *     definição e discordavam por construção: o card cortava em HOJE e o
 *     drill-in ia até o FIM DO MÊS da tela. A diferença de R$ 2.002,97 eram
 *     as quatro contas de setembro ainda a vencer (Faxina, Unimed, INSS,
 *     Imposto CNPJ). Dois números, dois nomes parecidos, mesma tela.
 *
 *   • Porto Seguro — o card mostrava "Fatura até o momento" (do último
 *     fechamento até hoje) e o drill-in "Total da fatura" (o ciclo inteiro do
 *     mês). De novo: recortes diferentes, nomes parecidos.
 *
 *   • Cofrinho — o card fazia |aportes| − |gastos| = −R$ 4.565,15 e o
 *     drill-in somava os valores crus (todos negativos, porque um aporte SAI
 *     da conta corrente) = −R$ 11.249,95. Aqui não era só recorte: eram duas
 *     CONVENÇÕES DE SINAL na mesma tela.
 *
 * A REGRA QUE PASSA A VALER: o card e o fechamento da lista saem DESTA função.
 * Um lugar, um número, um recorte — o mês selecionado, sempre, para todo tipo
 * de lugar. Quem for criar um tipo de conta novo entra aqui, não numa conta
 * própria na tela.
 *
 * BUILD 099 (18/09/2026) — DOIS TOTAIS POR LUGAR, pedido do Rafael: "o card
 * da carteira referente ao banco e os demais, inclusive cofrinho, devem
 * mostrar 2 totais: o real baseado em lançamentos já executados (pago,
 * recebido) e outro de executados + comprometido (a pagar, a receber), esse
 * com menor destaque". Então `TotalDoLugar` ganhou `real` — o número que
 * conta só o que JÁ ACONTECEU (a regra `jaAconteceu` do app inteiro, a mesma
 * da tela Hoje e do Planejamento) — e `valor` continua sendo o que sempre
 * foi: executado + comprometido. No cartão, `real` é o que já aconteceu no
 * ciclo (compra com data até hoje) e `valor` o ciclo inteiro; o recorte do
 * cartão é a FATURA que fecha no mês selecionado, e a janela dela vem junto
 * (`janela`), pro card dizer "de x até y".
 *
 * O SINAL DO COFRINHO: dentro do cofrinho, um APORTE é entrada — o dinheiro
 * saiu da conta corrente e chegou aqui. É o mesmo lançamento visto de dois
 * lugares: −835,60 na lista do Bradesco, +835,60 na lista do Cofrinho. Por
 * isso `lancamentosDoCofrinhoVirtual()` devolve uma CÓPIA com o sinal do
 * aporte invertido — assim a lista, o fechamento, os filtros e o card contam
 * a mesma história. A cópia é só de exibição: editar ou excluir continua
 * indo pelo `id`, que busca o registro de verdade no banco.
 */
import type { Categoria, Conta, Lancamento } from './db'
import { situacaoDaFatura } from './faturaCiclo'
import { jaAconteceu } from './statusPagamento'

/** Último dia do mês, em ISO — o fim da janela de todo lugar que não é cartão. */
function fimDoMes(mesISO: string): string {
  const [ano, mes] = mesISO.split('-').map(Number)
  return `${mesISO}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`
}

export interface TotalDoLugar {
  /** O que o número é, em uma expressão — a mesma no card e no fechamento. */
  rotulo: string
  /** Executado + comprometido (o número de sempre). */
  valor: number
  /** Só o que já aconteceu (pago/recebido/no cartão) — o número em destaque. */
  real: number
  /** Quanto havia antes do mês começar (só onde faz sentido acumular). */
  saldoAnterior?: number
  /** Idem, só com o que já aconteceu. */
  saldoAnteriorReal?: number
  /** O movimento do próprio mês. */
  doMes: number
  /** Só no cartão: a janela do ciclo que fecha no mês selecionado. */
  janela?: { inicio: string; fim: string }
}

/**
 * O número de um lugar da carteira no mês escolhido.
 *
 * @param conta        a conta; `undefined` = o cofrinho virtual (soma por natureza).
 * @param lancamentos  os lançamentos DAQUELE lugar, já filtrados — e, no
 *                     cofrinho virtual, já com o sinal do aporte invertido
 *                     (ver `lancamentosDoCofrinhoVirtual`).
 */
export function totalDoLugar(
  conta: Conta | undefined,
  lancamentos: readonly Lancamento[],
  mesISO: string,
  todosLancamentos: readonly Lancamento[],
  categoriaPorId: ReadonlyMap<number, Categoria>,
): TotalDoLugar {
  if (conta?.tipo === 'cartao') {
    /* Cartão não acumula saldo: o modelo nunca credita o cartão (o pagamento
       mora na conta que paga). O número dele é a fatura do ciclo — a MESMA
       que o card de quitação mostra (`situacaoDaFatura`, build 090/093). */
    /* A busca de categoria entra como FUNÇÃO, não como Map: aqui o mapa é
       `ReadonlyMap` de propósito (esta função não escreve nada), e o tipo
       `Map` que `situacaoDaFatura` aceita pediria a versão mutável. */
    const f = situacaoDaFatura(
      todosLancamentos as Lancamento[],
      (id) => categoriaPorId.get(id),
      conta,
      mesISO,
    )
    return { rotulo: 'Total da fatura', valor: f.total, real: f.realizado, doMes: f.total, janela: f.janela }
  }
  const fim = fimDoMes(mesISO)
  const inicio = `${mesISO}-01`
  const soma = (lista: readonly Lancamento[]) => lista.reduce((s, l) => s + l.valor, 0)
  const antes = lancamentos.filter((l) => l.dataCompetencia < inicio)
  const noMes = lancamentos.filter((l) => l.dataCompetencia >= inicio && l.dataCompetencia <= fim)
  const base = conta?.saldoInicial ?? 0
  const anterior = base + soma(antes)
  const anteriorReal = base + soma(antes.filter(jaAconteceu))
  const doMes = soma(noMes)
  const doMesReal = soma(noMes.filter(jaAconteceu))
  return {
    rotulo: 'Total acumulado',
    valor: anterior + doMes,
    real: anteriorReal + doMesReal,
    saldoAnterior: anterior,
    saldoAnteriorReal: anteriorReal,
    doMes,
  }
}

/**
 * Build 100 (18/09/2026) — ANCORAR o total no último saldo INFORMADO, quando
 * existe. Pedido do Rafael, com print: o card do Cofrinho mostrava "Total
 * real" pelos lançamentos (R$ 3.342,40) mesmo logo depois de ele informar
 * R$ 6.110,44 — *"deveria mostrar o total = o lançamento que eu fiz"*. A
 * diferença entre os dois normalmente NÃO é erro: é rendimento — o cofrinho
 * nunca lança rendimento (ver cabeçalho de `SaldoDoCofrinho.tsx`), então ele
 * só entra no app quando a pessoa confere o saldo real e informa.
 *
 * O modelo que o Rafael descreveu é o de uma conta corrente de verdade:
 * saldo-base + os lançamentos de depois. Só que aqui a "data inicial" não é
 * fixa (`conta.saldoInicial`, só na criação) — é o último informe, atualizado
 * toda vez que ele confere. Por isso: `real` = informado + o que aconteceu
 * DEPOIS da data do informe (só o já realizado); `valor` (com comprometido) =
 * informado + tudo que está lançado depois dele, realizado ou não.
 *
 * `saldoAnterior`/`saldoAnteriorReal`/`doMes` NÃO mudam aqui — continuam a
 * leitura pura do razão (quanto o mês moveu), que é outra pergunta.
 *
 * Só ancora quando o informe é de ANTES OU DENTRO do mês olhado — abrir um
 * mês anterior ao informe não pode herdar um saldo que não existia ainda
 * naquela época; nesse caso o total volta a ser o puro cálculo pelos
 * lançamentos (o `total` recebido, sem alteração).
 */
export function ancorarNoInformado(
  total: TotalDoLugar,
  lancamentos: readonly Lancamento[],
  checkpoint: { data: string; valor: number } | null | undefined,
  mesISO: string,
): TotalDoLugar {
  if (!checkpoint) return total
  const fim = fimDoMes(mesISO)
  if (checkpoint.data > fim) return total
  const soma = (lista: readonly Lancamento[]) => lista.reduce((s, l) => s + l.valor, 0)
  // Lançamentos do MESMO DIA do informe contam como já refletidos nele (foi
  // conferido "hoje" — o que já está lançado hoje já estava lá quando ele
  // olhou o saldo no banco); só o que é de DEPOIS desse dia soma por cima.
  const depois = lancamentos.filter((l) => l.dataCompetencia > checkpoint.data && l.dataCompetencia <= fim)
  return {
    ...total,
    real: checkpoint.valor + soma(depois.filter(jaAconteceu)),
    valor: checkpoint.valor + soma(depois),
  }
}

/**
 * Os lançamentos do COFRINHO VIRTUAL, com o sinal na convenção do cofrinho:
 * aporte entra (+), gasto do cofrinho sai (−). Ver o cabeçalho do arquivo.
 */
export function lancamentosDoCofrinhoVirtual(
  todosLancamentos: readonly Lancamento[],
  categoriaPorId: ReadonlyMap<number, Categoria>,
): Lancamento[] {
  const out: Lancamento[] = []
  for (const l of todosLancamentos) {
    const n = l.categoriaId == null ? undefined : categoriaPorId.get(l.categoriaId)?.natureza
    if (n === 'Aporte') out.push({ ...l, valor: Math.abs(l.valor) })
    else if (n === 'Gasto de cofrinho') out.push({ ...l, valor: -Math.abs(l.valor) })
  }
  return out
}
