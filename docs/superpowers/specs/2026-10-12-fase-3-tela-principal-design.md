# Fase 3 — Tela principal e hábitos completos

**Data:** 2026-10-12
**Status:** design aprovado
**Depende de:** Fases 1 e 2 (concluídas em código)

---

## 1. Objetivo

Dar ao app a tela que muda comportamento **no momento da compra**, e fechar o lado dos hábitos
com registro de atrito mínimo.

As Fases 1 e 2 fizeram o dado entrar e explicaram o passado. Esta fase responde a única pergunta
acionável *hoje*: **quanto eu posso gastar.**

## 2. Dívida da Fase 1 que esta fase paga

O `docs/design.md` prometia: *"idade do último sync estampada na tela principal, e push se passar
de 48h"*. A faixa na tela foi entregue; **o push nunca foi implementado**, porque o plano da Fase 1
não teve tarefa para ele e o self-review do plano contra o spec não pegou a falta.

Isso importa além do push em si: a janela incremental da Pluggy é de 7 dias, então sync parado
sem ninguém avisar abre um buraco permanente no extrato. A faixa só avisa quem abre o app — e
quem parou de abrir o app é exatamente quem precisa do aviso.

## 3. Decisão: de onde vem o valor da reserva

**Uma conta marcada como reserva.** O usuário cria uma Caixinha ou RDB no Nubank, o Pluggy a traz
como conta, e ele marca essa conta uma vez. O saldo dela é a reserva.

Alternativas descartadas:

- *Somar as sobras mensais:* número teórico. Se a sobra ficou na conta e foi gasta depois, a barra
  mostra dinheiro que não existe — o tipo exato de mentira que este app evita em todo outro lugar.
- *Saldo da conta corrente:* é o dinheiro do mês. Sobe no dia do pagamento e despenca no fim,
  fazendo a barra oscilar sem relação com guardar algo.
- *Remover a reserva:* descartada porque o usuário pediu os quatro números explicitamente.

**Enquanto nenhuma conta estiver marcada**, a barra diz "nenhuma conta de reserva definida" e
convida a criar. O vazio é o empurrão, e é honesto.

## 4. Mudanças de schema

```prisma
model Conta {
  // … campos existentes
  ehReserva Boolean @default(false) // marcada uma vez pelo usuário
}

/** Endpoint de Web Push de um dispositivo. Um usuário, poucos aparelhos. */
model Inscricao {
  id       String   @id @default(cuid())
  endpoint String   @unique
  p256dh   String
  auth     String
  criadaEm DateTime @default(now())
}
```

`Meta` já existe desde a Fase 1 e recebe os degraus da reserva.

## 5. Degraus da reserva

Semeados: **R$ 500** → **R$ 1.500** → **um mês de despesa**.

O terceiro é calculado da média de gasto dos últimos 3 meses, nunca digitado. Enquanto não houver
3 meses de histórico, só os dois primeiros aparecem — um alvo baseado em um mês de dado seria
chute apresentado como meta.

Escalonar existe porque "6x despesas" (~R$ 20 mil) deixaria a barra parada em 0% por um ano.
Escalonada, ela anda na primeira semana.

## 6. Funções puras

| Função | Arquivo | Decide |
|---|---|---|
| `podeGastarHoje` | `features/painel/pode-gastar.ts` | o número herói |
| `diasRestantesNoMes` | `features/painel/pode-gastar.ts` | o divisor do herói |
| `progressoReserva` | `features/painel/reserva.ts` | degrau ativo e sua % |
| `calcularStreak` | `features/habitos/streak.ts` | dias consecutivos, por hábito |

### Regra do herói

`podeGastarHoje = sobra ÷ dias restantes no mês`, incluindo hoje. Se a sobra é `null` (nenhuma
receita detectada), o resultado é `null` — nunca um número.

### Regra do streak contra desânimo

**O dia de hoje não conta como quebra.** Se às 10h da manhã o streak de treino mostrasse `0`, o
usuário abriria o app e veria fracasso num dia que ainda não terminou. O streak conta até ontem,
e hoje só soma quando registrado.

## 7. Tela principal (`/`)

Hierarquia por contraste de escala, não paridade:

- **Herói:** `quanto posso gastar hoje`, em `clamp()` até ~8rem.
- **Secundários**, pequenos, numa linha: sobra do mês · top 3 categorias · barra da reserva.
  Cada um é um link para a tela cheia do assunto.
- **Idade do último sync**, permanente.
- **Hábitos de hoje** com chips e toque único.

### Chips em vez de teclado

`HabitoDef.chips` existe desde a Fase 1 e passa a ser renderizado: sono vira `5 6 7 8 9`.
Nenhum campo numérico usa teclado livre onde um chip resolve — teclado livre é o que matou a
planilha.

## 8. Direção visual

**Suíço editorial.** Grid rígido, tipografia como estrutura, fundo claro, **um** acento.
Tokens em `src/styles/tokens.css`. Cor apenas semântica (acima/abaixo do orçamento, sync velho),
nunca decorativa. Animação só em `transform` e `opacity`. Dark mode fica fora: a decisão de não
defaultar para escuro é deliberada, e o app é lido na rua, com sol.

## 9. Push

Web Push com VAPID, sem serviço de terceiros. Dois gatilhos:

| Gatilho | Quando |
|---|---|
| Lembrete de hábito | 21h, se houver hábito `MANUAL` sem registro hoje |
| Sync parado | dentro do cron de sync, se a idade passar de 48h |

Horário fixo no código, não em tela de configuração: tela de ajuste para um único usuário é
desperdício de trabalho.

O iPhone só aceita push de PWA **instalado na tela de início** (iOS 16.4+). Se a inscrição falhar,
a tela diz isso em vez de falhar calada.

## 10. Falhas

| Situação | Comportamento |
|---|---|
| Sobra é `null` | Herói mostra `—` e "nenhuma receita detectada neste mês" |
| Nenhuma conta marcada como reserva | Barra diz isso e convida a criar. Nunca 0% de alvo inventado |
| Menos de 3 meses de histórico | Terceiro degrau não aparece |
| Push recusado pelo navegador | Mensagem explícita na tela, com a dica de instalar como PWA |
| Endpoint de push expirado (410/404) | Inscrição é removida do banco, em vez de reenviar para sempre |

## 11. Testes

TDD nas quatro funções puras. Casos que importam mais que cobertura:

- `podeGastarHoje`: sobra `null` devolve `null`; último dia do mês divide por 1; sobra negativa
  devolve negativo (não zero).
- `diasRestantesNoMes`: inclui hoje; 31 de janeiro devolve 1; fevereiro bissexto conta certo.
- `progressoReserva`: sem conta marcada devolve `null`; saldo acima do primeiro degrau pula para
  o segundo; saldo acima de todos devolve 100% do último.
- `calcularStreak`: hoje sem registro **não** quebra; ontem sem registro quebra; sequência com
  buraco conta só a mais recente.

## 12. Fora de escopo

Correlação hábito x gasto (Fase 4) · tela de configuração · dark mode · orçamento por categoria
(segue fora desde a Fase 2, pelo mesmo motivo: é digitação recorrente).
