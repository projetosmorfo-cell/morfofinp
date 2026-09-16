/* Leitura inteligente do TEXTO de uma notificação bancária (16/09/2026).
 *
 * POR QUE ESTE MÓDULO EXISTE — e por que ele é PURO.
 *
 * Até a build 078 o lado JS da notificação bancária (`notificacaoBancaria.ts`)
 * lia só duas coisas do texto: o primeiro `R$ n.nnn,nn` e um palpite grosso de
 * entrada × saída por palavra-chave. O formulário abria com a descrição
 * preenchida com o TÍTULO da notificação ("Compra aprovada", "BRADESCO") — que
 * não é o que aconteceu, é só o assunto — e sem conta nenhuma escolhida.
 *
 * Pedido do Rafael (16/09/2026), literal: "precisamos melhorar pra coletar
 * também o nome do estabelecimento pra preencher também o campo 'o que foi',
 * mas não é só isso, precisamos identificar quando é de um estabelecimento por
 * ser uma compra ou de quando é uma transferência, um pix (...) se possível
 * identificar o banco e já trazer preenchido também visto ele já existir
 * cadastrado na carteira, mas quando não existir, trazer o campo em branco."
 *
 * Tudo aqui é FUNÇÃO PURA sobre `{titulo, texto, pacote, app}`: nada de Dexie,
 * nada de `new Date()`, nada de estado. Dois motivos:
 *   1. dá pra rodar o corpus inteiro de textos reais num script Node solto,
 *      sem navegador e sem banco — foi assim que estas regras foram calibradas;
 *   2. a tela pode RE-ANALISAR na hora de exibir, então uma notificação
 *      capturada por uma build antiga ganha a leitura nova de graça, sem
 *      migração de schema e sem campo persistido que possa divergir do texto.
 *      Por isso nada do que sai daqui é gravado como verdade: o que fica no
 *      Dexie continua sendo o TEXTO CRU (`titulo`/`texto`, nunca editados).
 *
 * ORDEM DAS REGRAS (a ordem é a regra — do mais específico pro mais genérico):
 *
 *  1. VALOR. Primeiro `R$` do texto. Em notificação de banco o primeiro valor é
 *     praticamente sempre o da transação (o segundo, quando existe, é saldo ou
 *     limite, e vem depois).
 *
 *  2. MÁSCARA DO VALOR. Antes de procurar nome, todo trecho monetário
 *     (inclusive o "no valor de" que o antecede) vira o marcador `«V»`. Sem
 *     isso, "Você recebeu um Pix de R$ 2.500,00 de EMPRESA XYZ" faria o padrão
 *     "de <nome>" capturar "R$ 2.500,00". Com a máscara, o padrão simplesmente
 *     pula o marcador — e o marcador ainda serve de FRONTEIRA pra cortar o
 *     nome ("Pix recebido de MARIA SOUZA no valor de R$ 300,00" → "MARIA
 *     SOUZA").
 *
 *  3. TIPO DE MOVIMENTO, do mais específico pro mais genérico:
 *     pix recebido → pix enviado → compra → pagamento de conta/boleto →
 *     crédito → transferência/débito → desconhecido.
 *     Pix vem antes de tudo porque a palavra "Pix" é inequívoca; "compra" vem
 *     antes de "crédito" pra "compra no crédito" não virar entrada; "débito
 *     de X" fica em transferência (é o que o texto diz), e só "débito
 *     automático" cai em pagamento de conta.
 *
 *  4. NOME DA CONTRAPARTE, por conectores, também do mais específico pro mais
 *     genérico: "no estabelecimento" → "referente a" → "para" → "em" → "de".
 *     "de" é o ÚLTIMO de propósito: é o conector mais ambíguo do português
 *     ("transação DE R$ 80"), e só sobra pra ele quando nenhum outro casou —
 *     tipicamente o Pix recebido ("... de EMPRESA XYZ LTDA").
 *
 *  5. CORTE DO NOME. O nome capturado vai até a primeira fronteira: vírgula,
 *     ponto, `:`, `;`, quebra de linha, o marcador `«V»`, ou o começo de uma
 *     ORAÇÃO SEGUINTE ("que", "está", "estava", "foi", "no dia", "em 15/09",
 *     "com", "via", ...). Esse corte não é enfeite: é o caso real do Rafael —
 *       "para FLAVIA DE OLIVEIRA BARROS PASSARO, que estava agendada para
 *        hoje, foi concluída"
 *     sem o corte na vírgula, a descrição do lançamento viraria a frase
 *     inteira.
 *
 *  6. LIMPEZA DO NOME (maquineta/adquirente). `MERCADO LIVRE*LOJA` → "Mercado
 *     Livre", `UBER *TRIP` → "Uber", `MP*PADARIA` → "Padaria" (aqui o pedaço
 *     ANTES do `*` é prefixo conhecido de adquirente, então vale o de depois).
 *     Sufixo de razão social (LTDA, SA, S/A, ME, EPP, EIRELI) é REMOVIDO —
 *     escolha única e consistente, porque quem lê "O que foi" quer o nome da
 *     loja, não a forma jurídica. "TIM SA CELULAR" → "Tim Celular".
 *
 *  7. CAIXA. Nome em CAIXA ALTA vira Caixa de Título ("FLAVIA DE OLIVEIRA" →
 *     "Flavia de Oliveira"), porque a UI do app é em caixa de frase. Nome que
 *     JÁ tem minúscula é devolvido intacto (o banco já escreveu direito).
 *     Palavra de até 3 letras continua maiúscula (TIM, BB, XP) — acima disso
 *     não dá pra saber se é sigla, e "Enel" erra menos que "ENEL" gritando.
 *     `descricaoOriginal` do lançamento continua guardando o texto CRU da
 *     notificação, nunca esta versão bonita (Decisão 24).
 *
 *  8. AGENDADO × CONCLUÍDO. O corpus do Rafael tem o MESMO R$ 80,00 duas
 *     vezes: "está agendada pra amanhã" (dia 14) e "que estava agendada para
 *     hoje, foi concluída" (dia 15). Por isso CONCLUSÃO é checada ANTES de
 *     agendamento e vence: "estava agendada" é passado, não é compromisso
 *     futuro. Agendado → sugere `pago: false` (ainda não aconteceu); e quando
 *     o texto diz "amanhã" com todas as letras, a data sugerida anda 1 dia
 *     (`deslocamentoDias`) — só nesse caso explícito, nunca por dedução.
 *
 *  9. PROMOÇÃO / RUÍDO. O filtro nativo (Java) é de propósito burro: qualquer
 *     notificação com "R$" seguido de dígito. As três notificações "Porto" do
 *     corpus provam que isso não basta — é marketing puro. Aqui a notificação
 *     é marcada `transacional: false` quando tem marcador de propaganda e não
 *     tem forma de transação. Um marcador FORTE (cupom, % OFF, desconto,
 *     promoção, contrate, simule, aproveite) barra sozinho; marcadores fracos
 *     ("ative o", "cadastre", "acompanhe", "conheça") só barram em dupla ou
 *     quando o movimento não foi reconhecido — senão "Pagamento de boleto de
 *     R$ 230,00 para ENEL. Acompanhe pelo app." seria descartado por causa de
 *     um "acompanhe" no fim da frase. Essas notificações NÃO são apagadas:
 *     vão pra seção recolhida "Ignoradas" da tela, do mesmo jeito que o app já
 *     trata 'descartada' — classificação errada tem que ser reversível.
 *
 * O que este módulo NÃO faz, de propósito: gravar lançamento. Nada neste fluxo
 * cria ou apaga lançamento sem o Rafael confirmar na tela — inclusive a
 * detecção de repetição (item 4 do pedido) só MARCA o provável duplicado, ele
 * decide se descarta.
 */
import type { Conta } from './db'
import { normalizarNome } from './dados/instituicoes'
import { PARAMETROS_NOTIFICACAO_PADRAO, type ParametrosNotificacao } from './notificacaoParametros'

/* 16/09/2026 (build 080) — PARAMETRIZAÇÃO.
 *
 * Tudo que este módulo tinha de constante chumbada virou parâmetro: a janela
 * de repetição, o "amanhã" que anda 1 dia, o agendado que sugere não-pago, o
 * filtro de propaganda (ligar/desligar, os dois conjuntos de marcadores e o
 * limiar dos fracos), a remoção de sufixo de razão social e o tamanho máximo
 * do nome. O módulo continua PURO: os parâmetros chegam por ARGUMENTO, com
 * `PARAMETROS_NOTIFICACAO_PADRAO` como padrão — quem precisa dos valores em
 * vigor chama `paramsNotificacaoAtuais()` (cache síncrono) e passa aqui. Assim
 * o corpus continua rodando num script Node solto, agora podendo variar
 * parâmetro sem tocar no código. Ver `src/notificacaoParametros.ts`. */

export type TipoMovimento =
  | 'compra'
  | 'pix_enviado'
  | 'pix_recebido'
  | 'transferencia'
  | 'pagamento_conta'
  | 'credito'
  | 'desconhecido'

export interface EntradaNotificacao {
  titulo?: string
  texto?: string
  pacote?: string
  app?: string
}

export interface NotificacaoAnalisada {
  /** Valor sempre positivo; `undefined` quando não deu pra reconhecer. */
  valor?: number
  /** Nome limpo e em caixa de título — vai pro campo "O que foi". */
  contraparte?: string
  /** Nome como apareceu no texto, antes da limpeza (diagnóstico/testes). */
  contraparteBruta?: string
  movimento: TipoMovimento
  /** Sinal do lançamento, derivado do movimento. */
  tipo: 'entrada' | 'saida'
  /** Ainda VAI acontecer (agendado/programado) e não foi concluído. */
  agendado: boolean
  /** O texto afirma que já aconteceu (concluída/aprovada/realizado). */
  concluido: boolean
  /** Sugestão pro checkbox "Já foi pago/recebido" do formulário. */
  pagoSugerido: boolean
  /** Quantos dias somar à data de recebimento ("amanhã" → 1). */
  deslocamentoDias: number
  /** Parece movimentação de dinheiro de verdade (false = propaganda/aviso). */
  transacional: boolean
  /** Quatro últimos dígitos do cartão, quando o texto traz. */
  cartaoFinal?: string
  /** O texto fala em cartão (desempata a conta quando o nome empata). */
  mencionaCartao: boolean
  /** Descrição pronta pro formulário — contraparte, ou um rótulo do movimento. */
  descricaoSugerida?: string
}

// --- Passo 1: valor ---------------------------------------------------------

const RE_VALOR = /R\$\s*([\d.]+)(?:,(\d{1,2}))?/

export function extrairValorTexto(texto: string): number | undefined {
  const m = RE_VALOR.exec(texto)
  if (!m) return undefined
  const inteiro = m[1].replace(/\./g, '')
  const centavos = (m[2] ?? '0').padEnd(2, '0')
  const n = Number(`${inteiro}.${centavos}`)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/* Passo 2: máscara. Engole também o "no valor de"/"no total de" que costuma
   vir GRUDADO antes do número — se ficasse pra trás, o "de" solto viraria um
   conector candidato e capturaria o marcador. */
const RE_VALOR_MASCARA = /(?:\b(?:n[oa]\s+(?:valor|total|quantia|import[âa]ncia)\s+de|no\s+valor)\s+)?R\$\s*[\d.]+(?:,\d{1,2})?/gi
const MARCA_VALOR = '«V»'

function mascararValor(texto: string): string {
  return texto.replace(RE_VALOR_MASCARA, MARCA_VALOR)
}

// --- Passo 3: tipo de movimento --------------------------------------------

const RE_PIX = /\bpix\b/i
const RE_RECEBEU = /\b(recebeu|recebid[oa]|recebimento|entrou|caiu na conta|creditad[oa])\b/i
const RE_ENVIOU = /\b(enviou|enviad[oa]|transferiu|pagou|sa[ií]u|debitad[oa]|realizou)\b/i
const RE_COMPRA = /\b(compra|comprou|compras)\b|transa[çc][ãa]o aprovada|aprovad[ao] no cart[ãa]o/i
const RE_PAGAMENTO_CONTA =
  /\bboleto\b|\bfatura\b|pagamento d[ao] conta|conta de (?:luz|[áa]gua|telefone|g[áa]s|internet|energia)|d[ée]bito autom[áa]tico|pagamento de conta|\bconv[êe]nio\b|\bdarf\b|\bdas\b|\btributo\b|\bIPVA\b|\bIPTU\b/i
const RE_CREDITO =
  /\bcr[ée]dito de\b|\bcreditad[oa]\b|\bsal[áa]rio\b|\bdep[óo]sito\b|\bestorno\b|\breembolso\b|\brendimento\b|\bprovento\b|\bcashback\b/i
const RE_TRANSFERENCIA =
  /\btransfer[êe]ncia\b|\btransferiu\b|\bTED\b|\bDOC\b|\btransa[çc][ãa]o\b|\bd[ée]bito de\b|\bdebitad[oa]\b|\bsaque\b/i

function classificarMovimento(t: string): TipoMovimento {
  // Pix primeiro: a palavra é inequívoca e o resto do texto varia muito.
  if (RE_PIX.test(t)) {
    if (RE_RECEBEU.test(t)) return 'pix_recebido'
    if (RE_ENVIOU.test(t)) return 'pix_enviado'
    /* Pix sem verbo claro: "para" indica saída, e saída é o padrão seguro —
       um Pix classificado como saída por engano aparece com o sinal errado na
       tela de confirmação, que é exatamente onde o Rafael corrige. */
    return /\bpara\b/i.test(t) ? 'pix_enviado' : 'pix_recebido'
  }
  // Compra ANTES de crédito, senão "compra no crédito" viraria entrada.
  if (RE_COMPRA.test(t)) return 'compra'
  if (RE_PAGAMENTO_CONTA.test(t)) return 'pagamento_conta'
  if (RE_CREDITO.test(t)) return 'credito'
  if (RE_TRANSFERENCIA.test(t)) return 'transferencia'
  return 'desconhecido'
}

const ENTRADAS: TipoMovimento[] = ['pix_recebido', 'credito']

/* Palavra de entrada pro caso 'desconhecido' — é a heurística que já existia
   em `inferirTipo` na build 078, mantida como último recurso. */
const RE_ENTRADA_SOLTA =
  /\b(recebeu|recebido|recebida|recebimento|cr[eé]dito em conta|creditad[oa]|dep[oó]sito|entrada|estorno|reembolso|voc[eê] recebeu)\b/i

// --- Passo 4/5/6/7: nome da contraparte ------------------------------------

/* Fronteira de corte: onde o nome ACABA. Além da pontuação, a lista de
   palavras que só podem começar a oração seguinte — o caso "para FLAVIA ...,
   que estava agendada" do corpus do Rafael. */
/* ATENÇÃO ao `(?![a-zà-ÿ])` no lugar de `\b`: em JavaScript o `\b` é ASCII, e
   "está " NÃO tem fronteira de palavra depois do "á" (á já é não-word pro
   motor). Escrito com `\b` o corte simplesmente não acontecia e a descrição
   saía "FLAVIA DE OLIVEIRA BARROS PASSARO está" — foi o primeiro bug pego
   pelo script de corpus. */
const FIM = '(?![a-zà-ÿ])'
const RE_CORTE = new RegExp(
  `\\s+(?:«|que${FIM}|est[áa]${FIM}|estava${FIM}|est[ãa]o${FIM}|estavam${FIM}|foi${FIM}|for[ai]m${FIM}` +
    `|ser[áa]${FIM}|ser[ãa]o${FIM}|no valor${FIM}|no total${FIM}|no dia${FIM}|em \\d|de \\d|[àa]s \\d` +
    `|par[ao] (?:hoje|amanh[ãa]|o dia|a data)|hoje${FIM}|amanh[ãa]${FIM}|atrav[ée]s${FIM}|via${FIM}` +
    `|pel[oa]${FIM}|se${FIM}|caso${FIM}|utilizando${FIM}|usando${FIM}|refer|conclu|aprovad|realizad` +
    `|efetuad|confirmad|agendad|programad|debitad|creditad|lembre|com\\s+(?:o|a|seu|sua)${FIM}` +
    `|e\\s+(?:o|a)\\s+saldo)`,
  'i',
)

/* Conectores, do mais específico pro mais genérico. `(?!«)` impede que o
   conector capture o marcador do valor. */
const PADROES_NOME: RegExp[] = [
  /\bno estabelecimento\s+(?!«)([^,;:.!?\n]+)/i,
  /\bestabelecimento\s+(?!«)([^,;:.!?\n]+)/i,
  /\breferente a[o]?\s+(?!«)([^,;:.!?\n]+)/i,
  /\bpara\s+(?!«)([^,;:.!?\n]+)/i,
  /\bem\s+(?!«)([^,;:.!?\n]+)/i,
  /\bde\s+(?!«)([^,;:.!?\n]+)/i,
]

/* Prefixos de adquirente/maquineta: quando o pedaço ANTES do `*` é um destes,
   o nome de verdade é o de DEPOIS (MP*PADARIA → Padaria). */
const PREFIXOS_ADQUIRENTE = new Set([
  'pag', 'pagseguro', 'mp', 'merpago', 'mercadopago', 'paypal', 'pp', 'ifd', 'ifood',
  'ebanx', 'ec', 'dl', 'sumup', 'stone', 'cielo', 'rede', 'picpay', 'apl', 'aplpay',
  'gpay', 'amzn', 'sq', 'sqr', 'pgs',
  /* "UBER" NÃO entra aqui de propósito: em "UBER *TRIP" quem cobrou é a Uber
     mesmo — o pedaço depois do `*` é o serviço (TRIP/EATS), não o lojista. */
])

/* Palavras que nunca são nome de ninguém — aparecem quando um conector casa
   dentro de uma frase de marketing ("...15% OFF para você!"). */
const NOMES_INVALIDOS = new Set(['voce', 'vc', 'mim', 'nos', 'ele', 'ela', 'eles', 'elas', 'ti', 'si'])

/* Sufixo de razão social — removido SEMPRE (escolha única e consistente, ver
   item 6 do cabeçalho). SA/S.A./S/A e LTDA saem de qualquer posição porque
   aparecem no meio de nomes de operadora ("TIM SA CELULAR"); ME/EPP/EIRELI só
   saem no fim, onde não há dúvida de que são forma jurídica. */
const RE_SUFIXO_QUALQUER = /\b(?:ltda|s\s*\/\s*a|s\.\s*a\.?|sa)\b/gi
const RE_SUFIXO_FINAL = /\s+(?:me|epp|eireli|mei)\s*$/i

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'para', 'com', 'no', 'na'])

function caixaDeTitulo(nome: string): string {
  // Já tem minúscula = o banco escreveu direito; só garante a inicial.
  if (/[a-záàâãéêíóôõúüç]/.test(nome)) return nome.charAt(0).toUpperCase() + nome.slice(1)
  const palavras = nome.toLowerCase().split(/\s+/)
  /* Sigla só quando o nome INTEIRO é uma palavra curta (TIM, BB, XP, ENEL).
     Palavra curta DENTRO de um nome composto quase sempre é palavra normal —
     "CAFETERIA LUA" tem que virar "Cafeteria Lua", não "Cafeteria LUA". */
  if (palavras.length === 1 && palavras[0].length <= 4) return nome.toUpperCase()
  return palavras
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ')
}

function limparNome(bruto: string, p: ParametrosNotificacao): string | undefined {
  let n = bruto.trim()
  // `*` da maquineta.
  if (n.includes('*')) {
    const partes = n.split('*').map((p) => p.trim()).filter(Boolean)
    if (partes.length >= 2) {
      const primeiro = partes[0]
      n = PREFIXOS_ADQUIRENTE.has(normalizarNome(primeiro)) || primeiro.length < 3 ? partes[1] : primeiro
    } else if (partes.length === 1) {
      n = partes[0]
    }
  }
  if (p.removerSufixoRazaoSocial) n = n.replace(RE_SUFIXO_QUALQUER, ' ').replace(RE_SUFIXO_FINAL, ' ')
  // Sobra de cartão/número solto e pontuação nas pontas.
  n = n.replace(/\bfinal\s+\d{3,4}\b/gi, ' ').replace(/[\s\-–—/|]+$/, '').replace(/^[\s\-–—/|]+/, '')
  n = n.replace(/\s{2,}/g, ' ').trim()
  // Sem letra nenhuma (só números/símbolos) não é nome de ninguém.
  if (!/[a-zA-ZÀ-ÿ]/.test(n)) return undefined
  if (n.length < 2) return undefined
  if (NOMES_INVALIDOS.has(normalizarNome(n))) return undefined
  // Nome absurdamente longo = o corte falhou; melhor não sugerir nada errado.
  if (n.length > p.tamanhoMaximoNome) return undefined
  return n
}

function extrairContraparte(textoMascarado: string, p: ParametrosNotificacao): { bruta?: string; limpa?: string } {
  for (const re of PADROES_NOME) {
    const m = re.exec(textoMascarado)
    if (!m) continue
    let cru = m[1]
    const corte = RE_CORTE.exec(cru)
    if (corte) cru = cru.slice(0, corte.index)
    cru = cru.trim()
    if (!cru || cru.startsWith(MARCA_VALOR)) continue
    const limpa = limparNome(cru, p)
    if (limpa) return { bruta: cru, limpa: caixaDeTitulo(limpa) }
  }
  return {}
}

// --- Passo 8: agendado × concluído -----------------------------------------

/* Conclusão é checada ANTES de agendamento e VENCE — "estava agendada para
   hoje, foi concluída" é uma transação que já aconteceu. */
const RE_CONCLUIDO =
  /\bfoi conclu|\bconclu[íi]d|\baprovad[ao]\b|\brealizad[ao]\b|\befetuad[ao]\b|\bconfirmad[ao]\b|\bcom sucesso\b|\bdebitad[ao] em\b|\bcreditad[ao]\b|\bfoi paga?\b|voc[êe] (?:fez|pagou|enviou|recebeu)|\brecebid[ao]\b|\benviad[ao]\b/i
const RE_AGENDADO =
  /\best[áa] agendad|\best[áa] programad|\bagendad[ao] par[ao]\b|\bprogramad[ao] par[ao]\b|\bser[áa] (?:debitad|pag|cobrad)|\bagendamento\b|\bvence em\b|\bvencimento em\b|\bprogramad[ao] pra\b|\bagendad[ao] pra\b/i
// Mesmo cuidado do RE_CORTE: `\b` depois de "ã" não existe pro motor JS.
const RE_AMANHA = /\bamanh[ãa](?![a-zà-ÿ])/i

// --- Passo 9: propaganda / ruído -------------------------------------------

/* As duas listas de marcadores moram em `notificacaoParametros.ts` desde a
   build 080 — são editáveis pelo N0. Os valores de fábrica são exatamente os
   que estavam aqui. */
const RE_VERBO_TRANSACIONAL =
  /\b(compra|pix|transfer[êe]ncia|transa[çc][ãa]o|pagamento|pago|d[ée]bito|cr[ée]dito|saque|estorno|dep[óo]sito|boleto|fatura|sal[áa]rio|debitad|creditad|aprovad)\w*/i

function contar(t: string, lista: string[]): number {
  const baixo = t.toLowerCase()
  return lista.reduce((n, m) => (baixo.includes(m) ? n + 1 : n), 0)
}

// --- Rótulos para a tela ----------------------------------------------------

export const ROTULO_MOVIMENTO: Record<TipoMovimento, string> = {
  compra: 'Compra',
  pix_enviado: 'Pix enviado',
  pix_recebido: 'Pix recebido',
  transferencia: 'Transferência',
  pagamento_conta: 'Pagamento de conta',
  credito: 'Crédito',
  desconhecido: 'Não identificado',
}

// --- Função principal -------------------------------------------------------

/** Junta título e texto do jeito que o app inteiro já usa como "texto cru". */
export function textoCompleto(n: EntradaNotificacao): string {
  return [n.titulo, n.texto].filter(Boolean).join(' — ')
}

export function analisarNotificacao(
  n: EntradaNotificacao,
  p: ParametrosNotificacao = PARAMETROS_NOTIFICACAO_PADRAO,
): NotificacaoAnalisada {
  const t = textoCompleto(n)
  const valor = extrairValorTexto(t)
  const mascarado = mascararValor(t)

  const movimento = classificarMovimento(t)
  const tipo: 'entrada' | 'saida' =
    ENTRADAS.includes(movimento) ? 'entrada'
    : movimento === 'desconhecido' && RE_ENTRADA_SOLTA.test(t) ? 'entrada'
    : 'saida'

  const { bruta, limpa } = extrairContraparte(mascarado, p)

  const concluido = RE_CONCLUIDO.test(t)
  const agendado = !concluido && RE_AGENDADO.test(t)
  const deslocamentoDias = p.deslocarAmanha && agendado && RE_AMANHA.test(t) ? 1 : 0

  const cartaoFinal = /\bfinal\s+(\d{4})\b/i.exec(t)?.[1] ?? /\bcart[ãa]o\s+\D{0,12}(\d{4})\b/i.exec(t)?.[1]
  const mencionaCartao = /\bcart[ãa]o\b|\bno cr[ée]dito\b|\bno d[ée]bito\b/i.test(t) || !!cartaoFinal

  const fortes = contar(t, p.marcadoresFortes)
  const fracos = contar(t, p.marcadoresFracos)
  const temVerbo = RE_VERBO_TRANSACIONAL.test(t)
  /* Marcador forte barra sozinho. Fraco só barra em dupla, ou quando o
     movimento nem foi reconhecido — senão um "Acompanhe pelo app" no fim de um
     pagamento de boleto legítimo jogaria a notificação fora. */
  const pareceuPropaganda =
    p.filtroPromocaoAtivo &&
    (fortes > 0 ||
      fracos >= p.limiarMarcadoresFracos ||
      (fracos > 0 && fracos < p.limiarMarcadoresFracos && movimento === 'desconhecido'))
  const transacional = valor != null && temVerbo && !pareceuPropaganda

  return {
    valor,
    contraparte: limpa,
    contraparteBruta: bruta,
    movimento,
    tipo,
    agendado,
    concluido,
    pagoSugerido: p.agendadoSugereNaoPago ? !agendado : true,
    deslocamentoDias,
    transacional,
    cartaoFinal,
    mencionaCartao,
    descricaoSugerida: limpa ?? (movimento !== 'desconhecido' ? ROTULO_MOVIMENTO[movimento] : undefined),
  }
}

// --- Banco → conta da Carteira ---------------------------------------------

/* Casamento do APP que postou a notificação com uma conta já cadastrada.
 *
 * Regra do Rafael, literal: "se possível identificar o banco e já trazer
 * preenchido também visto ele já existir cadastrado na carteira, mas quando
 * não existir, trazer o campo em branco". Então: na dúvida, NADA. Um contaId
 * errado grava dinheiro na conta errada silenciosamente; campo em branco só
 * obriga um toque a mais.
 *
 * A normalização é a MESMA de `casarArquivoComInstituicao()` (importação de
 * logo da carteira) — `normalizarNome()`, exportada de `dados/instituicoes.ts`
 * justamente pra não existir uma terceira implementação de "compara nome de
 * banco sem acento" no projeto.
 *
 * Pontuação: o NOME que a pessoa deu à conta vale mais que a `instituicao`
 * (nome igual 4, nome contido 3, instituição igual 2, instituição contida 1).
 * Isso é o que resolve o caso real de ter "Bradesco" (corrente) e "Cofrinho"
 * (instituição Bradesco) na carteira: uma notificação do app Bradesco casa
 * com a conta chamada Bradesco, não empata com o cofrinho. Contido exige 4
 * caracteres dos dois lados pra "Nu" não casar com "Unicred". O tipo da conta
 * é só DESEMPATE — "cartão final 1234" prefere uma conta 'cartao', Pix/
 * boleto prefere 'corrente' — e só é consultado quando duas contas empatam na
 * pontuação de nome; nome claro sempre ganha do tipo.
 */
export function casarContaDaNotificacao(
  a: Pick<NotificacaoAnalisada, 'movimento' | 'mencionaCartao'>,
  origem: Pick<EntradaNotificacao, 'app' | 'pacote' | 'titulo'>,
  contas: Conta[],
): number | undefined {
  const candidatos = new Set<string>()
  for (const s of [origem.app, origem.titulo]) {
    const nn = normalizarNome(s ?? '')
    if (nn.length >= 3) candidatos.add(nn)
  }
  /* O pacote (com.bradesco, br.com.portoseguro.cartoes) vira candidatos por
     segmento — descartando os pedaços que não identificam ninguém. */
  const LIXO = new Set([
    'com', 'br', 'app', 'apps', 'android', 'mobile', 'banco', 'bank', 'cliente', 'net', 'org',
    'production', 'prod', 'release', 'ios', 'main', 'com2',
  ])
  for (const seg of (origem.pacote ?? '').split('.')) {
    const nn = normalizarNome(seg)
    if (nn.length >= 3 && !LIXO.has(nn)) candidatos.add(nn)
  }
  if (candidatos.size === 0) return undefined

  const ativas = contas.filter((c) => c.ativa !== false && c.id != null)
  let melhor = 0
  let vencedores: Conta[] = []
  for (const c of ativas) {
    let pontos = 0
    for (const [alvo, base] of [[c.nome, 3] as const, [c.instituicao, 1] as const]) {
      const na = normalizarNome(alvo ?? '')
      if (!na) continue
      for (const cand of candidatos) {
        if (na === cand) pontos = Math.max(pontos, base + 1)
        else if (na.length >= 4 && cand.length >= 4 && (na.includes(cand) || cand.includes(na))) {
          pontos = Math.max(pontos, base)
        }
      }
    }
    if (pontos === 0) continue
    if (pontos > melhor) { melhor = pontos; vencedores = [c] }
    else if (pontos === melhor) vencedores.push(c)
  }
  if (vencedores.length === 0) return undefined
  if (vencedores.length === 1) return vencedores[0].id

  // Empate: desempata pelo TIPO esperado, e só se sobrar exatamente uma.
  const prefereCartao = a.mencionaCartao || a.movimento === 'compra'
  const tipoPreferido = prefereCartao ? 'cartao' : 'corrente'
  const doTipo = vencedores.filter((c) => c.tipo === tipoPreferido)
  return doTipo.length === 1 ? doTipo[0].id : undefined
}

// --- Provável repetição de agendamento -------------------------------------

/* Item 4 do pedido: o corpus tem o MESMO R$ 80,00 pra FLAVIA duas vezes (o
 * agendamento no dia 14 e a conclusão no dia 15). Só MARCA — nunca descarta
 * nada sozinho, porque nada neste fluxo cria ou apaga lançamento sem o
 * Rafael. Critério: mesmo valor exato, mesma contraparte normalizada, mesmo
 * app de origem, dentro de uma janela de poucos dias. */
/** @deprecated valor de fábrica; o que vale é `janelaRepeticaoDias` dos parâmetros. */
export const JANELA_REPETICAO_DIAS = PARAMETROS_NOTIFICACAO_PADRAO.janelaRepeticaoDias

export function ehProvavelRepeticao(
  a: { valor?: number; contraparte?: string; pacote?: string; recebidoEm: string },
  b: { valor?: number; contraparte?: string; pacote?: string; recebidoEm: string },
  janelaDias: number = PARAMETROS_NOTIFICACAO_PADRAO.janelaRepeticaoDias,
): boolean {
  if (a.valor == null || b.valor == null || Math.abs(a.valor - b.valor) > 0.001) return false
  if ((a.pacote ?? '') !== (b.pacote ?? '')) return false
  const na = normalizarNome(a.contraparte ?? '')
  const nb = normalizarNome(b.contraparte ?? '')
  if (!na || !nb || na !== nb) return false
  const dias = Math.abs(new Date(a.recebidoEm).getTime() - new Date(b.recebidoEm).getTime()) / 86400000
  return dias <= janelaDias
}
