/* Seleção múltipla + totalizadores das listas de registro COMPLETO
   (10/09/2026, pedido do Rafael, ao pé da letra):

     "Listas de registros completos: botão para ativar seleção, marcar todos,
      desmarcar todos; no rodapé, totalizador de Entrada, Saída e Total
      atualizado conforme seleção. Sem seleção, por padrão essas listas devem
      separar registros até Hoje dos dias futuros, cada bloco mostrando o
      mesmo totalizador. Telas: Lançamentos e Carteira."

   Este arquivo tem as três peças que as duas telas compartilham — não há
   cópia de lógica entre elas:

   1. `useSelecao(ids)`      — o estado de seleção (ativar/marcar/desmarcar),
                               já podando ids que sumiram da lista (trocou de
                               mês, mudou o filtro): sem isso o totalizador
                               contaria registro que não está mais na tela.
   2. `BarraSelecao`         — a linha de botões "Selecionar / Marcar todos /
                               Desmarcar todos / Sair da seleção".
   3. `TotaisEntradaSaida`   — a faixa "Entrada · Saída · Total". A MESMA peça
                               serve os dois casos do pedido: o rodapé da
                               seleção e o rodapé de cada bloco (até hoje ×
                               dias futuros), porque é literalmente o mesmo
                               totalizador.
   4. `separarPorHoje`       — parte a lista em "até hoje" e "dias futuros"
                               usando o `hojeEfetivoISO()` do produto (então a
                               ferramenta de simular data move o corte junto).

   Convenção de sinal, a mesma do resto do app: valor > 0 é Entrada, valor < 0
   é Saída, e Total é a soma com sinal (Entrada − Saída). */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Lancamento } from '../db'
import { fmtBRL } from '../formatoMoeda'
import { hojeEfetivoISO } from '../hojeSimulado'

export interface Totais { entrada: number; saida: number; total: number }

export function somarTotais(itens: { valor: number }[]): Totais {
  let entrada = 0
  let saida = 0
  for (const l of itens) {
    if (l.valor >= 0) entrada += l.valor
    else saida += -l.valor
  }
  return { entrada, saida, total: entrada - saida }
}

/* Corte por data de COMPETÊNCIA — a mesma data que agrupa as sessões da tela
   de Lançamentos; usar a data de caixa aqui faria o corte discordar do
   cabeçalho de cada sessão logo acima. "Até hoje" inclui hoje. */
export function separarPorHoje<T extends { dataCompetencia: string }>(itens: T[]) {
  const hoje = hojeEfetivoISO()
  const ateHoje: T[] = []
  const futuros: T[] = []
  for (const l of itens) (l.dataCompetencia <= hoje ? ateHoje : futuros).push(l)
  return { ateHoje, futuros, hoje }
}

export function useSelecao(idsVisiveis: number[]) {
  const [ativa, setAtiva] = useState(false)
  const [marcados, setMarcados] = useState<Set<number>>(new Set())

  // Poda: um id que saiu da lista (mês/filtro mudou) não pode continuar
  // pesando no totalizador — o número na tela ficaria sem explicação.
  const visiveis = useMemo(() => new Set(idsVisiveis), [idsVisiveis])
  const efetivos = useMemo(() => [...marcados].filter((id) => visiveis.has(id)), [marcados, visiveis])

  return {
    ativa,
    marcados: new Set(efetivos),
    qtd: efetivos.length,
    estaMarcado: (id: number) => marcados.has(id) && visiveis.has(id),
    alternar: (id: number) =>
      setMarcados((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n }),
    marcarTodos: () => setMarcados(new Set(idsVisiveis)),
    desmarcarTodos: () => setMarcados(new Set()),
    ativar: () => setAtiva(true),
    sair: () => { setAtiva(false); setMarcados(new Set()) },
  }
}

export type Selecao = ReturnType<typeof useSelecao>

export function BarraSelecao({ selecao, total }: { selecao: Selecao; total: number }) {
  if (!selecao.ativa) {
    return (
      <button type="button" className="botao-ordem" onClick={selecao.ativar} data-testid="ativar-selecao">
        Selecionar
      </button>
    )
  }
  return (
    <div className="barra-selecao">
      <span className="texto-fraco">{selecao.qtd} de {total} selecionado(s)</span>
      <div className="barra-selecao-acoes">
        <button type="button" className="botao-ordem" onClick={selecao.marcarTodos}>Marcar todos</button>
        <button type="button" className="botao-ordem" onClick={selecao.desmarcarTodos}>Desmarcar todos</button>
        <button type="button" className="botao-ordem" onClick={selecao.sair}>Sair</button>
      </div>
    </div>
  )
}

export function TotaisEntradaSaida({ itens, rotulo, destaque, recolhivel }: {
  itens: { valor: number }[]
  rotulo?: string
  destaque?: boolean
  /* Faixa que nasce RECOLHIDA, mostrando só o Total (10/09/2026, pedido do
     Rafael: "estreite mais o rodapé com os números totais, permitir recolher,
     trazer por padrão recolhido e com total"). Recolhida ela é uma linha só;
     um toque abre Entrada · Saída · Total. Usado no rodapé fixo das listas —
     os totalizadores DENTRO da lista (até hoje × dias futuros) continuam
     sempre abertos, que é onde eles servem de fechamento de bloco. */
  recolhivel?: boolean
}) {
  const t = somarTotais(itens)
  const [aberta, setAberta] = useState(false)

  /* `fmtBRL` formata o número sem sinal (é o formato usado no app inteiro),
     então o "−" do saldo negativo entra aqui — senão o Total de um mês no
     vermelho apareceria idêntico a um mês no azul. */
  const valorTotal = (
    <strong className={t.total < 0 ? 'valor-neg' : 'valor-pos'}>
      {t.total < 0 ? '-' : ''}{fmtBRL(Math.abs(t.total))}
    </strong>
  )

  if (recolhivel && !aberta) {
    return (
      <button
        type="button"
        className={`totais-faixa totais-faixa-recolhida ${destaque ? 'totais-faixa-destaque' : ''}`}
        onClick={() => setAberta(true)}
        aria-expanded={false}
        title="Ver Entrada e Saída"
      >
        <span className="totais-faixa-rotulo-inline">{rotulo ?? 'Total'}</span>
        {valorTotal}
        <span className="totais-faixa-seta" aria-hidden>⌃</span>
      </button>
    )
  }

  return (
    <div className={`totais-faixa ${destaque ? 'totais-faixa-destaque' : ''}`}>
      {(rotulo || recolhivel) && (
        <span className="totais-faixa-topo">
          {rotulo && <span className="totais-faixa-rotulo">{rotulo}</span>}
          {recolhivel && (
            <button type="button" className="totais-faixa-seta-botao" onClick={() => setAberta(false)} aria-expanded title="Recolher">
              ⌄
            </button>
          )}
        </span>
      )}
      <span className="totais-faixa-item">
        <span className="totais-faixa-chave">Entrada</span>
        <strong className="valor-pos">{fmtBRL(t.entrada)}</strong>
      </span>
      <span className="totais-faixa-item">
        <span className="totais-faixa-chave">Saída</span>
        <strong className="valor-neg">{fmtBRL(t.saida)}</strong>
      </span>
      <span className="totais-faixa-item">
        <span className="totais-faixa-chave">Total</span>
        {valorTotal}
      </span>
    </div>
  )
}

/* Faixa de totais colada ACIMA da barra de abas (10/09/2026, correção do
   Rafael: "o total foi fixado acima do botão de inclusão, que deveria ser
   flutuante; deveria ser fixado logo acima dos botões de menu, e o de
   inclusão continuar sendo flutuante").

   Ela publica a própria altura visível em `--totais-altura` (medida de
   verdade, com `ResizeObserver` — o mesmo mecanismo que `RodapeAbas` já usa
   pra `--rodape-altura`), e o `.botao-flutuante` soma as duas variáveis pra
   flutuar ACIMA dela em vez de disputar o mesmo espaço. Sem medir, qualquer
   número fixo aqui quebra assim que o rótulo quebra em duas linhas. */
export function RodapeTotais({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    /* A faixa termina exatamente na borda de cima da barra de abas (ver
       `.rodape-totais-fixo` no index.css), então a altura visível dela é a
       altura inteira do elemento. */
    const publicar = () => {
      document.documentElement.style.setProperty('--totais-altura', `${el.offsetHeight}px`)
    }
    publicar()
    const ro = new ResizeObserver(publicar)
    ro.observe(el)
    return () => {
      ro.disconnect()
      document.documentElement.style.removeProperty('--totais-altura')
    }
  }, [])
  return <div className="rodape-totais-fixo" ref={ref}>{children}</div>
}

/* Caixinha de marcação de uma linha — só aparece com a seleção ativa. Fica
   fora da linha do lançamento (que já tem clique próprio pra abrir o detalhe)
   pra que marcar NUNCA abra o detalhe por engano. */
export function MarcadorLinha({ marcado, onAlternar }: { marcado: boolean; onAlternar: () => void }) {
  return (
    <label className="marcador-linha" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={marcado} onChange={onAlternar} />
    </label>
  )
}

export type { Lancamento }
