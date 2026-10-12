# O que falta para o app rodar

Todo o código da Fase 1 está escrito e o build de produção compila. O que resta exige
credenciais e um iPhone — nada disso um agente faz sozinho.

## 1. Banco (destrava quase tudo)

Crie um projeto no [Neon](https://neon.tech) (free tier) e cole a connection string no `.env`:

```
DATABASE_URL="postgresql://..."
```

Hoje o `.env` tem um placeholder marcado com `TROCAR`. Com a string real:

```bash
export PATH=/opt/homebrew/bin:$PATH
npx prisma migrate dev --name inicial
npx prisma db seed            # 6 hábitos
```

## 2. Senha do painel

```bash
openssl rand -base64 32                       # → AUTH_SECRET
npx tsx -e "import{hash}from'./src/lib/senha';hash(process.argv[2]).then(console.log)" -- "SUA_SENHA"
```

A primeira saída vai em `AUTH_SECRET`, a segunda em `APP_PASSWORD_HASH`. **A senha em texto nunca
é gravada em lugar nenhum.**

## 3. Tokens

```bash
openssl rand -hex 32    # → INGEST_TOKEN (o app Atalhos usa)
openssl rand -hex 32    # → CRON_SECRET  (a Vercel envia automaticamente)
```

## 4. Pluggy

1. Acesse [meu.pluggy.ai](https://meu.pluggy.ai) e conecte o **Nubank** (conta e cartão vêm no
   mesmo vínculo).
2. Copie `client_id` e `client_secret` do Dashboard → `PLUGGY_CLIENT_ID` / `PLUGGY_CLIENT_SECRET`.
3. **Copie o `itemId` da conexão → `PLUGGY_ITEM_IDS`.** Isso é obrigatório: listar itens pela API
   é recurso de plano pago (`403 LIST_ITEMS_FEATURE_NOT_ENABLED`), então o app lê cada item pelo id.

## 5. Primeiro sync

```bash
npm run dev
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-pluggy
```

Esperado: `{"ok":true,"novas":N,"conexoes":1}` com `N` na casa das centenas — o primeiro sync
traz **365 dias** de histórico de uma vez.

Abra `http://localhost:3000/dia` e confira `sincronizado há 0h` mais as transações.

## 6. Deploy e iPhone

`npx vercel link`, suba as variáveis acima com `npx vercel env add <NOME> production`, depois
`npx vercel --prod`. No iPhone: Safari → Compartilhar → **Adicionar à Tela de Início**.

Por último, [`atalhos.md`](atalhos.md) — e registre lá o resultado da validação do app Saúde,
que é o único risco do projeto ainda não verificado.

## Verificar a Fase 2 (depois do banco)

Com `DATABASE_URL` e o primeiro sync feitos:

```bash
npx prisma db seed     # 12 categorias + 6 hábitos
```

Abra `/dinheiro` e confira:

- **Pagamento de fatura aparece esmaecido** (`ignorada`). Se não aparecer, a descrição que o
  Nubank usa é diferente da esperada — ajuste `PADROES_PAGA_FATURA` em
  `src/features/dinheiro/transferencia.ts` e me diga qual é o texto real.
- **Recategorizar um lançamento cria uma regra.** Confira em `npx prisma studio` →
  `RegraCategoria`: deve haver uma linha com as duas primeiras palavras da descrição.
- **Se a sobra mostrar `—`**, nenhuma receita foi detectada no mês. Isso é o comportamento
  correto, não bug: o app não inventa número.

## Ativar os lembretes (Fase 3)

```bash
npx web-push generate-vapid-keys
```

Cole no `.env` como `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`, e preencha
`VAPID_SUBJECT=mailto:seu@email`. Suba as três na Vercel também.

**No iPhone, push só funciona depois de instalar o PWA** pela Tela de Início (iOS 16.4+).
No Safari o botão "ativar lembretes" vai dizer isso em vez de falhar calado. Depois de
instalar, abra o app, toque em **ativar lembretes** e aceite a permissão.

Dois lembretes passam a existir: hábito pendente às 21h, e sincronização parada há mais de 48h —
esse segundo era uma dívida da Fase 1, prometida no design e nunca implementada.

## Marcar a conta de reserva

A barra da reserva precisa de uma conta marcada. Crie uma Caixinha ou RDB no Nubank; depois do
próximo sync ela aparece como conta, e então:

```bash
npx prisma studio   # Conta → marque ehReserva = true na conta da reserva
```

Enquanto nenhuma estiver marcada, a barra diz isso em vez de mostrar 0% de um alvo inventado.

## Ambiente desta máquina

- `/usr/bin/git` e `/usr/bin/python3` estão travados na licença do Xcode. Use
  `export PATH=/opt/homebrew/bin:$PATH` em todo comando, ou rode `sudo xcodebuild -license`.
- `git push` está no deny do settings do Claude Code: publique você mesmo.
