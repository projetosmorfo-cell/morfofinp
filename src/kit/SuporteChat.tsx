import { useTenantN1, usePlatformN0, atualizarTenantN0 } from './kitPlatform'
import ChatConversa from './ChatConversa'

// Suporte (chat interno N1→N0), 10/09/2026, Decisão 53 — ponto 3 do
// feedback do Rafael: "Nenhum WhatsApp deve aparecer dentro do app pra
// falar com a Morfo — WhatsApp/telefone da Morfo só nos textos do site
// deslogado". Substitui o antigo botão "Suporte (WhatsApp)" do menu de
// engrenagem (`App.tsx`), que abria `abrirSuporteWhatsApp()` — removido
// desta rodada. WhatsApp/telefone continuam existindo, só que nas páginas
// "Sobre a Morfo"/"Contato" do site deslogado (`LoginView.tsx`/`suporte.ts`),
// nunca dentro do ambiente logado.
//
// Adaptado de `SuporteView` do Kit (L3670-L3700): topo com o toggle
// "Autorizar acesso da Morfo" (Kit `tenant.supportAuthorized`) + o histórico
// de ações de acesso (`tenant.accessLog`, quando existir) + a conversa em si
// (`ChatConversa.tsx`, compartilhado com o lado N0).
export default function SuporteChat({ aoVoltar }: { aoVoltar: () => void }) {
  const tenant = useTenantN1()
  const { defaultParams } = usePlatformN0()

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
          <ChatConversa tenant={tenant} chatConfig={defaultParams?.chat} perspectiva="cliente" />
        </>
      )}
    </>
  )
}
