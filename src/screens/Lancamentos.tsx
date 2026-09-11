import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type Lancamento } from '../db'
import type { TelaProps } from '../mes'
import SeletorMes from '../components/SeletorMes'
import LinhaLancamentoCompleta from '../components/LinhaLancamentoCompleta'
import { CampoBusca, FolhaFiltros, FILTROS_VAZIOS, aplicarFiltros, contarFiltrosAtivos, type FiltrosAvancados } from '../components/BuscaEFiltros'
import { formatarCabecalhoData } from '../formatoData'
import { fmtBRL } from '../formatoMoeda'
import { statusDoLancamento, FUNDO_STATUS } from '../statusPagamento'
import { useHojeSimuladoISO } from '../hojeSimulado'
import TituloTelaN1 from '../kit/CabecalhoN1'
import { ExportSheet, type ExportRow } from '../kit/ExportSheet'
import {
  useSelecao, BarraSelecao, TotaisEntradaSaida, MarcadorLinha, blocosPorCorte, RodapeTotais,
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
  const lancamentosDoMes = useLiveQuery(
    () => db.lancamentos.where('dataCompetencia').startsWith(mes).toArray(),
    [mes],
  )
  const categorias = useLiveQuery(() => db.categorias.orderBy('nome').toArray(), [])
  const contas = useLiveQuery(() => db.contas.toArray(), [])
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

  if (!lancamentosDoMes || !categorias || !contas) return null

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
  const ordenados = [...filtrados].sort((a, b) =>
    ordemDesc ? b.dataCompetencia.localeCompare(a.dataCompetencia) : a.dataCompetencia.localeCompare(b.dataCompetencia),
  )

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
        <SeletorMes mes={mes} onMudar={aoMudarMes} />
        {(buscaAberta || busca !== '') && (
          <CampoBusca busca={busca} onBuscaChange={setBusca} onFechar={() => setBuscaAberta(false)} />
        )}
        {selecao.ativa && (
          <div className="linha" style={{ border: 'none', padding: '0', alignItems: 'flex-start', gap: 8 }}>
            <BarraSelecao selecao={selecao} total={filtrados.length} />
          </div>
        )}
      </div>
      {filtrosAbertos && (
        <FolhaFiltros
          filtros={filtros}
          categorias={categorias}
          contas={contas}
          ordemDesc={ordemDesc}
          onFechar={() => setFiltrosAbertos(false)}
          onAplicar={(f, ordem) => { setFiltros(f); setOrdemDesc(ordem); setFiltrosAbertos(false) }}
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
          {sessao.itens.map((l) => (
            <div className="linha-selecionavel" key={l.id}>
              {selecao.ativa && (
                <MarcadorLinha marcado={selecao.estaMarcado(l.id!)} onAlternar={() => selecao.alternar(l.id!)} />
              )}
              <ItemLancamento
                lancamento={l}
                categoria={categoriaPorId.get(l.categoriaId)}
                contaNome={contaPorId.get(l.contaId)?.nome}
                onAbrir={() => (selecao.ativa ? selecao.alternar(l.id!) : aoAbrirLancamento({ id: l.id }))}
                onExcluir={() => db.lancamentos.delete(l.id!)}
              />
            </div>
          ))}
        </div>
      ))}
    </>
  )
}

// Item com clique = abrir detalhe (universal, web incluso) e arrastar pra
// esquerda no mobile = atalho de exclusão com duplo check (complementar,
// nunca obrigatório).
function ItemLancamento({
  lancamento,
  categoria,
  contaNome,
  onAbrir,
  onExcluir,
}: {
  lancamento: Lancamento
  categoria?: Categoria
  contaNome?: string
  onAbrir: () => void
  onExcluir: () => void
}) {
  const [arrastadoX, setArrastadoX] = useState(0)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const inicioX = useRef<number | null>(null)
  const arrastando = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    inicioX.current = e.touches[0].clientX
    arrastando.current = false
  }

  function onTouchMove(e: React.TouchEvent) {
    if (inicioX.current == null) return
    const delta = e.touches[0].clientX - inicioX.current
    if (Math.abs(delta) > 8) arrastando.current = true
    setArrastadoX(Math.max(-80, Math.min(0, delta)))
  }

  function onTouchEnd() {
    setArrastadoX(arrastadoX < -40 ? -80 : 0)
    inicioX.current = null
  }

  function onClickConteudo() {
    if (arrastando.current || arrastadoX !== 0) {
      setArrastadoX(0)
      arrastando.current = false
      return
    }
    onAbrir()
  }

  // Fundo do status "não pago" aplicado aqui (no wrapper que já vai de
  // borda a borda do cartão), não na `LinhaLancamentoCompleta` interna (que
  // ainda tem seu próprio padding de 12px) — assim o destaque preenche 100%
  // da largura visível da linha, não só o miolo (pedido do Rafael,
  // 31/08/2026, mesmo dia).
  const status = statusDoLancamento(lancamento)

  return (
    <div className="item-lancamento">
      <div className="item-lancamento-acao" onClick={() => setConfirmandoExclusao(true)} style={{ cursor: 'pointer' }}>
        Excluir
      </div>
      <div
        className={`item-lancamento-conteudo ${FUNDO_STATUS[status]}`}
        style={{ transform: `translateX(${arrastadoX}px)` }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <LinhaLancamentoCompleta
          lancamento={lancamento}
          categoria={categoria}
          origemLabel={contaNome}
          onAbrir={onClickConteudo}
        />
      </div>

      {confirmandoExclusao && (
        <div className="modal-fundo" onClick={() => setConfirmandoExclusao(false)} style={{ alignItems: 'center' }}>
          <div className="modal-conteudo" style={{ borderRadius: 16 }} onClick={(e) => e.stopPropagation()}>
            <p>Excluir "{lancamento.descricao}"? Essa ação não pode ser desfeita.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                style={{
                  marginTop: 0,
                  background: 'var(--vermelho)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px',
                  flex: 1,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  onExcluir()
                  setConfirmandoExclusao(false)
                }}
              >
                Confirmar exclusão
              </button>
              <button
                type="button"
                style={{
                  marginTop: 0,
                  background: 'none',
                  border: '1px solid var(--borda)',
                  borderRadius: 10,
                  padding: '12px',
                  flex: 1,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setConfirmandoExclusao(false)
                  setArrastadoX(0)
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
