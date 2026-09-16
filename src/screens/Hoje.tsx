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
import { comportamentoDoGrupo } from '../gruposUtil'
import BlocoRecolhivel from '../components/BlocoRecolhivel'
import Legenda from '../components/Legenda'
import { corFaixaGrupoRio } from '../legendaBarras'
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

/* O rótulo do recolhível dos TRÊS cards do fim da tela Hoje — "ONDE ESTOUREI",
   "ONDE POSSO ECONOMIZAR" e "APORTES DO MÊS" (build 087). Constante única de
   propósito: o pedido do Rafael foi justamente que os três se comportassem
   igual, e três strings soltas voltariam a divergir na primeira edição. */
const ROTULO_NUMEROS = 'Ver os números'

/* "O Rio" (14/09/2026) — as 5 caixas da tela Hoje, todas individualmente
 * expansíveis, cada uma com um título "De onde vem X?" no botão que abre o
 * detalhe (o mesmo padrão que o Reservado já usava) e um "i" quando
 * recolhida. Substitui as três barras desenhadas (build 067,
 * `BarrasTopoHoje.tsx`, removido) — o Rafael confirmou explicitamente
 * ("Ainda quero O Rio, do jeito original") que queria voltar para caixas
 * clicáveis com valor em R$, não barras. As duas primeiras caixas (Livre de
 * tudo / Reservado) e a numeração "1 ·"/"2 ·" delas são as mesmas da build
 * 066 (aprovada: "está aprovado") — só ganharam o título "De onde vem…?" no
 * botão de abrir. As três novas (Mês passado / Este mês / Caixa de hoje) só
 * existiam desenhadas em barra; agora são caixa com valor e detalhe, iguais
 * às outras duas em comportamento. */
const INFO_MES_PASSADO =
  'O que sobrou no caixa somando todos os meses até o mês anterior. ' +
  'Negativo quer dizer que o mês começou no vermelho.'
const INFO_ESTE_MES =
  'O que entrou menos o que saiu neste mês — só deste mês, sem o que veio de trás.'
const INFO_CAIXA_HOJE =
  'Tudo que sobrou no caixa até hoje, somando todos os meses: o mês passado mais o ' +
  'resultado deste mês. Dele, uma parte está livre de tudo e o resto continua ' +
  'reservado nas metas do mês que ainda não foram usadas.'

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
  /* O detalhe de um par de caixas lado a lado (build 074, o ponto principal do
     pedido do Rafael) nunca fica DENTRO da caixa clicada — isso a confinava à
     metade da linha, virando "mais uma coluna" ao lado da outra caixa. O
     estado mora aqui, um por par (`null | 'esquerda' | 'direita'`), e o corpo
     do detalhe é renderizado como IRMÃO da linha de duas colunas, ocupando
     100% da largura, com um balão apontando pra qual das duas foi clicada.
     Caixa de hoje é única (já ocupa a linha inteira) e continua usando
     `BlocoRecolhivel` normalmente — não precisa desse mecanismo. */
  const [abertoTopo, setAbertoTopo] = useState<'passado' | 'este' | null>(null)
  const [abertoBase, setAbertoBase] = useState<'livre' | 'reservado' | null>(null)

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

  /* ===== "ONDE ESTOUREI" / "ONDE POSSO ECONOMIZAR" (build 083) =====
     Os dois cards do fim da tela existiam até a build 065 e foram removidos na
     066; o Rafael pediu de volta, com os nomes melhorados que já tinham ficado
     ("ONDE ESTOUREI" / "ONDE POSSO ECONOMIZAR"), abaixo de tudo que a tela já
     mostra hoje.

     PONTO DELICADO: `linhas` mudou de sentido na 066 — passou a incluir TODA
     categoria que consome meta (inclusive as de Aporte), porque o detalhe por
     GRUPO precisa disso pra um grupo de guardar não abrir vazio. Restaurar os
     cards em cima dessa lista larga colocaria Aporte dentro de "estourei"/
     "posso economizar", o que NÃO era o comportamento da 065 (lá os cards eram
     só de gasto). Por isso os cards saem de uma VISTA FILTRADA (`linhasDeGasto`)
     e `linhas` continua larga: o detalhe por grupo não muda um pixel.
     Fora ficam as categorias de natureza Aporte e qualquer categoria de grupo
     com comportamento 'guardar' — deixar de guardar não é estouro nem
     economia (mesma regra que `doisNumeros.ts` aplica ao 2º total). */
  /* `ehDeGuardar` é o critério ÚNICO dos dois recortes abaixo — e ele nunca
     olha o NOME do grupo (regra da build 061): o que define "guardar" é a
     natureza da categoria e o COMPORTAMENTO do grupo dela. */
  const ehDeGuardar = (l: LinhaCategoria) => {
    if (l.cat.natureza === 'Aporte') return true
    const g = l.cat.grupo ? grupos.find((x) => x.nome === l.cat.grupo) : undefined
    return !!(g && comportamentoDoGrupo(g) === 'guardar')
  }
  const linhasDeGasto = linhas.filter((l) => !ehDeGuardar(l))
  /* ===== APORTES DO MÊS (build 086) =====
     O card que vivia só na tela Premium "Situação" ("Aportes do mês
     (Objetivos/Segurança)") mudou de casa: ele é o complemento exato de
     `linhasDeGasto` — tudo que a tela Hoje tira dos dois cards de gasto por
     ser dinheiro que se GUARDA. Categoria sem meta e sem movimento fica fora:
     não explica nada. */
  const linhasDeAporte = linhas.filter(
    (l) => ehDeGuardar(l) && (l.cat.aceitavelMensal > 0.005 || l.gasto > 0.005),
  )
  const metaAportes = linhasDeAporte.reduce((s, l) => s + (l.cat.aceitavelMensal || 0), 0)
  const totalAportado = linhasDeAporte.reduce((s, l) => s + l.gasto, 0)
  const estourou = linhasDeGasto
    .filter((l) => l.diferenca < -0.005)
    .sort((a, b) => a.diferenca - b.diferenca)
  const comSobra = linhasDeGasto
    .filter((l) => l.diferenca > 0.005 && l.cat.aceitavelMensal > 0)
    .sort((a, b) => b.diferenca - a.diferenca)

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

  /* Caixa acumulado até o mês ANTERIOR (a caixa "Mês passado") — o resto das
     três primeiras caixas é derivado desta e de `numeros.resultadoDoMes`. */
  const caixaAnterior = numeros.caixaAcumulado - numeros.resultadoDoMes

  /* "O Rio", visual de funil (14/09/2026, build 070) — a largura das duas
   * caixas de baixo (Livre de tudo/Reservado) ERA proporcional ao valor real
   * de cada uma (Math.abs(saldoLivre)/Math.abs(reservado), com piso de
   * 18%/82%). Rafael pediu explicitamente pra REMOVER isso (build 075): os 2
   * pares da mesma linha (Mês passado/Este mês E Livre de tudo/Reservado)
   * agora dividem a largura sempre 50/50, simétrico, nunca por valor — mesmo
   * comportamento que o par de cima (`.rio-linha .bloco-numero { flex: 1 1 0 }`,
   * `index.css`) sempre teve. `centroLivreRio`/`centroReservadoRio` viram
   * constantes fixas (25/75) só pra apontar a seta divergente e a ponta do
   * balão pro CENTRO real de cada caixa agora que a largura é fixa — nunca
   * mais derivadas do valor em R$. */
  const centroLivreRio = 25
  const centroReservadoRio = 75

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
              Toda caixa desta tela é clicável — toque nela para ver de onde vem o número.
            </p>
            <p>
              <strong>Mês passado</strong>, <strong>Este mês</strong> e{' '}
              <strong>Caixa de hoje</strong> são o caixa acumulado, por partes: o mês passado
              mais o resultado deste mês forma a caixa de hoje.
            </p>
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
          <div className="rio-funil" data-testid="rio-funil">
          <div className="rio-linha rio-linha-topo">
            {/* ---------- MÊS PASSADO ---------- */}
            <div className="bloco-numero" data-testid="bloco-mes-passado">
              <div className="bloco-numero-rotulo">
                Mês passado
                <InfoDot titulo="Mês passado" info={INFO_MES_PASSADO} />
              </div>
              {/* Número "menos importante": sempre neutro, nunca colorido por
                  sinal — pedido explícito do Rafael. */}
              <div className="ideal-t1" data-testid="valor-mes-passado">
                {fmtComSinal(caixaAnterior)}
              </div>
              <p className="ideal-t4 texto-quebra" style={{ margin: '2px 0 0' }}>
                caixa acumulado até o mês anterior
              </p>
              {/* Só o CABEÇALHO/botão mora dentro da caixa — o corpo do
                  detalhe é o balão logo abaixo da linha inteira. */}
              <div className="bloco-recolhivel">
                <button
                  type="button"
                  className="bloco-recolhivel-botao"
                  onClick={() => setAbertoTopo(abertoTopo === 'passado' ? null : 'passado')}
                  aria-expanded={abertoTopo === 'passado'}
                  data-testid="detalhe-mes-passado"
                >
                  <span>{abertoTopo === 'passado' ? 'Recolher' : 'De onde vem o mês passado?'}</span>
                  <span
                    className={`bloco-recolhivel-seta ${abertoTopo === 'passado' ? 'aberta' : ''}`}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              </div>
            </div>

            {/* ---------- ESTE MÊS ---------- */}
            <div className="bloco-numero" data-testid="bloco-este-mes">
              <div className="bloco-numero-rotulo">
                Este mês
                <InfoDot titulo="Este mês" info={INFO_ESTE_MES} />
              </div>
              <div className="ideal-t1" data-testid="valor-este-mes">
                {fmtComSinal(numeros.resultadoDoMes)}
              </div>
              <p className="ideal-t4 texto-quebra" style={{ margin: '2px 0 0' }}>
                {numeros.resultadoDoMes < 0 ? 'faltou no mês' : 'sobrou no mês'}
              </p>
              <div className="bloco-recolhivel">
                <button
                  type="button"
                  className="bloco-recolhivel-botao"
                  onClick={() => setAbertoTopo(abertoTopo === 'este' ? null : 'este')}
                  aria-expanded={abertoTopo === 'este'}
                  data-testid="detalhe-este-mes"
                >
                  <span>{abertoTopo === 'este' ? 'Recolher' : 'De onde vem este mês?'}</span>
                  <span
                    className={`bloco-recolhivel-seta ${abertoTopo === 'este' ? 'aberta' : ''}`}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              </div>
            </div>

          </div>

          {/* O corpo do detalhe do par de cima — largura TOTAL da linha, nunca
              confinado à metade de uma das duas caixas (build 074, o ponto
              principal do pedido). O balão aponta pra qual das duas foi
              clicada: ponta alinhada ao CENTRO da caixa esquerda ou da
              direita, via a variável CSS `--balao-tip`. */}
          {abertoTopo && (
            <div
              className="balao-detalhe"
              data-testid="detalhe-topo-corpo"
              style={{ '--balao-tip': abertoTopo === 'passado' ? '25%' : '75%' } as React.CSSProperties}
            >
              {abertoTopo === 'passado' ? (
                <>
                  <div className="linha-detalhe-cat">
                    <span className="ideal-t4">Caixa de hoje (acumulado)</span>
                    <span className="ideal-t3">{fmtComSinal(numeros.caixaAcumulado)}</span>
                  </div>
                  <div className="linha-detalhe-cat">
                    <span className="ideal-t4">− resultado deste mês</span>
                    <span className="ideal-t3">{fmtComSinal(numeros.resultadoDoMes)}</span>
                  </div>
                  <div className="linha-detalhe-cat total">
                    <span className="ideal-t3">Mês passado</span>
                    <span className={`ideal-t3 ${caixaAnterior < 0 ? 'valor-neg' : 'valor-pos'}`}>
                      {fmtComSinal(caixaAnterior)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="linha-detalhe-cat">
                    <span className="ideal-t4">Entrou no mês</span>
                    <span className="ideal-t3">{fmtComSinal(numeros.entradas)}</span>
                  </div>
                  <div className="linha-detalhe-cat">
                    <span className="ideal-t4">− saiu no mês</span>
                    <span className="ideal-t3">{fmt(Math.abs(numeros.saidas))}</span>
                  </div>
                  <div className="linha-detalhe-cat total">
                    <span className="ideal-t3">Resultado do mês</span>
                    <span className={`ideal-t3 ${numeros.resultadoDoMes < 0 ? 'valor-neg' : 'valor-pos'}`}>
                      {fmtComSinal(numeros.resultadoDoMes)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* seta convergindo: Mês passado + Este mês → Caixa de hoje. Forma
              CHEIA (trapézio), não linha fina — o print mostra uma silhueta de
              seta/funil, cor lisa e sutil, igual à borda dos cartões. */}
          <div className="rio-conector" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon points="15,0 85,0 58,100 42,100" className="rio-seta-svg" />
            </svg>
          </div>

          <div className="rio-linha rio-linha-meio">
            {/* ---------- CAIXA DE HOJE (ACUMULADO) ---------- */}
            <div className="bloco-numero rio-caixa-hoje" data-testid="bloco-caixa-hoje">
              <div className="bloco-numero-rotulo">
                Caixa de hoje (acumulado)
                <InfoDot titulo="Caixa de hoje" info={INFO_CAIXA_HOJE} />
              </div>
              <div className="ideal-t1" data-testid="valor-caixa-hoje">
                {fmtComSinal(numeros.caixaAcumulado)}
              </div>
              <p className="ideal-t4 texto-quebra" style={{ margin: '2px 0 0' }}>
                acumulado até este mês
              </p>
              <BlocoRecolhivel testid="detalhe-caixa-hoje" rotulo="De onde vem a caixa de hoje?">
                <div className="linha-detalhe-cat">
                  <span className="ideal-t4">Mês passado</span>
                  <span className="ideal-t3">{fmtComSinal(caixaAnterior)}</span>
                </div>
                <div className="linha-detalhe-cat">
                  <span className="ideal-t4">+ resultado deste mês</span>
                  <span className="ideal-t3">{fmtComSinal(numeros.resultadoDoMes)}</span>
                </div>
                <div className="linha-detalhe-cat total">
                  <span className="ideal-t3">Caixa de hoje</span>
                  <span className={`ideal-t3 ${numeros.caixaAcumulado < 0 ? 'valor-neg' : 'valor-pos'}`}>
                    {fmtComSinal(numeros.caixaAcumulado)}
                  </span>
                </div>
              </BlocoRecolhivel>
            </div>

          </div>

          {/* seta divergindo: Caixa de hoje → Livre de tudo / Reservado. A base
              do trapézio aponta pro CENTRO de cada caixa (25%/75%, build 075 —
              as duas caixas abaixo são sempre 50/50, nunca proporcionais ao
              valor). */}
          <div className="rio-conector" aria-hidden="true">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none">
              <polygon
                points={`42,0 58,0 ${Math.min(98, centroReservadoRio + 8)},100 ${Math.max(2, centroLivreRio - 8)},100`}
                className="rio-seta-svg"
              />
            </svg>
          </div>

          <div className="rio-linha rio-linha-base">
            {/* ---------- 1 · LIVRE DE TUDO ---------- */}
            <div
              className={`bloco-numero ${numeros.saldoLivre < 0 ? 'rio-vermelho' : 'rio-verde'}`}
              data-testid="bloco-saldo-livre"
            >
              <div className="bloco-numero-rotulo">
                1 · LIVRE DE TUDO
                <InfoDot titulo="Livre de tudo" info={EXPLICACAO_SALDO_LIVRE} />
              </div>
              {/* Rótulo E valor na MESMA cor (verde se positivo, vermelho se
                  negativo) — a cor vem do modificador `.rio-verde`/
                  `.rio-vermelho` no cartão, não de uma classe no próprio
                  número. */}
              <div className="ideal-t1" data-testid="valor-saldo-livre">
                {fmtComSinal(numeros.saldoLivre)}
              </div>
              <p className="ideal-t4 texto-quebra" style={{ margin: '2px 0 0' }} data-testid="frase-livre">
                {fraseSaldoLivre(numeros.saldoLivre, mesFechado)}
              </p>
              <div className="bloco-recolhivel">
                <button
                  type="button"
                  className="bloco-recolhivel-botao"
                  onClick={() => setAbertoBase(abertoBase === 'livre' ? null : 'livre')}
                  aria-expanded={abertoBase === 'livre'}
                  data-testid="detalhe-livre"
                >
                  <span>{abertoBase === 'livre' ? 'Recolher' : 'De onde vem o livre de tudo?'}</span>
                  <span
                    className={`bloco-recolhivel-seta ${abertoBase === 'livre' ? 'aberta' : ''}`}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              </div>
            </div>

            {/* ---------- 2 · PODE SOBRAR DAS METAS ---------- */}
            <div
              className={`bloco-numero ${numeros.podeSobrar < 0 ? 'rio-vermelho' : 'rio-ambar'}`}
              data-testid="bloco-pode-sobrar"
            >
              <div className="bloco-numero-rotulo">
                2 · {mesFechado ? 'SOBROU DAS METAS' : 'PODE SOBRAR DAS METAS'}
                <InfoDot titulo="Pode sobrar das metas" info={EXPLICACAO_PODE_SOBRAR} />
              </div>
              {/* Mesma regra do Livre de tudo: rótulo e valor sempre na MESMA
                  cor (âmbar se positivo — o caso normal —, vermelho se um dia
                  o reservado vier negativo). Corrige o que o Rafael apontou:
                  o rótulo já era âmbar, mas o valor ficava branco/neutro. */}
              <div className="ideal-t1" data-testid="valor-pode-sobrar">
                {fmtComSinal(numeros.podeSobrar)}
              </div>
              <p className="ideal-t4 texto-quebra" style={{ margin: '2px 0 0' }} data-testid="frase-pode-sobrar">
                {frasePodeSobrar(numeros.podeSobrar, mesFechado)}
              </p>
              <div className="bloco-recolhivel">
                <button
                  type="button"
                  className="bloco-recolhivel-botao"
                  onClick={() => setAbertoBase(abertoBase === 'reservado' ? null : 'reservado')}
                  aria-expanded={abertoBase === 'reservado'}
                  data-testid="detalhe-pode-sobrar"
                >
                  <span>{abertoBase === 'reservado' ? 'Recolher' : 'De onde vem o reservado?'}</span>
                  <span
                    className={`bloco-recolhivel-seta ${abertoBase === 'reservado' ? 'aberta' : ''}`}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Corpo do detalhe do par de baixo — largura total, balão apontando
              pra caixa clicada. As duas caixas são sempre 50/50 (build 075),
              então a ponta fica fixa em 25%/75% — os mesmos
              `centroLivreRio`/`centroReservadoRio` usados pra desenhar a seta
              divergente acima. */}
          {abertoBase && (
            <div
              className="balao-detalhe"
              data-testid="detalhe-base-corpo"
              style={{
                '--balao-tip': `${abertoBase === 'livre' ? centroLivreRio : centroReservadoRio}%`,
              } as React.CSSProperties}
            >
              {abertoBase === 'livre' ? (
                <>
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
                </>
              ) : (
                <>
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
                  {/* A legenda deste balão passou a ser RECOLHIDA (build 086,
                      pedido do Rafael): aberta, ela era a maior parte do
                      conteúdo do balão, empurrando as barras por grupo — que
                      são o assunto — para fora da tela.
                      Isto NÃO fere a regra da 084 ("um card, um recolhível"):
                      o balão só existe depois de a pessoa abrir "De onde vem o
                      reservado?", então nunca há dois botões de abrir
                      concorrendo no card fechado. O que a 084 proíbe é a
                      escolha dobrada no mesmo nível, não um detalhe dentro de
                      um detalhe já aberto.
                      São duas famílias de barra aqui — a barra da meta do mês
                      (`BarraIdeal`) e as barras por grupo (`.rio-bar-row`) —,
                      então as duas aparecem, cada uma com o próprio título. */}
                  <Legenda familias={['ideal', 'rioGrupo']} testid="legenda-funil" />
                </>
              )}
            </div>
          )}
          </div>
          </div>

          {/* O veredito ("Nesse ritmo...") vive AQUI, fora de qualquer caixa
              (O Rio, requisito 7) — antes ficava nascido dentro da caixa
              Reservado (build 057-067); agora é seu próprio cartão, sempre
              visível, entre o gráfico e a calibragem. A lógica/frase em si
              não mudou — só o lugar. */}
          {frase && (
            <div className="cartao" style={{ marginTop: 14 }} data-testid="cartao-veredito">
              <div className="linha-veredito" style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }} data-testid="veredito">
                <span
                  className={`ideal-t3 ${projecao.variavel < 0 ? 'veredito-mal' : 'veredito-bem'}`}
                  data-testid="frase-veredito"
                >
                  {frase}
                </span>
                <InfoDot titulo="Nesse ritmo" info={explicacaoRitmo(janelaDias)} />
              </div>
            </div>
          )}

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

          {/* Os dois cards restaurados na build 083 ficam ABAIXO de tudo que já
              existia na tela (funil, veredito e calibragem), por pedido
              explícito do Rafael. Ficam abaixo da dobra e se alcança rolando —
              isso é esperado e não desfaz a build 082, que garante a linha de
              baixo do funil visível com `scrollTop === 0`.

              BUILD 087 — os três cards do fim da tela ficaram IGUAIS. Rafael:
              *"os card na tela 'Hoje' ficaram fora do padrão… esses devem ser
              recolhíveis igual é o ultimo card 'Aportes do Mês' sob nome 'Ver
              Números' e quando expandir, mostra os números e a legenda"*. Até
              aqui estes dois mostravam o fechamento (soma das metas, soma do
              gasto, total) solto no pé do card MAIS uma Legenda com botão
              próprio — dois blocos, um deles sempre aberto. Agora seguem o
              desenho que a 086 deu ao card de aportes: UM recolhível, o mesmo
              rótulo (`ROTULO_NUMEROS`, constante única pros três), com os
              números E a legenda dentro dele (`comoConteudo`, sem botão
              próprio — a regra da 084). */}
          {estourou.length > 0 && (
            <>
              <div className="titulo-bloco-ideal">ONDE ESTOUREI</div>
              <div className="cartao" data-testid="onde-estourei">
                {estourou.map((l) => (
                  <LinhaCat
                    key={l.cat.id}
                    linha={l}
                    icone={iconeDe(l.cat)}
                    aberta={expandida === l.cat.id}
                    aoAlternar={() => setExpandida(expandida === l.cat.id ? null : l.cat.id!)}
                    aoAbrirLancamento={aoAbrirLancamento}
                  />
                ))}
                <BlocoRecolhivel rotulo={ROTULO_NUMEROS} testid="detalhe-onde-estourei">
                  <TotalDoCartao linhas={estourou} rotulo="Total estourado" testid="total-estourei" />
                  <Legenda familias={['ideal']} comoConteudo testid="legenda-onde-estourei" />
                </BlocoRecolhivel>
              </div>
            </>
          )}

          {comSobra.length > 0 && (
            <>
              <div className="titulo-bloco-ideal">ONDE POSSO ECONOMIZAR</div>
              <div className="cartao" data-testid="onde-posso-economizar">
                {comSobra.map((l) => (
                  <LinhaCat
                    key={l.cat.id}
                    linha={l}
                    icone={iconeDe(l.cat)}
                    aberta={expandida === l.cat.id}
                    aoAlternar={() => setExpandida(expandida === l.cat.id ? null : l.cat.id!)}
                    aoAbrirLancamento={aoAbrirLancamento}
                  />
                ))}
                <BlocoRecolhivel rotulo={ROTULO_NUMEROS} testid="detalhe-onde-economizar">
                  <TotalDoCartao
                    linhas={comSobra}
                    rotulo="Total que posso economizar"
                    testid="total-economizar"
                  />
                  <Legenda familias={['ideal']} comoConteudo testid="legenda-onde-economizar" />
                </BlocoRecolhivel>
              </div>
            </>
          )}

          {/* APORTES DO MÊS (build 086) — o último card da tela, abaixo dos dois
              restaurados na 083. Enxuto no padrão Ideal, do jeito que o Rafael
              descreveu: poucos textos, barra estreita (`compacta`), SÓ o número
              no fim da barra, e os demais números recolhidos num único bloco
              (regra da 084: um card, um recolhível — por isso a Legenda entra
              como conteúdo dele, sem botão próprio). As linhas não expandem: o
              detalhe por lançamento já existe no 2º total, por grupo. */}
          {linhasDeAporte.length > 0 && (
            <>
              <div className="titulo-bloco-ideal">APORTES DO MÊS</div>
              <div className="cartao" data-testid="aportes-do-mes">
                {linhasDeAporte.map((l) => (
                  <div key={l.cat.id} data-testid={`aporte-cat-${l.cat.id}`}>
                    <BarraIdeal
                      realizado={l.gasto - l.comprometido}
                      comprometido={l.comprometido}
                      meta={l.cat.aceitavelMensal}
                      rotulo={l.cat.nome}
                      icone={iconeDe(l.cat)}
                      /* O número do fim da barra é o APORTADO — a resposta
                         direta do card. Neutro de propósito: aportar não é
                         "positivo/negativo", e o quanto ainda cabe está no
                         recolhível logo abaixo. */
                      valor={l.gasto}
                      valorNeutro
                      compacta
                    />
                  </div>
                ))}
                <BlocoRecolhivel rotulo={ROTULO_NUMEROS} testid="detalhe-aportes">
                  {linhasDeAporte.map((l) => (
                    <div className="linha-detalhe-cat" key={l.cat.id}>
                      <span className="ideal-t4">{l.cat.nome}</span>
                      <span className="ideal-t3">
                        {fmt(l.gasto)} de {fmt(l.cat.aceitavelMensal)}
                      </span>
                    </div>
                  ))}
                  <div className="linha-detalhe-cat total" data-testid="total-aportes">
                    <span className="ideal-t3">Aportado</span>
                    <span className="ideal-t2">
                      {fmt(totalAportado)} de {fmt(metaAportes)}
                    </span>
                  </div>
                  {metaAportes - totalAportado > 0.005 && (
                    <div className="linha-detalhe-cat" data-testid="falta-aportar">
                      <span className="ideal-t4">Falta aportar</span>
                      <span className="ideal-t3 valor-neg">{fmt(metaAportes - totalAportado)}</span>
                    </div>
                  )}
                  {totalAportado - metaAportes > 0.005 && (
                    <div className="linha-detalhe-cat" data-testid="aportou-a-mais">
                      <span className="ideal-t4">Aportou a mais que a meta</span>
                      <span className="ideal-t3 valor-pos">{fmt(totalAportado - metaAportes)}</span>
                    </div>
                  )}
                  <Legenda familias={['ideal']} comoConteudo testid="legenda-aportes" />
                </BlocoRecolhivel>
              </div>
            </>
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
  /* Lista de barras padronizada (build 074, "De onde vem o reservado — meta
     por grupo"): uma barra sólida por grupo, cor por faixa de uso da meta,
     percentual na frente na MESMA cor da barra — nunca o segmentado
     azul/âmbar/verde/vermelho da barra principal, que responde outra
     pergunta ("de onde vem cada real gasto"). Aqui a pergunta é só "que
     fração da meta este grupo já usou": >100% estourou (vermelho); <70%
     bem abaixo do ritmo (âmbar — o mesmo token do cartão Reservado);
     entre os dois, dentro do esperado (azul). */
  const pctUso = linha.meta > 0 ? (linha.realizado / linha.meta) * 100 : 0
  /* Os limiares e as 3 cores vivem em `src/legendaBarras.ts` — a MESMA fonte
     que a Legenda deste card lê (build 084). Antes estavam escritos aqui, e a
     legenda teria que repetir os hex à mão pra concordar com a barra. */
  const corBarra = corFaixaGrupoRio(pctUso)
  /* `linha.diferenca` num grupo de guardar já vem com piso em zero
     (`doisNumeros.ts`), então o excedente aportado se lê pela conta crua. */
  const sobraGuardar = linha.meta - linha.realizado
  const textoGuardar =
    sobraGuardar > 0.005
      ? `falta aportar ${fmt(sobraGuardar)}`
      : sobraGuardar < -0.005
        ? `aportou ${fmt(-sobraGuardar)} a mais`
        : 'meta cumprida'
  const textoGasto =
    linha.diferenca < -0.005
      ? `estourou ${fmt(-linha.diferenca)}`
      : linha.diferenca > 0.005
        ? `margem ${fmt(linha.diferenca)}`
        : 'bateu a meta'
  return (
    <div className="grupo-hoje" data-testid={`grupo-hoje-${linha.nome}`}>
      <button type="button" className="linha-cat-ideal" onClick={aoAlternar} aria-expanded={aberta}>
        <div className="rio-bar-row" data-testid={`rio-bar-${linha.nome}`}>
          <span className="rio-bar-nome">
            {icone}
            {linha.nome}
          </span>
          <div className="rio-bar-trilho">
            <div
              className="rio-bar-fill"
              style={{ width: `${Math.max(0, Math.min(100, pctUso))}%`, background: corBarra }}
            />
          </div>
          <span className="rio-bar-pct" style={{ color: corBarra }}>
            {Math.round(pctUso)}%
          </span>
        </div>
      </button>
      {/* O texto abaixo da barra ficou COMPLETO na build 086: antes terminava
          num rótulo sem número ("· falta aportar", "· passou da meta") e a
          pessoa tinha de abrir o grupo para saber de quanto. Agora diz quanto
          passou, quanto falta ou quanto ainda cabe.
          Vocabulário já estabelecido no projeto: "estourou" quando passou do
          teto, "margem" para o que ainda cabe dentro dele — "faltam" segue
          proibido (a forma "falta aportar", de `doisNumeros.ts`, é outra
          coisa: é o nome da conta de guardar, não o plural banido). */}
      <p className="ideal-t4 texto-quebra linha-legenda-grupo">
        {guardar ? `aportou ${fmt(linha.realizado)} de ${fmt(linha.meta)} · ${textoGuardar}` : null}
        {!guardar ? `gastou ${fmt(linha.realizado)} de ${fmt(linha.meta)} · ${textoGasto}` : null}
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

/* Fechamento de um dos dois cards do fim da tela (restaurado da build 065 na
   083): a soma das metas das categorias listadas, a soma do gasto delas e a
   diferença entre as duas — pra que o total do card seja conferível a olho a
   partir das linhas logo acima. */
function TotalDoCartao({
  linhas,
  rotulo,
  testid,
}: {
  linhas: LinhaCategoria[]
  rotulo: string
  testid: string
}) {
  const meta = linhas.reduce((s, l) => s + (l.cat.aceitavelMensal || 0), 0)
  const gasto = linhas.reduce((s, l) => s + l.gasto, 0)
  const dif = meta - gasto
  return (
    <div className="detalhe-cat-ideal fechamento-cartao" data-testid={testid}>
      <div className="linha-detalhe-cat">
        <span className="ideal-t4">Soma das metas destas categorias</span>
        <span className="ideal-t3">{fmt(meta)}</span>
      </div>
      <div className="linha-detalhe-cat">
        <span className="ideal-t4">Soma do gasto</span>
        <span className="ideal-t3">{fmt(gasto)}</span>
      </div>
      <div className="linha-detalhe-cat total">
        <span className="ideal-t3">{rotulo}</span>
        <span className={`ideal-t2 ${dif < 0 ? 'valor-neg' : 'valor-pos'}`}>{fmt(Math.abs(dif))}</span>
      </div>
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
