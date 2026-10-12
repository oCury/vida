# Atalhos do iPhone

Como o hábito entra no app sem digitação. Dinheiro vem do Pluggy sozinho; hábito só existe
a partir do primeiro toque, e **não há como recuperar o passado** — por isso vale configurar cedo.

Os valores de `<SEU-DOMINIO>` e `<INGEST_TOKEN>` saem do seu `.env` / das variáveis da Vercel.
**O token não entra neste arquivo** — ele vai para um repositório público.

## 1. Atalho de 1 toque (hábitos sim/não)

App Atalhos → novo atalho → ação **Obter conteúdo de URL**:

| Campo | Valor |
|---|---|
| URL | `https://<SEU-DOMINIO>/api/ingest/habito` |
| Método | `POST` |
| Cabeçalho | `Authorization` = `Bearer <INGEST_TOKEN>` |
| Cabeçalho | `Content-Type` = `application/json` |
| Corpo | JSON → campo `slug` (Texto) = `treino` |

Salve como **"Treinei"**. Repita trocando o `slug` por `acordei-6h` e `estudo-ingles`.

Onde deixar acionável: **Ajustes → Botão de Ação → Atalho**, ou a Central de Controle, ou um
widget na tela de início.

### Provar que funciona e que é idempotente

Toque **duas vezes** no atalho, abra `/dia` e confira: deve mostrar `Treinei: sim` e existir
**uma única** linha em `RegistroHabito` para hoje (`npx prisma studio`). Duas linhas significam
que a constraint única falhou — isso é bug, reporte.

## 2. Automação de saúde (sono, passos, peso)

App Atalhos → aba **Automação** → **Hora do dia** → `23:00` → **Executar imediatamente**.

Ações, nesta ordem:

1. **Obter amostras de saúde** — Tipo `Análise do sono`, Período `Hoje`, Operação `Soma`
2. **Obter amostras de saúde** — Tipo `Passos`, Período `Hoje`, Operação `Soma`
3. **Obter amostras de saúde** — Tipo `Massa corporal`, Período `Hoje`, Operação `Mais recente`
4. **Obter conteúdo de URL** → `POST` em `https://<SEU-DOMINIO>/api/ingest/saude`, mesmos
   cabeçalhos, corpo JSON com `sono`, `passos` e `peso` apontando para as variáveis acima

A rota aceita as três métricas numa chamada e ignora em silêncio a que não vier — o app Saúde
pode simplesmente não ter o dado naquele dia.

## 3. ⚠️ Validação pendente — o risco aberto do projeto

**Não está provado** que a Automação do Atalhos consegue ler o app Saúde neste aparelho. A ação
existe na documentação da Apple, mas não foi testada aqui. Execute a automação manualmente uma
vez e registre o resultado abaixo.

**Se as ações de saúde não existirem ou devolverem vazio**, o fallback já está decidido: `sono` e
`peso` passam a `MANUAL` com chips e `passos` sai do seed.

```bash
npx prisma studio
# HabitoDef → sono.fonte = MANUAL · peso.fonte = MANUAL · passos.ativo = false
```

### Resultado da validação

> **Status:** não executado ainda.
>
> Preencher com: funcionou ou não, em que versão do iOS, e qual fallback foi aplicado.
> Um risco validado vale mais que um risco esquecido — mesmo que a resposta seja "não funciona".
