# Vida

PWA pessoal que rastreia **dinheiro** e **hábitos** no mesmo lugar, e correlaciona os dois.

Um codebase serve o navegador e o iPhone (ícone na tela de início, push, offline). Sem app
nativo, sem App Store, sem taxa anual.

## A ideia em uma frase

Dinheiro entra **sozinho** via Open Finance; hábito entra em **um toque**; e depois de ~90 dias
o app responde se a semana em que você treinou foi a semana em que gastou menos.

## Como o dado entra

| Fonte | Mecanismo | Esforço humano |
|---|---|---|
| Extrato, cartão, saldo | Cron diário → API do [Pluggy](https://meu.pluggy.ai) | zero |
| Sono, passos, peso | Automação do app Atalhos lê o app Saúde e faz `POST` | zero |
| Hábitos sim/não | Atalho de 1 toque (Botão de Ação / Central de Controle) | um toque |

Nenhum campo numérico usa teclado livre onde um chip ou stepper resolve. Isso não é preferência
de UI — é a lição de uma planilha que ficou cinco meses vazia.

## Stack

Next.js 15 (App Router) · TypeScript · Prisma · Postgres · Web Push (VAPID)

## Rodando

```bash
cp .env.example .env     # preencha as credenciais
npm install
npx prisma migrate dev
npm run dev
```

As credenciais do Pluggy saem do plano **pessoal gratuito** (Meu Pluggy): até 5 conexões do
próprio titular, sincronização a cada 24 h, sem prazo de expiração.

## Decisões de projeto

O design completo, incluindo modelo de dados, tratamento de falhas e as razões de cada escolha,
está em [`docs/design.md`](docs/design.md).

Três que vale adiantar:

- **`pluggy-client.ts` é o único arquivo que conhece o formato da Pluggy.** Trocar de provedor
  altera um arquivo, não o app.
- **Hábito manual e métrica do app Saúde são o mesmo modelo**, separados por um campo `fonte`.
  A correlação varre uma tabela, não duas.
- **O app nunca mostra um número com aparência de fresco quando não é.** O primeiro sync traz
  365 dias de histórico, mas o incremental só olha 4–7 dias para trás: cron parado por mais de
  uma semana abre um buraco permanente. Por isso a idade do último sync fica estampada na tela
  e um push avisa em 48 h.

## Licença

MIT
