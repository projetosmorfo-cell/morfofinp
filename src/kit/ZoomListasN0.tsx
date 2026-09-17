/* N0 → Parâmetros → "Tamanho das fontes das listas" (build 094, item 2).
 *
 * Pedido do Rafael: *"Criar parametro no N0 pra definir como padrão pra novos
 * usuários ou perguntar se quer aplicar a todos, e no N1 permitir configurar
 * pro próprio ambiente."* — as duas metades da frase são, respectivamente, os
 * dois alcances de publicação desta tela e a seção de Aparência do app.
 *
 * Mesmo desenho de `ParametrosNotificacaoN0` (build 080): a tela abre com o
 * valor publicado HOJE, o alcance é escolhido no salvamento e nunca por
 * padrão, e os clientes que já escolheram um tamanho próprio são LISTADOS
 * antes — publicar "para todos" sem ver quem perde a escolha seria empurrar no
 * escuro. O limite honesto é o mesmo e está escrito na tela: sem backend, isto
 * alcança só os ambientes deste aparelho.
 *
 * A PRÉVIA É A MESMA PEÇA DO N1 (`PreviaLista`), com os mesmos três casos —
 * quem publica precisa ver exatamente o que o cliente vai ver.
 */
import { useEffect, useState } from 'react'
import { DEV_CARD, SectionLabel, primaryBtn, secondaryBtn, Segmented } from './kitBase'
import { lerPlatformN0Persistida, salvarZoomListasN0 } from './kitPlatform'
import type { EscopoPublicacao } from '../notificacaoParametros'
import { AMBIENTE_DESTE_APARELHO } from '../ambiente'
import CampoPercentual from '../components/CampoPercentual'
import PreviaLista from '../components/PreviaLista'
import {
  ZOOM_LISTAS_PADRAO,
  ZOOM_LISTAS_MIN,
  ZOOM_LISTAS_MAX,
  ZOOM_LISTAS_PASSO,
  ESPACO_LISTAS_PADRAO,
  ESPACO_LISTAS_MIN,
  ESPACO_LISTAS_MAX,
  ESPACO_LISTAS_PASSO,
  ambientesComZoomProprio,
  padraoDoAppZoom,
  padraoDoAppEspaco,
} from '../zoomListas'

const DEV_TXT2 = '#9B96A8'

interface Afetado {
  ambiente: string
  nome: string
  /* Opcionais porque um ambiente pode ter personalizado SÓ um dos dois
     parâmetros (zoom das fontes ou espaço entre lançamentos). */
  pct?: number
  espacoPx?: number
}

export default function ZoomListasN0({ notify }: { notify: (m: string) => void }) {
  const [pct, setPct] = useState<number | null>(null)
  const [espaco, setEspaco] = useState(ESPACO_LISTAS_PADRAO)
  const [versao, setVersao] = useState(0)
  const [escopo, setEscopo] = useState<EscopoPublicacao>('naoEditados')
  const [afetados, setAfetados] = useState<Afetado[] | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function carregarAfetados(nomes: Map<string, string>) {
    const lista = await ambientesComZoomProprio()
    setAfetados(
      lista.map((x) => ({
        ambiente: x.ambiente,
        pct: x.pct,
        espacoPx: x.espacoPx,
        nome:
          x.ambiente === AMBIENTE_DESTE_APARELHO
            ? `${nomes.get(x.ambiente) ?? 'Ambiente deste aparelho'} (este aparelho)`
            : nomes.get(x.ambiente) ?? x.ambiente,
      })),
    )
  }

  useEffect(() => {
    void (async () => {
      const platform = await lerPlatformN0Persistida()
      const pub = platform.zoomListas
      setVersao(pub?.versao ?? 0)
      if (pub?.escopo) setEscopo(pub.escopo)
      setPct(padraoDoAppZoom(pub))
      setEspaco(padraoDoAppEspaco(pub))
      const nomes = new Map<string, string>()
      for (const t of platform.tenants ?? []) nomes.set(t.id, t.companyName || t.id)
      await carregarAfetados(nomes)
    })()
  }, [])

  if (pct === null) return <p style={{ fontSize: 12, color: DEV_TXT2 }}>Carregando o valor publicado…</p>

  async function publicar() {
    if (pct === null) return
    setSalvando(true)
    try {
      const nova = await salvarZoomListasN0(pct, espaco, escopo)
      setVersao(nova)
      notify(
        escopo === 'todos'
          ? `Publicado (versão ${nova}) PARA TODOS — quem escolheu um tamanho próprio perde a escolha na próxima abertura`
          : `Publicado (versão ${nova}) só pra quem nunca mexeu — quem escolheu mantém o tamanho dele`,
      )
      const platform = await lerPlatformN0Persistida()
      const nomes = new Map<string, string>()
      for (const t of platform.tenants ?? []) nomes.set(t.id, t.companyName || t.id)
      await carregarAfetados(nomes)
    } catch {
      notify('Não foi possível publicar o tamanho das fontes')
    }
    setSalvando(false)
  }

  return <>
    <p style={{ fontSize: 11.5, color: DEV_TXT2, lineHeight: 1.6, margin: '0 0 12px' }}>
      A aparência da lista de lançamentos (menu Lançamentos e dentro de cada carteira) com que um cliente
      NOVO começa: o tamanho das fontes e o espaço entre um lançamento e outro.{' '}
      <strong style={{ color: '#fff' }}>0% é o tamanho original do produto</strong>; negativo diminui.
      O percentual não iguala os tamanhos entre si — é um zoom sobre o que cada elemento já tem. Versão publicada hoje:{' '}
      <strong style={{ color: '#fff' }}>{versao === 0 ? 'nenhuma (vale o padrão de fábrica)' : versao}</strong>.
    </p>

    <SectionLabel dark>Padrão de fábrica</SectionLabel>
    <div style={{ background: DEV_CARD, borderRadius: 12, padding: 12 }} data-testid="n0-zoom-bloco">
      <div className="param-rotulo-campo" style={{ color: '#fff' }}>Tamanho das fontes</div>
      <CampoPercentual
        valor={pct}
        onChange={setPct}
        min={ZOOM_LISTAS_MIN}
        max={ZOOM_LISTAS_MAX}
        passo={ZOOM_LISTAS_PASSO}
        testid="n0-zoom"
        ariaLabel="Percentual padrão das fontes da lista"
      />

      <div className="param-rotulo-campo" style={{ color: '#fff', marginTop: 14 }}>
        Espaço entre os lançamentos
      </div>
      <CampoPercentual
        valor={espaco}
        onChange={setEspaco}
        min={ESPACO_LISTAS_MIN}
        max={ESPACO_LISTAS_MAX}
        passo={ESPACO_LISTAS_PASSO}
        sufixo="px"
        testid="n0-espaco"
        ariaLabel="Espaço padrão em pixels entre os lançamentos"
      />

      <PreviaLista
        titulo="Tamanho original do produto"
        zoomPct={ZOOM_LISTAS_PADRAO}
        espacoPx={ESPACO_LISTAS_PADRAO}
        testid="n0-previa-hoje"
      />
      <PreviaLista
        titulo="Como o cliente novo vai ver"
        zoomPct={pct}
        espacoPx={espaco}
        testid="n0-previa-resultado"
      />
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
          ? 'Vale inclusive para quem já escolheu um tamanho: na próxima abertura do aplicativo, a escolha do cliente é apagada e a sua passa a valer.'
          : 'Vale para quem nunca mexeu neste campo e para quem começar a usar daqui pra frente. Quem escolheu um tamanho fica com o dele.'}
      </p>

      <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10 }} data-testid="n0-zoom-afetados">
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          Clientes com tamanho próprio {afetados ? `(${afetados.length})` : ''}
        </div>
        {afetados && afetados.length === 0 && (
          <p style={{ fontSize: 11.5, color: DEV_TXT2, margin: 0 }}>
            Nenhum ambiente deste aparelho escolheu um tamanho — nos dois alcances o efeito é o mesmo.
          </p>
        )}
        {afetados?.map((a) => (
          <div key={a.ambiente} style={{ fontSize: 11.5, color: '#fff', marginBottom: 4 }}>
            • {a.nome}
            <span style={{ color: DEV_TXT2 }}>
              {' '}— escolheu{' '}
              {[
                a.pct === undefined ? null : `${a.pct > 0 ? '+' : ''}${a.pct}% de fonte`,
                a.espacoPx === undefined ? null : `${a.espacoPx}px de espaço`,
              ]
                .filter(Boolean)
                .join(' e ')}
            </span>
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
      <button type="button" style={{ ...primaryBtn, flex: 1 }} disabled={salvando} data-testid="n0-zoom-publicar" onClick={() => void publicar()}>
        {salvando ? 'Publicando…' : escopo === 'todos' ? 'Publicar para todos' : 'Publicar para quem não mexeu'}
      </button>
      <button
        type="button"
        style={{ ...secondaryBtn }}
        onClick={() => {
          setPct(ZOOM_LISTAS_PADRAO)
          setEspaco(ESPACO_LISTAS_PADRAO)
        }}
      >
        Padrão de fábrica
      </button>
    </div>
    <p style={{ fontSize: 11, color: DEV_TXT2, lineHeight: 1.6, margin: '8px 0 0' }}>
      "Padrão de fábrica" só recarrega os campos desta tela com os valores originais do produto — nada é publicado
      enquanto você não tocar em publicar.
    </p>
  </>
}
