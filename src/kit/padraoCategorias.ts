/* Padrão de Categorias/Grupos/ícones da plataforma (12/09/2026, item 7 do
   Rafael, verbatim: "o N0 deveria ter as mesmas configurações de Categorias,
   grupos, ícones, e ao salvar, seriam salvos como novo padrão pros N1 que não
   editaram, e também já deveria carregar o padrão atual lá").

   Como funciona, sem backend:
   • O N0 guarda o cadastro-modelo em `platformN0.padraoCategorias`
     (`kitPlatform.ts`) com uma `versao` que sobe a cada salvamento.
   • O N1 guarda, no seu próprio `db.configuracoes`, qual versão já recebeu
     (`padraoCatVersaoAplicada`) e se a pessoa mexeu no cadastro dela
     (`catsEditadasPeloUsuario`).
   • Na abertura do app, `aplicarPadraoSeNaoEditado()` compara as duas coisas:
     ambiente NÃO editado e versão nova ⇒ recebe o padrão; ambiente editado ⇒
     nunca mais é sobrescrito (é literalmente o "pros N1 que não editaram").

   Duas garantias deliberadas, porque isto mexe no cadastro de quem usa o app:
   1. A aplicação é um MERGE por NOME (mesma chave que `Categoria.grupo` e
      `Meta.grupo` já usam): cria o que falta e atualiza o que existe. NUNCA
      apaga categoria, grupo, meta ou lançamento — um padrão novo não pode
      fazer sumir dado de ninguém.
   2. `lerPadraoAtual()` nasce do que o app JÁ considera padrão hoje (o
      cadastro deste ambiente, com os ícones de `iconesPadrao.ts`) — é o
      "já carregar o padrão atual lá" do pedido, em vez de abrir a tela do N0
      em branco. */
import { db, type Categoria, type GrupoRegistro, type Natureza } from '../db'
import { comIconePadraoCategoria, comIconePadraoGrupo } from '../iconesPadrao'
import { CONFIG_ICONES_PADRAO } from '../configuracaoIcones'
import { lerPlatformN0Persistida, type CategoriaPadraoN0, type GrupoPadraoN0, type PadraoCategoriasN0 } from './kitPlatform'
import { lerDoAmbiente, doAmbiente, marcaDoAmbiente, ambienteDoBanco, AMBIENTE_DESTE_APARELHO } from '../ambiente'

export type PadraoEditavel = Omit<PadraoCategoriasN0, 'versao' | 'atualizadoEm'>

/** O padrão que o N0 mostra ao abrir a tela: o salvo, ou o cadastro atual deste ambiente. */
export async function lerPadraoAtual(): Promise<PadraoEditavel> {
  const platform = await lerPlatformN0Persistida()
  if (platform.padraoCategorias) {
    const { versao: _v, atualizadoEm: _a, ...resto } = platform.padraoCategorias
    void _v; void _a
    return resto
  }
  return lerPadraoDoAmbienteAtual()
}

/** Fotografia do cadastro deste ambiente, no formato do padrão. */
export async function lerPadraoDoAmbienteAtual(ambienteAlvo?: string): Promise<PadraoEditavel> {
  const amb = ambienteAlvo ?? (await ambienteDoBanco())
  const [grupos, categorias, metas, cfg] = await Promise.all([
    db.grupos.toArray().then((l) => doAmbiente(l, amb)),
    db.categorias.toArray().then((l) => doAmbiente(l, amb)),
    db.metas.toArray().then((l) => doAmbiente(l, amb)),
    db.configuracoes.get(1),
  ])
  const percentualDe = (grupo: string) => {
    const m = metas.filter((x) => x.grupo === grupo).sort((a, b) => (a.mesVigencia < b.mesVigencia ? 1 : -1))[0]
    return m?.percentual ?? 0
  }
  return {
    grupos: grupos.filter((g) => g.ativo).map((g): GrupoPadraoN0 => {
      const comIcone = comIconePadraoGrupo(g) as GrupoRegistro
      return { nome: g.nome, icone: comIcone.icone, iconeEstilo: comIcone.iconeEstilo, iconeCor: comIcone.iconeCor, percentual: percentualDe(g.nome) }
    }),
    categorias: categorias.filter((c) => c.ativa).map((c): CategoriaPadraoN0 => {
      const comIcone = comIconePadraoCategoria(c) as Categoria
      return {
        /* Build 056: nenhum valor entra no padrão — nem meta de gasto, nem
           planejado de receita. "Recarregar do cadastro deste ambiente" traz a
           ESTRUTURA (nome, grupo, natureza, ícone, receita fixa); os números
           ficam onde são decididos, no ambiente de cada pessoa. */
        nome: c.nome, grupo: c.grupo, natureza: c.natureza,
        receitaFixa: c.receitaFixa,
        icone: comIcone.icone, iconeEstilo: comIcone.iconeEstilo, iconeCor: comIcone.iconeCor,
      }
    }),
    pctCompleta: cfg?.pctCompleta ?? CONFIG_ICONES_PADRAO.pctCompleta,
    pctCategoria: cfg?.pctCategoria ?? CONFIG_ICONES_PADRAO.pctCategoria,
    pctGrupo: cfg?.pctGrupo ?? CONFIG_ICONES_PADRAO.pctGrupo,
  }
}

/** Marca que a pessoa editou o cadastro DELA — daqui pra frente o padrão do N0 não é mais empurrado. */
export async function marcarCategoriasEditadas() {
  const atual = await db.configuracoes.get(1)
  if (atual?.catsEditadasPeloUsuario) return
  await db.configuracoes.put({ ...(atual ?? { id: 1, ...CONFIG_ICONES_PADRAO }), id: 1, catsEditadasPeloUsuario: true })
}

const mesVigenciaAtual = () => {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Aplica o padrão (merge por nome, nunca apaga nada). Devolve quantos registros tocou. */
export async function aplicarPadrao(padrao: PadraoEditavel, ambienteAlvo?: string): Promise<{ grupos: number; categorias: number }> {
  let nGrupos = 0
  let nCategorias = 0
  /* O ambiente é resolvido ANTES de abrir a transação: dentro dela o Dexie só
     deixa tocar nas tabelas declaradas, e ler `configuracoes` lá dentro
     derruba tudo com NotFoundError (bug real, achado no teste desta rodada). */
  const amb = ambienteAlvo ?? (await ambienteDoBanco())
  const carimbo = marcaDoAmbiente(amb)
  await db.transaction('rw', db.grupos, db.categorias, db.metas, async () => {
    /* Tipo do grupo (entrada × saída) derivado das naturezas das categorias
       do próprio padrão — mesma regra da migração em `gruposUtil.ts`, sem
       guardar um campo que poderia divergir do cadastro. */
    const tipoDoGrupoNoPadrao = (nome: string): 'entrada' | 'saida' => {
      const cats = padrao.categorias.filter((c) => c.grupo === nome)
      return cats.length > 0 && cats.every((c) => c.natureza === 'Receita') ? 'entrada' : 'saida'
    }
    for (const g of padrao.grupos) {
      const existente = doAmbiente(await db.grupos.toArray(), amb).find((x) => x.nome === g.nome)
      if (existente?.id != null) {
        await db.grupos.update(existente.id, { icone: g.icone, iconeEstilo: g.iconeEstilo as GrupoRegistro['iconeEstilo'], iconeCor: g.iconeCor })
      } else {
        await db.grupos.add({ ...carimbo, nome: g.nome, ativo: true, tipo: tipoDoGrupoNoPadrao(g.nome), icone: g.icone, iconeEstilo: g.iconeEstilo as GrupoRegistro['iconeEstilo'], iconeCor: g.iconeCor })
      }
      nGrupos++
      if (g.percentual > 0) {
        const meta = doAmbiente(await db.metas.toArray(), amb).filter((m) => m.grupo === g.nome).sort((a, b) => (a.mesVigencia < b.mesVigencia ? 1 : -1))[0]
        if (meta?.id != null) await db.metas.update(meta.id, { percentual: g.percentual })
        else await db.metas.add({ ...carimbo, grupo: g.nome, percentual: g.percentual, base: 'receita_real', mesVigencia: mesVigenciaAtual() })
      }
    }
    for (const c of padrao.categorias) {
      const existente = doAmbiente(await db.categorias.toArray(), amb).find((x) => x.nome === c.nome)
      /* Item 18 (12/09/2026) e build 056: NENHUM valor da categoria é escrito
         pelo padrão — nem a meta de gasto, nem o planejado de receita. Os dois
         são do ambiente, então o padrão nunca sobrescreve o que a pessoa
         preencheu, e uma categoria criada agora nasce zerada pra ela
         preencher. O que o padrão escreve é só estrutura. */
      const campos = {
        grupo: c.grupo, natureza: c.natureza as Natureza,
        receitaFixa: c.receitaFixa, icone: c.icone,
        iconeEstilo: c.iconeEstilo as Categoria['iconeEstilo'], iconeCor: c.iconeCor,
      }
      if (existente?.id != null) await db.categorias.update(existente.id, campos)
      else await db.categorias.add({ ...carimbo, nome: c.nome, ativa: true, aceitavelMensal: 0, ...campos })
      nCategorias++
    }
  })
  const cfg = await db.configuracoes.get(1)
  await db.configuracoes.put({
    ...(cfg ?? { id: 1, ...CONFIG_ICONES_PADRAO }), id: 1,
    pctCompleta: padrao.pctCompleta ?? cfg?.pctCompleta ?? CONFIG_ICONES_PADRAO.pctCompleta,
    pctCategoria: padrao.pctCategoria ?? cfg?.pctCategoria ?? CONFIG_ICONES_PADRAO.pctCategoria,
    pctGrupo: padrao.pctGrupo ?? cfg?.pctGrupo ?? CONFIG_ICONES_PADRAO.pctGrupo,
  })
  return { grupos: nGrupos, categorias: nCategorias }
}

/* Ambiente novo precisa de pelo menos UMA conta — sem ela não dá pra lançar
   nada nem gerar massa de teste (item 14, 12/09/2026). */
async function garantirContaDoAmbiente(ambienteAlvo?: string) {
  const amb = ambienteAlvo ?? (await ambienteDoBanco())
  if (doAmbiente(await db.contas.toArray(), amb).length > 0) return
  await db.contas.add({
    ...marcaDoAmbiente(amb),
    nome: 'Conta corrente',
    tipo: 'corrente',
    instituicao: 'Conta corrente',
    saldoInicial: 0,
    dataSaldoInicial: new Date().toISOString().slice(0, 10),
    importavel: false,
    ativa: true,
  })
}

/**
 * Prepara um ambiente que ainda não tem cadastro nenhum: aplica o padrão da
 * plataforma (ou, na falta dele, o cadastro do ambiente deste aparelho) e
 * garante uma conta. Item 14 (12/09/2026) — sem isso, "gerar massa no cliente
 * X" falhava com "nenhuma conta cadastrada", porque o ambiente dele nascia
 * literalmente vazio.
 */
export async function prepararAmbiente(ambiente: string): Promise<boolean> {
  if (doAmbiente(await db.categorias.toArray(), ambiente).length > 0) {
    await garantirContaDoAmbiente(ambiente)
    return false
  }
  const platform = await lerPlatformN0Persistida()
  let dados: PadraoEditavel
  if (platform.padraoCategorias) {
    const { versao: _v, atualizadoEm: _a, ...resto } = platform.padraoCategorias
    void _v; void _a
    dados = resto
  } else {
    dados = await lerPadraoDoAmbienteAtual(AMBIENTE_DESTE_APARELHO)
  }
  if (dados.categorias.length === 0) return false
  await aplicarPadrao(dados, ambiente)
  await garantirContaDoAmbiente(ambiente)
  return true
}

/**
 * Chamada na abertura do app (N1). Só faz algo quando existe padrão salvo no
 * N0, este ambiente ainda não recebeu essa versão e a pessoa nunca editou o
 * próprio cadastro. Nunca lança — falhar aqui não pode impedir o app de abrir.
 */
export async function aplicarPadraoSeNaoEditado(): Promise<boolean> {
  try {
    const platform = await lerPlatformN0Persistida()
    const padrao = platform.padraoCategorias
    const cfg = await db.configuracoes.get(1)
    const ambiente = await ambienteDoBanco()
    /* Item 15 (12/09/2026): o controle de "qual versão do padrão este
       ambiente já recebeu" passou a ser POR AMBIENTE. Era um número único no
       singleton — então um cliente novo, aberto depois que este aparelho já
       tinha recebido a versão N, nunca recebia o padrão e abria sem categoria
       nenhuma. O campo antigo continua valendo como valor do ambiente do
       aparelho, pra não reaplicar nada em quem já está em dia. */
    const porAmbiente = cfg?.padraoCatVersaoPorAmbiente ?? {}
    const versaoDesteAmbiente = porAmbiente[ambiente]
      ?? (ambiente === AMBIENTE_DESTE_APARELHO ? (cfg?.padraoCatVersaoAplicada ?? 0) : 0)

    /* Ambiente sem NENHUMA categoria (cliente recém-criado, ou massa apagada)
       recebe o padrão sempre — senão o N1 dele abre sem cadastro nenhum e não
       dá nem pra lançar. */
    const vazio = (await lerDoAmbiente(db.categorias.toArray())).length === 0
    if (!padrao) {
      /* Sem padrão salvo no N0, um ambiente novo copia o cadastro do ambiente
         deste aparelho — é o "padrão atual" na prática (item 15). */
      if (!vazio || ambiente === AMBIENTE_DESTE_APARELHO) return false
      const doAparelho = await lerPadraoDoAmbienteAtual(AMBIENTE_DESTE_APARELHO)
      if (doAparelho.categorias.length === 0) return false
      await aplicarPadrao(doAparelho)
      await garantirContaDoAmbiente()
      return true
    }
    if (!vazio && cfg?.catsEditadasPeloUsuario && ambiente === AMBIENTE_DESTE_APARELHO) return false
    if (!vazio && versaoDesteAmbiente >= padrao.versao) return false

    const { versao: _v, atualizadoEm: _a, ...dados } = padrao
    void _v; void _a
    await aplicarPadrao(dados)
    await garantirContaDoAmbiente()
    const depois = await db.configuracoes.get(1)
    await db.configuracoes.put({
      ...(depois ?? { id: 1, ...CONFIG_ICONES_PADRAO }), id: 1,
      padraoCatVersaoPorAmbiente: { ...(depois?.padraoCatVersaoPorAmbiente ?? {}), [ambiente]: padrao.versao },
      ...(ambiente === AMBIENTE_DESTE_APARELHO ? { padraoCatVersaoAplicada: padrao.versao } : {}),
    })
    return true
  } catch {
    return false
  }
}
