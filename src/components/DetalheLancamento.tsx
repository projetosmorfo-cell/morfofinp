import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Periodicidade, type RegraRecorrencia, type Lancamento } from '../db'
import { gerarIdSerie, gerarParcelas, reprocessarSerieAPartirDe, ROTULOS_PERIODICIDADE, NOMES_DIA_SEMANA } from '../recorrencia'
import { fmtBRL, formatarMoeda, aplicarMascaraValor, paraNumero } from '../formatoMoeda'
import SeletorCategoriaComIcone from './SeletorCategoriaComIcone'
import MemoriaDescricao from './MemoriaDescricao'
import { lerDoAmbiente, marcaDoAmbiente } from '../ambiente'
import { hojeEfetivoISO } from '../hojeSimulado'
import { janelaFatura } from '../faturaCiclo'
import { desvincularLancamento } from '../vinculoNotificacao'

// `hoje()` continua na data REAL do aparelho, de propósito (decisão da Etapa
// 7: prefill de formulário fica fora da simulação de data, só status/
// recorrência/mês respeitam `hojeEfetivoISO()`). O dia do mês padrão de uma
// recorrência fixa (item 7, abaixo) usa `hojeEfetivoISO()` diretamente — é
// mais consistente com a ferramenta de simulação usá-lo ali, sem alterar o
// comportamento já documentado da data do próprio lançamento.
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
  sugestao,
  aoSalvarComSucesso,
  abrirClonando,
  onFechar,
}: {
  alvoId?: number
  categoriaIdSugerida?: number
  contaIdSugerida?: number
  // Item 11 (15/09/2026): abre já em modo "clonando" — mesmo efeito de abrir
  // em edição e clicar em "Clonar este lançamento", só sem o passo manual.
  // Usado pelo atalho de duplicar da linha (Lançamentos/Carteira).
  abrirClonando?: boolean
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
  // 09/09/2026 — Notificação bancária (ver `src/notificacaoBancaria.ts` e
  // `src/screens/NotificacoesBancarias.tsx`): quando o lançamento nasce de
  // uma notificação capturada do app do banco/cartão, o formulário abre já
  // pré-preenchido com o que foi reconhecido (valor, data, texto, tipo) e
  // guarda em `descricaoOriginal` o TEXTO CRU da notificação — não o texto
  // que o usuário digitar em `descricao` — porque é exatamente esse texto
  // cru que a conciliação futura vai comparar (Decisão 24). Só vale na
  // CRIAÇÃO; na edição de um lançamento existente é ignorado.
  sugestao?: {
    data?: string
    descricao?: string
    valor?: number
    tipo?: 'saida' | 'entrada'
    descricaoOriginal?: string
    /* 16/09/2026 — a leitura de notificação passou a distinguir transação
       AGENDADA de transação CONCLUÍDA (ver `src/parseNotificacao.ts`): o
       banco avisa "está agendada pra amanhã" e depois "foi concluída". Uma
       agendada abre com "já foi pago" DESMARCADO, porque ainda não
       aconteceu. `undefined` mantém o padrão de sempre (marcado). */
    pago?: boolean
    /* true quando o lançamento veio de uma NOTIFICAÇÃO e nenhuma conta da
       carteira casou com o banco que a postou. Aí o campo "Pago com" abre
       literalmente EM BRANCO, com um placeholder, e salvar exige escolher —
       em vez do padrão normal do formulário, que é assumir a primeira conta
       da lista. Regra literal do Rafael (16/09/2026): "quando não existir,
       trazer o campo em branco". Vale SÓ neste caminho; criar lançamento
       pela tela continua funcionando exatamente como antes. */
    contaEmBranco?: boolean
    /* Conta da carteira que casou com o app que postou a notificação.
       `undefined` = nenhuma casou com certeza e o campo abre EM BRANCO —
       regra literal do Rafael, nunca chutar conta. Quem entrega isso pro
       formulário é `contaIdSugerida`; fica aqui junto só pra sugestão ser um
       objeto só. */
    contaId?: number
  }
  // Chamado uma vez, só quando o lançamento foi gravado com sucesso (nunca
  // ao cancelar/fechar/excluir) — usado pela tela de Notificações bancárias
  // pra marcar a notificação pendente como "confirmada" e (build 080) pra
  // aprender o de/para a partir do que foi escolhido aqui.
  aoSalvarComSucesso?: (escolha: { descricao: string; categoriaId?: number; contaId?: number }) => void
  onFechar: () => void
}) {
  const categorias = useLiveQuery(() => lerDoAmbiente(db.categorias.orderBy('nome').toArray()), [])
  const contas = useLiveQuery(() => lerDoAmbiente(db.contas.toArray()), [])
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

  /* Clonar (10/09/2026, pedido do Rafael: "ter opção de clonar e já abrir o
     clone pra edição e salvar, permitindo cancelar a clonagem"). Não abre
     outro modal nem duplica nada no banco na hora: o MESMO formulário deixa
     de estar editando o original e passa a estar criando um lançamento novo,
     com todos os campos já preenchidos. "Cancelar clonagem" volta a editar o
     original, sem ter gravado coisa nenhuma. */
  const [clonando, setClonando] = useState(!!abrirClonando)
  /* Painel discreto de "dados de vínculo" (build 080) — recolhido por padrão. */
  const [mostrarVinculo, setMostrarVinculo] = useState(false)
  /* Desvincular (build 081) — confirmação em dois toques e o aviso do que NÃO
     foi mexido, na própria tela. */
  const [confirmandoDesvinculo, setConfirmandoDesvinculo] = useState(false)
  const [desvincularAviso, setDesvincularAviso] = useState<string | null>(null)
  const editando = alvoId != null && !clonando
  const ehTransferenciaExistente = !!original?.transferenciaId
  const [carregado, setCarregado] = useState(false)

  const [data, setData] = useState(sugestao?.data ?? hoje())
  const [descricao, setDescricao] = useState(sugestao?.descricao ?? '')
  const [categoriaId, setCategoriaId] = useState<number | ''>(categoriaIdSugerida ?? '')
  const [contaId, setContaId] = useState<number | ''>(contaIdSugerida ?? '')
  const [valor, setValor] = useState(sugestao?.valor != null ? formatarMoeda(Math.abs(sugestao.valor)) : '')
  const [tipo, setTipo] = useState<TipoLancamento>(sugestao?.tipo ?? 'saida')
  // Texto cru da notificação, quando houver — ver prop `sugestao` acima.
  // Fica fixo desde a abertura do formulário: editar `descricao` depois
  // NUNCA muda isso (é o mesmo princípio de imutabilidade da Decisão 24).
  const descricaoOriginalFixa = sugestao?.descricaoOriginal
  /* Só vale na CRIAÇÃO vinda de notificação sem conta casada (ver
     `sugestao.contaEmBranco`). Na edição de lançamento existente, nunca. */
  const contaEmBranco = !!sugestao?.contaEmBranco && alvoId == null
  // Só usados quando tipo === 'transferencia' — a transferência sempre
  // envolve duas contas (origem/destino) e agora também duas categorias
  // independentes (podem ser iguais ou diferentes, ponto 3 do feedback).
  const [contaOrigemId, setContaOrigemId] = useState<number | ''>('')
  const [contaDestinoId, setContaDestinoId] = useState<number | ''>('')
  const [categoriaOrigemId, setCategoriaOrigemId] = useState<number | ''>('')
  const [categoriaDestinoId, setCategoriaDestinoId] = useState<number | ''>('')
  const [pago, setPago] = useState(sugestao?.pago ?? true)
  /* Item 13 (16/09/2026): o padrão de "já foi pago/recebido" passa a
     considerar a DATA (e a conta, se é cartão) em vez de ser sempre `true` —
     mas só enquanto a pessoa não mexer manualmente no checkbox, e só na
     CRIAÇÃO (nunca sobrescreve o valor de um lançamento existente sendo
     editado). Data anterior a hoje (retroativa) ou de hoje mesmo → pago/
     recebido/concluído por padrão (inclusive pago por cartão, que vira
     "No cartão" pela derivação de `statusPagamento.ts` — aqui só decidimos
     o booleano `pago`, o rótulo "No cartão" é derivado à parte). Data futura
     → não pago por padrão (ainda é só um compromisso). */
  const [pagoTocadoManualmente, setPagoTocadoManualmente] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // F-10b da revisão de UI (04/09/2026): a mensagem de erro já nomeia o
  // campo em texto, mas não realçava a borda dele — este id identifica qual
  // input/select mostra a borda vermelha, além do texto (ver `erroCampo` nas
  // validações abaixo e `campoComErro()` no JSX).
  const [campoComErro, setCampoComErro] = useState<string | null>(null)
  const [recorrencia, setRecorrencia] = useState<'unico' | 'fixo' | 'parcelado'>('unico')
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal')
  const [tipoRegra, setTipoRegra] = useState<TipoRegraUI>('diaFixo')
  // Item 7 (16/09/2026): o dia do mês de uma recorrência fixa nova (dia
  // fixo) sugeria sempre "5" — agora sugere o dia do mês de HOJE (usando
  // `hojeEfetivoISO()`, a mesma data simulada que o app já respeita em
  // recorrência/status), então uma pessoa cadastrando um fixo hoje já vê o
  // dia mais provável pré-selecionado, em vez de precisar trocar manualmente
  // toda vez.
  const [diaFixo, setDiaFixo] = useState(() => String(Number(hojeEfetivoISO().slice(8, 10))))
  const [diaUtil, setDiaUtil] = useState('1')
  const [diaSemana, setDiaSemana] = useState('1')
  const [parcelaN, setParcelaN] = useState('2')
  const [faturaOverride, setFaturaOverride] = useState<'anterior' | 'atual' | 'proxima'>('atual')
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  /* Item 3 da lista pendente do Rafael (15/09/2026): excluir um lançamento
     que pertence a uma série (fixo ou parcelado) precisa perguntar o alcance
     — antes excluía sempre só aquele registro, mesmo sendo parte de uma
     série, sem opção de apagar os futuros ou a série inteira junto. */
  const [escopoExclusao, setEscopoExclusao] = useState<'este' | 'futuros' | 'serie'>('este')
  /* Item 12 (16/09/2026): um lançamento de categoria "Pagamento de fatura"
     precisa dizer qual cartão e qual mês/ciclo de fatura está pagando — sem
     isso, o pagamento entrava no fluxo de caixa mas nenhum lançamento do
     cartão ficava marcado como pago (diferente do fluxo "Pagar esta fatura"
     dentro do drill-in da Carteira, que já pergunta isso implicitamente por
     já estar dentro daquele card específico). Só aparece quando a categoria
     escolhida tem essa natureza; some/reseta se trocar de categoria. */
  const [cartaoFaturaId, setCartaoFaturaId] = useState<number | ''>('')
  const [mesFaturaEscolhido, setMesFaturaEscolhido] = useState(() => hoje().slice(0, 7))

  // Preenche o formulário quando o lançamento a editar/clonar carrega (só
  // uma vez). Se for perna de transferência, espera o PAR carregar também
  // antes de preencher — senão mostraria só metade da operação (só a conta/
  // categoria de origem ou só a de destino) por um instante.
  //
  // Item 6 (16/09/2026), bug real corrigido: esta condição usava `editando`
  // (que é `alvoId != null && !clonando`) — então abrir DIRETO em modo
  // clone (`abrirClonando: true`, o atalho "Duplicar" da linha) tinha
  // `editando` sempre `false` e o formulário nunca era preenchido: "Duplicar"
  // abria um formulário em branco. Trocado para `alvoId != null`, que cobre
  // os dois casos (editando OU clonando a partir de um `alvoId`).
  if (alvoId != null && original && !carregado && (!ehTransferenciaExistente || parTransferencia)) {
    setData(original.dataCompetencia)
    // Item 6: ao clonar, a descrição ganha o sufixo " - Copia" — pré-preenche
    // tudo e não exige reentrada de nenhum dado pra salvar como um novo
    // lançamento independente do original.
    setDescricao(clonando ? `${original.descricao} - Copia` : original.descricao)
    setValor(formatarMoeda(original.valor))
    setPago(original.pago !== false)
    setFaturaOverride(original.faturaOverride ?? 'atual')
    /* Item 9: abrir uma ocorrência de série mostra a recorrência dela já
       preenchida — antes o formulário voltava sempre pra "Único". */
    if (original.recorrencia) {
      setRecorrencia(original.recorrencia)
      if (original.periodicidade) setPeriodicidade(original.periodicidade)
      if (original.regraRecorrencia?.tipo === 'diaFixo') {
        setTipoRegra('diaFixo')
        setDiaFixo(String(original.regraRecorrencia.dia))
      } else if (original.regraRecorrencia?.tipo === 'diaUtil') {
        setTipoRegra('diaUtil')
        setDiaUtil(String(original.regraRecorrencia.diaUtil))
      } else if (original.regraRecorrencia?.tipo === 'diaSemana') {
        setTipoRegra('diaSemana')
        setDiaSemana(String(original.regraRecorrencia.diaSemana))
      }
      if (original.parcelaN) setParcelaN(String(original.parcelaN))
    }
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
  // Item 12: categoria escolhida AGORA no formulário (não a do original) —
  // é ela que decide se os campos de cartão/mês da fatura aparecem.
  const categoriaEscolhida = categorias?.find((c) => c.id === categoriaId)
  const ehPagamentoFatura = categoriaEscolhida?.natureza === 'Pagamento de fatura'
  const cartoesDisponiveis = (contas ?? []).filter((c) => c.tipo === 'cartao')
  // Recorrência já definida (série existente) — mexer nisso na edição seria
  // arriscado (poderia confundir a geração automática das próximas
  // ocorrências), então fica travado, só editável na criação. Um lançamento
  // ÚNICO, porém, pode virar fixo/parcelado também na edição (pedido do
  // Rafael) — nesse caso o formulário mostra as mesmas opções da criação.
  const jaTemSerie = editando && !!original?.recorrencia
  /* Item 9 da lista de 12/09/2026: "ao incluir/editar com recorrência, o campo
     recorrência não aparece mais ao editar de novo e deveria; deve reprocessar
     ao salvar". O campo ficava escondido justamente quando o lançamento JÁ
     pertencia a uma série — ou seja, exatamente quando ele importa. Agora
     aparece sempre (menos em transferência, que não tem recorrência), já
     preenchido com o que está gravado, e salvar reprocessa a série a partir
     desta ocorrência (ver `reprocessarSerieAPartirDe` em `recorrencia.ts`:
     nunca mexe no que já foi pago, nunca duplica). */
  const podeEscolherRecorrencia = tipo !== 'transferencia'

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
    /* 10/09/2026 — Rafael reportou "inclusão de registro não está salvando".
       Reproduzido: o que trava o salvamento é sempre a validação (na prática,
       categoria vazia — o campo virou um botão "Escolha…" nesta rodada e é
       fácil passar batido). A mensagem existia, mas ficava lá embaixo, perto
       do "Salvar", e num formulário rolado ela podia estar fora da vista —
       dava a impressão exata de "cliquei e não aconteceu nada". Agora o campo
       culpado é trazido pra vista e recebe o foco, além do texto e da borda
       vermelha que já existiam. */
    window.setTimeout(() => {
      const el = document.getElementById(`dl-${campo === 'contaOrigem' ? 'conta-origem' : campo === 'contaDestino' ? 'conta-destino' : campo === 'categoriaOrigem' ? 'categoria-origem' : campo === 'categoriaDestino' ? 'categoria-destino' : campo}`)
      if (!el) return
      el.scrollIntoView({ block: 'center' })
      ;(el as HTMLElement).focus?.()
    }, 0)
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
  /* Build 080: além de marcar a notificação como confirmada, o sucesso agora
     devolve O QUE FOI ESCOLHIDO — é isso que alimenta o de/para aprendido
     ("quando vier este texto do banco, é esta categoria, com este nome, nesta
     conta"). O formulário não sabe nada sobre de/para de propósito: ele só
     relata a escolha, e quem aprende é `App.tsx` (ver `ensinarDePara`). */
  function fecharAposSalvar() {
    aoMudarMes?.(data.slice(0, 7))
    aoSalvarComSucesso?.({
      descricao,
      categoriaId: categoriaId === '' ? undefined : Number(categoriaId),
      contaId: contaId === '' ? undefined : Number(contaId),
    })
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
          ...marcaDoAmbiente(),
          dataCompetencia: data,
          dataCaixa: data,
          descricao: descricaoTransf,
          descricaoOriginal: descricaoTransf,
          valor: -numeroTransf,
          contaId: contaOrigemId,
          pagoPor: 'conta',
          categoriaId: Number(categoriaOrigemId),
          status: 'manual',
          pago,
          transferenciaId,
        },
        {
          ...marcaDoAmbiente(),
          dataCompetencia: data,
          dataCaixa: data,
          descricao: descricaoTransf,
          descricaoOriginal: descricaoTransf,
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

    const contaEscolhidaId = contaEmBranco ? contaId : contaId || contas?.[0]?.id
    if (!categoriaId) {
      erroCampo('categoria', 'Escolha uma categoria.')
      return
    }
    if (!contaEscolhidaId) {
      erroCampo('conta', contaEmBranco ? 'Escolha a conta desta movimentação.' : 'Cadastre uma conta antes de lançar.')
      return
    }
    const numero = paraNumero(valor)
    if (!numero) {
      erroCampo('valor', 'Informe um valor válido.')
      return
    }
    const valorComSinal = tipo === 'saida' ? -numero : numero

    // Item 1 da lista pendente (15/09/2026): faturaOverride só faz sentido em
    // conta tipo 'cartao', e só grava quando difere do padrão 'atual' — assim
    // um lançamento de conta corrente/cofre nunca carrega o campo à toa.
    const contaEhCartao = (contas ?? []).find((c) => c.id === contaEscolhidaId)?.tipo === 'cartao'
    const patchFaturaOverride =
      contaEhCartao && faturaOverride !== 'atual' ? { faturaOverride } : { faturaOverride: undefined }

    if (editando && alvoId != null) {
      if (jaTemSerie) {
        /* Item 9 (12/09/2026): salvar uma ocorrência de série passou a
           REPROCESSAR a série a partir dela — não é mais só "edita esta
           ocorrência e pronto". A ocorrência aberta recebe também os
           parâmetros de recorrência escolhidos agora (nº de parcelas,
           periodicidade, regra do dia); `reprocessarSerieAPartirDe` cuida do
           resto: apaga só o que vem depois e ainda não foi pago, e regenera
           dali pra frente. Nada do que já foi pago é tocado, e nada é
           duplicado (a rotina confere antes de gravar). */
        const regraEditada: RegraRecorrencia =
          tipoRegra === 'diaFixo'
            ? { tipo: 'diaFixo', dia: Math.min(31, Math.max(1, Number(diaFixo) || 1)) }
            : tipoRegra === 'diaUtil'
              ? { tipo: 'diaUtil', diaUtil: Math.min(23, Math.max(1, Number(diaUtil) || 1)) }
              : { tipo: 'diaSemana', diaSemana: Math.min(6, Math.max(0, Number(diaSemana))) }
        const nParcelas = Math.max(1, Math.round(Number(parcelaN)) || (original?.parcelaN ?? 1))
        const recorrenciaFinal = recorrencia === 'unico' ? original!.recorrencia! : recorrencia
        await db.lancamentos.update(alvoId, {
          dataCompetencia: data,
          dataCaixa: data,
          descricao: descricao || '(sem descrição)',
          valor: valorComSinal,
          categoriaId: Number(categoriaId),
          contaId: contaEscolhidaId,
          pago,
          recorrencia: recorrenciaFinal,
          ...(recorrenciaFinal === 'fixo'
            ? { periodicidade, regraRecorrencia: regraEditada }
            : { parcelaN: nParcelas }),
          ...patchFaturaOverride,
        })
        if (original?.serieId) {
          await reprocessarSerieAPartirDe(original.serieId, {
            dataCompetencia: data,
            valor: valorComSinal,
            descricao: descricao || '(sem descrição)',
            descricaoOriginal: original.descricaoOriginal,
            categoriaId: Number(categoriaId),
            contaId: contaEscolhidaId,
            pagoPor: original.pagoPor,
            recorrencia: recorrenciaFinal,
            parcelaI: original.parcelaI,
            parcelaN: nParcelas,
            periodicidade,
            regraRecorrencia: regraEditada,
          })
        }
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
          ...patchFaturaOverride,
        })
        if (resto.length > 0) {
          await db.lancamentos.bulkAdd(
            resto.map((p) => ({
              ...marcaDoAmbiente(),
              dataCompetencia: p.data,
              dataCaixa: p.data,
              descricao: descricao || '(sem descrição)',
              descricaoOriginal: descricao || '(sem descrição)',
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
              ...patchFaturaOverride,
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
          ...patchFaturaOverride,
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
        ...patchFaturaOverride,
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
          ...marcaDoAmbiente(),
          dataCompetencia: p.data,
          dataCaixa: p.data,
          descricao: descricao || '(sem descrição)',
          descricaoOriginal: descricaoOriginalFixa ?? (descricao || '(sem descrição)'),
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
          ...patchFaturaOverride,
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
        ...marcaDoAmbiente(),
        dataCompetencia: data,
        dataCaixa: data,
        descricao: descricao || '(sem descrição)',
        descricaoOriginal: descricaoOriginalFixa ?? (descricao || '(sem descrição)'),
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
        ...patchFaturaOverride,
      })
      fecharAposSalvar()
      return
    }

    const novoId = await db.lancamentos.add({
      ...marcaDoAmbiente(),
      dataCompetencia: data,
      dataCaixa: data,
      descricao: descricao || '(sem descrição)',
      descricaoOriginal: descricaoOriginalFixa ?? (descricao || '(sem descrição)'),
      valor: valorComSinal,
      contaId: contaEscolhidaId,
      pagoPor: 'conta',
      categoriaId: Number(categoriaId),
      status: 'manual',
      pago,
      ...patchFaturaOverride,
    })

    // Item 12: quita o ciclo escolhido — mesma mecânica de "Pagar esta
    // fatura" (Carteira.tsx): todo lançamento do cartão dentro da janela
    // fechada do mês escolhido vira `pago: true` + `faturaId` apontando pro
    // pagamento recém-criado (exceto outros "Pagamento de fatura", pra não
    // encadear quitação em quitação).
    if (ehPagamentoFatura && !editando && cartaoFaturaId !== '') {
      const cartao = (contas ?? []).find((c) => c.id === cartaoFaturaId)
      if (cartao) {
        const { inicio, fim } = janelaFatura(cartao.diaFechamento ?? 9, mesFaturaEscolhido)
        const doCiclo = await lerDoAmbiente(
          db.lancamentos
            .where('contaId')
            .equals(cartaoFaturaId)
            .filter((l) => l.dataCompetencia >= inicio && l.dataCompetencia <= fim)
            .toArray(),
        )
        const idsParaQuitar = doCiclo
          .filter((l) => categorias?.find((c) => c.id === l.categoriaId)?.natureza !== 'Pagamento de fatura')
          .map((l) => l.id!)
        await Promise.all(idsParaQuitar.map((id) => db.lancamentos.update(id, { pago: true, faturaId: novoId })))
      }
    }

    fecharAposSalvar()
  }

  async function excluir() {
    if (alvoId == null) return
    if (original?.transferenciaId) {
      // Nunca deixa a transferência "manca" — excluir um lado leva o outro junto.
      await db.lancamentos.where('transferenciaId').equals(original.transferenciaId).delete()
    } else if (original?.serieId && escopoExclusao !== 'este') {
      // "Este e futuros": mesma série, data >= a deste registro (a lógica de
      // "futuro" é sempre relativa à ocorrência que está sendo excluída, não
      // a hoje — excluir uma ocorrência antiga não deveria apagar nada depois
      // dela que já tenha acontecido antes de hoje). "Toda a série": todos.
      const daSerie = await db.lancamentos.where('serieId').equals(original.serieId).toArray()
      const idsParaExcluir = daSerie
        .filter((l) => escopoExclusao === 'serie' || l.dataCompetencia >= original.dataCompetencia)
        .map((l) => l.id!)
      await db.lancamentos.bulkDelete(idsParaExcluir)
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
          <h2 style={{ margin: 0 }}>{clonando ? 'Clonar lançamento' : editando ? 'Editar lançamento' : 'Novo lançamento'}</h2>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--texto-fraco)', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {clonando && (
          <div style={{ background: 'rgba(59,130,246,0.14)', border: '1px solid var(--azul)', borderRadius: 10, padding: '8px 10px', marginBottom: 10, fontSize: 12.5, lineHeight: 1.45 }}>
            Você está clonando este lançamento — salvar cria um <strong>novo</strong>, sem tocar no original.
            <button
              type="button"
              onClick={() => setClonando(false)}
              style={{ marginTop: 8, background: 'none', border: '1px solid var(--borda)', borderRadius: 8, color: 'var(--texto)', padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}
            >
              Cancelar clonagem
            </button>
          </div>
        )}

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
          {/* ORDEM DOS CAMPOS: valor (já com o foco) → data → o que →
              categoria (com ícones) → pago com → o resto como já era. Item 4
              (16/09/2026, pedido do Rafael): a Data passou a vir logo depois
              do Valor, em todos os tipos (saída/entrada/transferência) — antes
              (10/09/2026) vinha depois de categoria/conta/fatura, quase no
              fim do formulário. */}
          <label htmlFor="dl-valor">Valor (R$)</label>
          <input
            id="dl-valor"
            type="text"
            inputMode="numeric"
            autoFocus
            placeholder="0,00"
            value={valor}
            onChange={(e) => setValor(aplicarMascaraValor(e.target.value))}
            className={campoComErro === 'valor' ? 'campo-com-erro' : undefined}
          />

          <label htmlFor="dl-data">Data</label>
          <input
            id="dl-data"
            type="date"
            value={data}
            onChange={(e) => {
              const novaData = e.target.value
              setData(novaData)
              // Item 13: recalcula o padrão de "já pago" só na criação e só
              // se a pessoa ainda não mexeu manualmente no checkbox.
              if (!editando && !pagoTocadoManualmente) {
                setPago(novaData <= hojeEfetivoISO())
              }
            }}
            className={campoComErro === 'data' ? 'campo-com-erro' : undefined}
          />

          <label htmlFor="dl-descricao">O que Foi</label>
          <MemoriaDescricao
            id="dl-descricao"
            placeholder="Ex.: Mercado do mês"
            valor={descricao}
            onMudar={setDescricao}
            onEscolher={(s) => {
              setDescricao(s.descricao)
              /* Preenche categoria e "pago com" junto — o pedido. Só preenche
                 o que a sugestão de fato tem, e nunca sobrescreve com vazio. */
              if (s.categoriaId != null) setCategoriaId(s.categoriaId)
              if (s.contaId != null) setContaId(s.contaId)
            }}
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
              <label htmlFor="dl-categoria-origem">Categoria de Saída</label>
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
              <label htmlFor="dl-categoria-destino">Categoria de Entrada</label>
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
              {/* Deixou de ser `<select>` nativo (10/09/2026): `<option>` só
                  aceita texto, então ícone não aparecia, e o menu que ele abre
                  é do sistema — não respeitava claro/escuro. Ver
                  `SeletorCategoriaComIcone.tsx`. Mesmo filtro de antes: só
                  categorias ativas, mais a já escolhida ainda que inativa. */}
              <SeletorCategoriaComIcone
                id="dl-categoria"
                categorias={(categorias ?? []).filter((c) => c.ativa || c.id === categoriaAtual?.id)}
                valor={categoriaId}
                onEscolher={(id) => setCategoriaId(id)}
                onLimpar={() => setCategoriaId('')}
                comErro={campoComErro === 'categoria'}
              />

              <label htmlFor="dl-conta">Pago com</label>
              <select
                id="dl-conta"
                value={contaEmBranco ? contaId : contaId || contas?.[0]?.id || ''}
                onChange={(e) => setContaId(e.target.value ? Number(e.target.value) : '')}
                className={campoComErro === 'conta' ? 'campo-com-erro' : undefined}
              >
                {contaEmBranco && <option value="">Escolha a conta</option>}
                {(contas ?? [])
                  .filter((c) => c.ativa || c.id === original?.contaId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} {c.tipo === 'cartao' ? '(cartão)' : c.tipo === 'cofre' ? '(cofrinho)' : ''}
                    </option>
                  ))}
              </select>

              {/* Item 1 da lista pendente do Rafael (15/09/2026): a data
                  normalmente decide sozinha em qual fatura a compra entra
                  (`janelaFatura`, Carteira.tsx) — este campo permite corrigir
                  manualmente quando o banco processa com atraso/adiantado e a
                  compra cai numa fatura diferente da que a data indicaria. Só
                  aparece pra conta tipo cartão; some/reseta pra "atual" se a
                  pessoa trocar pra uma conta que não é cartão. */}
              {(contas ?? []).find((c) => c.id === (contaEmBranco ? contaId : contaId || contas?.[0]?.id))?.tipo === 'cartao' && (
                <>
                  <label htmlFor="dl-fatura-override">Em qual fatura</label>
                  <select
                    id="dl-fatura-override"
                    value={faturaOverride}
                    onChange={(e) => setFaturaOverride(e.target.value as typeof faturaOverride)}
                  >
                    <option value="atual">Nesta fatura (pela data)</option>
                    <option value="anterior">Fatura anterior</option>
                    <option value="proxima">Próxima fatura</option>
                  </select>
                </>
              )}

              {/* Item 12 (16/09/2026): lançar diretamente na categoria
                  "Pagamento de fatura" (fora do fluxo "Pagar esta fatura" da
                  Carteira) agora pergunta cartão + mês — sem isso o pagamento
                  entrava no fluxo de caixa mas nada do cartão ficava marcado
                  como pago. Só na criação (não editando um pagamento já
                  existente, pra não requitar/perder vínculo de um já feito). */}
              {ehPagamentoFatura && !editando && (
                <>
                  <label htmlFor="dl-fatura-cartao">Cartão desta fatura</label>
                  <select
                    id="dl-fatura-cartao"
                    value={cartaoFaturaId}
                    onChange={(e) => setCartaoFaturaId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Escolha…</option>
                    {cartoesDisponiveis.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                  <label htmlFor="dl-fatura-mes">Mês da fatura</label>
                  <input
                    id="dl-fatura-mes"
                    type="month"
                    value={mesFaturaEscolhido}
                    onChange={(e) => setMesFaturaEscolhido(e.target.value)}
                  />
                  <p className="texto-fraco" style={{ marginTop: 4, marginBottom: 0, fontSize: 12 }}>
                    Ao salvar, todos os lançamentos deste cartão nesse ciclo são marcados como pagos.
                  </p>
                </>
              )}
            </>
          )}

          <label htmlFor="dl-pago" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
            <input
              id="dl-pago"
              type="checkbox"
              checked={pago}
              onChange={(e) => {
                setPagoTocadoManualmente(true)
                setPago(e.target.checked)
              }}
              style={{ width: 'auto' }}
            />
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
                      <label htmlFor="dl-tipo-regra">Regra do Dia</label>
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
                      <label htmlFor="dl-dia-semana">Dia da Semana</label>
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
                  <label htmlFor="dl-parcela-n">Quantidade de Parcelas</label>
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

        {/* DADOS DE VÍNCULO (16/09/2026, build 080 — fase 2 do pedido).
            DISCRETO de propósito: um link de texto pequeno, nunca um campo do
            formulário. `descricaoOriginal` sempre foi gravado corretamente em
            todo caminho de criação e é imutável (Decisão 24), mas NUNCA era
            mostrado em tela nenhuma — só saía no CSV. Num lançamento feito à
            mão ele é igual à descrição, e é por isso que o painel diz isso com
            todas as letras em vez de exibir um duplicado confuso. */}
        {editando && original && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--borda)', paddingTop: 10 }}>
            <button
              type="button"
              className="texto-fraco"
              style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, textDecoration: 'underline', cursor: 'pointer' }}
              data-testid="abrir-vinculo"
              onClick={() => setMostrarVinculo((v) => !v)}
            >
              {mostrarVinculo ? '▾' : '▸'} Dados de vínculo
            </button>
            {mostrarVinculo && (
              <div className="texto-fraco" style={{ fontSize: 12, marginTop: 6 }} data-testid="painel-vinculo">
                <p style={{ margin: '0 0 4px' }}>
                  <b>Nome original:</b> {original.descricaoOriginal ?? '(não registrado)'}
                </p>
                {original.vinculoOrigem ? (
                  <>
                    <p style={{ margin: '0 0 4px' }}>
                      <b>Veio de:</b>{' '}
                      {original.vinculoOrigem.origem === 'notificacao' ? 'notificação do banco' : 'importação'}
                      {original.vinculoOrigem.app ? ` · ${original.vinculoOrigem.app}` : ''}
                      {original.vinculoOrigem.pacote ? ` (${original.vinculoOrigem.pacote})` : ''}
                    </p>
                    {original.vinculoOrigem.recebidoEm && (
                      <p style={{ margin: '0 0 4px' }}>
                        <b>Recebida em:</b> {new Date(original.vinculoOrigem.recebidoEm).toLocaleString('pt-BR')}
                      </p>
                    )}
                    {original.vinculoOrigem.vinculadoAExistente && (
                      <p style={{ margin: '0 0 4px' }}>
                        Foi <b>vinculada a este lançamento que já existia</b>
                        {original.vinculoOrigem.valorAnterior != null
                          ? ` — o valor previsto era ${fmtBRL(Math.abs(original.vinculoOrigem.valorAnterior))}.`
                          : '.'}
                      </p>
                    )}
                    {original.vinculoOrigem.textoCru && (
                      <p style={{ margin: 0, whiteSpace: 'pre-wrap' }} data-testid="vinculo-texto-cru">
                        <b>Texto do banco:</b> {original.vinculoOrigem.textoCru}
                      </p>
                    )}
                    {/* DESVINCULAR (build 081, item 5). Os campos acima são
                        READ-ONLY de propósito: o valor deles é serem o registro
                        NÃO editado do que o banco disse — é o que os torna
                        âncora da conciliação bancária futura. O que faltava era
                        o DESFAZER: vinculei na linha errada. Só aparece quando
                        existe origem pra limpar. Valor/situação/data ficam como
                        estão, e a linha abaixo avisa isso. */}
                    <div style={{ marginTop: 8 }}>
                      {confirmandoDesvinculo ? (
                        <>
                          <p style={{ margin: '0 0 6px' }}>
                            Desvincular limpa a origem e devolve a notificação pra Pendentes.{' '}
                            <b>O valor, a situação e a data do lançamento ficam como estão</b> — se quiser mudá-los,
                            edite aqui mesmo.
                          </p>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="button"
                              style={{ marginTop: 0, background: 'none', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--texto)', padding: '8px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                              data-testid="vinculo-desvincular-confirmar"
                              onClick={async () => {
                                if (original.id == null) return
                                const r = await desvincularLancamento(original.id)
                                setConfirmandoDesvinculo(false)
                                setDesvincularAviso(
                                  r.voltouParaPendentes
                                    ? 'Vínculo desfeito. A notificação voltou pra Pendentes; o valor e a situação deste lançamento não foram alterados.'
                                    : 'Vínculo desfeito. A notificação de origem não está mais no aparelho; o valor e a situação deste lançamento não foram alterados.',
                                )
                              }}
                            >
                              Sim, desvincular
                            </button>
                            <button
                              type="button"
                              style={{ marginTop: 0, background: 'none', border: 'none', color: 'var(--texto-fraco)', padding: '8px 4px', cursor: 'pointer', fontSize: 12 }}
                              onClick={() => setConfirmandoDesvinculo(false)}
                            >
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <button
                          type="button"
                          style={{ marginTop: 0, background: 'none', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--texto)', padding: '8px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                          data-testid="vinculo-desvincular"
                          onClick={() => setConfirmandoDesvinculo(true)}
                        >
                          Desvincular
                        </button>
                      )}
                    </div>
                  </>
                ) : desvincularAviso ? (
                  /* Depois de desvincular, `vinculoOrigem` some — e sem esta
                     ramificação a pessoa cairia no texto de "feito à mão", que
                     passou a ser MENTIRA pra este lançamento. O aviso fica no
                     lugar dele enquanto o formulário estiver aberto. */
                  <p style={{ margin: 0 }} data-testid="vinculo-desfeito">{desvincularAviso}</p>
                ) : (
                  <p style={{ margin: 0 }} data-testid="vinculo-sem-origem">
                    Este lançamento foi criado por você, à mão — não veio de notificação nem de importação, então não
                    há texto de banco pra guardar aqui.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Clonar — só faz sentido num lançamento que já existe e enquanto
            não se está clonando. Não grava nada: só troca o formulário pro
            modo "criar", com os campos já preenchidos (ver `clonando`). */}
        {editando && !ehTransferenciaExistente && (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--borda)', paddingTop: 12 }}>
            <button
              type="button"
              style={{ background: 'none', border: '1px solid var(--borda)', borderRadius: 10, color: 'var(--texto)', padding: '10px 14px', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => {
                setErro(null)
                setCampoComErro(null)
                setConfirmandoExclusao(false)
                setClonando(true)
                // Item 6: os campos já estão preenchidos (vieram da edição) —
                // só falta acrescentar o sufixo na descrição, já que o efeito
                // de carregamento acima não roda de novo (`carregado` já é
                // `true` neste ponto).
                setDescricao((atual) => (atual.endsWith(' - Copia') ? atual : `${atual} - Copia`))
              }}
            >
              Clonar este lançamento
            </button>
            <p className="texto-fraco" style={{ margin: '6px 0 0', fontSize: 12 }}>
              Abre uma cópia já preenchida pra editar e salvar como lançamento novo.
            </p>
          </div>
        )}

        {editando && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--borda)', paddingTop: 12 }}>
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--vermelho)', cursor: 'pointer', padding: 0 }}
              onClick={() => { setEscopoExclusao('este'); setConfirmandoExclusao(true) }}
            >
              Excluir lançamento
            </button>
          </div>
        )}
      </div>

      {/* Item 8 (16/09/2026): a pergunta de escopo de exclusão (série
          fixa/parcelada) virava um bloco inline no rodapé da tela — agora é
          um popup de verdade, no mesmo padrão `.modal-fundo`/`.modal-conteudo`
          já usado em outras confirmações do app (ex.: `ItemLancamentoAcoes`). */}
      {editando && confirmandoExclusao && (
        <div className="modal-fundo" onClick={() => setConfirmandoExclusao(false)} style={{ alignItems: 'center' }}>
          <div className="modal-conteudo" style={{ borderRadius: 16 }} onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: 0 }}>Excluir este lançamento? Essa ação não pode ser desfeita.</p>
            {ehTransferenciaExistente && (
              <p className="texto-fraco" style={{ margin: '8px 0 0' }}>
                Isso exclui os dois lados da transferência.
              </p>
            )}
            {!ehTransferenciaExistente && original?.serieId && (
              <div style={{ margin: '10px 0 0' }}>
                <p className="texto-fraco" style={{ margin: '0 0 6px' }}>
                  Este lançamento faz parte de uma série. O que excluir?
                </p>
                {/* Item 4 (16/09/2026): reescrito no mesmo padrão visual das
                    listas de escolha já existentes no app (`.folha-escolha-item`)
                    — linha inteira clicável, radio e rótulo imediatamente
                    adjacentes. Antes o radio herdava `width: 100%` da regra
                    genérica `input, select { width: 100% }` (index.css) dentro
                    de um `label` flex, esticando-se e empurrando o texto pra
                    longe — corrigido com `.opcao-escopo-item input` (largura
                    fixa, `flex: 0 0 auto`). */}
                <div className="lista-opcoes-escopo">
                  {(['este', 'futuros', 'serie'] as const).map((opcao) => (
                    <label
                      key={opcao}
                      className={`opcao-escopo-item${escopoExclusao === opcao ? ' ativo' : ''}`}
                    >
                      <input
                        type="radio"
                        name="escopo-exclusao"
                        checked={escopoExclusao === opcao}
                        onChange={() => setEscopoExclusao(opcao)}
                      />
                      <span>
                        {opcao === 'este' && 'Só este lançamento'}
                        {opcao === 'futuros' && 'Este e os futuros da série'}
                        {opcao === 'serie' && 'Toda a série (incluindo os já passados)'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="acoes-modal" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="secundario"
                onClick={() => setConfirmandoExclusao(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="perigo"
                style={{ width: 'auto', marginTop: 0 }}
                onClick={excluir}
                data-testid="confirmar-exclusao"
              >
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
