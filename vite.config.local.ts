import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Build do MVP navegável — um único index.html, tudo inline (JS+CSS).
// Este é o formato de trabalho enquanto o app está em fase de MVP: abre com
// duplo clique (file://), sem precisar de servidor, com todas as telas
// navegáveis. Por isso o App.tsx não usa nenhum router baseado em URL
// (window.location/history) — só estado do React — o que também evita o
// problema de origem inválida do file://. Quando decidirmos publicar de
// verdade, aí sim entra hospedagem + o build normal (vite.config.ts).
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-local',
    emptyOutDir: true,
  },
})
