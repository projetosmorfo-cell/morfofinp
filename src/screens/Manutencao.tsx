import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { exportarConfiguracaoIcones } from '../iconesPadrao'
import {
  montarBackup, nomeArquivoBackup, lerArquivoBackup, restaurarBackup, apagarTudo,
  totalDeRegistros, tabelasForaDoBackup, ROTULO_TABELA, type ResumoBackup,
} from '../backup'
import { salvarArquivoTexto, escolherArquivoTexto } from '../arquivoLocal'
import { BUILD_NUMBER } from '../buildInfo'
import {
  useModoVisao,
  salvarModoVisao,
  useOrdemAbas,
  salvarOrdemAbas,
  useOrdemMenuEngrenagem,
  salvarOrdemMenuEngrenagem,
} from '../configuracaoIcones'
import { sair } from '../kit/auth'

// Rótulos das 5 abas do rodapé, pra tela de reordenação abaixo — mesmas
// chaves/nomes de `TELAS` em `App.tsx` (não importado daqui de propósito,
// pra não criar um acoplamento maior entre os dois arquivos só por causa de
// rótulo de texto).
const ABAS_ROTULO: Record<string, string> = {
  resumo: 'Resumo',
  situacao: 'Situação',
  lancamentos: 'Lançamentos',
  carteira: 'Carteira',
  planejamento: 'Planejamento',
}
const ORDEM_ABAS_PADRAO = ['resumo', 'situacao', 'lancamentos', 'carteira', 'planejamento']

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
const ROTULO_MENU_ENGRENAGEM: Record<string, string> = {
  meusDados: 'Meus Dados',
  categorias: 'Categorias e Grupos',
  contas: 'Contas e carteiras',
  notificacoes: 'Notificações bancárias',
  usuarios: 'Usuários',
  ajuda: 'Ajuda',
  permissoes: 'Permissões',
  meuAmbiente: 'Meu Ambiente',
  assinatura: 'Minha Assinatura',
  layout: 'Layout e Menus',
  manutencao: 'Manutenção e dados',
  limpar: 'Limpar todos os dados',
  sair: 'Sair',
}
const ORDEM_MENU_ENGRENAGEM_PADRAO = ['meusDados', 'categorias', 'contas', 'notificacoes', 'usuarios', 'ajuda', 'permissoes', 'meuAmbiente', 'assinatura', 'layout', 'manutencao', 'limpar', 'sair']

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
  onAbrirTour,
  onAbrirFerramentasTeste,
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
  onAbrirTour: () => void
  // Roteiro de Parametrização Morfo, Etapa 7 (05/09/2026) — abre a
  // ferramenta de simular data de hoje, ver `src/kit/SimularData.tsx`.
  onAbrirFerramentasTeste: () => void
}) {
  const [rodando, setRodando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [saindo, setSaindo] = useState(false)

  // Layout do rodapé — ordem das abas (04/09/2026, Roteiro de Parametrização
  // Morfo, Etapa 4 — Kit de Estrutura Mínima, adaptação da seção "Ordem dos
  // menus" de `LayoutTenantScreen` do Kit). Só reordena — visibilidade de
  // cada aba continua sendo só o Light×Premium acima, nunca duplicado aqui.
  const ordemSalva = useOrdemAbas()
  const ordemAbas = ordemSalva ?? ORDEM_ABAS_PADRAO
  function moverAba(chave: string, direcao: -1 | 1) {
    const i = ordemAbas.indexOf(chave)
    const j = i + direcao
    if (i < 0 || j < 0 || j >= ordemAbas.length) return
    const nova = [...ordemAbas]
    ;[nova[i], nova[j]] = [nova[j], nova[i]]
    salvarOrdemAbas(nova)
  }

  // Layout do menu de engrenagem (08/09/2026, correção pós-G59) — mesmo
  // padrão de "Layout do rodapé" acima: só reordena, sem esconder/remover
  // item nenhum. `ordemMenuSalva` sem entradas novas (ex.: banco de antes
  // desta correção, sem "sair" gravado ainda) recebe qualquer chave
  // faltando no final, na ordem padrão — mesma lógica que garante em
  // `App.tsx` que "Sair" nunca desaparece do menu de verdade.
  const ordemMenuSalva = useOrdemMenuEngrenagem()
  const ordemMenuEngrenagem = ordemMenuSalva
    ? [
        ...ordemMenuSalva.filter((k) => ORDEM_MENU_ENGRENAGEM_PADRAO.includes(k)),
        ...ORDEM_MENU_ENGRENAGEM_PADRAO.filter((k) => !ordemMenuSalva.includes(k)),
      ]
    : ORDEM_MENU_ENGRENAGEM_PADRAO
  function moverItemMenuEngrenagem(chave: string, direcao: -1 | 1) {
    const i = ordemMenuEngrenagem.indexOf(chave)
    const j = i + direcao
    if (i < 0 || j < 0 || j >= ordemMenuEngrenagem.length) return
    const nova = [...ordemMenuEngrenagem]
    ;[nova[i], nova[j]] = [nova[j], nova[i]]
    salvarOrdemMenuEngrenagem(nova)
  }

  // Visão Light × Premium (04/09/2026, pedido do Rafael: "quero já olhar as
  // duas versões"). Light reduz o rodapé a 3 abas (Resumo, Lançamentos,
  // Carteira) — o essencial do dia a dia, sem Situação/Planejamento (as
  // telas de análise orçamentária mais densas). Nada é apagado: trocar de
  // volta pra Premium traz as 5 abas de volta exatamente como estavam,
  // dado e tudo (mesma base, ver `App.tsx`/`useModoVisao`).
  const modoVisao = useModoVisao()

  // "Limpar dados" (04/09/2026, pedido do Rafael) — apaga TODOS os
  // lançamentos, inclusive os gerados por série fixa/parcelada (é a mesma
  // tabela `lancamentos`, sem distinção especial pra recorrência — apagar a
  // tabela inteira já cobre isso). Categorias, contas, grupos e
  // configurações (ícones, modo de visão) NUNCA são tocados aqui, de
  // propósito — é limpeza de LANÇAMENTO, não um reset de cadastro. Efeito
  // colateral esperado, não um bug: depois de limpar, uma série "fixa" que
  // existia perde a última ocorrência de referência, então
  // `avancarSeriesFixasPendentes()` não tem mais de onde continuar — só
  // volta a gerar sozinha se um lançamento fixo novo for cadastrado depois.
  const totalLancamentos = useLiveQuery(() => db.lancamentos.count(), [])
  const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false)
  const [resultadoLimpeza, setResultadoLimpeza] = useState<string | null>(null)

  async function limparTodosLancamentos() {
    const total = await db.lancamentos.count()
    await db.lancamentos.clear()
    setResultadoLimpeza(
      `${total} lançamento(s) apagado(s), incluindo os de séries fixas e parcelas. Categorias, contas, grupos e configurações continuam intactos.`,
    )
    setConfirmandoLimpeza(false)
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
  const [confirmandoApagarTudo, setConfirmandoApagarTudo] = useState(0)
  const foraDoBackup = tabelasForaDoBackup()

  async function gerarBackup() {
    setErroBackup(null); setAvisoBackup(null); setBackupNaTela(null); setOcupadoBackup('gerando')
    try {
      const arquivo = await montarBackup(BUILD_NUMBER)
      const nome = nomeArquivoBackup()
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

  async function executarApagarTudo() {
    setOcupadoBackup('apagando'); setErroBackup(null); setAvisoBackup(null)
    try {
      const apagados = await apagarTudo()
      setAvisoBackup(`App limpo: ${totalDeRegistros(apagados)} registro(s) apagados de todas as tabelas. Feche e abra o app pra ele começar do zero.`)
    } catch (e) {
      setErroBackup('Não consegui apagar: ' + ((e as Error)?.message || 'erro desconhecido'))
    }
    setConfirmandoApagarTudo(0)
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

    // Cada mecanismo é tentado de forma independente — a falha de um (ex.:
    // Service Worker não suportado sob `file://`, que é o caso normal e
    // esperado, não um erro de verdade) nunca deve impedir o outro de rodar.
    let swRemovidos = 0
    let swIndisponivel = false
    try {
      if ('serviceWorker' in navigator) {
        const registros = await navigator.serviceWorker.getRegistrations()
        for (const r of registros) {
          await r.unregister()
          swRemovidos++
        }
      }
    } catch {
      // Esperado sob file:// — Service Worker não é suportado nessa origem.
      swIndisponivel = true
    }

    let cachesRemovidos = 0
    let cachesErro = false
    try {
      if ('caches' in window) {
        const chaves = await caches.keys()
        for (const k of chaves) {
          await caches.delete(k)
          cachesRemovidos++
        }
      }
    } catch {
      cachesErro = true
    }

    // IndexedDB (seus lançamentos, categorias, contas, grupos) NUNCA é
    // tocado aqui — de propósito.
    const partes: string[] = []
    if (swRemovidos > 0) partes.push(`${swRemovidos} Service Worker(s)`)
    if (cachesRemovidos > 0) partes.push(`${cachesRemovidos} cache(s) de versão antiga`)

    if (partes.length > 0) {
      setResultado(
        `Removido: ${partes.join(' e ')}. Seus lançamentos, categorias, contas e grupos continuam exatamente como estavam — nada nisso foi tocado.`
      )
    } else if (swIndisponivel && !cachesErro) {
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
        <h1>{secao === 'layout' ? 'Layout e Menus' : secao === 'dados' ? 'Manutenção e dados' : 'Manutenção'}</h1>
      </div>

      {mostraLayout && (
      <>
      <h2 style={{ marginTop: 0 }}>Visão do app</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          <strong>Light</strong> mostra o essencial no rodapé (Resumo, Lançamentos, Carteira e
          Planejamento). <strong>Premium</strong> mostra as 5 abas de hoje, incluindo Situação. Nenhum
          dado muda entre as duas — é só o que aparece no rodapé.
        </p>
        <div className="abas-tela" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={modoVisao === 'light'}
            className={`aba-tela-item ${modoVisao === 'light' ? 'ativa' : ''}`}
            onClick={() => salvarModoVisao('light')}
          >
            Light
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={modoVisao === 'premium'}
            className={`aba-tela-item ${modoVisao === 'premium' ? 'ativa' : ''}`}
            onClick={() => salvarModoVisao('premium')}
          >
            Premium
          </button>
        </div>
      </div>

      <h2>Layout do rodapé</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Ordem das abas do rodapé — não muda o que aparece (isso é o Light/Premium acima), só a
          posição de cada uma.
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
      </div>

      <h2>Ordem da tela de Configurações</h2>
      <div className="cartao">
        {/* 08/09/2026, correção pós-G59 — Rafael: "o menu sair tem que ser
            menu sem permitir retirar ele, só reposicionar". Mesmo mecanismo
            e mesma limitação de propósito da seção "Layout do rodapé" logo
            acima: só ↑/↓, nunca um botão de esconder/remover. Diferente do
            rodapé (onde a VISIBILIDADE de cada aba é controlada à parte,
            pelo Light×Premium), o menu de engrenagem não tem — e não vai
            ganhar — nenhum mecanismo de visibilidade separado: todo item
            listado aqui (inclusive "Sair") está sempre presente no menu de
            verdade, só a ordem muda. Ver `ITENS_MENU_ENGRENAGEM_PADRAO`
            em `App.tsx`. */}
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Ordem dos itens da tela de Configurações — todo item listado abaixo, incluindo "Sair",
          está sempre presente na tela; só é possível mudar a posição de cada um dentro da sua
          sessão ("Do dia a dia", "Ajustes do sistema" ou "Dados e saída"), nunca escondê-lo ou
          removê-lo.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ordemMenuEngrenagem.map((chave, i) => (
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
              <span style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{ROTULO_MENU_ENGRENAGEM[chave] ?? chave}</span>
              <button
                type="button"
                disabled={i === 0}
                onClick={() => moverItemMenuEngrenagem(chave, -1)}
                style={{ marginTop: 0, padding: '4px 10px', opacity: i === 0 ? 0.35 : 1 }}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={i === ordemMenuEngrenagem.length - 1}
                onClick={() => moverItemMenuEngrenagem(chave, 1)}
                style={{ marginTop: 0, padding: '4px 10px', opacity: i === ordemMenuEngrenagem.length - 1 ? 0.35 : 1 }}
              >
                ↓
              </button>
            </div>
          ))}
        </div>
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

      <h2>Tour guiado</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Passeio rápido pelas telas principais do app (Resumo, Situação, Lançamentos, Carteira,
          Planejamento e Configurações) — aponta pros elementos reais da tela, não uma ilustração.
          Nunca abre sozinho, só quando você pedir.
        </p>
        <button type="button" onClick={onAbrirTour}>
          Ver tour guiado
        </button>
      </div>

      <h2>Ferramentas de teste</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Simular data de hoje — testa status (Atrasado/A pagar/A receber), projeção e séries fixas
          como se o tempo tivesse passado. Nunca edita nem apaga lançamento existente. Enquanto ativa,
          um aviso fixo aparece no topo do app inteiro, em qualquer tela.
        </p>
        <button type="button" onClick={onAbrirFerramentasTeste}>
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
        <button type="button" onClick={limparCacheSemPerderDados} disabled={rodando}>
          {rodando ? 'Limpando…' : 'Limpar cache do app (mantém meus lançamentos)'}
        </button>
        {resultado && (
          <p style={{ marginTop: 12 }} className="texto-fraco">
            {resultado}
          </p>
        )}
      </div>

      {/* ---- Backup, restauração e apagar tudo (10/09/2026) ---- */}
      <h2>Backup de tudo</h2>
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
          <button type="button" disabled={ocupadoBackup !== ''} onClick={() => void escolherBackupParaRestaurar()}>
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
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(backupNaTela).then(() => setAvisoBackup('Copiado. Cole num arquivo .json e guarde.')) }}>
              Copiar
            </button>
          </>
        )}

        {/* Confirmação da restauração: só depois de LER o arquivo e mostrar o
            que tem dentro dele — restaurar substitui tudo o que está no app. */}
        {pendenteRestauro && (
          <div className="cartao" style={{ marginTop: 12, borderColor: 'var(--vermelho)' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>Restaurar “{pendenteRestauro.nome}”?</div>
            <p className="texto-fraco" style={{ fontSize: 12.5, marginTop: 6 }}>
              Backup gerado em{' '}
              {pendenteRestauro.resumo.geradoEm ? new Date(pendenteRestauro.resumo.geradoEm).toLocaleString('pt-BR') : 'data desconhecida'}
              {pendenteRestauro.resumo.build ? ` · build ${String(pendenteRestauro.resumo.build).padStart(3, '0')}` : ''}.
              Ele tem {totalDeRegistros(pendenteRestauro.resumo.contagens)} registro(s):
            </p>
            <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>
              {Object.entries(pendenteRestauro.resumo.contagens)
                .filter(([, n]) => n > 0)
                .map(([t, n]) => (
                  <li key={t} className="texto-fraco" style={{ fontSize: 12 }}>
                    {n} — {ROTULO_TABELA[t] ?? t}
                  </li>
                ))}
            </ul>
            <p className="valor-neg" style={{ fontSize: 12.5, fontWeight: 600, marginTop: 0 }}>
              Tudo o que está no app agora será substituído por isso. Não tem como desfazer — se o que
              está aqui hoje importa, faça um backup antes.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={ocupadoBackup !== ''}
                style={{ marginTop: 0, background: 'var(--vermelho)', borderColor: 'var(--vermelho)' }}
                onClick={() => void confirmarRestauro()}
              >
                {ocupadoBackup === 'restaurando' ? 'Restaurando…' : 'Sim, substituir tudo'}
              </button>
              <button type="button" style={{ marginTop: 0 }} onClick={() => setPendenteRestauro(null)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      <h2>Apagar tudo (limpar o app)</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Apaga <strong>tudo</strong>, não só os lançamentos: categorias, grupos, contas, metas,
          planos, usuários, notificações e todas as configurações. Como a sua senha de entrada também
          mora aí, o app <strong>sai da conta na hora e volta pra tela de entrada</strong>, no estado
          de recém instalado — pra restaurar um backup depois, entre de novo e volte aqui.
          Diferente de “Limpar dados” logo abaixo, que apaga só os lançamentos e preserva os
          cadastros. <strong>Faça um backup antes: não tem como desfazer.</strong>
        </p>
        {confirmandoApagarTudo === 0 && (
          <button type="button" style={{ color: 'var(--vermelho)', borderColor: 'var(--vermelho)' }} onClick={() => setConfirmandoApagarTudo(1)}>
            Apagar tudo
          </button>
        )}
        {confirmandoApagarTudo === 1 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={{ marginTop: 0 }} onClick={() => setConfirmandoApagarTudo(2)}>
              Entendi, continuar
            </button>
            <button type="button" style={{ marginTop: 0 }} onClick={() => setConfirmandoApagarTudo(0)}>
              Cancelar
            </button>
          </div>
        )}
        {confirmandoApagarTudo === 2 && (
          <>
            <p className="valor-neg" style={{ fontSize: 13, fontWeight: 700 }}>
              Última checagem: isto apaga os seus lançamentos reais e todos os cadastros, agora.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={ocupadoBackup !== ''}
                style={{ marginTop: 0, background: 'var(--vermelho)', borderColor: 'var(--vermelho)' }}
                onClick={() => void executarApagarTudo()}
              >
                {ocupadoBackup === 'apagando' ? 'Apagando…' : 'Apagar tudo de vez'}
              </button>
              <button type="button" style={{ marginTop: 0 }} onClick={() => setConfirmandoApagarTudo(0)}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>

      <h2 ref={refLimpar}>Limpar dados</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Apaga TODOS os lançamentos ({totalLancamentos ?? 0} hoje) — inclusive os gerados por série
          fixa e por parcelamento. Categorias, contas, grupos e configurações (ícones, visão do app)
          não são afetados. <strong>Não tem como desfazer.</strong>
        </p>
        {confirmandoLimpeza ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              style={{ marginTop: 0, background: 'var(--vermelho)', borderColor: 'var(--vermelho)' }}
              onClick={limparTodosLancamentos}
            >
              Sim, apagar todos os lançamentos
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
              onClick={() => setConfirmandoLimpeza(false)}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmandoLimpeza(true)}>
            Limpar dados
          </button>
        )}
        {resultadoLimpeza && (
          <p style={{ marginTop: 12 }} className="texto-fraco">
            {resultadoLimpeza}
          </p>
        )}
      </div>

      <h2>Exportar configuração de ícones</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Gera um texto com o ícone/estilo/cor de cada categoria e grupo cadastrados agora mesmo. Use
          pra mandar de volta na conversa quando pedir pra travar os ícones atuais como padrão do
          sistema.
        </p>
        <button type="button" onClick={exportarIcones}>
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
            <button type="button" style={{ marginTop: 8 }} onClick={copiarExportacao}>
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
