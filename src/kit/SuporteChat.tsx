import { useState } from 'react'
import { ChevronRight, ShieldAlert } from 'lucide-react'
import { useTenantN1, usePlatformN0, atualizarTenantN0 } from './kitPlatform'
import ChatConversa from './ChatConversa'
import { AMBER } from './kitBase'

// Suporte (chat interno N1→N0), 10/09/2026, Decisão 53 — ponto 3 do
// feedback do Rafael: "Nenhum WhatsApp deve aparecer dentro do app pra
// falar com a Morfo — WhatsApp/telefone da Morfo só nos textos do site
// deslogado". Substitui o antigo botão "Suporte (WhatsApp)" do menu de
// engrenagem (`App.tsx`), que abria `abrirSuporteWhatsApp()` — removido
// desta rodada. WhatsApp/telefone continuam existindo, só que nas páginas
// "Sobre a Morfo"/"Contato" do site deslogado (`LoginView.tsx`/`suporte.ts`),
// nunca dentro do ambiente logado.
//
// Adaptado de `SuporteView` do Projeto Modelo (função de origem: topo com o
// toggle "Autorizar acesso da Morfo" + o histórico de ações de suporte +
// conversa em si). `ChatConversa.tsx`, compartilhado com o lado N0.
//
// "Ações do suporte no meu ambiente" (achado no diff desta rodada,
// 11/09/2026 — existia no Projeto Modelo desde antes do porte de 10/09, mas
// tinha ficado de fora): lista as entradas de `tenant.accessLog` feitas pela
// Morfo (`ator === 'suporte'`) durante impersonação — visível pro próprio
// cliente, pra ele saber o que foi feito no ambiente dele. Só aparece
// quando existe pelo menos 1 entrada.
//
// RECONFERIDO em 11/09/2026, arquivo inteiro (não só o bloco acima) contra
// `SuporteView` no Projeto Modelo atual: mesma estrutura (toggle de
// autorização · "Ações do suporte" colapsável · conversa) e mesmo texto.
// `markRead`/`injetarFollowUp` do Projeto Modelo (marcar como lida / mandar
// follow-up automático ao entrar) não aparecem aqui porque moram dentro de
// `ChatConversa.tsx` (componente compartilhado N0/N1, já reconferido nesta
// rodada) — encapsulados lá, não uma lacuna deste arquivo.
export default function SuporteChat({ aoVoltar }: { aoVoltar: () => void }) {
  const tenant = useTenantN1()
  const { defaultParams } = usePlatformN0()
  const [acoesSuporteAberto, setAcoesSuporteAberto] = useState(false)
  const acoesSuporte = (tenant?.accessLog || []).filter((a) => a.ator === 'suporte')

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Suporte</h1>
      </div>

      {!tenant ? (
        <p className="texto-fraco">Carregando…</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => atualizarTenantN0(tenant.id, (t) => ({ ...t, supportAuthorized: !t.supportAuthorized }))}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', marginTop: 0, marginBottom: 14, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 6,
                border: `2px solid ${tenant.supportAuthorized ? 'var(--azul)' : 'var(--borda)'}`,
                background: tenant.supportAuthorized ? 'var(--azul)' : 'transparent',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12.5 }}>
              <strong>Autorizar acesso da Morfo</strong>
              <br />
              <span className="texto-fraco" style={{ fontSize: 11 }}>
                Permite que o suporte Morfo acesse seu ambiente pra te ajudar com um problema específico.
              </span>
            </span>
          </button>
          {acoesSuporte.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setAcoesSuporteAberto((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ShieldAlert size={14} color={AMBER} /> Ações do suporte no meu ambiente ({acoesSuporte.length})
                </span>
                <ChevronRight size={14} color="var(--texto-fraco)" style={{ transform: acoesSuporteAberto ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
              </button>
              {acoesSuporteAberto && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                  {acoesSuporte.slice(0, 20).map((a) => (
                    <div key={a.id} style={{ background: 'var(--bg-elevado)', border: '1px solid var(--borda)', borderRadius: 10, padding: '8px 10px' }}>
                      <div style={{ fontSize: 12 }}>{a.action}</div>
                      <div className="texto-fraco" style={{ fontSize: 10.5, marginTop: 2 }}>
                        {new Date(a.ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · feito pelo suporte
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <ChatConversa tenant={tenant} chatConfig={defaultParams?.chat} perspectiva="cliente" />
        </>
      )}
    </>
  )
}
