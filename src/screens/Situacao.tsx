import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, NATUREZAS_ORCAMENTAVEIS, type Categoria, type Lancamento } from '../db'
import { mesAtualISO, type TelaProps } from '../mes'
import { proximaDataRecorrencia } from '../recorrencia'
import { hojeEfetivoISO } from '../hojeSimulado'
import BarraMeta, { fmtBRL as fmt } from '../components/BarraMeta'
import SeletorMes from '../components/SeletorMes'
import { GraficoMargem } from '../components/Graficos'
import ListaLancamentosCategoria from '../components/ListaLancamentosCategoria'
import { Icone } from '../icones'
import { useConfiguracaoIcones, tamanhoIconePx } from '../configuracaoIcones'
import TituloTelaN1 from '../kit/CabecalhoN1'
import { SUBTITULO_SITUACAO, EXPLICACAO_SITUACAO } from '../subtitulosTelas'
import { ExportSheet, type ExportRow } from '../kit/ExportSheet'
import { lerDoAmbiente } from '../ambiente'

interface LinhaCategoria {
  cat: Categoria
  gasto: number
  diferenca: number // aceitável - gasto: positivo = sobra, negativo = estourou
  proporcao: number
}

// Situação = perspectiva de TETO × GASTO (o que pode gastar em cada categoria/
// grupo e quanto já foi usado disso este mês) — diferente do Resumo do Mês,
// que é "o que entrou/saiu de verdade + o que ainda vai entrar/sair". As duas
// telas de propósito não repetem a mesma pergunta.
export default function Situacao({ mes, aoMudarMes, aoAbrirLancamento, aoAbrirPlanejamento }: TelaProps) {
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.toArray()), [])
  const lancamentosDoMes = useLiveQuery(
    () => lerDoAmbiente(db.lancamentos.where('dataCompetencia').startsWith(mes).toArray()),
    [mes],
  )
  // Só precisamos do histórico completo pra achar a última ocorrência de cada
  // série de lançamento fixo (ver "Sobra real" abaixo) — carrega tudo uma
  // vez, é barato (algumas centenas de linhas).
  const lancamentosTodos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), [])

  const [expandidas, setExpandidas] = useState<Set<number>>(new Set())
  // F-03 da revisão de UI (04/09/2026): as 3 explicações técnicas (Margem no
  // orçamento/comprometida, Sobra real) vinham sempre abertas — viram um
  // único toggle "O que significa isso?", fechado por padrão, cobrindo as
  // três de uma vez (elas formam um raciocínio só, em cascata).
  const [explicacoesAbertas, setExplicacoesAbertas] = useState(false)
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */
  const { pctCategoria } = useConfiguracaoIcones()

  if (!categorias || !grupos || !lancamentosDoMes || !lancamentosTodos) return null

  function alternarExpandida(catId: number) {
    setExpandidas((atual) => {
      const novo = new Set(atual)
      if (novo.has(catId)) novo.delete(catId)
      else novo.add(catId)
      return novo
    })
  }

  const categoriaPorId = new Map(categorias.map((c) => [c.id!, c]))

  // Transferência entre contas fica de fora de toda visão de teto×gasto —
  // não é despesa/aporte real (ver ResumoDoMes.tsx). 31/08/2026, rodada
  // seguinte: excluída por `transferenciaId` (identifica a perna de
  // verdade), não mais por natureza — desde que a categoria de cada perna
  // passou a ser escolhível livremente (ponto 3), uma transferência pode
  // carregar qualquer natureza.
  const lancamentosPorCategoria = new Map<number, Lancamento[]>()
  for (const l of lancamentosDoMes) {
    if (l.transferenciaId != null) continue
    const lista = lancamentosPorCategoria.get(l.categoriaId) ?? []
    lista.push(l)
    lancamentosPorCategoria.set(l.categoriaId, lista)
  }

  const gastoPorCategoria = new Map<number, number>()
  const gastoPagoPorCategoria = new Map<number, number>()
  for (const l of lancamentosDoMes) {
    if (l.valor >= 0 || l.transferenciaId != null) continue
    gastoPorCategoria.set(l.categoriaId, (gastoPorCategoria.get(l.categoriaId) ?? 0) + -l.valor)
    if (l.pago !== false) {
      gastoPagoPorCategoria.set(l.categoriaId, (gastoPagoPorCategoria.get(l.categoriaId) ?? 0) + -l.valor)
    }
  }

  // "Onde estourei"/"Onde ainda sobra"/"Margem no orçamento" cobrem TODA
  // categoria de natureza Consumo, de qualquer grupo (não só Fixo/Variável) —
  // generalização de 30/08/2026: um grupo novo criado pelo Rafael com
  // categoria de Consumo aparece aqui automaticamente, sem precisar mexer
  // no código. Categoria de natureza Aporte (Objetivos/Segurança) tem
  // seção própria mais abaixo ("Aportes do mês"), com sentido oposto
  // (quanto mais aportar, melhor — não é "estourar").
  const categoriasDeGasto = categorias.filter((c) => c.natureza === 'Consumo')

  const linhas: LinhaCategoria[] = categoriasDeGasto.map((cat) => {
    const gasto = gastoPorCategoria.get(cat.id!) ?? 0
    const diferenca = cat.aceitavelMensal - gasto
    const proporcao = cat.aceitavelMensal > 0 ? gasto / cat.aceitavelMensal : gasto > 0 ? Infinity : 0
    return { cat, gasto, diferenca, proporcao }
  })

  const totalAceitavel = linhas.reduce((s, l) => s + l.cat.aceitavelMensal, 0)
  const totalGasto = linhas.reduce((s, l) => s + l.gasto, 0)
  const totalGastoPago = categoriasDeGasto.reduce((s, c) => s + (gastoPagoPorCategoria.get(c.id!) ?? 0), 0)
  const totalGastoPendente = totalGasto - totalGastoPago // já lançado, mas ainda não pago (a pagar/atrasado)
  const totalDiferenca = totalAceitavel - totalGasto

  // --- Por grupo: TODOS os grupos cadastrados (não só Fixo/Variável), com
  // teto/gasto somado pela natureza orçamentável (Consumo + Aporte) — mesma
  // regra usada em Categorias.tsx, generalizada pra funcionar com qualquer
  // grupo, inclusive um novo. ---
  const porGrupo = grupos.map((g) => {
    const doGrupo = categorias.filter((c) => c.grupo === g.nome && NATUREZAS_ORCAMENTAVEIS.includes(c.natureza))
    const aceitavel = doGrupo.reduce((s, c) => s + c.aceitavelMensal, 0)
    const gasto = doGrupo.reduce((s, c) => s + (gastoPorCategoria.get(c.id!) ?? 0), 0)
    return { grupo: g.nome, aceitavel, gasto, icone: g.icone, iconeEstilo: g.iconeEstilo, iconeCor: g.iconeCor }
  })
  const totalGeralGrupos = {
    aceitavel: porGrupo.reduce((s, g) => s + g.aceitavel, 0),
    gasto: porGrupo.reduce((s, g) => s + g.gasto, 0),
  }

  const estourou = linhas
    .filter((l) => l.diferenca < -0.005)
    .sort((a, b) => a.diferenca - b.diferenca) // pior primeiro
  const totalEstourado = estourou.reduce((s, l) => s + l.diferenca, 0) // já é negativo

  const comSobra = linhas
    .filter((l) => l.diferenca > 0.005 && l.cat.aceitavelMensal > 0)
    .sort((a, b) => b.diferenca - a.diferenca) // maior sobra primeiro
  const totalComSobra = comSobra.reduce((s, l) => s + l.diferenca, 0)

  // --- Comprometido ainda não lançado (lançamentos fixos, 30/08/2026) ---
  // A recorrência agora vive só no lançamento (nunca na categoria — decisão
  // do Rafael). Cada série "fixa" é um conjunto de lançamentos com o mesmo
  // `serieId`; a partir da ÚLTIMA ocorrência conhecida dá pra calcular a
  // próxima data esperada (periodicidade + regra). Se essa próxima data cair
  // neste mês mas ainda estiver no futuro (ainda não chegou o dia — quando
  // chega, o app já gera a ocorrência de verdade sozinho, ver
  // `avancarSeriesFixasPendentes` em App.tsx), mostra aqui como compromisso
  // certo e ainda não lançado. Só faz sentido pro mês corrente de verdade.
  const ehMesAtual = mes === mesAtualISO()
  const hojeISO = hojeEfetivoISO()

  const porSerie = new Map<string, Lancamento[]>()
  for (const l of lancamentosTodos) {
    if (l.recorrencia !== 'fixo' || !l.serieId) continue
    const lista = porSerie.get(l.serieId) ?? []
    lista.push(l)
    porSerie.set(l.serieId, lista)
  }

  const comprometidoNaoLancado = ehMesAtual
    ? [...porSerie.values()]
        .map((ocorrencias) => {
          ocorrencias.sort((a, b) => a.dataCompetencia.localeCompare(b.dataCompetencia))
          const ultima = ocorrencias[ocorrencias.length - 1]
          if (!ultima.periodicidade || ultima.valor >= 0) return null // só compromissos de gasto
          const proxima = proximaDataRecorrencia(ultima.dataCompetencia, ultima.periodicidade, ultima.regraRecorrencia)
          if (!proxima.startsWith(mes) || proxima <= hojeISO) return null
          return {
            serieId: ultima.serieId!,
            nome: `${ultima.descricao} (${categoriaPorId.get(ultima.categoriaId)?.nome ?? '—'})`,
            valorEsperado: -ultima.valor,
            dataEsperada: proxima,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => a.dataEsperada.localeCompare(b.dataEsperada))
    : []

  const totalComprometidoNaoLancado = comprometidoNaoLancado.reduce((s, x) => s + x.valorEsperado, 0)
  // "Margem comprometida" = tudo que ainda vai sair da carteira mas ainda não
  // saiu de verdade — soma o que já foi lançado mas está marcado como não
  // pago (a pagar/atrasado) com o que nem lançamento ainda tem (série fixa
  // que ainda não gerou a ocorrência deste mês). Separado do que já foi pago
  // de fato, pra Rafael ver os dois números: o que já saiu e o que ainda vai
  // sair — sem isso, "margem no orçamento" parecia dinheiro livre de verdade.
  const margemComprometida = totalGastoPendente + totalComprometidoNaoLancado
  const sobraReal = totalDiferenca - totalComprometidoNaoLancado

  // grupos de aporte (Objetivos/Segurança) — direção oposta ao gasto: quanto mais perto/acima da meta, melhor
  const categoriasDeAporte = categorias.filter((c) => c.natureza === 'Aporte')
  const aportes = categoriasDeAporte.map((cat) => {
    const aportado = [...lancamentosDoMes]
      .filter((l) => l.categoriaId === cat.id && l.valor > 0 && l.transferenciaId == null)
      .reduce((s, l) => s + l.valor, 0)
    return { cat, aportado }
  })
  const totalAportado = aportes.reduce((s, a) => s + a.aportado, 0)
  const totalAceitavelAporte = aportes.reduce((s, a) => s + a.cat.aceitavelMensal, 0)

  // Função (não componente) de propósito — devolve o JSX inline em vez de
  // declarar um componente aninhado, que seria recriado a cada render de
  // Situacao e forçaria remount desnecessário da subárvore.
  function cabecalhoExpansivel(catId: number, conteudo: React.ReactNode) {
    const expandida = expandidas.has(catId)
    return (
      <div className={`linha-expansivel ${expandida ? 'expandida' : ''}`} onClick={() => alternarExpandida(catId)}>
        <span className="seta-expandir">▶</span>
        {conteudo}
      </div>
    )
  }

  return (
    <>
      <div className="cabecalho-fixo">
        {/* 12/09/2026 (build 054): o título era "Situação do orçamento" e, com o
            subtítulo agora NA MESMA LINHA, os dois juntos passavam de 390px —
            medido: título 225px e subtítulo 173px num espaço de ~280px, os dois
            cortados. "do orçamento" não distinguia nada (a aba do rodapé já se
            chama Situação, e o subtítulo diz o que ela compara), então é ele
            que sai. As outras três telas couberam sem mexer. */}
        <TituloTelaN1 titulo="Situação" subtitulo={SUBTITULO_SITUACAO} explicacao={<>{EXPLICACAO_SITUACAO} Toque numa categoria pra ver os lançamentos dela.</>} onExportar={() => setExportOpen(true)} />
        <SeletorMes mes={mes} onMudar={aoMudarMes} />
      </div>
      {exportOpen && <ExportSheet title="Situação do orçamento" filenameBase={`morfofinp-situacao-${mes}`}
        screenColumns={[{ key: 'item', label: 'Item' }, { key: 'valor', label: 'Valor' }]}
        screenRows={[
          { item: 'Meta das categorias (total)', valor: fmt(totalGeralGrupos.aceitavel) },
          { item: 'Gasto (total)', valor: fmt(totalGeralGrupos.gasto) },
          { item: 'Total estourado', valor: fmt(totalEstourado) },
          { item: 'Total com sobra', valor: fmt(totalComSobra) },
          { item: 'Total aportado', valor: fmt(totalAportado) },
          { item: 'Sobra real este mês', valor: fmt(sobraReal) },
        ]}
        detailColumns={[
          { key: 'categoria', label: 'Categoria' },
          { key: 'grupo', label: 'Grupo' },
          { key: 'aceitavel', label: 'Meta da categoria' },
          { key: 'gasto', label: 'Gasto' },
          { key: 'diferenca', label: 'Diferença' },
        ]}
        detailRows={linhas.map((l): ExportRow => ({
          categoria: l.cat.nome, grupo: l.cat.grupo ?? '—',
          aceitavel: fmt(l.cat.aceitavelMensal), gasto: fmt(l.gasto), diferenca: fmt(l.diferenca),
        }))}
        onClose={() => setExportOpen(false)} />}
      {/* 12/09/2026 (build 053): o texto saiu do corpo da tela e virou o "i"
          ao lado do subtítulo, no cabeçalho — pedido do Rafael. */}

      <GraficoMargem
        teto={totalAceitavel}
        jaPago={totalGastoPago}
        aPagar={totalGastoPendente}
        comprometido={totalComprometidoNaoLancado}
        sobra={sobraReal}
      />

      <div className="cartao" style={{ marginTop: 16 }}>
        <div className="linha" style={{ border: 'none', padding: 0 }}>
          <span>{totalDiferenca >= 0 ? 'Margem no orçamento' : 'Já estourei em'}</span>
          <strong className={totalDiferenca >= 0 ? 'valor-pos' : 'valor-neg'} style={{ fontSize: 20 }}>
            {fmt(totalDiferenca)}
          </strong>
        </div>
        {/* mostrarDestaque=false: o valor total (margem/estourou) já está em
            destaque logo acima, repetir na barra seria redundante. */}
        <BarraMeta gasto={totalGasto} previsto={totalAceitavel} mostrarDestaque={false} />
        {explicacoesAbertas && (
          <div className="texto-fraco" style={{ marginTop: 4 }}>
            (Fixo + Variável — soma dos tetos das categorias menos o que já foi gasto. Não é dinheiro
            livre: inclui lançamento já registrado mas ainda não pago — ver detalhamento abaixo.)
          </div>
        )}

        <div className="linha" style={{ border: 'none', padding: '8px 0 0' }}>
          <span className="texto-fraco">Já pago</span>
          <span className="valor-neg">-{fmt(totalGastoPago)}</span>
        </div>
        <div className="linha" style={{ border: 'none', padding: 0 }}>
          <span className="texto-fraco">Previsto, já lançado, ainda não pago</span>
          <span className="valor-neg">-{fmt(totalGastoPendente)}</span>
        </div>

        {ehMesAtual && comprometidoNaoLancado.length > 0 && (
          <>
            <div
              className="linha"
              style={{ border: 'none', borderTop: '1px solid var(--borda)', marginTop: 12, paddingTop: 12 }}
            >
              <span className="texto-fraco">Comprometido, ainda não lançado</span>
              <span className="valor-neg">-{fmt(totalComprometidoNaoLancado)}</span>
            </div>
            {comprometidoNaoLancado.map((x) => (
              <div
                className="texto-fraco"
                key={x.serieId}
                style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}
              >
                <span>
                  {x.nome} (esperado {x.dataEsperada.split('-').reverse().join('/')})
                </span>
                <span>{fmt(x.valorEsperado)}</span>
              </div>
            ))}
          </>
        )}

        <div className="linha" style={{ border: 'none', borderTop: '1px solid var(--borda)', marginTop: 8, paddingTop: 12 }}>
          <span>Margem comprometida</span>
          <strong className="valor-neg" style={{ fontSize: 16 }}>
            -{fmt(margemComprometida)}
          </strong>
        </div>
        {explicacoesAbertas && (
          <div className="texto-fraco" style={{ marginTop: 2 }}>
            (Já lançado e ainda não pago + contas fixas deste mês que ainda vão cair — dinheiro que já
            tem destino certo, mesmo não tendo saído ainda.)
          </div>
        )}

        <div className="linha" style={{ border: 'none', borderTop: '1px solid var(--borda)', marginTop: 8, paddingTop: 12 }}>
          <span>Sobra real este mês</span>
          <strong className={sobraReal >= 0 ? 'valor-pos' : 'valor-neg'} style={{ fontSize: 20 }}>
            {fmt(sobraReal)}
          </strong>
        </div>
        {explicacoesAbertas && (
          <div className="texto-fraco" style={{ marginTop: 4 }}>
            (Margem no orçamento menos a margem comprometida acima — esse é o número que sobra de
            verdade pra gastar sem estourar nada.)
          </div>
        )}

        {/* F-03: as 3 explicações acima (Margem no orçamento/comprometida,
            Sobra real) ficam atrás deste toggle único, fechado por padrão —
            útil na primeira vez, ruído em toda visita seguinte. */}
        <button
          type="button"
          className={`botao-explicacao ${explicacoesAbertas ? 'aberto' : ''}`}
          onClick={() => setExplicacoesAbertas((v) => !v)}
        >
          <span className="seta-expandir">▶</span>
          O que significa isso?
        </button>
      </div>

      {/* 04/09/2026, rodada seguinte — achado central da revisão de UI: o
          bloco "Por grupo" era renderizado do zero aqui, no Resumo E no
          Planejamento (as três divergiam em número pro mesmo mês). Passa a
          existir só em Planejamento — aqui fica só o total geral mais um
          link pro detalhamento completo (ver ResumoDoMes.tsx). */}
      <h2>Por Grupo</h2>
      <div className="cartao">
        {porGrupo.length === 0 ? (
          <p className="texto-fraco">Nenhum grupo cadastrado ainda.</p>
        ) : (
          <BarraMeta rotulo="Total geral" gasto={totalGeralGrupos.gasto} previsto={totalGeralGrupos.aceitavel} />
        )}
        <button type="button" className="botao-link-secao" onClick={aoAbrirPlanejamento}>
          Ver detalhamento por grupo em Planejamento →
        </button>
      </div>

      <h2>Onde estourei ({estourou.length})</h2>
      <div className="cartao">
        {estourou.length === 0 && <p className="texto-fraco">Nenhuma categoria acima do aceitável. 🎉</p>}
        {estourou.map(({ cat, gasto }) => (
          <div key={cat.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
            {cabecalhoExpansivel(
              cat.id!,
              <BarraMeta
                rotulo={cat.nome}
                gasto={gasto}
                previsto={cat.aceitavelMensal}
                icone={
                  cat.icone !== 'nenhum' && (
                    <Icone id={cat.icone} estilo={cat.iconeEstilo} cor={cat.iconeCor} tamanho={tamanhoIconePx('categoria', pctCategoria)} />
                  )
                }
              />,
            )}
            {expandidas.has(cat.id!) && (
              <ListaLancamentosCategoria
                lancamentos={lancamentosPorCategoria.get(cat.id!) ?? []}
                categoriaPorId={categoriaPorId}
                categoriaIdSugerida={cat.id!}
                aoAbrirLancamento={aoAbrirLancamento}
              />
            )}
          </div>
        ))}
        {estourou.length > 0 && (
          <div className="total-geral">
            <div className="linha" style={{ border: 'none', padding: 0 }}>
              <span>Total estourado</span>
              <strong className="valor-neg">{fmt(totalEstourado)}</strong>
            </div>
          </div>
        )}
      </div>

      <h2>Onde ainda sobra ({comSobra.length})</h2>
      <div className="cartao">
        {comSobra.length === 0 && <p className="texto-fraco">Nenhuma categoria com sobra no momento.</p>}
        {comSobra.map(({ cat, gasto }) => (
          <div key={cat.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
            {cabecalhoExpansivel(
              cat.id!,
              <BarraMeta
                rotulo={cat.nome}
                gasto={gasto}
                previsto={cat.aceitavelMensal}
                icone={
                  cat.icone !== 'nenhum' && (
                    <Icone id={cat.icone} estilo={cat.iconeEstilo} cor={cat.iconeCor} tamanho={tamanhoIconePx('categoria', pctCategoria)} />
                  )
                }
              />,
            )}
            {expandidas.has(cat.id!) && (
              <ListaLancamentosCategoria
                lancamentos={lancamentosPorCategoria.get(cat.id!) ?? []}
                categoriaPorId={categoriaPorId}
                categoriaIdSugerida={cat.id!}
                aoAbrirLancamento={aoAbrirLancamento}
              />
            )}
          </div>
        ))}
        {comSobra.length > 0 && (
          <>
            <div className="total-geral">
              <div className="linha" style={{ border: 'none', padding: 0 }}>
                <span>Total com sobra</span>
                <strong className="valor-pos">+{fmt(totalComSobra)}</strong>
              </div>
            </div>
            <p className="texto-fraco" style={{ marginTop: 8 }}>
              Se precisar remanejar um gasto extra, é aqui que tem espaço — {comSobra[0].cat.nome} é onde
              mais sobra ({fmt(comSobra[0].diferenca)}).
            </p>
          </>
        )}
      </div>

      {aportes.length > 0 && (
        <>
          <h2>Aportes do mês (Objetivos/Segurança)</h2>
          <div className="cartao">
            {aportes.map(({ cat, aportado }) => (
              <div key={cat.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
                {cabecalhoExpansivel(
                  cat.id!,
                  <BarraMeta
                    rotulo={cat.nome.replace('#', '').trim()}
                    gasto={aportado}
                    previsto={cat.aceitavelMensal}
                    icone={
                      cat.icone !== 'nenhum' && (
                        <Icone id={cat.icone} estilo={cat.iconeEstilo} cor={cat.iconeCor} tamanho={tamanhoIconePx('categoria', pctCategoria)} />
                      )
                    }
                  />,
                )}
                {expandidas.has(cat.id!) && (
                  <ListaLancamentosCategoria
                    lancamentos={lancamentosPorCategoria.get(cat.id!) ?? []}
                    categoriaPorId={categoriaPorId}
                    categoriaIdSugerida={cat.id!}
                    aoAbrirLancamento={aoAbrirLancamento}
                  />
                )}
              </div>
            ))}
            <div className="total-geral">
              <div className="linha" style={{ border: 'none', padding: 0 }}>
                <span>Total aportado</span>
                <strong className={totalAportado >= totalAceitavelAporte ? 'valor-pos' : 'texto-fraco'}>
                  {fmt(totalAportado)} de {fmt(totalAceitavelAporte)}
                </strong>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Botão flutuante presente em toda tela principal (31/08/2026, mesmo dia). */}
      <button type="button" className="botao-flutuante" onClick={() => aoAbrirLancamento()} aria-label="Novo lançamento">
        +
      </button>
    </>
  )
}
