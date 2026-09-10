import { formatarMes, mesAtualISO, somarMes } from '../mes'

// Destaque de "fora do mês atual" (10/09/2026, pedido do Rafael: "destacar
// com cor quando está fora do mês atual, para o usuário não passar
// despercebido"). O que muda quando `mes !== mesAtualISO()`: o nome do mês
// ganha a cor de alerta e uma tarja de fundo, e aparece um atalho "Hoje" que
// devolve pro mês corrente num toque. Nada é escondido nem bloqueado — a
// navegação continua exatamente a mesma.
export default function SeletorMes({ mes, onMudar }: { mes: string; onMudar: (mes: string) => void }) {
  const mesAtual = mesAtualISO()
  const podeAvancar = mes < mesAtual
  const foraDoMesAtual = mes !== mesAtual
  return (
    <div className={`seletor-mes ${foraDoMesAtual ? 'seletor-mes-fora' : ''}`}>
      <button type="button" onClick={() => onMudar(somarMes(mes, -1))} aria-label="Mês anterior">
        ‹
      </button>
      <strong title={foraDoMesAtual ? 'Você não está no mês atual' : undefined}>
        {formatarMes(mes)}
      </strong>
      <button
        type="button"
        onClick={() => onMudar(somarMes(mes, 1))}
        disabled={!podeAvancar}
        aria-label="Próximo mês"
      >
        ›
      </button>
      {/* O atalho "Hoje" foi retirado a pedido do Rafael (10/09/2026): a linha
          precisava ficar mais enxuta, e o destaque de cor no nome do mês já
          avisa que a tela não está no mês atual. Voltar continua sendo uma
          seta — nenhum caminho foi perdido. */}
    </div>
  )
}
