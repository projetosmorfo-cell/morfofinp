/* Os DOIS números da tela Hoje (13/09/2026 · reescritos na build 066).
 *
 * São duas perguntas, e nada além disso:
 *
 *   1 · LIVRE DE TUDO          "o que sobra depois de reservar TODAS as metas
 *                               do mês, usadas ou não". Se gastar, nada quebra.
 *
 *   2 · PODE SOBRAR DAS METAS  "o que as metas ainda não consumiram" — gasto e
 *                               guardar no mesmo número, com o estouro já
 *                               abatido. Tem dono; só não foi usado ainda.
 *
 * A CONTA:
 *
 *   podeSobrar(m) = (meta de gasto − gasto) + (meta de guardar ainda não usada)
 *   reservado(m)  = max(0, podeSobrar)
 *   saldoLivre(m) = caixa acumulado até m − reservado
 *
 * A identidade, que vale sempre e está escrita na tela:
 *
 *   Livre + Reservado = o que sobrou no caixa
 *   2.878,53 + 1.307,16 = 4.185,69      (base real, agosto/2026)
 *
 * POR QUE DEIXARAM DE SER TRÊS CAIXAS (14/09/2026, proposta aprovada pelo
 * Rafael). Ele leu "livre · economia de gasto · falta aportar" como três contas
 * soltas, e apontou as duas costuras que faltavam: *"não posso considerar que
 * tenho dinheiro pra gastar se já extrapolei outras metas"* — o estouro tem de
 * abater a sobra — e *"se eu não fiz aporte ainda, o valor da parte inteira em
 * teoria também é uma sobra"*. As duas juntas transformam as três caixas em
 * duas, sem mudar nenhum dado.
 *
 * O QUE ISSO REVOGA, em uma linha cada:
 *   • build 062 — a meta de guardar voltou para dentro do 2º total, mas agora
 *     com LINHA PRÓPRIA no detalhe ("falta aportar"), então deixar de aportar
 *     nunca aparece disfarçado de economia. A projeção (`projecao.ts`) segue
 *     sem o grupo de guardar: lá o número é o veredito de gasto, não de sobra.
 *   • build 063 — as três caixas viram duas. O piso em zero FICA (é ele que
 *     impede estourar a meta de AUMENTAR o livre); o que muda é o alcance dele.
 *
 * A régua do 2º total é o GRUPO, nunca a categoria — ver `LinhaGrupo`.
 *
 * ------------------------------------------------------------------
 * REGRA CRÍTICA — o Saldo Livre é ACUMULATIVO.
 *
 * O que sobrou do mês anterior entra no mês atual como além da meta; o que
 * faltou entra negativo. NÃO zera na virada. É essa regra que impede o número
 * de nascer sempre em zero para quem distribui 100% da renda em metas — que é
 * exatamente o caso do Rafael (50/30/20 = 100%).
 *
 * Medido na base real: em setembro/2026, sem acumular, o Saldo Livre daria
 * R$ 0,34 (a receita do mês é praticamente só o salário, e o salário inteiro
 * já está distribuído nas metas). Com a regra, dá R$ 4.186,03 — que é o
 * dinheiro que de fato sobrou dos meses anteriores e está no banco.
 *
 * ------------------------------------------------------------------
 * O QUE FICA FORA das duas contas (não é dinheiro do mês, é dinheiro mudando
 * de lugar):
 *
 *   • transferência entre contas próprias (as duas pernas);
 *   • pagamento de fatura (a despesa já entrou quando a compra foi feita);
 *   • natureza Neutro;
 *   • gasto do cofrinho PAGO PELO PRÓPRIO COFRINHO — baixa de estoque, o
 *     dinheiro já consumiu a meta quando foi aportado (ver src/orcamento.ts).
 */
import type { Categoria, Conta, GrupoRegistro, Lancamento, Meta, Natureza } from './db'
import { baseMetaDoMes, metaEmReais } from './baseMeta'
import {
  categoriaConsomeMeta,
  ehBaixaDeEstoqueDoCofre,
  idsDeCofre,
  lancamentoConsomeMeta,
} from './orcamento'
import { comportamentoDoGrupo } from './gruposUtil'

/** Naturezas que nunca são dinheiro entrando ou saindo do mês. */
const FORA_DO_FLUXO: Natureza[] = ['Pagamento de fatura', 'Transferência', 'Neutro']

export interface DoisNumeros {
  /** Dinheiro sem dono, acumulado. Pode ser negativo. */
  saldoLivre: number
  /** Meta de GASTO ainda não usada. Negativo = já estourou o plano do mês. */
  economiaPossivel: number
  /** Meta de GUARDAR ainda não aportada neste mês (nunca negativa). */
  faltaAportar: number
  /**
   * O 2º TOTAL da tela (build 066): tudo que as metas do mês ainda não
   * consumiram — gasto E guardar no mesmo número, com o estouro já abatido.
   * Negativo = o mês já passou das metas, e esse valor saiu do livre.
   */
  podeSobrar: number
  /** `max(0, podeSobrar)` — o que de fato ainda está reservado. */
  reservado: number
  /** Uma linha por grupo de saída: é a régua do 2º total. */
  porGrupo: LinhaGrupo[]
  /** Meta dos grupos de gasto (fixo + variável). */
  metaGasto: number
  /** Meta dos grupos de guardar (aporte/investimento). */
  metaGuardar: number
  /** Realizado dos grupos de gasto. */
  realizadoGasto: number
  /** Realizado dos grupos de guardar (o que foi aportado). */
  realizadoGuardar: number
  /** Meta total do mês (soma dos percentuais dos grupos de saída × base). */
  metaTotal: number
  /** Realizado do mês (só o que consome meta). */
  realizado: number
  /** Entradas do mês (receita), já sem transferência/fatura. */
  entradas: number
  /** Saídas do mês, já sem transferência/fatura/baixa de estoque. */
  saidas: number
  /** Sobrou no caixa SÓ neste mês (entradas − saídas). */
  resultadoDoMes: number
  /** Sobrou no caixa somando todos os meses até este. */
  caixaAcumulado: number
  /** false quando não há receita fixa marcada — o plano ainda não existe. */
  temPlano: boolean
}

/**
 * Uma linha do 2º total — sempre um GRUPO, nunca uma categoria (build 066).
 * A categoria é detalhe DENTRO do grupo; o total do mês é a soma daqui.
 */
export interface LinhaGrupo {
  nome: string
  /** 'guardar' = a diferença é "falta aportar"; os outros, sobra/estouro. */
  comportamento: 'fixo' | 'variavel' | 'guardar'
  /** Meta do grupo em R$: percentual cadastrado × base do mês. */
  meta: number
  /** Realizado do grupo (gasto ou aportado). */
  realizado: number
  /** `meta − realizado`. Em grupo de guardar nunca é negativo — ver o corpo. */
  diferenca: number
  /** Soma das metas das CATEGORIAS deste grupo — só para mostrar o descalibre. */
  metaCategorias: number
}

interface Contexto {
  categoriaPorId: ReadonlyMap<number, Categoria>
  contasCofre: ReadonlySet<number>
}

function ctx(categorias: readonly Categoria[], contas: readonly Conta[] | undefined): Contexto {
  const categoriaPorId = new Map<number, Categoria>()
  for (const c of categorias) if (c.id != null) categoriaPorId.set(c.id, c)
  return { categoriaPorId, contasCofre: idsDeCofre(contas) }
}

/** Este lançamento é dinheiro entrando ou saindo do mês de verdade? */
function contaNoFluxo(l: Lancamento, c: Contexto): boolean {
  if (l.transferenciaId != null) return false
  const cat = l.categoriaId == null ? undefined : c.categoriaPorId.get(l.categoriaId)
  if (!cat) return false
  if (FORA_DO_FLUXO.includes(cat.natureza)) return false
  // gasto pago pelo próprio cofrinho é baixa de estoque, não saída do mês
  if (ehBaixaDeEstoqueDoCofre(l, cat.natureza, c.contasCofre)) return false
  return true
}

function fluxoDoMes(lancamentos: readonly Lancamento[], mesISO: string, c: Contexto) {
  let entradas = 0
  let saidas = 0
  for (const l of lancamentos) {
    if (!l.dataCompetencia.startsWith(mesISO)) continue
    if (!contaNoFluxo(l, c)) continue
    if (l.valor > 0) entradas += l.valor
    else saidas += Math.abs(l.valor)
  }
  return { entradas, saidas }
}

export interface EntradaDoisNumeros {
  lancamentos: readonly Lancamento[]
  categorias: readonly Categoria[]
  contas: readonly Conta[] | undefined
  grupos: readonly GrupoRegistro[]
  metas: readonly Meta[]
  /** Mês da tela, `AAAA-MM`. */
  mesISO: string
}

export function calcularDoisNumeros(e: EntradaDoisNumeros): DoisNumeros {
  const { lancamentos, categorias, contas, grupos, metas, mesISO } = e
  const c = ctx(categorias, contas)

  /* --- meta e realizado, SEPARADOS por comportamento do grupo (13/09/2026).
   *
   * BUG REAL corrigido aqui. Até a build 062 a "Economia Possível" somava a
   * meta de TODOS os grupos de saída, o de guardar incluído. Como não aportar
   * reduz o realizado, deixar de guardar AUMENTAVA a economia — o contrário do
   * que o produto decidiu na build 057 ("não aportar não é economizar", e é por
   * isso que a projeção já excluía o grupo de guardar). Duas telas, duas
   * contas, para a mesma palavra.
   *
   * Medido em julho/2026: a tela dizia "o mês passou da meta em R$ 532,63"
   * enquanto o estouro de gasto era R$ 2.226,08 — os R$ 1.693,45 de aporte não
   * feito estavam mascarando a diferença.
   *
   * Agora são TRÊS caixas que somam o caixa acumulado, sem sobreposição:
   *   Falta aportar    meta de GUARDAR ainda não usada — tem destino certo
   *   Economia         meta de GASTO ainda não usada — pode virar economia
   *   Saldo Livre      o resto: dinheiro sem dono nenhum
   */
  const base = baseMetaDoMes(lancamentos as Lancamento[], categorias as Categoria[], mesISO)
  const deSaida = grupos.filter((g) => g.ativo !== false && g.tipo !== 'entrada')
  const pctDe = (nome: string) => metas.find((m) => m.grupo === nome)?.percentual ?? 0
  const ehGuardar = (g: GrupoRegistro) => comportamentoDoGrupo(g) === 'guardar'

  let metaGasto = 0
  let metaGuardar = 0
  for (const g of deSaida) {
    const m = metaEmReais(base, pctDe(g.nome))
    if (ehGuardar(g)) metaGuardar += m
    else metaGasto += m
  }
  const metaTotal = metaGasto + metaGuardar

  // --- realizado do mês (só o que consome meta), na mesma separação
  const grupoPorNome = new Map(deSaida.map((g) => [g.nome, g]))
  let realizadoGasto = 0
  let realizadoGuardar = 0
  const realizadoPorGrupo = new Map<string, number>()
  for (const l of lancamentos) {
    if (l.valor >= 0) continue
    if (!l.dataCompetencia.startsWith(mesISO)) continue
    const cat = l.categoriaId == null ? undefined : c.categoriaPorId.get(l.categoriaId)
    if (!cat) continue
    if (!lancamentoConsomeMeta(l, cat.natureza, c.contasCofre)) continue
    const g = cat.grupo ? grupoPorNome.get(cat.grupo) : undefined
    if (g) realizadoPorGrupo.set(g.nome, (realizadoPorGrupo.get(g.nome) ?? 0) + Math.abs(l.valor))
    if (g && ehGuardar(g)) realizadoGuardar += Math.abs(l.valor)
    else realizadoGasto += Math.abs(l.valor)
  }
  const realizado = realizadoGasto + realizadoGuardar

  const { entradas, saidas } = fluxoDoMes(lancamentos, mesISO, c)
  const resultadoDoMes = entradas - saidas

  // --- caixa acumulado: todo mês até o da tela, inclusive.
  // Percorre os lançamentos uma vez só; meses posteriores ao da tela não
  // entram (navegar para trás mostra o passado como ele era).
  let caixaAcumulado = 0
  for (const l of lancamentos) {
    if (l.dataCompetencia.slice(0, 7) > mesISO) continue
    if (!contaNoFluxo(l, c)) continue
    caixaAcumulado += l.valor > 0 ? l.valor : -Math.abs(l.valor)
  }

  /* Aporte que falta: nunca negativo — aportar A MAIS que a meta não é
     "economia negativa", é dinheiro que saiu do livre por escolha. O excedente
     já está fora do caixa, então ele se reflete sozinho no Saldo Livre. */
  /* --- a régua do 2º total: uma linha por grupo (build 066).
     A categoria virou detalhe DENTRO do grupo porque a tela misturava duas
     réguas para a mesma palavra "meta": o número de cima vinha do percentual
     do grupo e os cards de baixo da soma das metas de categoria. Medido em
     agosto/2026: as categorias do Variável somavam −10,86 enquanto o grupo
     dizia −470,26 — os 459,40 de diferença eram descalibre, não gasto. */
  const metaCategoriasDe = (nome: string) =>
    categorias
      .filter((cat) => cat.grupo === nome && categoriaConsomeMeta(cat.natureza))
      .reduce((s, cat) => s + (cat.aceitavelMensal || 0), 0)
  const porGrupo: LinhaGrupo[] = deSaida.map((g) => {
    /* `deSaida` já filtrou `tipo !== 'entrada'`, então `comportamentoDoGrupo`
       nunca devolve null aqui — o fallback existe só para o tipo. */
    const comportamento = comportamentoDoGrupo(g) ?? 'fixo'
    const meta = metaEmReais(base, pctDe(g.nome))
    const realizado = realizadoPorGrupo.get(g.nome) ?? 0
    return {
      nome: g.nome,
      comportamento,
      meta,
      realizado,
      /* Aportar A MAIS que a meta não é "falta aportar negativa": o excedente
         saiu do livre por escolha e já está fora do caixa. Nos grupos de
         gasto, o estouro é informação e continua negativo. */
      diferenca: comportamento === 'guardar' ? Math.max(0, meta - realizado) : meta - realizado,
      metaCategorias: metaCategoriasDe(g.nome),
    }
  })

  const faltaAportar = Math.max(0, metaGuardar - realizadoGuardar)
  const economiaPossivel = metaGasto - realizadoGasto
  /* O que está RESERVADO numa meta de gasto nunca é negativo: se a meta
     estourou, não sobrou nada reservado — sobrou zero. Sem esse piso, estourar
     a meta AUMENTAVA o Saldo Livre (o estouro entrava somado de volta), ou
     seja, o app dizia "você tem mais dinheiro livre" justamente no mês em que a
     pessoa gastou demais. Medido em julho/2026: dava R$ 2.899,39 quando o livre
     de verdade era R$ 673,31.
     O valor negativo continua sendo mostrado na tela — ele é o aviso de
     estouro, não uma caixa de dinheiro. */
  /* --- OS DOIS TOTAIS (build 066, proposta aprovada pelo Rafael em 14/09).
   *
   * Eram três caixas (livre · economia de gasto · falta aportar) e ele leu isso
   * como três contas soltas: "eu não posso considerar que tenho dinheiro pra
   * gastar se já extrapolei outras metas" e "se eu não fiz aporte ainda, o
   * valor da parte inteira em teoria também é uma sobra".
   *
   * Então o 2º total passou a ser UM número: o que as metas do mês ainda não
   * consumiram, gasto e guardar juntos, com o estouro já abatido. E o 1º
   * continua sendo o resto do caixa.
   *
   *   podeSobrar = (meta de gasto − gasto) + (meta de guardar ainda não usada)
   *   reservado  = max(0, podeSobrar)
   *   livre      = caixa acumulado − reservado
   *
   * O PISO EM ZERO FICA, e é ele que mantém de pé a correção da build 063:
   * um mês que estourou não tem reserva negativa, e estourar a meta nunca pode
   * AUMENTAR o livre. O que muda em relação à 063 é o alcance do piso — antes
   * ele valia só para a parte de gasto, e o aporte não feito continuava
   * reservado mesmo num mês cujo plano já tinha rompido. Medido: em julho/2026
   * a tela mostrava R$ 673,31 de livre quando o caixa inteiro (R$ 2.366,76) já
   * não tinha mais nada reservado em cima. Nos meses sem estouro (agosto e
   * setembro/2026) o número não muda em um centavo.
   *
   * A identidade passou de três termos para dois:
   *     Livre + Reservado = caixa acumulado
   *     2.878,53 + 1.307,16 = 4.185,69   (agosto/2026)
   */
  const podeSobrar = economiaPossivel + faltaAportar
  const reservado = Math.max(0, podeSobrar)
  return {
    saldoLivre: caixaAcumulado - reservado,
    podeSobrar,
    reservado,
    porGrupo,
    economiaPossivel,
    faltaAportar,
    metaGasto,
    metaGuardar,
    metaTotal,
    realizado,
    realizadoGasto,
    realizadoGuardar,
    entradas,
    saidas,
    resultadoDoMes,
    caixaAcumulado,
    temPlano: base > 0,
  }
}

/* ===================================================================
   OS TEXTOS — a frase muda junto com o sinal do número
   =================================================================== */

/* As frases mudam quando o mês JÁ TERMINOU (13/09/2026). Num mês fechado não
   existe "se não gastar" nem "daqui pra frente": não há mais frente. O que
   sobrou da meta virou economia de verdade, e o que faltou já foi embora pro
   mês seguinte. Era isso que o Rafael leu como confuso ao abrir agosto em
   setembro — o número certo com o verbo no tempo errado. */
export function fraseSaldoLivre(v: number, mesFechado = false): string {
  if (mesFechado) {
    if (v > 0.005) return 'Foi o que sobrou livre e seguiu pro mês seguinte.'
    if (v >= -0.005) return 'O mês fechou sem sobra livre.'
    return 'O mês fechou no vermelho — esse valor foi junto pro mês seguinte.'
  }
  if (v > 0.005) return 'Esse dinheiro não tem dono, pode gastar.'
  if (v >= -0.005) return 'Tudo que entra já tem destino.'
  return 'Passou do livre. Este valor vai junto pro mês que vem — corte um gasto ou ajuste a meta.'
}

/** A frase do 2º total (build 066). Negativo não é "economia negativa". */
export function frasePodeSobrar(v: number, mesFechado = false): string {
  if (mesFechado) {
    if (v > 0.005) return 'Foi o que as metas do mês não chegaram a consumir.'
    if (v >= -0.005) return 'As metas do mês foram usadas por inteiro.'
    return 'O mês passou das metas nesse valor — ele saiu do seu livre.'
  }
  if (v > 0.005) return 'O que as metas ainda não consumiram, com o estouro já abatido.'
  if (v >= -0.005) return 'As metas do mês já foram usadas por inteiro.'
  return 'Você já passou das metas nesse valor — ele saiu do seu livre.'
}

export const EXPLICACAO_PODE_SOBRAR =
  'É tudo que as metas deste mês ainda não consumiram — o teto de gasto que sobrou MAIS o que ainda ' +
  'falta aportar —, já descontando o que estourou. Se você não gastar, vira economia. Se ficar ' +
  'negativo, o mês passou das metas e esse valor saiu do seu livre.'

export function fraseEconomiaPossivel(v: number, mesFechado = false): string {
  if (mesFechado) {
    if (v > 0.005) return 'Foi o quanto da meta não chegou a ser usado.'
    if (v >= -0.005) return 'A meta foi usada por inteiro.'
    return 'O mês passou da meta nesse valor.'
  }
  if (v > 0.005) return 'Se não gastar, isso vira economia.'
  return 'A meta acabou. Daqui pra frente é no vermelho.'
}

/** O rótulo do 2º número muda com o tempo verbal: possível × já realizada. */
export function rotuloEconomia(mesFechado: boolean): string {
  return mesFechado ? 'ECONOMIA DO MÊS' : 'ECONOMIA POSSÍVEL'
}

export const EXPLICACAO_SALDO_LIVRE =
  'É o que sobra depois de tirar tudo que já saiu, tudo que está comprometido e tudo que está reservado nas suas metas. ' +
  'Não zera na virada do mês: o que sobrou vem junto pro mês seguinte, e o que faltou vem negativo.'

export const EXPLICACAO_ECONOMIA_POSSIVEL =
  'É a meta de GASTO deste mês que ainda não foi usada. Não inclui o que você separa para guardar — ' +
  'esse valor tem linha própria, porque deixar de guardar não é economizar.'

export const EXPLICACAO_FALTA_APORTAR =
  'É a meta dos grupos de guardar/investir que ainda não foi aportada neste mês. ' +
  'O dinheiro ainda está na conta, mas já tem destino: o cofre.'

/** A frase que amarra os dois totais — uma linha, sempre a mesma forma. */
export const EXPLICACAO_IDENTIDADE =
  'O que está livre mais o que está reservado nas metas somam exatamente o que sobrou no seu caixa ' +
  'até aqui. Não existe um terceiro lugar.'
