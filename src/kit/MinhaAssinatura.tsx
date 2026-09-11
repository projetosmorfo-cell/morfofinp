import { useState } from 'react'
import { usePlanos, usePlanoPadrao, recursosAutomaticos, type Plano } from './planos'
import { usePlanoAtual, salvarPlanoId } from './planoAtual'

// Modelo de negócio Completo (05/09/2026, Roteiro de Parametrização Morfo,
// Etapa 5) — adaptado de `MinhaAssinaturaView`/`TrocarPlanoSheet`/
// `EncerrarPlanoSheet` do Kit de Estrutura Mínima. Front-end primeiro,
// backend depois (Decisão 6): sem backend real (Backlog #028) não existe
// cobrança, parcela nem gateway de pagamento de verdade — mas TROCAR e
// ENCERRAR plano não dependem de cobrar ninguém (o app roda 100% local em
// Dexie), então aqui a troca de `planoId` é real, não só um teste de fluxo
// (reconciliação de 11/09/2026, cluster "Minha Assinatura": a rodada
// anterior tinha marcado o arquivo inteiro como placeholder por nome de
// função, sem reler o código — reaberto e corrigido). Plano/preço em si
// continuam placeholder (Rafael nunca definiu catálogo real, ver
// `src/kit/planos.ts`). Acesso temporário via Manutenção → "Minha
// Assinatura", mesmo padrão do painel N0 (Etapa 4) — não entra no menu de
// engrenagem principal ainda, porque o lugar definitivo disso é o "Ambiente
// Logado" da Etapa 8.
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
        position: 'relative',
        border: `1.5px solid ${selecionado ? 'var(--azul)' : 'var(--borda)'}`,
        borderRadius: 12,
        padding: 14,
        background: selecionado ? 'rgba(59,130,246,0.08)' : 'var(--bg-elevado)',
        cursor: onSelecionar ? 'pointer' : 'default',
        marginTop: 0,
      }}
    >
      {/* Kit L7565 (`PlanoCard`): selo "MAIS ESCOLHIDO" pro plano marcado `destaque` —
          faltava aqui, embora o campo já exista em `PlanoRegistro` e já seja usado com o
          mesmo texto em `LoginView.tsx`. */}
      {plano.destaque && (
        <span
          style={{
            position: 'absolute',
            top: -10,
            right: 14,
            background: 'var(--amarelo)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: 999,
          }}
        >
          MAIS ESCOLHIDO
        </span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <div>
          <strong style={{ fontSize: 14.5 }}>{plano.nome}</strong>
          {plano.porte && <div className="texto-fraco" style={{ fontSize: 11.5 }}>Porte {plano.porte}</div>}
        </div>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--azul)', whiteSpace: 'nowrap' }}>
          {plano.gratuito
            ? `Grátis · ${plano.validadeDias ?? 0} dias`
            : plano.valorMensal > 0 ? `R$ ${plano.valorMensal.toFixed(2)}/mês` : 'Grátis'}
        </span>
      </div>
      {plano.descricaoCurta && (
        <p className="texto-fraco" style={{ fontSize: 12, margin: '4px 0 0' }}>{plano.descricaoCurta}</p>
      )}
      {/* A lista de recursos é montada a partir dos campos reais do plano
          (limites e acessos) + o texto livre — `recursosAutomaticos`, o
          `planFeaturesAuto` do Kit. É o que faz os parâmetros novos
          (limite de usuários, acessos liberados) aparecerem de fato pro
          cliente quando preenchidos no N0. */}
      <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
        {recursosAutomaticos(plano).map((f) => (
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
  onEncerrar,
}: {
  planoAtualId: number | undefined
  onFechar: () => void
  onConfirmar: (planoId: number) => void
  onEncerrar?: () => void
}) {
  const planos = usePlanos()
  // Kit L7614 (`TrocarPlanoSheet`): a lista de "trocar para" não mostra o plano atual —
  // ele já está selecionado por definição, oferecê-lo de novo só confunde.
  const planosParaTrocar = planos.filter((p) => p.id !== planoAtualId)
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
          {planosParaTrocar.length > 0 ? (
            planosParaTrocar.map((p) => (
              <CartaoPlano key={p.id} plano={p} selecionado={p.id === selecionadoId} onSelecionar={() => setSelecionadoId(p.id)} />
            ))
          ) : (
            <p className="texto-fraco" style={{ marginTop: 0 }}>Não há outro plano cadastrado pelo painel N0 pra trocar agora.</p>
          )}
        </div>
        <button
          type="button"
          className="primario"
          style={{ marginTop: 0 }}
          disabled={selecionadoId === undefined || selecionadoId === planoAtualId}
          onClick={() => selecionadoId !== undefined && onConfirmar(selecionadoId)}
        >
          Confirmar troca
        </button>
        <p className="texto-fraco" style={{ fontSize: 11.5, marginTop: 10 }}>
          A troca já muda de verdade qual plano fica marcado como o seu — sem cobrança automática
          ainda, pois isso depende do gateway de pagamento (Backlog #028).
        </p>
        {/* Kit L7635 (`TrocarPlanoSheet`, `onEncerrar`): atalho pra encerrar direto da tela de troca,
            sem precisar voltar pra Minha Assinatura primeiro. */}
        {onEncerrar && planoAtualId !== undefined && (
          <button
            type="button"
            onClick={onEncerrar}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
              background: 'none',
              border: 'none',
              color: 'var(--vermelho)',
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              padding: '14px 0 0',
              marginTop: 0,
            }}
          >
            ✕ Encerrar assinatura
          </button>
        )}
      </div>
    </div>
  )
}

// Kit L7580 (`EncerrarPlanoSheet`): lá o encerramento é uma DATA futura (acesso continua
// liberado até o fim do ciclo já pago, com "reativar" antes disso) porque existe cobrança e
// parcela de verdade por trás. Aqui não existe backend de cobrança (Backlog #028) — não há
// ciclo pago, nem data de corte, nem "reativar" pra desfazer, então adaptar o texto pra uma
// data futura seria inventar um dado que não existe. O que É real: confirmar aqui troca o
// `planoId` na hora, sem cobrança, pro plano padrão (`usePlanoPadrao`) — é isso que o texto
// abaixo descreve pro usuário, sem expor jargão interno de roadmap.
function EncerrarPlanoModal({
  plano,
  planoDestino,
  onFechar,
  onConfirmar,
}: {
  plano: Plano | undefined
  planoDestino: Plano | undefined
  onFechar: () => void
  onConfirmar: () => void
}) {
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
          Ao confirmar, você sai do <strong>{plano?.nome || 'plano atual'}</strong> agora — sem cobrança
          adicional — e volta pro plano padrão
          {planoDestino ? <> (<strong>{planoDestino.nome}</strong>)</> : ''}. Não há período de carência
          nem opção de reativar o plano anterior: pra voltar, é preciso trocar de plano de novo.
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
          <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'left' }}>
            Entendo que perco o {plano?.nome || 'plano atual'} agora, sem poder desfazer
          </span>
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
  const planos = usePlanos()
  // `usePlanoPadrao()` (o plano `destaque`, com fallback pro primeiro cadastrado) — igual ao
  // Kit, que também trata "destaque" como plano-alvo padrão (ex.: L7655, `ContratarPacoteFlow`).
  // Antes desta correção, encerrar assinatura mandava direto pro `planos[0]`, ou seja, o plano de
  // MENOR id no banco — não necessariamente o padrão pretendido pelo N0.
  const planoPadrao = usePlanoPadrao()
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
        Planos gerenciados pela Morfo. Trocar ou encerrar aqui já muda de verdade qual plano fica
        marcado como o seu — sem cobrança automática ainda, pois isso depende do gateway de
        pagamento.
      </p>

      <h2 style={{ marginTop: 0 }}>Plano atual</h2>
      <div className="cartao">
        {planoAtual ? (
          <CartaoPlano plano={planoAtual} selecionado />
        ) : (
          <p className="texto-fraco" style={{ marginTop: 0 }}>
            Nenhum plano cadastrado ainda pelo painel N0.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button
            type="button"
            disabled={planos.length === 0}
            style={{ flex: 1, marginTop: 0, background: 'none', border: '1px solid var(--borda)', borderRadius: 10, padding: '12px', cursor: 'pointer' }}
            onClick={() => setTrocarAberto(true)}
          >
            Trocar de plano
          </button>
          <button
            type="button"
            disabled={!planoAtual}
            style={{ flex: 1, marginTop: 0, background: 'none', border: '1px solid var(--vermelho)', color: 'var(--vermelho)', borderRadius: 10, padding: '12px', cursor: 'pointer' }}
            onClick={() => setEncerrarAberto(true)}
          >
            Encerrar
          </button>
        </div>
      </div>

      {trocarAberto && (
        <TrocarPlanoModal
          planoAtualId={planoAtual?.id}
          onFechar={() => setTrocarAberto(false)}
          onConfirmar={(planoId) => {
            salvarPlanoId(planoId)
            setTrocarAberto(false)
          }}
          onEncerrar={() => {
            setTrocarAberto(false)
            setEncerrarAberto(true)
          }}
        />
      )}
      {encerrarAberto && planoPadrao?.id !== undefined && (
        <EncerrarPlanoModal
          plano={planoAtual}
          planoDestino={planoPadrao}
          onFechar={() => setEncerrarAberto(false)}
          onConfirmar={() => {
            salvarPlanoId(planoPadrao.id as number)
            setEncerrarAberto(false)
          }}
        />
      )}
    </>
  )
}
