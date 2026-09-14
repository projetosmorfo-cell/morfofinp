/* Detalhe que abre por toque, dentro de um cartão (build 066).
 *
 * O pedido do Rafael, ao aprovar a proposta dos dois totais: *"não quero que
 * abra tudo isso de uma vez na tela… você vai mostrar o número, a frase também
 * embaixo, e daí daquela linha de baixo você vai recolher. Se eu quiser eu
 * clico e abro o detalhe"*.
 *
 * É outra coisa do `ExplicacaoDaTela`: aquele abre TEXTO (o que a tela quer
 * dizer), este abre NÚMERO (a conta que forma o total logo acima). O texto da
 * tela tem lugar único desde a build 053 — o "i" do cabeçalho.
 *
 * Nasce recolhido, sempre: um total que chega aberto não é um total, é uma
 * lista. A escolha NÃO é persistida de propósito — toda vez que a tela abre,
 * ela abre enxuta.
 */
import { useState, type ReactNode } from 'react'

export default function BlocoRecolhivel({
  rotulo = 'Ver detalhe',
  rotuloAberto,
  children,
  testid,
}: {
  rotulo?: string
  /** Texto quando já está aberto. Padrão: "Recolher". */
  rotuloAberto?: string
  children: ReactNode
  testid?: string
}) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="bloco-recolhivel">
      <button
        type="button"
        className="bloco-recolhivel-botao"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        data-testid={testid}
      >
        <span>{aberto ? (rotuloAberto ?? 'Recolher') : rotulo}</span>
        <span className={`bloco-recolhivel-seta ${aberto ? 'aberta' : ''}`} aria-hidden="true">
          ›
        </span>
      </button>
      {aberto && (
        <div className="bloco-recolhivel-corpo" data-testid={testid ? `${testid}-corpo` : undefined}>
          {children}
        </div>
      )}
    </div>
  )
}
