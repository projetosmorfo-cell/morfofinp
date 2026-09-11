import { Fragment, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, NATUREZAS_ORCAMENTAVEIS, type Categoria, type GrupoRegistro, type Natureza, type TipoGrupo } from '../db'
import type { TelaProps } from '../mes'
import { Icone, type EstiloIcone } from '../icones'
import SeletorIcone from '../components/SeletorIcone'
import MenuLinha from '../components/MenuLinha'
import ModalCadastro from '../components/ModalCadastro'
import { ROTULO_TIPO_GRUPO, gruposParaNatureza, tipoDoGrupo } from '../gruposUtil'
import { fmtBRL, formatarMoeda, aplicarMascaraValor, paraNumero } from '../formatoMoeda'
import { useConfiguracaoIcones, tamanhoIconePx, salvarConfiguracaoIcones } from '../configuracaoIcones'
import {
  ICONES_PADRAO_CATEGORIA,
  ICONES_PADRAO_GRUPO,
  restaurarPadraoIconesGeral,
  restaurarPadraoIconeCategoria,
  restaurarPadraoIconeGrupo,
} from '../iconesPadrao'

const NATUREZAS: Natureza[] = ['Consumo', 'Receita', 'Aporte', 'Neutro', 'Gasto de cofrinho', 'Pagamento de fatura']

// Naturezas onde faz sentido vincular a categoria a um cofrinho cadastrado —
// "Gasto de cofrinho" é o caso central (pagar direto pelo Bradesco usando uma
// categoria que o Rafael já sabe ser "do cofrinho"); "Aporte" entra também,
// pro caso simétrico. 31/08/2026, rodada seguinte (ponto 7): essa marcação
// NÃO move mais fisicamente o saldo do cofrinho — é só um AJUSTE DE FLUXO
// informativo daquele mês (ver Carteira.tsx e CLAUDE.md), nunca uma
// transferência real de saldo.
const NATUREZAS_VINCULAVEIS: Natureza[] = ['Gasto de cofrinho', 'Aporte']

// F-06/F-07 da revisão de UI (04/09/2026): as 6 seções desta tela (do
// "Tamanho dos ícones" até "Nova categoria") viviam numa rolagem única de
// ~5.000px, na ordem em que foram implementadas historicamente — não pela
// frequência real de uso. Viram abas, ordenadas da mais usada (Categorias,
// mexida toda vez que uma categoria muda) pra menos usada (Aparência —
// tamanho de ícone e restaurar padrão, configurados uma vez e esquecidos).
type AbaCategorias = 'categorias' | 'grupos' | 'metas' | 'aparencia'
const ABAS_CATEGORIAS: { valor: AbaCategorias; rotulo: string }[] = [
  { valor: 'categorias', rotulo: 'Categorias' },
  { valor: 'grupos', rotulo: 'Grupos' },
  { valor: 'metas', rotulo: 'Metas' },
  { valor: 'aparencia', rotulo: 'Aparência' },
]

function mesVigenciaAtual() {
  return new Date().toISOString().slice(0, 7).replace('-', '')
}

function mesAnteriorISO() {
  const d = new Date()
  d.setDate(1) // evita rolar pro mês errado quando o dia atual não existe no mês anterior
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

interface RascunhoCategoria {
  nome: string
  grupo: string
  natureza: Natureza
  aceitavelMensal: string
  esperadoMensal: string
  contaVinculada: string
  icone: string
  iconeEstilo: EstiloIcone
  iconeCor: string
}

function rascunhoVazio(grupoPadrao: string): RascunhoCategoria {
  return {
    nome: '',
    grupo: grupoPadrao,
    natureza: 'Consumo',
    aceitavelMensal: '',
    esperadoMensal: '',
    contaVinculada: '',
    icone: 'outros',
    iconeEstilo: 'colorido',
    iconeCor: '#3b82f6',
  }
}

interface RascunhoGrupo {
  nome: string
  tipo: TipoGrupo
  icone: string
  iconeEstilo: EstiloIcone
  iconeCor: string
}

function rascunhoGrupoVazio(): RascunhoGrupo {
  return { nome: '', tipo: 'saida', icone: 'outros', iconeEstilo: 'colorido', iconeCor: '#3b82f6' }
}

// "Categorias e Grupos" (renomeada de "Categorias" em 31/08/2026, rodada
// seguinte, ponto 11) — cadastro central de categoria + grupo + metas por
// grupo. Não é uma "aba de mês" — não obedece o mês selecionado nas abas de
// Resumo/Situação (recebe as props só pra manter a assinatura comum entre
// telas). Também é a única tela com categoria+valor que NÃO tem linhas
// recolhíveis com lançamentos (aqui a categoria é o cadastro em si, não um
// total pra explorar — ver Resumo do Mês e Situação pra isso).
export default function Categorias(_props: TelaProps & { aoVoltar: () => void }) {
  const { aoVoltar } = _props
  const categorias = useLiveQuery(() => db.categorias.toArray(), [])
  const lancamentos = useLiveQuery(() => db.lancamentos.toArray(), [])
  const metas = useLiveQuery(() => db.metas.toArray(), [])
  const grupos = useLiveQuery(() => db.grupos.toArray(), [])
  const contas = useLiveQuery(() => db.contas.toArray(), [])

  const [percentuais, setPercentuais] = useState<Record<string, number>>({})
  const percentuaisInicializados = useRef(false)
  const [abaAtiva, setAbaAtiva] = useState<AbaCategorias>('categorias')
  // F-08: "Restaurar ícone padrão" saiu de botão sempre visível e virou item
  // dentro de um menu "⋮" por linha (grupo ou categoria) — só um popover
  // aberto por vez, guardado pelo id de quem está aberto.
  const [menuGrupoAberto, setMenuGrupoAberto] = useState<number | null>(null)
  const [menuCategoriaAberto, setMenuCategoriaAberto] = useState<number | null>(null)

  const gruposAtivos = (grupos ?? []).filter((g) => g.ativo)
  const nomesGrupoAtivos = gruposAtivos.map((g) => g.nome)

  useEffect(() => {
    if (metas && grupos && !percentuaisInicializados.current) {
      const obj: Record<string, number> = {}
      for (const g of grupos) obj[g.nome] = metas.find((m) => m.grupo === g.nome)?.percentual ?? 0
      setPercentuais(obj)
      percentuaisInicializados.current = true
    }
  }, [metas, grupos])

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [rascunho, setRascunho] = useState<RascunhoCategoria>(rascunhoVazio(''))
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<number | null>(null)
  const [mostrarNova, setMostrarNova] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState<RascunhoCategoria>(rascunhoVazio(''))

  const [editandoGrupoId, setEditandoGrupoId] = useState<number | null>(null)
  const [rascunhoGrupo, setRascunhoGrupo] = useState<RascunhoGrupo>(rascunhoGrupoVazio())
  const [novoGrupo, setNovoGrupo] = useState<RascunhoGrupo>(rascunhoGrupoVazio())
  const [confirmandoExclusaoGrupoId, setConfirmandoExclusaoGrupoId] = useState<number | null>(null)
  const configIcones = useConfiguracaoIcones()
  // 01/09/2026, rodada seguinte: o formulário de "novo grupo" (nome + grade
  // de ícones inteira) vinha sempre aberto no fim da lista — Rafael pediu
  // pra só aparecer ao clicar em "Incluir", mesmo padrão que "Nova
  // categoria" (`mostrarNova`) já usava logo abaixo.
  const [mostrarNovoGrupo, setMostrarNovoGrupo] = useState(false)

  // 04/09/2026, pedido do Rafael: botão "Restaurar Padrão" pra devolver
  // ícone/estilo/cor de categoria e grupo pro que foi salvo como padrão do
  // sistema (`iconesPadrao.ts`) — geral (todos de uma vez, com confirmação,
  // mesmo padrão de "Excluir" já usado nesta tela) e por item.
  const [confirmandoRestaurarPadrao, setConfirmandoRestaurarPadrao] = useState(false)
  const [resultadoRestaurarPadrao, setResultadoRestaurarPadrao] = useState<string | null>(null)

  async function restaurarPadraoGeral() {
    const alterados = await restaurarPadraoIconesGeral()
    setResultadoRestaurarPadrao(
      alterados > 0
        ? `${alterados} ícone(s) restaurado(s) pro padrão do sistema.`
        : 'Nenhum padrão de ícone salvo ainda pra restaurar.',
    )
    setConfirmandoRestaurarPadrao(false)
  }

  if (!categorias || !lancamentos || !metas || !grupos || !contas) return null

  const contasVinculaveis = contas.filter((c) => c.tipo === 'cofre')
  const contaPorId = new Map(contas.map((c) => [c.id, c]))

  const contagemPorCategoria = new Map<number, number>()
  for (const l of lancamentos) {
    contagemPorCategoria.set(l.categoriaId, (contagemPorCategoria.get(l.categoriaId) ?? 0) + 1)
  }
  const contagemCategoriasPorGrupo = new Map<string, number>()
  for (const c of categorias) {
    contagemCategoriasPorGrupo.set(c.grupo, (contagemCategoriasPorGrupo.get(c.grupo) ?? 0) + 1)
  }

  // --- Metas por grupo: totalizador buscando 100% ---
  const totalPercentual = gruposAtivos.reduce((s, g) => s + (percentuais[g.nome] || 0), 0)
  const statusTotal =
    Math.abs(totalPercentual - 100) < 0.01 ? 'ok' : totalPercentual > 100 ? 'excede' : 'falta'

  // --- Último mês fechado (mês anterior ao atual) ---
  const mesAnterior = mesAnteriorISO()
  const categoriaPorId = new Map(categorias.map((c) => [c.id!, c]))
  const lancamentosMesAnterior = lancamentos.filter((l) => l.dataCompetencia.startsWith(mesAnterior))
  const temExemplo = lancamentosMesAnterior.length > 0
  const receitaMesAnterior = lancamentosMesAnterior
    .filter((l) => categoriaPorId.get(l.categoriaId)?.nome === 'Salário')
    .reduce((s, l) => s + l.valor, 0)

  const somaAceitavelPorGrupo = new Map<string, number>()
  for (const c of categorias) {
    if (!c.ativa) continue
    if (!NATUREZAS_ORCAMENTAVEIS.includes(c.natureza)) continue
    somaAceitavelPorGrupo.set(c.grupo, (somaAceitavelPorGrupo.get(c.grupo) ?? 0) + c.aceitavelMensal)
  }

  // Meta em R$ de cada grupo, dado o percentual configurado — base única pra
  // todo cálculo de "meta × aceitável"/"meta × realizado" desta tela
  // (31/08/2026, rodada seguinte, ponto 11 — reorganização visual, mesma
  // fórmula de sempre).
  function metaDoGrupoEmReais(nomeGrupo: string): number {
    return (receitaMesAnterior * (percentuais[nomeGrupo] || 0)) / 100
  }

  async function salvarPercentual(grupo: string, valor: number) {
    setPercentuais((p) => ({ ...p, [grupo]: valor }))
    const existente = metas?.find((m) => m.grupo === grupo)
    if (existente) {
      await db.metas.update(existente.id!, { percentual: valor })
    } else {
      await db.metas.add({ grupo, percentual: valor, base: 'receita_real', mesVigencia: mesVigenciaAtual() })
    }
  }

  // --- Exemplo com o último mês fechado (mês anterior ao atual) ---
  const realizadoPorGrupoExemplo = gruposAtivos.map((g) => {
    const realizado = lancamentosMesAnterior
      .filter((l) => {
        const cat = categoriaPorId.get(l.categoriaId)
        return cat?.grupo === g.nome && NATUREZAS_ORCAMENTAVEIS.includes(cat.natureza)
      })
      .reduce((s, l) => s + -l.valor, 0)
    return { grupo: g.nome, realizado, meta: metaDoGrupoEmReais(g.nome), percentualMeta: percentuais[g.nome] || 0 }
  })

  // --- CRUD de grupos ---
  function iniciarEdicaoGrupo(g: GrupoRegistro) {
    setEditandoGrupoId(g.id!)
    setRascunhoGrupo({
      nome: g.nome,
      tipo: tipoDoGrupo(g),
      icone: g.icone ?? 'outros',
      iconeEstilo: g.iconeEstilo ?? 'colorido',
      iconeCor: g.iconeCor ?? '#3b82f6',
    })
    setConfirmandoExclusaoGrupoId(null)
  }

  /* Trocar o tipo de um grupo que já tem categoria dentro quebraria a regra
     de vínculo em silêncio (as categorias de dentro deixariam de bater com o
     tipo novo). Então o campo fica travado nesse caso — o caminho é mover as
     categorias primeiro, que é uma ação consciente, categoria a categoria. */
  function tipoTravadoPara(nomeGrupo: string): boolean {
    return (contagemCategoriasPorGrupo.get(nomeGrupo) ?? 0) > 0
  }

  /* Formulário do grupo — o MESMO nos dois popups (novo e edição), pra não
     existirem dois desenhos que podem divergir. O tipo é `Segmented`-like
     (dois botões), não `<select>`: escolha de 2 valores com rótulo curto lê
     melhor assim, e `<select>` nativo não respeita o tema (regra da build
     023). */
  function formularioGrupo(
    rascunho: RascunhoGrupo,
    setRascunho: React.Dispatch<React.SetStateAction<RascunhoGrupo>>,
    tipoTravado: boolean,
  ) {
    return (
      <>
        <label htmlFor="grupo-nome">Nome</label>
        <input
          id="grupo-nome"
          type="text"
          value={rascunho.nome}
          onChange={(e) => setRascunho((r) => ({ ...r, nome: e.target.value }))}
        />
        <span style={{ display: 'block', fontSize: 12, color: 'var(--texto-fraco)', margin: '10px 0 6px' }}>Tipo</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['saida', 'entrada'] as TipoGrupo[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={tipoTravado && rascunho.tipo !== t}
              onClick={() => setRascunho((r) => ({ ...r, tipo: t }))}
              style={{
                flex: 1,
                marginTop: 0,
                padding: '10px 12px',
                borderRadius: 10,
                cursor: tipoTravado ? 'not-allowed' : 'pointer',
                border: `1px solid ${rascunho.tipo === t ? 'var(--azul)' : 'var(--borda)'}`,
                background: rascunho.tipo === t ? 'var(--bg-elevado)' : 'none',
                color: 'var(--texto)',
                fontWeight: rascunho.tipo === t ? 700 : 400,
                opacity: tipoTravado && rascunho.tipo !== t ? 0.4 : 1,
              }}
            >
              {ROTULO_TIPO_GRUPO[t]}
            </button>
          ))}
        </div>
        <p className="texto-fraco" style={{ marginTop: 6, marginBottom: 0, fontSize: 12 }}>
          {tipoTravado
            ? 'O tipo não pode mudar enquanto houver categoria vinculada a este grupo — mova as categorias primeiro.'
            : rascunho.tipo === 'entrada'
              ? 'Só aceita categoria de natureza Receita.'
              : 'Aceita todas as naturezas, menos Receita.'}
        </p>
        <SeletorIcone
          icone={rascunho.icone}
          estilo={rascunho.iconeEstilo}
          cor={rascunho.iconeCor}
          onChange={({ icone, estilo, cor }) => setRascunho((r) => ({ ...r, icone, iconeEstilo: estilo, iconeCor: cor }))}
        />
      </>
    )
  }

  /* Formulário da categoria — o MESMO nos dois popups (nova e edição).

     A regra de vínculo (11/09/2026) vive aqui, na forma mais simples que
     existe: a lista de grupos oferecida é só a dos grupos compatíveis com a
     natureza escolhida (`gruposParaNatureza`). Trocar a natureza pra Receita
     num grupo de saída não dá erro — o campo Grupo se reposiciona sozinho no
     primeiro grupo de entrada disponível. Não existe caminho pela tela que
     grave a combinação errada. */
  function formularioCategoria(
    rasc: RascunhoCategoria,
    setRasc: React.Dispatch<React.SetStateAction<RascunhoCategoria>>,
  ) {
    const gruposValidos = gruposParaNatureza(gruposAtivos, rasc.natureza)
    const grupoEscolhido = gruposValidos.some((g) => g.nome === rasc.grupo) ? rasc.grupo : (gruposValidos[0]?.nome ?? '')
    return (
      <>
        <label htmlFor="cat-nome">Nome</label>
        <input
          id="cat-nome"
          type="text"
          value={rasc.nome}
          onChange={(e) => setRasc((r) => ({ ...r, nome: e.target.value }))}
        />
        <label htmlFor="cat-natureza">Natureza</label>
        <select
          id="cat-natureza"
          value={rasc.natureza}
          onChange={(e) => {
            const natureza = e.target.value as Natureza
            const permitidos = gruposParaNatureza(gruposAtivos, natureza)
            setRasc((r) => ({
              ...r,
              natureza,
              grupo: permitidos.some((g) => g.nome === r.grupo) ? r.grupo : (permitidos[0]?.nome ?? ''),
            }))
          }}
        >
          {NATUREZAS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <label htmlFor="cat-grupo">Grupo</label>
        <select
          id="cat-grupo"
          value={grupoEscolhido}
          onChange={(e) => setRasc((r) => ({ ...r, grupo: e.target.value }))}
        >
          {gruposValidos.map((g2) => (
            <option key={g2.id} value={g2.nome}>
              {g2.nome}
            </option>
          ))}
        </select>
        <p className="texto-fraco" style={{ marginTop: 4, marginBottom: 0, fontSize: 12 }}>
          Só aparecem grupos de {ROTULO_TIPO_GRUPO[rasc.natureza === 'Receita' ? 'entrada' : 'saida']} — é a
          natureza da categoria que define onde ela pode ser vinculada.
        </p>
        <label htmlFor="cat-aceitavel">Aceitável mensal (R$)</label>
        <input
          id="cat-aceitavel"
          type="text"
          inputMode="decimal"
          placeholder="0,00"
          value={rasc.aceitavelMensal}
          onChange={(e) => setRasc((r) => ({ ...r, aceitavelMensal: aplicarMascaraValor(e.target.value) }))}
        />
        {rasc.natureza === 'Receita' && (
          <>
            <label htmlFor="cat-esperado">Planejado mensal (R$) — pra tela Planejamento</label>
            <input
              id="cat-esperado"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={rasc.esperadoMensal}
              onChange={(e) => setRasc((r) => ({ ...r, esperadoMensal: aplicarMascaraValor(e.target.value) }))}
            />
          </>
        )}
        {NATUREZAS_VINCULAVEIS.includes(rasc.natureza) && contasVinculaveis.length > 0 && (
          <>
            <label htmlFor="cat-cofrinho">Vincular a um cofrinho (opcional)</label>
            <select
              id="cat-cofrinho"
              value={rasc.contaVinculada}
              onChange={(e) => setRasc((r) => ({ ...r, contaVinculada: e.target.value }))}
            >
              <option value="">Nenhum</option>
              {contasVinculaveis.map((c2) => (
                <option key={c2.id} value={c2.id}>
                  {c2.nome}
                </option>
              ))}
            </select>
            <p className="texto-fraco" style={{ marginTop: 4, marginBottom: 0 }}>
              Ajuste de fluxo, não movimentação real: um lançamento nesta categoria, mesmo pago por outra conta
              (ex.: direto pelo Bradesco), aparece como nota informativa no cofrinho — não altera o saldo dele, só
              sinaliza que esse gasto substituiu parte do aporte daquele mês.
            </p>
          </>
        )}
        <SeletorIcone
          icone={rasc.icone}
          estilo={rasc.iconeEstilo}
          cor={rasc.iconeCor}
          onChange={({ icone, estilo, cor }) => setRasc((r) => ({ ...r, icone, iconeEstilo: estilo, iconeCor: cor }))}
        />
      </>
    )
  }

  /* Único caso em que a regra trava de verdade: a natureza escolhida não tem
     NENHUM grupo compatível cadastrado (ex.: primeira categoria de receita num
     app onde ninguém criou grupo de entrada). Em vez de deixar salvar errado,
     a tela diz o que falta. */
  function avisoDeVinculo(natureza: Natureza) {
    if (gruposParaNatureza(gruposAtivos, natureza).length > 0) return undefined
    const tipo = natureza === 'Receita' ? 'entrada' : 'saída'
    return `Não existe nenhum grupo de ${tipo} ativo. Cadastre um na aba Grupos antes de criar esta categoria.`
  }

  const categoriaEmEdicao = categorias.find((c) => c.id === editandoId) ?? null
  const grupoEmEdicao = grupos.find((g) => g.id === editandoGrupoId) ?? null

  async function salvarNomeGrupo(id: number, nomeAntigo: string) {
    const novoNome = rascunhoGrupo.nome.trim()
    if (!novoNome) {
      setEditandoGrupoId(null)
      return
    }
    // Renomear precisa propagar pro nome guardado em cada categoria/meta que
    // referencia esse grupo (grupo é referenciado por nome, não por id).
    await db.transaction('rw', db.grupos, db.categorias, db.metas, async () => {
      await db.grupos.update(id, {
        nome: novoNome,
        tipo: rascunhoGrupo.tipo,
        icone: rascunhoGrupo.icone,
        iconeEstilo: rascunhoGrupo.iconeEstilo,
        iconeCor: rascunhoGrupo.iconeEstilo === 'colorido' ? undefined : rascunhoGrupo.iconeCor,
      })
      if (novoNome !== nomeAntigo) {
        await db.categorias.where('grupo').equals(nomeAntigo).modify({ grupo: novoNome })
        await db.metas.where('grupo').equals(nomeAntigo).modify({ grupo: novoNome })
      }
    })
    if (novoNome !== nomeAntigo) {
      setPercentuais((p) => {
        const { [nomeAntigo]: valorAntigo, ...resto } = p
        return { ...resto, [novoNome]: valorAntigo ?? 0 }
      })
    }
    setEditandoGrupoId(null)
  }

  async function excluirGrupo(id: number) {
    await db.grupos.delete(id)
    setConfirmandoExclusaoGrupoId(null)
  }

  async function alternarAtivoGrupo(id: number, ativo: boolean) {
    await db.grupos.update(id, { ativo: !ativo })
  }

  async function adicionarGrupo() {
    const nome = novoGrupo.nome.trim()
    if (!nome) return
    await db.grupos.add({
      nome,
      ativo: true,
      tipo: novoGrupo.tipo,
      icone: novoGrupo.icone,
      iconeEstilo: novoGrupo.iconeEstilo,
      iconeCor: novoGrupo.iconeEstilo === 'colorido' ? undefined : novoGrupo.iconeCor,
    })
    setNovoGrupo(rascunhoGrupoVazio())
  }

  // --- CRUD de categorias ---
  function iniciarEdicao(cat: Categoria) {
    setEditandoId(cat.id!)
    setRascunho({
      nome: cat.nome,
      grupo: cat.grupo,
      natureza: cat.natureza,
      aceitavelMensal: formatarMoeda(cat.aceitavelMensal),
      esperadoMensal: cat.esperadoMensal ? formatarMoeda(cat.esperadoMensal) : '',
      contaVinculada: cat.contaVinculada ? String(cat.contaVinculada) : '',
      icone: cat.icone ?? 'outros',
      iconeEstilo: cat.iconeEstilo ?? 'colorido',
      iconeCor: cat.iconeCor ?? '#3b82f6',
    })
    setConfirmandoExclusaoId(null)
  }

  async function salvarEdicao() {
    if (editandoId == null) return
    await db.categorias.update(editandoId, {
      nome: rascunho.nome.trim(),
      grupo: rascunho.grupo,
      natureza: rascunho.natureza,
      aceitavelMensal: paraNumero(rascunho.aceitavelMensal),
      esperadoMensal: rascunho.natureza === 'Receita' ? paraNumero(rascunho.esperadoMensal) || undefined : undefined,
      contaVinculada:
        NATUREZAS_VINCULAVEIS.includes(rascunho.natureza) && rascunho.contaVinculada
          ? Number(rascunho.contaVinculada)
          : undefined,
      icone: rascunho.icone,
      iconeEstilo: rascunho.iconeEstilo,
      iconeCor: rascunho.iconeEstilo === 'colorido' ? undefined : rascunho.iconeCor,
    })
    setEditandoId(null)
  }

  async function excluir(id: number) {
    await db.categorias.delete(id)
    setConfirmandoExclusaoId(null)
  }

  async function alternarAtiva(cat: Categoria) {
    await db.categorias.update(cat.id!, { ativa: !cat.ativa })
  }

  async function adicionarCategoria() {
    if (!novaCategoria.nome.trim() || !novaCategoria.grupo) return
    await db.categorias.add({
      nome: novaCategoria.nome.trim(),
      grupo: novaCategoria.grupo,
      natureza: novaCategoria.natureza,
      aceitavelMensal: paraNumero(novaCategoria.aceitavelMensal),
      esperadoMensal: novaCategoria.natureza === 'Receita' ? paraNumero(novaCategoria.esperadoMensal) || undefined : undefined,
      contaVinculada:
        NATUREZAS_VINCULAVEIS.includes(novaCategoria.natureza) && novaCategoria.contaVinculada
          ? Number(novaCategoria.contaVinculada)
          : undefined,
      icone: novaCategoria.icone,
      iconeEstilo: novaCategoria.iconeEstilo,
      iconeCor: novaCategoria.iconeEstilo === 'colorido' ? undefined : novaCategoria.iconeCor,
      ativa: true,
    })
    setNovaCategoria(rascunhoVazio(nomesGrupoAtivos[0] ?? ''))
    setMostrarNova(false)
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Categorias e Grupos</h1>
      </div>
      <p className="texto-fraco">
        Cadastro central — a natureza de uma categoria só muda aqui, nunca lançamento a lançamento.
      </p>

      {/* F-06/F-07 da revisão de UI (04/09/2026): as 6 seções desta tela
          viviam numa rolagem única de ~5.000px, na ordem em que foram
          implementadas — não pela frequência de uso. Viram abas, com
          "Categorias" (mexida toda vez que algo muda) primeiro e
          "Aparência" (configurada uma vez e esquecida) por último. */}
      <div className="abas-tela" role="tablist">
        {ABAS_CATEGORIAS.map((aba) => (
          <button
            key={aba.valor}
            type="button"
            role="tab"
            aria-selected={abaAtiva === aba.valor}
            className={`aba-tela-item ${abaAtiva === aba.valor ? 'ativa' : ''}`}
            onClick={() => setAbaAtiva(aba.valor)}
          >
            {aba.rotulo}
          </button>
        ))}
      </div>

      {abaAtiva === 'aparencia' && (
        <>
          {/* 01/09/2026, rodada seguinte: config universal de tamanho de
              ícone — NÃO é por categoria/grupo (por isso fica aqui, fora do
              cadastro de cada um), é um parâmetro só, aplicado em todo o app
              de uma vez. 3 percentuais independentes, um por tipo de linha
              onde ícone aparece: Simples (categoria expandida em
              Resumo/Situação/Planejamento), Completa (Lançamentos/Carteira)
              e Grupo (cabeçalho de grupo em toda tela que mostra grupo). Ver
              `configuracaoIcones.ts` pros valores padrão (60/30/30) e a
              altura de referência fixa de cada tipo — é em cima dela que o
              percentual é calculado, não da altura real renderizada (evita
              o ícone "inflar" a própria linha). */}
          <h2>Tamanho dos ícones</h2>
          <div className="cartao">
            <p className="texto-fraco" style={{ marginTop: 0 }}>
              Quanto o ícone ocupa da altura da própria linha, em cada tipo de exibição — vale pro app inteiro,
              não é configurável por categoria ou grupo individual.
            </p>
            <label>Categorias (linha de categoria cadastrada na aba "Categorias")</label>
            <input
              type="number"
              min={0}
              max={200}
              step={5}
              value={configIcones.pctCategoria}
              onChange={(e) => salvarConfiguracaoIcones({ pctCategoria: Number(e.target.value) || 0 })}
            />
            <label>Lançamentos — listagem Completa (Lançamentos, Carteira)</label>
            <input
              type="number"
              min={0}
              max={200}
              step={5}
              value={configIcones.pctCompleta}
              onChange={(e) => salvarConfiguracaoIcones({ pctCompleta: Number(e.target.value) || 0 })}
            />
            <label>Grupos (cabeçalho de grupo em qualquer tela)</label>
            <input
              type="number"
              min={0}
              max={200}
              step={5}
              value={configIcones.pctGrupo}
              onChange={(e) => salvarConfiguracaoIcones({ pctGrupo: Number(e.target.value) || 0 })}
            />
          </div>

          {/* 04/09/2026, pedido do Rafael: os ícones que ele escolheu em cada
              categoria/grupo viraram o padrão oficial do app (salvo em
              `iconesPadrao.ts`, exportado pela tela Manutenção). Este botão
              devolve TODAS as categorias/grupos pra esse padrão de uma vez —
              cada item também tem seu próprio "Restaurar padrão" individual,
              agora dentro do menu "⋮" das abas Grupos/Categorias (F-08). */}
          <h2>Ícones — padrão do sistema</h2>
          <div className="cartao">
            <p className="texto-fraco" style={{ marginTop: 0 }}>
              Devolve o ícone, estilo e cor de todas as categorias e grupos pro padrão salvo como oficial
              do app — sobrescreve qualquer ajuste feito depois. Categoria/grupo sem padrão salvo não é
              afetado.
            </p>
            {confirmandoRestaurarPadrao ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="primario" style={{ marginTop: 0 }} onClick={restaurarPadraoGeral}>
                  Confirmar — restaurar tudo
                </button>
                <button
                  type="button"
                  style={{
                    marginTop: 0,
                    background: 'none',
                    border: '1px solid var(--borda)',
                    borderRadius: 10,
                    padding: '12px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setConfirmandoRestaurarPadrao(false)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmandoRestaurarPadrao(true)}>
                Restaurar Padrão
              </button>
            )}
            {resultadoRestaurarPadrao && (
              <p className="texto-fraco" style={{ marginTop: 8 }}>
                {resultadoRestaurarPadrao}
              </p>
            )}
          </div>
        </>
      )}

      {abaAtiva === 'grupos' && (
      <>
      <h2>Grupos</h2>
      <div className="cartao">
        {grupos.length === 0 && <p className="texto-fraco">Nenhum grupo cadastrado ainda.</p>}
        {grupos.map((g) => {
          const temCategoria = (contagemCategoriasPorGrupo.get(g.nome) ?? 0) > 0
          return (
            <div key={g.id} className="linha linha-cabecalho-grupo">
              <span style={{ opacity: g.ativo ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                {g.icone !== 'nenhum' && (
                  <Icone id={g.icone} estilo={g.iconeEstilo} cor={g.iconeCor} tamanho={tamanhoIconePx('grupo', configIcones.pctGrupo)} />
                )}
                {g.nome}
                <span className="texto-fraco"> · {ROTULO_TIPO_GRUPO[tipoDoGrupo(g)]}</span>
                {!g.ativo && <span className="texto-fraco"> · inativo</span>}
              </span>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--azul)', cursor: 'pointer', padding: 0 }}
                  onClick={() => iniciarEdicaoGrupo(g)}
                >
                  Editar
                </button>
                {/* F-08: "Restaurar ícone padrão" e "Inativar/Excluir" — ações
                    (c)/(d) da régua de densidade — saíram de botão sempre
                    visível e viraram itens de um menu "⋮" por linha. No
                    mobile (390px) isso também corrige a quebra de linha que
                    "Restaurar ícone padrão" causava (medido no relatório de
                    04/09/2026). */}
                {confirmandoExclusaoGrupoId === g.id ? (
                  <>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 0 }}
                      onClick={() => excluirGrupo(g.id!)}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', padding: 0 }}
                      onClick={() => setConfirmandoExclusaoGrupoId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <MenuLinha
                    aberto={menuGrupoAberto === g.id}
                    onAbrirFechar={() => setMenuGrupoAberto((atual) => (atual === g.id ? null : g.id!))}
                    onFechar={() => setMenuGrupoAberto(null)}
                  >
                    {ICONES_PADRAO_GRUPO[g.nome] && (
                      <button
                        type="button"
                        onClick={() => {
                          restaurarPadraoIconeGrupo(g.id!, g.nome)
                          setMenuGrupoAberto(null)
                        }}
                      >
                        Restaurar ícone padrão
                      </button>
                    )}
                    {temCategoria ? (
                      <button
                        type="button"
                        onClick={() => {
                          alternarAtivoGrupo(g.id!, g.ativo)
                          setMenuGrupoAberto(null)
                        }}
                      >
                        {g.ativo ? 'Inativar' : 'Reativar'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmandoExclusaoGrupoId(g.id!)
                          setMenuGrupoAberto(null)
                        }}
                      >
                        Excluir
                      </button>
                    )}
                  </MenuLinha>
                )}
              </div>
            </div>
          )
        })}
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            className="primario"
            style={{ marginTop: 0 }}
            onClick={() => {
              setNovoGrupo(rascunhoGrupoVazio())
              setMostrarNovoGrupo(true)
            }}
          >
            + Incluir grupo
          </button>
        </div>
        <p className="texto-fraco" style={{ marginTop: 8, marginBottom: 0 }}>
          Todo grupo é de <strong>Entrada</strong> (só categorias de Receita) ou de <strong>Saída</strong> (todas as
          outras naturezas) — é o tipo que define o que pode ser vinculado nele. Grupo com categoria vinculada só
          pode ser inativado (some das opções de categoria nova, mas o histórico continua íntegro); sem nenhuma
          categoria, pode ser excluído de verdade.
        </p>
      </div>

      {mostrarNovoGrupo && (
        <ModalCadastro
          titulo="Novo grupo"
          rotuloSalvar="Adicionar"
          salvarDesabilitado={!novoGrupo.nome.trim()}
          onFechar={() => {
            setMostrarNovoGrupo(false)
            setNovoGrupo(rascunhoGrupoVazio())
          }}
          onSalvar={async () => {
            if (!novoGrupo.nome.trim()) return
            await adicionarGrupo()
            setMostrarNovoGrupo(false)
          }}
        >
          {formularioGrupo(novoGrupo, setNovoGrupo, false)}
        </ModalCadastro>
      )}

      {grupoEmEdicao && (
        <ModalCadastro
          titulo="Editar grupo"
          salvarDesabilitado={!rascunhoGrupo.nome.trim()}
          onFechar={() => setEditandoGrupoId(null)}
          onSalvar={() => salvarNomeGrupo(grupoEmEdicao.id!, grupoEmEdicao.nome)}
        >
          {formularioGrupo(rascunhoGrupo, setRascunhoGrupo, tipoTravadoPara(grupoEmEdicao.nome))}
        </ModalCadastro>
      )}
      </>
      )}

      {abaAtiva === 'metas' && (
      <>
      <h2>Metas por grupo</h2>
      <div className="cartao">
        {gruposAtivos.map((g) => {
          const somaAceitavel = somaAceitavelPorGrupo.get(g.nome) ?? 0
          const metaGrupo = metaDoGrupoEmReais(g.nome)
          const diferencaAceitavel = metaGrupo - somaAceitavel
          // Enxugamento do bloco de contexto (31/08/2026, ponto 11): duas
          // linhas limpas em vez de uma frase corrida — a primeira sempre
          // mostra a soma aceitável, a segunda tem o texto dinâmico de
          // status (sobra/bate certinho/excede).
          return (
            <div key={g.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
              <div className="linha linha-cabecalho-grupo" style={{ border: 'none', padding: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {g.icone !== 'nenhum' && (
                    <Icone id={g.icone} estilo={g.iconeEstilo} cor={g.iconeCor} tamanho={tamanhoIconePx('grupo', configIcones.pctGrupo)} />
                  )}
                  {g.nome}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {temExemplo && <span className="texto-fraco">{fmtBRL(metaGrupo)}</span>}
                  <input
                    type="number"
                    inputMode="decimal"
                    style={{ width: 64, textAlign: 'right' }}
                    value={percentuais[g.nome] ?? 0}
                    onChange={(e) => salvarPercentual(g.nome, Number(e.target.value))}
                  />
                  <span className="texto-fraco">%</span>
                </div>
              </div>
              {temExemplo && (
                <>
                  <p className="texto-fraco" style={{ margin: '4px 0 0' }}>
                    Soma do aceitável das categorias: {fmtBRL(somaAceitavel)}
                  </p>
                  <p className="texto-fraco" style={{ margin: '2px 0 0' }}>
                    {Math.abs(diferencaAceitavel) < 1 ? (
                      <span className="valor-pos">Bate certinho com a meta.</span>
                    ) : diferencaAceitavel > 0 ? (
                      <span>Sobram {fmtBRL(diferencaAceitavel)} de meta pra distribuir entre as categorias.</span>
                    ) : (
                      <span className="valor-neg">Aceitável excede a meta em {fmtBRL(-diferencaAceitavel)}.</span>
                    )}
                  </p>
                </>
              )}
            </div>
          )
        })}
        <div
          className="linha"
          style={{ borderBottom: 'none', paddingTop: 12, marginTop: 4, borderTop: '1px solid var(--borda)' }}
        >
          <span>Total</span>
          <strong
            className={statusTotal === 'ok' ? 'valor-pos' : statusTotal === 'excede' ? 'valor-neg' : 'texto-fraco'}
          >
            {totalPercentual.toFixed(0)}%
          </strong>
        </div>
        {temExemplo && (
          <p className="texto-fraco" style={{ marginTop: 0, textAlign: 'right' }}>
            {fmtBRL((receitaMesAnterior * totalPercentual) / 100)}
          </p>
        )}
        {statusTotal === 'falta' && (
          <p className="texto-fraco" style={{ marginTop: 0 }}>
            Faltam {(100 - totalPercentual).toFixed(0)}% pra fechar 100%.
          </p>
        )}
        {statusTotal === 'excede' && (
          <p className="valor-neg" style={{ marginTop: 0, fontSize: 13 }}>
            Excede em {(totalPercentual - 100).toFixed(0)}% — ajuste os percentuais.
          </p>
        )}
        {statusTotal === 'ok' && (
          <p className="texto-fraco" style={{ marginTop: 0 }}>
            Fecha certinho em 100%.
          </p>
        )}

        <p className="texto-fraco" style={{ marginTop: 16, borderTop: '1px solid var(--borda)', paddingTop: 12 }}>
          {temExemplo
            ? `Exemplo com o último mês fechado (${mesAnterior.split('-').reverse().join('/')}) — receita de ${fmtBRL(receitaMesAnterior)}:`
            : `Ainda não há lançamentos no mês anterior (${mesAnterior.split('-').reverse().join('/')}) pra mostrar um exemplo — assim que fechar um mês, aparece aqui meta × realizado.`}
        </p>
        {temExemplo && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '4px 12px' }}>
            <span className="texto-fraco" style={{ fontSize: 11, textTransform: 'uppercase' }}>Grupo</span>
            <span className="texto-fraco" style={{ fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Meta</span>
            <span className="texto-fraco" style={{ fontSize: 11, textTransform: 'uppercase', textAlign: 'right' }}>Realizado</span>
            {realizadoPorGrupoExemplo.map(({ grupo, realizado, meta, percentualMeta }) => {
              const pctRealizado = meta > 0 ? (realizado / meta) * 100 : realizado > 0 ? 999 : 0
              return (
                <Fragment key={grupo}>
                  <span className="texto-fraco">{grupo}</span>
                  <span className="texto-fraco" style={{ textAlign: 'right' }}>
                    {fmtBRL(meta)} ({percentualMeta.toFixed(0)}%)
                  </span>
                  <strong className={realizado > meta ? 'valor-neg' : 'valor-pos'} style={{ textAlign: 'right' }}>
                    {fmtBRL(realizado)} ({pctRealizado.toFixed(0)}%)
                  </strong>
                </Fragment>
              )
            })}
          </div>
        )}
      </div>
      </>
      )}

      {abaAtiva === 'categorias' && (
      <>
      <h2>Categorias cadastradas</h2>
      {grupos.map((g) => {
        const doGrupo = categorias
          .filter((c) => c.grupo === g.nome)
          .sort((a, b) => a.nome.localeCompare(b.nome))
        if (doGrupo.length === 0) return null
        const metaGrupo = metaDoGrupoEmReais(g.nome)
        const somaAceitavel = somaAceitavelPorGrupo.get(g.nome) ?? 0
        const pctAceitavelDaMeta = metaGrupo > 0 ? (somaAceitavel / metaGrupo) * 100 : somaAceitavel > 0 ? 999 : 0
        return (
          <div key={g.id}>
            <div className="linha linha-cabecalho-grupo" style={{ border: 'none', marginTop: 20, marginBottom: 4, alignItems: 'baseline' }}>
              <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                {g.icone !== 'nenhum' && (
                  <Icone id={g.icone} estilo={g.iconeEstilo} cor={g.iconeCor} tamanho={tamanhoIconePx('grupo', configIcones.pctGrupo)} />
                )}
                {g.nome}
              </h2>
              {temExemplo && (
                <span className="texto-fraco" style={{ fontSize: 12, textAlign: 'right' }}>
                  meta {fmtBRL(metaGrupo)} · aceitável {fmtBRL(somaAceitavel)} ({pctAceitavelDaMeta.toFixed(0)}%)
                </span>
              )}
            </div>
            <div className="cartao">
              {doGrupo.map((c) => {
                const temLancamentos = (contagemPorCategoria.get(c.id!) ?? 0) > 0

                return (
                  <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--borda)' }}>
                    <div
                      className={`linha ${c.icone !== 'nenhum' ? 'linha-categoria-icone' : ''}`}
                      style={{ border: 'none', padding: 0 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {c.icone !== 'nenhum' && (
                          <Icone
                            id={c.icone}
                            estilo={c.iconeEstilo}
                            cor={c.iconeCor}
                            tamanho={tamanhoIconePx('categoria', configIcones.pctCategoria)}
                          />
                        )}
                        <div>
                          <div style={{ opacity: c.ativa ? 1 : 0.5 }}>
                            {c.nome}
                            {!c.ativa && <span className="texto-fraco"> · inativa</span>}
                          </div>
                          <div className="texto-fraco">
                            {c.natureza}
                            {c.contaVinculada && ` · ajuste de fluxo via ${contaPorId.get(c.contaVinculada)?.nome ?? '—'}`}
                          </div>
                        </div>
                      </div>
                      {c.aceitavelMensal > 0 && (
                        <span className="texto-fraco">até {fmtBRL(c.aceitavelMensal)}</span>
                      )}
                      {c.natureza === 'Receita' && !!c.esperadoMensal && (
                        <span className="texto-fraco">~{fmtBRL(c.esperadoMensal)}/mês</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, alignItems: 'center' }}>
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--azul)', cursor: 'pointer', padding: 0 }}
                        onClick={() => iniciarEdicao(c)}
                      >
                        Editar
                      </button>
                      {/* F-08: mesmo menu "⋮" da aba Grupos — "Restaurar ícone
                          padrão" e "Inativar/Excluir" saem de botão sempre
                          visível (até 41 linhas na tela) e viram itens de um
                          popover por linha. */}
                      {confirmandoExclusaoId === c.id ? (
                        <>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 0 }}
                            onClick={() => excluir(c.id!)}
                          >
                            Confirmar exclusão
                          </button>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', padding: 0 }}
                            onClick={() => setConfirmandoExclusaoId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <MenuLinha
                          aberto={menuCategoriaAberto === c.id}
                          onAbrirFechar={() => setMenuCategoriaAberto((atual) => (atual === c.id ? null : c.id!))}
                          onFechar={() => setMenuCategoriaAberto(null)}
                        >
                          {ICONES_PADRAO_CATEGORIA[c.nome] && (
                            <button
                              type="button"
                              onClick={() => {
                                restaurarPadraoIconeCategoria(c.id!, c.nome)
                                setMenuCategoriaAberto(null)
                              }}
                            >
                              Restaurar ícone padrão
                            </button>
                          )}
                          {temLancamentos ? (
                            <button
                              type="button"
                              onClick={() => {
                                alternarAtiva(c)
                                setMenuCategoriaAberto(null)
                              }}
                            >
                              {c.ativa ? 'Inativar' : 'Reativar'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmandoExclusaoId(c.id!)
                                setMenuCategoriaAberto(null)
                              }}
                            >
                              Excluir
                            </button>
                          )}
                        </MenuLinha>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <h2>Nova categoria</h2>
      <div className="cartao">
        <button
          type="button"
          className="primario"
          style={{ marginTop: 0 }}
          onClick={() => {
            setNovaCategoria(rascunhoVazio(nomesGrupoAtivos[0] ?? ''))
            setMostrarNova(true)
          }}
        >
          + Nova categoria
        </button>
      </div>

      {mostrarNova && (
        <ModalCadastro
          titulo="Nova categoria"
          rotuloSalvar="Adicionar"
          salvarDesabilitado={!novaCategoria.nome.trim() || gruposParaNatureza(gruposAtivos, novaCategoria.natureza).length === 0}
          aviso={avisoDeVinculo(novaCategoria.natureza)}
          onFechar={() => {
            setMostrarNova(false)
            setNovaCategoria(rascunhoVazio(nomesGrupoAtivos[0] ?? ''))
          }}
          onSalvar={async () => {
            await adicionarCategoria()
            setMostrarNova(false)
          }}
        >
          {formularioCategoria(novaCategoria, setNovaCategoria)}
        </ModalCadastro>
      )}

      {categoriaEmEdicao && (
        <ModalCadastro
          titulo="Editar categoria"
          salvarDesabilitado={!rascunho.nome.trim() || gruposParaNatureza(gruposAtivos, rascunho.natureza).length === 0}
          aviso={avisoDeVinculo(rascunho.natureza)}
          onFechar={() => setEditandoId(null)}
          onSalvar={salvarEdicao}
        >
          {formularioCategoria(rascunho, setRascunho)}
        </ModalCadastro>
      )}
      </>
      )}
    </>
  )
}
