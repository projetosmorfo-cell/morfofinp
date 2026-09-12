import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import App from '../App'
import DevApp from './DevApp'
import LoginView from './LoginView'
import { SimulacaoResolucaoFrame, FerramentasTesteFlutuantes } from './SimulacaoResolucao'
import { AplicadorDeTema } from './ConfigN1'
import SimularData from './SimularData'
import AmbienteBloqueado from './AmbienteBloqueado'
import RegularizarAcesso from './RegularizarAcesso'
import { useTenantN1, tenantBlocked, tenantCanceledExpired, usePlatformN0, paramsGlobais } from './kitPlatform'
import { sair } from './auth'
import { definirAmbienteAtivo, AMBIENTE_DESTE_APARELHO } from '../ambiente'
import { definirAcessoSuporte, instalarAuditoriaDeAmbiente } from './auditoriaAmbiente'
import CompletarPreCadastro from './CompletarPreCadastro'
import { lerPreCadastroDaURL, limparPreCadastroDaURL } from './preCadastroLink'
import { useMarcaSite } from '../configuracaoIcones'

// Raiz de camadas — REESCRITA em 08/09/2026 (Roteiro de Parametrização
// Morfo, G59 — "critério de aceite binário do encaixe"). A versão anterior
// (Etapas 4/8) tinha um único login (N1) e um `authLevel` local que
// alternava entre `<App/>`/`<DevApp/>` por um botão dentro de Manutenção —
// exatamente o "painel N0 de fachada dentro do N1" que G59 proíbe (achado
// real MorfoFinP 08/09, registrado em Lição 16 do Project).
//
// Modelo novo, direto do texto de G59:
// - **Login separa os níveis.** Duas credenciais INDEPENDENTES no mesmo
//   singleton `db.configuracoes` (`credencialEmail`/`credencialSenha`/
//   `sessaoAtiva` pra N1, `credencialEmailN0`/`credencialSenhaN0`/
//   `sessaoAtivaN0` pra N0 — ver `src/kit/auth.ts`/`src/kit/authN0.ts`).
//   `LoginView.tsx` expõe as duas entradas (a de N0 discreta, alcançável
//   direto do site, nunca de dentro do N1 — ver rodapé daquele arquivo).
// - **Não existe entrada pro N0 dentro do N1** — nenhuma tela do `App`
//   (N1) tem prop/callback que leve pro `DevApp`. O único caminho N0→N1 é
//   "entrar como" (impersonação), abaixo.
// - **Sessão N0 ativa manda**, sempre — exceto durante impersonação. Isso
//   não é o mesmo "authLevel" de antes (que só existia enquanto o app
//   estava aberto, perdido a cada reload): `sessaoAtivaN0` persiste no
//   Dexie, igual `sessaoAtiva` de N1 sempre persistiu.
// - **Impersonação** (`entrarComoTenant`) é um estado LOCAL, transitório,
//   nunca persistido — ao fechar/recarregar o app, o administrador Morfo
//   volta a cair no painel N0 (nunca fica "preso" dentro do tenant depois
//   de fechar e reabrir). Só existe pro tenant REAL (`t0` em
//   `DevApp.tsx`) — os 3 tenants de exemplo continuam sem essa ação
//   habilitada (são fictícios, não haveria "aplicativo" de verdade pra
//   entrar). Renderiza `<App modoConsultaN0={...}/>`, que mostra o banner
//   permanente "Modo consulta" (ver `App.tsx`) — nunca toca em
//   `sessaoAtiva`/`sessaoAtivaN0`, só o estado local `impersonando` aqui.
const CARREGANDO = Symbol('carregando')

export default function AppRoot() {
  const config = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO)
  /* 12/09/2026 (itens 13/14/15): agora guarda QUAL tenant está sendo
     acessado, não só um sim/não — é ele que define o ambiente cujos dados o
     app mostra. Entrar em outro cliente deixou de exibir os dados do
     aparelho. */
  const [impersonando, setImpersonando] = useState<string | null>(null)
  /* 12/09/2026 (build 052, pedido do Rafael): "quando sai do acesso
     impersonável ele deveria voltar pra tela do cadastro do cliente e tá
     voltando pra tela inicial". Guarda qual cliente estava aberto pra o painel
     reabrir a ficha DELE ao voltar — e é consumido uma vez só (o `DevApp`
     limpa), senão toda visita seguinte ao painel abriria naquela ficha. */
  const [clienteParaReabrir, setClienteParaReabrir] = useState<string | null>(null)
  /* 12/09/2026 (build 052): os hooks do banco que registram, na auditoria do
     cliente, o que a Morfo faz dentro do ambiente dele. Instalados uma vez, no
     primeiro render da raiz — antes de qualquer tela existir, então nenhuma
     escrita escapa. Ver `auditoriaAmbiente.ts`. */
  instalarAuditoriaDeAmbiente()
  // Ferramenta de teste 🕐 (G60) — modal simples por cima de tudo, aberto
  // pelo botão flutuante (ver `FerramentasTesteFlutuantes` abaixo). Reusa o
  // MESMO `SimularData` da Etapa 7 (com suas salvaguardas de reprocessamento
  // já testadas) — só o PONTO DE ENTRADA muda pra ficar Kit-exato, a lógica
  // por trás continua a mesma.
  const [ferramentaDataAberta, setFerramentaDataAberta] = useState(false)
  /* Link de pré-cadastro (12/09/2026, build 053). Lido UMA vez, no primeiro
     render: o endereço não muda sozinho durante a sessão, e reler a cada
     render faria a tela voltar sozinha depois de "Sair desta tela" (que limpa
     o fragmento). Ver `preCadastroLink.ts` pro porquê do dado vir dentro do
     link. */
  const [preCadastro, setPreCadastro] = useState(() => lerPreCadastroDaURL())
  /* Trocar só o fragmento não recarrega a página (o navegador trata como
     navegação dentro do mesmo documento), então o `useState` acima não roda de
     novo — sem este ouvinte, colar o link na barra de endereço de um app já
     aberto não abriria nada. O caso comum (tocar no link vindo do WhatsApp)
     carrega a página do zero e nem chega aqui. */
  useEffect(() => {
    const aoTrocar = () => setPreCadastro(lerPreCadastroDaURL())
    window.addEventListener('hashchange', aoTrocar)
    return () => window.removeEventListener('hashchange', aoTrocar)
  }, [])
  const marca = useMarcaSite()

  // Tenant N1 (sempre `t0`, ver `TENANT_N1_ID` em `kitPlatform.ts`) — lido
  // aqui, incondicional a cada render (regra dos hooks), só pra decidir o
  // gate de bloqueio logo abaixo. `useTenantN1` já é reativo (`useLiveQuery`
  // por baixo), então um bloqueio/desbloqueio feito pelo N0 troca a tela na
  // hora, sem precisar de reload.
  const tenantN1 = useTenantN1()
  /* Parâmetros globais da plataforma (tolerância e dias de aviso) — o gate de
     cobrança abaixo e a tarja de aviso do N1 leem os MESMOS valores. */
  const plataformaN0 = usePlatformN0()
  const paramsGlobaisN0 = paramsGlobais(plataformaN0)

  if (config === CARREGANDO) return null

  /* A tela do link é ISOLADA: enquanto o fragmento estiver no endereço, ela é
     a única coisa que aparece — antes do site, do login e de qualquer sessão.
     Quem abre esse link é um cliente que ainda não tem acesso. O "Sair desta
     tela" existe pro caso de a própria Morfo abrir o link pra conferir. */
  if (preCadastro) {
    return <CompletarPreCadastro
      dados={preCadastro}
      contato={{ whatsapp: marca.whatsappNumero, email: undefined }}
      aoSair={() => { limparPreCadastroDaURL(); setPreCadastro(null) }}
    />
  }

  const n0Ativa = Boolean(config?.sessaoAtivaN0)
  const n1Ativa = Boolean(config?.sessaoAtiva)

  let conteudo: React.ReactNode

  if (n0Ativa && impersonando) {
    /* Enquanto a Morfo está dentro do ambiente, toda escrita de lançamento vira
       registro de auditoria naquele cliente (`auditoriaAmbiente.ts`). Ligado
       aqui, no render, e não num efeito, porque o hook do banco pode disparar
       antes de um efeito rodar. */
    definirAcessoSuporte({
      tenantId: impersonando,
      nome: plataformaN0?.devUsers?.find((u) => u.id === config?.loggedDevUserId)?.name ?? 'Morfo',
    })
    const sairDoAmbiente = () => {
      definirAcessoSuporte(null)
      setClienteParaReabrir(impersonando)
      setImpersonando(null)
      void definirAmbienteAtivo(undefined)
    }
    conteudo = <App modoConsultaN0={{ onVoltar: sairDoAmbiente }} />
  } else if (n0Ativa) {
    definirAcessoSuporte(null)
    // Sessão N0 ativa manda: painel N0 do Kit, inteiro, nada do aplicativo
    // de negócio — mesmo com uma sessão N1 antiga ainda marcada como ativa
    // no mesmo banco (ex.: o próprio Rafael logado nas duas camadas em
    // momentos diferentes). "Sair" aqui (ver DevApp.tsx) só zera
    // `sessaoAtivaN0` — nunca mexe em `sessaoAtiva` (N1).
    conteudo = <DevApp
      clienteParaReabrir={clienteParaReabrir}
      aoReabrirCliente={() => setClienteParaReabrir(null)}
      onEntrarComoTenant={(tenantId) => {
      /* O ambiente é gravado ANTES de montar o `<App/>`: a tela lê o ambiente
         do banco, então trocar a ordem faria o primeiro render do cliente
         mostrar os dados do ambiente anterior por um instante. */
      void (async () => {
        await definirAmbienteAtivo(tenantId === AMBIENTE_DESTE_APARELHO ? undefined : tenantId)
        setImpersonando(tenantId)
      })()
    }} />
  } else if (!n1Ativa) {
    definirAcessoSuporte(null)
    conteudo = <LoginView />
  } else if (tenantN1 && tenantBlocked(tenantN1, paramsGlobaisN0.toleranceDays)) {
    // Gate de bloqueio (11/09/2026, lacuna real — achado por investigação:
    // o app do cliente nunca checava `tenantBlocked()`, então um ambiente
    // bloqueado manualmente pela Morfo ou por pendência de pagamento além
    // do prazo de tolerância continuava abrindo o app normal). Kit
    // (App.jsx ~L7813): este check vem só do lado do login DIRETO do
    // cliente (`n1Ativa`, sem impersonação) — a sessão N0 impersonando
    // (`n0Ativa && impersonando`, ramo acima) continua entrando no
    // ambiente mesmo bloqueado, porque é o próprio suporte da Morfo
    // acessando pra ajudar a resolver a pendência.
    /* 12/09/2026, item 3: duas telas de bloqueio, escolhidas pelo MOTIVO.
       Bloqueio manual ou assinatura encerrada não têm o que a pessoa resolva
       sozinha — segue a tela de sempre, que manda falar com a Morfo. Já
       mensalidade vencida e teste terminado têm saída óbvia: cai no passo a
       passo de contratação, pré-preenchido, com o extrato das pendências. */
    conteudo = (tenantN1.manualBlock || tenantCanceledExpired(tenantN1))
      ? <AmbienteBloqueado tenant={tenantN1} onLogoff={() => { void sair() }} />
      : <RegularizarAcesso tenant={tenantN1} params={paramsGlobaisN0} onLogoff={() => { void sair() }} />
  } else {
    definirAcessoSuporte(null)
    conteudo = <App />
  }

  // `SimulacaoResolucaoFrame` (ferramenta de teste do MVP — ver comentário
  // completo naquele arquivo) precisa envolver TUDO aqui em cima, não só o
  // `<App/>`: a simulação de largura tem que valer também na tela de Login e
  // no painel N0. `FerramentasTesteFlutuantes` (G60) — os 2 botões
  // flutuantes 📱/🖥️/🕐, Kit-exatos — fica DENTRO do frame (mas fora do
  // fluxo normal, `position: fixed`) pra aparecer em qualquer camada.
  return (
    <SimulacaoResolucaoFrame>
      {/* Aplica o tema salvo (Decisão 55 — "Aparência") no <html> assim que o
          app abre, em qualquer camada; não renderiza nada. */}
      <AplicadorDeTema />
      {conteudo}
      <FerramentasTesteFlutuantes onAbrirFerramentaData={() => setFerramentaDataAberta(true)} />
      {ferramentaDataAberta && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'var(--bg, #14131a)',
            overflowY: 'auto',
          }}
        >
          <SimularData aoVoltar={() => setFerramentaDataAberta(false)} />
        </div>
      )}
    </SimulacaoResolucaoFrame>
  )
}
