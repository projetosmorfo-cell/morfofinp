// Barra de gasto × previsto (aceitável/meta), reutilizada no Resumo do Mês e
// na Situação. Mostra as duas coisas na mesma barra — preenchido = gasto
// real, marcador = o previsto — com cor diferente conforme estourou ou não,
// e um destaque em valor logo abaixo (falta / estourou / % usado).

// 01/09/2026: formatação de moeda unificada em `formatoMoeda.ts` (separador
// de milhar "." em toda exibição de valor do app) — reexportado aqui só
// pra não quebrar os imports existentes (`Situacao.tsx`/`Planejamento.tsx`
// importam `fmtBRL` daqui, apelidado de `fmt`). Precisa do import próprio
// também, já que um `export { x } from 'mod'` reencaminha `x` pra quem
// importa deste arquivo, mas não cria uma variável local `x` utilizável
// aqui dentro (achado ao rodar `tsc` de verdade pela primeira vez nesta
// sessão — ver nota no CLAUDE.md sobre o comando `tsc` correto do projeto).
import type { ReactNode } from 'react'
import { fmtBRL } from '../formatoMoeda'
export { fmtBRL }

export default function BarraMeta({
  gasto,
  previsto,
  rotulo,
  icone,
  mostrarDestaque = true,
}: {
  gasto: number
  previsto: number
  rotulo?: string
  // Ícone opcional antes do rótulo (01/09/2026, rodada seguinte) — usado nos
  // cabeçalhos de GRUPO (Situação "Por grupo", Resumo "Metas por grupo",
  // Planejamento) que até aqui não mostravam o ícone cadastrado do grupo em
  // lugar nenhum, apesar de já existir o campo — bug real apontado pelo
  // Rafael.
  icone?: ReactNode
  // Algumas barras (ex.: "Ainda posso gastar" na Situação) já mostram o valor
  // total de faltam/estourou em destaque fora do componente — nesses casos a
  // linha de destaque abaixo da barra ficaria repetindo a mesma informação.
  mostrarDestaque?: boolean
}) {
  const temPrevisto = previsto > 0
  const estourou = temPrevisto ? gasto > previsto : gasto > 0
  const escala = Math.max(gasto, previsto, 0.01)
  const preenchidoPct = Math.min(100, (gasto / escala) * 100)
  const marcadorPct = temPrevisto ? Math.min(100, (previsto / escala) * 100) : null
  const diferenca = previsto - gasto
  const pctUsado = temPrevisto ? (gasto / previsto) * 100 : null

  return (
    <div>
      {rotulo && (
        <div className={`linha ${icone ? 'linha-cabecalho-grupo' : ''}`} style={{ border: 'none', padding: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icone}
            {rotulo}
          </span>
          {/* Padrão: nunca dar destaque de cor aqui — o destaque em valor (faltam/
              estourou) fica só na linha abaixo, pra não competir com ela. */}
          <span className="texto-fraco">
            {fmtBRL(gasto)} de {temPrevisto ? fmtBRL(previsto) : 'sem orçamento'}
          </span>
        </div>
      )}
      <div className={`barra-meta ${estourou ? 'estourou' : ''}`}>
        <div className="fill" style={{ width: `${preenchidoPct}%` }} />
        {marcadorPct !== null && <div className="marcador" style={{ left: `${marcadorPct}%` }} />}
      </div>
      {mostrarDestaque && (
        <div className="linha-destaque">
          <span className="texto-fraco">{pctUsado !== null ? `${pctUsado.toFixed(0)}% do previsto usado` : 'sem orçamento definido'}</span>
          {temPrevisto && (
            <strong className={estourou ? 'valor-neg' : 'valor-pos'}>
              {/* "faltam" é ambíguo (parece dívida, não sobra) — "margem" deixa claro
                  que é folga dentro do teto, não dinheiro livre de verdade (não
                  desconta compromissos ainda não lançados neste mês). */}
              {estourou ? `estourou ${fmtBRL(diferenca)}` : `margem de ${fmtBRL(diferenca)}`}
            </strong>
          )}
          {!temPrevisto && gasto > 0 && <strong className="valor-neg">{fmtBRL(gasto)} sem meta</strong>}
        </div>
      )}
    </div>
  )
}
