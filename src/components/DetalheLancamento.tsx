import { useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowPathRoundedSquareIcon } from '@heroicons/react/24/outline'
import { db, naturezaEhEntrada, type Conta, type Periodicidade, type RegraRecorrencia, type Lancamento } from '../db'
import { gerarIdSerie, gerarParcelas, reprocessarSerieAPartirDe, ROTULOS_PERIODICIDADE, NOMES_DIA_SEMANA } from '../recorrencia'
import { fmtBRL, fmtNum, formatarMoeda, aplicarMascaraValor, paraNumero } from '../formatoMoeda'
import SeletorCategoriaComIcone from './SeletorCategoriaComIcone'
import MemoriaDescricao from './MemoriaDescricao'
import ConfirmacaoAcao from './ConfirmacaoAcao'
import MenuLinha from './MenuLinha'
import FolhaOpcoes from './FolhaOpcoes'
import { ChipConta, CampoConta } from './SeletorConta'
import { lerDoAmbiente, marcaDoAmbiente } from '../ambiente'
import { hojeEfetivoISO } from '../hojeSimulado'
import { DIA_FECHAMENTO_PADRAO, mesFaturaDaData, rotuloFatura, situacaoDaFatura } from '../faturaCiclo'
import { reavaliarQuitacao } from '../faturaPagamento'
import { obterOuCriarCategoriaPagamentoFatura } from '../categoriasSistema'
import { somarMes, type PagamentoFaturaAbertura } from '../mes'
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
  pagamentoFatura,
  onFechar,
}: {
  alvoId?: number
  /* Build 090 (decisão do Rafael, 17/09/2026): o formulário abre já como
     PAGAMENTO de uma fatura — vindo do botão "Pagar esta fatura" da Carteira.
     Cartão, fatura e categoria ficam decididos (mostrados num bloco fixo, não
     em campos); a pessoa só confere conta, valor e data. Na EDIÇÃO de um
     pagamento existente o mesmo bloco aparece, lido de
     `original.faturaCartaoId`/`faturaMes` — inclusão e edição são a mesma
     tela. */
  pagamentoFatura?: PagamentoFaturaAbertura
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

  /* Modo PAGAMENTO DE FATURA (build 090). `cartaoIdFatura`/`mesFatura` vêm
     da abertura (criação) ou do próprio registro (edição). */
  const cartaoIdFatura = pagamentoFatura?.cartaoId ?? original?.faturaCartaoId
  const mesFatura = pagamentoFatura?.mesFatura ?? original?.faturaMes
  const modoPagamentoFatura = cartaoIdFatura != null && !!mesFatura
  const todosParaFatura = useLiveQuery(
    () => (modoPagamentoFatura ? lerDoAmbiente(db.lancamentos.toArray()) : Promise.resolve(undefined)),
    [modoPagamentoFatura],
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
  /* Pré-preenchimento do PAGAMENTO DE FATURA na criação (build 090) — roda
     uma vez, assim que as contas carregam: descrição, valor que falta, saída,
     conta de pagamento padrão do cartão (ou a primeira que não é cartão). */
  const [preenchidoFatura, setPreenchidoFatura] = useState(false)
  /* ---- Build 099: a tela do relatório de revisão (aprovado pelo Rafael) ----
     Estado só de APRESENTAÇÃO — nenhuma regra de gravação mudou. */
  const [menuAberto, setMenuAberto] = useState(false)          // o "⋮" do cabeçalho (E-09)
  const [painelRepetir, setPainelRepetir] = useState(false)    // "↻ Repetir…" (E-06)
  const [folhaFatura, setFolhaFatura] = useState(false)        // chip "na fatura de…" (V-06)
  const [folhaPeriodicidade, setFolhaPeriodicidade] = useState(false)
  const [folhaRegra, setFolhaRegra] = useState(false)
  const [folhaDiaSemana, setFolhaDiaSemana] = useState(false)
  const [abrirCategoriaPedido, setAbrirCategoriaPedido] = useState(0) // encadeamento (E-03)
  const [salvando, setSalvando] = useState(false)              // Salvar com estado ocupado (V-05)
  const [origemSugestao, setOrigemSugestao] = useState<string | null>(null) // "vieram do último…" (E-08)
  const [contaPadraoAplicada, setContaPadraoAplicada] = useState(false)     // conta padrão explícita (E-02)
  const dataInputRef = useRef<HTMLInputElement>(null)
  const salvarRef = useRef<HTMLButtonElement>(null)
  /* E-02: a conta padrão é a MAIS USADA nos últimos 30 dias (empate: a mais
     recente) — nunca mais "a primeira cadastrada" em silêncio. */
  const recentes = useLiveQuery(
    () => lerDoAmbiente(db.lancamentos.where('dataCompetencia').aboveOrEqual(diasAtrasISO(30)).toArray()),
    [],
  )

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

  if (pagamentoFatura && !preenchidoFatura && contas && alvoId == null) {
    const cartao = contas.find((c) => c.id === pagamentoFatura.cartaoId)
    setDescricao(`Pagamento fatura ${cartao?.nome ?? ''}`.trim())
    setValor(pagamentoFatura.valorSugerido > 0 ? formatarMoeda(pagamentoFatura.valorSugerido) : '')
    setTipo('saida')
    setRecorrencia('unico')
    const origem =
      cartao?.contaPagamentoPadraoId ?? contas.find((c) => c.ativa && c.tipo !== 'cartao' && c.id !== cartao?.id)?.id ?? ''
    setContaId(origem)
    setPreenchidoFatura(true)
  }

  /* E-02 — só na CRIAÇÃO comum (não em edição, clone, pagamento de fatura,
     nem quando a notificação mandou a conta em branco ou já sugeriu uma). */
  if (!contaPadraoAplicada && contas && recentes && alvoId == null && !pagamentoFatura && !contaEmBranco && contaIdSugerida == null) {
    if (contaId === '') {
      const ativas = contas.filter((c) => c.ativa)
      const padrao = contaMaisUsada(recentes, ativas) ?? ativas[0]
      if (padrao?.id != null) setContaId(padrao.id)
    }
    setContaPadraoAplicada(true)
  }

  if (editando && original === undefined) return null // ainda carregando
  if (editando && ehTransferenciaExistente && parTransferencia === undefined) return null // ainda carregando o par

  const categoriaAtual = original ? categorias?.find((c) => c.id === original.categoriaId) : undefined
  // Item 12: categoria escolhida AGORA no formulário (não a do original) —
  // é ela que decide se os campos de cartão/mês da fatura aparecem.
  const cartaoDaFatura = modoPagamentoFatura ? (contas ?? []).find((c) => c.id === cartaoIdFatura) : undefined
  const situacaoFatura =
    modoPagamentoFatura && cartaoDaFatura && todosParaFatura && categorias
      ? situacaoDaFatura(todosParaFatura, (id) => categorias.find((c) => c.id === id), cartaoDaFatura, mesFatura!)
      : null
  /* Fora do modo pagamento, a categoria "Pagamento de fatura" NÃO é
     escolhível à mão (decisão do Rafael, build 090): quem quer pagar uma
     fatura usa o botão dela na Carteira. Se um registro antigo já está nessa
     categoria, ela continua aparecendo pra ele (pra dar pra ver e trocar). */
  const categoriasEscolhiveisBase = (categorias ?? []).filter(
    (c) => (c.ativa || c.id === categoriaAtual?.id) && (c.natureza !== 'Pagamento de fatura' || c.id === categoriaAtual?.id),
  )
  /* Build 099, item E-01 (pedido do Rafael): a lista SABE qual aba está
     aberta. Saída oferece só as de saída; Entrada só as de natureza Receita;
     Transferência oferece todas (as duas pernas podem ser de qualquer
     natureza, decisão de 31/08). A categoria do registro aberto continua
     aparecendo mesmo que "não devesse" — pra dar pra ver e trocar. */
  const categoriasEscolhiveis = categoriasEscolhiveisBase.filter((c) => {
    if (c.id === categoriaAtual?.id || tipo === 'transferencia') return true
    return tipo === 'entrada' ? c.natureza === 'Receita' : c.natureza !== 'Receita'
  })
  const contaSelecionada = (contas ?? []).find((c) => c.id === (contaEmBranco ? contaId : contaId || contas?.[0]?.id))
  const contaSelecionadaEhCartao = contaSelecionada?.tipo === 'cartao'
  /* "Em qual fatura" com nome de gente (build 090): a data da compra decide
     a fatura "pela data" (`mesFaturaDaData`), e as opções são as três
     vizinhas em ordem cronológica, cada uma chamada pelo mês em que fecha e
     pela data de vencimento. */
  const mesFaturaPelaData =
    contaSelecionadaEhCartao && data
      ? mesFaturaDaData(contaSelecionada!.diaFechamento ?? DIA_FECHAMENTO_PADRAO, data)
      : undefined
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
  const podeEscolherRecorrencia = tipo !== 'transferencia' && !modoPagamentoFatura

  function trocarAba(novaAba: TipoLancamento) {
    if (novaAba === 'transferencia' && contaOrigemId === '') {
      setContaOrigemId(contaId || (contas?.[0]?.id ?? ''))
    }
    /* E-01: trocar de aba com uma categoria incompatível escolhida LIMPA o
       campo — nunca grava receita com valor negativo. */
    if (novaAba !== 'transferencia' && categoriaId !== '') {
      const c = (categorias ?? []).find((x) => x.id === categoriaId)
      const compativel = c && (novaAba === 'entrada' ? c.natureza === 'Receita' : c.natureza !== 'Receita')
      if (!compativel) setCategoriaId('')
    }
    /* Correção 18/09/2026 — a rodada de UI/UX da build 099 reintroduziu por
       engano o que a Decisão de 31/08/2026 já tinha eliminado: as duas
       categorias da transferência nascendo pré-preenchidas com uma categoria
       "neutra"/de sistema e escondidas atrás de um botão "categorizar cada
       lado". Rafael apontou de novo: a categoria de cada perna não tem
       default nenhum (não é obrigatória nem comum usar "Transferência" —
       o comum é uma categoria de saída de um lado e uma de entrada do
       outro) e os dois campos ficam sempre visíveis, nunca escondidos. O
       que marca o lançamento como transferência é o tipo escolhido no topo
       (a aba) + o `transferenciaId` compartilhado pelas duas pernas — a
       categoria nunca é a referência disso. Por isso aqui não preenche mais
       nada: os dois campos começam vazios e a pessoa escolhe, cada um
       filtrado pela lista de categorias do lado certo (saída/entrada). */
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
    /* E-10: além da borda, rola até o campo e dá o foco — e a mensagem é
       renderizada AO LADO do campo (ver `erroDe()` no JSX), não no botão. */
    window.setTimeout(() => {
      const ids: Record<string, string> = {
        contaOrigem: 'dl-conta-origem', contaDestino: 'dl-conta-destino',
        categoriaOrigem: 'dl-categoria-origem', categoriaDestino: 'dl-categoria-destino',
        conta: 'dl-conta', categoria: 'dl-categoria', valor: 'dl-valor', data: 'dl-data-chip',
      }
      const el = document.getElementById(ids[campo] ?? `dl-${campo}`)
      if (!el) return
      el.scrollIntoView({ block: 'center' })
      ;(el as HTMLElement).focus?.()
    }, 0)
  }

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (salvando) return
    setErro(null)
    setCampoComErro(null)
    setSalvando(true)
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
    } finally {
      setSalvando(false)
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
    /* No pagamento de fatura a tela de origem (Carteira) está olhando a
       FATURA, não o mês da data do pagamento — fica onde está. */
    aoMudarMes?.(modoPagamentoFatura ? mesFatura! : data.slice(0, 7))
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
    let categoriaFinal: number
    if (modoPagamentoFatura) {
      categoriaFinal = await obterOuCriarCategoriaPagamentoFatura()
    } else {
      if (!categoriaId) {
        erroCampo('categoria', 'Escolha uma categoria.')
        return
      }
      categoriaFinal = Number(categoriaId)
    }
    if (modoPagamentoFatura && contaEscolhidaId === cartaoIdFatura) {
      erroCampo('conta', 'A fatura não pode ser paga com o próprio cartão.')
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
    /* Build 090: o pagamento carrega qual fatura está pagando. */
    const patchPagamentoFatura = modoPagamentoFatura
      ? { faturaCartaoId: cartaoIdFatura, faturaMes: mesFatura }
      : {}

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
          categoriaId: categoriaFinal,
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
            categoriaId: categoriaFinal,
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
          categoriaId: categoriaFinal,
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
              categoriaId: categoriaFinal,
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
          categoriaId: categoriaFinal,
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
        categoriaId: categoriaFinal,
        contaId: contaEscolhidaId,
        pago,
        ...patchFaturaOverride,
        ...patchPagamentoFatura,
      })
      if (modoPagamentoFatura) await reavaliarQuitacao(cartaoIdFatura!, mesFatura!)
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
          categoriaId: categoriaFinal,
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
        categoriaId: categoriaFinal,
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

    await db.lancamentos.add({
      ...marcaDoAmbiente(),
      dataCompetencia: data,
      dataCaixa: data,
      descricao: descricao || '(sem descrição)',
      descricaoOriginal: descricaoOriginalFixa ?? (descricao || '(sem descrição)'),
      valor: valorComSinal,
      contaId: contaEscolhidaId,
      pagoPor: 'conta',
      categoriaId: categoriaFinal,
      status: 'manual',
      pago,
      ...patchFaturaOverride,
      ...patchPagamentoFatura,
    })

    /* Build 090: gravou um pagamento de fatura → reavalia a fatura. Quitada
       (nada mais a pagar) marca as compras do ciclo como pagas; pagar uma
       parte não marca nada — ver `faturaPagamento.ts`. */
    if (modoPagamentoFatura) await reavaliarQuitacao(cartaoIdFatura!, mesFatura!)

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
    /* Build 090: excluir um pagamento reabre a fatura na Carteira (o que
       falta pagar volta a contar esse valor). */
    if (modoPagamentoFatura) await reavaliarQuitacao(cartaoIdFatura!, mesFatura!)
    onFechar()
  }

  const numeroPreview = paraNumero(valor)
  const parcelasPreview =
    recorrencia === 'parcelado' && numeroPreview > 0
      ? gerarParcelas(data, numeroPreview, Math.max(2, Math.round(Number(parcelaN)) || 2))
      : []

  const usaDiaDoMes = periodicidade === 'mensal' || periodicidade === 'semestral'

  /* ---------------------------------------------------------------------
     BUILD 099 (18/09/2026) — A TELA DO RELATÓRIO DE REVISÃO, aplicada.
     Rafael: "protótipo aprovado" — com dois ajustes dele: os chips (Data ·
     Conta · Já saiu · Parcela · Veio do…) mais centralizados e bem
     distribuídos nas linhas propostas, e o rodapé "Repetir" maior e mais
     visível. Nenhuma regra de gravação mudou: só o que está visível por
     padrão e o tamanho de cada coisa (ver `Revisão UI - Tela de Lançamento
     17-09-2026.html`, 07 - Gestão). Itens E-01 a E-11 e V-01 a V-08.
     --------------------------------------------------------------------- */
  const contasAtivas = (contas ?? []).filter((c) => (c.ativa || c.id === original?.contaId) && !(modoPagamentoFatura && c.id === cartaoIdFatura))
  const hojeISO = hojeEfetivoISO()
  const rotuloData = rotuloDeData(data, hojeISO)
  const dataForaDeHoje = data !== hojeISO
  /* E-05: "já foi pago" vira chip de ESTADO. Em cartão o chip diz "no cartão"
     e não é editável — a regra que já vale no resto do app (build 064). */
  const chipPago = (() => {
    if (tipo !== 'transferencia' && contaSelecionadaEhCartao && !modoPagamentoFatura) {
      return { texto: 'no cartão', editavel: false, ativo: true }
    }
    const t = tipo === 'entrada' ? (pago ? 'já entrou' : 'ainda vai entrar') : tipo === 'transferencia' ? (pago ? 'já concluída' : 'ainda vai') : pago ? 'já saiu da conta' : 'ainda vai sair'
    return { texto: t, editavel: true, ativo: pago }
  })()
  const nomeFatura = (m: string) => rotuloFatura(contaSelecionada!, m).replace('Fatura de ', '').split(' (')[0]
  const titulo = modoPagamentoFatura
    ? editando ? 'Editar pagamento de fatura' : 'Pagar fatura'
    : clonando ? 'Clonar lançamento'
      : `${editando ? 'Editar' : 'Nova'} ${tipo === 'saida' ? 'saída' : tipo === 'entrada' ? 'entrada' : 'transferência'}`
  /* E-11: chips de IDENTIDADE no topo da edição — informação, não controle. */
  const chipsIdentidade: string[] = []
  if (editando && original) {
    if (original.recorrencia === 'parcelado' && original.parcelaN) chipsIdentidade.push(`parcela ${original.parcelaI}/${original.parcelaN}`)
    if (original.recorrencia === 'fixo' && original.periodicidade) chipsIdentidade.push(`fixo ${ROTULOS_PERIODICIDADE[original.periodicidade].toLowerCase()}`)
    if (ehTransferenciaExistente) chipsIdentidade.push('transferência entre contas')
    if (original.vinculoOrigem) chipsIdentidade.push(`veio do ${original.vinculoOrigem.app || (original.vinculoOrigem.origem === 'notificacao' ? 'banco' : 'arquivo')}`)
    if (modoPagamentoFatura && cartaoDaFatura && mesFatura) chipsIdentidade.push(`paga a fatura de ${nomeFatura(mesFatura)}`)
    else if (contaSelecionadaEhCartao && mesFaturaPelaData) {
      const efetivo = faturaOverride === 'anterior' ? somarMes(mesFaturaPelaData, -1) : faturaOverride === 'proxima' ? somarMes(mesFaturaPelaData, 1) : mesFaturaPelaData
      chipsIdentidade.push(`na fatura de ${nomeFatura(efetivo)}`)
    }
  }
  const erroDe = (campo: string) =>
    erro && campoComErro === campo ? (
      <p className="dl-erro valor-neg" role="alert" data-testid={`erro-${campo}`}>{erro}</p>
    ) : null
  const mudarData = (nova: string) => {
    if (!nova) return
    setData(nova)
    // Item 13: recalcula o padrão de "já pago" só na criação e só se a
    // pessoa ainda não mexeu manualmente no chip.
    if (!editando && !pagoTocadoManualmente) setPago(nova <= hojeEfetivoISO())
  }
  const rotuloRepetir = recorrencia === 'fixo'
    ? `Repete: ${ROTULOS_PERIODICIDADE[periodicidade].toLowerCase()}${usaDiaDoMes ? (tipoRegra === 'diaFixo' ? `, dia ${diaFixo || '?'}` : `, ${diaUtil || '?'}º dia útil`) : `, ${NOMES_DIA_SEMANA[Number(diaSemana)] ?? ''}`}`
    : recorrencia === 'parcelado'
      ? `Parcelado em ${Math.max(2, Math.round(Number(parcelaN)) || 2)}×`
      : 'Repetir…'
  const abrirClonagem = () => {
    setMenuAberto(false)
    setErro(null)
    setCampoComErro(null)
    setConfirmandoExclusao(false)
    setClonando(true)
    // Item 6: os campos já estão preenchidos (vieram da edição) — só falta
    // acrescentar o sufixo na descrição, já que o efeito de carregamento não
    // roda de novo (`carregado` já é `true` neste ponto).
    setDescricao((atual) => (atual.endsWith(' - Copia') ? atual : `${atual} - Copia`))
  }

  return (
    <div className="modal-fundo" onClick={onFechar}>
      <div className="modal-conteudo dl-modal" onClick={(e) => e.stopPropagation()} data-testid="detalhe-lancamento">
        {/* V-03: título forte, "✕" secundário com alvo de 44px (V-02). E-09: o
            "⋮" leva as três ações de exceção da edição. */}
        <div className="dl-cabecalho">
          <h2 className="dl-titulo" data-testid="dl-titulo">{titulo}</h2>
          {editando && original && (
            <MenuLinha aberto={menuAberto} onAbrirFechar={() => setMenuAberto((v) => !v)} onFechar={() => setMenuAberto(false)} zIndex={120} rotulo="Mais ações do lançamento">
              <button type="button" data-testid="menu-vinculo" onClick={() => { setMenuAberto(false); setMostrarVinculo((v) => !v) }}>
                {mostrarVinculo ? 'Ocultar dados de vínculo' : 'Dados de vínculo'}
              </button>
              {!ehTransferenciaExistente && !modoPagamentoFatura && (
                <button type="button" data-testid="menu-clonar" onClick={abrirClonagem}>Clonar este lançamento</button>
              )}
              <button type="button" className="dl-menu-perigo" data-testid="menu-excluir" onClick={() => { setMenuAberto(false); setEscopoExclusao('este'); setConfirmandoExclusao(true) }}>
                Excluir lançamento
              </button>
            </MenuLinha>
          )}
          <button type="button" onClick={onFechar} aria-label="Fechar" className="dl-fechar">✕</button>
        </div>

        {chipsIdentidade.length > 0 && (
          <div className="dl-chips dl-chips-identidade" data-testid="chips-identidade">
            {chipsIdentidade.map((c) => (
              <span key={c} className="dl-chip dl-chip-info">{c}</span>
            ))}
          </div>
        )}

        {clonando && (
          <div className="dl-aviso-clone">
            Você está clonando este lançamento — salvar cria um <strong>novo</strong>, sem tocar no original.
            <button type="button" className="dl-link" onClick={() => setClonando(false)}>Cancelar clonagem</button>
          </div>
        )}

        {jaTemSerie && !chipsIdentidade.length && (
          <p className="texto-fraco" style={{ marginTop: 0 }}>Edita só esta ocorrência.</p>
        )}

        {/* Build 090 — o que já está decidido no pagamento de fatura fica num
            bloco fixo, não em campos: cartão, qual fatura, quanto falta e que
            é "Pagamento de fatura" (fora de Entrou/Saiu). Inclusão e edição
            mostram o MESMO bloco. V-07: a classe agora TEM definição. */}
        {modoPagamentoFatura && (
          <div className="bloco-fatura-pagamento" data-testid="bloco-fatura">
            <strong data-testid="bloco-fatura-cartao">{cartaoDaFatura?.nome ?? 'Cartão'}</strong>
            <div data-testid="bloco-fatura-nome">{cartaoDaFatura ? rotuloFatura(cartaoDaFatura, mesFatura!) : ''}</div>
            {situacaoFatura && (
              <div className="texto-fraco" style={{ fontSize: 12.5, marginTop: 4 }} data-testid="bloco-fatura-situacao">
                Fatura {fmtBRL(situacaoFatura.total)}
                {Math.abs(situacaoFatura.residuoAnterior) >= 0.005 ? ` · resíduo anterior ${situacaoFatura.residuoAnterior > 0 ? '+' : '−'}${fmtBRL(Math.abs(situacaoFatura.residuoAnterior))}` : ''}
                {situacaoFatura.pago > 0 ? ` · já pago ${fmtBRL(situacaoFatura.pago)}` : ''}
                {situacaoFatura.quitada
                  ? ' · fatura paga'
                  : ` · falta ${fmtBRL(Math.max(situacaoFatura.restante, 0))}`}
              </div>
            )}
            <div className="texto-fraco" style={{ fontSize: 12, marginTop: 4 }}>
              Entra como <strong>Pagamento de fatura</strong>: fica fora de Entrou/Saiu, porque cada compra já
              contou quando foi feita. Pode pagar uma parte — o que faltar vai para a próxima fatura.
            </div>
          </div>
        )}

        {/* Abas de tipo — V-01: trilho com contraste real; V-02: 44px. */}
        {!modoPagamentoFatura && (
          <div role="tablist" className="dl-abas">
            {ABAS.map((aba) => (
              <button
                key={aba.valor}
                type="button"
                role="tab"
                aria-selected={tipo === aba.valor}
                disabled={jaTemSerie || (ehTransferenciaExistente && aba.valor !== 'transferencia')}
                onClick={() => trocarAba(aba.valor)}
                className={`dl-aba ${tipo === aba.valor ? 'ativa' : ''}`}
                data-testid={`aba-${aba.valor}`}
              >
                {aba.rotulo}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={salvar} noValidate>
          {/* V-04: o Valor em destaque, com o "R$" desenhado dentro do campo. */}
          <label htmlFor="dl-valor" className="dl-rotulo">Quanto</label>
          <div className="dl-valor-wrap">
            <span className="dl-valor-prefixo" aria-hidden="true">R$</span>
            <input
              id="dl-valor"
              type="text"
              inputMode="numeric"
              autoFocus
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(aplicarMascaraValor(e.target.value))}
              onKeyDown={(e) => {
                /* E-03: concluir o valor leva ao próximo campo sempre preenchido. */
                if (e.key === 'Enter') { e.preventDefault(); document.getElementById('dl-descricao')?.focus() }
              }}
              className={`dl-valor ${campoComErro === 'valor' ? 'campo-com-erro' : ''}`}
              data-testid="dl-valor"
            />
          </div>
          {erroDe('valor')}

          {/* E-04 · E-02 · E-05: Data · Conta · Já saiu como CHIPS, centralizados
              e distribuídos na linha (ajuste do Rafael sobre o protótipo). */}
          <div className="dl-chips" data-testid="chips-estado">
            <span className={`dl-chip dl-chip-data ${dataForaDeHoje ? 'dl-chip-atencao' : 'dl-chip-on'}`} id="dl-data-chip" data-testid="chip-data">
              <button type="button" className="dl-chip-seta" aria-label="Um dia antes" onClick={() => mudarData(somarDias(data, -1))} data-testid="chip-data-antes">‹</button>
              <button
                type="button"
                className="dl-chip-texto"
                onClick={() => {
                  const el = dataInputRef.current
                  if (!el) return
                  if (typeof el.showPicker === 'function') { try { el.showPicker() } catch { el.focus() } } else { el.focus(); el.click() }
                }}
                title="Escolher a data no calendário"
                data-testid="chip-data-abrir"
              >
                {rotuloData}
              </button>
              <button type="button" className="dl-chip-seta" aria-label="Um dia depois" onClick={() => mudarData(somarDias(data, 1))} data-testid="chip-data-depois">›</button>
              <input
                ref={dataInputRef}
                id="dl-data"
                type="date"
                className="dl-data-oculta"
                value={data}
                onChange={(e) => mudarData(e.target.value)}
                aria-label="Data"
                tabIndex={-1}
              />
            </span>
            {tipo !== 'transferencia' && (contasAtivas.length > 1 || contaEmBranco || modoPagamentoFatura) && (
              <ChipConta
                id="dl-conta"
                contas={contasAtivas}
                valor={contaEmBranco ? contaId : contaId || (contas?.[0]?.id ?? '')}
                onEscolher={(id) => setContaId(id)}
                prefixo={modoPagamentoFatura ? 'pago com' : tipo === 'entrada' ? 'no' : 'no'}
                comErro={campoComErro === 'conta'}
              />
            )}
            <button
              type="button"
              className={`dl-chip ${chipPago.ativo ? 'dl-chip-on' : ''} ${chipPago.editavel ? '' : 'dl-chip-fixo'}`}
              disabled={!chipPago.editavel}
              onClick={() => { setPagoTocadoManualmente(true); setPago((v) => !v) }}
              title={chipPago.editavel ? 'Toque para inverter' : 'Compra de cartão: quem paga é a fatura'}
              data-testid="chip-pago"
              aria-pressed={chipPago.ativo}
            >
              {chipPago.texto}
            </button>
            {tipo !== 'transferencia' && !modoPagamentoFatura && contaSelecionadaEhCartao && mesFaturaPelaData && (
              <button type="button" className="dl-chip" onClick={() => setFolhaFatura(true)} data-testid="chip-fatura" title="Em qual fatura esta compra entra">
                na fatura de {nomeFatura(faturaOverride === 'anterior' ? somarMes(mesFaturaPelaData, -1) : faturaOverride === 'proxima' ? somarMes(mesFaturaPelaData, 1) : mesFaturaPelaData)}
                <span className="dl-chip-editar" aria-hidden="true">✎</span>
              </button>
            )}
          </div>
          {erroDe('conta')}
          {erroDe('data')}
          {folhaFatura && contaSelecionada && mesFaturaPelaData && (
            <FolhaOpcoes
              titulo="Em qual fatura"
              testid="folha-fatura"
              valor={faturaOverride}
              onEscolher={(v) => setFaturaOverride(v)}
              onFechar={() => setFolhaFatura(false)}
              opcoes={[
                { valor: 'anterior' as const, rotulo: rotuloFatura(contaSelecionada, somarMes(mesFaturaPelaData, -1)).split(' (')[0], sub: rotuloFatura(contaSelecionada, somarMes(mesFaturaPelaData, -1)).split(' (')[1]?.replace(')', '') },
                { valor: 'atual' as const, rotulo: `${rotuloFatura(contaSelecionada, mesFaturaPelaData).split(' (')[0]} — pela data`, sub: rotuloFatura(contaSelecionada, mesFaturaPelaData).split(' (')[1]?.replace(')', '') },
                { valor: 'proxima' as const, rotulo: rotuloFatura(contaSelecionada, somarMes(mesFaturaPelaData, 1)).split(' (')[0], sub: rotuloFatura(contaSelecionada, somarMes(mesFaturaPelaData, 1)).split(' (')[1]?.replace(')', '') },
              ]}
              rodape={<p className="texto-fraco" style={{ padding: '8px 10px', margin: 0, fontSize: 12 }}>Pela data, a compra entra na fatura marcada. Troque só se o banco lançou em outra.</p>}
            />
          )}

          <label htmlFor="dl-descricao" className="dl-rotulo">O Que Foi</label>
          <div
            onKeyDown={(e) => {
              /* E-03: Enter em "O que foi" abre a categoria sozinho. */
              if (e.key === 'Enter') { e.preventDefault(); if (tipo !== 'transferencia' && categoriaId === '') setAbrirCategoriaPedido((n) => n + 1); else salvarRef.current?.focus() }
            }}
          >
            <MemoriaDescricao
              id="dl-descricao"
              placeholder="Ex.: Mercado"
              valor={descricao}
              onMudar={(v) => { setDescricao(v); if (origemSugestao) setOrigemSugestao(null) }}
              onEscolher={(s) => {
                setDescricao(s.descricao)
                /* E-08: a sugestão traz categoria e conta da última vez, e a
                   tela DIZ o que preencheu. Nunca sobrescreve com vazio. */
                const trouxe: string[] = []
                if (s.categoriaId != null) { setCategoriaId(s.categoriaId); trouxe.push('categoria') }
                if (s.contaId != null) { setContaId(s.contaId); trouxe.push('conta') }
                setOrigemSugestao(trouxe.length ? `${trouxe.join(' e ')} ${trouxe.length > 1 ? 'vieram' : 'veio'} do último "${s.descricao}"` : null)
                if (s.categoriaId != null) window.setTimeout(() => salvarRef.current?.focus(), 0)
                else if (tipo !== 'transferencia') setAbrirCategoriaPedido((n) => n + 1)
              }}
            />
          </div>
          {origemSugestao && <p className="dl-origem-sugestao" data-testid="origem-sugestao">{origemSugestao}</p>}

          {tipo === 'transferencia' ? (
            <>
              {/* Correção 18/09/2026: as duas categorias da transferência
                  SEMPRE visíveis (nunca escondidas atrás de um botão) e SEM
                  default — a pessoa escolhe cada lado livremente, como faria
                  num lançamento comum. Cada campo só lista as categorias do
                  tipo certo: origem = categorias de saída (tudo que não é
                  Receita), destino = categorias de entrada (natureza
                  Receita) — é essa lista, não uma categoria fixa de sistema,
                  que guia a escolha. O que marca o lançamento como
                  transferência é a aba escolhida no topo + o
                  `transferenciaId` das duas pernas, nunca a categoria. */}
              <label htmlFor="dl-conta-origem" className="dl-rotulo">De Onde Sai</label>
              <CampoConta id="dl-conta-origem" titulo="Conta de origem" contas={(contas ?? []).filter((c) => c.ativa || c.id === contaOrigemId)} valor={contaOrigemId} onEscolher={setContaOrigemId} comErro={campoComErro === 'contaOrigem'} testid="campo-conta-origem" />
              {erroDe('contaOrigem')}
              <label htmlFor="dl-conta-destino" className="dl-rotulo">Para Onde Vai</label>
              <CampoConta id="dl-conta-destino" titulo="Conta de destino" contas={(contas ?? []).filter((c) => c.ativa || c.id === contaDestinoId)} valor={contaDestinoId} onEscolher={setContaDestinoId} comErro={campoComErro === 'contaDestino'} testid="campo-conta-destino" />
              {erroDe('contaDestino')}
              {contaOrigemId !== '' && contaOrigemId === contaDestinoId && (
                <p className="dl-erro valor-neg">Escolha duas contas diferentes.</p>
              )}
              <label htmlFor="dl-categoria-origem" className="dl-rotulo">Categoria de Saída</label>
              <SeletorCategoriaComIcone id="dl-categoria-origem" categorias={(categorias ?? []).filter((c) => (c.ativa || c.id === categoriaOrigemId) && !naturezaEhEntrada(c.natureza))} valor={categoriaOrigemId} onEscolher={setCategoriaOrigemId} onLimpar={() => setCategoriaOrigemId('')} comErro={campoComErro === 'categoriaOrigem'} />
              {erroDe('categoriaOrigem')}
              <label htmlFor="dl-categoria-destino" className="dl-rotulo">Categoria de Entrada</label>
              <SeletorCategoriaComIcone id="dl-categoria-destino" categorias={(categorias ?? []).filter((c) => (c.ativa || c.id === categoriaDestinoId) && naturezaEhEntrada(c.natureza))} valor={categoriaDestinoId} onEscolher={setCategoriaDestinoId} onLimpar={() => setCategoriaDestinoId('')} comErro={campoComErro === 'categoriaDestino'} />
              {erroDe('categoriaDestino')}
            </>
          ) : (
            <>
              {!modoPagamentoFatura && (
                <>
                  <label htmlFor="dl-categoria" className="dl-rotulo">Categoria</label>
                  <SeletorCategoriaComIcone
                    id="dl-categoria"
                    categorias={categoriasEscolhiveis}
                    valor={categoriaId}
                    onEscolher={(id) => { setCategoriaId(id); window.setTimeout(() => salvarRef.current?.focus(), 0) }}
                    onLimpar={() => setCategoriaId('')}
                    comErro={campoComErro === 'categoria'}
                    abrirPedido={abrirCategoriaPedido}
                  />
                  <p className="dl-anota" data-testid="anota-categorias">
                    {categoriasEscolhiveis.length} {categoriasEscolhiveis.length === 1 ? 'opção' : 'opções'} — {tipo === 'entrada' ? 'só as de entrada' : 'só as de saída'}
                  </p>
                  {erroDe('categoria')}
                </>
              )}
              {modoPagamentoFatura && (
                <>
                  <label htmlFor="dl-conta" className="dl-rotulo">Pago Com</label>
                  <CampoConta id="dl-conta-campo" titulo="Pago com" contas={contasAtivas} valor={contaId || (contas?.[0]?.id ?? '')} onEscolher={(id) => setContaId(id)} comErro={campoComErro === 'conta'} testid="campo-conta-pagamento" />
                </>
              )}
            </>
          )}

          {/* E-06: recorrência recolhida atrás de "↻ Repetir…" — o painel
              abre no lugar, com as mesmas opções de sempre. Num lançamento
              que já pertence a uma série, o rodapé mostra a série e o painel
              vem já preenchido (salvar reprocessa a série, item 9). */}
          {podeEscolherRecorrencia && painelRepetir && (
            <div className="dl-painel-repetir" data-testid="painel-repetir">
              <div className="dl-segmentado" role="radiogroup" aria-label="Recorrência">
                {(['unico', 'fixo', 'parcelado'] as const).map((op) => (
                  <button key={op} type="button" role="radio" aria-checked={recorrencia === op} className={`dl-segmento ${recorrencia === op ? 'ativo' : ''}`} onClick={() => setRecorrencia(op)} data-testid={`recorrencia-${op}`}>
                    {op === 'unico' ? 'Não repete' : op === 'fixo' ? 'Fixo' : 'Parcelado'}
                  </button>
                ))}
              </div>
              {recorrencia === 'fixo' && (
                <>
                  <label className="dl-rotulo">Periodicidade</label>
                  <button type="button" className="campo-como-botao" onClick={() => setFolhaPeriodicidade(true)} data-testid="campo-periodicidade">
                    <span className="campo-como-botao-texto">{ROTULOS_PERIODICIDADE[periodicidade]}</span>
                    <span className="campo-como-botao-seta">›</span>
                  </button>
                  {folhaPeriodicidade && (
                    <FolhaOpcoes titulo="Periodicidade" testid="folha-periodicidade" valor={periodicidade} onFechar={() => setFolhaPeriodicidade(false)} onEscolher={(v) => setPeriodicidade(v)}
                      opcoes={(['semanal', 'quinzenal', 'mensal', 'semestral'] as Periodicidade[]).map((p) => ({ valor: p, rotulo: ROTULOS_PERIODICIDADE[p] }))} />
                  )}
                  {usaDiaDoMes ? (
                    <>
                      <label className="dl-rotulo">Regra do Dia</label>
                      <button type="button" className="campo-como-botao" onClick={() => setFolhaRegra(true)} data-testid="campo-regra">
                        <span className="campo-como-botao-texto">{tipoRegra === 'diaFixo' ? 'Dia fixo do mês' : 'Dia útil do mês'}</span>
                        <span className="campo-como-botao-seta">›</span>
                      </button>
                      {folhaRegra && (
                        <FolhaOpcoes titulo="Regra do dia" testid="folha-regra" valor={tipoRegra} onFechar={() => setFolhaRegra(false)} onEscolher={(v) => setTipoRegra(v)}
                          opcoes={[{ valor: 'diaFixo' as TipoRegraUI, rotulo: 'Dia fixo do mês' }, { valor: 'diaUtil' as TipoRegraUI, rotulo: 'Dia útil do mês' }]} />
                      )}
                      {tipoRegra === 'diaFixo' ? (
                        <input id="dl-dia-fixo" aria-label="Dia fixo do mês" type="number" min={1} max={31} value={diaFixo} onChange={(e) => setDiaFixo(e.target.value)} placeholder="ex.: 5" />
                      ) : (
                        <input id="dl-dia-util" aria-label="Dia útil do mês" type="number" min={1} max={23} value={diaUtil} onChange={(e) => setDiaUtil(e.target.value)} placeholder="ex.: 1 (primeiro dia útil)" />
                      )}
                    </>
                  ) : (
                    <>
                      <label className="dl-rotulo">Dia da Semana</label>
                      <button type="button" className="campo-como-botao" onClick={() => setFolhaDiaSemana(true)} data-testid="campo-dia-semana">
                        <span className="campo-como-botao-texto">{NOMES_DIA_SEMANA[Number(diaSemana)]}</span>
                        <span className="campo-como-botao-seta">›</span>
                      </button>
                      {folhaDiaSemana && (
                        <FolhaOpcoes titulo="Dia da semana" testid="folha-dia-semana" valor={diaSemana} onFechar={() => setFolhaDiaSemana(false)} onEscolher={(v) => setDiaSemana(v)}
                          opcoes={NOMES_DIA_SEMANA.map((nome, i) => ({ valor: String(i), rotulo: nome }))} />
                      )}
                    </>
                  )}
                  <p className="texto-fraco" style={{ marginTop: 8, marginBottom: 0 }}>
                    A próxima ocorrência é gerada automaticamente quando chegar a data — não precisa lançar de novo todo mês.
                  </p>
                </>
              )}
              {recorrencia === 'parcelado' && (
                <>
                  <label htmlFor="dl-parcela-n" className="dl-rotulo">Quantidade de Parcelas</label>
                  <input id="dl-parcela-n" type="number" min={2} max={60} value={parcelaN} onChange={(e) => setParcelaN(e.target.value)} />
                  {parcelasPreview.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <p className="texto-fraco" style={{ margin: '0 0 4px' }}>Prévia:</p>
                      {parcelasPreview.map((p) => (
                        <div key={p.parcelaI} className="texto-fraco" style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>{p.parcelaI}/{parcelasPreview.length} — {p.data.split('-').reverse().join('/')}</span>
                          <span>{fmtNum(p.valor)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Erro que não é de campo nenhum (ex.: falha do banco). */}
          {erro && !campoComErro && <p className="dl-erro valor-neg" role="alert">{erro}</p>}

          {/* V-05: rodapé simétrico — Cancelar à esquerda, Salvar à direita, a
              ordem que `ConfirmacaoAcao` fixou pro app inteiro (build 093).
              Salvar tem estado ocupado. */}
          <div className="acoes-modal">
            <button type="button" className="secundario" onClick={onFechar} disabled={salvando} data-testid="dl-cancelar">Cancelar</button>
            <button type="submit" className="primario" ref={salvarRef} disabled={salvando} data-testid="dl-salvar">{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>

          {/* O rodapé "↻ Repetir…" — maior e mais visível (ajuste do Rafael:
              "não é sem importância assim que possa passar despercebido; deve
              ser maior e chamar um pouco mais de atenção, não muito"). */}
          {podeEscolherRecorrencia && (
            <button
              type="button"
              className={`dl-repetir ${recorrencia !== 'unico' || painelRepetir ? 'ativo' : ''}`}
              onClick={() => setPainelRepetir((v) => !v)}
              aria-expanded={painelRepetir}
              data-testid="dl-repetir"
            >
              <ArrowPathRoundedSquareIcon width={20} height={20} aria-hidden="true" />
              <span>{rotuloRepetir}</span>
              <span className="dl-repetir-seta" aria-hidden="true">{painelRepetir ? '⌃' : '⌄'}</span>
            </button>
          )}
        </form>

        {/* DADOS DE VÍNCULO (build 080/081) — agora abertos pelo "⋮" (E-09).
            READ-ONLY de propósito: o valor deles é serem o registro NÃO
            editado do que o banco disse. */}
        {editando && original && mostrarVinculo && (
          <div className="texto-fraco dl-vinculo" style={{ fontSize: 12 }} data-testid="painel-vinculo">
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
                <div style={{ marginTop: 8 }}>
                  {confirmandoDesvinculo && (
                    <ConfirmacaoAcao
                      titulo="Desvincular este lançamento da notificação?"
                      testid="confirmacao-desvincular"
                      aviso={
                        <>
                          <p>A origem (texto do banco) é apagada deste lançamento e a notificação volta pra Pendentes.</p>
                          <p>O valor, a situação e a data do lançamento ficam como estão — se quiser mudá-los, edite aqui mesmo.</p>
                        </>
                      }
                      onCancelar={() => setConfirmandoDesvinculo(false)}
                      onConfirmar={() => {
                        void (async () => {
                          if (original.id == null) return
                          const r = await desvincularLancamento(original.id)
                          setConfirmandoDesvinculo(false)
                          setDesvincularAviso(
                            r.voltouParaPendentes
                              ? 'Vínculo desfeito. A notificação voltou pra Pendentes; o valor e a situação deste lançamento não foram alterados.'
                              : 'Vínculo desfeito. A notificação de origem não está mais no aparelho; o valor e a situação deste lançamento não foram alterados.',
                          )
                        })()
                      }}
                    />
                  )}
                  <button type="button" className="secundario" style={{ marginTop: 0, width: 'auto', padding: '8px 12px', fontSize: 12 }} data-testid="vinculo-desvincular" onClick={() => setConfirmandoDesvinculo(true)}>
                    Desvincular
                  </button>
                </div>
              </>
            ) : desvincularAviso ? (
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

      {/* Item 8 (16/09/2026): a pergunta de escopo de exclusão (série
          fixa/parcelada) é um popup de verdade — a confirmação única do app
          (`ConfirmacaoAcao`, build 093). */}
      {editando && confirmandoExclusao && (
        <ConfirmacaoAcao
          titulo={modoPagamentoFatura ? 'Excluir este pagamento de fatura?' : 'Excluir este lançamento?'}
          testid="confirmacao-excluir-lancamento"
          aviso={
            <>
              <p>
                {ehTransferenciaExistente
                  ? 'Os DOIS lados da transferência são apagados de vez e saem de todos os totais. Não dá pra desfazer.'
                  : modoPagamentoFatura
                    ? 'O pagamento é apagado de vez; a fatura volta a mostrar esse valor como "falta pagar". Não dá pra desfazer.'
                    : 'O lançamento é apagado de vez e sai de todos os totais. Não dá pra desfazer.'}
              </p>
              {!ehTransferenciaExistente && original?.serieId && (
                <p>Este lançamento faz parte de uma série — escolha abaixo o que excluir.</p>
              )}
            </>
          }
          onCancelar={() => setConfirmandoExclusao(false)}
          onConfirmar={() => void excluir()}
        >
          {!ehTransferenciaExistente && original?.serieId && (
            <div style={{ margin: '10px 0 0' }}>
              <div className="lista-opcoes-escopo">
                {(['este', 'futuros', 'serie'] as const).map((opcao) => (
                  <label key={opcao} className={`opcao-escopo-item${escopoExclusao === opcao ? ' ativo' : ''}`}>
                    <input type="radio" name="escopo-exclusao" checked={escopoExclusao === opcao} onChange={() => setEscopoExclusao(opcao)} />
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
        </ConfirmacaoAcao>
      )}
    </div>
  )
}

/* ---- Ajudantes só desta tela (build 099) ---- */

/** `AAAA-MM-DD` ± n dias, sem fuso: soma no calendário local. */
function somarDias(iso: string, n: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  const dt = new Date(a, m - 1, d + n)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

function diasAtrasISO(n: number): string {
  return somarDias(hojeEfetivoISO(), -n)
}

const DIAS_SEMANA_CURTO = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

/** O texto do chip de data: "Hoje", "Ontem", "Amanhã" ou "12/09 (sex)" — data
 *  diferente de hoje fica escrita por extenso, pra nunca passar despercebida. */
function rotuloDeData(iso: string, hojeISO: string): string {
  if (!iso) return 'Data'
  if (iso === hojeISO) return 'Hoje'
  if (iso === somarDias(hojeISO, -1)) return 'Ontem'
  if (iso === somarDias(hojeISO, 1)) return 'Amanhã'
  const [a, m, d] = iso.split('-').map(Number)
  const dia = new Date(a, m - 1, d).getDay()
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')} (${DIAS_SEMANA_CURTO[dia]})`
}

/** E-02: a conta mais usada nos últimos 30 dias; empate → a de uso mais recente. */
function contaMaisUsada(recentes: readonly Lancamento[], contas: readonly Conta[]): Conta | undefined {
  const uso = new Map<number, { n: number; ultima: string }>()
  for (const l of recentes) {
    const u = uso.get(l.contaId) ?? { n: 0, ultima: '' }
    u.n++
    if (l.dataCompetencia > u.ultima) u.ultima = l.dataCompetencia
    uso.set(l.contaId, u)
  }
  let melhor: Conta | undefined
  let melhorUso: { n: number; ultima: string } | undefined
  for (const c of contas) {
    const u = uso.get(c.id!)
    if (!u) continue
    if (!melhorUso || u.n > melhorUso.n || (u.n === melhorUso.n && u.ultima > melhorUso.ultima)) {
      melhor = c
      melhorUso = u
    }
  }
  return melhor
}
