# MorfoFinP (MFinp) — Modelo de dados

**Bloco 1 da especificação.** Nada aqui está implementado. Este documento existe para você validar ou recusar antes de qualquer código.

Cada decisão abaixo nasceu de um problema real encontrado na planilha em 16/08/2026 — a origem está marcada em cada uma.

---

## 1. Conta

Tudo que guarda ou movimenta dinheiro. Hoje a planilha só enxerga três (Bradesco, C6, Porto Seguro) e é cega para o 99, que é justamente onde o cofre vive.

| campo | tipo | por quê |
|---|---|---|
| `nome` | texto | "Bradesco Corrente", "Cofre 99" |
| `tipo` | corrente · cartão · cofre | muda o comportamento inteiro |
| `instituicao` | texto | Bradesco, 99, PicPay, Porto Seguro |
| `saldo_inicial` | valor | **o erro de R$ 5.725 de hoje foi este campo** |
| `data_saldo_inicial` | data | um saldo sem data não é conferível |
| `importavel` | sim/não | o 99 não tem export — só entra por saldo mensal informado (ver decisão 3) |
| `ativa` | sim/não | PicPay está zerado hoje, mas teve movimento |

**Só para cartão:** `dia_fechamento`, `dia_vencimento`, `conta_pagamento_padrao`.

> **Origem:** o saldo inicial errado passou 6 meses sem alarme. E R$ 2.904,96 sumiram do cofre porque o 99 não existe na planilha.

---

## 2. Saldo informado (conciliação)

Uma linha por conta, por mês. É o contrato do app com a realidade. Para contas não importáveis (99), **é a única fonte de dado** — não existe lançamento nelas, só esse saldo mensal.

`conta` · `data_referencia` · `saldo_informado` · `saldo_calculado` · `diferenca` · `status`

**Regra dura (em aberto):** o mês precisa mostrar sempre que houver conta com diferença ≠ 0. Se isso trava o fechamento ou apenas avisa é a decisão 4 abaixo — adiada para a fase de fechamento do MVP do app.

> **Origem:** a coluna "Bate?" existia e nunca foi preenchida, porque era opcional. Foi o que deixou o erro sobreviver meio ano. Se o app repetir isso como opcional, repete o problema.

---

## 3. Lançamento

| campo | observação |
|---|---|
| `data_competencia` | o mês a que o gasto pertence |
| `data_caixa` | quando o dinheiro realmente saiu (≠ competência no cartão) |
| `descricao` | **você renomeia livremente — nunca é chave de nada** |
| `valor` | com sinal |
| `conta` | de onde saiu / para onde entrou — só contas importáveis têm lançamento (ver decisão 3) |
| `pago_por` | conta · cartão · **cofre** ← campo novo |
| `categoria` | ver item 4 — natureza vem sempre da categoria, não é editável por lançamento (ver decisão 1) |
| `parcela_i` / `parcela_n` | hoje extraído do texto da descrição; passa a ser campo próprio |
| `fatura` | se for compra no cartão |
| `status` | importado · conciliado · manual |
| `chave_importacao` | data + valor + conta, para não duplicar |

**Regra dura:** conciliação por **data + valor + conta**. Nunca por descrição.

> **Origem:** você renomeia os lançamentos no Organizze para lembrar do que são. Qualquer casamento por texto quebra no primeiro renome. E o `pago_por` é o campo cuja ausência tornou impossível saber se o cofre diminuiu — foi ele que faltou nos R$ 2.904,96.

---

## 4. Categoria

`nome` · `macrocategoria` (Fixo · Variável · Objetivos · Segurança) · `natureza` · `aceitavel_mensal`

**Naturezas** (mantidas como estão — elas funcionam): Receita · Consumo · Aporte · Neutro · Gasto de cofrinho · Pagamento de fatura.

**Regra dura:** categoria desconhecida na importação **bloqueia o fechamento** até ser cadastrada. Não entra como "sem categoria" e some dos totais.

**Cadastro central (decisão 1):** categoria vive numa tabela de cadastro própria. Natureza não é sobrescrevível por lançamento — só muda editando a categoria ali. Falta definir: quando a categoria muda, a alteração se aplica aos lançamentos históricos já gravados com ela, ou só aos novos daqui pra frente? Virou pendência separada — item 010 do backlog.

> **Origem:** hoje uma categoria nova no Organizze faz o PROCV devolver vazio, e o lançamento desaparece dos totais sem avisar. Foi exatamente isso que a coluna Revisar passou a acusar na v4.

---

## 5. Transferência

Um par ligado: saída da conta A + entrada na conta B, com um `id` comum.

Aporte = corrente → cofre. Resgate = cofre → corrente.

**Regra dura:** transferência nunca existe sozinha. Se uma perna não aparece na importação, o app pede a outra em vez de aceitar meio movimento.

> **Origem:** o cofre virou um número único onde não dava para saber quanto estava em cada lugar, e os aportes não diziam para onde iam. Dos 11 lançamentos de cofre, só 2 nomeavam a instituição.

---

## 6. Fatura

`cartao` · `mes_referencia` · `fechamento` · `vencimento` · `total` · **`pagamentos[]`**

Pagamentos é lista, não valor único: uma fatura pode ser paga em partes e **de contas diferentes**.

> **Origem:** parte das suas compras de objetivo foi paga direto pelo 99. A planilha assume pagamento único saindo do Bradesco, e por isso não fechou.

---

## 7. Meta

`macrocategoria` · `percentual` · `base` (receita real do mês ou valor fixo) · `mes_vigencia`

Mantém o que já funciona: 50% Fixo · 30% Variável · 10% Objetivos · 10% Segurança, com base configurável.

Cofre continua com baldes genéricos (Objetivos, Segurança) — sem objetivo nomeado com meta própria por enquanto (decisão 2).

---

## 8. Usuário

`nome` · `login` · `perfil` (admin · usuário) · **base isolada**.

Você e seu sobrinho no mesmo app, cada um com seus dados. Novas versões não tocam em dado de ninguém.

---

## O princípio que atravessa tudo

Na planilha, quatro controles preferiram ficar calados a acusar problema: saldo inicial sem conferência, cofre sem conferência, capacidade sem alarme, coluna de revisão desligada. Um erro de R$ 5.725 sobreviveu seis meses.

**No MFinp, a direção é clara: o app tem que acusar, nunca ficar calado.** Se isso vira trava dura ou trava com justificativa é a decisão 4, ainda em aberto.

---

## Decisões registradas (20/08/2026)

1. **Natureza sobrescrevível?** Não. Só muda editando a categoria no cadastro central — nunca por lançamento avulso. Regra de efeito retroativo virou item 010 do backlog.
2. **Objetivos nomeados?** Não por enquanto. Cofre continua com baldes genéricos (Objetivos, Segurança).
3. **Conta 99 (não importável):** só saldo mensal informado. Sem lançamento manual — mais simples, resolve a conciliação, sem rastrear o detalhe interno do 99.
4. **Bloqueio de fechamento — adiada.** Não decidir agora. Fica registrada como pendência (item 011 do backlog) para quando estivermos fechando um MVP do app. Até lá, nenhuma das opções (trava dura, trava com justificativa, ou só aviso) está adotada.
