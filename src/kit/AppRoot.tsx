import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import App from '../App'
import DevApp from './DevApp'
import LoginView from './LoginView'

// Raiz de camadas — adaptado do Kit de Estrutura Mínima Morfo (padrão
// N0/N1/Portal do Cliente + roteamento por `authLevel`). Roteiro de
// Parametrização Morfo, Etapa 4 (04/09/2026), com o Login real da Etapa 8
// (05/09/2026) trocando a entrada de verdade — ver abaixo.
//
// Adaptações registradas em Decisão 6 (`biblioteca/01-produto/decisoes.md`
// do Project):
// - Portal do Cliente (3ª camada do Kit) NÃO SE APLICA ao MorfoFinP — é um
//   app de finanças pessoais, o tenant não tem "clientes próprios" no
//   sentido que o Kit prevê (ex.: clientes de uma locadora, no MorfoLoc).
// - N0 (painel Morfo/dev) é alcançado por um botão dentro de Manutenção
//   (`onAbrirPainelN0`) — continua assim mesmo depois da Etapa 8, porque o
//   painel N0 nunca teve relação com o Login (é um painel de
//   desenvolvedor/Morfo, não do tenant).
//
// Etapa 8 (05/09/2026) — Login real, entrada de verdade: Rafael escolheu
// explicitamente "Trocar a entrada de verdade" (não uma prévia isolada,
// como Etapas 4-7) — o app agora SEMPRE passa por `LoginView` primeiro.
// `sessaoAtiva` (ver `src/db.ts`/`src/kit/auth.ts`) é lido aqui via
// `useLiveQuery` — reativo, então criar acesso/entrar/sair (que só gravam
// esse campo) já trocam de tela sozinhos, sem nenhum callback de navegação.
// Sentinela `CARREGANDO` (em vez de deixar o 3º argumento do
// `useLiveQuery` como `undefined`) distingue "ainda carregando o Dexie" de
// "carregou e realmente não existe sessão" — sem isso, todo carregamento do
// app piscaria a tela de Login por um instante antes de resolver pro estado
// real, mesmo pra quem já está logado.
export type AuthLevel = 'n0' | 'n1'

const CARREGANDO = Symbol('carregando')

export default function AppRoot() {
  const [authLevel, setAuthLevel] = useState<AuthLevel>('n1')
  const config = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO)

  if (config === CARREGANDO) return null

  if (!config?.sessaoAtiva) {
    return <LoginView />
  }

  if (authLevel === 'n0') {
    return <DevApp onVoltar={() => setAuthLevel('n1')} />
  }

  return <App onAbrirPainelN0={() => setAuthLevel('n0')} />
}
