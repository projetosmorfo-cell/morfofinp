/* As DUAS notificações de uma transferência entre contas próprias
 * (16/09/2026, build 080 — fase 4 do pedido do Rafael).
 *
 * O PROBLEMA. Quando o Rafael move dinheiro do Bradesco pro C6, os dois apps
 * notificam: o de origem diz que saiu, o de destino diz que entrou. São dois
 * textos, redações diferentes, e UMA transação só. Confirmadas uma a uma,
 * viram dois lançamentos soltos — e o app passa a achar que ele gastou R$ 500
 * e recebeu R$ 500, inflando Entrou e Saiu ao mesmo tempo (o mesmo efeito que
 * a exclusão por `transferenciaId` já evita no resto do app desde 31/08).
 *
 * OS QUATRO SINAIS, e por que o último é o que decide:
 *   1. mesmo valor absoluto (dentro da mesma tolerância do vínculo, fase 3);
 *   2. sentidos OPOSTOS (uma entrada e uma saída);
 *   3. dentro de uma janela de MINUTOS (`janelaTransferenciaMin`) — as duas
 *      chegam em segundos; a folga é pro celular que estava sem rede;
 *   4. os DOIS apps casando com conta cadastrada na Carteira desta pessoa, e
 *      contas DIFERENTES.
 *
 * O sinal 4 é o forte, e é ele que separa transferência entre contas próprias
 * de pagamento a terceiro: um pagamento notifica UM lado só — o outro lado da
 * transação é o banco de outra pessoa, que não está na Carteira dela. Por isso
 * ele é exigido por padrão (`transferenciaExigeDuasContas`, parâmetro do N0).
 *
 * MESMO ASSIM, NUNCA AUTOMÁTICO. O falso positivo é real e nada exótico: pagar
 * um boleto de R$ 500 pelo Bradesco enquanto um cliente deposita R$ 500 no C6,
 * no mesmo minuto, bate nos quatro critérios. Então isto é sempre uma
 * SUGESTÃO, mostrando os dois textos crus lado a lado pra pessoa julgar — e é
 * ela quem confirma. Mesma regra de todo este fluxo desde a concepção: nada
 * vira lançamento sozinho.
 *
 * NOME. Numa transferência entre contas próprias a contraparte é a própria
 * pessoa — inútil como descrição ("Rafael Barros" não diz nada). Então o nome
 * é montado das CONTAS: "Transferência Bradesco → C6".
 *
 * APRENDIZADO LEVE E INSPECIONÁVEL. Ao confirmar, o PAR DE APPS vira uma linha
 * na tabela `aprendizadosNotificacao` (tipo `parTransferencia`), visível e
 * apagável na mesma tela do de/para. Ela não decide nada sozinha: só faz a
 * sugestão aparecer com mais destaque ("você já confirmou este par antes").
 * Nunca é caixa-preta — é uma linha que o Rafael lê e apaga se quiser.
 */
import { db, type Conta, type NotificacaoPendente, type AprendizadoNotificacao } from './db'
import { analisarNotificacao, casarContaDaNotificacao } from './parseNotificacao'
import { paramsNotificacaoAtuais, type ParametrosNotificacao } from './notificacaoParametros'
import { dentroDaTolerancia } from './vinculoNotificacao'
import { gerarIdSerie } from './recorrencia'
import { marcaDoAmbiente, ambienteDoBanco, doAmbiente } from './ambiente'

export interface ParTransferencia {
  saida: NotificacaoPendente
  entrada: NotificacaoPendente
  contaOrigemId?: number
  contaDestinoId?: number
  valor: number
  /** Minutos entre as duas notificações. */
  minutos: number
  /** O par de apps já foi confirmado como transferência antes. */
  jaConfirmadoAntes: boolean
  /** Nome sugerido: "Transferência Bradesco → C6". */
  descricaoSugerida: string
}

/** Chave estável do par de apps, independente de quem veio primeiro. */
export function chaveParApps(a: string | undefined, b: string | undefined): string {
  return [a ?? '', b ?? ''].sort().join('|')
}

function minutosEntre(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000
}

/**
 * Procura, entre as notificações PENDENTES, o par que forma uma transferência.
 * Devolve todos os pares encontrados (normalmente zero ou um), cada notificação
 * entrando em no máximo um par — o primeiro que casar, que é o mais próximo no
 * tempo por causa da ordenação.
 */
export function acharParesDeTransferencia(
  pendentes: NotificacaoPendente[],
  contas: Conta[],
  aprendizados: AprendizadoNotificacao[],
  p: ParametrosNotificacao = paramsNotificacaoAtuais(),
): ParTransferencia[] {
  const analisadas = pendentes
    .map((n) => ({ n, a: analisarNotificacao(n, p), contaId: casarContaDaNotificacao(analisarNotificacao(n, p), n, contas) }))
    .filter((x) => x.a.valor != null && x.a.transacional)
    .sort((x, y) => x.n.recebidoEm.localeCompare(y.n.recebidoEm))

  const usadas = new Set<number>()
  const pares: ParTransferencia[] = []

  for (let i = 0; i < analisadas.length; i++) {
    const x = analisadas[i]
    if (x.n.id != null && usadas.has(x.n.id)) continue
    for (let j = i + 1; j < analisadas.length; j++) {
      const y = analisadas[j]
      if (y.n.id != null && usadas.has(y.n.id)) continue
      // 2. sentidos opostos
      if (x.a.tipo === y.a.tipo) continue
      // 1. mesmo valor (mesma tolerância da fase 3)
      if (!dentroDaTolerancia(x.a.valor!, y.a.valor!, p)) continue
      // 3. janela de minutos
      const minutos = minutosEntre(x.n.recebidoEm, y.n.recebidoEm)
      if (minutos > p.janelaTransferenciaMin) continue
      /* 4. o sinal forte: os DOIS apps casando com contas DIFERENTES da
         Carteira. Com o parâmetro desligado, o par ainda é proposto sem esse
         sinal — mas aí a chance de falso positivo sobe, e a tela avisa. */
      const duasContas = x.contaId != null && y.contaId != null && x.contaId !== y.contaId
      if (p.transferenciaExigeDuasContas && !duasContas) continue
      // Apps diferentes: a mesma origem notificando duas vezes é repetição, não transferência.
      if ((x.n.pacote ?? '') === (y.n.pacote ?? '')) continue

      const saida = x.a.tipo === 'saida' ? x : y
      const entrada = x.a.tipo === 'saida' ? y : x
      const nomeOrigem = contas.find((c) => c.id === saida.contaId)?.nome ?? saida.n.app
      const nomeDestino = contas.find((c) => c.id === entrada.contaId)?.nome ?? entrada.n.app
      const chave = chaveParApps(saida.n.pacote, entrada.n.pacote)

      pares.push({
        saida: saida.n,
        entrada: entrada.n,
        contaOrigemId: saida.contaId,
        contaDestinoId: entrada.contaId,
        valor: Math.max(Math.abs(saida.a.valor!), Math.abs(entrada.a.valor!)),
        minutos,
        jaConfirmadoAntes: aprendizados.some((ap) => ap.tipo === 'parTransferencia' && ap.chave === chave),
        descricaoSugerida: `Transferência ${nomeOrigem} → ${nomeDestino}`,
      })
      if (x.n.id != null) usadas.add(x.n.id)
      if (y.n.id != null) usadas.add(y.n.id)
      break
    }
  }
  return pares
}

/**
 * Grava a transferência: UM par de lançamentos com o mesmo `transferenciaId`,
 * nunca dois lançamentos soltos — é o modelo que o app usa desde 31/08/2026,
 * e é ele que faz o resto das telas excluírem a transferência de Entrou/Saiu.
 * As duas notificações viram 'confirmada', cada uma apontando pra sua perna.
 */
export async function criarTransferenciaDoPar(
  par: ParTransferencia,
  opcoes: {
    contaOrigemId: number
    contaDestinoId: number
    categoriaOrigemId: number
    categoriaDestinoId: number
    descricao: string
    /** ISO yyyy-mm-dd. Padrão: o dia da notificação de saída. */
    data?: string
    pago?: boolean
  },
): Promise<{ transferenciaId: string; ids: number[] }> {
  const data = opcoes.data ?? par.saida.recebidoEm.slice(0, 10)
  const transferenciaId = gerarIdSerie()
  const amb = await ambienteDoBanco()
  const carimbo = marcaDoAmbiente(amb)
  const vinculo = (n: NotificacaoPendente) => ({
    origem: 'notificacao' as const,
    notificacaoId: n.id,
    app: n.app,
    pacote: n.pacote,
    textoCru: [n.titulo, n.texto].filter(Boolean).join(' — '),
    recebidoEm: n.recebidoEm,
    vinculadoEm: new Date().toISOString(),
  })
  const ids = (await db.lancamentos.bulkAdd(
    [
      {
        ...carimbo,
        dataCompetencia: data,
        dataCaixa: data,
        descricao: opcoes.descricao,
        // Imutável desde a criação (Decisão 24): aqui o lançamento NASCE agora,
        // então o snapshot é o próprio nome escolhido.
        descricaoOriginal: opcoes.descricao,
        valor: -Math.abs(par.valor),
        contaId: opcoes.contaOrigemId,
        pagoPor: 'conta' as const,
        categoriaId: opcoes.categoriaOrigemId,
        status: 'manual' as const,
        pago: opcoes.pago ?? true,
        transferenciaId,
        vinculoOrigem: vinculo(par.saida),
      },
      {
        ...carimbo,
        dataCompetencia: data,
        dataCaixa: data,
        descricao: opcoes.descricao,
        descricaoOriginal: opcoes.descricao,
        valor: Math.abs(par.valor),
        contaId: opcoes.contaDestinoId,
        pagoPor: 'conta' as const,
        categoriaId: opcoes.categoriaDestinoId,
        status: 'manual' as const,
        pago: opcoes.pago ?? true,
        transferenciaId,
        vinculoOrigem: vinculo(par.entrada),
      },
    ],
    { allKeys: true },
  )) as number[]

  if (par.saida.id != null) {
    await db.notificacoesPendentes.update(par.saida.id, { status: 'confirmada', lancamentoId: ids[0] })
  }
  if (par.entrada.id != null) {
    await db.notificacoesPendentes.update(par.entrada.id, { status: 'confirmada', lancamentoId: ids[1] })
  }
  await lembrarParDeApps(par)
  return { transferenciaId, ids }
}

/** Guarda o par de apps confirmado — linha visível e apagável, nunca regra oculta. */
export async function lembrarParDeApps(par: ParTransferencia): Promise<void> {
  const chave = chaveParApps(par.saida.pacote, par.entrada.pacote)
  if (!chave || chave === '|') return
  const agora = new Date().toISOString()
  const amb = await ambienteDoBanco()
  const existente = doAmbiente(await db.aprendizadosNotificacao.where('chave').equals(chave).toArray(), amb).find(
    (a) => a.tipo === 'parTransferencia',
  )
  if (existente?.id != null) {
    await db.aprendizadosNotificacao.update(existente.id, { vezes: existente.vezes + 1, atualizadoEm: agora })
    return
  }
  await db.aprendizadosNotificacao.add({
    ...marcaDoAmbiente(amb),
    tipo: 'parTransferencia',
    chave,
    rotulo: `${par.saida.app} ↔ ${par.entrada.app}`,
    descricao: par.descricaoSugerida,
    vezes: 1,
    criadoEm: agora,
    atualizadoEm: agora,
  })
}
