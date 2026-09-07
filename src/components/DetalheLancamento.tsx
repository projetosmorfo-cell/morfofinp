import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Periodicidade, type RegraRecorrencia, type Lancamento } from '../db'
import { gerarIdSerie, gerarParcelas, ROTULOS_PERIODICIDADE, NOMES_DIA_SEMANA } from '../recorrencia'
import { fmtBRL, formatarMoeda, aplicarMascaraValor, paraNumero } from '../formatoMoeda'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

type TipoRegraUI = 'diaFixo' | 'diaUtil' | 'diaSemana'
type TipoLancamento = 'saida' | 'entrada' | 'transferencia'

const ABAS: { valor: TipoLancamento; rotulo: string }[] = [
  { valor: 'saida', rotulo: 'Saída' },
  { valor: 'entrada', rotulo: 'Entrada' },
  { valor: 'transferencia', rotulo: 'Transferência' },
]

// Formulário de lançamento — usado tanto pra criar (alvo undefined) quanto
// pra editar (alvo = o lançamento existente). É o mesmo componente que abre
// como modal a partir de uma categoria expandida (Resumo/Situação) ou da
// tela Lançamentos: fechar sempre devolve o controle pra quem abriu, sem
// nenhuma navegação de tela — por isso a tela de origem nunca perde estado
// (mês selecionado, categoria expandida etc.).
//
// 31/08/2026, rodada seguinte — duas mudanças estruturais (pontos 3 e 12 do
// feedback): (1) a seleção de tipo virou aba no topo em vez de <select>, com
// só os campos daquela aba renderizados (formulário mais enxuto); (2) a
// transferência ganhou categoria de saída e categoria de entrada
// INDEPENDENTES (podem ser iguais ou diferentes) — antes as duas pernas
// usavam sempre a mesma categoria de sistema "Transferência entre contas"
// automaticamente; agora esse é só mais um item na lista de categorias
// normais, e o Rafael escolhe livremente pra cada lado, exatamente como
// escolheria a categoria de um lançamento comum.
export default function DetalheLancamento({
  alvoId,
  categoriaIdSugerida,
  contaIdSugerida,
  aoMudarMes,
  onFechar,
}: {
  alvoId?: number
  categoriaIdSugerida?: number
  contaIdSugerida?: number
  // 01/09/2026, rodada seguinte — bug real encontrado (não era exclusivo de
  // Transferência, como o Rafael relatou, e sim de QUALQUER lançamento):
  // o formulário sempre sugere a data de hoje, mas a tela "de mês" que abriu
  // o modal pode estar mostrando um mês diferente (ex.: o app abre em
  // agosto/2026 por padrão, ver `mesInicial()` em mes.ts, já que hoje
  // (setembro) ainda não tem dado semeado) — o lançamento SALVA normalmente,
  // só que fica invisível na tela, porque ninguém navega o seletor de mês
  // pra onde o registro novo realmente caiu. Passando `aoMudarMes` (o mesmo
  // setter de mês compartilhado em App.tsx), toda vez que salvar com sucesso
  // a gente pula o seletor de mês pra bater com a data gravada — assim o
  // lançamento aparece na hora, sem precisar a pessoa perceber sozinha que
  // precisa navegar manualmente.
  aoMudarMes?: (mes: string) => void
  onFechar: () => void
}) {
  const categorias = useLiveQuery(() => db.categorias.orderBy('nome').toArray(), [])
  const contas = useLiveQuery(() => db.contas.toArray(), [])
  const original = useLiveQuery(() => (alvoId != null ? db.lancamentos.get(alvoId) : undefined), [alvoId])
  // Par da transferência (a outra perna) — só buscado quando o lançamento
  // aberto já é metade de uma transferência (ver `transferenciaId` em
  // db.ts). Precisa dos dois lados carregados antes de preencher o
  // formulário, senão mostraria só metade da operação por um instante.
  const parTransferencia = useLiveQuery<Lancamento[] | undefined>(
    () =>
      original?.transferenciaId
        ? db.lancamentos.where('transferenciaId').equals(original.transferenciaId).toArray()
        : undefined,
    [original?.transferenciaId],
  )

  const editando = alvoId != null
  const ehTransferenciaExistente = !!original?.transferenciaId
  const [carregado, setCarregado] = useState(false)

  const [data, setData] = useState(hoje())
  const [descricao, setDescricao] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>(categoriaIdSugerida ?? '')
  const [contaId, setContaId] = useState<number | ''>(contaIdSugerida ?? '')
  const [valor, setValor] = useState('')
  const [tipo, setTipo] = useState<TipoLancamento>('saida')
  // Só usados quando tipo === 'transferencia' — a transferência sempre
  // envolve duas contas (origem/destino) e agora também duas categorias
  // independentes (podem ser iguais ou diferentes, ponto 3 do feedback).
  const [contaOrigemId, setContaOrigemId] = useState<number | ''>('')
  const [contaDestinoId, setContaDestinoId] = useState<number | ''>('')
  const [categoriaOrigemId, setCategoriaOrigemId] = useState<number | ''>('')
  const [categoriaDestinoId, setCategoriaDestinoId] = useState<number | ''>('')
  const [pago, setPago] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  // F-10b da revisão de UI (04/09/2026): a mensagem de erro já nomeia o
  // campo em texto, mas não realçava a borda dele — este id identifica qual
  // input/select mostra a borda vermelha, além do texto (ver `erroCampo` nas
  // validações abaixo e `campoComErro()` no JSX).
  const [campoComErro, setCampoComErro] = useState<string | null>(null)
  const [recorrencia, setRecorrencia] = useState<'unico' | 'fixo' | 'parcelado'>('unico')
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal')
  const [tipoRegra, setTipoRegra] = useState<TipoRegraUI>('diaFixo')
  const [diaFixo, setDiaFixo] = useState('5')
  const [diaUtil, setDiaUtil] = useState('1')
  const [diaSemana, setDiaSemana] = useState('1')
  const [parcelaN, setParcelaN] = useState('2')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)

  // Preenche o formulário quando o lançamento a editar carrega (só uma vez).
  // Se for perna de transferência, espera o PAR carregar também antes de
  // preencher — senão mostraria só metade da operação (só a conta/categoria
  // de origem ou só a de destino) por um instante.
  if (editando && original && !carregado && (!ehTransferenciaExistente || parTransferencia)) {
    setData(original.dataCompetencia)
    setDescricao(original.descricao)
    setValor(formatarMoeda(original.valor))
    setPago(original.pago !== false)
    if (ehTransferenciaExistente && parTransferencia) {
      const legOrigem = parTransferencia.find((l) => l.valor < 0) ?? original
      const legDestino = parTransferencia.find((l) => l.valor > 0) ?? original
      setTipo('transferencia')
      setContaOrigemId(legOrigem.contaId)
      setContaDestinoId(legDestino.contaId)
      setCategoriaOrigemId(legOrigem.categoriaId)
      setCategoriaDestinoId(legDestino.categoriaId)
    } else {
      setCategoriaId(original.categoriaId)
      setContaId(original.contaId)
      setTipo(original.valor < 0 ? 'saida' : 'entrada')
    }
    setCarregado(true)
  }

  // Ao entrar na aba Transferência criando um lançamento novo, sugere a
  // conta/categoria já escolhida (se houver) como ponto de partida — só
  // roda uma vez por campo (guarda vazio), nunca sobrescreve escolha do
  // Rafael depois.
  if (!editando && tipo === 'transferencia' && contaOrigemId === '' && contaId !== '') {
    setContaOrigemId(contaId)
  }

  if (editando && original === undefined) return null // ainda carregando
  if (editando && ehTransferenciaExistente && parTransferencia === undefined) return null // ainda carregando o par

  const categoriaAtual = original ? categorias?.find((c) => c.id === original.categoriaId) : undefined
  // Recorrência já definida (série existente) — mexer nisso na edição seria
  // arriscado (poderia confundir a geração automática das próximas
  // ocorrências), então fica travado, só editável na criação. Um lançamento
  // ÚNICO, porém, pode virar fixo/parcelado também na edição (pedido do
  // Rafael) — nesse caso o formulário mostra as mesmas opções da criação.
  const jaTemSerie = editando && !!original?.recorrencia
  const podeEscolherRecorrencia = !jaTemSerie && tipo !== 'transferencia'

  function trocarAba(novaAba: TipoLancamento) {
    if (novaAba === 'transferencia' && contaOrigemId === '') {
      setContaOrigemId(contaId || (contas?.[0]?.id ?? ''))
    }
    setTipo(novaAba)
  }

  // Helper de validação (F-10b) — sempre seta os dois juntos, pra mensagem
  // de texto e realce de borda nunca ficarem dessincronizados.
  function erroCampo(campo: string, mensagem: string) {
    setCampoComErro(campo)
    setErro(mensagem)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setCampoComErro(null)
    try {
      await salvarInterno()
    } catch (err) {
      // 01/09/2026, 2ª rodada: Rafael reportou que o "Salvar" da Transferência
      // continuava "sem ação" mesmo depois da 1ª correção (que só cobria os
      // `return`s de validação). Causa provável adicional: o campo Data ainda
      // tinha `required` nativo (removido acima) — e, de forma mais geral,
      // QUALQUER exceção lançada dentro de `salvarInterno` (ex.: erro do
      // Dexie) antes não tinha nenhum tratamento, então a Promise rejeitava
      // em silêncio e a UI simplesmente não fazia nada visível, exatamente a
      // mesma sensação de "botão sem ação". Esse `catch` garante que TODO
      // caminho de falha agora mostra uma mensagem, mesmo uma imprevista.
      console.error('Erro ao salvar lançamento:', err)
      setErro('Não deu pra salvar: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Sempre que salvar com sucesso, pula o seletor de mês compartilhado
  // (App.tsx) pra bater com a data do lançamento gravado — ver comentário
  // na prop `aoMudarMes` acima pro porquê disso ser necessário. Sem isso, um
  // lançamento salvo com data fora do mês atualmente visto na tela some da
  // lista na hora, dando a impressão de que "não salvou".
  function fecharAposSalvar() {
    aoMudarMes?.(data.slice(0, 7))
    onFechar()
  }

  async function salvarInterno() {
    if (!data) {
      erroCampo('data', 'Escolha uma data.')
      return
    }

    // --- Transferência entre contas: sempre 2 lançamentos juntos, nunca 1 só ---
    // 01/09/2026: antes esses `return`s eram silenciosos — combinado com o
    // `required` nativo do HTML em vários campos (que cancela o evento de
    // submit ANTES desta função rodar, sem sempre mostrar um aviso visível
    // dentro do modal), o botão "Salvar" podia parecer "sem ação nenhuma"
    // quando faltava preencher algo (bug real reportado pelo Rafael — ele
    // tinha preenchido só a conta de origem, que já vem pré-selecionada ao
    // abrir a aba, e não percebeu que faltava conta de destino/categorias).
    // Removido `required` dos campos abaixo (ver JSX) e centralizada toda
    // validação aqui, sempre com uma mensagem visível (`erro`) — clicar em
    // Salvar agora SEMPRE faz algo: ou salva, ou diz exatamente o que falta.
    if (tipo === 'transferencia') {
      if (!contaOrigemId) {
        erroCampo('contaOrigem', 'Escolha a conta de origem.')
        return
      }
      if (!contaDestinoId) {
        erroCampo('contaDestino', 'Escolha a conta de destino.')
        return
      }
      if (contaOrigemId === contaDestinoId) {
        erroCampo('contaDestino', 'Escolha duas contas diferentes pra origem e destino.')
        return
      }
      if (!categoriaOrigemId) {
        erroCampo('categoriaOrigem', 'Escolha a categoria de saída.')
        return
      }
      if (!categoriaDestinoId) {
        erroCampo('categoriaDestino', 'Escolha a categoria de entrada.')
        return
      }
      const numeroTransf = paraNumero(valor)
      if (!numeroTransf) {
        erroCampo('valor', 'Informe um valor válido.')
        return
      }
      const nomeOrigem = contas?.find((c) => c.id === contaOrigemId)?.nome ?? 'conta de origem'
      const nomeDestino = contas?.find((c) => c.id === contaDestinoId)?.nome ?? 'conta de destino'
      const descricaoTransf = descricao || `Transferência: ${nomeOrigem} → ${nomeDestino}`

      if (editando && ehTransferenciaExistente && parTransferencia) {
        const legOrigem = parTransferencia.find((l) => l.valor < 0)
        const legDestino = parTransferencia.find((l) => l.valor > 0)
        await db.transaction('rw', db.lancamentos, async () => {
          if (legOrigem?.id != null) {
            await db.lancamentos.update(legOrigem.id, {
              dataCompetencia: data,
              dataCaixa: data,
              descricao: descricaoTransf,
              valor: -numeroTransf,
              contaId: contaOrigemId,
              categoriaId: Number(categoriaOrigemId),
              pago,
            })
          }
          if (legDestino?.id != null) {
            await db.lancamentos.update(legDestino.id, {
              dataCompetencia: data,
              dataCaixa: data,
              descricao: descricaoTransf,
              valor: numeroTransf,
              contaId: contaDestinoId,
              categoriaId: Number(categoriaDestinoId),
              pago,
            })
          }
        })
        fecharAposSalvar()
        return
      }

      const transferenciaId = gerarIdSerie()
      await db.lancamentos.bulkAdd([
        {
          dataCompetencia: data,
          dataCaixa: data,
          descricao: descricaoTransf,
          valor: -numeroTransf,
          contaId: contaOrigemId,
          pagoPor: 'conta',
          categoriaId: Number(categoriaOrigemId),
          status: 'manual',
          pago,
          transferenciaId,
        },
        {
          dataCompetencia: data,
          dataCaixa: data,
          descricao: descricaoTransf,
          valor: numeroTransf,
          contaId: contaDestinoId,
          pagoPor: 'conta',
          categoriaId: Number(categoriaDestinoId),
          status: 'manual',
          pago,
          transferenciaId,
        },
      ])
      fecharAposSalvar()
      return
    }

    const contaEscolhidaId = contaId || contas?.[0]?.id
    if (!categoriaId) {
      erroCampo('categoria', 'Escolha uma categoria.')
      return
    }
    if (!contaEscolhidaId) {
      erroCampo('conta', 'Cadastre uma conta antes de lançar.')
      return
    }
    const numero = paraNumero(valor)
    if (!numero) {
      erroCampo('valor', 'Informe um valor válido.')
      return
    }
    const valorComSinal = tipo === 'saida' ? -numero : numero

    if (editando && alvoId != null) {
      if (jaTemSerie) {
        // Editar sempre atualiza só a ocorrência aberta (não a série
        // inteira) quando já pertence a uma série — simples e previsível.
        await db.lancamentos.update(alvoId, {
          dataCompetencia: data,
          dataCaixa: data,
          descricao: descricao || '(sem descrição)',
          valor: valorComSinal,
          categoriaId: Number(categoriaId),
          contaId: contaEscolhidaId,
          pago,
        })
        fecharAposSalvar()
        return
      }

      // Lançamento único sendo editado — pode virar fixo/parcelado agora.
      if (recorrencia === 'parcelado') {
        const n = Math.max(2, Math.round(Number(parcelaN)) || 2)
        const parcelas = gerarParcelas(data, numero, n)
        const serieId = gerarIdSerie()
        const [primeira, ...resto] = parcelas
        await db.lancamentos.update(alvoId, {
          dataCompetencia: primeira.data,
          dataCaixa: primeira.data,
          descricao: descricao || '(sem descrição)',
          valor: tipo === 'saida' ? -primeira.valor : primeira.valor,
          categoriaId: Number(categoriaId),
          contaId: contaEscolhidaId,
          pago,
          recorrencia: 'parcelado',
          serieId,
          parcelaI: primeira.parcelaI,
          parcelaN: n,
        })
        if (resto.length > 0) {
          await db.lancamentos.bulkAdd(
            resto.map((p) => ({
              dataCompetencia: p.data,
              dataCaixa: p.data,
              descricao: descricao || '(sem descrição)',
              valor: tipo === 'saida' ? -p.valor : p.valor,
              contaId: contaEscolhidaId,
              pagoPor: 'conta' as const,
              categoriaId: Number(categoriaId),
              status: 'manual' as const,
              recorrencia: 'parcelado' as const,
              serieId,
              parcelaI: p.parcelaI,
              parcelaN: n,
              pago: false,
            })),
          )
        }
        fecharAposSalvar()
        return
      }

      if (recorrencia === 'fixo') {
        const regra: RegraRecorrencia =
          tipoRegra === 'diaFixo'
            ? { tipo: 'diaFixo', dia: Math.min(31, Math.max(1, Number(diaFixo) || 1)) }
            : tipoRegra === 'diaUtil'
              ? { tipo: 'diaUtil', diaUtil: Math.min(23, Math.max(1, Number(diaUtil) || 1)) }
              : { tipo: 'diaSemana', diaSemana: Math.min(6, Math.max(0, Number(diaSemana))) }
        await db.lancamentos.update(alvoId, {
          dataCompetencia: data,
          dataCaixa: data,
          descricao: descricao || '(sem descrição)',
          valor: valorComSinal,
          categoriaId: Number(categoriaId),
          contaId: contaEscolhidaId,
          pago,
          recorrencia: 'fixo',
          serieId: gerarIdSerie(),
          periodicidade,
          regraRecorrencia: regra,
        })
        fecharAposSalvar()
        return
      }

      await db.lancamentos.update(alvoId, {
        dataCompetencia: data,
        dataCaixa: data,
        descricao: descricao || '(sem descrição)',
        valor: valorComSinal,
        categoriaId: Number(categoriaId),
        contaId: contaEscolhidaId,
        pago,
      })
      fecharAposSalvar()
      return
    }

    // --- Criação ---
    if (recorrencia === 'parcelado') {
      const n = Math.max(2, Math.round(Number(parcelaN)) || 2)
      const parcelas = gerarParcelas(data, numero, n)
      const serieId = gerarIdSerie()
      await db.lancamentos.bulkAdd(
        parcelas.map((p) => ({
          dataCompetencia: p.data,
          dataCaixa: p.data,
          descricao: descricao || '(sem descrição)',
          valor: tipo === 'saida' ? -p.valor : p.valor,
          contaId: contaEscolhidaId,
          pagoPor: 'conta' as const,
          categoriaId: Number(categoriaId),
          status: 'manual' as const,
          recorrencia: 'parcelado' as const,
          serieId,
          parcelaI: p.parcelaI,
          parcelaN: n,
          pago: p.parcelaI === 1 ? pago : false,
        })),
      )
      fecharAposSalvar()
      return
    }

    if (recorrencia === 'fixo') {
      const regra: RegraRecorrencia =
        tipoRegra === 'diaFixo'
          ? { tipo: 'diaFixo', dia: Math.min(31, Math.max(1, Number(diaFixo) || 1)) }
          : tipoRegra === 'diaUtil'
            ? { tipo: 'diaUtil', diaUtil: Math.min(23, Math.max(1, Number(diaUtil) || 1)) }
            : { tipo: 'diaSemana', diaSemana: Math.min(6, Math.max(0, Number(diaSemana))) }
      await db.lancamentos.add({
        dataCompetencia: data,
        dataCaixa: data,
        descricao: descricao || '(sem descrição)',
        valor: valorComSinal,
        contaId: contaEscolhidaId,
        pagoPor: 'conta',
        categoriaId: Number(categoriaId),
        status: 'manual',
        recorrencia: 'fixo',
        serieId: gerarIdSerie(),
        periodicidade,
        regraRecorrencia: regra,
        pago,
      })
      fecharAposSalvar()
      return
    }

    await db.lancamentos.add({
      dataCompetencia: data,
      dataCaixa: data,
      descricao: descricao || '(sem descrição)',
      valor: valorComSinal,
      contaId: contaEscolhidaId,
      pagoPor: 'conta',
      categoriaId: Number(categoriaId),
      status: 'manual',
      pago,
    })
    fecharAposSalvar()
  }

  async function excluir() {
    if (alvoId == null) return
    if (original?.transferenciaId) {
      // Nunca deixa a transferência "manca" — excluir um lado leva o outro junto.
      await db.lancamentos.where('transferenciaId').equals(original.transferenciaId).delete()
    } else {
      await db.lancamentos.delete(alvoId)
    }
    onFechar()
  }

  const numeroPreview = paraNumero(valor)
  const parcelasPreview =
    recorrencia === 'parcelado' && numeroPreview > 0
      ? gerarParcelas(data, numeroPreview, Math.max(2, Math.round(Number(parcelaN)) || 2))
      : []

  const usaDiaDoMes = periodicidade === 'mensal' || periodicidade === 'semestral'

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
        <div className="linha" style={{ border: 'none', padding: 0, marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{editando ? 'Editar lançamento' : 'Novo lançamento'}</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--texto-fraco)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {jaTemSerie && (
          <p className="texto-fraco" style={{ marginTop: 0 }}>
            {original!.recorrencia === 'parcelado'
              ? `Parcela ${original!.parcelaI}/${original!.parcelaN} — edita só esta parcela.`
              : `Lançamento fixo (${ROTULOS_PERIODICIDADE[original!.periodicidade!]}) — edita só esta ocorrência.`}
          </p>
        )}

        {ehTransferenciaExistente && (
          <p className="texto-fraco" style={{ marginTop: 0 }}>
            Metade de uma transferência entre contas — salvar ou excluir aqui afeta os dois lados juntos.
          </p>
        )}

        {/* Abas de tipo (31/08/2026, rodada seguinte, ponto 12) — substitui o
            <select> antigo; só os campos da aba ativa aparecem abaixo. */}
        <div
          role="tablist"
          style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 10, padding: 4, marginTop: 4 }}
        >
          {ABAS.map((aba) => (
            <button
              key={aba.valor}
              type="button"
              role="tab"
              aria-selected={tipo === aba.valor}
              disabled={jaTemSerie || (ehTransferenciaExistente && aba.valor !== 'transferencia')}
              onClick={() => trocarAba(aba.valor)}
              style={{
                flex: 1,
                padding: '9px 4px',
                borderRadius: 8,
                border: 'none',
                background: tipo === aba.valor ? 'var(--azul)' : 'none',
                color: tipo === aba.valor ? '#fff' : 'var(--texto-fraco)',
                fontWeight: tipo === aba.valor ? 600 : 400,
                cursor: jaTemSerie ? 'default' : 'pointer',
                opacity: jaTemSerie && tipo !== aba.valor ? 0.4 : 1,
              }}
            >
              {aba.rotulo}
            </button>
          ))}
        </div>

        {tipo === 'transferencia' && (
          <p className="texto-fraco" style={{ marginTop: 8 }}>
            Move dinheiro entre duas contas/carteiras suas — sempre gera as duas pontas juntas (saída de uma,
            entrada na outra), nunca conta como receita ou despesa real. Categoria de saída e de entrada são
            escolhidas separadamente (podem ser iguais ou diferentes).
          </p>
        )}

        <form onSubmit={salvar}>
          <label htmlFor="dl-data">Data</label>
          <input
            id="dl-data"
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className={campoComErro === 'data' ? 'campo-com-erro' : undefined}
          />

          <label htmlFor="dl-descricao">O que foi</label>
          <input
            id="dl-descricao"
            type="text"
            placeholder="Ex.: Mercado do mês"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />

          {tipo === 'transferencia' ? (
            <>
              <label htmlFor="dl-conta-origem">Conta de origem (de onde sai)</label>
              <select
                id="dl-conta-origem"
                value={contaOrigemId}
                onChange={(e) => setContaOrigemId(e.target.value ? Number(e.target.value) : '')}
                className={campoComErro === 'contaOrigem' ? 'campo-com-erro' : undefined}
              >
                <option value="">Escolha…</option>
                {(contas ?? [])
                  .filter((c) => c.ativa || c.id === contaOrigemId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.tipo === 'cartao' ? '(cartão)' : c.tipo === 'cofre' ? '(cofrinho)' : ''}
                    </option>
                  ))}
              </select>
              <label htmlFor="dl-categoria-origem">Categoria de saída</label>
              <select
                id="dl-categoria-origem"
                value={categoriaOrigemId}
                onChange={(e) => setCategoriaOrigemId(e.target.value ? Number(e.target.value) : '')}
                className={campoComErro === 'categoriaOrigem' ? 'campo-com-erro' : undefined}
              >
                <option value="">Escolha…</option>
                {(categorias ?? [])
                  .filter((c) => c.ativa || c.id === categoriaOrigemId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>

              <label htmlFor="dl-conta-destino" style={{ marginTop: 16 }}>Conta de destino (pra onde vai)</label>
              <select
                id="dl-conta-destino"
                value={contaDestinoId}
                onChange={(e) => setContaDestinoId(e.target.value ? Number(e.target.value) : '')}
                className={campoComErro === 'contaDestino' ? 'campo-com-erro' : undefined}
              >
                <option value="">Escolha…</option>
                {(contas ?? [])
                  .filter((c) => c.ativa || c.id === contaDestinoId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.tipo === 'cartao' ? '(cartão)' : c.tipo === 'cofre' ? '(cofrinho)' : ''}
                    </option>
                  ))}
              </select>
              <label htmlFor="dl-categoria-destino">Categoria de entrada</label>
              <select
                id="dl-categoria-destino"
                value={categoriaDestinoId}
                onChange={(e) => setCategoriaDestinoId(e.target.value ? Number(e.target.value) : '')}
                className={campoComErro === 'categoriaDestino' ? 'campo-com-erro' : undefined}
              >
                <option value="">Escolha…</option>
                {(categorias ?? [])
                  .filter((c) => c.ativa || c.id === categoriaDestinoId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>

              {contaOrigemId !== '' && contaOrigemId === contaDestinoId && (
                <p className="valor-neg" style={{ marginTop: 4, fontSize: 13 }}>
                  Escolha duas contas diferentes.
                </p>
              )}
            </>
          ) : (
            <>
              <label htmlFor="dl-categoria">Categoria</label>
              <select
                id="dl-categoria"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : '')}
                className={campoComErro === 'categoria' ? 'campo-com-erro' : undefined}
              >
                <option value="">Escolha…</option>
                {(categorias ?? [])
                  .filter((c) => c.ativa || c.id === categoriaAtual?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>

              <label htmlFor="dl-conta">Pago com</label>
              <select
                id="dl-conta"
                value={contaId || contas?.[0]?.id || ''}
                onChange={(e) => setContaId(e.target.value ? Number(e.target.value) : '')}
                className={campoComErro === 'conta' ? 'campo-com-erro' : undefined}
              >
                {(contas ?? [])
                  .filter((c) => c.ativa || c.id === original?.contaId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.tipo === 'cartao' ? '(cartão)' : c.tipo === 'cofre' ? '(cofrinho)' : ''}
                    </option>
                  ))}
              </select>
            </>
          )}

          <label htmlFor="dl-valor">Valor (R$)</label>
          <input
            id="dl-valor"
            type="text"
            inputMode="numeric"
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(aplicarMascaraValor(e.target.value))}
            className={campoComErro === 'valor' ? 'campo-com-erro' : undefined}
          />

          <label htmlFor="dl-pago" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <input id="dl-pago" type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} style={{ width: 'auto' }} />
            <span style={{ color: 'var(--texto)', fontSize: 14 }}>
              {tipo === 'saida' ? 'Já foi pago' : tipo === 'entrada' ? 'Já foi recebido' : 'Já foi concluída'}
            </span>
          </label>

          {podeEscolherRecorrencia && (
            <>
              <label htmlFor="dl-recorrencia">Recorrência</label>
              <select id="dl-recorrencia" value={recorrencia} onChange={(e) => setRecorrencia(e.target.value as typeof recorrencia)}>
                <option value="unico">Único (padrão)</option>
                <option value="fixo">Fixo — se repete automaticamente</option>
                <option value="parcelado">Parcelado — dividido em várias vezes</option>
              </select>

              {recorrencia === 'fixo' && (
                <div className="cartao" style={{ marginTop: 8, background: 'var(--bg)' }}>
                  <label htmlFor="dl-periodicidade">Periodicidade</label>
                  <select id="dl-periodicidade" value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as Periodicidade)}>
                    {(['semanal', 'quinzenal', 'mensal', 'semestral'] as Periodicidade[]).map((p) => (
                      <option key={p} value={p}>
                        {ROTULOS_PERIODICIDADE[p]}
                      </option>
                    ))}
                  </select>

                  {usaDiaDoMes ? (
                    <>
                      <label htmlFor="dl-tipo-regra">Regra do dia</label>
                      <select id="dl-tipo-regra" value={tipoRegra} onChange={(e) => setTipoRegra(e.target.value as TipoRegraUI)}>
                        <option value="diaFixo">Dia fixo do mês</option>
                        <option value="diaUtil">Dia útil do mês</option>
                      </select>
                      {tipoRegra === 'diaFixo' ? (
                        <input
                          id="dl-dia-fixo"
                          aria-label="Dia fixo do mês"
                          type="number"
                          min={1}
                          max={31}
                          value={diaFixo}
                          onChange={(e) => setDiaFixo(e.target.value)}
                          placeholder="ex.: 5"
                        />
                      ) : (
                        <input
                          id="dl-dia-util"
                          aria-label="Dia útil do mês"
                          type="number"
                          min={1}
                          max={23}
                          value={diaUtil}
                          onChange={(e) => setDiaUtil(e.target.value)}
                          placeholder="ex.: 1 (primeiro dia útil)"
                        />
                      )}
                    </>
                  ) : (
                    <>
                      <label htmlFor="dl-dia-semana">Dia da semana</label>
                      <select id="dl-dia-semana" value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
                        {NOMES_DIA_SEMANA.map((nome, i) => (
                          <option key={i} value={i}>
                            {nome}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  <p className="texto-fraco" style={{ marginTop: 8, marginBottom: 0 }}>
                    A próxima ocorrência é gerada automaticamente quando chegar a data — não precisa lançar de
                    novo todo mês.
                  </p>
                </div>
              )}

              {recorrencia === 'parcelado' && (
                <div className="cartao" style={{ marginTop: 8, background: 'var(--bg)' }}>
                  <label htmlFor="dl-parcela-n">Quantidade de parcelas</label>
                  <input
                    id="dl-parcela-n"
                    type="number"
                    min={2}
                    max={60}
                    value={parcelaN}
                    onChange={(e) => setParcelaN(e.target.value)}
                  />
                  {parcelasPreview.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <p className="texto-fraco" style={{ margin: '0 0 4px' }}>Prévia:</p>
                      {parcelasPreview.map((p) => (
                        <div key={p.parcelaI} className="texto-fraco" style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>{p.parcelaI}/{parcelasPreview.length} — {p.data.split('-').reverse().join('/')}</span>
                          <span>{fmtBRL(p.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {erro && (
            <p className="valor-neg" style={{ marginTop: 12, marginBottom: 0, fontWeight: 600 }}>
              {erro}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button type="submit" className="primario" style={{ marginTop: 0 }}>
              Salvar
            </button>
            <button
              type="button"
              style={{
                marginTop: 0,
                background: 'none',
                border: '1px solid var(--borda)',
                borderRadius: 10,
                padding: '12px',
                cursor: 'pointer',
              }}
              onClick={onFechar}
            >
              Cancelar
            </button>
          </div>
        </form>

        {editando && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--borda)', paddingTop: 12 }}>
            {confirmandoExclusao ? (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                {ehTransferenciaExistente && (
                  <p className="texto-fraco" style={{ width: '100%', margin: '0 0 4px' }}>
                    Isso exclui os dois lados da transferência.
                  </p>
                )}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 0 }}
                  onClick={excluir}
                >
                  Confirmar exclusão
                </button>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--texto-fraco)', cursor: 'pointer', padding: 0 }}
                  onClick={() => setConfirmandoExclusao(false)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 0 }}
                onClick={() => setConfirmandoExclusao(true)}
              >
                Excluir lançamento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
