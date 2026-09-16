import { useEffect, useRef, useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { formatarMesCurto, mesAtualISO, somarMes } from '../mes'
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

function formatarDataCurta(dataISO: string) {
  const [, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}`
}

export interface SeletorPeriodo {
  /** Estamos em modo período (De/Até) em vez de mês fechado. */
  ativo: boolean
  de: string
  ate: string
  onAplicarPeriodo: (de: string, ate: string) => void
  /** Volta pro modo mês normal, num mês específico. */
  onEscolherMes: (mes: string) => void
}

export default function SeletorMes({
  mes,
  onMudar,
  periodo,
}: {
  mes: string
  onMudar: (mes: string) => void
  /* Item 2 (16/09/2026): quando presente, o nome do mês (ou o período, se
     `periodo.ativo`) vira clicável e abre um POPUP pra escolher um intervalo
     de datas (De/Até) ou voltar pra um mês específico fechado — usado só em
     Lançamentos (o único lugar com o pedido). Opcional e sem efeito em quem
     não passa a prop — as outras 4 telas que usam este seletor continuam
     exatamente iguais. Revoga o `aoClicarNome`/toggle inline que existia
     antes (o Rafael reclamou que ficava "fixo na tela"). */
  periodo?: SeletorPeriodo
}) {
  const mesAtual = mesAtualISO()
  const limiteFrente = somarMes(mesAtual, MESES_A_FRENTE)
  const podeAvancar = mes < limiteFrente
  const foraDoMesAtual = mes !== mesAtual
  const [processando, setProcessando] = useState(false)
  const [aviso, setAviso] = useState('')
  const montado = useRef(true)
  const [popupAberto, setPopupAberto] = useState(false)
  const [rascunhoDe, setRascunhoDe] = useState(periodo?.de ?? `${mes}-01`)
  const [rascunhoAte, setRascunhoAte] = useState(periodo?.ate ?? `${mes}-31`)
  const [rascunhoMes, setRascunhoMes] = useState(mes)

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

  function abrirPopup() {
    setRascunhoDe(periodo?.ativo ? periodo.de : `${mes}-01`)
    setRascunhoAte(periodo?.ativo ? periodo.ate : `${mes}-31`)
    setRascunhoMes(mes)
    setPopupAberto(true)
  }

  function aplicarPeriodo() {
    periodo?.onAplicarPeriodo(rascunhoDe, rascunhoAte)
    setPopupAberto(false)
  }

  function aplicarMesEspecifico() {
    periodo?.onEscolherMes(rascunhoMes)
    setPopupAberto(false)
  }

  const rotuloCentro = periodo?.ativo
    ? `${formatarDataCurta(periodo.de)} – ${formatarDataCurta(periodo.ate)}`
    : formatarMesCurto(mes)

  return (
    <>
      {/* Item 2 (16/09/2026): setas SEMPRE nas bordas absolutas
          (`justify-content: space-between`), com tudo o mais (nome do mês,
          rótulo de período, "Hoje", reprocessar) centralizado numa área do
          MEIO com largura fixa (`.seletor-mes-centro`, ver index.css) — nunca
          mais um layout que empurra a seta pra perto do texto quando um botão
          extra (ex.: "Hoje") aparece do lado. */}
      <div className={`seletor-mes ${foraDoMesAtual && !periodo?.ativo ? 'seletor-mes-fora' : ''}`}>
        <button type="button" onClick={() => onMudar(somarMes(mes, -1))} aria-label="Mês anterior" disabled={!!periodo?.ativo}>
          ‹
        </button>
        <div className="seletor-mes-centro">
          {periodo ? (
            <button
              type="button"
              className="seletor-mes-nome-botao"
              onClick={abrirPopup}
              data-testid="seletor-mes-nome-clicavel"
              title="Escolher mês ou período"
            >
              {rotuloCentro}
            </button>
          ) : (
            <strong title={foraDoMesAtual ? 'Você não está no mês atual' : undefined}>
              {rotuloCentro}
            </strong>
          )}
          {/* Volta pro mês corrente em um toque (build 063). Só existe quando há
              pra onde voltar — no mês atual ele não teria função e só ocuparia
              espaço na linha. */}
          {foraDoMesAtual && !periodo?.ativo && (
            <button
              type="button"
              className="seletor-mes-hoje"
              onClick={() => onMudar(mesAtual)}
              data-testid="seletor-mes-hoje"
              title="Voltar para o mês atual"
            >
              Hoje
            </button>
          )}
          {!periodo?.ativo && (
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
          )}
        </div>
        <button
          type="button"
          onClick={() => onMudar(somarMes(mes, 1))}
          disabled={!podeAvancar || !!periodo?.ativo}
          aria-label="Próximo mês"
        >
          ›
        </button>
      </div>
      {aviso && <p className="texto-fraco" style={{ margin: '2px 0 0', fontSize: 11.5, textAlign: 'center' }}>{aviso}</p>}

      {/* Item 2 (16/09/2026): popup de verdade (`.modal-fundo`/`.modal-conteudo`)
          no lugar do toggle inline que ficava "fixo na tela" — escolher um
          período (De/Até) OU voltar pra um mês específico, os dois aplicando
          e fechando o popup sozinhos. */}
      {popupAberto && periodo && (
        <div className="modal-fundo" onClick={() => setPopupAberto(false)}>
          <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Ver por período ou por mês</h2>

            <label htmlFor="periodo-popup-de">De</label>
            <input
              id="periodo-popup-de"
              type="date"
              value={rascunhoDe}
              onChange={(e) => setRascunhoDe(e.target.value)}
              data-testid="periodo-popup-de"
            />
            <label htmlFor="periodo-popup-ate">Até</label>
            <input
              id="periodo-popup-ate"
              type="date"
              value={rascunhoAte}
              onChange={(e) => setRascunhoAte(e.target.value)}
              data-testid="periodo-popup-ate"
            />
            <button
              type="button"
              className="primario"
              onClick={aplicarPeriodo}
              data-testid="periodo-popup-aplicar"
            >
              Ver este período
            </button>

            <div style={{ margin: '16px 0 8px', borderTop: '1px solid var(--borda)', paddingTop: 12 }}>
              <label htmlFor="periodo-popup-mes">Ou escolher um mês fechado</label>
              <input
                id="periodo-popup-mes"
                type="month"
                value={rascunhoMes}
                onChange={(e) => setRascunhoMes(e.target.value)}
                data-testid="periodo-popup-mes"
              />
              <button
                type="button"
                className="secundario"
                onClick={aplicarMesEspecifico}
                data-testid="periodo-popup-usar-mes"
              >
                Usar este mês
              </button>
            </div>

            <button
              type="button"
              className="secundario"
              style={{ marginTop: 12 }}
              onClick={() => setPopupAberto(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
