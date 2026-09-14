/* Tipo do grupo (entrada × saída) — regra de vínculo e migração
   (11/09/2026, pedido do Rafael):

     "não vamos mais permitir vínculo de categorias de receita (positivos)
      dentro de grupos que sejam desse tipo, pra isso no cadastro de grupos
      deverá ser identificado como do tipo = Saída ou Entrada [...] com isso
      cada grupo vai concentrar metas baseada no movimento dentro dele e não
      mais olhando se é positivo ou negativo"

   O efeito prático: grupo virou homogêneo. Antes, "Fixo" tinha o Salário
   (receita) junto das contas de casa, e por isso o cabeçalho do grupo no
   Planejamento precisava separar os dois lados na hora de somar (build 038).
   Com o tipo, essa separação deixa de existir — a soma do grupo é o movimento
   de dentro dele, e a apresentação volta a ser uma barra só.

   Aqui moram só as funções puras da regra + a migração única. A UI que impede
   a escolha errada está em `Categorias.tsx` (o campo de natureza e o de grupo
   se filtram um pelo outro). */
import { db, tipoDoGrupoPelaNatureza, type Categoria, type ComportamentoGrupo, type GrupoRegistro, type Natureza, type TipoGrupo } from './db'
import { ICONES_PADRAO_GRUPO } from './iconesPadrao'
import { salvarConfiguracaoIcones } from './configuracaoIcones'
import { doAmbiente, marcaDoAmbiente, ambienteDoBanco } from './ambiente'

/* Nome do grupo de entrada criado pela migração e semeado em instalação nova
   (escolha do Rafael: "vão pra um grupo novo chamado 'Receita'"). */
export const GRUPO_RECEITA = 'Receita'

export const ROTULO_TIPO_GRUPO: Record<TipoGrupo, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
}

/* Tipo efetivo de um grupo já cadastrado. Grupo de antes deste campo (ou
   recém-criado por um caminho que não pede o tipo) cai em 'saida' — é o caso
   de longe mais comum e é o que preserva o comportamento anterior. */
export function tipoDoGrupo(g?: Pick<GrupoRegistro, 'tipo'> | null): TipoGrupo {
  return g?.tipo === 'entrada' ? 'entrada' : 'saida'
}

/* ================= COMPORTAMENTO DO GRUPO (build 061) =================
   Quem decide o que projeta por ritmo e o que fica fora da economia é ESTE
   campo, nunca o nome do grupo. Ver `ComportamentoGrupo` em `db.ts`. */

export const ROTULO_COMPORTAMENTO: Record<ComportamentoGrupo, string> = {
  fixo: 'Fixo — já é conhecido',
  variavel: 'Variável — dá pra economizar',
  guardar: 'Guardar — aporte/investimento',
}

export const EXPLICACAO_COMPORTAMENTO: Record<ComportamentoGrupo, string> = {
  fixo: 'Compromisso que se repete e você já sabe o valor. Entra na conta do mês inteiro, sem projeção.',
  variavel: 'Gasto do dia a dia. É onde dá pra economizar — é este grupo que o app projeta pelo seu ritmo. Pode ter mais de um.',
  guardar: 'Dinheiro que sai pra guardar ou investir. Fica fora da conta de economia (deixar de guardar não é economizar) e vira o aviso de "falta aportar".',
}

/* Palavras que denunciam o comportamento quando o campo ainda não existe.
   Usadas SÓ pela migração e pelo padrão de fábrica — nunca em tempo de uso. */
const PISTA_VARIAVEL = /vari[áa]vel|dia a dia|livre|lazer/i
const PISTA_GUARDAR = /investi|objetivo|seguran|reserva|guardar|aporte|poupan|cofr/i

export function comportamentoPeloNome(nome: string): ComportamentoGrupo {
  if (PISTA_VARIAVEL.test(nome)) return 'variavel'
  if (PISTA_GUARDAR.test(nome)) return 'guardar'
  return 'fixo'
}

/** Comportamento efetivo de um grupo já cadastrado (entrada nunca tem). */
export function comportamentoDoGrupo(g: Pick<GrupoRegistro, 'tipo' | 'comportamento' | 'nome'>): ComportamentoGrupo | null {
  if (tipoDoGrupo(g) !== 'saida') return null
  return g.comportamento ?? comportamentoPeloNome(g.nome)
}

export const gruposComComportamento = (grupos: readonly GrupoRegistro[], c: ComportamentoGrupo) =>
  grupos.filter((g) => g.ativo !== false && comportamentoDoGrupo(g) === c)

/* Migração única: preenche o campo pelo nome uma vez só. Depois disso quem
   manda é a escolha da pessoa — mesmo padrão de `migrarTipoDosGrupos()`. */
export async function migrarComportamentoDosGrupos(): Promise<number> {
  const config = await db.configuracoes.get(1)
  if (config?.gruposComportamentoRevisado) return 0
  const amb = await ambienteDoBanco()
  let n = 0
  await db.transaction('rw', db.grupos, async () => {
    for (const g of doAmbiente(await db.grupos.toArray(), amb)) {
      if (g.comportamento) continue
      if (tipoDoGrupo(g) !== 'saida') continue
      await db.grupos.update(g.id!, { comportamento: comportamentoPeloNome(g.nome) })
      n++
    }
  })
  await salvarConfiguracaoIcones({ gruposComportamentoRevisado: true })
  return n
}

/* ========= FUSÃO DOS GRUPOS ANTIGOS NO "INVESTIMENTO" (build 062) =========
 *
 * A base do produto passou de quatro grupos de saída (Fixo, Variável,
 * Objetivos, Segurança) para três (Fixo 50 / Variável 30 / Investimento 20)
 * em 13/09/2026 — mas essa mudança só existiu na PLANILHA e no arquivo de
 * backup que foi gerado a partir dela. Dentro do app nunca houve migração
 * nenhuma: `VERSAO_SEMENTE_DEMO` está congelada (e tem que continuar), então
 * quem já usava o app seguiu com "Objetivos" e "Segurança" na tela de
 * Planejamento, exatamente como o Rafael reportou. Trocar a semente não
 * resolveria — semente só vale para banco novo.
 *
 * O que esta migração faz, uma vez só:
 *   • garante o grupo "Investimento" (cria se não existir, com o ícone do
 *     padrão e comportamento "guardar");
 *   • MOVE as categorias dos grupos antigos para ele — as categorias e todo
 *     o histórico continuam iguais, só mudam de grupo;
 *   • SOMA os percentuais de meta dos grupos antigos no percentual do
 *     Investimento, para o total continuar fechando em 100%;
 *   • INATIVA os grupos antigos (`ativo: false`) — some da tela, o histórico
 *     continua íntegro e dá para reativar pela tela de Categorias e Grupos.
 *
 * Nada é apagado: nenhum lançamento, nenhuma categoria, nenhum grupo.
 */
const NOMES_GRUPOS_FUNDIDOS = ['objetivos', 'seguranca', 'segurança']
export const GRUPO_INVESTIMENTO = 'Investimento'

const semAcento = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export async function migrarGruposAntigosParaInvestimento(): Promise<{
  moveu: number
  inativou: number
  percentualSomado: number
}> {
  const resultado = { moveu: 0, inativou: 0, percentualSomado: 0 }
  const config = await db.configuracoes.get(1)
  if (config?.gruposFundidosRevisado) return resultado

  const amb = await ambienteDoBanco()
  await db.transaction('rw', db.grupos, db.categorias, db.metas, async () => {
    const grupos = doAmbiente(await db.grupos.toArray(), amb)

    /* Correção do ÍCONE DUPLICADO, na mesma passada e com a mesma disciplina
       estreita de `migrarPctGrupo()`: só troca quando o valor salvo é
       EXATAMENTE o que eu tinha posto errado (o desenho do "Fixo" no grupo
       "Investimento", e o mesmo desenho nas duas categorias dele). Um ícone
       escolhido de propósito — qualquer outro valor — fica intocado. Sem
       isto, o padrão novo só valeria para instalação nova, e quem já usa o
       app continuaria com dois grupos desenhados igual. */
    const corrigirIconeErrado = async () => {
      const inv = grupos.find((g) => g.ativo !== false && semAcento(g.nome) === semAcento(GRUPO_INVESTIMENTO))
      const padraoInv = ICONES_PADRAO_GRUPO[GRUPO_INVESTIMENTO]
      if (inv?.id != null && inv.icone === 'cofreDigital' && padraoInv) {
        await db.grupos.update(inv.id, {
          icone: padraoInv.icone, iconeEstilo: padraoInv.iconeEstilo, iconeCor: padraoInv.iconeCor,
        })
      }
      const cats = doAmbiente(await db.categorias.toArray(), amb)
      const usar = cats.find((c) => c.nome === 'Investimento — Usar')
      if (usar?.id != null && usar.icone === 'cofreDigital') {
        await db.categorias.update(usar.id, { icone: 'quedaInvestimento' })
      }
    }
    await corrigirIconeErrado()

    const antigos = grupos.filter(
      (g) => g.ativo !== false && tipoDoGrupo(g) === 'saida' && NOMES_GRUPOS_FUNDIDOS.includes(semAcento(g.nome)),
    )
    if (antigos.length === 0) return

    let destino = grupos.find((g) => g.ativo !== false && semAcento(g.nome) === semAcento(GRUPO_INVESTIMENTO))
    if (!destino) {
      const padrao = ICONES_PADRAO_GRUPO[GRUPO_INVESTIMENTO]
      const id = await db.grupos.add({
        ...marcaDoAmbiente(amb),
        nome: GRUPO_INVESTIMENTO,
        ativo: true,
        tipo: 'saida',
        comportamento: 'guardar',
        icone: padrao?.icone,
        iconeEstilo: padrao?.iconeEstilo,
        iconeCor: padrao?.iconeCor,
      })
      destino = { id: id as number, nome: GRUPO_INVESTIMENTO, ativo: true, tipo: 'saida', comportamento: 'guardar' }
    }

    const categorias = doAmbiente(await db.categorias.toArray(), amb)
    const metas = doAmbiente(await db.metas.toArray(), amb)
    const maisRecente = (grupo: string) =>
      metas.filter((m) => m.grupo === grupo).sort((a, b) => (a.mesVigencia < b.mesVigencia ? 1 : -1))[0]

    for (const g of antigos) {
      for (const c of categorias.filter((c) => c.grupo === g.nome)) {
        await db.categorias.update(c.id!, { grupo: destino.nome })
        resultado.moveu++
      }
      const meta = maisRecente(g.nome)
      if (meta?.id != null && meta.percentual > 0) {
        resultado.percentualSomado += meta.percentual
        await db.metas.update(meta.id, { percentual: 0 })
      }
      await db.grupos.update(g.id!, { ativo: false })
      resultado.inativou++
    }

    if (resultado.percentualSomado > 0) {
      const metaDestino = maisRecente(destino.nome)
      if (metaDestino?.id != null) {
        await db.metas.update(metaDestino.id, { percentual: metaDestino.percentual + resultado.percentualSomado })
      } else {
        const d = new Date()
        await db.metas.add({
          ...marcaDoAmbiente(amb),
          grupo: destino.nome,
          percentual: resultado.percentualSomado,
          base: 'receita_real',
          mesVigencia: `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`,
        })
      }
    }
  })

  await salvarConfiguracaoIcones({ gruposFundidosRevisado: true })
  return resultado
}

export function grupoAceitaNatureza(g: Pick<GrupoRegistro, 'tipo'> | null | undefined, natureza: Natureza): boolean {
  return tipoDoGrupoPelaNatureza(natureza) === tipoDoGrupo(g)
}

/* Grupos que podem receber uma categoria desta natureza — usado pelo cadastro
   de categoria pra só oferecer o que é válido, em vez de deixar escolher e
   recusar depois. */
export function gruposParaNatureza(grupos: GrupoRegistro[], natureza: Natureza): GrupoRegistro[] {
  return grupos.filter((g) => grupoAceitaNatureza(g, natureza))
}

/* Categorias que violam a regra hoje (receita dentro de grupo de saída, ou o
   contrário). Serve tanto pra migração quanto pro aviso na tela. */
export function categoriasForaDaRegra(categorias: Categoria[], grupos: GrupoRegistro[]): Categoria[] {
  const porNome = new Map(grupos.map((g) => [g.nome, g]))
  return categorias.filter((c) => {
    const g = porNome.get(c.grupo)
    if (!g) return false // grupo inexistente é outro problema, não deste
    return !grupoAceitaNatureza(g, c.natureza)
  })
}

/* Migração única, na abertura do app (`App.tsx`), equivalente à de percentual
   de ícone: roda uma vez e grava a marca.

   1. Todo grupo sem tipo recebe um: 'entrada' quando TODAS as categorias dele
      são de receita (e existe ao menos uma), 'saida' em qualquer outro caso —
      inclusive grupo vazio, que é o padrão seguro.
   2. Se sobrar categoria de receita dentro de grupo de saída, cria o grupo
      "Receita" (tipo entrada, com o ícone padrão dos grupos) e move essas
      categorias pra lá.

   Nenhum LANÇAMENTO é tocado: lançamento aponta pra categoria, e a categoria
   continua a mesma — só muda de grupo. */
export async function migrarTipoDosGrupos(): Promise<{ tipados: number; movidas: number; criouGrupo: boolean }> {
  const config = await db.configuracoes.get(1)
  if (config?.gruposTipoRevisado) return { tipados: 0, movidas: 0, criouGrupo: false }

  const resultado = { tipados: 0, movidas: 0, criouGrupo: false }

  /* Ambiente resolvido FORA da transação: ler `configuracoes` de dentro dela
     derruba tudo com NotFoundError (o Dexie só libera as tabelas declaradas
     no `transaction`). Bug real achado no teste da build 050. */
  const amb = await ambienteDoBanco()
  await db.transaction('rw', db.grupos, db.categorias, async () => {
    const grupos = doAmbiente(await db.grupos.toArray(), amb)
    const categorias = doAmbiente(await db.categorias.toArray(), amb)

    for (const g of grupos) {
      if (g.tipo) continue
      const doGrupo = categorias.filter((c) => c.grupo === g.nome)
      const tipo: TipoGrupo = doGrupo.length > 0 && doGrupo.every((c) => c.natureza === 'Receita') ? 'entrada' : 'saida'
      await db.grupos.update(g.id!, { tipo })
      g.tipo = tipo
      resultado.tipados++
    }

    const foraDaRegra = categoriasForaDaRegra(categorias, grupos)
    const receitasSoltas = foraDaRegra.filter((c) => c.natureza === 'Receita')
    if (receitasSoltas.length > 0) {
      let destino = grupos.find((g) => tipoDoGrupo(g) === 'entrada' && g.ativo)
      if (!destino) {
        const padrao = ICONES_PADRAO_GRUPO[GRUPO_RECEITA]
        const id = await db.grupos.add({
          ...marcaDoAmbiente(),
          nome: GRUPO_RECEITA,
          ativo: true,
          tipo: 'entrada',
          icone: padrao?.icone,
          iconeEstilo: padrao?.iconeEstilo,
          iconeCor: padrao?.iconeCor,
        })
        destino = { id: id as number, nome: GRUPO_RECEITA, ativo: true, tipo: 'entrada' }
        resultado.criouGrupo = true
      }
      for (const c of receitasSoltas) {
        await db.categorias.update(c.id!, { grupo: destino.nome })
        resultado.movidas++
      }
    }

  })

  // A marca fica FORA da transação de propósito: `salvarConfiguracaoIcones`
  // faz o próprio ciclo de ler-e-gravar o registro único de configuração
  // (espalhando o que já está lá, pra não apagar campo de outra rodada — ver
  // o comentário dela), e aninhar isso na transação acima só criaria risco de
  // conflito sem ganho nenhum: se o app fechar entre as duas, a migração
  // simplesmente roda de novo na próxima abertura e não acha nada pra fazer.
  await salvarConfiguracaoIcones({ gruposTipoRevisado: true })

  return resultado
}
