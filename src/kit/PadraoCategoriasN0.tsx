/* N0 → Parâmetros → "Categorias e Grupos (padrão)" — item 7 do Rafael
   (12/09/2026): as MESMAS configurações de Categorias/Grupos/ícones do N1,
   aqui no painel, salvando como padrão da plataforma.

   O que esta tela edita é exatamente o que `Categorias.tsx` (N1) edita — nome,
   grupo, natureza, meta da categoria, ícone de cada categoria; nome, ícone e
   percentual de meta de cada grupo; e os 3 percentuais de tamanho de ícone.
   O que ela NÃO faz é mexer no cadastro de ninguém na hora: só grava o modelo
   (`salvarPadraoCategoriasN0`), e cada ambiente recebe na abertura seguinte,
   se ainda não tiver sido editado pelo dono — ver `padraoCategorias.ts`.

   A tela abre já preenchida com o padrão atual ("e também já deveria carregar
   o padrão atual lá"): o padrão salvo, ou, na primeira vez, o cadastro deste
   ambiente. */
import { useEffect, useState } from 'react'
import { Plus, Trash2, Check, RotateCcw, ChevronRight } from 'lucide-react'
import { DEV_CARD, DEV_ACCENT, SectionLabel, primaryBtn, secondaryBtn, Segmented } from './kitBase'
import { salvarPadraoCategoriasN0, type CategoriaPadraoN0, type GrupoPadraoN0 } from './kitPlatform'
import { lerPadraoAtual, lerPadraoDoAmbienteAtual, type PadraoEditavel } from './padraoCategorias'
import SeletorIcone from '../components/SeletorIcone'
import { Icone, type EstiloIcone } from '../icones'

const DEV_TXT2 = '#9B96A8'
const NATUREZAS = ['Receita', 'Consumo', 'Aporte', 'Gasto de cofrinho', 'Neutro', 'Pagamento de fatura', 'Transferência']

const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)',
  border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 10, padding: '9px 11px',
  color: '#fff', fontSize: 13.5, outline: 'none',
}
const rotulo: React.CSSProperties = { display: 'block', fontSize: 11, color: DEV_TXT2, margin: '8px 0 4px', fontWeight: 700 }

export default function PadraoCategoriasN0({ notify }: { notify: (m: string) => void }) {
  const [padrao, setPadrao] = useState<PadraoEditavel | null>(null)
  const [aba, setAba] = useState<'grupos' | 'categorias' | 'icones'>('grupos')
  const [salvando, setSalvando] = useState(false)
  /* "Todas abertas" é o padrão, igual ao N1 — quem entra aqui normalmente vem
     conferir a estrutura inteira. `abertaIdx` só vale no modo compacto. */
  const [modoCat, setModoCat] = useState<'abertas' | 'compacta'>('abertas')
  const [abertaIdx, setAbertaIdx] = useState<number | null>(null)

  useEffect(() => { void lerPadraoAtual().then(setPadrao) }, [])

  if (!padrao) return <p style={{ fontSize: 12, color: DEV_TXT2 }}>Carregando o padrão atual…</p>

  /* Ordem dos grupos = a do próprio padrão (é ela que o N1 usa); categoria de
     grupo que não existe mais na lista cai num bloco "—" no fim, pra nunca
     sumir da tela sem ninguém perceber. */
  const gruposDaLista = [
    ...padrao.grupos.map((g) => g.nome),
    ...[...new Set(padrao.categorias.map((c) => c.grupo || '—'))]
      .filter((n) => !padrao.grupos.some((g) => g.nome === n)),
  ]

  const set = (patch: Partial<PadraoEditavel>) => setPadrao((p) => (p ? { ...p, ...patch } : p))
  const setGrupo = (i: number, patch: Partial<GrupoPadraoN0>) =>
    set({ grupos: padrao.grupos.map((g, k) => (k === i ? { ...g, ...patch } : g)) })
  const setCategoria = (i: number, patch: Partial<CategoriaPadraoN0>) =>
    set({ categorias: padrao.categorias.map((c, k) => (k === i ? { ...c, ...patch } : c)) })

  async function salvar() {
    if (!padrao) return
    setSalvando(true)
    try {
      const versao = await salvarPadraoCategoriasN0(padrao)
      notify(`Padrão salvo (versão ${versao}) — ambientes ainda não editados recebem na próxima abertura`)
    } catch {
      notify('Não foi possível salvar o padrão')
    }
    setSalvando(false)
  }

  return <>
    <p style={{ fontSize: 11.5, color: DEV_TXT2, lineHeight: 1.6, margin: '0 0 12px' }}>
      Mesmas configurações da tela "Categorias e Grupos" do ambiente do cliente, guardadas aqui como
      <strong style={{ color: '#fff' }}> padrão da plataforma</strong>. Ao salvar, todo ambiente que
      <strong style={{ color: '#fff' }}> ainda não foi editado pelo próprio dono</strong> recebe este cadastro na
      abertura seguinte — quem já personalizou o dele não é tocado, e nada é apagado em ambiente nenhum.
    </p>
    <div style={{ marginBottom: 12 }}>
      <Segmented value={aba} onChange={(v) => setAba(v)} dark options={[
        { value: 'grupos', label: `Grupos (${padrao.grupos.length})` },
        { value: 'categorias', label: `Categorias (${padrao.categorias.length})` },
        { value: 'icones', label: 'Ícones' },
      ]} />
    </div>

    {aba === 'grupos' && <>
      <SectionLabel dark>Grupos e meta (% da receita)</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {padrao.grupos.map((g, i) => (
          <div key={i} style={{ background: DEV_CARD, borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={rotulo}>Nome do Grupo</label>
                <input style={campo} value={g.nome} onChange={(e) => setGrupo(i, { nome: e.target.value })} />
              </div>
              <div style={{ width: 92 }}>
                <label style={rotulo}>Meta (%)</label>
                <input style={campo} type="number" min={0} max={100} value={g.percentual}
                  onChange={(e) => setGrupo(i, { percentual: Number(e.target.value) || 0 })} />
              </div>
              <button type="button" title="Remover do padrão" aria-label="Remover do padrão"
                onClick={() => set({ grupos: padrao.grupos.filter((_, k) => k !== i) })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
                <Trash2 size={15} color="#F5615C" />
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <SeletorIcone icone={g.icone ?? 'outros'} estilo={(g.iconeEstilo ?? 'colorido') as EstiloIcone} cor={g.iconeCor ?? '#3b82f6'}
                onChange={(v) => setGrupo(i, { icone: v.icone, iconeEstilo: v.estilo, iconeCor: v.cor })} />
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => set({ grupos: [...padrao.grupos, { nome: '', percentual: 0 }] })}
        style={{ width: '100%', marginTop: 10, background: 'rgba(255,255,255,0.08)', border: `1px dashed ${DEV_ACCENT}66`, borderRadius: 10, padding: 11, color: DEV_ACCENT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        + Novo grupo no padrão
      </button>
    </>}

    {/* 12/09/2026 (build 054), pedido do Rafael: "N0 parâmetros, cadastro de
        categorias deve mostrar as mesmas opções do N1 com relação a expandir
        todos ou recolher todos e agrupar por Grupo".

        A lista do padrão nasceu achatada — todas as categorias abertas, uma
        embaixo da outra, sem separação por grupo. Com 37 categorias isso é uma
        rolagem longa em que nada é achável. Passa a ter as duas coisas que o
        N1 já tem: cabeçalho por Grupo, e o par Todas abertas × Lista compacta.
        A compacta mostra nome · natureza · a marca de receita fixa e abre no
        toque — mesma lógica da tela do ambiente. */}
    {aba === 'categorias' && <>
      <SectionLabel dark>Categorias do padrão</SectionLabel>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {([['abertas', 'Todas abertas'], ['compacta', 'Lista compacta']] as const).map(([v, r]) => (
          <button key={v} type="button" data-testid={`n0-cat-modo-${v}`}
            onClick={() => { setModoCat(v); setAbertaIdx(null) }}
            style={{ flex: 1, padding: '9px 8px', borderRadius: 9, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12.5,
              background: modoCat === v ? DEV_CARD : 'rgba(255,255,255,0.05)', color: modoCat === v ? '#fff' : DEV_TXT2 }}>
            {r}
          </button>
        ))}
      </div>
      {gruposDaLista.map((nomeGrupo) => {
      const indices = padrao.categorias
        .map((c, i) => [c, i] as const)
        .filter(([c]) => (c.grupo || '—') === nomeGrupo)
        .sort(([a], [b2]) => a.nome.localeCompare(b2.nome))
        .map(([, i]) => i)
      if (indices.length === 0) return null
      return <div key={nomeGrupo}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 14, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{nomeGrupo}</span>
        <span style={{ fontSize: 11.5, color: DEV_TXT2 }}>{indices.length} categoria(s)</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {indices.map((i) => {
          const c = padrao.categorias[i]
          if (modoCat === 'compacta' && abertaIdx !== i) {
            return (
              <button key={i} type="button" data-testid="n0-cat-compacta" onClick={() => setAbertaIdx(i)}
                style={{ background: DEV_CARD, borderRadius: 12, padding: '10px 12px', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icone id={c.icone ?? 'outros'} estilo={(c.iconeEstilo ?? 'colorido') as EstiloIcone} cor={c.iconeCor} tamanho={18} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.nome || '(sem nome)'}
                  <span style={{ fontSize: 11, fontWeight: 600, color: DEV_TXT2 }}>
                    {' · '}{c.natureza}{c.natureza === 'Receita' && c.receitaFixa ? ' · receita fixa' : ''}
                  </span>
                </span>
                <ChevronRight size={14} color={DEV_TXT2} />
              </button>
            )
          }
          return (
          <div key={i} style={{ background: DEV_CARD, borderRadius: 12, padding: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={rotulo}>Nome da Categoria</label>
                <input style={campo} value={c.nome} onChange={(e) => setCategoria(i, { nome: e.target.value })} />
              </div>
              <button type="button" title="Remover do padrão" aria-label="Remover do padrão"
                onClick={() => set({ categorias: padrao.categorias.filter((_, k) => k !== i) })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
                <Trash2 size={15} color="#F5615C" />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={rotulo}>Grupo</label>
                <select style={campo} value={c.grupo} onChange={(e) => setCategoria(i, { grupo: e.target.value })}>
                  {padrao.grupos.map((g) => <option key={g.nome} value={g.nome}>{g.nome}</option>)}
                  {!padrao.grupos.some((g) => g.nome === c.grupo) && <option value={c.grupo}>{c.grupo}</option>}
                </select>
              </div>
              <div>
                <label style={rotulo}>Natureza</label>
                <select style={campo} value={c.natureza} onChange={(e) => setCategoria(i, { natureza: e.target.value })}>
                  {NATUREZAS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            {/* NENHUM campo de VALOR aqui — nem meta de gasto, nem planejado
                de receita (12/09/2026, build 056, pedido do Rafael: "N0,
                parâmetros, categorias não deve ter campo de metas, nem os de
                Receitas; já N1 sim deve ter").

                A divisão que passou a valer: o padrão da plataforma define
                ESTRUTURA — quais categorias existem, em que grupo, de que
                natureza, com qual ícone e quais receitas formam a base das
                metas. Quanto se pode gastar, ou quanto se espera receber, é
                número do ambiente de cada pessoa; um valor-padrão gravado
                aqui chegaria em todo ambiente novo parecendo recomendação da
                Morfo. O item 18 já tinha tirado a meta de gasto; o planejado
                de receita sai agora, pela mesma razão.

                A flag abaixo FICA: ela não é valor, é a marcação de quais
                receitas formam a base de cálculo das metas (`baseMeta.ts`) —
                estrutura, igual a grupo e natureza. */}
            {c.natureza === 'Receita' && (
              <>
                <label style={{ ...rotulo, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!c.receitaFixa}
                    onChange={(e) => setCategoria(i, { receitaFixa: e.target.checked })}
                    style={{ width: 16, height: 16, flex: 'none' }}
                  />
                  <span>É receita fixa (entra na base das metas)</span>
                </label>
              </>
            )}
            <div style={{ marginTop: 8 }}>
              <SeletorIcone icone={c.icone ?? 'outros'} estilo={(c.iconeEstilo ?? 'colorido') as EstiloIcone} cor={c.iconeCor ?? '#3b82f6'}
                onChange={(v) => setCategoria(i, { icone: v.icone, iconeEstilo: v.estilo, iconeCor: v.cor })} />
            </div>
            {modoCat === 'compacta' && (
              <button type="button" onClick={() => setAbertaIdx(null)}
                style={{ marginTop: 10, background: 'none', border: 'none', color: DEV_TXT2, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                Recolher
              </button>
            )}
          </div>
          )
        })}
      </div>
      </div>
      })}
      <button type="button" onClick={() => { set({ categorias: [...padrao.categorias, { nome: '', grupo: padrao.grupos[0]?.nome ?? '', natureza: 'Consumo', aceitavelMensal: 0 }] }); setAbertaIdx(padrao.categorias.length) }}
        style={{ width: '100%', marginTop: 10, background: 'rgba(255,255,255,0.08)', border: `1px dashed ${DEV_ACCENT}66`, borderRadius: 10, padding: 11, color: DEV_ACCENT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
        + Nova categoria no padrão
      </button>
    </>}

    {aba === 'icones' && <>
      <SectionLabel dark>Tamanho dos ícones (% da linha)</SectionLabel>
      {([
        ['pctCompleta', 'Listagem completa (Lançamentos, Carteira)'],
        ['pctCategoria', 'Linha de categoria'],
        ['pctGrupo', 'Linha de grupo'],
      ] as const).map(([chave, texto]) => (
        <div key={chave} style={{ background: DEV_CARD, borderRadius: 12, padding: '11px 12px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: '#fff', fontWeight: 700, flex: 1, minWidth: 0 }}>{texto}</span>
          <input type="number" min={5} max={200} value={padrao[chave] ?? 60}
            onChange={(e) => set({ [chave]: Number(e.target.value) || 0 } as Partial<PadraoEditavel>)}
            style={{ ...campo, width: 78, textAlign: 'right', fontWeight: 700 }} />
        </div>
      ))}
    </>}

    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
      <button type="button" onClick={() => void lerPadraoDoAmbienteAtual().then((p) => { setPadrao(p); notify('Recarregado a partir do cadastro atual deste ambiente') })}
        style={{ ...secondaryBtn, flex: 1, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.18)' }}>
        <RotateCcw size={15} /> Recarregar
      </button>
      <button type="button" data-testid="n0-salvar-padrao-cat" disabled={salvando} onClick={() => void salvar()}
        style={{ ...primaryBtn, flex: 2, background: DEV_ACCENT, opacity: salvando ? 0.6 : 1 }}>
        <Check size={16} /> Salvar como padrão
      </button>
    </div>
    <p style={{ fontSize: 11, color: DEV_TXT2, marginTop: 10, lineHeight: 1.6 }}>
      <Plus size={11} style={{ verticalAlign: 'middle' }} /> "Recarregar" traz de volta o cadastro que está
      valendo neste aparelho — útil pra usar o ambiente do Rafael como fonte do padrão depois de ajustá-lo lá.
    </p>
  </>
}
