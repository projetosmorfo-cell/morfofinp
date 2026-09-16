/* N0 › Parâmetros › "Pacotes de ícones" — build 089.

   É aqui que a Morfo mantém as TRÊS propostas e decide qual delas o cliente
   novo recebe. O pedido do Rafael, na ordem em que ele o escreveu:
   "já monte no Morfo N0 essas 3 propostas, permitindo que eu ajuste cada uma
   delas e altere ícones e cores e passe a ser novo padrão entre esses 3,
   sempre tem que ter os 3, mas já traga uma proposta pronta e gravada".

   Por isso a tela tem três partes e nenhuma a mais:
   1. Escolher o pacote e as duas cores dele (peça compartilhada com o N1 —
      `EscolhaPacoteIcones`, a mesma tela dos dois lados).
   2. Editar o DESENHO item a item, dentro do pacote selecionado. O desenho é
      compartilhado pelos três pacotes de propósito: é o que faz um ser o par
      do outro. Trocar o ícone de "Mercado" aqui troca nos três — e a tela diz
      isso, em vez de deixar a pessoa descobrir depois.
   3. Publicar: grava as três propostas e qual está em uso, subindo a `versao`
      (mesma mecânica de `padraoCategorias`/`parametrosNotificacao`).

   "Sempre tem que ter os 3": não há como apagar um pacote. A tela nem oferece
   — o que se edita é o conteúdo de cada um. */
import { useEffect, useState } from 'react'
import type React from 'react'
import { Icone, type EstiloIcone } from '../icones'
import SeletorIcone from '../components/SeletorIcone'
import EscolhaPacoteIcones from '../components/EscolhaPacoteIcones'
import {
  comPacotesPadrao,
  coresBemDiferentes,
  PACOTES_ORDEM,
  PACOTE_ACEITA_COR,
  ROTULO_PACOTE,
  type PacoteId,
  type PacotesIconesN0,
} from '../pacotesIcones'
import { lerPlatformN0Persistida, salvarPacotesIconesN0 } from './kitPlatform'
import { SectionLabel, primaryBtn, secondaryBtn } from './kitBase'

/* Mesmo desenho de campo dos outros formulários do N0 (build 047) — copiado
   aqui porque as constantes vivem dentro de `DevApp.tsx` e não são exportadas;
   os valores são idênticos, e um campo fora do padrão no painel foi
   reclamação real do Rafael. */
const campoN0Style: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
  border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 10,
  padding: '11px 12px', color: '#fff', fontSize: 14, outline: 'none',
}
const labelN0Style: React.CSSProperties = {
  display: 'block', fontSize: 12, color: '#9B96A8', margin: '12px 0 6px', fontWeight: 700,
}

type Alvo = 'categorias' | 'grupos'

export default function PacotesIconesN0({ notify }: { notify?: (m: string) => void }) {
  const [dados, setDados] = useState<PacotesIconesN0 | null>(null)
  const [aba, setAba] = useState<PacoteId>('borda')
  const [alvoLista, setAlvoLista] = useState<Alvo>('categorias')
  const [busca, setBusca] = useState('')
  const [sujo, setSujo] = useState(false)

  useEffect(() => {
    void (async () => {
      const p = await lerPlatformN0Persistida()
      const base = comPacotesPadrao(p.pacotesIcones)
      setDados(base)
      setAba(base.emUso)
    })()
  }, [])

  if (!dados) return <p style={{ color: '#9aa1b1' }}>Carregando…</p>

  const pacote = dados.pacotes[aba]
  const mapa = alvoLista === 'categorias' ? pacote.categorias : pacote.grupos
  const termo = busca.trim().toLowerCase()
  const itens = Object.entries(mapa)
    .filter(([nome]) => !termo || nome.toLowerCase().includes(termo))
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))

  const mudarCor = (id: PacoteId, alvo: Alvo, cor: string) => {
    setDados((d) => {
      if (!d) return d
      const p = { ...d.pacotes[id] }
      if (alvo === 'categorias') p.corCategorias = cor
      else p.corGrupos = cor
      return { ...d, pacotes: { ...d.pacotes, [id]: p } }
    })
    setSujo(true)
  }

  /* O DESENHO é o mesmo nos três pacotes — é a definição de "par". Por isso
     esta escrita atinge os três de uma vez, e não só o selecionado: manter
     desenhos diferentes por pacote desfaria justamente o que o pedido pede. */
  const mudarIcone = (nome: string, iconeId: string) => {
    setDados((d) => {
      if (!d) return d
      const pacotes = { ...d.pacotes }
      for (const id of PACOTES_ORDEM) {
        const p = { ...pacotes[id] }
        if (alvoLista === 'categorias') p.categorias = { ...p.categorias, [nome]: iconeId }
        else p.grupos = { ...p.grupos, [nome]: iconeId }
        pacotes[id] = p
      }
      return { ...d, pacotes }
    })
    setSujo(true)
  }

  const marcarEmUso = (id: PacoteId) => {
    setDados((d) => (d ? { ...d, emUso: id } : d))
    setSujo(true)
  }

  const publicar = async () => {
    const ruim = PACOTES_ORDEM.find(
      (id) => PACOTE_ACEITA_COR[id] && !coresBemDiferentes(dados.pacotes[id].corCategorias, dados.pacotes[id].corGrupos),
    )
    if (ruim) {
      notify?.(`O pacote "${ROTULO_PACOTE[ruim]}" está com cores parecidas demais para categorias e grupos. Ajuste antes de publicar.`)
      return
    }
    const versao = await salvarPacotesIconesN0({ emUso: dados.emUso, pacotes: dados.pacotes })
    setSujo(false)
    notify?.(`Pacotes publicados (versão ${versao}). Cliente novo passa a receber "${ROTULO_PACOTE[dados.emUso]}".`)
  }

  return (
    <div>
      <SectionLabel dark>Proposta em uso para cliente novo</SectionLabel>
      <EscolhaPacoteIcones
        dark
        pacotes={dados.pacotes}
        emUso={dados.emUso}
        selecionado={aba}
        onSelecionar={setAba}
        onMudarCor={mudarCor}
        onUsar={marcarEmUso}
        rotuloUsar="Definir como padrão"
      />

      <SectionLabel dark>Desenho de cada item</SectionLabel>
      <p style={{ color: '#9aa1b1', fontSize: 12, margin: '0 0 10px' }}>
        O desenho é o mesmo nos três pacotes — é isso que faz um ser o par do outro. Trocar aqui vale para
        "Apenas borda", "Preenchido" e "3D colorido" ao mesmo tempo; o que muda entre eles é só o traço.
      </p>
      <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {(['categorias', 'grupos'] as Alvo[]).map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={alvoLista === a}
            data-testid={`aba-alvo-${a}`}
            style={alvoLista === a ? primaryBtn : secondaryBtn}
            onClick={() => setAlvoLista(a)}
          >
            {a === 'categorias' ? 'Categorias' : 'Grupos'}
          </button>
        ))}
      </div>
      <label style={labelN0Style}>Buscar pelo nome</label>
      <input
        style={campoN0Style}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={alvoLista === 'categorias' ? 'ex.: Mercado' : 'ex.: Fixo'}
      />
      <div data-testid="lista-itens-pacote" style={{ marginTop: 10 }}>
        {itens.map(([nome, iconeId]) => (
          <div
            key={nome}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #2a2f3a' }}
          >
            <Icone
              id={iconeId}
              estilo={aba as EstiloIcone}
              cor={alvoLista === 'categorias' ? pacote.corCategorias : pacote.corGrupos}
              tamanho={24}
            />
            <span style={{ flex: 1, minWidth: 0, color: '#e7e9ee', fontSize: 13 }}>{nome}</span>
            <div style={{ flex: '0 0 auto', width: 150 }}>
              <SeletorIcone
                icone={iconeId}
                estilo={aba as EstiloIcone}
                cor={(alvoLista === 'categorias' ? pacote.corCategorias : pacote.corGrupos) ?? '#3b82f6'}
                /* Só o DESENHO é aproveitado: estilo e cor deste seletor são
                   do pacote, não do item — é essa separação que transforma
                   "39 escolhas soltas" em "três propostas". */
                onChange={(v) => mudarIcone(nome, v.icone)}
              />
            </div>
          </div>
        ))}
        {itens.length === 0 && <p style={{ color: '#9aa1b1' }}>Nenhum item com esse nome.</p>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button type="button" style={primaryBtn} data-testid="publicar-pacotes" onClick={() => void publicar()}>
          Publicar as três propostas
        </button>
        {sujo && <span style={{ color: '#fbbf24', fontSize: 12, fontWeight: 700 }}>NÃO SALVO</span>}
      </div>
    </div>
  )
}
