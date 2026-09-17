/* PACOTES DE ÍCONES — build 089.

   O pedido do Rafael, em uma frase: em vez de cada categoria e cada grupo
   carregarem um estilo próprio escolhido a dedo, o app passa a ter TRÊS
   propostas prontas e completas — "Apenas borda", "Preenchido" e "3D
   colorido" — e você escolhe uma. O N0 define qual vale para cliente novo e
   pode editar as três; o N1 pode trocar de pacote e continuar ajustando
   ícone por ícone.

   O QUE ESTAVA ERRADO ANTES. `ICONES_PADRAO_CATEGORIA`/`_GRUPO`
   (`iconesPadrao.ts`, 04/09/2026) é UM mapa só, e cada entrada carrega o
   estilo E a cor daquele item — foi a exportação real do cadastro do Rafael
   naquele dia, com estilos misturados (a maioria em 'colorido', alguns em
   'preenchido', alguns em 'borda') e cores misturadas (azul, vermelho, verde,
   amarelo). Não existia "o pacote de borda": existia um cadastro com um
   pouco de cada coisa. Trocar tudo para um estilo só não era possível sem
   editar 39 entradas na mão.

   COMO FUNCIONA AGORA.
   • O DESENHO (qual ícone) é o mesmo nos três pacotes — é o que faz eles
     serem "pares": Mercado é o carrinho nos três, muda só o traço. Isso só
     passou a ser verdade nesta build, quando os 8 conceitos que o Heroicons
     não tem ganharam desenho próprio (ver `iconesProprios.tsx`); antes,
     trocar de estilo trocava o significado do ícone.
   • O ESTILO é do pacote, não do item.
   • A COR é do pacote e vem em dois slots: um para CATEGORIAS e outro para
     GRUPOS, obrigatoriamente distantes ("não podem ser mesma cor nem tons
     parecidos"). O pacote "3D colorido" não tem cor: emoji já vem colorido.

   A COR PADRÃO, medida e não escolhida no olho: categorias no azul do app
   (#3b82f6) e grupos no roxo da paleta (#a855f7). A distância entre os dois
   é ΔE 16,3 em OKLab — acima do piso de 15 que o guia de visualização usa
   para "duas cores que ninguém confunde" —, e os dois têm contraste
   suficiente sobre o cartão nos dois temas (azul 4,73 escuro / 3,68 claro;
   roxo 4,40 / 3,96). Índigo (#6366f1) foi testado e REPROVADO: ΔE 7,2 contra
   o azul, exatamente o "tom parecido" que o pedido veta. Laranja, verde,
   âmbar e vermelho ficaram de fora por outro motivo — carregam significado
   fixo nas barras deste app (realizado, margem, comprometido, estouro), e
   reusá-los como cor de ícone criaria duas línguas para a mesma cor.

   ONDE FICA GRAVADO.
   • N0: `platformN0.pacotesIcones` — as 3 propostas + qual está `emUso` +
     `versao`. É o que cliente novo recebe.
   • N1: `db.configuracoes.pacoteIconesEscolhido` — o que ESTE ambiente
     escolheu. Trocar de pacote reescreve o cadastro local; não é uma camada
     de exibição por cima.

   O QUE TROCAR DE PACOTE NÃO FAZ: não apaga escolha de ícone. Ao aplicar, o
   estilo e a cor vão para TODAS as categorias e grupos, mas o DESENHO só é
   escrito quando o item ainda não tem um ou quando ele está no ícone
   genérico. Quem trocou o ícone de "Mercado" para o carrinho de bagagem
   continua com ele depois de trocar de pacote — é o "poder escolher um a um e
   mesclar" do pedido. */
import { db, type Categoria, type GrupoRegistro } from './db'
import type { EstiloIcone } from './icones'
import { ICONES_PADRAO_CATEGORIA, ICONES_PADRAO_GRUPO } from './iconesPadrao'
import { doAmbiente, ambienteDoBanco, ambienteAtivoId } from './ambiente'
import { salvarConfiguracaoIcones } from './configuracaoIcones'

export type PacoteId = 'borda' | 'preenchido' | 'colorido'

export const PACOTES_ORDEM: PacoteId[] = ['borda', 'preenchido', 'colorido']

export const ROTULO_PACOTE: Record<PacoteId, string> = {
  borda: 'Apenas borda',
  preenchido: 'Preenchido',
  colorido: '3D colorido',
}

/** Só os dois monocromáticos aceitam cor — emoji já é colorido por natureza. */
export const PACOTE_ACEITA_COR: Record<PacoteId, boolean> = {
  borda: true,
  preenchido: true,
  colorido: false,
}

export interface PacoteIcones {
  /* Cor aplicada a TODAS as categorias / a TODOS os grupos deste pacote.
     Ausente no 'colorido'. */
  corCategorias?: string
  corGrupos?: string
  /* nome da categoria/grupo -> id do ícone. A chave é o NOME, a mesma que
     `Categoria.grupo`, `Meta.grupo` e `iconesPadrao.ts` já usam. */
  categorias: Record<string, string>
  grupos: Record<string, string>
}

export interface PacotesIconesN0 {
  emUso: PacoteId
  pacotes: Record<PacoteId, PacoteIcones>
  versao: number
  atualizadoEm: string
}

export const COR_PADRAO_CATEGORIAS = '#3b82f6'
export const COR_PADRAO_GRUPOS = '#a855f7'

/* O desenho de cada categoria/grupo, extraído do padrão que já existia — o
   que se aproveita dali é a CURADORIA (qual desenho combina com qual nome),
   que é trabalho real do Rafael de 04/09; o estilo e a cor de cada entrada,
   que eram a parte bagunçada, ficam de fora de propósito. */
function desenhosDoPadrao(): { categorias: Record<string, string>; grupos: Record<string, string> } {
  const categorias: Record<string, string> = {}
  for (const [nome, p] of Object.entries(ICONES_PADRAO_CATEGORIA)) categorias[nome] = p.icone
  const grupos: Record<string, string> = {}
  for (const [nome, p] of Object.entries(ICONES_PADRAO_GRUPO)) grupos[nome] = p.icone
  return { categorias, grupos }
}

export function pacotesPadrao(): PacotesIconesN0 {
  const { categorias, grupos } = desenhosDoPadrao()
  const mono = (): PacoteIcones => ({
    corCategorias: COR_PADRAO_CATEGORIAS,
    corGrupos: COR_PADRAO_GRUPOS,
    categorias: { ...categorias },
    grupos: { ...grupos },
  })
  return {
    /* 'colorido' continua em uso por padrão: é o que o app mostra hoje e
       trocar o visual de quem já usa o produto não é efeito colateral de uma
       build que veio para OFERECER as outras duas opções. */
    emUso: 'colorido',
    pacotes: {
      borda: mono(),
      preenchido: mono(),
      colorido: { categorias: { ...categorias }, grupos: { ...grupos } },
    },
    versao: 1,
    atualizadoEm: new Date().toISOString(),
  }
}

/* Completa um pacote gravado com o que faltar — mesma regra da build 084
   (`comBrandingPadrao`): campo novo dentro de objeto persistido precisa de
   default mesclado na LEITURA, senão quem já usava o app nunca o recebe. */
export function comPacotesPadrao(gravado?: Partial<PacotesIconesN0>): PacotesIconesN0 {
  const base = pacotesPadrao()
  if (!gravado) return base
  const pacotes = { ...base.pacotes }
  for (const id of PACOTES_ORDEM) {
    const g = gravado.pacotes?.[id]
    if (!g) continue
    pacotes[id] = {
      corCategorias: PACOTE_ACEITA_COR[id] ? (g.corCategorias ?? base.pacotes[id].corCategorias) : undefined,
      corGrupos: PACOTE_ACEITA_COR[id] ? (g.corGrupos ?? base.pacotes[id].corGrupos) : undefined,
      categorias: { ...base.pacotes[id].categorias, ...(g.categorias ?? {}) },
      grupos: { ...base.pacotes[id].grupos, ...(g.grupos ?? {}) },
    }
  }
  return {
    emUso: gravado.emUso && PACOTES_ORDEM.includes(gravado.emUso) ? gravado.emUso : base.emUso,
    pacotes,
    versao: gravado.versao ?? base.versao,
    atualizadoEm: gravado.atualizadoEm ?? base.atualizadoEm,
  }
}

/* O ícone genérico: um item parado nele nunca foi uma escolha, foi a ausência
   de uma — por isso o pacote pode escrever por cima. */
const SEM_ESCOLHA = new Set(['outros', undefined, ''])

/**
 * Aplica um pacote ao cadastro de um ambiente.
 *
 * Estilo e cor vão para TODAS as categorias e grupos — é o que faz o pacote
 * ser um pacote. O DESENHO só é escrito quando o item não tem um de verdade
 * (ausente, ou parado no genérico "outros"): é assim que a escolha item a
 * item do Rafael sobrevive a uma troca de pacote.
 *
 * `'nenhum'` (a opção "Sem ícone") é respeitado como escolha: quem desligou o
 * ícone de uma categoria continua sem ícone depois de trocar de pacote.
 */
export async function aplicarPacote(
  pacoteId: PacoteId,
  pacote: PacoteIcones,
  ambienteAlvo?: string,
): Promise<{ categorias: number; grupos: number }> {
  /* Ambiente resolvido ANTES da transação: ler `configuracoes` lá dentro
     derruba tudo com NotFoundError (bug real, build 050). */
  const amb = ambienteAlvo ?? (await ambienteDoBanco())
  let nCat = 0
  let nGru = 0
  const estilo = pacoteId as EstiloIcone
  await db.transaction('rw', db.categorias, db.grupos, async () => {
    const cats = doAmbiente(await db.categorias.toArray(), amb)
    for (const c of cats) {
      if (c.id == null) continue
      const manterDesenho = c.icone === 'nenhum' || !SEM_ESCOLHA.has(c.icone)
      const desenho = manterDesenho ? c.icone : (pacote.categorias[c.nome] ?? c.icone)
      await db.categorias.update(c.id, {
        ...(desenho === undefined ? {} : { icone: desenho }),
        iconeEstilo: estilo,
        /* No 'colorido' a cor não é usada; gravar `undefined` APAGARIA a
           propriedade (Dexie), então gravamos string vazia? Não: simplesmente
           não mexemos nela — a cor antiga fica guardada e volta intacta se a
           pessoa trocar para um pacote monocromático depois. */
        ...(PACOTE_ACEITA_COR[pacoteId] && pacote.corCategorias ? { iconeCor: pacote.corCategorias } : {}),
      } as Partial<Categoria>)
      nCat++
    }
    const grus = doAmbiente(await db.grupos.toArray(), amb)
    for (const g of grus) {
      if (g.id == null) continue
      const manterDesenho = g.icone === 'nenhum' || !SEM_ESCOLHA.has(g.icone)
      const desenho = manterDesenho ? g.icone : (pacote.grupos[g.nome] ?? g.icone)
      await db.grupos.update(g.id, {
        ...(desenho === undefined ? {} : { icone: desenho }),
        iconeEstilo: estilo,
        ...(PACOTE_ACEITA_COR[pacoteId] && pacote.corGrupos ? { iconeCor: pacote.corGrupos } : {}),
      } as Partial<GrupoRegistro>)
      nGru++
    }
  })
  return { categorias: nCat, grupos: nGru }
}

/**
 * "Aplicar uma cor a todos os ícones de uma vez" (pedido explícito, para N0 e
 * N1). Só faz sentido nos dois pacotes monocromáticos — no 3D colorido a cor
 * é do próprio emoji.
 */
export async function aplicarCorEmTodos(
  alvo: 'categorias' | 'grupos',
  cor: string,
  ambienteAlvo?: string,
): Promise<number> {
  const amb = ambienteAlvo ?? (await ambienteDoBanco())
  let n = 0
  await db.transaction('rw', db.categorias, db.grupos, async () => {
    if (alvo === 'categorias') {
      for (const c of doAmbiente(await db.categorias.toArray(), amb)) {
        if (c.id == null) continue
        await db.categorias.update(c.id, { iconeCor: cor })
        n++
      }
    } else {
      for (const g of doAmbiente(await db.grupos.toArray(), amb)) {
        if (g.id == null) continue
        await db.grupos.update(g.id, { iconeCor: cor })
        n++
      }
    }
  })
  return n
}

/* ---------------------------------------------------------------------------
   Distância entre duas cores, em OKLab (ΔE ×100).

   Existe para que a regra "a cor das categorias e a dos grupos não podem ser
   parecidas" seja verificada pelo app, e não confiada à memória de quem está
   editando. O piso de 15 é o mesmo que o guia de visualização usa para "duas
   cores que um olho normal nunca confunde"; abaixo disso a tela recusa e diz
   o porquê, em vez de aceitar em silêncio e devolver duas colunas de ícones
   que parecem iguais no celular.
   --------------------------------------------------------------------------- */
export const DISTANCIA_MINIMA_CORES = 15

function paraOklab(hexCor: string): [number, number, number] {
  const h = hexCor.replace('#', '')
  const canal = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const r = canal(0), g = canal(2), b = canal(4)
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

export function distanciaCores(a: string, b: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(a) || !/^#[0-9a-fA-F]{6}$/.test(b)) return Number.POSITIVE_INFINITY
  const x = paraOklab(a)
  const y = paraOklab(b)
  return Math.hypot((x[0] - y[0]) * 100, (x[1] - y[1]) * 100, (x[2] - y[2]) * 100)
}

/** true quando as duas cores são distinguíveis o bastante para o pedido. */
export function coresBemDiferentes(a?: string, b?: string): boolean {
  if (!a || !b) return true
  return distanciaCores(a, b) >= DISTANCIA_MINIMA_CORES
}

/* ---------------------------------------------------------------------------
   O pacote EFETIVO de um ambiente.

   Três camadas, na mesma ordem do resto do app (fábrica → publicado pelo N0 →
   personalizado por este ambiente):
   1. `pacotesPadrao()` — as três propostas de fábrica.
   2. `platformN0.pacotesIcones` — o que a Morfo publicou, inclusive qual está
      `emUso` para cliente novo.
   3. `db.configuracoes` — qual pacote ESTE ambiente escolheu e, separado
      disso, as cores que ele trocou.

   A cor fica numa camada própria de propósito: trocar a cor não pode congelar
   o ambiente e impedi-lo de receber uma melhoria de desenho publicada depois
   (a personalização é por parâmetro, regra da build 080).
   --------------------------------------------------------------------------- */
export type CoresLocaisPacotes = Partial<Record<'borda' | 'preenchido', { categorias?: string; grupos?: string }>>

export function pacoteEfetivo(
  publicado: Partial<PacotesIconesN0> | undefined,
  cfg:
    | {
        pacoteIconesEscolhido?: PacoteId
        pacoteIconesCorCategorias?: string
        pacoteIconesCorGrupos?: string
        pacoteIconesCores?: CoresLocaisPacotes
      }
    | undefined,
): { id: PacoteId; pacote: PacoteIcones; pacotes: Record<PacoteId, PacoteIcones>; emUsoNoN0: PacoteId } {
  const base = comPacotesPadrao(publicado)
  const id = cfg?.pacoteIconesEscolhido ?? base.emUso
  /* Build 090: a cor personalizada é POR PACOTE (`pacoteIconesCores`). Os dois
     campos antigos (um par só, para todos os pacotes) são lidos apenas como
     legado e só valem para o pacote que estava escolhido quando foram
     gravados — nunca por cima do que o N0 publica para os outros. */
  const corLocal = (pid: 'borda' | 'preenchido', alvo: 'categorias' | 'grupos'): string | undefined => {
    const nova = cfg?.pacoteIconesCores?.[pid]?.[alvo]
    if (nova) return nova
    if (cfg?.pacoteIconesEscolhido === pid) {
      return alvo === 'categorias' ? cfg?.pacoteIconesCorCategorias : cfg?.pacoteIconesCorGrupos
    }
    return undefined
  }
  const comCorLocal = (p: PacoteIcones, pid: PacoteId): PacoteIcones =>
    PACOTE_ACEITA_COR[pid] && (pid === 'borda' || pid === 'preenchido')
      ? {
          ...p,
          corCategorias: corLocal(pid, 'categorias') ?? p.corCategorias,
          corGrupos: corLocal(pid, 'grupos') ?? p.corGrupos,
        }
      : p
  const pacotes = {
    borda: comCorLocal(base.pacotes.borda, 'borda'),
    preenchido: comCorLocal(base.pacotes.preenchido, 'preenchido'),
    colorido: base.pacotes.colorido,
  }
  return { id, pacote: pacotes[id], pacotes, emUsoNoN0: base.emUso }
}

/**
 * Chamada na abertura do app. Aplica o pacote que o N0 publica SOMENTE quando
 * este ambiente nunca escolheu um — mesma disciplina de
 * `aplicarPadraoSeNaoEditado`: escolha do dono do ambiente nunca é
 * sobrescrita. Nunca lança: falhar aqui não pode impedir o app de abrir.
 */
export async function aplicarPacoteN0SeNaoEscolhido(): Promise<boolean> {
  try {
    const cfg = await db.configuracoes.get(1)
    if (cfg?.pacoteIconesEscolhido) return false
    const publicado = cfg?.platformN0?.pacotesIcones
    /* Sem nada publicado, não há o que aplicar: o cadastro de quem já usa o
       app fica exatamente como está. Esta build NÃO repinta ninguém sozinha —
       ela oferece as três opções, e quem troca é a pessoa. */
    if (!publicado) return false
    /* Build 090: aplica UMA vez por versão publicada (marca por ambiente,
       como `padraoCatVersaoAplicada`). Sem a marca, o pacote era reaplicado a
       cada abertura do app e desfazia a cor/traço que a pessoa tivesse
       ajustado item a item no cadastro. */
    const amb = ambienteAtivoId()
    const versao = publicado.versao ?? 0
    const aplicada = cfg?.pacoteIconesVersaoAplicada?.[amb] ?? 0
    if (versao <= aplicada) return false
    const base = comPacotesPadrao(publicado)
    const { pacote } = pacoteEfetivo(publicado, cfg)
    await aplicarPacote(base.emUso, pacote, amb)
    await salvarConfiguracaoIcones({
      pacoteIconesVersaoAplicada: { ...(cfg?.pacoteIconesVersaoAplicada ?? {}), [amb]: versao },
    })
    return true
  } catch {
    return false
  }
}
