import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type NotificacaoPendente } from '../db'
import { fmtBRL } from '../formatoMoeda'
import {
  ehNativo,
  sincronizarPendentesNativas,
  descartarNotificacao,
  limparHistorico,
  criarNotificacaoDeTeste,
  obterPacotesIgnorados,
  ignorarPacote,
  deixarDeIgnorarPacote,
} from '../notificacaoBancaria'
import { BotoesPermissaoNotificacao, lerPermissoes, type EstadoPermissoes } from '../components/PermissoesNotificacao'
import { lerDoAmbiente } from '../ambiente'

// Tela "Notificações bancárias" (09/09/2026) — aberta pela engrenagem. Lista
// o que o Android capturou das notificações do banco/cartão e deixa a pessoa
// CONFIRMAR (abre o formulário de lançamento já preenchido — `aoConfirmar`,
// que `App.tsx` liga ao `DetalheLancamento` com `sugestao`) ou DESCARTAR.
// Nada vira lançamento sem passar por aqui. Ver `src/notificacaoBancaria.ts`.
//
// No navegador (MorfoFinP.html / dev server) o plugin nativo não existe: a
// seção de permissões explica isso e só a "notificação de teste" (ferramenta
// de MVP, BACKLOG.md item 030) alimenta a lista.
export default function NotificacoesBancarias({
  aoVoltar,
  aoConfirmar,
  somentePendentes,
}: {
  aoVoltar: () => void
  aoConfirmar: (n: NotificacaoPendente) => void
  /* Aberta pelo AVISO do topo ("N notificação(ões) do banco pra confirmar"),
     a tela mostra SÓ o que aquele aviso prometeu: a lista de pendentes com
     Confirmar/Descartar (11/09/2026, pedido do Rafael — "quando clico pra ver
     deve abrir tela só desse tema, e não deve abrir as outras opções que
     tenho hoje"). Permissões do Android, histórico com limpeza e a ferramenta
     de teste continuam existindo, na mesma tela completa, alcançada por
     Configurações → Notificações bancárias. */
  somentePendentes?: boolean
}) {
  const nativo = ehNativo()
  const pendentes = useLiveQuery(
    () => lerDoAmbiente(db.notificacoesPendentes.where('status').equals('pendente').reverse().sortBy('recebidoEm')),
    [],
  )
  const historico = useLiveQuery(
    () => lerDoAmbiente(db.notificacoesPendentes.where('status').anyOf(['confirmada', 'descartada']).reverse().sortBy('recebidoEm')),
    [],
  )
  const [permissoes, setPermissoes] = useState<EstadoPermissoes>({ acesso: false, aviso: false })
  const [aviso, setAviso] = useState<string | null>(null)
  const [ignorados, setIgnorados] = useState<string[]>([])
  const [mostrarHistorico, setMostrarHistorico] = useState(false)
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false)

  async function atualizarStatus() {
    if (!nativo) return
    setPermissoes(await lerPermissoes())
    setIgnorados(await obterPacotesIgnorados())
    const novas = await sincronizarPendentesNativas()
    if (novas > 0) setAviso(`${novas} notificação(ões) nova(s) lida(s) do aparelho.`)
  }

  // Ao abrir a tela e toda vez que o app volta pro primeiro plano (a pessoa
  // foi nas Configurações do Android ligar o acesso e voltou): reconfere o
  // acesso e puxa o que o serviço capturou enquanto o app estava fechado.
  useEffect(() => {
    atualizarStatus()
    const aoVoltarPraTela = () => { if (document.visibilityState === 'visible') atualizarStatus() }
    document.addEventListener('visibilitychange', aoVoltarPraTela)
    return () => document.removeEventListener('visibilitychange', aoVoltarPraTela)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const dataHora = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Notificações Bancárias</h1>
      </div>
      <p className="texto-fraco">
        {somentePendentes
          ? 'Cada movimentação detectada espera a sua confirmação — nada vira lançamento sozinho.'
          : 'O app lê as notificações do banco/cartão no seu celular e te avisa. Nada vira lançamento sozinho — você confirma ou edita cada uma aqui antes de gravar.'}
      </p>

      {!somentePendentes && (
      <>
      <h2>Leitura no Celular</h2>
      <div className="cartao" data-testid="notif-status">
        {!nativo ? (
          <p className="texto-fraco" style={{ margin: 0 }}>
            A leitura automática só funciona no <b>app Android instalado</b> (arquivo .apk). Neste navegador ela
            fica desligada — esta tela mostra só o que já foi capturado ou a notificação de teste abaixo.
          </p>
        ) : (
          <>
            {/* 12/09/2026: as DUAS permissões com o mesmo peso, cada uma no
                seu botão azul — antes a 2ª era um botão neutro solto e passava
                despercebida (ver src/components/PermissoesNotificacao.tsx). */}
            <BotoesPermissaoNotificacao
              estado={permissoes}
              aoMudar={(novo) => { setPermissoes(novo); setAviso(novo.aviso ? 'Aviso de "movimentação detectada" liberado.' : 'Sem permissão pra avisar — as notificações ainda entram na lista ao abrir o app.') }}
            />
            {ignorados.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span className="texto-fraco" style={{ fontSize: 12 }}>Apps ignorados:</span>
                {ignorados.map((p) => (
                  <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '4px 0' }}>
                    <span>{p}</span>
                    <button type="button" style={{ padding: '4px 10px' }} onClick={async () => { await deixarDeIgnorarPacote(p); setIgnorados(await obterPacotesIgnorados()) }}>
                      Voltar a ler
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {aviso && <p className="texto-fraco" style={{ fontSize: 13, marginBottom: 0 }}>{aviso}</p>}
      </div>
      </>
      )}

      <h2>
        Pendentes {pendentes && pendentes.length > 0 && <span className="texto-fraco" style={{ fontWeight: 400 }}>({pendentes.length})</span>}
      </h2>
      <div className="cartao" data-testid="notif-pendentes">
        {(!pendentes || pendentes.length === 0) && (
          <p className="texto-fraco" style={{ margin: 0 }}>Nenhuma notificação pendente.</p>
        )}
        {pendentes?.map((n) => (
          <div key={n.id} className="linha" style={{ display: 'block', padding: '10px 0' }} data-testid="notif-item">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 700 }}>{n.app}</span>
              <span className="texto-fraco" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{dataHora(n.recebidoEm)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', marginTop: 2 }}>
              <span className="texto-fraco" style={{ fontSize: 13 }}>{n.tipo === 'entrada' ? 'Entrada (palpite)' : 'Saída (palpite)'}</span>
              <span className={n.tipo === 'entrada' ? 'valor-pos' : 'valor-neg'} style={{ fontWeight: 700 }}>
                {n.valor != null ? fmtBRL(n.valor) : 'valor não reconhecido'}
              </span>
            </div>
            <p style={{ fontSize: 13, margin: '6px 0 8px', whiteSpace: 'pre-wrap' }}>
              {[n.titulo, n.texto].filter(Boolean).join(' — ')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="primario" style={{ marginTop: 0, flex: 1 }} onClick={() => aoConfirmar(n)}>
                Confirmar / editar
              </button>
              <button type="button" style={{ flex: 1 }} onClick={() => n.id != null && descartarNotificacao(n.id)}>
                Descartar
              </button>
            </div>
            {nativo && !ignorados.includes(n.pacote) && (
              <button
                type="button"
                className="texto-fraco"
                style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
                onClick={async () => { await ignorarPacote(n.pacote); setIgnorados(await obterPacotesIgnorados()) }}
              >
                Parar de ler notificações de "{n.app}"
              </button>
            )}
          </div>
        ))}
      </div>

      {!somentePendentes && (
      <>
      <h2>
        <button
          type="button"
          onClick={() => setMostrarHistorico((v) => !v)}
          style={{ background: 'none', border: 'none', padding: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}
        >
          {mostrarHistorico ? '▾' : '▸'} Histórico{' '}
          <span className="texto-fraco" style={{ fontWeight: 400 }}>({historico?.length ?? 0})</span>
        </button>
      </h2>
      {mostrarHistorico && (
        <div className="cartao">
          {(!historico || historico.length === 0) && <p className="texto-fraco" style={{ margin: 0 }}>Nada no histórico.</p>}
          {historico?.map((n) => (
            <div key={n.id} className="linha" style={{ display: 'block', padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontSize: 13 }}>
                  <b>{n.app}</b> · {n.valor != null ? fmtBRL(n.valor) : 'sem valor'}
                </span>
                <span className="texto-fraco" style={{ fontSize: 12 }}>
                  {n.status === 'confirmada' ? 'confirmada' : 'descartada'} · {dataHora(n.recebidoEm)}
                </span>
              </div>
            </div>
          ))}
          {historico && historico.length > 0 && (
            !confirmandoLimpeza ? (
              <button type="button" style={{ marginTop: 10, width: '100%' }} onClick={() => setConfirmandoLimpeza(true)}>
                Limpar histórico
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button type="button" className="primario" style={{ marginTop: 0, flex: 1, background: '#9B1C1C' }} onClick={async () => { await limparHistorico(); setConfirmandoLimpeza(false) }}>
                  Sim, limpar
                </button>
                <button type="button" style={{ flex: 1 }} onClick={() => setConfirmandoLimpeza(false)}>Cancelar</button>
              </div>
            )
          )}
        </div>
      )}

      <h2>Ferramenta de teste (MVP)</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ fontSize: 13, marginTop: 0 }}>
          Cria uma notificação falsa, no mesmo formato que o celular geraria, pra validar o fluxo de confirmar/descartar
          sem depender do banco. Some da versão de produção (BACKLOG item 030).
        </p>
        <button type="button" style={{ width: '100%' }} data-testid="notif-teste" onClick={() => criarNotificacaoDeTeste()}>
          Simular notificação do banco
        </button>
      </div>
      </>
      )}
    </>
  )
}
