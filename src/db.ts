import Dexie, { type EntityTable } from 'dexie'

// Modelo de dados — baseado em claude/mfip-modelo-de-dados.md
// MVP inicial: modo "Lite" (input manual, sem importação/conciliação).
// Os campos de conciliação/importação já existem no schema para não
// precisar migrar quando o modo Premium (importação) for construído.

export type TipoConta = 'corrente' | 'cartao' | 'cofre'

export interface Conta {
  id?: number
  nome: string
  tipo: TipoConta
  instituicao: string
  saldoInicial: number
  dataSaldoInicial: string // ISO yyyy-mm-dd
  importavel: boolean
  ativa: boolean
  // só cartão
  diaFechamento?: number
  diaVencimento?: number
  contaPagamentoPadraoId?: number
}

export type Natureza =
  | 'Receita'
  | 'Consumo'
  | 'Aporte'
  | 'Neutro'
  | 'Gasto de cofrinho'
  | 'Pagamento de fatura'
  | 'Transferência'

// Naturezas com um "teto"/"meta" que faz sentido somar por grupo — usado pra
// generalizar qualquer cálculo grupo × aceitável/gasto (Categorias, Situação,
// Resumo do Mês) pra QUALQUER grupo, inclusive um novo criado pelo Rafael,
// sem hardcode de nome de grupo. Consumo e Aporte são as únicas naturezas com
// um teto/meta mensal que faz sentido somar; Receita/Neutro/Gasto de
// cofrinho/Pagamento de fatura não têm essa noção (ou já são tratadas à parte).
export const NATUREZAS_ORCAMENTAVEIS: Natureza[] = ['Consumo', 'Aporte']

export interface Categoria {
  id?: number
  nome: string
  // Nome do grupo (não id — ver `GrupoRegistro` abaixo). Era um union type fixo
  // ('Fixo'|'Variável'|'Objetivos'|'Segurança', chamado "macrocategoria"/
  // "bloco" antes de 30/08/2026); virou `string` livre quando Grupo passou a
  // ser cadastro de verdade (ver `GrupoRegistro`) — qualquer nome cadastrado
  // em `grupos` é válido aqui.
  grupo: string
  natureza: Natureza
  aceitavelMensal: number
  // Meta manual de receita mensal — só faz sentido em categoria natureza
  // Receita. Cadastrado manualmente (30/08/2026, decisão do Rafael: não
  // inferir de lançamento recorrente) — usado na tela Planejamento como
  // "Planejado de Entrada" dessa categoria.
  esperadoMensal?: number
  // Vincula esta categoria a uma conta específica — em geral um cofrinho
  // (Conta tipo 'cofre') — pra que um lançamento NESTA categoria, mesmo pago
  // por outra conta (ex.: pagar direto pelo Bradesco usando essa categoria
  // "pessoal" de cofrinho), abata automaticamente o saldo/aporte daquele
  // cofrinho, sem precisar do processo manual de sacar → transferir → pagar
  // (30/08/2026, rodada seguinte — ver Carteira.tsx e CLAUDE.md).
  contaVinculada?: number
  ativa: boolean // inativa = não aparece mais pra lançar, mas o histórico continua válido
  // Ícone de identificação visual (31/08/2026, rodada seguinte) — opcional,
  // sempre lido via `.filter()` em JS sobre `categorias` (tabela pequena,
  // sempre carregada inteira), nunca via `.where()` — por isso NÃO exige
  // bump de versão do Dexie (mesma lógica de `contaVinculada` acima). `icone`
  // é um id de `src/icones.tsx`; `iconeEstilo` escolhe entre os 3 visuais
  // (colorido/preenchido/borda — colorido usa a cor própria do ícone, sem
  // escolha livre; os outros dois usam `iconeCor`, cor livre escolhida pelo
  // Rafael). Sem `icone` cadastrado, cai no ícone genérico "outros".
  icone?: string
  iconeEstilo?: 'colorido' | 'preenchido' | 'borda'
  iconeCor?: string
}

// Grupo virou cadastro de verdade (30/08/2026) — antes era só um union type
// fixo (Fixo/Variável/Objetivos/Segurança). `Categoria.grupo` continua sendo
// o NOME do grupo (string), não um id — renomear um grupo em `Grupos.tsx`
// atualiza em cascata todas as categorias que apontam pro nome antigo (ver
// `renomearGrupo` na tela Categorias). Simplicidade > normalização por FK
// aqui, já que grupo é um cadastro pequeno e raro de editar.
export interface GrupoRegistro {
  id?: number
  nome: string
  ativo: boolean // inativo = não aparece mais pra escolher em categoria nova, mas categorias existentes continuam válidas
  // Ícone de identificação visual do grupo (31/08/2026, rodada seguinte) —
  // mesmo mecanismo/motivo de não precisar de índice que `Categoria.icone`
  // acima (tabela `grupos` também é pequena e sempre carregada inteira).
  icone?: string
  iconeEstilo?: 'colorido' | 'preenchido' | 'borda'
  iconeCor?: string
}

export type StatusLancamento = 'importado' | 'conciliado' | 'manual'
export type PagoPor = 'conta' | 'cartao' | 'cofre'

// Periodicidade de um lançamento fixo (recorrente). A recorrência e o
// parcelamento vivem SEMPRE a nível de lançamento, nunca de categoria —
// decisão explícita do Rafael em 30/08/2026 (categoria é só classificação).
export type Periodicidade = 'semanal' | 'quinzenal' | 'mensal' | 'semestral'

// Regra que define em que dia a próxima ocorrência de um lançamento fixo
// cai. "diaFixo"/"diaUtil" fazem sentido pra periodicidade mensal/semestral
// (dia do mês); "diaSemana" faz sentido pra semanal/quinzenal.
export type RegraRecorrencia =
  | { tipo: 'diaFixo'; dia: number } // dia do mês (1-31; se o mês não tiver esse dia, cai no último dia dele)
  | { tipo: 'diaUtil'; diaUtil: number } // enésimo dia útil (seg-sex) do mês
  | { tipo: 'diaSemana'; diaSemana: number } // 0=domingo … 6=sábado

export interface Lancamento {
  id?: number
  dataCompetencia: string // ISO yyyy-mm-dd — mês a que o gasto pertence
  dataCaixa: string // ISO yyyy-mm-dd — quando o dinheiro realmente saiu
  descricao: string
  valor: number // com sinal
  contaId: number
  pagoPor: PagoPor
  categoriaId: number
  status: StatusLancamento
  chaveImportacao?: string // data+valor+conta, evita duplicar na importação

  // --- Recorrência e parcelamento (30/08/2026) ---
  // Ausente = lançamento único (padrão). "fixo" = conta recorrente (aluguel,
  // assinatura); "parcelado" = compra dividida em N parcelas.
  recorrencia?: 'fixo' | 'parcelado'
  // Agrupa todas as ocorrências/parcelas da mesma série — é o que permite ao
  // app achar "qual foi a última ocorrência dessa conta fixa" pra calcular a
  // próxima, ou listar "todas as parcelas dessa compra".
  serieId?: string
  // Só quando recorrencia === 'fixo':
  periodicidade?: Periodicidade
  regraRecorrencia?: RegraRecorrencia
  // Só quando recorrencia === 'parcelado' — identificador estruturado da
  // parcela (ex.: parcelaI=2, parcelaN=5 exibido como "2/5").
  parcelaI?: number
  parcelaN?: number
  // Id do lançamento de "Pagamento de fatura" que quitou este lançamento de
  // cartão (30/08/2026, rodada seguinte — campo existia no schema desde o
  // início, sem uso até agora). Setado em massa por `pagarFatura` (Carteira.tsx)
  // em todo lançamento do ciclo ao quitar a fatura — junto com `pago: true`.
  faturaId?: number

  // Transferência entre contas próprias (30/08/2026, rodada seguinte) — um
  // "Transferência" gera SEMPRE 2 lançamentos (nunca 1 só), um de saída na
  // conta de origem e um de entrada na conta de destino, ambos com o mesmo
  // `transferenciaId` (um id gerado, mesmo mecanismo de `serieId`). Editar ou
  // excluir um dos dois lados sempre afeta o par inteiro — nunca um lado
  // sozinho — pra nunca deixar uma transferência "manca" (só metade
  // registrada). Ver `DetalheLancamento.tsx` e `categoriasSistema.ts`.
  transferenciaId?: string

  // Situação de pagamento (30/08/2026) — separado de dataCompetencia (o mês
  // "de direito" do gasto/receita, que não muda). `pago` é se o dinheiro já
  // saiu/entrou de verdade. undefined é tratado como pago=true (compatibiliza
  // com lançamento antigo, sempre criado a partir de extrato real já
  // liquidado) — ver `statusDoLancamento` em `src/statusPagamento.ts`, é a
  // função que decide o rótulo (Pago/Recebido/Atrasado/A pagar/A receber) e
  // nunca ler esse campo direto fora dali.
  pago?: boolean
}

export interface Meta {
  id?: number
  grupo: string // nome do grupo — mesma observação de `Categoria.grupo` acima
  percentual: number
  base: 'receita_real' | 'valor_fixo'
  valorFixo?: number
  mesVigencia: string // yyyymm
}

export interface SaldoInformado {
  id?: number
  contaId: number
  dataReferencia: string // yyyymm
  saldoInformado: number
}

export interface Usuario {
  id?: number
  nome: string
  login: string
  perfil: 'admin' | 'usuario'
}

// Configuração global de tamanho de ícone (01/09/2026, rodada seguinte) —
// singleton (sempre `id: 1`), não é por categoria/grupo. Rafael pediu 3
// parâmetros universais, cada um controlando o quanto o ícone ocupa da
// altura da própria linha, em % — um por "tipo de linha" onde ícone
// aparece: Categoria (linha de categoria cadastrada em Categorias e
// Grupos — campo renomeado de `pctSimples` na rodada seguinte, no mesmo
// dia: ícone saiu das listagens Simples de lançamento, que não mostram
// mais ícone nenhuma, e passou a valer só pra própria tela de cadastro),
// listagem Completa (duas linhas, Lançamentos/Carteira) e Grupo
// (cabeçalhos de grupo em Categorias, Situação, Resumo, Planejamento). Ver
// `src/configuracaoIcones.ts` pros valores padrão (60/30/30) e a altura de
// referência fixa de cada tipo.
export interface ConfiguracaoIcones {
  id?: number
  pctCategoria: number
  pctCompleta: number
  pctGrupo: number
  // `modoVisao` (04/09/2026, pedido do Rafael): visão "Light" (simplificada —
  // só Resumo/Lançamentos/Carteira no rodapé) vs. "Premium" (todas as 5
  // abas, o app como é hoje). Mesmo raciocínio de sempre pra campo aditivo
  // numa tabela singleton já existente: não indexado, lido via
  // `db.configuracoes.get(1)` direto — não precisa de bump de schema.
  // Ausente/undefined = 'premium' (compatível com quem já usava o app antes
  // deste campo existir). Ver `src/configuracaoIcones.ts`.
  modoVisao?: 'light' | 'premium'
  // Ordem das 5 abas do rodapé (04/09/2026, Roteiro de Parametrização Morfo,
  // Etapa 4 — "Kit de Estrutura Mínima", adaptação da seção "Ordem dos menus"
  // de `LayoutTenantScreen` do Kit). Lista das chaves de `TELAS` em
  // `App.tsx` (`'resumo'|'situacao'|'lancamentos'|'carteira'|'planejamento'`)
  // na ordem escolhida pelo Rafael em Manutenção → "Layout do rodapé".
  // Ausente/undefined = ordem padrão (a mesma de sempre). A VISIBILIDADE de
  // cada aba continua sendo só o mecanismo `modoVisao` já existente — este
  // campo nunca esconde aba nenhuma, só reordena as que já estão visíveis.
  ordemAbas?: string[]
  // Plano "contratado" (05/09/2026, Roteiro de Parametrização Morfo, Etapa 5
  // — Modelo de negócio Completo). PLACEHOLDER: não existe cobrança real
  // nem backend (Decisão 6/Backlog #028) — este campo só guarda qual dos
  // `PLANOS_STUB` (ver `src/kit/planos.ts`) a tela "Minha Assinatura"
  // (`src/kit/MinhaAssinatura.tsx`) deve mostrar como "atual", pra validar o
  // FLUXO (ver plano, trocar, encerrar) antes de existir plano/preço de
  // verdade. Ausente/undefined = plano em destaque (`PLANOS_STUB.find(p =>
  // p.destaque)`). Mesmo padrão aditivo de sempre: sem bump de schema.
  planoId?: string
  // Data "de hoje" SIMULADA (05/09/2026, Roteiro de Parametrização Morfo,
  // Etapa 7 — Ferramentas de teste), formato ISO (yyyy-mm-dd). FERRAMENTA DE
  // TESTE — pedido explícito do Rafael: "a cada mudança de data, deve
  // reprocessar pagamentos e parcelas, recorrentes". Ver `src/hojeSimulado.ts`
  // (raiz de `src/`, não em `kit/` — fonte única de verdade pra "hoje" no
  // app inteiro; `statusPagamento.ts`/`recorrencia.ts` e as telas que
  // calculam projeção leem daqui, nunca `new Date()` direto) e
  // `src/kit/SimularData.tsx` (UI). Ausente/undefined = usa a data real do
  // sistema (comportamento de sempre). NUNCA apaga/edita lançamento
  // existente — só pode ADICIONAR ocorrência nova de série fixa que já
  // deveria ter acontecido até a data simulada (mesma função seletiva de
  // sempre, `avancarSeriesFixasPendentes` em `recorrencia.ts`, só que lendo
  // a data simulada em vez da real).
  hojeSimuladoISO?: string
  // Credencial de acesso e sessão (05/09/2026, Roteiro de Parametrização
  // Morfo, Etapa 8 — Login real/Ambiente Logado). PLACEHOLDER DE SEGURANÇA:
  // sem backend (Decisão 6/Backlog #028), não existe autenticação de
  // verdade possível — quem tem acesso ao arquivo/perfil do navegador já
  // tem acesso ao IndexedDB inteiro de qualquer forma. `credencialEmail`/
  // `credencialSenha` são guardados em texto puro de propósito (não faria
  // sentido "criptografar" uma senha que mora no mesmo banco que ela
  // protege) — o valor real desta camada é de FLUXO/UX (o app agora abre
  // por uma tela de entrada de verdade), não de segurança de dado. Ausente
  // (nenhum dos dois campos) = ainda não existe credencial cadastrada, tela
  // de Login mostra o formulário de "Criar acesso" (1ª vez); presente =
  // formulário de "Entrar" exige bater com o que está aqui. `sessaoAtiva`
  // (não indexado, como todo o resto desta tabela) persiste o login entre
  // aberturas do app — sem isso, o Rafael precisaria logar de novo TODA vez
  // que abrisse o arquivo, o que inviabilizaria o uso diário de um app
  // client-side sem servidor de sessão. "Sair" (Manutenção → Conta) só
  // zera `sessaoAtiva`, nunca `credencialEmail`/`credencialSenha` nem
  // nenhum dado financeiro. Ver `src/kit/auth.ts`/`src/kit/LoginView.tsx`.
  credencialEmail?: string
  credencialSenha?: string
  sessaoAtiva?: boolean
}

// Versão dos DADOS DE SEMENTE (não é versão de schema — isso é o `.version()`
// abaixo). Incremente este número toda vez que `src/seed.ts` mudar de um jeito
// que deveria alterar os números que aparecem na tela (categoria recategorizada,
// lançamento corrigido, mais meses de histórico, etc.).
//
// Motivo de existir: o nome do banco IndexedDB inclui esse número. Se o Rafael
// já abriu uma build anterior no mesmo navegador/aparelho, o banco daquela build
// (com a semente antiga) continua lá — e `seedIfEmpty()` só semeia se estiver
// vazio, então uma correção nos dados da semente NUNCA apareceria pra quem já
// tinha aberto uma versão anterior, mesmo abrindo o arquivo novo. Trocar o nome
// do banco força um banco novo (vazio) a cada semente diferente, então a
// correção sempre aparece. Foi exatamente isso que causou o app mostrar
// números antigos/errados pro Rafael em 30/08/2026 mesmo já com a semente
// corrigida — ver docs/progresso.md.
//
// ATENÇÃO — isso só é seguro enquanto o app está em fase de demonstração (só
// dados de semente, nada digitado de verdade pelo Rafael). Assim que ele
// começar a lançar dados reais pela tela Lançamentos, PARE de incrementar isso
// sem pensar — trocar o nome do banco nesse momento apagaria (silenciosamente,
// pro usuário) os lançamentos reais dele, não só a semente. Nesse momento vai
// precisar de uma migração de verdade (copiar os dados reais pro banco novo),
// não mais um banco descartável.
const VERSAO_SEMENTE_DEMO = 4

class MFinpDB extends Dexie {
  contas!: EntityTable<Conta, 'id'>
  categorias!: EntityTable<Categoria, 'id'>
  grupos!: EntityTable<GrupoRegistro, 'id'>
  lancamentos!: EntityTable<Lancamento, 'id'>
  metas!: EntityTable<Meta, 'id'>
  saldosInformados!: EntityTable<SaldoInformado, 'id'>
  usuarios!: EntityTable<Usuario, 'id'>
  configuracoes!: EntityTable<ConfiguracaoIcones, 'id'>

  constructor() {
    super(`mfinp-db-semente${VERSAO_SEMENTE_DEMO}`)
    this.version(1).stores({
      contas: '++id, nome, tipo, ativa',
      categorias: '++id, nome, macrocategoria',
      lancamentos: '++id, dataCompetencia, contaId, categoriaId, status, chaveImportacao',
      metas: '++id, macrocategoria, mesVigencia',
      saldosInformados: '++id, contaId, dataReferencia',
      usuarios: '++id, login',
    })
    // v2 (30/08/2026): categoria ganhou o campo `ativa` — cadastro central editável
    // (incluir/editar/excluir/inativar), ver tela Categorias.
    this.version(2)
      .stores({
        contas: '++id, nome, tipo, ativa',
        categorias: '++id, nome, macrocategoria, ativa',
        lancamentos: '++id, dataCompetencia, contaId, categoriaId, status, chaveImportacao',
        metas: '++id, macrocategoria, mesVigencia',
        saldosInformados: '++id, contaId, dataReferencia',
        usuarios: '++id, login',
      })
      .upgrade((tx) =>
        tx
          .table('categorias')
          .toCollection()
          .modify((c) => {
            if (c.ativa === undefined) c.ativa = true
          }),
      )
    // v3 (30/08/2026, rodada do "Grupo"): renomeia macrocategoria → grupo em
    // Categoria e Meta (termo "macrocategoria"/"bloco" abandonado em todo o
    // app); remove `Categoria.diaEsperado` (a recorrência passou a viver só a
    // nível de lançamento — ver `recorrencia`/`serieId`/`periodicidade` acima);
    // e indexa `serieId` em lançamentos pra achar rápido a última ocorrência de
    // uma série fixa/parcelada. Como o banco de demonstração troca de nome a
    // cada `VERSAO_SEMENTE_DEMO`, esse upgrade na prática só importa quando o
    // app parar de rodar em modo semente e passar a ter dado real.
    this.version(3)
      .stores({
        contas: '++id, nome, tipo, ativa',
        categorias: '++id, nome, grupo, ativa',
        lancamentos: '++id, dataCompetencia, contaId, categoriaId, status, chaveImportacao, serieId',
        metas: '++id, grupo, mesVigencia',
        saldosInformados: '++id, contaId, dataReferencia',
        usuarios: '++id, login',
      })
      .upgrade((tx) =>
        Promise.all([
          tx
            .table('categorias')
            .toCollection()
            .modify((c) => {
              if (c.grupo === undefined && c.macrocategoria !== undefined) c.grupo = c.macrocategoria
              delete c.macrocategoria
              delete c.diaEsperado
            }),
          tx
            .table('metas')
            .toCollection()
            .modify((m) => {
              if (m.grupo === undefined && m.macrocategoria !== undefined) m.grupo = m.macrocategoria
              delete m.macrocategoria
            }),
        ]),
      )
    // v4 (30/08/2026, rodada seguinte): Grupo vira cadastro de verdade (tabela
    // `grupos`, ver `GrupoRegistro`) em vez de union type fixo — permite criar/
    // renomear/inativar grupo pela tela Categorias. `Lancamento.pago` novo
    // (situação de pagamento). `Categoria.esperadoMensal` novo (meta manual de
    // receita, usada na tela Planejamento). O upgrade semeia a tabela `grupos`
    // a partir dos nomes de grupo já em uso nas categorias existentes, e marca
    // todo lançamento existente como `pago=true` (histórico real, já
    // liquidado — só lançamento novo pode nascer pendente).
    this.version(4)
      .stores({
        contas: '++id, nome, tipo, ativa',
        categorias: '++id, nome, grupo, ativa',
        grupos: '++id, nome, ativo',
        lancamentos: '++id, dataCompetencia, contaId, categoriaId, status, chaveImportacao, serieId',
        metas: '++id, grupo, mesVigencia',
        saldosInformados: '++id, contaId, dataReferencia',
        usuarios: '++id, login',
      })
      .upgrade((tx) =>
        tx
          .table('categorias')
          .toArray()
          .then((categorias) => {
            const nomesGrupo = [...new Set(categorias.map((c) => c.grupo).filter(Boolean))]
            return Promise.all([
              ...nomesGrupo.map((nome) => tx.table('grupos').add({ nome, ativo: true })),
              tx
                .table('lancamentos')
                .toCollection()
                .modify((l) => {
                  if (l.pago === undefined) l.pago = true
                }),
            ])
          }),
      )
    // v5 (30/08/2026, rodada seguinte) — indexa `transferenciaId` (novo campo,
    // ver `Lancamento.transferenciaId` acima): precisa de índice de verdade
    // porque `DetalheLancamento.tsx` faz `db.lancamentos.where('transferenciaId')`
    // pra achar o par de uma transferência (e pra excluir os dois lados
    // juntos) — sem o índice, o Dexie lança SchemaError na hora do `.where()`.
    // Só ADICIONA um índice a um campo novo, sem `.upgrade()`: nenhum
    // lançamento existente tem esse campo, então não há nada pra migrar.
    // `Categoria.contaVinculada` (novo nesta mesma rodada) NÃO precisa de
    // índice — é sempre lido via `.filter()` em JS sobre `categorias`
    // (tabela pequena, sempre carregada inteira), nunca via `.where()`.
    this.version(5).stores({
      contas: '++id, nome, tipo, ativa',
      categorias: '++id, nome, grupo, ativa',
      grupos: '++id, nome, ativo',
      lancamentos: '++id, dataCompetencia, contaId, categoriaId, status, chaveImportacao, serieId, transferenciaId',
      metas: '++id, grupo, mesVigencia',
      saldosInformados: '++id, contaId, dataReferencia',
      usuarios: '++id, login',
    })
    // Sem v6 pra `Categoria.icone`/`iconeEstilo`/`iconeCor` e o mesmo trio em
    // `GrupoRegistro` (31/08/2026, rodada seguinte) — são só lidos via
    // `.filter()`/iteração em JS sobre tabelas pequenas sempre carregadas
    // inteiras (`categorias`, `grupos`), nunca via `.where()`. Mesma regra
    // de "só bump quando precisar de índice de verdade" documentada acima
    // na v5.
    //
    // v6 (01/09/2026, rodada seguinte): tabela NOVA `configuracoes` (config
    // universal de tamanho de ícone, `ConfiguracaoIcones` — ver acima) — uma
    // tabela nova sempre exige bump, mesmo sem índice além da chave primária,
    // porque `.stores()` declara o conjunto completo de tabelas daquela
    // versão. Singleton (só a linha `id: 1` é usada, criada sob demanda por
    // `garantirConfiguracaoIcones()` em `src/configuracaoIcones.ts` — sem
    // `.upgrade()`, não existe registro antigo pra migrar).
    this.version(6).stores({
      contas: '++id, nome, tipo, ativa',
      categorias: '++id, nome, grupo, ativa',
      grupos: '++id, nome, ativo',
      lancamentos: '++id, dataCompetencia, contaId, categoriaId, status, chaveImportacao, serieId, transferenciaId',
      metas: '++id, grupo, mesVigencia',
      saldosInformados: '++id, contaId, dataReferencia',
      usuarios: '++id, login',
      configuracoes: 'id',
    })
  }
}

export const db = new MFinpDB()
