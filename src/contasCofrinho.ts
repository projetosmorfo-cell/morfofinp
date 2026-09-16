/* O COFRINHO COMO CONTA DE VERDADE (build 086, 16/09/2026).
 *
 * ------------------------------------------------------------------
 * A PERGUNTA DO RAFAEL, e a causa real
 *
 *   *"Porque na carteira o cofrinho aparece mas no cadastro de contas ele não
 *   aparece?"*
 *
 * Não era bug de tela: eram DUAS coisas diferentes com o mesmo nome, e só uma
 * delas é uma conta.
 *
 *   1. O card "Cofrinho" da Carteira é VIRTUAL. `Carteira.tsx` o desenha
 *      direto no código (`setSelecionado('cofrinho')`), e o saldo dele é uma
 *      soma por NATUREZA sobre o histórico inteiro — tudo que é `Aporte`
 *      menos tudo que é `Gasto de cofrinho`. Ele nunca foi um registro em
 *      `db.contas`, então a tela de cadastro (que lê exatamente essa tabela)
 *      jamais teve o que listar. O id dele nem é um id: é o sentinela
 *      `COFRINHO_VIRTUAL_ID = -1` de `SaldoDoCofrinho.tsx`.
 *   2. Uma conta de `tipo: 'cofre'` é uma `Conta` normal — aparece nos dois
 *      lugares, sempre apareceu.
 *
 * Isso vem da decisão de 30/08/2026, registrada no CLAUDE.md: o cofrinho
 * histórico do Rafael nunca teve conta própria porque cada Aporte/Gasto de
 * cofrinho carrega o `contaId` da conta REAL de onde o dinheiro saiu
 * (Bradesco, cartão) — é assim que aconteceu de verdade. Migrar aquilo para
 * um `contaId` de cofre exigiria REESCREVER lançamentos reais e perderia a
 * informação de qual conta motorizou cada aporte. Essa história é intocável.
 *
 * ------------------------------------------------------------------
 * BUILD 087 — O QUE A 086 AINDA NÃO RESOLVIA
 *
 * Rafael, depois de testar a 086: *"O cofrinho padrão não aparece no cadastro
 * de Contas, somente aparece o que eu cadastrei, mas na tela principal de
 * Contas aparece o meu e o outro padrão, ele deve aparecer no cadastro para
 * manutenção pelo menos de ícone, o resto dos campos pode deixar bloqueado
 * (somente no Cofrinho padrão)"*.
 *
 * CAUSA REAL, medida antes de mexer: a migração da 086 só criava a conta
 * quando a instalação não tinha NENHUMA conta de tipo 'cofre'
 * (`contas.some(c => c.tipo === 'cofre')` → `return`). A instalação do Rafael
 * já tinha o cofrinho que ele mesmo cadastrou, então nada foi criado — e o
 * "cofrinho padrão" que ele vê na Carteira nunca foi um registro: é o CARD
 * VIRTUAL, desenhado direto no código de `Carteira.tsx`, com o sentinela
 * `COFRINHO_VIRTUAL_ID = -1`. Não era filtro de tela, nem `ativa`, nem
 * ambiente: o cadastro lê `db.contas` e ali não havia linha nenhuma para
 * aquele card. A verificação da 086 passou porque rodou numa base SEM cofre,
 * onde a conta era criada — o caso do Rafael é exatamente o outro ramo.
 *
 * COMO FICOU: a conta padrão passa a existir SEMPRE, marcada com
 * `cofrinhoPadrao`, independentemente de já haver outros cofrinhos. Ela é o
 * registro do card virtual — a Carteira passa a ler dela o nome e o ícone, e
 * deixa de desenhar esse card duas vezes. Só o ícone (e o nome) são
 * editáveis: o resto não teria efeito nenhum, porque o saldo daquele card vem
 * da soma por natureza, não do `contaId` dela.
 *
 * ------------------------------------------------------------------
 * O QUE ESTA MIGRAÇÃO FAZ — e o que ela deliberadamente NÃO faz
 *
 * FAZ: garante que exista UMA conta marcada `cofrinhoPadrao`. Aditivo puro,
 * na disciplina das migrações de `gruposUtil.ts`: marca própria
 * (`contaCofrinhoPadraoRevisado`), roda uma vez e nunca mais.
 *
 * ADOTA ANTES DE CRIAR. Quem já rodou a build 086 numa base sem cofre ganhou
 * uma conta "Cofrinho" criada por aquela migração; criar outra agora deixaria
 * duas linhas iguais no cadastro. Então esta migração ADOTA uma conta de
 * cofre existente como padrão quando ela atende aos três critérios juntos:
 * chama-se exatamente "Cofrinho", nenhuma outra já é a padrão, e **não tem
 * lançamento nenhum apontando para ela**. O terceiro é o que protege o
 * usuário: um cofrinho que a pessoa criou e usa TEM lançamentos, então nunca
 * é adotado nem travado. Sobra o caso de alguém ter criado à mão um cofrinho
 * chamado "Cofrinho" e nunca ter usado — aí as duas contas são
 * indistinguíveis por qualquer critério honesto, e adotar é o resultado menos
 * surpreendente (ela continua no cadastro e na Carteira, só com os campos
 * travados), bem melhor que exibir duas "Cofrinho".
 *
 * NÃO FAZ: não toca em lançamento nenhum, não reatribui `contaId`, não apaga
 * nem inativa nada, e não aposenta o card virtual da Carteira — ele continua
 * somando o histórico por natureza, que é o número correto para o dinheiro
 * que nunca passou por uma conta de cofre.
 *
 * ------------------------------------------------------------------
 * A PROTEÇÃO DO ÚLTIMO COFRINHO
 *
 * Mesma forma do `contaAdminsAtivos()` do Kit (`kitPlatform.ts`), que impede
 * demover ou inativar o último administrador: conta quantos restam ATIVOS e
 * bloqueia a ação que zeraria o conjunto. Criar mais cofrinhos continua
 * livre; editar o existente continua livre. O que não pode é a instalação
 * ficar sem nenhum — inclusive pelo caminho indireto de TROCAR O TIPO do
 * último de 'cofre' para outra coisa, que some tanto quanto excluir.
 */
import { db, type Conta } from './db'
import { ambienteDoBanco, doAmbiente, marcaDoAmbiente } from './ambiente'
import { salvarConfiguracaoIcones } from './configuracaoIcones'
import { hojeEfetivoISO } from './hojeSimulado'

/** Nome da conta criada pela migração quando a instalação não tem nenhuma. */
export const COFRINHO_PADRAO_NOME = 'Cofrinho'

/**
 * Esta conta é o cofrinho PADRÃO — o registro do card virtual da Carteira?
 * Só ela tem campo travado no cadastro; cofrinho criado pelo usuário é
 * editável por inteiro.
 */
export function ehCofrinhoPadrao(conta: Pick<Conta, 'cofrinhoPadrao'> | undefined | null): boolean {
  return !!conta?.cofrinhoPadrao
}

/** A conta padrão dentro de uma lista já carregada (ou `undefined`). */
export function acharCofrinhoPadrao(contas: readonly Conta[] | undefined): Conta | undefined {
  return (contas ?? []).find((c) => c.cofrinhoPadrao)
}

/* A frase que o cadastro mostra ao lado dos campos travados. Uma linha: diz o
   que dá pra mudar e POR QUE o resto não dá — sem isso o bloqueio parece
   defeito (mesma disciplina do aviso do último cofrinho). */
/* A frase do bloqueio de AÇÃO (excluir, inativar, trocar o tipo) no cofrinho
   padrão — separada do motivo dos campos travados porque responde outra
   pergunta: ali é "por que não dá pra editar", aqui é "por que não dá pra
   tirar". */
export const AVISO_COFRINHO_PADRAO_FIXO =
  'O cofrinho padrão do app não pode ser excluído, inativado nem mudar de tipo — ele é o registro do cofrinho que a Carteira soma pelos lançamentos. Você pode trocar o nome e o ícone dele.'

export const MOTIVO_COFRINHO_PADRAO_TRAVADO =
  'Este é o cofrinho padrão do app: o saldo dele é somado pelos lançamentos de aporte, não por uma conta. Dá pra trocar o nome e o ícone; o resto fica travado.'

/**
 * Quantas contas de cofrinho ATIVAS existem. É a régua da proteção do último
 * — mesma ideia de `contaAdminsAtivos()`.
 */
export function contaCofrinhosAtivos(contas: readonly Conta[] | undefined): number {
  return (contas ?? []).filter((c) => c.tipo === 'cofre' && c.ativa).length
}

/**
 * Esta conta é o ÚLTIMO cofrinho ativo? Enquanto for, ela não pode ser
 * inativada, excluída, nem ter o tipo trocado para algo que não é cofre.
 */
export function ehUltimoCofrinho(conta: Conta, contas: readonly Conta[] | undefined): boolean {
  return conta.tipo === 'cofre' && conta.ativa && contaCofrinhosAtivos(contas) <= 1
}

/** A frase única do bloqueio — a mesma nos três caminhos que ele cobre. */
export const AVISO_ULTIMO_COFRINHO =
  'O app precisa de pelo menos um cofrinho. Cadastre outro antes de mexer neste.'

/**
 * Garante que existe ao menos uma conta de cofrinho. Aditiva, com marca
 * própria, nunca toca em lançamento — ver o cabeçalho deste arquivo.
 *
 * Devolve o id da conta criada, ou `null` quando não havia nada a fazer.
 */
export async function garantirContaCofrinho(): Promise<number | null> {
  const config = await db.configuracoes.get(1)
  if (config?.contaCofrinhoPadraoRevisado) return null

  const amb = await ambienteDoBanco()
  let alvo: number | null = null
  await db.transaction('rw', db.contas, db.lancamentos, async () => {
    const contas = doAmbiente(await db.contas.toArray(), amb)
    if (contas.some((c) => c.cofrinhoPadrao)) return

    /* ADOÇÃO — ver o cabeçalho deste arquivo. Uma conta de cofre chamada
       "Cofrinho" e SEM nenhum lançamento apontando pra ela só pode ser a que a
       build 086 criou (ela nasceu assim e nada reatribui `contaId`); um
       cofrinho de verdade, usado pela pessoa, tem movimento e nunca cai aqui. */
    const lancamentos = doAmbiente(await db.lancamentos.toArray(), amb)
    const temMovimento = new Set(lancamentos.map((l) => l.contaId))
    const adotavel = contas.find(
      (c) => c.tipo === 'cofre' && c.nome.trim() === COFRINHO_PADRAO_NOME && !temMovimento.has(c.id!),
    )
    if (adotavel) {
      await db.contas.update(adotavel.id!, { cofrinhoPadrao: true })
      alvo = adotavel.id!
      return
    }

    const id = await db.contas.add({
      ...marcaDoAmbiente(amb),
      nome: COFRINHO_PADRAO_NOME,
      tipo: 'cofre',
      instituicao: COFRINHO_PADRAO_NOME,
      saldoInicial: 0,
      dataSaldoInicial: hojeEfetivoISO(),
      importavel: false,
      ativa: true,
      cofrinhoPadrao: true,
    })
    alvo = id as number
  })
  await salvarConfiguracaoIcones({ contaCofrinhoPadraoRevisado: true })
  return alvo
}
