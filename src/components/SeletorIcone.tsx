import { useMemo, useState } from 'react'
import { CATEGORIAS_ICONE, ICONES, Icone, LISTA_ICONES, PALETA_CORES, type EstiloIcone } from '../icones'

// Seletor de ícone reutilizado no cadastro de Categoria e de Grupo —
// reescrito em 01/09/2026 (pedido do Rafael): antes era um <select> de
// texto puro pro ícone e pro estilo, e a cor vinha de um <input type=color>
// livre. Agora é uma grade visual de verdade (cada célula já mostra o
// próprio ícone, no estilo e cor atuais — mudar a cor atualiza a grade
// inteira na hora), com abas pros 3 estilos e uma paleta limitada e
// tradicional de cores (só nos 2 estilos monocromáticos — "3D colorido" tem
// cor própria fixa, sem escolha). O nome de cada ícone fica oculto por
// padrão e só aparece ao passar o mouse ou ao selecionar aquele ícone (ver
// `.grade-icones` no index.css).
//
// 01/09/2026, mesmo dia (pedido do Rafael) — com a biblioteca chegando em
// ~324 ícones (ver `icones.tsx`), rolar uma grade única ficou inviável, daí
// dois recursos novos:
// 1. Campo de busca por nome OU sinônimo (ver `buscaIcone` abaixo).
// 2. Sub-abas por categoria de agrupamento (`CATEGORIAS_ICONE`), abaixo das
//    abas de estilo — "Todas" mostra a grade inteira, cada categoria filtra.
// Busca e sub-aba combinam: escolher uma categoria E digitar uma busca
// filtra pelas duas coisas ao mesmo tempo.
//
// 01/09/2026, mesmo dia (pedido do Rafael) — com busca+sub-abas+grade de 325
// ícones, o bloco inteiro sempre expandido dentro do formulário de Categoria
// ou Grupo empurrava o resto do formulário pra baixo. Virou popup: por
// padrão o componente mostra só uma linha recolhida (ícone atual + nome +
// botão), e o conjunto de definição (abas de estilo, paleta, busca, sub-abas,
// grade) só aparece dentro de um modal ao clicar em "Alterar ícone" — mesmo
// padrão de modal já usado em `DetalheLancamento`/`BuscaEFiltros`
// (`.modal-fundo`/`.modal-conteudo`). Fechar o modal (✕, "Concluído" ou
// clicar fora) não desfaz nada — cada escolha já chama `onChange` na hora,
// igual antes.
const ABAS_ESTILO: { valor: EstiloIcone; rotulo: string }[] = [
  { valor: 'borda', rotulo: 'Apenas borda' },
  { valor: 'preenchido', rotulo: 'Preenchido' },
  { valor: 'colorido', rotulo: '3D colorido' },
]

// Tira acento pra busca não exigir digitar "ç"/"ã" certinho.
function normalizar(txt: string): string {
  return txt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

// Um ícone "casa" com busca "cafe" não deve aparecer; um "Café" (nome) ou um
// ícone com sinônimo "cafeteria" deve. Também busca no id interno (ex.:
// "cambio" acha "Câmbio/Moeda Estrangeira" mesmo sem digitar acento), que
// funciona como uma rede de segurança pros ~230 ícones que não têm
// sinônimo cadastrado à mão (ver comentário em `icones.tsx`).
function buscaIcone(item: { id: string; nome: string; sinonimos?: string[] }, termoBusca: string): boolean {
  if (!termoBusca) return true
  const alvo = [item.id, item.nome, ...(item.sinonimos ?? [])].map(normalizar).join(' | ')
  return alvo.includes(termoBusca)
}

export default function SeletorIcone({
  icone,
  estilo,
  cor,
  onChange,
}: {
  icone: string
  estilo: EstiloIcone
  cor: string
  onChange: (v: { icone: string; estilo: EstiloIcone; cor: string }) => void
}) {
  const [busca, setBusca] = useState('')
  // 'todas' é a aba inicial (grade inteira) — não é um id de categoria real
  // em `CATEGORIAS_ICONE`, só um sentinela local desta tela.
  const [abaCategoria, setAbaCategoria] = useState('todas')
  // Popup fechado por padrão (ver comentário no topo do arquivo) — a tela de
  // Categoria/Grupo só mostra a linha recolhida até o Rafael clicar.
  const [modalAberto, setModalAberto] = useState(false)

  const termoBusca = normalizar(busca.trim())
  const iconesFiltrados = useMemo(
    () =>
      LISTA_ICONES.filter(
        (i) => (abaCategoria === 'todas' || i.categoria === abaCategoria) && buscaIcone(i, termoBusca),
      ),
    [abaCategoria, termoBusca],
  )

  const nomeIconeAtual = icone === 'nenhum' ? 'Sem ícone' : (ICONES[icone]?.nome ?? ICONES.outros.nome)

  const previaIcone =
    icone === 'nenhum' ? (
      <span
        className="texto-fraco"
        style={{
          width: 34,
          height: 34,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed var(--borda)',
          borderRadius: '50%',
          fontSize: 11,
        }}
      >
        —
      </span>
    ) : (
      <Icone id={icone} estilo={estilo} cor={cor} tamanho={34} />
    )

  return (
    <>
      <button type="button" className="linha-selecionar-icone" onClick={() => setModalAberto(true)}>
        {previaIcone}
        <span className="linha-selecionar-icone-texto">
          <span className="texto-fraco">Ícone</span>
          <strong>{nomeIconeAtual}</strong>
        </span>
        <span className="linha-selecionar-icone-acao">Alterar ›</span>
      </button>

      {modalAberto && (
        <div className="modal-fundo" onClick={() => setModalAberto(false)}>
          <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
            <div className="linha" style={{ border: 'none', padding: 0, marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Escolher Ícone</h2>
              <button
                type="button"
                onClick={() => setModalAberto(false)}
                aria-label="Fechar"
                style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--texto-fraco)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {previaIcone}
              <span className="texto-fraco">{icone === 'nenhum' ? 'Sem ícone' : 'Pré-visualização'}</span>
            </div>

            <div role="tablist" className="abas-estilo-icone">
              {ABAS_ESTILO.map((aba) => (
                <button
                  key={aba.valor}
                  type="button"
                  role="tab"
                  aria-selected={estilo === aba.valor}
                  className={`aba-estilo-icone-item ${estilo === aba.valor ? 'ativa' : ''}`}
                  onClick={() => onChange({ icone, estilo: aba.valor, cor })}
                >
                  {aba.rotulo}
                </button>
              ))}
            </div>

            {estilo !== 'colorido' && (
              <div className="paleta-cores-icone">
                {PALETA_CORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    className={`swatch-cor ${cor === c ? 'selecionada' : ''}`}
                    style={{ background: c }}
                    onClick={() => onChange({ icone, estilo, cor: c })}
                  />
                ))}
              </div>
            )}

            <input
              type="text"
              className="campo-busca-icone"
              placeholder="Buscar ícone por nome ou sinônimo…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />

            <div role="tablist" className="abas-categoria-icone">
              <button
                type="button"
                role="tab"
                aria-selected={abaCategoria === 'todas'}
                className={`aba-categoria-icone-item ${abaCategoria === 'todas' ? 'ativa' : ''}`}
                onClick={() => setAbaCategoria('todas')}
              >
                Todas
              </button>
              {CATEGORIAS_ICONE.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={abaCategoria === cat.id}
                  className={`aba-categoria-icone-item ${abaCategoria === cat.id ? 'ativa' : ''}`}
                  onClick={() => setAbaCategoria(cat.id)}
                >
                  {cat.rotulo}
                </button>
              ))}
            </div>

            <div className="grade-icones">
              {abaCategoria === 'todas' && !termoBusca && (
                <button
                  type="button"
                  className={`grade-icone-item ${icone === 'nenhum' ? 'selecionado' : ''}`}
                  onClick={() => onChange({ icone: 'nenhum', estilo, cor })}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 26,
                      height: 26,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed var(--texto-fraco)',
                      borderRadius: '50%',
                      fontSize: 13,
                      color: 'var(--texto-fraco)',
                    }}
                  >
                    —
                  </span>
                  <span className="grade-icone-nome">Sem ícone</span>
                </button>
              )}
              {iconesFiltrados.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  className={`grade-icone-item ${icone === i.id ? 'selecionado' : ''}`}
                  onClick={() => onChange({ icone: i.id, estilo, cor })}
                >
                  <Icone id={i.id} estilo={estilo} cor={cor} tamanho={26} />
                  <span className="grade-icone-nome">{i.nome}</span>
                </button>
              ))}
              {iconesFiltrados.length === 0 && (
                <span className="texto-fraco" style={{ padding: '12px 4px' }}>
                  Nenhum ícone encontrado.
                </span>
              )}
            </div>

            <button type="button" className="primario" style={{ marginTop: 12 }} onClick={() => setModalAberto(false)}>
              Concluído
            </button>
          </div>
        </div>
      )}
    </>
  )
}
