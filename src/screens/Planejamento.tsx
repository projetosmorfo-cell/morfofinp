import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type GrupoRegistro, type Lancamento } from '../db'
import { categoriaConsomeMeta } from '../orcamento'
import { mesAtualISO, type TelaProps } from '../mes'
import { proximaDataRecorrencia } from '../recorrencia'
import { hojeEfetivoISO } from '../hojeSimulado'
import { tipoDoGrupo } from '../gruposUtil'
import { PopupAceitavelCategoria, PopupMetaGrupo } from '../components/EdicaoRapida'
import { GraficoMetasGrupos, type FatiaGrupo } from '../components/Graficos'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import BarraMeta, { fmtBRL as fmt } from '../components/BarraMeta'
import { fmtSinalExplicito } from '../formatoMoeda'
import SeletorMes from '../components/SeletorMes'
import ListaLancamentosCategoria from '../components/ListaLancamentosCategoria'
import { Icone } from '../icones'
import { useConfiguracaoIcones, tamanhoIconePx } from '../configuracaoIcones'
import TituloTelaN1 from '../kit/CabecalhoN1'
import { InfoDot } from '../kit/PadraoUI'
import { calcularProjecao, explicacaoRitmo, fraseVeredito, linhaAporte } from '../projecao'
import { paramsGlobais, usePlatformN0 } from '../kit/kitPlatform'
import GraficosPlanejamento, { type ModeloGrafico } from '../components/GraficosPlanejamento'
import { ExportSheet, type ExportRow } from '../kit/ExportSheet'
import { lerDoAmbiente } from '../ambiente'
import { baseMetaDoMes } from '../baseMeta'
import { jaAconteceu } from '../statusPagamento'
import { SUBTITULO_PLANEJAMENTO, EXPLICACAO_PLANEJAMENTO } from '../subtitulosTelas'
import AvisoBaseMetaZerada from '../components/AvisoBaseMetaZerada'
import Legenda from '../components/Legenda'

/* A linha de introdução dos cards de grupo: quanto é o 100% e quanto os
   percentuais somam de verdade. Silêncio quando fecha; alerta quando não. */
function FaixaPercentuais({
  base,
  metas,
  grupos,
  aoAbrirCalibragem,
}: {
  base: number
  metas: { grupo: string; percentual: number }[]
  grupos: { nome: string; tipo?: string; ativo?: boolean }[]
  aoAbrirCalibragem?: () => void
}) {
  const deSaida = grupos.filter((g) => g.tipo === 'saida' && g.ativo !== false)
  if (deSaida.length === 0) return null
  const total = deSaida.reduce((s, g) => s + (metas.find((m) => m.grupo === g.nome)?.percentual ?? 0), 0)
  const dif = total - 100
  const fechou = Math.abs(dif) < 0.5
  const conteudo = (
    <>
      <span style={{ flex: 1, minWidth: 0 }}>
        Receita fixa {fmt(base)} · percentuais somam{' '}
        <strong data-testid="total-pct-planejamento">{Number(total.toFixed(2))}%</strong>
        {!fechou && (dif > 0 ? ` — ${Number(dif.toFixed(2))}% a mais` : ` — faltam ${Number((-dif).toFixed(2))}%`)}
      </span>
      {/* Cara de BOTÃO, não palavra em destaque (build 067, pedido do Rafael:
          *"a linha no topo que tem o botão Calibrar deve mostrar realmente um
          botão e não só texto"*). A faixa inteira já era clicável desde a 059 —
          o que faltava era o sinal visual de que ali se toca. */}
      {aoAbrirCalibragem && <span className="aviso-calibragem-acao">Calibrar</span>}
    </>
  )
  /* A faixa é SEMPRE um botão que abre a Calibragem (13/09/2026). Até aqui só
     virava botão quando os percentuais NÃO fechavam 100% — então, com tudo
     calibrado, a palavra "calibrar" ficava escrita em cor de destaque sem
     clicar em lugar nenhum, e a tela de calibragem só era alcançável pelo
     lápis de um grupo. Era a reclamação literal: "ali não deveria ser um
     botão? não achei em nenhum lugar um botão pra abrir a tela de calibragem".
     O ⚠ continua marcando só o caso de erro. */
  if (!aoAbrirCalibragem) {
    return (
      <div className="faixa-percentuais" data-testid="faixa-percentuais">
        {conteudo}
      </div>
    )
  }
  return (
    <button
      type="button"
      className={`faixa-percentuais ${fechou ? '' : 'alerta'}`}
      onClick={aoAbrirCalibragem}
      data-testid="faixa-percentuais"
    >
      {fechou ? null : '⚠ '}
      {conteudo}
    </button>
  )
}

type Classe = 'entrada' | 'saida'

// Só categoria com um "planejado" que faz sentido comparar entra aqui:
// Receita (planejado = esperadoMensal, cadastro manual — ver Categorias) do
// lado Entradas; Consumo/Aporte (planejado = aceitavelMensal) do lado
// Saídas. Neutro/Gasto de cofrinho/Pagamento de fatura ficam fora — são
// movimento de caixa entre lugares, não uma meta a bater.
function classeDaCategoria(cat: Categoria): Classe | null {
  if (cat.natureza === 'Receita') return 'entrada'
  if (categoriaConsomeMeta(cat.natureza)) return 'saida'
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
export default function Planejamento({ mes, aoMudarMes, aoAbrirLancamento, aoAbrirCalibragem }: TelaProps) {
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.toArray()), [])
  const lancamentosDoMes = useLiveQuery(
    () => lerDoAmbiente(db.lancamentos.where('dataCompetencia').startsWith(mes).toArray()),
    [mes],
  )
  const lancamentosTodos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), [])

  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false) /* G44 regra 11b */
  /* Aba 2 (Gráficos) — nasceu restrita à versão Ideal (build 058). Com o fim
     das versões (build 087) o seletor de abas é de todo mundo. */
  const [abaPlan, setAbaPlan] = useState<'arvore' | 'graficos'>('arvore')
  const [modeloGrafico, setModeloGrafico] = useState<ModeloGrafico>('colunas')
  const [grupoFiltroGrafico, setGrupoFiltroGrafico] = useState<string | null>(null)
  const [catAbertaGrafico, setCatAbertaGrafico] = useState<number | null>(null)
  const [categoriaAberta, setCategoriaAberta] = useState<number | null>(null)
  // Terceira seção (sem orçamento e sem movimento) vem recolhida por padrão
  // em cada grupo — pouco relevante no dia a dia, mas ainda acessível (30/08/2026,
  // rodada seguinte). Guarda por nome de grupo, não globalmente, pra cada
  // grupo lembrar seu próprio estado.
  const [secoesSemMovimentoAbertas, setSecoesSemMovimentoAbertas] = useState<Set<string>>(new Set())
  /* Edição rápida chamada pelos ícones de lápis desta tela (11/09/2026) — o
     popup abre por cima, então a tela não desmonta: grupo aberto, categoria
     aberta e posição de rolagem continuam onde estavam ao fechar. */
  const [editandoCategoria, setEditandoCategoria] = useState<Categoria | null>(null)
  const [editandoGrupo, setEditandoGrupo] = useState<GrupoRegistro | null>(null)
  const metas = useLiveQuery(() => lerDoAmbiente(db.metas.toArray()), [])
  /* A frase do veredito também aqui (13/09/2026, escolha do Rafael: "nas duas
     telas"). É a mesma função da tela Hoje — uma conta só, dois lugares. Fora
     da Ideal ela não aparece: Light e Premium não foram tocadas. */
  const contasParaProjecao = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])
  const platformProjecao = usePlatformN0()
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
      /* `jaAconteceu`, não `pago !== false` (14/09/2026): compra de cartão de
         data já passada é REALIZADO, mesmo com a fatura em aberto. Sem isso a
         barra do mês ficava âmbar inteira até a fatura ser paga, no mês
         seguinte — ver `contasCartao.ts`. */
      if (jaAconteceu(l)) realizado += Math.abs(l.valor)
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

  /* Base da meta do grupo — ver `src/baseMeta.ts`. Desde 12/09/2026 é a soma
     das categorias de receita marcadas como FIXA, do mês que está na tela
     (antes: a categoria de nome "Salário", do mês ANTERIOR — que divergia do
     card "Metas por grupo" do Resumo, que já usava o mês atual). */
  const baseMetaEmReais = baseMetaDoMes(lancamentosTodos, categorias, mes)

  const porGrupo = grupos
    .map((g) => {
      const itens = classificadas.filter((x) => x.cat.grupo === g.nome)
      return {
        grupo: g.nome,
        tipo: tipoDoGrupo(g),
        icone: g.icone,
        iconeEstilo: g.iconeEstilo,
        iconeCor: g.iconeCor,
        itens,
        totalGrupo: somaTotais(itens.map((x) => x.totais)),
      }
    })
    .filter((g) => g.itens.length > 0)

  /* Fatias do donut: uma por grupo COM meta cadastrada. Meta em R$ vem da
     mesma conta da aba Metas (percentual × salário do mês anterior); o
     realizado e o previsto vêm dos mesmos totais que a tela inteira usa — o
     gráfico nunca calcula um número por conta própria. */
  /* Meta em R$ do grupo — a MESMA conta do donut e da aba Metas (percentual ×
     salário do mês anterior). Existe como função pra o cabeçalho do grupo
     poder mostrar, ao lado da soma dos limites, o número que o gráfico usa. */
  function percentualDoGrupo(nome: string) {
    return metas?.find((m) => m.grupo === nome)?.percentual ?? 0
  }
  function metaEmReaisDoGrupo(nome: string) {
    return (baseMetaEmReais * percentualDoGrupo(nome)) / 100
  }

  const fatiasMeta: FatiaGrupo[] = porGrupo
    .map((g) => {
      const pct = metas?.find((m) => m.grupo === g.grupo)?.percentual ?? 0
      return {
        grupo: g.grupo,
        percentualMeta: pct,
        meta: (baseMetaEmReais * pct) / 100,
        realizado: g.totalGrupo.realizado,
        previsto: g.totalGrupo.previsto,
      }
    })
    .filter((f) => f.percentualMeta > 0)

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
  /* 13/09/2026 — a linha "já pago X · previsto Y" saiu daqui. A barra logo
     acima já diz "X de Y" e desenha o realizado e o comprometido em cores
     diferentes; repetir em texto era metade do excesso que o Rafael apontou
     ("tem muito texto... a palavra-chave mandatória é a limpeza"). O detalhe
     de cada lançamento continua a um toque, na cascata. */
  function linhaTotais(rotulo: string, classe: Classe, t: Totais, icone?: ReactNode, acao?: ReactNode) {
    const movimento = t.realizado + t.previsto
    /* O VALOR RESULTANTE de qualquer barra desta tela (build 086): o que ainda
       cabe (positivo) ou o que passou (negativo) em relação ao planejado. Sem
       planejado não existe resultado — mostrar `−movimento` ali diria que tudo
       que se gastou "estourou" algo que nunca foi planejado. */
    const resultado = t.planejado > 0 ? t.planejado - movimento : undefined
    if (classe === 'saida') {
      return (
        <BarraMeta
          rotulo={rotulo}
          gasto={movimento}
          previsto={t.planejado}
          comprometido={t.previsto}
          mostrarDestaque={false}
          icone={icone}
          acao={acao}
          resultado={resultado}
        />
      )
    }
    // Entrada: mais é bom, não "estourar" — barra neutra sem semântica de
    // cor (BarraMeta pintaria de vermelho passar da meta, o que aqui seria
    // uma leitura errada: receber mais que o planejado é notícia boa).
    const pct = t.planejado > 0 ? Math.min(100, (movimento / t.planejado) * 100) : movimento > 0 ? 100 : 0
    /* Na ENTRADA o sinal se inverte: receber MAIS que o planejado é notícia
       boa, então o positivo é o excedente — nunca `planejado − movimento`,
       que pintaria de vermelho justamente o mês em que entrou mais dinheiro. */
    const resultadoEntrada = t.planejado > 0 ? movimento - t.planejado : undefined
    return (
      <div>
        <div className={`linha linha-barra-topo ${icone ? 'linha-cabecalho-grupo' : ''}`} style={{ border: 'none', padding: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icone}
            {rotulo}
          </span>
          <span className="texto-fraco barra-topo-valor">
            {fmt(movimento)} {t.planejado > 0 ? `de ${fmt(t.planejado)}` : 'sem previsão'}
          </span>
          {acao}
        </div>
        <div className="barra-meta-linha">
          <div className="barra-meta">
            <div className="fill" style={{ width: `${pct}%` }} />
            {t.planejado > 0 && <div className="marcador" style={{ left: '100%' }} />}
          </div>
          {resultadoEntrada !== undefined && (
            <span
              className={`barra-meta-resultado ${resultadoEntrada < 0 ? 'negativo' : 'positivo'}`}
              data-testid="barra-resultado"
            >
              {fmtSinalExplicito(resultadoEntrada)}
            </span>
          )}
        </div>
      </div>
    )
  }

  /* Build 087: este bloco era condicionado ao modo 'completa'. Com o fim das
     versões ele vale sempre — a tela Planejamento é de todo mundo. */
  const blocoVeredito = (() => {
        const proj = calcularProjecao({
          lancamentos: lancamentosTodos ?? [],
          categorias: categorias ?? [],
          contas: contasParaProjecao,
          grupos: grupos ?? [],
          metas: metas ?? [],
          mesISO: mes,
          hojeISO: hojeEfetivoISO(),
          janelaDias: paramsGlobais(platformProjecao).janelaMediaDias,
        })
        const frase = fraseVeredito(proj)
        if (!frase) return null
        const aporte = linhaAporte(proj)
        return (
          <div className="cartao" style={{ marginTop: 0 }} data-testid="veredito-planejamento">
            <div className="linha-veredito" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <span
                className={`ideal-t3 ${proj.variavel < 0 ? 'veredito-mal' : 'veredito-bem'}`}
                data-testid="frase-veredito-planejamento"
              >
                {frase}
              </span>
              <InfoDot titulo="Nesse ritmo" info={explicacaoRitmo(paramsGlobais(platformProjecao).janelaMediaDias)} />
            </div>
            {aporte && <p className="linha-aporte ideal-t4">{aporte}</p>}
          </div>
        )
      })()

  return (
    <>
      <div className="cabecalho-fixo">
        <TituloTelaN1
          titulo="Planejamento"
          subtitulo={SUBTITULO_PLANEJAMENTO}
          explicacao={<>{EXPLICACAO_PLANEJAMENTO} São 4 níveis: Geral, Grupo, Categoria e Lançamento — toque num grupo pra descer de nível.</>}
          onExportar={() => setExportOpen(true)}
          /* ⚖ sempre disponível, mesmo com tudo calibrado — a faixa de alerta
             abaixo só aparece quando há algo errado (build 059). */
          antes={aoAbrirCalibragem ? (
            <button
              type="button"
              className="botao-voltar-circular"
              onClick={aoAbrirCalibragem}
              aria-label="Calibragem"
              data-testid="abrir-calibragem"
            >
              ⚖
            </button>
          ) : undefined}
        />
        <SeletorMes mes={mes} onMudar={aoMudarMes} />
      </div>
      {/* O TOTAL DOS PERCENTUAIS, antes dos cards de grupo (pedido do Rafael ao
          aprovar o A1: "apresentar um total dos percentuais logo no topo antes
          dos cards de grupos, isso dá a introdução aos cards abaixo"). Quando
          não fecha 100%, a linha inteira vira o alerta e leva à Calibragem —
          era essa a ponte que faltava. */}
      <FaixaPercentuais
        base={baseMetaEmReais}
        metas={metas ?? []}
        grupos={grupos ?? []}
        aoAbrirCalibragem={aoAbrirCalibragem}
      />
      {exportOpen && <ExportSheet title="Planejamento" filenameBase={`morfofinp-planejamento-${mes}`}
        screenColumns={[
          { key: 'item', label: 'Item' },
          { key: 'planejado', label: 'Planejado' },
          { key: 'realizado', label: 'Realizado' },
          { key: 'previsto', label: 'Previsto' },
        ]}
        screenRows={[
          { item: 'Entradas', planejado: fmt(totalEntradas.planejado), realizado: fmt(totalEntradas.realizado), previsto: fmt(totalEntradas.previsto) },
          { item: 'Saídas', planejado: fmt(totalSaidas.planejado), realizado: fmt(totalSaidas.realizado), previsto: fmt(totalSaidas.previsto) },
          { item: 'Sobra planejada', planejado: fmt(sobraPlanejada), realizado: '', previsto: '' },
          { item: 'Sobra até agora', planejado: '', realizado: fmt(sobraAteAgora), previsto: '' },
          { item: 'Sobra projetada', planejado: '', realizado: '', previsto: fmt(sobraProjetada) },
        ]}
        detailColumns={[
          { key: 'item', label: 'Categoria' },
          { key: 'grupo', label: 'Grupo' },
          { key: 'classe', label: 'Entrada/Saída' },
          { key: 'planejado', label: 'Planejado' },
          { key: 'realizado', label: 'Realizado' },
          { key: 'previsto', label: 'Previsto' },
        ]}
        detailRows={classificadas.map((x): ExportRow => ({
          item: x.cat.nome, grupo: x.cat.grupo ?? '—', classe: x.classe,
          planejado: fmt(x.totais.planejado), realizado: fmt(x.totais.realizado), previsto: fmt(x.totais.previsto),
        }))}
        onClose={() => setExportOpen(false)} />}
      {/* 12/09/2026 (build 053) — ver nota em `Situacao.tsx`. */}

      {/* Base zerada não pode passar em silêncio: sem ela toda meta vira
          R$ 0,00 e o donut desenha contra zero (bug real de 12/09/2026). */}
      <div className="abas-planejamento" role="tablist" aria-label="Modo do Planejamento">
        <button type="button" role="tab" aria-selected={abaPlan === 'arvore'}
          className={abaPlan === 'arvore' ? 'ativa' : ''}
          onClick={() => setAbaPlan('arvore')} data-testid="aba-arvore">Árvore</button>
        <button type="button" role="tab" aria-selected={abaPlan === 'graficos'}
          className={abaPlan === 'graficos' ? 'ativa' : ''}
          onClick={() => setAbaPlan('graficos')} data-testid="aba-graficos">Gráficos</button>
      </div>

      {abaPlan === 'graficos' ? (
        <GraficosPlanejamento
          porGrupo={porGrupo}
          modelo={modeloGrafico}
          aoTrocarModelo={setModeloGrafico}
          grupoFiltro={grupoFiltroGrafico}
          aoFiltrarGrupo={(g) => { setGrupoFiltroGrafico(g); setCatAbertaGrafico(null) }}
          categoriaAberta={catAbertaGrafico}
          aoAbrirCategoria={setCatAbertaGrafico}
          lancamentosPorCategoria={lancamentosPorCategoria}
          aoAbrirLancamento={aoAbrirLancamento}
          veredito={blocoVeredito}
          iconeDaCategoria={(c) => (c.icone && c.icone !== 'nenhum'
            ? <Icone id={c.icone} estilo={c.iconeEstilo} cor={c.iconeCor} tamanho={tamanhoIconePx('categoria', pctCategoria)} />
            : null)}
        />
      ) : (
      <>
      {blocoVeredito}
      {baseMetaEmReais === 0 && <AvisoBaseMetaZerada />}
      <GraficoMetasGrupos fatias={fatiasMeta} />

      {/* 13/09/2026 — o card do mês, enxuto. Saíram os títulos de jargão
          ("Nível Geral", "Nível Grupo", "Nível Categoria", "Nível
          Lançamento"): a tela é uma cascata, e o que diz em que nível a
          pessoa está é o que ela acabou de tocar, não um rótulo técnico.
          Saíram também os rótulos "ENTRADAS"/"SAÍDAS" acima de linhas que já
          se chamam "Entradas"/"Saídas", e o parágrafo de 3 linhas sobre a
          sobra planejada — virou uma frase curta, que é quando ela aparece. */}
      <div className="cartao" data-testid="card-mes-planejamento">
        <div className="total-geral">{linhaTotais('Entradas', 'entrada', totalEntradas)}</div>
        <div className="total-geral" style={{ marginTop: 10 }}>{linhaTotais('Saídas', 'saida', totalSaidas)}</div>
        {/* Item 10 (16/09/2026): o card de 3 linhas "planejada/até agora/
            projetada" tinha virado uma legenda de cor escrita à mão aqui.
            Na build 084 ela virou a peça única `Legenda`, RECOLHIDA e no fim
            do card — pedido do Rafael de que toda legenda do app seja assim.
            As entradas passaram a vir de `legendaBarras.ts`, o mesmo módulo
            que nomeia os tokens que `.barra-meta` pinta. */}
        {/* TEXTO CORRIGIDO (13/09/2026). O anterior dizia "falta dizer quanto
            espera receber nas categorias de Receita" e o Rafael leu como se
            ele ainda precisasse marcar alguma coisa — sendo que o Salário dele
            JÁ está marcado como receita fixa. São dois campos diferentes e o
            texto não distinguia:
              • a FLAG "é receita fixa" define a base das metas (o 100%) —
                está marcada, e é por isso que as metas por grupo funcionam;
              • "quanto espera receber por mês" (`esperadoMensal`) é o
                planejado de ENTRADA — é este que está vazio, e só ele afeta
                a linha "sobra planejada".

            BUILD 085 — o parágrafo saiu do corpo do card e passou a viver
            DENTRO do recolhível da legenda (`antes`), a pedido do Rafael:
            *"no planejamento esse conteúdo no card tbm deve ser recolhível,
            pra padronizar todas as telas"*. Não ganhou bloco próprio porque a
            regra da build 084 é clara — um card, um recolhível. Fechado, o
            card mostra só a linha "Legenda e observações". */}
        <Legenda
          familias={['meta']}
          testid="legenda-card-mes"
          rotulo={totalEntradas.planejado === 0 ? 'Legenda e observações' : 'Legenda'}
          antes={totalEntradas.planejado === 0 ? (
            <p className="texto-fraco texto-quebra" data-testid="aviso-esperado-mensal" style={{ margin: '0 0 8px', fontSize: 11.5 }}>
              Nenhuma categoria de receita tem “quanto espera receber por mês” preenchido — por isso a
              linha “planejada” só conta o que está previsto gastar. Esse campo é diferente da flag de
              receita fixa, que já está marcada e é o que forma a base das metas ({fmt(baseMetaEmReais)}).
            </p>
          ) : undefined}
        />
      </div>

      {porGrupo.map(({ grupo, tipo: tipoGrupo, icone, iconeEstilo, iconeCor, itens, totalGrupo }) => {
        const grupoExpandido = grupoAberto === grupo
        const temMovimentoNoGrupo = totalGrupo.planejado > 0 || totalGrupo.realizado > 0 || totalGrupo.previsto > 0

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

        /* UMA barra só por grupo — como sempre foi, e como o Rafael pediu
           de volta em 11/09/2026 ("não precisa ter tbm 2 barras separando
           gastos e entradas, faremos diferente").

           A build 038 tinha partido este cabeçalho em duas linhas (gastos ×
           entradas) porque um grupo podia misturar as duas coisas — o Salário
           morava dentro do "Fixo" e inflava a barra de gasto. A solução que
           ficou é outra e resolve na raiz: grupo agora tem TIPO (entrada ou
           saída) e só aceita categoria da natureza correspondente
           (`src/gruposUtil.ts`). Com o grupo homogêneo, somar tudo o que está
           dentro dele é exatamente a conta certa, e a cor vem do tipo do
           grupo — nunca mais de adivinhar pelo sinal do que caiu lá dentro. */
        const classeGrupo: Classe = tipoGrupo === 'entrada' ? 'entrada' : 'saida'

        function linhaCategoria({ cat, classe, totais }: (typeof itens)[number]) {
          const catExpandida = categoriaAberta === cat.id
          /* IDENTIFICAÇÃO VISUAL da receita fixa (13/09/2026, pedido dele):
             dentro do card de um grupo de RECEITA, dá para ver de relance
             quais categorias formam a base das metas — sem precisar abrir cada
             uma. É só marca: não marca nem desmarca no toque (a linha inteira
             já abre os lançamentos), e quem muda a flag é o lápis. */
          const ehBase = cat.natureza === 'Receita' && !!cat.receitaFixa
          return (
            <div
              key={cat.id}
              className={ehBase ? 'linha-cat-base-meta' : undefined}
              style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}
            >
              <div
                className={`linha-expansivel ${catExpandida ? 'expandida' : ''}`}
                onClick={() => alternarCategoria(cat.id!)}
              >
                <span className="seta-expandir">▶</span>
                {/* `min-width: 0` é o que impede o nome da categoria e o valor de
                    serem espremidos (e quebrarem em 3 linhas) quando entra o
                    lápis ao lado: sem isso, o conteúdo não pode encolher abaixo
                    do tamanho natural dele e o flex reparte o espaço errado. */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {linhaTotais(
                    cat.nome,
                    classe,
                    totais,
                    cat.icone !== 'nenhum' && (
                      <Icone id={cat.icone} estilo={cat.iconeEstilo} cor={cat.iconeCor} tamanho={tamanhoIconePx('categoria', pctCategoria)} />
                    ),
                    /* O lápis da CATEGORIA entra na linha de título da própria
                       barra (13/09/2026), no lugar da coluna que existia à
                       direita e espremia nome, valor e barra. */
                    <button
                      type="button"
                      className="acao-topo-barra"
                      aria-label={`Editar a categoria ${cat.nome}`}
                      data-testid={`editar-aceitavel-${cat.id}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditandoCategoria(cat)
                      }}
                    >
                      <PencilSquareIcon width={15} height={15} />
                    </button>,
                  )}
                  {cat.natureza === 'Receita' && (
                    <p className="selo-base-meta texto-quebra" data-testid={`base-meta-${cat.id}`}>
                      <span aria-hidden>{ehBase ? '☑' : '☐'}</span>{' '}
                      {ehBase ? 'Entra na base das metas' : 'Fora da base das metas'}
                    </p>
                  )}
                </div>
              </div>
              {catExpandida && (
                <div style={{ marginTop: 8 }}>
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
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Cabeçalho A1 (escolha do Rafael no protótipo de 13/09/2026):
                    quem MANDA no card é o percentual — ele é a decisão que a
                    pessoa toma sobre o grupo, e o valor em R$ é consequência
                    dele com a base do mês. Por isso o número grande à direita,
                    com o R$ embaixo em letra pequena, e a contagem de
                    categorias saiu da mesma linha do nome (era ela que roubava
                    o lugar de destaque). O total dos percentuais fica na faixa
                    do topo da tela, antes de qualquer card. */}
                <div className="cabecalho-grupo-a1 linha-cabecalho-grupo">
                  <div className="ident-grupo-a1">
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {icone !== 'nenhum' && (
                        <Icone id={icone} estilo={iconeEstilo} cor={iconeCor} tamanho={tamanhoIconePx('grupo', pctGrupo)} />
                      )}
                      <span className="texto-quebra">{grupo}</span>
                    </strong>
                    <span className="texto-fraco" style={{ fontSize: 11.5 }}>{itens.length} categoria(s)</span>
                  </div>
                  {percentualDoGrupo(grupo) > 0 && (
                    <div className="pct-grupo-a1">
                      <span className="numero" data-testid={`pct-card-${grupo}`}>
                        {Number(percentualDoGrupo(grupo).toFixed(2))}%
                        {/* O PERCENTUAL RESULTANTE, entre parênteses ao lado do
                            percentual do plano (build 086): quanto o grupo
                            excedeu ou ainda tem de folga EM RELAÇÃO AO
                            REALIZADO. O percentual grande é a decisão (quanto
                            do 100% este grupo leva); este é o resultado dela
                            neste mês. Sem realizado não há "em relação a quê",
                            então ele some — nunca divide por zero. */}
                        {(() => {
                          const realizadoGrupo = totalGrupo.realizado + totalGrupo.previsto
                          const metaGrupo = metaEmReaisDoGrupo(grupo)
                          if (metaGrupo <= 0 || realizadoGrupo <= 0.005) return null
                          const delta = ((metaGrupo - realizadoGrupo) / realizadoGrupo) * 100
                          if (Math.abs(delta) < 0.5) return null
                          const sobra = delta > 0
                          return (
                            <span
                              className={`pct-grupo-delta ${sobra ? 'valor-pos' : 'valor-neg'}`}
                              data-testid={`pct-delta-${grupo}`}
                            >
                              {' '}({sobra ? '↑' : '↓'} {Math.abs(delta).toFixed(0)}%)
                            </span>
                          )
                        })()}
                      </span>
                      <span className="texto-fraco">{fmt(metaEmReaisDoGrupo(grupo))}</span>
                    </div>
                  )}
                  {/* O lápis do GRUPO mora AQUI, no cabeçalho do card, ao lado
                      do percentual — não numa coluna própria à direita de tudo
                      (13/09/2026: "você esmagou a barra e todos os dados do
                      lado... coloca esse ícone em outro lugar, que ele fique
                      visível mas sem sacrificar tudo"). A barra abaixo voltou à
                      largura inteira do card. */}
                  <button
                    type="button"
                    className="acao-topo-barra acao-editar-grupo"
                    aria-label={`Editar o grupo ${grupo}`}
                    data-testid={`editar-meta-${grupo}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      const g = grupos.find((x) => x.nome === grupo)
                      if (g) setEditandoGrupo(g)
                    }}
                  >
                    <PencilSquareIcon width={17} height={17} />
                  </button>
                </div>
                {/* Barra de verdade em vez de só texto (30/08/2026) — reusa a
                    mesma linhaTotais() do nível Geral/Categoria. */}
                {temMovimentoNoGrupo && (
                  <div className="total-geral" style={{ marginTop: 8 }}>
                    {/* Item 8 da lista de 12/09/2026. Até aqui a barra do grupo
                        usava a SOMA DAS METAS DAS CATEGORIAS (de baixo pra
                        cima) enquanto o donut usava a META DO GRUPO — dois
                        números diferentes para a mesma coisa, na mesma tela.
                        A rodada anterior propôs só rotular os dois; ele
                        recusou, e com razão: o card tem que bater com o
                        gráfico. Agora a barra é X de Y sobre a META DO GRUPO,
                        e a diferença entre essa meta e a soma das metas de
                        categoria virou uma linha PRÓPRIA logo abaixo, em
                        verde (sobra) ou vermelho (falta) — o mesmo aviso que
                        a tela de Metas de Grupo já dá, agora aqui também.
                        Assim o real × previsto da meta do grupo e o
                        fechamento das categorias ficam separados e nítidos. */}
                    {/* "Total", não "Total do grupo": o nome do grupo está logo
                        acima, no cabeçalho do card, e o rótulo longo era cortado
                        depois que o botão de editar entrou na linha. */}
                    {linhaTotais(
                      'Total',
                      classeGrupo,
                      classeGrupo === 'saida' && metaEmReaisDoGrupo(grupo) > 0
                        ? { ...totalGrupo, planejado: metaEmReaisDoGrupo(grupo) }
                        : totalGrupo,
                    )}
                    {classeGrupo === 'saida' && metaEmReaisDoGrupo(grupo) > 0 && (
                      (() => {
                        const metaGrupo = metaEmReaisDoGrupo(grupo)
                        const somaCategorias = totalGrupo.planejado
                        const diferenca = metaGrupo - somaCategorias
                        /* Curto de propósito (13/09/2026): esta é a linha que
                           cumpre a função da tela ("esse planejamento não está
                           regular, não está batendo, tem que fazer ajuste"),
                           então ela fica — mas em uma linha, não em duas
                           frases. Quando fecha, some: silêncio é a resposta
                           certa pra "está tudo certo". */
                        if (Math.abs(diferenca) < 1) return null
                        return (
                          <p style={{ margin: '4px 0 0', fontSize: 11.5 }} className="texto-fraco texto-quebra">
                            Categorias somam {fmt(somaCategorias)} —{' '}
                            {diferenca > 0 ? (
                              <span className="valor-pos">sobram {fmt(diferenca)} por distribuir</span>
                            ) : (
                              <span className="valor-neg">excedem em {fmt(-diferenca)}</span>
                            )}
                          </p>
                        )
                      })()
                    )}
                  </div>
                )}
              </div>
            </div>

            {grupoExpandido && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--borda)', paddingTop: 8 }}>
                {/* As categorias COM meta não levam mais rótulo de seção: é o
                    caso normal, e o normal não precisa de título (13/09/2026).
                    Só o que foge dele é anunciado — e em uma linha. */}
                {comOrcamento.length > 0 && (
                  <div style={{ borderLeft: '3px solid var(--azul)', paddingLeft: 10 }}>
                    {comOrcamento.map(linhaCategoria)}
                  </div>
                )}

                {semOrcamentoComMovimento.length > 0 && (
                  <>
                    <p
                      className="texto-fraco"
                      style={{ margin: '12px 0 0', fontSize: 11, color: 'var(--amarelo)' }}
                    >
                      Gasto sem meta
                    </p>
                    <div style={{ borderLeft: '3px solid var(--amarelo)', paddingLeft: 10 }}>
                      {semOrcamentoComMovimento.map(linhaCategoria)}
                    </div>
                  </>
                )}

                {semOrcamentoSemMovimento.length > 0 && (
                  <div style={{ marginTop: 12 }}>
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
                      Sem meta e sem movimento ({semOrcamentoSemMovimento.length})
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
            {/* A legenda fica FORA da `.linha-expansivel` do cabeçalho: dentro
                dela, tocar em "Legenda" também abriria/fecharia o grupo. */}
            {temMovimentoNoGrupo && (
              <Legenda familias={['meta']} testid={`legenda-grupo-${grupo}`} />
            )}
          </div>
        )
      })}

      </>
      )}

      {/* Botão flutuante presente em toda tela principal (31/08/2026, mesmo dia). */}
      <button type="button" className="botao-flutuante" onClick={() => aoAbrirLancamento()} aria-label="Novo lançamento">
        +
      </button>
      {editandoCategoria && (
        <PopupAceitavelCategoria categoria={editandoCategoria} baseEmReais={baseMetaEmReais} onFechar={() => setEditandoCategoria(null)} />
      )}
      {editandoGrupo && (
        <PopupMetaGrupo
          grupo={editandoGrupo}
          percentualAtual={metas?.find((m) => m.grupo === editandoGrupo.nome)?.percentual ?? 0}
          aoAbrirCalibragem={aoAbrirCalibragem ? () => { setEditandoGrupo(null); aoAbrirCalibragem() } : undefined}
          baseEmReais={baseMetaEmReais}
          mesVigencia={mes.replace('-', '')}
          onFechar={() => setEditandoGrupo(null)}
        />
      )}
    </>
  )
}
