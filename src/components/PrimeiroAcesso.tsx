/* PRIMEIRO ACESSO ISOLADO (build 092, 17/09/2026).
 *
 * Pedido do Rafael, literal: "Quando é o primeiro acesso o passo a passo, no
 * primeiro passo leva pra tela de planejamento e lá não tem o que ser feito,
 * deveria abrir a tela de categoria 'Salário' já marcada como fixo e uma
 * mensagem somente nesse primeiro acesso deve orientar que tem que ter uma
 * receita fixa, informar que ainda que ela varie a cada mês, pra poder seguir
 * pro próximo passo, ao gravar aí deve ir pra tela de edição dos grupos e
 * categorias e metas, ao terminar aí deve ir pra tela de Planejamento, isso
 * deve abrir sempre isolado, sem opção de sair, enquanto não atender esses
 * passos mínimos isolados não libera o resto do app".
 *
 * O que era antes: as boas-vindas mandavam pra tela Hoje, onde um cartão de 3
 * passos tinha um botão "fazer" que abria o PLANEJAMENTO — tela que mostra
 * resultado, não cadastro. A pessoa chegava lá sem nada pra fazer.
 *
 * O que é agora — TRÊS passos (build 096), um de cada vez, ocupando o app
 * inteiro:
 *
 *     PASSO 1  o cadastro da categoria de receita fixa (a "Salário" já
 *              existente, ou uma nova com esse nome), com a flag de receita
 *              fixa marcada e a mensagem de por que ela precisa existir.
 *              Gravar só é possível com valor > 0 e a flag ligada.
 *     PASSO 2  a própria tela "Contas e Carteiras", em modo primeiro acesso —
 *              onde o dinheiro está, com SALDO INICIAL e data de cada conta.
 *              (build 096, pedido do Rafael: "abrir tela pra informar saldo
 *              inicial e data após ou junto com cadastro de contas".)
 *     PASSO 3  a própria tela "Categorias, Grupos e Metas", em modo primeiro
 *              acesso (sem "Voltar", com o botão "Concluir e ir para o
 *              Planejamento" no rodapé, liberado só quando os percentuais
 *              dos grupos somam 100% e a receita fixa continua válida).
 *     FIM      grava `primeiroAcessoConcluido` e o app abre no Planejamento.
 *
 * REFAZER QUANDO QUISER (build 096, mesmo pedido: "esse passo a passo, entendo
 * que poderia ficar nas config > Ajuda pra repetir quando quiser"). Aberto
 * por ali, o passo a passo é o MESMO — a única diferença é a prop `aoSair`,
 * que acrescenta uma saída no cabeçalho. No fluxo obrigatório ela não existe,
 * e é isso que mantém a regra de "sem saída até concluir": quem já concluiu
 * uma vez e voltou por vontade própria pode sair a qualquer momento.
 *
 * QUEM ENTRA AQUI: só quem viu as boas-vindas, ainda não concluiu este passo a
 * passo E não tem plano pronto (`usePlanoPronto` === false — o mesmo critério
 * de "plano pronto" do resto do onboarding, com as duas portas: esperado da
 * receita fixa preenchido OU receita fixa já lançada). Instalação antiga, base
 * restaurada de backup e a base de demonstração têm plano — nunca caem aqui.
 * Enquanto as consultas carregam `usePlanoPronto` devolve `undefined`, e
 * `undefined` NÃO abre o passo a passo: é o que impede um piscar pra quem já
 * tem plano.
 *
 * SEM SAÍDA, de propósito: não há rodapé, não há barra de marca, não há
 * "Voltar" no passo 2. A única porta é concluir. Quem quiser sair do app de
 * verdade fecha o app — e volta exatamente onde parou, porque a decisão de
 * entrar aqui é re-derivada do banco a cada abertura.
 */
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type GrupoRegistro } from '../db'
import { lerDoAmbiente, marcaDoAmbiente } from '../ambiente'
import { GRUPO_RECEITA, gruposParaNatureza } from '../gruposUtil'
import { paraNumero } from '../formatoMoeda'
import { marcarCategoriasEditadas } from '../kit/padraoCategorias'
import { ICONES_PADRAO_CATEGORIA } from '../iconesPadrao'
import {
  CamposCategoria,
  NATUREZAS_VINCULAVEIS,
  rascunhoDeCategoria,
  rascunhoVazio,
  type RascunhoCategoria,
} from './FormulariosCadastro'
import Categorias from '../screens/Categorias'
import Contas from '../screens/Contas'
import { mesAtualISO } from '../mes'
import { NOME_PRODUTO } from '../kit/siteKit'

const NOME_CATEGORIA_RECEITA_FIXA = 'Salário'

/** A categoria que o passo 1 edita: a receita fixa que já existe, ou a "Salário". */
function categoriaDoPasso1(categorias: readonly Categoria[]): Categoria | undefined {
  return (
    categorias.find((c) => c.natureza === 'Receita' && c.receitaFixa && c.ativa !== false) ??
    categorias.find((c) => c.nome.trim().toLowerCase() === NOME_CATEGORIA_RECEITA_FIXA.toLowerCase())
  )
}

function rascunhoDoPasso1(categoria: Categoria | undefined, grupos: readonly GrupoRegistro[]): RascunhoCategoria {
  if (categoria) {
    const r = rascunhoDeCategoria(categoria)
    return {
      ...r,
      natureza: 'Receita',
      receitaFixa: true,
      esperadoMensal: (categoria.esperadoMensal ?? 0) > 0 ? r.esperadoMensal : '',
    }
  }
  const grupoEntrada =
    gruposParaNatureza(grupos.filter((g) => g.ativo) as GrupoRegistro[], 'Receita')[0]?.nome ?? GRUPO_RECEITA
  const icone = ICONES_PADRAO_CATEGORIA[NOME_CATEGORIA_RECEITA_FIXA]
  return {
    ...rascunhoVazio(grupoEntrada),
    nome: NOME_CATEGORIA_RECEITA_FIXA,
    natureza: 'Receita',
    receitaFixa: true,
    icone: icone?.icone ?? 'outros',
    iconeEstilo: icone?.iconeEstilo ?? 'colorido',
    iconeCor: icone?.iconeCor ?? '#3b82f6',
  }
}

/** O que impede de gravar o passo 1 — `null` quando pode. */
function pendenciaDoPasso1(r: RascunhoCategoria): string | null {
  if (!r.nome.trim()) return 'Dê um nome à categoria (ex.: Salário).'
  if (r.natureza !== 'Receita') return 'Esta categoria precisa ser de natureza Receita — é o dinheiro que entra.'
  if (!r.receitaFixa) return 'Marque "é receita fixa": é ela que forma a base das metas.'
  if (paraNumero(r.esperadoMensal) <= 0) return 'Informe quanto espera receber por mês — um valor de referência, mesmo que varie.'
  return null
}

export default function PrimeiroAcesso({ aoConcluir, aoSair }: { aoConcluir: () => void; aoSair?: () => void }) {
  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const mes = mesAtualISO()

  /* A saída só existe quando o passo a passo foi reaberto pela Ajuda — no
     primeiro acesso de verdade ela não é renderizada. Fica sobre o conteúdo,
     no canto, pra não empurrar o cabeçalho de cada passo (que é de outra
     tela e tem layout próprio). */
  const saida = aoSair && (
    <button
      type="button"
      className="botao-sair-passo-a-passo"
      data-testid="primeiro-acesso-sair"
      onClick={aoSair}
    >
      Sair do passo a passo
    </button>
  )

  if (passo === 1) {
    return (
      <main data-testid="primeiro-acesso" data-passo="1">
        {saida}
        <PassoReceitaFixa aoGravar={() => setPasso(2)} />
      </main>
    )
  }

  if (passo === 2) {
    return (
      <main data-testid="primeiro-acesso" data-passo="2">
        {saida}
        <Contas aoVoltar={() => setPasso(1)} primeiroAcesso={{ aoConcluir: () => setPasso(3) }} />
      </main>
    )
  }

  return (
    <main data-testid="primeiro-acesso" data-passo="3">
      {saida}
      <Categorias
        mes={mes}
        aoMudarMes={() => {}}
        aoAbrirLancamento={() => {}}
        aoAbrirPlanejamento={() => {}}
        aoVoltar={() => {}}
        primeiroAcesso={{ aoConcluir }}
      />
    </main>
  )
}

function PassoReceitaFixa({ aoGravar }: { aoGravar: () => void }) {
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.toArray()), [])
  const grupos = useLiveQuery(() => lerDoAmbiente(db.grupos.toArray()), [])
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])
  if (!categorias || !grupos || !contas) return null
  return <FormularioReceitaFixa categorias={categorias} grupos={grupos} contas={contas} aoGravar={aoGravar} />
}

function FormularioReceitaFixa({
  categorias,
  grupos,
  contas,
  aoGravar,
}: {
  categorias: Categoria[]
  grupos: GrupoRegistro[]
  contas: { id?: number; nome: string; tipo: string }[]
  aoGravar: () => void
}) {
  const alvo = categoriaDoPasso1(categorias)
  /* O rascunho nasce UMA vez a partir da categoria alvo. Se a `useLiveQuery`
     recarregar (a própria gravação dispara isso), o que a pessoa digitou fica —
     por isso o estado inicial é função e não é re-derivado a cada render. */
  const [rasc, setRasc] = useState<RascunhoCategoria>(() => rascunhoDoPasso1(alvo, grupos))
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const gruposAtivos = grupos.filter((g) => g.ativo)
  const contasVinculaveis = contas.filter((c) => c.tipo === 'cofre')
  const pendencia = pendenciaDoPasso1(rasc)

  async function gravar() {
    const p = pendenciaDoPasso1(rasc)
    if (p) { setErro(p); return }
    setSalvando(true)
    try {
      const grupoValido =
        gruposParaNatureza(gruposAtivos, 'Receita').some((g) => g.nome === rasc.grupo)
          ? rasc.grupo
          : gruposParaNatureza(gruposAtivos, 'Receita')[0]?.nome ?? rasc.grupo ?? GRUPO_RECEITA
      const campos = {
        nome: rasc.nome.trim(),
        grupo: grupoValido,
        natureza: 'Receita' as const,
        aceitavelMensal: 0,
        esperadoMensal: paraNumero(rasc.esperadoMensal),
        receitaFixa: true,
        contaVinculada:
          NATUREZAS_VINCULAVEIS.includes(rasc.natureza) && rasc.contaVinculada ? Number(rasc.contaVinculada) : undefined,
        icone: rasc.icone,
        iconeEstilo: rasc.iconeEstilo,
        iconeCor: rasc.iconeEstilo === 'colorido' ? undefined : rasc.iconeCor,
      }
      if (alvo?.id != null) {
        await db.categorias.update(alvo.id, { ...campos, ativa: true })
      } else {
        await db.categorias.add({ ...marcaDoAmbiente(), ...campos, ativa: true })
      }
      void marcarCategoriasEditadas()
      aoGravar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      setSalvando(false)
    }
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <h1>Primeiro acesso</h1>
        <p className="ideal-t4" style={{ margin: '4px 0 0', color: 'var(--azul)', fontWeight: 600 }} data-testid="primeiro-acesso-passo">
          Passo 1 de 3 — sua receita fixa
        </p>
      </div>

      <div className="cartao" data-testid="primeiro-acesso-orientacao">
        <h2 className="ideal-t2" style={{ margin: '0 0 6px' }}>Você precisa ter uma receita fixa</h2>
        <p className="texto-quebra" style={{ margin: '0 0 8px' }}>
          Tudo no {NOME_PRODUTO} é calculado a partir dela: as metas dos grupos são percentuais
          da receita fixa do mês. A categoria <strong>{NOME_CATEGORIA_RECEITA_FIXA}</strong> já
          está aqui, marcada como receita fixa — informe quanto você espera receber por mês.
        </p>
        <p className="texto-fraco texto-quebra" style={{ margin: 0 }}>
          Mesmo que o valor varie de um mês pro outro, coloque um valor de referência. Dá
          pra ajustar depois em Configurações → Categorias, Grupos e Metas.
        </p>
      </div>

      <div className="cartao" data-testid="primeiro-acesso-form">
        <CamposCategoria rasc={rasc} setRasc={setRasc} gruposAtivos={gruposAtivos} contasVinculaveis={contasVinculaveis} />
        {(erro ?? pendencia) && (
          <p className="valor-neg texto-quebra" style={{ margin: '10px 0 0', fontSize: 12.5 }} data-testid="primeiro-acesso-pendencia">
            {erro ?? pendencia}
          </p>
        )}
        <div className="acoes-modal">
          <button
            type="button"
            className="primario"
            data-testid="primeiro-acesso-gravar"
            disabled={salvando || pendencia != null}
            onClick={() => void gravar()}
          >
            Gravar e ir para o passo 2
          </button>
        </div>
      </div>
    </>
  )
}
