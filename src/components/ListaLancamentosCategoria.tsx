import { type Categoria, type Lancamento } from '../db'
import { statusDoLancamento, ROTULO_STATUS, CLASSE_STATUS, FUNDO_STATUS } from '../statusPagamento'
import { alternarPago } from '../lancamentosUtil'
import { formatarCabecalhoData } from '../formatoData'
import { fmtBRL } from '../formatoMoeda'

// Listagem SIMPLES (linha única condensada) — aparece ao expandir a linha
// de uma categoria (Resumo do Mês/Situação/Planejamento — nunca na tela
// Categorias, que é cadastro, não um total pra explorar). Cada item é
// clicável e abre o mesmo modal de detalhe/edição usado em Lançamentos.
//
// Padronizada por completo em 31/08/2026 (rodada seguinte, ponto 2 do
// feedback): data vira agrupador/título de seção no topo (nunca mais
// repetida linha a linha); cada lançamento fica numa ÚNICA linha (sem a
// segunda linha de detalhes que o modelo antigo tinha); tarja de status do
// tamanho da palavra; coluna de valor alinhada verticalmente entre todas as
// linhas da lista.
//
// Reescrita pra `<table>` de verdade no mesmo dia, ainda nesta rodada —
// a versão anterior usava um grid com `display:contents` por linha, que
// causou um bug real (reportado com print pelo Rafael): duas linhas de
// lançamentos diferentes apareciam coladas numa única linha visual. Tabela
// garante que cada `<tr>` nunca se mistura com a vizinha, mantendo o mesmo
// alinhamento de coluna entre linhas — e espaçamento no mínimo, por pedido
// explícito dele.
//
// 01/09/2026, rodada seguinte (mesmo dia): ícone de categoria REMOVIDO desta
// listagem por pedido do Rafael — ícone passou a aparecer só na própria
// tela Categorias e na listagem Completa (Lançamentos/Carteira), nunca mais
// aqui. `categoriaPorId` continua recebido (ainda pode vir a ser útil pra
// outra coisa), só não é mais usado pra ícone.
//
// 04/09/2026, rodada seguinte (F-02b da revisão de UI): a Carteira já tinha
// um "+" que pré-preenche `contaIdSugerida` ao abrir um lançamento novo de
// dentro de uma conta — esta listagem não tinha o equivalente pra categoria.
// `categoriaIdSugerida` (opcional — quem chama passa o id da categoria
// expandida) habilita o mesmo atalho aqui; o tipo de `aoAbrirLancamento`
// também precisou aceitar esse campo (já existia em `TelaProps`, só não
// estava refletido neste componente mais estreito).
export default function ListaLancamentosCategoria({
  lancamentos,
  categoriaPorId: _categoriaPorId,
  categoriaIdSugerida,
  aoAbrirLancamento,
}: {
  lancamentos: Lancamento[]
  categoriaPorId?: Map<number, Categoria>
  categoriaIdSugerida?: number
  aoAbrirLancamento: (opcoes?: { id?: number; categoriaIdSugerida?: number }) => void
}) {
  const botaoAdicionar = categoriaIdSugerida != null && (
    <button
      type="button"
      className="botao-add-lista-simples"
      onClick={() => aoAbrirLancamento({ categoriaIdSugerida })}
    >
      + Novo lançamento nesta categoria
    </button>
  )

  if (lancamentos.length === 0) {
    return (
      <div className="bloco-lista-simples">
        <p className="texto-fraco" style={{ padding: '8px 10px', margin: 0 }}>
          Nenhum lançamento neste mês.
        </p>
        {botaoAdicionar}
      </div>
    )
  }

  const ordenados = [...lancamentos].sort((a, b) => b.dataCompetencia.localeCompare(a.dataCompetencia))
  const sessoes: { data: string; itens: Lancamento[] }[] = []
  for (const l of ordenados) {
    const ultima = sessoes[sessoes.length - 1]
    if (ultima && ultima.data === l.dataCompetencia) ultima.itens.push(l)
    else sessoes.push({ data: l.dataCompetencia, itens: [l] })
  }

  return (
    <div className="bloco-lista-simples">
      {sessoes.map((sessao) => (
        <div key={sessao.data}>
          <div className="sessao-data-simples">{formatarCabecalhoData(sessao.data)}</div>
          <table className="tabela-lancamentos-simples">
            <tbody>
              {sessao.itens.map((l) => {
                const status = statusDoLancamento(l)
                return (
                  <tr
                    key={l.id}
                    className={FUNDO_STATUS[status] || undefined}
                    onClick={() => aoAbrirLancamento({ id: l.id })}
                  >
                    <td className="lls-titulo">
                      {l.descricao}
                      {l.recorrencia === 'parcelado' && ` (${l.parcelaI}/${l.parcelaN})`}
                      {l.recorrencia === 'fixo' && ' (fixo)'}
                      {l.transferenciaId && ' (transferência)'}
                    </td>
                    <td className="lci-valor">
                      {l.valor < 0 ? '-' : '+'}
                      {fmtBRL(l.valor)}
                    </td>
                    <td>
                      <span
                        className={`status-pill ${CLASSE_STATUS[status]}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          alternarPago(l)
                        }}
                      >
                        {ROTULO_STATUS[status]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
      {botaoAdicionar}
    </div>
  )
}
