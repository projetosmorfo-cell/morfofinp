/* Saldo do cofrinho: SALDO, não movimento (13/09/2026, versão Ideal).
 *
 * Conta corrente precisa de cada movimento — cada um consome orçamento.
 * Cofrinho precisa do SALDO: o que está lá dentro já foi orçado na entrada, e
 * rendimento não é receita a orçar.
 *
 * O modelo:
 *   1. lança o aporte (conta → cofrinho);
 *   2. NUNCA lança rendimento;
 *   3. de vez em quando, informa o saldo real do cofrinho;
 *   4. o card mostra o INFORMADO como número principal, e uma linha dizendo
 *      quando foi e a diferença para o calculado (rendimentos + gastos não
 *      lançados, juntos — o app não separa e não precisa).
 *
 * PROTEÇÃO: se faz muito tempo desde o último informe, a data fica em âmbar
 * ("informado há 3 meses") — para ninguém confiar em número velho sem
 * perceber.
 *
 * A tabela `saldosInformados` existe no banco desde a primeira versão e NUNCA
 * teve tela. É ela que este componente finalmente usa.
 */
import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { lerDoAmbiente, marcaDoAmbiente } from '../ambiente'
import { hojeEfetivoISO } from '../hojeSimulado'
import { fmtBRL, aplicarMascaraValor, paraNumero, formatarMoeda } from '../formatoMoeda'

/** Depois de quantos dias o informe é considerado velho (fica em âmbar). */
const DIAS_PARA_ENVELHECER = 45

/** Id virtual do cofrinho por natureza — ele não é uma `Conta` de verdade. */
export const COFRINHO_VIRTUAL_ID = -1

function diasEntre(aISO: string, bISO: string): number {
  const a = new Date(aISO + 'T12:00:00Z').getTime()
  const b = new Date(bISO + 'T12:00:00Z').getTime()
  return Math.round((b - a) / 86400000)
}

function emPortugues(dias: number): string {
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.round(dias / 30)
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`
}

export interface InformeSaldo {
  /** O valor que a pessoa informou. */
  valor: number
  /** Data do informe, `AAAA-MM-DD`. */
  data: string
  /** Quantos dias desde o informe. */
  dias: number
  /** true quando está velho o suficiente para o aviso âmbar. */
  velho: boolean
}

/** Último saldo informado de uma conta (ou do cofrinho virtual). */
export function useUltimoInforme(contaId: number): InformeSaldo | null {
  const registros = useLiveQuery(() => lerDoAmbiente(db.saldosInformados.toArray()), [])
  if (!registros) return null
  const daConta = registros
    .filter((r) => r.contaId === contaId)
    .sort((a, b) => b.dataReferencia.localeCompare(a.dataReferencia))
  const ultimo = daConta[0]
  if (!ultimo) return null
  // dataReferencia é `AAAAMMDD` desde esta tela; registros antigos podem ser
  // `AAAAMM` — normaliza para uma data completa antes de comparar.
  const bruto = ultimo.dataReferencia
  const data =
    bruto.length >= 8
      ? `${bruto.slice(0, 4)}-${bruto.slice(4, 6)}-${bruto.slice(6, 8)}`
      : `${bruto.slice(0, 4)}-${bruto.slice(4, 6)}-01`
  const dias = diasEntre(data, hojeEfetivoISO())
  return { valor: ultimo.saldoInformado, data, dias, velho: dias >= DIAS_PARA_ENVELHECER }
}

export async function informarSaldo(contaId: number, valor: number) {
  const hoje = hojeEfetivoISO()
  await db.saldosInformados.add({
    contaId,
    dataReferencia: hoje.replace(/-/g, ''),
    saldoInformado: valor,
    ...marcaDoAmbiente(),
  })
}

/**
 * A LINHA DE INFORME + o botão "informar o saldo real", sem cabeçalho nenhum.
 *
 * Extraída do corpo de `SaldoDoCofrinho` na build 086, quando o Rafael pediu
 * que **toda conta de tipo cofrinho** ganhasse esse botão — não só o card
 * virtual. Antes o componente inteiro (cabeçalho "Cofrinho" + valor + linha +
 * botão) era indivisível, e um card de conta real já desenha o próprio
 * cabeçalho, com o selo da instituição e o nome dela.
 *
 * É componente de verdade (não um trecho de JSX devolvido por função) porque
 * chama `useUltimoInforme` — assim ele pode ser renderizado dentro de um
 * `.map()` de contas sem virar hook condicional.
 *
 * O COMPORTAMENTO É O MESMO de sempre: grava em `saldosInformados` pelo
 * `contaId` recebido, e o histórico de cada conta é independente.
 */
export function LinhaInformeSaldo({
  contaId,
  calculado,
}: {
  contaId: number
  calculado: number
}) {
  const informe = useUltimoInforme(contaId)
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')

  const abrir = (e: React.MouseEvent) => {
    e.stopPropagation()
    setTexto(formatarMoeda(informe?.valor ?? calculado))
    setAberto(true)
  }

  const salvar = async () => {
    const v = paraNumero(texto)
    if (v == null || Number.isNaN(v)) return
    await informarSaldo(contaId, v)
    setAberto(false)
  }

  const diferenca = informe ? informe.valor - calculado : 0

  return (
    <>
      {informe && (
        <span
          className={`ideal-t4 ${informe.velho ? 'informe-velho' : 'texto-fraco'}`}
          data-testid="linha-informe"
        >
          informado {emPortugues(informe.dias)}
          {Math.abs(diferenca) >= 0.005 && (
            <>
              {' · '}
              {diferenca > 0 ? '+' : '−'}
              {fmtBRL(Math.abs(diferenca))} desde os lançamentos
            </>
          )}
        </span>
      )}

      <span
        role="button"
        tabIndex={0}
        className="botao-informar-saldo"
        onClick={abrir}
        onKeyDown={(e) => {
          if (e.key === 'Enter') abrir(e as unknown as React.MouseEvent)
        }}
        data-testid="abrir-informar-saldo"
      >
        {informe ? '✎ Atualizar o saldo real' : '✎ Informar o saldo real no cofrinho'}
      </span>

      {aberto && (
        <div
          className="modal-fundo"
          onClick={(e) => {
            e.stopPropagation()
            setAberto(false)
          }}
        >
          <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
            <h2 className="ideal-t2" style={{ marginTop: 0 }}>Saldo real do cofrinho</h2>
            <p className="ideal-t4 texto-quebra" style={{ marginTop: 0 }}>
              Abra o app do banco e copie o saldo de hoje. Rendimento não precisa ser lançado — é
              esta conferência que o traz para o app.
            </p>
            <label className="rotulo-campo" htmlFor="campo-saldo-cofrinho">Saldo hoje</label>
            <input
              id="campo-saldo-cofrinho"
              inputMode="numeric"
              value={texto}
              onChange={(e) => setTexto(aplicarMascaraValor(e.target.value))}
              data-testid="campo-saldo-cofrinho"
            />
            <p className="ideal-t4" style={{ color: 'var(--texto-fraco)' }}>
              Pelos lançamentos, seria {fmtBRL(calculado)}.
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" className="primario" onClick={salvar} data-testid="salvar-saldo-cofrinho">
                Salvar
              </button>
              <button type="button" onClick={() => setAberto(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * O que o card do cofrinho VIRTUAL mostra: o informado como número principal,
 * e a linha de contexto embaixo. Quando nunca houve informe, mostra o
 * calculado e convida a informar.
 *
 * Conta de cofrinho REAL não usa este componente — ela já tem cabeçalho
 * próprio (selo + nome + valor) e só acrescenta `LinhaInformeSaldo`.
 */
export default function SaldoDoCofrinho({
  contaId = COFRINHO_VIRTUAL_ID,
  calculado,
  nome = 'Cofrinho',
  selo,
}: {
  contaId?: number
  calculado: number
  /* Nome e selo vêm da CONTA do cofrinho padrão desde a build 087 — o card
     virtual passou a ter um registro no cadastro, e é ele que dá manutenção de
     nome e ícone a este card (ver `src/contasCofrinho.ts`). Os padrões mantêm
     o desenho antigo para quem ainda não rodou a migração. */
  nome?: string
  selo?: ReactNode
}) {
  const informe = useUltimoInforme(contaId)
  const mostrado = informe ? informe.valor : calculado

  return (
    <>
      <div className="linha-destaque" style={{ marginTop: 0 }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {selo}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{nome}</span>
        </strong>
        {/* O sinal importa: com a regra corrigida do cofrinho, o saldo
            calculado pode ser NEGATIVO (saiu mais do que entrou). Mostrar
            tudo em verde e sem sinal escondia exatamente esse caso. */}
        <strong
          className={mostrado < 0 ? 'valor-neg' : 'valor-pos'}
          data-testid="saldo-cofrinho"
        >
          {mostrado < 0 ? '−' : ''}{fmtBRL(Math.abs(mostrado))}
        </strong>
      </div>

      {!informe && <span className="texto-fraco">Total acumulado pelos lançamentos</span>}

      {/* A linha de informe e o botão vivem em `LinhaInformeSaldo` desde a
          build 086 — a mesma peça que toda conta de cofrinho REAL usa. */}
      <LinhaInformeSaldo contaId={contaId} calculado={calculado} />
    </>
  )
}
