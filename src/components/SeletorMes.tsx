import { formatarMes, mesAtualISO, somarMes } from '../mes'

export default function SeletorMes({ mes, onMudar }: { mes: string; onMudar: (mes: string) => void }) {
  const podeAvancar = mes < mesAtualISO()
  return (
    <div className="seletor-mes">
      <button type="button" onClick={() => onMudar(somarMes(mes, -1))} aria-label="Mês anterior">
        ‹
      </button>
      <strong>{formatarMes(mes)}</strong>
      <button
        type="button"
        onClick={() => onMudar(somarMes(mes, 1))}
        disabled={!podeAvancar}
        aria-label="Próximo mês"
      >
        ›
      </button>
    </div>
  )
}
