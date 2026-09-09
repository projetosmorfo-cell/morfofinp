# MorfoFinP (MFinp) — Backlog do app

Backlog geral do produto (planilha, decisões de MVP, itens de Fase 2) vive no Projeto MFinp do Claude. Este arquivo aqui é só o subconjunto que diz respeito diretamente ao código deste repositório — pra não precisar sair daqui pra saber o que falta no app.

Mesmo formato de sempre: 🔴 A Fazer · 🟡 A Testar (implementado, aguardando validação do Rafael) · 🟢 Concluído (só ele confirma essa mudança). IDs mantidos iguais aos do backlog geral, pra não perder o histórico.

---

## MVP — em aberto

🟡 **030 — Remover ferramentas de acesso/teste do MVP antes de publicar em produção**
Pedido do Rafael (08/09/2026): "essas funcionalidades devem estar anotadas no backlog pra serem retiradas quando o sistema for publicado em produção". Cobre TUDO que existe só pra facilitar teste/validação do MVP, nunca destinado ao usuário final: (a) botão "Entrar como empresa-tenant (demo)" (N1) e "🏢 Entrar como Admin Morfo (demo)" (N0), seção "ACESSO RÁPIDO PARA TESTE" nas duas telas de Login — `entrarDemo()`/`entrarDemoN0()`, `src/kit/auth.ts`/`authN0.ts`, markup em `src/kit/LoginView.tsx` (Decisão 33; **reescrito em 08/09/2026, mesmo dia, Decisão 37, pro padrão exato do Kit — G60**); (b) par de botões flutuantes 📱/🖥️ (simulação de resolução) + 🕐 (simular data de hoje), visíveis em Login/N0/N1, vivendo na raiz `AppRoot.tsx` — `src/kit/SimulacaoResolucao.tsx` (`FerramentasTesteFlutuantes`), campo `ConfiguracaoIcones.simulacaoResolucao` em `db.ts` (**substituiu os antigos botões de texto "Ver como Web"/"Ver como Mobile" embutidos no formulário — Decisão 35, revogada pela Decisão 37/G60** — mesmo mecanismo, apresentação agora fiel ao Kit); (c) ferramenta "Simular data de hoje" (`src/kit/SimularData.tsx`, botão 🕐 acima) — Etapa 7/Decisão 29. Quando o backend real (item 028) entrar em pauta e existir de fato um ambiente de produção separado do MVP local, remover os três — nunca deixar um jeito de logar sem senha nem uma ferramenta de debug visual/data acessível pro usuário final.

🟡 **023 — MVP app: telas centrais rodando local (Bloco 1 do roteiro)**
Resumo do mês, Lançar (manual) e Categorias, com dado salvo local (IndexedDB) e recalculando ao vivo. Testado sem erros. Entregue como zip (código-fonte + pasta pronta pro Netlify) — aguardando você abrir e usar pra validar.

~~🔴 **022 — Criar planilha-painel + Apps Script (licenciamento online)**~~ **SUPERADO (04/09/2026)**
Era o plano de licenciamento do Modelo Simples. Rafael reverteu pra Modelo Completo (ver Decisão 2, `biblioteca/01-produto/decisoes.md` do Project) — licenciamento vai ser autocadastro + assinatura, não Apps Script manual. Este item não será feito; mantido riscado por histórico.

🔴 **017 — Criar já no padrão Morfo e app simples**
Visual ainda é genérico (tema escuro neutro) — falta aplicar a identidade visual real da Morfo quando ela existir.

🔴 **004 — Versão mobile responsiva por dispositivo**
Layouts distintos por tipo de aparelho no momento de gerar o app.

🔴 **010 — Regra de efeito retroativo ao editar categoria**
Mudança na categoria reclassifica o histórico já gravado, ou só os lançamentos novos?

🔴 **003 — Especificação de telas do app**
Em andamento na prática — Resumo/Lançar/Categorias já existem (item 023); telas de Metas, Parcelas e Contas ainda faltam.

🔴 **011 — Bloqueio de fechamento do app**
Trava dura, trava com justificativa, ou só avisa?

🔴 **005 — Captura de notificação de gasto**
Precisaria de app nativo Android (PWA não captura notificação de outro app) — reavaliar mais pra frente.

🔴 **026 — Parâmetros de Categorias e Grupos travados como padrão do admin, com botão de restaurar (Bloco 3, quando existir login/permissionamento)**
Pra quando o app tiver ambiente com login e permissionamento (Bloco 3 do roteiro): todo parâmetro hoje livre em "Categorias e Grupos" (ícones, grupos, categorias, percentuais de meta) precisa de um padrão que só o perfil administrador pode salvar como padrão oficial do app. Usuário comum continua podendo alterar à vontade na própria base dele, mas a tela de parametrização ganha um botão "Restaurar padrão" que reseta os parâmetros pro último padrão salvo pelo administrador. Pedido do Rafael em 01/09/2026 — o modelo de permissão (`perfisPadraoN1`/`nivelAcesso`) entra no código nesta rodada (Kit de Estrutura Mínima, 04/09/2026), mas travar estes parâmetros específicos por perfil continua de fora até esta rodada decidir aplicar isso aqui.

🔴 **027 — Seletor de mês vira seletor de período**
No topo, onde hoje só troca de mês (SeletorMes), permitir selecionar um período (ex.: um intervalo de datas ou vários meses de uma vez), não só um mês por vez. Pedido do Rafael em 04/09/2026 — explicitamente pra fazer depois, não nesta rodada.

🔴 **028 — Backend real pro Modelo Completo (autocadastro, pagamento, multi-tenant, N0 com dado de verdade)**
Rafael escolheu (04/09/2026, Roteiro de Parametrização Morfo) sequenciar o Kit de Estrutura Mínima "front-end primeiro, backend depois": o app hoje é 100% client-side (Dexie/IndexedDB, sem servidor, distribuído como arquivo `file://` — ver `CLAUDE.md`), incompatível como está com autocadastro de tenant + cobrança automática + painel N0 gerenciando tenants de verdade (isso exige um backend: API, banco acessível de fora do navegador, autenticação e webhook de pagamento server-side). Esta rodada constrói só a camada de front-end (camadas N0/N1, navegação, permissões, layout — ver Decisão 6) com os pontos que dependeriam do backend deixados como stub/placeholder explícito. Este item é o backend de verdade, numa rodada própria, futura — não escopado ainda (tecnologia de backend, hospedagem, etc. ficam pra quando essa rodada for aberta).

🟢 **029 — Login real + Site institucional do produto (deslogado) + Ambiente Logado**
Escopo da Etapa 8 do Roteiro de Parametrização Morfo — construído (Decisão 12) e depois reconstruído com 2 logins separados N0/N1 (Decisão 32, G59). Ver `Decisões.md` (Project) pro histórico completo.

## Concluído (deste repositório)

🟢 **016 — Definir stack do app**
PWA instalável, dados 100% locais no aparelho (IndexedDB, sem banco externo, sem Firebase), hospedagem Netlify.

🟢 **020 — MVP sem cadastro próprio de usuários (decidido, com nuance)**
Não terá tela de autocadastro/gestão de conta pelo cliente. Mas o roteiro exige um login mínimo admin×cliente (você cria usuário/senha simples pra cada pessoa).

🟢 **021 — Escopo do "sem usuários" — resolvido pelo roteiro**
Multiusuário com bases isoladas por aparelho; cadastro só na camada admin. Licenciamento via Apps Script (modelo escolhido por você).
