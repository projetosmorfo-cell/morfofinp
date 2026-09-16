import { useState } from 'react'
import type { SeletorPeriodo } from './SeletorMes'

/* Filtro por PERÍODO (De/Até) das listas de lançamento — a peça compartilhada
   entre a tela de Lançamentos e o drill-in de conta da Carteira
   (16/09/2026, rodada seguinte à build 077).

   Por que existe: a build 077 entregou o popup de período só em
   `Lancamentos.tsx`, com o estado (`modoPeriodo`/`periodoDe`/`periodoAte`) e
   a montagem da prop `periodo` do `SeletorMes` escritos DENTRO da tela. O
   Rafael pediu o mesmo topo na Carteira; copiar aquele bloco pra lá seria
   exatamente o erro que este projeto já pagou caro várias vezes (duas telas
   com a mesma regra escrita duas vezes, que depois divergem). Então a regra
   saiu da tela e virou este hook: as duas telas usam a MESMA fonte, e quem
   mudar o comportamento do período muda num lugar só.

   O que o hook NÃO decide: como cada tela filtra os lançamentos com o
   período. Isso é diferente de propósito — Lançamentos consulta o Dexie por
   `dataCompetencia` entre De e Até; a Carteira já tem todo o histórico da
   conta em memória e recorta ali (e, no cartão, o período explícito
   substitui o ciclo de fatura). O que é comum é o ESTADO e o contrato com o
   `SeletorMes`, e é só isso que mora aqui. */
export function usePeriodoLista(
  mes: string,
  aoMudarMes: (mes: string) => void,
  /** Chamado quando a pessoa volta pro modo mês — cada tela limpa o que for
      dela (busca, filtros avançados). Opcional. */
  aoVoltarParaMes?: () => void,
) {
  const [modoPeriodo, setModoPeriodo] = useState(false)
  const [periodoDe, setPeriodoDe] = useState(`${mes}-01`)
  const [periodoAte, setPeriodoAte] = useState(`${mes}-31`)

  const propsSeletor: SeletorPeriodo = {
    ativo: modoPeriodo,
    de: periodoDe,
    ate: periodoAte,
    onAplicarPeriodo: (de, ate) => {
      setPeriodoDe(de)
      setPeriodoAte(ate)
      setModoPeriodo(true)
    },
    onEscolherMes: (novoMes) => {
      setModoPeriodo(false)
      aoVoltarParaMes?.()
      aoMudarMes(novoMes)
    },
  }

  return { modoPeriodo, periodoDe, periodoAte, propsSeletor }
}
