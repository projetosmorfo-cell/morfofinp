import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type Lancamento } from '../db'
import { mesAtualISO, type TelaProps } from '../mes'
import { proximaDataRecorrencia } from '../recorrencia'
import { hojeEfetivoISO } from '../hojeSimulado'
import BarraMeta from '../components/BarraMeta'
import SeletorMes from '../components/SeletorMes'
import ListaLancamentosCategoria from '../components/ListaLancamentosCategoria'
import { fmtBRL as fmt } from '../formatoMoeda'
import { Icone } from '../icones'
import { useConfiguracaoIcones, tamanhoIconePx } from '../configuracaoIcones'

// Resumo do Mês = "o que já aconteceu de verdade este mês + o que ainda vai
// acontecer antes dele fechar" (visão de caixa) — diferente da Situação, que
// é teto × gasto por categoria/grupo. As duas telas de propósito não repetem
// a mesma pergunta (ver nota em Situacao.tsx).
export default function ResumoDoMes({ mes, aoMudarMes, aoAbrirLancamento, aoAbrirPlanejamento }: TelaProps) {
  const categorias = useLiveQuery(() => db.categorias.toArray(), [])
  const grupos = useLiveQuery(() => db.grupos.toArray(), [])
  const lancamentosDoMes = useLiveQuery(
    () => db.lancamentos.where('dataCompetencia').startsWith(mes).toArray(),
    [mes],
  )
  // Histórico completo — só pra achar a última ocorrência de cada série fixa
  // (ver "Vai entrar"/"Vai sair" abaixo), igual à Situação.
  const lancamentosTodos = useLiveQuery(() => db.lancamentos.toArray(), [])
  const metas = useLiveQuery(() => db.metas.toArray(), [])

  const [expandidas, setExpandidas] = useState<Set<number>>(new Set())
  // F-02 da revisão de UI (04/09/2026): "Por categoria" era uma lista achatada
  // de ~19 itens sem agrupamento — agora segue o mesmo padrão de árvore
  // recolhida que Planejamento já usa (Grupo → Categoria), reduzindo pra 4
  // itens visíveis por padrão.
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const { pctGrupo, pctCategoria } = useConfiguracaoIcones()

  if (!categorias || !grupos || !lancamentosDoMes || !lancamentosTodos || !metas) return null

  function alternarExpandida(catId: number) {
    setExpandidas((atual) => {
      const novo = new Set(atual)
      if (novo.has(catId)) novo.delete(catId)
      else novo.add(catId)
      return novo
    })
  }
  function alternarGrupo(nome: string) {
    setGrupoAberto((atual) => (atual === nome ? null : nome))
  }

  const categoriaPorId = new Map(categorias.map((c) => [c.id!, c]))

  // Entrou/Saiu = só o que já é realidade (pago/recebido de fato). Lançamento
  // já registrado mas ainda não liquidado (a pagar/a receber) entra nas
  // linhas "Vai sair"/"Vai entrar" abaixo — separar os dois evita misturar
  // "o que já aconteceu" com "o que ainda vai acontecer" no mesmo número.
  let entrou = 0
  let saiu = 0
  const porCategoria = new Map<number, number>()
  const lancamentosPorCategoria = new Map<number, typeof lancamentosDoMes>()

  for (const l of lancamentosDoMes) {
    const cat = categoriaPorId.get(l.categoriaId)
    // Pagamento de fatura é movimento de caixa, não despesa do mês — a compra já
    // entrou no cálculo no mês em que foi feita. Contar aqui de novo dobraria o gasto.
    // Transferência entre contas próprias também é movimento de caixa, não
    // receita/despesa real — sem essa exclusão, mover dinheiro entre Bradesco e
    // um cofrinho cadastrado infla Entrou E Saiu ao mesmo tempo (o Resultado não
    // muda, mas os dois números ficam errados). 31/08/2026, rodada seguinte:
    // trocado de "natureza === 'Transferência'" pra "l.transferenciaId != null"
    // — desde que a categoria de cada perna passou a ser escolhível
    // independentemente (ponto 3 do feedback), uma transferência pode carregar
    // QUALQUER categoria, não só a de sistema; o que identifica a perna de
    // verdade é o campo `transferenciaId`, nunca a natureza da categoria.
    if (cat?.natureza === 'Pagamento de fatura' || l.transferenciaId != null) continue
    const realizado = l.pago !== false
    if (l.valor > 0) {
      if (realizado) entrou += l.valor
    } else {
      if (realizado) saiu += -l.valor
    }
    porCategoria.set(l.categoriaId, (porCategoria.get(l.categoriaId) ?? 0) + l.valor)
    const lista = lancamentosPorCategoria.get(l.categoriaId) ?? []
    lista.push(l)
    lancamentosPorCategoria.set(l.categoriaId, lista)
  }

  const resultado = entrou - saiu

  // --- Vai entrar / Vai sair (30/08/2026) ---
  // Duas fontes: (a) lançamento já registrado este mês mas marcado como não
  // pago/recebido ainda (a pagar/a receber/atrasado); (b) série fixa (salário,
  // aluguel etc.) cuja próxima ocorrência cai neste mês mas ainda não chegou
  // o dia — ainda não virou lançamento de verdade (só acontece quando a data
  // chega, ver `avancarSeriesFixasPendentes`). Ex.: salário é recorrente,
  // sabemos que vai entrar; antes do dia certo ele aparece aqui como "vai
  // entrar", não como "entrou".
  let vaiSairLancado = 0
  let vaiEntrarLancado = 0
  for (const l of lancamentosDoMes) {
    const cat = categoriaPorId.get(l.categoriaId)
    if (cat?.natureza === 'Pagamento de fatura' || l.transferenciaId != null) continue
    if (l.pago === false) {
      if (l.valor > 0) vaiEntrarLancado += l.valor
      else vaiSairLancado += -l.valor
    }
  }

  const ehMesAtual = mes === mesAtualISO()
  const hojeISO = hojeEfetivoISO()
  const porSerie = new Map<string, Lancamento[]>()
  for (const l of lancamentosTodos) {
    if (l.recorrencia !== 'fixo' || !l.serieId) continue
    const lista = porSerie.get(l.serieId) ?? []
    lista.push(l)
    porSerie.set(l.serieId, lista)
  }
  let vaiSairFuturo = 0
  let vaiEntrarFuturo = 0
  if (ehMesAtual) {
    for (const ocorrencias of porSerie.values()) {
      ocorrencias.sort((a, b) => a.dataCompetencia.localeCompare(b.dataCompetencia))
      const ultima = ocorrencias[ocorrencias.length - 1]
      if (!ultima.periodicidade) continue
      const proxima = proximaDataRecorrencia(ultima.dataCompetencia, ultima.periodicidade, ultima.regraRecorrencia)
      if (!proxima.startsWith(mes) || proxima <= hojeISO) continue
      if (ultima.valor >= 0) vaiEntrarFuturo += ultima.valor
      else vaiSairFuturo += -ultima.valor
    }
  }

  const vaiSair = vaiSairLancado + vaiSairFuturo
  const vaiEntrar = vaiEntrarLancado + vaiEntrarFuturo
  const resultadoProjetado = resultado + vaiEntrar - vaiSair

  // gasto real por grupo — só natureza Consumo, igual à fórmula da planilha
  // (SUMIFS ... natureza="Consumo"). Aporte/Neutro/Pagamento de fatura ficam de
  // fora, senão contam como "gasto" algo que não é despesa do grupo. Objetivos/
  // Segurança aparecem aqui sempre com gasto 0 (não têm categoria Consumo) —
  // é intencional, mesma lógica da planilha: aporte deles é acompanhado à
  // parte (ver Situação · "Aportes do mês"), não como % de teto de Consumo.
  const gastoPorGrupo = new Map<string, number>()
  for (const l of lancamentosDoMes) {
    const cat = categoriaPorId.get(l.categoriaId)
    if (!cat || cat.natureza !== 'Consumo') continue
    if (l.valor >= 0) continue
    gastoPorGrupo.set(cat.grupo, (gastoPorGrupo.get(cat.grupo) ?? 0) + -l.valor)
  }

  // Base pra calcular a Meta R$ de cada grupo: só o salário do mês (categoria
  // "Salário"), não a receita total. Cashback, reembolso e outras entradas
  // avulsas não expandem a meta de gasto — é a mesma regra que você fixou na
  // planilha (célula "Forçar base fixa"), agora sempre ligada, sem precisar
  // configurar mês a mês.
  let baseSalario = 0
  for (const l of lancamentosDoMes) {
    if (categoriaPorId.get(l.categoriaId)?.nome === 'Salário') baseSalario += l.valor
  }

  const gruposComMeta = grupos.map((g) => {
    const meta = metas.find((m) => m.grupo === g.nome)
    const percentual = meta?.percentual ?? 0
    const limite = (baseSalario * percentual) / 100
    const gasto = gastoPorGrupo.get(g.nome) ?? 0
    return { grupo: g.nome, limite, gasto, icone: g.icone, iconeEstilo: g.iconeEstilo, iconeCor: g.iconeCor }
  })
  const totalGeralGrupos = {
    limite: gruposComMeta.reduce((s, g) => s + g.limite, 0),
    gasto: gruposComMeta.reduce((s, g) => s + g.gasto, 0),
  }

  const categoriasComMovimento = [...porCategoria.entries()]
    .map(([catId, valor]) => ({ cat: categoriaPorId.get(catId), valor }))
    .filter((x): x is { cat: Categoria; valor: number } => !!x.cat)
  const totalMovimentoCategorias = categoriasComMovimento.reduce((s, x) => s + x.valor, 0)

  // F-02: agrupa por grupo da categoria (mesmo campo `Categoria.grupo` usado
  // em Planejamento/Categorias) — inclui receita também (ex.: grupo
  // "Receitas"), já que a lista original misturava despesa e receita sem
  // distinção nenhuma.
  const grupoInfoPorNome = new Map(grupos.map((g) => [g.nome, g]))
  const gruposComCategoria = new Map<string, { valor: number; itens: { cat: Categoria; valor: number }[] }>()
  for (const item of categoriasComMovimento) {
    const atual = gruposComCategoria.get(item.cat.grupo) ?? { valor: 0, itens: [] }
    atual.valor += item.valor
    atual.itens.push(item)
    gruposComCategoria.set(item.cat.grupo, atual)
  }
  const gruposParaExibir = [...gruposComCategoria.entries()]
    .map(([grupo, dados]) => ({
      grupo,
      valor: dados.valor,
      itens: [...dados.itens].sort((a, b) => a.valor - b.valor),
    }))
    .sort((a, b) => a.valor - b.valor)

  return (
    <>
      <div className="cabecalho-fixo">
        <h1>Resumo do mês</h1>
        <SeletorMes mes={mes} onMudar={aoMudarMes} />
      </div>

      <div className="cartao">
        <div className="linha">
          <span>Entrou</span>
          <span className="valor-pos">+{fmt(entrou)}</span>
        </div>
        <div className="linha">
          <span>Saiu</span>
          <span className="valor-neg">-{fmt(saiu)}</span>
        </div>
        {(vaiEntrar > 0 || vaiSair > 0) && (
          <>
            <div className="linha">
              <span className="texto-fraco">Vai entrar (previsto, ainda não recebido)</span>
              <span className="texto-fraco">+{fmt(vaiEntrar)}</span>
            </div>
            <div className="linha">
              <span className="texto-fraco">Vai sair (comprometido, ainda não pago)</span>
              <span className="texto-fraco">-{fmt(vaiSair)}</span>
            </div>
          </>
        )}
        <div className="linha">
          <span>Resultado até agora</span>
          <strong className={resultado >= 0 ? 'valor-pos' : 'valor-neg'}>
            {resultado >= 0 ? '+' : '-'}{fmt(resultado)}
          </strong>
        </div>
        <div className="total-geral">
          <div className="linha" style={{ border: 'none', padding: 0 }}>
            <strong>Resultado projetado (com o que ainda falta)</strong>
            <strong className={resultadoProjetado >= 0 ? 'valor-pos' : 'valor-neg'} style={{ fontSize: 18 }}>
              {resultadoProjetado >= 0 ? '+' : '-'}{fmt(resultadoProjetado)}
            </strong>
          </div>
        </div>
      </div>

      {/* 04/09/2026, rodada seguinte — achado central da revisão de UI
          (04/09/2026): o bloco "por grupo" (Fixo/Variável/Objetivos/
          Segurança) era renderizado do zero aqui, na Situação E no
          Planejamento — três fontes independentes que já foram flagradas
          divergindo em número pro mesmo mês. Passa a existir só em
          Planejamento (que já é "o" lugar de planejado×realizado); aqui fica
          só o total geral (pra não perder de vista se o mês como um todo
          está dentro do combinado) mais um link pro detalhamento completo. */}
      <h2>Metas por grupo</h2>
      <div className="cartao">
        {gruposComMeta.length === 0 ? (
          <p className="texto-fraco">Nenhum grupo cadastrado ainda.</p>
        ) : (
          <BarraMeta rotulo="Total geral" gasto={totalGeralGrupos.gasto} previsto={totalGeralGrupos.limite} />
        )}
        <button type="button" className="botao-link-secao" onClick={aoAbrirPlanejamento}>
          Ver detalhamento por grupo em Planejamento →
        </button>
      </div>

      {/* F-02: agrupada por Grupo (Fixo/Variável/Objetivos/Receitas…),
          recolhida por padrão — mesmo padrão de árvore que Planejamento já
          usa, em vez da lista achatada de ~19 categorias que havia antes. */}
      <h2>Por categoria</h2>
      <div className="cartao">
        {gruposParaExibir.length === 0 && (
          <p className="texto-fraco">Nenhum lançamento neste mês ainda.</p>
        )}
        {gruposParaExibir.map(({ grupo, valor, itens }) => {
          const grupoExpandido = grupoAberto === grupo
          const infoGrupo = grupoInfoPorNome.get(grupo)
          return (
            <div key={grupo} style={{ padding: '2px 0' }}>
              <div
                className={`linha linha-expansivel linha-cabecalho-grupo ${grupoExpandido ? 'expandida' : ''}`}
                onClick={() => alternarGrupo(grupo)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="seta-expandir">▶</span>
                  {infoGrupo && infoGrupo.icone !== 'nenhum' && (
                    <Icone id={infoGrupo.icone} estilo={infoGrupo.iconeEstilo} cor={infoGrupo.iconeCor} tamanho={tamanhoIconePx('grupo', pctGrupo)} />
                  )}
                  <strong>{grupo}</strong>
                  <span className="texto-fraco">{itens.length} categoria(s)</span>
                </span>
                <span className={valor < 0 ? 'valor-neg' : 'valor-pos'}>
                  {valor < 0 ? '-' : '+'}{fmt(valor)}
                </span>
              </div>
              {grupoExpandido && (
                <div style={{ marginTop: 2, marginLeft: 14, borderLeft: '3px solid var(--borda)', paddingLeft: 10 }}>
                  {itens.map(({ cat, valor: valorCat }) => {
                    const catId = cat.id!
                    const expandida = expandidas.has(catId)
                    return (
                      <div key={catId} style={{ padding: '2px 0' }}>
                        <div
                          className={`linha linha-expansivel ${expandida ? 'expandida' : ''}`}
                          onClick={() => alternarExpandida(catId)}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="seta-expandir">▶</span>
                            {cat.icone !== 'nenhum' && (
                              <Icone id={cat.icone} estilo={cat.iconeEstilo} cor={cat.iconeCor} tamanho={tamanhoIconePx('categoria', pctCategoria)} />
                            )}
                            {cat.nome}
                          </span>
                          <span className={valorCat < 0 ? 'valor-neg' : 'valor-pos'}>
                            {valorCat < 0 ? '-' : '+'}{fmt(valorCat)}
                          </span>
                        </div>
                        {expandida && (
                          <ListaLancamentosCategoria
                            lancamentos={lancamentosPorCategoria.get(catId) ?? []}
                            categoriaPorId={categoriaPorId}
                            categoriaIdSugerida={catId}
                            aoAbrirLancamento={aoAbrirLancamento}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {categoriasComMovimento.length > 0 && (
          <div className="total-geral">
            <div className="linha" style={{ border: 'none', padding: 0 }}>
              <span>Total (líquido)</span>
              <strong className={totalMovimentoCategorias >= 0 ? 'valor-pos' : 'valor-neg'}>
                {totalMovimentoCategorias >= 0 ? '+' : '-'}{fmt(totalMovimentoCategorias)}
              </strong>
            </div>
          </div>
        )}
      </div>

      {/* Botão flutuante presente em toda tela principal (31/08/2026, mesmo
          dia) — sem categoria/conta pré-sugerida, já que aqui não há
          contexto nenhum de onde ele foi tocado. */}
      <button type="button" className="botao-flutuante" onClick={() => aoAbrirLancamento()} aria-label="Novo lançamento">
        +
      </button>
    </>
  )
}
