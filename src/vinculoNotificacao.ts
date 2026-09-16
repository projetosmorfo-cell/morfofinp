/* Vínculo de notificação com lançamento JÁ EXISTENTE, e o de/para aprendido
 * (16/09/2026, build 080 — fase 3 do pedido do Rafael).
 *
 * O DEFEITO QUE ISTO CORRIGE. Até a build 079 o fluxo de notificação tinha uma
 * porta só: "Confirmar" abria o formulário de lançamento NOVO. Quem já tinha o
 * gasto previsto — uma conta fixa gerada pela recorrência, uma parcela de uma
 * compra em 6× — confirmava a notificação e ficava com DOIS lançamentos do
 * mesmo dinheiro. O previsto continuava lá, em aberto, e o real entrava do
 * lado. Tudo que depende de "já aconteceu" (a meta do mês, o Saldo Livre, a
 * tarja de pendências) passava a contar duas vezes.
 *
 * A REGRA DE CASAMENTO É A JÁ DOCUMENTADA NO PROJETO, e não se negocia:
 * **data + valor + conta**. Texto NUNCA casa sozinho — entra só como critério
 * de DESEMPATE na ordenação, quando mais de um candidato passou pelos três.
 * É a mesma "regra dura" registrada em `Modelo de Dados.md`/`Processo de
 * Conciliação.md` e citada no comentário de `descricaoOriginal` (`db.ts`):
 * o extrato/notificação traz o texto do banco, o lançamento traz o apelido que
 * a pessoa deu, e casar por texto quebraria no primeiro renome.
 *
 * TOLERÂNCIA DE VALOR: PERCENTUAL **E** ABSOLUTA, VALENDO A MAIOR DAS DUAS.
 * Só percentual erra nos valores pequenos (5% de R$ 12,00 são 60 centavos — o
 * arredondamento de uma conta de luz já estoura). Só absoluta erra nos valores
 * grandes (R$ 5,00 de folga num aluguel de R$ 2.500 é nada perto da variação
 * de um reajuste). O caso que o Rafael deu — previsto R$ 130,00, cobrado
 * R$ 127,82 — passa pelos dois. Os dois números são parâmetro
 * (`toleranciaValorPct`/`toleranciaValorAbs`), e zerar um deles desliga aquele
 * lado sem desligar o outro.
 *
 * O QUE O VÍNCULO FAZ NO LANÇAMENTO EXISTENTE:
 *   • grava o VALOR REAL (preservando o sinal que o lançamento já tinha — o
 *     previsto R$ 130,00 de saída vira R$ 127,82 de saída, nunca de entrada);
 *   • marca que ACONTECEU, respeitando a regra do cartão da build 064: em
 *     conta corrente/cofre `pago: true`; em CARTÃO o `pago` continua `false`,
 *     porque quem liquida compra de cartão é a fatura, e marcar aqui faria a
 *     compra sumir da fatura em aberto. O status "No cartão" já é derivado da
 *     conta + data por `statusDoLancamento()`;
 *   • **grava a DATA DA NOTIFICAÇÃO nas duas datas do lançamento**
 *     (`dataCompetencia` e `dataCaixa`, sempre iguais) — ver abaixo;
 *   • grava `vinculoOrigem` (fase 2) com o texto cru, o app e a hora;
 *   • **nunca toca em `descricaoOriginal`** — ele é imutável (Decisão 24) e é
 *     o snapshot da criação daquele lançamento. O texto do banco entra como
 *     dado de vínculo, que é onde ele pertence.
 *
 * POR QUE AS DUAS DATAS ANDAM JUNTAS (build 081 — REVERSÃO da decisão da 080).
 * A build 080 decidiu que o vínculo mexia só em `dataCaixa` e preservava
 * `dataCompetencia`, "porque o mês de direito do gasto é o que a pessoa
 * planejou". Essa decisão protegia uma distinção que o produto NÃO TEM. A
 * medição, feita antes de reverter: `dataCaixa` aparece 25 vezes em `src/`, e
 * **24 delas são escrita** — a 25ª é a declaração do campo em `db.ts`. Nenhuma
 * tela, nenhum total, nenhum filtro e nenhum cálculo LÊ esse campo em lugar
 * nenhum: tudo que o Rafael vê na tela sai de `dataCompetencia`. Guardar a
 * competência "protegia" o mês de um lançamento que, na prática, ficava com a
 * data errada e nenhum ganho. Todos os outros 23 pontos de escrita do app
 * gravam as duas datas IGUAIS — o vínculo era o único divergente.
 *
 * A regra a partir daqui, que é como o Rafael trabalha de fato (a alternativa
 * dele era editar a data na mão, ou apagar e relançar no mês certo):
 * **vincular põe a data da notificação nas duas datas.** Um lançamento
 * planejado pra 30/09 e debitado em 02/10 SAI de setembro e ENTRA em outubro,
 * e os dois meses passam a fechar pelo que de fato aconteceu. O campo
 * `dataCaixa` continua sendo gravado (pode servir à conciliação bancária
 * futura), mas deixou de ser conceito de produto: não existe UI pra ele.
 *
 * O QUE A MUDANÇA DE MÊS NÃO PODE QUEBRAR. Um lançamento que muda de mês
 * carrega série, numeração de parcela e vínculo de fatura. Três cuidados:
 *   • SÉRIE FIXA — o gerador de recorrência ancora o ritmo na ÚLTIMA
 *     ocorrência da série (`recorrencia.ts`). Se o 30/09 virasse 02/10 sem
 *     mais nada, a próxima ocorrência sairia de outubro e o mês de outubro
 *     ficaria SEM a conta. Por isso o vínculo guarda
 *     `vinculoOrigem.dataCompetenciaAnterior`, e o gerador usa essa data como
 *     ritmo (o FATO andou; o PLANO não). Nada é órfão e nada é duplicado.
 *   • PARCELA — `parcelaI`/`parcelaN` não dependem de data; mudar o mês de uma
 *     parcela não renumera nem some com as irmãs.
 *   • FATURA — lançamento já quitado por uma fatura (`faturaId` preenchido)
 *     NÃO é candidato: ele já foi liquidado em bloco, e movê-lo mudaria a
 *     composição de uma fatura fechada. Mesma família de exclusão da perna de
 *     transferência e do já-vinculado.
 *
 * A JANELA DE BUSCA (build 081). Deixou de ser "N dias pra trás" e virou um
 * MODO do parâmetro (`janelaBuscaModo`, ver `notificacaoParametros.ts`): o
 * padrão é **o mês da notificação, inteiro**. Quem quiser alcançar a virada
 * do mês tem o modo com folga de dias — e, na tela, a ação "procurar em meses
 * anteriores", que amplia só AQUELA busca sem mudar o padrão de ninguém.
 *
 * A ORDEM DOS CANDIDATOS (build 081). Primeiro o que AINDA NÃO ACONTECEU
 * (a pagar, a receber, atrasado), depois o que JÁ ACONTECEU (pago, recebido e
 * **compra no cartão** — build 064: a compra aconteceu mesmo com a fatura em
 * aberto). Quem está em aberto é quase sempre o alvo do vínculo; o já
 * realizado fica embaixo, mas continua visível porque o vínculo também serve
 * pra corrigir valor de coisa já baixada. Dentro de cada grupo vale a
 * relevância de sempre: data, valor, e o texto só desempatando.
 *
 * DESVINCULAR (build 081). O que faltava não era EDITAR os dados de origem —
 * eles seguem read-only, porque o valor deles é serem o registro não editado
 * do que o banco disse — e sim DESFAZER o vínculo errado. Ver
 * `desvincularLancamento()` no fim deste arquivo: apaga `vinculoOrigem`,
 * devolve a notificação pra Pendentes e NÃO mexe em valor, `pago` nem data.
 *
 * O DE/PARA APRENDIDO. Cada confirmação (vincular OU criar) ensina "quando
 * vier ESTE texto do banco, é ESTA categoria, com ESTE nome, nesta conta".
 * É o ativo que o Rafael quer administrar — por isso mora numa tabela própria
 * (`db.aprendizadosNotificacao`), com tela de listar/editar/apagar, e não num
 * heurístico escondido. Ele subsume o "corrigi PJBANK pra PJ Bank uma vez e
 * passou a valer", e é o que vai fazer a importação de extrato casar sozinha
 * depois. A chave é `normalizarNome()` de `dados/instituicoes.ts` — o MESMO
 * normalizador do parser e do casamento de instituição; não existe um terceiro
 * no projeto, de propósito.
 */
import { db, type Conta, type Lancamento, type NotificacaoPendente, type AprendizadoNotificacao } from './db'
import { normalizarNome } from './dados/instituicoes'
import { analisarNotificacao, type NotificacaoAnalisada } from './parseNotificacao'
import { paramsNotificacaoAtuais, type ParametrosNotificacao } from './notificacaoParametros'
import { statusDoLancamento, jaAconteceu, ROTULO_STATUS, CLASSE_STATUS, type StatusPagamento } from './statusPagamento'
import { doAmbiente, marcaDoAmbiente, ambienteDoBanco } from './ambiente'

// --- Tolerância -------------------------------------------------------------

/** A folga aceita entre o valor previsto e o valor cobrado. */
export function folgaDeValor(previsto: number, p: ParametrosNotificacao): number {
  return Math.max((Math.abs(previsto) * p.toleranciaValorPct) / 100, p.toleranciaValorAbs)
}

export function dentroDaTolerancia(previsto: number, real: number, p: ParametrosNotificacao): boolean {
  return Math.abs(Math.abs(previsto) - Math.abs(real)) <= folgaDeValor(previsto, p) + 0.0001
}

// --- Busca de candidatos ----------------------------------------------------

export interface CandidatoVinculo {
  lancamento: Lancamento
  /** Diferença absoluta de valor, em reais. */
  difValor: number
  /** Distância em dias entre a data do lançamento e a da notificação. */
  difDias: number
  /** 0 = nenhuma semelhança de texto; 2 = nome igual normalizado. */
  pontosTexto: number
  /** Situação derivada (`statusPagamento.ts`) — nunca guardada no lançamento. */
  status: StatusPagamento
  /** 0 = ainda não aconteceu (a pagar/a receber/atrasado); 1 = já aconteceu. */
  grupo: 0 | 1
}

/** Os dois grupos do item 4, na ordem em que a tela mostra. */
export const ROTULO_GRUPO_CANDIDATO: Record<0 | 1, string> = {
  0: 'Em aberto e atrasados',
  1: 'Já pagos ou recebidos',
}

export { ROTULO_STATUS, CLASSE_STATUS }

// --- A janela de busca (build 081) ---------------------------------------

/** O intervalo de datas em que um candidato pode estar, inclusive nas pontas. */
export interface JanelaBusca {
  de: string
  ate: string
  /** Como a tela descreve a janela pra quem está olhando. */
  rotulo: string
}

function primeiroDiaDoMes(iso: string): string {
  return iso.slice(0, 7) + '-01'
}

function ultimoDiaDoMes(iso: string): string {
  const ano = Number(iso.slice(0, 4))
  const mes = Number(iso.slice(5, 7))
  const d = new Date(ano, mes, 0) // dia 0 do mês seguinte = último deste
  return `${ano}-${String(mes).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function somarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function recuarMeses(iso: string, meses: number): string {
  const ano = Number(iso.slice(0, 4))
  const mes = Number(iso.slice(5, 7))
  const d = new Date(ano, mes - 1 - meses, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * A janela PADRÃO — a que vale sem ninguém pedir nada. Sempre termina no
 * último dia do mês da notificação: um previsto que está alguns dias À FRENTE
 * dentro do mesmo mês continua sendo candidato (a janela antiga de "N dias pra
 * trás" só o pegava por acaso, porque media distância absoluta).
 */
export function janelaPadrao(dataNotificacaoISO: string, p: ParametrosNotificacao): JanelaBusca {
  const dia = soData(dataNotificacaoISO)
  const ate = ultimoDiaDoMes(dia)
  if (p.janelaBuscaModo === 'mesCorrenteMaisDias' && p.janelaBuscaDias > 0) {
    return {
      de: somarDias(primeiroDiaDoMes(dia), -p.janelaBuscaDias),
      ate,
      rotulo: `mês da notificação + ${p.janelaBuscaDias} dia(s) antes`,
    }
  }
  return { de: primeiroDiaDoMes(dia), ate, rotulo: 'mês da notificação' }
}

/**
 * A janela AMPLIADA — a ação "procurar em meses anteriores" da tela. Não muda
 * parâmetro nenhum: vale só pra aquela busca, naquele momento. `mesesAtras` é
 * quantos meses antes do mês da notificação entram.
 */
export function janelaAmpliada(
  dataNotificacaoISO: string,
  p: ParametrosNotificacao,
  mesesAtras: number = p.mesesAnterioresAoAmpliar,
): JanelaBusca {
  const dia = soData(dataNotificacaoISO)
  const meses = Math.max(1, Math.min(mesesAtras, Math.max(1, p.mesesAnterioresAoAmpliar)))
  return {
    de: recuarMeses(dia, meses),
    ate: ultimoDiaDoMes(dia),
    rotulo: meses === 1 ? 'mês anterior também' : `${meses} meses anteriores também`,
  }
}

function soData(iso: string): string {
  return iso.slice(0, 10)
}

function diasEntre(a: string, b: string): number {
  return Math.abs(new Date(a + 'T12:00:00').getTime() - new Date(b + 'T12:00:00').getTime()) / 86400000
}

/**
 * Lançamentos que PODEM ser esta movimentação, já ordenados do mais provável
 * pro menos. Os três critérios duros (data, valor, conta) são FILTRO; o texto
 * só ordena o que sobrou.
 *
 * `contaId` ausente (a notificação não casou com conta nenhuma da Carteira)
 * afrouxa só o critério de conta — data e valor continuam valendo, e a tela
 * avisa que o candidato é de outra conta.
 */
export function buscarCandidatos(
  analise: Pick<NotificacaoAnalisada, 'valor' | 'contraparte' | 'tipo'>,
  dataNotificacaoISO: string,
  contaId: number | undefined,
  lancamentos: Lancamento[],
  p: ParametrosNotificacao,
  janela: JanelaBusca = janelaPadrao(dataNotificacaoISO, p),
): CandidatoVinculo[] {
  if (analise.valor == null) return []
  const dataRef = soData(dataNotificacaoISO)
  const nomeNotif = normalizarNome(analise.contraparte ?? '')
  const sinalEsperado = analise.tipo === 'entrada' ? 1 : -1

  const saida: CandidatoVinculo[] = []
  for (const l of lancamentos) {
    if (l.id == null) continue
    /* Uma perna de transferência nunca é candidata: ela é metade de um par, e
       trocar o valor de um lado só deixaria a transferência manca. */
    if (l.transferenciaId) continue
    /* Já vinculado a outra notificação — vincular de novo seria sobrescrever o
       vínculo anterior sem ninguém pedir. */
    if (l.vinculoOrigem?.notificacaoId != null) continue
    /* Já quitado em bloco por uma fatura de cartão: mexer na data dele mudaria
       a composição de uma fatura FECHADA. Mesma família das duas exclusões
       acima — ver o cabeçalho deste arquivo. */
    if (l.faturaId != null) continue
    // Sinal: dinheiro que entrou não casa com lançamento de saída.
    if (Math.sign(l.valor) !== sinalEsperado) continue
    if (contaId != null && l.contaId !== contaId) continue

    /* A JANELA é intervalo de datas, não distância absoluta (build 081). */
    if (l.dataCompetencia < janela.de || l.dataCompetencia > janela.ate) continue
    const difDias = diasEntre(l.dataCompetencia, dataRef)
    if (!dentroDaTolerancia(l.valor, analise.valor, p)) continue

    const nomeLanc = normalizarNome(l.descricao ?? '')
    const nomeOriginal = normalizarNome(l.descricaoOriginal ?? '')
    let pontosTexto = 0
    if (nomeNotif.length >= 3) {
      if (nomeLanc === nomeNotif || nomeOriginal === nomeNotif) pontosTexto = 2
      else if (
        (nomeLanc.length >= 4 && (nomeLanc.includes(nomeNotif) || nomeNotif.includes(nomeLanc))) ||
        (nomeOriginal.length >= 4 && (nomeOriginal.includes(nomeNotif) || nomeNotif.includes(nomeOriginal)))
      ) {
        pontosTexto = 1
      }
    }
    const status = statusDoLancamento(l)
    saida.push({
      lancamento: l,
      difValor: Math.abs(Math.abs(l.valor) - Math.abs(analise.valor)),
      difDias,
      pontosTexto,
      status,
      /* `jaAconteceu` já trata a compra de CARTÃO como acontecida (build 064),
         mesmo com a fatura em aberto — é o que o Rafael pediu no item 4. */
      grupo: jaAconteceu(l) ? 1 : 0,
    })
  }

  /* Ordenação: primeiro a SITUAÇÃO (em aberto e atrasado antes do que já
     aconteceu — build 081, item 4 do Rafael), e DENTRO de cada grupo a
     relevância de sempre: data (o mais forte dos três critérios duros), depois
     valor, e o TEXTO só desempatando o que ficou igual. */
  saida.sort(
    (a, b) =>
      a.grupo - b.grupo ||
      a.difDias - b.difDias ||
      a.difValor - b.difValor ||
      b.pontosTexto - a.pontosTexto ||
      (a.lancamento.id ?? 0) - (b.lancamento.id ?? 0),
  )
  return saida
}

/** Conveniência: lê os lançamentos do ambiente e busca. */
export async function buscarCandidatosNoBanco(
  n: NotificacaoPendente,
  contaId: number | undefined,
  p: ParametrosNotificacao = paramsNotificacaoAtuais(),
  janela?: JanelaBusca,
): Promise<CandidatoVinculo[]> {
  const amb = await ambienteDoBanco()
  const lancamentos = doAmbiente(await db.lancamentos.toArray(), amb)
  return buscarCandidatos(
    analisarNotificacao(n, p),
    n.recebidoEm,
    contaId,
    lancamentos,
    p,
    janela ?? janelaPadrao(n.recebidoEm, p),
  )
}

// --- Vincular ---------------------------------------------------------------

export interface ResultadoVinculo {
  lancamentoId: number
  valorAnterior: number
  valorNovo: number
  marcouComoPago: boolean
  /** Competência que o lançamento tinha antes do vínculo. */
  dataAnterior: string
  /** Competência (= data de caixa) depois do vínculo: a data da notificação. */
  dataNova: string
  /** O lançamento mudou de MÊS? É o que a tela avisa em letras grandes. */
  mudouDeMes: boolean
}

/**
 * Liga a notificação a um lançamento que já existe. Nunca cria lançamento
 * nenhum — é justamente o ponto.
 */
export async function vincularNotificacaoALancamento(
  n: NotificacaoPendente,
  lancamentoId: number,
  contasCartao: ReadonlySet<number>,
  p: ParametrosNotificacao = paramsNotificacaoAtuais(),
): Promise<ResultadoVinculo> {
  const a = analisarNotificacao(n, p)
  const l = await db.lancamentos.get(lancamentoId)
  if (!l) throw new Error('Lançamento não encontrado')

  const sinal = l.valor < 0 ? -1 : 1
  const valorNovo = a.valor != null ? sinal * Math.abs(a.valor) : l.valor
  /* Build 064: em cartão quem liquida é a FATURA, não a compra. Marcar `pago`
     aqui tiraria a compra da fatura em aberto — o status "No cartão" já sai da
     conta + data. */
  const ehCartao = contasCartao.has(l.contaId)
  const marcouComoPago = !ehCartao

  /* BUILD 081 — as DUAS datas recebem a data da notificação, sempre iguais.
     Reverte a decisão da build 080 (só `dataCaixa`); o porquê está no cabeçalho
     deste arquivo, com a medição que derrubou a premissa. */
  const dataNova = soData(n.recebidoEm)
  const dataAnterior = l.dataCompetencia
  const mudouDeMes = dataAnterior.slice(0, 7) !== dataNova.slice(0, 7)

  await db.lancamentos.update(lancamentoId, {
    valor: valorNovo,
    ...(marcouComoPago ? { pago: true } : {}),
    dataCompetencia: dataNova,
    dataCaixa: dataNova,
    vinculoOrigem: {
      origem: 'notificacao',
      notificacaoId: n.id,
      app: n.app,
      pacote: n.pacote,
      textoCru: [n.titulo, n.texto].filter(Boolean).join(' — '),
      recebidoEm: n.recebidoEm,
      vinculadoEm: new Date().toISOString(),
      vinculadoAExistente: true,
      valorAnterior: l.valor,
      /* A competência PLANEJADA. É ela que o gerador de série fixa usa como
         ritmo (`recorrencia.ts`), pra o mês de origem não ficar sem a conta
         nem ganhar uma duplicada quando o lançamento muda de mês. */
      dataCompetenciaAnterior: dataAnterior,
    },
  })
  if (n.id != null) {
    await db.notificacoesPendentes.update(n.id, { status: 'confirmada', lancamentoId })
  }
  return { lancamentoId, valorAnterior: l.valor, valorNovo, marcouComoPago, dataAnterior, dataNova, mudouDeMes }
}

// --- Desvincular (build 081, item 5) ---------------------------------------

export interface ResultadoDesvinculo {
  /** A notificação voltou pra Pendentes? (falso quando ela já não existe mais.) */
  voltouParaPendentes: boolean
}

/**
 * DESFAZ o vínculo: é o "vinculei no lançamento errado" do Rafael.
 *
 * O QUE ELE FAZ: apaga `vinculoOrigem` do lançamento e devolve a notificação
 * pra **Pendentes** (limpando o back-link `lancamentoId`), pra ela poder ser
 * confirmada de novo — no lançamento certo, ou como lançamento novo.
 *
 * O QUE ELE **NÃO** FAZ, DE PROPÓSITO: não desfaz o VALOR, nem o `pago`, nem a
 * DATA que o vínculo tinha gravado. Desvincular é sobre o VÍNCULO; reverter
 * dinheiro em silêncio surpreenderia — o lançamento continua com os números
 * que estão lá, e quem quiser mudá-los edita o formulário, que está aberto na
 * frente da pessoa. O painel diz isso em uma linha, na tela, pra ninguém
 * descobrir depois.
 *
 * Os campos de ORIGEM (nome original, texto cru, app) continuam READ-ONLY —
 * decisão desta rodada. O valor deles é serem o registro NÃO EDITADO do que o
 * banco disse: é isso que os torna âncora confiável da conciliação bancária
 * futura. O que a pessoa legitimamente quer corrigir já é editável em outro
 * lugar: a descrição do próprio lançamento e a tabela de de/para.
 */
export async function desvincularLancamento(lancamentoId: number): Promise<ResultadoDesvinculo> {
  const l = await db.lancamentos.get(lancamentoId)
  if (!l?.vinculoOrigem) return { voltouParaPendentes: false }
  const notificacaoId = l.vinculoOrigem.notificacaoId
  /* `Dexie.update()` com `undefined` APAGA a propriedade — aqui isso é
     exatamente o que se quer (o campo é opcional e deve sumir, não virar um
     objeto vazio). Ver a nota da build 062 em `salvarAprendizado`. */
  await db.lancamentos.update(lancamentoId, { vinculoOrigem: undefined })
  if (notificacaoId == null) return { voltouParaPendentes: false }
  const n = await db.notificacoesPendentes.get(notificacaoId)
  if (!n) return { voltouParaPendentes: false }
  await db.notificacoesPendentes.update(notificacaoId, { status: 'pendente', lancamentoId: undefined })
  return { voltouParaPendentes: true }
}

// --- De/para aprendido ------------------------------------------------------

/** A chave de um aprendizado de texto: o nome da contraparte normalizado. */
export function chaveDePara(contraparte: string | undefined): string {
  return normalizarNome(contraparte ?? '')
}

/**
 * Ensina (ou reforça) o de/para. Chamado nas DUAS confirmações — vincular a um
 * existente e criar novo —, porque nos dois casos a pessoa acabou de dizer o
 * que aquele texto significa. Só grava quando há chave (nome reconhecido) e
 * algo a ensinar (categoria, descrição ou conta).
 */
export async function ensinarDePara(entrada: {
  contraparte?: string
  rotulo?: string
  descricao?: string
  categoriaId?: number
  contaId?: number
}): Promise<AprendizadoNotificacao | undefined> {
  const chave = chaveDePara(entrada.contraparte)
  if (!chave) return undefined
  if (entrada.categoriaId == null && !entrada.descricao && entrada.contaId == null) return undefined
  const agora = new Date().toISOString()
  const amb = await ambienteDoBanco()
  const existentes = doAmbiente(await db.aprendizadosNotificacao.where('chave').equals(chave).toArray(), amb)
  const existente = existentes.find((x) => x.tipo === 'texto')
  if (existente?.id != null) {
    const atualizado: AprendizadoNotificacao = {
      ...existente,
      rotulo: entrada.rotulo ?? existente.rotulo,
      descricao: entrada.descricao ?? existente.descricao,
      categoriaId: entrada.categoriaId ?? existente.categoriaId,
      contaId: entrada.contaId ?? existente.contaId,
      vezes: existente.vezes + 1,
      atualizadoEm: agora,
    }
    await db.aprendizadosNotificacao.update(existente.id, atualizado)
    return atualizado
  }
  const novo: AprendizadoNotificacao = {
    ...marcaDoAmbiente(amb),
    tipo: 'texto',
    chave,
    rotulo: entrada.rotulo ?? entrada.contraparte ?? chave,
    descricao: entrada.descricao,
    categoriaId: entrada.categoriaId,
    contaId: entrada.contaId,
    vezes: 1,
    criadoEm: agora,
    atualizadoEm: agora,
  }
  const id = await db.aprendizadosNotificacao.add(novo)
  return { ...novo, id }
}

/** O que já foi aprendido sobre este texto (sem tocar no banco de novo). */
export function acharDePara(
  contraparte: string | undefined,
  aprendizados: AprendizadoNotificacao[],
): AprendizadoNotificacao | undefined {
  const chave = chaveDePara(contraparte)
  if (!chave) return undefined
  return aprendizados.find((a) => a.tipo === 'texto' && a.chave === chave)
}

export async function apagarAprendizado(id: number): Promise<void> {
  await db.aprendizadosNotificacao.delete(id)
}

export async function salvarAprendizado(id: number, patch: Partial<AprendizadoNotificacao>): Promise<void> {
  /* `Dexie.update()` com `undefined` APAGA a propriedade (bug real da build
     062) — por isso o patch é montado chave a chave pela tela, e aqui só o que
     veio é escrito, mais o carimbo. */
  await db.aprendizadosNotificacao.update(id, { ...patch, atualizadoEm: new Date().toISOString() })
}

/** Nome bonito de um lançamento pra tela de escolha. */
export function resumoCandidato(c: CandidatoVinculo, contas: Conta[]): string {
  const conta = contas.find((x) => x.id === c.lancamento.contaId)
  const dia = c.lancamento.dataCompetencia.slice(8, 10) + '/' + c.lancamento.dataCompetencia.slice(5, 7)
  return `${dia} · ${c.lancamento.descricao}${conta ? ` · ${conta.nome}` : ''}`
}
