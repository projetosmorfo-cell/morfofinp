import { useState, type ReactNode } from 'react'

/* Explicação da tela — botão que abre, nunca dica que some (12/09/2026, build
   052, pedido do Rafael).

   O que existia antes: `DismissibleTip` (Padrão de Interface Morfo, seção 6) em
   Situação, Carteira e Planejamento — uma faixa de texto com um "X" que a
   dispensava de vez, e que sumia sozinha depois de 3 exibições.

   Por que mudou: o Rafael validou o CONTEÚDO dessas explicações, mas não o
   comportamento. Duas coisas estavam erradas ao mesmo tempo:

     1. A dica ocupava o lugar do SUBTÍTULO da tela (`subtitulosTelas.ts`) sem
        ser um. Subtítulo é a frase curta que diz o que a tela compara, aparece
        sempre e não se fecha; explicação é o texto longo, que a pessoa abre
        quando quer. São duas coisas, e agora as duas convivem.
     2. Sumir sozinha é o pior dos mundos pra quem usa o app de vez em quando:
        justamente quem mais precisa da explicação é quem menos abre o app — e
        depois de 3 aberturas ela tinha desaparecido para sempre, sem nenhum
        caminho de volta.

   O modelo é o que o Resumo já usava para explicar o resultado projetado: um
   botão discreto que abre e fecha o texto, sempre disponível, sem estado
   guardado em lugar nenhum. Como não há `localStorage` envolvido, também some
   a classe inteira de falha que aquele componente tinha que tratar (navegador
   sem armazenamento, valor corrompido).

   `rotulo` existe porque a pergunta muda de tela pra tela ("o que essa tela
   mostra?" na Situação, "o que esse número quer dizer?" no Resumo). O texto de
   fechar é sempre o mesmo. */
export default function ExplicacaoDaTela({
  rotulo = 'O que essa tela mostra?',
  children,
  style,
}: {
  rotulo?: string
  children: ReactNode
  style?: React.CSSProperties
}) {
  const [aberta, setAberta] = useState(false)
  return (
    <div style={style}>
      <button
        type="button"
        className="botao-link-secao"
        data-testid="abrir-explicacao"
        onClick={() => setAberta((a) => !a)}
      >
        {aberta ? 'Esconder explicação' : rotulo}
      </button>
      {aberta && (
        <p
          className="texto-fraco"
          data-testid="texto-explicacao"
          style={{ fontSize: 12.5, lineHeight: 1.45, margin: '6px 0 0' }}
        >
          {children}
        </p>
      )}
    </div>
  )
}
