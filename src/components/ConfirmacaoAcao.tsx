/* A CONFIRMAÇÃO ÚNICA do app (build 093, 17/09/2026).
 *
 * Pedido do Rafael, literal: "botões de restaurar tem mensagens fora do
 * padrão, cada uma com dupla checagem diferente, padronize no app inteiro um
 * único modelo que mostra aviso de Atenção em vermelho de alerta do que vai
 * acontecer pra confirmar, os botões tbm devem ter padrão de confirmar ou
 * cancelar, na mesma posição e textos."
 *
 * Até a 092 existiam SEIS formas de dupla checagem convivendo: botão que
 * trocava de texto ("Sim, restaurar o padrão" / "Confirmar — restaurar
 * tudo" / "Sim, apagar todos os lançamentos"), par inline de mini-botões na
 * própria linha ("Confirmar"/"Cancelar"), modal com "Confirmar exclusão",
 * três etapas numeradas (apagar tudo), aviso em texto solto ou nenhum aviso.
 * A ordem dos botões variava (Confirmar à esquerda numa tela, à direita
 * noutra) e o texto do botão de confirmar era diferente em cada uma.
 *
 * Passa a valer, em TODO ponto do N1 que precise de dupla checagem:
 *
 *   ┌──────────────────────────────────────────┐
 *   │ <título: o que a pessoa pediu>           │
 *   │ ┌ ATENÇÃO ────────────────────────────┐  │
 *   │ │ <o que vai acontecer, em vermelho>  │  │
 *   │ └─────────────────────────────────────┘  │
 *   │ [ Cancelar ]            [ Confirmar ]    │
 *   └──────────────────────────────────────────┘
 *
 * • É um MODAL (`.modal-fundo`/`.modal-conteudo`) — a confirmação interrompe
 *   o fluxo de propósito; um par de botões inline some numa linha longa.
 * • "Cancelar" SEMPRE à esquerda (`.secundario`), "Confirmar" SEMPRE à
 *   direita (`.perigo`, vermelho) — mesma posição e mesmo texto em qualquer
 *   tela; quem confirma de olhos fechados acerta o mesmo botão em todas.
 * • O aviso descreve a CONSEQUÊNCIA ("apaga os 827 lançamentos; categorias,
 *   contas e grupos ficam"), nunca repete a pergunta do título.
 * • `children` é conteúdo extra opcional (uma lista de contagens, por
 *   exemplo) e entra ENTRE o aviso e os botões.
 * • Escape / toque no véu = Cancelar. Enquanto `ocupado`, os dois botões
 *   ficam desabilitados e o de confirmar mostra `rotuloOcupado`.
 *
 * O N0 (painel Morfo) continua com as folhas do Kit (`ConfirmDeleteSheet`) —
 * é outro produto visual, e o pedido é sobre o app.
 */
import { useEffect, type ReactNode } from 'react'

export default function ConfirmacaoAcao({
  titulo,
  aviso,
  children,
  onConfirmar,
  onCancelar,
  ocupado = false,
  rotuloOcupado = 'Aguarde…',
  testid = 'confirmacao',
}: {
  titulo: string
  /** O que vai acontecer se confirmar — vai dentro da caixa vermelha de Atenção. */
  aviso: ReactNode
  children?: ReactNode
  onConfirmar: () => void
  onCancelar: () => void
  ocupado?: boolean
  rotuloOcupado?: string
  testid?: string
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !ocupado) onCancelar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onCancelar, ocupado])

  return (
    <div
      className="modal-fundo"
      data-testid={testid}
      onClick={(e) => {
        if (e.target === e.currentTarget && !ocupado) onCancelar()
      }}
    >
      <div className="modal-conteudo confirmacao-acao" role="alertdialog" aria-modal="true" aria-labelledby={`${testid}-titulo`}>
        <h2 id={`${testid}-titulo`} className="confirmacao-acao-titulo">
          {titulo}
        </h2>
        <div className="confirmacao-atencao" data-testid={`${testid}-aviso`}>
          <strong className="confirmacao-atencao-rotulo">Atenção</strong>
          <div className="confirmacao-atencao-texto texto-quebra">{aviso}</div>
        </div>
        {children}
        <div className="acoes-modal confirmacao-acao-botoes">
          <button type="button" className="secundario" onClick={onCancelar} disabled={ocupado} data-testid={`${testid}-cancelar`}>
            Cancelar
          </button>
          <button type="button" className="perigo" onClick={onConfirmar} disabled={ocupado} data-testid={`${testid}-confirmar`}>
            {ocupado ? rotuloOcupado : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  )
}
