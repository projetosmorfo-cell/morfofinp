import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ConfiguracaoIcones } from './db'

// Config universal de tamanho de ícone (01/09/2026, rodada seguinte) — ver
// `ConfiguracaoIcones` em `db.ts` pro porquê de ser um singleton (`id: 1`),
// nunca por categoria/grupo. Rafael pediu 3 percentuais independentes, um
// por "tipo de linha" onde ícone aparece, com estes padrões:
//
// 01/09/2026, rodada seguinte (mesmo dia): `pctSimples` virou `pctCategoria`
// — o ícone de categoria saiu de vez das listagens Simples (categoria
// expandida em Resumo/Situação/Planejamento, que não mostram mais nenhum
// ícone) e passou a valer só pra própria linha de categoria cadastrada, na
// tela Categorias e Grupos. O valor padrão (60%) e o slot em si são os
// mesmos de antes — só o significado/nome mudaram, mantendo compatibilidade
// com qualquer ajuste que o Rafael já tivesse feito (ver fallback de
// leitura em `useConfiguracaoIcones` abaixo).
export const CONFIG_ICONES_PADRAO: Omit<ConfiguracaoIcones, 'id'> = {
  pctCategoria: 60, // linha de categoria cadastrada — tela Categorias e Grupos
  pctCompleta: 30, // listagem Completa — Lançamentos e drill-in de Carteira
  pctGrupo: 30, // cabeçalho de grupo — Categorias, Situação, Resumo, Planejamento
}

// Alturas de referência (px), FIXAS por CSS (`min-height`/`height`
// explícitos nas classes correspondentes — ver index.css), de cada tipo de
// linha onde um ícone pode aparecer. O percentual configurado é sempre
// calculado em cima dessa altura fixa, nunca da altura real renderizada —
// sem isso, aumentar o ícone aumentaria a própria linha (ela é flex, o
// ícone vira o filho mais alto), que por sua vez mudaria o "100%" de
// referência: um alvo móvel, documentado como problema real numa rodada
// anterior (ver CLAUDE.md). Fixando a altura de referência, o percentual
// configurado por Rafael sempre produz o mesmo tamanho de ícone, previsível.
export const ALTURA_REF_ICONE: Record<'completa' | 'categoria' | 'grupo', number> = {
  completa: 64,
  categoria: 40,
  grupo: 32,
}

export function tamanhoIconePx(tipo: 'completa' | 'categoria' | 'grupo', pct: number): number {
  return Math.max(1, Math.round((pct / 100) * ALTURA_REF_ICONE[tipo]))
}

// Hook de leitura — usado em toda tela que exibe ícone de categoria/grupo.
// Sempre retorna um valor (nunca undefined): cai no padrão até a config
// existir de verdade no banco (primeira vez que alguém abre o app) ou
// enquanto o `useLiveQuery` ainda não resolveu. O fallback pra
// `(config as any)?.pctSimples` cobre quem já tinha essa config salva antes
// da rodada em que o campo foi renomeado pra `pctCategoria` — sem isso, um
// ajuste que o Rafael já tivesse feito no percentual antigo desapareceria
// silenciosamente na troca de nome.
// `ordemAbas` fica de fora do `Required<>` de propósito: é um campo mais
// novo (04/09/2026), gerenciado pelo próprio hook `useOrdemAbas()` abaixo,
// que já trata a ausência dele como "sem personalização" — não faz sentido
// forçar um valor aqui também. `planoId` (05/09/2026) pelo mesmo motivo,
// gerenciado por `usePlanoAtual()` em `src/kit/planoAtual.ts`. `hojeSimuladoISO`
// (05/09/2026) idem, gerenciado por `src/hojeSimulado.ts`. `credencialEmail`/
// `credencialSenha`/`sessaoAtiva` (05/09/2026, Etapa 8) idem, gerenciados
// por `src/kit/auth.ts`/`AppRoot.tsx` — nenhum lugar que usa este hook
// precisa saber de credencial/sessão.
export function useConfiguracaoIcones(): Required<
  Omit<
    ConfiguracaoIcones,
    | 'id'
    | 'ordemAbas'
    | 'planoId'
    | 'hojeSimuladoISO'
    | 'credencialEmail'
    | 'credencialSenha'
    | 'sessaoAtiva'
    | 'credencialEmailN0'
    | 'credencialSenhaN0'
    | 'sessaoAtivaN0'
    | 'marcaSeloEcossistema'
    | 'marcaWhatsappNumero'
    | 'marcaWhatsappMensagemPadrao'
    | 'ordemMenuEngrenagem'
    | 'simulacaoResolucao'
  >
> {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  const legado = config as unknown as { pctSimples?: number } | undefined
  return {
    pctCategoria: config?.pctCategoria ?? legado?.pctSimples ?? CONFIG_ICONES_PADRAO.pctCategoria,
    pctCompleta: config?.pctCompleta ?? CONFIG_ICONES_PADRAO.pctCompleta,
    pctGrupo: config?.pctGrupo ?? CONFIG_ICONES_PADRAO.pctGrupo,
    modoVisao: config?.modoVisao ?? 'premium',
  }
}

// Grava um ou mais campos do singleton — parcial, preserva os demais.
//
// CORREÇÃO (05/09/2026, Roteiro de Parametrização Morfo, Etapa 8): a versão
// anterior desta função montava o objeto do `.put()` listando só os 4 campos
// "de ícone" (pctCategoria/pctCompleta/pctGrupo/modoVisao) mais `...patch` —
// nunca espalhava `...atual` por completo. Como `db.configuracoes` é uma
// tabela singleton com VÁRIOS campos aditivos de etapas diferentes
// (`ordemAbas` da Etapa 4, `planoId` da Etapa 5, `hojeSimuladoISO` da Etapa
// 7, e agora `credencialEmail`/`credencialSenha`/`sessaoAtiva` da Etapa 8) e
// `Dexie.put()` SUBSTITUI o registro inteiro (não faz merge, mesma semântica
// do IndexedDB), toda chamada que não passasse um desses campos no `patch`
// os apagava silenciosamente do banco — ex.: simular uma data (Etapa 7)
// zerava o plano contratado (Etapa 5) e a ordem do rodapé (Etapa 4), porque
// nenhum desses dois era "conhecido" por esta função. Bug real, nunca pego
// nas verificações anteriores porque cada etapa só testava a leitura do seu
// PRÓPRIO campo logo depois de salvá-lo — nunca uma sequência entre etapas
// diferentes. Corrigido espalhando `...atual` primeiro (preserva QUALQUER
// campo já salvo, presente ou futuro, sem precisar listar cada um aqui) e só
// depois os defaults dos 4 campos de ícone (pra continuar funcionando na
// primeira gravação, quando `atual` ainda não existe) e o `patch` por cima.
export async function salvarConfiguracaoIcones(patch: Partial<Omit<ConfiguracaoIcones, 'id'>>) {
  const atual = await db.configuracoes.get(1)
  const legado = atual as unknown as { pctSimples?: number } | undefined
  await db.configuracoes.put({
    ...atual,
    id: 1,
    pctCategoria: atual?.pctCategoria ?? legado?.pctSimples ?? CONFIG_ICONES_PADRAO.pctCategoria,
    pctCompleta: atual?.pctCompleta ?? CONFIG_ICONES_PADRAO.pctCompleta,
    pctGrupo: atual?.pctGrupo ?? CONFIG_ICONES_PADRAO.pctGrupo,
    modoVisao: atual?.modoVisao ?? 'premium',
    ...patch,
  })
}

// Modo de visão (04/09/2026) — hook fino separado do de ícones por
// semântica (nada a ver com tamanho de ícone), mas mesmo singleton por
// baixo: evita reinventar leitura/escrita do registro `configuracoes`.
export function useModoVisao(): 'light' | 'premium' {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  return config?.modoVisao ?? 'premium'
}

export async function salvarModoVisao(modo: 'light' | 'premium') {
  await salvarConfiguracaoIcones({ modoVisao: modo })
}

// Ordem das abas do rodapé (04/09/2026, Roteiro de Parametrização Morfo,
// Etapa 4 — Kit de Estrutura Mínima, "Layout"). Mesmo padrão fino de
// `useModoVisao`/`salvarModoVisao` acima: singleton `configuracoes`, sem
// bump de schema (campo aditivo opcional). Retorna `undefined` quando não há
// personalização salva — quem usa decide o fallback (ordem padrão do
// código), pra não duplicar a lista de chaves aqui.
export function useOrdemAbas(): string[] | undefined {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  return config?.ordemAbas
}

export async function salvarOrdemAbas(ordem: string[]) {
  await salvarConfiguracaoIcones({ ordemAbas: ordem })
}

// "Marca do site institucional" (08/09/2026, G59 — item aprovado pro N0,
// editável em `DevApp` → Parâmetros → Marca). Hook fino de leitura, mesmo
// padrão de `useModoVisao`/`useOrdemAbas` acima — os 3 campos são
// opcionais de propósito: quem consome (`LoginView.tsx`/`suporte.ts`) já
// tem o próprio valor padrão/fallback, então este hook nunca inventa um
// aqui, só repassa o que está gravado (ou `undefined`).
export function useMarcaSite(): {
  seloEcossistema: string | undefined
  whatsappNumero: string | undefined
  whatsappMensagemPadrao: string | undefined
} {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  return {
    seloEcossistema: config?.marcaSeloEcossistema,
    whatsappNumero: config?.marcaWhatsappNumero,
    whatsappMensagemPadrao: config?.marcaWhatsappMensagemPadrao,
  }
}

export async function salvarMarcaSite(patch: {
  marcaSeloEcossistema?: string
  marcaWhatsappNumero?: string
  marcaWhatsappMensagemPadrao?: string
}) {
  await salvarConfiguracaoIcones(patch)
}

// Ordem do menu de engrenagem (08/09/2026, correção pós-G59, pedido do
// Rafael: "o menu sair tem que ser menu sem permitir retirar ele, só
// reposicionar") — mesmo padrão fino de `useOrdemAbas`/`salvarOrdemAbas`
// acima, mesmo singleton por baixo, mesma regra de reposição-só (nunca
// existe um "esconder item" aqui, só ordem). Quem consome (`MenuEngrenagem`
// em `App.tsx`) decide o fallback (ordem padrão do código) e sempre inclui
// TODA chave conhecida, mesmo as ausentes de uma ordem salva antiga.
export function useOrdemMenuEngrenagem(): string[] | undefined {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  return config?.ordemMenuEngrenagem
}

export async function salvarOrdemMenuEngrenagem(ordem: string[]) {
  await salvarConfiguracaoIcones({ ordemMenuEngrenagem: ordem })
}

// Simulação de resolução (ferramenta de teste do MVP — ver comentário
// completo em `ConfiguracaoIcones.simulacaoResolucao`, `db.ts`, e em
// `src/kit/SimulacaoResolucao.tsx`). Mesmo padrão fino de
// `useOrdemAbas`/`salvarOrdemAbas` acima.
//
// CORREÇÃO (08/09/2026, G60): só existe o estado `'web'` agora (força
// `#root` pra 100% da largura) — o antigo `'mobile'` (390px, depois 430px)
// foi removido: o padrão sem override JÁ é a largura real de produção
// (~480px), então um 2º valor fixo simulando "mobile" não acrescentava nada
// de real. Um valor `'mobile'` eventualmente ainda gravado por uma sessão
// anterior ao vivo simplesmente deixa de ter efeito (só `=== 'web'` liga a
// simulação) — sem quebrar, sem precisar de migração de schema.
export function useSimulacaoResolucao(): 'web' | undefined {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  return config?.simulacaoResolucao === 'web' ? 'web' : undefined
}

export async function salvarSimulacaoResolucao(modo: 'web' | undefined) {
  await salvarConfiguracaoIcones({ simulacaoResolucao: modo })
}
