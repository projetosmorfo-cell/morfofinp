/* Folha de escolha GENÉRICA — a mesma folha com busca do cadastro de
   categorias (`.folha-escolha`, build 023), agora para qualquer lista curta
   de opções: qual fatura, periodicidade, regra do dia, dia da semana.

   Build 099 (18/09/2026), item V-06 do relatório de revisão da tela de
   lançamento (aprovado pelo Rafael): "treze <select> nativos contra o padrão
   da casa". A regra do projeto desde a build 023 é que `<select>` não mostra
   ícone nem respeita o tema (o menu que ele abre é do sistema operacional).
   Esta peça é o que substitui os que restavam — reusando as classes que já
   existem, nunca um segundo desenho de folha. */
import type { ReactNode } from 'react'

export interface OpcaoFolha<V extends string> {
  valor: V
  rotulo: string
  /** Linha secundária, menor (ex.: "fecha 09/out · vence 15/out"). */
  sub?: string
}

export default function FolhaOpcoes<V extends string>({
  titulo,
  opcoes,
  valor,
  onEscolher,
  onFechar,
  rodape,
  testid,
}: {
  titulo: string
  opcoes: OpcaoFolha<V>[]
  valor: V | ''
  onEscolher: (v: V) => void
  onFechar: () => void
  /** Conteúdo extra no fim da lista (uma explicação, por exemplo). */
  rodape?: ReactNode
  testid?: string
}) {
  return (
    <div className="folha-escolha" role="dialog" aria-label={titulo} data-testid={testid}>
      <div className="folha-escolha-fundo" onClick={onFechar} />
      <div className="folha-escolha-painel">
        <div className="folha-escolha-topo">
          <strong>{titulo}</strong>
          <button type="button" onClick={onFechar} aria-label="Fechar">✕</button>
        </div>
        <div className="folha-escolha-lista">
          {opcoes.map((o) => (
            <button
              key={o.valor}
              type="button"
              className={`folha-escolha-item ${o.valor === valor ? 'ativo' : ''}`}
              onClick={() => { onEscolher(o.valor); onFechar() }}
              data-testid={testid ? `${testid}-${o.valor}` : undefined}
            >
              <span className="folha-escolha-item-icone" aria-hidden="true">{o.valor === valor ? '●' : '○'}</span>
              <span className="folha-escolha-item-nome">
                {o.rotulo}
                {o.sub && <span className="folha-escolha-item-sub">{o.sub}</span>}
              </span>
            </button>
          ))}
          {rodape}
        </div>
      </div>
    </div>
  )
}
