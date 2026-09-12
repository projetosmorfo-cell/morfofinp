/* oxlint-disable react-hooks/rules-of-hooks -- `usarBotaoVoltar` É um hook de verdade
   (chamado só no corpo de componente, sempre na mesma ordem); a regra só não
   reconhece porque o projeto nomeia em português ("usar…" no lugar de "use…"),
   como todo o resto do código. Renomear pra inglês seria quebrar a convenção do
   projeto por causa de uma heurística de nome. */
/* Botão "voltar" do Android (12/09/2026, pedido do Rafael: "o botão voltar do
   celular está saindo do aplicativo, quero que tenha efeito de voltar mesmo
   dentro do app").

   Por que o app fechava: não existe router aqui (decisão de 30/08/2026 — todo
   caminho de tela é estado do React), então o Android nunca teve histórico
   nenhum pra desempilhar. Sem ninguém escutando, o comportamento padrão do
   WebView é encerrar a Activity — ou seja, sair do app.

   O mecanismo: cada tela/modal que SABE como voltar registra um handler aqui
   (`usarBotaoVoltar`). No toque do botão físico, os handlers são chamados do
   mais recente pro mais antigo — o primeiro que devolver `true` ("eu tratei")
   encerra a cadeia. Se nenhum tratar (já está na tela inicial), o app é
   MINIMIZADO, nunca fechado: é o que o Android faz com qualquer app na tela
   inicial, e preserva o estado pra quando a pessoa voltar.

   No navegador (build de arquivo único, `file://`) nada disso existe e todas
   as funções viram no-op — o app continua igual. */
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as AppNativo } from '@capacitor/app'

type Handler = () => boolean

const pilha: Handler[] = []
let ligado = false

function ligarUmaVez() {
  if (ligado) return
  ligado = true
  if (!Capacitor.isNativePlatform()) return
  void AppNativo.addListener('backButton', () => {
    for (let i = pilha.length - 1; i >= 0; i--) {
      try {
        if (pilha[i]()) return
      } catch {
        /* um handler quebrado nunca pode travar o botão voltar do aparelho */
      }
    }
    void AppNativo.minimizeApp()
  })
}

/* Registra um tratador enquanto o componente estiver montado.
   O handler é reinscrito a cada render de propósito: assim ele sempre
   enxerga o estado atual da tela (sem lista de dependências pra esquecer). */
export function usarBotaoVoltar(handler: Handler) {
  useEffect(() => {
    ligarUmaVez()
    pilha.push(handler)
    return () => {
      const i = pilha.lastIndexOf(handler)
      if (i >= 0) pilha.splice(i, 1)
    }
  })
}
