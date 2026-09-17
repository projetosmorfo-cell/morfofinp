/* CAMPO DE PERCENTUAL COM SETAS — build 094 (17/09/2026), item 2 do Rafael.
 *
 * *"permitir seta pra baixo e pra cima pra diminuir ou aumentar ou editar o
 * numero direto"* — as três formas, no mesmo campo.
 *
 * Por que não o `<input type="number">` puro, que já tem setas: as setas
 * nativas só aparecem no desktop, ao passar o mouse, e têm poucos pixels de
 * altura cada — num celular elas simplesmente não existem. Aqui as setas são
 * botões de verdade, com a área de toque mínima do app (44px, Padrão UI
 * seção 15), e o campo continua editável direto no meio delas.
 *
 * O ESTADO É RASCUNHO enquanto se digita. Sem isso, apagar o campo pra
 * escrever "-15" passaria por "" (que vira 0) e por "-" (inválido), e cada
 * passo intermediário seria gravado — a lista piscaria de tamanho a cada
 * tecla e o "-" sozinho seria engolido. O valor só sai daqui quando é um
 * número de verdade; ao sair do campo, o rascunho volta a espelhar o valor
 * em vigor (é o que desfaz um "-" deixado pela metade).
 */
import { useEffect, useState } from 'react'

export default function CampoPercentual({
  valor,
  onChange,
  min,
  max,
  passo = 5,
  sufixo = '%',
  testid,
  ariaLabel,
}: {
  valor: number
  onChange: (v: number) => void
  min: number
  max: number
  passo?: number
  sufixo?: string
  testid?: string
  ariaLabel?: string
}) {
  const [rascunho, setRascunho] = useState(String(valor))
  /* Espelha o valor que vem de fora (outra tela mexeu, restaurou o padrão,
     publicação do N0 chegou) sem atropelar quem está digitando agora: só
     reescreve o rascunho quando ele não representa mais o mesmo número. */
  useEffect(() => {
    if (Number(rascunho) !== valor) setRascunho(String(valor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  const prender = (v: number) => Math.min(max, Math.max(min, v))

  function passoDe(sentido: 1 | -1) {
    const base = Number.isFinite(Number(rascunho)) && rascunho.trim() !== '' ? Number(rascunho) : valor
    const novo = prender(Math.round(base) + sentido * passo)
    setRascunho(String(novo))
    onChange(novo)
  }

  return (
    <div className="campo-percentual" data-testid={testid}>
      <button
        type="button"
        className="campo-percentual-seta"
        onClick={() => passoDe(-1)}
        disabled={valor <= min}
        aria-label={`Diminuir ${passo}${sufixo}`}
        data-testid={testid ? `${testid}-menos` : undefined}
      >
        ▼
      </button>
      <div className="campo-percentual-meio">
        <input
          type="text"
          inputMode="numeric"
          value={rascunho}
          aria-label={ariaLabel}
          data-testid={testid ? `${testid}-campo` : undefined}
          onChange={(e) => {
            const t = e.target.value
            /* Aceita vazio e o "-" sozinho como passagem — são estados de
               digitação, não valores. Nada é gravado neles. */
            if (!/^-?\d*$/.test(t)) return
            setRascunho(t)
            if (t !== '' && t !== '-') onChange(prender(Number(t)))
          }}
          onBlur={() => setRascunho(String(valor))}
        />
        <span className="campo-percentual-sufixo">{sufixo}</span>
      </div>
      <button
        type="button"
        className="campo-percentual-seta"
        onClick={() => passoDe(1)}
        disabled={valor >= max}
        aria-label={`Aumentar ${passo}${sufixo}`}
        data-testid={testid ? `${testid}-mais` : undefined}
      >
        ▲
      </button>
    </div>
  )
}
