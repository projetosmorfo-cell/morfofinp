/* Tela ISOLADA de completar o pré-cadastro (12/09/2026, build 053).

   O Rafael: "o link deve ser só pra uma tela isolada do cadastro pré
   preenchido e ao gravar dar mensagem pra aguardar liberação da Morfo".

   Isolada é literal: enquanto o endereço tiver o `#precadastro=...`, esta tela
   é a ÚNICA coisa que o app mostra — nunca o site, nunca o login, nunca o
   aplicativo. Quem abre esse link é um cliente que ainda não tem acesso; ver
   qualquer outra coisa só confundiria.

   O que acontece ao gravar, com honestidade (sem servidor, item 028): o
   cadastro fica no aparelho de quem preencheu, e a Morfo não recebe nada
   sozinha. Por isso a tela de conclusão não diz "recebemos" — ela diz que
   está aguardando liberação e oferece o botão que DEVOLVE os dados pela
   mesma conversa (WhatsApp ou e-mail). Quando existir backend, este arquivo
   troca o "devolver" por um envio de verdade e o resto continua igual. */
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import {
  PAPER, BRANCO, INK, TXT2, LINE, GREEN, RED, PURPLE,
  Field, inputStyle, primaryBtn, secondaryBtn, validaTelefone, validaEmailEnvio,
} from './kitBase'
import { PRODUTO_WORDMARK_URI } from './kitLogos'
import { NOME_PRODUTO } from './siteKit'
import type { DadosPreCadastro } from './preCadastroLink'
import {
  mensagemDevolucaoPreCadastro, abrirCanal, compartilharTexto, type CanalEnvio,
} from './compartilharAcesso'

/* Contato da Morfo pra devolução. Sai do mesmo parâmetro de suporte que o
   resto do app usa; quem chama passa o que estiver configurado. */
export interface ContatoMorfo { whatsapp?: string; email?: string }

export default function CompletarPreCadastro({ dados, contato, aoSair }: {
  dados: DadosPreCadastro
  contato: ContatoMorfo
  /** Só aparece pra quem abriu o link no próprio aparelho da Morfo. */
  aoSair?: () => void
}) {
  const [nome, setNome] = useState(dados.nome)
  const [telefone, setTelefone] = useState(dados.telefone)
  const [email, setEmail] = useState(dados.email)
  const [observacao, setObservacao] = useState('')
  const [gravado, setGravado] = useState(false)
  const [aviso, setAviso] = useState('')

  const nomeOk = !!nome.trim()
  const telefoneOk = !telefone.trim() || validaTelefone(telefone)
  const emailOk = !email.trim() || validaEmailEnvio(email)
  /* Mesma regra do pré-cadastro no N0: pelo menos uma forma de contato. */
  const contatoOk = !!telefone.trim() || !!email.trim()
  const podeGravar = nomeOk && telefoneOk && emailOk && contatoOk

  const texto = mensagemDevolucaoPreCadastro({
    nomeProduto: NOME_PRODUTO, nome: nome.trim(), telefone: telefone.trim(), email: email.trim(), observacao,
  })

  function devolver(canal: CanalEnvio) {
    const destino = canal === 'whatsapp' ? (contato.whatsapp ?? '') : (contato.email ?? '')
    const ok = abrirCanal(canal, destino, `Cadastro completo — ${NOME_PRODUTO}`, texto)
    if (!ok) setAviso('Não foi possível abrir o aplicativo neste aparelho. Use "Copiar meus dados" e cole na conversa.')
  }

  const moldura: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300, overflowY: 'auto',
    background: PAPER, color: INK,
  }
  const cartao: React.CSSProperties = {
    background: BRANCO, border: `1px solid ${LINE}`, borderRadius: 16, padding: 18,
    maxWidth: 'var(--mloc-maxw, 430px)', margin: '0 auto',
    boxShadow: '0 18px 44px rgba(20, 19, 25, 0.14)',
  }

  if (gravado) {
    return <div style={moldura} className="mloc-sempre-claro" data-testid="precadastro-concluido">
      <div style={{ padding: '28px 16px 40px' }}>
        <div style={cartao}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <CheckCircle2 size={44} color={GREEN} />
          </div>
          <h1 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 10px', textAlign: 'center', textTransform: 'none' }}>
            Cadastro gravado
          </h1>
          <p style={{ fontSize: 14, color: TXT2, lineHeight: 1.6, margin: '0 0 14px', textAlign: 'center' }}>
            Agora é só <strong style={{ color: INK }}>aguardar a liberação da Morfo</strong>. Assim que seu acesso
            for liberado, você recebe o login, a senha e o link pra baixar o aplicativo pelo mesmo canal.
          </p>
          <p style={{ fontSize: 12.5, color: TXT2, lineHeight: 1.6, margin: '0 0 16px', textAlign: 'center' }}>
            Pra adiantar, mande seus dados pra gente por aqui:
          </p>
          {contato.whatsapp && <button type="button" data-testid="devolver-whatsapp" onClick={() => devolver('whatsapp')}
            style={{ ...primaryBtn, width: '100%', background: PURPLE }}>Enviar pelo WhatsApp</button>}
          {contato.email && <button type="button" data-testid="devolver-email" onClick={() => devolver('email')}
            style={{ ...secondaryBtn, width: '100%', marginTop: 8 }}>Enviar por e-mail</button>}
          <button type="button" onClick={() => void compartilharTexto(`Cadastro completo — ${NOME_PRODUTO}`, texto)}
            style={{ ...secondaryBtn, width: '100%', marginTop: 8 }}>Copiar meus dados</button>
          {aviso && <p style={{ fontSize: 12.5, color: RED, fontWeight: 700, margin: '10px 0 0', lineHeight: 1.5 }}>{aviso}</p>}
        </div>
        {aoSair && <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button type="button" onClick={aoSair} style={{ background: 'none', border: 'none', color: TXT2, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
            Sair desta tela
          </button>
        </div>}
      </div>
    </div>
  }

  return <div style={moldura} className="mloc-sempre-claro" data-testid="precadastro-tela">
    <div style={{ padding: '28px 16px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <img src={PRODUTO_WORDMARK_URI} alt={NOME_PRODUTO} style={{ height: 26 }} />
      </div>
      <div style={cartao}>
        <h1 style={{ fontSize: 19, fontWeight: 800, margin: '0 0 8px', textTransform: 'none' }}>Complete seu cadastro</h1>
        <p style={{ fontSize: 13.5, color: TXT2, lineHeight: 1.6, margin: '0 0 16px' }}>
          Confira os dados que já temos e complete o que faltar. Depois de gravar, seu acesso fica
          aguardando a liberação da Morfo.
        </p>
        <Field label="Seu nome"><input style={inputStyle} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" /></Field>
        {!nomeOk && <p style={{ fontSize: 12, color: RED, fontWeight: 700, margin: '-10px 0 14px' }}>Informe seu nome.</p>}
        <Field label="Telefone"><input style={inputStyle} inputMode="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" /></Field>
        {!telefoneOk && <p style={{ fontSize: 12, color: RED, fontWeight: 700, margin: '-10px 0 14px' }}>Telefone inválido (use DDD + número).</p>}
        <Field label="E-mail"><input style={inputStyle} inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" /></Field>
        {!emailOk && <p style={{ fontSize: 12, color: RED, fontWeight: 700, margin: '-10px 0 14px' }}>E-mail inválido.</p>}
        {!contatoOk && <p style={{ fontSize: 12, color: RED, fontWeight: 700, margin: '-10px 0 14px' }}>Preencha pelo menos o telefone ou o e-mail.</p>}
        <Field label="Quer nos contar alguma coisa? (opcional)">
          <textarea style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Field>
        <button type="button" data-testid="precadastro-gravar" disabled={!podeGravar} onClick={() => setGravado(true)}
          style={{ ...primaryBtn, width: '100%', background: PURPLE, opacity: podeGravar ? 1 : 0.5, cursor: podeGravar ? 'pointer' : 'not-allowed' }}>
          Gravar cadastro
        </button>
      </div>
      {aoSair && <div style={{ textAlign: 'center', marginTop: 14 }}>
        <button type="button" onClick={aoSair} style={{ background: 'none', border: 'none', color: TXT2, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}>
          Sair desta tela
        </button>
      </div>}
    </div>
  </div>
}
