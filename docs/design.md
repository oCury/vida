# Vida — rastreador de hábitos e dinheiro

**Data:** 2026-10-12
**Status:** design aprovado, aguardando plano de implementação
**Nome:** "Vida" é nome de trabalho, trocável a qualquer momento sem impacto técnico.

---

## 1. Problema

Em maio de 2026 foi construída a planilha `plano_vida.xlsx` (+ CSVs `01_orcamento_mensal`,
`02_patrimonio`, `03_metas_financeiras`, `04_proximos_passos`, `05_review_mensal`). A estrutura
estava correta. Cinco meses depois está **inteiramente vazia** — nenhum número, nenhum hábito,
nenhum mês de review preenchido.

Os quatro motivos do abandono, confirmados pelo usuário (todos os quatro, não um):

1. Lançar cada gasto à mão é insuportável.
2. Esqueceu que a planilha existia.
3. Abrir planilha no celular é ruim.
4. Preencher não devolvia nada.

Causa adicional identificada na leitura dos CSVs: a planilha exigia preencher `Tesouro Direto`,
`FIIs`, `Crypto`, `Imóveis`, `Fundos` e metas de 2 a 10 anos. O usuário **não tem nada guardado**
e usa **apenas a conta Nubank**. A planilha pedia os dados de uma vida que não é a dele.

### Restrição de projeto que decorre disso

**Qualquer feature que dependa de digitação manual recorrente vai morrer igual à planilha.**
Isso não é preferência; é resultado observado. Todo campo de entrada precisa justificar sua
existência contra essa evidência.

## 2. Objetivo

Um PWA único (navegador + ícone na tela de início do iPhone) que:

- Registra o dinheiro **sem nenhuma digitação**, via Open Finance.
- Registra hábitos com **atrito mínimo** (1 toque; nenhum teclado livre onde um chip resolve).
- Devolve análise desde o primeiro dia, não apenas depois de meses de alimentação.
- Permite, a partir de ~90 dias de dado, **correlacionar hábito com gasto** — que é o produto
  que o usuário efetivamente quer ("na semana que treinei, gastei menos em delivery").

### Fora de escopo (decisão explícita, não omissão)

Patrimônio, cadastro de ativos, rentabilidade, passivos com juros e metas de longo prazo.
Motivo: não há dado real para preencher. O esquema reserva o lugar; a tela nasce no dia do
primeiro dinheiro guardado.

## 3. Decisões de plataforma

| Decisão | Escolha | Motivo |
|---|---|---|
| App | **PWA** (Next.js), não Expo/React Native | iPhone. Um codebase serve web e mobile; push funciona (iOS 16.4+); dispensa Apple Developer (US$ 99/ano) e re-assinatura de build a cada 7 dias. O que o nativo adicionaria (widget, HealthKit) o app Atalhos cobre a custo zero. |
| Open Finance | **Meu Pluggy** (plano pessoal, `PLUGGY_ITEM_IDS` por item) | Gratuito por tempo indeterminado para pessoa física. Traz saldo, extrato, cartão e investimentos via `client_id`/`client_secret`. Limites: 5 conexões ativas, sync a cada 24h. O usuário precisa de 1 (Nubank: conta + cartão no mesmo vínculo). **Custo: R$ 0/mês.** |
| Stack | Next.js 15 (App Router) + TypeScript + Prisma + Postgres | Mesma stack do AgendaHora. Zero custo de aprendizado num projeto cujo risco principal é abandono. |
| Hospedagem | Vercel + Neon, isolado | Não compartilha VPS Magalu com o AgendaHora (sistema de saúde em produção). Pode ocupar o Vercel+Neon que já existe ocioso. |
| Saúde (sono/passos/peso) | Automação do app **Atalhos** → POST | Lê amostras do app Saúde e envia à API às 23h, sem interação. **A validar no aparelho na Fase 1** — a ação existe, mas não está provada neste iPhone. |

### ⚠️ Listar conexões é recurso de plano pago

`fetchAllItems()` do SDK é **opt-in de plano pago** e devolve
`403 LIST_ITEMS_FEATURE_NOT_ENABLED` no plano pessoal gratuito — verificado no
`.d.ts` do `pluggy-sdk` instalado. O plano gratuito segue válido para ler saldo,
extrato, cartão e investimentos; o que não existe é **enumerar** os itens.

Por isso `listarConexoes()` não lista: ela lê cada `itemId` com `fetchItem(id)`.
Os ids ficam em `PLUGGY_ITEM_IDS` (separados por vírgula, até 5) e são copiados
do painel do Meu Pluggy depois de conectar o banco. Sem a variável, o adapter
estoura na criação — em vez de sincronizar nada em silêncio.

### Consequência comercial a registrar

O plano gratuito do Pluggy é **exclusivo para uso pessoal** (titular das próprias contas).
Transformar isso em produto para terceiros exige plano comercial: Pluggy R$ 2.500/mês,
Belvo ~US$ 1.000/mês, Tecnospeed R$ 1.500 de entrada + R$ 540/mês. Ou seja: ótimo app
pessoal, caminho ruim para infoproduto. Decisão tomada com esse número em mãos.

## 4. Arquitetura

```
src/
├── app/
│   ├── (painel)/dia/            # registro e visão do dia
│   ├── (painel)/dinheiro/       # para onde foi, sobra, orçamento
│   ├── (painel)/habitos/        # série, streak, gestão de definições
│   ├── (painel)/correlacao/     # Fase 4
│   └── api/
│       ├── cron/sync-pluggy/    # 1x/dia, 03:00 BRT
│       ├── ingest/saude/        # POST da Automação do Atalhos
│       └── ingest/habito/       # POST do Atalho de 1 toque
├── features/
│   ├── dinheiro/                # pluggy-client · categorizar · repo
│   ├── habitos/                 # definicoes · registro · repo
│   ├── dia/                     # agregação diária
│   └── correlacao/              # Fase 4
├── lib/
└── styles/                      # tokens.css · typography.css
```

### Fronteira que mais importa

`features/dinheiro/pluggy-client.ts` é **o único arquivo do projeto que conhece o formato da
Pluggy**. Ele devolve tipos do domínio. Se a Pluggy mudar a API, subir preço ou encerrar o plano
gratuito, a troca de provedor altera um arquivo, não o app.

### Fluxos de entrada

| Gatilho | Rota | Idempotência |
|---|---|---|
| Cron 03:00 BRT | `/api/cron/sync-pluggy` | `Transacao.pluggyTxId` único |
| Automação Atalhos 23:00 | `/api/ingest/saude` | upsert por `(habitoId, data)` |
| Atalho de 1 toque | `/api/ingest/habito` | upsert por `(habitoId, data)` |

Idempotência é requisito, não zelo: o Atalhos reenvia quando a rede oscila, e o usuário vai
tocar o atalho duas vezes. Sem isso o dado apodrece em silêncio.

### Autenticação

Usuário único. Painel: senha única + cookie `httpOnly` de 90 dias. A sessão (JWT via `jose`)
e o hash de senha (`scrypt`) ficam em módulos **separados**: o middleware roda no Edge
Runtime, onde `node:crypto` não existe, e juntá-los quebra o build. Endpoints de ingestão:
**bearer token estático** em variável de ambiente, porque o Atalhos não faz login. Token no
header, nunca na query string — URL de Atalho vaza em backup e em captura de tela. Token
rotacionável por env var.

## 5. Modelo de dados

Decisão central: **hábito manual e métrica do app Saúde são o mesmo modelo**, separados por
`fonte`. Sono (Saúde) e "treinei?" (toque) são linhas da mesma tabela, e a correlação varre
uma tabela só em vez de casar duas.

```prisma
// ─── Dinheiro ───
model Conexao {
  pluggyItemId  String    @unique
  instituicao   String                      // "Nubank"
  status        String                      // UPDATED | LOGIN_ERROR | WAITING_USER_INPUT
  ultimoSyncEm  DateTime?
}
model Conta {
  pluggyAccountId String   @unique
  tipo            TipoConta                 // CORRENTE | CREDITO
  saldo           Decimal?                  // null = não sei; nunca 0
  limite          Decimal?
}
model Transacao {
  pluggyTxId    String   @unique
  data          DateTime
  descricao     String
  valor         Decimal
  categoriaOrig String?                     // o que a Pluggy classificou
  categoriaId   String?                     // classificação própria
  ignorada      Boolean  @default(false)    // transferência entre contas próprias
}
model Categoria      { nome String; grupo GrupoCategoria }   // FIXA | VARIAVEL | RECEITA
model RegraCategoria { padrao String; categoriaId String }   // "IFOOD" → Delivery
model Orcamento      { categoriaId String; mes String; valorAlvo Decimal }
model Meta           { nome String; valorAlvo Decimal; ordem Int }   // reserva escalonada

// ─── Hábitos e métricas: um modelo para os dois ───
model HabitoDef {
  slug     String  @unique                  // "treino", "sono", "acordei-6h"
  tipo     TipoHabito                       // BOOL | NUMERO
  unidade  String?                          // "h", "kg", "passos"
  chips    Int[]                            // [5,6,7,8,9] → dispensa teclado
  fonte    FonteHabito                      // MANUAL | SAUDE
  ativo    Boolean @default(true)           // arquiva sem apagar histórico
}
model RegistroHabito {
  habitoId  String
  data      DateTime                        // dia, sem hora, em America/Sao_Paulo
  valorBool Boolean?
  valorNum  Decimal?
  @@unique([habitoId, data])
}
model SyncLog { executadoEm DateTime; status String; erro String? }
```

### Justificativa de campos não óbvios

- `HabitoDef.ativo` em vez de deletar: arquivar preserva a série histórica, então a rotina pode
  mudar sem cegar a correlação.
- `Transacao.ignorada`: pagamento da fatura do cartão aparece como transação na conta **e** o
  gasto aparece no cartão. Sem o campo, o app infla o gasto e mente.
- `Conta.saldo` nullable: ausência de dado é diferente de saldo zero.

### Seed inicial de hábitos (editável no app)

| slug | tipo | unidade | chips | fonte |
|---|---|---|---|---|
| `acordei-6h` | BOOL | — | — | MANUAL |
| `treino` | BOOL | — | — | MANUAL |
| `estudo-ingles` | BOOL | — | — | MANUAL |
| `sono` | NUMERO | h | 5,6,7,8,9 | SAUDE |
| `passos` | NUMERO | passos | — | SAUDE |
| `peso` | NUMERO | kg | — | MANUAL |

## 6. Telas

### Tela principal — hierarquia, não paridade

Os quatro números pedidos entram todos, em **uma** tela, com hierarquia por contraste de escala:

- **Herói:** `quanto posso gastar hoje` — sobra do mês ÷ dias restantes. Único número que muda
  comportamento no momento da compra.
- **Secundários**, em escala pequena numa linha abaixo: `sobra do mês`, `top 3 categorias`,
  `barra da reserva`. Toque em qualquer um abre a tela cheia do assunto.
- **Idade do último sync** estampada de forma permanente.

A reserva de emergência é **escalonada** (R$ 500 → R$ 1.500 → 1 mês de despesa), não "6× despesas".
Uma barra parada em 0% por um ano desmotiva; escalonada, ela anda na primeira semana.

### Direção visual (Fase 3): suíço editorial, número gigante

Grid rígido, tipografia como estrutura, fundo claro e **um** acento. O número herói em escala
muito grande (`clamp()` até ~8rem); secundários deliberadamente minúsculos ao lado. Cor apenas
com significado semântico (acima/abaixo do orçamento, sync velho), nunca decorativa. Legível
de relance na fila do mercado. Tokens em `styles/tokens.css`; animação só em `transform`,
`opacity`, `clip-path`.

## 7. Falhas

O princípio: **o app nunca mostra um número com aparência de fresco quando não é.**

| Falha | Comportamento |
|---|---|
| Item em `LOGIN_ERROR` / `WAITING_USER_INPUT` | Faixa persistente + push. Números passam a exibir "dado de N dias atrás" |
| Cron falha | Grava em `SyncLog`; retenta no ciclo seguinte; idade > 48h dispara push |
| POST do Atalhos cai sem rede | Entrega **não** é garantida (o Atalhos não tem retry confiável). A tela do dia mostra as lacunas e permite preencher dia anterior em 1 toque |
| Token de ingestão inválido | `401` explícito; token rotacionável por env var |
| `saldo` ou receita `null` | Herói mostra `—` e o motivo. `null` nunca é tratado como `0` |

### Por que o alerta de 48h é proteção de dado, não conforto

O primeiro sync do Pluggy traz **365 dias** de histórico. Mas o sync incremental só olha uma
janela de **4 a 7 dias** para trás. Logo, **cron parado por mais de 7 dias produz um buraco
permanente** no extrato. O push de 48h existe para que a janela nunca estoure.

### Regras transversais

- Dinheiro em `Decimal`, nunca `float`.
- Timezone `America/Sao_Paulo` em tudo; "dia" é dia local. A correlação sono × gasto quebra
  inteira se o dia virar em UTC.
- Nenhum `where` do Prisma recebe valor possivelmente `undefined` (um `where` com `undefined`
  já se provou equivalente a `deleteMany({})` neste histórico).

## 8. Testes

TDD nas funções puras, onde mora o risco de o app mentir: `categorizar`,
`detectarTransferenciaInterna`, `calcularPodeGastarHoje`, `agregarDia`, `correlacionar`.

Integração nos três endpoints, provando: idempotência (mesmo POST duas vezes = uma linha) e
rejeição de token inválido.

Teste de regressão provando que nenhum `where` do Prisma recebe `undefined`.

**Ajuste deliberado à regra de 80%:** a meta de 80% é medida em `src/features/` (camada de
lógica). A UI crua da Fase 1 fica fora do denominador, porque existe para ser descartada.
Visual regression (320/768/1440, claro e escuro) entra na Fase 3, quando a UI for definitiva.

## 9. Ordem de entrega

A assimetria que determina a ordem: **dinheiro tem passado, hábito não.** O Pluggy devolve 12
meses no primeiro sync; hábito só existe a partir do primeiro toque, e setembro é irrecuperável.
Como a correlação exige ~90 dias, o relógio precisa começar o quanto antes.

**Fase 1 — Ligar as torneiras.** Auth, `pluggy-client`, cron de sync, os dois endpoints de
ingestão, Atalhos configurados no iPhone (incluindo validar a leitura do app Saúde), e uma tela
única e crua listando últimas transações e hábitos do dia. Resultado: 12 meses de dinheiro no
banco, hábito contando a partir de hoje, alerta de sync ativo.

**A Fase 1 é feia por decisão.** UI atrasada se recupera sempre; dado não registrado é perdido
para sempre. Cada semana gasta embelezando a Fase 1 é uma semana de hábito que nunca existirá.

**Fase 2 — Painel de dinheiro.** Categorias, `RegraCategoria`, marcar transferência interna como
ignorada, "para onde foi o dinheiro", "sobra do mês", orçamento por categoria.

**Fase 3 — Tela principal e hábitos completos.** Número herói e secundários, direção visual
suíça editorial, chips numéricos, streak, push de lembrete, meta escalonada.

**Fase 4 — Correlação.** Somente com ~90 dias de hábito registrado. Antes disso seria desenhar
um gráfico de nada.

## 10. Riscos

| Risco | Gravidade | Mitigação |
|---|---|---|
| Conexão Nubank cai (re-auth do Open Finance) | Alta — e **vai** acontecer | Status do item na tela principal + push em 48h; janela de 7 dias do Pluggy nunca estoura |
| Automação do Atalhos não lê o app Saúde neste iPhone | Média — não validado | Validar na Fase 1. Se falhar: `sono` e `peso` viram MANUAL com chips; `passos` sai do seed |
| Pluggy encerra o plano pessoal gratuito | Baixa, impacto alto | `pluggy-client.ts` isola o formato; troca de provedor altera um arquivo |
| Correlação não revela nada aos 90 dias | Média | Resultado legítimo. As Fases 1–3 entregam valor sozinhas; a Fase 4 não é pré-requisito de nada |
| Abandono (o risco histórico) | Alta | Zero digitação no dinheiro; 1 toque no hábito; análise desde o dia 1; push quando o dado para de entrar |
