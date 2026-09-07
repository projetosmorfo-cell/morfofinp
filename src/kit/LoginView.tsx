import { useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { criarAcesso, entrar, redefinirAcesso } from './auth'
import { PLANOS_STUB } from './planos'

// Login real (05/09/2026, Roteiro de Parametrização Morfo, Etapa 8) —
// adaptado (bem reduzido) de `LoginView` do Kit de Estrutura Mínima. O Kit
// original é uma tela de site institucional completa (multi-página, planos,
// autocadastro, portal do cliente, convite de equipe) — nada disso se
// aplica aqui: o MFinp é uso pessoal de uma pessoa só, sem backend
// (Decisão 6/Backlog #028), então não existe conteúdo de marketing real,
// múltiplos tenants nem convite de equipe. Esta versão cobre só o que a
// resposta do Rafael pediu ("Trocar a entrada de verdade"): uma tela de
// entrada de verdade, com um link enxuto pra "Ver planos" (reaproveitando
// os placeholders da Etapa 5) como o mínimo de "site institucional
// deslogado" que faz sentido sem inventar conteúdo de marca que ele nunca
// definiu.
//
// Sem credencial cadastrada ainda → formulário "Criar acesso" (1ª vez, faz
// as vezes do autocadastro do modelo Completo). Com credencial cadastrada →
// formulário "Entrar". Nenhum dos dois FECHA sozinho: `AppRoot.tsx` lê
// `sessaoAtiva` via `useLiveQuery` e troca de tela sozinho assim que essa
// gravação acontecer (ver `src/kit/auth.ts`).
//
// Bug real encontrado e corrigido na verificação da Etapa 8: a 1ª versão
// tinha `if (config === undefined) return null` pra evitar mostrar "Criar
// acesso" por um instante antes de saber se já existe credencial — só que
// `useLiveQuery` retorna `undefined` tanto "ainda carregando" quanto
// "carregou e não existe registro nenhum" (o caso normal de um app NUNCA
// logado antes, que é justamente quando esta tela precisa aparecer). Sem
// distinguir os dois, um banco genuinamente vazio deixava essa condição
// `true` PRA SEMPRE — a tela nunca renderizava nada, app inteiro travado
// numa página em branco. Corrigido com o mesmo sentinela `CARREGANDO` já
// usado em `AppRoot.tsx`.
const CARREGANDO = Symbol('carregando')

export default function LoginView() {
  const config = useLiveQuery(() => db.configuracoes.get(1), [], CARREGANDO)
  const temCredencial = config !== CARREGANDO && Boolean(config?.credencialEmail && config?.credencialSenha)

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [processando, setProcessando] = useState(false)
  const [mostrarPlanos, setMostrarPlanos] = useState(false)
  const [mostrarRedefinir, setMostrarRedefinir] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    if (!email.trim()) {
      setErro('Preencha o e-mail.')
      return
    }
    if (!email.includes('@')) {
      setErro('Digite um e-mail válido (com @).')
      return
    }
    if (senha.length < 4) {
      setErro('A senha precisa ter pelo menos 4 caracteres.')
      return
    }

    setProcessando(true)
    try {
      if (!temCredencial) {
        if (senha !== confirmarSenha) {
          setErro('As duas senhas precisam ser iguais.')
          return
        }
        await criarAcesso(email, senha)
      } else {
        const ok = await entrar(email, senha)
        if (!ok) {
          setErro('E-mail ou senha incorretos.')
          return
        }
      }
      // Sucesso: `sessaoAtiva` já foi gravado — `AppRoot.tsx` troca de tela
      // sozinho (useLiveQuery reativo), nada mais a fazer aqui.
    } finally {
      setProcessando(false)
    }
  }

  async function confirmarRedefinir() {
    setProcessando(true)
    await redefinirAcesso()
    setMostrarRedefinir(false)
    setEmail('')
    setSenha('')
    setConfirmarSenha('')
    setErro(null)
    setProcessando(false)
  }

  // Aguardando a 1ª leitura do Dexie — evita mostrar "Criar acesso" por um
  // instante antes de saber se já existe credencial (flash de tela errada
  // toda vez que o Rafael abre o app já logado). `config === undefined`
  // NÃO entra aqui (é um caso real e permanente: banco sem credencial
  // nenhuma) — só o sentinela distingue "carregando" de "vazio de verdade".
  if (config === CARREGANDO) return null

  return (
    <div
      style={{
        // Bug real encontrado depois de entregar a Etapa 8: esta div usava
        // `justifyContent: 'center'` pra centralizar o cartão de login
        // verticalmente — mas com `overflow` visível (o padrão) e conteúdo
        // mais alto que a viewport (tela curta, ex.: teclado do celular
        // aberto durante o próprio ato de digitar a senha, ou uma janela de
        // navegador pouco alta), centralizar por flexbox empurra o TOPO do
        // conteúdo pra uma posição Y NEGATIVA — e não tem como rolar pra
        // "antes do topo da página" pra alcançar isso, então o título
        // "MorfoFinP" (e potencialmente o próprio campo de e-mail) ficava
        // permanentemente escondido, sem nenhum jeito de rolar até ele
        // (confirmado via Playwright: título em y=-88px numa viewport de
        // 300px de altura, `window.scrollY` preso em 0 mesmo tentando rolar
        // pra cima). Isso é a causa mais provável do "telas escondendo
        // parte" que o Rafael relatou.
        //
        // Corrigido com o padrão de "centralização segura": o wrapper
        // externo não centraliza mais nada (fica no topo do fluxo normal,
        // sempre alcançável rolando de cima pra baixo, do jeito que a
        // rolagem de página sempre funciona) — quem centraliza é o cartão
        // interno, via `margin: 'auto 0'`. Margem automática distribui o
        // espaço SOBRANDO quando existe (centralizando de verdade em telas
        // altas), mas nunca fica negativa quando não sobra espaço nenhum —
        // aí o cartão simplesmente começa do topo, com tudo alcançável.
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 360, margin: 'auto 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 4px' }}>MorfoFinP</h1>
          <p className="texto-fraco" style={{ margin: 0 }}>
            Controle financeiro pessoal.
          </p>
        </div>

        <form className="cartao" onSubmit={salvar}>
          <h2 style={{ marginTop: 0 }}>{temCredencial ? 'Entrar' : 'Criar acesso'}</h2>

          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            // `type="text"`, não `"email"` — de propósito (bug real
            // encontrado depois de entregar a Etapa 8, ver comentário mais
            // acima): `type="email"` faz o PRÓPRIO NAVEGADOR validar o
            // formato no submit, mesmo sem `required`, e BLOQUEIA o
            // `onSubmit` (nosso `salvar()`) de rodar quando o texto não tem
            // "@" — sem nenhum aviso visível nesta tela (o balão nativo do
            // Chrome é fácil de não notar, ou nem aparece dependendo do
            // navegador). Resultado: clicar em "Entrar"/"Criar acesso"
            // literalmente não fazia nada. Mesma classe de bug já documentada
            // no `CLAUDE.md` do repositório pro formulário de Transferência
            // (`required` nativo bloqueando submit em silêncio) — a validação
            // de formato de e-mail agora é só a nossa, em `salvar()` abaixo,
            // sempre com mensagem visível.
            type="text"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={erro && (!email.trim() || !email.includes('@')) ? 'campo-com-erro' : undefined}
          />

          <label htmlFor="login-senha">Senha</label>
          <input
            id="login-senha"
            type="password"
            autoComplete={temCredencial ? 'current-password' : 'new-password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={erro && senha.length < 4 ? 'campo-com-erro' : undefined}
          />

          {!temCredencial && (
            <>
              <label htmlFor="login-confirmar-senha">Confirmar senha</label>
              <input
                id="login-confirmar-senha"
                type="password"
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className={erro && senha !== confirmarSenha ? 'campo-com-erro' : undefined}
              />
            </>
          )}

          {erro && (
            <p className="valor-neg" style={{ fontSize: 12.5, marginTop: 4 }}>
              {erro}
            </p>
          )}

          <button type="submit" className="primario" disabled={processando} style={{ marginTop: 16 }}>
            {processando ? 'Aguarde…' : temCredencial ? 'Entrar' : 'Criar acesso e entrar'}
          </button>

          {!temCredencial && (
            <p className="texto-fraco" style={{ fontSize: 11.5, marginTop: 10 }}>
              1ª vez usando esta versão do app — escolha um e-mail e senha pra você mesmo. Sem
              conexão com nenhuma conta externa (Google, etc.) e sem backend real ainda (Backlog
              #028) — é só a entrada oficial do app a partir de agora.
            </p>
          )}
        </form>

        {temCredencial && (
          <button
            type="button"
            onClick={() => setMostrarRedefinir(true)}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 12,
              background: 'none',
              border: 'none',
              color: 'var(--texto-fraco)',
              fontSize: 12.5,
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Esqueceu a senha?
          </button>
        )}

        <button
          type="button"
          onClick={() => setMostrarPlanos(true)}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 8,
            background: 'none',
            border: 'none',
            color: 'var(--azul)',
            fontSize: 12.5,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Ver planos
        </button>
      </div>

      {mostrarPlanos && (
        <div className="modal-fundo" onClick={() => setMostrarPlanos(false)}>
          <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
            <div className="linha" style={{ border: 'none', padding: 0, marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>Planos</h2>
              <button
                type="button"
                onClick={() => setMostrarPlanos(false)}
                aria-label="Fechar"
                style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--texto-fraco)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PLANOS_STUB.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: `1.5px solid ${p.destaque ? 'var(--azul)' : 'var(--borda)'}`,
                    borderRadius: 12,
                    padding: 14,
                    background: p.destaque ? 'rgba(59,130,246,0.08)' : 'var(--bg-elevado)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <strong style={{ fontSize: 14.5 }}>{p.nome}</strong>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--azul)', whiteSpace: 'nowrap' }}>
                      {p.valorMensal > 0 ? `R$ ${p.valorMensal.toFixed(2)}/mês` : 'Grátis'}
                    </span>
                  </div>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                    {p.funcionalidades.map((f) => (
                      <li key={f} className="texto-fraco" style={{ fontSize: 12.5 }}>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="texto-fraco" style={{ fontSize: 11.5, marginTop: 12 }}>
              Placeholder: nome, preço e funcionalidades ainda não são reais (depende de definição
              comercial + backend, Backlog #028) — gerenciável depois de entrar, em Minha
              Assinatura.
            </p>
          </div>
        </div>
      )}

      {mostrarRedefinir && (
        <div className="modal-fundo" onClick={() => setMostrarRedefinir(false)}>
          <div className="modal-conteudo" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Redefinir acesso</h2>
            <p className="texto-fraco">
              Sem backend, não existe recuperação de senha por e-mail — a única opção é cadastrar
              um e-mail/senha novo agora. <strong>Seus lançamentos, categorias e contas não são
              afetados</strong> — só o e-mail/senha de entrada são apagados.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                style={{ flex: 1, marginTop: 0, background: 'none', border: '1px solid var(--borda)', borderRadius: 10, padding: '12px', cursor: 'pointer' }}
                onClick={() => setMostrarRedefinir(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                style={{ flex: 1, marginTop: 0, background: 'var(--vermelho)', borderColor: 'var(--vermelho)' }}
                disabled={processando}
                onClick={confirmarRedefinir}
              >
                {processando ? 'Aguarde…' : 'Redefinir e cadastrar de novo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
