import { db, type Lancamento } from '../db'
import { uid } from './kitBase'
import { addDays, todayISO, ehTenantDeTeste, lerPlatformN0Persistida, salvarPlatformN0, type DevUserN0, type PlatformN0, type TenantKit } from './kitPlatform'
import type { PlanoRegistro } from '../db'
import { doAmbiente, marcaDoAmbiente, ambienteAtivoId, AMBIENTE_DESTE_APARELHO } from '../ambiente'
import { prepararAmbiente } from './padraoCategorias'

// Massa de dados fictícios e limpeza em massa (10/09/2026, Decisão 55 —
// Parte B). Transcrição adaptada do Projeto Modelo:
// `gerarPlanosFicticios`/`gerarEmpresasFicticias`/`gerarUsuariosMorfoFicticios`
// (usadas pelo grupo "testeAdm") e `gerarAmbienteTeste` (grupo "teste").
//
// ADAPTAÇÃO CENTRAL, registrada (G44 regra 3 — a MECÂNICA é a do Kit, o
// DADO é o do produto): o Kit popula `tenant.env.entidadesA` (registros de
// "Entidade A", o domínio de locação dele). O MorfoFinP não tem "Entidade
// A" — o dado operacional de um ambiente aqui é o LANÇAMENTO financeiro,
// que para o tenant real (`t0`) vive no Dexie do próprio aparelho, não
// dentro do objeto do tenant. Por isso:
//   • massa gerada no tenant REAL cria lançamentos de verdade no Dexie,
//     todos marcados `ficticio: true` — isso é MAIS seguro que o Kit (lá os
//     registros de massa do cliente nascem sem marca nenhuma) e é o que
//     permite "Limpar Dados Testes Cliente" apagar exatamente eles depois;
//   • massa gerada num tenant FICTÍCIO grava a contagem no `env` do próprio
//     tenant (eles não têm banco próprio — são cadastros de demonstração do
//     painel N0), que é o que as telas de limpeza leem pra mostrar volume.
// A trava do Kit ("só ambiente VAZIO recebe massa") foi mantida literal —
// é justamente ela que impede misturar massa fictícia com os lançamentos
// reais do Rafael sem perceber.

/* ---- Projeto Modelo (`tenantTemRegistros`) ----
   12/09/2026 (item 23): a contagem agora vem POR AMBIENTE. Antes, um cliente
   recém-cadastrado aparecia travado ("já tem registro") só porque o ambiente
   do aparelho tinha lançamentos — foi exatamente o que o Rafael relatou. */
export function tenantTemRegistros(t: TenantKit, porAmbiente: Record<string, number>) {
  return (porAmbiente[t.id] ?? 0) > 0
}

/** Quantos lançamentos existem em cada ambiente — chave = id do tenant. */
export async function contarLancamentosPorAmbiente(): Promise<Record<string, number>> {
  const todos = await db.lancamentos.toArray()
  const mapa: Record<string, number> = {}
  for (const l of todos) {
    const amb = l.ambienteId || AMBIENTE_DESTE_APARELHO
    mapa[amb] = (mapa[amb] ?? 0) + 1
  }
  return mapa
}

/** Quantos lançamentos FICTÍCIOS existem em cada ambiente. */
export async function contarFicticiosPorAmbiente(): Promise<Record<string, number>> {
  const todos = await db.lancamentos.toArray()
  const mapa: Record<string, number> = {}
  for (const l of todos) {
    if (!l.ficticio) continue
    const amb = l.ambienteId || AMBIENTE_DESTE_APARELHO
    mapa[amb] = (mapa[amb] ?? 0) + 1
  }
  return mapa
}

/* ---- Projeto Modelo (`gerarPlanosFicticios`) ---- */
export function gerarPlanosFicticios(): Omit<PlanoRegistro, 'id'>[] {
  return [
    { nome: 'Bronze (teste)', valorMensal: 49, funcionalidades: ['Plano fictício de teste', 'Gerado pela massa de dados'], ativo: true, ficticio: true },
    { nome: 'Prata (teste)', valorMensal: 99, funcionalidades: ['Plano fictício de teste', 'Gerado pela massa de dados'], ativo: true, ficticio: true },
    { nome: 'Ouro (teste)', valorMensal: 199, destaque: false, funcionalidades: ['Plano fictício de teste', 'Gerado pela massa de dados'], ativo: true, ficticio: true },
  ]
}

const NOMES_EMPRESA = ['Alfa', 'Beta', 'Gama', 'Delta', 'Ômega', 'Ápice', 'Norte', 'Sul', 'Vale', 'Cume', 'Ponte', 'Prisma', 'Vetor', 'Órbita', 'Aurora', 'Zênite']
const SOBRENOMES = ['Lima', 'Souza', 'Prado', 'Nogueira', 'Camargo', 'Batista', 'Teixeira', 'Moraes', 'Vieira', 'Antunes']
const PRIMEIROS = ['Marina', 'Otávio', 'Helena', 'Bruno', 'Tereza', 'Igor', 'Lívia', 'Caio', 'Sofia', 'Murilo']

/* ---- Kit L1866 (`gerarEmpresasFicticias`): empresas de teste com
   mensalidade de até 12 meses, mix de situações e conversa de chat.
   RECONFERIDO em 11/09/2026: o Projeto Modelo hoje gira entre 6 situações
   (pagante/trial/bloqueada/encerrando/pré-cadastro/encerrada, achado desta
   rodada — antes eram só 4 aqui, faltavam "pré-cadastro" e "encerrada"). As
   duas que faltavam testam telas reais do MorfoFinP que sem elas nunca
   recebiam dado de teste: o alerta de "pendente de liberação" em
   DevInicioScreen (`onboarding: 'pendente_liberacao'`) e uma assinatura já
   encerrada de verdade (não só "encerrando"), com o registro de auditoria
   correspondente em `accessLog`. Trazido agora — mesma trava de sempre (só
   gera em base vazia), nenhum dado real é tocado. ---- */
export function gerarEmpresasFicticias(qtd: number, planosFic: { id?: number; valorMensal: number }[], offset: number): TenantKit[] {
  const hoje = todayISO()
  const SITUACOES = ['pagante', 'trial', 'bloqueada', 'encerrando', 'precadastro', 'encerrada'] as const
  return Array.from({ length: qtd }, (_, i) => {
    const n = offset + i + 1
    const nome = `${NOMES_EMPRESA[n % NOMES_EMPRESA.length]} ${['Comércio', 'Serviços', 'Indústria', 'Log'][n % 4]} ${n} (teste)`
    const situacao = SITUACOES[n % SITUACOES.length]
    const plano = planosFic.length ? planosFic[n % planosFic.length] : null
    const valor = plano ? plano.valorMensal : [79, 129, 199, 249][n % 4]
    const meses = 3 + (n % 10)
    const installments = Array.from({ length: meses }, (_, m) => {
      const due = addDays(hoje, -30 * (meses - m))
      const pago = m < meses - 1
      return { id: uid(), dueDate: due, amount: valor, paid: pago, paidDate: pago ? due : null, method: m % 2 ? 'pix' : 'cartao_credito' }
    })
    const t: TenantKit = {
      id: uid(),
      companyName: nome,
      ownerName: `${PRIMEIROS[n % PRIMEIROS.length]} ${SOBRENOMES[n % SOBRENOMES.length]}`,
      phone: `(11) 9${String(80000000 + n * 137).slice(0, 8)}`,
      hasWhatsapp: true,
      email: `contato${n}@exemplo-teste.com.br`,
      createdAt: addDays(hoje, -30 * meses),
      plan: situacao === 'trial' ? 'trial' : 'pagante',
      planId: plano?.id != null ? String(plano.id) : null,
      manualBlock: situacao === 'bloqueada',
      onboarding: situacao === 'precadastro' ? 'pendente_liberacao' : 'completo',
      /* Achado 11/09/2026 (reconciliação `kitPlatform.ts`, housekeeping):
         se este campo não fosse gravado, `onboardingSince` cairia no
         fallback `createdAt` — que pra esta situação fica 90-360 dias no
         passado (ver `createdAt` acima), vencendo o prazo padrão de 15 dias
         no instante seguinte à geração e encerrando o tenant fictício antes
         do admin sequer ver o alerta "pendente de liberação" que ele existe
         pra testar. Gravado como "hoje" — igual um pré-cadastro de verdade,
         que nasce pendente no dia em que é criado. */
      onboardingSince: situacao === 'precadastro' ? hoje : undefined,
      trial: situacao === 'trial' ? { days: 15, startDate: addDays(hoje, -(n % 20)) } : null,
      billing: situacao === 'trial' ? null : { monthlyValue: valor, dueDay: 5 + (n % 20), toleranceDays: 5, installments },
      cancellation:
        situacao === 'encerrando' ? { accessUntil: addDays(hoje, 20 + (n % 10)) }
        : situacao === 'encerrada' ? { accessUntil: addDays(hoje, -(5 + (n % 30))) }
        : null,
      accessLog:
        situacao === 'encerrada'
          ? [{ id: uid(), ts: new Date().toISOString(), action: 'Assinatura encerrada pelo cliente (dado fictício de teste)' }]
          : [],
      supportAuthorized: n % 2 === 0,
      supportMessages: n % 3 === 0 ? [
        { id: uid(), from: 'cliente', text: 'Bom dia! Tenho uma dúvida sobre a cobrança deste mês.', ts: addDays(hoje, -(2 + (n % 5))) + 'T09:30:00' },
        { id: uid(), from: 'suporte', text: 'Bom dia! Já estou verificando e te retorno ainda hoje.', ts: addDays(hoje, -(2 + (n % 5))) + 'T09:41:00' },
      ] : [],
      chatLastReadTenant: null,
      chatLastReadMorfo: null,
      users: [{ id: uid(), name: `${PRIMEIROS[n % PRIMEIROS.length]} ${SOBRENOMES[n % SOBRENOMES.length]}`, login: `teste${n}`, senha: '1234', status: 'ativo', perfilId: 'admin', createdAt: addDays(hoje, -30 * meses) }],
      userLimit: 3,
      ficticio: true,
    }
    return t
  })
}

/* ---- Projeto Modelo (`gerarUsuariosMorfoFicticios`) ---- */
export function gerarUsuariosMorfoFicticios(qtd: number, offset: number): DevUserN0[] {
  return Array.from({ length: qtd }, (_, i) => {
    const n = offset + i + 1
    const nome = `${PRIMEIROS[n % PRIMEIROS.length]} ${SOBRENOMES[(n + 3) % SOBRENOMES.length]}`
    return {
      id: uid(), name: `${nome} (teste)`, login: `morfoteste${n}`, senha: '1234',
      email: `morfoteste${n}@morfo.local`, phone: `(11) 9${String(70000000 + n * 211).slice(0, 8)}`,
      status: 'ativo', perfilId: ['admin', 'financeiro', 'negocios', 'atendente'][n % 4], createdAt: todayISO(), ficticio: true,
    }
  })
}

/* ---- Projeto Modelo (`gerarAmbienteTeste`): massa DENTRO do ambiente de um
   cliente. Para o tenant real, isso são lançamentos de verdade no Dexie
   (marcados `ficticio: true`); para um tenant de demonstração do painel, é
   a contagem no `env` dele (ver ADAPTAÇÃO no topo). ---- */
/* Massa REALISTA (12/09/2026, item 23 do Rafael, verbatim: "gerar testes no
   cliente deveria gerar uma massa de dados mais realista, com uma receita de
   5 mil, com aceitáveis estourando e outros sobrando, metas dentro e outras
   estouradas, com recorrentes, com parcelas em andamento e futuras" — e
   "tamanho do ambiente deveria escolher também quantos meses pra trás e pra
   frente, e a quantidade seria aplicada por mês").

   Como a calibragem é feita (nada é aleatório — o resultado tem que ser
   previsível pra servir de teste):
   1. RECEITA fixa de R$ 5.000/mês, como uma série FIXA de verdade (salário).
   2. Cada GRUPO orçamentável recebe um alvo de gasto derivado da META dele
      (percentual × receita, a mesma conta do app): grupos de índice PAR
      ficam acima da meta (estouram), ÍMPAR ficam abaixo (sobra) — então
      sempre existem os dois casos na tela de Planejamento.
   3. Dentro do grupo, o alvo é dividido entre as categorias com peso
      alternado sobre o `aceitavelMensal` de cada uma (1,35 × / 0,65 ×): o
      mesmo contraste "estourou × sobrou" aparece também no nível CATEGORIA.
   4. Dos lançamentos de cada mês, parte vira série FIXA (mesmo valor, mesmo
      `serieId`, todo mês) e parte vira PARCELA de uma compra em 6× que
      começa antes de hoje — então há parcela já paga, parcela do mês e
      parcelas futuras ao mesmo tempo.
   5. `pago` segue a data: o que é até hoje entra como pago; o que é depois
      fica em aberto (é isso que alimenta "vai entrar/vai sair" e o status
      "A pagar"). */

const DESCRICOES_TESTE = ['Mercado (teste)', 'Combustível (teste)', 'Farmácia (teste)', 'Restaurante (teste)', 'Transporte (teste)', 'Padaria (teste)', 'Feira (teste)', 'Serviço avulso (teste)']
export const RECEITA_MENSAL_TESTE = 5000

/* `ambiente` (itens 13/14/15/23, 12/09/2026): em QUAL ambiente a massa entra.
   Sem isso, gerar massa "no cliente X" escrevia no mesmo balde de todo mundo —
   foi o que fez o Rafael ver os dados dele dentro de outro cliente e, ao
   limpar aquele cliente, perder o que era dele. */
export interface OpcoesMassa { porMes: number; mesesAtras: number; mesesFrente: number; ambiente?: string }

/** yyyy-mm-dd de um dia dentro do mês deslocado `desloc` meses em relação a hoje. */
function diaDoMes(base: Date, desloc: number, dia: number) {
  const d = new Date(base.getFullYear(), base.getMonth() + desloc, 1)
  const ultimo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const dd = Math.min(dia, ultimo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
}

export async function gerarLancamentosFicticios(opcoes: OpcoesMassa): Promise<number> {
  const porMes = Math.max(1, Math.round(opcoes.porMes))
  const mesesAtras = Math.max(0, Math.round(opcoes.mesesAtras))
  const mesesFrente = Math.max(0, Math.round(opcoes.mesesFrente))
  const hojeISO = todayISO()
  const hoje = new Date(hojeISO + 'T00:00:00')

  const ambiente = opcoes.ambiente ?? ambienteAtivoId()
  /* Item 14 (12/09/2026): um cliente recém-criado tem o ambiente vazio — sem
     categoria e sem conta, a massa não teria onde entrar. Prepara antes. */
  await prepararAmbiente(ambiente)
  const carimbo = marcaDoAmbiente(ambiente)
  const todasContas = doAmbiente(await db.contas.toArray(), ambiente)
  const conta = todasContas.find((c) => c.ativa && c.tipo === 'corrente') ?? todasContas.find((c) => c.ativa) ?? todasContas[0]
  if (!conta?.id) throw new Error('Nenhuma conta cadastrada — a massa de teste precisa de pelo menos 1 conta.')

  const categorias = doAmbiente(await db.categorias.toArray(), ambiente)
  const catReceita = categorias.filter((c) => c.natureza === 'Receita')
  const catGasto = categorias.filter((c) => c.natureza === 'Consumo')
  if (catReceita.length === 0 || catGasto.length === 0) throw new Error('Sem categorias de Receita/Consumo cadastradas — a massa de teste precisa das duas.')

  /* Meta de cada grupo, como o app calcula: percentual sobre a receita do mês
     (base 'receita_real') ou o valor fixo cadastrado. Sem meta cadastrada, o
     alvo cai na soma do aceitável das categorias do grupo. */
  const metas = doAmbiente(await db.metas.toArray(), ambiente)
  const metaDoGrupo = (grupo: string, aceitavelSomado: number) => {
    const m = metas.filter((x) => x.grupo === grupo).sort((a, b) => (a.mesVigencia < b.mesVigencia ? 1 : -1))[0]
    if (!m) return aceitavelSomado
    if (m.base === 'valor_fixo') return m.valorFixo ?? aceitavelSomado
    return (RECEITA_MENSAL_TESTE * m.percentual) / 100
  }

  const gruposComGasto = [...new Set(catGasto.map((c) => c.grupo))].sort()
  /* alvo mensal por categoria — passos 2 e 3 do cabeçalho.

     Achado do teste desta rodada (12/09/2026), corrigido aqui: escalar o
     grupo inteiro pela meta (que com receita de R$ 5.000 costuma ser bem
     menor que a soma dos aceitáveis cadastrados) empurrava TODA categoria
     pra baixo do aceitável — o contraste existia no nível GRUPO e sumia no
     nível CATEGORIA, que é justamente metade do pedido. Agora o piso do
     estouro é garantido: nos grupos que devem estourar, as categorias de
     índice par nunca ficam abaixo de 1,25 × o aceitável delas. */
  const alvoPorCategoria = new Map<number, number>()
  gruposComGasto.forEach((grupo, gi) => {
    const cats = catGasto.filter((c) => c.grupo === grupo && c.id != null)
    if (cats.length === 0) return
    const grupoEstoura = gi % 2 === 0
    const aceitavelSomado = cats.reduce((s, c) => s + (c.aceitavelMensal || 0), 0)
    const alvoGrupo = metaDoGrupo(grupo, aceitavelSomado) * (grupoEstoura ? 1.18 : 0.72)
    const base = cats.map((c, ci) => Math.max(1, c.aceitavelMensal || 1) * (ci % 2 === 0 ? 1.25 : 0.6))
    const somaBase = base.reduce((a, b) => a + b, 0)
    const escala = somaBase > 0 ? alvoGrupo / somaBase : 1
    cats.forEach((c, ci) => {
      let alvo = base[ci] * escala
      if (grupoEstoura && ci % 2 === 0) alvo = Math.max(alvo, (c.aceitavelMensal || 0) * 1.25)
      alvoPorCategoria.set(c.id!, Math.round(alvo))
    })
  })
  const catsComAlvo = catGasto.filter((c) => c.id != null && (alvoPorCategoria.get(c.id!) ?? 0) > 0)
  if (catsComAlvo.length === 0) throw new Error('Nenhuma categoria de gasto com meta/aceitável cadastrado — não dá pra calibrar a massa.')

  /* Série FIXA de despesa: a 1ª categoria com alvo, valor de 30% do alvo dela,
     repetido todo mês (é o que aparece como "comprometido" e como recorrente
     no app). Série PARCELADA: a 2ª categoria (ou a mesma, se só houver uma),
     compra em 6×, começando 2 meses antes de hoje. */
  const catFixa = catsComAlvo[0]
  const catParc = catsComAlvo[catsComAlvo.length > 1 ? 1 : 0]
  const valorFixoMensal = Math.max(50, Math.round((alvoPorCategoria.get(catFixa.id!) ?? 300) * 0.3))
  const PARCELAS_N = 6
  const valorParcela = Math.max(50, Math.round((alvoPorCategoria.get(catParc.id!) ?? 600) * 0.25))
  const serieSalario = uid(); const serieFixa = uid(); const serieParcela = uid()
  const parcelaInicioDesloc = -2 /* 2 meses atrás: parcelas pagas, a do mês e futuras */

  const novos: Lancamento[] = []
  const base = (iso: string, descricao: string, valor: number, categoriaId: number): Lancamento => ({
    dataCompetencia: iso, dataCaixa: iso, descricao, descricaoOriginal: descricao,
    valor, contaId: conta.id!, pagoPor: 'conta', categoriaId, status: 'manual',
    pago: iso <= hojeISO, ficticio: true,
  })

  for (let desloc = -mesesAtras; desloc <= mesesFrente; desloc++) {
    // 1) Receita do mês — série fixa de R$ 5.000
    const catSalario = catReceita[0]
    const isoSalario = diaDoMes(hoje, desloc, 5)
    novos.push({
      ...base(isoSalario, 'Salário (teste)', RECEITA_MENSAL_TESTE, catSalario.id!),
      recorrencia: 'fixo', serieId: serieSalario, periodicidade: 'mensal', regraRecorrencia: { tipo: 'diaFixo', dia: 5 },
    })

    // 2) Despesa fixa mensal — mesmo valor, mesma série
    const isoFixa = diaDoMes(hoje, desloc, 10)
    novos.push({
      ...base(isoFixa, 'Assinatura mensal (teste)', -valorFixoMensal, catFixa.id!),
      recorrencia: 'fixo', serieId: serieFixa, periodicidade: 'mensal', regraRecorrencia: { tipo: 'diaFixo', dia: 10 },
    })

    // 3) Parcela da compra em 6× (só nos meses em que a parcela existe)
    const i = desloc - parcelaInicioDesloc + 1
    if (i >= 1 && i <= PARCELAS_N) {
      const isoParc = diaDoMes(hoje, desloc, 15)
      novos.push({
        ...base(isoParc, `Compra parcelada (teste) ${i}/${PARCELAS_N}`, -valorParcela, catParc.id!),
        recorrencia: 'parcelado', serieId: serieParcela, parcelaI: i, parcelaN: PARCELAS_N,
      })
    }

    // 4) Avulsos, completando o tamanho pedido e fechando o alvo de cada categoria
    const jaGastoPorCat = new Map<number, number>()
    jaGastoPorCat.set(catFixa.id!, valorFixoMensal)
    if (i >= 1 && i <= PARCELAS_N) jaGastoPorCat.set(catParc.id!, (jaGastoPorCat.get(catParc.id!) ?? 0) + valorParcela)
    const avulsosNoMes = Math.max(catsComAlvo.length, porMes - (i >= 1 && i <= PARCELAS_N ? 3 : 2))
    const porCategoria = Math.max(1, Math.round(avulsosNoMes / catsComAlvo.length))
    catsComAlvo.forEach((c, ci) => {
      const restante = (alvoPorCategoria.get(c.id!) ?? 0) - (jaGastoPorCat.get(c.id!) ?? 0)
      if (restante <= 0) return
      const cada = Math.max(1, Math.round(restante / porCategoria))
      for (let k = 0; k < porCategoria; k++) {
        // o último lançamento da categoria fecha a diferença de arredondamento
        const valor = k === porCategoria - 1 ? restante - cada * (porCategoria - 1) : cada
        if (valor <= 0) continue
        const iso = diaDoMes(hoje, desloc, 2 + ((ci * 5 + k * 3) % 26))
        novos.push(base(iso, DESCRICOES_TESTE[(ci + k) % DESCRICOES_TESTE.length], -valor, c.id!))
      }
    })
  }

  await db.lancamentos.bulkAdd(novos.map((l) => ({ ...l, ...carimbo })))
  return novos.length
}

/* As quatro funções abaixo passaram a ser POR AMBIENTE (12/09/2026). Sem o
   parâmetro elas agem no ambiente ativo; o painel N0 sempre passa o id do
   cliente escolhido, que é o que impede "limpar o cliente X" de apagar o que
   é do cliente Y (item 23). */
export async function contarLancamentos(ambiente?: string) {
  return doAmbiente(await db.lancamentos.toArray(), ambiente ?? ambienteAtivoId()).length
}
export async function contarLancamentosFicticios(ambiente?: string) {
  return doAmbiente(await db.lancamentos.toArray(), ambiente ?? ambienteAtivoId()).filter((l) => !!l.ficticio).length
}
export async function apagarLancamentosFicticios(ambiente?: string) {
  const ids = doAmbiente(await db.lancamentos.toArray(), ambiente ?? ambienteAtivoId())
    .filter((l) => !!l.ficticio).map((l) => l.id!).filter((x) => x != null)
  await db.lancamentos.bulkDelete(ids)
  return ids.length
}
export async function apagarTodosLancamentos(ambiente?: string) {
  const ids = doAmbiente(await db.lancamentos.toArray(), ambiente ?? ambienteAtivoId())
    .map((l) => l.id!).filter((x) => x != null)
  await db.lancamentos.bulkDelete(ids)
  return ids.length
}

/* Quantos registros de teste existem hoje na base do N0 (Projeto Modelo) */
export function contarRegistrosTesteN0(platform: PlatformN0, planos: PlanoRegistro[]) {
  return {
    empresas: platform.tenants.filter((t) => t.ficticio),
    usuarios: (platform.devUsers || []).filter((u) => u.ficticio),
    planos: planos.filter((p) => p.ficticio),
  }
}

/* ========================================================================
   Apagar TODO o dado de teste de uma vez (12/09/2026, pedido do Rafael:
   "zere na minha versão atual ... nem me dá opção de apagar").

   Até aqui a limpeza estava espalhada em duas telas, por tipo de registro, e
   os ambientes de EXEMPLO (os que a plataforma semeia) não apareciam em
   nenhuma delas — ver a explicação do critério único em `kitPlatform.ts`.
   Esta função é o caminho de um toque: apaga todo ambiente de teste, todo
   usuário Morfo de teste, todo plano de teste e todo lançamento marcado como
   fictício, e zera a marca de "ambiente com massa" que sobrava.

   NUNCA toca em: o ambiente deste aparelho, ambiente de cliente cadastrado
   pela Morfo, lançamento real, plano real, nem o administrador logado. */
export async function apagarTodosDadosDeTeste(): Promise<{ ambientes: number; usuarios: number; planos: number; lancamentos: number }> {
  const lancamentos = await apagarLancamentosFicticios()
  const planosFic = (await db.planos.toArray()).filter((p) => p.ficticio)
  if (planosFic.length) await db.planos.bulkDelete(planosFic.map((p) => p.id!).filter((x) => x != null))
  const atual = await lerPlatformN0Persistida()
  const ambientes = atual.tenants.filter(ehTenantDeTeste).length
  const usuarios = (atual.devUsers || []).filter((u, i) => i > 0 && u.ficticio).length
  await salvarPlatformN0({
    ...atual,
    tenants: atual.tenants
      .filter((t) => !ehTenantDeTeste(t))
      /* A marca de "ambiente com massa de teste" era gravada na geração e só
         zerada por esta tela — se os lançamentos fossem apagados por qualquer
         outro caminho (Limpar dados, Apagar tudo, restaurar backup), ela
         ficava pendurada e o painel seguia acusando massa que não existia
         mais. Some junto. */
      .map((t) => (t.env?.ambienteTeste ? { ...t, env: { registros: 0, ambienteTeste: false } } : t)),
    devUsers: (atual.devUsers || []).filter((u, i) => i === 0 || !u.ficticio),
  })
  return { ambientes, usuarios, planos: planosFic.length, lancamentos }
}

/** Existe algum dado de teste vivo? É o que decide se a barra de aviso aparece. */
export function temDadosDeTesteNaPlataforma(platform: PlatformN0, qtdLancamentosFicticios: number) {
  return platform.tenants.some(ehTenantDeTeste)
    || (platform.devUsers || []).some((u, i) => i > 0 && u.ficticio)
    || qtdLancamentosFicticios > 0
}
