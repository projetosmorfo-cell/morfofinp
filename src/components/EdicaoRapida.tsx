/* Editar categoria e grupo SEM sair do Planejamento (11/09/2026, pedido do
   Rafael), agora com a TELA REAL de cadastro (build 059).

   O que mudou e por quê. A versão de 11/09 abria um popup com um campo só
   ("o valor"), e o de categoria ainda pedia os DOIS campos de dinheiro que a
   build 054 já tinha eliminado da tela de Configurações — ou seja, uma cópia
   reduzida que envelheceu sozinha. O Rafael achou isso usando o app:

     "Se estou clicando na categoria para editar a categoria, tem que trazer a
      tela de edição de categoria mesmo, não só de valor."
     "Na edição do grupo também traga a tela original... quando clico em editar
      grupo, traz uma tela com todas as possibilidades de edição."

   A partir daqui os campos vêm de `FormulariosCadastro.tsx`, os MESMOS que as
   Configurações usam — não existe mais uma segunda versão para divergir. A
   única diferença é a ORDEM: quem chega pelo Planejamento veio ajustar o
   número, então ele vem primeiro (`valorPrimeiro`).

   Continua sendo um popup POR CIMA, e não a tela cheia: a tela de Planejamento
   segue montada, então "voltar para a tela anterior atualizada e na mesma
   posição" é consequência, não um mecanismo à parte.

   A CALIBRAGEM saiu daqui (build 059): ela é do conjunto dos grupos, não de um
   grupo isolado — um card olhando só para a própria vida dizia "OK" com o total
   em 101%. Agora ela tem tela própria (`Calibragem.tsx`). O que fica no popup é
   a situação DESTE grupo, que é o contexto de quem está editando ele. */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type GrupoRegistro } from '../db'
import { categoriaConsomeMeta } from '../orcamento'
import ModalCadastro from './ModalCadastro'
import { paraNumero, fmtBRL, fmtNum } from '../formatoMoeda'
import { ROTULO_TIPO_GRUPO, comportamentoDoGrupo, tipoDoGrupo } from '../gruposUtil'
import { lerDoAmbiente, marcaDoAmbiente } from '../ambiente'
import { marcarCategoriasEditadas } from '../kit/padraoCategorias'
import {
  CamposCategoria,
  CamposGrupo,
  rascunhoDeCategoria,
  type RascunhoGrupo,
} from './FormulariosCadastro'

/* Situação da META DO GRUPO a que a categoria/grupo pertence — o mesmo bloco
   que a tela de cadastro (Categorias › Metas) mostra. Pedido do Rafael em
   12/09/2026, para os DOIS popups: "estas informações devem ser exibidas
   também no popup de edição de categoria".
   Build 101 (Decisão 121) — pedido do Rafael, revisto: "ao preencher limites
   já deve calcular vs grupo vs receita se está estourando ou não". Antes a
   soma vinha 100% do banco (nunca "um número recalculado à mão aqui"), então
   editar o valor da categoria só mudava esta conta DEPOIS de salvar e
   reabrir o popup — a pessoa descobria o estouro tarde demais. Agora, quando
   quem chama informa a categoria em edição (`categoriaEmEdicao`), o valor
   GRAVADO dela é trocado pelo do RASCUNHO (ainda não salvo) antes de somar —
   o resto do grupo continua lido do banco, só esta categoria fica "ao
   vivo". Sem o parâmetro (`PopupMetaGrupo`, que não edita categoria nenhuma)
   o comportamento é exatamente o de antes. */
function SituacaoMetaDoGrupo({
  grupo,
  baseEmReais,
  categoriaEmEdicao,
}: {
  grupo: string
  baseEmReais: number
  categoriaEmEdicao?: { id?: number; aceitavelMensal: number; consomeMeta: boolean }
}) {
  const dados = useLiveQuery(async () => {
    const [categorias, metas] = await Promise.all([
      lerDoAmbiente(db.categorias.toArray()),
      lerDoAmbiente(db.metas.toArray()),
    ])
    const outrasDoGrupo = categorias.filter(
      (c) => c.ativa && c.grupo === grupo && c.id !== categoriaEmEdicao?.id,
    )
    const somaOutras = outrasDoGrupo
      .filter((c) => categoriaConsomeMeta(c.natureza))
      .reduce((t, c) => t + (c.aceitavelMensal || 0), 0)
    const soma = somaOutras + (categoriaEmEdicao?.consomeMeta ? categoriaEmEdicao.aceitavelMensal : 0)
    const pct = metas.find((m) => m.grupo === grupo)?.percentual ?? 0
    return { soma, pct, qtd: outrasDoGrupo.length + (categoriaEmEdicao ? 1 : 0) }
  }, [grupo, categoriaEmEdicao?.id, categoriaEmEdicao?.aceitavelMensal, categoriaEmEdicao?.consomeMeta])
  if (!dados) return null
  const meta = (baseEmReais * dados.pct) / 100
  const dif = meta - dados.soma
  return (
    <div style={{ borderTop: '1px solid var(--borda)', marginTop: 10, paddingTop: 10 }}>
      <p className="texto-fraco" style={{ margin: 0, fontSize: 12.5 }}>
        Grupo {grupo} · meta {fmtNum(meta)} ({dados.pct}%) · {dados.qtd} categoria(s)
      </p>
      <p className="texto-fraco" style={{ margin: '2px 0 0', fontSize: 12.5 }}>
        Soma das metas das categorias: {fmtNum(dados.soma)}
      </p>
      <p style={{ margin: '2px 0 0', fontSize: 12.5 }}>
        {Math.abs(dif) < 1 ? (
          <span className="valor-pos texto-quebra">Bate certinho com a meta.</span>
        ) : dif > 0 ? (
          <span className="valor-pos texto-quebra">Sobram {fmtBRL(dif)} da meta do grupo.</span>
        ) : (
          <span className="valor-neg texto-quebra">
            As metas das categorias excedem a meta do grupo em {fmtBRL(-dif)}.
          </span>
        )}
      </p>
    </div>
  )
}

export function PopupAceitavelCategoria({
  categoria,
  baseEmReais = 0,
  onFechar,
}: {
  categoria: Categoria
  baseEmReais?: number
  onFechar: () => void
}) {
  const [rasc, setRasc] = useState(() => rascunhoDeCategoria(categoria))
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.toArray()), []) ?? []
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), []) ?? []
  const gruposAtivos = grupos.filter((g) => g.ativo !== false)
  const contasVinculaveis = contas.filter((c) => c.tipo === 'cofre' && c.ativa !== false)

  async function salvar() {
    if (!rasc.nome.trim()) return
    await db.categorias.update(categoria.id!, {
      nome: rasc.nome.trim(),
      grupo: rasc.grupo,
      natureza: rasc.natureza,
      aceitavelMensal: paraNumero(rasc.aceitavelMensal),
      esperadoMensal: paraNumero(rasc.esperadoMensal),
      receitaFixa: rasc.natureza === 'Receita' ? rasc.receitaFixa : undefined,
      contaVinculada: rasc.contaVinculada ? Number(rasc.contaVinculada) : undefined,
      icone: rasc.icone,
      iconeEstilo: rasc.iconeEstilo,
      iconeCor: rasc.iconeCor,
    })
    /* O ambiente passou a ter cadastro próprio — o padrão da plataforma não
       sobrescreve mais. Mesma chamada que a tela de Configurações faz. */
    await marcarCategoriasEditadas()
    onFechar()
  }

  return (
    <ModalCadastro titulo={categoria.nome} onFechar={onFechar} onSalvar={salvar}>
      <CamposCategoria
        rasc={rasc}
        setRasc={setRasc}
        gruposAtivos={gruposAtivos}
        contasVinculaveis={contasVinculaveis}
        valorPrimeiro
      />
      <SituacaoMetaDoGrupo
        grupo={rasc.grupo}
        baseEmReais={baseEmReais}
        categoriaEmEdicao={{
          id: categoria.id,
          aceitavelMensal: paraNumero(rasc.aceitavelMensal),
          consomeMeta: categoriaConsomeMeta(rasc.natureza),
        }}
      />
    </ModalCadastro>
  )
}

export function PopupMetaGrupo({
  grupo,
  percentualAtual,
  baseEmReais,
  mesVigencia,
  onFechar,
  aoAbrirCalibragem,
}: {
  grupo: GrupoRegistro
  percentualAtual: number
  /* A base sobre a qual a meta percentual vira R$ — vem de fora (`baseMeta.ts`)
     pra não existirem duas contas do mesmo número. */
  baseEmReais: number
  mesVigencia: string
  onFechar: () => void
  /** Leva pra tela de Calibragem, onde os percentuais são vistos JUNTOS. */
  aoAbrirCalibragem?: () => void
}) {
  const [percentual, setPercentual] = useState(String(percentualAtual || 0))
  const [rascunho, setRascunho] = useState<RascunhoGrupo>({
    nome: grupo.nome,
    tipo: tipoDoGrupo(grupo),
    comportamento: comportamentoDoGrupo(grupo) ?? 'fixo',
    icone: grupo.icone ?? 'outros',
    iconeEstilo: (grupo.iconeEstilo ?? 'colorido') as RascunhoGrupo['iconeEstilo'],
    iconeCor: grupo.iconeCor ?? '#3b82f6',
  })
  const categoriasDoGrupo = useLiveQuery(
    async () => (await lerDoAmbiente(db.categorias.toArray())).filter((c) => c.grupo === grupo.nome),
    [grupo.nome],
  )
  const valor = (baseEmReais * (Number(percentual.replace(',', '.')) || 0)) / 100

  async function salvar() {
    if (!rascunho.nome.trim()) return
    const valorPct = Number(percentual.replace(',', '.')) || 0
    const nomeNovo = rascunho.nome.trim()

    // Renomear grupo atualiza em cascata categorias e metas — mesma regra da
    // tela de Configurações, nunca uma segunda forma de gravar o mesmo dado.
    const amb = await import('../ambiente').then((m) => m.ambienteDoBanco())
    await db.transaction('rw', db.grupos, db.categorias, db.metas, async () => {
      await db.grupos.update(grupo.id!, {
        nome: nomeNovo,
        tipo: rascunho.tipo,
        comportamento: rascunho.tipo === 'saida' ? rascunho.comportamento : undefined,
        icone: rascunho.icone,
        iconeEstilo: rascunho.iconeEstilo,
        iconeCor: rascunho.iconeCor,
      })
      if (nomeNovo !== grupo.nome) {
        const cats = (await db.categorias.toArray()).filter(
          (c) => (c.ambienteId || 't0') === amb && c.grupo === grupo.nome,
        )
        for (const c of cats) await db.categorias.update(c.id!, { grupo: nomeNovo })
        const ms = (await db.metas.toArray()).filter(
          (m) => (m.ambienteId || 't0') === amb && m.grupo === grupo.nome,
        )
        for (const m of ms) await db.metas.update(m.id!, { grupo: nomeNovo })
      }
      const existente = (await db.metas.toArray()).find(
        (m) => (m.ambienteId || 't0') === amb && m.grupo === nomeNovo,
      )
      if (existente) await db.metas.update(existente.id!, { percentual: valorPct })
      else
        await db.metas.add({
          ...marcaDoAmbiente(),
          grupo: nomeNovo,
          percentual: valorPct,
          base: 'receita_real',
          mesVigencia,
        })
    })
    await marcarCategoriasEditadas()
    onFechar()
  }

  return (
    <ModalCadastro titulo={`Grupo · ${grupo.nome}`} onFechar={onFechar} onSalvar={salvar}>
      {/* A informação principal primeiro: o percentual e o que ele vira em R$. */}
      <label htmlFor="rap-meta">Meta do grupo (%)</label>
      <input
        id="rap-meta"
        type="number"
        min={0}
        max={100}
        value={percentual}
        onChange={(e) => setPercentual(e.target.value)}
      />
      <p className="texto-fraco" style={{ marginTop: 6, marginBottom: 0 }}>
        {baseEmReais > 0
          ? `Equivale a ${fmtBRL(valor)} por mês.`
          : 'Sem receita fixa lançada neste mês, ainda não dá pra converter em R$.'}
      </p>
      <SituacaoMetaDoGrupo grupo={grupo.nome} baseEmReais={baseEmReais} />
      {aoAbrirCalibragem && (
        <button
          type="button"
          onClick={aoAbrirCalibragem}
          data-testid="ir-calibragem"
          style={{ width: '100%', marginTop: 10 }}
        >
          ⚖ Ver todos os percentuais juntos (Calibragem)
        </button>
      )}

      <div style={{ borderTop: '1px solid var(--borda)', marginTop: 14, paddingTop: 10 }}>
        <p className="texto-fraco" style={{ margin: '0 0 6px', fontSize: 12.5 }}>
          Cadastro do grupo — grupo de {ROTULO_TIPO_GRUPO[rascunho.tipo]}.
        </p>
        <CamposGrupo
          rascunho={rascunho}
          setRascunho={setRascunho}
          tipoTravado={(categoriasDoGrupo?.length ?? 0) > 0}
        />
      </div>
    </ModalCadastro>
  )
}
