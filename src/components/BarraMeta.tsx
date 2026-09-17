// Barra de gasto × previsto (aceitável/meta), reutilizada no Resumo do Mês e
// na Situação. Mostra as duas coisas na mesma barra — preenchido = gasto
// real, marcador = o previsto — com cor diferente conforme estourou ou não,
// e um destaque em valor logo abaixo (falta / estourou / % usado).

// 01/09/2026: formatação de moeda unificada em `formatoMoeda.ts` (separador
// de milhar "." em toda exibição de valor do app) — reexportado aqui só
// pra não quebrar os imports existentes (`Situacao.tsx`/`Planejamento.tsx`
// importam `fmtNum` daqui, apelidado de `fmt`). Precisa do import próprio
// também, já que um `export { x } from 'mod'` reencaminha `x` pra quem
// importa deste arquivo, mas não cria uma variável local `x` utilizável
// aqui dentro (achado ao rodar `tsc` de verdade pela primeira vez nesta
// sessão — ver nota no CLAUDE.md sobre o comando `tsc` correto do projeto).
import type { ReactNode } from 'react'
import { fmtNum, fmtNumSinalExplicito } from '../formatoMoeda'

export default function BarraMeta({
  gasto,
  previsto,
  rotulo,
  icone,
  acao,
  mostrarDestaque = true,
  comprometido = 0,
  resultado,
}: {
  gasto: number
  previsto: number
  rotulo?: string
  /* Item 10 (15/09/2026): a parcela de `gasto` que ainda não foi paga/
     recebida — já lançada, mas sem saída/entrada de dinheiro confirmada
     ("comprometido, ainda não realizado"). Pintada com o mesmo tom âmbar
     que `BarraIdeal`/a régua do Planejamento já usam pro mesmo conceito
     (`--ideal-ambar`) — antes esta barra só tinha uma cor sólida (azul/
     vermelho), sem distinguir o que já saiu de verdade do que só tem
     destino certo. Sempre um subconjunto de `gasto`, nunca somado a ele. */
  comprometido?: number
  // Ação opcional (hoje: o lápis de editar) DENTRO da linha de título da
  // barra, depois do valor — 13/09/2026. Antes o botão vivia numa coluna
  // própria ao lado da barra inteira, e era essa coluna que espremia o nome
  // e o valor ("você esmagou a barra e todos os dados do lado, e abriu um
  // espaço do lado direito pra colocar um único ícone de edição"). Aqui ele
  // ocupa só a altura do texto e a barra volta à largura inteira.
  acao?: ReactNode
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
  /* O VALOR RESULTANTE, com sinal, na frente da barra (build 086, pedido do
     Rafael para o Planejamento: "em todas as barras mostre o valor resultante
     na frente da barra, positivo ou negativo").
     Sempre por `fmtNumSinalExplicito` (que é `fmtNumComSinal` com o "+" escrito) —
     regra da build 061: onde o número aparece isolado, sem rótulo de sinal, a
     cor sozinha não informa, e aqui sobra e estouro convivem barra a barra.
     Fica na MESMA
     linha da barra, como já acontece em `BarraIdeal` (`.barra-ideal-valor`),
     e não no lugar da linha de destaque, que continua governada por
     `mostrarDestaque`. */
  resultado?: number
}) {
  const temPrevisto = previsto > 0
  const estourou = temPrevisto ? gasto > previsto : gasto > 0
  const escala = Math.max(gasto, previsto, 0.01)
  const comprometidoClamp = Math.max(0, Math.min(comprometido, gasto))
  const realizado = gasto - comprometidoClamp
  const realizadoPct = Math.min(100, (realizado / escala) * 100)
  const comprometidoPct = Math.min(100 - realizadoPct, (comprometidoClamp / escala) * 100)
  const marcadorPct = temPrevisto ? Math.min(100, (previsto / escala) * 100) : null
  const diferenca = previsto - gasto
  const pctUsado = temPrevisto ? (gasto / previsto) * 100 : null

  return (
    <div>
      {rotulo && (
        /* Item 7 da lista de 12/09/2026: o título e o "XX de XX" quebravam
           linha dentro do card (medido a 430px). `.linha-barra-topo` trava o
           valor numa linha só e deixa o rótulo encolher com reticências em
           vez de empurrar tudo pra baixo. */
        <div className={`linha linha-barra-topo ${icone ? 'linha-cabecalho-grupo' : ''}`} style={{ border: 'none', padding: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {icone}
            {rotulo}
          </span>
          {/* Padrão: nunca dar destaque de cor aqui — o destaque em valor (faltam/
              estourou) fica só na linha abaixo, pra não competir com ela. */}
          <span className="texto-fraco barra-topo-valor">
            {fmtNum(gasto)} de {temPrevisto ? fmtNum(previsto) : 'sem meta'}
          </span>
          {acao}
        </div>
      )}
      <div className="barra-meta-linha">
        <div className={`barra-meta ${estourou ? 'estourou' : ''}`}>
          <div className="fill" style={{ width: `${realizadoPct}%` }} />
          {comprometidoPct > 0 && (
            <div className="fill fill-comprometido" style={{ width: `${comprometidoPct}%` }} data-testid="barra-meta-comprometido" />
          )}
          {marcadorPct !== null && <div className="marcador" style={{ left: `${marcadorPct}%` }} />}
        </div>
        {resultado !== undefined && (
          <span
            className={`barra-meta-resultado ${resultado < 0 ? 'negativo' : 'positivo'}`}
            data-testid="barra-resultado"
          >
            {fmtNumSinalExplicito(resultado)}
          </span>
        )}
      </div>
      {mostrarDestaque && (
        <div className="linha-destaque">
          <span className="texto-fraco">{pctUsado !== null ? `${pctUsado.toFixed(0)}% do previsto usado` : 'sem orçamento definido'}</span>
          {temPrevisto && (
            <strong className={estourou ? 'valor-neg' : 'valor-pos'}>
              {/* "faltam" é ambíguo (parece dívida, não sobra) — "margem" deixa claro
                  que é folga dentro do teto, não dinheiro livre de verdade (não
                  desconta compromissos ainda não lançados neste mês). */}
              {estourou ? `estourou ${fmtNum(diferenca)}` : `margem de ${fmtNum(diferenca)}`}
            </strong>
          )}
          {!temPrevisto && gasto > 0 && <strong className="valor-neg">{fmtNum(gasto)} sem meta</strong>}
        </div>
      )}
    </div>
  )
}
