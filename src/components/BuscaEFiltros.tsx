import { useState } from 'react'
import type { Categoria, Conta, Lancamento } from '../db'
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
const TODOS_STATUS: StatusPagamento[] = ['pago', 'recebido', 'atrasado', 'a_pagar', 'a_receber']

export function FolhaFiltros({
  filtros,
  categorias,
  contas,
  ordemDesc,
  onFechar,
  onAplicar,
}: {
  filtros: FiltrosAvancados
  categorias: Categoria[]
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
          <h2 style={{ margin: 0 }}>Filtros e ordenação</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--texto-fraco)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <label>Ordenar por data</label>
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

        <label>Status de pagamento</label>
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

        <label>Categoria (múltipla seleção)</label>
        <select
          multiple
          value={rascunho.categoriaIds.map(String)}
          onChange={(e) =>
            setRascunho((r) => ({
              ...r,
              categoriaIds: Array.from(e.target.selectedOptions).map((o) => Number(o.value)),
            }))
          }
          style={{ height: 96 }}
        >
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <label>Conta (múltipla seleção)</label>
        <select
          multiple
          value={rascunho.contaIds.map(String)}
          onChange={(e) =>
            setRascunho((r) => ({
              ...r,
              contaIds: Array.from(e.target.selectedOptions).map((o) => Number(o.value)),
            }))
          }
          style={{ height: 72 }}
        >
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

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
            <label>Data até</label>
            <input
              type="date"
              value={rascunho.dataAte}
              onChange={(e) => setRascunho((r) => ({ ...r, dataAte: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
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
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          autoFocus
          placeholder="Buscar por descrição, categoria ou conta…"
          value={busca}
          onChange={(e) => onBuscaChange(e.target.value)}
          style={{ paddingRight: 32 }}
        />
        <button
          type="button"
          aria-label={busca ? 'Limpar busca' : 'Fechar busca'}
          onClick={() => { onBuscaChange(''); onFechar() }}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--texto-fraco)',
            fontSize: 18,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
