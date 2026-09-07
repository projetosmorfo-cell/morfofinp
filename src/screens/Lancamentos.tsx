import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type Lancamento } from '../db'
import type { TelaProps } from '../mes'
import SeletorMes from '../components/SeletorMes'
import LinhaLancamentoCompleta from '../components/LinhaLancamentoCompleta'
import BarraBuscaFiltros, { FILTROS_VAZIOS, aplicarFiltros, type FiltrosAvancados } from '../components/BuscaEFiltros'
import { formatarCabecalhoData } from '../formatoData'
import { statusDoLancamento, FUNDO_STATUS } from '../statusPagamento'
import { useHojeSimuladoISO } from '../hojeSimulado'

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
  const [filtros, setFiltros] = useState<FiltrosAvancados>(FILTROS_VAZIOS)

  if (!lancamentosDoMes || !categorias || !contas) return null

  const categoriaPorId = new Map(categorias.map((c) => [c.id!, c]))
  const contaPorId = new Map(contas.map((c) => [c.id!, c]))

  const filtrados = aplicarFiltros(lancamentosDoMes, busca, filtros, categoriaPorId, contaPorId)
  const ordenados = [...filtrados].sort((a, b) =>
    ordemDesc ? b.dataCompetencia.localeCompare(a.dataCompetencia) : a.dataCompetencia.localeCompare(b.dataCompetencia),
  )

  // Agrupa em sessões por data, mantendo a ordem já escolhida.
  const sessoes: { data: string; itens: Lancamento[] }[] = []
  for (const l of ordenados) {
    const ultima = sessoes[sessoes.length - 1]
    if (ultima && ultima.data === l.dataCompetencia) ultima.itens.push(l)
    else sessoes.push({ data: l.dataCompetencia, itens: [l] })
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <h1>Lançamentos</h1>
        <SeletorMes mes={mes} onMudar={aoMudarMes} />
      </div>

      <BarraBuscaFiltros
        busca={busca}
        onBuscaChange={setBusca}
        filtros={filtros}
        onFiltrosChange={setFiltros}
        categorias={categorias}
        contas={contas}
      />

      <div className="linha" style={{ border: 'none', padding: '0 0 8px' }}>
        <span className="texto-fraco">
          {filtrados.length} lançamento(s){filtrados.length !== lancamentosDoMes.length ? ` de ${lancamentosDoMes.length}` : ''}
        </span>
        <button type="button" className="botao-ordem" onClick={() => setOrdemDesc((v) => !v)}>
          {ordemDesc ? 'Mais recente ↓' : 'Mais antigo ↑'}
        </button>
      </div>

      <div className="cartao" style={{ padding: '0 12px' }}>
        {ordenados.length === 0 && (
          <p className="texto-fraco" style={{ padding: '14px 4px' }}>
            Nenhum lançamento encontrado.
          </p>
        )}
        {sessoes.map((sessao) => (
          <div key={sessao.data}>
            <div className="sessao-data">{formatarCabecalhoData(sessao.data)}</div>
            {sessao.itens.map((l) => (
              <ItemLancamento
                key={l.id}
                lancamento={l}
                categoria={categoriaPorId.get(l.categoriaId)}
                contaNome={contaPorId.get(l.contaId)?.nome}
                onAbrir={() => aoAbrirLancamento({ id: l.id })}
                onExcluir={() => db.lancamentos.delete(l.id!)}
              />
            ))}
          </div>
        ))}
      </div>

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
