import { db, type Lancamento } from '../db'
import { atualizarTenantN0, agoraISO, type TipoAuditoria } from './kitPlatform'
import { uid } from './kitBase'
import { fmtBRL } from '../formatoMoeda'

/* Auditoria do que a Morfo faz DENTRO do ambiente de um cliente (12/09/2026,
   build 052).

   O que o Rafael achou: "pelo N0 entrei no ambiente de um cliente
   (impersonate) e fiz um lançamento e na auditoria não apareceu o log". Estava
   certo — o registro de auditoria era gravado só pelas telas do painel N0. O
   ambiente do cliente (N1) é o aplicativo de negócio: ele nunca soube que
   existe auditoria, e nada do que acontece lá dentro chegava ao log.

   Por que o registro NÃO foi espalhado pelas telas: lançamento nasce, muda e
   morre em vários caminhos (o formulário, o clone, a tarja de status, a
   geração de recorrente, o pagamento de fatura, a limpeza em massa). Chamar um
   `registrar(...)` em cada um deles é garantir que o próximo caminho novo
   nasça sem registro — o mesmo tipo de esquecimento que produziu este achado.

   Então o gancho é o BANCO: os hooks `creating`/`updating`/`deleting` do Dexie
   na tabela de lançamentos veem toda escrita, venha de onde vier. Eles não
   gravam nada por conta própria (escrever em outra tabela de dentro de uma
   transação do Dexie é justamente o erro que já mordeu este projeto — ver a
   regra do `ambienteId` em `CLAUDE.md`): só empilham a descrição e deixam uma
   microtarefa gravar depois, fora da transação.

   Fora da impersonação isso custa uma comparação por escrita: `acessoSuporte`
   é nulo e o hook retorna na primeira linha. */

type AcessoSuporte = { tenantId: string; nome: string } | null

let acessoSuporte: AcessoSuporte = null
let fila: { acao: string; tipo: TipoAuditoria }[] = []
let agendado = false
let instalado = false

/* Chamado pelo `AppRoot` ao entrar e ao sair do ambiente de um cliente. Mora
   numa variável de módulo, e não num contexto React, porque quem precisa
   consultar é o hook do banco — que roda fora de qualquer árvore de
   componentes. */
export function definirAcessoSuporte(acesso: AcessoSuporte) {
  acessoSuporte = acesso
}

export function registrarAuditoriaAmbiente(acao: string, tipo: TipoAuditoria = 'ambiente') {
  if (!acessoSuporte) return
  fila.push({ acao, tipo })
  if (agendado) return
  agendado = true
  /* `queueMicrotask` não serve: ele ainda roda dentro da transação do Dexie
     que disparou o hook. `setTimeout(0)` garante que a transação já fechou. */
  setTimeout(() => { void descarregar() }, 0)
}

async function descarregar() {
  agendado = false
  const acesso = acessoSuporte
  const itens = fila
  fila = []
  if (!acesso || itens.length === 0) return
  try {
    await atualizarTenantN0(acesso.tenantId, (t) => ({
      ...t,
      accessLog: [
        ...(t.accessLog ?? []),
        ...itens.map((i) => ({
          id: uid(),
          ts: agoraISO(),
          /* O texto diz de onde veio, porque no log a mesma frase poderia ter
             sido escrita pelo próprio cliente. */
          action: `${i.acao} — Morfo, dentro do ambiente (acesso de suporte)`,
          ator: 'suporte',
          tipo: i.tipo,
          atorNome: acesso.nome,
        })),
      ],
    }))
  } catch {
    /* Auditoria é registro, nunca pré-requisito: uma falha aqui não pode
       derrubar o lançamento que a pessoa acabou de fazer. */
  }
}

function descrever(l: Partial<Lancamento> | undefined) {
  if (!l) return 'lançamento'
  const valor = typeof l.valor === 'number' ? ` de ${fmtBRL(Math.abs(l.valor))}` : ''
  const nome = l.descricao ? ` "${l.descricao}"` : ''
  return `lançamento${nome}${valor}`
}

export function instalarAuditoriaDeAmbiente() {
  if (instalado) return
  instalado = true
  db.lancamentos.hook('creating', (_pk, obj) => {
    if (!acessoSuporte) return
    registrarAuditoriaAmbiente(`Incluiu ${descrever(obj)}`, 'ambiente')
  })
  db.lancamentos.hook('updating', (mods, _pk, obj) => {
    if (!acessoSuporte) return
    const campos = Object.keys(mods as Record<string, unknown>)
    /* Marcar pago/não pago é o caminho mais usado e merece o texto próprio —
       um log dizendo só "alterou" obrigaria a abrir o registro pra entender. */
    const texto = campos.length === 1 && campos[0] === 'pago'
      ? `${(mods as { pago?: boolean }).pago ? 'Marcou como pago' : 'Desmarcou o pagamento de'} ${descrever(obj)}`
      : `Alterou ${descrever(obj)}`
    registrarAuditoriaAmbiente(texto, 'ambiente')
  })
  db.lancamentos.hook('deleting', (_pk, obj) => {
    if (!acessoSuporte) return
    registrarAuditoriaAmbiente(`Excluiu ${descrever(obj)}`, 'ambiente')
  })
}
