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
import { fmtBRL } from '../formatoMoeda'
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
   escrito na ponta. */
export function GraficoEntradaSaida({ entrada, saida }: { entrada: number; saida: number }) {
  const maior = Math.max(entrada, saida, 1)
  const ALTURA = 104
  const alturaDe = (v: number) => Math.max(2, (v / maior) * ALTURA)
  const barras = [
    { rotulo: 'Entrada', valor: entrada, cor: 'var(--azul)' },
    { rotulo: 'Saída', valor: saida, cor: 'var(--vermelho)' },
  ]
  return (
    <Moldura titulo="ENTRADA × SAÍDA DO MÊS">
      {/* 12/09/2026 (Rafael: "a legenda tem que estar centralizada em relação
          a cada barra"): a versão anterior desenhava DUAS faixas irmãs — uma
          com valor+barra, outra com os rótulos. O rótulo tinha largura fixa
          de 54px (a da barra), mas a coluna de cima ficava com a largura do
          VALOR, que é maior que 54px sempre que o número é longo. Com gaps
          iguais e larguras diferentes, os centros das duas faixas não
          coincidiam e o nome saía deslocado em relação à sua barra.
          Agora é UMA coluna por barra, contendo valor + barra + rótulo: o
          centro é o mesmo por construção, independente do tamanho do número.
          A linha de base é a borda inferior do bloco valor+barra, não um
          elemento à parte desenhado por cima. */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 28 }}>
        {barras.map((b) => (
          <div key={b.rotulo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                borderBottom: '1px solid var(--borda)',
                paddingBottom: 0,
                width: '100%',
              }}
            >
              <strong style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{fmtBRL(b.valor)}</strong>
              <div
                style={{
                  width: 54,
                  height: alturaDe(b.valor),
                  background: b.cor,
                  borderRadius: '4px 4px 0 0',
                }}
              />
            </div>
            <span style={{ textAlign: 'center', fontSize: 12, color: 'var(--texto-fraco)', marginTop: 6 }}>
              {b.rotulo}
            </span>
          </div>
        ))}
      </div>
    </Moldura>
  )
}

/* ---------------------------------------------------------------- Situação */

/* MEDIDOR (arco), não mais uma barra (11/09/2026, correção do Rafael: "temos
   muitos gráficos de barra já, troque o da Situação [...] e ele tem que
   mostrar o comprometido").

   O medidor é a forma certa pra UM valor contra um teto — que é exatamente a
   pergunta da tela Situação. O arco inteiro é o teto do mês; ele é percorrido
   na ordem em que o dinheiro sai: primeiro o que JÁ saiu, depois o que ainda
   vai sair (o COMPROMETIDO), e o resto é a sobra real. A agulha marca onde o
   mês vai terminar se nada mudar — o ponteiro parado no fim do comprometido.

   O comprometido ganhou o número-manchete no meio do arco, porque é o número
   que o Rafael pediu para ver e é o que distingue esta tela do Resumo: lá o
   que importa é o que aconteceu; aqui, o que ainda vai acontecer.

   Cores do próprio app: vermelho o que saiu, âmbar o que ainda vai sair,
   verde o que sobra — as mesmas três que o resto das telas usa pros mesmos
   papéis, nunca inventadas aqui. */
export function GraficoMargem({
  teto,
  jaPago,
  aPagar,
  comprometido,
  sobra,
}: {
  teto: number
  jaPago: number
  aPagar: number
  comprometido: number
  sobra: number
}) {
  /* "Comprometido" na tela Situação = tudo que ainda vai sair da carteira e
     ainda não saiu: o que já está lançado mas não pago somado ao que nem
     lançamento tem (série fixa que ainda vai gerar a ocorrência do mês). São
     os dois números que a própria tela já mostra separados logo abaixo. */
  const totalComprometido = aPagar + comprometido
  const sobraPositiva = Math.max(0, sobra)
  const base = jaPago + totalComprometido + sobraPositiva || 1
  const estourou = sobra < -0.005

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

  const segmentos = estourou
    ? [{ rotulo: 'Estourou o teto', valor: teto, cor: 'var(--vermelho)', de: 0, ate: 1 }]
    : [
        { rotulo: 'Já pago', valor: jaPago, cor: 'var(--vermelho)', de: 0, ate: jaPago / base },
        { rotulo: 'Comprometido', valor: totalComprometido, cor: 'var(--amarelo)', de: jaPago / base, ate: (jaPago + totalComprometido) / base },
        { rotulo: 'Sobra real', valor: sobraPositiva, cor: 'var(--verde)', de: (jaPago + totalComprometido) / base, ate: 1 },
      ].filter((seg) => seg.valor > 0.005)

  const fimDoComprometido = Math.min(1, (jaPago + totalComprometido) / base)
  const [ax, ay] = ponto(ang(fimDoComprometido), R - ESP / 2 - 9)
  const [bx, by] = ponto(ang(fimDoComprometido), R + ESP / 2 + 3)

  return (
    <Moldura titulo="QUANTO DO TETO JÁ TEM DESTINO">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg width={L} height={A} viewBox={`0 0 ${L} ${A}`} role="img" aria-label="Medidor do teto do mês: já pago, comprometido e sobra real">
          <path d={arcoDe(0, 1)} fill="none" stroke="var(--borda)" strokeWidth={ESP} strokeLinecap="round" />
          {segmentos.map((seg, i) => (
            <path
              key={seg.rotulo}
              d={arcoDe(i === 0 ? seg.de : seg.de + GAP / 2, seg.ate)}
              fill="none"
              stroke={seg.cor}
              strokeWidth={ESP}
              strokeLinecap={i === 0 || i === segmentos.length - 1 ? 'round' : 'butt'}
            />
          ))}
          {!estourou && fimDoComprometido > 0.001 && fimDoComprometido < 0.999 && (
            <line x1={ax} y1={ay} x2={bx} y2={by} stroke="var(--texto)" strokeWidth={2.5} strokeLinecap="round" />
          )}
          <text x={cx} y={cy - 30} textAnchor="middle" style={{ fill: 'var(--texto-fraco)', fontSize: 11 }}>
            comprometido
          </text>
          <text x={cx} y={cy - 10} textAnchor="middle" style={{ fill: 'var(--texto)', fontSize: 18, fontWeight: 700 }}>
            {fmtBRL(totalComprometido)}
          </text>
        </svg>
      </div>
      {/* Item 16 da lista de 12/09/2026: esta legenda estourava a tela porque
          `.valor-pos`/`.valor-neg` têm `white-space: nowrap` global (regra
          criada pra valor monetário nunca quebrar no meio). Num parágrafo de
          texto isso vira uma linha única mais larga que a coluna. Corrigido
          na raiz, no `index.css`: parágrafo com essas classes volta a quebrar
          linha; valor solto (span/strong) segue sem quebrar. */}
      {estourou && (
        <p className="valor-neg" style={{ margin: '0 0 8px', fontSize: 12.5, fontWeight: 700 }}>
          Estourou o teto em {fmtBRL(Math.abs(sobra))} — o mês inteiro já está comprometido.
        </p>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, columnGap: 10, fontSize: 12.5, marginTop: 4 }}>
        <Fragmento cor="var(--vermelho)" rotulo="Já saiu do teto (pago)" valor={jaPago} />
        <Fragmento cor="var(--amarelo)" rotulo="Ainda vai sair do teto (comprometido)" valor={totalComprometido} />
        <Fragmento cor="var(--verde)" rotulo="Sobra real do teto" valor={sobra} />
        <span style={{ color: 'var(--texto-fraco)', paddingTop: 4, borderTop: '1px solid var(--borda)' }}>Teto do mês</span>
        <strong style={{ paddingTop: 4, borderTop: '1px solid var(--borda)', whiteSpace: 'nowrap' }}>{fmtBRL(teto)}</strong>
      </div>
      <p className="texto-fraco" style={{ margin: '8px 0 0', fontSize: 11.5 }}>
        O comprometido soma o que já está lançado e ainda não foi pago com a conta fixa que ainda nem virou
        lançamento neste mês. O traço no arco marca onde o mês termina se nada mudar.
        {/* Item 3 da lista de 12/09/2026: os números daqui não batem com o
            "Saiu"/"A pagar" do Resumo do mês, e isso é de propósito — aqui é
            teto de consumo, lá é caixa. Sem dizer isso na tela, a diferença
            parece erro de cálculo. */}
        <br />
        Aqui entra só gasto de <strong>consumo</strong>, que é o que ocupa o teto. Aporte para cofrinho,
        transferência e pagamento de fatura ficam de fora — por isso estes valores são menores que o
        &ldquo;Saiu&rdquo; e o &ldquo;A pagar&rdquo; do Resumo do mês, que são visão de caixa e somam tudo.
      </p>
    </Moldura>
  )
}

/* Linha da legenda: quadradinho de cor + rótulo + valor. É ela que faz a cor
   nunca carregar sozinha a identidade de um segmento. */
function Fragmento({ cor, rotulo, valor }: { cor: string; rotulo: string; valor: number }) {
  return (
    <>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--texto-fraco)' }}>
        <span style={{ width: 10, height: 10, borderRadius: 3, background: cor, flexShrink: 0 }} />
        {rotulo}
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>{fmtBRL(valor)}</span>
    </>
  )
}

/* ------------------------------------------------------------ Planejamento */

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
          Nenhum grupo com meta cadastrada ainda — defina os percentuais em Configurações → Categorias, Grupos e Metas →
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
            {fmtBRL(realizadoTotal)}
          </text>
          <text x={c} y={c + 13} textAnchor="middle" style={{ fill: 'var(--texto-fraco)', fontSize: 11 }}>
            de {fmtBRL(metaTotal)}
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
              {fmtBRL(d.realizado)}
              <span className="texto-fraco"> / {fmtBRL(d.meta)}</span>
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
