/* Build 100 (18/09/2026), pedido do Rafael (escolha A1 da proposta de
   18/09/2026): a aba "Aparência" saiu de dentro de "Grupos, Categorias e
   Metas" (`Categorias.tsx`) e virou entrada própria do menu de
   Configuração — é preferência visual do app inteiro, não cadastro de
   lançamento, então não tem por que morar junto do cadastro de grupo e
   categoria. O conteúdo é o MESMO de sempre (pacote de ícones, tamanho dos
   ícones com a prévia ao lado, zoom das listas) — só mudou de tela; nenhum
   parâmetro, valor padrão ou comportamento foi alterado nesta mudança.

   Histórico: essa mesma ideia (Aparência como item próprio do menu) já
   tinha existido antes e foi removida em 10/09/2026 quando o tema virou
   ícone fixo no topo (ver comentário em `kit/ConfiguracoesN1.tsx`) — volta
   agora por um motivo diferente: reduzir "Grupos, Categorias e Metas" de 4
   abas pra 3, item B da lista de 18/09/2026. */
import PacoteIconesN1 from '../components/PacoteIconesN1'
import PreviaLista from '../components/PreviaLista'
import ZoomFonteListas from '../components/ZoomFonteListas'
import CorDataLista from '../components/CorDataLista'
import { useConfiguracaoIcones, salvarConfiguracaoIcones } from '../configuracaoIcones'

export default function Aparencia({ aoVoltar }: { aoVoltar: () => void }) {
  const configIcones = useConfiguracaoIcones()

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Aparência</h1>
      </div>
      <p className="texto-fraco">
        Pacote de ícones, tamanho de cada tipo de ícone e zoom das listas de lançamento — vale pro app inteiro,
        não é configurável por categoria ou grupo individual.
      </p>

      {/* Build 089: o PACOTE de ícones vem primeiro — escolher o traço é
          uma decisão maior que calibrar o tamanho dele, e é a primeira
          coisa que alguém faz ao abrir "Aparência". */}
      <PacoteIconesN1 />

      {/* 01/09/2026, rodada seguinte: config universal de tamanho de
          ícone — NÃO é por categoria/grupo (por isso fica aqui, fora do
          cadastro de cada um), é um parâmetro só, aplicado em todo o app
          de uma vez. 3 percentuais independentes, um por tipo de linha
          onde ícone aparece: Simples (categoria expandida em
          Resumo/Situação/Planejamento), Completa (Lançamentos/Carteira)
          e Grupo (cabeçalho de grupo em toda tela que mostra grupo). Ver
          `configuracaoIcones.ts` pros valores padrão (60/30/30) e a
          altura de referência fixa de cada tipo — é em cima dela que o
          percentual é calculado, não da altura real renderizada (evita
          o ícone "inflar" a própria linha). */}
      <h2>Tamanho dos Ícones</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Quanto o ícone ocupa da altura da própria linha, em cada tipo de exibição — vale pro app inteiro,
          não é configurável por categoria ou grupo individual.
        </p>
        <label>Categorias (linha de categoria cadastrada na aba "Categorias")</label>
        <input
          type="number"
          min={0}
          max={200}
          step={5}
          value={configIcones.pctCategoria}
          onChange={(e) => salvarConfiguracaoIcones({ pctCategoria: Number(e.target.value) || 0 })}
        />
        <label>Lançamentos — listagem Completa (Lançamentos, Carteira)</label>
        <input
          type="number"
          min={0}
          max={200}
          step={5}
          value={configIcones.pctCompleta}
          onChange={(e) => salvarConfiguracaoIcones({ pctCompleta: Number(e.target.value) || 0 })}
        />
        <label>Grupos (cabeçalho de grupo em qualquer tela)</label>
        <input
          type="number"
          min={0}
          max={200}
          step={5}
          value={configIcones.pctGrupo}
          onChange={(e) => salvarConfiguracaoIcones({ pctGrupo: Number(e.target.value) || 0 })}
        />

        {/* Build 094 (item 2): *"Esse quadro de prévia quero que aplique
            tbm na mesma tela em que permite mudar os tamanhos dos icones,
            quero um exemplo do lado (…) devem ser de uns 3 casos"*. Os
            três casos são exatamente os três percentuais acima — um
            exemplo por linha que cada um governa —, e o de grupos traz
            DOIS grupos com categorias dentro, como ele nomeou. Não há um
            segundo quadro de "como vai ficar" aqui: os campos gravam na
            hora e o quadro já mostra o resultado enquanto se mexe. */}
        <PreviaLista
          titulo="Exemplo com os tamanhos acima"
          zoomPct={0}
          casos={['lancamentos', 'categorias', 'grupos']}
          testid="previa-icones"
        />
      </div>

      {/* Build 094 (item 2): o zoom das fontes da lista de lançamentos.
          Fica DEPOIS dos ícones de propósito — é o parâmetro mais novo e
          o menos procurado dos dois. */}
      <ZoomFonteListas />

      {/* Build 101, pedido do Rafael: cor do texto da linha de data, nas
          duas listagens (Completa e Simples) — mesmo parâmetro pras duas. */}
      <CorDataLista />
    </>
  )
}
