import { useState } from 'react'
import { Lock, LogOut, MessageCircle } from 'lucide-react'
import { alpha, primaryBtn, secondaryBtn, RED, INK, TXT2, BRANCO } from './kitBase'
import { tenantCanceledExpired, hasUnreadTenant, fmtDate, type TenantKit } from './kitPlatform'
import SuporteChat from './SuporteChat'

// Tela de "ambiente bloqueado" do lado N1 (11/09/2026) — lacuna real: o app
// do cliente nunca teve gate nenhum contra `tenantBlocked()` (ver
// `kitPlatform.ts`), então um tenant bloqueado manualmente pela Morfo ou por
// pendência de pagamento além do prazo de tolerância continuava vendo o app
// normal, sem nenhum aviso. Adaptação LITERAL de `BlockedScreen` do Kit
// (`esqueleto-morfo.jsx`, ~L4758-L4786), com duas trocas de peça:
// - `SuporteView` (folha flutuante do Kit, com sua própria lógica de mensagem
//   automática/fora de horário) não existe neste produto — o chat interno já
//   é uma TELA própria (`SuporteChat.tsx`, que já cobre "Autorizar acesso da
//   Morfo" + a conversa via `ChatConversa.tsx`); aqui ela é aberta como
//   overlay em tela cheia, mesmo padrão que `AppRoot.tsx` já usa pra abrir
//   `SimularData` por cima de tudo. A lógica de resposta automática (1ª
//   mensagem/fora do horário) do `sendMessage` do Kit NÃO foi replicada: os
//   parâmetros `autoReplyFirstMessage`/`outOfHoursMessage`/`businessHours` já
//   existem em `ChatConfig` (`kitPlatform.ts`) mas nenhuma tela do MorfoFinP
//   os aplica hoje (nem o chat normal, fora do bloqueio) — é uma lacuna à
//   parte, de todo o mecanismo de chat, não desta tela; replicar só aqui
//   duplicaria a mecânica do zero em vez de reaproveitar o chat existente.
// - Contato de suporte: o Kit mostra "contato@morfo.com.br · (11)
//   98689-7908" (marca "Morfo" do Kit). O MorfoFinP já tem o contato oficial
//   da Morfo em outro lugar (`kitBase.tsx` → `sitePagesPadrao()`, páginas
//   "Sobre a Morfo"/"Contato" do site deslogado): projetos.morfo@gmail.com e
//   (11) 4000-0000 — usado aqui em vez de inventar um novo.
export default function AmbienteBloqueado({ tenant, onLogoff }: { tenant: TenantKit; onLogoff: () => void }) {
  const [chatOpen, setChatOpen] = useState(false)
  const encerrado = tenantCanceledExpired(tenant)
  const hasUnread = hasUnreadTenant(tenant)

  return (
    <div
      className="mloc-sempre-claro"
      style={{
        minHeight: '100%',
        maxHeight: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <div style={{ width: 60, height: 60, borderRadius: 18, background: alpha(RED, 8.6), display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <Lock size={26} color={RED} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: INK, marginBottom: 6 }}>
        {encerrado ? 'Assinatura encerrada' : 'Ambiente bloqueado'}
      </div>
      <div style={{ fontSize: 13.5, color: TXT2, lineHeight: 1.5, marginBottom: 18 }}>
        {encerrado
          ? `Sua assinatura foi encerrada e o prazo de acesso (até ${fmtDate(tenant.cancellation?.accessUntil)}) já passou. Fale com a Morfo pra reativar seu ambiente.`
          : (tenant.manualBlock ? 'Seu ambiente está bloqueado pela Morfo.' : 'Seu ambiente está bloqueado por uma pendência de pagamento além do prazo de tolerância.') + ' Fale com a Morfo para regularizar.'}
      </div>
      <div style={{ fontSize: 13, color: INK, fontWeight: 700, marginBottom: 20 }}>projetos.morfo@gmail.com · (11) 4000-0000</div>
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className={hasUnread ? 'mloc-shake' : ''}
        style={{ ...primaryBtn, marginBottom: 10, position: 'relative' }}
      >
        <MessageCircle size={16} /> Falar com a Morfo pelo chat
        {hasUnread && (
          <span
            className="mloc-badge-pulse"
            style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 999, background: RED, border: `2px solid ${BRANCO}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#fff' }}
          >
            !
          </span>
        )}
      </button>
      <button type="button" onClick={onLogoff} style={secondaryBtn}>
        <LogOut size={16} /> Sair
      </button>
      {chatOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'var(--bg, #14131a)', overflowY: 'auto' }}>
          <SuporteChat aoVoltar={() => setChatOpen(false)} />
        </div>
      )}
    </div>
  )
}
