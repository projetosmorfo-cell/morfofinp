/* TAMANHO DAS FONTES DAS LISTAS — a seção do N1 (build 094, item 2).
 *
 * Um campo só, em porcentagem, com as três formas de mexer que o Rafael pediu
 * (setas, digitação direta, negativo permitido) e os dois quadros de prévia:
 * *"um quadro de exemplo do tamanho real hoje e conforme vai mexendo ele
 * apresenta a prévia do resultado"*.
 *
 * OS DOIS QUADROS FICAM SEMPRE NA TELA, inclusive em 0%. Mostrar o segundo só
 * quando há diferença pareceria que o campo "não fez nada" no primeiro toque —
 * e ver os dois iguais em 0% é justamente o que ensina que 0 é o tamanho de
 * hoje.
 *
 * O RASCUNHO grava na hora (não há botão de salvar): a lista de verdade muda
 * atrás, e é isso que a pessoa quer conferir. "Voltar ao padrão do app" apaga
 * a escolha deste ambiente e devolve o que o N0 publica HOJE — nunca uma
 * constante congelada aqui (ver `zoomListas.ts`).
 */
import { useState } from 'react'
import CampoPercentual from './CampoPercentual'
import PreviaLista from './PreviaLista'
import ConfirmacaoAcao from './ConfirmacaoAcao'
import {
  useZoomListas,
  definirZoomDoUsuario,
  restaurarZoomPadraoDoApp,
  ZOOM_LISTAS_MIN,
  ZOOM_LISTAS_MAX,
  ZOOM_LISTAS_PASSO,
} from '../zoomListas'

export default function ZoomFonteListas() {
  const { efetivo, proprio, padraoApp } = useZoomListas()
  const [confirmando, setConfirmando] = useState(false)

  return (
    <>
      <h2>Tamanho das Fontes das Listas</h2>
      <div className="cartao" data-testid="card-zoom-fontes">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Aumenta ou diminui, de uma vez, todas as fontes da lista de lançamentos (menu Lançamentos e
          dentro de cada carteira). <strong>0% é o tamanho de hoje.</strong> Negativo diminui.
        </p>
        <p className="texto-fraco" style={{ marginTop: 0, fontSize: 11.5 }}>
          Não iguala os tamanhos: o título, o valor, a tarja e a conta continuam com as proporções que
          têm hoje — é como aproximar ou afastar a tela.
        </p>

        <CampoPercentual
          valor={efetivo}
          onChange={(v) => void definirZoomDoUsuario(v)}
          min={ZOOM_LISTAS_MIN}
          max={ZOOM_LISTAS_MAX}
          passo={ZOOM_LISTAS_PASSO}
          testid="zoom-fonte"
          ariaLabel="Percentual de aumento das fontes da lista"
        />

        <PreviaLista titulo="Tamanho de hoje" zoomPct={padraoApp} testid="previa-zoom-hoje" />
        <PreviaLista titulo="Como vai ficar" zoomPct={efetivo} testid="previa-zoom-resultado" />

        {proprio !== undefined && (
          <button
            type="button"
            className="secundario"
            style={{ marginTop: 10 }}
            onClick={() => setConfirmando(true)}
            data-testid="zoom-restaurar"
          >
            Voltar ao padrão do app
          </button>
        )}
      </div>

      {confirmando && (
        <ConfirmacaoAcao
          titulo="Voltar ao padrão do app"
          aviso={`O tamanho escolhido aqui (${efetivo > 0 ? '+' : ''}${efetivo}%) é apagado e passa a valer o padrão do app (${padraoApp > 0 ? '+' : ''}${padraoApp}%).`}
          onConfirmar={async () => {
            await restaurarZoomPadraoDoApp()
            setConfirmando(false)
          }}
          onCancelar={() => setConfirmando(false)}
          testid="conf-zoom-restaurar"
        />
      )}
    </>
  )
}
