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
  definirEspacoDoUsuario,
  restaurarZoomPadraoDoApp,
  ZOOM_LISTAS_MIN,
  ZOOM_LISTAS_MAX,
  ZOOM_LISTAS_PASSO,
  ESPACO_LISTAS_MIN,
  ESPACO_LISTAS_MAX,
  ESPACO_LISTAS_PASSO,
} from '../zoomListas'

export default function ZoomFonteListas() {
  const { efetivo, proprio, padraoApp, espaco, espacoProprio, espacoPadraoApp } = useZoomListas()
  const [confirmando, setConfirmando] = useState(false)

  return (
    <>
      <h2>Aparência das Listas de Lançamento</h2>
      <div className="cartao" data-testid="card-zoom-fontes">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Ajusta a lista de lançamentos (menu Lançamentos e dentro de cada carteira): o tamanho das
          fontes e o espaço entre um lançamento e outro. <strong>0% é o tamanho de hoje</strong> —
          negativo diminui.
        </p>
        <p className="texto-fraco" style={{ marginTop: 0, fontSize: 11.5 }}>
          O percentual não iguala os tamanhos: o título, o valor, a tarja e a conta continuam com as
          proporções que têm hoje — é como aproximar ou afastar a tela.
        </p>

        <div className="param-rotulo-campo">Tamanho das fontes</div>
        <CampoPercentual
          valor={efetivo}
          onChange={(v) => void definirZoomDoUsuario(v)}
          min={ZOOM_LISTAS_MIN}
          max={ZOOM_LISTAS_MAX}
          passo={ZOOM_LISTAS_PASSO}
          testid="zoom-fonte"
          ariaLabel="Percentual de aumento das fontes da lista"
        />

        {/* O segundo campo é em PIXELS, não em porcentagem: espaço é uma
            distância ("quero 8px de respiro"), não uma escala — ver o
            cabeçalho de `zoomListas.ts`. */}
        <div className="param-rotulo-campo" style={{ marginTop: 14 }}>Espaço entre os lançamentos</div>
        <CampoPercentual
          valor={espaco}
          onChange={(v) => void definirEspacoDoUsuario(v)}
          min={ESPACO_LISTAS_MIN}
          max={ESPACO_LISTAS_MAX}
          passo={ESPACO_LISTAS_PASSO}
          sufixo="px"
          testid="espaco-lancamento"
          ariaLabel="Espaço em pixels acima e abaixo de cada lançamento"
        />
        <p className="texto-fraco" style={{ marginTop: 6, fontSize: 11.5 }}>
          É o respiro acima e abaixo de cada lançamento. A linha com a data continua colada na
          lista — ela separa os dias.
        </p>

        <PreviaLista
          titulo="Como está hoje"
          zoomPct={padraoApp}
          espacoPx={espacoPadraoApp}
          testid="previa-zoom-hoje"
        />
        <PreviaLista
          titulo="Como vai ficar"
          zoomPct={efetivo}
          espacoPx={espaco}
          testid="previa-zoom-resultado"
        />

        {(proprio !== undefined || espacoProprio !== undefined) && (
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
          aviso={
            `O que foi escolhido aqui é apagado — o tamanho das fontes ` +
            `(${efetivo > 0 ? '+' : ''}${efetivo}%) e o espaço entre os lançamentos (${espaco}px) — ` +
            `e passa a valer o padrão do app (${padraoApp > 0 ? '+' : ''}${padraoApp}% e ${espacoPadraoApp}px).`
          }
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
