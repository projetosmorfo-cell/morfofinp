/* EDIÇÃO EM MASSA — alterar vários lançamentos de uma vez (14/09/2026).
 *
 * O pedido do Rafael, literal:
 *
 *   "No modo de seleção, habilita um botão de alteração. Aparece uma tela com
 *    os campos de um lançamento, VAZIA. O campo que eu preencher e salvar,
 *    somente aquele campo você vai alterar nos lançamentos selecionados. Os
 *    campos vazios você não altera nada, mantém tudo como está."
 *
 *   "E se eu marcar uma recorrência — por exemplo fixa mensal — a partir do
 *    momento que eu salvar tem que GERAR os próximos lançamentos já, para
 *    todos esses registros. Não é só salvar o registro selecionado: é salvar
 *    e REPLICAR."
 *
 * ------------------------------------------------------------------
 * A REGRA CENTRAL: campo vazio é "não mexer", nunca "apagar".
 *
 * Isso não é um detalhe de UI, é o contrato da tela — e é o oposto do que o
 * Dexie faz por padrão: `update()` com um valor `undefined` APAGA a
 * propriedade (bug real já documentado na build 062). Por isso o patch é
 * montado campo a campo, e uma chave só entra nele quando tem valor de
 * verdade. Nada de espalhar um objeto com chaves indefinidas.
 *
 * ------------------------------------------------------------------
 * AS DECISÕES QUE O PEDIDO NÃO COBRIA, e o porquê de cada uma:
 *
 * 1. VALOR preserva o SINAL de cada lançamento. A seleção pode misturar
 *    entrada e saída; gravar o número cru transformaria toda saída em entrada.
 *    O que se digita é o valor absoluto, e cada lançamento mantém o lado dele.
 *
 * 2. PERNA DE TRANSFERÊNCIA só aceita o STATUS. Uma transferência é um par
 *    (duas pernas com o mesmo `transferenciaId`) e o formulário individual
 *    sempre a tratou como unidade — mudar valor, data ou conta de um lado só
 *    deixaria o par manco. O status é a exceção porque já existe mecanismo de
 *    sincronizar os dois lados, e é justamente o caso de uso principal desta
 *    tela. O que foi pulado aparece contado no resultado, nunca em silêncio.
 *
 * 3. LANÇAMENTO QUE JÁ PERTENCE A UMA SÉRIE não recebe recorrência nova —
 *    mesma trava do formulário individual (`jaTemSerie`). Trocar a série de
 *    uma parcela no meio do caminho é outra operação, e destrutiva.
 *
 * 4. REGRA DO DIA, no fixo mensal/semestral: o padrão é "o mesmo dia de cada
 *    lançamento". Foi ele quem disse que "nenhum lançamento é igual ao outro"
 *    — forçar um dia único para dezenas de lançamentos de datas diferentes
 *    moveria todos eles. Quem quiser o dia único continua podendo escolher.
 *
 * 5. PARCELADO usa o valor de CADA lançamento como total da compra, dividido
 *    em N — exatamente o que o formulário individual faz. A primeira parcela
 *    substitui o próprio lançamento; as demais são criadas.
 *
 * ------------------------------------------------------------------
 * "GERAR JÁ" — o que isso significa aqui, sem inventar regra nova.
 *
 * Parcelado gera TODAS as parcelas na hora (é assim desde 30/08/2026).
 *
 * Fixo gera em duas etapas: primeiro o horizonte normal do app (tudo que cabe
 * até o fim do mês da tela — regra da build 050), depois a PRÓXIMA ocorrência
 * de cada série recém-criada, mesmo que ela caia além desse horizonte
 * (`gerarProximaDasSeries`). Sem a segunda etapa, marcar "fixo mensal" num
 * lançamento do próprio mês não geraria nada — a próxima cai no mês seguinte —
 * e a recorrência pareceria só um rótulo, que é exatamente o que ele pediu
 * para não acontecer. As ocorrências SEGUINTES continuam nascendo quando ele
 * entra no mês delas: o horizonte do app não mudou.
 */
import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Lancamento, type Periodicidade, type RegraRecorrencia } from '../db'
import { lerDoAmbiente, marcaDoAmbiente } from '../ambiente'
import { aplicarMascaraValor, paraNumero, fmtBRL } from '../formatoMoeda'
import { gerarIdSerie, gerarParcelas, gerarProximaDasSeries, gerarRecorrentesAteFimDoMes, ROTULOS_PERIODICIDADE, NOMES_DIA_SEMANA } from '../recorrencia'
import SeletorCategoriaComIcone from './SeletorCategoriaComIcone'
import { emTituloCaso } from '../tituloCaso'

type StatusAlvo = 'nao' | 'pago' | 'aberto'
type RecorrenciaAlvo = 'nao' | 'fixo' | 'parcelado'
type RegraModo = 'mesmoDia' | 'diaFixo' | 'diaUtil' | 'diaSemana'

export interface ResultadoMassa {
  alterados: number
  criados: number
  pulados: number
  recorrentesGerados: number
  /** Mensagem sobre o horizonte da geração de fixos, quando ela não produziu nada. */
  aviso?: string
}

export default function EdicaoEmMassa({
  ids,
  mes,
  onFechar,
}: {
  ids: number[]
  /** Mês que está na tela — é o horizonte da geração de recorrentes. */
  mes: string
  onFechar: (resultado?: ResultadoMassa) => void
}) {
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])

  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorTexto, setValorTexto] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [contaId, setContaId] = useState<number | ''>('')
  const [statusAlvo, setStatusAlvo] = useState<StatusAlvo>('nao')
  const [recorrencia, setRecorrencia] = useState<RecorrenciaAlvo>('nao')
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal')
  const [regraModo, setRegraModo] = useState<RegraModo>('mesmoDia')
  const [diaFixo, setDiaFixo] = useState('5')
  const [diaUtil, setDiaUtil] = useState('1')
  const [diaSemana, setDiaSemana] = useState('1')
  const [parcelaN, setParcelaN] = useState('2')

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [resultado, setResultado] = useState<ResultadoMassa | null>(null)

  const usaDiaDoMes = periodicidade === 'mensal' || periodicidade === 'semestral'

  const categoriasAtivas = useMemo(
    () => (categorias ?? []).filter((c) => c.ativa !== false).sort((a, b) => a.nome.localeCompare(b.nome)),
    [categorias],
  )
  const contasAtivas = useMemo(
    () => (contas ?? []).filter((c) => c.ativa !== false),
    [contas],
  )

  const algoPreenchido =
    data !== '' ||
    descricao.trim() !== '' ||
    valorTexto.trim() !== '' ||
    categoriaId !== '' ||
    contaId !== '' ||
    statusAlvo !== 'nao' ||
    recorrencia !== 'nao'

  async function aplicar() {
    setErro('')
    setSalvando(true)
    try {
      const selecionados = (await db.lancamentos.bulkGet(ids)).filter((l): l is Lancamento => !!l)
      if (selecionados.length === 0) {
        setErro('Nenhum lançamento selecionado foi encontrado.')
        setSalvando(false)
        return
      }

      const valorAbs = valorTexto.trim() === '' ? null : Math.abs(paraNumero(valorTexto))
      if (valorAbs != null && !(valorAbs > 0)) {
        setErro('O valor precisa ser maior que zero — ou deixe o campo vazio para não alterar.')
        setSalvando(false)
        return
      }
      const nParcelas = Math.max(2, Math.round(Number(parcelaN)) || 2)

      let alterados = 0
      let criados = 0
      let pulados = 0
      const seriesNovas: string[] = []

      for (const l of selecionados) {
        if (l.id == null) continue
        const ehPernaDeTransferencia = l.transferenciaId != null

        /* O patch NUNCA carrega chave indefinida: no Dexie, `update` com
           `undefined` apaga a propriedade (build 062). */
        const patch: Partial<Lancamento> = {}

        if (!ehPernaDeTransferencia) {
          if (data !== '') {
            patch.dataCompetencia = data
            patch.dataCaixa = data
          }
          if (descricao.trim() !== '') patch.descricao = descricao.trim()
          // `descricaoOriginal` é imutável por definição (Decisão 24) — nunca entra aqui.
          if (valorAbs != null) patch.valor = l.valor < 0 ? -valorAbs : valorAbs
          if (categoriaId !== '') patch.categoriaId = Number(categoriaId)
          if (contaId !== '') patch.contaId = Number(contaId)
        }

        if (statusAlvo !== 'nao') patch.pago = statusAlvo === 'pago'

        let mudou = Object.keys(patch).length > 0

        // --- recorrência: salvar E replicar
        const podeRecorrencia = recorrencia !== 'nao' && !ehPernaDeTransferencia && !l.serieId
        if (recorrencia !== 'nao' && !podeRecorrencia) pulados++

        if (podeRecorrencia && recorrencia === 'parcelado') {
          const dataBase = patch.dataCompetencia ?? l.dataCompetencia
          const totalBase = Math.abs(patch.valor ?? l.valor)
          const parcelas = gerarParcelas(dataBase, totalBase, nParcelas)
          const serieId = gerarIdSerie()
          const [primeira, ...resto] = parcelas
          const negativo = (patch.valor ?? l.valor) < 0
          await db.lancamentos.update(l.id, {
            ...patch,
            dataCompetencia: primeira.data,
            dataCaixa: primeira.data,
            valor: negativo ? -primeira.valor : primeira.valor,
            recorrencia: 'parcelado',
            serieId,
            parcelaI: primeira.parcelaI,
            parcelaN: nParcelas,
          })
          alterados++
          if (resto.length > 0) {
            await db.lancamentos.bulkAdd(
              resto.map((p) => ({
                ...marcaDoAmbiente(),
                dataCompetencia: p.data,
                dataCaixa: p.data,
                descricao: patch.descricao ?? l.descricao,
                descricaoOriginal: l.descricaoOriginal ?? l.descricao,
                valor: negativo ? -p.valor : p.valor,
                contaId: patch.contaId ?? l.contaId,
                pagoPor: l.pagoPor ?? ('conta' as const),
                categoriaId: patch.categoriaId ?? l.categoriaId,
                status: 'manual' as const,
                recorrencia: 'parcelado' as const,
                serieId,
                parcelaI: p.parcelaI,
                parcelaN: nParcelas,
                /* Parcela nova nunca nasce paga — marcar pagamento é sempre
                   manual (regra da build 051). */
                pago: false,
              })),
            )
            criados += resto.length
          }
          continue
        }

        if (podeRecorrencia && recorrencia === 'fixo') {
          const dataBase = patch.dataCompetencia ?? l.dataCompetencia
          const diaDoLancamento = Number(dataBase.slice(8, 10))
          const regra: RegraRecorrencia | undefined = usaDiaDoMes
            ? regraModo === 'diaUtil'
              ? { tipo: 'diaUtil', diaUtil: Math.min(23, Math.max(1, Number(diaUtil) || 1)) }
              : regraModo === 'diaFixo'
                ? { tipo: 'diaFixo', dia: Math.min(31, Math.max(1, Number(diaFixo) || 1)) }
                : { tipo: 'diaFixo', dia: diaDoLancamento } // "mesmo dia de cada lançamento"
            : regraModo === 'diaSemana'
              ? { tipo: 'diaSemana', diaSemana: Math.min(6, Math.max(0, Number(diaSemana))) }
              : undefined
          const serieId = gerarIdSerie()
          await db.lancamentos.update(l.id, {
            ...patch,
            recorrencia: 'fixo',
            serieId,
            periodicidade,
            ...(regra ? { regraRecorrencia: regra } : {}),
          })
          seriesNovas.push(serieId)
          alterados++
          continue
        }

        if (mudou) {
          await db.lancamentos.update(l.id, patch)
          alterados++
        }

        /* Status numa perna de transferência espelha a outra — senão o par
           fica com um lado pago e o outro não (mesma regra de
           `lancamentosUtil.alternarPago`). */
        if (statusAlvo !== 'nao' && ehPernaDeTransferencia && l.transferenciaId != null) {
          await db.lancamentos
            .where('transferenciaId')
            .equals(l.transferenciaId)
            .modify({ pago: statusAlvo === 'pago' })
          mudou = true
        }
      }

      let recorrentesGerados = 0
      let aviso: string | undefined
      if (seriesNovas.length > 0) {
        /* "Salvar e REPLICAR", nas palavras dele. Duas etapas, nesta ordem:
           1. o horizonte normal do app (tudo que cabe até o fim do mês da
              tela) — é a regra da build 050, e vale para todas as séries;
           2. a PRÓXIMA ocorrência de cada série recém-criada, mesmo que caia
              depois desse horizonte — senão marcar "fixo mensal" num
              lançamento do próprio mês não geraria nada, e a recorrência
              pareceria só um rótulo. Ver `gerarProximaDasSeries`. */
        recorrentesGerados = await gerarRecorrentesAteFimDoMes(mes)
        recorrentesGerados += await gerarProximaDasSeries(seriesNovas)
        if (recorrentesGerados === 0) {
          aviso = 'As séries foram criadas, mas a próxima ocorrência de cada uma já existia no banco.'
        } else {
          aviso = `As séries foram criadas e a próxima ocorrência de cada uma já está lançada. As seguintes nascem quando você entrar no mês delas.`
        }
      }

      setResultado({ alterados, criados, pulados, recorrentesGerados, aviso })
    } catch (e) {
      setErro(`Não deu pra aplicar: ${e instanceof Error ? e.message : String(e)}`)
    }
    setSalvando(false)
  }

  if (!categorias || !contas) return null

  return (
    <div className="modal-fundo" onClick={() => onFechar()}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        {resultado ? (
          <>
            <h2>{emTituloCaso('Pronto')}</h2>
            <p className="texto-quebra" style={{ fontSize: 13.5 }} data-testid="massa-resultado">
              {resultado.alterados} lançamento(s) alterado(s)
              {resultado.criados > 0 ? ` · ${resultado.criados} parcela(s) criada(s)` : ''}
              {resultado.recorrentesGerados > 0 ? ` · ${resultado.recorrentesGerados} ocorrência(s) gerada(s)` : ''}
              {resultado.pulados > 0 ? ` · ${resultado.pulados} sem recorrência (já em série ou transferência)` : ''}
            </p>
            {resultado.aviso && (
              <p className="texto-fraco texto-quebra" style={{ fontSize: 12 }} data-testid="massa-aviso">
                {resultado.aviso}
              </p>
            )}
            <div className="acoes-modal">
              <button type="button" className="primario" onClick={() => onFechar(resultado)} data-testid="massa-concluir">
                Fechar
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>{emTituloCaso('Alterar em massa')}</h2>
            <p className="texto-fraco texto-quebra" style={{ fontSize: 12, margin: '0 0 10px' }}>
              {ids.length} lançamento(s) selecionado(s). <strong>Campo vazio não é alterado</strong> — só o que você
              preencher aqui é gravado em todos eles.
            </p>

            <label htmlFor="em-data">Data</label>
            <input id="em-data" type="date" value={data} onChange={(e) => setData(e.target.value)} />

            <label htmlFor="em-descricao">Descrição</label>
            <input
              id="em-descricao"
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="deixe vazio para não alterar"
            />

            <label htmlFor="em-valor">Valor</label>
            <input
              id="em-valor"
              type="text"
              inputMode="decimal"
              value={valorTexto}
              onChange={(e) => setValorTexto(aplicarMascaraValor(e.target.value))}
              placeholder="deixe vazio para não alterar"
            />
            {valorTexto.trim() !== '' && (
              <p className="texto-fraco texto-quebra" style={{ fontSize: 11.5, margin: '4px 0 0' }}>
                Cada lançamento mantém o lado dele: saída continua saída, entrada continua entrada.
              </p>
            )}

            <label htmlFor="em-categoria">Categoria</label>
            <SeletorCategoriaComIcone
              id="em-categoria"
              categorias={categoriasAtivas}
              valor={categoriaId}
              onEscolher={(id) => setCategoriaId(id)}
              onLimpar={() => setCategoriaId('')}
              rotuloVazio="— não alterar —"
            />

            <label htmlFor="em-conta">Pago com</label>
            <select
              id="em-conta"
              value={contaId === '' ? '' : String(contaId)}
              onChange={(e) => setContaId(e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">— não alterar —</option>
              {contasAtivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <label htmlFor="em-status">Situação de pagamento</label>
            <select id="em-status" value={statusAlvo} onChange={(e) => setStatusAlvo(e.target.value as StatusAlvo)}>
              <option value="nao">— não alterar —</option>
              <option value="pago">Marcar como pago / recebido</option>
              <option value="aberto">Marcar como em aberto</option>
            </select>

            <label htmlFor="em-recorrencia">Recorrência</label>
            <select
              id="em-recorrencia"
              value={recorrencia}
              onChange={(e) => setRecorrencia(e.target.value as RecorrenciaAlvo)}
            >
              <option value="nao">— não alterar —</option>
              <option value="fixo">Fixo — se repete automaticamente</option>
              <option value="parcelado">Parcelado — dividido em várias vezes</option>
            </select>

            {recorrencia === 'fixo' && (
              <div className="cartao" style={{ marginTop: 8, background: 'var(--bg)' }}>
                <label htmlFor="em-periodicidade">Periodicidade</label>
                <select
                  id="em-periodicidade"
                  value={periodicidade}
                  onChange={(e) => {
                    const p = e.target.value as Periodicidade
                    setPeriodicidade(p)
                    setRegraModo(p === 'mensal' || p === 'semestral' ? 'mesmoDia' : 'diaSemana')
                  }}
                >
                  {(['semanal', 'quinzenal', 'mensal', 'semestral'] as Periodicidade[]).map((p) => (
                    <option key={p} value={p}>
                      {ROTULOS_PERIODICIDADE[p]}
                    </option>
                  ))}
                </select>

                {usaDiaDoMes ? (
                  <>
                    <label htmlFor="em-regra">Regra do dia</label>
                    <select
                      id="em-regra"
                      value={regraModo}
                      onChange={(e) => setRegraModo(e.target.value as RegraModo)}
                    >
                      <option value="mesmoDia">No mesmo dia de cada lançamento</option>
                      <option value="diaFixo">Dia fixo do mês (igual para todos)</option>
                      <option value="diaUtil">Dia útil do mês (igual para todos)</option>
                    </select>
                    {regraModo === 'diaFixo' && (
                      <input
                        id="em-dia-fixo"
                        aria-label="Dia fixo do mês"
                        type="number"
                        min={1}
                        max={31}
                        value={diaFixo}
                        onChange={(e) => setDiaFixo(e.target.value)}
                      />
                    )}
                    {regraModo === 'diaUtil' && (
                      <input
                        id="em-dia-util"
                        aria-label="Dia útil do mês"
                        type="number"
                        min={1}
                        max={23}
                        value={diaUtil}
                        onChange={(e) => setDiaUtil(e.target.value)}
                      />
                    )}
                  </>
                ) : (
                  <>
                    <label htmlFor="em-dia-semana">Dia da semana</label>
                    <select id="em-dia-semana" value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
                      {NOMES_DIA_SEMANA.map((nome, i) => (
                        <option key={i} value={i}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            )}

            {recorrencia === 'parcelado' && (
              <div className="cartao" style={{ marginTop: 8, background: 'var(--bg)' }}>
                <label htmlFor="em-parcelas">Em quantas vezes</label>
                <input
                  id="em-parcelas"
                  type="number"
                  min={2}
                  max={60}
                  value={parcelaN}
                  onChange={(e) => setParcelaN(e.target.value)}
                />
                <p className="texto-fraco texto-quebra" style={{ fontSize: 11.5, margin: '6px 0 0' }}>
                  O valor de cada lançamento vira o total da compra, dividido em{' '}
                  {Math.max(2, Math.round(Number(parcelaN)) || 2)}. As parcelas seguintes são criadas na hora
                  {valorTexto.trim() !== '' ? ` (${fmtBRL(Math.abs(paraNumero(valorTexto)))} no total)` : ''}.
                </p>
              </div>
            )}

            {erro && (
              <p className="valor-neg texto-quebra" style={{ fontSize: 13 }} data-testid="massa-erro">
                {erro}
              </p>
            )}

            <div className="acoes-modal">
              <button
                type="button"
                className="primario"
                disabled={!algoPreenchido || salvando}
                onClick={() => void aplicar()}
                data-testid="massa-salvar"
              >
                {salvando ? 'Aplicando…' : `Aplicar em ${ids.length}`}
              </button>
              {/* Cancelar é BOTÃO, como em todo o resto do app — e com respiro
                  em relação ao Aplicar (build 066, pedido do Rafael: "está
                  extremamente grudado com o botão de confirmar, isso é muito
                  perigoso"). O espaçamento mora em `.acoes-modal`. */}
              <button
                type="button"
                className="secundario"
                onClick={() => onFechar()}
                data-testid="massa-cancelar"
              >
                Cancelar
              </button>
            </div>
            {!algoPreenchido && (
              <p className="texto-fraco texto-quebra" style={{ fontSize: 11.5, margin: '6px 0 0' }}>
                Preencha pelo menos um campo para aplicar.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
