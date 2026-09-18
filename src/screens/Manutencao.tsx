import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { exportarConfiguracaoIcones } from '../iconesPadrao'
import {
  montarBackup, nomeArquivoBackup, usuarioDoBackup, lerArquivoBackup, restaurarBackup,
  totalDeRegistros, tabelasForaDoBackup, ROTULO_TABELA, type ResumoBackup,
} from '../backup'
import { limparCacheDoNavegador, resumoCache } from '../cacheApp'
import { limparLancamentosEHistorico, restaurarPadraoDeFabrica } from '../padraoDeFabrica'
import { salvarArquivoTexto, escolherArquivoTexto } from '../arquivoLocal'
import { BUILD_NUMBER } from '../buildInfo'
import {
  useOrdemAbas,
  salvarOrdemAbas,
} from '../configuracaoIcones'
import { sair } from '../kit/auth'
import { usePlanoAtual } from '../kit/planoAtual'
import { contarDoAmbiente } from '../ambiente'
import ConfirmacaoAcao from '../components/ConfirmacaoAcao'
import {
  usePlatformN0,
  usePosicaoN1Proprio,
  salvarPosicaoN1Proprio,
  useMenuPosN1Proprio,
  salvarMenuPosN1Proprio,
  posicaoMenuDe,
  normalizarMenuPosModo,
  ITENS_NAV_N1,
  ITEM_PROTEGIDO_N1,
  MENU_POSICOES,
  type PosicaoMenu,
} from '../kit/kitPlatform'

// Rótulos das 5 abas do rodapé, pra tela de reordenação abaixo — mesmas
// chaves/nomes de `TELAS` em `App.tsx` (não importado daqui de propósito,
// pra não criar um acoplamento maior entre os dois arquivos só por causa de
// rótulo de texto).
/* Build 086: 'resumo' saiu (a tela foi apagada com a versão Premium) e
   'situacao' passou a ser a tela Hoje — a chave continua a mesma, porque é
   ela que está gravada em `ordemAbas`; só o rótulo mudou. */
const ABAS_ROTULO: Record<string, string> = {
  situacao: 'Hoje',
  lancamentos: 'Lançamentos',
  carteira: 'Carteira',
  planejamento: 'Planejamento',
}
const ORDEM_ABAS_PADRAO = ['situacao', 'lancamentos', 'carteira', 'planejamento']

// Itens do menu de engrenagem (08/09/2026, correção pós-G59) — mesmas
// chaves/rótulos de `ITENS_MENU_ENGRENAGEM_PADRAO`/`ROTULO_MENU_ENGRENAGEM`
// em `App.tsx` (não importado daqui, mesmo motivo do bloco acima: rótulo
// de texto não merece acoplar os dois arquivos).
// 10/09/2026: esta lista estava DESATUALIZADA (7 itens, "Suporte
// (WhatsApp)") desde que o menu cresceu pra 13 — a tela de reordenação
// mostrava menos itens do que o menu tinha de verdade. Agora é a mesma lista
// da tela única de Configurações (`ITENS_MENU_ENGRENAGEM_PADRAO`/
// `ROTULO_MENU_ENGRENAGEM` em `App.tsx`), e a ordem salva aqui reordena cada
// item DENTRO da sua sessão do Kit ("Do dia a dia" / "Ajustes do sistema" /
// "Dados e saída") — nunca esconde nenhum, como sempre.

// Tela "Manutenção" (01/09/2026, rodada seguinte) — pedido direto do Rafael
// depois de um susto real: pra conseguir ver a versão mais nova do app, ele
// precisou "limpar o cache" do navegador, e isso apagou os lançamentos que
// já tinha testado — porque a caixa "Limpar dados de navegação" do Chrome
// tem uma opção só ("Cookies e outros dados do site") que apaga cache E
// IndexedDB juntos, sem distinguir "código velho preso" de "banco de dados".
//
// Investigado nesta rodada, medido de verdade (não só suposto): sob
// `file://` (o jeito que o Rafael sempre abre o app), o navegador NUNCA
// registra Service Worker nesse tipo de origem (é bloqueado pela própria
// especificação — origem "opaca", sem HTTPS/localhost) e o Cache Storage
// deste app está sempre vazio (confirmado por teste) — ou seja, tecnicamente
// não existe "cache de código" nenhum pra limpar aqui, sob `file://`. O
// botão abaixo continua útil como rede de segurança (útil de verdade se um
// dia o app for aberto hospedado, ex. Cloudflare — aí sim Service
// Worker/Cache Storage existem de verdade) e é 100% seguro (nunca toca em
// IndexedDB), mas o problema real do Rafael quase certamente foi outro,
// documentado nas duas seções abaixo.
//
// REMOVIDO nesta tela (08/09/2026, G59 — "critério de aceite binário do
// encaixe"): a seção "Painel N0 (Morfo)" com o botão "Abrir painel N0" —
// G59 proíbe explicitamente qualquer entrada pro N0 dentro do N1 ("Não
// existe entrada pro N0 dentro do N1"). O painel N0 agora só é alcançável
// por um login próprio, separado, direto do site deslogado (ver
// `src/kit/LoginView.tsx`/`src/kit/authN0.ts`/`src/kit/AppRoot.tsx`) — o
// mesmo gap que gerou a Lição 16 (`Lições Aprendidas.md` do Project).
export default function Manutencao({
  aoVoltar,
  onAbrirFerramentasTeste,
  onIrParaAssinatura,
  secao,
  focarLimparDados,
}: {
  aoVoltar: () => void
  /* 10/09/2026 (tela única de Configurações, pedido do Rafael): esta tela
     passou a ser alcançada por DOIS itens diferentes da tela de
     Configurações, cada um mostrando só a parte que lhe cabe na sessão do
     Kit — 'layout' ("Ajustes do sistema" → Layout e Menus: Visão do app,
     ordem do rodapé e ordem dos itens de configuração) e 'dados' ("Dados e
     saída" → Manutenção e dados: tour, ferramentas de teste, limpar dados,
     exportar ícones e o diagnóstico de cache). Sem o prop, a tela continua
     mostrando TUDO, como sempre mostrou — nenhuma seção foi removida. */
  secao?: 'layout' | 'dados'
  /* Chegou por "Limpar todos os dados" (sessão "Dados e saída" da tela de
     Configurações): rola até o bloco, em vez de abrir a tela no topo e
     deixar a pessoa procurando. */
  focarLimparDados?: boolean
  // Roteiro de Parametrização Morfo, Etapa 6 (05/09/2026) — abre o tour
  // guiado (spotlight), ver `src/kit/GuidedTour.tsx`.
  // Roteiro de Parametrização Morfo, Etapa 7 (05/09/2026) — abre a
  // ferramenta de simular data de hoje, ver `src/kit/SimularData.tsx`.
  onAbrirFerramentasTeste: () => void
  // 11/09/2026 (achado real, comparação pixel a pixel — "Posição dos menus"
  // abaixo é recurso de plano, ver `Plano.restricoes.layoutPersonalizado`):
  // manda pra "Minha Assinatura" quando a pessoa toca em "Conhecer planos"
  // no cartão travado. Mesmo padrão de `abrirSuporte` em `AjudaN1`
  // (`App.tsx`) — quem chama decide o "voltar pra onde", esta tela só avisa
  // que a pessoa quer ir.
  onIrParaAssinatura: () => void
}) {
  const [rodando, setRodando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [saindo, setSaindo] = useState(false)

  // Layout do rodapé — ordem das abas (04/09/2026, Roteiro de Parametrização
  // Morfo, Etapa 4 — Kit de Estrutura Mínima, adaptação da seção "Ordem dos
  // menus" de `LayoutTenantScreen` do Kit). Só REORDENA — desde a build 087
  // as quatro abas existem para todo mundo, e quem some com uma da navegação é
  // só o "Ocultar" do Layout do Sistema (N0), nunca esta tela.
  /* Ordem própria do ambiente × padrão da Morfo (12/09/2026): sem ordem
     própria, vale a do N0 (`layoutConfig.ordemAbasN1`), como em `App.tsx`.
     Uma lista vazia gravada é o "sem ordem própria" — é o que o botão
     "Redefinir padrão" grava. */
  const layoutCfgN0 = usePlatformN0().layoutConfig
  const ordemSalvaBruta = useOrdemAbas()
  const ordemSalvaPropria = ordemSalvaBruta && ordemSalvaBruta.length > 0 ? ordemSalvaBruta : undefined
  const ordemSalva = ordemSalvaPropria ?? layoutCfgN0?.ordemAbasN1
  const ordemAbas = ordemSalva ?? ORDEM_ABAS_PADRAO
  function moverAba(chave: string, direcao: -1 | 1) {
    const i = ordemAbas.indexOf(chave)
    const j = i + direcao
    if (i < 0 || j < 0 || j >= ordemAbas.length) return
    const nova = [...ordemAbas]
    ;[nova[i], nova[j]] = [nova[j], nova[i]]
    salvarOrdemAbas(nova)
  }


  // "Posição dos menus (Barra × "⋮" × Ocultar)" e "Posição do botão "⋮""
  // (11/09/2026 — achado real, comparação visual pixel a pixel contra o
  // Projeto Modelo: o Kit tem essa camada em `LayoutTenantScreen`,
  // autoatendimento do PRÓPRIO ambiente, por cima do padrão que a Morfo
  // define pra plataforma inteira (`layoutCfgN0.posicaoN1`/`menuPosN1`,
  // editado em N0 → Parâmetros → Layout do Sistema); o MorfoFinP só tinha a
  // camada de cima. Ver `kit/kitPlatform.ts` — `posicaoMenuDe` chamado 2x em
  // cascata: 1ª vez resolve o padrão da Morfo, 2ª vez aplica o mapa do
  // próprio ambiente por cima disso. Sem nada gravado em nenhum dos dois
  // níveis, cada item cai no padrão dele mesmo (`ITENS_NAV_N1`) — o app como
  // sempre foi. "Configuração" nunca aceita "Ocultar" (`ITEM_PROTEGIDO_N1`)
  // — esconder o caminho de volta às configurações trancaria a pessoa fora.
  // Atrás do gate de plano `Plano.restricoes.layoutPersonalizado`
  // (`usePlanoAtual`, mesma marketing copy de `recursosAutomaticos()` em
  // `kit/planos.ts`).
  const planoAtual = usePlanoAtual()
  const layoutLiberado = !!planoAtual?.restricoes?.layoutPersonalizado
  const posicaoProprio = usePosicaoN1Proprio()
  const menuPosProprio = useMenuPosN1Proprio()
  const posicaoEfetivaDoItem = (item: { key: string; padrao: PosicaoMenu }): PosicaoMenu => {
    const padraoMorfo = posicaoMenuDe(layoutCfgN0?.posicaoN1, item, ITEM_PROTEGIDO_N1)
    return posicaoMenuDe(posicaoProprio, { key: item.key, padrao: padraoMorfo }, ITEM_PROTEGIDO_N1)
  }
  const menuPosEfetivo = normalizarMenuPosModo(menuPosProprio?.modo ?? layoutCfgN0?.menuPosN1?.modo)


  // "Limpar dados" (04/09/2026, pedido do Rafael) — apaga TODOS os
  // lançamentos, inclusive os gerados por série fixa/parcelada (é a mesma
  // tabela `lancamentos`, sem distinção especial pra recorrência — apagar a
  // tabela inteira já cobre isso). Categorias, contas, grupos e
  // configurações (ícones, layout) NUNCA são tocados aqui, de
  // propósito — é limpeza de LANÇAMENTO, não um reset de cadastro. Efeito
  // colateral esperado, não um bug: depois de limpar, uma série "fixa" que
  // existia perde a última ocorrência de referência, então
  // `avancarSeriesFixasPendentes()` não tem mais de onde continuar — só
  // volta a gerar sozinha se um lançamento fixo novo for cadastrado depois.
  const totalLancamentos = useLiveQuery(() => contarDoAmbiente(db.lancamentos.toArray()), [])
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false)
  const [resultadoLimpeza, setResultadoLimpeza] = useState<string | null>(null)

  /* Build 099: "Limpar dados" apaga os lançamentos e o que depende deles
     (notificações do banco, saldos informados) — e limpa o cache junto,
     pedido do Rafael. Contas, categorias, grupos, metas e configurações
     ficam exatamente como estão. */
  async function limparTodosLancamentos() {
    setOcupadoBackup('apagando')
    try {
      const r = await limparLancamentosEHistorico()
      const cache = await limparCacheDoNavegador()
      setResultadoLimpeza(
        `${r.lancamentos} lançamento(s) apagado(s), incluindo os de séries fixas e parcelas` +
          (r.notificacoes ? `, mais ${r.notificacoes} notificação(ões) do banco` : '') +
          `. Contas, categorias, grupos, metas e configurações continuam intactos. ${resumoCache(cache)}`,
      )
    } catch (e) {
      setResultadoLimpeza('Não consegui limpar: ' + ((e as Error)?.message || 'erro desconhecido'))
    }
    setConfirmandoLimpeza(false)
    setOcupadoBackup('')
  }

  /* ---- Backup / Restaurar / Apagar tudo (10/09/2026, pedido do Rafael) ----
     O app guarda tudo só no aparelho. Sem estes três botões, desinstalar,
     limpar o armazenamento pelo Android ou trocar de celular apaga os
     lançamentos reais sem nenhuma recuperação possível. O arquivo é um
     retrato do banco INTEIRO (ver `src/backup.ts`) — não uma seleção. */
  const [ocupadoBackup, setOcupadoBackup] = useState<'' | 'gerando' | 'lendo' | 'restaurando' | 'apagando'>('')
  const [avisoBackup, setAvisoBackup] = useState<string | null>(null)
  const [erroBackup, setErroBackup] = useState<string | null>(null)
  const [backupNaTela, setBackupNaTela] = useState<string | null>(null)
  const [pendenteRestauro, setPendenteRestauro] = useState<{ nome: string; resumo: ResumoBackup; arquivo: Parameters<typeof restaurarBackup>[0] } | null>(null)
  const [confirmandoFabrica, setConfirmandoFabrica] = useState(false)
  const foraDoBackup = tabelasForaDoBackup()

  async function gerarBackup() {
    setErroBackup(null); setAvisoBackup(null); setBackupNaTela(null); setOcupadoBackup('gerando')
    try {
      const arquivo = await montarBackup(BUILD_NUMBER)
      /* Build 089: o nome passou a levar o usuário — `Bkp MFinp <Usuário>
         DDMMAA_HHMM.json` (formato da build 099). Resolvido aqui, no momento de gerar, e não
         guardado em lugar nenhum: se a pessoa trocar de acesso, o próximo
         backup já sai com o nome novo sem nada pra sincronizar. */
      const nome = nomeArquivoBackup(await usuarioDoBackup())
      const conteudo = JSON.stringify(arquivo)
      const total = totalDeRegistros(arquivo.contagens)
      const r = await salvarArquivoTexto(nome, conteudo)
      if (r.via === 'app') setAvisoBackup(`Backup de ${total} registro(s) salvo no aparelho, em ${r.caminho}. Se a folha de compartilhamento abriu, dá pra mandar também pro Drive, e-mail ou WhatsApp.`)
      else if (r.via === 'compartilhar') setAvisoBackup(`Backup de ${total} registro(s) gerado e enviado pro app que você escolheu (${nome}).`)
      else if (r.via === 'download') setAvisoBackup(`Backup de ${total} registro(s) baixado como ${nome}. Guarde esse arquivo fora do aparelho.`)
      else {
        setBackupNaTela(conteudo)
        setAvisoBackup(`Não deu pra salvar o arquivo aqui (${r.motivo}). O conteúdo está abaixo: copie e salve num arquivo .json — ele restaura igual.`)
      }
    } catch (e) {
      setErroBackup('Não consegui gerar o backup: ' + ((e as Error)?.message || 'erro desconhecido'))
    }
    setOcupadoBackup('')
  }

  async function escolherBackupParaRestaurar() {
    setErroBackup(null); setAvisoBackup(null); setBackupNaTela(null); setOcupadoBackup('lendo')
    try {
      const arq = await escolherArquivoTexto()
      if (!arq) { setOcupadoBackup(''); return }
      const lido = lerArquivoBackup(arq.texto)
      if (!lido.ok) { setErroBackup(lido.erro); setOcupadoBackup(''); return }
      setPendenteRestauro({ nome: arq.nome, resumo: lido.resumo, arquivo: lido.arquivo })
    } catch (e) {
      setErroBackup('Não consegui ler o arquivo: ' + ((e as Error)?.message || 'erro desconhecido'))
    }
    setOcupadoBackup('')
  }

  async function confirmarRestauro() {
    if (!pendenteRestauro) return
    setOcupadoBackup('restaurando'); setErroBackup(null)
    try {
      const aplicados = await restaurarBackup(pendenteRestauro.arquivo)
      setAvisoBackup(`Backup restaurado: ${totalDeRegistros(aplicados)} registro(s) no lugar do que havia antes. Pode conferir nas telas.`)
      setPendenteRestauro(null)
    } catch (e) {
      setErroBackup('A restauração FALHOU e nada foi alterado: ' + ((e as Error)?.message || 'erro desconhecido'))
    }
    setOcupadoBackup('')
  }

  /* Build 099 — "Restaurar padrão de fábrica" no lugar de "Apagar tudo".
     Ver o cabeçalho de `src/padraoDeFabrica.ts`. Termina com o cache limpo e
     o LOGOUT: `AppRoot.tsx` troca pra tela de entrada sozinho quando a sessão
     cai, e o próximo login cai nas boas-vindas e no passo a passo. */
  async function executarPadraoDeFabrica() {
    setOcupadoBackup('apagando'); setErroBackup(null); setAvisoBackup(null)
    try {
      await restaurarPadraoDeFabrica()
      await limparCacheDoNavegador()
      setConfirmandoFabrica(false)
      await sair()
      return
    } catch (e) {
      setErroBackup('Não consegui restaurar o padrão de fábrica: ' + ((e as Error)?.message || 'erro desconhecido'))
    }
    setConfirmandoFabrica(false)
    setOcupadoBackup('')
  }

  // 04/09/2026, pedido do Rafael: ele queria travar como "padrão do
  // sistema" os ícones que já tinha escolhido em Categorias e Grupos —
  // mas esse dado vive só no IndexedDB do navegador dele, sem acesso
  // remoto nenhum daqui de fora. Esse botão gera um JSON com o ícone
  // atual de cada categoria/grupo pra ele copiar e mandar de volta —
  // depois disso vira o conteúdo de `src/iconesPadrao.ts`, usado tanto
  // pela semente de um banco novo quanto pelo botão "Restaurar Padrão"
  // em Categorias e Grupos.
  const [exportacaoIcones, setExportacaoIcones] = useState<string | null>(null)
  const [copiado, setCopiado] = useState(false)

  // F-06b da revisão de UI (04/09/2026): as duas seções de texto de
  // referência (mais de 15 linhas juntas) viviam sempre abertas — úteis só
  // na hora de um problema real, ruído em qualquer outra visita. Viram um
  // único acordeão fechado por padrão.
  const [referenciaAberta, setReferenciaAberta] = useState(false)

  async function exportarIcones() {
    const json = await exportarConfiguracaoIcones()
    setExportacaoIcones(json)
    setCopiado(false)
  }

  async function copiarExportacao() {
    if (!exportacaoIcones) return
    try {
      await navigator.clipboard.writeText(exportacaoIcones)
      setCopiado(true)
    } catch {
      // Esperado em vários navegadores sob file:// (Clipboard API bloqueada
      // nessa origem) — a textarea abaixo já serve de fallback pra
      // selecionar e copiar na mão.
      setCopiado(false)
    }
  }

  async function limparCacheSemPerderDados() {
    setRodando(true)
    setResultado(null)
    /* A rotina é compartilhada com "Limpar dados" e "Restaurar padrão de
       fábrica" (build 099) — ver `src/cacheApp.ts`. O IndexedDB (seus
       lançamentos, categorias, contas, grupos) NUNCA é tocado aqui. */
    const r = await limparCacheDoNavegador()
    if (r.swRemovidos > 0 || r.cachesRemovidos > 0) {
      setResultado(
        `${resumoCache(r)} Seus lançamentos, categorias, contas e grupos continuam exatamente como estavam — nada nisso foi tocado.`
      )
    } else if (r.swIndisponivel && !r.cachesErro) {
      setResultado(
        'Nada pra limpar: abrindo o app como arquivo (não hospedado), o navegador não guarda esse tipo de cache — não é esse o mecanismo do problema que você viu. Seus lançamentos continuam intactos. Veja as duas seções abaixo pra resolver de verdade.'
      )
    } else {
      setResultado(
        'Verificado: nenhum Service Worker nem cache de versão antiga encontrado neste navegador. Seus lançamentos continuam intactos.'
      )
    }
    setRodando(false)
  }

  const refLimpar = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focarLimparDados) refLimpar.current?.scrollIntoView({ block: 'start' })
  }, [focarLimparDados])

  const mostraLayout = secao !== 'dados'
  const mostraDados = secao !== 'layout'

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>{secao === 'layout' ? 'Layout e Menus' : secao === 'dados' ? 'Manutenção e Saída' : 'Manutenção'}</h1>
      </div>

      {mostraLayout && (
      <>
      {/* A seção "Visão do App" (o seletor Light × Completa) SAIU NA BUILD
          087, junto com o conceito de versão — ver `migrarFimDasVersoes()` em
          `src/configuracaoIcones.ts`. Não existe mais o que escolher aqui: as
          quatro abas são de todo mundo. Diferença de acesso, quando o app for
          comercializado, é permissionamento, não layout. */}
      <h2 style={{ marginTop: 0 }}>Layout do Rodapé</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Ordem das abas do rodapé — não muda QUAIS abas aparecem, só a posição de cada uma.
        </p>
        <p className="param-exemplo" data-testid="exemplo-ordem-abas" style={{ margin: '0 0 12px' }}>
          Ex.: subir "Carteira" com a seta ↑ faz ela virar a primeira aba, à esquerda de tudo.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ordemAbas.map((chave, i) => (
            <div
              key={chave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                border: '1px solid var(--borda)',
                borderRadius: 10,
                padding: '7px 10px',
              }}
            >
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{ABAS_ROTULO[chave] ?? chave}</span>
              <button
                type="button"
                disabled={i === 0}
                onClick={() => moverAba(chave, -1)}
                style={{ marginTop: 0, padding: '4px 10px', opacity: i === 0 ? 0.35 : 1 }}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={i === ordemAbas.length - 1}
                onClick={() => moverAba(chave, 1)}
                style={{ marginTop: 0, padding: '4px 10px', opacity: i === ordemAbas.length - 1 ? 0.35 : 1 }}
              >
                ↓
              </button>
            </div>
          ))}
        </div>
        {/* Redefinir padrão (12/09/2026, pedido do Rafael): apaga a ordem
            DESTE ambiente e volta a seguir o padrão que a Morfo salvou no N0
            (Parâmetros › Layout do Sistema › "Ordem dos menus"). Quem nunca
            mexeu já segue esse padrão — por isso o botão só aparece quando
            existe ordem própria gravada. */}
        {ordemSalvaPropria && (
          <button type="button" className="primario" style={{ marginTop: 12 }} onClick={() => void salvarOrdemAbas([])}>
            Redefinir padrão (voltar à ordem da Morfo)
          </button>
        )}
      </div>

      {/* "Ordem da tela de Configurações" saiu daqui em 12/09/2026 (pedido do
          Rafael: "no N1 essa configuração deve deixar de existir e deve ir pro
          N0"). Agora é padrão da plataforma, editado em N0 › Parâmetros ›
          Layout do Sistema › "Ordem dos menus" — ver `LayoutConfig.ordemConfigN1`. */}

      <h2>Posição dos menus (Barra × "⋮" × Ocultar)</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Decide, item a item, se ele aparece na barra do rodapé, dentro do "⋮" ou em lugar nenhum.
          Vale só pro seu ambiente, por cima do padrão que a Morfo definiu pro sistema inteiro.
          "Configuração" nunca pode ser ocultada — sem ela não haveria como voltar até aqui.
        </p>
        <p className="param-exemplo" data-testid="exemplo-posicao-menus" style={{ margin: '0 0 12px' }}>
          Ex.: marcar "Planejamento" como "⋮" tira ele do rodapé e deixa só dentro do menu de três pontos.
        </p>
        {!layoutLiberado ? (
          <div style={{ border: '1.5px dashed var(--borda)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Recurso do plano</div>
            <p className="texto-fraco" style={{ margin: '0 0 12px' }}>
              Personalizar a posição dos seus próprios menus é um recurso de planos superiores.
              Enquanto isso, seu ambiente usa o layout padrão definido pela Morfo.
            </p>
            <button type="button" className="primario" style={{ marginTop: 0 }} onClick={onIrParaAssinatura}>
              Conhecer planos
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ITENS_NAV_N1.map((item) => {
              const atual = posicaoEfetivaDoItem(item)
              const temOverride = posicaoProprio?.[item.key] !== undefined
              const opcoes: { v: PosicaoMenu; l: string }[] =
                (ITEM_PROTEGIDO_N1 as readonly string[]).includes(item.key)
                  ? [{ v: 'rodape', l: 'Barra' }, { v: 'menu', l: '"⋮"' }]
                  : [{ v: 'rodape', l: 'Barra' }, { v: 'menu', l: '"⋮"' }, { v: 'oculto', l: 'Ocultar' }]
              return (
                <div key={item.key} style={{ border: '1px solid var(--borda)', borderRadius: 10, padding: '7px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5, minWidth: 110 }}>{item.label}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {opcoes.map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => salvarPosicaoN1Proprio(item.key, o.v)}
                          style={{
                            marginTop: 0,
                            padding: '5px 10px',
                            fontSize: 12,
                            borderRadius: 7,
                            border: '1px solid var(--borda)',
                            background: atual === o.v ? 'var(--azul)' : 'none',
                            color: atual === o.v ? '#fff' : 'inherit',
                            fontWeight: atual === o.v ? 600 : 400,
                          }}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {temOverride && (
                    <button
                      type="button"
                      onClick={() => salvarPosicaoN1Proprio(item.key, undefined)}
                      style={{ marginTop: 6, padding: 0, background: 'none', border: 'none', color: 'var(--azul)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Restaurar padrão da Morfo ↺
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <h2>Posição do Botão "⋮"</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Onde o botão "⋮" aparece, quando pelo menos um menu acima está marcado como "⋮".
        </p>
        <p className="param-exemplo" data-testid="exemplo-posicao-botao-mais" style={{ margin: '0 0 12px' }}>
          Ex.: em "Rodapé, à direita", o "⋮" vira o último item da barra e o painel dele abre pra cima.
        </p>
        {!layoutLiberado ? (
          <p className="texto-fraco" style={{ margin: 0 }}>Recurso do plano — veja a seção acima.</p>
        ) : (
          <>
            {menuPosProprio?.modo !== undefined && (
              <button
                type="button"
                onClick={() => salvarMenuPosN1Proprio(undefined)}
                style={{ marginTop: 0, marginBottom: 8, padding: 0, background: 'none', border: 'none', color: 'var(--azul)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                Restaurar padrão da Morfo ↺
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MENU_POSICOES.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => salvarMenuPosN1Proprio(o.v)}
                  style={{
                    marginTop: 0,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: menuPosEfetivo === o.v ? '1.5px solid var(--azul)' : '1.5px solid var(--borda)',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 999,
                      border: `2px solid ${menuPosEfetivo === o.v ? 'var(--azul)' : 'var(--texto-fraco)'}`,
                      background: menuPosEfetivo === o.v ? 'var(--azul)' : 'transparent',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{o.l}</div>
                    <div className="texto-fraco" style={{ fontSize: 11, marginTop: 2, lineHeight: 1.4 }}>{o.d}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      </>
      )}

      {mostraDados && (
      <>
      <h2 style={secao === 'dados' ? { marginTop: 0 } : undefined}>Conta</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          "Minha Assinatura" agora vive no menu de engrenagem principal (Roteiro de Parametrização
          Morfo, Etapa 8 — Login/Ambiente Logado). Este botão só encerra a sessão atual, voltando pra
          tela de entrada — seus lançamentos, categorias, contas e grupos continuam intactos, e a
          mesma credencial funciona pra entrar de novo.
        </p>
        <button
          type="button"
          className="perigo"
          disabled={saindo}
          onClick={async () => {
            setSaindo(true)
            await sair()
            // Sem `setSaindo(false)` no sucesso: `AppRoot.tsx` já troca pra
            // `LoginView` sozinho assim que `sessaoAtiva` vira `false`
            // (reativo via `useLiveQuery`) — este componente é desmontado
            // antes de qualquer novo render precisar do estado local.
          }}
        >
          {saindo ? 'Saindo…' : 'Sair'}
        </button>
      </div>

      {/* "Tour guiado" saiu daqui em 12/09/2026: estava duplicado — o mesmo
          botão já vive em Configurações › Ajuda, que é o lugar dele. */}

      <h2>Ferramentas de Teste</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Simular data de hoje — testa status (Atrasado/A pagar/A receber), projeção e séries fixas
          como se o tempo tivesse passado. Nunca edita nem apaga lançamento existente. Enquanto ativa,
          um aviso fixo aparece no topo do app inteiro, em qualquer tela.
        </p>
        <button type="button" className="primario" onClick={onAbrirFerramentasTeste}>
          Simular data de hoje
        </button>
      </div>

      <p className="texto-fraco">
        Se depois de abrir um arquivo novo o app continuar parecendo com a versão antiga (um bug já
        corrigido "voltando", um recurso novo que não aparece), o botão abaixo remove qualquer
        versão antiga do app que o navegador tenha guardado sozinho — sem apagar nenhum dos seus
        lançamentos, categorias, contas ou grupos.
      </p>

      <div className="cartao">
        <button type="button" className="primario" onClick={limparCacheSemPerderDados} disabled={rodando}>
          {rodando ? 'Limpando…' : 'Limpar cache do app (mantém meus lançamentos)'}
        </button>
        {resultado && (
          <p style={{ marginTop: 12 }} className="texto-fraco">
            {resultado}
          </p>
        )}
      </div>

      {/* ---- Backup, restauração e apagar tudo (10/09/2026) ---- */}
      <h2>Backup de Tudo</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Gera <strong>um arquivo</strong> com o app inteiro: lançamentos (com as séries fixas e
          parceladas), categorias, grupos, contas e carteiras, metas, planos, notificações e todas as
          configurações — ícones, tema, visão do app, ordem dos menus e o painel N0. Guarde esse
          arquivo fora do celular: hoje ele é a <strong>única</strong> forma de recuperar seus dados
          se o aparelho for perdido, trocado ou o app for desinstalado.
        </p>
        {foraDoBackup.length > 0 && (
          <p className="valor-neg" style={{ fontSize: 12.5, fontWeight: 600 }}>
            Atenção: {foraDoBackup.length} tabela(s) do banco não estão na lista do backup ({foraDoBackup.join(', ')}). Avise, porque isso é erro de código.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="primario" disabled={ocupadoBackup !== ''} onClick={() => void gerarBackup()}>
            {ocupadoBackup === 'gerando' ? 'Gerando…' : 'Fazer backup de tudo'}
          </button>
          <button type="button" className="primario" disabled={ocupadoBackup !== ''} onClick={() => void escolherBackupParaRestaurar()}>
            {ocupadoBackup === 'lendo' ? 'Abrindo…' : 'Restaurar backup'}
          </button>
        </div>

        {erroBackup && <p className="valor-neg" style={{ fontSize: 13, fontWeight: 600 }}>{erroBackup}</p>}
        {avisoBackup && <p className="texto-fraco" style={{ marginTop: 12 }}>{avisoBackup}</p>}

        {backupNaTela && (
          <>
            <textarea
              readOnly
              aria-label="Conteúdo do backup"
              value={backupNaTela}
              onFocus={(e) => e.currentTarget.select()}
              style={{ width: '100%', minHeight: 120, marginTop: 10, fontFamily: 'monospace', fontSize: 11 }}
            />
            <button type="button" className="secundario" style={{ marginTop: 8 }} onClick={() => { void navigator.clipboard?.writeText(backupNaTela).then(() => setAvisoBackup('Copiado. Cole num arquivo .json e guarde.')) }}>
              Copiar
            </button>
          </>
        )}

        {/* Confirmação da restauração: só depois de LER o arquivo e mostrar o
            que tem dentro dele — restaurar substitui tudo o que está no app. */}
        {pendenteRestauro && (
          /* Build 093 (item 5): a confirmação única do app (`ConfirmacaoAcao`);
             a lista de contagens do arquivo entra como conteúdo extra. */
          <ConfirmacaoAcao
            titulo={`Restaurar “${pendenteRestauro.nome}”?`}
            testid="confirmacao-restaurar-backup"
            aviso="Tudo o que está no app agora será substituído pelo conteúdo do arquivo. Não tem como desfazer — se o que está aqui hoje importa, faça um backup antes."
            ocupado={ocupadoBackup !== ''}
            rotuloOcupado="Restaurando…"
            onCancelar={() => setPendenteRestauro(null)}
            onConfirmar={() => void confirmarRestauro()}
          >
            <p className="texto-fraco" style={{ fontSize: 12.5, margin: '10px 0 4px' }}>
              Backup gerado em{' '}
              {pendenteRestauro.resumo.geradoEm ? new Date(pendenteRestauro.resumo.geradoEm).toLocaleString('pt-BR') : 'data desconhecida'}
              {pendenteRestauro.resumo.build ? ` · build ${String(pendenteRestauro.resumo.build).padStart(3, '0')}` : ''}.
              Ele tem {totalDeRegistros(pendenteRestauro.resumo.contagens)} registro(s):
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {Object.entries(pendenteRestauro.resumo.contagens)
                .filter(([, n]) => n > 0)
                .map(([t, n]) => (
                  <li key={t} className="texto-fraco" style={{ fontSize: 12 }}>
                    {n} — {ROTULO_TABELA[t] ?? t}
                  </li>
                ))}
            </ul>
          </ConfirmacaoAcao>
        )}
      </div>

      <h2 ref={refLimpar}>Limpar Dados</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Apaga TODOS os lançamentos ({totalLancamentos ?? 0} hoje) — inclusive os gerados por série
          fixa e por parcelamento — e as notificações do banco ligadas a eles. Contas, categorias,
          grupos, metas e configurações (ícones, tema, layout) continuam como estão. O cache do app
          é limpo junto. <strong>Não tem como desfazer.</strong>
        </p>
        <button type="button" className="perigo" onClick={() => setConfirmandoLimpeza(true)} data-testid="limpar-dados">
          Limpar dados
        </button>
        {confirmandoLimpeza && (
          /* Build 093 (item 5): a confirmação única do app. O "backup antes"
             (12/09/2026) continua — entra como conteúdo extra do modal, pela
             MESMA função do cartão "Backup de tudo". A caixa "entendo que…"
             saiu: o modelo único não tem checkbox. */
          <ConfirmacaoAcao
            titulo="Apagar todos os lançamentos?"
            testid="confirmacao-limpar-dados"
            aviso={`Apaga os ${totalLancamentos ?? 0} lançamentos de hoje, inclusive os de séries fixas e parcelas, e as notificações do banco. Contas, categorias, grupos, metas e configurações continuam. Não tem como desfazer.`}
            ocupado={ocupadoBackup !== ''}
            rotuloOcupado="Limpando…"
            onCancelar={() => setConfirmandoLimpeza(false)}
            onConfirmar={() => void limparTodosLancamentos()}
          >
            <button
              type="button"
              className="primario"
              style={{ marginTop: 12 }}
              disabled={ocupadoBackup !== ''}
              onClick={() => void gerarBackup()}
            >
              {ocupadoBackup === 'gerando' ? 'Gerando…' : 'Fazer backup antes de limpar'}
            </button>
          </ConfirmacaoAcao>
        )}
        {resultadoLimpeza && (
          <p style={{ marginTop: 12 }} className="texto-fraco" data-testid="resultado-limpeza">
            {resultadoLimpeza}
          </p>
        )}
      </div>

      {/* Build 099: "Apagar tudo" SAIU — deixava o app sem grupo nenhum e o
          passo a passo do primeiro acesso travava no passo 1 (a receita fixa
          precisa de um grupo de entrada pra ser gravada). No lugar, o par do
          "Limpar dados": ver o cabeçalho de `src/padraoDeFabrica.ts`. */}
      <h2>Restaurar Padrão de Fábrica</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Faz o que “Limpar dados” faz e, além disso, <strong>refaz os cadastros no modelo da
          Morfo</strong>: grupos e categorias padrão (com ícones e cores), nenhuma meta preenchida,
          e a carteira só com o Cofrinho padrão e um “Banco Modelo”, os dois zerados. O app
          <strong> sai da conta ao terminar</strong> e, ao entrar de novo, começa pelas boas-vindas
          e pelo passo a passo do primeiro acesso. A senha de entrada e as preferências de
          aparência (tema, zoom, layout) ficam. <strong>Faça um backup antes: não tem como desfazer.</strong>
        </p>
        <button type="button" className="perigo" onClick={() => setConfirmandoFabrica(true)} data-testid="restaurar-fabrica">
          Restaurar padrão de fábrica
        </button>
        {confirmandoFabrica && (
          <ConfirmacaoAcao
            titulo="Restaurar o padrão de fábrica?"
            testid="confirmacao-restaurar-fabrica"
            aviso={
              <>
                <p>Apaga os seus lançamentos, notificações, contas, grupos, categorias e metas, e recria só o modelo da Morfo: grupos e categorias padrão, Cofrinho padrão e Banco Modelo zerados.</p>
                <p>Ao terminar o app sai da conta; na próxima entrada você refaz o primeiro acesso do zero. Não tem como desfazer — faça um backup antes.</p>
              </>
            }
            ocupado={ocupadoBackup !== ''}
            rotuloOcupado="Restaurando…"
            onCancelar={() => setConfirmandoFabrica(false)}
            onConfirmar={() => void executarPadraoDeFabrica()}
          >
            <button
              type="button"
              className="primario"
              style={{ marginTop: 12 }}
              disabled={ocupadoBackup !== ''}
              onClick={() => void gerarBackup()}
            >
              {ocupadoBackup === 'gerando' ? 'Gerando…' : 'Fazer backup antes de restaurar'}
            </button>
          </ConfirmacaoAcao>
        )}
      </div>

      <h2>Exportar Configuração de Ícones</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Gera um texto com o ícone/estilo/cor de cada categoria e grupo cadastrados agora mesmo. Use
          pra mandar de volta na conversa quando pedir pra travar os ícones atuais como padrão do
          sistema.
        </p>
        <button type="button" className="primario" onClick={exportarIcones}>
          Exportar
        </button>
        {exportacaoIcones && (
          <>
            <textarea
              readOnly
              aria-label="Configuração de ícones exportada, em JSON"
              value={exportacaoIcones}
              rows={10}
              style={{ width: '100%', marginTop: 12, fontFamily: 'monospace', fontSize: 12 }}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button type="button" className="primario" style={{ marginTop: 8 }} onClick={copiarExportacao}>
              {copiado ? 'Copiado!' : 'Copiar'}
            </button>
            <p className="texto-fraco" style={{ marginTop: 8 }}>
              Se o botão "Copiar" não funcionar (comum abrindo como arquivo), toque no texto acima —
              ele já seleciona tudo sozinho — e copie na mão.
            </p>
          </>
        )}
      </div>

      <h2>Seus dados não desapareceram?</h2>
      <div className="cartao">
        <button
          type="button"
          className={`botao-explicacao ${referenciaAberta ? 'aberto' : ''}`}
          onClick={() => setReferenciaAberta((v) => !v)}
        >
          <span className="seta-expandir">▶</span>
          Veja aqui — onde ficam guardados e o que fazer se um dia sumirem
        </button>
        {referenciaAberta && (
          <>
            <div style={{ marginTop: 12 }}>
              <strong style={{ fontSize: 13 }}>Onde seus lançamentos ficam guardados de verdade</strong>
              <p className="texto-fraco" style={{ marginTop: 6 }}>
                Os lançamentos, categorias, contas e grupos ficam guardados no mecanismo de banco de
                dados do navegador (não em cache) — e ficam PRESOS a um navegador e um perfil
                específicos, não ao arquivo em si. Duas situações mostram "nenhum registro" sem que
                nada tenha sido apagado de verdade: (1) abrir numa aba anônima/privada — ela sempre
                começa vazia, de propósito, e não guarda nada ao fechar; (2) abrir num navegador
                diferente do de sempre (ex. Firefox em vez de Chrome, ou um Chrome de outro
                perfil/conta) — cada navegador guarda seus próprios dados, sem compartilhar com os
                outros. Continue sempre usando o MESMO navegador, MESMO perfil, sem aba anônima, e os
                dados persistem normalmente de um arquivo novo para o próximo.
              </p>
            </div>
            <div style={{ marginTop: 16 }}>
              <strong style={{ fontSize: 13 }}>Se isso não resolver — passo a passo seguro no Chrome</strong>
              <p className="texto-fraco" style={{ marginTop: 6 }}>
                O motivo mais comum de "parece com a versão antiga" nem é cache — é a mesma aba do
                navegador já estar aberta desde antes, ainda rodando o código antigo na memória. Antes
                de qualquer outra coisa: feche essa aba por completo (não só recarregue por cima dela)
                e abra o arquivo novo do zero — isso nunca apaga nenhum dado.
              </p>
              <p className="texto-fraco" style={{ marginTop: 10 }}>
                Se ainda assim persistir, dá pra limpar só o cache do Chrome sem tocar nos seus dados:
                Configurações → Privacidade e segurança → Limpar dados de navegação → marque só
                "Imagens e arquivos armazenados em cache" → <strong>deixe desmarcado</strong> "Cookies e
                outros dados do site" (essa é a caixa que apaga os lançamentos junto, porque é onde o
                navegador guarda o banco de dados) → Limpar dados.
              </p>
            </div>
          </>
        )}
      </div>
      </>
      )}
    </>
  )
}
