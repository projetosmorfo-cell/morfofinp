/* Link do pré-cadastro (12/09/2026, build 053).

   O Rafael pediu: o N0 registra o interesse com o mínimo (nome + telefone ou
   e-mail), manda um link, e "o link deve ser só pra uma tela isolada do
   cadastro pré-preenchido e ao gravar dar mensagem pra aguardar liberação da
   Morfo".

   LIMITAÇÃO REAL, decidida e registrada em vez de escondida: não existe
   servidor (item 028 do backlog). Então o link não pode apontar pra um
   registro guardado em lugar nenhum — ele CARREGA os dados dentro de si, no
   fragmento (`#precadastro=...`). Consequências que isso traz, todas
   assumidas de propósito:

   - o fragmento nunca sai do navegador (não vai no pedido HTTP), então o
     dado não trafega pra servidor nenhum — é o lugar menos ruim pra isso;
   - o que o cliente completar fica no aparelho DELE. A tela de conclusão
     termina com um botão que devolve os dados preenchidos pra Morfo (mesmo
     WhatsApp/e-mail do convite) — é assim que a informação volta, enquanto
     não houver backend;
   - o link só abre alguma coisa quando existe a URL do site cadastrada em
     N0 › Parâmetros › URLs. Sem ela, o compartilhamento avisa, em vez de
     mandar um endereço que não abriria nada.

   Quando existir hospedagem + backend, o que muda é só este arquivo: o link
   passa a ser `<site>/precadastro/<id>` e o payload sai de dentro dele. Quem
   chama (`DevApp`, `CompletarPreCadastro`) não muda. */

export interface DadosPreCadastro {
  /** Id do tenant que o N0 criou — volta na devolução, pra casar o registro. */
  tenantId: string
  nome: string
  telefone: string
  email: string
  /** Só informativo na tela do cliente; nunca é o que libera o acesso. */
  login?: string
}

const CHAVE_HASH = 'precadastro'

/* base64 de texto UTF-8: `btoa` sozinho quebra em acento (é byte a byte).
   `encodeURIComponent` + `unescape` é o par clássico e roda em qualquer
   WebView; sem isso um "João" derruba a geração do link. */
function paraBase64(texto: string): string {
  return btoa(encodeURIComponent(texto).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))))
}
function deBase64(b64: string): string {
  return decodeURIComponent(Array.from(atob(b64)).map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''))
}

export function montarLinkPreCadastro(site: string, dados: DadosPreCadastro): string {
  const base = (site || '').trim().replace(/[#?].*$/, '').replace(/\/+$/, '')
  if (!base) return ''
  return `${base}/#${CHAVE_HASH}=${paraBase64(JSON.stringify(dados))}`
}

/** Lê o pré-cadastro do endereço atual, se for um link de pré-cadastro. */
export function lerPreCadastroDaURL(): DadosPreCadastro | null {
  try {
    const hash = window.location.hash || ''
    const marca = `#${CHAVE_HASH}=`
    if (!hash.startsWith(marca)) return null
    const bruto = JSON.parse(deBase64(hash.slice(marca.length))) as Partial<DadosPreCadastro>
    if (!bruto || typeof bruto !== 'object') return null
    return {
      tenantId: String(bruto.tenantId ?? ''),
      nome: String(bruto.nome ?? ''),
      telefone: String(bruto.telefone ?? ''),
      email: String(bruto.email ?? ''),
      login: bruto.login ? String(bruto.login) : undefined,
    }
  } catch {
    /* Link truncado por um aplicativo de mensagem, colado pela metade, ou
       qualquer outro lixo no fragmento: a tela isolada simplesmente não abre
       e o app segue normal. Nunca derruba a abertura por causa disso. */
    return null
  }
}

/** Tira o `#precadastro=...` do endereço sem recarregar a página. */
export function limparPreCadastroDaURL() {
  try {
    window.location.hash = ''
  } catch { /* sem window: nada a limpar */ }
}
