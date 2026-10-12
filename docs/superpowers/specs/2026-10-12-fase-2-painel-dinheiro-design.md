# Fase 2 — Painel de dinheiro

**Data:** 2026-10-12
**Status:** design aprovado
**Depende de:** Fase 1 (concluída — ver [`docs/design.md`](../../design.md))

---

## 1. Objetivo

Responder a pergunta que origina o projeto: **para onde vai o dinheiro, e quanto sobra.**

A Fase 1 fez o dado entrar. Ele chega com a categoria genérica da Pluggy (`Food and drinks`
mistura mercado com iFood) e sem nenhuma noção de receita. Esta fase transforma extrato bruto
em resposta.

## 2. Decisão central: de onde vem a receita

**Automática, com correção por um toque.** O app soma os créditos da conta corrente e trata
tudo como receita; qualquer lançamento pode ser marcado "não é receita", e esse toque **cria
uma regra** que passa a valer para os futuros.

Alternativas descartadas e por quê:

- *Declarar o valor do mês:* é digitação recorrente — exatamente o hábito que deixou a planilha
  de maio cinco meses vazia. Num mês esquecido, o painel inteiro perde sentido.
- *Automático sem correção:* PIX de amigo dividindo conta, estorno de compra e dinheiro movimentado
  pelo próprio usuário inflam a receita. Isso deixa "posso gastar hoje" otimista — que é o erro
  mais perigoso possível neste app.
- *Média de 3 meses:* não existe base no primeiro trimestre, e num mês fraco autoriza gastar
  dinheiro que não entrou.

O custo aceito: **o primeiro mês erra.** Em troca, nada é pedido ao usuário de forma recorrente,
e a precisão cresce sozinha conforme as regras se acumulam.

## 3. Decisão de categorização

**A Pluggy é o ponto de partida; regras próprias sobrescrevem.**

Nenhuma tela nasce vazia (a Pluggy classifica tudo de cara) e onde a classificação dela é grossa
a regra do usuário manda mais. O schema da Fase 1 já previu isso: `Transacao.categoriaOrig`
guarda o que a Pluggy disse, `Transacao.categoriaId` guarda a palavra final. O original nunca
é sobrescrito — sem ele, não há como auditar uma classificação errada.

Precedência, nesta ordem: **regra própria → categoria da Pluggy → `null`.**

## 4. Mudança de schema

Hoje `RegraCategoria` só sabe categorizar. Ela passa a saber também ignorar, em vez de ganhar
uma tabela nova:

```prisma
model RegraCategoria {
  id          String     @id @default(cuid())
  padrao      String     // trecho buscado na descrição, comparado em maiúsculas
  categoriaId String?    // nulo quando a regra é de ignorar
  categoria   Categoria? @relation(fields: [categoriaId], references: [id])
  ignorar     Boolean    @default(false)
  criadaEm    DateTime   @default(now())
}
```

Uma regra diz `IFOOD → Delivery` **ou** `PIX MARIA → ignorar`. Marcar um lançamento num toque
cria a regra correspondente — é esse o mecanismo de aprendizado.

Invariante: `ignorar = true` exige `categoriaId = null`, e `ignorar = false` exige
`categoriaId` presente. Validado em código, porque o Prisma não expressa isso.

A migração inicial ainda não foi criada (depende do `DATABASE_URL`), então esta mudança **não
custa uma migração de correção**.

## 5. As três funções que carregam o risco

Toda a lógica que pode fazer o app mentir vive em funções puras, testadas sem banco:

| Função | Arquivo | Decide |
|---|---|---|
| `classificar` | `features/dinheiro/classificar.ts` | regra própria → Pluggy → `null` |
| `detectarTransferenciaInterna` | `features/dinheiro/transferencia.ts` | o que não é gasto real |
| `resumoDoMes` | `features/dinheiro/resumo.ts` | receita, gasto, sobra, ranking |

### Por que `detectarTransferenciaInterna` existe

O pagamento da fatura aparece como **débito na conta corrente**, e as compras daquela fatura
aparecem **no cartão**. Contar os dois **dobra o gasto do mês**. Sem essa função, o painel mente
para cima — e o "posso gastar hoje" fica artificialmente pequeno, o que leva o usuário a
desacreditar do app e abandoná-lo.

### Regra de ouro do `resumoDoMes`

Transação com `ignorada = true` não entra em nenhum total: nem receita, nem gasto, nem ranking.

## 6. Categorias iniciais

Semeadas e editáveis. Grupo `VARIAVEL` salvo onde indicado:

`Mercado` · `Delivery` · `Restaurante` · `Transporte` · `Lazer` · `Saúde` · `Outros`
`Moradia` (FIXA) · `Assinaturas` (FIXA) · `Educação` (FIXA)
`Salário` (RECEITA) · `Freelance` (RECEITA)

Dez categorias de gasto é o limite onde o ranking ainda se lê de relance; vinte vira lista.

## 7. Tela `/dinheiro`

Crua, como a `/dia` — hierarquia, número herói e direção suíça editorial continuam sendo Fase 3.

Mostra: sobra do mês, ranking de categorias com valor, e a lista de lançamentos. Cada linha tem
duas ações de um toque: **recategorizar** e **ignorar**. Ambas criam regra.

## 8. Falhas

| Situação | Comportamento |
|---|---|
| Receita detectada é zero | "Sobra" e "posso gastar hoje" mostram `—` e o motivo. Nunca um número inventado |
| Transação sem categoria própria nem da Pluggy | Cai em `Outros` no ranking, e aparece sinalizada na lista para o usuário resolver |
| Regra conflitante (duas casam a mesma descrição) | A mais recente ganha. Determinístico e explicável; a alternativa (mais específica ganha) exige definir "específica" e surpreende mais |
| Mês sem nenhuma transação | Tela diz que não há dado no período, em vez de mostrar zeros |

## 9. Testes

TDD nas três funções puras. Casos que importam mais que cobertura:

- `classificar`: regra própria vence a Pluggy; sem regra usa a Pluggy; sem nenhuma devolve `null`;
  casamento é case-insensitive; regra de ignorar não devolve categoria.
- `detectarTransferenciaInterna`: pagamento de fatura é detectado; compra comum **não** é
  falso-positivo; sem cartão na conexão nada é marcado.
- `resumoDoMes`: `ignorada` fica fora de todos os totais; receita zero devolve sobra `null`,
  não zero; ranking ordena por valor decrescente; mês vazio não devolve zeros.

## 10. Fora do escopo

Número herói e direção visual (Fase 3) · chips, streak e push (Fase 3) · correlação (Fase 4) ·
orçamento por categoria — `Orcamento` já existe no schema, mas definir alvo por categoria é
digitação recorrente e só se justifica depois de haver três meses de histórico para sugerir o
alvo automaticamente.
