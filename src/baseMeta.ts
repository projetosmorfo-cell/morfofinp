/* Base de cálculo das metas — fonte ÚNICA (12/09/2026, pedido do Rafael).

   O que ele pediu, literal: a previsão tem que "pegar a soma das categorias
   marcadas com a flag de fixo" e ser "do mês atual e não do anterior".

   Por que isso precisou virar um módulo em vez de uma linha em cada tela: até
   aqui existiam TRÊS contas diferentes para o mesmo número, escritas em
   momentos diferentes e nunca comparadas entre si —

     • Resumo do mês  → salário do MÊS ATUAL   (categoria de nome "Salário")
     • Planejamento   → salário do MÊS ANTERIOR (mesma categoria)
     • Categorias     → salário do MÊS ANTERIOR (tabela de exemplo)

   ou seja, o card "Metas por grupo" do Resumo e o donut do Planejamento já
   mostravam metas com bases diferentes no mesmo mês, e ninguém tinha notado.
   Achado ao implementar este pedido; a correção do mês resolve a divergência
   junto, porque agora as três leem daqui.

   Duas mudanças de regra, as duas pedidas por ele:

   1. QUEM entra na base: não é mais a categoria de NOME "Salário" (hardcode
      que quebra no dia em que alguém renomeia a categoria ou tem duas fontes
      de renda fixa), e sim toda categoria de natureza Receita marcada com a
      flag `receitaFixa`. `Salário` nasce marcada, então o número não muda em
      nenhuma instalação que exista hoje.

   2. QUAL mês: o mês que está na tela, nunca o anterior.

   DECISÃO registrada — recebido + previsto, não só recebido:
   o salário costuma ser lançado no dia 1º e pago no dia 5. Se a base contasse
   só o que já foi recebido, a meta nasceria ZERADA todo dia 1º e iria
   "crescendo" ao longo do mês — todo grupo apareceria estourado no começo do
   mês, o que é exatamente o oposto de planejar. Por isso a base conta o
   lançamento assim que ele existe, pago ou não. Sinalizado ao Rafael na
   abertura da rodada. */

import type { Categoria, Lancamento } from './db'

/** Categorias que compõem a base da meta: receita marcada como fixa. */
export function categoriasDaBaseMeta(categorias: Categoria[]): Categoria[] {
  return categorias.filter((c) => c.natureza === 'Receita' && c.receitaFixa)
}

/** Soma da receita fixa de um mês (`AAAA-MM`). Pago ou não — ver nota acima. */
export function baseMetaDoMes(
  lancamentos: Lancamento[],
  categorias: Categoria[],
  mesISO: string,
): number {
  const idsBase = new Set(
    categoriasDaBaseMeta(categorias)
      .map((c) => c.id)
      .filter((id): id is number => id != null),
  )
  if (idsBase.size === 0) return 0
  let total = 0
  for (const l of lancamentos) {
    if (!l.dataCompetencia.startsWith(mesISO)) continue
    if (!idsBase.has(l.categoriaId)) continue
    // Receita é positiva; um estorno negativo na mesma categoria reduz a base,
    // que é o comportamento certo (a base é "quanto de renda fixa este mês
    // tem", não "quanto foi creditado").
    total += l.valor
  }
  return total
}

/** Meta em R$ de um grupo: percentual cadastrado × base do mês. */
export function metaEmReais(base: number, percentual: number): number {
  return (base * percentual) / 100
}

/* Texto reaproveitado nas telas que explicam de onde sai o 100% — para a
   explicação não divergir de tela para tela conforme alguém reescreve uma
   delas. */
export const EXPLICACAO_BASE_META =
  'O 100% é a soma das categorias de receita marcadas como "receita fixa" no mês que está na tela.'

/* ===================================================================
   MIGRAÇÃO — base criada antes da build 051 (12/09/2026, bug real)
   -------------------------------------------------------------------
   O Rafael reportou: "o que aconteceu com os gráficos de planejamento que não
   tá mostrando mais o realizado e nem nos grupos a falta ou a sobra sobre
   categorias em cada card de grupo?".

   Reproduzido: a flag `receitaFixa` nasce marcada em `Salário` — mas só no
   `seed.ts`, ou seja, só num banco NOVO. A base dele veio de backup (a semente
   está congelada desde a Decisão 61), então nenhuma categoria tinha a flag.
   Sem nenhuma categoria na base, `baseMetaDoMes` devolve 0, e daí em cadeia:
   meta de todo grupo = R$ 0,00 → o donut desenha "realizado / R$ 0,00" e a
   linha de sobra/falta some do card do grupo, porque ela só aparece quando a
   meta do grupo é maior que zero.

   É a mesma classe de falha já registrada na Lição 39: campo novo precisa de
   default aplicado à base que JÁ EXISTE, não só ao dado de fábrica.

   Regras desta migração:
   • só mexe quando NINGUÉM marcou nada (nenhuma categoria com a flag) — quem
     já escolheu suas receitas fixas nunca é tocado;
   • marca as categorias de receita cujo nome está na lista de renda fixa do
     padrão do sistema (hoje, "Salário"), que é exatamente o que um banco novo
     teria;
   • grava a marca `receitaFixaRevisada` e nunca mais roda, então um usuário
     que DESMARQUE tudo de propósito depois não vê a flag voltar sozinha;
   • se não encontrar nenhuma candidata, não inventa: deixa como está, e a tela
     mostra o aviso de base zerada (ver `AvisoBaseMetaZerada`).
   =================================================================== */

/** Nomes de categoria que o padrão do sistema considera renda fixa. */
export const NOMES_RECEITA_FIXA_PADRAO = ['Salário']

export async function migrarReceitaFixa() {
  const { db } = await import('./db')
  const config = await db.configuracoes.get(1)
  if (config?.receitaFixaRevisada) return 0
  const categorias = await db.categorias.toArray()
  const jaMarcada = categorias.some((c) => c.receitaFixa)
  let marcadas = 0
  if (!jaMarcada) {
    const alvos = categorias.filter(
      (c) => c.natureza === 'Receita' && NOMES_RECEITA_FIXA_PADRAO.includes(c.nome.trim()),
    )
    for (const c of alvos) {
      if (c.id == null) continue
      await db.categorias.update(c.id, { receitaFixa: true })
      marcadas++
    }
  }
  /* A marca vai pelo mesmo caminho que todo o resto da configuração
     (`salvarConfiguracaoIcones` espalha o registro inteiro antes de gravar) —
     um `put` montado à mão aqui apagaria silenciosamente os campos que esta
     função não cita, que é um bug já documentado neste projeto. */
  const { salvarConfiguracaoIcones } = await import('./configuracaoIcones')
  await salvarConfiguracaoIcones({ receitaFixaRevisada: true })
  return marcadas
}
