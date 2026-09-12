/* Folha de compartilhamento (12/09/2026, build 053).

   Um lugar só pros três cenários que o Rafael descreveu — convite de
   pré-cadastro, liberação de acesso e ambiente de teste direto. Ela sempre
   mostra: o canal (WhatsApp ou e-mail, habilitado pelo que o cliente
   preencheu), os links já preenchidos mas EDITÁVEIS ("abrir tela com link
   preenchido permitindo mudar"), o site como opcional ("mostrar como opcional
   sempre no compartilhamento") e a prévia do texto exato que vai ser enviado.

   Por que a prévia existe: o texto sai daqui pro WhatsApp/e-mail do aparelho,
   e não dá pra corrigir depois de enviado. Ver antes é a única chance. */
import { useState } from 'react'
import { Sheet, Field, inputStyle, primaryBtn, secondaryBtn, Segmented, Toggle, DEV_ACCENT, RED, AMBER } from './kitBase'
import {
  montarMensagem, assuntoDoCenario, abrirCanal, compartilharTexto,
  type CanalEnvio, type CenarioMensagem,
} from './compartilharAcesso'

export interface DadosCompartilhamento {
  cenario: CenarioMensagem
  nomeProduto: string
  nomeCliente?: string
  telefone?: string
  email?: string
  login?: string
  senha?: string
  contexto?: string
  /** Só no cenário `convite`. */
  linkPreCadastro?: string
  linkApp?: string
  linkSite?: string
}

const TITULO: Record<CenarioMensagem, string> = {
  convite: 'Enviar convite de cadastro',
  liberacao: 'Enviar acesso liberado',
  testeDireto: 'Enviar acesso de teste',
}

export default function FolhaCompartilhar({ dados, onClose, notify }: {
  dados: DadosCompartilhamento
  onClose: () => void
  notify: (m: string) => void
}) {
  const temTelefone = !!dados.telefone?.trim()
  const temEmail = !!dados.email?.trim()
  /* O canal padrão segue o que o Rafael descreveu: "2 opções conforme o
     preenchimento" — com telefone, WhatsApp; só com e-mail, e-mail. */
  const [canal, setCanal] = useState<CanalEnvio>(temTelefone ? 'whatsapp' : 'email')
  const [linkPre, setLinkPre] = useState(dados.linkPreCadastro ?? '')
  const [linkApp, setLinkApp] = useState(dados.linkApp ?? '')
  const [incluirSite, setIncluirSite] = useState(!!dados.linkSite)
  const [linkSite, setLinkSite] = useState(dados.linkSite ?? '')

  const ehConvite = dados.cenario === 'convite'
  const texto = montarMensagem(dados.cenario, {
    nomeProduto: dados.nomeProduto,
    nomeCliente: dados.nomeCliente,
    linkPreCadastro: linkPre.trim(),
    linkApp: linkApp.trim() || undefined,
    linkSite: incluirSite && linkSite.trim() ? linkSite.trim() : undefined,
    login: dados.login,
    senha: dados.senha,
    contexto: dados.contexto,
  })
  const assunto = assuntoDoCenario(dados.cenario, dados.nomeProduto)

  const destino = canal === 'whatsapp' ? (dados.telefone ?? '') : (dados.email ?? '')
  const podeEnviar = canal === 'whatsapp' ? temTelefone : temEmail
  const faltaLink = ehConvite && !linkPre.trim()

  function enviar() {
    if (faltaLink) return
    const ok = abrirCanal(canal, destino, assunto, texto)
    notify(ok
      ? canal === 'whatsapp' ? 'WhatsApp aberto com a mensagem pronta' : 'E-mail aberto com a mensagem pronta'
      : 'Não foi possível abrir o aplicativo neste aparelho — use "Copiar mensagem"')
    if (ok) onClose()
  }

  async function copiar() {
    const r = await compartilharTexto(assunto, texto)
    notify(r === 'copiado' ? 'Mensagem copiada' : r === 'compartilhado' ? 'Opções de compartilhamento abertas' : 'Não foi possível copiar neste aparelho')
  }

  return <Sheet dark title={TITULO[dados.cenario]} onClose={onClose}>
    <Field dark label="Enviar por">
      <Segmented value={canal} onChange={setCanal} dark options={[
        { value: 'whatsapp' as const, label: temTelefone ? 'WhatsApp' : 'WhatsApp (sem telefone)' },
        { value: 'email' as const, label: temEmail ? 'E-mail' : 'E-mail (sem endereço)' },
      ]} />
    </Field>
    <p style={{ fontSize: 12, color: '#C9C4D4', margin: '-6px 0 14px', lineHeight: 1.5 }}>
      {canal === 'whatsapp'
        ? (temTelefone
            ? <>Abre a conversa direta com <strong style={{ color: '#fff' }}>{dados.telefone}</strong>, já com o texto escrito.</>
            : 'Este cliente não tem telefone cadastrado — escolha e-mail, ou complete o telefone na ficha dele.')
        : (temEmail
            ? <>Abre o aplicativo de e-mail com a mensagem endereçada a <strong style={{ color: '#fff' }}>{dados.email}</strong>.</>
            : 'Este cliente não tem e-mail cadastrado — escolha WhatsApp, ou complete o e-mail na ficha dele.')}
    </p>

    {ehConvite && <>
      <Field dark label="Link do cadastro"><input style={inputStyle} value={linkPre} onChange={(e) => setLinkPre(e.target.value)} placeholder="https://…" /></Field>
      {faltaLink && <p style={{ fontSize: 12, color: RED, fontWeight: 700, margin: '-8px 0 14px', lineHeight: 1.5 }}>
        Sem link não há o que o cliente abrir. Cadastre a URL do aplicativo publicado na web em Parâmetros › URLs, ou cole o endereço aqui.
      </p>}
    </>}

    {!ehConvite && <>
      <Field dark label="Link pra baixar o aplicativo"><input style={inputStyle} value={linkApp} onChange={(e) => setLinkApp(e.target.value)} placeholder="https://…/MorfoFinP.apk" /></Field>
      {!linkApp.trim() && <p style={{ fontSize: 12, color: AMBER, margin: '-8px 0 14px', lineHeight: 1.5 }}>
        Sem o link do aplicativo a mensagem sai só com login e senha. Cadastre em Parâmetros › URLs pra ele vir preenchido sempre.
      </p>}
    </>}

    <div data-testid="compartilhar-incluir-site" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Toggle value={incluirSite} onChange={setIncluirSite} />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Incluir o site (opcional)</span>
    </div>
    {incluirSite && <Field dark label="Endereço do site"><input style={inputStyle} value={linkSite} onChange={(e) => setLinkSite(e.target.value)} placeholder="https://…" /></Field>}

    <Field dark label="Mensagem que vai ser enviada">
      <textarea data-testid="previa-mensagem" readOnly value={texto} rows={10}
        style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit', fontSize: 13 }} />
    </Field>

    <button type="button" data-testid="compartilhar-enviar" disabled={!podeEnviar || faltaLink} onClick={enviar}
      style={{ ...primaryBtn, width: '100%', background: DEV_ACCENT, opacity: (podeEnviar && !faltaLink) ? 1 : 0.5, cursor: (podeEnviar && !faltaLink) ? 'pointer' : 'not-allowed' }}>
      {canal === 'whatsapp' ? 'Abrir WhatsApp e enviar' : 'Abrir e-mail e enviar'}
    </button>
    <button type="button" data-testid="compartilhar-copiar" onClick={() => void copiar()}
      style={{ ...secondaryBtn, width: '100%', marginTop: 8 }}>
      Copiar mensagem
    </button>
  </Sheet>
}
