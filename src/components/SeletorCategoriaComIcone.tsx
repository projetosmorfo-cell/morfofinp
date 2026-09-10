/* Escolha de categoria COM ÍCONE, no lugar do `<select>` nativo
   (10/09/2026, pedido do Rafael: "categoria — a lista de seleção deve mostrar
   ícones e respeitar tema claro/escuro de fundo").

   Por que não dá pra manter o `<select>`: um `<option>` só aceita TEXTO —
   nenhum navegador desenha SVG dentro dele, e o menu que ele abre é do
   sistema operacional, então também não obedece o tema do app. Daí o campo
   virar um botão com a mesma aparência de input (`.campo-como-botao`) que
   abre uma folha com busca — o MESMO padrão que o cadastro de categorias e
   grupos já usa pra escolher ícone (`SeletorIcone.tsx`), então não é um
   componente novo na vida do usuário.

   Tema: tudo aqui usa as variáveis do produto (`--bg`, `--cartao`, `--texto`,
   `--borda`), que já viram claro/escuro sozinhas — não há cor fixa. */
import { useMemo, useState } from 'react'
import type { Categoria } from '../db'
import { Icone } from '../icones'

const TAM_ICONE = 22

export default function SeletorCategoriaComIcone({
  categorias, valor, onEscolher, onLimpar, id, comErro, rotuloVazio = 'Escolha…',
}: {
  categorias: Categoria[]
  valor: number | ''
  onEscolher: (id: number) => void
  /* Limpar o campo depois de preenchido (10/09/2026, pedido do Rafael) —
     tanto pelo "×" dentro do campo quanto pela 1ª linha da folha. */
  onLimpar?: () => void
  id?: string
  comErro?: boolean
  rotuloVazio?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const atual = categorias.find((c) => c.id === valor)

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return categorias
    return categorias.filter((c) => c.nome.toLowerCase().includes(t) || (c.grupo || '').toLowerCase().includes(t))
  }, [categorias, busca])

  // Agrupa por grupo, preservando a ordem em que os grupos aparecem na lista.
  const porGrupo = useMemo(() => {
    const mapa = new Map<string, Categoria[]>()
    for (const c of filtradas) {
      const g = c.grupo || 'Sem grupo'
      if (!mapa.has(g)) mapa.set(g, [])
      mapa.get(g)!.push(c)
    }
    return [...mapa.entries()]
  }, [filtradas])

  return (
    <>
      <button
        type="button"
        id={id}
        className={`campo-como-botao ${comErro ? 'campo-com-erro' : ''}`}
        onClick={() => { setBusca(''); setAberto(true) }}
      >
        {atual ? (
          <>
            {atual.icone !== 'nenhum' && (
              <span className="campo-como-botao-icone">
                <Icone id={atual.icone} estilo={atual.iconeEstilo} cor={atual.iconeCor} tamanho={TAM_ICONE} />
              </span>
            )}
            <span className="campo-como-botao-texto">{atual.nome}</span>
            <span className="campo-como-botao-sub">{atual.grupo}</span>
          </>
        ) : (
          <span className="campo-como-botao-texto texto-fraco">{rotuloVazio}</span>
        )}
        {atual && onLimpar && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Limpar categoria"
            title="Limpar categoria"
            className="campo-como-botao-limpar"
            onClick={(e) => { e.stopPropagation(); onLimpar() }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onLimpar() } }}
          >
            ✕
          </span>
        )}
        <span className="campo-como-botao-seta">›</span>
      </button>

      {aberto && (
        <div className="folha-escolha" role="dialog" aria-label="Escolher categoria">
          <div className="folha-escolha-fundo" onClick={() => setAberto(false)} />
          <div className="folha-escolha-painel">
            <div className="folha-escolha-topo">
              <strong>Categoria</strong>
              <button type="button" onClick={() => setAberto(false)} aria-label="Fechar">✕</button>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Buscar por nome ou grupo…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            <div className="folha-escolha-lista">
              {onLimpar && valor !== '' && (
                <button
                  type="button"
                  className="folha-escolha-item"
                  onClick={() => { onLimpar(); setAberto(false) }}
                >
                  <span className="folha-escolha-item-icone">✕</span>
                  <span className="folha-escolha-item-nome texto-fraco">Limpar a categoria</span>
                </button>
              )}
              {porGrupo.length === 0 && <p className="texto-fraco">Nenhuma categoria encontrada.</p>}
              {porGrupo.map(([grupo, itens]) => (
                <div key={grupo}>
                  <div className="folha-escolha-grupo">{grupo}</div>
                  {itens.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`folha-escolha-item ${c.id === valor ? 'ativo' : ''}`}
                      onClick={() => { onEscolher(c.id!); setAberto(false) }}
                    >
                      <span className="folha-escolha-item-icone">
                        {c.icone !== 'nenhum' && (
                          <Icone id={c.icone} estilo={c.iconeEstilo} cor={c.iconeCor} tamanho={TAM_ICONE} />
                        )}
                      </span>
                      <span className="folha-escolha-item-nome">{c.nome}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
