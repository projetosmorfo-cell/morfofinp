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
// (`.modal-fundo`/`.modal-conteudo`).
//
// BUG REAL corrigido na build 089 (relatado pelo Rafael): "tem o botão
// concluir, mas se altero o ícone e nem clico no botão e volto pra tela de
// categorias já aplicou a alteração". Causa: cada clique na grade/aba/paleta
// chamava `onChange` NA HORA, e em `Categorias.tsx` esse `onChange` grava
// direto no banco (`atualizarCampoCategoria`) — então o botão "Concluído"
// não decidia nada, só fechava uma janela cuja mudança já tinha sido salva.
// Um botão que não decide nada é pior que não existir: ele promete um
// desfazer que não há.
//
// Agora o modal trabalha sobre um RASCUNHO local (`rascunho`), inicializado
// com o valor atual toda vez que abre. A grade, as abas e a paleta mexem só
// nele; `onChange` é chamado UMA vez, no "Concluído". Fechar pelo ✕, pelo
// "Cancelar" ou clicando fora descarta o rascunho e não avisa ninguém — o
// valor gravado continua o de antes. Isso vale de graça para os 4 lugares que usam
// o componente (cadastro de categoria e de grupo no N1, e os dois no padrão
// do N0), inclusive os que guardam em estado de formulário em vez de gravar
// na hora: commitar uma vez só nunca é pior que commitar a cada clique.
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
  /* O rascunho do modal (build 089). Só existe enquanto o modal está aberto;
     `abrir()` sempre o inicializa com o valor JÁ GRAVADO, então reabrir depois
     de um descarte nunca traz de volta a escolha abandonada. */
  const [rascunho, setRascunho] = useState({ icone, estilo, cor })

  function abrir() {
    setRascunho({ icone, estilo, cor })
    setBusca('')
    setAbaCategoria('todas')
    setModalAberto(true)
  }
  /* Descarta: fecha sem chamar `onChange`. Usado pelo ✕, pelo "Cancelar" e
     pelo clique fora — os três caminhos de "saí sem concluir". */
  function descartar() {
    setModalAberto(false)
  }
  function concluir() {
    onChange(rascunho)
    setModalAberto(false)
  }

  const termoBusca = normalizar(busca.trim())
  const iconesFiltrados = useMemo(
    () =>
      LISTA_ICONES.filter(
        (i) => (abaCategoria === 'todas' || i.categoria === abaCategoria) && buscaIcone(i, termoBusca),
      ),
    [abaCategoria, termoBusca],
  )

  const nomeIconeAtual = icone === 'nenhum' ? 'Sem ícone' : (ICONES[icone]?.nome ?? ICONES.outros.nome)

  /* Duas prévias, de propósito: a linha recolhida mostra o que está GRAVADO
     (props) e a de dentro do modal mostra o RASCUNHO. Enquanto o modal está
     aberto as duas podem divergir — é exatamente isso que faz o "Concluído"
     significar alguma coisa. */
  const previa = (ic: string, est: EstiloIcone, c: string) =>
    ic === 'nenhum' ? (
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
      <Icone id={ic} estilo={est} cor={c} tamanho={34} />
    )

  return (
    <>
      <button
        type="button"
        className="linha-selecionar-icone"
        onClick={abrir}
        aria-label={`Ícone atual: ${nomeIconeAtual}. Alterar.`}
      >
        {previa(icone, estilo, cor)}
        <span className="linha-selecionar-icone-texto">
          {/* Item 11 (16/09/2026): o nome INTERNO do ícone (usado só pra
              busca dentro da grade, `nomeIconeAtual`) não é mais mostrado
              aqui — a pré-visualização do próprio ícone já cumpre o papel de
              "qual está selecionado". */}
          <span className="texto-fraco">Ícone</span>
        </span>
        <span className="linha-selecionar-icone-acao">Alterar ›</span>
      </button>

      {modalAberto && (
        <div className="modal-fundo" onClick={descartar}>
          <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
            <div className="linha" style={{ border: 'none', padding: 0, marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Escolher Ícone</h2>
              <button
                type="button"
                onClick={descartar}
                aria-label="Fechar sem aplicar"
                data-testid="fechar-seletor-icone"
                style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--texto-fraco)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              {previa(rascunho.icone, rascunho.estilo, rascunho.cor)}
              <span className="texto-fraco">{rascunho.icone === 'nenhum' ? 'Sem ícone' : 'Pré-visualização'}</span>
            </div>

            <div role="tablist" className="abas-estilo-icone">
              {ABAS_ESTILO.map((aba) => (
                <button
                  key={aba.valor}
                  type="button"
                  role="tab"
                  aria-selected={rascunho.estilo === aba.valor}
                  className={`aba-estilo-icone-item ${rascunho.estilo === aba.valor ? 'ativa' : ''}`}
                  onClick={() => setRascunho((r) => ({ ...r, estilo: aba.valor }))}
                >
                  {aba.rotulo}
                </button>
              ))}
            </div>

            {rascunho.estilo !== 'colorido' && (
              <div className="paleta-cores-icone">
                {PALETA_CORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    className={`swatch-cor ${rascunho.cor === c ? 'selecionada' : ''}`}
                    style={{ background: c }}
                    onClick={() => setRascunho((r) => ({ ...r, cor: c }))}
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
                  className={`grade-icone-item ${rascunho.icone === 'nenhum' ? 'selecionado' : ''}`}
                  onClick={() => setRascunho((r) => ({ ...r, icone: 'nenhum' }))}
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
                  className={`grade-icone-item ${rascunho.icone === i.id ? 'selecionado' : ''}`}
                  onClick={() => setRascunho((r) => ({ ...r, icone: i.id }))}
                >
                  <Icone id={i.id} estilo={rascunho.estilo} cor={rascunho.cor} tamanho={26} />
                  <span className="grade-icone-nome">{i.nome}</span>
                </button>
              ))}
              {iconesFiltrados.length === 0 && (
                <span className="texto-fraco" style={{ padding: '12px 4px' }}>
                  Nenhum ícone encontrado.
                </span>
              )}
            </div>

            <div className="acoes-modal" style={{ marginTop: 12 }}>
              <button type="button" className="secundario" onClick={descartar}>
                Cancelar
              </button>
              <button type="button" className="primario" data-testid="concluir-seletor-icone" onClick={concluir}>
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
