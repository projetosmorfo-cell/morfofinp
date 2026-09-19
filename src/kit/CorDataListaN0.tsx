/* N0 → Parâmetros → "Cor da linha de data" (build 101, 18/09/2026, item 4
 * do Rafael: "Criar parametro pro N0 salvar como padrão e tbm pro N1
 * editar...").
 *
 * Mesmo desenho de `ZoomListasN0.tsx`: a tela abre com a cor publicada HOJE,
 * o alcance é escolhido no salvamento, e os clientes que já escolheram uma
 * cor própria são LISTADOS antes de publicar "para todos". A prévia é a
 * MESMA peça do N1 (`PreviaLista`), mostrando as duas listagens (Completa e
 * Simples) juntas — ver `src/corDataLista.ts`.
 */
import { useEffect, useState } from 'react'
import { DEV_CARD, SectionLabel, primaryBtn, secondaryBtn, Segmented } from './kitBase'
import { lerPlatformN0Persistida, salvarCorDataListaN0 } from './kitPlatform'
import type { EscopoPublicacao } from '../notificacaoParametros'
import { AMBIENTE_DESTE_APARELHO } from '../ambiente'
import PreviaLista from '../components/PreviaLista'
import { PALETA_CORES } from '../icones'
import {
  COR_DATA_LISTA_PADRAO,
  ambientesComCorDataListaPropria,
  padraoDoAppCorData,
} from '../corDataLista'

const DEV_TXT2 = '#9B96A8'

interface Afetado {
  ambiente: string
  nome: string
  cor: string
}

export default function CorDataListaN0({ notify }: { notify: (m: string) => void }) {
  const [cor, setCor] = useState<string | undefined | null>(null) // null = ainda carregando
  const [versao, setVersao] = useState(0)
  const [escopo, setEscopo] = useState<EscopoPublicacao>('naoEditados')
  const [afetados, setAfetados] = useState<Afetado[] | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function carregarAfetados(nomes: Map<string, string>) {
    const lista = await ambientesComCorDataListaPropria()
    setAfetados(
      lista.map((x) => ({
        ambiente: x.ambiente,
        cor: x.cor,
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
      const pub = platform.corDataLista
      setVersao(pub?.versao ?? 0)
      if (pub?.escopo) setEscopo(pub.escopo)
      setCor(padraoDoAppCorData(pub))
      const nomes = new Map<string, string>()
      for (const t of platform.tenants ?? []) nomes.set(t.id, t.companyName || t.id)
      await carregarAfetados(nomes)
    })()
  }, [])

  if (cor === null) return <p style={{ fontSize: 12, color: DEV_TXT2 }}>Carregando a cor publicada…</p>

  async function publicar() {
    setSalvando(true)
    try {
      const nova = await salvarCorDataListaN0(cor ?? undefined, escopo)
      setVersao(nova)
      notify(
        escopo === 'todos'
          ? `Publicado (versão ${nova}) PARA TODOS — quem escolheu uma cor própria perde a escolha na próxima abertura`
          : `Publicado (versão ${nova}) só pra quem nunca mexeu — quem escolheu mantém a cor dele`,
      )
      const platform = await lerPlatformN0Persistida()
      const nomes = new Map<string, string>()
      for (const t of platform.tenants ?? []) nomes.set(t.id, t.companyName || t.id)
      await carregarAfetados(nomes)
    } catch {
      notify('Não foi possível publicar a cor da linha de data')
    }
    setSalvando(false)
  }

  return <>
    <p style={{ fontSize: 11.5, color: DEV_TXT2, lineHeight: 1.6, margin: '0 0 12px' }}>
      A cor do texto da linha de data (separador de dia, nas duas listagens — Completa e Simples)
      com que um cliente NOVO começa.{' '}
      <strong style={{ color: '#fff' }}>Sem cor escolhida, segue o tom neutro do tema</strong>{' '}
      (claro/escuro) — é o padrão original do produto. Versão publicada hoje:{' '}
      <strong style={{ color: '#fff' }}>{versao === 0 ? 'nenhuma (vale o padrão de fábrica)' : versao}</strong>.
    </p>

    <SectionLabel dark>Padrão de fábrica</SectionLabel>
    <div style={{ background: DEV_CARD, borderRadius: 12, padding: 12 }} data-testid="n0-cor-data-bloco">
      <div className="param-rotulo-campo" style={{ color: '#fff' }}>Cor do texto</div>
      <div className="paleta-cores-icone" data-testid="n0-grade-cor-data">
        {PALETA_CORES.map((c) => (
          <button
            key={c}
            type="button"
            className={`swatch-cor ${cor === c ? 'selecionada' : ''}`}
            style={{ background: c }}
            aria-label={`Cor ${c}`}
            aria-pressed={cor === c}
            data-testid={`n0-cor-data-${c}`}
            onClick={() => setCor(c)}
          />
        ))}
      </div>
      {cor !== COR_DATA_LISTA_PADRAO && (
        <button
          type="button"
          style={{ ...secondaryBtn, marginTop: 8 }}
          onClick={() => setCor(COR_DATA_LISTA_PADRAO)}
          data-testid="n0-cor-data-sem-cor"
        >
          Sem cor (seguir o tema)
        </button>
      )}

      <PreviaLista
        titulo="Tom original do produto (segue o tema)"
        zoomPct={0}
        corData={COR_DATA_LISTA_PADRAO}
        casos={['lancamentos', 'lancamentosSimples']}
        testid="n0-previa-cor-hoje"
      />
      <PreviaLista
        titulo="Como o cliente novo vai ver"
        zoomPct={0}
        corData={cor ?? undefined}
        casos={['lancamentos', 'lancamentosSimples']}
        testid="n0-previa-cor-resultado"
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
          ? 'Vale inclusive para quem já escolheu uma cor: na próxima abertura do aplicativo, a escolha do cliente é apagada e a sua passa a valer.'
          : 'Vale para quem nunca mexeu neste campo e para quem começar a usar daqui pra frente. Quem escolheu uma cor fica com a dele.'}
      </p>

      <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 10 }} data-testid="n0-cor-data-afetados">
        <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          Clientes com cor própria {afetados ? `(${afetados.length})` : ''}
        </div>
        {afetados && afetados.length === 0 && (
          <p style={{ fontSize: 11.5, color: DEV_TXT2, margin: 0 }}>
            Nenhum ambiente deste aparelho escolheu uma cor — nos dois alcances o efeito é o mesmo.
          </p>
        )}
        {afetados?.map((a) => (
          <div key={a.ambiente} style={{ fontSize: 11.5, color: '#fff', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            • {a.nome}
            <span style={{ color: DEV_TXT2 }}>— escolheu</span>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: a.cor, display: 'inline-block' }} />
            <span style={{ color: DEV_TXT2 }}>{a.cor}</span>
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
      <button type="button" style={{ ...primaryBtn, flex: 1 }} disabled={salvando} data-testid="n0-cor-data-publicar" onClick={() => void publicar()}>
        {salvando ? 'Publicando…' : escopo === 'todos' ? 'Publicar para todos' : 'Publicar para quem não mexeu'}
      </button>
      <button
        type="button"
        style={{ ...secondaryBtn }}
        onClick={() => setCor(COR_DATA_LISTA_PADRAO)}
      >
        Padrão de fábrica
      </button>
    </div>
    <p style={{ fontSize: 11, color: DEV_TXT2, lineHeight: 1.6, margin: '8px 0 0' }}>
      "Padrão de fábrica" só recarrega o campo desta tela com o valor original do produto (sem cor) — nada é
      publicado enquanto você não tocar em publicar.
    </p>
  </>
}
