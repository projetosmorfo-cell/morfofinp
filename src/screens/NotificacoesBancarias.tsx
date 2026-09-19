import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Conta, type NotificacaoPendente } from '../db'
import { fmtBRL, fmtNum } from '../formatoMoeda'
import {
  ehNativo,
  sincronizarPendentesNativas,
  separarPendentes,
  acharRepeticao,
  descartarNotificacao,
  voltarParaPendentes,
  criarNotificacaoDeTeste,
  criarParTransferenciaDeTeste,
  obterPacotesIgnorados,
  ignorarPacote,
  deixarDeIgnorarPacote,
  limparHistorico,
  limparHistoricoPorIdade,
} from '../notificacaoBancaria'
import ConfirmacaoAcao from '../components/ConfirmacaoAcao'
import { BotoesPermissaoNotificacao, lerPermissoes, type EstadoPermissoes } from '../components/PermissoesNotificacao'
import { lerDoAmbiente } from '../ambiente'
import { analisarNotificacao, casarContaDaNotificacao, ROTULO_MOVIMENTO } from '../parseNotificacao'
import { useParamsNotificacao } from '../notificacaoParametros'
import {
  buscarCandidatos,
  acharDePara,
  vincularNotificacaoALancamento,
  desvincularLancamento,
  janelaPadrao,
  janelaAmpliada,
  ROTULO_GRUPO_CANDIDATO,
  ROTULO_STATUS,
  CLASSE_STATUS,
  type CandidatoVinculo,
  type JanelaBusca,
} from '../vinculoNotificacao'
import { acharParesDeTransferencia, criarTransferenciaDoPar, type ParTransferencia } from '../transferenciaNotificacao'
import { useContasCartao } from '../contasCartao'

/* Tela ÚNICA de Notificações bancárias (16/09/2026, build 080).
 *
 * O QUE MUDOU E POR QUÊ. Até a 079 existiam duas PORTAS (o aviso do topo e o
 * item de Configurações) caindo numa tela que, pela porta do aviso, mostrava
 * só a lista de pendentes — e o resto (ignoradas, histórico, apps silenciados)
 * ficava escondido atrás de seções recolhidas ou simplesmente não existia. O
 * Rafael pediu UMA tela, mais rica, com tudo sempre alcançável:
 *
 *   • ABAS Pendentes · Ignoradas · Histórico. As duas portas caem aqui; o
 *     aviso do topo só escolhe a aba inicial (Pendentes).
 *   • NADA É APAGADO, NUNCA. "Ignoradas" junta o que o classificador de
 *     propaganda recusou COM o que ele descartou, e TODA linha de lá volta em
 *     um toque — "Voltar pra pendentes" ou "Confirmar mesmo assim".
 *     Classificação errada tem que ser reversível sem custo.
 *   • "Histórico" é o que já virou lançamento, com link pra abrir o lançamento.
 *   • APPS SILENCIADOS viraram uma seção visível com "Ouvir de novo" — antes a
 *     lista só aparecia quando havia algum e ficava perdida no meio da tela de
 *     permissões. Um app silenciado que continue notificando segue aparecendo
 *     em Ignoradas: nada some sem deixar rastro.
 *   • PARÂMETROS: o atalho pra tela de regras, que também vive em
 *     Configurações (`ParametrosNotificacao.tsx`).
 *
 * As duas capacidades novas do fluxo aparecem aqui:
 *   • FASE 3 — "Confirmar" não vai mais direto pro formulário de lançamento
 *     novo: primeiro mostra os lançamentos JÁ EXISTENTES que podem ser esta
 *     movimentação (data+valor+conta, ver `vinculoNotificacao.ts`), com o botão
 *     de VINCULAR. Criar novo continua ali, como segunda opção.
 *     Build 081: a busca passou a ser por JANELA DE MÊS (o mês da notificação,
 *     por padrão — ver `notificacaoParametros.ts`), a lista de candidatos vem
 *     agrupada por SITUAÇÃO (em aberto e atrasados primeiro, já pagos depois)
 *     e existe um botão pra AMPLIAR a busca pra meses anteriores ali mesmo,
 *     sem ir em Configurações: ampliar vale só pra aquela notificação, naquele
 *     momento, e não mexe no padrão de ninguém.
 *   • FASE 4 — o par de notificações de uma transferência aparece como UMA
 *     proposta no topo, com os dois textos crus lado a lado, e só vira
 *     transferência depois de confirmada.
 *
 * BUILD 090 (17/09/2026) — o Rafael achou a tela feia e nomeou os defeitos:
 *   • "botões enormes fora do padrão do app" — eram `.primario` (bloco cheio
 *     de 12px) ao lado de botões SEM CLASSE (texto puro, sem caixa), dois
 *     registros visuais na mesma linha. Toda ação de card virou o par
 *     `.primario` + `.secundario` compacto (`.notif-acoes`), e ação rara vira
 *     link discreto (`.notif-link`) — nada de botão inventado.
 *   • "o texto da notificação deve ficar nitidamente separado, com título
 *     indicando que é o texto original, abaixo da análise do motor" — cada
 *     card tem duas seções rotuladas: O QUE O APP ENTENDEU (a análise, em
 *     pares rótulo/valor) e TEXTO ORIGINAL DA NOTIFICAÇÃO (o cru, num bloco
 *     próprio). Antes tudo saía empilhado no mesmo `<div>`, com a mesma fonte.
 *   • "um card pra cada notificação" — a lista deixou de ser linhas soltas
 *     dentro de UM `.cartao`; cada notificação é o seu `.cartao`.
 *   • "os títulos dos botões estão confusos, pense que o usuário é leigo" —
 *     ver `ROTULO_ACAO`: uma tabela só, pra ninguém reescrever um rótulo à
 *     mão em outro lugar.
 */

/* Os rótulos de TODA ação desta tela, em linguagem de quem não é técnico
   (build 090). Um lugar só: rótulo repetido à mão em dois pontos diverge na
   primeira edição. */
const ROTULO_ACAO = {
  lancar: 'Lançar no app',
  ignorar: 'Ignorar esta',
  eEste: 'É este lançamento',
  procurarMaisAtras: 'Procurar mais atrás',
  criarNovo: 'Criar lançamento novo',
  voltar: 'Voltar',
  trazerDeVolta: 'Trazer de volta',
  lancarMesmoAssim: 'Lançar mesmo assim',
  abrirLancamento: 'Abrir o lançamento',
  voltarALerApp: 'Voltar a ler este app',
  naoLerMais: (app: string) => `Não ler mais notificações do ${app}`,
  ajustarRegras: 'Ajustar as regras de leitura',
  testeNotificacao: 'Criar uma notificação de teste',
  testeTransferencia: 'Criar um par de teste (transferência)',
  simTransferencia: 'Sim, é transferência',
  naoTransferencia: 'Não, são separadas',
} as const
export default function NotificacoesBancarias({
  aoVoltar,
  aoConfirmar,
  aoAbrirLancamento,
  aoAbrirParametros,
  abaInicial,
}: {
  aoVoltar: () => void
  aoConfirmar: (n: NotificacaoPendente) => void
  /** Abre o lançamento que nasceu de uma notificação (aba Histórico). */
  aoAbrirLancamento?: (id: number) => void
  aoAbrirParametros?: () => void
  /* O aviso do topo do app manda `pendentes`: é a mesma tela, só já aberta na
     aba que o aviso prometeu. Nada fica escondido por causa disso. */
  abaInicial?: Aba
}) {
  const nativo = ehNativo()
  const { efetivos: params } = useParamsNotificacao()
  const [aba, setAba] = useState<Aba>(abaInicial ?? 'pendentes')

  const pendentes = useLiveQuery(
    () => lerDoAmbiente(db.notificacoesPendentes.where('status').equals('pendente').reverse().sortBy('recebidoEm')),
    [],
  )
  const confirmadas = useLiveQuery(
    () => lerDoAmbiente(db.notificacoesPendentes.where('status').equals('confirmada').reverse().sortBy('recebidoEm')),
    [],
  )
  const descartadas = useLiveQuery(
    () => lerDoAmbiente(db.notificacoesPendentes.where('status').equals('descartada').reverse().sortBy('recebidoEm')),
    [],
  )
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), []) ?? []
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), []) ?? []
  const lancamentos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), []) ?? []
  const aprendizados = useLiveQuery(() => lerDoAmbiente(db.aprendizadosNotificacao.toArray()), []) ?? []
  const contasCartao = useContasCartao()

  const [permissoes, setPermissoes] = useState<EstadoPermissoes>({ acesso: false, aviso: false })
  const [aviso, setAviso] = useState<string | null>(null)
  const [ignorados, setIgnorados] = useState<string[]>([])

  /* Build 099: a limpeza automática do histórico pela idade (parâmetro
     "Guardar histórico por (dias)") roda ao abrir a tela e a cada volta a
     ela — no navegador também, porque histórico existe nos dois lugares. */
  const [confirmandoLimparHistorico, setConfirmandoLimparHistorico] = useState(false)
  const [avisoHistorico, setAvisoHistorico] = useState<string | null>(null)

  async function atualizarStatus() {
    const apagadas = await limparHistoricoPorIdade()
    if (apagadas > 0) setAvisoHistorico(`${apagadas} notificação(ões) já tratada(s) mais velha(s) que ${params.retencaoHistoricoDias} dias foram apagadas sozinhas.`)
    if (!nativo) return
    setPermissoes(await lerPermissoes())
    setIgnorados(await obterPacotesIgnorados())
    const novas = await sincronizarPendentesNativas()
    if (novas > 0) setAviso(`${novas} notificação(ões) nova(s) lida(s) do aparelho.`)
  }

  async function executarLimparHistorico() {
    const n = await limparHistorico()
    setAvisoHistorico(`${n} notificação(ões) apagada(s) do histórico e das ignoradas. Pendentes e o que o app aprendeu continuam.`)
    setConfirmandoLimparHistorico(false)
  }

  useEffect(() => {
    atualizarStatus()
    const aoVoltarPraTela = () => { if (document.visibilityState === 'visible') atualizarStatus() }
    document.addEventListener('visibilitychange', aoVoltarPraTela)
    return () => document.removeEventListener('visibilitychange', aoVoltarPraTela)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const { transacionais, ignoradas: recusadasPeloFiltro } = separarPendentes(pendentes ?? [], params)

  /* Fase 4: os pares são calculados sobre as pendentes transacionais, e as
     notificações que entram num par saem da lista solta — senão a mesma
     movimentação apareceria em dois lugares pedindo duas ações. */
  const pares = useMemo(
    () => acharParesDeTransferencia(transacionais, contas, aprendizados, params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pendentes, contas, aprendizados, params],
  )
  const idsEmPar = new Set(pares.flatMap((p) => [p.saida.id, p.entrada.id]).filter((x): x is number => x != null))
  const soltas = transacionais.filter((n) => n.id == null || !idsEmPar.has(n.id))

  const ignoradasTodas = [...recusadasPeloFiltro, ...(descartadas ?? [])]

  /* Aba "Vínculos" (build 101) — ver o comentário do tipo `Aba` abaixo. */
  const contaPorId = new Map(contas.map((c) => [c.id, c]))
  const lancamentosVinculados = lancamentos
    .filter((l) => l.vinculoOrigem != null)
    .sort((a, b) => (b.vinculoOrigem?.vinculadoEm ?? '').localeCompare(a.vinculoOrigem?.vinculadoEm ?? ''))
  const [desvinculando, setDesvinculando] = useState<number | null>(null)
  const [avisoVinculo, setAvisoVinculo] = useState<string | null>(null)

  const dataCurta = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const dataHora = (iso: string) => {
    const d = new Date(iso)
    return `${dataCurta(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Notificações Bancárias</h1>
        <div className="abas-tela" role="tablist" data-testid="notif-abas">
          {(['pendentes', 'ignoradas', 'historico', 'vinculos'] as Aba[]).map((k) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={aba === k}
              className={`aba-tela-item${aba === k ? ' ativa' : ''}`}
              data-testid={`notif-aba-${k}`}
              onClick={(e) => {
                setAba(k)
                /* Build 092: trocar de aba volta a lista pro TOPO. O `<main>`
                   é o único contêiner de rolagem do N1 e não desmonta ao
                   trocar de aba — sem isto a aba nova abria na altura em que
                   a anterior tinha sido rolada. */
                e.currentTarget.closest('main')?.scrollTo({ top: 0 })
              }}
            >
              {ROTULO_ABA[k]}{' '}
              <span className="texto-fraco" style={{ fontWeight: 400 }}>
                ({k === 'pendentes'
                  ? soltas.length + pares.length
                  : k === 'ignoradas'
                    ? ignoradasTodas.length
                    : k === 'historico'
                      ? (confirmadas?.length ?? 0)
                      : lancamentosVinculados.length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {aviso && <p className="texto-fraco" style={{ fontSize: 13 }} data-testid="notif-aviso">{aviso}</p>}

      {aba === 'pendentes' && (
        <>
          <p className="texto-fraco" style={{ fontSize: 13 }}>
            Cada movimentação detectada espera você: nada vira lançamento sozinho. Em cada card, "{ROTULO_ACAO.lancar}"
            grava no app e "{ROTULO_ACAO.ignorar}" manda pra aba Ignoradas (dá pra trazer de volta).
          </p>

          {pares.map((par) => (
            <PropostaTransferencia
              key={`${par.saida.id}-${par.entrada.id}`}
              par={par}
              contas={contas}
              categorias={categorias}
              dataHora={dataHora}
              nativo={nativo}
              ignorados={ignorados}
              aoIgnorarPacote={async (pacote) => { await ignorarPacote(pacote); setIgnorados(await obterPacotesIgnorados()) }}
            />
          ))}

          <div data-testid="notif-pendentes">
            {soltas.length === 0 && pares.length === 0 && (
              <div className="cartao"><p className="texto-fraco" style={{ margin: 0 }}>Nenhuma notificação pendente.</p></div>
            )}
            {soltas.map((n) => (
              <CartaoNotificacao
                key={n.id}
                n={n}
                contas={contas}
                lancamentos={lancamentos}
                contasCartao={contasCartao}
                aprendizados={aprendizados}
                params={params}
                repeticao={acharRepeticao(n, [...transacionais, ...(confirmadas ?? [])], params)}
                dataHora={dataHora}
                dataCurta={dataCurta}
                aoConfirmar={aoConfirmar}
                podeIgnorarApp={nativo && !ignorados.includes(n.pacote)}
                aoIgnorarApp={async () => { await ignorarPacote(n.pacote); setIgnorados(await obterPacotesIgnorados()) }}
                aoAvisar={setAviso}
              />
            ))}
          </div>
        </>
      )}

      {aba === 'ignoradas' && (
        <>
          <p className="texto-fraco" style={{ fontSize: 13 }}>
            O que não pareceu movimentação de dinheiro (propaganda, aviso do app) e o que você descartou.
            <b> Nada foi apagado</b> — toda linha daqui volta em um toque.
          </p>
          <div data-testid="notif-ignoradas">
            {ignoradasTodas.length === 0 && <div className="cartao"><p className="texto-fraco" style={{ margin: 0 }}>Nada ignorado.</p></div>}
            {ignoradasTodas.map((n) => (
              <CartaoIgnorada key={n.id} n={n} contas={contas} params={params} dataHora={dataHora} aoConfirmar={aoConfirmar} />
            ))}
          </div>

          <h2>Apps silenciados</h2>
          <div className="cartao" data-testid="notif-silenciados">
            {ignorados.length === 0 ? (
              <p className="texto-fraco" style={{ margin: 0 }}>
                Nenhum app silenciado. Silenciar um app faz o aparelho parar de mandar as notificações dele — o que
                já foi capturado continua aqui.
              </p>
            ) : (
              ignorados.map((p) => (
                <div key={p} className="linha" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13 }}>{p}</span>
                  <button
                    type="button"
                    className="botao-mini-secundario"
                    data-testid="notif-ouvir-de-novo"
                    onClick={async () => { await deixarDeIgnorarPacote(p); setIgnorados(await obterPacotesIgnorados()) }}
                  >
                    {ROTULO_ACAO.voltarALerApp}
                  </button>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {aba === 'historico' && (
        <>
          <p className="texto-fraco" style={{ fontSize: 13 }}>
            O que já virou lançamento. Nada é apagado: toque em "{ROTULO_ACAO.abrirLancamento}" pra ver o registro que nasceu daqui.
          </p>
          <div data-testid="notif-historico">
            {(confirmadas?.length ?? 0) === 0 && <div className="cartao"><p className="texto-fraco" style={{ margin: 0 }}>Nada no histórico.</p></div>}
            {confirmadas?.map((n) => {
              const a = analisarNotificacao(n, params)
              return (
                <div key={n.id} className="cartao notif-card" data-testid="notif-historico-item">
                  <div className="notif-cabecalho">
                    <span className="notif-nome">{a.contraparte ?? n.app}</span>
                    <span className="notif-quando">{dataHora(n.recebidoEm)}</span>
                  </div>
                  <div className={`notif-valor ${a.tipo === 'entrada' ? 'valor-pos' : 'valor-neg'}`}>
                    {n.valor != null ? fmtNum(n.valor) : '—'}
                  </div>
                  <div className="notif-secao-rotulo">Texto original da notificação</div>
                  <p className="notif-texto-original">{[n.titulo, n.texto].filter(Boolean).join(' — ')}</p>
                  <div className="notif-acoes">
                    {n.lancamentoId != null && aoAbrirLancamento && (
                      <button
                        type="button"
                        className="primario"
                        data-testid="notif-ver-lancamento"
                        onClick={() => aoAbrirLancamento(n.lancamentoId!)}
                      >
                        {ROTULO_ACAO.abrirLancamento}
                      </button>
                    )}
                    <button
                      type="button"
                      className="secundario"
                      onClick={() => n.id != null && voltarParaPendentes(n.id)}
                    >
                      {ROTULO_ACAO.trazerDeVolta}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {aba === 'vinculos' && (
        <>
          <p className="texto-fraco" style={{ fontSize: 13 }}>
            Todo lançamento vinculado a uma notificação do banco — criado direto dela ou vinculado
            depois a um que já existia — com o texto original ao lado. Serve pra conferir antes de uma
            conciliação futura: se algum vínculo pegou o lançamento errado, desfaça aqui (o lançamento
            não é apagado nem alterado além do vínculo em si — ele volta a poder ser vinculado de novo).
          </p>
          <div data-testid="notif-vinculos">
            {lancamentosVinculados.length === 0 && (
              <div className="cartao"><p className="texto-fraco" style={{ margin: 0 }}>Nenhum lançamento vinculado ainda.</p></div>
            )}
            {avisoVinculo && <p className="texto-fraco" style={{ fontSize: 13 }} data-testid="notif-vinculo-aviso">{avisoVinculo}</p>}
            {lancamentosVinculados.map((l) => {
              const vo = l.vinculoOrigem!
              return (
                <div key={l.id} className="cartao notif-card" data-testid="notif-vinculo-item">
                  <div className="notif-cabecalho">
                    <span className="notif-nome">{l.descricao}</span>
                    <span className="notif-quando">{dataCurta(l.dataCompetencia)}</span>
                  </div>
                  <div className={`notif-valor ${l.valor >= 0 ? 'valor-pos' : 'valor-neg'}`}>{fmtNum(l.valor)}</div>
                  <p className="texto-fraco" style={{ fontSize: 12, margin: '2px 0 8px' }}>
                    {contaPorId.get(l.contaId)?.nome ?? '—'}
                    {' · '}
                    {vo.vinculadoAExistente ? 'vinculado a um lançamento que já existia' : 'criado direto da notificação'}
                    {vo.app ? ` · ${vo.app}` : ''}
                  </p>
                  {vo.textoCru && (
                    <>
                      <div className="notif-secao-rotulo">Texto original da notificação</div>
                      <p className="notif-texto-original">{vo.textoCru}</p>
                    </>
                  )}
                  <div className="notif-acoes">
                    {aoAbrirLancamento && (
                      <button type="button" className="primario" data-testid="notif-vinculo-abrir" onClick={() => aoAbrirLancamento(l.id!)}>
                        {ROTULO_ACAO.abrirLancamento}
                      </button>
                    )}
                    <button
                      type="button"
                      className="secundario"
                      data-testid="notif-vinculo-desvincular"
                      disabled={desvinculando === l.id}
                      onClick={async () => {
                        setDesvinculando(l.id!)
                        const r = await desvincularLancamento(l.id!)
                        setDesvinculando(null)
                        setAvisoVinculo(
                          r.voltouParaPendentes
                            ? `Vínculo desfeito — a notificação de "${l.descricao}" voltou pra Pendentes.`
                            : `Vínculo desfeito. Valor, data e status do lançamento continuam como estavam.`,
                        )
                      }}
                    >
                      {desvinculando === l.id ? 'Desfazendo…' : 'Desvincular'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Build 099 — LIMPEZA DO HISTÓRICO, nas duas abas que são histórico
          (Ignoradas e Histórico). Automática pela idade (parâmetro em
          Configurações → Regras de Notificação Bancária) e manual aqui. Só
          apaga o que já foi tratado; pendentes nunca. O que o app aprendeu
          (o de/para) mora em outra lista e não é tocado. */}
      {(aba === 'ignoradas' || aba === 'historico') && (
        <div className="cartao" data-testid="notif-limpeza-historico">
          <p className="texto-fraco" style={{ marginTop: 0 }}>
            {params.retencaoHistoricoDias > 0
              ? `Confirmadas e ignoradas mais velhas que ${params.retencaoHistoricoDias} dias são apagadas sozinhas ao abrir esta tela (ajuste em Regras de Notificação Bancária). `
              : 'A limpeza automática está desligada (0 dias em Regras de Notificação Bancária). '}
            Apagar o histórico não desensina nada: o de/para aprendido fica. Pendentes nunca são apagadas.
          </p>
          <button
            type="button"
            className="perigo"
            data-testid="notif-limpar-historico"
            disabled={(confirmadas?.length ?? 0) + (descartadas?.length ?? 0) === 0}
            onClick={() => setConfirmandoLimparHistorico(true)}
          >
            Limpar histórico agora ({(confirmadas?.length ?? 0) + (descartadas?.length ?? 0)})
          </button>
          {avisoHistorico && <p className="texto-fraco" style={{ marginBottom: 0 }} data-testid="notif-aviso-historico">{avisoHistorico}</p>}
          {confirmandoLimparHistorico && (
            <ConfirmacaoAcao
              titulo="Apagar o histórico de notificações?"
              testid="confirmacao-limpar-historico"
              aviso={`Apaga ${(confirmadas?.length ?? 0) + (descartadas?.length ?? 0)} notificação(ões) já tratada(s) — confirmadas e as que você descartou. Os lançamentos que nasceram delas e o que o app aprendeu continuam. Pendentes não são tocadas.`}
              onCancelar={() => setConfirmandoLimparHistorico(false)}
              onConfirmar={() => void executarLimparHistorico()}
            />
          )}
        </div>
      )}

      <h2>Leitura no Celular</h2>
      <div className="cartao" data-testid="notif-status">
        {!nativo ? (
          <p className="texto-fraco" style={{ margin: 0 }}>
            A leitura automática só funciona no <b>app Android instalado</b> (arquivo .apk). Neste navegador ela
            fica desligada — esta tela mostra só o que já foi capturado ou a notificação de teste abaixo.
          </p>
        ) : (
          <BotoesPermissaoNotificacao
            estado={permissoes}
            aoMudar={(novo) => { setPermissoes(novo); setAviso(novo.aviso ? 'Aviso de "movimentação detectada" liberado.' : 'Sem permissão pra avisar — as notificações ainda entram na lista ao abrir o app.') }}
          />
        )}
      </div>

      {aoAbrirParametros && (
        <div className="cartao">
          <p className="texto-fraco" style={{ fontSize: 13, marginTop: 0 }}>
            As regras da leitura (janela de repetição, tolerância de valor, filtro de propaganda, de/para aprendido)
            ficam em Configurações → Regras de Notificação Bancária.
          </p>
          <button type="button" className="secundario" style={{ marginTop: 0 }} data-testid="notif-abrir-parametros" onClick={aoAbrirParametros}>
            {ROTULO_ACAO.ajustarRegras}
          </button>
        </div>
      )}

      <h2>Ferramenta de teste (MVP)</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ fontSize: 13, marginTop: 0 }}>
          Cria notificações falsas, no mesmo formato que o celular geraria, pra validar o fluxo sem depender do banco.
          Some da versão de produção (BACKLOG item 030).
        </p>
        <button type="button" className="secundario" style={{ marginTop: 0 }} data-testid="notif-teste" onClick={() => criarNotificacaoDeTeste()}>
          {ROTULO_ACAO.testeNotificacao}
        </button>
        <button type="button" className="secundario" style={{ marginTop: 8 }} data-testid="notif-teste-transferencia" onClick={() => criarParTransferenciaDeTeste()}>
          {ROTULO_ACAO.testeTransferencia}
        </button>
      </div>
    </>
  )
}

/* Build 101 (item 3 do Rafael, 18/09/2026): "existe o risco de ter
   reconhecido a notificação errada e eu ter editado pra lançar, então a
   futura conciliação vai ter problema — por isso acho que devemos criar já
   uma tela prévia preparatória pra conciliação... somente para rever os
   vínculos". A aba "Vínculos" é essa revisão: TODO lançamento com
   `vinculoOrigem` gravado (criado a partir de notificação OU vinculado a um
   já existente — as duas formas gravam o mesmo campo, ver
   `vinculoNotificacao.ts`), num lugar só, com o texto cru do banco ao lado
   do lançamento de hoje. Diferente da aba "Histórico" (que lista
   NOTIFICAÇÕES confirmadas): esta lista lê do LANÇAMENTO, então sobrevive à
   limpeza de histórico de notificação (`limparHistoricoPorIdade`) — é
   exatamente aí que a conciliação futura ia precisar do dado e não ia mais
   achar de onde ele veio.
   "Editar os dados secundários" (a segunda metade do pedido) fica de fora
   por ora: os campos de origem são READ-ONLY de propósito desde a build
   081 (são o registro NÃO EDITADO do banco — é isso que os torna âncora de
   conciliação) e o Rafael ainda não disse quais campos, especificamente,
   quer poder mudar. O que ESTA aba já resolve é o "vinculei errado": um
   toque em "Desvincular" aqui mesmo, sem abrir o formulário inteiro. */
export type Aba = 'pendentes' | 'ignoradas' | 'historico' | 'vinculos'
const ROTULO_ABA: Record<Aba, string> = { pendentes: 'Pendentes', ignoradas: 'Ignoradas', historico: 'Histórico', vinculos: 'Vínculos' }

/* Uma notificação pendente. Mostra o que a leitura ENTENDEU (nome, movimento,
   agendado × concluído, conta casada) e o texto cru, que continua sendo a
   única fonte de verdade. A análise é recalculada na exibição, nunca lida de
   um campo gravado — notificação capturada por build antiga ganha a leitura
   nova de graça (ver cabeçalho de `parseNotificacao.ts`). */
function CartaoNotificacao({
  n, contas, lancamentos, contasCartao, aprendizados, params, repeticao, dataHora, dataCurta,
  aoConfirmar, podeIgnorarApp, aoIgnorarApp, aoAvisar,
}: {
  n: NotificacaoPendente
  contas: Conta[]
  lancamentos: import('../db').Lancamento[]
  contasCartao: ReadonlySet<number>
  aprendizados: import('../db').AprendizadoNotificacao[]
  params: import('../notificacaoParametros').ParametrosNotificacao
  repeticao?: NotificacaoPendente
  dataHora: (iso: string) => string
  dataCurta: (iso: string) => string
  aoConfirmar: (n: NotificacaoPendente) => void
  podeIgnorarApp: boolean
  aoIgnorarApp: () => void
  /* O resultado do vínculo sobe pro aviso DA TELA (build 081): assim que a
     notificação vira 'confirmada' ela sai da lista de pendentes e ESTA linha
     desmonta junto — a mensagem local morria antes de ser lida, justamente na
     hora em que ela mais importa (o lançamento mudou de mês). */
  aoAvisar: (texto: string) => void
}) {
  const a = analisarNotificacao(n, params)
  const contaId = casarContaDaNotificacao(a, n, contas)
  const conta = contas.find((c) => c.id === contaId)
  const dePara = params.aplicarDeParaAutomaticamente ? acharDePara(a.contraparte, aprendizados) : undefined
  const [escolhendo, setEscolhendo] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  /* A busca ampliada vale só PRA ESTA notificação, enquanto a tela estiver
     aberta: `mesesAtras` nasce 0 (janela do parâmetro) e cada toque em
     "Procurar em meses anteriores" soma 1, até o limite do parâmetro. Nada é
     gravado — a próxima notificação volta ao padrão. */
  const [mesesAtras, setMesesAtras] = useState(0)
  const limiteMeses = Math.max(1, params.mesesAnterioresAoAmpliar)
  const janela: JanelaBusca = useMemo(
    () => (mesesAtras > 0 ? janelaAmpliada(n.recebidoEm, params, mesesAtras) : janelaPadrao(n.recebidoEm, params)),
    [n.recebidoEm, params, mesesAtras],
  )

  const candidatos: CandidatoVinculo[] = useMemo(
    () => buscarCandidatos(a, n.recebidoEm, contaId, lancamentos, params, janela).slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [n.id, lancamentos, contaId, params, janela],
  )

  /* O agrupamento do item 4 é VISÍVEL, não só uma ordenação silenciosa: cada
     grupo ganha rótulo de seção, e cada linha carrega a tarja de situação que
     o resto do app já usa (`CLASSE_STATUS`/`ROTULO_STATUS`). */
  const gruposCandidatos = useMemo(() => {
    const emAberto = candidatos.filter((c) => c.grupo === 0)
    const jaFeitos = candidatos.filter((c) => c.grupo === 1)
    return [
      { chave: 0 as const, itens: emAberto },
      { chave: 1 as const, itens: jaFeitos },
    ].filter((g) => g.itens.length > 0)
  }, [candidatos])

  const mesDaNotificacao = soMes(n.recebidoEm)

  async function vincular(c: CandidatoVinculo) {
    if (c.lancamento.id == null) return
    const r = await vincularNotificacaoALancamento(n, c.lancamento.id, contasCartao, params)
    const texto =
      `Vinculado a "${c.lancamento.descricao}": ${fmtBRL(Math.abs(r.valorAnterior))} → ${fmtBRL(Math.abs(r.valorNovo))}` +
      (r.marcouComoPago ? ' · marcado como pago' : ' · segue na fatura do cartão') +
      (r.mudouDeMes
        ? ` · o lançamento saiu de ${mesLegivel(r.dataAnterior)} e entrou em ${mesLegivel(r.dataNova)}`
        : ` · data ajustada para ${r.dataNova.slice(8, 10)}/${r.dataNova.slice(5, 7)}`)
    setMsg(texto)
    aoAvisar(texto)
  }

  return (
    <div className="cartao notif-card" data-testid="notif-item">
      <div className="notif-cabecalho">
        <span className="notif-nome" data-testid="notif-nome">{dePara?.descricao ?? a.contraparte ?? n.app}</span>
        <span className="notif-quando">{dataHora(n.recebidoEm)}</span>
      </div>
      <div className={`notif-valor ${a.tipo === 'entrada' ? 'valor-pos' : 'valor-neg'}`}>
        {a.valor != null ? fmtNum(a.valor) : 'valor não reconhecido'}
      </div>

      {/* Build 090 — o que o app ENTENDEU, em pares rótulo/valor. É a análise
          do motor (`parseNotificacao.ts`), recalculada na exibição. */}
      <div className="notif-secao-rotulo">O que o app entendeu</div>
      <dl className="notif-entendido" data-testid="notif-entendido">
        <dt>Movimento</dt>
        <dd data-testid="notif-movimento">
          {ROTULO_MOVIMENTO[a.movimento]}
          {a.agendado ? ' · agendado' : a.concluido ? ' · concluído' : ''}
        </dd>
        <dt>Conta</dt>
        <dd data-testid="notif-conta">{conta ? conta.nome : 'não identificada — você escolhe ao lançar'}</dd>
        <dt>App</dt>
        <dd>{n.app}</dd>
        {dePara && (
          <>
            <dt>De/para</dt>
            <dd data-testid="notif-depara">{dePara.rotulo} → {dePara.descricao ?? '(sem nome)'}</dd>
          </>
        )}
      </dl>
      {repeticao && (
        <div className="notif-alerta" data-testid="notif-repeticao">
          ⚠ Possível repetição do agendamento de {dataCurta(repeticao.recebidoEm)} — confira antes de gravar duas vezes.
        </div>
      )}

      {/* Build 090 — o texto CRU, separado e rotulado: é a única fonte de
          verdade, e a pessoa precisa conseguir conferir a análise contra ele. */}
      <div className="notif-secao-rotulo">Texto original da notificação</div>
      <p className="notif-texto-original" data-testid="notif-texto-original">
        {[n.titulo, n.texto].filter(Boolean).join(' — ')}
      </p>

      {msg && <p className="texto-fraco" style={{ fontSize: 12 }} data-testid="notif-msg-vinculo">{msg}</p>}
      {!escolhendo && candidatos.length > 0 && (
        <p className="notif-alerta" data-testid="notif-parecidos">
          {candidatos.length === 1 ? 'Já existe 1 lançamento parecido' : `Já existem ${candidatos.length} lançamentos parecidos`} — ao
          lançar, o app pergunta se é um deles antes de criar outro.
        </p>
      )}

      {!escolhendo ? (
        <div className="notif-acoes">
          <button
            type="button"
            className="primario"
            data-testid="notif-confirmar"
            /* Confirmar SEMPRE passa pelo passo de escolha, mesmo com zero
               candidatos (build 081). Antes ele pulava direto pro formulário de
               lançamento novo quando a janela não achava nada — e era
               justamente aí que a pessoa mais precisava de "procurar em meses
               anteriores": zero candidato no mês é a assinatura do caso da
               VIRADA (planejado 30/09, banco debita 02/10). Com o atalho, a
               ampliação ficava inalcançável exatamente no caso que ela existe
               pra resolver. O custo é um toque a mais quando não há nada a
               vincular, e nesse caso "Criar lançamento novo" já é o botão
               primário do passo. */
            onClick={() => setEscolhendo(true)}
          >
            {ROTULO_ACAO.lancar}
          </button>
          <button type="button" className="secundario" data-testid="notif-descartar" onClick={() => n.id != null && descartarNotificacao(n.id)}>
            {ROTULO_ACAO.ignorar}
          </button>
        </div>
      ) : (
        <div data-testid="notif-candidatos" className="notif-candidatos">
          <p className="texto-fraco" style={{ fontSize: 12, marginTop: 0 }}>
            Isto já pode estar lançado. Se for um destes, toque em "{ROTULO_ACAO.eEste}": o app atualiza o
            lançamento que já existe com o valor real e <b>coloca nele a data da notificação</b> — sem criar outro.
          </p>
          <p className="texto-fraco" style={{ fontSize: 11, margin: '0 0 6px' }} data-testid="notif-janela">
            Procurando em: {janela.rotulo}.
          </p>
          {candidatos.length === 0 && (
            <p className="texto-fraco" style={{ fontSize: 12, marginTop: 0 }} data-testid="notif-sem-candidato">
              Nenhum lançamento previsto encontrado nesse período.
            </p>
          )}
          {gruposCandidatos.map((g) => (
            <div key={g.chave} data-testid={`notif-grupo-${g.chave}`}>
              <div
                className="texto-fraco"
                style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', margin: '8px 0 2px' }}
                data-testid={`notif-grupo-rotulo-${g.chave}`}
              >
                {ROTULO_GRUPO_CANDIDATO[g.chave]}
              </div>
              {g.itens.map((c) => (
                <div
                  key={c.lancamento.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0' }}
                  data-testid="notif-candidato-linha"
                >
                  <span style={{ fontSize: 12, minWidth: 0 }}>
                    {c.lancamento.dataCompetencia.slice(8, 10)}/{c.lancamento.dataCompetencia.slice(5, 7)} ·{' '}
                    {c.lancamento.descricao} · {fmtNum(Math.abs(c.lancamento.valor))}
                    {soMes(c.lancamento.dataCompetencia) !== mesDaNotificacao && (
                      <span className="texto-fraco"> · de {mesLegivel(c.lancamento.dataCompetencia)}</span>
                    )}
                  </span>
                  <span className={`status-pill ${CLASSE_STATUS[c.status]}`} style={{ fontSize: 10 }} data-testid="notif-candidato-status">
                    {ROTULO_STATUS[c.status]}
                  </span>
                  <button type="button" className="botao-mini-secundario" data-testid="notif-vincular" onClick={() => vincular(c)}>
                    {ROTULO_ACAO.eEste}
                  </button>
                </div>
              ))}
            </div>
          ))}
          {mesesAtras < limiteMeses && (
            <button
              type="button"
              className="secundario"
              style={{ marginTop: 8 }}
              data-testid="notif-ampliar-busca"
              onClick={() => setMesesAtras((v) => v + 1)}
            >
              {ROTULO_ACAO.procurarMaisAtras}
            </button>
          )}
          {mesesAtras > 0 && (
            <p className="texto-fraco" style={{ fontSize: 11, margin: '4px 0 0' }}>
              Vale só pra esta notificação. Escolher um lançamento de outro mês <b>muda a data dele</b> pra a da
              notificação — ele sai daquele mês e entra neste.
            </p>
          )}
          <div className="notif-acoes">
            <button type="button" className="primario" data-testid="notif-criar-novo" onClick={() => aoConfirmar(n)}>
              {ROTULO_ACAO.criarNovo}
            </button>
            <button type="button" className="secundario" onClick={() => setEscolhendo(false)}>{ROTULO_ACAO.voltar}</button>
          </div>
        </div>
      )}

      {podeIgnorarApp && (
        <button type="button" className="notif-link" onClick={aoIgnorarApp}>
          {ROTULO_ACAO.naoLerMais(n.app)}
        </button>
      )}
    </div>
  )
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function soMes(iso: string): string {
  return iso.slice(0, 7)
}

function mesLegivel(iso: string): string {
  const m = Number(iso.slice(5, 7))
  return `${MESES_CURTOS[m - 1] ?? iso.slice(5, 7)}/${iso.slice(0, 4)}`
}

/* Linha da aba Ignoradas — sempre com as DUAS voltas possíveis. */
function CartaoIgnorada({
  n, contas, params, dataHora, aoConfirmar,
}: {
  n: NotificacaoPendente
  contas: Conta[]
  params: import('../notificacaoParametros').ParametrosNotificacao
  dataHora: (iso: string) => string
  aoConfirmar: (n: NotificacaoPendente) => void
}) {
  const a = analisarNotificacao(n, params)
  const conta = contas.find((c) => c.id === casarContaDaNotificacao(a, n, contas))
  return (
    <div className="cartao notif-card" data-testid="notif-ignorada-item">
      <div className="notif-cabecalho">
        <span className="notif-nome">{a.contraparte ?? n.app}</span>
        <span className="notif-quando">{dataHora(n.recebidoEm)}</span>
      </div>
      <div className="notif-secao-rotulo">O que o app entendeu</div>
      <dl className="notif-entendido">
        <dt>Motivo</dt>
        <dd>{n.status === 'descartada' ? 'você mandou ignorar' : 'não parece movimentação de dinheiro'}</dd>
        <dt>App</dt>
        <dd>{n.app}{conta ? ` · conta ${conta.nome}` : ''}</dd>
      </dl>
      <div className="notif-secao-rotulo">Texto original da notificação</div>
      <p className="notif-texto-original">{[n.titulo, n.texto].filter(Boolean).join(' — ')}</p>
      <div className="notif-acoes">
        <button type="button" className="primario" onClick={() => aoConfirmar(n)}>
          {ROTULO_ACAO.lancarMesmoAssim}
        </button>
        <button
          type="button"
          className="secundario"
          data-testid="notif-voltar-pendentes"
          onClick={() => n.id != null && voltarParaPendentes(n.id)}
        >
          {ROTULO_ACAO.trazerDeVolta}
        </button>
      </div>
    </div>
  )
}

/* Fase 4: a proposta de transferência. SEMPRE proposta — os dois textos crus
   ficam à vista justamente porque o falso positivo é real (pagar R$ 500 e
   receber R$ 500 no mesmo minuto bate em todos os critérios). */
function PropostaTransferencia({
  par, contas, categorias, dataHora, nativo, ignorados, aoIgnorarPacote,
}: {
  par: ParTransferencia
  contas: Conta[]
  categorias: import('../db').Categoria[]
  dataHora: (iso: string) => string
  nativo: boolean
  ignorados: string[]
  aoIgnorarPacote: (pacote: string) => void
}) {
  const [descricao, setDescricao] = useState(par.descricaoSugerida)
  const [origemId, setOrigemId] = useState<number | ''>(par.contaOrigemId ?? '')
  const [destinoId, setDestinoId] = useState<number | ''>(par.contaDestinoId ?? '')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)

  const catsTransf = categorias.filter((c) => c.ativa !== false)

  async function confirmar() {
    if (origemId === '' || destinoId === '') { setErro('Escolha a conta de origem e a de destino.'); return }
    if (origemId === destinoId) { setErro('Origem e destino precisam ser contas diferentes.'); return }
    if (categoriaId === '') { setErro('Escolha a categoria da transferência.'); return }
    await criarTransferenciaDoPar(par, {
      contaOrigemId: Number(origemId),
      contaDestinoId: Number(destinoId),
      categoriaOrigemId: Number(categoriaId),
      categoriaDestinoId: Number(categoriaId),
      descricao,
    })
    setPronto(true)
  }

  if (pronto) return null

  /* Build 101 (Decisão 121), pedido do Rafael: o par tem DUAS notificações,
     às vezes de apps diferentes — o link de silenciar precisa valer pra cada
     app envolvido, não só "aquele app" no singular. Mesma lógica de
     `podeIgnorarApp`/`aoIgnorarApp` do card avulso (`CartaoNotificacao`),
     só que aplicada aos dois lados do par (sem repetir quando é o mesmo
     app dos dois lados). */
  const appsDoPar = [par.saida, par.entrada]
    .filter((n, i, arr) => arr.findIndex((o) => o.pacote === n.pacote) === i)
    .filter((n) => !ignorados.includes(n.pacote))

  return (
    <div className="cartao" data-testid="notif-par-transferencia">
      <h2 style={{ marginTop: 0 }}>Parece uma transferência entre suas contas</h2>
      <p className="texto-fraco" style={{ fontSize: 12, marginTop: 0 }}>
        Duas notificações de {fmtBRL(par.valor)} em sentidos opostos, com {Math.round(par.minutos)} minuto(s) de
        diferença, nos dois apps que casam com contas da sua Carteira. Vira <b>uma transferência</b> (dois lados
        ligados), nunca dois lançamentos soltos — mas só se você confirmar.
        {par.jaConfirmadoAntes && ' Você já confirmou este par de apps antes.'}
      </p>
      <div className="notif-secao-rotulo">Textos originais das duas notificações</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        {[par.saida, par.entrada].map((n) => (
          <div key={n.id} style={{ flex: 1, minWidth: 0 }}>
            <div className="notif-quando" style={{ marginBottom: 4 }}><b>{n.app}</b> · {dataHora(n.recebidoEm)}</div>
            <p className="notif-texto-original" style={{ fontSize: 11 }}>{[n.titulo, n.texto].filter(Boolean).join(' — ')}</p>
          </div>
        ))}
      </div>
      <label htmlFor="par-desc" style={{ fontSize: 12 }}>O que foi</label>
      <input id="par-desc" value={descricao} onChange={(e) => setDescricao(e.target.value)} style={{ width: '100%' }} />
      <label htmlFor="par-origem" style={{ fontSize: 12 }}>Saiu de</label>
      <select id="par-origem" value={origemId} onChange={(e) => setOrigemId(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%' }}>
        <option value="">Escolha…</option>
        {contas.filter((c) => c.ativa !== false).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <label htmlFor="par-destino" style={{ fontSize: 12 }}>Entrou em</label>
      <select id="par-destino" value={destinoId} onChange={(e) => setDestinoId(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%' }}>
        <option value="">Escolha…</option>
        {contas.filter((c) => c.ativa !== false).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      <label htmlFor="par-cat" style={{ fontSize: 12 }}>Categoria</label>
      <select id="par-cat" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '100%' }}>
        <option value="">Escolha…</option>
        {catsTransf.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
      {erro && <p className="valor-neg texto-quebra" style={{ fontSize: 12 }}>{erro}</p>}
      <div className="notif-acoes">
        <button type="button" className="primario" data-testid="notif-confirmar-transferencia" onClick={confirmar}>
          {ROTULO_ACAO.simTransferencia}
        </button>
        <button type="button" className="secundario" data-testid="notif-recusar-transferencia" onClick={() => setPronto(true)}>
          {ROTULO_ACAO.naoTransferencia}
        </button>
        {/* Build 100 (18/09/2026), pedido do Rafael: faltava o botão de
            ignorar — igual a todo outro card de notificação — pra este par
            específico. Sem ele a única saída era confirmar como transferência
            ou "Não, são separadas" (que só esconde o card nesta sessão; volta
            a propor o MESMO par depois, porque nada muda no banco). Ignorar
            descarta as DUAS notificações de uma vez — somem de Pendentes e
            vão pra Ignoradas, com volta (`descartarNotificacao`, a mesma
            função de qualquer notificação avulsa).
            Build 101 (Decisão 121): virou o 3º BOTÃO desta linha — o Rafael
            achou o link de antes "muito sutil" pra uma ação real (a mesma
            reclamação de sempre: ação de card é botão, nunca texto solto). */}
        <button
          type="button"
          className="secundario"
          data-testid="notif-ignorar-par-transferencia"
          onClick={async () => {
            if (par.saida.id != null) await descartarNotificacao(par.saida.id)
            if (par.entrada.id != null) await descartarNotificacao(par.entrada.id)
            setPronto(true)
          }}
        >
          {ROTULO_ACAO.ignorar} (as duas)
        </button>
      </div>
      {/* Build 101 (Decisão 121), pedido do Rafael: faltava aqui o link
          padrão que todo outro card de notificação já tem — "não ler mais
          notificações deste app". Um link por app distinto envolvido no par
          (normalmente dois: quem manda e quem recebe). */}
      {nativo && appsDoPar.map((n) => (
        <button
          key={n.pacote}
          type="button"
          className="notif-link"
          data-testid="notif-ignorar-app-par-transferencia"
          onClick={() => aoIgnorarPacote(n.pacote)}
        >
          {ROTULO_ACAO.naoLerMais(n.app)}
        </button>
      ))}
    </div>
  )
}
