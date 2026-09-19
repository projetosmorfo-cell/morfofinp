import { liveQuery } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

// Fonte única de verdade pra "hoje" no app inteiro (05/09/2026, Roteiro de
// Parametrização Morfo, Etapa 7 — Ferramentas de teste). Todo lugar que
// precisava saber "que dia é hoje" pra calcular status (atrasado/a pagar/a
// receber, em `statusPagamento.ts`) ou pra decidir se uma ocorrência futura
// projetada já deveria ter acontecido (`recorrencia.ts`, e a projeção em
// ResumoDoMes/Situação/Planejamento) passa a ler daqui, nunca `new Date()`
// direto — assim a ferramenta de teste "simular data de hoje" (UI em
// `src/kit/SimularData.tsx`) afeta o app inteiro de um jeito consistente, em
// vez de só uma tela.
//
// Vive na RAIZ de `src/` (não em `src/kit/`) de propósito: `recorrencia.ts`
// e `statusPagamento.ts` são módulos centrais do app, existentes bem antes
// desta Etapa 7 — fazê-los importar de dentro de `src/kit/` inverteria a
// direção natural de dependência (o "core" do app passando a depender do
// pacote da parametrização Morfo). A ação de GRAVAR uma nova data simulada
// (que por sua vez aciona `recorrencia.ts`) fica em `src/kit/SimularData.tsx`
// — aqui só a LEITURA, que é o que o core precisa.
//
// `hojeEfetivoCache` é sincronizado com `db.configuracoes.hojeSimuladoISO`
// via `liveQuery` (a MESMA API por trás de `useLiveQuery`, só que utilizável
// fora de componente React) assim que este módulo é importado pela primeira
// vez — funções puras/síncronas como `statusDoLancamento` e
// `avancarSeriesFixasPendentes` podem ler `hojeEfetivoISO()` a qualquer
// momento sem precisar de hook nem de await, sempre com o valor mais
// recente gravado no banco.
let hojeEfetivoCache: string | undefined

liveQuery(() => db.configuracoes.get(1)).subscribe({
  next: (config) => {
    hojeEfetivoCache = config?.hojeSimuladoISO
  },
  error: (erro) => {
    // Nunca deixa o app inteiro quebrar por causa da ferramenta de teste —
    // na pior hipótese, cai no fallback de `new Date()` real abaixo.
    console.error('hojeSimulado: falha sincronizando com o banco', erro)
  },
})

/* BUG REAL reportado pelo Rafael (19/09/2026): informou o saldo do cofrinho
   duas vezes na mesma noite, com minutos de diferença (6.110,44 e depois
   7.000,00 — um AUMENTO) e o card mostrou como se tivesse CAÍDO -12,7%.
   Causa raiz: todo lugar do app que precisava de "hoje" sem poder usar
   `hojeEfetivoISO()` (ver `hojeRealISO()` logo abaixo) — e este próprio
   fallback aqui — calculava com `new Date().toISOString().slice(0, 10)`,
   que dá a data em Greenwich (UTC), não em Sorocaba. Sorocaba está 3 horas
   atrás de Greenwich (sem horário de verão desde 2019): então, entre 21h e
   meia-noite no relógio do Rafael, esse cálculo já achava que era o DIA
   SEGUINTE. Os dois registros do cofrinho, feitos minutos um do outro
   depois das 21h, caíram em datas diferentes — o mais NOVO (7.000,00)
   ficou com uma data mais "antiga" que o mais VELHO (6.110,44), e o app
   leu a ordem ao contrário. Corrigido usando os métodos de horário LOCAL
   do JavaScript (`getFullYear`/`getMonth`/`getDate`) em vez de
   `toISOString` (sempre UTC). */
export function hojeRealISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Uso em qualquer função pura/síncrona (statusPagamento.ts, recorrencia.ts,
// telas que calculam projeção). Fallback pra data real do sistema quando não
// há simulação ativa OU antes da 1ª sincronização do liveQuery acima
// resolver (janela de milissegundos no carregamento do app).
export function hojeEfetivoISO(): string {
  return hojeEfetivoCache ?? hojeRealISO()
}

// Uso em componente React que precisa RE-RENDERIZAR quando a data simulada
// muda (ex.: Lancamentos.tsx/Carteira.tsx, que não tinham motivo prévio pra
// se inscrever em `db.configuracoes`). Retorna só a simulação (undefined =
// nenhuma ativa) — quem quiser o valor efetivo (simulado OU real) chama
// `hojeEfetivoISO()` acima, de propósito função separada: o valor de
// exibição ("está simulando? qual data?") e o valor de cálculo ("que data
// uso pra comparar") são usos distintos.
export function useHojeSimuladoISO(): string | undefined {
  const config = useLiveQuery(() => db.configuracoes.get(1), [])
  return config?.hojeSimuladoISO
}
