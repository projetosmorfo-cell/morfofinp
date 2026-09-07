import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { exportarConfiguracaoIcones } from '../iconesPadrao'
import { useModoVisao, salvarModoVisao, useOrdemAbas, salvarOrdemAbas } from '../configuracaoIcones'
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
export default function Manutencao({
  aoVoltar,
  onAbrirPainelN0,
  onAbrirTour,
  onAbrirFerramentasTeste,
}: {
  aoVoltar: () => void
  // Roteiro de Parametrização Morfo, Etapa 4 (04/09/2026) — acesso ao
  // painel N0 (Morfo/dev), ver `src/kit/AppRoot.tsx`. Continua aqui mesmo
  // depois da Etapa 8 (Login) — é um painel de desenvolvedor/Morfo, sem
  // relação com QUAL tenant está logado, então nunca fez sentido morar no
  // menu de engrenagem (que é sempre sobre o tenant atual).
  onAbrirPainelN0: () => void
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

  return (
    <>
      <div className="cabecalho-fixo">
        <button type="button" className="botao-voltar-config" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        <h1>Manutenção</h1>
      </div>

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

      <h2>Painel N0 (Morfo)</h2>
      <div className="cartao">
        <p className="texto-fraco" style={{ marginTop: 0 }}>
          Acesso ao painel de administração da plataforma — esqueleto, sem dado real de tenant ainda
          (depende de backend, ver Backlog #028). Painel de desenvolvedor/Morfo, sem relação com o
          Login — por isso fica aqui, não no menu de engrenagem principal.
        </p>
        <button type="button" onClick={onAbrirPainelN0}>
          Abrir painel N0
        </button>
      </div>

      <h2>Conta</h2>
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

      <h2>Limpar dados</h2>
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
  )
}
