/* Onboarding invertido (13/09/2026, versão Ideal).
 *
 * O onboarding antigo abria o tour das telas na PRIMEIRA abertura do app, a
 * cada abertura, até a pessoa desligar. Explicar telas vazias não ensina nada:
 * quem abre o app pela primeira vez vê "Resumo", "Planejamento" e "Carteira"
 * sem um único número dentro — o tour descreve caixas, não o produto.
 *
 * A ordem nova é a cronológica:
 *
 *     1. BOAS-VINDAS   uma tela: o que o app faz e como ele pensa
 *     2. OS 3 PASSOS   na própria tela Hoje (ver `PrimeirosPassos`)
 *     3. TOUR          só depois, quando já existe plano e já existe o que ver
 *
 * O CONVITE DO TOUR aparece UMA VEZ, no fim do passo 2 — o primeiro momento em
 * que as telas têm conteúdo. Se a pessoa recusar, some e não volta a perguntar:
 * fica permanentemente em Configuração → Ajuda → Ver tour guiado.
 *
 * Nenhuma das duas peças volta sozinha: as duas marcas ficam no singleton
 * `db.configuracoes` (`boasVindasVistas`, `tourConviteFeito`). "Apagar tudo"
 * limpa o singleton junto, então um app genuinamente zerado recomeça do
 * começo — que é o certo.
 *
 * (Até a build 086 a versão Light mantinha o comportamento antigo — tour
 * automático a cada abertura, com "Não exibir novamente". Com o fim das
 * versões na 087, o convite abaixo passou a ser o ÚNICO caminho automático, e
 * a abertura automática deixou de existir junto com o botão dela.)
 */
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Categoria, type GrupoRegistro, type Meta } from '../db'
import { categoriasDaBaseMeta } from '../baseMeta'
import { contarDoAmbiente } from '../ambiente'
import { avaliarPassos } from './PrimeirosPassos'
import { NOME_PRODUTO } from '../kit/siteKit'

/* `useLiveQuery` devolve
   `undefined` tanto para "ainda carregando" quanto para "carregou e não existe
   registro nenhum" — e o segundo caso é justamente o de quem abre o app pela
   primeira vez, que é quando esta tela precisa aparecer. Sem distinguir os
   dois, ou a tela pisca para quem já passou por ela, ou nunca aparece para
   quem deveria vê-la (bug real já documentado no Login). */
const CARREGANDO = Symbol('carregando')

export interface EstadoOnboarding {
  /** false enquanto a configuração ainda não chegou do banco — não decida nada. */
  pronto: boolean
  boasVindasVistas: boolean
  tourConviteFeito: boolean
  /** Build 092: o passo a passo isolado do primeiro acesso já foi concluído. */
  primeiroAcessoConcluido: boolean
}

export function useEstadoOnboarding(): EstadoOnboarding {
  const cfg = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO as never)
  const pronto = (cfg as unknown) !== CARREGANDO
  const c = pronto
    ? (cfg as { boasVindasVistas?: boolean; tourConviteFeito?: boolean; primeiroAcessoConcluido?: boolean } | undefined)
    : undefined
  return {
    pronto,
    boasVindasVistas: !!c?.boasVindasVistas,
    tourConviteFeito: !!c?.tourConviteFeito,
    primeiroAcessoConcluido: !!c?.primeiroAcessoConcluido,
  }
}

/* QUANDO o plano fica "pronto" — a condição que dispara o convite do tour.
 *
 * É o momento em que a tela Hoje deixa de mostrar o cartão de 3 passos e passa
 * a mostrar os dois números: o primeiro instante em que existe o que um tour
 * possa apontar. Duas portas, porque existem dois caminhos até lá:
 *
 *   • quem está começando do zero preenche o esperado da receita fixa
 *     (`avaliarPassos`, passo 1);
 *   • quem já usa o app não tem esse campo preenchido — a base dele vem dos
 *     LANÇAMENTOS de receita fixa, que é de onde `baseMetaDoMes` lê de verdade.
 *
 * Nos dois casos o passo 2 (percentuais dos grupos somando 100%) é obrigatório:
 * sem ele não existe meta, e sem meta não existe nenhum dos dois números.
 *
 * Build 092: devolve `undefined` ENQUANTO CARREGA (categorias, grupos, metas
 * ou a contagem de receita lançada ainda não chegaram). É essa terceira
 * resposta que impede o passo a passo isolado do primeiro acesso
 * (`PrimeiroAcesso.tsx`) de abrir por um instante pra quem já tem plano —
 * "false" só quando se SABE que não há plano. Quem só precisa de sim/não
 * trata `undefined` como falso, como sempre tratou.
 */
export function usePlanoPronto(
  categorias: readonly Categoria[] | undefined,
  grupos: readonly GrupoRegistro[] | undefined,
  metas: readonly Meta[] | undefined,
): boolean | undefined {
  const idsBase = (categorias ? categoriasDaBaseMeta(categorias as Categoria[]) : [])
    .map((c) => c.id)
    .filter((id): id is number => id != null)
  const chave = idsBase.join(',')
  /* A resposta carrega a CHAVE com que foi calculada: quando a lista de
     categorias chega e a chave muda, `useLiveQuery` continua devolvendo o
     resultado ANTERIOR (o da chave vazia, 0) até a consulta nova terminar —
     e um 0 momentâneo diria "sem receita lançada" pra quem tem 827
     lançamentos. Foi exatamente o que o t092 pegou: a base de demonstração
     caía no passo a passo do primeiro acesso ao recarregar. Só vale a
     resposta cuja chave é a atual; o resto é "carregando". */
  const resposta = useLiveQuery(async () => {
    const n = chave
      ? await contarDoAmbiente(db.lancamentos.where('categoriaId').anyOf(chave.split(',').map(Number)).toArray())
      : 0
    return { chave, n }
  }, [chave])
  const receitaLancada = resposta && resposta.chave === chave ? resposta.n : undefined
  if (!categorias || !grupos || !metas || receitaLancada === undefined) return undefined
  const p = avaliarPassos(categorias, grupos, metas)
  return p.percentuaisOk && (p.receitaOk || receitaLancada > 0)
}

/** A tela de abertura. Ocupa o app inteiro — não há nada por trás a ver ainda.
 *
 * Build 092: o resumo passou a descrever o passo a passo ISOLADO que vem em
 * seguida (`PrimeiroAcesso.tsx`) — pedido do Rafael: "esse passo a passo deve
 * ficar claro na primeira tela onde mostra o resumo dos primeiros passos".
 * `planoPronto` muda só a última frase: quem já tem plano (base restaurada,
 * instalação antiga) não vai passar pelo passo a passo, e a tela não pode
 * prometer um passo que não vai acontecer. */
export default function BoasVindas({ aoComecar, planoPronto = false }: { aoComecar: () => void; planoPronto?: boolean }) {
  return (
    <div className="boas-vindas" data-testid="boas-vindas">
      <div className="boas-vindas-corpo">
        <h1 className="ideal-t1" style={{ margin: '0 0 6px' }}>
          Bem-vindo ao {NOME_PRODUTO}
        </h1>
        <p className="ideal-t3 texto-quebra" style={{ margin: '0 0 22px', color: 'var(--azul)' }}>
          Aqui o dinheiro se controla por um plano — não pelo extrato.
        </p>

        <Linha
          n={1}
          titulo="Cadastre sua receita fixa"
          texto="A categoria Salário já vem pronta: você só informa quanto recebe por mês. Mesmo que varie, é a base de todo o cálculo."
        />
        <Linha
          n={2}
          titulo="Divida seu dinheiro em grupos"
          texto="Como dividir a receita, por percentual — já vem sugerido 50% para o fixo, 30% para o variável e 20% para investir. Dá pra criar, editar ou ajustar os grupos aqui."
        />
        <Linha
          n={3}
          titulo="Diga onde seu dinheiro está"
          texto="Conta do banco, cartão e cofrinho — com o saldo que já havia em cada um e desde quando. É isso que faz a Carteira bater com o banco."
        />
        <Linha
          n={4}
          titulo="Ajuste categorias e metas"
          texto="Cada categoria tem sua meta dentro do grupo — pode ajustar agora ou deixar pra depois, em Configurações."
        />
        <Linha
          n={5}
          titulo="O Planejamento abre e o app compara o real com o plano"
          texto="Todo dia, em dois números: o que está livre de verdade e o quanto ainda dá para economizar até o fim do mês."
        />

        <p className="ideal-t4 texto-quebra" style={{ margin: '18px 0 0' }} data-testid="boas-vindas-rodape">
          {planoPronto
            ? 'Seu plano já está montado — toque em Começar e o app abre direto.'
            : 'Os passos 1, 2, 3 e 4 são obrigatórios e vêm em seguida, um de cada vez (o 4º dá pra pular). O resto do app só abre depois deles — e dá pra refazer quando quiser, em Configuração → Ajuda.'}
        </p>
      </div>

      <button
        type="button"
        className="primario"
        data-testid="boas-vindas-comecar"
        onClick={aoComecar}
        style={{ width: '100%', flexShrink: 0 }}
      >
        Começar
      </button>
    </div>
  )
}

function Linha({ n, titulo, texto }: { n: number; titulo: string; texto: string }) {
  return (
    <div className="passo-linha" style={{ alignItems: 'flex-start' }}>
      <span className="passo-numero">{n}</span>
      <div className="passo-texto">
        <div className="ideal-t3">{titulo}</div>
        <div className="ideal-t4 texto-quebra">{texto}</div>
      </div>
    </div>
  )
}

/** O convite do tour — uma vez só, quando o plano fica pronto. */
export function ConviteTour({
  aoAceitar,
  aoRecusar,
}: {
  aoAceitar: () => void
  aoRecusar: () => void
}) {
  return (
    <div className="modal-fundo" data-testid="convite-tour">
      <div className="modal-conteudo" style={{ maxWidth: 340 }}>
        <h2 className="ideal-t2" style={{ margin: '0 0 8px' }}>
          Seu plano está montado
        </h2>
        <p className="ideal-t4 texto-quebra" style={{ margin: '0 0 16px' }}>
          Agora as telas têm o que mostrar. Quer um passo a passo rápido por elas?
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            className="primario"
            data-testid="convite-tour-sim"
            onClick={aoAceitar}
            style={{ flex: 1, marginTop: 0 }}
          >
            Ver agora
          </button>
          <button
            type="button"
            data-testid="convite-tour-nao"
            onClick={aoRecusar}
            style={{ flex: 1, marginTop: 0 }}
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  )
}
