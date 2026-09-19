/* COR DA LINHA DE DATA — a seção do N1 (build 101, 18/09/2026, pedido do
 * Rafael). Mesmo desenho de `ZoomFonteListas.tsx`: rascunho grava na hora
 * (sem botão salvar), "Voltar ao padrão do app" apaga a escolha deste
 * ambiente, e os dois quadros de prévia ficam sempre visíveis — só que aqui
 * os quadros mostram as DUAS listagens (Completa e Simples) juntas, porque é
 * a mesma cor valendo pras duas (ver `src/corDataLista.ts`).
 *
 * Paleta em vez de `<input type="color">` livre: mesma decisão já tomada
 * pro seletor de ícone (`SeletorIcone.tsx`, `PALETA_CORES`) — uma grade
 * limitada e tradicional lê melhor do que um seletor nativo cru.
 */
import { useState } from 'react'
import PreviaLista from './PreviaLista'
import ConfirmacaoAcao from './ConfirmacaoAcao'
import { PALETA_CORES } from '../icones'
import {
  useCorDataLista,
  definirCorDataListaDoUsuario,
  restaurarCorDataListaPadraoDoApp,
} from '../corDataLista'

export default function CorDataLista() {
  const { efetivo, proprio, padraoApp } = useCorDataLista()
  const [confirmando, setConfirmando] = useState(false)

  return (
    <>
      <h2>Cor da Linha de Data</h2>
      <div className="cartao" data-testid="card-cor-data-lista">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          O texto da data que separa os lançamentos por dia, nas duas listagens (Lançamentos e dentro
          de cada carteira). <strong>Sem escolha, segue o tom neutro do tema</strong> (claro/escuro).
          Escolher uma cor aqui fixa o mesmo tom nos dois temas.
        </p>

        <div className="param-rotulo-campo">Cor do texto</div>
        {/* Mesma grade/classe do seletor de cor de ícone (`SeletorIcone.tsx`,
            `.paleta-cores-icone`/`.swatch-cor`) — reaproveitada de propósito,
            pra não existirem dois desenhos de "escolher uma cor da paleta"
            no mesmo app. */}
        <div className="paleta-cores-icone" data-testid="grade-cor-data-lista">
          {PALETA_CORES.map((cor) => (
            <button
              key={cor}
              type="button"
              className={`swatch-cor ${efetivo === cor ? 'selecionada' : ''}`}
              style={{ background: cor }}
              aria-label={`Cor ${cor}`}
              aria-pressed={efetivo === cor}
              data-testid={`cor-data-${cor}`}
              onClick={() => void definirCorDataListaDoUsuario(cor)}
            />
          ))}
        </div>
        <p className="texto-fraco" style={{ marginTop: 6, fontSize: 11.5 }}>
          {efetivo ? `Cor escolhida: ${efetivo}.` : 'Nenhuma cor escolhida — segue o tom do tema.'}
        </p>

        <PreviaLista
          titulo="Como está hoje"
          zoomPct={0}
          corData={padraoApp}
          casos={['lancamentos', 'lancamentosSimples']}
          testid="previa-cor-hoje"
        />
        <PreviaLista
          titulo="Como vai ficar"
          zoomPct={0}
          corData={efetivo}
          casos={['lancamentos', 'lancamentosSimples']}
          testid="previa-cor-resultado"
        />

        {proprio !== undefined && (
          <button
            type="button"
            className="secundario"
            style={{ marginTop: 10 }}
            onClick={() => setConfirmando(true)}
            data-testid="cor-data-restaurar"
          >
            Voltar ao padrão do app
          </button>
        )}
      </div>

      {confirmando && (
        <ConfirmacaoAcao
          titulo="Voltar ao padrão do app"
          aviso={
            `A cor escolhida aqui (${efetivo}) é apagada e a linha de data volta a seguir o tom do tema — ` +
            `a menos que o app tenha uma cor publicada como padrão (${padraoApp ?? 'nenhuma, segue o tema'}).`
          }
          onConfirmar={async () => {
            await restaurarCorDataListaPadraoDoApp()
            setConfirmando(false)
          }}
          onCancelar={() => setConfirmando(false)}
          testid="conf-cor-data-restaurar"
        />
      )}
    </>
  )
}
