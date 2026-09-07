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

// "1234567,89" -> "R$ 1.234.567,89" — usado em toda exibição de valor.
export function fmtBRL(v: number): string {
  return `R$ ${formatarMoeda(v)}`
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
