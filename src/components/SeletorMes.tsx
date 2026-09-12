import { useEffect, useRef, useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { formatarMes, mesAtualISO, somarMes } from '../mes'
import { gerarRecorrentesAteFimDoMes } from '../recorrencia'

// Destaque de "fora do mês atual" (10/09/2026, pedido do Rafael: "destacar
// com cor quando está fora do mês atual, para o usuário não passar
// despercebido"). O que muda quando `mes !== mesAtualISO()`: o nome do mês
// ganha a cor de alerta e uma tarja de fundo. Nada é escondido nem bloqueado
// — a navegação continua exatamente a mesma.
//
// Item 8 da lista de 12/09/2026 — duas mudanças aqui:
//
// 1) NAVEGAR PRA FRENTE passou a ser permitido (até 12 meses). Antes a seta
//    "›" travava no mês corrente, o que contradizia o próprio pedido ("os
//    fixos geram ao clicar na barra de meses para o mês seguinte") e escondia
//    as parcelas já contratadas dos meses seguintes.
//
// 2) TROCAR DE MÊS dispara a geração dos recorrentes daquele mês, e um ícone
//    de reprocessamento ao lado do nome do mês força a mesma rotina à mão. A
//    rotina é idempotente (confere série + data antes de gravar), então nem a
//    troca de mês nem o ícone criam lixo ou duplicata — é a mesma função nos
//    dois caminhos.
const MESES_A_FRENTE = 12

// Quais meses já foram gerados NESTA sessão — evita repetir a varredura a
// cada ida e volta entre telas. Não é a proteção contra duplicata (essa mora
// na própria rotina); é só pra não trabalhar à toa.
const jaGerouNaSessao = new Set<string>()

export default function SeletorMes({ mes, onMudar }: { mes: string; onMudar: (mes: string) => void }) {
  const mesAtual = mesAtualISO()
  const limiteFrente = somarMes(mesAtual, MESES_A_FRENTE)
  const podeAvancar = mes < limiteFrente
  const foraDoMesAtual = mes !== mesAtual
  const [processando, setProcessando] = useState(false)
  const [aviso, setAviso] = useState('')
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => { montado.current = false }
  }, [])

  // Geração automática ao entrar num mês ainda não processado nesta sessão.
  useEffect(() => {
    if (jaGerouNaSessao.has(mes)) return
    jaGerouNaSessao.add(mes)
    void gerarRecorrentesAteFimDoMes(mes).catch(() => { /* nunca pode impedir a tela de abrir */ })
  }, [mes])

  async function reprocessar() {
    setProcessando(true)
    setAviso('')
    try {
      const n = await gerarRecorrentesAteFimDoMes(mes)
      if (montado.current) setAviso(n > 0 ? `${n} lançamento(s) gerado(s).` : 'Nada faltando neste mês.')
    } catch {
      if (montado.current) setAviso('Não deu pra reprocessar agora.')
    }
    if (montado.current) setProcessando(false)
    setTimeout(() => { if (montado.current) setAviso('') }, 4000)
  }

  return (
    <>
      <div className={`seletor-mes ${foraDoMesAtual ? 'seletor-mes-fora' : ''}`}>
        <button type="button" onClick={() => onMudar(somarMes(mes, -1))} aria-label="Mês anterior">
          ‹
        </button>
        <strong title={foraDoMesAtual ? 'Você não está no mês atual' : undefined}>
          {formatarMes(mes)}
        </strong>
        <button
          type="button"
          className="seletor-mes-reprocessar"
          onClick={() => void reprocessar()}
          disabled={processando}
          aria-label="Reprocessar recorrentes e parcelas deste mês"
          title="Reprocessar recorrentes e parcelas deste mês"
        >
          <ArrowPathIcon width={16} height={16} className={processando ? 'girando' : undefined} />
        </button>
        <button
          type="button"
          onClick={() => onMudar(somarMes(mes, 1))}
          disabled={!podeAvancar}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>
      {aviso && <p className="texto-fraco" style={{ margin: '2px 0 0', fontSize: 11.5, textAlign: 'center' }}>{aviso}</p>}
    </>
  )
}
