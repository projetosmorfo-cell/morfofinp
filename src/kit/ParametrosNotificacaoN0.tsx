/* N0 → Parâmetros → "Notificações bancárias" (16/09/2026, build 080, fase 5).
 *
 * O PONTO ARQUITETURAL QUE O RAFAEL MAIS COBROU, e que generaliza além deste
 * assunto: **parâmetro, configuração e layout são definidos no N0 e aplicados
 * localmente em cada instalação; só o DADO de lançamento é privado do cliente.**
 * Esta tela é a primeira aplicação disso fora do padrão de categorias.
 *
 * Ela edita TODOS os parâmetros — os 11 que o app do cliente também expõe e os
 * 5 internos (marcadores de propaganda, tamanho máximo de nome, exigência das
 * duas contas na transferência), que existem só aqui.
 *
 * O ESCOPO É ESCOLHIDO NO SALVAMENTO, explicitamente, e nunca por padrão:
 *   (a) "Para todos" — vale inclusive pra quem personalizou. A tela LISTA
 *       ANTES quais clientes têm valor próprio e serão afetados, e quais
 *       parâmetros cada um mexeu. Publicar sem ver isso seria empurrar por
 *       cima no escuro.
 *   (b) "Só pra quem nunca mexeu" — a semântica do `aplicarPadraoSeNaoEditado`
 *       do padrão de categorias, parâmetro a parâmetro.
 *
 * O LIMITE HONESTO, ESCRITO NA PRÓPRIA TELA, não escondido num comentário: não
 * existe backend. Uma publicação só alcança os ambientes que moram NESTE
 * aparelho — os clientes cadastrados aqui e o ambiente do próprio Rafael. A
 * lista de afetados mostra o que é genuinamente conhecível localmente e diz
 * isso com todas as letras. O mecanismo (versão, escopo, marca de aplicado por
 * ambiente) já está escrito do jeito que vai funcionar no dia em que existir
 * servidor: o que muda lá é a ORIGEM do `platformN0`, nada aqui.
 */
import { useEffect, useState } from 'react'
import { DEV_CARD, SectionLabel, primaryBtn, secondaryBtn, Segmented } from './kitBase'
import { lerPlatformN0Persistida, salvarParametrosNotificacaoN0 } from './kitPlatform'
import {
  PARAMETROS_NOTIFICACAO_PADRAO,
  PARAMETROS_NIVEL_USUARIO,
  ROTULO_PARAMETRO,
  exemploDoParametro,
  comporParametros,
  ambientesComParametrosProprios,
  OPCOES_JANELA_BUSCA,
  type ParametrosNotificacao,
  type EscopoPublicacao,
} from '../notificacaoParametros'
import { AMBIENTE_DESTE_APARELHO } from '../ambiente'

const DEV_TXT2 = '#9B96A8'
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
  border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 10, padding: '9px 11px',
  color: '#fff', fontSize: 13.5, outline: 'none',
}

/* Build 085 — pedido do Rafael: *"quero que pra todos os parametros criados
   tanto visiveis no N1 como no N0, tenha uma breve e rápido texto de explicação,
   com exemplos, mas sem extender muito"*.

   A explicação e o exemplo saem de `notificacaoParametros.ts`, os MESMOS que a
   tela do cliente mostra — dois textos para o mesmo parâmetro divergiriam na
   primeira vez que alguém editasse um só. O exemplo é escrito com o valor que
   está NO CAMPO desta tela (não o de fábrica): quem está digitando 3 dias lê o
   exemplo com 3 antes de publicar.

   BUILD 090 (17/09/2026) — o Rafael achou esta tela "horrível" ao lado da tela
   do cliente ("a do N1 está bem mais bonita, organizada"). O que mudou: a tela
   passou a usar EXATAMENTE a mesma grade da tela do cliente — `.param-linha`
   (rótulo + explicação + exemplo à esquerda, o controle numa coluna FIXA de
   132px à direita), o par Sim/Não (`.param-simnao`) no lugar do checkbox
   solto, e um card por SEÇÃO em vez de um card por parâmetro. A única
   diferença é a paleta: o modificador `.param-dark` troca as cores pra as do
   painel N0. Peça única (Decisão 40): CSS compartilhado, nunca uma segunda
   versão desenhada à mão aqui. */
function AjudaParametro({ chave, valor, sufixo }: { chave: keyof ParametrosNotificacao; valor: unknown; sufixo?: string }) {
  const ex = exemploDoParametro(chave, valor)
  return <>
    <p className="param-ajuda">{ROTULO_PARAMETRO[chave].ajuda}{sufixo ? ` ${sufixo}` : ''}</p>
    {ex && <p className="param-exemplo" data-testid={`n0-exemplo-${chave}`}><b>Exemplo:</b> {ex}</p>}
  </>
}

const CHAVES_USUARIO = new Set<string>(PARAMETROS_NIVEL_USUARIO)
const TODAS_CHAVES = Object.keys(PARAMETROS_NOTIFICACAO_PADRAO) as (keyof ParametrosNotificacao)[]

interface Afetado {
  ambiente: string
  nome: string
  chaves: string[]
}

export default function ParametrosNotificacaoN0({ notify }: { notify: (m: string) => void }) {
  const [valores, setValores] = useState<ParametrosNotificacao | null>(null)
  const [versao, setVersao] = useState(0)
  const [escopo, setEscopo] = useState<EscopoPublicacao>('naoEditados')
  const [afetados, setAfetados] = useState<Afetado[] | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    void (async () => {
      const platform = await lerPlatformN0Persistida()
      const pub = platform.parametrosNotificacao
      setVersao(pub?.versao ?? 0)
      if (pub?.escopo) setEscopo(pub.escopo)
      // A tela abre com o padrão publicado HOJE (fábrica + publicação), como o
      // padrão de categorias já faz — nunca em branco.
      setValores(comporParametros(pub?.valores, undefined))
      const lista = await ambientesComParametrosProprios()
      const nomes = new Map<string, string>()
      for (const t of platform.tenants ?? []) nomes.set(t.id, t.companyName || t.id)
      setAfetados(
        lista.map((x) => ({
          ambiente: x.ambiente,
          nome:
            x.ambiente === AMBIENTE_DESTE_APARELHO
              ? `${nomes.get(x.ambiente) ?? 'Ambiente deste aparelho'} (este aparelho)`
              : nomes.get(x.ambiente) ?? x.ambiente,
          chaves: x.chaves,
        })),
      )
    })()
  }, [])

  if (!valores) return <p style={{ fontSize: 12, color: DEV_TXT2 }}>Carregando os parâmetros atuais…</p>

  const set = (k: keyof ParametrosNotificacao, v: unknown) => setValores((p) => (p ? { ...p, [k]: v } : p))

  async function salvar() {
    if (!valores) return
    setSalvando(true)
    try {
      const nova = await salvarParametrosNotificacaoN0(valores, escopo)
      setVersao(nova)
      notify(
        escopo === 'todos'
          ? `Publicado (versão ${nova}) PARA TODOS — os ambientes deste aparelho perdem a personalização na próxima abertura`
          : `Publicado (versão ${nova}) só pra quem nunca mexeu — quem personalizou mantém o valor dele`,
      )
      /* Recarrega a lista de afetados: depois de uma publicação 'todos' ela
         muda (a personalização é apagada na abertura seguinte de cada um). */
      setAfetados(await ambientesComParametrosProprios().then((l) => l.map((x) => ({ ambiente: x.ambiente, nome: x.ambiente, chaves: x.chaves }))))
    } catch {
      notify('Não foi possível publicar os parâmetros')
    }
    setSalvando(false)
  }

  const campoDe = (k: keyof ParametrosNotificacao) => {
    const v = valores[k]
    const rot = ROTULO_PARAMETRO[k]
    const id = `n0-param-${k}`
    if (Array.isArray(v)) {
      /* Lista de marcadores: o controle não cabe na coluna de 132px — a linha
         vira coluna (rótulo/ajuda em cima, o campo na largura inteira). */
      return (
        <div key={k} className="param-linha param-linha-coluna" data-testid={`n0-param-${k}`}>
          <div className="param-texto">
            <label className="param-rotulo" htmlFor={id}>{rot.titulo}</label>
            <AjudaParametro chave={k} valor={v} sufixo="Separe por vírgula." />
          </div>
          <textarea
            id={id}
            style={{ ...campo, minHeight: 70, fontFamily: 'inherit' }}
            value={v.join(', ')}
            onChange={(e) => set(k, e.target.value.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean))}
          />
        </div>
      )
    }
    return (
      <div key={k} className="param-linha" data-testid={`n0-param-${k}`}>
        <div className="param-texto">
          <label className="param-rotulo" htmlFor={id}>{rot.titulo}</label>
          <AjudaParametro chave={k} valor={v} />
        </div>
        <div className="param-controle">
          {typeof v === 'boolean' ? (
            <div className="param-simnao" id={id} role="group" aria-label={rot.titulo}>
              <button type="button" className={v ? 'ativo' : ''} aria-pressed={v} data-testid={`n0-param-${k}-sim`} onClick={() => set(k, true)}>
                Sim
              </button>
              <button type="button" className={!v ? 'ativo' : ''} aria-pressed={!v} data-testid={`n0-param-${k}-nao`} onClick={() => set(k, false)}>
                Não
              </button>
            </div>
          ) : typeof v === 'string' ? (
            /* Hoje só `janelaBuscaModo` cai aqui (build 081): parâmetro de
               ESCOLHA. As opções vêm do mesmo lugar que a tela do usuário lê. */
            <select id={id} value={v} onChange={(e) => set(k, e.target.value)}>
              {OPCOES_JANELA_BUSCA.map((o) => (
                <option key={o.valor} value={o.valor} style={{ color: '#111' }}>{o.rotulo}</option>
              ))}
            </select>
          ) : (
            <input
              id={id}
              type="number"
              min={0}
              step={k === 'toleranciaValorAbs' ? 0.5 : 1}
              value={String(v)}
              onChange={(e) => set(k, Number(e.target.value) || 0)}
            />
          )}
        </div>
      </div>
    )
  }

  return <>
    <p style={{ fontSize: 11.5, color: DEV_TXT2, lineHeight: 1.6, margin: '0 0 12px' }}>
      Todas as regras da leitura de notificação bancária — inclusive as que o aplicativo do cliente não mostra.
      Ao salvar, você escolhe <strong style={{ color: '#fff' }}>o alcance</strong>. Versão publicada hoje:{' '}
      <strong style={{ color: '#fff' }}>{versao === 0 ? 'nenhuma (vale o padrão de fábrica)' : versao}</strong>.
    </p>

    <SectionLabel dark>Regras que o cliente também vê</SectionLabel>
    <div className="param-dark" style={{ background: DEV_CARD, borderRadius: 12, padding: '0 12px' }} data-testid="n0-notif-regras-cliente">
      {TODAS_CHAVES.filter((k) => CHAVES_USUARIO.has(k)).map(campoDe)}
    </div>

    <SectionLabel dark>Regras internas (só aqui)</SectionLabel>
    <div className="param-dark" style={{ background: DEV_CARD, borderRadius: 12, padding: '0 12px' }} data-testid="n0-notif-regras-internas">
      {TODAS_CHAVES.filter((k) => !CHAVES_USUARIO.has(k)).map(campoDe)}
    </div>

    <SectionLabel dark>Alcance da publicação</SectionLabel>
    <div style={{ background: DEV_CARD, borderRadius: 12, padding: 12 }}>
      <Segmented
        dark
        value={escopo}
        onChange={(v) => setEscopo(v as EscopoPublicacao)}
        options={[
          { value: 'naoEditados', label: 'Só quem nunca mexeu' },
          { value: 'todos', label: 'Para todos' },
        ]}
      />
      <p style={{ fontSize: 11.5, color: DEV_TXT2, lineHeight: 1.6, margin: '10px 0 0' }}>
        {escopo === 'todos'
          ? 'Vale inclusive para quem já personalizou: na próxima abertura do aplicativo, o valor próprio do cliente é apagado e o seu passa a valer.'
          : 'Vale para todo parâmetro que o cliente nunca alterou, e para quem começar a usar daqui pra frente. O que ele escolheu fica como está.'}
      </p>

      <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10 }} data-testid="n0-notif-afetados">
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          Clientes com valores próprios {afetados ? `(${afetados.length})` : ''}
        </div>
        {afetados && afetados.length === 0 && (
          <p style={{ fontSize: 11.5, color: DEV_TXT2, margin: 0 }}>
            Nenhum ambiente deste aparelho personalizou parâmetro nenhum — nos dois alcances o efeito é o mesmo.
          </p>
        )}
        {afetados?.map((a) => (
          <div key={a.ambiente} style={{ fontSize: 11.5, color: '#fff', marginBottom: 4 }}>
            • {a.nome}
            <span style={{ color: DEV_TXT2 }}> — alterou: {a.chaves.map((c) => ROTULO_PARAMETRO[c as keyof ParametrosNotificacao]?.titulo ?? c).join(', ')}</span>
          </div>
        ))}
        <p style={{ fontSize: 11, color: '#F5C26B', lineHeight: 1.6, margin: '8px 0 0' }}>
          <strong>Sem servidor, esta lista cobre só os ambientes existentes NESTE aparelho.</strong> Clientes que usam
          o aplicativo no celular deles não são conhecidos aqui, e uma publicação só chega até eles quando existir um
          backend. O mecanismo (versão, alcance e marca de aplicado por ambiente) já funciona do jeito certo — o que
          falta é o canal, não a regra.
        </p>
      </div>
    </div>

    <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
      <button type="button" style={{ ...primaryBtn, flex: 1 }} disabled={salvando} data-testid="n0-notif-publicar" onClick={() => void salvar()}>
        {salvando ? 'Publicando…' : escopo === 'todos' ? 'Publicar para todos' : 'Publicar para quem não mexeu'}
      </button>
      <button
        type="button"
        style={{ ...secondaryBtn }}
        onClick={() => setValores({ ...PARAMETROS_NOTIFICACAO_PADRAO })}
      >
        Padrão de fábrica
      </button>
    </div>
    <p style={{ fontSize: 11, color: DEV_TXT2, lineHeight: 1.6, margin: '8px 0 0' }}>
      "Padrão de fábrica" só recarrega os campos desta tela com os valores originais do produto — nada é publicado
      antes de você salvar. O de/para aprendido em cada ambiente é DADO do cliente, não parâmetro da plataforma:
      nenhuma ação desta tela toca nele.
    </p>
  </>
}
