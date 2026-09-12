import { Fragment, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import SeletorComExplicacao, { type OpcaoExplicada } from '../components/SeletorComExplicacao'
import { db, NATUREZAS_ORCAMENTAVEIS, type Categoria, type GrupoRegistro, type Natureza, type TipoGrupo } from '../db'
import { marcarCategoriasEditadas } from '../kit/padraoCategorias'
import type { TelaProps } from '../mes'
import { Icone, type EstiloIcone } from '../icones'
import SeletorIcone from '../components/SeletorIcone'
import MenuLinha from '../components/MenuLinha'
import ModalCadastro from '../components/ModalCadastro'
import { ROTULO_TIPO_GRUPO, gruposParaNatureza, tipoDoGrupo } from '../gruposUtil'
import { fmtBRL, formatarMoeda, aplicarMascaraValor, paraNumero } from '../formatoMoeda'
import { baseMetaDoMes, categoriasDaBaseMeta, EXPLICACAO_BASE_META } from '../baseMeta'
import { useConfiguracaoIcones, tamanhoIconePx, salvarConfiguracaoIcones } from '../configuracaoIcones'
import { lerDoAmbiente, marcaDoAmbiente } from '../ambiente'
import {
  ICONES_PADRAO_CATEGORIA,
  ICONES_PADRAO_GRUPO,
  restaurarPadraoIconesGeral,
  restaurarPadraoIconeCategoria,
  restaurarPadraoIconeGrupo,
} from '../iconesPadrao'

const NATUREZAS: Natureza[] = ['Consumo', 'Receita', 'Aporte', 'Neutro', 'Gasto de cofrinho', 'Pagamento de fatura']

/* O que cada natureza FAZ nos cálculos (12/09/2026, pedido do Rafael: "o
   campo Natureza pode ser confuso pro usuário, ele precisa saber o impacto
   nos cálculos"). Cada texto descreve o efeito real, conferido no código das
   telas: quem entra em Entrou/Saiu (ResumoDoMes), quem tem teto e entra na
   meta do grupo (NATUREZAS_ORCAMENTAVEIS) e quem é só movimento de caixa. */
const EXPLICACAO_NATUREZA: Record<Natureza, string> = {
  Consumo: 'Gasto do dia a dia. Tem teto (aceitável) e conta na meta de gasto do grupo.',
  Receita: 'Dinheiro entrando. Soma em "Entrou" e é a base da meta — nunca conta como gasto.',
  Aporte: 'Dinheiro guardado (cofrinho/objetivo). Sai do mês e conta na meta do grupo, como gasto planejado.',
  Neutro: 'Não entra em nenhum total do mês — use pra registro que não é receita nem despesa.',
  'Gasto de cofrinho': 'Uso do dinheiro já guardado. Reduz o cofrinho e não conta de novo como gasto do mês.',
  'Pagamento de fatura': 'Quitação de cartão. Fica fora de Entrou/Saiu — a despesa já entrou na compra.',
  'Transferência': 'Dinheiro trocando de lugar entre contas suas. Nunca entra em Entrou/Saiu nem em meta.',
}

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
// Item 5 da lista de 12/09/2026: "Categorias" virou "Categorias e Metas"
// (é onde o meta da categoria de cada categoria é cadastrado) e as abas
// "Grupos" e "Metas" foram FUNDIDAS numa só — as duas falam do mesmo objeto
// (o grupo) e ficar trocando de aba pra cadastrar o grupo e depois a meta
// dele era vaivém puro. Nenhum recurso saiu: os dois blocos continuam
// inteiros, agora um abaixo do outro na mesma aba.
type AbaCategorias = 'categorias' | 'gruposMetas' | 'aparencia'
const ABAS_CATEGORIAS: { valor: AbaCategorias; rotulo: string }[] = [
  { valor: 'categorias', rotulo: 'Categorias e Metas' },
  { valor: 'gruposMetas', rotulo: 'Grupos e Metas' },
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
  receitaFixa: boolean
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
    receitaFixa: false,
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
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const lancamentos = useLiveQuery(() => lerDoAmbiente(db.lancamentos.toArray()), [])
  const metas = useLiveQuery(() => lerDoAmbiente(db.metas.toArray()), [])
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.toArray()), [])
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])

  const [percentuais, setPercentuais] = useState<Record<string, number>>({})
  const percentuaisInicializados = useRef(false)
  const [abaAtiva, setAbaAtiva] = useState<AbaCategorias>('categorias')
  // F-08: "Restaurar ícone padrão" saiu de botão sempre visível e virou item
  // dentro de um menu "⋮" por linha (grupo ou categoria) — só um popover
  // aberto por vez, guardado pelo id de quem está aberto.
  const [menuGrupoAberto, setMenuGrupoAberto] = useState<number | null>(null)
  const [menuCategoriaAberto, setMenuCategoriaAberto] = useState<number | null>(null)
  /* Item 18 (12/09/2026): "no N1 deve ser igual [ao N0], abrir todos de uma
     vez, mesmo layout, mas com os campos preenchidos; lá no N1 sim deve ter
     Aceitável e as observações". O modo padrão passa a ser "Todas abertas" —
     cada categoria vira um cartão com os campos já preenchidos e editáveis
     na hora. A lista compacta continua disponível no botão ao lado: ela é a
     única que cabe as 37 categorias numa tela só. */
  const [modoCategorias, setModoCategorias] = useState<'abertas' | 'compacta'>('abertas')

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
  /* Base do exemplo — mesma função das outras telas (`src/baseMeta.ts`): a soma
     das categorias de receita marcadas como FIXA. Aqui o mês é o ANTERIOR de
     propósito: este bloco é "exemplo com o último mês FECHADO", diferente do
     cálculo ao vivo do Resumo/Planejamento, que usa o mês da tela. */
  const receitaMesAnterior = baseMetaDoMes(lancamentosMesAnterior, categorias, mesAnterior)

  /* Quais categorias formam o 100% — mostrado na tela de percentuais (item 13). */
  const categoriasBaseMeta = categoriasDaBaseMeta(categorias.filter((c) => c.ativa))

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
    void marcarCategoriasEditadas() /* item 7: a partir daqui o padrão do N0 não é mais empurrado por cima */
    } else {
      await db.metas.add({ ...marcaDoAmbiente(), grupo, percentual: valor, base: 'receita_real', mesVigencia: mesVigenciaAtual() })
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
        <SeletorComExplicacao<Natureza>
          id="cat-natureza"
          titulo="Natureza da categoria"
          valor={rasc.natureza}
          opcoes={NATUREZAS.map((n): OpcaoExplicada<Natureza> => ({ valor: n, rotulo: n, explicacao: EXPLICACAO_NATUREZA[n] }))}
          onEscolher={(natureza) => {
            const permitidos = gruposParaNatureza(gruposAtivos, natureza)
            setRasc((r) => ({
              ...r,
              natureza,
              grupo: permitidos.some((g) => g.nome === r.grupo) ? r.grupo : (permitidos[0]?.nome ?? ''),
            }))
          }}
        />
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
        {/* 12/09/2026 (build 054) — o Rafael, com razão: "quando a natureza é
            Receita... pede 2 campos Meta e Planejado, por que esse segundo?".
            Os dois nunca deveriam conviver numa categoria de entrada:

            • "Meta da categoria" é TETO DE GASTO. Não existe teto pra dinheiro
              que entra (receber mais não é problema), e o valor dela numa
              categoria de Receita não era lido por tela nenhuma — era campo
              morto pedindo atenção. Por isso SOME quando a natureza é Receita.
            • "Planejado mensal" é usado de verdade: é o quanto se espera
              receber, e é o lado Entradas do Planejamento (real × planejado).
              Fica, com o rótulo dizendo o que é sem citar tela.

            O modo expandido da lista já mostrava um campo só (esperado pra
            Receita, meta pro resto) — o formulário é que estava fora do passo. */}
        {rasc.natureza !== 'Receita' && (
          <>
            <label htmlFor="cat-aceitavel">Meta da categoria (R$)</label>
            <input
              id="cat-aceitavel"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={rasc.aceitavelMensal}
              onChange={(e) => setRasc((r) => ({ ...r, aceitavelMensal: aplicarMascaraValor(e.target.value) }))}
            />
          </>
        )}
        {rasc.natureza === 'Receita' && (
          <>
            <label htmlFor="cat-esperado">Quanto espera receber por mês (R$)</label>
            <input
              id="cat-esperado"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={rasc.esperadoMensal}
              onChange={(e) => setRasc((r) => ({ ...r, esperadoMensal: aplicarMascaraValor(e.target.value) }))}
            />
            {/* Flag de receita FIXA (12/09/2026) — é a soma destas categorias,
                no mês da tela, que forma o 100% sobre o qual os percentuais de
                meta de grupo incidem. Opcional e só oferecida em Receita. */}
            <label
              htmlFor="cat-receita-fixa"
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            >
              <input
                id="cat-receita-fixa"
                type="checkbox"
                checked={rasc.receitaFixa}
                onChange={(e) => setRasc((r) => ({ ...r, receitaFixa: e.target.checked }))}
                style={{ width: 18, height: 18, flex: 'none' }}
              />
              <span>É receita fixa (entra na base das metas)</span>
            </label>
            <p className="texto-fraco" style={{ marginTop: -4 }}>
              Marque a renda que se repete todo mês (salário, pró-labore, aluguel recebido).
              A soma dessas categorias no mês é o 100% das metas de grupo.
            </p>
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
    void marcarCategoriasEditadas() /* item 7: a partir daqui o padrão do N0 não é mais empurrado por cima */
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
    void marcarCategoriasEditadas() /* item 7: a partir daqui o padrão do N0 não é mais empurrado por cima */
  }

  async function adicionarGrupo() {
    const nome = novoGrupo.nome.trim()
    if (!nome) return
    await db.grupos.add({
      ...marcaDoAmbiente(),
      nome,
      ativo: true,
      tipo: novoGrupo.tipo,
      icone: novoGrupo.icone,
      iconeEstilo: novoGrupo.iconeEstilo,
      iconeCor: novoGrupo.iconeEstilo === 'colorido' ? undefined : novoGrupo.iconeCor,
    })
    void marcarCategoriasEditadas() /* item 7: a partir daqui o padrão do N0 não é mais empurrado por cima */
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
      receitaFixa: !!cat.receitaFixa,
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
      receitaFixa: rascunho.natureza === 'Receita' ? rascunho.receitaFixa : undefined,
      contaVinculada:
        NATUREZAS_VINCULAVEIS.includes(rascunho.natureza) && rascunho.contaVinculada
          ? Number(rascunho.contaVinculada)
          : undefined,
      icone: rascunho.icone,
      iconeEstilo: rascunho.iconeEstilo,
      iconeCor: rascunho.iconeEstilo === 'colorido' ? undefined : rascunho.iconeCor,
    })
    void marcarCategoriasEditadas() /* item 7: a partir daqui o padrão do N0 não é mais empurrado por cima */
    setEditandoId(null)
  }

  async function excluir(id: number) {
    await db.categorias.delete(id)
    void marcarCategoriasEditadas() /* item 7: a partir daqui o padrão do N0 não é mais empurrado por cima */
    setConfirmandoExclusaoId(null)
  }

  async function alternarAtiva(cat: Categoria) {
    await db.categorias.update(cat.id!, { ativa: !cat.ativa })
    void marcarCategoriasEditadas() /* item 7: a partir daqui o padrão do N0 não é mais empurrado por cima */
  }

  /* Item 18 da lista de 12/09/2026: no modo "Todas abertas" cada campo grava
     direto, sem passar por modal — mesmo comportamento da tela de padrão do
     N0, que é o layout que ele pediu pra replicar aqui. */
  async function atualizarCampoCategoria(cat: Categoria, patch: Partial<Categoria>) {
    await db.categorias.update(cat.id!, patch)
    void marcarCategoriasEditadas()
  }

  async function adicionarCategoria() {
    if (!novaCategoria.nome.trim() || !novaCategoria.grupo) return
    await db.categorias.add({
      ...marcaDoAmbiente(),
      nome: novaCategoria.nome.trim(),
      grupo: novaCategoria.grupo,
      natureza: novaCategoria.natureza,
      aceitavelMensal: paraNumero(novaCategoria.aceitavelMensal),
      esperadoMensal: novaCategoria.natureza === 'Receita' ? paraNumero(novaCategoria.esperadoMensal) || undefined : undefined,
      receitaFixa: novaCategoria.natureza === 'Receita' ? novaCategoria.receitaFixa : undefined,
      contaVinculada:
        NATUREZAS_VINCULAVEIS.includes(novaCategoria.natureza) && novaCategoria.contaVinculada
          ? Number(novaCategoria.contaVinculada)
          : undefined,
      icone: novaCategoria.icone,
      iconeEstilo: novaCategoria.iconeEstilo,
      iconeCor: novaCategoria.iconeEstilo === 'colorido' ? undefined : novaCategoria.iconeCor,
      ativa: true,
    })
    void marcarCategoriasEditadas() /* item 7: a partir daqui o padrão do N0 não é mais empurrado por cima */
    setNovaCategoria(rascunhoVazio(nomesGrupoAtivos[0] ?? ''))
    setMostrarNova(false)
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Categorias, Grupos e Metas</h1>
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
          <h2>Tamanho dos Ícones</h2>
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
          <h2>Ícones — Padrão do Sistema</h2>
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
              <button type="button" className="primario" style={{ marginTop: 0 }} onClick={() => setConfirmandoRestaurarPadrao(true)}>
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

      {abaAtiva === 'gruposMetas' && (
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

      {abaAtiva === 'gruposMetas' && (
      <>
      <h2>Metas de Grupo</h2>
      {/* Item 13 da lista de 12/09/2026: a tela precisa DIZER de onde sai o
          100%. Antes o percentual aparecia sem nenhuma referência, e a base
          era o salário do mês anterior — regra que nem estava escrita aqui. */}
      <p className="texto-fraco" style={{ marginTop: 0 }}>
        {EXPLICACAO_BASE_META} Cada grupo recebe uma fatia desse total, e a soma
        dos percentuais fecha em 100%.
        {categoriasBaseMeta.length > 0
          ? ` Hoje entram na base: ${categoriasBaseMeta.map((c) => c.nome).join(', ')}.`
          : ' Nenhuma categoria está marcada como receita fixa ainda — marque em Categorias e Metas, senão as metas ficam zeradas.'}
      </p>
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
                    Soma das metas das categorias: {fmtBRL(somaAceitavel)}
                  </p>
                  <p className="texto-fraco" style={{ margin: '2px 0 0' }}>
                    {Math.abs(diferencaAceitavel) < 1 ? (
                      <span className="valor-pos texto-quebra">Bate certinho com a meta.</span>
                    ) : diferencaAceitavel > 0 ? (
                      /* Item 4 da lista de 12/09/2026: o excedente já era
                         vermelho; a sobra estava em cinza. Agora é verde,
                         pra os dois lados terem o mesmo peso visual. */
                      <span className="valor-pos texto-quebra">Sobram {fmtBRL(diferencaAceitavel)} de meta pra distribuir entre as categorias.</span>
                    ) : (
                      <span className="valor-neg texto-quebra">As metas das categorias excedem a meta do grupo em {fmtBRL(-diferencaAceitavel)}.</span>
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
      <h2>Categorias Cadastradas</h2>
      <div className="abas-tela" role="tablist" style={{ marginBottom: 8 }}>
        {([
          ['abertas', 'Todas abertas'],
          ['compacta', 'Lista compacta'],
        ] as const).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={modoCategorias === valor}
            className={`aba-tela-item ${modoCategorias === valor ? 'ativa' : ''}`}
            onClick={() => setModoCategorias(valor)}
          >
            {rotulo}
          </button>
        ))}
      </div>
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
                  meta do grupo {fmtBRL(metaGrupo)} · metas das categorias {fmtBRL(somaAceitavel)} ({pctAceitavelDaMeta.toFixed(0)}%)
                </span>
              )}
            </div>
            <div className="cartao">
              {doGrupo.map((c) => {
                const temLancamentos = (contagemPorCategoria.get(c.id!) ?? 0) > 0

                /* Item 18 (12/09/2026): mesmo layout da tela de padrão do N0
                   — um cartão por categoria, todos abertos, com os campos já
                   preenchidos. A diferença combinada é que AQUI existe o
                   "Meta da categoria" (é do ambiente, não da plataforma) e as
                   observações de cada natureza. */
                if (modoCategorias === 'abertas') {
                  /* 12/09/2026 (build 052, pedido do Rafael): categoria
                     inativa trava TODOS os campos e diz isso em destaque no
                     topo. Antes o único sinal era uma frase discreta no fim do
                     cartão, com os campos ainda editáveis — dava pra alterar
                     nome, grupo e meta de uma categoria que não aparece em
                     lançamento novo, sem nada avisar.
                     O bloqueio é um <fieldset disabled>, não `disabled` campo a
                     campo: assim vale também pro seletor de natureza e pro de
                     ícone, que são componentes próprios, e qualquer campo novo
                     que entrar aqui já nasce coberto. O menu "⋮" fica FORA do
                     fieldset — é por ele que se reativa. */
                  const inativa = !c.ativa
                  return (
                    <div key={c.id} className={`cartao-categoria-aberta${inativa ? ' categoria-inativa' : ''}`}>
                      {inativa && (
                        <div className="tarja-inativa" data-testid={`tarja-inativa-${c.id}`}>
                          <strong>Categoria inativa.</strong> Ela não aparece em lançamento novo e os campos estão
                          bloqueados. Para editar, reative em "⋮".
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <label htmlFor={`cat-nome-${c.id}`}>Nome da Categoria</label>
                          <input
                            id={`cat-nome-${c.id}`}
                            value={c.nome}
                            disabled={inativa}
                            onChange={(e) => void atualizarCampoCategoria(c, { nome: e.target.value })}
                          />
                        </div>
                        <MenuLinha
                          aberto={menuCategoriaAberto === c.id}
                          onAbrirFechar={() => setMenuCategoriaAberto((atual) => (atual === c.id ? null : c.id!))}
                          onFechar={() => setMenuCategoriaAberto(null)}
                        >
                          {ICONES_PADRAO_CATEGORIA[c.nome] && (
                            <button type="button" onClick={() => { restaurarPadraoIconeCategoria(c.id!, c.nome); setMenuCategoriaAberto(null) }}>
                              Restaurar ícone padrão
                            </button>
                          )}
                          {temLancamentos ? (
                            <button type="button" onClick={() => { void alternarAtiva(c); setMenuCategoriaAberto(null) }}>
                              {c.ativa ? 'Inativar' : 'Reativar'}
                            </button>
                          ) : (
                            <button type="button" onClick={() => { setConfirmandoExclusaoId(c.id!); setMenuCategoriaAberto(null) }}>
                              Excluir
                            </button>
                          )}
                        </MenuLinha>
                      </div>

                      <fieldset className="campos-travaveis" disabled={inativa}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <label htmlFor={`cat-grupo-${c.id}`}>Grupo</label>
                          <select
                            id={`cat-grupo-${c.id}`}
                            value={c.grupo}
                            onChange={(e) => void atualizarCampoCategoria(c, { grupo: e.target.value })}
                          >
                            {gruposParaNatureza(gruposAtivos, c.natureza).map((g2) => (
                              <option key={g2.id} value={g2.nome}>{g2.nome}</option>
                            ))}
                            {!gruposAtivos.some((g2) => g2.nome === c.grupo) && <option value={c.grupo}>{c.grupo}</option>}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`cat-aceitavel-${c.id}`}>
                            {c.natureza === 'Receita' ? 'Quanto espera receber (R$)' : 'Meta da categoria (R$)'}
                          </label>
                          <input
                            id={`cat-aceitavel-${c.id}`}
                            inputMode="numeric"
                            value={formatarMoeda(c.natureza === 'Receita' ? (c.esperadoMensal ?? 0) : c.aceitavelMensal)}
                            onChange={(e) => {
                              const v = paraNumero(aplicarMascaraValor(e.target.value))
                              void atualizarCampoCategoria(c, c.natureza === 'Receita' ? { esperadoMensal: v } : { aceitavelMensal: v })
                            }}
                          />
                        </div>
                      </div>

                      <label htmlFor={`cat-natureza-${c.id}`}>Natureza</label>
                      <SeletorComExplicacao
                        id={`cat-natureza-${c.id}`}
                        titulo="Natureza da categoria"
                        valor={c.natureza}
                        opcoes={NATUREZAS.map((n): OpcaoExplicada<Natureza> => ({ valor: n, rotulo: n, explicacao: EXPLICACAO_NATUREZA[n] }))}
                        onEscolher={(n) => void atualizarCampoCategoria(c, { natureza: n })}
                      />

                      {/* 12/09/2026 (build 054) — o Rafael: "continua sem exibir
                          a flag nas categorias já cadastradas no modo expandido e
                          tem que mostrar". Era verdade: a marca de receita fixa só
                          existia no formulário de inclusão/edição recolhido. Como é
                          ela que decide a BASE das metas de grupo (`baseMeta.ts`),
                          não poder ver nem mudar isso direto no cartão da categoria
                          escondia o parâmetro mais importante da tela. */}
                      {c.natureza === 'Receita' && (
                        <label
                          htmlFor={`cat-fixa-${c.id}`}
                          data-testid="flag-receita-fixa-aberta"
                          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8 }}
                        >
                          <input
                            id={`cat-fixa-${c.id}`}
                            type="checkbox"
                            checked={!!c.receitaFixa}
                            onChange={(e) => void atualizarCampoCategoria(c, { receitaFixa: e.target.checked })}
                            style={{ width: 18, height: 18, flex: 'none' }}
                          />
                          <span>É receita fixa (entra na base das metas)</span>
                        </label>
                      )}

                      {NATUREZAS_VINCULAVEIS.includes(c.natureza) && (
                        <>
                          <label htmlFor={`cat-vinc-${c.id}`}>Cofrinho vinculado (opcional)</label>
                          <select
                            id={`cat-vinc-${c.id}`}
                            value={c.contaVinculada ?? ''}
                            onChange={(e) => void atualizarCampoCategoria(c, { contaVinculada: e.target.value ? Number(e.target.value) : undefined })}
                          >
                            <option value="">Nenhum</option>
                            {(contas ?? []).filter((ct) => ct.ativa !== false).map((ct) => (
                              <option key={ct.id} value={ct.id}>{ct.nome}</option>
                            ))}
                          </select>
                        </>
                      )}

                      <div style={{ marginTop: 8 }}>
                        <SeletorIcone
                          icone={c.icone ?? 'outros'}
                          estilo={(c.iconeEstilo ?? 'colorido') as EstiloIcone}
                          cor={c.iconeCor ?? '#3b82f6'}
                          onChange={(v) => void atualizarCampoCategoria(c, { icone: v.icone, iconeEstilo: v.estilo, iconeCor: v.estilo === 'colorido' ? undefined : v.cor })}
                        />
                      </div>
                      </fieldset>

                      {confirmandoExclusaoId === c.id && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                          <button type="button" className="perigo" style={{ flex: 1 }} onClick={() => void excluir(c.id!)}>
                            Excluir de vez
                          </button>
                          <button type="button" className="secundario" style={{ flex: 1 }} onClick={() => setConfirmandoExclusaoId(null)}>
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  /* UMA linha por categoria (12/09/2026, pedido do Rafael:
                     "esta lista está muito espaçada, reposicione os ícones de
                     Editar e os 3 pontinhos à direita do valor na mesma linha,
                     deixando a linha inteira mais estreita, sendo 1 linha
                     apenas e não 2"). Antes eram duas faixas: a de conteúdo e,
                     abaixo, a de ações ("Editar" + "⋮"). Agora tudo divide a
                     mesma linha: ícone · nome · natureza · valor · lápis · ⋮.
                     O status da meta DO GRUPO entra como um selo colorido
                     depois do valor (mesmo pedido: "deve mostrar o mesmo
                     conceito informando quando estourou a meta do grupo em
                     vermelho e o valor estourando, ou verde o valor sobrando —
                     a nível de categoria, mesmo que se repita em todas"). */
                  <div key={c.id} style={{ padding: '5px 0', borderBottom: '1px solid var(--borda)' }}>
                    <div
                      className={`linha ${c.icone !== 'nenhum' ? 'linha-categoria-icone' : ''}`}
                      style={{ border: 'none', padding: 0, gap: 8 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                        {c.icone !== 'nenhum' && (
                          <Icone
                            id={c.icone}
                            estilo={c.iconeEstilo}
                            cor={c.iconeCor}
                            tamanho={tamanhoIconePx('categoria', configIcones.pctCategoria)}
                          />
                        )}
                        <span style={{ opacity: c.ativa ? 1 : 0.5, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.nome}
                          <span className="texto-fraco" style={{ fontSize: 11.5 }}>
                            {' · '}{c.natureza}
                            {/* 12/09/2026 (build 054): "na lista de categorias no
                                cadastro de categorias, mostrar tbm a flag". É a
                                marca que define a base das metas — sem ela na
                                lista, descobrir quais categorias formam o 100%
                                exigia abrir uma por uma. */}
                            {c.natureza === 'Receita' && c.receitaFixa && ' · receita fixa'}
                            {!c.ativa && ' · inativa'}
                            {c.contaVinculada && ` · via ${contaPorId.get(c.contaVinculada)?.nome ?? '—'}`}
                          </span>
                        </span>
                      </div>
                      {c.natureza !== 'Receita' && c.aceitavelMensal > 0 && (
                        <span className="texto-fraco" style={{ fontSize: 12 }}>até {fmtBRL(c.aceitavelMensal)}</span>
                      )}
                      {c.natureza === 'Receita' && !!c.esperadoMensal && (
                        <span className="texto-fraco" style={{ fontSize: 12 }}>~{fmtBRL(c.esperadoMensal)}/mês</span>
                      )}
                      {temExemplo && NATUREZAS_ORCAMENTAVEIS.includes(c.natureza) && Math.abs(metaGrupo - somaAceitavel) >= 1 && (
                        <span
                          className={metaGrupo - somaAceitavel > 0 ? 'valor-pos' : 'valor-neg'}
                          style={{ fontSize: 11.5, whiteSpace: 'nowrap' }}
                          title={metaGrupo - somaAceitavel > 0
                            ? `Ainda sobra ${fmtBRL(metaGrupo - somaAceitavel)} da meta do grupo ${g.nome}`
                            : `As metas das categorias de ${g.nome} excedem a meta do grupo em ${fmtBRL(somaAceitavel - metaGrupo)}`}
                        >
                          {metaGrupo - somaAceitavel > 0 ? `sobra ${fmtBRL(metaGrupo - somaAceitavel)}` : `excede ${fmtBRL(somaAceitavel - metaGrupo)}`}
                        </span>
                      )}
                      {confirmandoExclusaoId === c.id ? (
                        <>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 0, fontSize: 12 }}
                            onClick={() => excluir(c.id!)}
                          >
                            Confirmar
                          </button>
                          <button
                            type="button"
                            style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', padding: 0, fontSize: 12 }}
                            onClick={() => setConfirmandoExclusaoId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={`Editar ${c.nome}`}
                            title="Editar"
                            style={{ background: 'none', border: 'none', color: 'var(--azul)', cursor: 'pointer', padding: 2, display: 'flex', flex: '0 0 auto' }}
                            onClick={() => iniciarEdicao(c)}
                          >
                            <PencilSquareIcon width={16} height={16} />
                          </button>
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
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <h2>Nova Categoria</h2>
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
