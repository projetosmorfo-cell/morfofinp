/* ============================================================================
   Tela ÚNICA de Configurações do N1 — Kit `ConfiguracoesView` (L4326-L4372).

   Por que existe (10/09/2026, pedido do Rafael): até aqui os 13 destinos de
   configuração do MorfoFinP moravam soltos dentro do popover "⋮", numa lista
   plana de 13 linhas que estourava a altura da tela (o bug "os 3 pontinhos
   está abrindo os menus escondidos cortando tela"). O pedido foi: o "⋮" fica
   com APENAS 4 itens (Configuração, Suporte/Chat, Atualizar e Sair) e
   "Configuração" leva para esta tela única, "com todos os parâmetros
   separados por sessão, mesclando os do Kit com os existentes no MorfoFinP,
   verificando redundâncias, colocando cada um na sessão que lhe cabe, e
   padronizando a tela de parâmetros com layout byte a byte com o Kit".

   AS 3 SESSÕES são as do Kit, na mesma ordem e com os mesmos rótulos —
   agrupadas por FREQUÊNCIA DE USO, não por origem do parâmetro:
     1) "Do dia a dia"      2) "Ajustes do sistema"      3) "Dados e saída"

   MERGE Kit × MorfoFinP, item a item (o "verificar redundâncias" do pedido):
   - Kit "Meus Dados" ................ existe aqui (`MeusDadosN1`)          → 1
   - Kit "Usuários" .................. NÃO se aplica (11/09/2026, Decisão 67:
     o ambiente do cliente é de UM usuário só, o do plano contratado)
   - Kit "Ajuda" (chat + tour) ....... existe aqui (`AjudaN1`)              → 1
   - Kit "Permissões" ................ NÃO se aplica (11/09/2026, Decisão 67:
     usuário único, com acesso total ao ambiente)
   - Kit "Meu Ambiente" .............. existe aqui (`MeuAmbienteN1`)        → 2
   - Kit "Minha Assinatura" .......... existe aqui (`MinhaAssinatura`)      → 2
   - Kit "Layout e Menus" ............ era a metade de cima de `Manutencao`
                                       (Visão do app + ordem do rodapé +
                                       ordem do menu) → virou `secao="layout"` → 2
   - Kit "Parametrização de Entidade A" → aqui a Entidade A é o LANÇAMENTO;
                                       os cadastros que o parametrizam são
                                       "Categorias e Grupos" e "Contas e
                                       carteiras", que já existiam            → 2
   - Kit "Importar registros" ........ NÃO existe no MorfoFinP (nunca houve
                                       importador CSV) — não inventado aqui.
   - Kit "Limpar todos os dados" ..... existe dentro de `Manutencao`        → 3
   - Kit "Sair" ...................... existe (`sair()`)                    → 3
   - MorfoFinP "Notificações bancárias" → sem par no Kit; é uso corrente    → 1
   - MorfoFinP "Suporte" (chat) ...... REDUNDANTE com "Ajuda" (o Kit já põe
                                       o chat dentro de Ajuda) E agora é
                                       item fixo do "⋮" → NÃO se repete aqui.
   - MorfoFinP "Aparência" ........... REMOVIDO da lista, exatamente como no
                                       Kit: o tema virou ícone fixo no topo
                                       (Padrão UI, seção 16). A tela em si
                                       continua existindo no código.
   - MorfoFinP "Manutenção" (resto) .. tour, ferramentas de teste, limpar
                                       dados, exportar ícones, diagnóstico
                                       de cache → `secao="dados"`           → 3

   A ORDEM salva pelo usuário (`ordemMenuEngrenagem`, antiga "Layout do menu
   de configurações") continua valendo: ela reordena os itens DENTRO de cada
   sessão. Nenhum item pode ser escondido — mesma garantia de sempre.
   ========================================================================= */
import { GroupLabelCompact, MenuGroup } from './PadraoUI'
import type { ItemMenuCompacto } from './PadraoUI'
import {
  User, LifeBuoy, Bell, Building2, CreditCard, List, Tag, Wallet,
  Wrench, AlertTriangle, LogOut,
} from 'lucide-react'
import { useTemaEfetivo } from '../configuracaoIcones'

/* As chaves são exatamente as de `ItemMenuEngrenagem` em `App.tsx` — a tela
   não inventa destino nenhum, só reorganiza os que já existiam. */
export type ChaveConfigN1 =
  | 'meusDados' | 'categorias' | 'contas' | 'notificacoes'
  | 'meuAmbiente' | 'assinatura' | 'ajuda' | 'layout'
  | 'manutencao' | 'limpar' | 'sair'

interface DefItem {
  key: ChaveConfigN1
  icon: ItemMenuCompacto['icon']
  titulo: string
  resumo: string
  destrutivo?: boolean
  badge?: boolean
}

const SESSAO_1: DefItem[] = [
  { key: 'meusDados', icon: User, titulo: 'Meus Dados', resumo: 'Seu nome, login, contato e troca de senha' },
  { key: 'categorias', icon: Tag, titulo: 'Categorias e Grupos', resumo: 'Como seus lançamentos são classificados' },
  { key: 'contas', icon: Wallet, titulo: 'Contas e carteiras', resumo: 'Onde o dinheiro entra e sai — bancos, cartões e dinheiro' },
  { key: 'notificacoes', icon: Bell, titulo: 'Notificações bancárias', resumo: 'Avisos do banco lidos e transformados em lançamento' },
  { key: 'ajuda', icon: LifeBuoy, titulo: 'Ajuda', resumo: 'Suporte por chat e tour guiado do sistema' },
]

const SESSAO_2: DefItem[] = [
  { key: 'meuAmbiente', icon: Building2, titulo: 'Meu Ambiente', resumo: 'Logotipos, recursos e preferências do ambiente' },
  { key: 'assinatura', icon: CreditCard, titulo: 'Minha Assinatura', resumo: 'Plano, pagamentos e histórico de cobrança' },
  { key: 'layout', icon: List, titulo: 'Layout e Menus', resumo: 'Visão Light × Premium, ordem do rodapé e destes itens' },
]

const SESSAO_3: DefItem[] = [
  { key: 'manutencao', icon: Wrench, titulo: 'Manutenção e dados', resumo: 'Tour, ferramentas de teste, exportar ícones e diagnóstico' },
  { key: 'limpar', icon: AlertTriangle, titulo: 'Limpar todos os dados', resumo: 'Apaga seus lançamentos — zona de risco', destrutivo: true },
  { key: 'sair', icon: LogOut, titulo: 'Sair', resumo: 'Encerrar a sessão neste aparelho', destrutivo: true },
]

/* A ordem salva pelo usuário reordena DENTRO da sessão; quem não está na
   ordem salva (item novo) fica no fim da sua sessão, nunca some. */
function ordenar(defs: DefItem[], ordem: string[]): DefItem[] {
  const pos = (k: string) => { const i = ordem.indexOf(k); return i < 0 ? 999 : i }
  return [...defs].sort((a, b) => pos(a.key) - pos(b.key))
}

export default function ConfiguracoesN1({
  ordem, onAbrir, chatNaoLida, podeVer,
}: {
  ordem: string[]
  onAbrir: (k: ChaveConfigN1) => void
  chatNaoLida?: boolean
  /* Mesmo papel do `podeSub` do Kit (item 143): sem acesso, a linha some —
     "Sair" nunca some. */
  podeVer?: (k: ChaveConfigN1) => boolean
}) {
  /* As peças do Kit recebem `dark` como booleano (não leem as variáveis CSS
     do produto), então o tema efetivo do N1 é traduzido aqui — é isso que faz
     a tela de parâmetros respeitar claro/escuro sem sair do layout do Kit. */
  const dark = useTemaEfetivo() === 'escuro'
  const visivel = (d: DefItem) => d.key === 'sair' || !podeVer || podeVer(d.key)
  const monta = (defs: DefItem[]): ItemMenuCompacto[] =>
    ordenar(defs, ordem).filter(visivel).map((d) => ({
      key: d.key,
      icon: d.icon,
      titulo: d.titulo,
      resumo: d.resumo,
      destrutivo: d.destrutivo,
      badge: d.key === 'ajuda' ? chatNaoLida : undefined,
      dataTour: d.key === 'ajuda' ? 'n1-ajuda-card' : undefined,
      onClick: () => onAbrir(d.key),
    }))

  return (
    <div style={{ paddingBottom: 24 }}>
      <GroupLabelCompact dark={dark}>Do dia a dia</GroupLabelCompact>
      <MenuGroup dark={dark} items={monta(SESSAO_1)} />
      <GroupLabelCompact dark={dark}>Ajustes do sistema</GroupLabelCompact>
      <MenuGroup dark={dark} items={monta(SESSAO_2)} />
      <GroupLabelCompact dark={dark}>Dados e saída</GroupLabelCompact>
      <MenuGroup dark={dark} items={monta(SESSAO_3)} />
    </div>
  )
}
