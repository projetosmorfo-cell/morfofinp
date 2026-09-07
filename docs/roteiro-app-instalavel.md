# Roteiro de Criação de app simples — Instalável, base local, controle de usuários e licença

> **Para que serve:** cole este documento **dentro do próprio chat onde o MVP do app já foi desenvolvido** (com toda a conversa e ajustes). Você o envia num determinado momento, e a partir dele o Claude passa a trabalhar **sobre a última versão do MVP gerada ali**, para **fechar a versão instalável** neste padrão. Ele obriga o Claude a **primeiro validar o que já existe, levantar o que falta e confirmar com você antes de implementar**.

> ⛔ **ANTES DE TUDO — NÃO COMECE NADA AO RECEBER ESTE DOCUMENTO.**
> Ao receber este arquivo, apenas **confirme em uma linha que leu e está pronto** e **aguarde meu comando**. Eu posso continuar ajustando o MVP antes de iniciar.
> **Só comece o processo quando eu escrever um destes comandos:** `EXECUTAR` · `INICIAR ROTEIRO` · `INICIAR ROTEIRO DE PUBLICAÇÃO` · `INICIAR CRIAÇÃO DO APP` (ou algo claramente equivalente).
> Enquanto eu não mandar o comando, **não valide, não pergunte, não implemente nada** — só espere.

---

## Resumo das características (para o Rafael lembrar do modelo)

*Esta seção é uma referência sua; o chat de dev usa as seções seguintes.*

- **App simples e instalável** (PWA) — abre como aplicativo no celular, funciona offline.
- **Base de dados local**, no aparelho da pessoa (sem banco externo, sem Firebase).
- **Base local mantida na atualização de versão** — atualizar o app **não apaga** os registros já gravados; só acrescenta.
- **Controle de licença e usuários é opcional**, escolhido entre dois modelos:
  - **Estático:** tudo embutido na versão — você controla os parâmetros/usuários **antes** de gerar, e vão junto no app.
  - **Controlado por Apps Script:** os parâmetros/usuários ficam numa **planilha única do admin** (uma só pra todos os apps, com `app_id`/aba por app), e você controla **a qualquer momento**.
- **Atualização de versão leva tabelas e config embutidas do admin, mas NÃO atualiza/apaga os registros já gravados localmente** pela pessoa.
- **Backup local + Google Drive** em um toque, com aviso de dias sem backup.
- **Publicação:** um só domínio Morfo, cada app num caminho próprio (instala separado), **login/identidade centralizados sob a URL da Morfo**; duas URLs no modelo online (a do app e a do Apps Script).
- **Multiusuário** com bases isoladas; **cadastro de usuário só na camada admin**.
- **Licença:** chave de ativação por pessoa, detecção de relógio atrasado, validade que bloqueia, e revalidação **a cada acesso** ou **periódica**.

---

## 0. Como o Claude deve trabalhar a partir deste roteiro (regra de processo — obrigatória)

Este roteiro chega **no meio de um chat** onde o MVP já existe.

**Gatilho de início:** ao receber este documento, **só confirme que leu e espere**. **Não faça nada** até o Rafael escrever um comando de início (`EXECUTAR`, `INICIAR ROTEIRO`, `INICIAR ROTEIRO DE PUBLICAÇÃO`, `INICIAR CRIAÇÃO DO APP` ou equivalente claro). Depois do comando, siga a ordem abaixo:

1. **Valide a última versão do MVP já gerada NESTE chat** em relação a este padrão.
2. **PERGUNTE ao Rafael qual modelo de validação de usuário/licença ele quer** — Estático (offline) ou com Apps Script (online) — **explicando os dois** (ver seção A abaixo). Não assuma; espere a resposta.
3. **Cheque o estado da camada admin no MVP atual** (ele pode ou não já ter implementado):
   - Se **já existe**, valide se ela tem os parâmetros necessários (usuários, licença, validade, modo de revalidação, tabelas de referência) e **direcione o Rafael a completar o que faltar**.
   - Se **não existe ainda**, **direcione-o a criar** a camada admin com esses parâmetros.
4. **Levante o que falta.** Liste, item por item deste roteiro, o que já está OK, o que está parcial e o que falta (considerando o modelo escolhido).
5. **Mostre esse levantamento ao Rafael e aguarde a confirmação dele** antes de implementar qualquer coisa.
6. **Implemente em blocos pequenos**, confirmando a cada bloco.
7. **Só então feche a versão instalável**, rodando o checklist da seção 9.

Regra de ouro: **preservar dados já registrados da pessoa. Nunca zerar, nunca resetar — só acrescentar.**

### Seção A — Pergunta obrigatória: qual modelo de validação? (explicar assim ao Rafael)

- **OFFLINE (estático):** *"Você controla os parâmetros e usuários aqui, antes, e eu gero a versão do app com tudo embutido — vai junto no envio. Para mudar algo depois (novo usuário, nova validade), a gente gera uma versão/config nova e você reenvia."*
- **ONLINE (Apps Script):** *"Eu te ajudo a criar o Apps Script; seu controle passa a ser a qualquer momento, porque o app fica validando seus parâmetros online — inclusive cadastro de novos usuários — sem você reenviar o app."*

Só depois da escolha, seguir para o levantamento e a implementação.

---

## 1. Arquitetura base (obrigatória)

- **PWA instalável**, tela cheia, funciona offline.
- **Dados gravados localmente** (IndexedDB), separados do código.
- **Backup para o Google Drive da pessoa**, em **um toque**, com **autorização única** na 1ª vez.
- **Tarja** com **data/hora do último backup** e **alerta** quando passar X dias sem backup.
- **Sem base de dados externa. Sem Firebase.**

## 1B. Publicação, URLs e estrutura do site Morfo (obrigatória)

Um PWA só instala se estiver publicado numa **URL com HTTPS**. Estrutura do modelo Morfo:

- **Site guarda-chuva da Morfo (empresa) + cada produto numa sub-URL própria (caminho), no mesmo domínio.** Ex.: `morfo.app` = empresa (institucional + **menu Produtos**); `morfo.app/mvida`, `morfo.app/mloc`, `morfo.app/mfinp` = cada produto (landing deslogada + login + app logado). O **menu Produtos leva pra sub-URL do produto**; o **login mora dentro da seção do produto**.
- **Cada produto instala como app separado** (manifest/escopo próprio no caminho) e tem **dados locais isolados por `app_id`** (um não enxerga o do outro), mesmo no mesmo domínio.
- **Login e identidade centralizados** no shell da Morfo (reaproveitar o que já existe no MVP **MLoc**); funciona **sem cross-origin** por ser o mesmo domínio.
- O externo do MLoc **não** vira o site da empresa: ele é a **seção do produto MorfoLoc**. O site-empresa é neutro e escala pra vários produtos.
- **Duas URLs diferentes — NÃO confundir:** (1) **URL de publicação do app** (hosting) e (2) **URL do Apps Script** (validação, só no modelo online — seção 6).

**Hosting recomendado: Netlify** (simples, HTTPS automático, dá pra plugar o domínio Morfo depois num clique). Cloudflare Pages é alternativa boa.

### O Claude deve PERGUNTAR em que situação estamos e conduzir passo a passo

> **Regra de condução:** guie **um passo de cada vez, em linguagem simples e resumida, sem jargão**, esperando o Rafael dizer "ok, próximo" antes de avançar. Nada de despejar tudo de uma vez.

- **1ª vez (criar o modelo do zero e publicar o primeiro produto — hoje, o MVida):**
  1. Criar uma conta no **Netlify**.
  2. Publicar o app (arrastar a pasta pronta) e **pegar a URL grátis** que o Netlify gera.
  3. **Instalar no celular** por essa URL e testar.
  4. Deixar já organizado para, no futuro, entrar o **site-empresa Morfo por cima** com um **menu Produtos** que chama a sub-URL do produto.
  5. (Quando o Rafael quiser) **plugar o domínio da Morfo** no mesmo site — só configuração de domínio, sem refazer nada.
  - **Aviso importante:** trocar de domínio depois é "origem" nova → os dados locais **não migram sozinhos**. Testar no subdomínio do Netlify à vontade, mas **amarrar o domínio Morfo antes de entregar pra usuários reais**.

- **Próximas vezes (usar este roteiro para outro produto):** **não recriar a estrutura toda.** Atenção: o **site-empresa Morfo pode ainda NÃO existir** — se não existir, apenas criar a **sub-URL do novo produto pra já usar**, deixando o guarda-chuva pra depois. Passos:
  1. Publicar o novo produto na **sua própria sub-URL** (Netlify), pronta pra usar/instalar.
  2. **Se o site-empresa já existir**, adicionar o produto ao **menu Produtos**. **Se ainda não existir**, deixar a sub-URL funcionando sozinha — o guarda-chuva entra quando o Rafael quiser.
  3. Configurar o **manifest/escopo** do novo produto e **testar a instalação**.

## 2. Atualização não-destrutiva (obrigatória)

- Código e dados **separados**: trocar a versão **não apaga** os dados locais.
- **schemaVersion** + **migrações** que **só acrescentam** (valores padrão), nunca apagam.
- **Proibido** "reset" no carregamento.
- Nova versão = novas funcionalidades **+** base da pessoa preservada.

## 3. Duas camadas de informação (obrigatória)

1. **Dados da pessoa** — **preservados sempre**.
2. **Config do admin** (tabelas de referência, parâmetros, validade, usuários) — **embutida no envio** e **atualizada nas versões novas**, sem tocar nos dados da pessoa.

> Atualização leva as **tabelas e a config embutidas** do admin, mas **não atualiza nem apaga os registros já gravados localmente**.

## 4. Login, usuários e cadastro — admin × cliente (obrigatória)

- Sempre implementar **controle mínimo de usuários** com papéis **admin** (Rafael) e **cliente**.
- **Login simples** (usuário + senha ou PIN).
- **Cadastro de usuários só na camada admin.** O **Rafael define login e senha** e entrega à pessoa. O cliente não cadastra ninguém.
- **Multiusuário no mesmo aparelho** com **bases isoladas**.

**Como a credencial chega ao aparelho do cliente (depende do modelo da Seção A):**
- **OFFLINE (estático):** credencial **embutida no que o Rafael envia**. Adicionar/alterar usuário depois = enviar config/versão nova.
- **ONLINE (Apps Script):** o admin cadastra na **planilha**; o app do cliente **valida o login online**. Adicionar/revogar = editar a planilha, **sem reenviar nada**.

> Como os dados são locais por aparelho, **cadastrar no celular do admin só chega ao do cliente no modelo ONLINE**.

## 5. Admin e licenciamento (obrigatória)

Parâmetros na tela de manutenção escondida (admin), **embutidos no envio e nas atualizações**:

- **Validade da licença:** data que **bloqueia o app** quando passa.
- **Modo de revalidação (parâmetro do admin):** escolher entre
  - **A cada acesso** — o app valida **toda vez que abre**; ou
  - **Periódica** — valida **a cada N dias**.
  Em ambos, **cruza com a validade:** se estiver offline além da janela de tolerância **ou** passar a validade, **bloqueia**.
- **Chave de ativação por pessoa (OBRIGATÓRIA):** código único que "liga" o app naquele aparelho.
- **Detecção de relógio atrasado (OBRIGATÓRIA):** guarda a última data em que rodou; se o relógio "voltar no tempo", bloqueia.
- **Tela de manutenção escondida sob login de admin:** cadastra usuários, muda validade, escolhe o modo de revalidação, edita tabelas e parâmetros.
- **Config embutida no envio inicial e nas atualizações.**

### Limitação honesta (só-offline/estático)
Validade + chave + relógio são fortes contra uso casual, **mas não à prova de usuário técnico**. Para evitar redistribuição casual, é suficiente. Para trava real, use o modelo ONLINE (seção 6).

## 6. Modelo ONLINE — trava real via Google Apps Script (quando escolhido na Seção A)

- Um **Apps Script** publica uma **URL (Web App)** de graça, presa à conta Google do Rafael, alimentada por uma **planilha que ele edita** (painel de licenças/usuários).
- O app pergunta à URL: "chave/usuário vale? qual a validade? foi revogado?" e recebe sim/não + parâmetros.
- **Não é Firebase, sem servidor, a pessoa não instala nada a mais**, e os **dados dela seguem 100% locais**.
- Usa a **hora do servidor do Google** → o truque de atrasar o relógio não funciona, e dá pra **revogar de verdade**.

**Momentos que exigem internet (conforme o modo de revalidação):** 1ª ativação; depois **a cada acesso** ou **a cada N dias**; e quando o admin muda algo remotamente. Fora isso, funciona offline com **janela de tolerância**.

### Planilha única para todos os apps (decisão do Rafael)

Há **uma só planilha-painel e um só Apps Script/URL** para **todos** os apps dele. A planilha identifica cada app por um **`app_id`** (código curto: `mfinp`, `mvida`, `mloc`…), com **uma aba por app** (ou coluna `app_id`). Cada app **já nasce com o próprio `app_id` embutido** e o envia na consulta; o script devolve **só os dados daquele app**. O `app_id` não é segredo — quem garante o controle é a **chave de ativação por pessoa** (única por app + usuário).

**O Claude deve PERGUNTAR em que situação o Rafael está e agir conforme:**
- **1ª vez (a planilha/Apps Script ainda NÃO existe):** guiar passo a passo para **criar** a planilha-painel, criar o projeto Apps Script, colar o código, publicar como Web App, autorizar no Google, copiar a URL, e criar a **primeira aba** com o `app_id` deste app; depois vincular o app à URL.
- **Próximas vezes (a planilha/Apps Script JÁ existe):** **não recriar nada** — guiar o Rafael apenas a **criar uma aba nova** para o novo `app_id` na planilha existente e apontar o app para a **mesma URL** (sem novo deploy). Se o script precisar reconhecer o novo `app_id`, ajustar só o necessário e reusar o deploy.

**Quem faz o quê:**
- **O Claude escreve todo o código** (Apps Script + integração no app + passo a passo).
- **O Rafael faz o setup único (~5 min) na 1ª vez**, guiado; nas próximas, só **cria a aba** do novo app.
- **Manutenção = editar a planilha** (usuários, validade, revogação, por `app_id`). **Zero programação** depois.

## 7. Backup e portabilidade

- **Exportar/importar** backup (JSON) para o Drive e/ou download local.
- Trocar de aparelho ou reinstalar sem perder histórico.
- Migração de versão preserva e converte o backup antigo.

## 8. Checklist de fechamento de versão

- [ ] Modelo de validação escolhido pelo Rafael (Estático **ou** Apps Script) — perguntado e confirmado.
- [ ] Situação de publicação perguntada (1ª vez: criar estrutura + publicar produto; próximas: só a sub-URL do novo produto).
- [ ] App publicado numa URL HTTPS (Netlify), no seu caminho, instalável no celular.
- [ ] Login/identidade centralizados sob a URL da Morfo e vinculados ao app (mesmo domínio).
- [ ] Dados locais isolados por `app_id` mesmo no mesmo domínio.
- [ ] (Se ONLINE) URL do Apps Script copiada e colada na config do app (URL diferente da de publicação).
- [ ] Estado da camada admin checado (já existia → validada/completada; não existia → criada).
- [ ] (Se ONLINE) Situação da planilha perguntada (1ª vez → criar tudo; já existe → só nova aba com o `app_id`, mesma URL).
- [ ] Dados locais preservados em atualização (migração testada com base antiga).
- [ ] Backup para o Drive + tarja de último backup + alerta de dias sem backup.
- [ ] Usuários admin × cliente; cadastro só na camada admin; Rafael define login/senha.
- [ ] Multiusuário com bases isoladas.
- [ ] Chave de ativação por pessoa.
- [ ] Detecção de relógio atrasado.
- [ ] Validade que bloqueia o app.
- [ ] Modo de revalidação (a cada acesso **ou** periódica) cruzado com a validade.
- [ ] Tela de manutenção escondida (admin): usuários, validade, modo de revalidação, tabelas, parâmetros.
- [ ] Config do admin embutida no envio e nas atualizações (sem tocar nos registros locais da pessoa).
- [ ] (Se ONLINE) Apps Script publicado e URL na config; janela de tolerância offline testada.
- [ ] Exportar/importar backup testados.

## 9. Pedido para o Claude (cole depois do roteiro, no chat do MVP)

> Com base na **última versão do MVP que geramos aqui neste chat**, **não implemente nada ainda**. Primeiro: (1) me pergunte qual modelo de validação eu quero — Estático (offline) ou Apps Script (online) — explicando os dois; (2) valide a versão atual e faça um levantamento item a item deste roteiro (o que já existe, o que está parcial, o que falta); (3) me mostre e aguarde minha confirmação. Só depois implementamos, em blocos pequenos com confirmação a cada etapa, e por fim fechamos a versão instalável rodando o checklist.
