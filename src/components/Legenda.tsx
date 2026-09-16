/* A "Legenda" de cor de um card (build 084, 16/09/2026).
 *
 * Pedido do Rafael: *"em todos os cards no app que tenha cores dentro das
 * barras precisa ter no final do card recolhido a 'Legenda', caso já tenha
 * item recolhido, complemente"*.
 *
 * DUAS REGRAS, e elas são o componente inteiro:
 *
 *   1. As entradas NUNCA são escritas aqui. Vêm de `src/legendaBarras.ts`,
 *      que nomeia o token CSS que cada barra usa de verdade. Trocar o valor
 *      do token muda a barra e a amostra juntas — foi para fechar essa deriva
 *      que o módulo existe (ver o cabeçalho dele).
 *   2. Mostra SÓ as cores da família de barra daquele card. A legenda de uma
 *      `BarraMeta` não lista cor que só existe no funil da tela Hoje, e
 *      vice-versa. Cor que aparece condicionalmente (o vermelho, que só surge
 *      quando estoura) entra assim mesmo: a legenda explica a LÍNGUA, não a
 *      instância que está na tela agora.
 *
 * ONDE O CARD JÁ TEM UM RECOLHÍVEL (o funil da tela Hoje, o "O que significa
 * isso?" da Situação), a legenda entra DENTRO dele, no fim — `comoConteudo`.
 * Nunca um segundo botão de abrir/recolher no mesmo card.
 *
 * Nasce recolhida, sempre, e a escolha NÃO é persistida — mesma regra do
 * `BlocoRecolhivel`: a tela abre enxuta toda vez.
 */
import type { ReactNode } from 'react'
import BlocoRecolhivel from './BlocoRecolhivel'
import { LEGENDA_BARRAS, corDoToken, type FamiliaBarra } from '../legendaBarras'

function Entradas({ familias }: { familias: FamiliaBarra[] }) {
  const varias = familias.length > 1
  return (
    <>
      {familias.map((f) => {
        const familia = LEGENDA_BARRAS[f]
        return (
          <div key={f} className="legenda-familia" data-testid={`legenda-familia-${f}`}>
            {/* O título da família só aparece quando o card tem mais de uma
                barra de linguagem diferente (o balão "De onde vem o
                reservado?" tem a barra da meta E as barras por grupo). Com uma
                só, ele seria ruído. */}
            {varias && <div className="legenda-familia-titulo">{familia.titulo}</div>}
            <div className="legenda-cores">
              {familia.entradas.map((e) => (
                <span className="legenda-cores-item" key={`${f}-${e.token}`}>
                  <span
                    className="legenda-cores-bolinha"
                    data-token={e.token}
                    style={{ background: corDoToken(e.token), opacity: e.opacidade }}
                  />
                  {e.texto}
                </span>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

export default function Legenda({
  familias,
  comoConteudo = false,
  testid,
  antes,
  rotulo,
}: {
  /** As famílias de barra que ESTE card desenha. Nada além delas. */
  familias: FamiliaBarra[]
  /** O card já tem um recolhível: entra como conteúdo dele, sem botão próprio. */
  comoConteudo?: boolean
  testid?: string
  /* --- `antes` e `rotulo` (build 085) -------------------------------------
   *
   * Rafael, sobre o Planejamento: *"no planejamento esse conteúdo no card tbm
   * deve ser recolhível, pra padronizar todas as telas"* — citando as entradas
   * da legenda MAIS o parágrafo que explica o "quanto espera receber por mês".
   *
   * A regra da build 084 continua valendo e é justamente o que obriga este
   * prop a existir: **um card nunca tem dois recolhíveis**. Então o texto
   * explicativo não ganha um bloco próprio — ele entra DENTRO do recolhível
   * que a legenda já tem, antes das entradas de cor, e o rótulo do botão passa
   * a anunciar as duas coisas. Fechado, o card mostra uma linha curta só. */
  antes?: ReactNode
  /** Rótulo do botão. Padrão "Legenda"; quem passa `antes` costuma ampliá-lo. */
  rotulo?: string
}) {
  if (familias.length === 0) return null

  if (comoConteudo) {
    return (
      <div className="legenda-complemento" data-testid={testid ?? 'legenda'}>
        {antes}
        <div className="legenda-complemento-titulo">Legenda</div>
        <Entradas familias={familias} />
      </div>
    )
  }

  const rot = rotulo ?? 'Legenda'
  return (
    <div className="legenda-bloco" data-testid={testid ?? 'legenda'}>
      <BlocoRecolhivel rotulo={rot} rotuloAberto={`Recolher ${rot.toLowerCase()}`} testid={`${testid ?? 'legenda'}-toggle`}>
        {antes}
        <Entradas familias={familias} />
      </BlocoRecolhivel>
    </div>
  )
}
