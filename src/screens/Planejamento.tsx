import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, NATUREZAS_ORCAMENTAVEIS, type Categoria, type Lancamento } from '../db'
import { mesAtualISO, type TelaProps } from '../mes'
import { proximaDataRecorrencia } from '../recorrencia'
import { hojeEfetivoISO } from '../hojeSimulado'
import BarraMeta, { fmtBRL as fmt } from '../components/BarraMeta'
import SeletorMes from '../components/SeletorMes'
import ListaLancamentosCategoria from '../components/ListaLancamentosCategoria'
import { Icone } from '../icones'
import { useConfiguracaoIcones, tamanhoIconePx } from '../configuracaoIcones'

type Classe = 'entrada' | 'saida'

// Só categoria com um "planejado" que faz sentido comparar entra aqui:
// Receita (planejado = esperadoMensal, cadastro manual — ver Categorias) do
// lado Entradas; Consumo/Aporte (planejado = aceitavelMensal) do lado
// Saídas. Neutro/Gasto de cofrinho/Pagamento de fatura ficam fora — são
// movimento de caixa entre lugares, não uma meta a bater.
function classeDaCategoria(cat: Categoria): Classe | null {
  if (cat.natureza === 'Receita') return 'entrada'
  if (NATUREZAS_ORCAMENTAVEIS.includes(cat.natureza)) return 'saida'
  return null
}

interface Totais {
  planejado: number
  realizado: number // já aconteceu de fato (pago/recebido)
  previsto: number // já lançado mas não liquidado, ou série fixa que ainda vai gerar
}

function somaTotais(xs: Totais[]): Totais {
  return xs.reduce(
    (s, x) => ({ planejado: s.planejado + x.planejado, realizado: s.realizado + x.realizado, previsto: s.previsto + x.previsto }),
    { planejado: 0, realizado: 0, previsto: 0 },
  )
}

// Tela "Planejamento" (30/08/2026) — a visão de Planejado × Realizado ×
// Previsto que Rafael pediu explicitamente, nos 4 níveis (Geral → Grupo →
// Categoria → Lançamento), pra Entradas e Saídas. Diferente de Situação
// (teto × gasto por categoria de Consumo) e de Resumo (caixa realizado + o
// que ainda falta) — aqui o eixo é "o que era esperado" contra "o que
// aconteceu" e "o que ainda vai acontecer", com um fechamento (sobra/falta)
// em cada nível.
export default function Planejamento({ mes, aoMudarMes, aoAbrirLancamento }: TelaProps) {
  const categorias = useLiveQuery(() => db.categorias.toArray(), [])
  const grupos = useLiveQuery(() => db.grupos.toArray(), [])
  const lancamentosDoMes = useLiveQuery(
    () => db.lancamentos.where('dataCompetencia').startsWith(mes).toArray(),
    [mes],
  )
  const lancamentosTodos = useLiveQuery(() => db.lancamentos.toArray(), [])

  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const [categoriaAberta, setCategoriaAberta] = useState<number | null>(null)
  // Terceira seção (sem orçamento e sem movimento) vem recolhida por padrão
  // em cada grupo — pouco relevante no dia a dia, mas ainda acessível (30/08/2026,
  // rodada seguinte). Guarda por nome de grupo, não globalmente, pra cada
  // grupo lembrar seu próprio estado.
  const [secoesSemMovimentoAbertas, setSecoesSemMovimentoAbertas] = useState<Set<string>>(new Set())
  const { pctGrupo, pctCategoria } = useConfiguracaoIcones()

  if (!categorias || !grupos || !lancamentosDoMes || !lancamentosTodos) return null

  const categoriaPorId = new Map(categorias.map((c) => [c.id!, c]))

  // Transferência entre contas fica de fora do Planejado×Realizado — não é
  // receita/despesa real (ver ResumoDoMes.tsx). Excluída por `transferenciaId`
  // (31/08/2026, rodada seguinte — a categoria de cada perna passou a ser
  // escolhível livremente, então não dá mais pra confiar na natureza).
  const lancamentosPorCategoria = new Map<number, Lancamento[]>()
  for (const l of lancamentosDoMes) {
    if (l.transferenciaId != null) continue
    const lista = lancamentosPorCategoria.get(l.categoriaId) ?? []
    lista.push(l)
    lancamentosPorCategoria.set(l.categoriaId, lista)
  }

  // Previsto "ainda não lançado" por categoria — mesma lógica de série fixa
  // de Situação/Resumo (última ocorrência + próxima data esperada), mas
  // indexada por categoria em vez de agregada de uma vez só.
  const ehMesAtual = mes === mesAtualISO()
  const hojeISO = hojeEfetivoISO()
  const porSerie = new Map<string, Lancamento[]>()
  for (const l of lancamentosTodos) {
    if (l.recorrencia !== 'fixo' || !l.serieId) continue
    const lista = porSerie.get(l.serieId) ?? []
    lista.push(l)
    porSerie.set(l.serieId, lista)
  }
  const previstoFuturoPorCategoria = new Map<number, number>()
  if (ehMesAtual) {
    for (const ocorrencias of porSerie.values()) {
      ocorrencias.sort((a, b) => a.dataCompetencia.localeCompare(b.dataCompetencia))
      const ultima = ocorrencias[ocorrencias.length - 1]
      if (!ultima.periodicidade) continue
      const proxima = proximaDataRecorrencia(ultima.dataCompetencia, ultima.periodicidade, ultima.regraRecorrencia)
      if (!proxima.startsWith(mes) || proxima <= hojeISO) continue
      previstoFuturoPorCategoria.set(
        ultima.categoriaId,
        (previstoFuturoPorCategoria.get(ultima.categoriaId) ?? 0) + Math.abs(ultima.valor),
      )
    }
  }

  function totaisDaCategoria(cat: Categoria, classe: Classe): Totais {
    const lancamentos = lancamentosPorCategoria.get(cat.id!) ?? []
    const planejado = classe === 'entrada' ? cat.esperadoMensal ?? 0 : cat.aceitavelMensal
    let realizado = 0
    let previstoLancado = 0
    for (const l of lancamentos) {
      const pertence = classe === 'entrada' ? l.valor > 0 : l.valor < 0
      if (!pertence) continue
      if (l.pago !== false) realizado += Math.abs(l.valor)
      else previstoLancado += Math.abs(l.valor)
    }
    const previsto = previstoLancado + (previstoFuturoPorCategoria.get(cat.id!) ?? 0)
    return { planejado, realizado, previsto }
  }

  const classificadas = categorias
    .map((cat) => {
      const classe = classeDaCategoria(cat)
      return classe ? { cat, classe, totais: totaisDaCategoria(cat, classe) } : null
    })
    .filter((x): x is { cat: Categoria; classe: Classe; totais: Totais } => x !== null)

  const entradas = classificadas.filter((x) => x.classe === 'entrada')
  const saidas = classificadas.filter((x) => x.classe === 'saida')
  const totalEntradas = somaTotais(entradas.map((x) => x.totais))
  const totalSaidas = somaTotais(saidas.map((x) => x.totais))

  const sobraPlanejada = totalEntradas.planejado - totalSaidas.planejado
  const sobraAteAgora = totalEntradas.realizado - totalSaidas.realizado
  const sobraProjetada =
    totalEntradas.realizado + totalEntradas.previsto - (totalSaidas.realizado + totalSaidas.previsto)

  const porGrupo = grupos
    .map((g) => {
      const itens = classificadas.filter((x) => x.cat.grupo === g.nome)
      return {
        grupo: g.nome,
        icone: g.icone,
        iconeEstilo: g.iconeEstilo,
        iconeCor: g.iconeCor,
        itens,
        entradas: somaTotais(itens.filter((x) => x.classe === 'entrada').map((x) => x.totais)),
        saidas: somaTotais(itens.filter((x) => x.classe === 'saida').map((x) => x.totais)),
      }
    })
    .filter((g) => g.itens.length > 0)

  function alternarGrupo(nome: string) {
    setGrupoAberto((atual) => (atual === nome ? null : nome))
    setCategoriaAberta(null)
  }
  function alternarCategoria(id: number) {
    setCategoriaAberta((atual) => (atual === id ? null : id))
  }
  function alternarSecaoSemMovimento(grupo: string) {
    setSecoesSemMovimentoAbertas((atual) => {
      const novo = new Set(atual)
      if (novo.has(grupo)) novo.delete(grupo)
      else novo.add(grupo)
      return novo
    })
  }

  // Linha "planejado × realizado × previsto" de uma classe (entrada/saída) —
  // função de propósito (não componente aninhado), devolve JSX direto pra
  // não forçar remount da subárvore a cada render (mesmo motivo do
  // `cabecalhoExpansivel` em Situacao.tsx).
  function linhaTotais(rotulo: string, classe: Classe, t: Totais, icone?: ReactNode) {
    const movimento = t.realizado + t.previsto
    if (classe === 'saida') {
      return (
        <div>
          <BarraMeta rotulo={rotulo} gasto={movimento} previsto={t.planejado} mostrarDestaque={false} icone={icone} />
          <p className="texto-fraco" style={{ margin: '2px 0 0' }}>
            já pago {fmt(t.realizado)}
            {t.previsto > 0.005 && ` · previsto ${fmt(t.previsto)}`}
          </p>
        </div>
      )
    }
    // Entrada: mais é bom, não "estourar" — barra neutra sem semântica de
    // cor (BarraMeta pintaria de vermelho passar da meta, o que aqui seria
    // uma leitura errada: receber mais que o planejado é notícia boa).
    const pct = t.planejado > 0 ? Math.min(100, (movimento / t.planejado) * 100) : movimento > 0 ? 100 : 0
    return (
      <div>
        <div className={`linha ${icone ? 'linha-cabecalho-grupo' : ''}`} style={{ border: 'none', padding: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icone}
            {rotulo}
          </span>
          <span className="texto-fraco">
            {fmt(movimento)} {t.planejado > 0 ? `de ${fmt(t.planejado)}` : '(sem planejado)'}
          </span>
        </div>
        <div className="barra-meta">
          <div className="fill" style={{ width: `${pct}%` }} />
          {t.planejado > 0 && <div className="marcador" style={{ left: '100%' }} />}
        </div>
        <p className="texto-fraco" style={{ margin: '2px 0 0' }}>
          já recebido {fmt(t.realizado)}
          {t.previsto > 0.005 && ` · previsto ${fmt(t.previsto)}`}
        </p>
      </div>
    )
  }

  function linhaFechamento(rotulo: string, valor: number) {
    return (
      <div className="linha" style={{ border: 'none', padding: '4px 0' }}>
        <span>{rotulo}</span>
        <strong className={valor >= 0 ? 'valor-pos' : 'valor-neg'}>
          {valor >= 0 ? '+' : '-'}
          {fmt(valor)}
        </strong>
      </div>
    )
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <h1>Planejamento</h1>
        <SeletorMes mes={mes} onMudar={aoMudarMes} />
      </div>
      <p className="texto-fraco">
        Planejado (o que era esperado) × Realizado (o que já aconteceu) × Previsto (o que ainda vai
        acontecer) — em 4 níveis: Geral, Grupo, Categoria e Lançamento. Toque num grupo pra descer de
        nível.
      </p>

      <h2>Nível Geral</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0, textTransform: 'uppercase', fontSize: 12 }}>
          Entradas
        </p>
        <div className="total-geral">{linhaTotais('Total de entradas', 'entrada', totalEntradas)}</div>
        <p className="texto-fraco" style={{ marginTop: 16, textTransform: 'uppercase', fontSize: 12 }}>
          Saídas
        </p>
        <div className="total-geral">{linhaTotais('Total de saídas', 'saida', totalSaidas)}</div>
        <div className="total-geral" style={{ marginTop: 16 }}>
          {linhaFechamento('Sobra/falta planejada', sobraPlanejada)}
          {linhaFechamento('Sobra/falta até agora', sobraAteAgora)}
          {linhaFechamento('Sobra/falta projetada', sobraProjetada)}
        </div>
        {totalEntradas.planejado === 0 && (
          <p className="texto-fraco" style={{ marginTop: 8 }}>
            "Sobra/falta planejada" parece só falta porque nenhuma categoria de Receita tem um
            planejado cadastrado ainda — cadastre em Categorias ("Planejado mensal", só aparece pra
            natureza Receita) pra esse número refletir a realidade.
          </p>
        )}
      </div>

      <h2>Nível Grupo</h2>
      {porGrupo.map(({ grupo, icone, iconeEstilo, iconeCor, itens, entradas: entradasGrupo, saidas: saidasGrupo }) => {
        const grupoExpandido = grupoAberto === grupo
        const temEntrada = entradasGrupo.planejado > 0 || entradasGrupo.realizado > 0 || entradasGrupo.previsto > 0
        const temSaida = saidasGrupo.planejado > 0 || saidasGrupo.realizado > 0 || saidasGrupo.previsto > 0

        // 3 seções, cada uma com cor própria (30/08/2026, rodada seguinte —
        // substitui a divisão anterior em só 2 grupos): (1) tem orçamento
        // previsto — é a que tem algo pra comparar de verdade, entra aqui
        // COM ou SEM movimento neste mês (decisão do Claude Code: o pedido
        // do Rafael cobriu explicitamente "tem orçamento e teve movimento",
        // mas não disse onde cai "tem orçamento e não teve movimento ainda"
        // — faz mais sentido continuar junto de quem tem orçamento, é o
        // sinal mais importante, não sumir da tela só por não ter sido usado
        // ainda este mês); (2) sem orçamento mas com movimento — algo foi
        // lançado numa categoria que não tem teto/meta cadastrado, vale
        // atenção; (3) sem orçamento e sem movimento — a mais numerosa e
        // menos relevante no dia a dia, por isso vem RECOLHIDA por padrão.
        const itensOrdenados = [...itens].sort((a, b) => a.cat.nome.localeCompare(b.cat.nome))
        const temMovimento = (t: Totais) => t.realizado > 0.005 || t.previsto > 0.005
        const comOrcamento = itensOrdenados.filter((x) => x.totais.planejado > 0)
        const semOrcamentoComMovimento = itensOrdenados.filter(
          (x) => x.totais.planejado === 0 && temMovimento(x.totais),
        )
        const semOrcamentoSemMovimento = itensOrdenados.filter(
          (x) => x.totais.planejado === 0 && !temMovimento(x.totais),
        )

        // Cabeçalho de grupo simplificado (30/08/2026, rodada seguinte): uma
        // única barra combinada em vez de duas separadas (Saídas/Entradas) —
        // esse detalhamento já aparece nos níveis internos (Categoria/
        // Lançamento), repetir aqui só duplicava informação. 'saida' é a
        // classe visual padrão (a maioria dos grupos só tem categoria de
        // saída); um grupo só de receita usa 'entrada' pra não pintar de
        // vermelho um resultado que na verdade é bom.
        const classeGrupoUnico: Classe = temSaida ? 'saida' : 'entrada'
        const totalGrupoUnico = somaTotais(itens.map((x) => x.totais))

        function linhaCategoria({ cat, classe, totais }: (typeof itens)[number]) {
          const catExpandida = categoriaAberta === cat.id
          return (
            <div key={cat.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
              <div
                className={`linha-expansivel ${catExpandida ? 'expandida' : ''}`}
                onClick={() => alternarCategoria(cat.id!)}
              >
                <span className="seta-expandir">▶</span>
                {linhaTotais(
                  cat.nome,
                  classe,
                  totais,
                  cat.icone !== 'nenhum' && (
                    <Icone id={cat.icone} estilo={cat.iconeEstilo} cor={cat.iconeCor} tamanho={tamanhoIconePx('categoria', pctCategoria)} />
                  ),
                )}
              </div>
              {catExpandida && (
                <div style={{ marginTop: 8 }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: 12 }}>Nível Lançamento</h2>
                  <ListaLancamentosCategoria
                    lancamentos={lancamentosPorCategoria.get(cat.id!) ?? []}
                    categoriaPorId={categoriaPorId}
                    categoriaIdSugerida={cat.id!}
                    aoAbrirLancamento={aoAbrirLancamento}
                  />
                </div>
              )}
            </div>
          )
        }

        return (
          <div key={grupo} className="cartao" style={{ marginBottom: 10 }}>
            <div
              className={`linha-expansivel ${grupoExpandido ? 'expandida' : ''}`}
              onClick={() => alternarGrupo(grupo)}
            >
              <span className="seta-expandir">▶</span>
              <div style={{ flex: 1 }}>
                <div className="linha linha-cabecalho-grupo" style={{ border: 'none', padding: 0 }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {icone !== 'nenhum' && (
                      <Icone id={icone} estilo={iconeEstilo} cor={iconeCor} tamanho={tamanhoIconePx('grupo', pctGrupo)} />
                    )}
                    {grupo}
                  </strong>
                  <span className="texto-fraco">{itens.length} categoria(s)</span>
                </div>
                {/* Barra de verdade em vez de só texto (30/08/2026) — reusa a
                    mesma linhaTotais() do nível Geral/Categoria. Uma única
                    barra combinada (não mais Saídas e Entradas separadas) —
                    esse detalhamento já aparece nos níveis internos. */}
                {(temSaida || temEntrada) && (
                  <div className="total-geral" style={{ marginTop: 8 }}>
                    {linhaTotais('Total do grupo', classeGrupoUnico, totalGrupoUnico)}
                  </div>
                )}
              </div>
            </div>

            {grupoExpandido && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--borda)', paddingTop: 8 }}>
                <h2 style={{ marginTop: 0 }}>Nível Categoria</h2>

                {comOrcamento.length > 0 && (
                  <>
                    <p className="texto-fraco" style={{ marginTop: 0, textTransform: 'uppercase', fontSize: 11, color: 'var(--azul)' }}>
                      Com orçamento previsto
                    </p>
                    <div style={{ borderLeft: '3px solid var(--azul)', paddingLeft: 10 }}>
                      {comOrcamento.map(linhaCategoria)}
                    </div>
                  </>
                )}

                {semOrcamentoComMovimento.length > 0 && (
                  <>
                    <p
                      className="texto-fraco"
                      style={{ marginTop: 16, textTransform: 'uppercase', fontSize: 11, color: 'var(--amarelo)' }}
                    >
                      Sem orçamento, mas com movimento
                    </p>
                    <div style={{ borderLeft: '3px solid var(--amarelo)', paddingLeft: 10 }}>
                      {semOrcamentoComMovimento.map(linhaCategoria)}
                    </div>
                  </>
                )}

                {semOrcamentoSemMovimento.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => alternarSecaoSemMovimento(grupo)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--texto-fraco)',
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          transform: secoesSemMovimentoAbertas.has(grupo) ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.15s',
                        }}
                      >
                        ▶
                      </span>
                      Sem orçamento e sem movimento ({semOrcamentoSemMovimento.length})
                    </button>
                    {secoesSemMovimentoAbertas.has(grupo) && (
                      <div style={{ borderLeft: '3px solid var(--borda)', paddingLeft: 10, marginTop: 8 }}>
                        {semOrcamentoSemMovimento.map(linhaCategoria)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Botão flutuante presente em toda tela principal (31/08/2026, mesmo dia). */}
      <button type="button" className="botao-flutuante" onClick={() => aoAbrirLancamento()} aria-label="Novo lançamento">
        +
      </button>
    </>
  )
}
