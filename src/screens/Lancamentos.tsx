import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type Lancamento } from '../db'
import type { TelaProps } from '../mes'
import SeletorMes from '../components/SeletorMes'
import EdicaoEmMassa from '../components/EdicaoEmMassa'
import GrupoReordenavel from '../components/GrupoReordenavel'
import { compararDentroDoDia } from '../lancamentosUtil'
import { CampoBusca, FolhaFiltros, FILTROS_VAZIOS, aplicarFiltros, contarFiltrosAtivos, type FiltrosAvancados } from '../components/BuscaEFiltros'
import { formatarCabecalhoData } from '../formatoData'
import { fmtBRL } from '../formatoMoeda'
import { statusDoLancamento } from '../statusPagamento'
import { useHojeSimuladoISO } from '../hojeSimulado'
import TituloTelaN1 from '../kit/CabecalhoN1'
import { ExportSheet, type ExportRow } from '../kit/ExportSheet'
import { lerDoAmbiente } from '../ambiente'
import {
  useSelecao, BarraSelecao, TotaisEntradaSaida, blocosPorCorte, RodapeTotais,
} from '../components/SelecaoETotais'

// Tela "Lançamentos" (antes "Lançar") — 30/08/2026: lista-primeiro, agrupada
// por data (sessão), em vez de formulário-primeiro. Obedece as mesmas setas
// de mês do Resumo/Situação, com o mesmo limite de navegação. Incluir é uma
// ação explícita (botão flutuante), e clicar num item sempre abre o detalhe
// já em modo de edição — funciona igual em mobile e web. Arrastar pra
// excluir é só um atalho a mais no mobile, nunca a única forma de agir.
//
// 31/08/2026, rodada seguinte: item da lista virou o modelo COMPLETO de duas
// linhas (ícone + descrição/origem + valor/tarja — ver LinhaLancamentoCompleta),
// sem coluna de data (a sessão já é o agrupador). Ganhou busca + filtros
// avançados no topo (ver BuscaEFiltros) — pontos 1, 8, 9 e 10 do feedback.
export default function Lancamentos({ mes, aoMudarMes, aoAbrirLancamento }: TelaProps) {
  // Item 6 da lista pendente (15/09/2026): filtro por período (data de/até),
  // alternável clicando no nome do mês — clicar de novo volta pro mês e limpa
  // os filtros. Só existe nesta tela (pedido explícito); as outras telas de
  // mês continuam com `SeletorMes` do jeito de sempre.
  const [modoPeriodo, setModoPeriodo] = useState(false)
  const [periodoDe, setPeriodoDe] = useState(`${mes}-01`)
  const [periodoAte, setPeriodoAte] = useState(`${mes}-31`)
  const lancamentosDoMes = useLiveQuery(
    () =>
      modoPeriodo
        ? lerDoAmbiente(db.lancamentos.where('dataCompetencia').between(periodoDe, periodoAte, true, true).toArray())
        : lerDoAmbiente(db.lancamentos.where('dataCompetencia').startsWith(mes).toArray()),
    [mes, modoPeriodo, periodoDe, periodoAte],
  )
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.orderBy('nome').toArray()), [])
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.orderBy('nome').toArray()), [])
  // Só pra forçar re-render quando a data simulada mudar (05/09/2026, Etapa
  // 7 — Ferramentas de teste): esta tela não tinha motivo prévio pra se
  // inscrever em `db.configuracoes`, mas `statusDoLancamento` abaixo lê
  // `hojeEfetivoISO()` a cada chamada — sem essa inscrição, o "Atrasado"
  // de cada linha só atualizaria na tela depois de algum outro motivo de
  // re-render (ex.: trocar de mês).
  useHojeSimuladoISO()
  const [ordemDesc, setOrdemDesc] = useState(true)
  const [busca, setBusca] = useState('')
  const [buscaAberta, setBuscaAberta] = useState(false)
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  /* Edição em massa (14/09/2026) — ver `EdicaoEmMassa.tsx`. */
  const [massaAberta, setMassaAberta] = useState(false)
  const [filtros, setFiltros] = useState<FiltrosAvancados>(FILTROS_VAZIOS)
  /* G44 regra 11b — hook ANTES do guard de carregamento logo abaixo. Ficou
     depois dele na 1ª versão e derrubou a tela inteira (React #310, "mais
     hooks que no render anterior"): a tela renderiza uma vez com os dados
     ainda vindo do Dexie (sai pelo `return null`, sem passar por este
     useState) e outra com eles prontos. Achado no Playwright, não na
     leitura do código. */
  const [exportOpen, setExportOpen] = useState(false)
  /* Seleção múltipla (10/09/2026) — hook também ANTES do guard, pelo mesmo
     motivo do `exportOpen` logo acima (React #310). */
  const selecao = useSelecao((lancamentosDoMes ?? []).map((l) => l.id!).filter(Boolean))

  if (!lancamentosDoMes || !categorias || !contas || !grupos) return null

  const categoriaPorId = new Map(categorias.map((c) => [c.id!, c]))
  const contaPorId = new Map(contas.map((c) => [c.id!, c]))

  const filtrados = aplicarFiltros(lancamentosDoMes, busca, filtros, categoriaPorId, contaPorId)
  const linhasExport: ExportRow[] = filtrados.map((l) => ({
    data: l.dataCompetencia,
    descricao: l.descricao,
    categoria: categoriaPorId.get(l.categoriaId)?.nome ?? '—',
    conta: l.contaId ? (contaPorId.get(l.contaId)?.nome ?? '—') : '—',
    valor: fmtBRL(l.valor),
    situacao: statusDoLancamento(l),
    recorrencia: l.recorrencia ?? 'único',
    descricaoOriginal: l.descricaoOriginal ?? '',
  }))
  // Item 12 (15/09/2026): a ordenação asc/desc troca a ordem dos DIAS, nunca
  // a ordem DENTRO de um dia — essa é sempre `ordemManual` (arrasto) quando
  // existe, senão a ordem de criação (`compararDentroDoDia`). Ver
  // `GrupoReordenavel.tsx`.
  const ordenados = [...filtrados].sort((a, b) => {
    const porData = ordemDesc
      ? b.dataCompetencia.localeCompare(a.dataCompetencia)
      : a.dataCompetencia.localeCompare(b.dataCompetencia)
    return porData !== 0 ? porData : compararDentroDoDia(a, b)
  })

  // Agrupa em sessões por data, mantendo a ordem já escolhida.
  function agrupar(itens: Lancamento[]) {
    const out: { data: string; itens: Lancamento[] }[] = []
    for (const l of itens) {
      const ultima = out[out.length - 1]
      if (ultima && ultima.data === l.dataCompetencia) ultima.itens.push(l)
      else out.push({ data: l.dataCompetencia, itens: [l] })
    }
    return out
  }

  /* Corte "até Hoje" × "dias futuros" (10/09/2026) — só existe quando de fato
     há registro futuro na lista; num mês passado inteiro, a lista continua
     exatamente como sempre foi, num bloco só. A ORDEM DOS BLOCOS segue a
     ordenação escolhida (11/09/2026) — ver `blocosPorCorte`. */
  const blocos = blocosPorCorte(ordenados, ordemDesc).map((b) => ({ ...b, sessoes: agrupar(b.itens) }))

  return (
    <>
      <div className="cabecalho-fixo">
        {/* 10/09/2026, pedido do Rafael: Selecionar · Buscar · Filtro viraram
            ÍCONES nesta mesma fileira, à esquerda do Exportar; a ordenação foi
            pra dentro da folha de filtros; e a contagem de registros só
            aparece com a seleção ativa. O campo de busca e a linha de
            contagem/ordem que ficavam aqui deixaram de existir como barra
            fixa — nada sumiu de função, só de lugar. */}
        <TituloTelaN1
          titulo="Lançamentos"
          onExportar={() => setExportOpen(true)}
          acoesLista={{
            onSelecionar: () => (selecao.ativa ? selecao.sair() : selecao.ativar()),
            selecaoAtiva: selecao.ativa,
            onBuscar: () => setBuscaAberta((v) => !v),
            buscaAtiva: busca !== '',
            onFiltrar: () => setFiltrosAbertos(true),
            filtrosAtivos: contarFiltrosAtivos(filtros),
          }}
        />
        {modoPeriodo ? (
          <div className="periodo-filtro" data-testid="periodo-filtro">
            <input
              type="date"
              value={periodoDe}
              onChange={(e) => setPeriodoDe(e.target.value)}
              aria-label="De"
              data-testid="periodo-de"
            />
            <span className="texto-fraco">até</span>
            <input
              type="date"
              value={periodoAte}
              onChange={(e) => setPeriodoAte(e.target.value)}
              aria-label="Até"
              data-testid="periodo-ate"
            />
            <button
              type="button"
              className="secundario"
              data-testid="voltar-modo-mes"
              onClick={() => {
                setModoPeriodo(false)
                setFiltros(FILTROS_VAZIOS)
                setBusca('')
              }}
            >
              ‹ Voltar ao mês
            </button>
          </div>
        ) : (
          <SeletorMes
            mes={mes}
            onMudar={aoMudarMes}
            aoClicarNome={() => {
              setPeriodoDe(`${mes}-01`)
              setPeriodoAte(`${mes}-31`)
              setModoPeriodo(true)
            }}
          />
        )}
        {(buscaAberta || busca !== '') && (
          <CampoBusca busca={busca} onBuscaChange={setBusca} onFechar={() => setBuscaAberta(false)} />
        )}
        {selecao.ativa && (
          <div className="linha" style={{ border: 'none', padding: '0', alignItems: 'flex-start', gap: 8 }}>
            <BarraSelecao selecao={selecao} total={filtrados.length} onAlterar={() => setMassaAberta(true)} />
          </div>
        )}
      </div>
      {filtrosAbertos && (
        <FolhaFiltros
          filtros={filtros}
          categorias={categorias}
          grupos={grupos}
          contas={contas}
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
            // Aplicou de verdade: a seleção perdeu o sentido (e parte dela pode
            // até ter virado outra coisa, no caso do parcelamento).
            if (r) selecao.sair()
          }}
        />
      )}
      {/* G44 regra 11b: exporta exatamente o que está na tela — ou seja, o
          mês selecionado JÁ com a busca e os filtros aplicados (`filtrados`),
          nunca a tabela inteira. É a promessa que a própria folha faz. */}
      {exportOpen && <ExportSheet title="Lançamentos" filenameBase={`morfofinp-lancamentos-${mes}`}
        screenColumns={[
          { key: 'data', label: 'Data' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'valor', label: 'Valor' },
          { key: 'situacao', label: 'Situação' },
        ]}
        screenRows={linhasExport}
        detailColumns={[
          { key: 'data', label: 'Data' },
          { key: 'descricao', label: 'Descrição' },
          { key: 'categoria', label: 'Categoria' },
          { key: 'conta', label: 'Pago com' },
          { key: 'valor', label: 'Valor' },
          { key: 'situacao', label: 'Situação' },
          { key: 'recorrencia', label: 'Recorrência' },
          { key: 'descricaoOriginal', label: 'Descrição original' },
        ]}
        detailRows={linhasExport}
        onClose={() => setExportOpen(false)} />}

      {/* Com a seleção ATIVA o totalizador do rodapé é o da seleção; sem
          seleção, a lista se parte em "Até hoje" × "Dias futuros" e cada
          bloco carrega o SEU totalizador (pedido do Rafael, 10/09/2026). */}
      <div className="cartao" style={{ padding: '0 12px' }}>
        {ordenados.length === 0 && (
          <p className="texto-fraco" style={{ padding: '14px 4px' }}>
            Nenhum lançamento encontrado.
          </p>
        )}
        {selecao.ativa
          ? blocos.map((b) => (
              <SessoesDeData
                key={b.chave}
                sessoes={b.sessoes}
                categoriaPorId={categoriaPorId}
                contaPorId={contaPorId}
                aoAbrirLancamento={aoAbrirLancamento}
                selecao={selecao}
              />
            ))
          : blocos.map((b) => (
              <div key={b.chave}>
                {blocos.length > 1 && <div className="bloco-corte-titulo">{b.titulo}</div>}
                <SessoesDeData
                  sessoes={b.sessoes}
                  categoriaPorId={categoriaPorId}
                  contaPorId={contaPorId}
                  aoAbrirLancamento={aoAbrirLancamento}
                  selecao={selecao}
                />
                {/* Só quando a lista está PARTIDA em dois blocos: aí cada um
                    precisa do seu total. Com um bloco só, o total é o do
                    rodapé fixo logo abaixo — não se repete. */}
                {blocos.length > 1 && (
                  <div style={{ padding: '8px 0 12px' }}>
                    <TotaisEntradaSaida itens={b.itens} rotulo={b.titulo} />
                  </div>
                )}
              </div>
            ))}
      </div>

      {/* Rodapé fixo com o total (pedido do Rafael): antes este card ficava no
          FIM da lista e só aparecia depois de rolar tudo. Agora é
          `position: sticky; bottom: 0` — acompanha a rolagem. Com a seleção
          ativa, mostra o total do que está marcado. */}
      {ordenados.length > 0 && (
        <RodapeTotais>
          <TotaisEntradaSaida
            recolhivel
            destaque={selecao.ativa}
            rotulo={selecao.ativa ? `Selecionados (${selecao.qtd})` : 'Total da lista'}
            itens={selecao.ativa ? filtrados.filter((l) => selecao.marcados.has(l.id!)) : ordenados}
          />
        </RodapeTotais>
      )}

      <button
        type="button"
        className="botao-flutuante"
        aria-label="Novo lançamento"
        onClick={() => aoAbrirLancamento()}
        // data-tour (05/09/2026, Etapa 6 — Tour guiado): ver
        // `src/kit/GuidedTour.tsx`/`TOUR_STEPS_N1`.
        data-tour="lancamentos-incluir"
      >
        +
      </button>
    </>
  )
}

/* As sessões por data de UM bloco. Extraído porque a lista agora é
   renderizada em até dois blocos (até hoje × dias futuros) e repetir o mapa
   inteiro nos dois lugares seria cópia de código. */
function SessoesDeData({ sessoes, categoriaPorId, contaPorId, aoAbrirLancamento, selecao }: {
  sessoes: { data: string; itens: Lancamento[] }[]
  categoriaPorId: Map<number, Categoria>
  contaPorId: Map<number, { nome: string }>
  aoAbrirLancamento: (o?: { id?: number }) => void
  selecao: ReturnType<typeof useSelecao>
}) {
  return (
    <>
      {sessoes.map((sessao) => (
        <div key={sessao.data}>
          <div className="sessao-data">{formatarCabecalhoData(sessao.data)}</div>
          {/* Item 12 (15/09/2026): um `GrupoReordenavel` por DIA — o arrasto de
              reordenar nunca cruza pra outro dia, porque cada dia é a própria
              instância do componente, com a própria lista de ids. */}
          <GrupoReordenavel
            itens={sessao.itens}
            categoriaPorId={categoriaPorId}
            contaPorId={contaPorId}
            aoAbrirLancamento={aoAbrirLancamento}
            selecao={selecao}
          />
        </div>
      ))}
    </>
  )
}

// O item de lista em si (arrastar-pra-agir + Duplicar/Editar/Excluir) virou
// componente compartilhado (15/09/2026, item 11) — ver
// `src/components/ItemLancamentoAcoes.tsx`, usado também no drill-in de
// Carteira.tsx.
