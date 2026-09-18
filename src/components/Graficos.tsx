/* Os 3 gráficos do topo das telas (11/09/2026, pedido do Rafael):

     "incluir gráficos no topo das telas: Resumo (gráfico de barra vertical de
      Entrada(azul) vs Saída(vermelho), Situação um gráfico que mostre o
      objetivo dessa tela, Planejamento um gráfico de pizza distribuindo os
      percentuais de meta dos grupos e de alguma forma mostrar no gráfico o
      previsto vs o real"

   Tudo é SVG escrito à mão, sem biblioteca: o app é entregue como um HTML de
   arquivo único aberto por `file://`, onde não dá pra buscar nada de fora, e
   uma lib de gráfico custaria mais que estes três desenhos.

   COR — o app já tem paleta própria (`--azul`, `--vermelho`, `--verde`,
   `--amarelo` no `index.css`), e é ela que manda aqui: o Rafael pediu
   "Entrada (azul) vs Saída (vermelho)" nesses termos. Os dois pares (claro e
   escuro) foram conferidos no validador de paleta: passam banda de
   luminosidade, piso de croma, separação para daltonismo (ΔE 26,7 escuro /
   31,3 claro, alvo ≥ 8) e contraste ≥ 3:1 contra o fundo de cada tema.

   O donut precisa de uma cor POR GRUPO, e aí a paleta do app não serve: todo
   grupo nasce com o mesmo azul de ícone, então usá-la deixaria as fatias
   indistinguíveis. Para esse caso existe `CORES_SERIE`, a ordem categórica de
   referência, também validada nos dois temas (pior par adjacente ΔE 8,4
   escuro / 9,1 claro). No tema claro três dessas cores ficam abaixo de 3:1
   contra o fundo — por isso o donut SEMPRE traz a legenda com nome e valor ao
   lado (a "relief rule": cor nunca carrega sozinha a identidade).

   Regras de desenho seguidas: marca fina, ponta arredondada de 4px ancorada na
   linha de base, 2px de respiro entre fatias vizinhas, rótulo direto no que
   importa (nunca um número em cada ponto), eixo/grade discretos. */
import type { ReactNode } from 'react'
import { fmtNum } from '../formatoMoeda'
import { useTemaEfetivo } from '../configuracaoIcones'

/* Ordem categórica fixa — nunca ciclada. Do 7º grupo em diante a cor se
   repete, e é a legenda (sempre presente) que desfaz o empate; na prática
   este app tem 5 grupos. */
const CORES_SERIE = {
  escuro: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'],
  claro: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
}

function Moldura({ titulo, children, acao }: { titulo: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <div className="cartao" style={{ marginBottom: 10 }}>
      <div className="linha" style={{ border: 'none', padding: 0, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--texto-fraco)', letterSpacing: 0.3 }}>{titulo}</span>
        {acao}
      </div>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ Resumo */

/* Duas barras verticais, uma ao lado da outra: é a comparação mais direta de
   duas magnitudes do mesmo mês. Sem legenda (cada barra tem o próprio rótulo
   embaixo e o valor em cima — identidade nunca depende só da cor) e sem eixo
   numérico: a altura é relativa ao maior dos dois, e o número exato está

/* Build 086 — a versão Premium foi eliminada e com ela as duas telas que este
   arquivo servia além do Planejamento. Saíram daqui:

     • `GraficoEntradaSaida` — as duas barras verticais do Resumo do Mês;
     • `GraficoMargem` + o helper `Fragmento` — o medidor de arco da Situação,
       e com ele a família `medidorTeto` de `src/legendaBarras.ts`.

   Ficou o donut (`GraficoMetasGrupos`), que o Planejamento desenha, com o
   helper `arco()` que ele também usa. */

function arco(cx: number, cy: number, raio: number, de: number, ate: number) {
  const p = (a: number) => [cx + raio * Math.cos(a - Math.PI / 2), cy + raio * Math.sin(a - Math.PI / 2)]
  const [x1, y1] = p(de)
  const [x2, y2] = p(ate)
  return `M ${x1} ${y1} A ${raio} ${raio} 0 ${ate - de > Math.PI ? 1 : 0} 1 ${x2} ${y2}`
}

export interface FatiaGrupo {
  grupo: string
  percentualMeta: number
  meta: number
  realizado: number
  previsto: number
}

/* Pizza (donut) com os percentuais de meta de cada grupo — a fatia é a fatia
   do bolo que aquele grupo pode usar. O "previsto vs real" pedido entra como
   um segundo anel POR DENTRO, no mesmo ângulo de cada fatia: ele preenche só
   a parte da fatia que já foi realizada, e uma marca fina mostra até onde vai
   com o previsto somado. Dá pra ler as duas coisas de uma vez — o tamanho da
   fatia é o planejado, o quanto dela está pintado é o andamento.
   O buraco do meio carrega o número-manchete (realizado do mês sobre a meta
   total), que é a leitura que interessa antes de qualquer detalhe. */
export function GraficoMetasGrupos({ fatias }: { fatias: FatiaGrupo[] }) {
  const tema = useTemaEfetivo()
  const cores = CORES_SERIE[tema === 'claro' ? 'claro' : 'escuro']
  const somaPct = fatias.reduce((s, f) => s + f.percentualMeta, 0)
  const metaTotal = fatias.reduce((s, f) => s + f.meta, 0)
  const realizadoTotal = fatias.reduce((s, f) => s + f.realizado, 0)

  if (fatias.length === 0 || somaPct <= 0) {
    return (
      <Moldura titulo="META POR GRUPO">
        <p className="texto-fraco" style={{ margin: 0, fontSize: 12.5 }}>
          Nenhum grupo com meta cadastrada ainda — defina os percentuais em Configurações → Grupos, Categorias e Metas →
          Metas, ou pelo lápis ao lado de cada grupo aqui embaixo.
        </p>
      </Moldura>
    )
  }

  const TAM = 168
  const c = TAM / 2
  const R_EXT = 74
  const R_INT = 52
  const GAP = 0.03 // ~2px de respiro entre fatias vizinhas, em radianos

  /* Início de cada fatia = soma das anteriores. Calculado antes do `map` pra
     não depender de um acumulador reatribuído durante o render. */
  const inicios = fatias.map((_, i) =>
    fatias.slice(0, i).reduce((soma, anterior) => soma + (anterior.percentualMeta / somaPct) * Math.PI * 2, 0),
  )
  const desenho = fatias.map((f, i) => {
    const fatia = (f.percentualMeta / somaPct) * Math.PI * 2
    const de = inicios[i] + GAP / 2
    const ate = inicios[i] + fatia - GAP / 2
    const andamento = f.meta > 0 ? Math.min(1, f.realizado / f.meta) : 0
    const comPrevisto = f.meta > 0 ? Math.min(1, (f.realizado + f.previsto) / f.meta) : 0
    return {
      ...f,
      cor: cores[i % cores.length],
      de,
      ate,
      ateRealizado: de + (ate - de) * andamento,
      atePrevisto: de + (ate - de) * comPrevisto,
      temAndamento: andamento > 0.001,
    }
  })

  return (
    <Moldura titulo="META POR GRUPO · QUANTO JÁ FOI">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={TAM} height={TAM} viewBox={`0 0 ${TAM} ${TAM}`} role="img" aria-label="Meta por grupo e quanto já foi realizado">
          {desenho.map((d) => (
            <path
              key={`meta-${d.grupo}`}
              d={arco(c, c, R_EXT, d.de, d.ate)}
              fill="none"
              stroke={d.cor}
              strokeWidth={14}
              strokeLinecap="round"
              opacity={0.32}
            />
          ))}
          {desenho.map((d) =>
            d.temAndamento ? (
              <path
                key={`real-${d.grupo}`}
                d={arco(c, c, R_INT, d.de, d.ateRealizado)}
                fill="none"
                stroke={d.cor}
                strokeWidth={10}
                strokeLinecap="round"
              />
            ) : null,
          )}
          {desenho.map((d) =>
            d.atePrevisto > d.ateRealizado + 0.001 ? (
              <path
                key={`prev-${d.grupo}`}
                d={arco(c, c, R_INT, d.ateRealizado, d.atePrevisto)}
                fill="none"
                stroke={d.cor}
                strokeWidth={10}
                strokeLinecap="butt"
                opacity={0.45}
                strokeDasharray="3 3"
              />
            ) : null,
          )}
          <text x={c} y={c - 4} textAnchor="middle" style={{ fill: 'var(--texto)', fontSize: 15, fontWeight: 700 }}>
            {fmtNum(realizadoTotal)}
          </text>
          <text x={c} y={c + 13} textAnchor="middle" style={{ fill: 'var(--texto-fraco)', fontSize: 11 }}>
            de {fmtNum(metaTotal)}
          </text>
        </svg>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', rowGap: 4, columnGap: 8, fontSize: 12.5, marginTop: 8 }}>
        {desenho.map((d) => (
          <div key={d.grupo} style={{ display: 'contents' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.cor, alignSelf: 'center' }} />
            <span style={{ color: 'var(--texto-fraco)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.grupo} · {d.percentualMeta}%
            </span>
            <span style={{ whiteSpace: 'nowrap' }}>
              {fmtNum(d.realizado)}
              <span className="texto-fraco"> / {fmtNum(d.meta)}</span>
            </span>
          </div>
        ))}
      </div>
      <p className="texto-fraco" style={{ margin: '8px 0 0', fontSize: 11.5 }}>
        Anel de fora: a fatia da meta de cada grupo. Anel de dentro: quanto dela já foi realizado — o tracejado é o
        previsto que ainda não aconteceu.
      </p>
    </Moldura>
  )
}
