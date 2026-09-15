/* Aviso de calibragem, reaproveitável em qualquer tela (item 9 da lista
   pendente do Rafael, 15/09/2026: "calibragem em todas as telas, separado por
   grupo de categoria" — até aqui só existia dentro da tela Hoje, como
   `cartao-calibragem`). Mesma conta da Calibragem.tsx (build 067): meta do
   grupo, vinda de `baseMeta.ts`, contra a soma das metas das categorias dele.

   Silêncio quando está tudo calibrado — o cartão inteiro não renderiza nada
   nesse caso, em nenhuma tela. */
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { lerDoAmbiente } from '../ambiente'
import { baseMetaDoMes, metaEmReais } from '../baseMeta'
import { categoriaConsomeMeta } from '../orcamento'
import { fmtBRL } from '../formatoMoeda'
import BlocoRecolhivel from './BlocoRecolhivel'

const TOLERANCIA_REAIS = 1

export default function AvisoCalibragem({
  mes,
  aoAbrirCalibragem,
}: {
  mes: string
  aoAbrirCalibragem: () => void
}) {
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.toArray()), [])
  const metas = useLiveQuery(() => lerDoAmbiente(db.metas.toArray()), [])
  const lancamentos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), [])

  if (!categorias || !grupos || !metas || !lancamentos) return null

  const base = baseMetaDoMes(lancamentos, categorias, mes)
  const gruposSaida = grupos.filter((g) => g.tipo === 'saida' && g.ativo !== false)
  const somaCategoriasDo = (nome: string) =>
    categorias
      .filter((c) => c.ativa !== false && c.grupo === nome && categoriaConsomeMeta(c.natureza))
      .reduce((s, c) => s + (c.aceitavelMensal || 0), 0)

  const descalibrados = gruposSaida
    .map((g) => {
      const pct = metas.find((m) => m.grupo === g.nome)?.percentual ?? 0
      const meta = metaEmReais(base, pct)
      const somaCat = somaCategoriasDo(g.nome)
      return { grupo: g, dif: somaCat - meta, meta }
    })
    .filter((x) => x.meta > 0 && Math.abs(x.dif) >= TOLERANCIA_REAIS)

  if (descalibrados.length === 0) return null

  return (
    <div className="cartao" data-testid="cartao-calibragem" style={{ marginTop: 14 }}>
      <BlocoRecolhivel
        comoBotao
        testid="aviso-calibragem"
        rotulo={`⚠ ${descalibrados.length} ${descalibrados.length === 1 ? 'grupo precisa' : 'grupos precisam'} de ajuste`}
      >
        {descalibrados.map(({ grupo, dif }) => (
          <div className="linha-detalhe-cat" key={grupo.nome}>
            <span className="ideal-t4">{grupo.nome}</span>
            <span className={`ideal-t3 ${dif > 0 ? 'valor-neg' : 'valor-pos'}`}>
              {dif > 0 ? '+' : '−'} {fmtBRL(Math.abs(dif))}
            </span>
          </div>
        ))}
        <p className="ideal-t4 texto-quebra" style={{ margin: '6px 0 8px' }}>
          É a diferença entre a meta do grupo e a soma das metas das categorias dele.
        </p>
        <button
          type="button"
          className="primario"
          style={{ marginTop: 0 }}
          onClick={aoAbrirCalibragem}
          data-testid="ir-calibrar"
        >
          Calibrar
        </button>
      </BlocoRecolhivel>
    </div>
  )
}
