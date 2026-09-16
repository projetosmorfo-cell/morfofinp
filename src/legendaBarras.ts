/* A SEMÂNTICA DE COR DAS BARRAS, definida UMA vez (build 084, 16/09/2026).
 *
 * Pedido do Rafael: *"em todos os cards no app que tenha cores dentro das
 * barras precisa ter no final do card recolhido a 'Legenda', caso já tenha
 * item recolhido, complemente"*.
 *
 * POR QUE UM MÓDULO, e não HTML escrito à mão em cada tela: até aqui existia
 * uma legenda manual só no Planejamento (`legenda-cores-planejamento`), e o
 * medidor da Situação chegou a pintar o arco com `--ideal-ambar` enquanto a
 * legenda logo abaixo dele mostrava `--amarelo` — a MESMA faixa com duas
 * cores diferentes na mesma tela. É essa classe de deriva que este arquivo
 * fecha: a legenda e a barra passam a citar o MESMO token.
 *
 * REGRA (vale daqui pra frente): nenhuma legenda escreve cor. Ela cita o
 * token CSS que a barra usa. Quem pinta em JS (a lista de grupos do funil, o
 * medidor da Situação) importa a cor DAQUI; quem pinta em CSS (`BarraIdeal`,
 * `BarraMeta`, `BarraRegua`, as colunas do Planejamento) usa o mesmo token
 * nomeado aqui — trocar o valor do token muda a barra e a legenda juntas.
 *
 * VOCABULÁRIO: o já estabelecido no app e no CLAUDE.md — realizado /
 * comprometido (ainda não aconteceu) / margem / estourou / meta não usada.
 * A palavra "faltam" é proibida (ambígua: parece dívida, não sobra).
 */

/** Uma entrada de legenda: a amostra cita o token, nunca um hex. */
export interface EntradaLegenda {
  /** Nome da variável CSS que a barra usa para pintar este papel. */
  token: string
  /** Opacidade aplicada pela barra neste segmento, quando houver. */
  opacidade?: number
  /** O que aquela cor quer dizer, no vocabulário do app. */
  texto: string
}

export interface FamiliaLegenda {
  /** Usado só quando um card mostra mais de uma família de barra. */
  titulo: string
  entradas: EntradaLegenda[]
}

/** As famílias de barra colorida que existem no app. */
export type FamiliaBarra =
  | 'ideal'
  | 'meta'
  | 'regua'
  | 'colunas'
  | 'rioGrupo'
  | 'medidorTeto'

export const LEGENDA_BARRAS: Record<FamiliaBarra, FamiliaLegenda> = {
  /* `BarraIdeal` — a barra segmentada. A barra INTEIRA é a meta; o trecho que
     passa dela fica vermelho (ver o cabeçalho de `BarraIdeal.tsx`). */
  ideal: {
    titulo: 'Barra da meta',
    entradas: [
      { token: '--ideal-azul', texto: 'Realizado — já saiu de verdade' },
      { token: '--ideal-ambar', texto: 'Comprometido — ainda não aconteceu' },
      { token: '--ideal-verde', texto: 'Margem — ainda cabe na meta' },
      { token: '--ideal-vermelho', texto: 'Estourou a meta' },
    ],
  },

  /* `BarraMeta` — barra de gasto × previsto do Resumo, da Situação e do
     Planejamento. Usa a paleta base (`--azul`/`--vermelho`), não a `--ideal-*`:
     é o que o CSS de `.barra-meta` pinta, e é o que a legenda tem que dizer. */
  meta: {
    titulo: 'Barra de gasto × meta',
    entradas: [
      { token: '--azul', texto: 'Realizado — já saiu de verdade' },
      { token: '--ideal-ambar', texto: 'Comprometido — ainda não aconteceu' },
      { token: '--borda', texto: 'Margem — ainda cabe na meta' },
      { token: '--vermelho', texto: 'Estourou a meta' },
      { token: '--texto', texto: 'O risco marca a meta' },
    ],
  },

  /* `BarraRegua` — o modelo Linhas da aba Gráficos do Planejamento. Aqui o
     trilho aparece de propósito (a meta não usada), porque todas as barras
     dividem a mesma escala de dinheiro. */
  regua: {
    titulo: 'Barra da régua',
    entradas: [
      { token: '--ideal-azul', texto: 'Realizado — já saiu de verdade' },
      { token: '--ideal-ambar', texto: 'Comprometido — ainda não aconteceu' },
      { token: '--ideal-trilho', texto: 'Meta não usada' },
      { token: '--ideal-vermelho', texto: 'Estourou a meta' },
    ],
  },

  /* As colunas empilhadas do modelo Colunas: uma fatia por categoria. Só duas
     cores — a fatia inteira é o movimento da categoria, e ela é vermelha
     quando passou do planejado dela. */
  colunas: {
    titulo: 'Colunas por grupo',
    entradas: [
      { token: '--ideal-azul', texto: 'Dentro da meta da categoria' },
      { token: '--ideal-vermelho', texto: 'Estourou a meta da categoria' },
    ],
  },

  /* `.rio-bar-row` — a lista "De onde vem o reservado, meta por grupo" da tela
     Hoje (build 074). Barra SÓLIDA, cor por faixa de uso da meta: outra
     pergunta, outro vocabulário de cor. Ver `corFaixaGrupoRio` abaixo. */
  rioGrupo: {
    titulo: 'Barras por grupo',
    entradas: [
      { token: '--rio-barra-azul', texto: 'Entre 70% e 100% da meta — no ritmo' },
      { token: '--rio-ambar-txt', texto: 'Abaixo de 70% da meta' },
      { token: '--rio-barra-vermelho', texto: 'Passou de 100% da meta' },
      { token: '--ideal-trilho', texto: 'Meta não usada' },
    ],
  },

  /* O MEDIDOR DE ARCO — VOLTOU na build 088, agora no Planejamento.
   *
   * Histórico curto, porque ele importa: a família nasceu na 084 para o
   * `GraficoMargem` da tela Situação, e a 086 a REMOVEU junto com aquela tela
   * (entrada de legenda sem barra que a use é a deriva que este módulo existe
   * para impedir). A 088 traz o desenho de volta como 3º modelo da aba
   * Gráficos do Planejamento (`MedidorMeta`, em `GraficosPlanejamento.tsx`) —
   * é o único lugar do app que usa esta família.
   *
   * MUDANÇA CONSCIENTE EM RELAÇÃO AO ORIGINAL: o medidor de 085 pintava o
   * "já pago" de VERMELHO, porque na Situação a pergunta era "quanto do teto
   * já queimei" e o consumido era o alerta. No Planejamento a pergunta é
   * outra — "quanto da META já tem destino" — e a tela INTEIRA já fala uma
   * língua de cor: azul = realizado, âmbar = comprometido, verde = margem,
   * vermelho = estourou (`BarraIdeal`, `BarraRegua`, as colunas). Manter o
   * vermelho do original poria DUAS linguagens de cor para o mesmo conceito
   * na mesma tela — exatamente o defeito que a build 084 fechou. Então o
   * medidor fala a língua do Planejamento, e usa os MESMOS tokens
   * `--ideal-*` das barras vizinhas.
   *
   * O trilho entra na legenda porque ele APARECE: os vãos (`GAP`) entre os
   * segmentos deixam o arco de trás à mostra. Ele não é "meta não usada"
   * aqui (a margem verde é que é) — é a meta inteira desenhada por baixo, e o
   * texto diz isso. */
  medidorTeto: {
    titulo: 'Medidor da meta',
    entradas: [
      { token: '--ideal-azul', texto: 'Realizado — já saiu de verdade' },
      { token: '--ideal-ambar', texto: 'Comprometido — ainda não aconteceu' },
      { token: '--ideal-verde', texto: 'Margem — ainda cabe na meta' },
      { token: '--ideal-vermelho', texto: 'Estourou a meta' },
      { token: '--ideal-trilho', texto: 'O arco inteiro é a meta do mês' },
    ],
  },
}

/** `var(--token)`, pronto para `style`/`stroke` — a barra e a legenda usam o mesmo. */
export const corDoToken = (token: string) => `var(${token})`

/* As três faixas da lista de grupos do funil (build 074): >100% estourou,
   <70% bem abaixo do ritmo, entre os dois dentro do esperado. A barra em
   `Hoje.tsx` e a legenda de `rioGrupo` leem esta mesma função — foi assim que
   os limiares deixaram de existir escritos em dois lugares. */
export function tokenFaixaGrupoRio(pctUso: number): string {
  if (pctUso > 100) return '--rio-barra-vermelho'
  if (pctUso < 70) return '--rio-ambar-txt'
  return '--rio-barra-azul'
}

export const corFaixaGrupoRio = (pctUso: number) => corDoToken(tokenFaixaGrupoRio(pctUso))
