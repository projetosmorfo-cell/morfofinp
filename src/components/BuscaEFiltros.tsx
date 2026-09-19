import { useState } from 'react'
import type { Categoria, Conta, GrupoRegistro, Lancamento } from '../db'
import { statusDoLancamento, ROTULO_STATUS, type StatusPagamento } from '../statusPagamento'
import { aplicarMascaraValor, paraNumero } from '../formatoMoeda'

// Busca + filtros avançados (31/08/2026, rodada seguinte, ponto 10) — usado
// em toda tela de listagem COMPLETA (Lançamentos, drill-in de Carteira);
// nunca nas listagens simples expansíveis de categoria, que são um recorte
// já filtrado por natureza da tela de origem.
export type TipoFiltro = 'saida' | 'entrada' | 'transferencia'
export type RecorrenciaFiltro = 'unico' | 'fixo' | 'parcelado'

export interface FiltrosAvancados {
  categoriaIds: number[]
  // Nome do grupo (não id — mesma convenção de `Categoria.grupo`/`Meta.grupo`
  // no resto do app: grupo é cadastro pequeno, sempre carregado inteiro,
  // referenciado por nome). 14/09/2026, pedido do Rafael: "falta o filtro por
  // grupos" — filtra pelo grupo da CATEGORIA do lançamento.
  grupos: string[]
  contaIds: number[]
  tipos: TipoFiltro[]
  status: StatusPagamento[]
  recorrencias: RecorrenciaFiltro[]
  valorMin: string
  valorMax: string
  dataDe: string
  dataAte: string
}

export const FILTROS_VAZIOS: FiltrosAvancados = {
  categoriaIds: [],
  grupos: [],
  contaIds: [],
  tipos: [],
  status: [],
  recorrencias: [],
  valorMin: '',
  valorMax: '',
  dataDe: '',
  dataAte: '',
}

export function contarFiltrosAtivos(f: FiltrosAvancados): number {
  let n = 0
  if (f.categoriaIds.length) n++
  if (f.grupos.length) n++
  if (f.contaIds.length) n++
  if (f.tipos.length) n++
  if (f.status.length) n++
  if (f.recorrencias.length) n++
  if (f.valorMin) n++
  if (f.valorMax) n++
  if (f.dataDe) n++
  if (f.dataAte) n++
  return n
}

function tipoDoLancamento(l: Lancamento): TipoFiltro {
  if (l.transferenciaId) return 'transferencia'
  return l.valor < 0 ? 'saida' : 'entrada'
}

// Filtra por texto livre (descrição, categoria, conta) + todos os campos do
// filtro avançado — pura, sem estado, reaproveitável em qualquer tela.
export function aplicarFiltros(
  lancamentos: Lancamento[],
  busca: string,
  filtros: FiltrosAvancados,
  categoriaPorId: Map<number, Categoria>,
  contaPorId: Map<number, Conta>,
): Lancamento[] {
  const buscaNorm = busca.trim().toLowerCase()
  return lancamentos.filter((l) => {
    if (buscaNorm) {
      const catNome = categoriaPorId.get(l.categoriaId)?.nome ?? ''
      const contaNome = contaPorId.get(l.contaId)?.nome ?? ''
      const alvo = `${l.descricao} ${catNome} ${contaNome}`.toLowerCase()
      if (!alvo.includes(buscaNorm)) return false
    }
    if (filtros.categoriaIds.length && !filtros.categoriaIds.includes(l.categoriaId)) return false
    if (filtros.grupos.length) {
      const grupoDaCategoria = categoriaPorId.get(l.categoriaId)?.grupo
      if (!grupoDaCategoria || !filtros.grupos.includes(grupoDaCategoria)) return false
    }
    if (filtros.contaIds.length && !filtros.contaIds.includes(l.contaId)) return false
    if (filtros.tipos.length && !filtros.tipos.includes(tipoDoLancamento(l))) return false
    if (filtros.status.length && !filtros.status.includes(statusDoLancamento(l))) return false
    if (filtros.recorrencias.length) {
      const r: RecorrenciaFiltro = l.recorrencia ?? 'unico'
      if (!filtros.recorrencias.includes(r)) return false
    }
    const valorAbs = Math.abs(l.valor)
    if (filtros.valorMin && valorAbs < paraNumero(filtros.valorMin)) return false
    if (filtros.valorMax && valorAbs > paraNumero(filtros.valorMax)) return false
    if (filtros.dataDe && l.dataCompetencia < filtros.dataDe) return false
    if (filtros.dataAte && l.dataCompetencia > filtros.dataAte) return false
    return true
  })
}

function alternarNoArray<T>(arr: T[], valor: T): T[] {
  return arr.includes(valor) ? arr.filter((v) => v !== valor) : [...arr, valor]
}

// --- F2 (build 104, 19/09/2026) — chips do que já está filtrado ------------
//
// Pedido do Rafael, aprovando a revisão de UX/UI: "hoje só dá pra saber 'tem
// filtro' pelo número no ícone — pra ver QUAL, precisa abrir a folha". Estes
// chips aparecem embaixo do cabeçalho da tela (fora da folha), um por
// DIMENSÃO de filtro ativa (não um por valor — 3 categorias marcadas viram um
// chip só, resumido), cada um com "×" pra desligar só aquela dimensão.

/** Uma dimensão de filtro (nunca `valorMin`/`valorMax`/`dataDe`/`dataAte`
 *  soltos — os dois pares viram uma dimensão só, "valor"/"data"). */
export type DimensaoFiltro = 'tipos' | 'status' | 'recorrencias' | 'grupos' | 'categoriaIds' | 'contaIds' | 'valor' | 'data'

export interface FiltroAtivoResumo {
  dimensao: DimensaoFiltro
  rotulo: string
}

function resumirNomes(nomes: string[]): string {
  return nomes.length <= 2 ? nomes.join(', ') : `${nomes.slice(0, 2).join(', ')} +${nomes.length - 2}`
}

/** O que mostrar nos chips — pura, sem estado, reaproveitável em qualquer tela. */
export function resumirFiltrosAtivos(
  f: FiltrosAvancados,
  categoriaPorId: Map<number, Categoria>,
  contaPorId: Map<number, Conta>,
): FiltroAtivoResumo[] {
  const out: FiltroAtivoResumo[] = []
  if (f.tipos.length) out.push({ dimensao: 'tipos', rotulo: f.tipos.map((t) => ROTULO_TIPO[t]).join(', ') })
  if (f.status.length) out.push({ dimensao: 'status', rotulo: f.status.map((s) => ROTULO_STATUS[s]).join(', ') })
  if (f.recorrencias.length) out.push({ dimensao: 'recorrencias', rotulo: f.recorrencias.map((r) => ROTULO_RECORRENCIA[r]).join(', ') })
  if (f.grupos.length) out.push({ dimensao: 'grupos', rotulo: `Grupo: ${resumirNomes(f.grupos)}` })
  if (f.categoriaIds.length) {
    out.push({ dimensao: 'categoriaIds', rotulo: `Categoria: ${resumirNomes(f.categoriaIds.map((id) => categoriaPorId.get(id)?.nome ?? '?'))}` })
  }
  if (f.contaIds.length) {
    out.push({ dimensao: 'contaIds', rotulo: `Conta: ${resumirNomes(f.contaIds.map((id) => contaPorId.get(id)?.nome ?? '?'))}` })
  }
  if (f.valorMin || f.valorMax) out.push({ dimensao: 'valor', rotulo: `Valor: ${f.valorMin || '0'} – ${f.valorMax || '∞'}` })
  if (f.dataDe || f.dataAte) out.push({ dimensao: 'data', rotulo: `Data: ${f.dataDe || '…'} – ${f.dataAte || '…'}` })
  return out
}

/** Desliga só UMA dimensão, mantendo as demais como estão. */
export function desligarDimensaoFiltro(f: FiltrosAvancados, dimensao: DimensaoFiltro): FiltrosAvancados {
  switch (dimensao) {
    case 'tipos': return { ...f, tipos: [] }
    case 'status': return { ...f, status: [] }
    case 'recorrencias': return { ...f, recorrencias: [] }
    case 'grupos': return { ...f, grupos: [] }
    case 'categoriaIds': return { ...f, categoriaIds: [] }
    case 'contaIds': return { ...f, contaIds: [] }
    case 'valor': return { ...f, valorMin: '', valorMax: '' }
    case 'data': return { ...f, dataDe: '', dataAte: '' }
  }
}

/** A fileira de chips em si — some sozinha quando não há filtro nenhum ativo. */
export function ChipsFiltrosAtivos({ filtros, categoriaPorId, contaPorId, onFiltrosChange }: {
  filtros: FiltrosAvancados
  categoriaPorId: Map<number, Categoria>
  contaPorId: Map<number, Conta>
  onFiltrosChange: (f: FiltrosAvancados) => void
}) {
  const ativos = resumirFiltrosAtivos(filtros, categoriaPorId, contaPorId)
  if (ativos.length === 0) return null
  return (
    <div className="chips-filtro-ativo" data-testid="chips-filtro-ativo">
      {ativos.map((a) => (
        <button
          key={a.dimensao}
          type="button"
          className="chip-filtro-ativo"
          onClick={() => onFiltrosChange(desligarDimensaoFiltro(filtros, a.dimensao))}
          data-testid={`chip-filtro-${a.dimensao}`}
          title={`Remover filtro: ${a.rotulo}`}
        >
          {a.rotulo}
          <span aria-hidden="true">×</span>
        </button>
      ))}
    </div>
  )
}

const ROTULO_TIPO: Record<TipoFiltro, string> = {
  saida: 'Saída',
  entrada: 'Entrada',
  transferencia: 'Transferência',
}
const ROTULO_RECORRENCIA: Record<RecorrenciaFiltro, string> = {
  unico: 'Único',
  fixo: 'Fixo',
  parcelado: 'Parcelado',
}
/* 'no_cartao' entra aqui (14/09/2026): é um estado de verdade na lista — a
   compra que já aconteceu e está na fatura em aberto. Sem o chip, não haveria
   como filtrar justamente o que o cartão produz em maior quantidade. */
const TODOS_STATUS: StatusPagamento[] = ['pago', 'recebido', 'no_cartao', 'atrasado', 'a_pagar', 'a_receber']

export function FolhaFiltros({
  filtros,
  categorias,
  grupos,
  contas,
  ordemDesc,
  onFechar,
  onAplicar,
}: {
  filtros: FiltrosAvancados
  categorias: Categoria[]
  grupos: GrupoRegistro[]
  contas: Conta[]
  /* Ordenação (10/09/2026, pedido do Rafael: "pra dentro dessa tela de filtro
     deve ir a funcionalidade de ordenar") — era um botão de texto solto na
     barra acima da lista. Entra no mesmo rascunho dos filtros e é aplicada
     junto, no mesmo botão. */
  ordemDesc: boolean
  onFechar: () => void
  onAplicar: (f: FiltrosAvancados, ordemDesc: boolean) => void
}) {
  const [rascunho, setRascunho] = useState<FiltrosAvancados>(filtros)
  const [ordemRascunho, setOrdemRascunho] = useState(ordemDesc)

  function ChipMulti({
    valor,
    ativo,
    onClick,
  }: {
    valor: string
    ativo: boolean
    onClick: () => void
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          background: ativo ? 'var(--azul)' : 'none',
          border: '1px solid var(--borda)',
          color: ativo ? '#fff' : 'var(--texto)',
          borderRadius: 999,
          padding: '5px 12px',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        {valor}
      </button>
    )
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="linha" style={{ border: 'none', padding: 0, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Filtros e Ordenação</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--texto-fraco)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <label>Ordenar por Data</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <ChipMulti valor="Mais recente ↓" ativo={ordemRascunho} onClick={() => setOrdemRascunho(true)} />
          <ChipMulti valor="Mais antigo ↑" ativo={!ordemRascunho} onClick={() => setOrdemRascunho(false)} />
        </div>

        <label>Tipo</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['saida', 'entrada', 'transferencia'] as TipoFiltro[]).map((t) => (
            <ChipMulti
              key={t}
              valor={ROTULO_TIPO[t]}
              ativo={rascunho.tipos.includes(t)}
              onClick={() => setRascunho((r) => ({ ...r, tipos: alternarNoArray(r.tipos, t) }))}
            />
          ))}
        </div>

        <label>Status de Pagamento</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TODOS_STATUS.map((s) => (
            <ChipMulti
              key={s}
              valor={ROTULO_STATUS[s]}
              ativo={rascunho.status.includes(s)}
              onClick={() => setRascunho((r) => ({ ...r, status: alternarNoArray(r.status, s) }))}
            />
          ))}
        </div>

        <label>Recorrência</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['unico', 'fixo', 'parcelado'] as RecorrenciaFiltro[]).map((r2) => (
            <ChipMulti
              key={r2}
              valor={ROTULO_RECORRENCIA[r2]}
              ativo={rascunho.recorrencias.includes(r2)}
              onClick={() => setRascunho((r) => ({ ...r, recorrencias: alternarNoArray(r.recorrencias, r2) }))}
            />
          ))}
        </div>

        {/* Build 104 (F1, 19/09/2026) — Grupo e Conta viram chips, mesmo
            padrão de Tipo/Status/Recorrência acima: eram caixas
            `<select multiple>` nativas, pouco visíveis e difíceis de tocar
            com precisão no celular — pedido do Rafael, aprovando a revisão
            de UX/UI. */}
        <label>Grupo</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {grupos.map((g) => (
            <ChipMulti
              key={g.id}
              valor={g.nome}
              ativo={rascunho.grupos.includes(g.nome)}
              onClick={() => setRascunho((r) => ({ ...r, grupos: alternarNoArray(r.grupos, g.nome) }))}
            />
          ))}
        </div>

        <label>Conta</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {contas.map((c) => (
            <ChipMulti
              key={c.id}
              valor={c.nome}
              ativo={rascunho.contaIds.includes(c.id!)}
              onClick={() => setRascunho((r) => ({ ...r, contaIds: alternarNoArray(r.contaIds, c.id!) }))}
            />
          ))}
        </div>

        {/* Categoria fica de FORA do padrão de chips acima (pedido do
            Rafael: "com o campo com muitas opções como Categorias, com
            outra solução mais prática e bonita") — uma grade de chips com
            20-30 categorias cadastradas ficaria mais alta que a caixa de
            lista que ela substituiria, o problema que o próprio F1 tenta
            resolver. Em vez disso, uma lista com busca: digita pra achar
            (nome contém, sem acento/maiúscula importando) e toca a linha
            pra marcar — a categoria já marcada aparece mesmo fora do
            filtro de texto, pra nunca "sumir" da vista de quem já a
            escolheu. */}
        <label>Categoria</label>
        <ListaBuscavelMultipla
          itens={categorias.map((c) => ({ id: c.id!, nome: c.nome }))}
          selecionados={rascunho.categoriaIds}
          onAlternar={(id) => setRascunho((r) => ({ ...r, categoriaIds: alternarNoArray(r.categoriaIds, id) }))}
          placeholder="Buscar categoria…"
          testid="filtro-categoria"
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Valor mínimo (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={rascunho.valorMin}
              onChange={(e) => setRascunho((r) => ({ ...r, valorMin: aplicarMascaraValor(e.target.value) }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Valor máximo (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              value={rascunho.valorMax}
              onChange={(e) => setRascunho((r) => ({ ...r, valorMax: aplicarMascaraValor(e.target.value) }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label>Data de</label>
            <input
              type="date"
              value={rascunho.dataDe}
              onChange={(e) => setRascunho((r) => ({ ...r, dataDe: e.target.value }))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Data Até</label>
            <input
              type="date"
              value={rascunho.dataAte}
              onChange={(e) => setRascunho((r) => ({ ...r, dataAte: e.target.value }))}
            />
          </div>
        </div>

        {/* Build 104 (F2, 19/09/2026) — barra FIXA no rodapé da folha, em vez
            de nascer no fim de uma rolagem longa: pedido do Rafael,
            aprovando a revisão de UX/UI ("Aplicar sempre à mão, sem rolar
            até o fim depois de configurar vários filtros"). `.modal-conteudo`
            já é o contêiner que rola (`overflow-y: auto`) — `position:
            sticky; bottom: 0` gruda esta barra nele, com fundo sólido pra
            nunca deixar o conteúdo que passa por baixo manchar o botão. */}
        <div className="barra-aplicar-filtros-fixa">
          <button type="button" className="primario" style={{ marginTop: 0 }} onClick={() => onAplicar(rascunho, ordemRascunho)}>
            Aplicar
          </button>
          <button
            type="button"
            style={{
              marginTop: 0,
              background: 'none',
              border: '1px solid var(--borda)',
              borderRadius: 10,
              padding: '12px',
              cursor: 'pointer',
            }}
            onClick={() => setRascunho(FILTROS_VAZIOS)}
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  )
}

/* Build 104 (F1, 19/09/2026) — lista com busca pra multi-seleção com MUITAS
   opções (hoje só Categoria). Reaproveitável: não fala de `Categoria` em
   lugar nenhum do componente, só recebe `{id, nome}`. */
function ListaBuscavelMultipla({ itens, selecionados, onAlternar, placeholder, testid }: {
  itens: { id: number; nome: string }[]
  selecionados: number[]
  onAlternar: (id: number) => void
  placeholder?: string
  testid?: string
}) {
  const [busca, setBusca] = useState('')
  const buscaNorm = busca.trim().toLowerCase()
  /* A já marcada nunca some da lista, mesmo filtrando por outro texto — senão
     quem já escolheu uma categoria e digita pra achar outra perde de vista a
     primeira, sem forma de saber se ainda está marcada. */
  const visiveis = itens.filter((it) => !buscaNorm || it.nome.toLowerCase().includes(buscaNorm) || selecionados.includes(it.id))
  return (
    <div className="lista-buscavel-multipla" data-testid={testid}>
      <input
        type="text"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder={placeholder}
        data-testid={testid ? `${testid}-busca` : undefined}
      />
      <div className="lista-buscavel-multipla-itens">
        {visiveis.length === 0 && <p className="texto-fraco" style={{ margin: '8px 0', fontSize: 12.5 }}>Nada encontrado.</p>}
        {visiveis.map((it) => {
          const marcado = selecionados.includes(it.id)
          return (
            <button
              key={it.id}
              type="button"
              className={`lista-buscavel-multipla-item ${marcado ? 'marcado' : ''}`}
              onClick={() => onAlternar(it.id)}
              aria-pressed={marcado}
              data-testid={testid ? `${testid}-item-${it.id}` : undefined}
            >
              <span className="lista-buscavel-multipla-check" aria-hidden="true">{marcado ? '✓' : ''}</span>
              {it.nome}
            </button>
          )
        })}
      </div>
      {selecionados.length > 0 && (
        <p className="texto-fraco" style={{ margin: '6px 0 0', fontSize: 11.5 }}>{selecionados.length} selecionada(s)</p>
      )}
    </div>
  )
}

/* Campo de busca RECOLHÍVEL (10/09/2026, pedido do Rafael: "o campo busca deve
   sair e virar um ícone de busca"). O ícone vive na fileira do título (ver
   `IconesDeTela`); este campo só existe no DOM quando ele está aberto — ou
   quando há texto digitado, porque um recorte ativo nunca pode ficar
   invisível (mesmo princípio da tarja de filtro ativo que existia antes).
   O "×" limpa a busca e fecha. */
export function CampoBusca({ busca, onBuscaChange, onFechar }: {
  busca: string
  onBuscaChange: (v: string) => void
  onFechar: () => void
}) {
  return (
    <div className="barra-busca-filtros" style={{ marginBottom: 10 }}>
      {/* Item 5 (16/09/2026): o contêiner precisa ser `flex`, não um `div`
          comum. BUG REAL que isso corrige: `<input>` é um elemento de linha, e
          num contêiner de bloco ele se apoia na linha de base do texto — a
          caixa do contêiner fica alguns pixels MAIS ALTA que o campo, com essa
          folga toda embaixo. O "×" é posicionado contra o CONTÊINER
          (`top: 0; bottom: 0`), então ele herdava essa folga: a área dele não
          batia com a do campo e o glifo ficava abaixo do centro real — o
          "sobra espaço em cima e embaixo" que o Rafael continuou vendo depois
          da correção da build 077 (que só mediu a altura do botão, nunca a do
          campo nem a do contêiner). Com `flex` a caixa do contêiner passa a ter
          EXATAMENTE a altura do campo, e aí `top: 0; bottom: 0` é o campo
          inteiro, de borda a borda. */}
      <div style={{ position: 'relative', display: 'flex' }}>
        <input
          type="text"
          autoFocus
          placeholder="Buscar por descrição, categoria ou conta…"
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          style={{ paddingRight: 40 }}
        />
        {/* Item 7 (16/09/2026): o "×" era pequeno e centralizado, com folga ao
            redor — alvo de toque ruim. Agora ocupa a ALTURA INTEIRA da linha
            do campo (`top:0; bottom:0`, sem `transform`), só a largura é
            fixa (36px) — um tap target bem maior, mais fácil de acertar.
            Item 5 (16/09/2026, rodada seguinte): `lineHeight: 1` deixava a
            caixa do glifo com a altura de UMA linha de texto dentro de um botão
            de 40px — o que se via como "sobra em cima e embaixo" do próprio
            desenho do ×. Agora o botão é ele mesmo um `flex` que estica
            (`alignSelf: 'stretch'`, `height: 'auto'`) e o glifo herda a altura
            inteira (`lineHeight: 0` + `alignItems: center` centram o desenho no
            meio exato do campo, sem depender da métrica da fonte). */}
        <button
          type="button"
          aria-label={busca ? 'Limpar busca' : 'Fechar busca'}
          onClick={() => { onBuscaChange(''); onFechar() }}
          data-testid="limpar-busca"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            height: 'auto',
            alignSelf: 'stretch',
            width: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'none',
            border: 'none',
            color: 'var(--texto-fraco)',
            /* 26px: o glifo ocupa a maior parte da altura útil do campo (40px
               menos as bordas) — em 20/22px ele lia como um símbolo pequeno
               solto no meio, que é a reclamação original. */
            fontSize: 26,
            lineHeight: 0,
            cursor: 'pointer',
            padding: 0,
            margin: 0,
          }}
        >
          <span aria-hidden style={{ display: 'block', lineHeight: 0 }}>×</span>
        </button>
      </div>
    </div>
  )
}
