// Canal de suporte do MorfoFinP (08/09/2026, Roteiro de Parametrização Morfo,
// Site institucional deslogado — Bloco 2, Decisão 20). A Decisão 2 previa
// "chat interno de suporte" como padrão do Modelo Completo (MorfoLoc) — o
// Rafael escolheu substituir por um link direto de WhatsApp nesta rodada:
// funciona de verdade agora, sem esperar o backend (Backlog #028), que é
// quando um chat interno de verdade (histórico, fila, várias pessoas)
// passaria a fazer sentido. Reavaliar quando o backend entrar em pauta.
//
// Número/mensagem viraram PARÂMETROS opcionais (08/09/2026, G59 — "Marca do
// site institucional" é item aprovado pro N0, editável em `DevApp` →
// Parâmetros → Marca, gravado em `db.configuracoes.marcaWhatsappNumero`/
// `marcaWhatsappMensagemPadrao`). Os valores abaixo continuam sendo o
// FALLBACK — quem chama de um componente React já tem a config carregada
// via `useLiveQuery` (reativo) e passa os valores atuais; nenhuma leitura
// assíncrona do Dexie acontece aqui dentro, de propósito: `window.open`
// perde a permissão do navegador de abrir pop-up se não rodar SÍNCRONO
// dentro do próprio clique — um `await db.configuracoes.get(1)` antes do
// `window.open` quebraria isso silenciosamente (a aba simplesmente não
// abriria em vários navegadores).
const NUMERO_WHATSAPP_SUPORTE_PADRAO = '5511986897908'
const MENSAGEM_SUPORTE_PADRAO = 'Oi! Preciso de ajuda com o MorfoFinP.'

export function linkSuporteWhatsApp(mensagem?: string, numero?: string): string {
  const texto = encodeURIComponent(mensagem ?? MENSAGEM_SUPORTE_PADRAO)
  return `https://wa.me/${numero || NUMERO_WHATSAPP_SUPORTE_PADRAO}?text=${texto}`
}

export function abrirSuporteWhatsApp(mensagem?: string, numero?: string): void {
  window.open(linkSuporteWhatsApp(mensagem, numero), '_blank', 'noopener,noreferrer')
}
