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
import { db, tipoDoGrupoPelaNatureza, type Categoria, type GrupoRegistro, type Natureza, type TipoGrupo } from './db'
import { ICONES_PADRAO_GRUPO } from './iconesPadrao'
import { salvarConfiguracaoIcones } from './configuracaoIcones'

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

  await db.transaction('rw', db.grupos, db.categorias, async () => {
    const grupos = await db.grupos.toArray()
    const categorias = await db.categorias.toArray()

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
