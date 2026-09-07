import { useState } from 'react'
import { hojeEfetivoISO, useHojeSimuladoISO } from '../hojeSimulado'
import { salvarConfiguracaoIcones } from '../configuracaoIcones'
import { avancarSeriesFixasPendentes } from '../recorrencia'
import { formatarCabecalhoData } from '../formatoData'

// Ferramenta de teste "Simular data de hoje" (05/09/2026, Roteiro de
// Parametrização Morfo, Etapa 7). Pedido explícito do Rafael: "garantir que
// os processamentos de status vs data atual siga esse calendário — a cada
// mudança de data, deve reprocessar pagamentos e parcelas, recorrentes".
//
// Adaptado do botão flutuante 🕐 do Kit — mas com uma diferença de propósito
// importante: o Kit tinha um tenant "de teste" separado do real (barreira
// teste↔real, ver `TrocarPlanoSheet` no Kit), então simular data lá nunca
// tocava dado de cliente de verdade. O MFinp NÃO tem esse ambiente separado
// — é o mesmo banco de dados, os lançamentos reais do Rafael, sempre. Por
// isso esta ferramenta:
// (a) NUNCA edita/apaga lançamento existente — só pode ADICIONAR ocorrência
//     de série fixa que já deveria ter acontecido até a data simulada (ver
//     `avancarSeriesFixasPendentes` em `recorrencia.ts` — mesma função de
//     sempre, só lendo a data simulada em vez da real quando ativa);
// (b) só abre por dentro de Manutenção (nunca um botão flutuante sempre
//     visível como no Kit — mesmo padrão de acesso temporário de Etapa 4/5/6);
// (c) enquanto ativa, um AVISO PERMANENTE (`BannerDataSimulada` abaixo)
//     fica fixo no topo do app inteiro — impossível de não notar, com um
//     botão de 1 toque pra voltar ao normal — pra nunca confundir "atrasado
//     porque a data está simulada" com "atrasado de verdade".
async function aplicarNovaDataSimulada(iso: string | undefined): Promise<number> {
  await salvarConfiguracaoIcones({ hojeSimuladoISO: iso })
  // Passa a data efetiva já conhecida direto (nunca lida de volta via
  // `hojeEfetivoISO()`) — o cache de `hojeSimulado.ts` sincroniza via
  // `liveQuery`, que propaga o valor novo de forma assíncrona (depois deste
  // `await` já ter resolvido). Sem isso, o reprocessamento rodava contra a
  // data ANTIGA ainda em cache — bug real encontrado na verificação da
  // Etapa 7 (ver comentário em `avancarSeriesFixasPendentes`).
  const hojeISOEfetivo = iso ?? new Date().toISOString().slice(0, 10)
  return avancarSeriesFixasPendentes(hojeISOEfetivo)
}

// Renderizado no nível mais alto de `App.tsx` (mesmo padrão do `GuidedTour`),
// como IRMÃO de `<main>` e ANTES dele — visível em QUALQUER tela enquanto a
// simulação estiver ativa, nunca só dentro da tela de Manutenção/Ferramentas
// de teste.
//
// Bug real encontrado e corrigido na verificação da Etapa 7: a 1ª versão
// usava `position: fixed; top: 0` pra "garantir" que ficasse por cima de
// tudo — só que `.cabecalho-fixo` de CADA tela também é `position: sticky;
// top: 0` dentro de `<main>` (único contêiner com rolagem do app, ver
// `index.css`), então o banner fixo cobria fisicamente o topo de toda tela,
// inclusive o botão "‹ Voltar" e a engrenagem — cliques ali paravam de
// funcionar enquanto a simulação estava ativa (confirmado via
// `elementFromPoint`: o elemento no centro do botão "‹ Voltar" era o próprio
// banner, não o botão). Corrigido tirando o `position: fixed`: como `#root`
// (`index.css`) é `display: flex; flex-direction: column` e este banner é
// renderizado como irmão ANTES de `<main>` (`flex: 1`), basta ele ser um
// bloco normal do fluxo — o navegador já empurra `<main>` pra baixo sozinho,
// sem nenhum cálculo manual de altura/padding, e nada fica coberto porque
// não há mais sobreposição nenhuma. Continua permanentemente visível em
// qualquer tela (nunca rola pra fora) porque `<main>` é o único elemento com
// `overflow-y: auto` do app — este banner fica FORA dele.
export function BannerDataSimulada() {
  const simulada = useHojeSimuladoISO()
  const [processando, setProcessando] = useState(false)
  if (!simulada) return null

  async function voltarAoNormal() {
    setProcessando(true)
    await aplicarNovaDataSimulada(undefined)
    setProcessando(false)
  }

  return (
    <div
      style={{
        background: 'var(--amarelo, #f59e0b)',
        color: '#1a1400',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        fontSize: 12.5,
        fontWeight: 700,
        flexWrap: 'wrap',
        textAlign: 'center',
      }}
    >
      <span>🕐 Testando com data simulada: {formatarCabecalhoData(simulada)}</span>
      <button
        type="button"
        onClick={voltarAoNormal}
        disabled={processando}
        style={{
          marginTop: 0,
          background: '#1a1400',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '4px 10px',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          opacity: processando ? 0.6 : 1,
        }}
      >
        {processando ? 'Voltando…' : 'Voltar ao normal'}
      </button>
    </div>
  )
}

export default function SimularData({ aoVoltar }: { aoVoltar: () => void }) {
  const simulada = useHojeSimuladoISO()
  const [rascunho, setRascunho] = useState(simulada ?? hojeEfetivoISO())
  const [processando, setProcessando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)

  function mensagemReprocessamento(gerados: number): string {
    return gerados > 0
      ? `Reprocessado: ${gerados} lançamento(s) de série fixa gerado(s) até essa data. Nenhum lançamento existente foi alterado ou apagado.`
      : 'Reprocessado: nenhum lançamento novo pra gerar até essa data. Nenhum lançamento existente foi alterado ou apagado.'
  }

  async function aplicar() {
    setProcessando(true)
    const gerados = await aplicarNovaDataSimulada(rascunho)
    setResultado(mensagemReprocessamento(gerados))
    setProcessando(false)
  }

  async function voltarAoNormal() {
    setProcessando(true)
    const hojeReal = new Date().toISOString().slice(0, 10)
    setRascunho(hojeReal)
    const gerados = await aplicarNovaDataSimulada(undefined)
    setResultado(mensagemReprocessamento(gerados))
    setProcessando(false)
  }

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Ferramentas de teste</h1>
      </div>

      <p className="texto-fraco">
        Simula "hoje" pro app inteiro — afeta status (Atrasado/A pagar/A receber), a projeção de
        Resumo/Situação/Planejamento e faz séries fixas avançarem como se o tempo tivesse passado.{' '}
        <strong>Nunca edita nem apaga nenhum lançamento existente</strong> — só pode adicionar
        ocorrência de série fixa que já deveria ter acontecido até a data escolhida.
      </p>

      <h2 style={{ marginTop: 0 }}>Data de hoje</h2>
      <div className="cartao">
        <label>Simular esta data</label>
        <input
          type="date"
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={{ flex: 1, marginTop: 0 }} onClick={aplicar} disabled={processando}>
            {processando ? 'Aplicando…' : 'Aplicar e reprocessar'}
          </button>
          {simulada && (
            <button
              type="button"
              style={{
                flex: 1,
                marginTop: 0,
                background: 'none',
                border: '1px solid var(--borda)',
                borderRadius: 10,
                padding: '12px',
                cursor: 'pointer',
              }}
              onClick={voltarAoNormal}
              disabled={processando}
            >
              Voltar pra hoje real
            </button>
          )}
        </div>
        {resultado && (
          <p style={{ marginTop: 12 }} className="texto-fraco">
            {resultado}
          </p>
        )}
      </div>

      <p className="texto-fraco">
        Mobile × Web (feature do Kit original): não se aplica ao MorfoFinP — o app usa sempre coluna
        única de 480px, decisão já tomada antes desta Etapa 7.
      </p>
    </>
  )
}
