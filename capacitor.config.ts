import type { CapacitorConfig } from '@capacitor/cli'

// Capacitor (09/09/2026) — empacota o MESMO build web (Vite + React + Dexie)
// como app Android nativo, decisão de 30/08/2026 (ver CLAUDE.md, "Pivô de
// arquitetura"). Nada do app muda pra rodar dentro do WebView: IndexedDB,
// telas, navegação por estado — tudo igual. O que o nativo acrescenta é só o
// que o navegador NÃO consegue fazer: hoje, a leitura de notificações do
// app do banco/cartão (`plugins/notificacao-bancaria`).
//
// `webDir` aponta pro build NORMAL (`vite.config.ts`, pasta `dist/`), não pro
// build de arquivo único (`vite.config.local.ts`, `dist-local/`) — o
// `MorfoFinP.html` de duplo clique continua existindo pro fluxo de MVP do
// Rafael, mas dentro do app o WebView serve a pasta inteira normalmente.
//
// O `.apk` é gerado pelo GitHub Actions (`.github/workflows/android.yml`),
// nunca neste ambiente de nuvem (sem SDK do Android) — decisão do Rafael,
// 09/09/2026.
const config: CapacitorConfig = {
  appId: 'app.morfo.morfofinp',
  appName: 'MorfoFinP',
  webDir: 'dist',
  android: {
    // Permite abrir o app com `capacitor://`/`https://localhost` sem
    // bloquear IndexedDB — padrão do Capacitor, mantido explícito.
    allowMixedContent: false,
  },
}

export default config
