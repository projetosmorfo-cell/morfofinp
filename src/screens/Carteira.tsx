import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type Conta, type Lancamento } from '../db'
import type { TelaProps } from '../mes'
import SeletorMes from '../components/SeletorMes'
import LinhaLancamentoCompleta from '../components/LinhaLancamentoCompleta'
import BarraBuscaFiltros, { FILTROS_VAZIOS, aplicarFiltros, type FiltrosAvancados } from '../components/BuscaEFiltros'
import { obterOuCriarCategoriaPagamentoFatura } from '../categoriasSistema'
import { formatarCabecalhoData } from '../formatoData'
import { fmtBRL, formatarMoeda, aplicarMascaraValor, paraNumero } from '../formatoMoeda'
import { useHojeSimuladoISO } from '../hojeSimulado'

function fmtBRLComSinal(v: number) {
  return `${v < 0 ? '-' : ''}${fmtBRL(v)}`
}

function formatarDataCurta(dataISO: string) {
  const [, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}`
}

function ultimoDiaDoMes(ano: number, mesIndice0: number): number {
  return new Date(ano, mesIndice0 + 1, 0).getDate()
}

// Janela FECHADA de uma fatura específica, identificada pelo mês em que ela
// FECHA (mesISO = "yyyy-mm", o mesmo mês do SeletorMes comum do app) — do dia
// seguinte ao fechamento do mês anterior até o fechamento deste mês.
function janelaFatura(diaFechamento: number, mesISO: string): { inicio: string; fim: string } {
  const [ano, mesUm] = mesISO.split('-').map(Number)
  const mesIdx = mesUm - 1
  const diaFechoEsteMes = Math.min(diaFechamento, ultimoDiaDoMes(ano, mesIdx))
  const fim = new Date(ano, mesIdx, diaFechoEsteMes)

  const anoAnterior = mesIdx === 0 ? ano - 1 : ano
  const mesAnteriorIdx = mesIdx === 0 ? 11 : mesIdx - 1
  const diaFechoMesAnterior = Math.min(diaFechamento, ultimoDiaDoMes(anoAnterior, mesAnteriorIdx))
  const inicio = new Date(anoAnterior, mesAnteriorIdx, diaFechoMesAnterior)
  inicio.setDate(inicio.getDate() + 1)

  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { inicio: iso(inicio), fim: iso(fim) }
}

// Janela da fatura em aberto de um cartão "até o momento" — do dia seguinte
// ao último fechamento (passado) até hoje. Só usada no card resumido da
// Carteira (fora do drill-in).
function janelaFaturaEmAberto(diaFechamento: number): { inicio: string; fim: string } {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const diaHoje = hoje.getDate()
  const ultimoFechamento =
    diaHoje >= diaFechamento ? new Date(ano, mes, diaFechamento) : new Date(ano, mes - 1, diaFechamento)
  const inicio = new Date(ultimoFechamento)
  inicio.setDate(inicio.getDate() + 1)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { inicio: iso(inicio), fim: iso(hoje) }
}

// Tela "Carteira" — status atual de cada lugar onde o dinheiro está: toda
// conta cadastrada em Contas (corrente, cartão ou cofre) mais o card virtual
// "Cofrinho" (soma histórica de Aporte menos Gasto de cofrinho).
//
// 31/08/2026, rodada seguinte — revisão importante (ponto 7 do feedback):
// `Categoria.contaVinculada` (lançamento de "uso/aporte de cofrinho" pago
// direto por outra conta, ex.: Bradesco) NÃO move mais fisicamente o saldo
// do cofrinho — isso gerava saldo negativo incorreto, porque nenhum dinheiro
// de verdade saiu daquele cofrinho. O saldo/lista de um cofrinho agora
// reflete só `contaId` de verdade; os lançamentos vinculados pagos por outra
// conta aparecem numa seção informativa SEPARADA (ver `DetalheConta`),
// deixando claro que é só um AJUSTE DE FLUXO daquele mês (ex.: "esse gasto
// substituiu parte do aporte que eu faria"), nunca uma movimentação real.
export default function Carteira({ mes, aoMudarMes, aoAbrirLancamento }: TelaProps) {
  const todasContas = useLiveQuery(() => db.contas.toArray(), [])
  const categorias = useLiveQuery(() => db.categorias.toArray(), [])
  const todosLancamentos = useLiveQuery(() => db.lancamentos.toArray(), [])
  // Só pra forçar re-render quando a data simulada mudar (05/09/2026, Etapa
  // 7 — Ferramentas de teste), mesmo motivo de `Lancamentos.tsx`: o
  // drill-in desta tela usa `LinhaLancamentoCompleta`/`statusDoLancamento`.
  useHojeSimuladoISO()

  const [selecionado, setSelecionado] = useState<number | 'cofrinho' | null>(null)

  if (!todasContas || !categorias || !todosLancamentos) return null

  const contas = todasContas.filter((c) => c.ativa)
  const categoriaPorId = new Map(categorias.map((c) => [c.id!, c]))
  const contaPorId = new Map(todasContas.map((c) => [c.id!, c]))
  const naturezaDoLancamento = (l: Lancamento) => categoriaPorId.get(l.categoriaId)?.natureza

  function categoriasVinculadasDe(contaId: number): number[] {
    // `categorias!`: o guard `if (!categorias) return null` já garantiu que
    // está definida — TS não propaga esse narrowing pra dentro de uma
    // função aninhada (fica conservador, já que em teoria a função poderia
    // ser chamada depois de outra execução; na prática essa função só é
    // chamada mais abaixo, no mesmo render, depois do guard).
    return categorias!.filter((c) => c.contaVinculada === contaId).map((c) => c.id!)
  }

  if (selecionado !== null) {
    const conta = typeof selecionado === 'number' ? contas.find((c) => c.id === selecionado) : undefined
    const lancamentosDoLugar = conta
      ? todosLancamentos.filter((l) => l.contaId === conta.id)
      : todosLancamentos.filter(
          (l) => naturezaDoLancamento(l) === 'Aporte' || naturezaDoLancamento(l) === 'Gasto de cofrinho',
        )
    // Só informativo (nunca somado ao saldo) — lançamentos pagos por OUTRA
    // conta numa categoria vinculada a este cofrinho (ver decisão acima).
    const vinculadosInformativos =
      conta?.tipo === 'cofre'
        ? todosLancamentos.filter(
            (l) => l.contaId !== conta.id && categoriasVinculadasDe(conta.id!).includes(l.categoriaId),
          )
        : undefined

    return (
      <DetalheConta
        titulo={conta ? conta.nome : 'Cofrinho'}
        conta={conta}
        mes={mes}
        aoMudarMes={aoMudarMes}
        aoAbrirLancamento={aoAbrirLancamento}
        aoVoltar={() => setSelecionado(null)}
        contaIdSugerida={conta?.id}
        lancamentosDoLugar={lancamentosDoLugar}
        vinculadosInformativos={vinculadosInformativos}
        categorias={categorias}
        categoriaPorId={categoriaPorId}
        contaPorId={contaPorId}
        contasDisponiveis={todasContas}
        todosLancamentos={todosLancamentos}
      />
    )
  }

  const totalAportes = todosLancamentos
    .filter((l) => naturezaDoLancamento(l) === 'Aporte')
    .reduce((s, l) => s + Math.abs(l.valor), 0)
  const totalGastosCofrinho = todosLancamentos
    .filter((l) => naturezaDoLancamento(l) === 'Gasto de cofrinho')
    .reduce((s, l) => s + Math.abs(l.valor), 0)
  const saldoCofrinho = totalAportes - totalGastosCofrinho

  return (
    <>
      <div className="cabecalho-fixo">
        <h1>Carteira</h1>
      </div>
      <p className="texto-fraco" style={{ marginTop: -8 }}>
        Onde o dinheiro está agora — toque num card pra ver e mexer nos lançamentos dele.
      </p>

      {contas.map((conta) => {
        const lancamentosDaConta = todosLancamentos.filter((l) => l.contaId === conta.id)
        let rotuloValor: string
        let valorNumero: number
        if (conta.tipo === 'cartao') {
          const { inicio, fim } = janelaFaturaEmAberto(conta.diaFechamento ?? 9)
          valorNumero = lancamentosDaConta
            .filter((l) => l.dataCompetencia >= inicio && l.dataCompetencia <= fim)
            .reduce((s, l) => s - l.valor, 0)
          rotuloValor = 'Fatura até o momento'
        } else if (conta.tipo === 'cofre') {
          // Saldo acumulado só de movimentos REAIS por contaId (ver nota de
          // revisão no topo do arquivo — não soma mais vinculados de outra
          // conta, isso nunca foi dinheiro que entrou/saiu daqui de verdade).
          valorNumero = lancamentosDaConta.reduce((s, l) => s + l.valor, 0)
          rotuloValor = 'Total acumulado'
        } else {
          valorNumero = lancamentosDaConta
            .filter((l) => l.dataCompetencia.startsWith(mes))
            .reduce((s, l) => s + l.valor, 0)
          rotuloValor = 'Total do mês'
        }
        // F-05 da revisão de UI (04/09/2026): medido 549px (64% da área
        // útil) vazios abaixo do último card, com só 3 contas cadastradas —
        // uma prévia dos lançamentos mais recentes de cada conta usa parte
        // desse espaço, sem precisar entrar no drill-in só pra "ver o que
        // teve aqui ultimamente".
        const recentesDaConta = [...lancamentosDaConta]
          .sort((a, b) => b.dataCompetencia.localeCompare(a.dataCompetencia))
          .slice(0, 3)
        return (
          <button
            key={conta.id}
            type="button"
            className="card-conta"
            onClick={() => setSelecionado(conta.id!)}
          >
            <div className="linha-destaque" style={{ marginTop: 0 }}>
              <strong>{conta.nome}</strong>
              <strong className={conta.tipo === 'cartao' ? 'valor-neg' : valorNumero < 0 ? 'valor-neg' : 'valor-pos'}>
                {fmtBRL(valorNumero)}
              </strong>
            </div>
            <span className="texto-fraco">{rotuloValor}</span>
            {recentesDaConta.length > 0 && (
              <div className="card-conta-preview">
                {/* Pedido do Rafael (04/09/2026, mesmo dia): a prévia não
                    deixava claro que eram só os ÚLTIMOS lançamentos, nem que
                    tocar no card mostra mais — rótulo explícito resolve os
                    dois de uma vez. */}
                <span className="card-conta-preview-titulo">Últimos lançamentos — toque pra ver todos</span>
                {recentesDaConta.map((l) => (
                  <div key={l.id} className="card-conta-preview-linha">
                    <span>{l.descricao}</span>
                    <span className={l.valor < 0 ? 'valor-neg' : 'valor-pos'}>
                      {l.valor < 0 ? '-' : '+'}{fmtBRL(l.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </button>
        )
      })}

      <button type="button" className="card-conta" onClick={() => setSelecionado('cofrinho')}>
        <div className="linha-destaque" style={{ marginTop: 0 }}>
          <strong>Cofrinho</strong>
          <strong className="valor-pos">{fmtBRL(saldoCofrinho)}</strong>
        </div>
        <span className="texto-fraco">Total acumulado (Objetivos + Segurança)</span>
        {(() => {
          const recentesCofrinho = todosLancamentos
            .filter((l) => naturezaDoLancamento(l) === 'Aporte' || naturezaDoLancamento(l) === 'Gasto de cofrinho')
            .sort((a, b) => b.dataCompetencia.localeCompare(a.dataCompetencia))
            .slice(0, 3)
          return (
            recentesCofrinho.length > 0 && (
              <div className="card-conta-preview">
                <span className="card-conta-preview-titulo">Últimos lançamentos — toque pra ver todos</span>
                {recentesCofrinho.map((l) => (
                  <div key={l.id} className="card-conta-preview-linha">
                    <span>{l.descricao}</span>
                    <span className={l.valor < 0 ? 'valor-neg' : 'valor-pos'}>
                      {l.valor < 0 ? '-' : '+'}{fmtBRL(l.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )
          )
        })()}
      </button>

      {/* Botão flutuante presente em toda tela principal (31/08/2026, mesmo
          dia, ponto do feedback) — aqui na listagem de cards (o drill-in de
          cada conta já tem o seu próprio, com a conta pré-selecionada). */}
      <button type="button" className="botao-flutuante" onClick={() => aoAbrirLancamento()} aria-label="Novo lançamento">
        +
      </button>
    </>
  )
}

function BlocoTotais({
  saldoInicial,
  entradasPeriodo,
  saidasPeriodo,
  saldoFinal,
  isCartao,
  totalFatura,
}: {
  saldoInicial: number
  entradasPeriodo: number
  saidasPeriodo: number
  saldoFinal: number
  isCartao: boolean
  totalFatura: number
}) {
  return (
    <div className="total-geral">
      <div className="linha" style={{ border: 'none', padding: '2px 0' }}>
        <span className="texto-fraco">Saldo inicial do período</span>
        <strong className={saldoInicial >= 0 ? 'valor-pos' : 'valor-neg'}>{fmtBRLComSinal(saldoInicial)}</strong>
      </div>
      <div className="linha" style={{ border: 'none', padding: '2px 0' }}>
        <span className="texto-fraco">Entradas do período</span>
        <strong className="valor-pos">+{fmtBRL(entradasPeriodo)}</strong>
      </div>
      <div className="linha" style={{ border: 'none', padding: '2px 0' }}>
        <span className="texto-fraco">Saídas do período</span>
        <strong className="valor-neg">-{fmtBRL(saidasPeriodo)}</strong>
      </div>
      <div className="linha" style={{ border: 'none', padding: '6px 0 0', borderTop: '1px solid var(--borda)', marginTop: 4 }}>
        <span>Saldo final do período</span>
        <strong className={saldoFinal >= 0 ? 'valor-pos' : 'valor-neg'} style={{ fontSize: 16 }}>
          {fmtBRLComSinal(saldoFinal)}
        </strong>
      </div>
      {isCartao && (
        <div className="linha" style={{ border: 'none', padding: '8px 0 0', borderTop: '1px solid var(--borda)', marginTop: 8 }}>
          <span>Total desta fatura</span>
          <strong className="valor-neg" style={{ fontSize: 16 }}>
            {fmtBRL(totalFatura)}
          </strong>
        </div>
      )}
    </div>
  )
}

// Lista de lançamentos de uma conta (ou do cofrinho), agrupada por data.
// Pra conta corrente/cofre virtual obedece o mês civil selecionado; pra
// cartão de crédito obedece o CICLO DE FATURA daquele mês.
//
// 31/08/2026, rodada seguinte: modelo de linha COMPLETO (ícone + duas linhas
// + valor/tarja — LinhaLancamentoCompleta), busca+filtros, ordenação
// asc/desc (pontos 5, 8, 9, 10), e — só cartão — totalizador em dobro
// (topo+rodapé) e a quitação da fatura virou uma seção própria no TOPO,
// isolada das compras, com o botão "Pagar fatura" reaparecendo sozinho se o
// registro de quitação for excluído (ponto 6).
function DetalheConta({
  titulo,
  conta,
  mes,
  aoMudarMes,
  aoAbrirLancamento,
  aoVoltar,
  contaIdSugerida,
  lancamentosDoLugar,
  vinculadosInformativos,
  categorias,
  categoriaPorId,
  contaPorId,
  contasDisponiveis,
  todosLancamentos,
}: {
  titulo: string
  conta?: Conta
  mes: string
  aoMudarMes: (mes: string) => void
  aoAbrirLancamento: TelaProps['aoAbrirLancamento']
  aoVoltar: () => void
  contaIdSugerida?: number
  lancamentosDoLugar: Lancamento[]
  vinculadosInformativos?: Lancamento[]
  categorias: Categoria[]
  categoriaPorId: Map<number, Categoria>
  contaPorId: Map<number, Conta>
  contasDisponiveis: Conta[]
  todosLancamentos: Lancamento[]
}) {
  const isCartao = conta?.tipo === 'cartao'
  const janela = isCartao
    ? janelaFatura(conta?.diaFechamento ?? 9, mes)
    : { inicio: `${mes}-01`, fim: `${mes}-31` }

  const [ordemDesc, setOrdemDesc] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<FiltrosAvancados>(FILTROS_VAZIOS)

  const doPeriodoBruto = lancamentosDoLugar.filter((l) => l.dataCompetencia >= janela.inicio && l.dataCompetencia <= janela.fim)
  const antesDoPeriodo = lancamentosDoLugar.filter((l) => l.dataCompetencia < janela.inicio)

  const saldoInicial = (conta?.saldoInicial ?? 0) + antesDoPeriodo.reduce((s, l) => s + l.valor, 0)
  const entradasPeriodo = doPeriodoBruto.filter((l) => l.valor > 0).reduce((s, l) => s + l.valor, 0)
  const saidasPeriodo = doPeriodoBruto.filter((l) => l.valor < 0).reduce((s, l) => s - l.valor, 0)
  const saldoFinal = saldoInicial + entradasPeriodo - saidasPeriodo
  const totalFatura = saidasPeriodo - entradasPeriodo

  const doPeriodoFiltrado = aplicarFiltros(doPeriodoBruto, busca, filtros, categoriaPorId, contaPorId)
  const doPeriodo = [...doPeriodoFiltrado].sort((a, b) =>
    ordemDesc ? b.dataCompetencia.localeCompare(a.dataCompetencia) : a.dataCompetencia.localeCompare(b.dataCompetencia),
  )

  const sessoes: { data: string; itens: Lancamento[] }[] = []
  for (const l of doPeriodo) {
    const ultima = sessoes[sessoes.length - 1]
    if (ultima && ultima.data === l.dataCompetencia) ultima.itens.push(l)
    else sessoes.push({ data: l.dataCompetencia, itens: [l] })
  }

  function linhaDe(l: Lancamento) {
    // Wrapper só pra carregar a borda entre lançamentos (01/09/2026) — mesmo
    // padrão visual de `.item-lancamento` em Lançamentos.tsx, ver index.css.
    return (
      <div key={l.id} className="linha-completa-wrapper">
        <LinhaLancamentoCompleta
          lancamento={l}
          categoria={categoriaPorId.get(l.categoriaId)}
          origemLabel={conta && l.contaId === conta.id ? undefined : `via ${contaPorId.get(l.contaId)?.nome ?? '—'}`}
          onAbrir={() => aoAbrirLancamento({ id: l.id })}
        />
      </div>
    )
  }

  // --- Quitação da fatura (só cartão) — vira registro de lançamento real,
  // isolado numa seção própria no TOPO (31/08/2026, rodada seguinte; ponto
  // 6). O lançamento de pagamento em si mora na conta de ORIGEM do
  // pagamento (ex.: Bradesco), não no próprio cartão — por isso é buscado
  // em `todosLancamentos` via `faturaId` (não aparece em `lancamentosDoLugar`,
  // que é só a lista do cartão). "Quitado" = existe pelo menos um registro
  // de pagamento referenciado por algum lançamento deste ciclo — nunca
  // depende do `pago` individual de cada compra, pra que excluir o registro
  // de quitação sempre faça o botão "Pagar fatura" reaparecer sozinho.
  const idsQuitacaoDoCiclo = new Set(doPeriodoBruto.map((l) => l.faturaId).filter((x): x is number => x != null))
  const registrosQuitacao = todosLancamentos.filter((l) => l.id != null && idsQuitacaoDoCiclo.has(l.id))
  const cicloQuitado = registrosQuitacao.length > 0

  const [pagandoFatura, setPagandoFatura] = useState(false)
  const [contaOrigemPagamento, setContaOrigemPagamento] = useState<number | ''>('')
  const [valorPagamento, setValorPagamento] = useState('')
  // Data de pagamento — pedido do Rafael (31/08/2026, rodada seguinte): o
  // pagamento de fatura é um lançamento como outro qualquer, então precisa
  // de uma data de verdade, editável, não travada em "hoje" implicitamente.
  const [dataPagamento, setDataPagamento] = useState('')

  function abrirPagamento() {
    const origemPadrao =
      conta?.contaPagamentoPadraoId ?? contasDisponiveis.find((c) => c.ativa && c.tipo !== 'cartao')?.id ?? ''
    setContaOrigemPagamento(origemPadrao)
    setValorPagamento(formatarMoeda(totalFatura))
    setDataPagamento(new Date().toISOString().slice(0, 10))
    setPagandoFatura(true)
  }

  async function confirmarPagamento() {
    if (!conta || !contaOrigemPagamento || !dataPagamento) return
    const valorNum = paraNumero(valorPagamento)
    if (!valorNum) return
    const idsParaQuitar = doPeriodoBruto
      .filter((l) => categoriaPorId.get(l.categoriaId)?.natureza !== 'Pagamento de fatura')
      .map((l) => l.id!)

    await db.transaction('rw', db.lancamentos, db.categorias, db.grupos, async () => {
      const catFaturaId = await obterOuCriarCategoriaPagamentoFatura()
      const novoId = await db.lancamentos.add({
        dataCompetencia: dataPagamento,
        dataCaixa: dataPagamento,
        descricao: `Pagamento fatura ${conta.nome}`,
        descricaoOriginal: `Pagamento fatura ${conta.nome}`,
        valor: -valorNum,
        contaId: contaOrigemPagamento,
        pagoPor: 'conta',
        categoriaId: catFaturaId,
        status: 'manual',
        pago: true,
      })
      await Promise.all(idsParaQuitar.map((id) => db.lancamentos.update(id, { pago: true, faturaId: novoId })))
    })
    setPagandoFatura(false)
  }

  // --- Ajuste de fluxo via cofrinho (ponto 7) — só informativo, nunca soma
  // no saldo. Recortado pro mês selecionado (é um ajuste mensal, não
  // histórico acumulado).
  const ajustesDoMes = (vinculadosInformativos ?? []).filter((l) => l.dataCompetencia.startsWith(mes))
  const totalAjustesDoMes = ajustesDoMes.reduce((s, l) => s + Math.abs(l.valor), 0)

  const totaisProps = { saldoInicial, entradasPeriodo, saidasPeriodo, saldoFinal, isCartao, totalFatura }

  return (
    <>
      <div className="cabecalho-fixo">
        <div className="linha" style={{ border: 'none', padding: '0 0 8px', justifyContent: 'flex-start', gap: 12 }}>
          <button type="button" className="botao-voltar-circular" onClick={aoVoltar} aria-label="Voltar">
            ‹
          </button>
          <h1 style={{ margin: 0 }}>{titulo}</h1>
        </div>
        <SeletorMes mes={mes} onMudar={aoMudarMes} />
      </div>
      {isCartao && (
        <p className="texto-fraco" style={{ marginTop: -10, marginBottom: 14 }}>
          Fatura de {formatarDataCurta(janela.inicio)} a {formatarDataCurta(janela.fim)}
          {conta?.diaVencimento ? ` · vence dia ${conta.diaVencimento}` : ''}
        </p>
      )}

      {conta?.tipo === 'cofre' && (
        <div className="cartao" style={{ marginBottom: 12, borderColor: 'var(--amarelo)' }}>
          <strong style={{ fontSize: 13 }}>Ajuste de fluxo via outras contas (este mês)</strong>
          <p className="texto-fraco" style={{ marginTop: 4, marginBottom: 8 }}>
            Lançamentos pagos por outra conta numa categoria vinculada a este cofrinho — não alteram o saldo
            dele (nenhum dinheiro saiu fisicamente daqui), só reduzem o quanto você precisaria aportar de
            verdade este mês.
          </p>
          {ajustesDoMes.length === 0 ? (
            <p className="texto-fraco" style={{ margin: 0 }}>Nenhum ajuste deste tipo neste mês.</p>
          ) : (
            <>
              {ajustesDoMes.map(linhaDe)}
              <div className="linha" style={{ border: 'none', padding: '8px 0 0', marginTop: 8, borderTop: '1px solid var(--borda)' }}>
                <span className="texto-fraco">Total do ajuste este mês</span>
                <strong>{fmtBRL(totalAjustesDoMes)}</strong>
              </div>
            </>
          )}
        </div>
      )}

      <BarraBuscaFiltros
        busca={busca}
        onBuscaChange={setBusca}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        categorias={categorias}
        contas={contasDisponiveis}
      />

      <div className="linha" style={{ border: 'none', padding: '0 0 8px' }}>
        <span className="texto-fraco">
          {doPeriodo.length} lançamento(s){doPeriodo.length !== doPeriodoBruto.length ? ` de ${doPeriodoBruto.length}` : ''}
        </span>
        <button type="button" className="botao-ordem" onClick={() => setOrdemDesc((v) => !v)}>
          {ordemDesc ? 'Mais recente ↓' : 'Mais antigo ↑'}
        </button>
      </div>

      {/* Duplo totalizador (só cartão, ponto 6) — topo E rodapé. */}
      {isCartao && <BlocoTotais {...totaisProps} />}

      {isCartao && (
        <div className="cartao" style={{ marginTop: 10, marginBottom: 10 }}>
          {cicloQuitado ? (
            <>
              <strong style={{ fontSize: 13 }}>Quitação da fatura</strong>
              <div style={{ marginTop: 6 }}>{registrosQuitacao.map((l) => linhaDe(l))}</div>
            </>
          ) : doPeriodoBruto.length > 0 ? (
            !pagandoFatura ? (
              <>
                <div className="linha" style={{ border: 'none', padding: 0 }}>
                  <span>Fatura ainda não paga</span>
                  <strong className="valor-neg">{fmtBRL(totalFatura)}</strong>
                </div>
                <button type="button" className="primario" style={{ marginTop: 10 }} onClick={abrirPagamento}>
                  Pagar esta fatura
                </button>
              </>
            ) : (
              <>
                <label>Pagar com</label>
                <select
                  value={contaOrigemPagamento}
                  onChange={(e) => setContaOrigemPagamento(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Escolha…</option>
                  {contasDisponiveis
                    .filter((c) => c.ativa && c.id !== conta?.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                </select>
                <label>Valor pago (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(aplicarMascaraValor(e.target.value))}
                />
                <label>Data do pagamento</label>
                <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} />
                <p className="texto-fraco" style={{ marginTop: 8, marginBottom: 0 }}>
                  Lança 1 saída neutra na conta escolhida e marca todos os lançamentos deste ciclo como pagos — a
                  despesa não é contada de novo (ela já entrou no cálculo quando a compra foi feita).
                </p>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button type="button" className="primario" style={{ marginTop: 0 }} onClick={confirmarPagamento}>
                    Confirmar pagamento
                  </button>
                  <button
                    type="button"
                    style={{
                      marginTop: 0,
                      background: 'none',
                      border: '1px solid var(--borda)',
                      borderRadius: 10,
                      padding: '12px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setPagandoFatura(false)}
                  >
                    Cancelar
                  </button>
                </div>
              </>
            )
          ) : null}
        </div>
      )}

      <div className="cartao" style={{ padding: '0 12px' }}>
        {isCartao && <h2 style={{ marginTop: 12 }}>Compras da fatura</h2>}
        {sessoes.length === 0 && (
          <p className="texto-fraco" style={{ padding: '14px 4px' }}>
            Nenhum lançamento encontrado {isCartao ? 'neste ciclo' : 'neste mês'}.
          </p>
        )}
        {sessoes.map((sessao) => (
          <div key={sessao.data}>
            <div className="sessao-data">{formatarCabecalhoData(sessao.data)}</div>
            {sessao.itens.map((l) => linhaDe(l))}
          </div>
        ))}
      </div>

      {/* Totalizador de rodapé — sempre presente (todo tipo de conta); no
          cartão é a segunda cópia do bloco de cima (duplo totalizador). */}
      <div style={{ marginTop: 12 }}>
        <BlocoTotais {...totaisProps} />
      </div>

      <button
        type="button"
        className="botao-flutuante"
        aria-label="Novo lançamento"
        onClick={() => aoAbrirLancamento({ contaIdSugerida })}
      >
        +
      </button>
    </>
  )
}
