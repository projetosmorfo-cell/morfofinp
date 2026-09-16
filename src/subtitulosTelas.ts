/* Subtítulo de cada tela principal — fonte ÚNICA (12/09/2026, itens 4, 5, 6 e 7).

   O Rafael pediu um texto de destaque em cada tela dizendo, sem rodeio, o que
   ela compara — e que o onboarding usasse os MESMOS textos. Por isso eles moram
   aqui e não escritos à mão em cada lugar: se o do Resumo mudar, o passo do
   tour muda junto, sem alguém precisar lembrar de atualizar os dois.

   ---------------------------------------------------------------------------
   CORREÇÃO de 12/09/2026 (build 052) — a distinção anterior estava errada.

   O texto antigo separava Resumo ("quanto sobra no bolso") de Situação ("posso
   gastar hoje?"). O Rafael apontou, com razão, que as duas frases descrevem a
   mesma coisa para quem lê: as duas soam como "o que sobrou livre". A diferença
   real não está na pergunta, está NO QUE ENTRA NA CONTA:

     Resumo       → CAIXA. Entrou, saiu, e o que ainda entra e sai por
                    compromisso já assumido. Nenhuma meta entra aqui. É a sobra
                    do mês livre de tudo.

     Situação     → REAL × METAS **+ COMPROMISSOS**. Pega a meta do mês,
                    desconta o que já saiu e o que já está comprometido, e
                    mostra o que ainda dá pra gastar hoje. É a sobra de AGORA,
                    com o mês ainda correndo — por isso ela avisa que a meta
                    variável ainda não fechou.

     Planejamento → REAL × METAS, e só. O placar de cada meta, grupo a grupo e
                    categoria a categoria, SEM misturar compromisso.

   Em uma linha: Situação responde "posso gastar?" num número só; Planejamento
   responde "onde estou gastando demais?" com a conta aberta. Resumo não fala de
   meta nenhuma.
   ---------------------------------------------------------------------------

   Nomenclatura (item 10): tudo é META — meta da categoria e meta do grupo.
   "Aceitável" e "limite aceitável" saíram do vocabulário do produto. */

/* 12/09/2026 (build 054): os textos perderam o "Aqui é só o"/"Aqui é o". Desde
   que o subtítulo saiu de baixo do título e foi pra LINHA do título, ele
   disputa largura com o próprio título — e o preâmbulo, que não dizia nada,
   era o primeiro a empurrar os dois pro corte. Sobrou só o que distingue uma
   tela da outra. Vira rótulo, não frase: sem ponto final. */
/* Build 086: `SUBTITULO_RESUMO` e `SUBTITULO_SITUACAO` saíram junto com as
   duas telas que os exibiam (Resumo do Mês e Situação), apagadas com a versão
   Premium. O subtítulo da tela Hoje nunca morou aqui — ele é escrito no
   próprio `Hoje.tsx`, porque aquela tela não compara "real × alguma coisa" da
   mesma forma que as outras. */
export const SUBTITULO_PLANEJAMENTO = 'Real × metas'

/* A Carteira não compara nada — ela responde ONDE o dinheiro está agora. Por
   isso o subtítulo dela não segue a forma "real × alguma coisa" das outras
   três: seguir a forma só pra manter o padrão diria uma coisa que a tela não
   faz. */
export const SUBTITULO_CARTEIRA = 'Onde o dinheiro está'

/* Os textos longos das mesmas três telas, abertos pelo botão de explicação
   ("i" ao lado do subtítulo, desde a build 053). Moram aqui junto dos
   subtítulos porque são a versão
   completa da MESMA ideia — separar os dois arquivos é o caminho mais curto
   para eles se contradizerem. */

/* `EXPLICACAO_RESUMO` e `EXPLICACAO_SITUACAO` saíram na build 086, pelo mesmo
   motivo dos subtítulos acima. */
export const EXPLICACAO_PLANEJAMENTO =
  'Aqui é o placar de cada meta: quanto você planejou, quanto já aconteceu e quanto ainda está previsto — no geral, por grupo, por categoria e até o lançamento. Compromisso não entra nesta conta (isso é assunto da Situação): esta tela responde onde você está gastando mais do que combinou, não se pode gastar hoje.'

export const EXPLICACAO_CARTEIRA =
  'Onde o seu dinheiro está agora, um card por lugar: conta, cartão e cofrinho. O cartão mostra a fatura do ciclo, não o saldo. Toque num card pra ver e mexer nos lançamentos dele.'
