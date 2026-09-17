/* A barra da versão Ideal — modelo ÚNICO (13/09/2026).
 *
 * Uma barra só, segmentada, usada na tela Hoje, no card de grupo, no card de
 * categoria e nos gráficos. Muda só a escala.
 *
 *     azul (já gastei) · âmbar (já comprometido) · verde (posso economizar)
 *
 * A BARRA INTEIRA É A META. O trecho que passa da meta fica vermelho.
 *
 * Dois elementos da barra antiga somem por consequência disso, não por
 * enxugamento arbitrário:
 *
 *   1. o risquinho de limite sai — o limite passa a ser a borda da barra;
 *   2. a legenda sai — a cor conta a história: muito azul = já gastei, muito
 *      âmbar = tudo comprometido, muito verde = tenho folga.
 *
 * O VALOR FICA NA FRENTE DA BARRA, na mesma linha (pedido do Rafael, e ele
 * pediu para valer em TODA barra do app). Um número por linha: o título do
 * bloco já dá o significado, então o número não precisa se explicar — sem
 * "de/para", sem texto de delta, sem legenda.
 *
 * O SALDO LIVRE está FORA da meta, e a barra mostra isso: positivo, um bloco
 * extra depois de um vão; negativo, um bloco vermelho ANTES da barra — o mês
 * já começa no buraco.
 *
 *     ████████████▓▓▓▓▓▓░░░░░░░░░░░   ▐▐▐▐
 *     └─────── a meta do mês ──────┘   └livre┘
 *
 *     ▐▐▐▐ ████████████▓▓▓▓▓▓░░░░░░░░
 *     └déficit┘ └──── a meta do mês ──┘
 *
 * LARGURA MÍNIMA do bloco do Saldo Livre é obrigatória: R$ 50 contra R$ 16 mil
 * renderizaria menos de 1px e sumiria da tela.
 */
import type { ReactNode } from 'react'
import { fmtNum, fmtNumComSinal } from '../formatoMoeda'

/** Menor largura visível de um segmento, em % da barra. */
const MIN_PCT = 2.5

export interface BarraIdealProps {
  /** Já saiu de verdade (pago). Pinta de azul. */
  realizado: number
  /** Já lançado ou com destino certo, mas ainda não pago. Pinta de âmbar. */
  comprometido?: number
  /** O tamanho da barra: a meta do grupo/categoria/mês. */
  meta: number
  /** Dinheiro fora da meta. Positivo = bloco depois do vão; negativo = antes, vermelho. */
  saldoLivre?: number
  rotulo?: ReactNode
  icone?: ReactNode
  /** O número que vai na frente da barra. Sem ele, mostra a sobra da meta. */
  valor?: number
  /** Sobrescreve a cor do número da frente. Por padrão: verde se sobra, vermelho se estoura. */
  valorNeutro?: boolean
  /* Sem número na frente da barra (13/09/2026). Na barra do topo da tela Hoje
     esse número era a Economia Possível, mas aparecia colado no bloco separado
     — que é o Saldo Livre —, e os dois viraram um só na leitura. Os valores já
     estão escritos abaixo, com nome; aqui o número só criava dúvida. */
  semValor?: boolean
  /** Barra fina, para linha de lista. */
  compacta?: boolean
  /** Barra grossa — o gráfico PRINCIPAL de uma tela, não uma linha de lista. */
  destaque?: boolean
  /** Escreve o valor da meta em cima da linha branca. Só onde ela é o assunto. */
  mostrarValorDaMeta?: boolean
  /* Legenda escrita para o bloco do Saldo Livre (13/09/2026). O bloco existia
     só com `title`, que é tooltip de mouse — no celular ninguém vê. Um bloco
     vermelho sem nada escrito ao lado da barra principal não tem como ser
     lido ("como é que o usuário vai saber o que significa isso?" — Rafael).
     Só na barra de DESTAQUE: numa linha de lista a legenda viraria ruído. */
  legendaLivre?: boolean
  'data-testid'?: string
}

export default function BarraIdeal({
  realizado,
  comprometido = 0,
  meta,
  saldoLivre = 0,
  rotulo,
  icone,
  valor,
  valorNeutro = false,
  semValor = false,
  compacta = false,
  destaque = false,
  mostrarValorDaMeta = false,
  legendaLivre = false,
  'data-testid': testid,
}: BarraIdealProps) {
  const usado = realizado + comprometido
  const sobra = meta - usado
  const estouro = Math.max(0, usado - meta)

  // A escala é a meta; quando estourou, a barra cresce para caber o excedente.
  const escala = Math.max(meta, usado, 0.01)
  const pct = (v: number) => (v <= 0 ? 0 : Math.max(MIN_PCT, (v / escala) * 100))

  // Dentro da meta, os segmentos não podem somar mais que 100%.
  const azul = Math.min(realizado, meta)
  const ambar = Math.max(0, Math.min(comprometido, meta - azul))

  const temLivre = Math.abs(saldoLivre) > 0.005
  const livrePct = temLivre ? Math.max(MIN_PCT, Math.min(28, (Math.abs(saldoLivre) / escala) * 100)) : 0
  const livrePositivo = saldoLivre > 0

  const valorMostrado = valor ?? sobra
  const classeValor = valorNeutro
    ? 'barra-ideal-valor'
    : `barra-ideal-valor ${valorMostrado < 0 ? 'negativo' : 'positivo'}`

  return (
    <div
      className={`barra-ideal ${compacta ? 'compacta' : ''} ${destaque ? 'destaque' : ''}`}
      data-testid={testid}
    >
      {(rotulo != null || icone != null) && (
        <div className="barra-ideal-topo">
          {icone}
          <span className="barra-ideal-rotulo">{rotulo}</span>
        </div>
      )}
      <div className="barra-ideal-linha">
        {/* déficit: bloco vermelho ANTES da barra — o mês começa no buraco */}
        {temLivre && !livrePositivo && (
          <div
            className="barra-ideal-livre negativo"
            style={{ width: `${livrePct}%` }}
            title={`Déficit que veio do mês anterior: ${fmtNum(saldoLivre)}`}
            data-testid="barra-ideal-deficit"
          />
        )}
        <div className="barra-ideal-trilho">
          {azul > 0 && <div className="barra-ideal-seg realizado" style={{ width: `${pct(azul)}%` }} />}
          {ambar > 0 && <div className="barra-ideal-seg comprometido" style={{ width: `${pct(ambar)}%` }} />}
          {sobra > 0 && <div className="barra-ideal-seg economia" style={{ width: `${pct(sobra)}%` }} />}
          {estouro > 0 && <div className="barra-ideal-seg estouro" style={{ width: `${pct(estouro)}%` }} />}
          {/* A LINHA DA META. Existia na barra antiga (`.barra-meta > .marcador`)
              e não foi portada para a Ideal na build 057 — sem ela, quando a
              barra estoura não há nenhuma referência visual de ONDE era o teto.
              Só aparece quando a meta não é o fim da barra (senão marcaria a
              própria borda direita, sem informar nada). */}
          {meta > 0 && (estouro > 0 || mostrarValorDaMeta) && (() => {
            /* Na barra do topo (`mostrarValorDaMeta`) a linha aparece SEMPRE,
               mesmo sem estouro — é ela que diz quanto é a meta, que era o
               pedido. Quando a meta é o fim da barra, o rótulo encosta na
               borda, então ele ancora pela direita em vez de centralizar. */
            const esq = Math.min(100, (meta / escala) * 100)
            const naBorda = esq > 88
            return (
              <div className="barra-ideal-meta" style={{ left: `${esq}%` }} data-testid="barra-ideal-meta">
                {mostrarValorDaMeta && (
                  <span
                    className="barra-ideal-meta-valor"
                    style={naBorda ? { left: 'auto', right: 0, transform: 'none' } : undefined}
                  >
                    {fmtNum(meta)}
                  </span>
                )}
              </div>
            )
          })()}
        </div>
        {/* saldo livre positivo: um vão e depois o bloco, fora da meta */}
        {temLivre && livrePositivo && (
          <>
            <div className="barra-ideal-vao" />
            <div
              className="barra-ideal-livre positivo"
              style={{ width: `${livrePct}%` }}
              title={`Livre, fora da meta: ${fmtNum(saldoLivre)}`}
              data-testid="barra-ideal-livre"
            />
          </>
        )}
        {/* Com o sinal quando é negativo (13/09/2026): a cor era a única pista
            de que o número era um estouro, e o mesmo valor aparecia com "−"
            logo abaixo, no bloco grande — dois jeitos de escrever a mesma
            coisa na mesma tela. */}
        {!semValor && <span className={classeValor}>{fmtNumComSinal(valorMostrado)}</span>}
      </div>
      {legendaLivre && temLivre && (
        <div className="barra-ideal-legenda" data-testid="barra-ideal-legenda">
          <span className={`barra-ideal-amostra ${livrePositivo ? 'positivo' : 'negativo'}`} />
          <span className="texto-quebra">
            {/* O nome do bloco vem PRIMEIRO: sem ele o Rafael leu a barrinha
                separada como sendo o aporte. É o Saldo Livre, sempre. */}
            {livrePositivo
              ? `Saldo livre — fora da meta: ${fmtNum(saldoLivre)}`
              : `Saldo livre negativo, veio do mês anterior: ${fmtNum(saldoLivre)}`}
          </span>
        </div>
      )}
    </div>
  )
}
