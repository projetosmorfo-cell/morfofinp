import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type Conta, type GrupoRegistro, type Lancamento } from '../db'
import type { TelaProps } from '../mes'
import SeletorMes from '../components/SeletorMes'
import ItemLancamentoAcoes from '../components/ItemLancamentoAcoes'
import { usePeriodoLista } from '../components/periodoLista'
import SeloInstituicao from '../components/SeloInstituicao'
import {
  useSelecao, BarraSelecao, TotaisEntradaSaida, MarcadorLinha, blocosPorCorte, RodapeTotais,
} from '../components/SelecaoETotais'
import { CampoBusca, FolhaFiltros, FILTROS_VAZIOS, aplicarFiltros, contarFiltrosAtivos, ChipsFiltrosAtivos, type FiltrosAvancados } from '../components/BuscaEFiltros'
import { janelaFatura, lancamentosDoCiclo, situacaoDaFatura, DIA_FECHAMENTO_PADRAO, type SituacaoFatura } from '../faturaCiclo'
import { totalDoLugar, lancamentosDoCofrinhoVirtual, ancorarNoInformado, type TotalDoLugar } from '../totaisCarteira'
import { formatarCabecalhoData } from '../formatoData'
import { fundoDaLinhaDeData, jaAconteceu } from '../statusPagamento'
import SaldoDoCofrinho, { LinhaInformeSaldo, useUltimosInformesPorConta, COFRINHO_VIRTUAL_ID, type InformeSaldo } from '../components/SaldoDoCofrinho'
import BotaoAjuda from '../components/BotaoAjuda'

/* Build 100 (18/09/2026) — o mesmo texto do "ⓘ" nos dois lugares que mostram
   "Total aplicando o comprometido" (card de fora e fechamento de dentro),
   pedido do Rafael. Uma constante só, pra nunca dessincronizar. */
const AJUDA_COMPROMETIDO =
  'O que ainda não aconteceu: lançamentos já cadastrados que faltam pagar ou receber. Somado ao total real, dá este número — ex.: uma conta que vence dia 20, se hoje é dia 10, já entra aqui mesmo sem ter saído do banco ainda.'
import { fmtBRL } from '../formatoMoeda'
import { useHojeSimuladoISO } from '../hojeSimulado'
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

// `janelaFaturaEmAberto` morou aqui até 17/09/2026 (build 094, item 3).
// Ela desenhava o card do cartão com um recorte PRÓPRIO — "do último
// fechamento até HOJE" — enquanto o drill-in mostrava o ciclo inteiro do mês.
// Dois números com nomes parecidos ("Fatura até o momento" × "Total da
// fatura") na mesma tela, discordando por construção. Agora o card e o
// fechamento da lista saem os dois de `totalDoLugar()` (`src/totaisCarteira.ts`),
// que usa o mês selecionado para TODO tipo de lugar. Nada mais precisa desta
// janela; se algum dia voltar a precisar, ela nasce lá, não aqui.

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
  /* Build 100: o informe de saldo de CADA conta tipo cofre (+ do cofrinho
     virtual), numa `useLiveQuery` só — ver `ancorarNoInformado`. */
  const informes = useUltimosInformesPorConta()

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

  function categoriasVinculadasDe(contaId: number): number[] {
    // `categorias!`: o guard `if (!categorias) return null` já garantiu que
    // está definida — TS não propaga esse narrowing pra dentro de uma
    // função aninhada (fica conservador, já que em teoria a função poderia
    // ser chamada depois de outra execução; na prática essa função só é
    // chamada mais abaixo, no mesmo render, depois do guard).
    return categorias!.filter((c) => c.contaVinculada === contaId).map((c) => c.id!)
  }

  /* Build 094 (item 3) — o COFRINHO VIRTUAL sai da mesma fonte dos outros
     lugares. Antes o card fazia |aportes| − |gastos| sobre a vida inteira e o
     drill-in somava os valores crus (todos negativos, porque um aporte SAI da
     conta corrente): −R$ 4.565,15 no card contra −R$ 11.249,95 dentro. Agora
     os dois leem `lancamentosDoCofrinhoVirtual` (a cópia com o sinal do
     cofrinho) e `totalDoLugar` com o MESMO mês. */
  const lancamentosCofrinho = lancamentosDoCofrinhoVirtual(todosLancamentos, categoriaPorId)
  /* Build 099: o cofrinho virtual tem os DOIS números (real × com comprometido),
     como todo card — ver `totaisCarteira.ts`. `saldoCofrinho` (o real) é o que
     o informe de saldo compara.
     Build 100: ANCORADO no último saldo informado, quando existe — ver
     `ancorarNoInformado`. */
  const totalCofrinho = ancorarNoInformado(
    totalDoLugar(undefined, lancamentosCofrinho, mes, todosLancamentos, categoriaPorId),
    lancamentosCofrinho,
    informes.get(COFRINHO_VIRTUAL_ID),
    mes,
  )
  const saldoCofrinho = totalCofrinho.real

  if (selecionado !== null) {
    const conta = typeof selecionado === 'number' ? contas.find((c) => c.id === selecionado) : undefined
    /* Build 094: no cofrinho virtual a lista vem com o sinal DO COFRINHO —
       aporte entra, gasto sai (ver `totaisCarteira.ts`). Antes ela somava os
       valores crus (todos negativos, porque o aporte sai da conta corrente) e
       o fechamento dizia −R$ 11.249,95 enquanto o card dizia −R$ 4.565,15. */
    const lancamentosDoLugar = conta
      ? todosLancamentos.filter((l) => l.contaId === conta.id)
      : lancamentosCofrinho
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
        comprometidoCofrinho={conta ? undefined : totalCofrinho.valor}
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
        informes={informes}
      />
    )
  }

  /* G44 regra 11b. `valorDoCard` é a MESMA conta que cada card faz logo
     abaixo — extraída pra função pra a exportação nunca divergir do que está
     na tela (o Kit exporta "o que está sendo exibido agora").
     Build 094: e agora é também a MESMA conta que o fechamento do drill-in
     faz, porque as duas chamam `totalDoLugar` — ver `totaisCarteira.ts`. */
  function valorDoCard(conta: Conta) {
    /* `todosLancamentos!`/`categorias!`: o guard de carregamento já garantiu,
       mas o TS não propaga o narrowing pra dentro de função aninhada. */
    const doLugar = todosLancamentos!.filter((l) => l.contaId === conta.id)
    const t = totalDoLugar(conta, doLugar, mes, todosLancamentos!, categoriaPorId)
    // Build 100: conta tipo cofre também ancora no último saldo informado.
    return conta.tipo === 'cofre' ? ancorarNoInformado(t, doLugar, informes.get(conta.id!), mes) : t
  }

  const linhasCarteira: ExportRow[] = [
    ...contas.map((c) => {
      const v = valorDoCard(c)
      return { nome: c.nome, tipo: c.tipo, rotulo: `${v.rotulo} (real)`, valor: fmtBRL(v.real), comprometido: fmtBRL(v.valor), lancamentos: todosLancamentos.filter((l) => l.contaId === c.id).length }
    }),
    { nome: nomeCofrinho, tipo: 'cofrinho (padrão)', rotulo: 'Saldo acumulado (real)', valor: fmtBRL(saldoCofrinho), comprometido: fmtBRL(totalCofrinho.valor), lancamentos: '' },
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
        {/* Build 094 (item 3): a lista de cards ganhou o seletor de mês.
            Enquanto o card fazia um recorte próprio ("até hoje", "fatura até
            o momento") não havia mês a mostrar; agora que ele é o total do
            MÊS SELECIONADO — o mesmo que o drill-in abre — o número ficaria
            sem dizer de quando é. É o mesmo `mes` compartilhado pelas outras
            telas, então entrar e sair da Carteira não muda nada de lugar. */}
        <SeletorMes mes={mes} onMudar={aoMudarMes} />
      </div>
      {exportOpen && <ExportSheet title="Carteira" filenameBase={`morfofinp-carteira-${mes}`}
        screenColumns={[
          { key: 'nome', label: 'Lugar' },
          { key: 'rotulo', label: 'O que é o valor' },
          { key: 'valor', label: 'Valor real' },
          { key: 'comprometido', label: 'Com comprometido' },
        ]}
        screenRows={linhasCarteira}
        detailColumns={[
          { key: 'nome', label: 'Lugar' },
          { key: 'tipo', label: 'Tipo' },
          { key: 'rotulo', label: 'O que é o valor' },
          { key: 'valor', label: 'Valor real' },
          { key: 'comprometido', label: 'Com comprometido' },
          { key: 'lancamentos', label: 'Lançamentos' },
        ]}
        detailRows={linhasCarteira}
        onClose={() => setExportOpen(false)} />}
      {/* 12/09/2026 (build 053) — ver nota em `Situacao.tsx`. */}

      {contas.map((conta) => {
        /* Build 094: o número do card é EXATAMENTE o do fechamento do
           drill-in — a mesma `totalDoLugar`, o mesmo mês. Antes cada um
           tinha o seu recorte (card até HOJE, drill-in até o fim do mês) e
           dois nomes parecidos discordavam na mesma tela. */
        const t = valorDoCard(conta)
        /* Build 099: no cartão o status de pagamento (com o resíduo da fatura
           anterior) vem da MESMA função da quitação — `situacaoDaFatura`. */
        const situacao = conta.tipo === 'cartao' ? situacaoDaFatura(todosLancamentos, categoriaPorId, conta, mes) : null
        // Build 093 (item 4): a prévia dos 3 últimos lançamentos (F-05 da
        // revisão de UI de 04/09/2026) SAIU dos cards — pedido do Rafael: "os
        // cards não devem mais mostrar os últimos lançamentos". O card volta a
        // ser só nome · número · o que é o número (+ o informe de saldo no
        // cofrinho); a lista vive no toque.
        return (
          <button
            key={conta.id}
            type="button"
            className="card-conta"
            onClick={() => setSelecionado(conta.id!)}
            data-testid={`card-conta-${conta.id}`}
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
              {/* Build 094 (item 3): o SINAL é escrito. Build 099: o número em
                  destaque é o REAL (só o que já aconteceu). */}
              <strong className={conta.tipo === 'cartao' ? 'valor-neg' : t.real < 0 ? 'valor-neg' : 'valor-pos'} data-testid="card-total-real">
                {fmtBRLComSinal(t.real)}
              </strong>
            </div>
            <DoisTotais
              tipo={conta.tipo}
              real={t.real}
              comprometido={t.valor}
              janela={t.janela}
              diaVencimento={conta.diaVencimento}
              situacao={situacao}
            />
            {/* Build 096/099 (pedido do Rafael): TODO card de cofrinho mostra o
                saldo real informado e quanto ele variou desde a última
                atualização. Só cofrinho: numa conta corrente ou num cartão não
                existe "atualização de saldo" a comparar. */}
            {conta.tipo === 'cofre' && (
              <LinhaInformeSaldo contaId={conta.id!} calculado={t.real} />
            )}
          </button>
        )
      })}

      <button type="button" className="card-conta" data-testid="card-cofrinho-padrao" onClick={() => setSelecionado('cofrinho')}>
        <SaldoDoCofrinho
          calculado={saldoCofrinho}
          comprometido={totalCofrinho.valor}
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
        {/* Build 093 (item 4): sem prévia de lançamentos aqui também. */}
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
  total,
  totalForcado,
}: {
  itensPeriodo: { valor: number }[]
  rotuloTotal: string
  /** `undefined` = período (não mostra as linhas de baixo).
      Build 100: em MODO SELEÇÃO chega um `total` sintético (só dos itens
      marcados), sem `saldoAnterior` — por isso essa linha ficou separada das
      outras duas logo abaixo: elas aparecem sempre que existe QUALQUER
      `total`, a de saldo anterior só quando ele existe de verdade. */
  total?: TotalDoLugar
  /* Build 094 (item 3): o total da FATURA vem de `totalDoLugar`, o mesmo
     número (e o mesmo sinal) do card de fora e do card de quitação. */
  totalForcado?: number
}) {
  const modoSelecao = total?.saldoAnterior === undefined
  return (
    <div className="total-geral" data-testid="fechamento-lista">
      <TotaisEntradaSaida itens={itensPeriodo} total={totalForcado} rotulos={{ entrada: 'Entrada', saida: 'Saída', total: rotuloTotal }} />
      {total && (
        <>
          {/* Build 099: as MESMAS duas linhas do card de fora — o real (só o
              que já aconteceu) em destaque e o "com comprometido" abaixo, com
              menos. É isso que faz o de dentro bater com o de fora: os dois
              leem `totalDoLugar`.
              Build 100: em modo seleção não existe "saldo do mês anterior"
              (não faz sentido pra um recorte arbitrário de itens marcados) —
              só ela sai; real/comprometido continuam, agora "dos
              selecionados". */}
          {!modoSelecao && (
            <div className="linha" style={{ border: 'none', padding: '8px 0 0', borderTop: '1px solid var(--borda)', marginTop: 8 }}>
              <span className="texto-fraco">Saldo do mês anterior (real)</span>
              <strong data-testid="saldo-mes-anterior">{fmtBRLComSinal(total.saldoAnteriorReal ?? total.saldoAnterior!)}</strong>
            </div>
          )}
          <div className="linha" style={{ border: 'none', padding: modoSelecao ? '8px 0 0' : '4px 0 0', borderTop: modoSelecao ? '1px solid var(--borda)' : undefined, marginTop: modoSelecao ? 8 : undefined }}>
            <span>Total real{modoSelecao ? ' (selecionados)' : ' (já executado)'}</span>
            <strong className={total.real >= 0 ? 'valor-pos' : 'valor-neg'} style={{ fontSize: 16 }} data-testid="total-acumulado">
              {fmtBRLComSinal(total.real)}
            </strong>
          </div>
          <div className="linha linha-total-card" style={{ border: 'none', padding: '2px 0 0' }}>
            <span className="linha-total-rotulo texto-fraco">
              Total aplicando o comprometido{modoSelecao ? ' (selecionados)' : ''}
              <BotaoAjuda texto={AJUDA_COMPROMETIDO} />
            </span>
            <span className="linha-total-valor texto-fraco" data-testid="total-comprometido">{fmtBRLComSinal(total.valor)}</span>
          </div>
        </>
      )}
    </div>
  )
}

/* Build 099 (18/09/2026) — OS DOIS TOTAIS DE UM CARD, pedido do Rafael: o
   real (só o que já aconteceu) em destaque no cabeçalho do card, e aqui
   embaixo, com menos destaque, o executado + comprometido. No cartão o
   recorte é a FATURA que fecha no mês selecionado: a linha diz o período
   ("de x até y") e o vencimento, e a última linha diz o que falta pagar —
   já com o resíduo da fatura anterior (ver `situacaoDaFatura`). */
function DoisTotais({
  tipo,
  real,
  comprometido,
  janela,
  diaVencimento,
  situacao,
}: {
  tipo: Conta['tipo']
  real: number
  comprometido: number
  janela?: { inicio: string; fim: string }
  diaVencimento?: number
  situacao: SituacaoFatura | null
}) {
  if (tipo === 'cartao') {
    /* Build 100 (18/09/2026), pedido do Rafael: tarja "Pago" AZUL quando
       100% ou mais da fatura está pago, tarja vermelha quando 0% — e, sempre
       que existe ALGUM pagamento mas ainda não fechou 100%, uma linha extra
       com o que já foi pago (azul) e o que falta (vermelho). `quitada` já
       soma o resíduo da fatura anterior (é a mesma régua do card de
       quitação, "Falta pagar" que virou "Faltante" na Decisão 120). */
    const mostraStatus =
      situacao && (situacao.itens.length > 0 || situacao.pagamentos.length > 0 || Math.abs(situacao.residuoAnterior) >= 0.005)
    const totalmentePago = !!situacao?.quitada
    const nadaPago = !!situacao && situacao.pago <= 0.005
    const parcialmentePago = !!situacao && !totalmentePago && !nadaPago
    return (
      <div className="card-dois-totais">
        <span className="texto-fraco" data-testid="card-periodo-fatura">
          Já na fatura{janela ? ` · de ${formatarDataCurta(janela.inicio)} a ${formatarDataCurta(janela.fim)}` : ''}
          {diaVencimento ? ` · vence dia ${diaVencimento}` : ''}
        </span>
        <span className="linha-total-card">
          <span className="linha-total-rotulo texto-fraco">
            Fatura inteira{situacao && Math.abs(comprometido - real) >= 0.005 ? ' (com o que ainda vai cair)' : ''}
          </span>
          <span className="linha-total-valor texto-fraco" data-testid="card-total-comprometido">{fmtBRL(comprometido)}</span>
        </span>
        {mostraStatus && (totalmentePago || nadaPago) && (
          <span className={`tarja-fatura-status ${totalmentePago ? 'tarja-fatura-azul' : 'tarja-fatura-vermelha'}`} data-testid="card-status-fatura">
            {totalmentePago ? 'Pago' : 'Não pago'}
          </span>
        )}
        {mostraStatus && parcialmentePago && (
          <span className="linha-total-card" data-testid="card-pago-a-pagar">
            <span className="linha-total-rotulo">
              Pago <strong className="linha-total-valor valor-azul" data-testid="card-fatura-pago">{fmtBRL(situacao!.pago)}</strong>
            </span>
            <span className="linha-total-rotulo">
              A pagar <strong className="linha-total-valor valor-neg" data-testid="card-fatura-a-pagar">{fmtBRL(Math.max(situacao!.restante, 0))}</strong>
            </span>
          </span>
        )}
      </div>
    )
  }
  return (
    <div className="card-dois-totais">
      {/* Decisão 121 (build 101), pedido do Rafael: retirar esta legenda do
          card da tela principal (antes de clicar pra entrar nos detalhes) —
          ficava sem valor ao lado e não ajudava. O número "real" continua no
          cabeçalho do card; só a legenda solta some. */}
      <span className="linha-total-card">
        <span className="linha-total-rotulo texto-fraco">
          Total aplicando o comprometido
          <BotaoAjuda texto={AJUDA_COMPROMETIDO} />
        </span>
        <span className="linha-total-valor texto-fraco" data-testid="card-total-comprometido">{fmtBRLComSinal(comprometido)}</span>
      </span>
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
  comprometidoCofrinho,
  informes,
}: {
  titulo: string
  conta?: Conta
  /** Só no cofrinho virtual: o saldo pelos lançamentos, pra informar o real aqui dentro. */
  saldoCofrinho?: number
  /** Idem, executado + comprometido (build 099). */
  comprometidoCofrinho?: number
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
  /** Build 100: informe de saldo de cada conta, pra ancorar o total de conta tipo cofre. */
  informes: Map<number, InformeSaldo>
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
  /* Situação da fatura (build 090): total, o que já foi pago e o que falta —
     ver `situacaoDaFatura`. Fora do modo período (que não é um ciclo). */
  const fatura =
    isCartao && conta && !modoPeriodo ? situacaoDaFatura(todosLancamentos, categoriaPorId, conta, mes) : null
  /* Build 093 (item 2 — "o total da fatura não bate com o total no fim da
     lista"): no cartão a LISTA e o FECHAMENTO passam a ser `fatura.itens`, a
     MESMA lista que o card de quitação soma — nunca uma segunda seleção. Até
     a 092 a lista era `lancamentosDoCiclo(...)` cru, e `situacaoDaFatura`
     tira do total tudo que tem a categoria "Pagamento de fatura": um
     pagamento lançado NO PRÓPRIO CARTÃO (a perna de crédito de uma
     transferência, ou um pagamento gravado na conta errada) entrava na lista
     e no fechamento, mas não no "Total da fatura" do card — era esse o
     descompasso. Esses lançamentos não somem: vão pra seção própria abaixo
     do card de quitação (`foraDaFatura`), com a explicação. */
  const doPeriodoBruto = fatura
    ? fatura.itens
    : modoPeriodo || !isCartao
      ? lancamentosDoLugar.filter((l) => dentroDaJanela(l, janela))
      : []
  const foraDaFatura = fatura
    ? lancamentosDoCiclo(lancamentosDoLugar, conta?.diaFechamento ?? DIA_FECHAMENTO_PADRAO, mes).filter(
        (l) => !fatura.itens.includes(l),
      )
    : []

  /* Build 092 — "Saldo do mês anterior": saldo-base da conta + tudo que
     aconteceu ANTES do início da janela (mês civil ou período escolhido).
     Só para conta que não é cartão — ver `FechamentoDaLista`.

     Build 094 (item 3): no modo MÊS quem devolve esse número é
     `totalDoLugar()` — a MESMA função que desenha o card lá fora. É isso que
     faz o "Total acumulado" daqui e o número do card serem iguais por
     construção, e não por duas contas parecidas escritas em dois lugares.
     No modo PERÍODO a janela é outra (de tal data a tal data, escolha da
     pessoa), então a conta continua local: `totalDoLugar` só conhece mês. */
  /* Build 099: no modo MÊS o fechamento mostra os DOIS números do card
     (real × com comprometido) — o objeto inteiro de `totalDoLugar`. No modo
     PERÍODO (janela escolhida à mão) as linhas acumuladas não aparecem.
     Build 100: conta tipo cofre (+ cofrinho virtual) ancora no informado —
     a MESMA regra do card de fora, pra os dois nunca discordarem. */
  const isCofre = !conta || conta.tipo === 'cofre'
  const totalDoMesBruto = isCartao || modoPeriodo
    ? undefined
    : totalDoLugar(conta, lancamentosDoLugar, mes, todosLancamentos, categoriaPorId)
  const totalDoMes = totalDoMesBruto && isCofre
    ? ancorarNoInformado(totalDoMesBruto, lancamentosDoLugar, informes.get(conta?.id ?? COFRINHO_VIRTUAL_ID), mes)
    : totalDoMesBruto
  const saldoAnterior = totalDoMes?.saldoAnterior

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

  /* Build 100 (18/09/2026) — o total sintético de MODO SELEÇÃO: só dos itens
     marcados, sem saldo anterior (não existe pra um recorte arbitrário). O
     `rotulo`/`doMes` não são lidos por `FechamentoDaLista` neste modo —
     ficam só pra fechar o tipo `TotalDoLugar`. */
  const itensSelecionados = selecao.ativa ? doPeriodo.filter((l) => selecao.marcados.has(l.id!)) : []
  const totalSelecao: TotalDoLugar | undefined =
    selecao.ativa && itensSelecionados.length > 0
      ? {
          rotulo: 'Selecionados',
          valor: itensSelecionados.reduce((s, l) => s + l.valor, 0),
          real: itensSelecionados.filter(jaAconteceu).reduce((s, l) => s + l.valor, 0),
          doMes: 0,
        }
      : undefined

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
          /* Build 101 (Decisão 121): `viaContaDoCartao` só é `true` aqui
             DENTRO da conta do próprio cartão (`isCartao`) — é o único lugar
             onde a Carteira deixa editar um pagamento de fatura de verdade
             (ver `DetalheLancamento.tsx`). Passar sempre não tem efeito
             nenhum em lançamento comum (a tela só olha isto quando é um
             pagamento de fatura). */
          onAbrir={() => (selecao.ativa ? selecao.alternar(l.id!) : aoAbrirLancamento({ id: l.id, viaContaDoCartao: isCartao }))}
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
        {/* Build 099 (pedido do Rafael): no CARTÃO o topo mostra o PERÍODO DA
            FATURA no lugar do nome do mês — "de x até y", do 1º dia do ciclo
            (no mês anterior) ao dia de fechamento do mês selecionado — e, logo
            abaixo, o total REAL (o que já caiu na fatura) ao lado do período.
            As setas continuam andando mês a mês, ou seja, fatura a fatura. */}
        <SeletorMes
          mes={mes}
          onMudar={aoMudarMes}
          periodo={propsSeletor}
          rotuloCentro={isCartao && !modoPeriodo ? `${formatarDataCurta(janela.inicio)} – ${formatarDataCurta(janela.fim)}` : undefined}
        />
        {isCartao && !modoPeriodo && fatura && (
          <div className="linha topo-fatura" data-testid="topo-fatura">
            <span style={{ minWidth: 0 }}>
              <span className="texto-fraco" style={{ display: 'block', fontSize: 11.5 }}>
                Fatura de {formatarDataCurta(janela.inicio)} a {formatarDataCurta(janela.fim)}
                {conta?.diaVencimento ? ` · vence dia ${conta.diaVencimento}` : ''}
              </span>
              <span className="texto-fraco" style={{ fontSize: 12 }}>Já na fatura (real)</span>
            </span>
            <strong className="valor-neg" style={{ fontSize: 18 }} data-testid="topo-fatura-real">{fmtBRL(fatura.realizado)}</strong>
          </div>
        )}
        {/* Build 104 (F2, 19/09/2026): mesmos chips de filtro ativo de
            Lançamentos — ver o comentário em `Lancamentos.tsx`. */}
        <ChipsFiltrosAtivos filtros={filtros} categoriaPorId={categoriaPorId} contaPorId={contaPorId} onFiltrosChange={setFiltros} />
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
      {/* Informar o saldo real também AQUI DENTRO (build 059): quem tocou no card
          veio ver o cofrinho, e era só do lado de fora que dava pra informar. */}
      {saldoCofrinho != null && (
        <div className="cartao" style={{ marginBottom: 12 }}>
          <SaldoDoCofrinho calculado={saldoCofrinho} comprometido={comprometidoCofrinho} />
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

      {fatura && (fatura.itens.length > 0 || fatura.pagamentos.length > 0 || Math.abs(fatura.residuoAnterior) >= 0.005) && (
        <div className="cartao" style={{ marginTop: 10, marginBottom: 10 }} data-testid="card-quitacao">
          <strong style={{ fontSize: 13 }}>
            {fatura.quitada ? 'Fatura paga' : fatura.pagamentos.length > 0 ? 'Fatura paga em parte' : 'Fatura ainda não paga'}
          </strong>
          {/* Build 099 (pedido do Rafael): as linhas do subtotal são SEMPRE
              estas, nesta ordem — Fatura do mês atual · Resíduo do mês
              anterior · Pago · Faltante — e o Faltante tem o MESMO destaque do
              total. O resíduo vem de `situacaoDaFatura` (paga a menor =
              falta, paga a maior = crédito) e a linha está SEMPRE lá — com
              R$ 0,00 quando não há resíduo —, pra ninguém ter que adivinhar
              se a linha "sumiu" ou se não existe resíduo. */}
          <div className="linha" style={{ border: 'none', padding: '6px 0 0' }}>
            <span>Fatura do mês atual</span>
            <strong style={{ fontSize: 16 }} data-testid="fatura-total">{fmtBRL(fatura.total)}</strong>
          </div>
          <div className="linha" style={{ border: 'none', padding: '2px 0 0' }}>
            <span className="texto-fraco">
              {fatura.residuoAnterior > 0.005 ? 'Resíduo do mês anterior (faltou pagar)' : fatura.residuoAnterior < -0.005 ? 'Resíduo do mês anterior (pago a mais)' : 'Resíduo do mês anterior'}
            </span>
            <strong className={fatura.residuoAnterior > 0.005 ? 'valor-neg' : fatura.residuoAnterior < -0.005 ? 'valor-pos' : 'texto-fraco'} data-testid="fatura-residuo">
              {fatura.residuoAnterior > 0.005 ? '+' : fatura.residuoAnterior < -0.005 ? '−' : ''}{fmtBRL(Math.abs(fatura.residuoAnterior))}
            </strong>
          </div>
          <div className="linha" style={{ border: 'none', padding: '2px 0 0' }}>
            <span className="texto-fraco">Pago</span>
            <strong className={fatura.pago > 0 ? 'valor-pos' : 'texto-fraco'} data-testid="fatura-pago">{fmtBRL(fatura.pago)}</strong>
          </div>
          <div className="linha" style={{ border: 'none', padding: '2px 0 0' }}>
            <span>Faltante</span>
            {/* Build 101 (Decisão 121), pedido do Rafael: "Faltante" = 0 não é
                nem pendência (vermelho) nem crédito (verde) — é neutro. Só
                vira verde quando existe crédito de verdade (pagou a mais,
                `restante < 0`). */}
            <strong
              className={fatura.restante > 0.005 ? 'valor-neg' : fatura.restante < -0.005 ? 'valor-pos' : 'texto-fraco'}
              style={{ fontSize: 16 }}
              data-testid="fatura-restante"
            >
              {fatura.restante < -0.005 ? `−${fmtBRL(Math.abs(fatura.restante))} (crédito)` : fmtBRL(Math.max(fatura.restante, 0))}
            </strong>
          </div>
          {fatura.pagamentos.length > 0 && (
            <div style={{ marginTop: 6 }} data-testid="fatura-pagamentos">
              {/* Build 092: cada pagamento leva a DATA em que foi feito — a
                  linha Completa não mostra data (ela vive numa sessão por
                  dia), e aqui o dia do pagamento é a informação.
                  Build 101 (Decisão 121), pedido do Rafael: aqui a data NÃO
                  é cabeçalho de uma lista inteira (onde fica colada de
                  propósito, ver `.sessao-data-simples`) — é o rótulo de UM
                  card avulso, e ficava grudada nele. `marginBottom` só
                  nesta instância (não na classe, que outras telas usam sem
                  espaço de propósito). */}
              {fatura.pagamentos.map((l) => (
                <div key={l.id}>
                  <div className="sessao-data-simples" style={{ marginBottom: 4 }} data-testid="fatura-pagamento-data">{formatarCabecalhoData(l.dataCompetencia)}</div>
                  {linhaDe(l)}
                </div>
              ))}
            </div>
          )}
          {!fatura.quitada && fatura.restante > 0.005 && (
            <button type="button" className="primario" style={{ marginTop: 10 }} onClick={abrirPagamento} data-testid="pagar-fatura">
              {fatura.pagamentos.length > 0 ? 'Pagar o restante' : 'Pagar esta fatura'}
            </button>
          )}
        </div>
      )}

      {/* Build 093 (item 2): o que está NO CARTÃO neste ciclo mas FORA da
          fatura — lançamentos com a categoria "Pagamento de fatura" gravados
          no próprio cartão. Ficam visíveis aqui (nunca somem), fora da lista
          e do fechamento, que agora somam exatamente o que o card de quitação
          soma. */}
      {foraDaFatura.length > 0 && (
        <div className="cartao" style={{ marginBottom: 10 }} data-testid="fora-da-fatura">
          <strong style={{ fontSize: 13 }}>Pagamentos lançados neste cartão</strong>
          <p className="texto-fraco" style={{ marginTop: 4, marginBottom: 8 }}>
            Estes lançamentos têm a categoria "Pagamento de fatura" e estão gravados no próprio cartão. Eles não entram
            no total da fatura: o pagamento de uma fatura mora na conta que paga (a conta corrente). Abra cada um e
            troque a conta — ou exclua, se for uma cópia do pagamento já registrado.
          </p>
          {foraDaFatura.map(linhaDe)}
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
        {/* Build 094 (item 3): o fechamento aparece também quando o MÊS não
            teve movimento, desde que a conta acumule saldo. Antes a condição
            era só "tem lançamento": uma conta parada mostrava o total no card
            de fora (ex.: −R$ 52,00) e NADA aqui dentro — o caso mais extremo
            de "o de fora não bate com o de dentro". No cartão nada muda: sem
            compras no ciclo não há fatura nem saldo acumulado a mostrar.
            Build 100 (18/09/2026), pedido do Rafael: o MESMO conjunto (3
            colunas + real + comprometido) também aparece em MODO SELEÇÃO,
            totalizando só os marcados — em toda conta, inclusive cofrinho e
            fatura. `totalSelecao` é sintético (sem saldo anterior, que não
            existe pra um recorte arbitrário — ver `FechamentoDaLista`). */}
        {(doPeriodoBruto.length > 0 || saldoAnterior !== undefined || (selecao.ativa && itensSelecionados.length > 0)) && (
          <div style={{ padding: '8px 0 10px' }}>
            <FechamentoDaLista
              itensPeriodo={selecao.ativa ? itensSelecionados : doPeriodoBruto}
              rotuloTotal={selecao.ativa ? `Selecionados (${itensSelecionados.length})` : rotuloTotal}
              total={selecao.ativa ? totalSelecao : totalDoMes}
              totalForcado={!selecao.ativa && fatura ? fatura.total : undefined}
            />
            {/* Build 100, pedido do Rafael: uma linha "A Pagar" também no
                fechamento de baixo da fatura (o topo já tem "Faltante", no
                card de quitação) — mesmo número, `fatura.restante`, nunca uma
                segunda conta. Só fora do modo seleção (dentro dele o "a
                pagar" de um recorte arbitrário de compras não tem uma conta
                única, já que quem paga é a fatura inteira, não a compra). */}
            {isCartao && !selecao.ativa && fatura && (
              <div className="linha" style={{ border: 'none', padding: '2px 0 0' }}>
                <span>A pagar</span>
                <strong className={fatura.restante > 0.005 ? 'valor-neg' : 'valor-pos'} style={{ fontSize: 16 }} data-testid="fechamento-a-pagar">
                  {fatura.restante < -0.005 ? `−${fmtBRL(Math.abs(fatura.restante))} (crédito)` : fmtBRL(Math.max(fatura.restante, 0))}
                </strong>
              </div>
            )}
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
