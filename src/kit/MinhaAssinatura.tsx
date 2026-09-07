import { useState } from 'react'
import { PLANOS_STUB, type Plano } from './planos'
import { usePlanoAtual, salvarPlanoId } from './planoAtual'

// Modelo de negócio Completo (05/09/2026, Roteiro de Parametrização Morfo,
// Etapa 5) — adaptado de `MinhaAssinaturaView`/`TrocarPlanoSheet` do Kit de
// Estrutura Mínima. Front-end primeiro, backend depois (Decisão 6): sem
// backend real (Backlog #028), não existe cobrança, parcela nem downgrade
// pró-rata de verdade — esta tela valida só o FLUXO (ver plano atual, trocar,
// encerrar), com plano/preço placeholder (ver `src/kit/planos.ts`). Acesso
// temporário via Manutenção → "Minha Assinatura", mesmo padrão do painel N0
// (Etapa 4) — não entra no menu de engrenagem principal ainda, porque o
// lugar definitivo disso é o "Ambiente Logado" da Etapa 8.
function CartaoPlano({
  plano,
  selecionado,
  onSelecionar,
}: {
  plano: Plano
  selecionado: boolean
  onSelecionar?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelecionar}
      disabled={!onSelecionar}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        border: `1.5px solid ${selecionado ? 'var(--azul)' : 'var(--borda)'}`,
        borderRadius: 12,
        padding: 14,
        background: selecionado ? 'rgba(59,130,246,0.08)' : 'var(--bg-elevado)',
        cursor: onSelecionar ? 'pointer' : 'default',
        marginTop: 0,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <strong style={{ fontSize: 14.5 }}>{plano.nome}</strong>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--azul)', whiteSpace: 'nowrap' }}>
          {plano.valorMensal > 0 ? `R$ ${plano.valorMensal.toFixed(2)}/mês` : 'Grátis'}
        </span>
      </div>
      <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
        {plano.funcionalidades.map((f) => (
          <li key={f} className="texto-fraco" style={{ fontSize: 12.5 }}>
            {f}
          </li>
        ))}
      </ul>
    </button>
  )
}

function TrocarPlanoModal({
  planoAtualId,
  onFechar,
  onConfirmar,
}: {
  planoAtualId: string
  onFechar: () => void
  onConfirmar: (planoId: string) => void
}) {
  const [selecionadoId, setSelecionadoId] = useState(planoAtualId)
  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="linha" style={{ border: 'none', padding: 0, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Trocar de plano</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--texto-fraco)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {PLANOS_STUB.map((p) => (
            <CartaoPlano key={p.id} plano={p} selecionado={p.id === selecionadoId} onSelecionar={() => setSelecionadoId(p.id)} />
          ))}
        </div>
        <button
          type="button"
          className="primario"
          style={{ marginTop: 0 }}
          disabled={selecionadoId === planoAtualId}
          onClick={() => onConfirmar(selecionadoId)}
        >
          Confirmar troca
        </button>
        <p className="texto-fraco" style={{ fontSize: 11.5, marginTop: 10 }}>
          Placeholder: sem cobrança real ainda (depende do backend, Backlog #028) — troca só muda qual
          plano esta tela mostra como atual.
        </p>
      </div>
    </div>
  )
}

function EncerrarPlanoModal({ onFechar, onConfirmar }: { onFechar: () => void; onConfirmar: () => void }) {
  const [entendi, setEntendi] = useState(false)
  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="linha" style={{ border: 'none', padding: 0, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>Encerrar assinatura</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--texto-fraco)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Placeholder: sem backend real ainda, não existe data de corte de acesso nem bloqueio de
          verdade (Backlog #028) — confirmar aqui só volta esta tela pro plano padrão.
        </p>
        <button
          type="button"
          onClick={() => setEntendi((v) => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, width: '100%', marginTop: 0 }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 6,
              border: `2px solid ${entendi ? 'var(--vermelho)' : 'var(--borda)'}`,
              background: entendi ? 'var(--vermelho)' : 'transparent',
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'left' }}>Entendi que isso é só um teste de fluxo</span>
        </button>
        <button
          type="button"
          disabled={!entendi}
          style={{ marginTop: 0, background: 'var(--vermelho)', borderColor: 'var(--vermelho)', opacity: entendi ? 1 : 0.5 }}
          onClick={onConfirmar}
        >
          Encerrar assinatura
        </button>
      </div>
    </div>
  )
}

export default function MinhaAssinatura({ aoVoltar }: { aoVoltar: () => void }) {
  const planoAtual = usePlanoAtual()
  const [trocarAberto, setTrocarAberto] = useState(false)
  const [encerrarAberto, setEncerrarAberto] = useState(false)

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Minha Assinatura</h1>
      </div>

      <p className="texto-fraco">
        Modelo de negócio Completo (Roteiro de Parametrização Morfo, Etapa 5) — front-end de validação
        do fluxo, sem plano/preço real definido ainda e sem cobrança de verdade (depende do backend,
        Backlog #028).
      </p>

      <h2 style={{ marginTop: 0 }}>Plano atual</h2>
      <div className="cartao">
        <CartaoPlano plano={planoAtual} selecionado />
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            style={{ flex: 1, marginTop: 0, background: 'none', border: '1px solid var(--borda)', borderRadius: 10, padding: '12px', cursor: 'pointer' }}
            onClick={() => setTrocarAberto(true)}
          >
            Trocar de plano
          </button>
          <button
            type="button"
            style={{ flex: 1, marginTop: 0, background: 'none', border: '1px solid var(--vermelho)', color: 'var(--vermelho)', borderRadius: 10, padding: '12px', cursor: 'pointer' }}
            onClick={() => setEncerrarAberto(true)}
          >
            Encerrar
          </button>
        </div>
      </div>

      {trocarAberto && (
        <TrocarPlanoModal
          planoAtualId={planoAtual.id}
          onFechar={() => setTrocarAberto(false)}
          onConfirmar={(planoId) => {
            salvarPlanoId(planoId)
            setTrocarAberto(false)
          }}
        />
      )}
      {encerrarAberto && (
        <EncerrarPlanoModal
          onFechar={() => setEncerrarAberto(false)}
          onConfirmar={() => {
            salvarPlanoId(PLANOS_STUB[0].id)
            setEncerrarAberto(false)
          }}
        />
      )}
    </>
  )
}
