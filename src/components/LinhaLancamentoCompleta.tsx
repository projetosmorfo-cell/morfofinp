import { type Categoria, type Lancamento } from '../db'
import { statusDoLancamento, ROTULO_STATUS, CLASSE_STATUS, FUNDO_STATUS } from '../statusPagamento'
import { alternarPago } from '../lancamentosUtil'
import { Icone } from '../icones'
import { fmtBRL } from '../formatoMoeda'
import { useConfiguracaoIcones, tamanhoIconePx } from '../configuracaoIcones'

// Linha da listagem COMPLETA (31/08/2026, rodada seguinte) — o modelo de
// duas linhas usado em Lançamentos e no drill-in de Carteira (ver pontos 1,
// 5, 8 e 9 do feedback do Rafael): ícone da categoria centralizado à
// esquerda; bloco de texto com a descrição em cima e a ORIGEM (conta) embaixo
// (nunca mais o nome da categoria — o ícone já cumpre esse papel); bloco de
// valor + tarja de status agrupados e alinhados à direita. Sem coluna de
// data — o item já vive dentro de uma sessão agrupada por data (o cabeçalho
// já é a data), repeti-la em cada linha era redundante.
export default function LinhaLancamentoCompleta({
  lancamento,
  categoria,
  origemLabel,
  onAbrir,
}: {
  lancamento: Lancamento
  categoria?: Categoria
  origemLabel?: string
  onAbrir: () => void
}) {
  const status = statusDoLancamento(lancamento)
  const { pctCompleta } = useConfiguracaoIcones()
  return (
    <div className={`linha-lancamento-completa ${FUNDO_STATUS[status]}`} onClick={onAbrir}>
      {categoria?.icone !== 'nenhum' && (
        <span className="llc-icone">
          <Icone
            id={categoria?.icone}
            estilo={categoria?.iconeEstilo}
            cor={categoria?.iconeCor}
            tamanho={tamanhoIconePx('completa', pctCompleta)}
          />
        </span>
      )}
      <span className="llc-texto">
        <div className="llc-titulo">
          {lancamento.descricao}
          {lancamento.recorrencia === 'parcelado' && ` (${lancamento.parcelaI}/${lancamento.parcelaN})`}
          {lancamento.recorrencia === 'fixo' && ' (fixo)'}
          {lancamento.transferenciaId && ' (transferência)'}
        </div>
        {origemLabel && <div className="llc-origem">{origemLabel}</div>}
      </span>
      <span className="llc-valores">
        <span className={`lci-valor ${lancamento.valor < 0 ? 'valor-neg' : 'valor-pos'}`}>
          {lancamento.valor < 0 ? '-' : '+'}
          {fmtBRL(lancamento.valor)}
        </span>
        <span
          className={`status-pill ${CLASSE_STATUS[status]}`}
          onClick={(e) => {
            e.stopPropagation()
            alternarPago(lancamento)
          }}
        >
          {ROTULO_STATUS[status]}
        </span>
      </span>
    </div>
  )
}
