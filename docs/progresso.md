# MorfoFinP — MVP do app: progresso

Referência pra qualquer sessão futura continuar a construção do app sem repetir decisões já tomadas. Ver também `roteiro-app-instalavel.md` (o roteiro que está sendo seguido) e `modelo-de-dados.md` (o modelo de dados usado no schema). O histórico completo do produto (planilha, decisões anteriores ao app) fica no Projeto MFinp do Claude — este arquivo cobre só o app.

## Estado (22/08/2026)

Modelo de licenciamento escolhido: **ONLINE (Apps Script)**. Primeira publicação da Morfo (não existe site guarda-chuva ainda). Netlify já conectado à conta do Rafael (team `projetos-morfo`); site `morfofinp` já criado (site_id `06e45408-e534-4141-a3d2-5349c714fda0`, URL `morfofinp.netlify.app`) mas **ainda sem deploy publicado** — ver "Netlify — bloqueio conhecido" abaixo.

## Stack decidida

- **Vite + React + TypeScript**, SPA pura (sem backend/servidor — nada de Next.js).
- **Dexie.js** sobre IndexedDB — dado 100% local no aparelho, sem banco externo.
- **vite-plugin-pwa** — manifest + service worker, instalável, funciona offline.
- **react-router-dom com `HashRouter`** — rotas via hash, evita configurar rewrite no Netlify pra SPA.
- **Hospedagem: Netlify** (drag-and-drop da pasta `dist/`, ou deploy via MCP quando o bloqueio abaixo for resolvido — ou, agora que o código está no GitHub, deploy contínuo conectando o repo ao site pelo painel).
- `base: '/mfinp/'` no `vite.config.ts` — já nasce no caminho final (`morfo.app/mfinp/`), mesmo publicando antes num subdomínio livre do Netlify. Como IndexedDB é por origem (não por caminho), mover de `/` pra `/mfinp/` no mesmo domínio não perde dado — só a troca de domínio (Netlify → Morfo) perde, e isso já é um risco conhecido e aceito do roteiro.
- **`vite.config.local.ts`** — build alternativo, só pra pré-visualização rápida: usa `vite-plugin-singlefile` pra gerar um único `index.html` com tudo inline (JS+CSS), sem PWA, que abre direto via duplo clique (`file://`) sem precisar de servidor nem do Netlify. Rodar com `npx vite build --config vite.config.local.ts` → gera em `dist-local/`. Testado (Playwright/Chromium headless) que funciona 100% via `file://` — o build normal (`vite.config.ts`) NÃO funciona em duplo clique porque módulos ES + CSS externo são bloqueados por CORS sob `file://`; só o build singlefile resolve isso.

## Netlify — bloqueio conhecido (22/08/2026)

Tentativa de publicar via `mcp__Netlify__netlify-deploy-services-updater` (`deploy-site`) + o comando `npx @netlify/mcp@latest --site-id ... --proxy-path ...` que ele gera: **falhou com 403 Forbidden** nas duas tentativas (tokens novos, mesmo erro). Esse fluxo tenta rodar um **build remoto** no Netlify (zip do repo sem `node_modules` → `POST /api/v1/sites/{id}/builds`), não um deploy estático direto. Causa não diagnosticada (pode ser permissão do plano Free do team pra builds via essa rota, token/proxy, ou algo do lado do Netlify) — não investigar do zero. Caminho recomendado agora que o código está no GitHub: **conectar o repositório ao site direto pelo painel do Netlify** (deploy contínuo a cada push) — mais simples e mais confiável do que o deploy manual/API.

## Bloco 1 — Telas e dados centrais (ENTREGUE, aguardando validação do Rafael)

Schema Dexie (`src/db.ts`) implementa o modelo de `modelo-de-dados.md`: Conta, Categoria, Lançamento, Meta, SaldoInformado, Usuário — com os campos de importação/conciliação já no schema (não vai precisar migração quando o modo Premium/importação for construído depois).

Categorias padrão (`src/seed.ts`): as mesmas 16 validadas na planilha Light (`MorfoFinP Light - Controle de Gastos.xlsx`, aba "Minhas Metas") + Salário/Renda. Metas padrão: Fixo 50% · Variável 30% · Objetivos 10% · Segurança 10% (mesma base da planilha).

Telas:
- **Resumo do mês** — entrou × saiu × resultado, barra de progresso por macrocategoria (bloco), lançamentos do mês por categoria.
- **Lançar** — formulário manual (data, descrição, categoria, tipo entrada/saída, valor) + lista dos últimos lançamentos com opção de apagar.
- **Categorias** — visão do cadastro central, agrupado por macrocategoria.

Testado com Playwright/Chromium headless: build limpo (`npm run build`, 0 erros de tipo), app carrega, lançamento salvo aparece no Resumo recalculado ao vivo (via `dexie-react-hooks`), sem erros no console — testado tanto no build normal (servido) quanto no build singlefile (`file://`).

Entregue: `MorfoFinP.html` (arquivo único, abre com duplo clique) e `mfip-app-source.zip` (código-fonte completo). Tudo salvo também na pasta do Drive em `App/`. `mfip-app-dist.zip` (pasta `dist/` pronta pra arrastar no Netlify) também foi entregue antes.

## Repositório GitHub (23/08/2026)

Código migrado pra um repositório próprio no GitHub — decisão tomada porque o trabalho de código passou a fazer mais sentido em Claude Code do que aqui no chat do produto. `CLAUDE.md` na raiz do repo resume a stack/convenções pra qualquer sessão de Claude Code entender o projeto sem reler todo o histórico. `BACKLOG.md` na raiz tem só os itens do app (o backlog geral do produto continua no Projeto MFinp aqui no Claude).

## O que falta (próximos blocos do roteiro)

- **Bloco 2 (parcial):** PWA + IndexedDB já estão prontos. Falta: backup pra Google Drive em um toque + tarja de "último backup" + alerta de dias sem backup.
- **Bloco 3:** camada admin (login simples usuário/senha, perfil admin × cliente, cadastro de usuário só no admin, multiusuário com bases isoladas).
- **Bloco 4:** planilha-painel + Apps Script (licenciamento online) — chave de ativação, validade, revalidação, detecção de relógio atrasado.
- **Bloco 5:** publicar de verdade no Netlify e testar instalação no celular — site já criado, mas deploy ainda bloqueado (ver seção acima). Conectar o repositório GitHub ao site pelo painel do Netlify é o próximo passo recomendado.

## Notas / decisões que vieram junto

- Item 016 do backlog (stack) mudou de Postgres/Vercel pra essa arquitetura local — reconciliado com o roteiro.
- Item 020/021 (escopo "sem usuários"): confirmado que login mínimo admin×cliente é obrigatório pelo roteiro — não é "zero login".
- Categorias continuam fixas em código (decisão anterior, item 014 da planilha) — cadastro de categoria pela UI ainda não existe nesta fase; pode virar tela própria mais adiante, mas não é bloqueio pro MVP.
