// Service Worker — MorfoFinP
// PWA instalável: cache do "app shell" pra funcionar OFFLINE depois de instalado.
// Regra de ouro: isso aqui NUNCA mexe nos dados da pessoa (localStorage, fora do alcance deste arquivo) —
// só cacheia os ARQUIVOS do app (HTML/CSS/JS/ícones/bibliotecas).
//
// A cada nova versão publicada (gatilho "PUBLICAR VERSÃO"), sobe o número de CACHE_VERSION abaixo —
// isso cria um cache novo, baixa os arquivos atualizados, e descarta o cache antigo assim que o app
// reabrir. Esquecer de subir esse número faz o celular continuar servindo a versão antiga em cache.
const CACHE_VERSION = 'morfofinp-v1';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './manifest-claro.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/icon-192-maskable-claro.png',
  './icons/icon-512-maskable-claro.png',
  './icons/icon-192-monochrome.png',
  './icons/icon-512-monochrome.png',
  './icons/apple-touch-icon.png',
  './icons/apple-touch-icon-claro.png',
  './icons/favicon-claro.png',
  './icons/favicon-escuro.png',
  // acrescentar aqui qualquer vendor/ (bibliotecas externas) que o produto usar
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // não intercepta POST/etc — não tem backend próprio ainda mesmo

  // Navegação (abrir/recarregar o app): tenta a rede primeiro (pega versão nova se tiver internet),
  // cai pro cache se estiver offline — assim o app sempre abre, com ou sem internet.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Arquivos estáticos do app shell: cache primeiro (rápido, funciona offline), busca na rede
  // só se não estiver em cache ainda, e guarda pra próxima.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
