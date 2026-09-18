/* RESTAURAR PADRÃO DE FÁBRICA — build 099 (18/09/2026).
 *
 * Pedido do Rafael, literal: *"Não pode ter mais o botão apagar tudo, pois o
 * passo a passo do primeiro acesso trava na primeira etapa de definir receita
 * visto não ter grupo cadastrado (...) então eliminar o botão 'Apagar Tudo' e
 * revisar o botão Limpar Lançamentos pra que ele apenas limpe mas mantenha
 * cadastro de contas, categorias e grupos e metas, crie um botão par dele que
 * seja 'Restaurar Padrão de Fábrica', esse sim além de fazer o que o Limpar
 * faz, ele restaura cadastros conforme modelo padrão definido pela Morfo
 * naquele momento para Cadastros de Grupos e Categ, ícones, cores, e redefine
 * o cadastro de contas e carteira no modelo inicial com apenas conta cofrinho
 * padrão e zerada e banco modelo tbm zerado, mas tudo sem metas, nem
 * lançamentos fazendo que o usuário tenha que iniciar do zero com o passo a
 * passo como primeiro acesso, inclusive deve deslogar quando esse botão
 * terminar o processamento."*
 *
 * O QUE "APAGAR TUDO" FAZIA DE ERRADO: zerava as 12 tabelas, inclusive
 * grupos e categorias — e o passo 1 do primeiro acesso (a receita fixa)
 * precisa de um grupo de entrada pra gravar a categoria "Salário". Sem grupo,
 * a pessoa ficava presa numa tela sem saída. A fábrica nunca é "vazio": é o
 * cadastro-modelo da Morfo.
 *
 * O QUE ESTA ROTINA FAZ, nesta ordem, só no ambiente deste aparelho:
 *   1. apaga lançamentos, saldos informados, notificações e aprendizados de
 *      notificação — tudo que é HISTÓRICO da pessoa;
 *   2. apaga grupos, categorias e metas, e aplica o padrão da Morfo
 *      (`restaurarCategoriasEGruposPadrao`: o publicado pelo N0 quando existe,
 *      senão o de fábrica de `seed.ts`) — nome, grupo, natureza, ícone, cor e
 *      o percentual de cada grupo (parte do cadastro-modelo); nenhuma
 *      categoria nasce com valor de meta ou de receita esperada;
 *   3. apaga as contas e cria as duas do modelo inicial: "Banco Modelo"
 *      (corrente, zerada) e o Cofrinho padrão (zerado, `cofrinhoPadrao`);
 *   4. desmarca as flags do onboarding (`boasVindasVistas`,
 *      `primeiroAcessoConcluido`, `tourConviteFeito`) e a marca de "cadastro
 *      editado pelo dono" — a pessoa recomeça pelas boas-vindas e pelo passo
 *      a passo, exatamente como numa instalação nova.
 * Usuários (a senha de entrada), planos e as configurações de aparência
 * (tema, zoom, pacote de ícones, layout dos menus) FICAM: nada disso é
 * cadastro financeiro, e é a mesma credencial que a pessoa usa pra entrar de
 * novo depois do logout. Quem chama (Manutenção) limpa o cache e faz o
 * logout em seguida.
 */
import { db } from './db'
import { ambienteDoBanco, doAmbiente, marcaDoAmbiente } from './ambiente'
import { restaurarCategoriasEGruposPadrao } from './kit/padraoCategorias'
import { contasDoModeloInicial } from './contasCofrinho'
import { salvarConfiguracaoIcones } from './configuracaoIcones'
import { hojeEfetivoISO } from './hojeSimulado'

export interface ResultadoFabrica {
  lancamentos: number
  saldosInformados: number
  notificacoes: number
  aprendizados: number
  contas: number
  categorias: number
  grupos: number
  metas: number
  /** O que o padrão criou. */
  criados: { grupos: number; categorias: number; origem: 'morfo' | 'fabrica' }
}

/** Apaga só os registros DESTE ambiente de uma tabela; devolve quantos eram. */
async function apagarDoAmbiente<T extends { id?: number; ambienteId?: string }>(
  tabela: { toArray: () => Promise<T[]>; bulkDelete: (ids: number[]) => Promise<void> },
  amb: string,
): Promise<number> {
  const ids = doAmbiente(await tabela.toArray(), amb)
    .map((x) => x.id)
    .filter((id): id is number => id != null)
  if (ids.length) await tabela.bulkDelete(ids)
  return ids.length
}

/** Só a parte "Limpar dados": lançamentos e o que depende deles. */
export async function limparLancamentosEHistorico(): Promise<{ lancamentos: number; notificacoes: number; saldosInformados: number }> {
  const amb = await ambienteDoBanco()
  let r = { lancamentos: 0, notificacoes: 0, saldosInformados: 0 }
  await db.transaction('rw', [db.lancamentos, db.notificacoesPendentes, db.saldosInformados], async () => {
    r = {
      lancamentos: await apagarDoAmbiente(db.lancamentos, amb),
      notificacoes: await apagarDoAmbiente(db.notificacoesPendentes, amb),
      saldosInformados: await apagarDoAmbiente(db.saldosInformados, amb),
    }
  })
  return r
}

export async function restaurarPadraoDeFabrica(): Promise<ResultadoFabrica> {
  const amb = await ambienteDoBanco()
  const carimbo = marcaDoAmbiente(amb)
  const hoje = hojeEfetivoISO()
  const r: ResultadoFabrica = {
    lancamentos: 0, saldosInformados: 0, notificacoes: 0, aprendizados: 0,
    contas: 0, categorias: 0, grupos: 0, metas: 0,
    criados: { grupos: 0, categorias: 0, origem: 'fabrica' },
  }
  await db.transaction(
    'rw',
    [db.lancamentos, db.saldosInformados, db.notificacoesPendentes, db.aprendizadosNotificacao, db.contas, db.categorias, db.grupos, db.metas],
    async () => {
      r.lancamentos = await apagarDoAmbiente(db.lancamentos, amb)
      r.saldosInformados = await apagarDoAmbiente(db.saldosInformados, amb)
      r.notificacoes = await apagarDoAmbiente(db.notificacoesPendentes, amb)
      r.aprendizados = await apagarDoAmbiente(db.aprendizadosNotificacao, amb)
      r.metas = await apagarDoAmbiente(db.metas, amb)
      r.categorias = await apagarDoAmbiente(db.categorias, amb)
      r.grupos = await apagarDoAmbiente(db.grupos, amb)
      r.contas = await apagarDoAmbiente(db.contas, amb)
      await db.contas.bulkAdd(contasDoModeloInicial(carimbo, hoje))
    },
  )
  /* Fora da transação de propósito: o padrão lê `configuracoes` (a platform
     N0) antes de abrir a dele — ver o aviso em `aplicarPadrao`. */
  r.criados = await restaurarCategoriasEGruposPadrao()
  await salvarConfiguracaoIcones({
    catsEditadasPeloUsuario: false,
    contaCofrinhoPadraoRevisado: true,
    boasVindasVistas: false,
    primeiroAcessoConcluido: false,
    tourConviteFeito: false,
  })
  return r
}
