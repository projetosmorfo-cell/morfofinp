import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// App normal (SPA), sem nada de PWA — decisão do Rafael em 30/08/2026.
// O caminho pra "app de verdade" agora é empacotar este mesmo build com
// Capacitor (iOS/Android), publicando o build web direto na Cloudflare.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
