# MorfoFinP

App de controle financeiro pessoal da Morfo. Vite + React + TypeScript + Dexie (IndexedDB, 100% local, sem backend), empacotado como app Android via Capacitor.

## O que está neste repositório

Só o que o app precisa pra ser construído e rodar:

- `src/` — código do app (telas, regras, banco local)
- `public/` — ícones e arquivos estáticos
- `plugins/notificacao-bancaria/` — plugin nativo Android que lê notificações do banco/cartão
- `capacitor.config.ts`, `vite.config*.ts`, `tsconfig*.json`, `package.json`/`package-lock.json`, `.oxlintrc.json`, `index.html` — configuração de build
- `.github/workflows/android.yml` — gera o `.apk` automaticamente no GitHub Actions

Documentação de produto (decisões, backlog, regras de negócio) fica fora daqui, na biblioteca do produto (Project/Drive).

## Como construir

```
npm install
npx vite build --config vite.config.local.ts   # MorfoFinP.html (arquivo único, abre com duplo clique)
npx vite build                                  # dist/ (build web usado pelo Capacitor)
npx tsc --noEmit -p tsconfig.app.json           # checagem de tipos
npx oxlint                                      # lint
```

## App Android (.apk)

A cada publicação na branch `main`, o GitHub Actions compila o `.apk` de teste e publica na aba **Releases** (`build-NNN`). O número vem de `src/buildInfo.ts`.
