/* ============================================================================
   Ícones de topo — transcrição do Projeto Modelo (`esqueleto-morfo-v1.jsx`).

   Por que este arquivo existe: item 18 do CONTRATO DE EXECUÇÃO (G68/G69) exige
   paridade item a item — "ícones de busca/usuário/⋮ no topo do N0 e do N1" e
   "exportação em toda tela de listagem/resumo". Até a rodada de 10/09/2026 o
   MorfoFinP não tinha NENHUM dos três: o `TopIconMenu` só existia citado num
   comentário do `App.tsx`, não havia ícone de usuário logado nem de busca, e a
   exportação não existia em lugar nenhum.

   Peças transcritas (citadas pelo nome da função no Projeto Modelo, não por
   número de linha — o esqueleto muda de linha a cada rodada, achado da
   reconciliação de 11/09/2026):
     TopIconMenu · UserHoverIcon · ThemeToggleIcon
     LayoutContext · mostraIconeTopo · NavBadge
     StandardTopIcons / DevStandardTopIcons → `IconesDeTela` aqui

   RECONFERIDO em 11/09/2026: `TopIconMenu`/`UserHoverIcon` são montados uma
   única vez por `App.tsx`/`DevApp.tsx` numa linha própria de marca (mesmo
   padrão que o Projeto Modelo adotou depois — "⋮" e usuário saíram da linha
   do título e subiram pra linha do logo); `IconesDeTela` cobre só o que ficou
   na linha do título (Buscar/Selecionar/Filtro/Chat/Exportar/Incluir). Sem
   divergência — as duas pontas já se falam.

   ADAPTAÇÕES (G44 regra 3), marcadas no ponto exato:
   - `ThemeToggleIcon` guarda a escolha no singleton `db.configuracoes`
     (`temaPreferido`), que é o armazenamento deste produto, no lugar do
     `mlocStorage` do Projeto Modelo. O papel de "restaurar no boot" (Padrão
     UI, seção 16) já é feito por `AplicadorDeTema` em `AppRoot.tsx`, montado
     uma vez.
   - `StandardTopIcons` e `DevStandardTopIcons` são o MESMO conjunto de ícones
     nos dois níveis, mudando só a cor — aqui viraram um componente só
     (`IconesDeTela`) com o prop `dark`, em vez de duas cópias.
   ========================================================================= */
import { createContext, useContext, useState } from 'react'
import type { CSSProperties, ComponentType, ReactNode } from 'react'
import { MoreVertical, User, Monitor, Sun, Moon, Search, MessageCircle, Download, Filter, CheckSquare } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { alpha, iconBtnStyle, INK, TXT2, TXT3, LINE, SOFT, BRANCO, RED, PURPLE, DEV_BG, DEV_CARD, DEV_ACCENT } from './kitBase'
import { useTemaPreferido, salvarTemaPreferido, type TemaPreferido } from '../configuracaoIcones'
import type { LayoutConfig } from './kitPlatform'

/* ---- Projeto Modelo (LayoutContext/mostraIconeTopo): quais ícones aparecem no topo. `topoIcones.<k> !== false`
   — ou seja, o padrão é APARECER; só some quando o N0 desliga em
   Parâmetros → Layout do Sistema. ---- */
export const LayoutContext = createContext<LayoutConfig>({ iconesTopo: 'direita' })
export function mostraIconeTopo(cfg: LayoutConfig | undefined, k: 'busca' | 'chat' | 'exportar') {
  return (cfg?.topoIcones as Record<string, boolean> | undefined)?.[k] !== false
}

/* ---- Projeto Modelo (NavBadge) ---- */
export function NavBadge({ abs }: { abs?: boolean }) {
  return <span className="mloc-badge-pulse" style={{ width: 8, height: 8, borderRadius: 999, background: RED, flexShrink: 0, ...(abs ? { position: 'absolute', top: 3, right: 3 } : { marginLeft: 'auto' }) }} />
}

/* `icon` aceita tanto os ícones lucide do Kit quanto os Heroicons das telas do
   N1/N0 (10/09/2026, Decisão 58): com "Posição dos menus" um menu do rodapé
   pode passar a viver dentro do "⋮", e aí o ícone que vem junto é o da aba.
   Os dois tipos aceitam `size`/`color`, que é tudo o que este menu usa. */
export interface ItemMenuTopo { icon: ComponentType<{ size?: number; color?: string }>; label: ReactNode; onClick: () => void; danger?: boolean; hasUnread?: boolean }

/* ---- Projeto Modelo (TopIconMenu): o "⋮". `panelDir` existe porque, fora do topo, o painel precisa
   abrir pra cima e/ou pro lado oposto, senão nasce fora da tela. ---- */
export function TopIconMenu({ items, dark, hasUnread, panelDir, big }: {
  items: ItemMenuTopo[]; dark?: boolean; hasUnread?: boolean
  panelDir?: { vertical?: 'up' | 'down'; horizontal?: 'left' | 'right' }; big?: boolean
}) {
  const [open, setOpen] = useState(false)
  if (!items || !items.length) return null
  const vert = panelDir?.vertical || 'down'; const horiz = panelDir?.horizontal || 'right'
  return <div style={{ position: 'relative', flexShrink: 0 }}>
    <button onClick={() => setOpen(v => !v)} title="Mais opções" data-tour="n1-mais-opcoes" className={hasUnread ? 'mloc-shake' : ''} style={{ ...(dark ? { ...iconBtnStyle, background: 'rgba(255,255,255,0.08)' } : iconBtnStyle), ...(big ? { width: 50, height: 50, borderRadius: 999, boxShadow: '0 4px 14px rgba(0,0,0,0.28)' } : {}), position: 'relative' }}>
      <MoreVertical size={big ? 22 : 18} color={dark ? '#fff' : INK} />
      {hasUnread && <span className="mloc-badge-pulse" style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 999, background: RED, border: `2px solid ${dark ? DEV_BG : '#fff'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 900, color: '#fff', padding: '0 3px' }}>!</span>}
    </button>
    {open && <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 44 }} onClick={() => setOpen(false)} />
      {/* Clamp de tamanho (10/09/2026) — bug real relatado pelo Rafael: "os 3
          pontinhos está abrindo os menus escondidos cortando tela". Com a
          lista longa o painel nascia mais alto que a tela e os últimos itens
          (inclusive "Sair") ficavam inalcançáveis, sem rolagem nenhuma. Duas
          travas, independentes do número de itens: `maxHeight` = altura da
          janela menos a barra do topo, com rolagem própria; e `maxWidth` =
          largura da janela menos 24px de folga, pra nunca vazar de lado numa
          tela estreita. */}
      <div style={{ position: 'absolute', ...(vert === 'up' ? { bottom: big ? 58 : 42 } : { top: big ? 58 : 42 }), ...(horiz === 'left' ? { left: 0 } : { right: 0 }), background: dark ? DEV_CARD : BRANCO, border: dark ? 'none' : `1px solid ${LINE}`, boxShadow: '0 6px 20px rgba(0,0,0,0.18)', borderRadius: 12, padding: 5, zIndex: 45, minWidth: 190, maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100vh - 96px)', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {items.map((it, i) => <button key={i} onClick={() => { setOpen(false); it.onClick() }} style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: it.danger ? RED : (dark ? '#fff' : INK), whiteSpace: 'nowrap', position: 'relative' }}>
          <it.icon size={16} color={it.danger ? RED : (dark ? '#9B96A8' : TXT3)} /> {it.label}
          {it.hasUnread && <span style={{ marginLeft: 'auto', fontSize: 9.5, fontWeight: 900, color: '#fff', background: RED, borderRadius: 999, padding: '1px 6px' }}>!</span>}
        </button>)}
      </div>
    </>}
  </div>
}

/* ---- Projeto Modelo (UserHoverIcon): ícone do usuário logado; o nome aparece no hover/title. ---- */
export function UserHoverIcon({ label, dark }: { label?: string; dark?: boolean }) {
  const [hover, setHover] = useState(false)
  if (!label) return null
  return <span style={{ position: 'relative', flexShrink: 0, display: 'inline-flex' }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    <span title={label} style={{ width: 30, height: 30, borderRadius: 999, background: dark ? alpha(DEV_ACCENT, 15) : SOFT, border: `1px solid ${dark ? alpha(DEV_ACCENT, 30) : LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'default' }}>
      <User size={14} color={dark ? DEV_ACCENT : TXT2} />
    </span>
    {hover && <span style={{ position: 'absolute', top: 34, right: 0, background: dark ? DEV_CARD : BRANCO, color: dark ? '#fff' : INK, border: dark ? 'none' : `1px solid ${LINE}`, boxShadow: '0 5px 16px rgba(0,0,0,0.22)', borderRadius: 8, padding: '5px 10px', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', zIndex: 46 }}>{label}</span>}
  </span>
}

/* ---- Projeto Modelo (ThemeToggleIcon, Padrão UI seção 16): ícone fixo de tema, 30×30, um toque
   CICLA Automático → Claro → Escuro. ADAPTAÇÃO: a escolha é gravada em
   `db.configuracoes.temaPreferido` (armazenamento deste produto) e aplicada ao
   <html> por `AplicadorDeTema` (AppRoot), que também é quem restaura no boot —
   por isso aqui só se grava, nunca se escreve o atributo direto. ---- */
export function ThemeToggleIcon({ dark }: { dark?: boolean }) {
  const tema = useTemaPreferido()
  const ORDEM: TemaPreferido[] = ['auto', 'claro', 'escuro']
  const NOMES: Record<TemaPreferido, string> = { auto: 'Automático (acompanha o aparelho)', claro: 'Claro', escuro: 'Escuro' }
  const ICONES: Record<TemaPreferido, LucideIcon> = { auto: Monitor, claro: Sun, escuro: Moon }
  const proximo = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length]
  const Icone = ICONES[tema] || Monitor
  const cor = dark ? DEV_ACCENT : PURPLE
  const titulo = `Tema: ${NOMES[tema]}. Toque para mudar para ${NOMES[proximo]}.`
  return <button onClick={() => void salvarTemaPreferido(proximo)} title={titulo} aria-label={titulo} style={{ width: 30, height: 30, borderRadius: 999, border: 'none', background: alpha(cor, 8), display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
    <Icone size={15} color={cor} />
  </button>
}

/* ---- Projeto Modelo (StandardTopIcons N1 + DevStandardTopIcons N0): a linha de ícones da tela. Ordem do
   Projeto Modelo: Buscar, Chat, Exportar, e o Incluir sempre por último. Cada um obedece o
   `topoIcones` do Layout do Sistema (N0 → Parâmetros). ---- */
export function IconesDeTela({ dark, onSelecionar, selecaoAtiva, onBuscar, buscaAtiva, onFiltrar, filtrosAtivos = 0, onChat, chatNaoLida, onExportar, incluir }: {
  dark?: boolean
  /* Seleção · Busca · Filtro (10/09/2026, pedido do Rafael): nas telas de
     lista COMPLETA, o que era botão de texto ("Selecionar") e campo de busca
     fixo virou ícone nesta mesma fileira, na ordem
     Selecionar · Buscar · Filtro · Exportar. */
  onSelecionar?: () => void
  selecaoAtiva?: boolean
  onBuscar?: () => void
  buscaAtiva?: boolean
  onFiltrar?: () => void
  filtrosAtivos?: number
  onChat?: () => void
  chatNaoLida?: boolean
  onExportar?: () => void
  incluir?: ReactNode
}) {
  const cfgLayout = useContext(LayoutContext)
  const btn: CSSProperties = dark ? { ...iconBtnStyle, background: 'rgba(255,255,255,0.08)' } : iconBtnStyle
  const cor = dark ? '#fff' : INK
  /* Um ícone "ligado" (seleção ativa, busca preenchida, filtro aplicado) fica
     com o fundo de destaque — senão não haveria como saber, olhando a tela,
     que a lista está recortada; é o mesmo princípio da tarja de filtro ativo
     que existia na barra antiga. */
  const btnAtivo: CSSProperties = { ...btn, background: alpha(PURPLE, 0.9), }
  return <>
    {onSelecionar && <button onClick={onSelecionar} title={selecaoAtiva ? 'Sair da seleção' : 'Selecionar'} aria-pressed={!!selecaoAtiva} data-testid="ativar-selecao" style={selecaoAtiva ? btnAtivo : btn}><CheckSquare size={18} color={selecaoAtiva ? '#fff' : cor} /></button>}
    {onBuscar && mostraIconeTopo(cfgLayout, 'busca') && <button onClick={onBuscar} title="Buscar" aria-pressed={!!buscaAtiva} style={buscaAtiva ? btnAtivo : btn}><Search size={18} color={buscaAtiva ? '#fff' : cor} /></button>}
    {onFiltrar && <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <button onClick={onFiltrar} title="Filtros e ordenação" aria-label={filtrosAtivos > 0 ? `Filtros — ${filtrosAtivos} ativo(s)` : 'Filtros e ordenação'} style={filtrosAtivos > 0 ? btnAtivo : btn}><Filter size={18} color={filtrosAtivos > 0 ? '#fff' : cor} /></button>
      {filtrosAtivos > 0 && <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, background: RED, border: `2px solid ${dark ? DEV_BG : 'var(--bg)'}`, color: '#fff', fontSize: 9.5, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{filtrosAtivos}</span>}
    </span>}
    {onChat && mostraIconeTopo(cfgLayout, 'chat') && <button onClick={onChat} title="Chat" className={chatNaoLida ? 'mloc-shake' : ''} style={{ ...btn, position: 'relative' }}><MessageCircle size={18} color={cor} />{chatNaoLida && <span className="mloc-badge-pulse" style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 999, background: RED, border: `2px solid ${dark ? DEV_BG : '#fff'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 900, color: '#fff', padding: '0 3px' }}>!</span>}</button>}
    {onExportar && mostraIconeTopo(cfgLayout, 'exportar') && <button onClick={onExportar} title="Exportar" style={btn}><Download size={18} color={cor} /></button>}
    {/* o Incluir é sempre o último ícone da linha do título (Kit L5681). */}
    {incluir}
  </>
}
