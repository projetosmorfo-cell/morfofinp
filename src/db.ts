import Dexie, { type EntityTable } from 'dexie'
import type { SiteConfig, SitePage } from './kit/kitBase'
import type { PlatformN0 } from './kit/kitPlatform'

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
  /* Ícone da carteira (10/09/2026, pedido do Rafael) — selo redondo de
     tamanho padronizado. Três campos, todos opcionais e mutuamente
     exclusivos na prática (ver `SeloInstituicao.tsx` pra ordem de
     precedência): `iconeInstituicao` é o NOME de um item de
     `src/dados/instituicoes.ts` (o selo com sigla sobre a cor oficial),
     `iconeCor` é o círculo liso ("caso ele não ache" a instituição) e
     `iconeImagemUri` é uma imagem enviada pelo próprio usuário, em data URI.
     Campos aditivos, não indexados: `contas` é tabela pequena e sempre lida
     inteira via `.toArray()` — mesmo motivo já registrado em
     `Categoria.icone` de não precisar de bump de schema. */
  iconeInstituicao?: string
  iconeCor?: string
  iconeImagemUri?: string
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
  // Snapshot do texto de `descricao` no exato momento em que este lançamento
  // foi CRIADO — nunca reescrito depois, mesmo que o usuário renomeie
  // `descricao` livremente pra dar um apelido melhor (08/09/2026). Existe
  // pra alimentar o "De/Para" da Conciliação Avançada (Fase 2, ver
  // `Conciliação Avançada - Fase 2.md` do Project) e, no futuro, a leitura
  // de notificação bancária: o extrato/notificação sempre traz o texto
  // ORIGINAL, nunca o apelido que o usuário deu — sem esse campo, o
  // casamento por texto quebraria no primeiro renome (mesmo problema já
  // observado no Organizze, ver `Modelo de Dados.md`, item 3). Campo
  // aditivo, opcional — lançamentos já existentes não têm; não é chave de
  // nada (a regra dura de conciliação continua sendo data+valor+conta, ver
  // abaixo) — é só um dado auxiliar pra facilitar/desambiguar, nunca substitui
  // essa regra.
  descricaoOriginal?: string
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
  // Marca de lançamento gerado pela MASSA DE TESTE (10/09/2026, Decisão 55 —
  // Parte B, grupo "Gerar Teste no Cliente" do Kit). Campo aditivo, não
  // indexado, sem bump de schema. Nenhum caminho normal do app grava isto —
  // só `gerarLancamentosFicticios()` (`src/kit/massaTeste.ts`). É o que
  // permite "Limpar Dados Testes Cliente" apagar EXATAMENTE os lançamentos
  // de teste sem tocar em nenhum lançamento real do Rafael. Diferença
  // deliberada em relação ao Kit (mais seguro que ele): lá a massa gerada
  // dentro do ambiente de um cliente nasce sem marca nenhuma, e a única
  // proteção é a trava de "só ambiente vazio" (que aqui também foi mantida).
  ficticio?: boolean
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
  // Marca de que a correção única do percentual de grupo já rodou nesta
  // instalação (11/09/2026) — ver `migrarPctGrupo()` em
  // `src/configuracaoIcones.ts`. Campo aditivo, não indexado, sem bump de
  // schema (mesma regra de sempre pra esta tabela singleton).
  pctGrupoRevisado?: boolean
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
  // Plano "contratado" (05/09/2026, Etapa 5 — Modelo de negócio Completo).
  // PLACEHOLDER: não existe cobrança real nem backend (Decisão 6/Backlog
  // #028) — este campo só guarda qual `PlanoRegistro.id` (tabela `planos`,
  // ver acima — migrada de array TS fixo pra Dexie em 08/09/2026, G59) a
  // tela "Minha Assinatura" deve mostrar como "atual". Ausente/undefined =
  // plano em destaque (`usePlanoPadrao()`, `src/kit/planos.ts`). Tipo
  // mudou de `string` (id fixo tipo `'essencial'`) pra `number` (id
  // autoincrementado do Dexie) na mesma rodada da migração — sem upgrade
  // de dado porque nenhum tenant real tinha plano contratado ainda além do
  // padrão implícito.
  planoId?: number
  // Tema das telas do N1 (10/09/2026, Decisão 55 — Parte B, "Aparência" do
  // Kit). Campo aditivo, não indexado, sem bump de schema.
  // Ausente/undefined = 'escuro' (o app como sempre foi, Etapa 4).
  temaPreferido?: 'claro' | 'escuro' | 'auto'
  // Memória do campo "O que foi" (10/09/2026, pedido do Rafael: "sugere lista
  // dos últimos registros conforme digita; essa memória é parâmetro de nível 1
  // do ambiente do cliente, em DIAS PRA TRÁS, padrão 60 dias"). Quantos dias
  // pra trás o formulário de lançamento olha ao montar as sugestões de
  // descrição. Campo aditivo, não indexado, sem bump de schema.
  // Ausente/undefined = `MEMORIA_DESCRICAO_DIAS_PADRAO` (60). 0 desliga a
  // sugestão por completo — o campo continua funcionando como texto livre.
  memoriaDescricaoDias?: number
  // Logos reais das instituições financeiras, trazidas pelo PRÓPRIO usuário
  // (10/09/2026). Mapa `nome da instituição` → imagem em data URI. Existe
  // porque eu não reproduzo logotipo de marca de terceiro: o app recorta,
  // padroniza o tamanho e deixa tudo redondo, mas a IMAGEM é do Rafael. Vale
  // pro app inteiro (biblioteca), diferente de `Conta.iconeImagemUri`, que é
  // uma imagem avulsa de UMA carteira. Campo aditivo, não indexado.
  logosInstituicoes?: Record<string, string>
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
  // Credencial e sessão do NÍVEL N0 (08/09/2026, Roteiro de Parametrização
  // Morfo, G59 — "critério de aceite binário do encaixe"). CAMPOS SEPARADOS
  // dos de N1 acima, de propósito: G59 exige "login separa os níveis" —
  // administrador (Morfo) e empresa (tenant) são credenciais INDEPENDENTES,
  // nunca a mesma sessão fazendo os dois papéis. Mesmo raciocínio de
  // segurança/fluxo de `credencialEmail`/`credencialSenha` (placeholder
  // sem backend, texto puro de propósito) — ver `src/kit/authN0.ts`.
  // `sessaoAtivaN0` controla SÓ o painel N0 (`DevApp`) — nunca é lido por
  // nenhuma tela do ambiente N1. O único caminho N0→N1 é "entrar como"
  // (impersonação, ver `AppRoot.tsx`), que NUNCA seta/lê `sessaoAtiva` (N1)
  // nem `sessaoAtivaN0` — é um estado local transitório de visualização,
  // não uma troca de sessão.
  credencialEmailN0?: string
  credencialSenhaN0?: string
  sessaoAtivaN0?: boolean
  // Usuário logado de fato, por nível (10/09/2026, Decisão 54 Parte B —
  // "login multiusuário também, pra perfis valerem de verdade"). Antes desta
  // rodada, `sessaoAtiva`/`sessaoAtivaN0` bastavam porque só existia 1
  // credencial por nível (`credencialEmail(N0)`/`credencialSenha(N0)` acima).
  // Com o Gerenciador de Perfis (`platformN0.devUsers`/`tenant.users`, ver
  // `src/kit/kitPlatform.ts`), pode existir mais de um usuário por nível —
  // este campo diz QUAL deles está logado, pra resolver o perfil de acesso
  // certo (`perfilDoUsuario`). `loggedDevUserId` referencia um id de
  // `platformN0.devUsers`; `loggedUserIdN1` referencia um id de
  // `tenant.users` do tenant real (`t0`). Ausente com a sessão ativa =
  // trata como o 1º usuário da lista (compatibilidade com a migração de
  // `credencialEmail(N0)` — ver `devUsersComMigracao`/`tenantUsersComMigracao`
  // em `kitPlatform.ts`). Nunca lido/escrito fora de `auth.ts`/`authN0.ts`.
  loggedDevUserId?: string
  loggedUserIdN1?: string
  // "Marca do site institucional" (08/09/2026, G59 — item aprovado pro N0,
  // categorização Rafael/Claude de 08/09). Editável só pelo painel N0
  // (`DevApp` → Parâmetros → Marca) — nunca pelo N1. Escopo deliberadamente
  // restrito ao que dá pra editar sem redesenhar os SVGs de logo estáticos
  // (`morfo-padrao-branco.svg`/`morfofinp-padrao-branco.svg`, que continuam
  // fixos): o selo de vínculo ao ecossistema Morfo (G22) e o canal de
  // suporte (WhatsApp — número e mensagem padrão). Ausente/undefined = usa
  // os valores fixos que já existiam no código antes desta rodada (ver
  // `src/kit/suporte.ts`/`src/kit/LoginView.tsx`) — nenhuma instalação
  // existente quebra por este campo não existir ainda.
  marcaSeloEcossistema?: string
  marcaWhatsappNumero?: string
  marcaWhatsappMensagemPadrao?: string
  // Ordem dos itens do menu de engrenagem (08/09/2026, correção pós-G59 —
  // Rafael pediu que o menu com "Sair" pudesse ser reposicionado mas NUNCA
  // permitir remover um item, mesmo espírito de `ordemAbas` acima). Lista
  // das chaves do menu ('categorias'|'contas'|'assinatura'|'manutencao'|
  // 'suporte'|'sair') na ordem escolhida em Manutenção → "Layout do menu de
  // configurações". Ausente/undefined = ordem padrão (a mesma de sempre).
  // Mesma regra de `ordemAbas`: isto SÓ reordena — não existe (e nunca vai
  // existir aqui) um jeito de esconder/remover um item; uma chave nova que
  // o código passe a exigir e que não esteja na ordem salva sempre aparece
  // no final, nunca desaparece por estar "faltando" numa ordem salva antiga.
  ordemMenuEngrenagem?: string[]
  // "Posição dos menus" e "Posição do botão ⋮" DO PRÓPRIO AMBIENTE
  // (11/09/2026, comparação visual pixel a pixel contra o Projeto Modelo —
  // achado real: faltava por completo, `LayoutTenantScreen` do Kit tem essa
  // seção e o MorfoFinP não). Mesmo tipo/regra de `platformN0.layoutConfig`
  // (`kit/kitPlatform.ts` — `PosicaoMenu`/`MenuPosModo`, "Kit L1690"/"Kit
  // MENU_POSICOES L867"), só que como OVERRIDE por cima do padrão que a
  // Morfo define pra plataforma inteira — exatamente como o Kit faz
  // (`tenant.layoutConfig` por cima de `modoPadraoMorfo`). Só aparece pro
  // ambiente quando o plano libera (`Plano.restricoes.layoutPersonalizado`
  // — "Layout e menus personalizáveis"), em Manutenção → "Layout e Menus" →
  // "Posição dos menus". `config` nunca aceita 'oculto' (mesma trava de
  // `ITEM_PROTEGIDO_N1`, aplicada nos dois níveis). Ausente/undefined = usa
  // o padrão da Morfo (ou o padrão do próprio item, se a Morfo também não
  // tiver customizado) — "Restaurar padrão da Morfo" apaga só a chave do
  // item em questão, nunca o mapa inteiro.
  posicaoN1Proprio?: Record<string, 'rodape' | 'menu' | 'oculto'>
  menuPosN1Proprio?: { modo?: 'topo' | 'topo_esquerda' | 'rodape' | 'rodape_esquerda' | 'rodape_direita' }
  // Simulação de resolução — ferramenta de teste do MVP, pedido do Rafael
  // (Decisão 36), REESCRITA em 08/09/2026 pro padrão Kit-exato (Roteiro de
  // Parametrização Morfo, G60 — a versão anterior, com botões de TEXTO
  // embutidos no formulário de Login, foi citada pelo próprio roteiro como o
  // exemplo real do que não fazer). Mesmo padrão fino de sempre (singleton
  // `configuracoes`, sem bump de schema). `undefined` = sem simulação
  // (comportamento normal — coluna única, largura real de produção ~480px,
  // ver `#root` em `index.css`). `'web'` força `#root` pra 100% da largura
  // do navegador (mesmo valor literal do Kit) — ver `SimulacaoResolucao.tsx`
  // pro racional completo (por que só existe este 1 valor, não mais
  // 'mobile') e os 2 botões flutuantes Kit-exatos (`AppRoot.tsx`) que
  // acionam isso, nunca mais um botão de texto dentro de uma tela
  // específica. **Ferramenta de MVP, tem que ser retirada antes de publicar
  // em produção (ver `BACKLOG.md`, item 030)** — mesmo racional dos botões
  // de acesso sem senha (`entrarDemo`/`entrarDemoN0`, Decisão 33).
  simulacaoResolucao?: 'mobile' | 'web'
  // Site deslogado = código do Kit (09/09/2026, Decisões 48/49). Estes 3
  // campos são o `platform.siteConfig`/`sitePages`/`siteMenu` do Kit,
  // editáveis em N0 → Parâmetros → "Site MorfoFinP" (porte de L2146-L2343 do
  // Kit). Ausente/undefined = valor padrão do Kit (dado do MorfoMod, G55),
  // exatamente como o Kit faz com `?? padrão` — nenhuma instalação existente
  // precisa de migração. Campos aditivos sem índice, sem bump de schema.
  // `marcaSeloEcossistema` (acima) deixou de ter consumidor na Decisão 48 —
  // o papel dele (linha curta sob as logos do Login) é a "Frase de
  // apresentação" (`siteConfig.subtitulo`) do Kit; o campo antigo fica só
  // pra compatibilidade de registro, sem UI.
  siteConfig?: SiteConfig
  sitePages?: SitePage[]
  siteMenu?: { tipo?: 'fixo' | 'cortina' }
  // Plataforma do N0 no formato do Kit (10/09/2026, Decisão 53): tenants com
  // cobrança/trial/chat, do jeito que `makeTenant` do Kit produz — é o que as
  // telas de Indicadores, Financeiro e Central de Suporte do Kit CALCULAM.
  // No Kit isso vive numa chave de localStorage (`savePlatform`); aqui, neste
  // campo do mesmo singleton. Ausente = massa de demonstração do próprio Kit
  // (`gerarPlatformN0()`, valores do MorfoMod — G55).
  platformN0?: PlatformN0
}

// "Gerenciar Planos" (08/09/2026, G59 — item aprovado pro N0). Antes
// (`src/kit/planos.ts`) era um array TS fixo (`PLANOS_STUB`) — migrado pra
// tabela Dexie de verdade porque G59 exige que Parâmetros do N0 sejam
// telas REAIS e funcionais (editar/incluir/excluir plano), não só exibição.
// Continua sendo PLACEHOLDER de conteúdo comercial (nome/preço inventados,
// sem cobrança real — Backlog #028), mas agora o Rafael edita pelo painel
// N0 em vez de precisar mexer em código. `ativo: false` = plano descontinuado,
// não aparece mais em Planos (site)/Trocar de plano, mas não é excluído (um
// tenant que já estava nele continua mostrando o nome certo).
export interface PlanoRegistro {
  id?: number
  nome: string
  valorMensal: number
  destaque?: boolean
  funcionalidades: string[]
  ativo: boolean
  // Marca de "registro de teste" (10/09/2026, Decisão 55 — Parte B, grupo
  // "Gerar Teste Morfo" do Kit). Campo aditivo, não indexado, sem bump de
  // schema (mesmo padrão de `planoId`/`hojeSimuladoISO`). Tudo que sai da
  // massa de dados nasce com isto `true` e só pode ser removido pela tela
  // "Limpar Dados Testes Morfo" — que, por construção, NUNCA enxerga um
  // registro real (é a garantia que o Kit dá pra massa poder ser gerada
  // mesmo com a base populada).
  ficticio?: boolean
  // --- Campos portados do Kit (`EditPlanoSheet`, L1370) em 10/09/2026, a
  // pedido do Rafael: "quero todos os parâmetros iguais com todos os recursos
  // de preenchimento igual ao kit". Todos aditivos, não indexados, sem bump
  // de schema — plano antigo sem eles cai no padrão via `planoComPadroes()`
  // (`src/kit/planos.ts`), mesmo recurso da Lição 39.
  //
  // Porte comercial do plano (Kit: Segmented Pequeno/Médio/Grande).
  porte?: 'Pequeno' | 'Médio' | 'Grande'
  // Plano gratuito COM VALIDADE (Kit, item 212): sem cobrança, o ambiente
  // expira sozinho depois de `validadeDias` — mesma mecânica de um teste,
  // mas amarrada a um plano de verdade (com nome e limites próprios).
  gratuito?: boolean
  validadeDias?: number | null
  // Limite de usuários do ambiente que contrata este plano.
  limiteUsuarios?: number
  // Frase curta de venda ("pra quem é esse plano").
  descricaoCurta?: string
  // "Acesso liberado neste plano" (Kit: `restrictions`). O nome do Kit é
  // `restrictions` mas o significado é LIBERAÇÃO: `true` = liberado.
  restricoes?: {
    exportacaoDetalhada?: boolean
    layoutPersonalizado?: boolean
  }
}

// "Usuários Morfo (administradores)" (08/09/2026, G59 — item aprovado pro
// N0). Registro de QUEM tem acesso ao painel N0 — separado da credencial de
// login em si (`credencialEmailN0`/`credencialSenhaN0`, singleton único,
// ver acima): sem backend real, só existe UMA credencial de entrada de
// verdade (mesma limitação honesta já documentada pra N1 em
// `src/kit/auth.ts`) — esta tabela é o registro/lista de administradores
// (nome, e-mail, ativo/inativo), não um mecanismo de autenticação
// multi-usuário de verdade. `criarAcessoN0()` já grava aqui o 1º
// administrador automaticamente, pra a lista nunca nascer vazia depois de
// alguém logar.
export interface UsuarioN0 {
  id?: number
  nome: string
  email: string
  ativo: boolean
  criadoEm: string // ISO
}

// Notificação bancária capturada (09/09/2026) — uma notificação do app do
// banco/cartão que o Android leu (plugin `plugins/notificacao-bancaria`, só
// no app nativo) e que AINDA NÃO virou lançamento. O usuário confirma/edita
// (vira `Lancamento`, com `descricaoOriginal` = `texto` cru) ou descarta —
// nunca vira lançamento sozinha (regra desde a concepção, ver `Histórico -
// Modalidade Light e Premium.md`). `valor`/`tipo` são só a LEITURA
// automática do texto (podem estar errados — por isso o formulário abre
// pré-preenchido, não grava direto). Ver `src/notificacaoBancaria.ts`.
export type StatusNotificacao = 'pendente' | 'confirmada' | 'descartada'

export interface NotificacaoPendente {
  id?: number
  // Id gerado no lado nativo (UUID) — é a chave de deduplicação entre a fila
  // nativa e este banco (INDEXADO: `.where('idNativo')`, ver v8).
  idNativo: string
  pacote: string // ex.: com.bradesco
  app: string // nome legível do app, ex.: "Bradesco"
  titulo: string
  texto: string // texto cru completo da notificação — NUNCA editado
  recebidoEm: string // ISO completo (data+hora)
  valor?: number // valor reconhecido no texto (sempre positivo)
  tipo?: 'saida' | 'entrada' // palpite pela leitura do texto
  status: StatusNotificacao
  lancamentoId?: number // preenchido ao confirmar
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
//
// ============================ CONGELADO EM 4 ============================
// 10/09/2026: o Rafael passou a usar o app com LANÇAMENTOS REAIS no celular
// (build instalada por cima, dados preservados). A partir daqui esta
// constante NÃO PODE mais ser incrementada em nenhuma rodada — trocar o
// número troca o NOME do banco, e o app abriria vazio no aparelho dele, sem
// aviso e sem desfazer. Se algum dia uma semente nova for mesmo necessária,
// o caminho é: (1) ele faz o backup por Configurações → Manutenção e dados →
// "Fazer backup de tudo"; (2) o app muda; (3) ele restaura o arquivo. Nunca
// mais um banco descartável.
// =======================================================================
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
  planos!: EntityTable<PlanoRegistro, 'id'>
  usuariosN0!: EntityTable<UsuarioN0, 'id'>
  notificacoesPendentes!: EntityTable<NotificacaoPendente, 'id'>

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
    // v7 (08/09/2026, Roteiro de Parametrização Morfo, G59 — rebuild N0/N1):
    // 2 tabelas NOVAS — `planos` (migra `PLANOS_STUB`, fixo em código até
    // agora, pra um cadastro real editável pelo painel N0) e `usuariosN0`
    // (registro de administradores Morfo, ver `UsuarioN0` acima). Tabela
    // nova sempre exige bump (mesma regra já documentada na v6).
    // `usuariosN0` INDEXA `email` (diferente de `planos`, que só usa
    // `.toArray()`) — `src/kit/authN0.ts` faz
    // `db.usuariosN0.where('email').equals(...)` pra não duplicar o mesmo
    // administrador ao criar acesso; sem o índice, o Dexie lança
    // `SchemaError` na hora do `.where()` (mesmo bug de classe já
    // documentado neste arquivo pra `transferenciaId`, v5).
    // `credencialEmailN0`/`credencialSenhaN0`/`sessaoAtivaN0`/`marcaSelo...`
    // (em `ConfiguracaoIcones`, ver acima) são campos aditivos no singleton
    // já existente — não precisam de bump, mesma regra de sempre.
    //
    // BUG REAL CORRIGIDO (08/09/2026, mesma rodada, achado por Playwright
    // antes de entregar): a 1ª versão desta migração semeava os 2 planos
    // placeholder aqui, dentro de `.upgrade()` — funciona pra quem já tinha
    // um banco na v6 e está subindo pra v7, mas o Dexie NUNCA roda callback
    // de `.upgrade()` pra um banco criado do zero (verno 0 → aplica só o
    // schema final direto, sem "migrar" nada) — então toda instalação NOVA
    // (o caso mais comum: qualquer pessoa abrindo esta build pela 1ª vez)
    // nascia com `planos` vazia, e a tela "Gerenciar Planos"/Planos do site
    // ficavam sem nenhum plano pra mostrar. Corrigido: a semente dos 2
    // planos placeholder virou responsabilidade de `seedIfEmpty()`
    // (`src/seed.ts`) — mesmo lugar que já semeia categorias/grupos/contas
    // pra banco novo — mas com um guard PRÓPRIO (`db.planos.count()`),
    // separado do guard de categorias, porque um banco que já estava na v6
    // (categorias já semeadas) também precisa ganhar os planos ao migrar
    // pra v7, e o guard de categoria sozinho pularia esse caso.
    this.version(7).stores({
      contas: '++id, nome, tipo, ativa',
      categorias: '++id, nome, grupo, ativa',
      grupos: '++id, nome, ativo',
      lancamentos: '++id, dataCompetencia, contaId, categoriaId, status, chaveImportacao, serieId, transferenciaId',
      metas: '++id, grupo, mesVigencia',
      saldosInformados: '++id, contaId, dataReferencia',
      usuarios: '++id, login',
      configuracoes: 'id',
      planos: '++id',
      usuariosN0: '++id, email',
    })

    // v8 (09/09/2026, notificação bancária): tabela NOVA
    // `notificacoesPendentes` (ver `NotificacaoPendente` acima). Tabela nova
    // sempre exige bump (regra da v6). INDEXA `idNativo` porque
    // `src/notificacaoBancaria.ts` faz `.where('idNativo').equals(...)` pra
    // não duplicar a mesma notificação quando a fila nativa é lida mais de
    // uma vez (sem índice → `SchemaError`, mesma classe de bug da v5/v7), e
    // `status` porque a tela lista só as pendentes. Nenhuma tabela existente
    // mudou; sem `.upgrade()` (campo novo em tabela nova, nada a migrar).
    this.version(8).stores({
      contas: '++id, nome, tipo, ativa',
      categorias: '++id, nome, grupo, ativa',
      grupos: '++id, nome, ativo',
      lancamentos: '++id, dataCompetencia, contaId, categoriaId, status, chaveImportacao, serieId, transferenciaId',
      metas: '++id, grupo, mesVigencia',
      saldosInformados: '++id, contaId, dataReferencia',
      usuarios: '++id, login',
      configuracoes: 'id',
      planos: '++id',
      usuariosN0: '++id, email',
      notificacoesPendentes: '++id, idNativo, status',
    })
  }
}

export const db = new MFinpDB()
