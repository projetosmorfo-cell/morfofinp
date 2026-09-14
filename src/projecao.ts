/* Projeção de fechamento do mês — a frase do veredito (13/09/2026, versão Ideal).
 *
 * A FRASE, uma linha, com a condição ANTES do número:
 *
 *     Nesse ritmo, Variável estoura R$ 380.
 *     Nesse ritmo, Variável sobra R$ 304.
 *
 * Duas redações anteriores caíram, e o registro fica aqui para ninguém
 * reintroduzir achando que encurta:
 *
 *   • duas linhas com total, origem e onde agir → virou painel disfarçado de
 *     frase; nem o autor do produto entendeu ao ler;
 *   • "Variável vai estourar R$ 380." → "vai estourar" é AFIRMAÇÃO, não
 *     projeção. Ele não vai estourar se economizar; a frase dizia uma coisa
 *     que não é verdade.
 *
 * POR QUE A FRASE FALA SÓ DO VARIÁVEL: o total já é o número grande da tela e
 * a sobra do Fixo já está na barra do Fixo. Repetir na frase é o que a fez
 * inchar. A frase existe para dizer o que ainda está EM ABERTO — e isso é só o
 * grupo Variável, o único com decisão pendente daqui até o fim do mês.
 *
 * ------------------------------------------------------------------
 * O CÁLCULO, grupo a grupo:
 *
 *   Fixo (50%)         entra na economia — meta − comprometido do mês (cheio,
 *                      já é conhecido: série fixa e parcela já estão lançadas)
 *   Variável (30%)     entra — meta − (já gastou + ritmo × dias que faltam)
 *   Investimento (20%) NÃO entra — não aportar não é economizar, é deixar de
 *                      investir
 *
 * Por que o Investimento fica fora, medido em agosto/2026 no dia 15: com ele
 * dentro a frase dizia "você economiza R$ 1.422"; sem ele, R$ 304. Os R$ 1.118
 * de diferença eram o aporte que NÃO foi feito — a frase estava parabenizando
 * exatamente o comportamento que o app existe para corrigir. O erro médio nos
 * 5 meses reais também melhora: R$ 1.226 → R$ 1.093.
 *
 * ------------------------------------------------------------------
 * O RITMO é a média dos últimos 30 dias CORRIDOS, cruzando o mês anterior
 * quando preciso — não o ritmo do mês corrente. Medido nos 5 meses reais
 * (abril a agosto/2026), 5 pontos por mês:
 *
 *                          ritmo do mês corrente   média dos últimos 30 dias
 *   erro médio, dias 5-25          R$ 1.212                 R$ 1.226
 *   erro médio, dias 1-3           R$ 4.116                 R$ 2.445
 *   pior caso, dias 1-3            R$ 7.609                 R$ 4.506
 *
 * No meio do mês é empate. No começo do mês — onde um único dia de compra vira
 * "ritmo" do mês inteiro — a média de 30 dias erra quase metade. É ela que
 * permite a frase ser uma só, todo dia do mês: a regra de esconder o veredito
 * nos 7 primeiros dias cai.
 *
 * NOMENCLATURA: `(gasto ÷ dias corridos) × dias do mês` e
 * `gasto + ritmo × dias que faltam` são a mesma conta escrita de dois jeitos.
 * Dão o mesmo número. Aqui está escrita da segunda forma, que é a que se lê.
 *
 * A JANELA (30) é parâmetro do N0, nunca chumbado — ver `janelaMediaDias` em
 * `kitPlatform.ts`. Este módulo recebe o valor pronto.
 */
import type { Categoria, Conta, GrupoRegistro, Lancamento, Meta } from './db'
import { baseMetaDoMes, metaEmReais } from './baseMeta'
import { idsDeCofre, lancamentoConsomeMeta } from './orcamento'
import { comportamentoDoGrupo } from './gruposUtil'

/** Padrão da janela do ritmo, em dias corridos. O N0 pode mudar. */
export const JANELA_MEDIA_DIAS_PADRAO = 30

/* As constantes `GRUPO_QUE_PROJETA = 'Variável'` e
 * `GRUPO_INVESTIMENTO = 'Investimento'` viviam AQUI e eram a regra: a
 * projeção achava o grupo que projeta e o de investimento pelo NOME.
 *
 * Foram removidas na build 062, depois de a build 061 ter parado de usá-las:
 * deixar constante morta num arquivo é convite para alguém voltar a ligar a
 * regra nela. Quem decide isso agora é o campo `comportamento` do próprio
 * grupo (`ComportamentoGrupo` em `db.ts`), escolhido no cadastro. O nome do
 * grupo só é consultado uma vez, pela migração em `gruposUtil.ts`, para
 * chutar o comportamento inicial de quem já usava o app.
 */

export interface Projecao {
  /** Economia projetada do mês inteiro (Fixo + Variável). Negativo = acima da meta. */
  economia: number
  /** Só do grupo Variável: sobra (+) ou estouro (−) projetado. É o número da frase. */
  variavel: number
  /** Sobra (+) ou estouro (−) já fechado do Fixo. Entra na economia, não na frase. */
  fixo: number
  /** Quanto ainda falta aportar no Investimento neste mês (0 quando em dia). */
  faltaAportar: number
  /** Quantos dias do mês ainda faltam, contando a partir de amanhã. */
  diasQueFaltam: number
  /** Como chamar o que projeta na frase: o nome do grupo, ou o plural. */
  nomeDoVariavel: string
  /** Quantos grupos estão marcados como variáveis (0 = ninguém projeta). */
  quantosVariaveis: number
  /** O mês da tela já terminou? A projeção vira fechamento. */
  mesFechado: boolean
  /** false quando não há base de meta (plano não montado) — a frase não aparece. */
  temPlano: boolean
}

function diasNoMes(mesISO: string): number {
  const [a, m] = mesISO.split('-').map(Number)
  return new Date(a, m, 0).getDate()
}

function somaDias(diaISO: string, delta: number): string {
  const d = new Date(diaISO + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/**
 * Gasto realizado de um grupo num intervalo de datas (inclusive), já sob a
 * regra corrigida do cofrinho: quem consome meta é a CONTA de origem.
 */
function gastoDoGrupo(
  lancamentos: readonly Lancamento[],
  categoriaPorId: ReadonlyMap<number, Categoria>,
  contasCofre: ReadonlySet<number>,
  grupo: string,
  de: string,
  ate: string,
): number {
  let total = 0
  for (const l of lancamentos) {
    if (l.valor >= 0) continue
    if (l.dataCompetencia < de || l.dataCompetencia > ate) continue
    const cat = l.categoriaId == null ? undefined : categoriaPorId.get(l.categoriaId)
    if (!cat || cat.grupo !== grupo) continue
    if (!lancamentoConsomeMeta(l, cat.natureza, contasCofre)) continue
    total += Math.abs(l.valor)
  }
  return total
}

export interface EntradaProjecao {
  lancamentos: readonly Lancamento[]
  categorias: readonly Categoria[]
  contas: readonly Conta[] | undefined
  grupos: readonly GrupoRegistro[]
  metas: readonly Meta[]
  /** Mês que está na tela, `AAAA-MM`. */
  mesISO: string
  /** Hoje (respeita a data simulada das ferramentas de teste), `AAAA-MM-DD`. */
  hojeISO: string
  /** Janela do ritmo, em dias. Vem do parâmetro do N0. */
  janelaDias?: number
}

export function calcularProjecao(e: EntradaProjecao): Projecao {
  const {
    lancamentos,
    categorias,
    contas,
    grupos,
    metas,
    mesISO,
    hojeISO,
    janelaDias = JANELA_MEDIA_DIAS_PADRAO,
  } = e

  const categoriaPorId = new Map<number, Categoria>()
  for (const c of categorias) if (c.id != null) categoriaPorId.set(c.id, c)
  const contasCofre = idsDeCofre(contas)

  const base = baseMetaDoMes(lancamentos as Lancamento[], categorias as Categoria[], mesISO)
  const pctDe = (nome: string) => metas.find((m) => m.grupo === nome)?.percentual ?? 0
  const metaDe = (nome: string) => metaEmReais(base, pctDe(nome))

  const D = diasNoMes(mesISO)
  const ini = `${mesISO}-01`
  const fim = `${mesISO}-${String(D).padStart(2, '0')}`
  // "hoje" recortado ao mês da tela: navegando para um mês passado, o mês
  // inteiro já aconteceu; para um mês futuro, nada aconteceu ainda.
  const hoje = hojeISO < ini ? ini : hojeISO > fim ? fim : hojeISO
  const diaDoMes = Number(hoje.slice(8))
  const mesJaFechou = hojeISO > fim
  const diasQueFaltam = mesJaFechou ? 0 : D - diaDoMes

  const gasto = (grupo: string, de: string, ate: string) =>
    gastoDoGrupo(lancamentos, categoriaPorId, contasCofre, grupo, de, ate)

  /* Cada grupo entra pelo COMPORTAMENTO dele, não pelo nome (build 061).
     Podem existir vários variáveis e vários de guardar. */
  const deSaida = grupos.filter((g) => g.ativo !== false && g.tipo !== 'entrada')
  const variaveis = deSaida.filter((g) => comportamentoDoGrupo(g) === 'variavel')
  const paraGuardar = deSaida.filter((g) => comportamentoDoGrupo(g) === 'guardar')
  const fixos = deSaida.filter((g) => comportamentoDoGrupo(g) === 'fixo')

  // --- fixos: entram com o mês cheio. São comprometidos conhecidos (série
  // fixa e parcela já estão lançadas).
  let fixo = 0
  for (const g of fixos) fixo += metaDe(g.nome) - gasto(g.nome, ini, fim)

  // --- variáveis: já gastou + ritmo × dias que faltam, somando todos eles
  let variavel = 0
  for (const g of variaveis) {
    const jaGastou = gasto(g.nome, ini, hoje)
    const ritmo =
      diasQueFaltam > 0 ? gasto(g.nome, somaDias(hoje, -(janelaDias - 1)), hoje) / janelaDias : 0
    variavel += metaDe(g.nome) - (jaGastou + ritmo * diasQueFaltam)
  }

  // --- guardar: fora da economia; vira "falta aportar"
  let faltaAportar = 0
  for (const g of paraGuardar) faltaAportar += Math.max(0, metaDe(g.nome) - gasto(g.nome, ini, fim))

  return {
    economia: fixo + variavel,
    variavel,
    fixo,
    faltaAportar,
    diasQueFaltam,
    mesFechado: mesJaFechou,
    quantosVariaveis: variaveis.length,
    nomeDoVariavel:
      variaveis.length === 1 ? variaveis[0].nome : variaveis.length > 1 ? 'seus gastos variáveis' : '',
    temPlano: base > 0,
  }
}

/* ===================================================================
   OS TEXTOS
   =================================================================== */

const fmt = (v: number) =>
  `R$ ${Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * A frase do veredito. Uma linha, condição na frente do número.
 * Devolve `null` quando não há plano montado — nesse caso a tela mostra o
 * cartão de primeiros passos, não uma projeção de nada.
 */
export function fraseVeredito(p: Projecao): string | null {
  if (!p.temPlano) return null
  /* Sem nenhum grupo marcado como variável não existe ritmo pra projetar — a
     frase sai de cena em vez de inventar um número. */
  if (p.quantosVariaveis === 0) return null
  /* Mês já fechado não tem "nesse ritmo": o que houve, houve. A frase vira o
     fechamento daquele mês (pedido do Rafael ao ver agosto em setembro). */
  if (p.mesFechado) {
    const verbo = p.variavel < 0 ? 'estourou' : 'sobrou'
    return `No fim do mês, ${p.nomeDoVariavel} ${verbo} ${fmt(p.variavel)}.`
  }
  const verbo = p.variavel < 0 ? 'estoura' : 'sobra'
  return `Nesse ritmo, ${p.nomeDoVariavel} ${verbo} ${fmt(p.variavel)}.`
}

/**
 * Segunda linha, só quando o aporte do mês está atrasado. Some quando está em
 * dia — e nunca é somada à economia: isto é cobrança, não economia.
 */
export function linhaAporte(p: Projecao): string | null {
  if (!p.temPlano || p.faltaAportar <= 0) return null
  return `Falta aportar ${fmt(p.faltaAportar)} este mês.`
}

/** O que o ⓘ ao lado da frase abre. Fecha as duas dúvidas: de onde sai, e se é certeza. */
export const EXPLICACAO_RITMO =
  'Calculado pela sua média de gastos dos últimos 30 dias. Se o ritmo mudar, o número muda.'

export function explicacaoRitmo(janelaDias = JANELA_MEDIA_DIAS_PADRAO): string {
  return `Calculado pela sua média de gastos dos últimos ${janelaDias} dias. Se o ritmo mudar, o número muda.`
}
