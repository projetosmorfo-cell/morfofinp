import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type AprendizadoNotificacao } from '../db'
import { lerDoAmbiente } from '../ambiente'
import {
  PARAMETROS_NIVEL_USUARIO,
  ROTULO_PARAMETRO,
  OPCOES_JANELA_BUSCA,
  definirParametroDoUsuario,
  exemploDoParametro,
  restaurarPadraoDoApp,
  temParametrosProprios,
  useParamsNotificacao,
  type ChaveParametroUsuario,
} from '../notificacaoParametros'
import { apagarAprendizado, salvarAprendizado } from '../vinculoNotificacao'
import ConfirmacaoAcao from '../components/ConfirmacaoAcao'

/* Configurações → "Regras de Notificação Bancária" (build 080; renomeada e
 * redesenhada na build 085).
 *
 * É a tela de NÍVEL USUÁRIO dos parâmetros da leitura de notificação. Ela
 * mostra só o que faz sentido pra quem usa o app — pedido literal do Rafael:
 * "só o que fizer sentido a nível de usuário". O resto (as listas de
 * marcadores de propaganda, o tamanho máximo de nome, a exigência das duas
 * contas na transferência) é interno e só existe no N0.
 *
 * O QUE MUDOU NA BUILD 085 — o Rafael achou a tela feia e nomeou os defeitos:
 * *"esta tela está feia, deixe no padrão do app, com botões, alinhados, sem
 * espaçamentos desnecessários"*. Os três, um a um:
 *
 *   • BOTÕES — os liga/desliga eram `<input type="checkbox">` soltos. Viraram
 *     um par Sim/Não (`.param-simnao`) que ocupa a mesma coluna dos outros
 *     campos. As ações das listas (Editar/Apagar/Fechar) eram botões sem
 *     classe, com `padding` inline; passaram a usar `.botao-mini-secundario`/
 *     `.botao-mini-perigo`, que é o par que o app já tem pra ação em linha
 *     desde a build 047.
 *   • ALINHADOS — todo controle mora numa COLUNA de largura fixa
 *     (`.param-controle`, 132px) e ocupa 100% dela, então número, escolha e
 *     sim/não nascem com a MESMA borda esquerda e a MESMA borda direita. É a
 *     ideia da coluna de sufixo fixa do `LinhaParam` do N0 (build 056)
 *     aplicada ao campo inteiro, em vez de cada linha se virar com um `flex`
 *     próprio.
 *   • ESPAÇAMENTO — sumiram os `style={{...}}` de tamanho/margem espalhados
 *     por linha. O ritmo vem do `.cartao`/`.param-linha`/`h2` do app, o mesmo
 *     de `Contas.tsx` e `Categorias.tsx`.
 *
 * DUAS COISAS QUE NÃO MUDARAM, e que continuam sendo o coração da tela:
 *
 * 1. "Restaurar padrão do app" NÃO volta pra uma constante congelada no
 *    código: volta pro valor que o N0 publica HOJE. Quem apaga é a camada do
 *    ambiente (ver as 3 camadas em `notificacaoParametros.ts`).
 *
 * 2. O DE/PARA APRENDIDO mora aqui, editável e apagável. Ele é o ativo que vai
 *    fazer a importação de extrato casar sozinha, e o Rafael disse que quer
 *    administrar — então nada de regra oculta: cada linha é "texto do banco →
 *    nome", e ele muda ou apaga quando quiser.
 */
export default function ParametrosNotificacao({ aoVoltar }: { aoVoltar: () => void }) {
  const { efetivos, proprios, padraoApp } = useParamsNotificacao()
  const aprendizados = useLiveQuery(() => lerDoAmbiente(db.aprendizadosNotificacao.toArray()), []) ?? []
  const [confirmandoRestauro, setConfirmandoRestauro] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const personalizados = temParametrosProprios(proprios)
  const dePara = aprendizados.filter((a) => a.tipo === 'texto')
  const pares = aprendizados.filter((a) => a.tipo === 'parTransferencia')

  const ehPersonalizado = (k: ChaveParametroUsuario) => Object.prototype.hasOwnProperty.call(proprios, k)

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>‹ Voltar</button>
        <h1>Regras de Notificação Bancária</h1>
      </div>

      <p className="texto-fraco">
        Como o app lê as notificações do banco: o que ele considera repetição, o que ele trata como propaganda, e
        quanta folga ele aceita pra dizer que a cobrança é aquele gasto que você já tinha previsto.
      </p>

      <h2>Regras da leitura</h2>
      <div className="cartao" data-testid="notif-params">
        {PARAMETROS_NIVEL_USUARIO.map((k) => {
          const valor = efetivos[k]
          const rot = ROTULO_PARAMETRO[k]
          const exemplo = exemploDoParametro(k, valor)
          return (
            <div key={k} className="param-linha" data-testid={`param-${k}`}>
              <div className="param-texto">
                <label className="param-rotulo" htmlFor={`param-input-${k}`}>
                  {rot.titulo}
                  {ehPersonalizado(k) && <span className="param-marca"> · alterado por você</span>}
                </label>
                <p className="param-ajuda" data-testid={`ajuda-${k}`}>{rot.ajuda}</p>
                {exemplo && <p className="param-exemplo" data-testid={`exemplo-${k}`}><b>Exemplo:</b> {exemplo}</p>}
                {ehPersonalizado(k) && (
                  <p className="param-exemplo">Padrão do app: {rotuloValor(k, padraoApp[k])}</p>
                )}
              </div>
              <div className="param-controle">
                {k === 'janelaBuscaModo' ? (
                  /* Único parâmetro de usuário que é uma ESCOLHA, não número
                     nem liga/desliga (build 081) — por isso o `select`. */
                  <select
                    id={`param-input-${k}`}
                    value={String(valor)}
                    onChange={(e) => definirParametroDoUsuario(k, e.target.value as never)}
                  >
                    {OPCOES_JANELA_BUSCA.map((o) => (
                      <option key={o.valor} value={o.valor}>{o.rotulo}</option>
                    ))}
                  </select>
                ) : typeof valor === 'boolean' ? (
                  /* Build 085: dois BOTÕES de verdade no lugar da caixinha
                     solta — é o que alinha este controle com os campos de
                     número e de escolha da mesma tela. */
                  <div className="param-simnao" id={`param-input-${k}`} role="group" aria-label={rot.titulo}>
                    <button
                      type="button"
                      className={valor ? 'ativo' : ''}
                      aria-pressed={valor}
                      data-testid={`param-${k}-sim`}
                      onClick={() => definirParametroDoUsuario(k, true as never)}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      className={!valor ? 'ativo' : ''}
                      aria-pressed={!valor}
                      data-testid={`param-${k}-nao`}
                      onClick={() => definirParametroDoUsuario(k, false as never)}
                    >
                      Não
                    </button>
                  </div>
                ) : (
                  <input
                    id={`param-input-${k}`}
                    type="number"
                    min={0}
                    step={k === 'toleranciaValorAbs' ? 0.5 : 1}
                    value={String(valor)}
                    onChange={(e) => definirParametroDoUsuario(k, (Number(e.target.value) || 0) as never)}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>

      <h2>Padrão do app</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          {personalizados
            ? 'Você alterou algumas regras. "Voltar ao padrão do app" devolve todas pro valor que o app publica hoje — não pra um valor congelado de quando o app foi feito.'
            : 'Nada foi alterado: todas as regras estão no padrão do app.'}
        </p>
        <button
          type="button"
          className="secundario"
          disabled={!personalizados}
          data-testid="notif-restaurar-padrao"
          onClick={() => setConfirmandoRestauro(true)}
        >
          Voltar ao padrão do app
        </button>
        {confirmandoRestauro && (
          /* Build 093 (item 5): a confirmação única do app. */
          <ConfirmacaoAcao
            titulo="Voltar todas as regras ao padrão do app?"
            testid="confirmacao-notif-restaurar"
            aviso="Toda regra que você alterou volta pro valor que o app publica hoje. O de/para aprendido e os pares de apps não são apagados."
            onCancelar={() => setConfirmandoRestauro(false)}
            onConfirmar={() => {
              void (async () => { await restaurarPadraoDoApp(); setConfirmandoRestauro(false); setAviso('Regras de volta ao padrão do app.') })()
            }}
          />
        )}
        {aviso && <p className="texto-fraco" style={{ marginBottom: 0 }}>{aviso}</p>}
      </div>

      <h2>De/para aprendido</h2>
      <div className="cartao" data-testid="notif-depara-lista">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Cada vez que você lança uma notificação, o app guarda o que aquele texto do banco significa pra você.
          É isso que faz a próxima notificação do mesmo lugar já vir preenchida. Você manda aqui: editar ou esquecer.
        </p>
        <p className="param-exemplo" style={{ margin: '0 0 8px' }}>
          <b>Exemplo:</b> o banco manda "PAG*PJBANK"; você lança como "PJ Bank", em Serviços. A próxima "PAG*PJBANK"
          já abre assim, sem digitar nada.
        </p>
        {dePara.length === 0 && <p className="texto-fraco" style={{ margin: 0 }}>Nada aprendido ainda.</p>}
        {dePara.map((a) => <LinhaDePara key={a.id} a={a} />)}
      </div>

      {pares.length > 0 && (
        <>
          <h2>Pares de apps confirmados como transferência</h2>
          <div className="cartao" data-testid="notif-pares-lista">
            <p className="texto-fraco" style={{ marginTop: 0 }}>
              Quando você confirma que duas notificações são uma transferência entre suas contas, o app lembra o par
              de apps — só pra sugerir com mais confiança da próxima vez. Nunca cria nada sozinho.
            </p>
            <p className="param-exemplo" style={{ margin: '0 0 8px' }}>
              <b>Exemplo:</b> Bradesco e C6 confirmados uma vez. Na próxima saída de um e entrada no outro, com o mesmo
              valor e poucos minutos de diferença, a proposta de transferência já vem montada.
            </p>
            {pares.map((a) => (
              <div key={a.id} className="linha">
                <span style={{ minWidth: 0 }}>{a.rotulo} <span className="texto-fraco">· {a.vezes}×</span></span>
                <div className="confirmacao-inline-linha">
                  <button type="button" className="botao-mini-perigo" onClick={() => a.id != null && apagarAprendizado(a.id)}>Esquecer este par</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

/** Valor de parâmetro do jeito que a pessoa leu na tela, não do jeito interno. */
function rotuloValor(chave: string, valor: unknown): string {
  if (chave === 'janelaBuscaModo') {
    return OPCOES_JANELA_BUSCA.find((o) => o.valor === valor)?.rotulo ?? String(valor)
  }
  return String(valor)
}

function LinhaDePara({ a }: { a: AprendizadoNotificacao }) {
  const [editando, setEditando] = useState(false)
  const [descricao, setDescricao] = useState(a.descricao ?? '')
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), []) ?? []
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), []) ?? []
  const [categoriaId, setCategoriaId] = useState<number | ''>(a.categoriaId ?? '')
  const [contaId, setContaId] = useState<number | ''>(a.contaId ?? '')

  return (
    <div className="param-linha" data-testid="notif-depara-item">
      <div className="param-texto">
        <div className="param-rotulo">
          {a.rotulo} → {a.descricao ?? '(sem nome)'}
        </div>
        <p className="param-ajuda">Aprendido {a.vezes}× a partir do que você lançou.</p>
        {editando && (
          <div style={{ marginTop: 8 }}>
            <label htmlFor={`dp-desc-${a.id}`}>Nome que vai pro lançamento</label>
            <input id={`dp-desc-${a.id}`} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
            <label htmlFor={`dp-cat-${a.id}`}>Categoria</label>
            <select id={`dp-cat-${a.id}`} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">(nenhuma)</option>
              {categorias.filter((c) => c.ativa !== false).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <label htmlFor={`dp-conta-${a.id}`}>Conta</label>
            <select id={`dp-conta-${a.id}`} value={contaId} onChange={(e) => setContaId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">(nenhuma)</option>
              {contas.filter((c) => c.ativa !== false).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <button
              type="button"
              className="primario"
              data-testid="notif-depara-salvar"
              onClick={async () => {
                if (a.id == null) return
                /* `Dexie.update()` com `undefined` APAGA a propriedade (build 062):
                   por isso cada campo só entra no patch quando tem valor. */
                await salvarAprendizado(a.id, {
                  ...(descricao ? { descricao } : {}),
                  ...(categoriaId === '' ? {} : { categoriaId: Number(categoriaId) }),
                  ...(contaId === '' ? {} : { contaId: Number(contaId) }),
                })
                setEditando(false)
              }}
            >
              Salvar
            </button>
          </div>
        )}
      </div>
      <div className="confirmacao-inline-linha" style={{ marginTop: 2 }}>
        <button type="button" className="botao-mini-secundario" data-testid="notif-depara-editar" onClick={() => setEditando((v) => !v)}>
          {editando ? 'Fechar' : 'Editar'}
        </button>
        <button type="button" className="botao-mini-perigo" data-testid="notif-depara-apagar" onClick={() => a.id != null && apagarAprendizado(a.id)}>
          Esquecer
        </button>
      </div>
    </div>
  )
}
