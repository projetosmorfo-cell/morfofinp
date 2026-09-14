/* Primeiro acesso — a tela Hoje vira o guia enquanto o plano não existe
 * (13/09/2026, versão Ideal).
 *
 * A ordem cronológica é obrigatória e não tem como furar:
 *
 *     receita fixa → percentuais dos grupos → metas das categorias
 *
 * Em vez de mandar a pessoa caçar as configurações, os dois números da tela
 * Hoje dão lugar a este cartão. Cada passo concluído some.
 *
 * AO TERMINAR O PASSO 2 os dois números já aparecem — o cartão encolhe para o
 * passo 3, que fica visível como PENDÊNCIA, para a pessoa saber que a
 * possibilidade existe. Terminou tudo, some para sempre.
 *
 * O PASSO 3 É OPCIONAL. Com renda fixa + percentuais os dois números já
 * funcionam. Exigir meta por categoria antes de mostrar qualquer coisa alonga
 * o caminho até a primeira resposta — e a primeira resposta é o produto.
 *
 * Mesma lógica da calibragem: silêncio quando está certo, aparece quando
 * falta — e o que falta está sempre onde o olho já vai primeiro.
 *
 * Se um dia a pessoa apagar tudo, os cards voltam sozinhos: a condição é
 * "não existe plano", nunca "é a primeira vez".
 */
import type { Categoria, GrupoRegistro, Meta } from '../db'
import { categoriasDaBaseMeta } from '../baseMeta'

export interface EstadoDosPassos {
  receitaOk: boolean
  percentuaisOk: boolean
  metasOk: boolean
  /** true quando não sobrou nenhum passo — o cartão some. */
  tudoPronto: boolean
}

export function avaliarPassos(
  categorias: readonly Categoria[],
  grupos: readonly GrupoRegistro[],
  metas: readonly Meta[],
): EstadoDosPassos {
  // 1) existe categoria de receita marcada como fixa, com valor esperado?
  const base = categoriasDaBaseMeta(categorias as Categoria[])
  const receitaOk = base.length > 0 && base.some((c) => (c.esperadoMensal ?? 0) > 0)

  // 2) os grupos de saída somam 100%?
  const gruposSaida = grupos.filter((g) => g.tipo === 'saida')
  const soma = gruposSaida.reduce(
    (s, g) => s + (metas.find((m) => m.grupo === g.nome)?.percentual ?? 0),
    0,
  )
  const percentuaisOk = gruposSaida.length > 0 && Math.abs(soma - 100) < 0.5

  // 3) toda categoria de gasto tem meta? (opcional)
  const deGasto = categorias.filter((c) => c.natureza === 'Consumo')
  const metasOk = deGasto.length > 0 && deGasto.every((c) => c.aceitavelMensal > 0)

  return { receitaOk, percentuaisOk, metasOk, tudoPronto: receitaOk && percentuaisOk && metasOk }
}

interface Props {
  categorias: readonly Categoria[]
  grupos: readonly GrupoRegistro[]
  metas: readonly Meta[]
  /** Abre a tela de cadastro onde o passo é resolvido. */
  aoAbrirCategorias?: () => void
}

export default function PrimeirosPassos({ categorias, grupos, metas, aoAbrirCategorias }: Props) {
  const p = avaliarPassos(categorias, grupos, metas)
  if (p.tudoPronto) return null

  // Depois do passo 2 o cartão encolhe: os dois números já apareceram, e o
  // que resta é só o convite do passo 3.
  const encolhido = p.receitaOk && p.percentuaisOk

  return (
    <div className="cartao cartao-primeiros-passos" data-testid="primeiros-passos">
      <h2 className="ideal-t2" style={{ margin: '0 0 6px' }}>
        {encolhido ? 'Falta só um ajuste fino' : 'Vamos montar seu planejamento'}
      </h2>
      <p className="ideal-t4 texto-quebra" style={{ margin: '0 0 14px' }}>
        {encolhido
          ? 'Seu plano já funciona. Um teto por categoria deixa o acompanhamento mais fino — dá pra fazer quando quiser.'
          : 'Aqui você controla o dinheiro a partir de um plano — não do extrato. São 3 passos.'}
      </p>

      {!encolhido && (
        <>
          <Passo
            n={1}
            titulo="Quanto você recebe todo mês"
            ajuda="Sua renda fixa é a base de tudo"
            feito={p.receitaOk}
            liberado
            aoFazer={aoAbrirCategorias}
            testid="passo-1"
          />
          <Passo
            n={2}
            titulo="Como dividir esse dinheiro"
            ajuda="Já sugerimos 50/30/20 pra você"
            feito={p.percentuaisOk}
            liberado={p.receitaOk}
            aoFazer={aoAbrirCategorias}
            testid="passo-2"
          />
        </>
      )}

      <Passo
        n={3}
        titulo="Um teto por categoria (opcional)"
        ajuda="Refina o plano — dá pra fazer depois"
        feito={p.metasOk}
        liberado={p.percentuaisOk}
        opcional
        aoFazer={aoAbrirCategorias}
        testid="passo-3"
      />
    </div>
  )
}

function Passo({
  n,
  titulo,
  ajuda,
  feito,
  liberado,
  opcional = false,
  aoFazer,
  testid,
}: {
  n: number
  titulo: string
  ajuda: string
  feito: boolean
  liberado: boolean
  opcional?: boolean
  aoFazer?: () => void
  testid: string
}) {
  // Passo concluído SOME — é o combinado, não fica marcado de verde ocupando linha.
  if (feito) return null
  return (
    <div className={`passo-linha ${liberado ? '' : 'bloqueado'}`} data-testid={testid}>
      <span className="passo-numero">{n}</span>
      <div className="passo-texto">
        <div className="ideal-t3">{titulo}</div>
        <div className="ideal-t4">{ajuda}</div>
      </div>
      {liberado ? (
        <button type="button" className="passo-acao" onClick={aoFazer}>
          {opcional ? 'pendente' : 'fazer'}
        </button>
      ) : (
        <span className="passo-bloqueado">bloqueado</span>
      )}
    </div>
  )
}
