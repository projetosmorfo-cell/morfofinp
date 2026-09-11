import { db, type Lancamento } from '../db'
import { uid } from './kitBase'
import { addDays, todayISO, type DevUserN0, type PlatformN0, type TenantKit } from './kitPlatform'
import type { PlanoRegistro } from '../db'

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

/* ---- Projeto Modelo (`tenantTemRegistros`) ---- */
export function tenantTemRegistros(t: TenantKit, qtdLancamentosReais: number) {
  if (t.real) return qtdLancamentosReais > 0
  return (t.env?.registros || 0) > 0
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
const DESCRICOES_TESTE = ['Mercado (teste)', 'Combustível (teste)', 'Farmácia (teste)', 'Restaurante (teste)', 'Assinatura streaming (teste)', 'Transporte (teste)', 'Serviço avulso (teste)', 'Reembolso (teste)']

export async function gerarLancamentosFicticios(qtd: number): Promise<number> {
  const hoje = new Date(todayISO() + 'T00:00:00')
  const contas = (await db.contas.toArray()).filter((c) => c.ativa && c.tipo !== 'cartao')
  const categorias = await db.categorias.toArray()
  const conta = contas[0] ?? (await db.contas.toArray())[0]
  if (!conta?.id) throw new Error('Nenhuma conta cadastrada — a massa de teste precisa de pelo menos 1 conta.')
  const catReceita = categorias.filter((c) => c.natureza === 'Receita')
  const catConsumo = categorias.filter((c) => c.natureza === 'Consumo')
  if (catReceita.length === 0 || catConsumo.length === 0) throw new Error('Sem categorias de Receita/Consumo cadastradas — a massa de teste precisa das duas.')
  const novos: Lancamento[] = []
  for (let i = 0; i < qtd; i++) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (i % 12), 1 + ((i * 7) % 27))
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const entrada = i % 5 === 0
    const cat = entrada ? catReceita[i % catReceita.length] : catConsumo[i % catConsumo.length]
    const descricao = entrada ? 'Receita avulsa (teste)' : DESCRICOES_TESTE[i % DESCRICOES_TESTE.length]
    novos.push({
      dataCompetencia: iso,
      dataCaixa: iso,
      descricao,
      descricaoOriginal: descricao,
      valor: entrada ? 500 + (i % 9) * 250 : -(25 + (i % 13) * 37),
      contaId: conta.id!,
      pagoPor: 'conta',
      categoriaId: cat.id!,
      status: 'manual',
      ficticio: true,
    })
  }
  await db.lancamentos.bulkAdd(novos)
  return novos.length
}

export async function contarLancamentos() { return db.lancamentos.count() }
export async function contarLancamentosFicticios() { return db.lancamentos.filter((l) => !!l.ficticio).count() }
export async function apagarLancamentosFicticios() {
  const ids = (await db.lancamentos.filter((l) => !!l.ficticio).toArray()).map((l) => l.id!).filter((x) => x != null)
  await db.lancamentos.bulkDelete(ids)
  return ids.length
}
export async function apagarTodosLancamentos() {
  const n = await db.lancamentos.count()
  await db.lancamentos.clear()
  return n
}

/* Quantos registros de teste existem hoje na base do N0 (Projeto Modelo) */
export function contarRegistrosTesteN0(platform: PlatformN0, planos: PlanoRegistro[]) {
  return {
    empresas: platform.tenants.filter((t) => t.ficticio),
    usuarios: (platform.devUsers || []).filter((u) => u.ficticio),
    planos: planos.filter((p) => p.ficticio),
  }
}
