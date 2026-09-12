/* Compartilhar o acesso recém-criado com o cliente (12/09/2026, item 2).

   Pedido do Rafael: ao salvar um pré-cadastro (ou um ambiente de teste), além
   do "Salvar" comum deve existir um "Salvar e Compartilhar" que abra as opções
   padrão do Android (WhatsApp, e-mail, etc.) já com a mensagem pronta —
   "e ao compartilhar deve levar como mensagem o link pra tela de login, login
   e senha".

   Sobre o LINK, com honestidade: enquanto o app não estiver hospedado numa URL
   (item 028 do backlog), não existe endereço de tela de login para mandar. Por
   isso o link só entra na mensagem quando o app está rodando em http(s) — aí
   ele é o endereço real desta instalação. No `.apk` e no arquivo local, a
   mensagem sai sem link e diz como entrar, em vez de inventar um endereço que
   não abriria nada. Quando houver hospedagem, `LINK_LOGIN_FIXO` passa a ser o
   endereço oficial e a mensagem ganha o link em todos os casos. */

/** Endereço oficial da tela de login, quando existir hospedagem. Vazio até lá. */
const LINK_LOGIN_FIXO = ''

export function linkDaTelaDeLogin(): string {
  if (LINK_LOGIN_FIXO) return LINK_LOGIN_FIXO
  try {
    const proto = window.location.protocol
    if (proto === 'http:' || proto === 'https:') {
      return `${window.location.origin}${window.location.pathname}`
    }
  } catch { /* sem window (teste/ambiente estranho): segue sem link */ }
  return ''
}

export function mensagemDeAcesso(opcoes: {
  nomeProduto: string
  nomeCliente?: string
  login: string
  senha: string
  /** Texto curto explicando o que foi criado (período de teste, pré-cadastro…). */
  contexto?: string
}): string {
  const { nomeProduto, nomeCliente, login, senha, contexto } = opcoes
  const link = linkDaTelaDeLogin()
  const linhas = [
    nomeCliente ? `Olá, ${nomeCliente}!` : 'Olá!',
    '',
    `Seu acesso ao ${nomeProduto} está pronto.`,
  ]
  if (contexto) linhas.push(contexto)
  linhas.push('', `Login: ${login}`, `Senha: ${senha}`)
  if (link) linhas.push('', `Entre por aqui: ${link}`)
  else linhas.push('', 'Abra o aplicativo e entre com esses dados na tela de login.')
  linhas.push('', 'Troque a senha no primeiro acesso, em Configuração › Meus Dados.')
  return linhas.join('\n')
}

export type ResultadoCompartilhar = 'compartilhado' | 'copiado' | 'falhou'

/**
 * Abre a folha de compartilhamento do sistema (no Android, a lista padrão com
 * WhatsApp, e-mail e o resto). Sem suporte a `navigator.share`, copia para a
 * área de transferência — o texto nunca se perde em silêncio, que é a mesma
 * regra da cadeia de salvamento de arquivo (`src/arquivoLocal.ts`).
 *
 * Cancelar a folha NÃO é falha: o sistema lança `AbortError`, e aqui isso é
 * tratado como "compartilhado" (a pessoa viu as opções e desistiu) em vez de
 * mostrar um erro que assustaria sem motivo.
 */
export async function compartilharTexto(titulo: string, texto: string): Promise<ResultadoCompartilhar> {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      await navigator.share({ title: titulo, text: texto })
      return 'compartilhado'
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return 'compartilhado'
    /* qualquer outra falha cai no plano B abaixo */
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(texto)
      return 'copiado'
    }
  } catch { /* segue pro retorno de falha */ }
  return 'falhou'
}

/* ===========================================================================
   Canais e textos de cada cenário (12/09/2026, build 053)

   O Rafael: "botão Compartilhar com 2 opções conforme o preenchimento (e-mail
   → e-mail; telefone → WhatsApp, montar o link já com número do telefone e
   abrir whatsapp na conversa com o número)" e "montar os textos das mensagens
   conforme esses cenários".

   São TRÊS cenários, com textos diferentes porque pedem coisas diferentes:
     1. convite  — o cliente ainda não tem acesso: ele precisa ENTRAR NO LINK
                   e completar o cadastro, e depois esperar a liberação.
     2. liberação — o cadastro já existe e acabou de ser liberado: aqui vão o
                   login, a senha e o link pra baixar o aplicativo.
     3. testeDireto — pulou o pré-cadastro (o atalho "Criar ambiente de
                   teste"): é a liberação, dita como boas-vindas.

   Os textos moram aqui, num lugar só, pelo mesmo motivo dos subtítulos das
   telas: espalhados, eles se contradizem na primeira alteração.
   =========================================================================== */

export type CanalEnvio = 'whatsapp' | 'email'

/** Telefone brasileiro no formato que o `wa.me` espera (55 + DDD + número). */
export function telefoneParaWhatsApp(telefone: string): string {
  const d = (telefone || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  if (d.length === 10 || d.length === 11) return `55${d}`
  return d
}

/** Link de conversa direta com o número, já com a mensagem escrita. */
export function linkWhatsApp(telefone: string, texto: string): string {
  const numero = telefoneParaWhatsApp(telefone)
  /* Sem número não existe "conversa com o número" — cai no compartilhamento
     genérico do WhatsApp, que ainda deixa a pessoa escolher o contato. */
  return numero
    ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`
}

export function linkEmail(destino: string, assunto: string, corpo: string): string {
  return `mailto:${encodeURIComponent(destino)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`
}

/**
 * Abre a conversa do WhatsApp com o número, ou o cliente de e-mail.
 * Devolve `false` quando o aparelho bloqueou a abertura — quem chama avisa e
 * oferece a cópia do texto, nunca falha em silêncio (mesma regra de
 * `arquivoLocal.ts`).
 */
export function abrirCanal(canal: CanalEnvio, destino: string, assunto: string, texto: string): boolean {
  const url = canal === 'whatsapp' ? linkWhatsApp(destino, texto) : linkEmail(destino, assunto, texto)
  /* CORREÇÃO 12/09/2026 (build 054) — o Rafael: "o compartilhamento via e-mail
     vai pro navegador e não abre nada na janela (vazia)".

     Causa: `window.open(url, '_blank')` SEMPRE cria uma aba antes de olhar o
     endereço. Com `https://wa.me/...` essa aba vira a página do WhatsApp e
     tudo bem; com `mailto:` não existe página nenhuma pra carregar — o
     navegador entrega o endereço ao programa de e-mail e a aba recém-criada
     fica lá, em branco, pra sempre. Era exatamente isso que ele via.

     O clique num `<a>` não cria aba: o navegador (e o WebView do Android)
     resolve o esquema e decide sozinho — `mailto:` vai pro aplicativo de
     e-mail sem deixar rastro, `https:` abre normalmente. Por isso os dois
     canais passam pelo mesmo caminho, e só o `https` pede aba nova. */
  try {
    const a = document.createElement('a')
    a.href = url
    if (canal === 'whatsapp') { a.target = '_blank'; a.rel = 'noopener' }
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove()
    return true
  } catch {
    /* Último recurso: navegar na própria janela. Para `mailto:` o navegador
       abre o programa de e-mail e NÃO troca a página, então nada se perde. */
    try { window.location.href = url; return true } catch { return false }
  }
}

export type CenarioMensagem = 'convite' | 'liberacao' | 'testeDireto'

export interface DadosMensagem {
  nomeProduto: string
  nomeCliente?: string
  /** Cenário `convite`: o link da tela isolada de completar o cadastro. */
  linkPreCadastro?: string
  /** Cenários de liberação: onde baixar o aplicativo. */
  linkApp?: string
  /** Opcional em todos os cenários — só entra quando estiver preenchido. */
  linkSite?: string
  login?: string
  senha?: string
  /** Ex.: "Você tem 15 dias de teste a partir de hoje." */
  contexto?: string
}

export function assuntoDoCenario(cenario: CenarioMensagem, nomeProduto: string): string {
  return cenario === 'convite'
    ? `Complete seu cadastro no ${nomeProduto}`
    : `Seu acesso ao ${nomeProduto} está liberado`
}

export function montarMensagem(cenario: CenarioMensagem, d: DadosMensagem): string {
  const ola = d.nomeCliente ? `Olá, ${d.nomeCliente}!` : 'Olá!'
  const linhas: string[] = [ola, '']

  if (cenario === 'convite') {
    linhas.push(
      `Registramos seu interesse no ${d.nomeProduto}.`,
      '',
      'Pra continuar, entre no link abaixo e complete seu cadastro — leva menos de um minuto:',
      d.linkPreCadastro || '(link do cadastro)',
      '',
      'Depois de gravar, é só aguardar: nós liberamos o seu acesso e mandamos os dados de entrada por aqui mesmo.',
    )
  } else {
    linhas.push(
      cenario === 'testeDireto'
        ? `Seu ambiente de teste do ${d.nomeProduto} está pronto.`
        : `Seu cadastro no ${d.nomeProduto} foi liberado.`,
    )
    if (d.contexto) linhas.push(d.contexto)
    if (d.linkApp) linhas.push('', 'Baixe o aplicativo aqui:', d.linkApp)
    if (d.login) linhas.push('', `Login: ${d.login}`)
    if (d.senha) linhas.push(`Senha: ${d.senha}`)
    if (d.login || d.senha) {
      linhas.push('', 'Troque a senha no primeiro acesso, em Configuração › Meus Dados.')
    }
  }

  if (d.linkSite) linhas.push('', `Saiba mais: ${d.linkSite}`)
  return linhas.join('\n')
}

/** Texto que o CLIENTE devolve pra Morfo ao gravar o cadastro pelo link. */
export function mensagemDevolucaoPreCadastro(d: {
  nomeProduto: string
  nome: string
  telefone: string
  email: string
  observacao?: string
}): string {
  const linhas = [
    `Cadastro completo — ${d.nomeProduto}`,
    '',
    `Nome: ${d.nome}`,
    `Telefone: ${d.telefone || '—'}`,
    `E-mail: ${d.email || '—'}`,
  ]
  if (d.observacao?.trim()) linhas.push(`Observação: ${d.observacao.trim()}`)
  linhas.push('', 'Aguardo a liberação do acesso. Obrigado!')
  return linhas.join('\n')
}
