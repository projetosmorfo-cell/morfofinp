/* Parâmetros da leitura de notificação bancária (16/09/2026, build 080).
 *
 * POR QUE ESTE MÓDULO EXISTE
 *
 * Até a build 079 TODA regra da leitura de notificação era constante chumbada
 * dentro de `parseNotificacao.ts`: a janela de 7 dias da detecção de
 * repetição, o "amanhã" que anda 1 dia, o agendado que sugere não-pago, o
 * filtro de propaganda com o seu limiar de marcadores fracos. Rafael pediu
 * que isso virasse parâmetro — "só o que fizer sentido a nível de usuário" no
 * app, e TUDO (inclusive o que é interno) no painel N0.
 *
 * O PRINCÍPIO QUE PASSA A VALER (decisão do Rafael, 16/09/2026, generaliza
 * além de notificação): **parâmetro, configuração e layout são definidos no N0
 * e aplicados localmente em cada instalação; só o DADO de lançamento é
 * privado do cliente.** Este módulo é a primeira implementação dessa direção
 * fora do padrão de categorias.
 *
 * AS TRÊS CAMADAS (a de baixo é o piso, a de cima vence):
 *
 *   1. `PARAMETROS_NOTIFICACAO_PADRAO` — o padrão de fábrica, no código.
 *      Nunca muda em runtime; é o que vale numa instalação onde o N0 nunca
 *      publicou nada.
 *   2. O que o N0 PUBLICOU (`platformN0.parametrosNotificacao`, com `versao`
 *      que sobe a cada salvamento — mesmo mecanismo de `padraoCategorias`).
 *   3. O que o DONO DESTE AMBIENTE personalizou
 *      (`configuracoes.notifParamsPorAmbiente[ambiente]`), parâmetro a
 *      parâmetro.
 *
 * "Restaurar padrão do app", na tela do usuário, apaga a camada 3 — ou seja,
 * volta pro valor que o N0 publica HOJE, nunca pra uma constante congelada no
 * código. Era exatamente o pedido.
 *
 * OS DOIS ESCOPOS DE PUBLICAÇÃO DO N0 (o ponto que o Rafael mais cobrou)
 *
 *   'naoEditados' — vale pra quem nunca personalizou aquele parâmetro e pra
 *                   quem chegar depois. Como a camada 3 só existe pro que a
 *                   pessoa mexeu, isso é automático: o valor publicado passa a
 *                   valer sozinho em todo parâmetro não personalizado.
 *   'todos'       — impõe. Na abertura seguinte do app, `aplicarParametrosN0()`
 *                   APAGA a camada 3 do ambiente (só dos parâmetros que
 *                   vieram na publicação) e registra a versão aplicada, então
 *                   até quem tinha personalizado passa a ver o valor do N0.
 *
 * A personalização é POR PARÂMETRO, de propósito — diferente do padrão de
 * categorias, que é tudo-ou-nada. Um cliente que só mudou a janela de
 * repetição continua recebendo do N0 qualquer melhoria nas outras regras; o
 * que ele escolheu é que fica preservado. Isso é mais previsível que congelar
 * o cliente inteiro por causa de um toque.
 *
 * LIMITE HONESTO, SEM MAQUIAGEM: não existe backend. Uma publicação do N0 só
 * alcança os ambientes que moram NESTE MESMO IndexedDB. `ambientesComParametrosProprios()`
 * devolve só o que é de fato conhecível localmente, e a tela do N0 diz isso
 * com todas as letras. O mecanismo (versão, escopo, marca de aplicado por
 * ambiente) já está escrito do jeito que vai funcionar no dia em que existir
 * servidor — nada aqui precisa ser reescrito, só a origem do `platformN0`.
 *
 * LEITURA SÍNCRONA: `parseNotificacao.ts` continua PURO (recebe os parâmetros
 * por argumento). Quem não quer carregar parâmetro por prop chama
 * `paramsNotificacaoAtuais()`, um cache em memória alimentado por `liveQuery`
 * — o MESMO padrão já usado por `contasCartao.ts` e `hojeSimulado.ts`.
 */
import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { db } from './db'
import { salvarConfiguracaoIcones } from './configuracaoIcones'
import { AMBIENTE_DESTE_APARELHO, ambienteDoBanco } from './ambiente'

export interface ParametrosNotificacao {
  // --- Nível USUÁRIO (aparecem em Configurações → Regras de Notificação Bancária) ---
  /** Janela, em dias, pra considerar duas notificações o MESMO compromisso. */
  janelaRepeticaoDias: number
  /** "está agendada pra amanhã" adianta a data sugerida em 1 dia. */
  deslocarAmanha: boolean
  /** Notificação de transação AGENDADA abre com "já foi pago" desmarcado. */
  agendadoSugereNaoPago: boolean
  /** Liga/desliga o filtro de propaganda. Desligado, nada vai pra Ignoradas. */
  filtroPromocaoAtivo: boolean
  /** Quantos marcadores FRACOS ("acompanhe", "cadastre") barram a notificação. */
  limiarMarcadoresFracos: number
  /* --- A JANELA DE BUSCA DE LANÇAMENTO JÁ PREVISTO (build 081) -------------
   *
   * Até a build 080 isto era UM número: "procurar N dias pra trás" (10). O
   * Rafael reviu e pediu que o padrão passasse a ser **o mês corrente**, com a
   * janela continuando parâmetro pra seguir ajustável. Então o parâmetro
   * deixou de ser um número solto e virou um MODO.
   *
   * SÃO DOIS MODOS, de propósito — nenhum terceiro ganhou lugar:
   *   'mesCorrente'         (padrão) — todo o mês da notificação, do dia 1 ao
   *                         último dia. Cobre inclusive o previsto que está
   *                         alguns dias À FRENTE da notificação dentro do mesmo
   *                         mês, coisa que a janela de "N dias pra trás" só
   *                         pegava por acaso.
   *   'mesCorrenteMaisDias' — o mês inteiro MAIS `janelaBuscaDias` dias antes
   *                         do dia 1, pra quem quer alcançar a virada.
   *
   * Um terceiro modo fixo ("sempre os últimos K meses") foi considerado e
   * REJEITADO: ele resolveria a virada do mês (planejado 30/09, banco debita
   * 02/10) à custa de mostrar candidato velho em toda notificação, todo dia.
   * O caso da virada é raro e pontual, então ele é atendido por uma AÇÃO na
   * hora ("procurar em meses anteriores", ver `mesesAnterioresAoAmpliar`) e
   * não por um padrão mais largo pra todo mundo. O Rafael sabe que
   * 'mesCorrente' sozinho não acha o caso da virada e aceitou, justamente
   * porque a ampliação na hora existe.
   */
  janelaBuscaModo: 'mesCorrente' | 'mesCorrenteMaisDias'
  /** Dias antes do dia 1 do mês, só no modo 'mesCorrenteMaisDias'. */
  janelaBuscaDias: number
  /** Quantos meses pra trás o "procurar em meses anteriores" da tela alcança. */
  mesesAnterioresAoAmpliar: number
  /** Tolerância de valor, em % do valor previsto. */
  toleranciaValorPct: number
  /** Tolerância de valor, em reais (absoluta). */
  toleranciaValorAbs: number
  /** Janela, em MINUTOS, entre as duas notificações de uma transferência. */
  janelaTransferenciaMin: number
  /** Cada confirmação ensina um de/para (texto do banco → categoria/nome/conta). */
  aprenderDePara: boolean
  /** O de/para aprendido é aplicado sozinho na próxima notificação igual. */
  aplicarDeParaAutomaticamente: boolean

  // --- Nível INTERNO (só o N0 edita) ---
  /** Exigir que os DOIS apps casem com conta da Carteira pra propor transferência. */
  transferenciaExigeDuasContas: boolean
  /** Remover LTDA/SA/ME do nome da contraparte. */
  removerSufixoRazaoSocial: boolean
  /** Acima disto o nome capturado é considerado erro de corte e descartado. */
  tamanhoMaximoNome: number
  /** Marcadores FORTES de propaganda — um só já barra a notificação. */
  marcadoresFortes: string[]
  /** Marcadores FRACOS — barram em conjunto (ver `limiarMarcadoresFracos`). */
  marcadoresFracos: string[]
}

/** Chaves que a tela do USUÁRIO pode editar. O resto é só N0. */
export const PARAMETROS_NIVEL_USUARIO = [
  'janelaRepeticaoDias',
  'deslocarAmanha',
  'agendadoSugereNaoPago',
  'filtroPromocaoAtivo',
  'limiarMarcadoresFracos',
  'janelaBuscaModo',
  'janelaBuscaDias',
  'mesesAnterioresAoAmpliar',
  'toleranciaValorPct',
  'toleranciaValorAbs',
  'janelaTransferenciaMin',
  'aprenderDePara',
  'aplicarDeParaAutomaticamente',
] as const satisfies readonly (keyof ParametrosNotificacao)[]

export type ChaveParametroUsuario = (typeof PARAMETROS_NIVEL_USUARIO)[number]

/** As opções do modo da janela de busca, em português de gente (build 081). */
export const OPCOES_JANELA_BUSCA: { valor: ParametrosNotificacao['janelaBuscaModo']; rotulo: string }[] = [
  { valor: 'mesCorrente', rotulo: 'Só no mês da notificação' },
  { valor: 'mesCorrenteMaisDias', rotulo: 'No mês da notificação e alguns dias antes' },
]

/* Os marcadores nasceram como array literal dentro de `parseNotificacao.ts`
   (build 079) — continuam sendo exatamente os mesmos textos, só que agora
   editáveis pelo N0 em vez de só recompiláveis. */
const FORTES_PADRAO = [
  'cupom', '% off', 'desconto', 'promo', 'oferta', 'aproveite', 'contrate', 'simule',
  'saiba mais', 'clique aqui', 'garanta', 'imperd', 'black friday', 'sorteio', 'convide',
  'indique', 'assine j', 'peça já', 'peca ja', 'últimas horas', 'ultimas horas',
]
const FRACOS_PADRAO = [
  'ative o', 'ative a', 'ative sua', 'ative seu', 'cadastre', 'baixe', 'conheça', 'conheca',
  'acompanhe', 'facilite', 'descubra', 'aproveitar', 'novidade', 'atualize o app',
  'experimente', 'confira',
]

export const PARAMETROS_NOTIFICACAO_PADRAO: ParametrosNotificacao = {
  janelaRepeticaoDias: 7,
  deslocarAmanha: true,
  agendadoSugereNaoPago: true,
  filtroPromocaoAtivo: true,
  limiarMarcadoresFracos: 2,
  /* Padrão do Rafael a partir da build 081: o MÊS CORRENTE da notificação,
     inteiro. `janelaBuscaDias` fica guardado com o antigo 10 pra quem trocar
     pro modo com folga não ter que inventar um número. */
  janelaBuscaModo: 'mesCorrente',
  janelaBuscaDias: 10,
  /* 3 meses: o alcance do "procurar em meses anteriores" da tela de
     notificação. Não muda o padrão de ninguém — só o quanto UMA busca
     ampliada à mão enxerga. */
  mesesAnterioresAoAmpliar: 3,
  /* TOLERÂNCIA: percentual E absoluta, o que for MAIOR (ver `dentroDaTolerancia`).
     Só percentual erra nos valores pequenos (5% de R$ 12,00 são 60 centavos —
     o arredondamento de uma conta de luz já estoura); só absoluta erra nos
     valores grandes (R$ 5,00 de folga num aluguel de R$ 2.500 é nada perto da
     variação real de um reajuste). O caso que o Rafael deu — previsto R$ 130,00,
     cobrado R$ 127,82 — passa pelos dois (R$ 2,18 < R$ 5,00 e < 10%). */
  toleranciaValorPct: 10,
  toleranciaValorAbs: 5,
  /* 10 minutos: as duas notificações de uma transferência entre contas
     próprias chegam em segundos; a folga é pro celular que estava sem rede e
     entregou as duas atrasadas. Janela maior aumenta o falso positivo do
     "paguei R$ 500 e recebi R$ 500 na mesma hora". */
  janelaTransferenciaMin: 10,
  aprenderDePara: true,
  aplicarDeParaAutomaticamente: true,
  transferenciaExigeDuasContas: true,
  removerSufixoRazaoSocial: true,
  tamanhoMaximoNome: 60,
  marcadoresFortes: FORTES_PADRAO,
  marcadoresFracos: FRACOS_PADRAO,
}

/** O que o N0 publica: os valores + versão + escopo escolhido no salvamento. */
export type EscopoPublicacao = 'naoEditados' | 'todos'

export interface ParametrosNotificacaoN0 {
  versao: number
  atualizadoEm: string
  escopo: EscopoPublicacao
  valores: Partial<ParametrosNotificacao>
}

// --- Composição das 3 camadas ----------------------------------------------

export function comporParametros(
  publicadoN0: Partial<ParametrosNotificacao> | undefined,
  doAmbiente: Partial<ParametrosNotificacao> | undefined,
): ParametrosNotificacao {
  return { ...PARAMETROS_NOTIFICACAO_PADRAO, ...(publicadoN0 ?? {}), ...(doAmbiente ?? {}) }
}

/** O padrão DO APP hoje = fábrica + o que o N0 publicou (sem a camada do cliente). */
export function padraoDoAppAtual(publicadoN0: Partial<ParametrosNotificacao> | undefined): ParametrosNotificacao {
  return comporParametros(publicadoN0, undefined)
}

// --- Cache síncrono (padrão de `contasCartao.ts`) ---------------------------

let cacheParams: ParametrosNotificacao = PARAMETROS_NOTIFICACAO_PADRAO
let cacheOverrides: Partial<ParametrosNotificacao> = {}

interface ConfigParcial {
  ambienteAtivoId?: string
  notifParamsPorAmbiente?: Record<string, Partial<ParametrosNotificacao>>
  platformN0?: { parametrosNotificacao?: ParametrosNotificacaoN0 }
}

function recalcular(cfg: ConfigParcial | undefined) {
  const amb = cfg?.ambienteAtivoId || AMBIENTE_DESTE_APARELHO
  const overrides = cfg?.notifParamsPorAmbiente?.[amb] ?? {}
  cacheOverrides = overrides
  cacheParams = comporParametros(cfg?.platformN0?.parametrosNotificacao?.valores, overrides)
}

liveQuery(() => db.configuracoes.get(1)).subscribe({
  next: (cfg) => recalcular(cfg as ConfigParcial | undefined),
  error: (e) => { console.error('notificacaoParametros: falha lendo configuração', e) },
})

/** Leitura síncrona dos parâmetros em vigor neste ambiente. */
export function paramsNotificacaoAtuais(): ParametrosNotificacao {
  return cacheParams
}

/** Versão reativa, pra tela que precisa re-renderizar quando alguém muda um parâmetro. */
export function useParamsNotificacao(): { efetivos: ParametrosNotificacao; proprios: Partial<ParametrosNotificacao>; padraoApp: ParametrosNotificacao } {
  const [estado, setEstado] = useState(() => ({ efetivos: cacheParams, proprios: cacheOverrides, padraoApp: PARAMETROS_NOTIFICACAO_PADRAO }))
  useEffect(() => {
    const ins = liveQuery(() => db.configuracoes.get(1)).subscribe({
      next: (c) => {
        const cfg = c as ConfigParcial | undefined
        const amb = cfg?.ambienteAtivoId || AMBIENTE_DESTE_APARELHO
        const publicado = cfg?.platformN0?.parametrosNotificacao?.valores
        const proprios = cfg?.notifParamsPorAmbiente?.[amb] ?? {}
        setEstado({ efetivos: comporParametros(publicado, proprios), proprios, padraoApp: padraoDoAppAtual(publicado) })
      },
      error: () => { /* nunca derruba a tela */ },
    })
    return () => ins.unsubscribe()
  }, [])
  return estado
}

// --- Escrita pelo lado do CLIENTE ------------------------------------------

/** Personaliza UM parâmetro neste ambiente (camada 3). */
export async function definirParametroDoUsuario<K extends ChaveParametroUsuario>(
  chave: K,
  valor: ParametrosNotificacao[K],
): Promise<void> {
  const cfg = await db.configuracoes.get(1)
  const amb = await ambienteDoBanco()
  const mapa = { ...(cfg?.notifParamsPorAmbiente ?? {}) }
  mapa[amb] = { ...(mapa[amb] ?? {}), [chave]: valor }
  await salvarConfiguracaoIcones({ notifParamsPorAmbiente: mapa })
}

/**
 * "Restaurar padrão do app": apaga a camada 3 deste ambiente. O que volta a
 * valer é o que o N0 publica HOJE — nunca uma constante congelada no código
 * (era literalmente o pedido do Rafael).
 */
export async function restaurarPadraoDoApp(): Promise<void> {
  const cfg = await db.configuracoes.get(1)
  const amb = await ambienteDoBanco()
  const mapa = { ...(cfg?.notifParamsPorAmbiente ?? {}) }
  delete mapa[amb]
  await salvarConfiguracaoIcones({ notifParamsPorAmbiente: mapa })
}

/** Este ambiente personalizou alguma coisa? (É o "editou" do padrão de categorias.) */
export function temParametrosProprios(overrides: Partial<ParametrosNotificacao> | undefined): boolean {
  return !!overrides && Object.keys(overrides).length > 0
}

// --- Aplicação da publicação do N0 (roda no mount do App) -------------------

/**
 * Espelho de `aplicarPadraoSeNaoEditado()` do padrão de categorias, pros
 * parâmetros. Nunca lança — falhar aqui não pode impedir o app de abrir.
 *
 * Só faz trabalho de verdade no escopo 'todos': é ele que APAGA a
 * personalização do ambiente pros parâmetros publicados. No escopo
 * 'naoEditados' a composição das camadas já entrega o valor novo sozinha —
 * aqui só fica a marca de versão aplicada, que é o que permite não reaplicar
 * uma imposição duas vezes (senão o cliente nunca mais conseguiria
 * personalizar nada depois de uma publicação 'todos').
 */
export async function aplicarParametrosN0(): Promise<boolean> {
  try {
    const cfg = await db.configuracoes.get(1)
    const pub = (cfg as ConfigParcial | undefined)?.platformN0?.parametrosNotificacao
    if (!pub) return false
    const amb = await ambienteDoBanco()
    const aplicadas = cfg?.notifVersaoPorAmbiente ?? {}
    if ((aplicadas[amb] ?? 0) >= pub.versao) return false

    const patch: Record<string, unknown> = {
      notifVersaoPorAmbiente: { ...aplicadas, [amb]: pub.versao },
    }
    if (pub.escopo === 'todos') {
      const mapa = { ...(cfg?.notifParamsPorAmbiente ?? {}) }
      const proprios = { ...(mapa[amb] ?? {}) }
      for (const k of Object.keys(pub.valores)) delete (proprios as Record<string, unknown>)[k]
      if (Object.keys(proprios).length === 0) delete mapa[amb]
      else mapa[amb] = proprios
      patch.notifParamsPorAmbiente = mapa
    }
    await salvarConfiguracaoIcones(patch)
    return true
  } catch {
    return false
  }
}

/**
 * Quais ambientes DESTE APARELHO personalizaram parâmetros — é o que a tela
 * do N0 lista como "clientes que serão afetados" antes de publicar no escopo
 * 'todos'. Sem servidor, isto é tudo que dá pra saber de verdade, e a tela diz
 * isso; o dia em que existir backend, esta função passa a consultar o
 * servidor e nada mais muda.
 */
export async function ambientesComParametrosProprios(): Promise<{ ambiente: string; chaves: string[] }[]> {
  const cfg = await db.configuracoes.get(1)
  const mapa = cfg?.notifParamsPorAmbiente ?? {}
  return Object.entries(mapa)
    .filter(([, v]) => v && Object.keys(v).length > 0)
    .map(([ambiente, v]) => ({ ambiente, chaves: Object.keys(v) }))
}

// --- Rótulos pra tela -------------------------------------------------------

export const ROTULO_PARAMETRO: Record<keyof ParametrosNotificacao, { titulo: string; ajuda: string }> = {
  janelaRepeticaoDias: { titulo: 'Janela de repetição (dias)', ajuda: 'Duas notificações iguais dentro desta janela contam como o mesmo compromisso — o banco avisa quando agenda e de novo quando conclui.' },
  deslocarAmanha: { titulo: 'Notificação com "amanhã" adianta a data', ajuda: 'Quando o texto diz "amanhã" com todas as letras, a data sugerida anda um dia.' },
  agendadoSugereNaoPago: { titulo: 'Agendado nasce como não pago', ajuda: 'Transação só agendada abre com "já foi pago" desmarcado — ainda não aconteceu.' },
  filtroPromocaoAtivo: { titulo: 'Separar propaganda do banco', ajuda: 'Desligado, tudo que o banco manda cai em Pendentes. Nada é apagado nos dois casos.' },
  limiarMarcadoresFracos: { titulo: 'Sinais fracos pra considerar propaganda', ajuda: 'Quantas expressões de marketing leves precisam aparecer juntas pra mandar a notificação pra Ignoradas.' },
  janelaBuscaModo: { titulo: 'Onde procurar o lançamento já previsto', ajuda: 'Ao confirmar, o app procura um lançamento que já seja esta movimentação, pra vincular em vez de criar outro.' },
  janelaBuscaDias: { titulo: 'Dias a mais antes do mês (só no 2º modo)', ajuda: 'Quantos dias antes do dia 1 também entram na procura.' },
  mesesAnterioresAoAmpliar: { titulo: 'Meses que a procura ampliada alcança', ajuda: 'Alcance do botão "Procurar em meses anteriores" da tela de notificações. Não muda a procura normal.' },
  toleranciaValorPct: { titulo: 'Tolerância de valor (%)', ajuda: 'Diferença de valor, em porcentagem, que ainda conta como o mesmo gasto.' },
  toleranciaValorAbs: { titulo: 'Tolerância de valor (R$)', ajuda: 'A mesma folga, em reais. Vale quem passar na MAIOR das duas.' },
  janelaTransferenciaMin: { titulo: 'Janela da transferência (minutos)', ajuda: 'Duas notificações de mesmo valor e sentidos opostos, dentro desta janela, viram uma proposta de transferência entre suas contas.' },
  aprenderDePara: { titulo: 'Aprender de/para a cada confirmação', ajuda: 'Guarda o texto do banco junto com a categoria, o nome e a conta que você escolheu.' },
  aplicarDeParaAutomaticamente: { titulo: 'Usar o de/para aprendido', ajuda: 'A próxima notificação do mesmo estabelecimento já abre preenchida com o que você ensinou.' },
  transferenciaExigeDuasContas: { titulo: 'Transferência exige as duas contas na Carteira', ajuda: 'Interno: é o sinal que separa transferência entre contas próprias de pagamento a terceiro.' },
  removerSufixoRazaoSocial: { titulo: 'Remover LTDA/SA do nome', ajuda: 'Interno: tira o sufixo de razão social do nome da contraparte.' },
  tamanhoMaximoNome: { titulo: 'Tamanho máximo do nome', ajuda: 'Interno: acima disso o corte falhou e o nome é descartado.' },
  marcadoresFortes: { titulo: 'Marcadores fortes de propaganda', ajuda: 'Interno: um só já manda a notificação pra Ignoradas.' },
  marcadoresFracos: { titulo: 'Marcadores fracos de propaganda', ajuda: 'Interno: barram em conjunto, conforme o limiar.' },
}

/* ---------------------------------------------------------------------------
   O EXEMPLO DE CADA PARÂMETRO (build 085, 16/09/2026)
   ---------------------------------------------------------------------------
   Rafael: *"quero que pra todos os parâmetros criados tanto visíveis no N1
   como no N0, tenha uma breve e rápido texto de explicação, com exemplos, mas
   sem extender muito"*.

   Duas regras que valem pra todo texto de parâmetro deste projeto:

   1. O exemplo usa o VALOR EM VIGOR, não o padrão de fábrica. Quem trocou a
      janela de 7 pra 3 dias lê o exemplo com 3 — senão o texto explica o app
      de outra pessoa. Por isso é função do valor, e não string fixa.
   2. Descreve o EFEITO PRÁTICO, nunca o mecanismo. "Uma cobrança repetida no
      dia 14 e concluída no dia 15 é marcada como possível repetição", não
      "o comparador de janela desloca o limite inferior".

   Uma linha por parâmetro, sempre. Exemplo que precisa de duas frases é
   sinal de parâmetro mal nomeado, não de exemplo bom.
   ------------------------------------------------------------------------ */

const num = (v: unknown) => Math.round(Number(v) || 0)
const reais = (v: unknown) => `R$ ${(Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const EXEMPLO_PARAMETRO: Partial<Record<keyof ParametrosNotificacao, (valor: unknown) => string>> = {
  janelaRepeticaoDias: (v) => `Com ${num(v)} dias, uma cobrança repetida no dia 14 e concluída no dia 15 é marcada como possível repetição.`,
  deslocarAmanha: (v) => (v
    ? 'Aviso do dia 10 dizendo "vence amanhã" sugere a data 11.'
    : 'Aviso do dia 10 dizendo "vence amanhã" continua sugerindo a data 10.'),
  agendadoSugereNaoPago: (v) => (v
    ? '"Pix agendado para o dia 5" entra como previsto, não como pago.'
    : '"Pix agendado para o dia 5" já entra marcado como pago.'),
  filtroPromocaoAtivo: (v) => (v
    ? '"Aproveite 30% off no seguro" vai pra Ignoradas; a cobrança do seguro, não.'
    : '"Aproveite 30% off no seguro" fica em Pendentes junto com as cobranças.'),
  limiarMarcadoresFracos: (v) => (num(v) <= 1
    ? 'Com 1, "confira" sozinho já manda a notificação pra Ignoradas.'
    : `Com ${num(v)}, precisam aparecer ${num(v)} expressões no mesmo texto ("confira" e "conheça", por exemplo) — uma sozinha não barra.`),
  janelaBuscaModo: (v) => (v === 'mesCorrente'
    ? 'Notificação do dia 20/03 procura de 01/03 a 31/03.'
    : 'Notificação do dia 20/03 procura de 01/03 a 31/03 e ainda alguns dias antes.'),
  janelaBuscaDias: (v) => `Com ${num(v)} dias, a procura de março começa ${num(v)} dias antes do dia 1 — alcança a conta do fim de fevereiro que o banco só debitou agora.`,
  mesesAnterioresAoAmpliar: (v) => `Com ${num(v)}, a procura ampliada em março chega até ${num(v)} ${num(v) === 1 ? 'mês' : 'meses'} atrás.`,
  toleranciaValorPct: (v) => `Com ${num(v)}%, previsto R$ 130,00 e cobrado R$ 127,82 continuam sendo a mesma conta.`,
  toleranciaValorAbs: (v) => `Com ${reais(v)}, previsto R$ 12,00 e cobrado R$ 15,00 ainda casam — só a porcentagem não daria conta de valor pequeno.`,
  janelaTransferenciaMin: (v) => `Com ${num(v)} minutos, saída às 9h02 e entrada às 9h05 viram uma proposta de transferência; às 9h40, não.`,
  aprenderDePara: (v) => (v
    ? 'Confirmar "PAG*PJBANK" como "PJ Bank", em Serviços, ensina esse par.'
    : 'Nada é guardado: toda notificação de "PAG*PJBANK" abre em branco.'),
  aplicarDeParaAutomaticamente: (v) => (v
    ? 'A próxima "PAG*PJBANK" já abre como "PJ Bank", em Serviços.'
    : 'O aprendido fica guardado, mas cada notificação abre em branco.'),
  transferenciaExigeDuasContas: (v) => (v
    ? 'Bradesco → C6 vira proposta; Bradesco → app que não é conta sua, não.'
    : 'Bradesco → qualquer app de mesmo valor e sentido oposto vira proposta.'),
  removerSufixoRazaoSocial: (v) => (v
    ? '"PADARIA CENTRAL LTDA" vira "Padaria Central".'
    : '"PADARIA CENTRAL LTDA" entra com o LTDA no nome.'),
  tamanhoMaximoNome: (v) => `Com ${num(v)} caracteres, um "nome" que na verdade é a frase inteira da notificação é descartado.`,
  marcadoresFortes: () => 'Basta "cupom" aparecer no texto pra notificação ir pra Ignoradas.',
  marcadoresFracos: () => 'Sozinho, "acompanhe" não barra nada; junto de outro, conta pro limiar acima.',
}

/**
 * O exemplo do parâmetro, já escrito com o valor que está em vigor.
 * Devolve `undefined` quando o parâmetro não tem exemplo (nenhum hoje) —
 * a tela simplesmente não desenha a linha.
 */
export function exemploDoParametro(chave: keyof ParametrosNotificacao, valor: unknown): string | undefined {
  return EXEMPLO_PARAMETRO[chave]?.(valor)
}
