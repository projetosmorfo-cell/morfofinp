/* Tela que um acesso BLOQUEADO POR COBRANÇA vê (12/09/2026, item 3).

   Pedido do Rafael, literal: "em caso de usuário logar deve cair na tela do
   passo a passo de novo cadastro (mesmo que o botão da tela de login, mas
   pré-preenchido), e na tela dos planos deve ter extrato de pagamentos
   pendentes caso exista pra permitir clicar e pagar, ou trocar de plano. O
   mesmo deve ocorrer com ambiente de teste vencido... a conclusão desse
   processo pagando e confirmado, deve então permitir logar no ambiente
   liberado. Depois de feito pagamento mas ainda não confirmado, ao tentar
   logar, deve cair na tela de planos com extrato de pagamentos pra ver o
   status e não conseguir entrar."

   Por que não é a `AmbienteBloqueado` de sempre: aquela tela é um beco sem
   saída ("fale com a Morfo") — certa para bloqueio MANUAL ou assinatura
   encerrada, onde de fato não há o que a pessoa resolva sozinha. Mensalidade
   vencida e teste terminado são o oposto: existe uma ação óbvia, e ela tem que
   estar ali, não num chat. Por isso `AppRoot` escolhe entre as duas pelo
   MOTIVO do bloqueio.

   Sobre "pagamento confirmado" sem servidor — dito com todas as letras na
   tela: o cliente marca "já paguei" (fica aguardando) e a Morfo confirma no
   painel; é a confirmação que libera. Quando existir cobrança de verdade
   (Backlog 028), o gateway ocupa o lugar da confirmação manual e o resto do
   fluxo continua idêntico. */
import { useState } from 'react'
import { AlertTriangle, Check, Clock, LogOut, MessageCircle } from 'lucide-react'
import { alpha, primaryBtn, secondaryBtn, AMBER, RED, INK, TXT2, TXT3, LINE, PAPER, fmtBRL } from './kitBase'
import {
  situacaoCobranca, informarPagamento, fmtDate, hasUnreadTenant, daysUntil, addDays,
  type TenantKit, type GlobalParams, type Parcela,
} from './kitPlatform'
import { ContratarPacoteFlow } from './LoginView'
import { useTodosPlanos, recursosAutomaticos } from './planos'
import SuporteChat from './SuporteChat'
import { criarAcesso } from './auth'
import { NOME_PRODUTO } from './siteKit'

/** Extrato das parcelas em aberto, com o botão de informar pagamento. */
function ExtratoPendencias({ tenant, parcelas, aguardando }: { tenant: TenantKit; parcelas: Parcela[]; aguardando: boolean }) {
  const [enviando, setEnviando] = useState<string | null>(null)
  if (parcelas.length === 0) return null
  const total = parcelas.reduce((s, i) => s + i.amount, 0)
  return (
    <div data-testid="extrato-pendencias" style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: INK, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
        Pagamentos em aberto
      </div>
      {parcelas.map((i) => {
        const atrasoDias = -(daysUntil(i.dueDate) ?? 0)
        return (
          <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '7px 0', borderBottom: `1px solid ${LINE}` }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: INK }}>{fmtBRL(i.amount)}</div>
              <div style={{ fontSize: 11.5, color: TXT3 }}>
                Venceu em {fmtDate(i.dueDate)}
                {atrasoDias > 0 ? ` · ${atrasoDias} dia(s) de atraso` : ''}
              </div>
            </div>
            {i.pagamentoInformadoEm ? (
              <span data-testid="parcela-aguardando" style={{ fontSize: 11.5, fontWeight: 700, color: AMBER, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <Clock size={13} /> Aguardando confirmação
              </span>
            ) : (
              <button
                type="button"
                data-testid={`informar-pagamento-${i.id}`}
                disabled={enviando === i.id}
                onClick={() => { setEnviando(i.id); void informarPagamento(tenant.id, i.id) }}
                style={{ ...secondaryBtn, padding: '7px 11px', fontSize: 12.5, flexShrink: 0 }}
              >
                Já paguei
              </button>
            )}
          </div>
        )
      })}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 9 }}>
        <span style={{ fontSize: 12.5, color: TXT2, fontWeight: 700 }}>Total em aberto</span>
        <span style={{ fontSize: 14, fontWeight: 800, color: RED }}>{fmtBRL(total)}</span>
      </div>
      <p style={{ fontSize: 11.5, color: TXT3, lineHeight: 1.5, margin: '10px 0 0' }}>
        {aguardando
          ? 'A Morfo já foi avisada e vai confirmar o pagamento. Assim que confirmar, seu acesso volta sozinho — não precisa fazer mais nada aqui.'
          : 'Pague pelo meio combinado com a Morfo e toque em "Já paguei". O acesso é liberado quando a Morfo confirmar o recebimento.'}
      </p>
    </div>
  )
}

export default function RegularizarAcesso({ tenant, params, onLogoff }: {
  tenant: TenantKit
  params: Partial<GlobalParams>
  onLogoff: () => void
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [contratarOpen, setContratarOpen] = useState(false)
  const planos = useTodosPlanos().filter((p) => p.ativo)
  const sit = situacaoCobranca(tenant, params)
  const hasUnread = hasUnreadTenant(tenant)
  const testeVencido = tenant.plan === 'trial' && !!tenant.trial
  const fimDoTeste = tenant.trial ? addDays(tenant.trial.startDate, tenant.trial.days) : null
  const aguardando = sit.estado === 'aguardando_confirmacao'

  if (chatOpen) return <SuporteChat aoVoltar={() => setChatOpen(false)} />

  return (
    <div
      /* 12/09/2026 (build 055), pedido do Rafael: "a tela de usuário no tema
         escuro está com texto e fundo apagado em relação aos botões".

         Causa exata: `.mloc-sempre-claro` (shell.css) só REDEFINE as variáveis
         `--mloc-*` — não pinta fundo nenhum. Então o texto vinha escuro (INK)
         por cima do `--bg` escuro do app, praticamente invisível, enquanto os
         botões (que trazem fundo próprio) apareciam normais. É a mesma
         superfície clara que o Login e a tela de completar pré-cadastro já
         pintam explicitamente; faltava aqui. */
      className="mloc-sempre-claro"
      data-testid="regularizar-acesso"
      style={{ background: PAPER, color: INK, minHeight: '100%', maxHeight: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 28, textAlign: 'center' }}
    >
      <div style={{ width: 60, height: 60, borderRadius: 18, background: alpha(aguardando ? AMBER : RED, 8.6), display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        {aguardando ? <Clock size={26} color={AMBER} /> : <AlertTriangle size={26} color={RED} />}
      </div>
      <div data-testid="titulo-regularizar" style={{ fontSize: 18, fontWeight: 800, color: INK, marginBottom: 6 }}>
        {aguardando ? 'Aguardando confirmação do pagamento' : testeVencido ? 'Seu período de teste terminou' : 'Mensalidade em aberto'}
      </div>
      <div style={{ fontSize: 13.5, color: TXT2, lineHeight: 1.5, marginBottom: 18 }}>
        {aguardando
          ? 'Recebemos o aviso de que você pagou. Assim que a Morfo confirmar, seu acesso volta automaticamente.'
          : testeVencido
            ? `Seu teste do ${NOME_PRODUTO} terminou${fimDoTeste ? ` em ${fmtDate(fimDoTeste)}` : ''}. Escolha um plano pra continuar de onde parou — seus lançamentos continuam todos aqui.`
            : 'Seu acesso está bloqueado até a mensalidade ser regularizada. Seus lançamentos continuam guardados.'}
      </div>

      <div style={{ textAlign: 'left' }}>
        <ExtratoPendencias tenant={tenant} parcelas={sit.emAberto} aguardando={aguardando} />
      </div>

      {!aguardando && (
        <button
          type="button"
          data-testid="abrir-contratacao"
          onClick={() => setContratarOpen(true)}
          style={{ ...primaryBtn, width: '100%', marginBottom: 10 }}
        >
          <Check size={16} /> {testeVencido ? 'Escolher um plano' : 'Ver planos / trocar de plano'}
        </button>
      )}

      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className={hasUnread ? 'mloc-shake' : ''}
        style={{ ...secondaryBtn, width: '100%', marginBottom: 10, position: 'relative' }}
      >
        <MessageCircle size={16} /> Falar com a Morfo
        {hasUnread && (
          <span className="mloc-badge-pulse" style={{ position: 'absolute', top: 6, right: 10, width: 9, height: 9, borderRadius: 999, background: RED }} />
        )}
      </button>

      <button type="button" onClick={onLogoff} style={{ ...secondaryBtn, width: '100%', color: TXT2 }}>
        <LogOut size={16} /> Sair
      </button>

      <p style={{ fontSize: 11.5, color: TXT3, lineHeight: 1.5, marginTop: 16 }}>
        Nada foi apagado: assim que o acesso for liberado, tudo volta exatamente como estava.
      </p>

      {contratarOpen && (
        /* O MESMO fluxo do botão da tela de login (item 3), agora com os dados
           do cliente já preenchidos e o extrato no passo dos planos. O login
           vem travado no que já existe: trocar de login aqui criaria um
           segundo acesso, e o ambiente é de um usuário só (Decisão 67). */
        <ContratarPacoteFlow
          /* Mesmo mapeamento Dexie → Kit que o Login usa (`LoginView.tsx`):
             os dois precisam mostrar exatamente os mesmos planos. */
          plans={planos.map((p) => ({
            id: String(p.id), name: p.nome, monthlyValue: p.valorMensal, destaque: p.destaque,
            gratuito: p.gratuito, validadeDias: p.validadeDias ?? undefined, features: recursosAutomaticos(p),
          }))}
          tituloPasso1={testeVencido ? 'Escolha seu plano' : 'Regularizar assinatura'}
          extrato={<ExtratoPendencias tenant={tenant} parcelas={sit.emAberto} aguardando={aguardando} />}
          iniciais={{
            ownerName: tenant.ownerName || tenant.companyName,
            phone: tenant.phone, hasWhatsapp: tenant.hasWhatsapp,
            email: tenant.email, doc: tenant.doc,
            login: tenant.users?.[0]?.login,
          }}
          onClose={() => setContratarOpen(false)}
          onFinish={(payload) => {
            /* Mesmo destino do autocadastro do site: grava o acesso com os
               dados confirmados. O acesso só volta de fato quando a Morfo
               confirmar o pagamento (ver `confirmarPagamento`). */
            void criarAcesso(payload.login, payload.senha, {
              nome: payload.ownerName, email: payload.email, telefone: payload.phone, cpf: payload.doc,
            })
          }}
        />
      )}
    </div>
  )
}
