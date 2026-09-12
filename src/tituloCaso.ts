/* Item 2 da lista de 12/09/2026:

     "N1 e N0 — todos os títulos, nomes de campos e botões com a primeira letra
      maiúscula em cada palavra, exceto conectivos (de, para, e, com, etc.)"

   Por que é uma função e não `text-transform: capitalize`: o CSS capitaliza
   TODA palavra, inclusive os conectivos que ele pediu pra deixar minúsculos —
   "Contas E Carteiras" em vez de "Contas e Carteiras". E por que não sair
   reescrevendo as strings à mão: o mesmo texto aparece em vários lugares e
   qualquer um esquecido volta a destoar. Aplicando na peça compartilhada
   (título de tela, rótulo de campo, item de menu, aba do rodapé), a regra vale
   pra todo texto que passar por ela, inclusive os que ainda vão existir.

   O que a função NÃO faz de propósito: mexer em frase. Texto com ponto final,
   dois pontos ou mais de 6 palavras é explicação, não título — volta
   inalterado. */

const CONECTIVOS = new Set([
  'a', 'à', 'ao', 'aos', 'as', 'às', 'da', 'das', 'de', 'do', 'dos', 'e', 'em',
  'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'pela', 'pelas', 'pelo',
  'pelos', 'por', 'com', 'sem', 'sob', 'sobre', 'um', 'uma', 'que', 'se',
])

/** Palavras que já têm forma própria e não devem ser recapitalizadas. */
const PRESERVAR = new Set(['N0', 'N1', 'MorfoFinP', 'Morfo', 'CPF', 'CNPJ', 'R$', 'WhatsApp', 'Pix', 'PDF', 'CSV'])

function palavraEmTitulo(p: string, primeira: boolean): string {
  if (!p) return p
  if (PRESERVAR.has(p)) return p
  const semAcento = p.toLowerCase()
  if (!primeira && CONECTIVOS.has(semAcento)) return semAcento
  /* Só a primeira letra sobe; o resto da palavra fica como veio — assim
     "MorfoFinP" e "a vencer" continuam legíveis e uma sigla não é destruída. */
  return p.charAt(0).toUpperCase() + p.slice(1)
}

export function emTituloCaso(texto: string): string {
  if (!texto) return texto
  const limpo = texto.trim()
  // Frase, não título: deixa exatamente como está.
  if (/[.:;?!]/.test(limpo)) return texto
  const palavras = limpo.split(/\s+/)
  if (palavras.length > 6) return texto
  return palavras.map((p, i) => palavraEmTitulo(p, i === 0)).join(' ')
}

/** Versão segura pra usar direto em JSX, onde o conteúdo pode não ser texto. */
export function tituloCasoSeTexto(v: unknown): unknown {
  return typeof v === 'string' ? emTituloCaso(v) : v
}
