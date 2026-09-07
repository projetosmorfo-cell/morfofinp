import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppRoot from './kit/AppRoot.tsx'
import { seedIfEmpty } from './seed'

function renderApp() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppRoot />
    </StrictMode>,
  )
}

// Se o IndexedDB não abrir (alguns navegadores restringem isso sob file://,
// principalmente Safari), mostra uma mensagem clara em vez de tela em branco.
seedIfEmpty().then(renderApp, (erro) => {
  console.error('Falha ao abrir o banco local (IndexedDB):', erro)
  const raiz = document.getElementById('root')!
  raiz.innerHTML = `
    <div style="padding:24px;font-family:system-ui,sans-serif;max-width:480px;margin:0 auto">
      <h1 style="font-size:18px">Não consegui abrir o banco de dados deste app</h1>
      <p>Isso costuma acontecer quando o navegador bloqueia armazenamento local ao abrir um
      arquivo diretamente (comum no Safari). Tente abrir este mesmo arquivo no Chrome, Edge ou
      Firefox — o app foi feito para funcionar direto do arquivo (sem precisar de servidor) nesses
      navegadores.</p>
      <p style="color:#888;font-size:13px">Detalhe técnico: ${String(erro)}</p>
    </div>`
})
