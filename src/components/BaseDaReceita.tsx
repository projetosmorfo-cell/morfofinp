/* A BASE DAS METAS — quem forma o 100% (build 059).
 *
 * Pedido do Rafael, depois de ver a Calibragem:
 *
 *   "gostei da receita que você vai colocar falando total da receita, mas tem
 *    que ter um botão de editar, e aí você tem que trazer uma tela que seja
 *    fácil pra ele dar manutenção: pegar alguma categoria e marcar como
 *    receita, e pegar alguma categoria de receita e marcar com a flag de fixo.
 *    E tem que estar nítido a importância dessa flag."
 *
 * O problema real que isso resolve: a flag `receitaFixa` é a coisa mais
 * importante do app inteiro — é ela que define o 100% sobre o qual TODAS as
 * metas incidem — e estava escondida dentro do cadastro de uma categoria, uma
 * a uma. Não havia nenhum lugar que respondesse "quem forma a minha base?".
 *
 * Aqui a resposta aparece inteira: as categorias de receita numa lista, a flag
 * em cada uma, o total somando ao vivo, e — separado — as demais categorias de
 * entrada que poderiam entrar na base mas não estão marcadas.
 *
 * A conta mostrada é a MESMA de `baseMeta.ts` (soma dos LANÇAMENTOS do mês nas
 * categorias marcadas), nunca uma segunda forma de calcular o mesmo número.
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria } from '../db'
import { lerDoAmbiente } from '../ambiente'
import { baseMetaDoMes } from '../baseMeta'
import { fmtBRL } from '../formatoMoeda'
import { marcarCategoriasEditadas } from '../kit/padraoCategorias'
import { Sheet } from '../kit/kitBase'

export default function BaseDaReceita({ mes, onFechar }: { mes: string; onFechar: () => void }) {
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const lancamentos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), [])
  if (!categorias || !lancamentos) return null

  /* Ordem por NOME, não pela marcação: ordenar pelas marcadas primeiro fazia a
     lista se reorganizar embaixo do dedo a cada toque — quem desmarcasse uma
     veria outra categoria pular para o lugar dela. */
  const receitas = categorias
    .filter((c) => c.natureza === 'Receita' && c.ativa !== false)
    .sort((a, b) => a.nome.localeCompare(b.nome))
  const base = baseMetaDoMes(lancamentos, categorias, mes)

  /* Quanto cada categoria marcada trouxe NESTE mês — o mesmo recorte de
     `baseMetaDoMes`, aberto por categoria pra a soma nunca ser uma caixa preta. */
  const noMes = (c: Categoria) =>
    lancamentos
      .filter((l) => l.categoriaId === c.id && l.dataCompetencia.startsWith(mes))
      .reduce((s, l) => s + l.valor, 0)

  async function alternarFixa(c: Categoria) {
    await db.categorias.update(c.id!, { receitaFixa: !c.receitaFixa })
    await marcarCategoriasEditadas()
  }

  return (
    <Sheet title="Base das metas" onClose={onFechar}>
      <p style={{ marginTop: 0, fontSize: 13, lineHeight: 1.5 }}>
        <strong>A base é a soma das categorias de natureza Receita que estão marcadas como
        fixa</strong>, considerando os lançamentos deste mês. É esse número que vale 100% — todo
        percentual de meta de grupo é uma fatia dele.
      </p>
      <p style={{ marginTop: 0, fontSize: 12.5, lineHeight: 1.5, opacity: 0.85 }}>
        Marque só a renda que se repete todo mês (salário, pró-labore, aluguel recebido). Receita
        eventual — um reembolso, a venda de algo, um bônus — fica desmarcada de propósito: ela
        aumenta seu caixa, mas não pode aumentar a sua meta de gasto do mês.
      </p>

      <div
        style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 10, padding: '10px 0', margin: '4px 0 10px',
          borderTop: '1px solid var(--mloc-line, #E6E3DD)', borderBottom: '1px solid var(--mloc-line, #E6E3DD)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700 }}>Base deste mês</span>
        <span style={{ fontSize: 19, fontWeight: 800 }} data-testid="base-na-folha">{fmtBRL(base)}</span>
      </div>

      {receitas.length === 0 ? (
        <p style={{ fontSize: 13 }}>
          Não há nenhuma categoria de natureza Receita cadastrada. Crie uma em Configuração →
          Categorias e Metas: é por ela que a sua renda entra no app.
        </p>
      ) : (
        receitas.map((c) => {
          const valor = noMes(c)
          return (
            <label
              key={c.id}
              htmlFor={`base-fixa-${c.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                borderTop: '1px solid var(--mloc-line, #E6E3DD)', cursor: 'pointer',
              }}
            >
              <input
                id={`base-fixa-${c.id}`}
                type="checkbox"
                checked={!!c.receitaFixa}
                onChange={() => void alternarFixa(c)}
                style={{ width: 20, height: 20, flex: 'none', margin: 0 }}
                data-testid={`base-fixa-${c.id}`}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: c.receitaFixa ? 700 : 500 }}>
                  {c.nome}
                </span>
                <span style={{ display: 'block', fontSize: 12, opacity: 0.7 }}>
                  {c.receitaFixa ? 'entra na base' : 'fora da base'}
                  {valor !== 0 ? ` · ${fmtBRL(valor)} neste mês` : ' · sem lançamento neste mês'}
                </span>
              </span>
            </label>
          )
        })
      )}

      <p style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.5, marginBottom: 0 }}>
        Para mudar a natureza de uma categoria (transformar um gasto em receita, por exemplo), use
        o cadastro dela — aqui só entra o que já é receita, porque é só isso que pode formar a base.
      </p>
    </Sheet>
  )
}
