/* Linha de título das telas do N1 com a fileira de ícones do Projeto Modelo à
   direita (`StandardTopIcons` — Buscar · Chat · Exportar · Incluir, nessa
   ordem; ver `TopoIcones.tsx`). Até a rodada de 10/09/2026 as telas do N1
   tinham só o `<h1>` solto dentro do `.cabecalho-fixo`; item 18 do CONTRATO DE
   EXECUÇÃO e G44 regra 11b pedem a exportação em toda tela de
   listagem/resumo, no lugar padrão do Projeto Modelo.

   Fica num arquivo próprio (e não dentro de cada tela) porque são 7 telas
   usando exatamente a mesma linha — o Projeto Modelo também tem um
   componente só. Reconferido em 11/09/2026: sem divergência. */
import type { ReactNode } from 'react'
import { tituloCasoSeTexto } from '../tituloCaso'
import { IconesDeTela } from './TopoIcones'
import { ESPACO_LINHA, InfoDot } from './PadraoUI'

export default function TituloTelaN1({ titulo, subtitulo, explicacao, onExportar, extra, antes, acoesLista }: {
  titulo: ReactNode
  /* Frase curta em destaque logo abaixo do título, dizendo o que a tela
     compara (12/09/2026, itens 4/5/6). Os textos vivem em
     `src/subtitulosTelas.ts` — o onboarding usa os mesmos. */
  subtitulo?: string
  /* Texto longo da tela, aberto pelo "i" ao lado do subtítulo (12/09/2026,
     build 053). Antes era um botão no corpo da tela ("O que essa tela
     mostra?"); o Rafael pediu para virar o ícone de informação, junto do
     subtítulo. Continua vindo de `src/subtitulosTelas.ts`, então subtítulo e
     explicação seguem sendo a mesma ideia em dois tamanhos. */
  explicacao?: ReactNode
  onExportar?: () => void
  extra?: ReactNode
  /* Elemento à ESQUERDA do título (o "‹ Voltar" do detalhe de uma carteira,
     por exemplo) — antes cada tela montava a própria linha de título nesse
     caso, e a fileira de ícones não aparecia lá. */
  antes?: ReactNode
  /* Seleção · Busca · Filtro das telas de lista completa (10/09/2026). Vem
     como um objeto só porque os três andam sempre juntos. */
  acoesLista?: {
    onSelecionar?: () => void
    selecaoAtiva?: boolean
    onBuscar?: () => void
    buscaAtiva?: boolean
    onFiltrar?: () => void
    filtrosAtivos?: number
  }
}) {
  return (
    /* `marginBottom` na LINHA, não no `<h1>` (10/09/2026): o `margin-bottom`
       do título é engolido dentro da linha flex — quem define a altura da
       linha são os ícones de 36px, então a borda de baixo da linha ficava
       colada na linha do mês (medido: 0px de respiro em todas as telas). O
       valor é o ritmo único do Padrão de Interface (10px). O `<h1>` perde a
       margem própria aqui pra ficar centralizado com os ícones. */
    <div style={{ marginBottom: ESPACO_LINHA }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {antes}
        {/* 12/09/2026 (build 053): o subtítulo saiu de baixo do título e veio
            para o lado dele, com o "i" logo em seguida — pedido do Rafael.
            Fonte e cor são as mesmas de antes; só o lugar mudou.
            O título encolhe primeiro (`flexShrink` no h1, `minWidth: 0` nos
            dois) para que o subtítulo não seja o primeiro a ser cortado numa
            tela estreita: ele é a frase que explica a tela. */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0, marginRight: 'auto' }}>
          <h1 style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, flexShrink: 1 }}>{tituloCasoSeTexto(titulo) as ReactNode}</h1>
          {(subtitulo || explicacao) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
              {subtitulo && (
                <span
                  data-testid="subtitulo-tela"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--azul)',
                    lineHeight: 1.35,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {/* 12/09/2026 (build 055), pedido do Rafael: "subtítulos
                      (azul) devem ter as 1ªs letras maiúsculas". Passa pela
                      MESMA função que já trata título de tela, rótulo de campo
                      e item de menu (`emTituloCaso`) — que deixa conectivo em
                      minúscula ("Onde o Dinheiro Está") e preserva sigla. Um
                      subtítulo novo nasce certo sem ninguém lembrar de digitar
                      em caixa. */}
                  {tituloCasoSeTexto(subtitulo) as ReactNode}
                </span>
              )}
              {explicacao && (
                <span data-testid="info-tela" style={{ flexShrink: 0 }}>
                  <InfoDot info={explicacao} titulo={tituloCasoSeTexto(titulo) as ReactNode} />
                </span>
              )}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <IconesDeTela {...acoesLista} onExportar={onExportar} incluir={extra} />
        </div>
      </div>
    </div>
  )
}
