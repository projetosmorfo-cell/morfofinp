// Formatação e máscara de valor monetário (01/09/2026) — antes cada tela
// tinha sua própria função local `fmtBRL`/`fmt`, todas fazendo só
// `toFixed(2).replace('.', ',')` — sem separador de milhar nenhum (R$
// 15166.45 aparecia como "15166,45", não "15.166,45"). Unificado aqui,
// usado em toda exibição de valor do app (pedido explícito do Rafael:
// "em todos os lugares que exibir valores no app inteiro, deve ter ponto
// como separador de milhar") e na máscara de digitação do campo Valor.

// "1234567,89" -> "1.234.567,89" (sem prefixo R$, sem sinal).
export function formatarMoeda(v: number): string {
  const abs = Math.abs(v)
  const fixo = abs.toFixed(2)
  const [inteiro, decimais] = fixo.split('.')
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${comMilhar},${decimais}`
}

/* BUILD 091 (17/09/2026) — a regra do "R$", decidida pelo Rafael:
 *   "Não mostrar mais a máscara com R$ (...) manter R$ somente nos dados
 *    conclusivos de TOTAIS finais, avalie os locais."
 *
 * Duas famílias, de propósito:
 *   • `fmtNum` / `fmtNumComSinal` / `fmtNumSinalExplicito` — SEM "R$". É o
 *     padrão do app: linhas de lançamento, "X de Y", "X / W", pontas de barra,
 *     colunas, detalhes dentro de card, metas em cadastro.
 *   • `fmtBRL` / `fmtComSinal` / `fmtSinalExplicito` — COM "R$". Só nos
 *     totais finais conclusivos: os cinco números do funil da tela Hoje, a
 *     faixa de totais das listas, os totais dos cards da Carteira e da fatura,
 *     o fechamento do Planejamento e do medidor, e frases (o veredito, as
 *     frases de impacto) — em texto corrido o "R$" é o que diz que o número é
 *     dinheiro.
 * Regra ao escrever tela nova: começa com `fmtNum`; `fmtBRL` só se for o
 * número que fecha o card ou a tela. */

// "1234567,89" -> "1.234.567,89" — o padrão do app (sem R$, sem sinal).
export function fmtNum(v: number): string {
  return formatarMoeda(v)
}
export function fmtNumComSinal(v: number): string {
  return `${v < -0.005 ? '−' : ''}${formatarMoeda(v)}`
}
export function fmtNumSinalExplicito(v: number): string {
  return v > 0.005 ? `+${formatarMoeda(v)}` : fmtNumComSinal(v)
}

// "1234567,89" -> "R$ 1.234.567,89" — SÓ nos totais finais (ver acima).
export function fmtBRL(v: number): string {
  return `R$ ${formatarMoeda(v)}`
}

// Com o sinal na frente quando é negativo (13/09/2026). `fmtBRL` nunca
// mostrou sinal — a maioria dos lugares já escreve o "+"/"−" por fora, e
// mudar o comportamento dela duplicaria o sinal nesses lugares. Mas nos
// NÚMEROS GRANDES da tela Hoje a cor era a única pista de que o valor era
// negativo ("saldo livre em vermelho, sem o menos" — Rafael), e cor sozinha
// não informa. Use esta onde o número aparece isolado, sem rótulo de sinal.
export function fmtComSinal(v: number): string {
  return `${v < -0.005 ? '−' : ''}${fmtBRL(v)}`
}

/* O MESMO número, com o "+" ESCRITO quando é positivo (build 086).
 *
 * `fmtComSinal` só escreve o "−": é ele que a tela Hoje usa nos números
 * grandes do funil, e lá o "+" seria ruído (o valor positivo é o caso normal).
 * No Planejamento o pedido do Rafael foi outro — *"em todas as barras mostre o
 * valor resultante na frente da barra, positivo ou negativo"* —, e ali os dois
 * sinais convivem barra a barra: sem o "+" escrito, a única diferença entre
 * uma sobra e um estouro voltaria a ser a cor, que é exatamente o que a regra
 * da build 061 proíbe.
 *
 * Função separada, e não um parâmetro de `fmtComSinal`, de propósito: os
 * números do funil foram calibrados em largura (builds 075 e 082, "-R$
 * 123.456,78" cabendo numa caixa de 157px) e ganhar um caractere a mais
 * desfaria aquela conta.
 */
export function fmtSinalExplicito(v: number): string {
  return v > 0.005 ? `+${fmtBRL(v)}` : fmtComSinal(v)
}

// Converte texto no formato mascarado ("1.234,56") de volta pro número —
// usado ao salvar/filtrar. Aceita também texto sem máscara (ex.: "1234.56"
// digitado por colar/preencher automático), já que remove só pontos e troca
// a última vírgula por ponto.
export function paraNumero(texto: string): number {
  if (!texto) return 0
  const limpo = texto.replace(/\./g, '').replace(',', '.')
  return Number(limpo) || 0
}

// Máscara de digitação estilo "app de banco": cada dígito digitado entra
// pela direita, como centavo — o usuário só digita números (0-9), a máscara
// cuida de vírgula decimal e ponto de milhar sozinha. Ex.: digitar
// "1","2","3","4","5" produz "1,23" -> "12,34" -> "123,45"... e
// "1234567" vira "12.345,67". Usada no onChange de todo campo de valor.
export function aplicarMascaraValor(textoDigitado: string): string {
  const digitos = textoDigitado.replace(/\D/g, '')
  if (!digitos) return ''
  const centavos = parseInt(digitos, 10)
  return formatarMoeda(centavos / 100)
}
