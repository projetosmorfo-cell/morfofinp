import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type Conta, type GrupoRegistro, type Lancamento } from '../db'
import type { TelaProps } from '../mes'
import SeletorMes from '../components/SeletorMes'
import ItemLancamentoAcoes from '../components/ItemLancamentoAcoes'
import { usePeriodoLista } from '../components/periodoLista'
import SeloInstituicao from '../components/SeloInstituicao'
import {
  useSelecao, BarraSelecao, TotaisEntradaSaida, MarcadorLinha, blocosPorCorte, RodapeTotais, somarTotais,
} from '../components/SelecaoETotais'
import { CampoBusca, FolhaFiltros, FILTROS_VAZIOS, aplicarFiltros, contarFiltrosAtivos, type FiltrosAvancados } from '../components/BuscaEFiltros'
import { janelaFatura, lancamentosDoCiclo, situacaoDaFatura, DIA_FECHAMENTO_PADRAO } from '../faturaCiclo'
import { formatarCabecalhoData } from '../formatoData'
import { fundoDaLinhaDeData } from '../statusPagamento'
import SaldoDoCofrinho, { LinhaInformeSaldo } from '../components/SaldoDoCofrinho'
import { fmtBRL, fmtNum } from '../formatoMoeda'
import { useHojeSimuladoISO, hojeEfetivoISO } from '../hojeSimulado'
import TituloTelaN1 from '../kit/CabecalhoN1'
import { ExportSheet, type ExportRow } from '../kit/ExportSheet'
import { EXPLICACAO_CARTEIRA, SUBTITULO_CARTEIRA } from '../subtitulosTelas'
import { lerDoAmbiente } from '../ambiente'
import EdicaoEmMassa from '../components/EdicaoEmMassa'

function fmtBRLComSinal(v: number) {
  return `${v < 0 ? '-' : ''}${fmtBRL(v)}`
}

function formatarDataCurta(dataISO: string) {
  const [, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}`
}

// `ultimoDiaDoMes`/`janelaFatura` moraram aqui até 16/09/2026 (item 12) —
// movidas pra `src/faturaCiclo.ts` (compartilhado) porque `DetalheLancamento.tsx`
// passou a precisar da mesma janela pra perguntar cartão+mês ao lançar um
// "Pagamento de fatura" diretamente pelo formulário. Nenhuma regra mudou —
// mesmo código, só extraído pra não duplicar.

// Janela da fatura em aberto de um cartão "até o momento" — do dia de
// fechamento (inclusive, ver correção acima) até hoje. Só usada no card
// resumido da Carteira (fora do drill-in).
function janelaFaturaEmAberto(diaFechamento: number): { inicio: string; fim: string } {
  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const diaHoje = hoje.getDate()
  const ultimoFechamento =
    diaHoje >= diaFechamento ? new Date(ano, mes, diaFechamento) : new Date(ano, mes - 1, diaFechamento)
  const inicio = new Date(ultimoFechamento)
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
  const todasContas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.orderBy('nome').toArray()), [])
  const todosLancamentos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), [])
  // Só pra forçar re-render quando a data simulada mudar (05/09/2026, Etapa
  // 7 — Ferramentas de teste), mesmo motivo de `Lancamentos.tsx`: o
  // drill-in desta tela usa `LinhaLancamentoCompleta`/`statusDoLancamento`.
  useHojeSimuladoISO()

  const [selecionado, setSelecionado] = useState<number | 'cofrinho' | null>(null)
  /* G44 regra 11b — declarado aqui, ANTES do guard de carregamento abaixo:
     hook nunca pode ficar depois de um `return` condicional. */
  const [exportOpen, setExportOpen] = useState(false)

  if (!todasContas || !categorias || !grupos || !todosLancamentos) return null

  /* O COFRINHO PADRÃO (build 087) é o registro do card virtual desenhado
     abaixo — ele NÃO entra na lista de cards de conta, senão o mesmo cofrinho
     apareceria duas vezes na tela (foi o que o Rafael viu: "aparece o meu e o
     outro padrão"). O que ele dá ao card virtual é nome e ícone; o saldo
     continua vindo da soma por natureza, que é o número certo para o dinheiro
     que nunca passou por uma conta de cofre. */
  const cofrinhoPadrao = todasContas.find((c) => c.cofrinhoPadrao)
  const contas = todasContas.filter((c) => c.ativa && !c.cofrinhoPadrao)
  const nomeCofrinho = cofrinhoPadrao?.nome?.trim() || 'Cofrinho'
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

  const totalAportes = todosLancamentos
    .filter((l) => naturezaDoLancamento(l) === 'Aporte')
    .reduce((s, l) => s + Math.abs(l.valor), 0)
  const totalGastosCofrinho = todosLancamentos
    .filter((l) => naturezaDoLancamento(l) === 'Gasto de cofrinho')
    .reduce((s, l) => s + Math.abs(l.valor), 0)
  const saldoCofrinho = totalAportes - totalGastosCofrinho

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
        titulo={conta ? conta.nome : nomeCofrinho}
        conta={conta}
        saldoCofrinho={conta ? undefined : saldoCofrinho}
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
        grupos={grupos}
        todosLancamentos={todosLancamentos}
      />
    )
  }

  /* G44 regra 11b. `valorDoCard` é a MESMA conta que cada card faz logo
     abaixo — extraída pra função pra a exportação nunca divergir do que está
     na tela (o Kit exporta "o que está sendo exibido agora"). */
  function valorDoCard(conta: Conta): { rotulo: string; valor: number } {
    /* `todosLancamentos!`: mesmo caso já documentado acima pra `categorias!`
       — o guard de carregamento garante, mas o TS não propaga o narrowing
       pra dentro de função aninhada. */
    const daConta = todosLancamentos!.filter((l) => l.contaId === conta.id)
    if (conta.tipo === 'cartao') {
      const { inicio, fim } = janelaFaturaEmAberto(conta.diaFechamento ?? 9)
      return { rotulo: 'Fatura até o momento', valor: daConta.filter((l) => l.dataCompetencia >= inicio && l.dataCompetencia <= fim).reduce((s, l) => s - l.valor, 0) }
    }
    if (conta.tipo === 'cofre') return { rotulo: 'Total acumulado', valor: daConta.reduce((s, l) => s + l.valor, 0) }
    // Item 2 da lista pendente (15/09/2026): conta corrente mostrava só o mês
    // selecionado ("Total do mês"), diferente de cartão/cofre — que já mostram
    // um número acumulado (fatura em aberto / total de sempre). Corrigido pra
    // "Saldo atual" = saldo inicial cadastrado + todo o histórico de verdade,
    // acumulado de sempre até hoje — o mesmo tipo de número que os outros dois.
    //
    // Item 5 (16/09/2026), bug real corrigido: "até hoje" não estava sendo
    // respeitado de verdade — a soma incluía QUALQUER lançamento, inclusive
    // com `dataCompetencia` no futuro (ex.: uma parcela ainda não vencida),
    // o que inflava/desinflava o "Saldo atual" do card em relação ao "Saldo"
    // mostrado no drill-in daquele mesmo mês (que é sempre limitado ao mês
    // selecionado). Agora a soma respeita literalmente "até hoje".
    const hojeISO = hojeEfetivoISO()
    return {
      rotulo: 'Saldo atual',
      valor: (conta.saldoInicial ?? 0) + daConta.filter((l) => l.dataCompetencia <= hojeISO).reduce((s, l) => s + l.valor, 0),
    }
  }
  const linhasCarteira: ExportRow[] = [
    ...contas.map((c) => {
      const v = valorDoCard(c)
      return { nome: c.nome, tipo: c.tipo, rotulo: v.rotulo, valor: fmtBRL(v.valor), lancamentos: todosLancamentos.filter((l) => l.contaId === c.id).length }
    }),
    { nome: nomeCofrinho, tipo: 'cofrinho (padrão)', rotulo: 'Saldo acumulado', valor: fmtBRL(saldoCofrinho), lancamentos: '' },
  ]

  return (
    <>
      <div className="cabecalho-fixo">
        <TituloTelaN1
          titulo="Carteira"
          subtitulo={SUBTITULO_CARTEIRA}
          explicacao={EXPLICACAO_CARTEIRA}
          onExportar={() => setExportOpen(true)}
        />
      </div>
      {exportOpen && <ExportSheet title="Carteira" filenameBase={`morfofinp-carteira-${mes}`}
        screenColumns={[
          { key: 'nome', label: 'Lugar' },
          { key: 'rotulo', label: 'O que é o valor' },
          { key: 'valor', label: 'Valor' },
        ]}
        screenRows={linhasCarteira}
        detailColumns={[
          { key: 'nome', label: 'Lugar' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'rotulo', label: 'O que é o valor' },
          { key: 'valor', label: 'Valor' },
          { key: 'lancamentos', label: 'Lançamentos' },
        ]}
        detailRows={linhasCarteira}
        onClose={() => setExportOpen(false)} />}
      {/* 12/09/2026 (build 053) — ver nota em `Situacao.tsx`. */}

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
          // Item 2 (15/09/2026): acumulado de sempre, igual ao cofre — ver
          // comentário em `valorDoCard`. Item 5 (16/09/2026): limitado a
          // "até hoje" de verdade (mesma correção de `valorDoCard`).
          const hojeISO = hojeEfetivoISO()
          valorNumero = (conta.saldoInicial ?? 0) + lancamentosDaConta.filter((l) => l.dataCompetencia <= hojeISO).reduce((s, l) => s + l.valor, 0)
          rotuloValor = 'Saldo atual'
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
              {/* Ícone da carteira (10/09/2026) — o mesmo selo redondo
                  cadastrado em "Contas e carteiras". */}
              <strong style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <SeloInstituicao
                  instituicao={conta.iconeInstituicao}
                  cor={conta.iconeCor}
                  imagemUri={conta.iconeImagemUri}
                  nome={conta.nome}
                  tamanho={30}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conta.nome}</span>
              </strong>
              <strong className={conta.tipo === 'cartao' ? 'valor-neg' : valorNumero < 0 ? 'valor-neg' : 'valor-pos'}>
                {fmtBRL(valorNumero)}
              </strong>
            </div>
            <span className="texto-fraco">{rotuloValor}</span>
            {/* TODA conta de tipo cofrinho ganha o "informar o saldo real"
                (build 086, pedido do Rafael) — antes ele existia só no card
                VIRTUAL. O número grande do card continua sendo o acumulado
                pelos lançamentos; o informe aparece como a linha de contexto
                logo abaixo, exatamente como no card virtual. */}
            {conta.tipo === 'cofre' && (
              <LinhaInformeSaldo contaId={conta.id!} calculado={valorNumero} />
            )}
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
                    <span className={l.valor < 0 ? 'valor-neutro' : 'valor-pos'}>
                      {l.valor < 0 ? '-' : '+'}{fmtNum(l.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </button>
        )
      })}

      <button type="button" className="card-conta" data-testid="card-cofrinho-padrao" onClick={() => setSelecionado('cofrinho')}>
        <SaldoDoCofrinho
          calculado={saldoCofrinho}
          nome={nomeCofrinho}
          selo={
            cofrinhoPadrao ? (
              <SeloInstituicao
                instituicao={cofrinhoPadrao.iconeInstituicao}
                cor={cofrinhoPadrao.iconeCor}
                imagemUri={cofrinhoPadrao.iconeImagemUri}
                nome={cofrinhoPadrao.nome}
                tamanho={24}
              />
            ) : undefined
          }
        />
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
                    <span className={l.valor < 0 ? 'valor-neutro' : 'valor-pos'}>
                      {l.valor < 0 ? '-' : '+'}{fmtNum(l.valor)}
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

/* Build 092 (17/09/2026) — o FECHAMENTO da lista, único bloco de totais
   que sobrou. Pedido do Rafael: "na carteira tem muita informação de total,
   confuso demais, vamos arrancar todas as linhas de totais que são acumulados
   de outros meses". Saíram: o card "ATÉ HOJE" no fim da lista (acumulado da
   vida toda da conta), o card "Entrada Total/Saída Total/Total do Mês" +
   "Total desta fatura" + "Saldo" (embaixo de toda lista e, no cartão, também
   no topo). Fica UM bloco, no fim da lista:
   - Entrada · Saída · Total (do mês; no cartão o total se chama "Total da
     fatura"; com período escolhido, "Total do período");
   - só em conta que NÃO é cartão: "Saldo do mês anterior" (saldo-base da
     conta + tudo antes do início da janela) e "Total acumulado" (= o
     anterior + o total do mês). Os três números fecham entre si por
     construção — é a única conta que a pessoa precisa fazer de cabeça.
   No cartão o topo fica só com o card de quitação (total · pago · falta +
   os pagamentos com data) — o "saldo acumulado" de um cartão nunca foi um
   número útil (ver nota de 31/08/2026: o modelo não credita o cartão). */
function FechamentoDaLista({
  itensPeriodo,
  rotuloTotal,
  saldoAnterior,
}: {
  itensPeriodo: { valor: number }[]
  rotuloTotal: string
  /** `undefined` = cartão (não mostra as duas linhas acumuladas). */
  saldoAnterior?: number
}) {
  const totalPeriodo = somarTotais(itensPeriodo).total
  return (
    <div className="total-geral" data-testid="fechamento-lista">
      <TotaisEntradaSaida itens={itensPeriodo} rotulos={{ entrada: 'Entrada', saida: 'Saída', total: rotuloTotal }} />
      {saldoAnterior !== undefined && (
        <>
          <div className="linha" style={{ border: 'none', padding: '8px 0 0', borderTop: '1px solid var(--borda)', marginTop: 8 }}>
            <span className="texto-fraco">Saldo do mês anterior</span>
            <strong data-testid="saldo-mes-anterior">{fmtBRLComSinal(saldoAnterior)}</strong>
          </div>
          <div className="linha" style={{ border: 'none', padding: '4px 0 0' }}>
            <span>Total acumulado</span>
            <strong className={saldoAnterior + totalPeriodo >= 0 ? 'valor-pos' : 'valor-neg'} style={{ fontSize: 16 }} data-testid="total-acumulado">
              {fmtBRLComSinal(saldoAnterior + totalPeriodo)}
            </strong>
          </div>
        </>
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
  grupos,
  categoriaPorId,
  contaPorId,
  contasDisponiveis,
  todosLancamentos,
  saldoCofrinho,
}: {
  titulo: string
  conta?: Conta
  /** Só no cofrinho virtual: o saldo pelos lançamentos, pra informar o real aqui dentro. */
  saldoCofrinho?: number
  mes: string
  aoMudarMes: (mes: string) => void
  aoAbrirLancamento: TelaProps['aoAbrirLancamento']
  aoVoltar: () => void
  contaIdSugerida?: number
  lancamentosDoLugar: Lancamento[]
  vinculadosInformativos?: Lancamento[]
  categorias: Categoria[]
  grupos: GrupoRegistro[]
  categoriaPorId: Map<number, Categoria>
  contaPorId: Map<number, Conta>
  contasDisponiveis: Conta[]
  todosLancamentos: Lancamento[]
}) {
  const isCartao = conta?.tipo === 'cartao'

  const [ordemDesc, setOrdemDesc] = useState(true)
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  /* Edição em massa (14/09/2026) — a MESMA peça da tela de Lançamentos. */
  const [massaAberta, setMassaAberta] = useState(false)
  /* Busca e filtros ANTES do hook de período: voltar pro modo mês limpa os
     dois, exatamente como em Lançamentos. */
  const [busca, setBusca] = useState('')
  const [filtros, setFiltros] = useState<FiltrosAvancados>(FILTROS_VAZIOS)

  /* Item 2 (16/09/2026, rodada seguinte à build 077): este drill-in passou a
     ter o MESMO topo da tela de Lançamentos — o nome do mês abre o popup de
     "período ou mês" (`SeletorMes` + `usePeriodoLista`, a MESMA peça, nunca
     uma segunda implementação; ver `src/components/periodoLista.ts`). */
  const { modoPeriodo, periodoDe, periodoAte, propsSeletor } = usePeriodoLista(mes, aoMudarMes, () => {
    setFiltros(FILTROS_VAZIOS)
    setBusca('')
  })

  /* Com período ativo a janela é o intervalo escolhido, para TODO tipo de
     conta — inclusive cartão: o pedido é "ver de tal data a tal data", então
     o ciclo de fatura (e o `faturaOverride`, que só existe para dizer em qual
     CICLO um lançamento cai) não se aplica; a data manda, direta. */
  const janela = modoPeriodo
    ? { inicio: periodoDe, fim: periodoAte }
    : isCartao
      ? janelaFatura(conta?.diaFechamento ?? 9, mes)
      : { inicio: `${mes}-01`, fim: `${mes}-31` }

  // `faturaOverride` puxa um lançamento de cartão pro ciclo VIZINHO ao que a
  // data indicaria (item 1 de 15/09/2026). Desde a build 090 a regra mora
  // em `faturaCiclo.ts` (`lancamentosDoCiclo`) — a MESMA que o formulário e
  // a quitação usam, nunca uma cópia aqui.
  const dentroDaJanela = (l: Lancamento, j: { inicio: string; fim: string }) =>
    l.dataCompetencia >= j.inicio && l.dataCompetencia <= j.fim
  const doPeriodoBruto =
    modoPeriodo || !isCartao
      ? lancamentosDoLugar.filter((l) => dentroDaJanela(l, janela))
      : lancamentosDoCiclo(lancamentosDoLugar, conta?.diaFechamento ?? DIA_FECHAMENTO_PADRAO, mes)
  /* Situação da fatura (build 090): total, o que já foi pago e o que falta —
     ver `situacaoDaFatura`. Fora do modo período (que não é um ciclo). */
  const fatura =
    isCartao && conta && !modoPeriodo ? situacaoDaFatura(todosLancamentos, categoriaPorId, conta, mes) : null

  /* Build 092 — "Saldo do mês anterior": saldo-base da conta + tudo que
     aconteceu ANTES do início da janela (mês civil ou período escolhido).
     Só para conta que não é cartão — ver `FechamentoDaLista`. */
  const saldoAnterior = isCartao
    ? undefined
    : (conta?.saldoInicial ?? 0) +
      lancamentosDoLugar.filter((l) => l.dataCompetencia < janela.inicio).reduce((s, l) => s + l.valor, 0)

  const doPeriodoFiltrado = aplicarFiltros(doPeriodoBruto, busca, filtros, categoriaPorId, contaPorId)
  const doPeriodo = [...doPeriodoFiltrado].sort((a, b) =>
    ordemDesc ? b.dataCompetencia.localeCompare(a.dataCompetencia) : a.dataCompetencia.localeCompare(b.dataCompetencia),
  )

  function agrupar(itens: Lancamento[]) {
    const out: { data: string; itens: Lancamento[] }[] = []
    for (const l of itens) {
      const ultima = out[out.length - 1]
      if (ultima && ultima.data === l.dataCompetencia) ultima.itens.push(l)
      else out.push({ data: l.dataCompetencia, itens: [l] })
    }
    return out
  }

  /* Seleção múltipla e corte "até Hoje" × "dias futuros" (10/09/2026, pedido
     do Rafael) — as MESMAS peças da tela de Lançamentos
     (`src/components/SelecaoETotais.tsx`), nada duplicado aqui. O corte só
     aparece quando de fato existe registro dos dois lados. */
  const selecao = useSelecao(doPeriodo.map((l) => l.id!).filter(Boolean))
  const blocos = blocosPorCorte(doPeriodo, ordemDesc).map((b) => ({ ...b, sessoes: agrupar(b.itens) }))
  const sessoes = blocos.flatMap((b) => b.sessoes)

  function linhaDe(l: Lancamento) {
    // Item 11 (15/09/2026): o drill-in de conta ganhou o mesmo gesto de
    // arrastar-pra-agir (Duplicar/Editar/Excluir) que Lançamentos.tsx já
    // tinha — antes só o clique abria o detalhe, sem atalho nenhum aqui.
    // `ItemLancamentoAcoes` já inclui o próprio wrapper (`.item-lancamento`),
    // então `.linha-completa-wrapper` (que só existia pra dar largura/borda
    // ao conteúdo simples de antes) não é mais necessária aqui.
    return (
      <div key={l.id} className="linha-selecionavel">
        {selecao.ativa && (
          <MarcadorLinha marcado={selecao.estaMarcado(l.id!)} onAlternar={() => selecao.alternar(l.id!)} />
        )}
        <ItemLancamentoAcoes
          lancamento={l}
          categoria={categoriaPorId.get(l.categoriaId)}
          origemLabel={conta && l.contaId === conta.id ? undefined : `via ${contaPorId.get(l.contaId)?.nome ?? '—'}`}
          onAbrir={() => (selecao.ativa ? selecao.alternar(l.id!) : aoAbrirLancamento({ id: l.id }))}
          onDuplicar={() => aoAbrirLancamento({ id: l.id, abrirClonando: true })}
        />
      </div>
    )
  }

  // --- Quitação da fatura (só cartão). Até a build 089 o pagamento era um
  // formulário inline aqui dentro, que criava o lançamento por conta própria
  // e marcava TODO o ciclo como pago — mesmo pagando uma parte — e o valor
  // "ainda não paga" nunca descontava nada. Build 090 (decisão do Rafael,
  // 17/09/2026): o botão abre a TELA DE LANÇAMENTO já preenchida (cartão,
  // fatura, saída, valor que falta, categoria); o formulário grava
  // `faturaCartaoId`/`faturaMes` e reavalia a quitação
  // (`reavaliarQuitacao`, `faturaPagamento.ts`). Aqui só se LÊ.
  function abrirPagamento() {
    if (!conta || !fatura) return
    aoAbrirLancamento({
      pagamentoFatura: { cartaoId: conta.id!, mesFatura: mes, valorSugerido: Math.max(fatura.restante, 0) },
    })
  }

  // --- Ajuste de fluxo via cofrinho (ponto 7) — só informativo, nunca soma
  // no saldo. Recortado pro mês selecionado (é um ajuste mensal, não
  // histórico acumulado).
  const ajustesDoMes = (vinculadosInformativos ?? []).filter((l) => l.dataCompetencia.startsWith(mes))
  const totalAjustesDoMes = ajustesDoMes.reduce((s, l) => s + Math.abs(l.valor), 0)

  const rotuloTotal = modoPeriodo ? 'Total do período' : isCartao ? 'Total da fatura' : 'Total do mês'

  return (
    <>
      <div className="cabecalho-fixo">
        {/* Mesma fileira de ícones de Lançamentos (10/09/2026): Selecionar ·
            Buscar · Filtro, agora dentro da linha do título, com o "‹ Voltar"
            à esquerda. Ordenação foi pra dentro da folha de filtros e a
            contagem só aparece com a seleção ativa. */}
        <TituloTelaN1
          titulo={titulo}
          antes={
            <button type="button" className="botao-voltar-circular" onClick={aoVoltar} aria-label="Voltar">
              ‹
            </button>
          }
          acoesLista={{
            onSelecionar: () => (selecao.ativa ? selecao.sair() : selecao.ativar()),
            selecaoAtiva: selecao.ativa,
            onBuscar: () => setBuscaAberta((v) => !v),
            buscaAtiva: busca !== '',
            onFiltrar: () => setFiltrosAbertos(true),
            filtrosAtivos: contarFiltrosAtivos(filtros),
          }}
        />
        <SeletorMes mes={mes} onMudar={aoMudarMes} periodo={propsSeletor} />
        {(buscaAberta || busca !== '') && (
          <CampoBusca busca={busca} onBuscaChange={setBusca} onFechar={() => setBuscaAberta(false)} />
        )}
        {selecao.ativa && (
          <div className="linha" style={{ border: 'none', padding: 0, alignItems: 'flex-start', gap: 8 }}>
            <BarraSelecao selecao={selecao} total={doPeriodo.length} onAlterar={() => setMassaAberta(true)} />
          </div>
        )}
      </div>
      {filtrosAbertos && (
        <FolhaFiltros
          filtros={filtros}
          categorias={categorias}
          grupos={grupos}
          contas={contasDisponiveis}
          ordemDesc={ordemDesc}
          onFechar={() => setFiltrosAbertos(false)}
          onAplicar={(f, ordem) => { setFiltros(f); setOrdemDesc(ordem); setFiltrosAbertos(false) }}
        />
      )}
      {massaAberta && (
        <EdicaoEmMassa
          ids={[...selecao.marcados]}
          mes={mes}
          onFechar={(r) => {
            setMassaAberta(false)
            if (r) selecao.sair()
          }}
        />
      )}
      {/* Item 2 (16/09/2026, rodada seguinte): com PERÍODO ativo esta linha não
          aparece — o recorte deixou de ser um ciclo de fatura e virou o
          intervalo de datas escolhido; anunciar "Fatura de … a …" ali diria uma
          coisa que a lista não está mostrando. */}
      {isCartao && !modoPeriodo && (
        // Item 15 (16/09/2026): esse parágrafo tinha `marginTop: -10`, que o
        // puxava por baixo do `.cabecalho-fixo` (sticky, fundo sólido) —
        // ficava com o topo cortado/escondido atrás do cabeçalho. Removida a
        // margem negativa; o respiro entre o cabeçalho e o texto já vem do
        // próprio `.cabecalho-fixo`.
        <p className="texto-fraco" style={{ marginTop: 10, marginBottom: 14 }}>
          Fatura de {formatarDataCurta(janela.inicio)} a {formatarDataCurta(janela.fim)}
          {conta?.diaVencimento ? ` · vence dia ${conta.diaVencimento}` : ''}
        </p>
      )}

      {/* Informar o saldo real também AQUI DENTRO (build 059): quem tocou no card
          veio ver o cofrinho, e era só do lado de fora que dava pra informar. */}
      {saldoCofrinho != null && (
        <div className="cartao" style={{ marginBottom: 12 }}>
          <SaldoDoCofrinho calculado={saldoCofrinho} />
        </div>
      )}

      {/* Mesmo botão no DRILL-IN de uma conta de cofrinho real (build 086) —
          o card virtual já tinha isso desde a 059 pelo mesmo motivo: quem
          tocou no card veio ver o cofrinho. O calculado aqui é o acumulado da
          conta, a MESMA conta do card (`valorDoCard`). */}
      {conta?.tipo === 'cofre' && (
        <div className="cartao" style={{ marginBottom: 12 }}>
          <LinhaInformeSaldo
            contaId={conta.id!}
            calculado={lancamentosDoLugar.reduce((s, l) => s + l.valor, 0)}
          />
        </div>
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

      {/* Build 092: o totalizador do TOPO do cartão saiu — no topo fica só a
          quitação (abaixo). */}

      {fatura && (fatura.itens.length > 0 || fatura.pagamentos.length > 0) && (
        <div className="cartao" style={{ marginTop: 10, marginBottom: 10 }} data-testid="card-quitacao">
          <strong style={{ fontSize: 13 }}>
            {fatura.quitada ? 'Fatura paga' : fatura.pagamentos.length > 0 ? 'Fatura paga em parte' : 'Fatura ainda não paga'}
          </strong>
          <div className="linha" style={{ border: 'none', padding: '6px 0 0' }}>
            <span className="texto-fraco">Total da fatura</span>
            <strong data-testid="fatura-total">{fmtBRL(fatura.total)}</strong>
          </div>
          {fatura.pagamentos.length > 0 && (
            <div className="linha" style={{ border: 'none', padding: '2px 0 0' }}>
              <span className="texto-fraco">Já pago</span>
              <strong className="valor-pos" data-testid="fatura-pago">{fmtBRL(fatura.pago)}</strong>
            </div>
          )}
          {!fatura.quitada && (
            <div className="linha" style={{ border: 'none', padding: '2px 0 0' }}>
              <span>{fatura.pagamentos.length > 0 ? 'Falta pagar' : 'A pagar'}</span>
              <strong className="valor-neg" data-testid="fatura-restante">{fmtBRL(fatura.restante)}</strong>
            </div>
          )}
          {fatura.pagamentos.length > 0 && (
            <div style={{ marginTop: 6 }} data-testid="fatura-pagamentos">
              {/* Build 092: cada pagamento leva a DATA em que foi feito — a
                  linha Completa não mostra data (ela vive numa sessão por
                  dia), e aqui o dia do pagamento é a informação. */}
              {fatura.pagamentos.map((l) => (
                <div key={l.id}>
                  <div className="sessao-data-simples" data-testid="fatura-pagamento-data">{formatarCabecalhoData(l.dataCompetencia)}</div>
                  {linhaDe(l)}
                </div>
              ))}
            </div>
          )}
          {!fatura.quitada && (
            <button type="button" className="primario" style={{ marginTop: 10 }} onClick={abrirPagamento} data-testid="pagar-fatura">
              {fatura.pagamentos.length > 0 ? 'Pagar o restante' : 'Pagar esta fatura'}
            </button>
          )}
        </div>
      )}

      <div className="cartao" style={{ padding: '0 12px' }}>
        {isCartao && <h2 style={{ marginTop: 12 }}>Compras da Fatura</h2>}
        {sessoes.length === 0 && (
          <p className="texto-fraco" style={{ padding: '14px 4px' }}>
            Nenhum lançamento encontrado {isCartao ? 'neste ciclo' : 'neste mês'}.
          </p>
        )}
        {blocos.map((b) => (
          <div key={b.chave}>
            {blocos.length > 1 && !selecao.ativa && <div className="bloco-corte-titulo">{b.titulo}</div>}
            {b.sessoes.map((sessao) => (
              <div key={sessao.data}>
                <div className={`sessao-data ${fundoDaLinhaDeData(sessao.itens)}`}>{formatarCabecalhoData(sessao.data)}</div>
                {sessao.itens.map((l) => linhaDe(l))}
              </div>
            ))}
            {/* Item 1 (16/09/2026): os totais por bloco ("Até hoje"/"Dias
                futuros") que apareciam AQUI, no meio/topo da lista, saíram —
                viraram o card único "Até hoje" no FIM da lista, logo abaixo. */}
          </div>
        ))}
        {/* Build 092: o fechamento da lista — o ÚNICO bloco de totais que
            sobrou (ver `FechamentoDaLista`). */}
        {doPeriodoBruto.length > 0 && !selecao.ativa && (
          <div style={{ padding: '8px 0 10px' }}>
            <FechamentoDaLista itensPeriodo={doPeriodoBruto} rotuloTotal={rotuloTotal} saldoAnterior={saldoAnterior} />
          </div>
        )}
      </div>

      {/* Entrada · Saída · Total da lista, FIXO no rodapé (10/09/2026). Vem
          por ÚLTIMO de propósito: um elemento `sticky` com fundo opaco esconde
          o que vier depois dele quando a rolagem passa — o bloco de saldo do
          período (`BlocoPeriodoESaldo`, acima) ficaria inalcançável.

          BUILD 066: aqui ela só aparece com RECORTE ATIVO (busca, filtro ou
          seleção). Sem recorte, ela repetia exatamente o "movimento do mês" do
          bloco acima — dois totais iguais, com nomes diferentes, um em cima do
          outro: o começo da confusão que o Rafael relatou. Com recorte ela
          informa o que o bloco não informa (o total do que está filtrado), e aí
          ganha o lugar de volta. Em Lançamentos nada muda: lá ela é o ÚNICO
          total da tela. */}
      {doPeriodo.length > 0 && (selecao.ativa || busca.trim() !== '' || contarFiltrosAtivos(filtros) > 0) && (
        <RodapeTotais>
          <TotaisEntradaSaida
            recolhivel
            destaque={selecao.ativa}
            rotulo={selecao.ativa ? `Selecionados (${selecao.qtd})` : 'Total do que está filtrado'}
            itens={selecao.ativa ? doPeriodo.filter((l) => selecao.marcados.has(l.id!)) : doPeriodo}
          />
        </RodapeTotais>
      )}

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
