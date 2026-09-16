/* Aba 2 do Planejamento — Gráficos (build 060, 13/09/2026).
 *
 * DOIS MODELOS, EM ABAS, escolhidos pelo Rafael nos protótipos:
 *
 *   LINHAS   grupo e categoria na MESMA régua de dinheiro, um embaixo do
 *            outro. Dá pra comparar categoria com categoria batendo o olho,
 *            porque todas usam a mesma escala.
 *   COLUNAS  uma coluna por grupo, sempre à vista, e o ZOOM AO LADO do que
 *            for tocado. Foi a sugestão dele: "mostra do lado como se fosse
 *            um zoom".
 *
 * AS PREMISSAS, dele, valem nos dois:
 *   · abre com todos os grupos e todas as categorias;
 *   · o nome fica DENTRO da fatia, sempre — nunca uma legenda à parte;
 *   · tocar num grupo filtra e mostra só as categorias dele;
 *   · tocar numa categoria abre a lista dos lançamentos.
 *
 * POR QUE NÃO PIZZA/ROSCA/MOSAICO: a menor categoria dele é ~56 vezes menor
 * que a maior. Em qualquer encoding de ÁREA a fatia dela fica com ~2 px e não
 * existe fonte que caiba ali — foi isso que derrubou as três levas anteriores
 * de protótipo, não falta de capricho. Aqui a altura da linha/fatia é FIXA e
 * só a largura varia: nada some, todo nome cabe.
 *
 * O que a barra mostra é sempre o mesmo e é o vocabulário do app inteiro
 * (`BarraIdeal`): azul = já gastei, âmbar = já comprometido, verde = posso
 * economizar, vermelho = passou da meta, e o TRILHO é a meta — a parte não
 * usada aparece sempre, um tom acima do fundo (pedido explícito: "não
 * imperceptível").
 *
 * Os 4 chips de vertente (Planejado × realizado, Só planejado, Só realizado,
 * Comprometido) saíram: a barra nova mostra as quatro coisas AO MESMO TEMPO,
 * então cada chip só apagava parte dela.
 */
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { fmtBRL, fmtComSinal, fmtSinalExplicito } from '../formatoMoeda'
import { LEGENDA_BARRAS, corDoToken } from '../legendaBarras'
import BarraIdeal from './BarraIdeal'
import ListaLancamentosCategoria from './ListaLancamentosCategoria'
import Legenda from './Legenda'
import type { Categoria, GrupoRegistro, Lancamento } from '../db'

export interface TotaisGrafico {
  planejado: number
  realizado: number
  previsto: number
}

export interface ItemCategoriaGrafico {
  cat: Categoria
  classe: 'entrada' | 'saida'
  totais: TotaisGrafico
}

export interface ItemGrupoGrafico {
  grupo: string
  tipo: 'entrada' | 'saida'
  icone?: GrupoRegistro['icone']
  iconeEstilo?: GrupoRegistro['iconeEstilo']
  iconeCor?: GrupoRegistro['iconeCor']
  itens: ItemCategoriaGrafico[]
  totalGrupo: TotaisGrafico
}

export type ModeloGrafico = 'linhas' | 'colunas' | 'medidor'

/* ORDEM DAS TRÊS ABAS, e o porquê (build 088):
 *
 *   COLUNAS  primeiro, e é o padrão ao abrir. Fixado na build 067 por pedido
 *            do Rafael ("Gráficos abre em Colunas") — a 088 NÃO mexe nisso.
 *   LINHAS   segundo, onde já estava. Mover uma aba existente de lugar troca
 *            o alvo do dedo de quem já usa a tela, sem nada em troca.
 *   MEDIDOR  terceiro, porque é o que entrou agora E porque é o mais
 *            AGREGADO dos três: Colunas e Linhas abrem o mês por grupo e por
 *            categoria; o Medidor mostra UM arco com o mês inteiro e só então
 *            deixa descer. Aba nova no fim é também o menor risco de alguém
 *            abrir a tela num lugar diferente do de ontem.
 */
export const MODELOS: { m: ModeloGrafico; rotulo: string }[] = [
  { m: 'colunas', rotulo: 'Colunas' },
  { m: 'linhas', rotulo: 'Linhas' },
  { m: 'medidor', rotulo: 'Medidor' },
]

/** O que cada barra recebe — sempre a leitura cheia, sem vertente. */
function barraDe(t: TotaisGrafico) {
  return {
    realizado: t.realizado,
    comprometido: t.previsto,
    meta: t.planejado,
    valor: t.planejado - (t.realizado + t.previsto),
  }
}

const soma = (xs: TotaisGrafico[]): TotaisGrafico =>
  xs.reduce(
    (s, x) => ({
      planejado: s.planejado + x.planejado,
      realizado: s.realizado + x.realizado,
      previsto: s.previsto + x.previsto,
    }),
    { planejado: 0, realizado: 0, previsto: 0 },
  )

/* A BARRA DA RÉGUA — usada pelo modelo Linhas e pela lista do zoom de grupo.
   Diferente da `BarraIdeal` (que normaliza cada barra pela própria meta, certo
   quando a pergunta é "quanto da MINHA meta eu usei"), aqui todas as barras
   dividem a MESMA escala de dinheiro: é isso que deixa comparar categoria com
   categoria batendo o olho, que foi o motivo de o Rafael escolher este modelo.

   O NOME É MEDIDO, NÃO ESTIMADO (build 067). A regra que ele pediu, literal:
   *"se couber na barra clara todo texto a cor da fonte é preta, se não coube
   fica fora e na frente na cor branca"*. Então o span do nome é medido contra a
   largura do PREENCHIDO (`useLayoutEffect` + `getBoundingClientRect`, antes do
   navegador pintar) e cai num de dois estados, nunca num meio-termo:

     cabe   → dentro do preenchido, texto ESCURO (o preenchido é claro)
     não cabe → fora dele, logo à frente, texto CLARO (o trilho é escuro)

   Duas tentativas anteriores caíram e ficam registradas para ninguém
   reintroduzir: a build 060 desenhava o nome DUAS vezes e recortava a cópia
   escura no limite do preenchido — a palavra trocava de cor no meio; a 063
   pintou tudo de branco com sombra — ele leu como "ficou ruim".

   O VALOR sai da barra: fica à direita, fora, no formato normal do app
   (`fmtBRL`, nunca "7,7k" — unidade abreviada não existe em nenhuma outra tela).
   Recolhida, a barra mostra o RESULTADO (sobra ou estouro); aberta, a linha
   "X de Y da meta" entra abaixo dela. É o mesmo padrão do zoom do modelo
   Colunas, que foi o que ele apontou como certo. */
function BarraRegua({
  nome,
  realizado,
  comprometido,
  meta,
  escala,
  forte,
  selecionada,
}: {
  nome: string
  realizado: number
  comprometido: number
  meta: number
  escala: number
  forte?: boolean
  selecionada?: boolean
}) {
  const usado = realizado + comprometido
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / (escala || 1)) * 100))}%`
  const estourou = meta > 0 && usado > meta + 0.005
  const resultado = meta - usado

  const refBarra = useRef<HTMLDivElement>(null)
  const refNome = useRef<HTMLSpanElement>(null)
  const [cabeDentro, setCabeDentro] = useState(true)
  const [fillPx, setFillPx] = useState(0)

  useLayoutEffect(() => {
    const barra = refBarra.current
    const span = refNome.current
    if (!barra || !span) return
    const largura = barra.getBoundingClientRect().width
    const preenchido = (largura * Math.max(0, Math.min(100, (usado / (escala || 1)) * 100))) / 100
    setFillPx(preenchido)
    // 8px de folga de cada lado — o texto não pode encostar na borda da cor.
    setCabeDentro(span.getBoundingClientRect().width + 16 <= preenchido)
  }, [nome, usado, escala, forte])

  return (
    <div className={`regua-linha ${forte ? 'forte' : ''} ${selecionada ? 'selecionada' : ''}`}>
      <div className="regua-barra" ref={refBarra}>
        <div className="regua-trilho" style={{ width: pct(meta) }} />
        <div className={`regua-fill ${estourou ? 'estouro' : ''}`} style={{ width: pct(realizado) }} />
        {comprometido > 0.005 && (
          <div
            className="regua-comprometido"
            style={{ left: pct(realizado), width: pct(comprometido) }}
          />
        )}
        {estourou && <div className="regua-meta" style={{ left: pct(meta) }} />}
        <span
          ref={refNome}
          className={`regua-nome ${cabeDentro ? 'dentro' : 'fora'}`}
          style={cabeDentro ? undefined : { left: Math.round(fillPx) + 8 }}
        >
          {nome}
        </span>
      </div>
      <span className={`regua-valor ${resultado < 0 ? 'valor-neg' : 'valor-pos'}`}>
        {fmtComSinal(resultado)}
      </span>
    </div>
  )
}

/* "X de Y da meta" — a linha de fechamento (build 066).
 *
 * O Rafael, olhando o modelo Linhas: *"o por linha, ele não mostra total usado
 * do total da meta? … na hora que eu clicar na meta tem que mostrar. E se eu
 * clicar numa categoria também"*. O modelo Colunas já tinha isso na categoria;
 * virou peça única e passou a valer nos QUATRO pontos onde algo é aberto —
 * grupo e categoria, nos dois modelos. */
function UsadoDaMeta({
  realizado,
  previsto,
  meta,
  testid,
}: {
  realizado: number
  previsto: number
  meta: number
  testid: string
}) {
  return (
    <p className="ideal-t3 texto-quebra linha-meta-zoom" style={{ margin: '8px 0 0' }} data-testid={testid}>
      {fmtCheio(realizado + previsto)} de {fmtCheio(meta)} da meta
    </p>
  )
}

/** R$ por extenso — no fechamento do zoom não há disputa de espaço. */
function fmtCheio(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/* `fmtCurto` (o "R$ 7,7k") foi removido na build 067: unidade abreviada não
   existe em nenhuma outra tela do app, e o valor saiu de dentro da barra —
   então não há mais disputa de espaço que justificasse inventar um formato
   próprio aqui. Todo valor destes gráficos usa `fmtBRL`/`fmtComSinal`. */

export interface Props {
  porGrupo: ItemGrupoGrafico[]
  modelo: ModeloGrafico
  aoTrocarModelo: (m: ModeloGrafico) => void
  /** Grupo em foco. `null` = todos. */
  grupoFiltro: string | null
  aoFiltrarGrupo: (g: string | null) => void
  /** Categoria com os lançamentos abertos. `null` = nenhuma. */
  categoriaAberta: number | null
  aoAbrirCategoria: (id: number | null) => void
  lancamentosPorCategoria: Map<number, Lancamento[]>
  aoAbrirLancamento: (opcoes?: { id?: number; categoriaIdSugerida?: number }) => void
  /** O veredito, renderizado pela tela — entra no topo, acima dos gráficos. */
  veredito?: ReactNode
  /* O modelo Linhas não usa ícone nenhum (13/09/2026, pedido: "está muito
     poluído assim"); o modelo Colunas usa só o da categoria, no card de zoom. */
  iconeDaCategoria?: (c: Categoria) => ReactNode
}

export default function GraficosPlanejamento(props: Props) {
  const { porGrupo, modelo, aoTrocarModelo, veredito } = props
  const gruposDeSaida = porGrupo.filter(
    (g) => g.tipo === 'saida' && (g.totalGrupo.planejado > 0 || g.totalGrupo.realizado > 0),
  )

  return (
    <>
      {veredito}

      <div className="abas-planejamento" role="tablist" aria-label="Modelo de gráfico">
        {MODELOS.map((x) => (
          <button
            key={x.m}
            type="button"
            role="tab"
            aria-selected={modelo === x.m}
            className={modelo === x.m ? 'ativa' : ''}
            onClick={() => aoTrocarModelo(x.m)}
            data-testid={`modelo-${x.m}`}
          >
            {x.rotulo}
          </button>
        ))}
      </div>

      {gruposDeSaida.length === 0 ? (
        <div className="cartao">
          <p className="ideal-t4 texto-quebra" style={{ margin: 0 }}>
            Nenhum grupo com meta cadastrada neste mês.
          </p>
        </div>
      ) : modelo === 'medidor' ? (
        <ModeloMedidor {...props} grupos={gruposDeSaida} />
      ) : modelo === 'linhas' ? (
        <ModeloLinhas {...props} grupos={gruposDeSaida} />
      ) : (
        <ModeloColunas {...props} grupos={gruposDeSaida} />
      )}
    </>
  )
}

/* ============================ LINHAS ============================
   Grupo e categoria na mesma régua. A linha do GRUPO tem cara própria
   (fundo, filete lateral colorido, nome em caixa alta e barra mais alta) —
   sem isso ela lia como "mais uma categoria", que foi o pedido do Rafael ao
   escolher este modelo. */
function ModeloLinhas({
  grupos,
  grupoFiltro,
  aoFiltrarGrupo,
  categoriaAberta,
  aoAbrirCategoria,
  lancamentosPorCategoria,
  aoAbrirLancamento,
}: Props & { grupos: ItemGrupoGrafico[] }) {
  const visiveis = grupoFiltro ? grupos.filter((g) => g.grupo === grupoFiltro) : grupos
  /* UMA escala para os grupos e UMA para as categorias — dentro de cada nível
     tudo é comparável; misturar os dois níveis numa escala só achataria toda
     categoria contra o grupo, que é uma ordem de grandeza maior. */
  const pico = (t: TotaisGrafico) => Math.max(t.realizado + t.previsto, t.planejado)
  const escalaGrupos = Math.max(...visiveis.map((g) => pico(g.totalGrupo)), 1)
  const escalaCategorias = Math.max(
    ...visiveis.flatMap((g) => g.itens.filter((x) => x.classe === 'saida').map((x) => pico(x.totais))),
    1,
  )
  return (
    <>
      {visiveis.map((g) => {
        const bg = barraDe(g.totalGrupo)
        const emFoco = grupoFiltro === g.grupo
        const cats = g.itens
          .filter((x) => x.classe === 'saida' && (x.totais.planejado > 0 || x.totais.realizado > 0))
          .sort((a, b) => b.totais.realizado - a.totais.realizado)
        return (
          <div className="cartao bloco-grafico-grupo" key={g.grupo} data-testid={`bloco-grupo-${g.grupo}`}>
            <button
              type="button"
              className={`linha-grafico-grupo ${emFoco ? 'selecionado' : ''}`}
              onClick={() => aoFiltrarGrupo(emFoco ? null : g.grupo)}
              aria-pressed={emFoco}
              data-testid={`barra-grupo-${g.grupo}`}
            >
              <BarraRegua
                nome={g.grupo.toUpperCase()}
                realizado={bg.realizado}
                comprometido={bg.comprometido}
                meta={bg.meta}
                escala={escalaGrupos}
                forte
              />
            </button>
            {emFoco && (
              <UsadoDaMeta
                realizado={g.totalGrupo.realizado}
                previsto={g.totalGrupo.previsto}
                meta={g.totalGrupo.planejado}
                testid={`linhas-meta-grupo-${g.grupo}`}
              />
            )}

            <div className="linhas-grafico-categorias">
              {cats.length === 0 ? (
                <p className="ideal-t4 texto-quebra" style={{ margin: '4px 0 0' }}>
                  Nenhuma categoria com meta ou movimento neste grupo.
                </p>
              ) : (
                cats.map((x) => {
                  const b = barraDe(x.totais)
                  const aberta = categoriaAberta === x.cat.id
                  return (
                    <div key={x.cat.id}>
                      <button
                        type="button"
                        className={`linha-cat-ideal ${aberta ? 'selecionado' : ''}`}
                        onClick={() => aoAbrirCategoria(aberta ? null : x.cat.id!)}
                        aria-pressed={aberta}
                        data-testid={`barra-categoria-${x.cat.id}`}
                      >
                        <BarraRegua
                          nome={x.cat.nome}
                          realizado={b.realizado}
                          comprometido={b.comprometido}
                          meta={b.meta}
                          escala={escalaCategorias}
                          selecionada={aberta}
                        />
                      </button>
                      {aberta && (
                        <div className="painel-lanc-grafico" data-testid="painel-lancamentos">
                          <UsadoDaMeta
                            realizado={x.totais.realizado}
                            previsto={x.totais.previsto}
                            meta={x.totais.planejado}
                            testid={`linhas-meta-categoria-${x.cat.id}`}
                          />
                          <ListaLancamentosCategoria
                            lancamentos={lancamentosPorCategoria.get(x.cat.id!) ?? []}
                            categoriaIdSugerida={x.cat.id!}
                            aoAbrirLancamento={aoAbrirLancamento}
                          />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            <Legenda familias={['regua']} testid={`legenda-linhas-${g.grupo}`} />
          </div>
        )
      })}
      {grupoFiltro && (
        <button
          type="button"
          className="botao-voltar-grafico"
          onClick={() => aoFiltrarGrupo(null)}
          data-testid="voltar-todos-grupos"
        >
          ‹ Ver todos os grupos
        </button>
      )}
    </>
  )
}

/* ============================ COLUNAS ============================
   As colunas ficam sempre à vista; o que muda é o ZOOM ao lado.

   Tocar numa CATEGORIA vai DIRETO pro detalhe dela (barra sozinha, com a
   linha da meta, e os lançamentos logo abaixo) — pedido do Rafael depois de
   ver o protótipo: antes o toque repetia as categorias do lado e exigia um
   segundo toque pra chegar na lista. Tocar no NOME do grupo (o rótulo em
   cima da coluna) continua abrindo o grupo inteiro. */
function ModeloColunas({
  grupos,
  grupoFiltro,
  aoFiltrarGrupo,
  categoriaAberta,
  aoAbrirCategoria,
  lancamentosPorCategoria,
  aoAbrirLancamento,
  iconeDaCategoria,
}: Props & { grupos: ItemGrupoGrafico[] }) {
  const emFocoCat = grupos
    .flatMap((g) => g.itens.map((x) => ({ g, x })))
    .find(({ x }) => x.cat.id === categoriaAberta)
  const emFocoGrupo = grupos.find((g) => g.grupo === grupoFiltro)
  const temZoom = !!emFocoCat || !!emFocoGrupo
  /* Com o zoom aberto a coluna vira uma referência lateral, não o gráfico
     principal — encolhe junto, senão o painel ao lado fica com metade da
     altura em branco. */
  const ALTURA = temZoom ? 170 : 250
  const MIN_FATIA = temZoom ? 12 : 20

  const catsDe = (g: ItemGrupoGrafico) =>
    g.itens
      .filter((x) => x.classe === 'saida' && (x.totais.planejado > 0 || x.totais.realizado > 0))
      .sort((a, b) => b.totais.realizado - a.totais.realizado)

  const maiorGrupo = Math.max(...grupos.map((g) => g.totalGrupo.realizado + g.totalGrupo.previsto), 1)

  /* As alturas de TODAS as colunas primeiro: com altura mínima por fatia, uma
     coluna de muitas categorias pode passar da altura proporcional dela — e é
     a maior soma que define o espaço reservado, senão a última fatia vaza por
     cima do rodapé (era o que acontecia com o grupo Variável). */
  const alturasPorGrupo = new Map<string, number[]>()
  for (const g of grupos) {
    const cats = catsDe(g)
    const usado = g.totalGrupo.realizado + g.totalGrupo.previsto
    const hCol = Math.max(24, (usado / maiorGrupo) * ALTURA)
    const valores = cats.map((c) => Math.max(c.totais.realizado + c.totais.previsto, 0))
    const somaVal = valores.reduce((s, v) => s + v, 0)
    const livre = Math.max(0, hCol - MIN_FATIA * cats.length)
    alturasPorGrupo.set(
      g.grupo,
      valores.map((v) => MIN_FATIA + (somaVal > 0 ? (v / somaVal) * livre : 0)),
    )
  }
  const alturaPilha = Math.max(
    ALTURA,
    ...[...alturasPorGrupo.values()].map((a) => a.reduce((s, v) => s + v + 2, 0)),
  )

  const catEmFoco = emFocoCat
  const grupoEmFoco = emFocoGrupo
  /* No zoom de um grupo, a régua é a do MAIOR item daquele grupo — dentro do
     grupo o que importa é comparar as categorias entre si. */
  const escalaZoom = grupoEmFoco
    ? Math.max(
        ...catsDe(grupoEmFoco).map((x) => Math.max(x.totais.realizado + x.totais.previsto, x.totais.planejado)),
        1,
      )
    : 1

  const emZoom = !!catEmFoco || !!grupoEmFoco

  /* O card de detalhe abre ABAIXO do gráfico, na largura inteira, com os
     lançamentos logo em seguida (13/09/2026). A build 060 abria AO LADO, com o
     gráfico encolhido a 108px — e ao lado, numa tela de 430px, sobra metade
     para cada um: o gráfico fica ilegível (fatia sem nome, grupo abreviado em
     3 letras) e a barra da categoria também. Empilhado, os dois ficam
     inteiros, e a ordem na tela vira a ordem da pergunta: gráfico → categoria
     escolhida → lançamentos dela. */
  const colunas = (
      <div className="cartao bloco-colunas" data-testid="colunas-grupos">
        <div className="colunas-grafico">
          {grupos.map((g) => {
            const cats = catsDe(g)
            const usado = g.totalGrupo.realizado + g.totalGrupo.previsto
            const valores = cats.map((c) => Math.max(c.totais.realizado + c.totais.previsto, 0))
            /* Altura mínima por fatia, o resto proporcional: sem isso a
               categoria pequena vira um fio de 2px e some — o defeito que
               derrubou os modelos de área. */
            const alturas = alturasPorGrupo.get(g.grupo) ?? []
            const hCol = alturas.reduce((s, v) => s + v + 2, 0)
            const emFoco = grupoFiltro === g.grupo || catEmFoco?.g.grupo === g.grupo
            return (
              <div className="coluna-grafico" key={g.grupo}>
                <button
                  type="button"
                  className={`coluna-titulo ${emFoco ? 'selecionado' : ''}`}
                  onClick={() => {
                    aoAbrirCategoria(null)
                    aoFiltrarGrupo(grupoFiltro === g.grupo ? null : g.grupo)
                  }}
                  data-testid={`coluna-grupo-${g.grupo}`}
                >
                  {g.grupo}
                </button>
                <div className="coluna-pilha" style={{ height: alturaPilha }}>
                  <div className="coluna-fatias" style={{ height: hCol }}>
                    {cats.map((c, i) => {
                      const estourou = c.totais.planejado > 0 && valores[i] > c.totais.planejado
                      const sel = categoriaAberta === c.cat.id
                      return (
                        <button
                          type="button"
                          key={c.cat.id}
                          className={`fatia-coluna ${estourou ? 'estouro' : ''} ${sel ? 'selecionada' : ''}`}
                          style={{ height: alturas[i] }}
                          title={c.cat.nome}
                          onClick={() => {
                            aoFiltrarGrupo(null)
                            aoAbrirCategoria(sel ? null : c.cat.id!)
                          }}
                          data-testid={`fatia-${c.cat.id}`}
                        >
                          {/* nome curto encolhe a fonte antes de cortar: a
                              premissa é o nome INTEIRO dentro da fatia */}
                          <span
                            className="fatia-nome"
                            style={{ fontSize: c.cat.nome.length > 12 ? 8.5 : 10 }}
                          >
                            {c.cat.nome}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="coluna-rodape ideal-t4">{Math.round((usado / 1000) * 10) / 10}k</div>
              </div>
            )
          })}
        </div>
        <Legenda familias={['colunas']} testid="legenda-colunas" />
      </div>
  )

  const painelZoom = catEmFoco ? (
        /* Cabeçalho em três degraus, cada coisa UMA vez (build 061, pedido do
           Rafael ao ver o zoom): o GRUPO no topo (na migalha), a CATEGORIA
           logo abaixo, e a meta só na linha de fechamento. A barra entra sem
           rótulo e sem o valor da meta flutuando: era esse valor que caía por
           cima do nome da categoria. */
        <div className="cartao zoom-grafico" data-testid="zoom-categoria">
          <div className="migalha-grafico">
            <button type="button" onClick={() => aoAbrirCategoria(null)} data-testid="zoom-voltar">
              ‹ Todos
            </button>
            <span className="atual">{catEmFoco.g.grupo}</span>
          </div>
          <div className="titulo-zoom" data-testid="zoom-titulo">
            {iconeDaCategoria?.(catEmFoco.x.cat)}
            <span className="texto-quebra">{catEmFoco.x.cat.nome}</span>
          </div>
          <BarraIdeal
            realizado={catEmFoco.x.totais.realizado}
            comprometido={catEmFoco.x.totais.previsto}
            meta={catEmFoco.x.totais.planejado}
            valor={barraDe(catEmFoco.x.totais).valor}
            destaque
          />
          <UsadoDaMeta
            realizado={catEmFoco.x.totais.realizado}
            previsto={catEmFoco.x.totais.previsto}
            meta={catEmFoco.x.totais.planejado}
            testid="zoom-meta"
          />
          <Legenda familias={['ideal']} testid="legenda-zoom-categoria" />
        </div>
      ) : grupoEmFoco ? (
        <div className="cartao zoom-grafico" data-testid="zoom-grupo">
          <div className="migalha-grafico">
            <button type="button" onClick={() => aoFiltrarGrupo(null)} data-testid="zoom-voltar">
              ‹ Todos
            </button>
            <span className="atual">{grupoEmFoco.grupo}</span>
          </div>
          <BarraIdeal
            realizado={grupoEmFoco.totalGrupo.realizado}
            comprometido={grupoEmFoco.totalGrupo.previsto}
            meta={grupoEmFoco.totalGrupo.planejado}
            valor={barraDe(grupoEmFoco.totalGrupo).valor}
            rotulo={grupoEmFoco.grupo.toUpperCase()}
            destaque
          />
          <UsadoDaMeta
            realizado={grupoEmFoco.totalGrupo.realizado}
            previsto={grupoEmFoco.totalGrupo.previsto}
            meta={grupoEmFoco.totalGrupo.planejado}
            testid="zoom-meta-grupo"
          />
          <div className="linhas-grafico-categorias" style={{ marginTop: 8 }}>
            {catsDe(grupoEmFoco).map((x) => {
              const b = barraDe(x.totais)
              return (
                <button
                  type="button"
                  key={x.cat.id}
                  className="linha-cat-ideal"
                  onClick={() => {
                    aoFiltrarGrupo(null)
                    aoAbrirCategoria(x.cat.id!)
                  }}
                  data-testid={`barra-categoria-${x.cat.id}`}
                >
                  {/* sem ícone aqui: o painel tem metade da largura, e o
                      ícone estava empurrando o nome pro corte */}
                  <BarraRegua
                    nome={x.cat.nome}
                    realizado={b.realizado}
                    comprometido={b.comprometido}
                    meta={b.meta}
                    escala={escalaZoom}
                  />
                </button>
              )
            })}
          </div>
          {/* Duas famílias neste card: a barra de destaque do grupo
              (`BarraIdeal`) e a lista de réguas das categorias. */}
          <Legenda familias={['ideal', 'regua']} testid="legenda-zoom-grupo" />
        </div>
      ) : null

  return (
    <>
      <div className="area-colunas">
        {colunas}
        {painelZoom}
      </div>

      {!emZoom && (
        <p className="ideal-t4 texto-quebra dica-grafico">
          Toque numa fatia pra ver a categoria e os lançamentos dela; toque no nome do grupo pra ver o
          grupo inteiro.
        </p>
      )}

      {/* A LISTA fica abaixo, na largura inteira: dentro da metade do zoom ela
          ficaria ilegível (descrição, valor e tarja na mesma linha). */}
      {catEmFoco && (
        <div className="cartao" data-testid="painel-lancamentos">
          <div className="titulo-bloco-ideal" style={{ marginTop: 0 }}>
            Lançamentos de {catEmFoco.x.cat.nome}
          </div>
          <ListaLancamentosCategoria
            lancamentos={lancamentosPorCategoria.get(catEmFoco.x.cat.id!) ?? []}
            categoriaIdSugerida={catEmFoco.x.cat.id!}
            aoAbrirLancamento={aoAbrirLancamento}
          />
        </div>
      )}

      {/* A soma dos grupos, pra o desenho não ficar sem fechamento. */}
      <div className="total-geral total-grafico-colunas" data-testid="total-colunas">
        <span className="ideal-t3">Total dos grupos</span>
        <span className="ideal-t3">
          {(() => {
            const t = soma(grupos.map((g) => g.totalGrupo))
            return `${Math.round(t.realizado + t.previsto).toLocaleString('pt-BR')} de ${Math.round(
              t.planejado,
            ).toLocaleString('pt-BR')}`
          })()}
        </span>
      </div>
    </>
  )
}

/* ============================ MEDIDOR (build 088) ============================
 *
 * Pedido do Rafael: *"inclua esse medidor em arco numa nova aba dentro do
 * planejamento dentro da aba Gráficos com efeitos dinamicos de clicar nas
 * fatias e ele abrir o card abaico respectivamente."*
 *
 * DE ONDE ELE VEIO. O medidor é o `GraficoMargem` da antiga tela Situação
 * (build 085), que a build 086 apagou junto com a tela — a única perda
 * assumida daquela rodada, registrada no CLAUDE.md e na RETOMADA.md. A
 * GEOMETRIA voltou IGUAL, de propósito: meio arco de 180°→360°, `L=210 A=124
 * cx=105 cy=108 R=82 ESP=16 GAP=0.035`, ponta arredondada só nas duas
 * extremidades do arco, o traço marcando o fim do comprometido e o número-
 * manchete no meio. Aquele desenho já tinha sido calibrado numa coluna de
 * 430px que precisa funcionar a 360px; redesenhar seria refazer a calibragem
 * sem motivo.
 *
 * O QUE MUDOU, e por quê:
 *
 * 1. O ARCO INTEIRO É A META DO MÊS (soma do `planejado` dos grupos de saída),
 *    não o teto de consumo da Situação. É o número que esta tela inteira usa
 *    como denominador — as colunas, as réguas e a árvore. Os segmentos são
 *    percorridos na ordem em que o dinheiro sai: realizado → comprometido →
 *    margem.
 *
 * 2. AS CORES SÃO AS DO PLANEJAMENTO (azul/âmbar/verde/vermelho), não as do
 *    original (que pintava o "já pago" de VERMELHO). O motivo está escrito na
 *    família `medidorTeto` de `src/legendaBarras.ts`, que é de onde elas saem
 *    — aqui não há nenhuma cor escrita à mão, nem no arco, nem na legenda.
 *
 * 3. O NÚMERO-MANCHETE É O "JÁ DESTINADO" (realizado + comprometido), não o
 *    comprometido sozinho como no original. Aqui isso ganhou uma coerência que
 *    lá não existia: o traço no arco marca exatamente o FIM desse número, então
 *    o ponteiro e a manchete falam da mesma coisa. No original o traço ficava
 *    no fim do comprometido e a manchete mostrava só a parte dele que ainda não
 *    tinha saído — dois números, um marcador.
 *
 * 4. AS FATIAS SÃO CLICÁVEIS e abrem UM card logo abaixo (o pedido). O card
 *    lista os GRUPOS que formam aquele número, do maior pro menor, e fecha com
 *    o próprio número do segmento. Uma fatia por vez: tocar noutra troca, tocar
 *    na mesma fecha.
 *
 * 5. O CARD DE DETALHE NÃO TEM BARRA COLORIDA — só nome e valor. Ele responde
 *    "de quem é este número", que é aritmética, não comparação. Uma segunda
 *    linguagem de cor logo abaixo do arco seria o defeito que a build 084
 *    fechou. Por isso a `Legenda` (família `medidorTeto`, recolhida) mora no
 *    card DO MEDIDOR, que é onde a cor está.
 *
 * 6. A ÁRVORE É A JÁ ESTABELECIDA. Tocar num grupo dentro do card usa
 *    `aoFiltrarGrupo`; tocar numa categoria usa `aoAbrirCategoria` e a lista é
 *    sempre `ListaLancamentosCategoria` — nunca uma segunda implementação.
 *
 * A margem de cada grupo entra COM SINAL (`fmtSinalExplicito`): grupo que
 * estourou contribui negativo, e é isso que faz a soma do card fechar
 * exatamente com o número do segmento em vez de "fechar quase".
 */

type SegmentoMedidor = 'realizado' | 'comprometido' | 'margem' | 'estouro'

const ROTULO_SEGMENTO: Record<SegmentoMedidor, string> = {
  realizado: 'Realizado',
  comprometido: 'Comprometido',
  margem: 'Margem',
  estouro: 'Estourou a meta',
}

/* A cor de cada papel sai de `legendaBarras.ts` — a MESMA entrada que a
   amostra da legenda desenha. Nenhum hex, nenhuma `var(--…)` digitada aqui. */
const TOKEN_SEGMENTO: Record<SegmentoMedidor, string> = {
  realizado: LEGENDA_BARRAS.medidorTeto.entradas[0].token,
  comprometido: LEGENDA_BARRAS.medidorTeto.entradas[1].token,
  margem: LEGENDA_BARRAS.medidorTeto.entradas[2].token,
  estouro: LEGENDA_BARRAS.medidorTeto.entradas[3].token,
}
const TOKEN_TRILHO_MEDIDOR = LEGENDA_BARRAS.medidorTeto.entradas[4].token

/** O valor de UM grupo dentro de UM segmento. Com sinal na margem/estouro. */
function valorDoGrupoNoSegmento(t: TotaisGrafico, seg: SegmentoMedidor): number {
  if (seg === 'realizado') return t.realizado
  if (seg === 'comprometido') return t.previsto
  if (seg === 'margem') return t.planejado - t.realizado - t.previsto
  return t.realizado + t.previsto - t.planejado
}

function ModeloMedidor({
  grupos,
  grupoFiltro,
  aoFiltrarGrupo,
  categoriaAberta,
  aoAbrirCategoria,
  lancamentosPorCategoria,
  aoAbrirLancamento,
}: Props & { grupos: ItemGrupoGrafico[] }) {
  const [segmentoAberto, setSegmentoAberto] = useState<SegmentoMedidor | null>(null)

  const total = soma(grupos.map((g) => g.totalGrupo))
  const meta = total.planejado
  const realizado = total.realizado
  const comprometido = total.previsto
  const margem = meta - realizado - comprometido
  const jaDestinado = realizado + comprometido
  const estourou = margem < -0.005

  /* GEOMETRIA — resgatada sem retoque da build 085 (`GraficoMargem`). */
  const L = 210
  const A = 124
  const cx = L / 2
  const cy = 108
  const R = 82
  const ESP = 16
  const GAP = 0.035 // ~2px de respiro entre segmentos vizinhos

  // Meio arco: da esquerda (180°) até a direita (360°).
  const ang = (fracao: number) => Math.PI + Math.PI * Math.min(1, Math.max(0, fracao))
  const ponto = (a: number, raio = R) => [cx + raio * Math.cos(a), cy + raio * Math.sin(a)]
  const arcoDe = (f1: number, f2: number) => {
    const a1 = ang(f1)
    const a2 = ang(f2)
    const [x1, y1] = ponto(a1)
    const [x2, y2] = ponto(a2)
    return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`
  }

  const base = meta > 0.005 ? meta : 1
  const fim1 = realizado / base
  const fim2 = (realizado + comprometido) / base

  const segmentos: { seg: SegmentoMedidor; valor: number; de: number; ate: number }[] = estourou
    ? [{ seg: 'estouro', valor: -margem, de: 0, ate: 1 }]
    : ([
        { seg: 'realizado', valor: realizado, de: 0, ate: fim1 },
        { seg: 'comprometido', valor: comprometido, de: fim1, ate: fim2 },
        { seg: 'margem', valor: margem, de: fim2, ate: 1 },
      ] as { seg: SegmentoMedidor; valor: number; de: number; ate: number }[]).filter((s) => s.valor > 0.005)

  /* Tocar numa fatia que já não existe mais (mudou o mês, zerou o valor) não
     pode deixar um card órfão aberto. */
  const abertoValido = segmentos.some((s) => s.seg === segmentoAberto) ? segmentoAberto : null

  const alternar = (seg: SegmentoMedidor) => {
    setSegmentoAberto((atual) => (atual === seg ? null : seg))
    aoFiltrarGrupo(null)
    aoAbrirCategoria(null)
  }

  const fimDoComprometido = Math.min(1, fim2)
  const [ax, ay] = ponto(ang(fimDoComprometido), R - ESP / 2 - 9)
  const [bx, by] = ponto(ang(fimDoComprometido), R + ESP / 2 + 3)

  /* Os grupos daquele segmento, do maior pro menor. Grupo que não contribui
     nada (0) fica de fora — linha de zero não explica número nenhum. */
  const linhasDoCard = abertoValido
    ? grupos
        .map((g) => ({ g, valor: valorDoGrupoNoSegmento(g.totalGrupo, abertoValido) }))
        .filter((x) => Math.abs(x.valor) > 0.005)
        .sort((a, b) => b.valor - a.valor)
    : []
  const totalDoCard = linhasDoCard.reduce((s, x) => s + x.valor, 0)
  /* SINAL EXPLÍCITO na margem E no estouro. Nos dois, a contribuição de um
     grupo pode ser NEGATIVA (grupo que estourou puxa a margem pra baixo; grupo
     que sobrou puxa o estouro pra baixo) — e `fmtBRL` não escreve sinal
     nenhum, então a linha apareceria como se somasse quando na verdade
     subtrai, e a soma do card não fecharia aos olhos de quem lê. Achado pelo
     roteiro t088 em Julho/2026, o mês que estourou. */
  const comSinal = abertoValido === 'margem' || abertoValido === 'estouro'

  const grupoEmFoco = grupos.find((g) => g.grupo === grupoFiltro)
  const catsDoGrupo = (g: ItemGrupoGrafico) =>
    g.itens
      .filter((x) => x.classe === 'saida' && (x.totais.planejado > 0 || x.totais.realizado > 0))
      .sort((a, b) => b.totais.realizado - a.totais.realizado)

  return (
    <>
      <div className="cartao bloco-medidor" data-testid="medidor-cartao">
        <div className="titulo-bloco-ideal" style={{ marginTop: 0 }}>
          QUANTO DA META JÁ TEM DESTINO
        </div>
        <div className="medidor-area">
          <svg
            width={L}
            height={A}
            viewBox={`0 0 ${L} ${A}`}
            className="medidor-svg"
            data-testid="medidor-svg"
            aria-label="Medidor da meta do mês: realizado, comprometido e margem"
          >
            <path
              d={arcoDe(0, 1)}
              fill="none"
              stroke={corDoToken(TOKEN_TRILHO_MEDIDOR)}
              strokeWidth={ESP}
              strokeLinecap="round"
              data-testid="medidor-trilho"
            />
            {/* ALVO DE TOQUE, invisível e mais largo que o arco (build 088).
                O traço visível tem 16px — abaixo do mínimo confortável num
                celular. Este irmão transparente repete a mesma curva com
                ESP+16 e leva o clique junto, então o dedo acerta a fatia sem
                o arco precisar engordar. `aria-hidden` porque quem responde
                por acessibilidade é o traço visível, que tem o `role` e o
                `aria-label`. */}
            {segmentos.map((s, i) => (
              <path
                key={`alvo-${s.seg}`}
                d={arcoDe(i === 0 ? s.de : s.de + GAP / 2, s.ate)}
                fill="none"
                stroke="transparent"
                strokeWidth={ESP + 16}
                className="medidor-alvo"
                aria-hidden="true"
                data-testid={`medidor-alvo-${s.seg}`}
                onClick={() => alternar(s.seg)}
              />
            ))}
            {segmentos.map((s, i) => {
              const sel = abertoValido === s.seg
              return (
                <path
                  key={s.seg}
                  d={arcoDe(i === 0 ? s.de : s.de + GAP / 2, s.ate)}
                  fill="none"
                  stroke={corDoToken(TOKEN_SEGMENTO[s.seg])}
                  strokeWidth={sel ? ESP + 5 : ESP}
                  strokeLinecap={i === 0 || i === segmentos.length - 1 ? 'round' : 'butt'}
                  /* O feedback do que está aberto é DUPLO: a fatia escolhida
                     engorda e as outras perdem opacidade. Só a espessura some
                     no arco de uma fatia só; só a opacidade some pra quem não
                     distingue bem tom de tom. */
                  opacity={abertoValido && !sel ? 0.4 : 1}
                  className={`medidor-fatia ${sel ? 'aberta' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-pressed={sel}
                  aria-label={`${ROTULO_SEGMENTO[s.seg]}: ${fmtBRL(Math.abs(s.valor))}. Toque para ver os grupos.`}
                  data-testid={`medidor-fatia-${s.seg}`}
                  onClick={() => alternar(s.seg)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                      e.preventDefault()
                      alternar(s.seg)
                    }
                  }}
                />
              )
            })}
            {!estourou && fimDoComprometido > 0.001 && fimDoComprometido < 0.999 && (
              <line
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke="var(--texto)"
                strokeWidth={2.5}
                strokeLinecap="round"
                data-testid="medidor-agulha"
              />
            )}
            <text x={cx} y={cy - 30} textAnchor="middle" className="medidor-rotulo">
              já destinado
            </text>
            <text x={cx} y={cy - 10} textAnchor="middle" className="medidor-manchete" data-testid="medidor-manchete">
              {fmtBRL(jaDestinado)}
            </text>
          </svg>
        </div>

        {estourou && (
          <p className="valor-neg texto-quebra" style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 700 }}>
            Estourou a meta em {fmtBRL(Math.abs(margem))} — o mês inteiro já está comprometido.
          </p>
        )}

        <div className="medidor-fechamento" data-testid="medidor-fechamento">
          <span className="ideal-t4">Meta do mês</span>
          <strong>{fmtBRL(meta)}</strong>
        </div>

        <p className="ideal-t4 texto-quebra dica-grafico" style={{ marginBottom: 0 }}>
          {abertoValido
            ? 'Toque na mesma fatia pra fechar o card, ou noutra pra trocar.'
            : 'Toque numa fatia do arco pra ver, no card abaixo, quais grupos formam aquele número.'}
        </p>

        <Legenda familias={['medidorTeto']} testid="legenda-medidor" />
      </div>

      {abertoValido && (
        <div className="cartao medidor-card" data-testid={`medidor-card-${abertoValido}`}>
          <div className="titulo-bloco-ideal" style={{ marginTop: 0 }} data-testid="medidor-card-titulo">
            {ROTULO_SEGMENTO[abertoValido]} · por grupo
          </div>

          {linhasDoCard.length === 0 ? (
            <p className="ideal-t4 texto-quebra" style={{ margin: 0 }}>
              Nenhum grupo contribui para este número neste mês.
            </p>
          ) : (
            <div className="medidor-lista">
              {linhasDoCard.map(({ g, valor }) => {
                const emFoco = grupoFiltro === g.grupo
                return (
                  <div key={g.grupo}>
                    <button
                      type="button"
                      className={`medidor-linha-grupo ${emFoco ? 'selecionado' : ''}`}
                      aria-pressed={emFoco}
                      onClick={() => {
                        aoAbrirCategoria(null)
                        aoFiltrarGrupo(emFoco ? null : g.grupo)
                      }}
                      data-testid={`medidor-grupo-${g.grupo}`}
                    >
                      <span className="texto-quebra">{g.grupo}</span>
                      <span className="medidor-linha-valor">
                        {comSinal ? fmtSinalExplicito(valor) : fmtBRL(valor)}
                      </span>
                    </button>

                    {emFoco && (
                      <div className="medidor-categorias" data-testid={`medidor-categorias-${g.grupo}`}>
                        {catsDoGrupo(g).length === 0 ? (
                          <p className="ideal-t4 texto-quebra" style={{ margin: '4px 0 0' }}>
                            Nenhuma categoria com meta ou movimento neste grupo.
                          </p>
                        ) : (
                          catsDoGrupo(g).map((x) => {
                            const aberta = categoriaAberta === x.cat.id
                            const v = valorDoGrupoNoSegmento(x.totais, abertoValido)
                            return (
                              <div key={x.cat.id}>
                                <button
                                  type="button"
                                  className={`medidor-linha-categoria ${aberta ? 'selecionado' : ''}`}
                                  aria-pressed={aberta}
                                  onClick={() => aoAbrirCategoria(aberta ? null : x.cat.id!)}
                                  data-testid={`medidor-categoria-${x.cat.id}`}
                                >
                                  <span className="texto-quebra">{x.cat.nome}</span>
                                  <span className="medidor-linha-valor">
                                    {comSinal ? fmtSinalExplicito(v) : fmtBRL(v)}
                                  </span>
                                </button>
                                {aberta && (
                                  <div className="painel-lanc-grafico" data-testid="painel-lancamentos">
                                    <UsadoDaMeta
                                      realizado={x.totais.realizado}
                                      previsto={x.totais.previsto}
                                      meta={x.totais.planejado}
                                      testid={`medidor-meta-categoria-${x.cat.id}`}
                                    />
                                    <ListaLancamentosCategoria
                                      lancamentos={lancamentosPorCategoria.get(x.cat.id!) ?? []}
                                      categoriaIdSugerida={x.cat.id!}
                                      aoAbrirLancamento={aoAbrirLancamento}
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* O fechamento: a soma das linhas acima É o número da fatia. */}
          <div className="medidor-total" data-testid={`medidor-card-total-${abertoValido}`}>
            <span className="ideal-t3">{ROTULO_SEGMENTO[abertoValido]}</span>
            <span className="ideal-t3">{comSinal ? fmtSinalExplicito(totalDoCard) : fmtBRL(totalDoCard)}</span>
          </div>

          {grupoEmFoco && (
            <button
              type="button"
              className="botao-voltar-grafico"
              onClick={() => {
                aoAbrirCategoria(null)
                aoFiltrarGrupo(null)
              }}
              data-testid="medidor-voltar-grupos"
            >
              ‹ Ver todos os grupos
            </button>
          )}
        </div>
      )}
    </>
  )
}
