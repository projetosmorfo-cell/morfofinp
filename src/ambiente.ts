/* Escopo por AMBIENTE — itens 13, 14, 15 e 23 da lista do Rafael (12/09/2026):

     "acessando com outro usuário onde eu gerei a base de testes, ele exibe os
      dados do usuário dele"
     "não deu pra testar geração de massa porque ao entrar em outro ambiente
      sempre mostra os dados dele"
     "cadastrei cliente novo, fui gerar massa de teste e não habilitou (já tem
      registro); ao limpar os dados desse cliente, apagou tudo do usuário dele
      também — completamente errado. Sei que é por não ter backend, mas pra eu
      testar tem que separar registros por ambientes."

   CAUSA REAL: lançamento, categoria, conta, grupo, meta, saldo e notificação
   sempre foram globais no IndexedDB deste aparelho — não existia nenhum campo
   dizendo de QUEM era o registro. Com um cliente só (o dele) isso nunca doeu;
   com o cadastro de cliente do N0 (build 036) passaram a existir vários
   ambientes dividindo a mesma base.

   COMO FICOU: cada registro dessas 7 tabelas carrega `ambienteId`. AUSENTE
   significa "ambiente deste aparelho" — é assim que todo o histórico real dele
   já está gravado, então nada precisou ser migrado e, no uso normal, nada
   muda. Só quando o painel N0 entra DENTRO de outro cliente é que o ambiente
   ativo passa a ser outro, e aí as telas leem e gravam só o que é daquele
   cliente.

   Por que não é índice do Dexie: as telas já carregam essas tabelas inteiras
   (`toArray()`) e filtram em memória — criar índice exigiria bump de schema
   sem ganho nenhum aqui. */
import { liveQuery } from 'dexie'
import { useEffect, useState } from 'react'
import { db } from './db'
import { salvarConfiguracaoIcones } from './configuracaoIcones'

/** O ambiente deste aparelho — o mesmo id que o painel N0 usa pro tenant real. */
export const AMBIENTE_DESTE_APARELHO = 't0'

let cache: string = AMBIENTE_DESTE_APARELHO
let inicializado = false

function iniciarObservacao() {
  if (inicializado) return
  inicializado = true
  liveQuery(() => db.configuracoes.get(1)).subscribe({
    next: (cfg) => { cache = cfg?.ambienteAtivoId || AMBIENTE_DESTE_APARELHO },
    error: () => { /* nunca pode derrubar a tela */ },
  })
}
iniciarObservacao()

/** Leitura síncrona do ambiente ativo (mesmo padrão de `hojeSimulado.ts`). */
export function ambienteAtivoId(): string {
  return cache
}

/** Versão reativa, pra tela que precisa re-renderizar quando o ambiente muda. */
export function useAmbienteAtivo(): string {
  const [valor, setValor] = useState(cache)
  useEffect(() => {
    const inscricao = liveQuery(() => db.configuracoes.get(1)).subscribe({
      next: (cfg) => setValor(cfg?.ambienteAtivoId || AMBIENTE_DESTE_APARELHO),
      error: () => { /* ignora */ },
    })
    return () => inscricao.unsubscribe()
  }, [])
  return valor
}

/** O registro pertence ao ambiente informado (ausente = ambiente do aparelho)? */
export function ehDoAmbiente(registro: { ambienteId?: string }, ambiente = cache): boolean {
  return (registro.ambienteId || AMBIENTE_DESTE_APARELHO) === ambiente
}

/** Filtra uma lista carregada do banco pelo ambiente ativo. */
export function doAmbiente<T extends { ambienteId?: string }>(lista: T[] | undefined, ambiente = cache): T[] {
  if (!lista) return []
  return lista.filter((r) => ehDoAmbiente(r, ambiente))
}

/**
 * Carimbo pra gravação. No ambiente do aparelho devolve `{}` — assim o
 * registro continua nascendo sem o campo, exatamente como todo o histórico
 * dele, e um backup antigo restaurado segue válido.
 */
export function marcaDoAmbiente(ambiente = cache): { ambienteId?: string } {
  return ambiente === AMBIENTE_DESTE_APARELHO ? {} : { ambienteId: ambiente }
}

/** Lê o ambiente ativo DO BANCO (não do cache). */
export async function ambienteDoBanco(): Promise<string> {
  const cfg = await db.configuracoes.get(1)
  return cfg?.ambienteAtivoId || AMBIENTE_DESTE_APARELHO
}

/**
 * Embrulha uma consulta de tabela escopada. Ler o ambiente DENTRO da consulta
 * é de propósito: o `useLiveQuery` do Dexie passa a observar também
 * `configuracoes`, então trocar de ambiente re-executa a consulta sozinho, sem
 * precisar de dependência manual em tela nenhuma.
 */
export async function lerDoAmbiente<T extends { ambienteId?: string }>(consulta: Promise<T[]>): Promise<T[]> {
  const [lista, ambiente] = await Promise.all([consulta, ambienteDoBanco()])
  return doAmbiente(lista, ambiente)
}

/** Contagem escopada — substitui um `.count()` cru. */
export async function contarDoAmbiente<T extends { ambienteId?: string }>(consulta: Promise<T[]>): Promise<number> {
  return (await lerDoAmbiente(consulta)).length
}

/** Troca o ambiente que o app está exibindo. `undefined` volta pro aparelho. */
export async function definirAmbienteAtivo(id: string | undefined): Promise<void> {
  await salvarConfiguracaoIcones({ ambienteAtivoId: id })
  cache = id || AMBIENTE_DESTE_APARELHO
}
