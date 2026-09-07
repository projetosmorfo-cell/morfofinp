// Painel N0 ("Morfo/dev") — camada de administração da plataforma, adaptada
// do Kit de Estrutura Mínima Morfo (`DevApp`, seção 2). Roteiro de
// Parametrização Morfo, Etapa 4 (04/09/2026).
//
// ESQUELETO, DE PROPÓSITO: o Kit real gerencia uma lista de tenants (empresas-
// cliente) com dado vindo de um backend. O MorfoFinP hoje não tem backend
// (Decisão 6, `biblioteca/01-produto/decisoes.md` do Project — sequenciamento
// "front-end primeiro, backend depois") — então esta tela mostra só o único
// "tenant" que existe de fato hoje (o próprio Rafael/MorfoFinP), sem nenhuma
// ação real de gerenciar outro tenant, cobrar plano, ou aprovar solicitação
// de acesso. Isso tudo é Backlog #028 (backend real), rodada futura.
//
// Acesso: ainda não existe Login (Backlog #029/Etapa 8 do roteiro) — por ora
// só é alcançável pelo botão temporário em Manutenção → "Painel N0 (Morfo)".
export default function DevApp({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#141319',
        color: '#fff',
        overflowY: 'auto',
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          position: 'sticky',
          top: 0,
          background: '#141319',
        }}
      >
        <button
          type="button"
          onClick={onVoltar}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          ‹ Voltar pro ambiente
        </button>
        <h1 style={{ fontSize: 16, margin: 0 }}>Painel N0 — Morfo (esqueleto)</h1>
      </div>

      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 12.5, color: '#9B96A8', lineHeight: 1.6 }}>
          Este painel é um <strong style={{ color: '#fff' }}>esqueleto</strong>: ainda não existe backend
          (banco/servidor) pra este painel gerenciar tenants de verdade — ver Backlog #028 do
          repositório. Por enquanto mostra só o único ambiente que existe hoje.
        </p>

        <div
          style={{
            background: '#201E28',
            borderRadius: 14,
            padding: 14,
            marginTop: 16,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, color: '#9B96A8', textTransform: 'uppercase', letterSpacing: 0.3 }}>
            Tenant
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>MorfoFinP — Rafael</div>
          <div style={{ fontSize: 12, color: '#9B96A8', marginTop: 8 }}>Plano: — (sem cobrança/backend ainda)</div>
          <div style={{ fontSize: 12, color: '#9B96A8', marginTop: 2 }}>Status: ativo (uso local, sem licenciamento)</div>
        </div>

        <p style={{ fontSize: 11.5, color: '#6b6674', marginTop: 20, lineHeight: 1.6 }}>
          Acesso temporário até a Etapa 8 do Roteiro de Parametrização Morfo construir o Login/Site
          institucional de verdade (Backlog #029) — depois disso, este painel passa a ser alcançado só
          por login com perfil de administrador Morfo, não por um botão dentro do próprio app.
        </p>
      </div>
    </div>
  )
}
