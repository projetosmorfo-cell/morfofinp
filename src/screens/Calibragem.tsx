/* CALIBRAGEM — os percentuais vistos JUNTOS (build 059).
 *
 * Por que esta tela existe. O Rafael descreveu o problema inteiro usando o app:
 *
 *   "fui num grupo que estava com 47%... mudei para 48%. Ele refez, falou que
 *    está OK... Mas como não estou vendo o percentual, o que acontece? Sei que
 *    aumentei 1% nesse grupo e deveria ter diminuído 1% em um ou mais dos
 *    outros. Em nenhum lugar dessa tela está mostrando qual é o percentual
 *    total. Deveria ter um total ali mostrando 101% e chamando a atenção."
 *
 * O diagnóstico dele está certo: cada card do Planejamento olhava só para a
 * própria vida e dizia "OK" com o conjunto em 101%. Nenhuma soma existia.
 *
 * São DUAS calibragens, e elas são independentes:
 *
 *   1. ENTRE GRUPOS   — os percentuais somam 100% da receita fixa?
 *   2. DENTRO DO GRUPO — a soma das metas das categorias cabe na meta dele?
 *
 * As duas aparecem aqui, nesta ordem, porque a de cima muda a de baixo: mexer
 * no percentual de um grupo muda a meta em R$ dele e, portanto, a folga das
 * categorias. Ver os dois níveis na mesma tela é o que torna o ajuste possível
 * sem pular de card em card.
 *
 * Silêncio quando está certo: quem está calibrado aparece sem alarde. O
 * alerta é do conjunto, no topo, e some quando a soma fecha.
 */
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type GrupoRegistro, type TipoGrupo } from '../db'
import { ROTULO_TIPO_GRUPO } from '../gruposUtil'
import { lerDoAmbiente, marcaDoAmbiente } from '../ambiente'
import { baseMetaDoMes, metaEmReais } from '../baseMeta'
import { categoriaConsomeMeta } from '../orcamento'
import { fmtBRL, fmtNum } from '../formatoMoeda'
import { Icone } from '../icones'
import { useConfiguracaoIcones, tamanhoIconePx } from '../configuracaoIcones'
import { ArrowsRightLeftIcon, PencilSquareIcon, ListBulletIcon } from '@heroicons/react/24/outline'
import ListaLancamentosCategoria from '../components/ListaLancamentosCategoria'
import { idsDeCofre } from '../orcamento'
import { mesAtualISO, formatarMes } from '../mes'
import {
  referenciaPorCategoria,
  outraReferencia,
  ROTULO_REFERENCIA,
  ROTULO_REFERENCIA_CURTO,
  type BaseReferencia,
} from '../referenciaHistorica'
import TituloTelaN1 from '../kit/CabecalhoN1'
import { marcarCategoriasEditadas } from '../kit/padraoCategorias'
import { PopupAceitavelCategoria, PopupMetaGrupo } from '../components/EdicaoRapida'
import BaseDaReceita from '../components/BaseDaReceita'

/** Diferença que já vale alerta — abaixo disso é arredondamento. */
const TOLERANCIA_REAIS = 1
const TOLERANCIA_PCT = 0.5

export interface CalibragemProps {
  mes: string
  aoVoltar: () => void
  /* Item 7 da lista pendente (15/09/2026): clicar no ícone de "ver
     lançamentos" de uma categoria abre o formulário de lançamento (mesmo
     modal do resto do app) a partir da lista filtrada — opcional pra não
     quebrar quem ainda chame esta tela sem passar a prop. */
  aoAbrirLancamento?: (opcoes?: { id?: number; categoriaIdSugerida?: number }) => void
}

export default function Calibragem({ mes, aoVoltar, aoAbrirLancamento }: CalibragemProps) {
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.toArray()), [])
  const metas = useLiveQuery(() => lerDoAmbiente(db.metas.toArray()), [])
  const lancamentos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), [])
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])
  const cfgIcones = useConfiguracaoIcones()

  /* Rascunho dos percentuais: a pessoa digita os quatro e vê o total mudando
     ANTES de gravar. Gravar um por um faria o total passar por estados
     inválidos a cada tecla — e é o total que esta tela existe pra mostrar. */
  const [rascunho, setRascunho] = useState<Record<string, string> | null>(null)
  /* Build 104 — "Entrada" ganhou seção própria (pedido do Rafael: "os grupos
     do tipo Receita devem formar um conjunto igual os de consumo, que
     também precisa fechar 100%"). Salvar é por seção (Saída ou Entrada),
     então o feedback "Salvo" também é por tipo, não um booleano só. */
  const [salvoTipo, setSalvoTipo] = useState<TipoGrupo | null>(null)
  const [editandoGrupo, setEditandoGrupo] = useState<GrupoRegistro | null>(null)
  const [editandoCat, setEditandoCat] = useState<Categoria | null>(null)
  const [baseAberta, setBaseAberta] = useState(false)
  // Item 7 (15/09/2026): categoria cujos lançamentos do PERÍODO DE REFERÊNCIA
  // (o mesmo mês fechado ou média de 6 já escolhido acima) estão abertos.
  const [verLancamentosCat, setVerLancamentosCat] = useState<Categoria | null>(null)
  /* Uma escolha só para a tela inteira: a coluna de referência responde "quanto
     isso costuma custar", e comparar dois grupos com bases diferentes na mesma
     tela não teria sentido. O botão aparece no cabeçalho de cada card (é ali
     que a coluna vive), mas todos alternam o mesmo valor. */
  const [baseRef, setBaseRef] = useState<BaseReferencia>('ultimo')

  const gruposSaida = (grupos ?? []).filter((g) => g.tipo === 'saida' && g.ativo !== false)
  // Build 104: conjunto irmão do de Saída — mesma regra (fechar 100%), só que
  // do lado da receita. Antes do tipo de grupo existir, tudo ficava numa
  // conta só; depois do tipo, esta metade ficou sem tela nenhuma — "perdeu a
  // funcionalidade que antes tinha", no relato do Rafael.
  const gruposEntrada = (grupos ?? []).filter((g) => g.tipo === 'entrada' && g.ativo !== false)

  // Semeia o rascunho quando os dados chegam (e só então).
  useEffect(() => {
    if (rascunho || !metas || (gruposSaida.length === 0 && gruposEntrada.length === 0)) return
    const inicial: Record<string, string> = {}
    for (const g of [...gruposSaida, ...gruposEntrada]) {
      inicial[g.nome] = String(metas.find((m) => m.grupo === g.nome)?.percentual ?? 0)
    }
    setRascunho(inicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metas, gruposSaida.length, gruposEntrada.length])

  if (!categorias || !grupos || !metas || !lancamentos || !contas || !rascunho) return null

  const base = baseMetaDoMes(lancamentos, categorias, mes)
  const pctDe = (nome: string) => Number((rascunho[nome] ?? '0').replace(',', '.')) || 0

  const somaCategoriasDo = (nome: string) =>
    categorias
      .filter((c) => c.ativa !== false && c.grupo === nome && categoriaConsomeMeta(c.natureza))
      .reduce((s, c) => s + (c.aceitavelMensal || 0), 0)

  /* Todos os grupos aparecem na seção 2 (build 063). Até aqui só apareciam os
     desajustados — coerente com "silêncio quando está certo" enquanto a seção
     era só um alerta. Com a coluna de referência ela deixou de ser alerta e
     virou a bancada onde as metas são calibradas: esconder um grupo calibrado
     esconderia junto o histórico das categorias dele, que é justamente o que
     ajuda a decidir. O alerta continua silencioso — a linha da diferença só
     aparece quando há diferença. */
  const desajustado = (g: GrupoRegistro) => {
    const meta = metaEmReais(base, pctDe(g.nome))
    return meta > 0 && Math.abs(meta - somaCategoriasDo(g.nome)) >= TOLERANCIA_REAIS
  }
  const todosCalibrados = gruposSaida.every((g) => !desajustado(g))

  const referencia = referenciaPorCategoria(
    lancamentos,
    categorias,
    idsDeCofre(contas),
    mesAtualISO(),
    baseRef,
  )
  const periodoRef =
    referencia.meses.length === 1
      ? formatarMes(referencia.meses[0])
      : `${formatarMes(referencia.meses[0])} a ${formatarMes(referencia.meses[referencia.meses.length - 1])}`

  const pctIcone = tamanhoIconePx('grupo', cfgIcones.pctGrupo)
  const iconeDe = (g: GrupoRegistro) =>
    g.icone && g.icone !== 'nenhum' ? (
      <Icone id={g.icone} estilo={g.iconeEstilo} cor={g.iconeCor} tamanho={pctIcone} />
    ) : null

  async function salvarPercentuais(gruposDoTipo: GrupoRegistro[], tipo: TipoGrupo) {
    for (const g of gruposDoTipo) {
      const pct = pctDe(g.nome)
      const existente = metas!.find((m) => m.grupo === g.nome)
      if (existente) await db.metas.update(existente.id!, { percentual: pct })
      else
        await db.metas.add({
          ...marcaDoAmbiente(),
          grupo: g.nome,
          percentual: pct,
          base: 'receita_real',
          mesVigencia: mes,
        })
    }
    await marcarCategoriasEditadas()
    setSalvoTipo(tipo)
    window.setTimeout(() => setSalvoTipo(null), 2500)
  }

  const mudouTipo = (gruposDoTipo: GrupoRegistro[]) =>
    gruposDoTipo.some((g) => pctDe(g.nome) !== (metas.find((m) => m.grupo === g.nome)?.percentual ?? 0))
  const totalPctDoTipo = (gruposDoTipo: GrupoRegistro[]) => gruposDoTipo.reduce((s, g) => s + pctDe(g.nome), 0)

  return (
    <>
      <div className="cabecalho-fixo">
        <TituloTelaN1
          titulo="Calibragem"
          subtitulo="Os percentuais juntos"
          explicacao={
            <>
              <p>
                São duas contas, e elas são independentes. <strong>Entre grupos</strong>: os
                percentuais precisam somar 100% da sua receita fixa — se um sobe, outro tem que
                descer. Entrada e Saída são conjuntos separados: cada lado fecha o próprio 100%
                (normalmente Entrada é só o grupo Receita, sozinho em 100%).{' '}
                <strong>Dentro do grupo</strong>: a soma das metas das categorias dele precisa
                caber na meta do grupo.
              </p>
              <p>
                Esta tela mostra as duas ao mesmo tempo porque mexer na de cima muda a de baixo:
                trocar o percentual de um grupo muda quanto ele vale em reais e, com isso, a folga
                das categorias dentro dele.
              </p>
            </>
          }
          antes={
            <button type="button" className="botao-voltar-circular" onClick={aoVoltar} aria-label="Voltar">
              ‹
            </button>
          }
        />
      </div>

      {/* A receita fixa do mês — o 100% de tudo que vem abaixo. Estava órfã: o
          app inteiro se apoia nela e ela não aparecia em tela nenhuma. */}
      <div className="cartao" data-testid="base-calibragem">
        <div className="linha-detalhe-cat">
          <span className="ideal-t4">Receita fixa deste mês (o 100%)</span>
          <span className="ideal-t2" data-testid="valor-base-meta">{fmtBRL(base)}</span>
        </div>
        {/* Quem forma essa base é a pergunta seguinte, e ela não tinha resposta
            em tela nenhuma — a flag vivia dentro do cadastro de cada categoria. */}
        <button
          type="button"
          onClick={() => setBaseAberta(true)}
          data-testid="editar-base-receita"
          style={{ width: '100%', marginTop: 8 }}
        >
          ✎ Quem forma essa base
        </button>
        {base <= 0 && (
          <p className="ideal-t4 texto-quebra" style={{ margin: '6px 0 0' }}>
            Nenhuma receita marcada como fixa foi lançada neste mês — sem ela, nenhum percentual
            vira reais. Marque a categoria de renda em Configuração → Categorias e Metas.
          </p>
        )}
      </div>

      {[
        { tipo: 'saida' as TipoGrupo, gruposDoTipo: gruposSaida, sufixo: '' },
        { tipo: 'entrada' as TipoGrupo, gruposDoTipo: gruposEntrada, sufixo: '-entrada' },
      ]
        .filter(({ gruposDoTipo }) => gruposDoTipo.length > 0)
        .map(({ tipo, gruposDoTipo, sufixo }) => {
          const totalDoTipo = totalPctDoTipo(gruposDoTipo)
          const difDoTipo = totalDoTipo - 100
          const fechouTipo = Math.abs(difDoTipo) < TOLERANCIA_PCT
          const mudouEsteTipo = mudouTipo(gruposDoTipo)
          return (
            <div key={tipo}>
              <div className="titulo-bloco-ideal">
                1{sufixo ? 'b' : ''} · Entre grupos de {ROTULO_TIPO_GRUPO[tipo]} — precisa somar 100%
              </div>
              <div className="cartao" data-testid={`calibragem-grupos${sufixo}`}>
                {gruposDoTipo.map((g) => (
                  <div className="campo-pct-calibragem" key={g.id}>
                    <button
                      type="button"
                      className="nome-grupo-calibragem"
                      onClick={() => setEditandoGrupo(g)}
                      data-testid={`editar-grupo-calibragem-${g.nome}`}
                    >
                      {iconeDe(g)}
                      <span>{g.nome}</span>
                      {/* O lápis aparece porque "nome sublinhado" não lia como algo
                          clicável — mesma reclamação do link azul do cofrinho. */}
                      <PencilSquareIcon width={14} height={14} className="icone-editar-inline" />
                    </button>
                    <span className="valor-pct-calibragem">{fmtNum(metaEmReais(base, pctDe(g.nome)))}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      inputMode="decimal"
                      value={rascunho[g.nome] ?? '0'}
                      onChange={(e) => setRascunho((r) => ({ ...(r ?? {}), [g.nome]: e.target.value }))}
                      aria-label={`Percentual do grupo ${g.nome}`}
                      data-testid={`pct-${g.nome}`}
                    />
                  </div>
                ))}

                <div
                  className={`total-calibragem ${fechouTipo ? 'ok' : 'erro'}`}
                  data-testid={`total-percentuais${sufixo}`}
                >
                  <span style={{ flex: 1 }}>Total</span>
                  <span className="valor-pct-calibragem">{fmtBRL(metaEmReais(base, totalDoTipo))}</span>
                  <strong data-testid={`total-pct-numero${sufixo}`}>{Number(totalDoTipo.toFixed(2))}%</strong>
                </div>
                <p
                  className={`ideal-t4 texto-quebra ${fechouTipo ? 'valor-pos' : 'valor-neg'}`}
                  style={{ margin: '6px 0 0' }}
                >
                  {fechouTipo
                    ? 'Fecha em 100%. Está calibrado.'
                    : difDoTipo > 0
                      ? `Excede ${Number(difDoTipo.toFixed(2))}%. Tire esse tanto de um ou mais grupos.`
                      : `Faltam ${Number((-difDoTipo).toFixed(2))}% para fechar 100%.`}
                </p>

                <button
                  type="button"
                  className="primario"
                  disabled={!mudouEsteTipo}
                  onClick={() => salvarPercentuais(gruposDoTipo, tipo)}
                  data-testid={`salvar-percentuais${sufixo}`}
                  style={{ width: '100%' }}
                >
                  {salvoTipo === tipo ? 'Salvo' : mudouEsteTipo ? 'Salvar percentuais' : 'Nada alterado'}
                </button>
              </div>
            </div>
          )
        })}

      <div className="titulo-bloco-ideal">2 · Dentro de cada grupo</div>
      {todosCalibrados && (
        <p className="ideal-t4 texto-quebra valor-pos" style={{ margin: '-4px 0 8px' }} data-testid="grupos-calibrados">
          As metas das categorias fecham com a meta de cada grupo.
        </p>
      )}
      {gruposSaida.map((g) => {
        const meta = metaEmReais(base, pctDe(g.nome))
        const soma = somaCategoriasDo(g.nome)
        const dif = meta - soma
        const foraDoLugar = desajustado(g)
        const doGrupo = categorias
          .filter((c) => c.ativa !== false && c.grupo === g.nome && categoriaConsomeMeta(c.natureza))
          .sort((a, b) => (b.aceitavelMensal || 0) - (a.aceitavelMensal || 0))
        return (
          <div className="cartao" key={g.id} data-testid={`calibragem-grupo-${g.nome}`}>
            {/* CABEÇALHO do card — o grupo. Daqui pra baixo são as categorias
                dele, e elas ficam indentadas (pedido do Rafael: sem o recuo
                "visualmente está uma coisa só, uma listona"). */}
            <div className="cabecalho-card-calibragem" data-testid={`cabecalho-calibragem-${g.nome}`}>
              <div className="linha-detalhe-cat">
                <span className="ideal-t3">{g.nome}</span>
                <span className="ideal-t4">
                  meta {fmtNum(meta)} ({Number(pctDe(g.nome).toFixed(2))}%)
                </span>
              </div>
              <div className="linha-detalhe-cat">
                <span className="ideal-t4">Soma das metas das categorias</span>
                <span className="ideal-t3">{fmtNum(soma)}</span>
              </div>
              {foraDoLugar && (
                <div className="linha-detalhe-cat total">
                  <span className="ideal-t3">{dif < 0 ? 'Excede a meta do grupo' : 'Ainda não distribuído'}</span>
                  <span className={`ideal-t3 ${dif < 0 ? 'valor-neg' : 'valor-pos'}`}>
                    {fmtNum(Math.abs(dif))}
                  </span>
                </div>
              )}
            </div>

            <div className="bloco-cats-calibragem">
              <div className="cab-col-calibragem">
                <span style={{ flex: 1, minWidth: 0 }}>Categoria</span>
                {/* O botão É o cabeçalho da coluna: toca e a coluna inteira
                    troca de base. Com contorno e cor de ação, porque o pedido
                    foi "o usuário tem que saber claramente que aquele botão é
                    clicável". */}
                <button
                  type="button"
                  className="botao-base-referencia"
                  onClick={() => setBaseRef(outraReferencia(baseRef))}
                  data-testid="alternar-base-referencia"
                  aria-label={`Referência: ${ROTULO_REFERENCIA[baseRef]}. Tocar para ver ${ROTULO_REFERENCIA[outraReferencia(baseRef)]}`}
                  title={periodoRef}
                >
                  <ArrowsRightLeftIcon width={12} height={12} />
                  <span>{ROTULO_REFERENCIA_CURTO[baseRef]}</span>
                </button>
                <span className="col-meta-calibragem">Meta</span>
                <span className="col-lapis-calibragem" aria-hidden />
              </div>

              {doGrupo.map((c) => {
                const ref = c.id == null ? undefined : referencia.valores.get(c.id)
                return (
                  <div className="linha-cat-calibragem" key={c.id} data-testid={`linha-cat-calibragem-${c.id}`}>
                    <button
                      type="button"
                      className="botao-linha-cat-calibragem"
                      onClick={() => setEditandoCat(c)}
                      data-testid={`editar-cat-calibragem-${c.id}`}
                    >
                      <span className="ideal-t3" style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                        {c.nome}
                      </span>
                      <span
                        /* A referência ganha COR comparada à meta ao lado (build
                           067): vermelha quando o histórico é MAIOR que a meta
                           (a meta não cabe no que você costuma gastar) e verde
                           quando é menor. Sem meta cadastrada não há comparação,
                           então fica neutra — colorir contra zero acusaria toda
                           categoria ainda não calibrada.
                           Sem movimento no período é "—", nunca R$ 0,00: zero
                           afirma que não gastou; o traço diz que não há de onde
                           tirar referência. */
                        className={`col-ref-calibragem ${
                          ref == null || !(c.aceitavelMensal > 0)
                            ? ''
                            : ref > c.aceitavelMensal + 0.005
                              ? 'valor-neg'
                              : ref < c.aceitavelMensal - 0.005
                                ? 'valor-pos'
                                : ''
                        }`}
                        data-testid={`ref-cat-${c.id}`}
                      >
                        {ref ? fmtNum(ref) : '—'}
                      </span>
                      <span className="ideal-t3 col-meta-calibragem">{fmtNum(c.aceitavelMensal || 0)}</span>
                      <PencilSquareIcon width={14} height={14} className="icone-editar-inline col-lapis-calibragem" />
                    </button>
                    {/* Item 7 (15/09/2026): abre os lançamentos desta categoria
                        no MESMO período de referência escolhido acima (último
                        mês fechado, ou a média de 6) — não o mês da tela. */}
                    <button
                      type="button"
                      className="botao-ver-lancamentos-calibragem"
                      onClick={() => setVerLancamentosCat(c)}
                      data-testid={`ver-lancamentos-cat-${c.id}`}
                      aria-label={`Ver lançamentos de ${c.nome} no período de referência`}
                      title="Ver lançamentos no período de referência"
                    >
                      <ListBulletIcon width={16} height={16} />
                    </button>
                  </div>
                )
              })}
              {doGrupo.length === 0 && (
                <p className="ideal-t4 texto-quebra" style={{ margin: '4px 0 0' }}>
                  Nenhuma categoria neste grupo ainda.
                </p>
              )}
            </div>
          </div>
        )
      })}
      <p className="ideal-t4 texto-quebra" style={{ margin: '0 0 4px' }} data-testid="periodo-referencia">
        {referencia.temHistorico
          ? `Referência: ${ROTULO_REFERENCIA[baseRef].toLowerCase()} (${periodoRef}).`
          : 'Ainda não há meses fechados com movimento para servir de referência.'}
      </p>

      {editandoGrupo && (
        <PopupMetaGrupo
          grupo={editandoGrupo}
          percentualAtual={metas.find((m) => m.grupo === editandoGrupo.nome)?.percentual ?? 0}
          baseEmReais={base}
          mesVigencia={mes}
          onFechar={() => {
            setEditandoGrupo(null)
            setRascunho(null) // reSemeia com o que acabou de ser gravado
          }}
        />
      )}
      {baseAberta && <BaseDaReceita mes={mes} onFechar={() => setBaseAberta(false)} />}
      {editandoCat && (
        <PopupAceitavelCategoria
          categoria={editandoCat}
          baseEmReais={base}
          onFechar={() => setEditandoCat(null)}
        />
      )}
      {verLancamentosCat && (
        <div className="modal-fundo" onClick={() => setVerLancamentosCat(null)}>
          <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 4px' }}>{verLancamentosCat.nome}</h2>
            <p className="texto-fraco" style={{ margin: '0 0 12px', fontSize: 12.5 }} data-testid="periodo-ver-lancamentos">
              {referencia.temHistorico
                ? `${ROTULO_REFERENCIA[baseRef]} (${periodoRef})`
                : 'Sem histórico neste período.'}
            </p>
            <ListaLancamentosCategoria
              lancamentos={lancamentos.filter(
                (l) =>
                  l.categoriaId === verLancamentosCat.id &&
                  referencia.meses.includes(l.dataCompetencia.slice(0, 7)),
              )}
              aoAbrirLancamento={(opcoes) => {
                if (aoAbrirLancamento) {
                  setVerLancamentosCat(null)
                  aoAbrirLancamento(opcoes)
                }
              }}
            />
            <div className="acoes-modal" style={{ marginTop: 12 }}>
              <button type="button" className="secundario" onClick={() => setVerLancamentosCat(null)} data-testid="fechar-ver-lancamentos">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
