// Lógica de recorrência (lançamento "fixo") e parcelamento — vive só aqui,
// nunca em Categoria (decisão do Rafael, 30/08/2026).
//
// Duas estratégias diferentes de propósito:
// - "fixo" (conta recorrente sem fim definido, ex.: aluguel) é gerado
//   DINAMICAMENTE por ciclo: cada vez que o app abre, avança a série até hoje.
//   Gerar tudo antecipadamente não faz sentido aqui porque não tem fim — não
//   dá pra saber "até quando" pré-gerar.
// - "parcelado" (compra com N parcelas, fim definido e conhecido no
//   cadastro) é ANTECIPADO: todas as N parcelas são gravadas de uma vez, cada
//   uma na sua data de competência — assim já aparecem nos meses futuros como
//   compromisso já contratado (mesmo conceito de "Parc. i/Parc. n/Restam" que
//   a planilha usa), sem precisar de nenhum job rodando depois.
import { db, type Lancamento, type Periodicidade, type RegraRecorrencia } from './db'
import { hojeEfetivoISO } from './hojeSimulado'

export function gerarIdSerie(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function ultimoDiaDoMes(ano: number, mesIndice0: number): number {
  return new Date(ano, mesIndice0 + 1, 0).getDate()
}

function ehDiaUtil(d: Date): boolean {
  const dia = d.getDay()
  return dia !== 0 && dia !== 6
}

// Enésimo dia útil (1-based) de um mês, contando seg-sex a partir do dia 1.
function nEsimoDiaUtil(ano: number, mesIndice0: number, n: number): Date {
  let contagem = 0
  let dia = 1
  while (true) {
    const d = new Date(ano, mesIndice0, dia)
    if (d.getMonth() !== mesIndice0) return new Date(ano, mesIndice0, dia - 1) // estourou o mês, usa o último válido
    if (ehDiaUtil(d)) {
      contagem++
      if (contagem === n) return d
    }
    dia++
  }
}

// Aplica a regra (dia fixo / dia útil / dia da semana) dentro de um mês-alvo
// específico (ano, mesIndice0), retornando a data ISO daquele mês que
// satisfaz a regra.
function aplicarRegraNoMes(ano: number, mesIndice0: number, regra: RegraRecorrencia | undefined): Date {
  if (!regra || regra.tipo === 'diaFixo') {
    const dia = Math.min(regra?.tipo === 'diaFixo' ? regra.dia : 1, ultimoDiaDoMes(ano, mesIndice0))
    return new Date(ano, mesIndice0, dia)
  }
  if (regra.tipo === 'diaUtil') {
    return nEsimoDiaUtil(ano, mesIndice0, regra.diaUtil)
  }
  // diaSemana: primeiro dia daquele mês que cai nesse dia da semana — só usado
  // como base pra mensal/semestral se o usuário escolher; pra semanal/quinzenal
  // a regra de dia da semana é aplicada por avanço direto (ver proximaData).
  let dia = 1
  while (new Date(ano, mesIndice0, dia).getDay() !== regra.diaSemana) dia++
  return new Date(ano, mesIndice0, dia)
}

function paraISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Calcula a data da PRÓXIMA ocorrência de uma série fixa, a partir da data da
// última ocorrência conhecida.
export function proximaDataRecorrencia(
  dataUltimaISO: string,
  periodicidade: Periodicidade,
  regra?: RegraRecorrencia,
): string {
  const [ano, mes, dia] = dataUltimaISO.split('-').map(Number)
  const ultima = new Date(ano, mes - 1, dia)

  if (periodicidade === 'semanal' || periodicidade === 'quinzenal') {
    const passoDias = periodicidade === 'semanal' ? 7 : 14
    if (regra?.tipo === 'diaSemana') {
      // avança em passos de 7 dias a partir da última ocorrência até cair de
      // novo no dia da semana certo, respeitando o intervalo mínimo.
      const proxima = new Date(ultima)
      proxima.setDate(proxima.getDate() + passoDias)
      return paraISO(proxima)
    }
    const proxima = new Date(ultima)
    proxima.setDate(proxima.getDate() + passoDias)
    return paraISO(proxima)
  }

  // mensal ou semestral — avança em meses e reaplica a regra de dia dentro do
  // mês de destino (importante pro caso "diaUtil": o 5º dia útil muda de
  // número de mês pra mês).
  const passoMeses = periodicidade === 'mensal' ? 1 : 6
  const destino = new Date(ano, mes - 1 + passoMeses, 1)
  const proxima = aplicarRegraNoMes(destino.getFullYear(), destino.getMonth(), regra)
  return paraISO(proxima)
}

// Avança uma série "fixa" até hoje, gerando (e gravando) toda ocorrência que
// já deveria ter acontecido e ainda não existe. Roda no carregamento do app —
// é a "geração dinâmica por ciclo". Limitada a 24 ocorrências por segurança
// (evita loop caso a série fique muito tempo sem o app ser aberto).
//
// "Hoje" vem de `hojeEfetivoISO()` (05/09/2026, Etapa 7 — Ferramentas de
// teste), não de `new Date()` direto — é a data REAL do sistema, a não ser
// que o Rafael tenha uma data simulada ativa (ver `src/kit/SimularData.tsx`),
// caso em que a série avança até a data simulada. Retorna quantas ocorrências
// novas foram geradas, pra UI da ferramenta de teste poder mostrar feedback
// ("3 lançamento(s) gerado(s)") — sempre 0 no uso normal do dia a dia,
// quando não há nada pendente.
//
// `hojeISOForcado` (opcional): permite passar a data efetiva já conhecida,
// em vez de ler `hojeEfetivoISO()` (que depende do cache assíncrono de
// `hojeSimulado.ts`, sincronizado via `liveQuery` — existe uma janela real
// entre `db.configuracoes.put(...)` resolver e o `liveQuery` propagar o
// valor novo pro cache em memória). `src/kit/SimularData.tsx` PRECISA usar
// este parâmetro logo depois de salvar uma data simulada nova, senão o
// reprocessamento roda contra a data ANTIGA ainda em cache — bug real
// encontrado e corrigido na verificação da Etapa 7 (o reprocessamento
// relatava "nenhum lançamento novo" mesmo com uma série claramente vencida,
// porque a leitura de "hoje" ainda não tinha se atualizado).
export async function avancarSeriesFixasPendentes(hojeISOForcado?: string): Promise<number> {
  const hojeISO = hojeISOForcado ?? hojeEfetivoISO()
  let totalGerado = 0
  // `recorrencia` não é campo indexado (tabela ainda é pequena) — filtra em
  // memória em vez de usar .where(), que exigiria índice.
  const fixos = (await db.lancamentos.toArray()).filter((l) => l.recorrencia === 'fixo')

  const porSerie = new Map<string, Lancamento[]>()
  for (const l of fixos) {
    if (!l.serieId) continue
    const lista = porSerie.get(l.serieId) ?? []
    lista.push(l)
    porSerie.set(l.serieId, lista)
  }

  for (const [serieId, ocorrencias] of porSerie) {
    ocorrencias.sort((a, b) => a.dataCompetencia.localeCompare(b.dataCompetencia))
    const ultima = ocorrencias[ocorrencias.length - 1]
    if (!ultima.periodicidade) continue

    let dataAtual = ultima.dataCompetencia
    let protecao = 0
    while (protecao < 24) {
      const proxima = proximaDataRecorrencia(dataAtual, ultima.periodicidade, ultima.regraRecorrencia)
      if (proxima > hojeISO) break // ainda não chegou o dia — não gera antes da hora
      await db.lancamentos.add({
        dataCompetencia: proxima,
        dataCaixa: proxima,
        descricao: ultima.descricao,
        descricaoOriginal: ultima.descricao,
        valor: ultima.valor,
        contaId: ultima.contaId,
        pagoPor: ultima.pagoPor,
        categoriaId: ultima.categoriaId,
        status: 'manual',
        recorrencia: 'fixo',
        serieId,
        periodicidade: ultima.periodicidade,
        regraRecorrencia: ultima.regraRecorrencia,
      })
      dataAtual = proxima
      protecao++
      totalGerado++
    }
  }
  return totalGerado
}

// Gera a lista de N parcelas (datas + valor de cada uma) a partir da data e
// valor total do lançamento original — usada tanto na prévia do formulário
// quanto na gravação de verdade. Parcela sempre mensal (é o padrão de compra
// parcelada); dia do mês igual ao da primeira parcela, ajustado se o mês de
// destino for mais curto.
export function gerarParcelas(dataInicialISO: string, valorTotal: number, parcelaN: number) {
  const [ano, mes, dia] = dataInicialISO.split('-').map(Number)
  const valorParcela = Math.round((valorTotal / parcelaN) * 100) / 100
  // A última parcela absorve a diferença de arredondamento, pra soma bater
  // exatamente com o valor total da compra.
  const somaAntesDaUltima = valorParcela * (parcelaN - 1)
  const valorUltimaParcela = Math.round((valorTotal - somaAntesDaUltima) * 100) / 100

  const parcelas: { data: string; valor: number; parcelaI: number }[] = []
  for (let i = 0; i < parcelaN; i++) {
    const destino = new Date(ano, mes - 1 + i, 1)
    const diaAjustado = Math.min(dia, ultimoDiaDoMes(destino.getFullYear(), destino.getMonth()))
    const data = paraISO(new Date(destino.getFullYear(), destino.getMonth(), diaAjustado))
    parcelas.push({
      data,
      valor: i === parcelaN - 1 ? valorUltimaParcela : valorParcela,
      parcelaI: i + 1,
    })
  }
  return parcelas
}

export const ROTULOS_PERIODICIDADE: Record<Periodicidade, string> = {
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  mensal: 'Mensal',
  semestral: 'Semestral',
}

export const NOMES_DIA_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
