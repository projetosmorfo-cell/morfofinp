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
import { IconesDeTela } from './TopoIcones'
import { ESPACO_LINHA } from './PadraoUI'

export default function TituloTelaN1({ titulo, onExportar, extra, antes, acoesLista }: {
  titulo: ReactNode
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: ESPACO_LINHA }}>
      {antes}
      <h1 style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0, marginRight: 'auto' }}>{titulo}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <IconesDeTela {...acoesLista} onExportar={onExportar} incluir={extra} />
      </div>
    </div>
  )
}
