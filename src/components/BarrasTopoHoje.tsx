/* As TRÊS barras do topo da tela Hoje (build 067).
 *
 * Substituem a linha de identidade em texto ("Caixa X − reservado Y = livre Z"),
 * que o Rafael pediu para sair: *"no topo retirar a coluna com informação…, no
 * lugar colocar uma barra que mostra o todo"*. A identidade não some — ela passa
 * a ser desenhada, que é o ponto: um número que só existe dentro de uma frase é
 * exatamente o que fazia a tela antiga precisar de explicação.
 *
 *   ┌ Meta do mês ────────────┐   ┌ Mês passado ┐  ┌ Este mês ┐
 *   [███████████▓▓│░░░░]           [█████████]      [███████]
 *        R$ 16.712,00               +R$ 2.366,76     +R$ 1.818,93
 *    sobrou no mês +R$ 1.818,93     └──── caixa de hoje ────┘
 *                                    ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░
 *                                    livre        reservado
 *
 * TRÊS DECISÕES que o pedido não cobria, e o porquê de cada uma:
 *
 * 1. CADA BARRA TEM A SUA ESCALA. Uma régua de dinheiro única para as três
 *    deixaria a 2ª e a 3ª com ~40px numa tela de 430px — sem espaço para o
 *    título nem para o valor centralizado abaixo, que era o pedido. A 1ª é
 *    progresso (quanto da meta já foi); a 2ª e a 3ª dividem UMA escala entre si,
 *    então elas continuam comparáveis uma com a outra, que é a leitura que
 *    importa ("este mês está indo melhor ou pior que o passado?").
 *
 * 2. A JUNÇÃO DAS BARRAS 2+3 É O CAIXA, NÃO O LIVRE. O pedido chama a soma das
 *    duas de "Livre de Tudo" — mas ela é o caixa acumulado (4.185,69), e o
 *    "1 · LIVRE DE TUDO" logo abaixo é 2.878,53. Escrever o mesmo nome em dois
 *    números diferentes na mesma tela é a confusão que a build 066 acabou de
 *    desfazer. Então a chave mostra a junção COM a divisão dela: a fatia verde é
 *    o livre, o resto é o reservado nas metas. É a identidade inteira, desenhada.
 *
 * 3. O "SOBROU ESTE MÊS" É UM SEGMENTO DA BARRA DA META, não um número solto:
 *    a barra 1 vai até o que ENTROU no mês, o azul/âmbar é o que saiu, e o verde
 *    que sobra é o resultado do mês. A linha vertical branca marca a meta — só
 *    aparece quando a barra passa dela, senão marcaria a própria borda.
 *
 * Cor só no VALOR (pedido literal); título e legenda ficam na cor de texto do
 * tema, clara ou escura.
 */
import { InfoDot } from '../kit/PadraoUI'
import { fmtBRL as fmt, fmtComSinal } from '../formatoMoeda'

/** Menor fatia visível, em % da barra — abaixo disso some da tela. */
const MIN_PCT = 3

export const INFO_META_DO_MES =
  'A soma das metas de todos os grupos no mês. A barra vai até o que entrou: ' +
  'azul é o que já saiu, âmbar é o que está comprometido e ainda não saiu, ' +
  'vermelho é o que passou da meta, e o verde no fim é o que sobrou no mês. ' +
  'A linha branca marca onde a meta termina.'

export const INFO_CAIXA_ANTERIOR =
  'O que sobrou no caixa somando todos os meses até o mês anterior. ' +
  'Negativo quer dizer que o mês começou no vermelho.'

export const INFO_CAIXA_DO_MES =
  'O que entrou menos o que saiu neste mês — só deste mês, sem o que veio de trás.'

export const INFO_CHAVE_CAIXA =
  'As duas barras juntas são o dinheiro que existe hoje. Dele, a parte verde é o ' +
  'que está livre de tudo, e o resto continua reservado nas metas que ainda não ' +
  'foram usadas.'

export const INFO_SOBROU_MES =
  'O resultado só deste mês: o que entrou menos o que saiu. É o verde no fim da ' +
  'barra da meta.'

export interface BarrasTopoProps {
  /** Meta total do mês (soma dos percentuais dos grupos de saída). */
  meta: number
  /** Tudo que consome meta neste mês, já aconteceu ou não. */
  realizado: number
  /** A parte de `realizado` que ainda NÃO aconteceu (âmbar). */
  comprometido: number
  /** Entradas − saídas SÓ deste mês. */
  resultadoDoMes: number
  /** Caixa acumulado até o mês anterior. */
  caixaAnterior: number
  /** Caixa acumulado até este mês (= anterior + resultado do mês). */
  caixaAcumulado: number
  /** O 1º total da tela. */
  saldoLivre: number
  /** `max(0, podeSobrar)` — o que ainda está reservado nas metas. */
  reservado: number
}

export default function BarrasTopoHoje({
  meta,
  realizado,
  comprometido,
  resultadoDoMes,
  caixaAnterior,
  caixaAcumulado,
  saldoLivre,
  reservado,
}: BarrasTopoProps) {
  /* ---------- barra 1: a meta do mês ---------- */
  const sobrou = Math.max(0, resultadoDoMes)
  const escala1 = Math.max(meta, realizado + sobrou, 0.01)
  const p1 = (v: number) => (v <= 0 ? 0 : Math.max(MIN_PCT, (v / escala1) * 100))

  const jaSaiu = Math.max(0, realizado - comprometido)
  const azul = Math.min(jaSaiu, meta)
  const ambar = Math.max(0, Math.min(comprometido, meta - azul))
  const vermelho = Math.max(0, realizado - meta)
  const passouDaMeta = vermelho > 0.005
  const pctMeta = Math.min(100, (meta / escala1) * 100)

  /* ---------- barras 2 e 3: uma escala só, para serem comparáveis ---------- */
  const escala23 = Math.max(Math.abs(caixaAnterior), Math.abs(resultadoDoMes), 0.01)
  const p23 = (v: number) =>
    Math.abs(v) <= 0.005 ? 0 : Math.max(MIN_PCT, Math.min(100, (Math.abs(v) / escala23) * 100))

  /* ---------- a chave: quanto do caixa está livre ---------- */
  const caixaPositivo = caixaAcumulado > 0.005
  const pctLivre = caixaPositivo
    ? Math.max(0, Math.min(100, (Math.max(0, saldoLivre) / caixaAcumulado) * 100))
    : 0

  const classe = (v: number) => (v < 0 ? 'valor-neg' : 'valor-pos')

  return (
    <div className="barras-topo" data-testid="barras-topo">
      {/* ---- títulos ---- */}
      <div className="barras-topo-titulo" style={{ gridColumn: 1 }}>
        <span>Meta do mês</span>
        <InfoDot titulo="Meta do mês" info={INFO_META_DO_MES} />
      </div>
      <div className="barras-topo-titulo" style={{ gridColumn: 2 }}>
        <span>Caixa do mês passado</span>
        <InfoDot titulo="Caixa do mês passado" info={INFO_CAIXA_ANTERIOR} />
      </div>
      <div className="barras-topo-titulo" style={{ gridColumn: 3 }}>
        <span>Caixa deste mês</span>
        <InfoDot titulo="Caixa deste mês" info={INFO_CAIXA_DO_MES} />
      </div>

      {/* ---- barras ---- */}
      <div className="barras-topo-barra" style={{ gridColumn: 1 }} data-testid="barra-meta-mes">
        {azul > 0 && <i className="seg-realizado" style={{ width: `${p1(azul)}%` }} />}
        {ambar > 0 && <i className="seg-comprometido" style={{ width: `${p1(ambar)}%` }} />}
        {vermelho > 0 && <i className="seg-estouro" style={{ width: `${p1(vermelho)}%` }} />}
        {sobrou > 0.005 && (
          <i className="seg-sobrou" style={{ width: `${p1(sobrou)}%` }} data-testid="seg-sobrou" />
        )}
        {/* A linha da meta só quando a barra passa dela — senão marcaria a borda. */}
        {passouDaMeta && meta > 0 && (
          <span className="barras-topo-linha-meta" style={{ left: `${pctMeta}%` }} data-testid="linha-meta" />
        )}
      </div>
      <div className="barras-topo-barra" style={{ gridColumn: 2 }} data-testid="barra-caixa-anterior">
        <i
          className={caixaAnterior < 0 ? 'seg-estouro' : 'seg-sobrou'}
          style={{ width: `${p23(caixaAnterior)}%` }}
        />
      </div>
      <div className="barras-topo-barra" style={{ gridColumn: 3 }} data-testid="barra-caixa-mes">
        <i
          className={resultadoDoMes < 0 ? 'seg-estouro' : 'seg-sobrou'}
          style={{ width: `${p23(resultadoDoMes)}%` }}
        />
      </div>

      {/* ---- valores ---- */}
      <div className="barras-topo-valor" style={{ gridColumn: 1 }} data-testid="valor-meta-mes">
        {fmt(meta)}
      </div>
      <div
        className={`barras-topo-valor ${classe(caixaAnterior)}`}
        style={{ gridColumn: 2 }}
        data-testid="valor-caixa-anterior"
      >
        {fmtComSinal(caixaAnterior)}
      </div>
      <div
        className={`barras-topo-valor ${classe(resultadoDoMes)}`}
        style={{ gridColumn: 3 }}
        data-testid="valor-caixa-mes"
      >
        {fmtComSinal(resultadoDoMes)}
      </div>

      {/* ---- rodapé: o sobrou do mês (col 1) e a chave do caixa (cols 2-3) ---- */}
      {/* Rótulo e valor em LINHAS separadas, sempre: numa coluna de ~137px,
          "faltou no mês −R$ 395,86 ⓘ" numa linha só transbordava o cartão. */}
      <div className="barras-topo-rodape-1" data-testid="rodape-sobrou">
        <span>
          {resultadoDoMes < 0 ? 'faltou no mês' : 'sobrou no mês'}
          <InfoDot titulo="Sobrou no mês" info={INFO_SOBROU_MES} />
        </span>
        <strong className={classe(resultadoDoMes)}>{fmtComSinal(resultadoDoMes)}</strong>
      </div>

      <div className="barras-topo-chave" data-testid="chave-caixa">
        <span className="barras-topo-chave-traco" aria-hidden="true" />
        <div className="barras-topo-chave-titulo">
          <span>caixa de hoje</span>{' '}
          <strong className={classe(caixaAcumulado)}>{fmtComSinal(caixaAcumulado)}</strong>
          <InfoDot titulo="Caixa de hoje" info={INFO_CHAVE_CAIXA} />
        </div>
        {caixaPositivo && (
          <>
            <div className="barras-topo-chave-barra" data-testid="chave-barra">
              <i className="seg-sobrou" style={{ width: `${pctLivre}%` }} />
              <i className="seg-reservado" style={{ width: `${100 - pctLivre}%` }} />
            </div>
            <div className="barras-topo-chave-legenda">
              <span>
                livre de tudo{' '}
                <strong className={classe(saldoLivre)}>{fmtComSinal(saldoLivre)}</strong>
              </span>
              <span>
                reservado <strong>{fmt(reservado)}</strong>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
