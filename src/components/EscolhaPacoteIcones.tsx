/* A escolha do PACOTE DE ÍCONES — peça única, usada pelo N0 e pelo N1
   (build 089).

   Por que é uma peça só: o pedido do Rafael dá aos dois lados o mesmo poder
   ("o N0 pode ajustar o padrão que vale pros novos clientes... o N1 pode ter
   acesso aos padrões pra escolher e se quiser alterar"). Duas telas com o
   mesmo conteúdo escrito duas vezes divergem na primeira edição — foi o que
   aconteceu com os rótulos dos três cards da tela Hoje (build 087) e com a
   base das metas (build 051). Aqui o N0 passa `dark` e um rótulo de botão
   diferente; o resto é idêntico por construção.

   A PRÉVIA é o ponto da tela. Ninguém escolhe "Apenas borda" lendo a palavra
   "borda": escolhe vendo os ícones do próprio cadastro desenhados daquele
   jeito, com as cores que vão valer. Por isso a prévia mostra uma linha de
   categorias e uma linha de GRUPOS — é assim que a diferença entre as duas
   cores fica visível antes de aplicar, e não depois. */
import { Icone, PALETA_CORES, type EstiloIcone } from '../icones'
import {
  PACOTES_ORDEM,
  PACOTE_ACEITA_COR,
  ROTULO_PACOTE,
  coresBemDiferentes,
  distanciaCores,
  DISTANCIA_MINIMA_CORES,
  type PacoteIcones,
  type PacoteId,
} from '../pacotesIcones'

/* Quantos ícones a prévia mostra. Seis é o que cabe numa linha a 360px sem
   apertar, e já é amostra suficiente pra diferença entre os traços aparecer. */
const NA_PREVIA = 6

function amostra(mapa: Record<string, string>, quantos: number): { nome: string; icone: string }[] {
  return Object.entries(mapa)
    .filter(([, icone]) => icone && icone !== 'nenhum')
    .slice(0, quantos)
    .map(([nome, icone]) => ({ nome, icone }))
}

export default function EscolhaPacoteIcones({
  pacotes,
  emUso,
  selecionado,
  onSelecionar,
  onMudarCor,
  onUsar,
  rotuloUsar = 'Usar este pacote',
  dark = false,
  ocupado = false,
}: {
  pacotes: Record<PacoteId, PacoteIcones>
  emUso: PacoteId
  selecionado: PacoteId
  onSelecionar: (id: PacoteId) => void
  onMudarCor: (id: PacoteId, alvo: 'categorias' | 'grupos', cor: string) => void
  onUsar: (id: PacoteId) => void
  rotuloUsar?: string
  dark?: boolean
  ocupado?: boolean
}) {
  const pacote = pacotes[selecionado]
  const aceitaCor = PACOTE_ACEITA_COR[selecionado]
  const estilo = selecionado as EstiloIcone
  const corCat = pacote.corCategorias
  const corGru = pacote.corGrupos
  const okCores = coresBemDiferentes(corCat, corGru)
  const distancia = corCat && corGru ? distanciaCores(corCat, corGru) : Number.POSITIVE_INFINITY

  const textoFraco = dark ? { color: '#9aa1b1' } : undefined

  const linhaPrevia = (titulo: string, itens: { nome: string; icone: string }[], cor?: string) => (
    <div className="previa-pacote-linha">
      <span className="previa-pacote-rotulo" style={textoFraco}>{titulo}</span>
      <span className="previa-pacote-icones">
        {itens.map((i) => (
          <Icone key={i.nome} id={i.icone} estilo={estilo} cor={cor} tamanho={26} />
        ))}
      </span>
    </div>
  )

  return (
    <div data-testid="escolha-pacote-icones">
      <div role="tablist" className="abas-tela">
        {PACOTES_ORDEM.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selecionado === id}
            data-testid={`aba-pacote-${id}`}
            className={`aba-tela-item ${selecionado === id ? 'ativa' : ''}`}
            onClick={() => onSelecionar(id)}
          >
            {ROTULO_PACOTE[id]}
            {emUso === id && <span className="selo-em-uso" data-testid={`selo-em-uso-${id}`}>em uso</span>}
          </button>
        ))}
      </div>

      <div className="previa-pacote" data-testid={`previa-pacote-${selecionado}`}>
        {linhaPrevia('Categorias', amostra(pacote.categorias, NA_PREVIA), aceitaCor ? corCat : undefined)}
        {linhaPrevia('Grupos', amostra(pacote.grupos, NA_PREVIA), aceitaCor ? corGru : undefined)}
      </div>

      {aceitaCor ? (
        <>
          {/* "Permitir tanto N0 como N1 poder aplicar uma cor a todos os
              ícones de uma vez" — é este par de paletas. Uma cor para
              categorias, outra para grupos, nunca uma só. */}
          <span className="rotulo-cor-pacote" style={textoFraco}>Cor de todas as categorias</span>
          <div className="paleta-cores-icone" data-testid="paleta-categorias">
            {PALETA_CORES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor das categorias ${c}`}
                data-cor={c}
                className={`swatch-cor ${corCat === c ? 'selecionada' : ''}`}
                style={{ background: c }}
                onClick={() => onMudarCor(selecionado, 'categorias', c)}
              />
            ))}
          </div>
          <span className="rotulo-cor-pacote" style={textoFraco}>Cor de todos os grupos</span>
          <div className="paleta-cores-icone" data-testid="paleta-grupos">
            {PALETA_CORES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Cor dos grupos ${c}`}
                data-cor={c}
                className={`swatch-cor ${corGru === c ? 'selecionada' : ''}`}
                style={{ background: c }}
                onClick={() => onMudarCor(selecionado, 'grupos', c)}
              />
            ))}
          </div>
          {!okCores && (
            /* O app recusa em vez de aceitar em silêncio: o pedido é
               explícito ("não podem ser mesma cor nem tons parecidos") e no
               celular, num ícone de 26px, duas cores próximas viram a mesma
               cor. A distância é medida, não julgada no olho. */
            <p className="valor-neg texto-quebra" data-testid="aviso-cores-parecidas" style={{ margin: '8px 0 0' }}>
              Essas duas cores são parecidas demais ({distancia.toFixed(0)} de distância; o mínimo é{' '}
              {DISTANCIA_MINIMA_CORES}). Categorias e grupos precisam de cores que ninguém confunda num ícone
              pequeno — escolha uma das duas mais longe da outra.
            </p>
          )}
        </>
      ) : (
        <p className="texto-fraco texto-quebra" style={{ margin: '8px 0 0', ...textoFraco }}>
          O pacote 3D colorido não tem escolha de cor: cada emoji já vem com a cor dele.
        </p>
      )}

      <button
        type="button"
        className="primario"
        style={{ marginTop: 12 }}
        data-testid="usar-pacote"
        disabled={!okCores || ocupado}
        onClick={() => onUsar(selecionado)}
      >
        {ocupado ? 'Aplicando…' : `${rotuloUsar}: ${ROTULO_PACOTE[selecionado]}`}
      </button>
    </div>
  )
}
