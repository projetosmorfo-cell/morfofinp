/* Tela HOJE — a primeira da versão Ideal (13/09/2026).
 *
 * Ela responde duas perguntas, nesta ordem, e nada além disso:
 *
 *   1. quanto eu tenho hoje pra gastar sem me preocupar com nada?  → Saldo Livre
 *   2. quanto eu tenho pra TENTAR economizar?                      → Economia Possível
 *
 * São coisas completamente diferentes, e era a mistura das duas que fazia a
 * tela antiga precisar de três explicações abertas ao mesmo tempo. A conta das
 * duas mora em `src/doisNumeros.ts`, com a identidade que as amarra.
 *
 * O que NÃO entra aqui, de propósito: "margem comprometida", "sobra real",
 * blocos por grupo e tabelas de totais. Tudo isso vive no Planejamento, que é
 * a tela de plano — esta é a tela de hoje.
 *
 * Enquanto o plano não existe (nenhuma receita marcada como fixa), os dois
 * números dão lugar ao cartão de 3 passos: explicar telas vazias não ensina
 * nada. Ver `PrimeirosPassos`.
 */
import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type Lancamento } from '../db'
import { type TelaProps } from '../mes'
import { hojeEfetivoISO } from '../hojeSimulado'
import { lerDoAmbiente } from '../ambiente'
import SeletorMes from '../components/SeletorMes'
import BarraIdeal from '../components/BarraIdeal'
import ListaLancamentosCategoria from '../components/ListaLancamentosCategoria'
import { Icone } from '../icones'
import { useConfiguracaoIcones, tamanhoIconePx } from '../configuracaoIcones'
import TituloTelaN1 from '../kit/CabecalhoN1'
import { InfoDot } from '../kit/PadraoUI'
import { fmtBRL as fmt, fmtComSinal } from '../formatoMoeda'
import { categoriaConsomeMeta, idsDeCofre, lancamentoConsomeMeta } from '../orcamento'
import BlocoRecolhivel from '../components/BlocoRecolhivel'
import BarrasTopoHoje from '../components/BarrasTopoHoje'
import {
  calcularDoisNumeros,
  fraseSaldoLivre,
  frasePodeSobrar,
  EXPLICACAO_IDENTIDADE,
  EXPLICACAO_PODE_SOBRAR,
  EXPLICACAO_SALDO_LIVRE,
  type LinhaGrupo,
} from '../doisNumeros'
import { calcularProjecao, explicacaoRitmo, fraseVeredito } from '../projecao'
import { paramsGlobais, usePlatformN0 } from '../kit/kitPlatform'
import PrimeirosPassos from '../components/PrimeirosPassos'
import { ExportSheet, type ExportRow } from '../kit/ExportSheet'
import { jaAconteceu } from '../statusPagamento'

interface LinhaCategoria {
  cat: Categoria
  gasto: number
  diferenca: number
  comprometido: number
  lancamentos: Lancamento[]
}

export default function Hoje({ mes, aoMudarMes, aoAbrirLancamento, aoAbrirPlanejamento, aoAbrirCalibragem }: TelaProps) {
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), []) ?? []
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.toArray()), []) ?? []
  const metas = useLiveQuery(() => lerDoAmbiente(db.metas.toArray()), []) ?? []
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])
  const lancamentos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), []) ?? []
  const platform = usePlatformN0()
  const cfgIcones = useConfiguracaoIcones()
  const [expandida, setExpandida] = useState<number | null>(null)
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

  const hojeISO = hojeEfetivoISO()
  const janelaDias = paramsGlobais(platform).janelaMediaDias

  const numeros = calcularDoisNumeros({ lancamentos, categorias, contas, grupos, metas, mesISO: mes })
  const projecao = calcularProjecao({
    lancamentos, categorias, contas, grupos, metas, mesISO: mes, hojeISO, janelaDias,
  })

  // --- por categoria: quem estourou e quem ainda tem folga
  const contasCofre = idsDeCofre(contas)
  const gastoPorCategoria = new Map<number, number>()
  const compPorCategoria = new Map<number, number>()
  for (const l of lancamentos) {
    if (l.valor >= 0) continue
    if (!l.dataCompetencia.startsWith(mes)) continue
    const cat = l.categoriaId == null ? undefined : categorias.find((c) => c.id === l.categoriaId)
    if (!cat) continue
    if (!lancamentoConsomeMeta(l, cat.natureza, contasCofre)) continue
    const v = Math.abs(l.valor)
    gastoPorCategoria.set(cat.id!, (gastoPorCategoria.get(cat.id!) ?? 0) + v)
    /* Comprometido = ainda NÃO aconteceu. Compra de cartão já feita é
       realizado (azul), não comprometido (âmbar) — ver `contasCartao.ts`. */
    if (!jaAconteceu(l)) compPorCategoria.set(cat.id!, (compPorCategoria.get(cat.id!) ?? 0) + v)
  }
  /* O âmbar da barra da meta (build 067): o que já está lançado no mês mas
     ainda não aconteceu. Sai da MESMA conta das categorias, então a barra do
     topo e as barras de baixo nunca contam coisas diferentes. */
  let comprometidoTotal = 0
  for (const v of compPorCategoria.values()) comprometidoTotal += v

  /* Toda categoria que CONSOME META entra — não só as de natureza Consumo.
     Enquanto os cards eram "onde estourei/onde economizar" (só gasto) isso não
     aparecia; com o detalhe organizado POR GRUPO (build 066), um grupo de
     guardar sem suas categorias de Aporte ficaria vazio. */
  const linhas: LinhaCategoria[] = categorias
    .filter((c) => categoriaConsomeMeta(c.natureza))
    .map((cat) => ({
      cat,
      gasto: gastoPorCategoria.get(cat.id!) ?? 0,
      comprometido: compPorCategoria.get(cat.id!) ?? 0,
      diferenca: cat.aceitavelMensal - (gastoPorCategoria.get(cat.id!) ?? 0),
      lancamentos: lancamentos.filter(
        (l) => l.categoriaId === cat.id && l.dataCompetencia.startsWith(mes),
      ),
    }))

  /* Categorias por grupo, ESTOURADAS PRIMEIRO — dentro do grupo, o que precisa
     de ação vem antes do que está em ordem. Categoria sem meta e sem movimento
     fica fora: ela não explica nada do número do grupo. */
  const linhasPorGrupo = new Map<string, LinhaCategoria[]>()
  for (const l of linhas) {
    if (!l.cat.grupo) continue
    if (l.cat.aceitavelMensal <= 0 && l.gasto <= 0.005) continue
    const lista = linhasPorGrupo.get(l.cat.grupo) ?? []
    lista.push(l)
    linhasPorGrupo.set(l.cat.grupo, lista)
  }
  for (const lista of linhasPorGrupo.values()) lista.sort((a, b) => a.diferenca - b.diferenca)

  // --- calibragem: só aparece quando está errado (silêncio quando calibrado)
  const gruposDescalibrados = grupos.filter((g) => {
    if (g.tipo !== 'saida') return false
    const metaGrupo = (numeros.metaTotal * (metas.find((m) => m.grupo === g.nome)?.percentual ?? 0)) / 100
    const somaCat = categorias
      .filter((c) => c.grupo === g.nome && (c.natureza === 'Consumo' || c.natureza === 'Aporte' || c.natureza === 'Gasto de cofrinho'))
      .reduce((s, c) => s + c.aceitavelMensal, 0)
    return metaGrupo > 0 && Math.abs(metaGrupo - somaCat) >= 1
  })

  const pctCat = tamanhoIconePx('categoria', cfgIcones.pctCategoria)
  const pctGrupo = tamanhoIconePx('grupo', cfgIcones.pctGrupo)
  const iconeDe = (c: Categoria) =>
    c.icone && c.icone !== 'nenhum' ? (
      <Icone id={c.icone} estilo={c.iconeEstilo} cor={c.iconeCor} tamanho={pctCat} />
    ) : null
  const iconeDeGrupo = (nome: string) => {
    const g = grupos.find((x) => x.nome === nome)
    return g?.icone && g.icone !== 'nenhum' ? (
      <Icone id={g.icone} estilo={g.iconeEstilo} cor={g.iconeCor} tamanho={pctGrupo} />
    ) : null
  }

  const frase = fraseVeredito(projecao)
  /* Mês já terminado muda o TEMPO VERBAL da tela inteira, não só da frase do
     veredito (13/09/2026): rótulo do 2º número, as duas frases de apoio e a
     faixa de fechamento no topo do card. Abrir agosto em setembro e ler "se
     não gastar, isso vira economia" era o que não fazia sentido. */
  const mesFechado = projecao.mesFechado

  return (
    <>
      {/* O cabeçalho é FIXO, igual às outras 9 telas do app (build 033). A tela
          Hoje nasceu na 057 sem o `.cabecalho-fixo` e foi a única a ficar fora do
          padrão — o título e a navegação de mês subiam junto com o conteúdo. */}
      <div className="cabecalho-fixo">
      <TituloTelaN1
        titulo="Hoje"
        subtitulo="Real × metas + compromissos"
        explicacao={
          <>
            <p>
              A tela tem <strong>dois totais</strong>, e um é o resto do outro.
            </p>
            <p>
              <strong>1 · Livre de tudo</strong> é o que sobra depois de reservar TODAS as metas do
              mês, usadas ou não. {EXPLICACAO_SALDO_LIVRE}
            </p>
            <p>
              <strong>2 · Pode sobrar das metas</strong> é o oposto — dinheiro que TEM dono.{' '}
              {EXPLICACAO_PODE_SOBRAR}
            </p>
            <p>{EXPLICACAO_IDENTIDADE}</p>
          </>
        }
        onExportar={() => setExportOpen(true)}
      />
        <SeletorMes mes={mes} onMudar={aoMudarMes} />
      </div>

      {exportOpen && (
        <ExportSheet
          title="Hoje"
          filenameBase={`morfofinp-hoje-${mes}`}
          screenColumns={[{ key: 'item', label: 'Item' }, { key: 'valor', label: 'Valor' }]}
          screenRows={[
            { item: 'Saldo Livre', valor: fmt(numeros.saldoLivre) },
            { item: 'Economia Possível', valor: fmt(numeros.economiaPossivel) },
            { item: 'Meta do mês', valor: fmt(numeros.metaTotal) },
            { item: 'Realizado', valor: fmt(numeros.realizado) },
          ]}
          detailColumns={[
            { key: 'categoria', label: 'Categoria' },
            { key: 'grupo', label: 'Grupo' },
            { key: 'meta', label: 'Meta da categoria' },
            { key: 'gasto', label: 'Gasto' },
            { key: 'diferenca', label: 'Sobra / estouro' },
          ]}
          detailRows={linhas.map((l): ExportRow => ({
            categoria: l.cat.nome,
            grupo: l.cat.grupo ?? '—',
            meta: fmt(l.cat.aceitavelMensal),
            gasto: fmt(l.gasto),
            diferenca: fmt(l.diferenca),
          }))}
          onClose={() => setExportOpen(false)}
        />
      )}

      {!numeros.temPlano ? (
        <PrimeirosPassos categorias={categorias} grupos={grupos} metas={metas} aoAbrirCategorias={aoAbrirPlanejamento} />
      ) : (
        <>
          {/* O gráfico do topo: barra empilhada da receita fixa do mês. Sem
              eixo, sem legenda, sem número em cima. Barra e não donut porque
              donut mostra composição e barra mostra PROGRESSO — a pergunta é
              "em que ponto do mês eu estou". Em 430px também rende bem mais. */}
          <div className="cartao" data-testid="hoje-topo">
            {/* A IDENTIDADE, agora DESENHADA (build 067). Era uma linha de texto
                ("Caixa X − reservado Y = livre Z"), e o Rafael pediu para trocar
                por barras: o mesmo conteúdo, lido de relance. Ver
                `BarrasTopoHoje.tsx` para as três decisões que o pedido não
                cobria. */}
            <BarrasTopoHoje
              meta={numeros.metaTotal}
              realizado={numeros.realizado}
              comprometido={comprometidoTotal}
              resultadoDoMes={numeros.resultadoDoMes}
              caixaAnterior={numeros.caixaAcumulado - numeros.resultadoDoMes}
              caixaAcumulado={numeros.caixaAcumulado}
              saldoLivre={numeros.saldoLivre}
              reservado={numeros.reservado}
            />

            {/* ---------- 1 · LIVRE DE TUDO ---------- */}
            <div className="bloco-numero" data-testid="bloco-saldo-livre">
              <div className="bloco-numero-rotulo">
                1 · LIVRE DE TUDO
                <InfoDot titulo="Livre de tudo" info={EXPLICACAO_SALDO_LIVRE} />
              </div>
              <div
                className={`ideal-t1 ${numeros.saldoLivre < 0 ? 'valor-neg' : 'valor-pos'}`}
                data-testid="valor-saldo-livre"
              >
                {fmtComSinal(numeros.saldoLivre)}
              </div>
              <p className="ideal-t4 texto-quebra" style={{ margin: '2px 0 0' }}>
                {fraseSaldoLivre(numeros.saldoLivre, mesFechado)}
              </p>
              <BlocoRecolhivel testid="detalhe-livre">
                <div className="linha-detalhe-cat">
                  <span className="ideal-t4">Caixa de hoje (acumulado)</span>
                  <span className="ideal-t3">{fmtComSinal(numeros.caixaAcumulado)}</span>
                </div>
                <div className="linha-detalhe-cat">
                  <span className="ideal-t4">− reservado nas metas do mês</span>
                  <span className="ideal-t3">{fmt(numeros.reservado)}</span>
                </div>
                <div className="linha-detalhe-cat total">
                  <span className="ideal-t3">Livre de tudo</span>
                  <span className={`ideal-t3 ${numeros.saldoLivre < 0 ? 'valor-neg' : 'valor-pos'}`}>
                    {fmtComSinal(numeros.saldoLivre)}
                  </span>
                </div>
                {/* O bloco "Entrou / Saiu / Sobrou no mês" saiu daqui na build
                    067, a pedido do Rafael: *"esse valor não mostra em nenhum
                    lugar ali visualmente então retirar o trecho inteiro"*. O
                    resultado do mês virou a 3ª barra do topo, com nome e valor
                    — repetir a conta aqui era um segundo caminho para o mesmo
                    número, que é como a tela antiga virou confusa. */}
              </BlocoRecolhivel>
            </div>

            {/* ---------- 2 · PODE SOBRAR DAS METAS ---------- */}
            <div className="bloco-numero" data-testid="bloco-pode-sobrar">
              <div className="bloco-numero-rotulo">
                2 · {mesFechado ? 'SOBROU DAS METAS' : 'PODE SOBRAR DAS METAS'}
                <InfoDot titulo="Pode sobrar das metas" info={EXPLICACAO_PODE_SOBRAR} />
              </div>
              <div
                className={`ideal-t1 ${numeros.podeSobrar < 0 ? 'valor-neg' : 'valor-pos'}`}
                data-testid="valor-pode-sobrar"
              >
                {fmtComSinal(numeros.podeSobrar)}
              </div>
              <p className="ideal-t4 texto-quebra" style={{ margin: '2px 0 0' }}>
                {frasePodeSobrar(numeros.podeSobrar, mesFechado)}
              </p>
              {/* A frase do veredito fica VISÍVEL: é o que ainda pode mudar no
                  mês, e é o coração desta tela desde a build 057. */}
              {frase && (
                <div className="linha-veredito" data-testid="veredito">
                  <span
                    className={`ideal-t3 ${projecao.variavel < 0 ? 'veredito-mal' : 'veredito-bem'}`}
                    data-testid="frase-veredito"
                  >
                    {frase}
                  </span>
                  <InfoDot titulo="Nesse ritmo" info={explicacaoRitmo(janelaDias)} />
                </div>
              )}
              <BlocoRecolhivel testid="detalhe-pode-sobrar" rotulo="Ver por grupo">
                {/* A barra da meta de GASTO do mês — o gráfico da tela, agora
                    dentro do total a que pertence. */}
                <BarraIdeal
                  realizado={numeros.realizadoGasto}
                  comprometido={0}
                  meta={numeros.metaGasto}
                  destaque
                  mostrarValorDaMeta
                  semValor
                  data-testid="barra-topo"
                />
                {numeros.porGrupo.map((g) => (
                  <LinhaGrupoHoje
                    key={g.nome}
                    linha={g}
                    categorias={linhasPorGrupo.get(g.nome) ?? []}
                    aberta={grupoAberto === g.nome}
                    aoAlternar={() => setGrupoAberto(grupoAberto === g.nome ? null : g.nome)}
                    icone={iconeDeGrupo(g.nome)}
                    expandida={expandida}
                    setExpandida={setExpandida}
                    iconeDe={iconeDe}
                    aoAbrirLancamento={aoAbrirLancamento}
                  />
                ))}
                <div className="linha-detalhe-cat total" data-testid="total-pode-sobrar">
                  <span className="ideal-t3">Total</span>
                  <span className={`ideal-t3 ${numeros.podeSobrar < 0 ? 'valor-neg' : 'valor-pos'}`}>
                    {fmtComSinal(numeros.podeSobrar)}
                  </span>
                </div>
              </BlocoRecolhivel>
            </div>
          </div>
          {/* Calibragem: silêncio quando está certo; recolhida quando não. */}
          {gruposDescalibrados.length > 0 && (
            <div className="cartao" data-testid="cartao-calibragem">
              <BlocoRecolhivel
                comoBotao
                testid="aviso-calibragem"
                rotulo={`⚠ ${gruposDescalibrados.length} ${gruposDescalibrados.length === 1 ? 'grupo precisa' : 'grupos precisam'} de ajuste`}
              >
                {gruposDescalibrados.map((g) => {
                  const linha = numeros.porGrupo.find((x) => x.nome === g.nome)
                  const dif = (linha?.metaCategorias ?? 0) - (linha?.meta ?? 0)
                  return (
                    <div className="linha-detalhe-cat" key={g.nome}>
                      <span className="ideal-t4">{g.nome}</span>
                      <span className={`ideal-t3 ${dif > 0 ? 'valor-neg' : 'valor-pos'}`}>
                        {dif > 0 ? '+' : '−'} {fmt(Math.abs(dif))}
                      </span>
                    </div>
                  )
                })}
                <p className="ideal-t4 texto-quebra" style={{ margin: '6px 0 8px' }}>
                  É a diferença entre a meta do grupo e a soma das metas das categorias dele.
                </p>
                <button
                  type="button"
                  className="primario"
                  style={{ marginTop: 0 }}
                  onClick={aoAbrirCalibragem ?? aoAbrirPlanejamento}
                  data-testid="ir-calibrar"
                >
                  Calibrar
                </button>
              </BlocoRecolhivel>
            </div>
          )}

        </>
      )}

      <button className="botao-flutuante" onClick={() => aoAbrirLancamento()} aria-label="Novo lançamento">
        +
      </button>
    </>
  )
}

/* Uma linha de GRUPO dentro do 2º total (build 066).
 *
 * A régua do total é o GRUPO, nunca a categoria — até a build 065 a tela
 * misturava as duas (o número de cima vinha do percentual do grupo e os cards
 * de baixo da soma das metas de categoria), e por isso os números não
 * fechavam. A categoria virou o detalhe DENTRO do grupo, e o descalibre entre
 * as duas réguas aparece como linha própria no fechamento.
 */
function LinhaGrupoHoje({
  linha,
  categorias,
  aberta,
  aoAlternar,
  icone,
  expandida,
  setExpandida,
  iconeDe,
  aoAbrirLancamento,
}: {
  linha: LinhaGrupo
  categorias: LinhaCategoria[]
  aberta: boolean
  aoAlternar: () => void
  icone: ReactNode
  expandida: number | null
  setExpandida: (v: number | null) => void
  iconeDe: (c: Categoria) => ReactNode
  aoAbrirLancamento: TelaProps['aoAbrirLancamento']
}) {
  const guardar = linha.comportamento === 'guardar'
  const somaCategorias = categorias.reduce((s, c) => s + c.diferenca, 0)
  const descalibre = linha.metaCategorias - linha.meta
  return (
    <div className="grupo-hoje" data-testid={`grupo-hoje-${linha.nome}`}>
      <button type="button" className="linha-cat-ideal" onClick={aoAlternar} aria-expanded={aberta}>
        <BarraIdeal
          realizado={linha.realizado}
          meta={linha.meta}
          rotulo={linha.nome}
          icone={icone}
          valor={linha.diferenca}
          valorNeutro={guardar}
          compacta
        />
      </button>
      <p className="ideal-t4 texto-quebra linha-legenda-grupo">
        {guardar
          ? `aportou ${fmt(linha.realizado)} de ${fmt(linha.meta)} · falta aportar`
          : `gastou ${fmt(linha.realizado)} de ${fmt(linha.meta)} · ${
              linha.diferenca < 0 ? 'passou da meta' : 'sobrou da meta'
            }`}
      </p>
      {aberta && (
        <div className="detalhe-grupo-hoje">
          {categorias.length === 0 ? (
            <p className="ideal-t4 texto-quebra" style={{ margin: '4px 0' }}>
              Nenhuma categoria com meta ou movimento neste grupo.
            </p>
          ) : (
            categorias.map((l) => (
              <LinhaCat
                key={l.cat.id}
                linha={l}
                icone={iconeDe(l.cat)}
                aberta={expandida === l.cat.id}
                aoAlternar={() => setExpandida(expandida === l.cat.id ? null : l.cat.id!)}
                aoAbrirLancamento={aoAbrirLancamento}
              />
            ))
          )}
          <div className="linha-detalhe-cat" style={{ marginTop: 6 }}>
            <span className="ideal-t4">Soma das categorias</span>
            <span className={`ideal-t3 ${somaCategorias < 0 ? 'valor-neg' : 'valor-pos'}`}>
              {fmtComSinal(somaCategorias)}
            </span>
          </div>
          {Math.abs(descalibre) >= 0.005 && (
            <div className="linha-detalhe-cat" data-testid={`descalibre-${linha.nome}`}>
              <span className="ideal-t4">
                {descalibre > 0
                  ? 'suas metas de categoria passam da meta do grupo'
                  : 'suas metas de categoria ficam abaixo da meta do grupo'}
              </span>
              <span className={`ideal-t3 ${descalibre > 0 ? 'valor-neg' : 'valor-pos'}`}>
                {descalibre > 0 ? '−' : '+'} {fmt(Math.abs(descalibre))}
              </span>
            </div>
          )}
          <div className="linha-detalhe-cat total">
            <span className="ideal-t3">{linha.nome}</span>
            <span className={`ideal-t3 ${linha.diferenca < 0 ? 'valor-neg' : 'valor-pos'}`}>
              {fmtComSinal(linha.diferenca)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Uma linha de categoria: barra + UM número. O detalhe vem ao tocar. */
function LinhaCat({
  linha,
  icone,
  aberta,
  aoAlternar,
  aoAbrirLancamento,
}: {
  linha: LinhaCategoria
  icone: ReactNode
  aberta: boolean
  aoAlternar: () => void
  aoAbrirLancamento: TelaProps['aoAbrirLancamento']
}) {
  return (
    <div>
      <button type="button" className="linha-cat-ideal" onClick={aoAlternar} aria-expanded={aberta}>
        <BarraIdeal
          realizado={linha.gasto - linha.comprometido}
          comprometido={linha.comprometido}
          meta={linha.cat.aceitavelMensal}
          rotulo={linha.cat.nome}
          icone={icone}
          valor={linha.diferenca}
          compacta
        />
      </button>
      {aberta && (
        <>
          {/* ABERTA, a linha mostra a CONTA que justifica o número recolhido
              (build 059, pedido do Rafael): meta e gasto, e a diferença entre
              os dois. Recolhida continua só com o resultado — a barra já diz o
              resto. */}
          <div className="detalhe-cat-ideal" data-testid="detalhe-cat">
            <div className="linha-detalhe-cat">
              <span className="ideal-t4">Meta da categoria</span>
              <span className="ideal-t3">{fmt(linha.cat.aceitavelMensal)}</span>
            </div>
            <div className="linha-detalhe-cat">
              <span className="ideal-t4">
                Gasto{linha.comprometido > 0.005 ? ' (com o comprometido)' : ''}
              </span>
              <span className="ideal-t3">{fmt(linha.gasto)}</span>
            </div>
            <div className="linha-detalhe-cat total">
              <span className="ideal-t3">{linha.diferenca < 0 ? 'Estourou' : 'Posso economizar'}</span>
              <span className={`ideal-t3 ${linha.diferenca < 0 ? 'valor-neg' : 'valor-pos'}`}>
                {fmt(Math.abs(linha.diferenca))}
              </span>
            </div>
          </div>
          <ListaLancamentosCategoria
            lancamentos={linha.lancamentos}
            categoriaIdSugerida={linha.cat.id!}
            aoAbrirLancamento={aoAbrirLancamento}
          />
          <div className="linha-detalhe-cat total" data-testid="total-lancamentos-cat">
            <span className="ideal-t4">
              {linha.lancamentos.length} lançamento{linha.lancamentos.length === 1 ? '' : 's'}
            </span>
            <span className="ideal-t3">{fmt(linha.lancamentos.reduce((s, l) => s + Math.abs(l.valor), 0))}</span>
          </div>
        </>
      )}
    </div>
  )
}
