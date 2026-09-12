/* Campo "O que foi" COM MEMÓRIA (10/09/2026, pedido do Rafael: "campo 'o que'
   com memória: sugere lista dos últimos registros conforme digita; essa
   memória é parâmetro de nível 1 do ambiente do cliente, em dias pra trás,
   padrão 60 dias; ao selecionar um item da memória, preenche categoria e
   pago com").

   Como funciona:
   - a janela de busca é `memoriaDescricaoDias` (Configurações → Meu Ambiente,
     padrão 60, 0 desliga) contada pra trás a partir de HOJE — e "hoje" aqui é
     o `hojeEfetivoISO()` do produto, então a ferramenta de simular data
     também move a memória junto, sem exceção;
   - a lista é montada por descrição DISTINTA, a mais recente primeiro, e cada
     sugestão carrega a categoria e a conta do lançamento mais recente com
     aquela descrição — que são exatamente os dois campos preenchidos ao
     escolher;
   - nunca é um `<datalist>`: o nativo não deixa mostrar categoria/conta em
     cada linha nem preencher os dois campos ao escolher, que é o pedido.

   Nada é imposto: o campo continua sendo texto livre, a lista só aparece
   enquanto o campo está em foco e some ao escolher, ao sair ou no Esc. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Lancamento } from '../db'
import { useMemoriaDescricaoDias } from '../configuracaoIcones'
import { hojeEfetivoISO } from '../hojeSimulado'
import { lerDoAmbiente } from '../ambiente'

export interface SugestaoMemoria {
  descricao: string
  categoriaId?: number
  contaId?: number
  categoriaNome?: string
  contaNome?: string
}

const MAX_SUGESTOES = 8

function diasAtras(iso: string, dias: number) {
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(a, m - 1, d - dias)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function MemoriaDescricao({
  id, valor, onMudar, onEscolher, placeholder,
}: {
  id?: string
  valor: string
  onMudar: (v: string) => void
  /* Chamado só quando a pessoa TOCA numa sugestão — nunca ao digitar: é o
     que preenche categoria e "pago com" junto. */
  onEscolher: (s: SugestaoMemoria) => void
  placeholder?: string
}) {
  const dias = useMemoriaDescricaoDias()
  const [aberto, setAberto] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)

  const desde = dias > 0 ? diasAtras(hojeEfetivoISO(), dias) : null
  const recentes = useLiveQuery<Lancamento[]>(
    () => (desde ? lerDoAmbiente(db.lancamentos.where('dataCompetencia').aboveOrEqual(desde).toArray()) : Promise.resolve([] as Lancamento[])),
    [desde]
  )
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])

  const base = useMemo<SugestaoMemoria[]>(() => {
    if (!recentes || !recentes.length) return []
    // Mais recente primeiro, uma entrada por descrição distinta.
    const ordenados = [...recentes].sort((a, b) => (a.dataCompetencia < b.dataCompetencia ? 1 : -1))
    const vistos = new Set<string>()
    const saida: SugestaoMemoria[] = []
    for (const l of ordenados) {
      const texto = (l.descricao || '').trim()
      if (!texto) continue
      const chave = texto.toLowerCase()
      if (vistos.has(chave)) continue
      vistos.add(chave)
      saida.push({
        descricao: texto,
        categoriaId: l.categoriaId,
        contaId: l.contaId,
        categoriaNome: categorias?.find((c) => c.id === l.categoriaId)?.nome,
        contaNome: contas?.find((c) => c.id === l.contaId)?.nome,
      })
    }
    return saida
  }, [recentes, categorias, contas])

  const sugestoes = useMemo(() => {
    const t = valor.trim().toLowerCase()
    const filtradas = t ? base.filter((s) => s.descricao.toLowerCase().includes(t) && s.descricao.toLowerCase() !== t) : base
    return filtradas.slice(0, MAX_SUGESTOES)
  }, [base, valor])

  // Fecha ao clicar fora — `mousedown` (não `click`) pra fechar antes de um
  // clique noutro campo, e `pointerdown` não é usado pra não brigar com o
  // toque na própria sugestão.
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto])

  return (
    <div className="memoria-descricao-wrap" ref={wrap}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => { onMudar(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') setAberto(false) }}
      />
      {aberto && sugestoes.length > 0 && (
        <div className="memoria-descricao-lista">
          {sugestoes.map((s) => (
            <button
              key={s.descricao}
              type="button"
              className="memoria-descricao-item"
              /* `onMouseDown` em vez de `onClick`: o clique num item chegaria
                 depois do blur do input, e o fechamento por "clique fora"
                 tiraria o item de baixo do dedo antes do clique concluir. */
              onMouseDown={(e) => {
                e.preventDefault()
                onEscolher(s)
                setAberto(false)
              }}
            >
              <span className="memoria-descricao-item-texto">
                <span className="memoria-descricao-item-titulo">{s.descricao}</span>
                {(s.categoriaNome || s.contaNome) && (
                  <span className="memoria-descricao-item-sub">
                    {[s.categoriaNome, s.contaNome].filter(Boolean).join(' · ')}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
