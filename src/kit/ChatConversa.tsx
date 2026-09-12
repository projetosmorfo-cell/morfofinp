import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import {
  type TenantKit,
  type ChatConfig,
  agruparMensagensPorDia,
  chatReadTs,
  comFollowUpSeNecessario,
  atualizarTenantN0,
  agoraISO,
} from './kitPlatform'
import { uid, readImageAsDataUrl } from './kitBase'
import { SearchBox } from './PadraoUI'

// Chat interno N1↔N0 (10/09/2026, Decisão 53 — ponto 3 do feedback do
// Rafael). Adaptado do Projeto Modelo (`ChatMessageBubble`/`ChatMessagesList`/
// `ChatComposer`): mesma estrutura (bolhas agrupadas por dia, mensagem
// automática marcada, composer). Os comentários abaixo citam a função pelo
// nome, não por número de linha — o esqueleto muda de linha a cada rodada
// (achado da reconciliação de 11/09/2026, ver doc de reconciliação).
//
// ANEXO DE IMAGEM (10/09/2026, Decisão 58): existia no Kit e tinha ficado de
// fora daqui — junto com o parâmetro "Tamanho máximo de imagem anexada (KB)"
// (`chat.maxImageKB`), que sem o anexo seria um parâmetro morto. Entrou agora
// pelo pedido do Rafael de trazer TODOS os recursos do Kit e fazer os
// parâmetros valerem de fato. Igual ao Kit: a imagem vira data URL dentro do
// próprio registro da mensagem (`MensagemChat.imageUrl`, que já existia em
// `kitPlatform.ts`) — sem upload nem storage, coerente com o app 100% local.
//
// BUSCA NA CONVERSA + AMPLIAR IMAGEM (achado no diff da reconciliação de
// 11/09/2026 — existiam em `ChatMessagesList`/`ChatMessageBubble` do Projeto
// Modelo desde antes do porte de 10/09 e tinham ficado de fora aqui): busca
// filtra as mensagens da conversa por texto (usa o `SearchBox` já padrão do
// app, `PadraoUI.tsx`); clicar numa imagem anexada abre ela em tela cheia com
// opção de baixar — igual ao Projeto Modelo.
//
// Compartilhado pelos dois lados da conversa — `perspectiva` decide de quem
// é o "meu lado" (bolha à direita) e qual carimbo de leitura
// (`chatLastReadTenant`/`chatLastReadMorfo`) esta tela atualiza.
export default function ChatConversa({
  tenant,
  chatConfig,
  perspectiva,
}: {
  tenant: TenantKit
  chatConfig: ChatConfig | undefined
  perspectiva: 'cliente' | 'suporte'
}) {
  const [texto, setTexto] = useState('')
  const [erroImagem, setErroImagem] = useState('')
  const [busca, setBusca] = useState('')
  const [imagemAberta, setImagemAberta] = useState<{ url: string; id: string } | null>(null)
  const arquivoRef = useRef<HTMLInputElement>(null)
  const fimRef = useRef<HTMLDivElement>(null)

  // Follow-up automático (`comFollowUpSeNecessario` no Projeto Modelo): se a
  // última mensagem foi do suporte e passou `followUpHours` sem resposta do
  // cliente, injeta uma mensagem automática — checado sempre que a conversa
  // muda.
  useEffect(() => {
    const comFollowUp = comFollowUpSeNecessario(tenant.supportMessages, chatConfig)
    if (comFollowUp.length !== tenant.supportMessages.length) {
      void atualizarTenantN0(tenant.id, (t) => ({ ...t, supportMessages: comFollowUp }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id, tenant.supportMessages.length])

  // Marca como lida a conversa pro lado que está olhando agora
  // (`chatReadTs` no Projeto Modelo).
  useEffect(() => {
    const ts = chatReadTs(tenant.supportMessages)
    const campo = perspectiva === 'cliente' ? 'chatLastReadTenant' : 'chatLastReadMorfo'
    /* Abrir a conversa também desfaz a marcação manual de "não lida" do lado da
       Morfo (12/09/2026) — senão a conversa voltaria da tela já marcada de
       novo, e o selo nunca apagaria. */
    const limparMarca = perspectiva === 'suporte'
    if (tenant[campo] !== ts || (limparMarca && tenant.chatMarcadaNaoLidaMorfo)) {
      void atualizarTenantN0(tenant.id, (t) => ({
        ...t,
        [campo]: ts,
        ...(limparMarca ? { chatMarcadaNaoLidaMorfo: false } : {}),
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.id, tenant.supportMessages.length])

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' })
  }, [tenant.supportMessages.length])

  async function anexar(mensagem: { text: string; imageUrl?: string }) {
    const nova = { id: uid(), from: perspectiva, ts: agoraISO(), ...mensagem }
    await atualizarTenantN0(tenant.id, (t) => ({ ...t, supportMessages: [...t.supportMessages, nova] }))
  }

  async function enviar() {
    const texto2 = texto.trim()
    if (!texto2) return
    setTexto('')
    await anexar({ text: texto2 })
  }

  // Limite de tamanho da imagem = `chat.maxImageKB`, o parâmetro do N0.
  // Mensagem de erro no mesmo formato do Projeto Modelo: mostra o limite em
  // MB quando passa de 1024KB.
  const limiteKB = chatConfig?.maxImageKB || 3072
  async function escolherImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size / 1024 > limiteKB) {
      setErroImagem(`Imagem maior que ${limiteKB >= 1024 ? `${(limiteKB / 1024).toFixed(1)}MB` : `${limiteKB}KB`} (limite configurado). Escolha uma menor.`)
      if (arquivoRef.current) arquivoRef.current.value = ''
      window.setTimeout(() => setErroImagem(''), 4000)
      return
    }
    const dataUrl = await readImageAsDataUrl(f)
    if (arquivoRef.current) arquivoRef.current.value = ''
    await anexar({ text: '', imageUrl: dataUrl })
  }

  const mensagensFiltradas = busca.trim()
    ? tenant.supportMessages.filter((m) => (m.text || '').toLowerCase().includes(busca.toLowerCase()))
    : tenant.supportMessages
  const grupos = agruparMensagensPorDia(mensagensFiltradas)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: 8 }}>
        {tenant.supportMessages.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <SearchBox value={busca} onChange={setBusca} placeholder="Buscar nessa conversa" />
          </div>
        )}
        {tenant.supportMessages.length === 0 && (
          <p className="texto-fraco" style={{ textAlign: 'center', marginTop: 24 }}>
            Nenhuma mensagem ainda — escreva a primeira ali embaixo.
          </p>
        )}
        {tenant.supportMessages.length > 0 && grupos.length === 0 && (
          <p className="texto-fraco" style={{ textAlign: 'center', marginTop: 24 }}>
            Nada encontrado com "{busca}".
          </p>
        )}
        {grupos.map((g) => (
          <div key={g.label}>
            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--texto-fraco)', margin: '10px 0 6px' }}>{g.label}</div>
            {g.itens.map((m) => {
              const meu = m.from === perspectiva
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: meu ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
                  <div
                    style={{
                      maxWidth: '78%',
                      background: meu ? 'var(--azul)' : 'var(--bg-elevado)',
                      color: meu ? '#fff' : 'var(--texto)',
                      border: meu ? 'none' : '1px solid var(--borda)',
                      borderRadius: 14,
                      padding: '8px 12px',
                      fontSize: 13.5,
                      lineHeight: 1.4,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="Imagem anexada à mensagem"
                        onClick={() => setImagemAberta({ url: m.imageUrl!, id: m.id })}
                        style={{ display: 'block', maxWidth: '100%', borderRadius: 10, marginBottom: m.text ? 6 : 0, cursor: 'pointer' }}
                      />
                    )}
                    {m.text}
                    {m.automatica && <div style={{ fontSize: 10, opacity: 0.7, marginTop: 3 }}>mensagem automática</div>}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div ref={fimRef} />
      </div>
      {erroImagem && (
        <div className="valor-neg" style={{ fontSize: 11.5, fontWeight: 700, padding: '0 2px 6px' }}>{erroImagem}</div>
      )}
      <div className="chat-composer-fixo">
        <input ref={arquivoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => void escolherImagem(e)} />
        <button
          type="button"
          onClick={() => arquivoRef.current?.click()}
          aria-label="Anexar imagem"
          title={`Anexar imagem (até ${limiteKB >= 1024 ? `${(limiteKB / 1024).toFixed(1)}MB` : `${limiteKB}KB`})`}
          style={{
            marginTop: 0,
            background: 'var(--bg-elevado)',
            border: '1px solid var(--borda)',
            borderRadius: 10,
            padding: '0 12px',
            color: 'var(--texto-fraco)',
            fontSize: 16,
            flexShrink: 0,
          }}
        >
          📎
        </button>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') enviar()
          }}
          placeholder="Escreva uma mensagem…"
          aria-label="Mensagem"
          style={{
            flex: 1,
            background: 'var(--bg-elevado)',
            border: '1px solid var(--borda)',
            borderRadius: 10,
            padding: '10px 12px',
            color: 'var(--texto)',
            fontSize: 13.5,
          }}
        />
        <button
          type="button"
          onClick={enviar}
          disabled={!texto.trim()}
          style={{
            marginTop: 0,
            background: 'var(--azul)',
            border: 'none',
            borderRadius: 10,
            padding: '0 16px',
            color: '#fff',
            fontWeight: 700,
            opacity: texto.trim() ? 1 : 0.5,
          }}
        >
          Enviar
        </button>
      </div>
      {imagemAberta && (
        <div
          onClick={() => setImagemAberta(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 60,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <img src={imagemAberta.url} alt="Imagem ampliada" style={{ maxWidth: '100%', maxHeight: '75%', borderRadius: 8 }} />
          <a
            href={imagemAberta.url}
            download={`imagem-chat-${imagemAberta.id}.jpg`}
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--azul)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 13.5,
              padding: '10px 18px',
              borderRadius: 10,
              textDecoration: 'none',
            }}
          >
            <Download size={16} /> Baixar imagem
          </a>
        </div>
      )}
    </>
  )
}
