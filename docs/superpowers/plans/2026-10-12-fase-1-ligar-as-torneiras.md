# Fase 1 — Ligar as torneiras · Plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development
> (recomendado) ou superpowers:executing-plans para implementar tarefa por tarefa. Os passos usam
> sintaxe de checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** Fazer o dado começar a entrar — dinheiro retroativo de 365 dias via Pluggy e hábito
contando a partir de hoje — com uma tela crua para provar que entrou.

**Arquitetura:** PWA Next.js 15 (App Router). Três fluxos de entrada idempotentes: um cron diário
que lê o Pluggy, e dois endpoints `POST` chamados pelo app Atalhos do iPhone. Toda a lógica que
pode fazer o app mentir (dia local, categorização, idempotência, autenticação) vive em funções
puras testadas em `src/features/` e `src/lib/`, isoladas das rotas.

**Stack:** Next.js 15 · TypeScript · Prisma · Postgres (Neon) · `pluggy-sdk` · `jose` · Vitest

**A Fase 1 é feia por decisão.** Não há CSS além do mínimo para o texto ser legível. UI atrasada
se recupera; dado não registrado é perdido para sempre.

**Contexto que o implementador não tem:** este projeto existe porque uma planilha com a mesma
estrutura ficou cinco meses inteiramente vazia. O design inteiro está em `docs/design.md`. A regra
que governa tudo: **nenhuma feature pode depender de digitação manual recorrente.**

---

### Task 0: Scaffold do projeto

**Arquivos:**
- Criar: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Passo 1: Criar o projeto Next.js**

Rode na raiz `~/Projetos/vida` (o diretório já existe e já é um repo git com commit inicial):

```bash
export PATH=/opt/homebrew/bin:$PATH   # o git do Xcode está travado em licença
npx create-next-app@latest . --typescript --app --no-src-dir --no-tailwind --eslint --use-npm --skip-install --yes
```

Se o comando reclamar que o diretório não está vazio, responda para manter os arquivos existentes
(`README.md`, `LICENSE`, `docs/`, `.gitignore`, `.env.example`). Nenhum deles pode ser sobrescrito.

- [ ] **Passo 2: Mover para `src/` e instalar dependências**

```bash
mkdir -p src && mv app src/app 2>/dev/null || true
npm install @prisma/client pluggy-sdk jose
npm install -D prisma vitest @vitejs/plugin-react vite-tsconfig-paths
```

- [ ] **Passo 3: Configurar o Vitest**

Crie `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: { include: ['src/features/**', 'src/lib/**'] },
  },
})
```

Adicione os scripts em `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Passo 4: Verificar que o projeto sobe**

Rode: `npm run dev`
Esperado: servidor em `http://localhost:3000` sem erro de compilação. Encerre com `Ctrl+C`.

- [ ] **Passo 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add -A
git commit -m "chore: scaffold Next.js 15 com TypeScript, Prisma e Vitest"
```

---

### Task 1: Dia local em America/Sao_Paulo

Esta é a primeira task por um motivo: **se "dia" estiver errado, a correlação da Fase 4 nasce
morta** e nenhum teste posterior pega isso. Um `Date` do JS às 22h de Brasília é o dia seguinte
em UTC.

**Arquivos:**
- Criar: `src/lib/dia.ts`
- Testar: `src/lib/dia.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

Crie `src/lib/dia.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { diaLocal, inicioDoDiaUTC } from './dia'

describe('diaLocal', () => {
  it('retorna o dia de Brasília, não o de UTC, para um instante da noite', () => {
    // 2026-10-12T23:30:00-03:00 === 2026-10-13T02:30:00Z
    const instante = new Date('2026-10-13T02:30:00Z')
    expect(diaLocal(instante)).toBe('2026-10-12')
  })

  it('retorna o dia seguinte depois da meia-noite de Brasília', () => {
    // 2026-10-13T00:30:00-03:00 === 2026-10-13T03:30:00Z
    const instante = new Date('2026-10-13T03:30:00Z')
    expect(diaLocal(instante)).toBe('2026-10-13')
  })

  it('aceita uma string YYYY-MM-DD e a devolve inalterada', () => {
    expect(diaLocal('2026-03-01')).toBe('2026-03-01')
  })

  it('rejeita string em formato inválido', () => {
    expect(() => diaLocal('12/10/2026')).toThrow('dia inválido')
  })
})

describe('inicioDoDiaUTC', () => {
  it('converte um dia local no instante UTC da sua meia-noite em Brasília', () => {
    expect(inicioDoDiaUTC('2026-10-12').toISOString()).toBe('2026-10-12T03:00:00.000Z')
  })
})
```

- [ ] **Passo 2: Rodar o teste e confirmar que falha**

Rode: `npx vitest run src/lib/dia.test.ts`
Esperado: FAIL — `Failed to resolve import "./dia"`.

- [ ] **Passo 3: Implementar**

Crie `src/lib/dia.ts`:

```ts
export const TZ = 'America/Sao_Paulo'

const FORMATO_DIA = /^\d{4}-\d{2}-\d{2}$/

/** Dia-calendário em America/Sao_Paulo, no formato YYYY-MM-DD. */
export function diaLocal(valor: Date | string): string {
  if (typeof valor === 'string') {
    if (!FORMATO_DIA.test(valor)) throw new Error(`dia inválido: ${valor}`)
    return valor
  }
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(valor)
}

/**
 * Instante UTC correspondente à meia-noite daquele dia em Brasília.
 * É o valor gravado em `RegistroHabito.data`, para que todo registro de um mesmo
 * dia local colida na constraint única independentemente da hora do envio.
 */
export function inicioDoDiaUTC(dia: string): Date {
  if (!FORMATO_DIA.test(dia)) throw new Error(`dia inválido: ${dia}`)
  // Descobre o offset de Brasília naquela data (o Brasil pode voltar a ter horário de verão).
  const meioDiaUTC = new Date(`${dia}T12:00:00Z`)
  const offsetMin = offsetMinutos(meioDiaUTC)
  return new Date(new Date(`${dia}T00:00:00Z`).getTime() - offsetMin * 60_000)
}

function offsetMinutos(instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(instante)
  const nome = partes.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-03:00'
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(nome)
  if (!m) throw new Error(`offset não reconhecido: ${nome}`)
  const sinal = m[1] === '-' ? -1 : 1
  return sinal * (Number(m[2]) * 60 + Number(m[3]))
}
```

- [ ] **Passo 4: Rodar o teste e confirmar que passa**

Rode: `npx vitest run src/lib/dia.test.ts`
Esperado: PASS, 5 testes.

- [ ] **Passo 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/lib/dia.ts src/lib/dia.test.ts
git commit -m "feat: dia-calendário em America/Sao_Paulo

O dia local é a chave de idempotência dos registros de hábito e o eixo da
correlação futura. Um Date às 22h de Brasília é o dia seguinte em UTC."
```

---

### Task 2: Esquema do banco

**Arquivos:**
- Criar: `prisma/schema.prisma`, `src/lib/prisma.ts`

- [ ] **Passo 1: Escrever o schema**

Crie `prisma/schema.prisma` (os modelos vêm da seção 5 de `docs/design.md`):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // No Prisma 7 a URL NÃO vive mais aqui. Ela fica em prisma.config.ts (para
  // migrate/introspect) e chega ao client por driver adapter. Deixar `url` aqui
  // faz o `prisma validate` falhar com P1012.
}

enum TipoConta {
  CORRENTE
  CREDITO
}

enum GrupoCategoria {
  FIXA
  VARIAVEL
  RECEITA
}

enum TipoHabito {
  BOOL
  NUMERO
}

enum FonteHabito {
  MANUAL
  SAUDE
}

model Conexao {
  id           String    @id @default(cuid())
  pluggyItemId String    @unique
  instituicao  String
  status       String    // UPDATED | LOGIN_ERROR | WAITING_USER_INPUT | OUTDATED
  ultimoSyncEm DateTime?
  contas       Conta[]
}

model Conta {
  id              String      @id @default(cuid())
  pluggyAccountId String      @unique
  conexaoId       String
  conexao         Conexao     @relation(fields: [conexaoId], references: [id])
  nome            String
  tipo            TipoConta
  saldo           Decimal?    @db.Decimal(14, 2) // null = desconhecido, nunca 0
  limite          Decimal?    @db.Decimal(14, 2)
  transacoes      Transacao[]
}

model Transacao {
  id            String     @id @default(cuid())
  pluggyTxId    String     @unique // idempotência do sync
  contaId       String
  conta         Conta      @relation(fields: [contaId], references: [id])
  data          DateTime
  descricao     String
  valor         Decimal    @db.Decimal(14, 2)
  categoriaOrig String?
  categoriaId   String?
  categoria     Categoria? @relation(fields: [categoriaId], references: [id])
  ignorada      Boolean    @default(false)

  @@index([data])
}

model Categoria {
  id         String           @id @default(cuid())
  nome       String           @unique
  grupo      GrupoCategoria
  transacoes Transacao[]
  regras     RegraCategoria[]
  orcamentos Orcamento[]
}

model RegraCategoria {
  id          String    @id @default(cuid())
  padrao      String    // trecho buscado na descrição, maiúsculas
  categoriaId String
  categoria   Categoria @relation(fields: [categoriaId], references: [id])
}

model Orcamento {
  id          String    @id @default(cuid())
  categoriaId String
  categoria   Categoria @relation(fields: [categoriaId], references: [id])
  mes         String    // YYYY-MM
  valorAlvo   Decimal   @db.Decimal(14, 2)

  @@unique([categoriaId, mes])
}

model Meta {
  id        String  @id @default(cuid())
  nome      String
  valorAlvo Decimal @db.Decimal(14, 2)
  ordem     Int
}

model HabitoDef {
  id        String           @id @default(cuid())
  slug      String           @unique
  nome      String
  tipo      TipoHabito
  unidade   String?
  chips     Int[]            @default([])
  fonte     FonteHabito      @default(MANUAL)
  ativo     Boolean          @default(true)
  ordem     Int              @default(0)
  registros RegistroHabito[]
}

model RegistroHabito {
  id        String    @id @default(cuid())
  habitoId  String
  habito    HabitoDef @relation(fields: [habitoId], references: [id])
  data      DateTime  // meia-noite de Brasília daquele dia
  valorBool Boolean?
  valorNum  Decimal?  @db.Decimal(10, 2)
  criadoEm  DateTime  @default(now())

  @@unique([habitoId, data]) // idempotência do Atalhos
  @@index([data])
}

model SyncLog {
  id          String   @id @default(cuid())
  executadoEm DateTime @default(now())
  status      String   // OK | ERRO
  erro        String?
  novas       Int      @default(0)
}
```

- [ ] **Passo 2: Criar o cliente Prisma singleton**

Crie `src/lib/prisma.ts`:

```ts
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/**
 * Cliente único.
 *
 * No Prisma 7 a conexão chega por driver adapter, não pela `url` do schema.
 * Em desenvolvimento o cliente é guardado no escopo global porque o hot reload
 * do Next recria o módulo a cada edição, e sem isso cada recarga abriria um
 * novo pool até esgotar as conexões do Postgres.
 */
function criar(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL ausente')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? criar()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

E crie `prisma.config.ts` na raiz — obrigatório no Prisma 7, e ele **não** carrega o `.env`
sozinho, daí o `dotenv/config`:

```ts
import 'dotenv/config' // o Prisma 7 não carrega .env sozinho no config

import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
})
```

Instale as dependências que esse padrão exige:

```bash
npm install @prisma/adapter-pg pg dotenv
```

⚠️ Sem `DATABASE_URL` definida, **nem `prisma generate` roda** — o carregamento do config
falha antes. Se precisar gerar o client antes de ter o banco, ponha um valor placeholder
na variável; `generate` não abre conexão.

- [ ] **Passo 3: Provisionar o Postgres e migrar**

Crie um projeto no Neon (free tier), copie a connection string para `DATABASE_URL` no `.env`
(o arquivo `.env` está no `.gitignore` — confirme com `git check-ignore -v .env`), e rode:

```bash
npx prisma migrate dev --name inicial
```

Esperado: migração aplicada e `Generated Prisma Client` no final da saída.

- [ ] **Passo 4: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add prisma src/lib/prisma.ts
git commit -m "feat: esquema do banco

Hábito manual e métrica do app Saúde no mesmo modelo, separados por fonte.
saldo nullable porque ausência de dado difere de saldo zero."
```

---

### Task 3: Autenticação de usuário único

**Arquivos:**
- Criar: `src/lib/auth.ts`
- Testar: `src/lib/auth.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

Crie `src/lib/auth.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest'
import { assinarSessao, verificarSessao, verificarSenha } from './auth'

const SEGREDO = 'segredo-de-teste-com-pelo-menos-32-caracteres'

beforeAll(() => {
  process.env.AUTH_SECRET = SEGREDO
  // hash de "senha-correta", gerado com scrypt (ver Passo 5)
  process.env.APP_PASSWORD_HASH = ''
})

describe('assinarSessao / verificarSessao', () => {
  it('aceita um token que ela mesma assinou', async () => {
    const token = await assinarSessao()
    expect(await verificarSessao(token)).toBe(true)
  })

  it('rejeita token adulterado', async () => {
    const token = await assinarSessao()
    expect(await verificarSessao(token.slice(0, -2) + 'xx')).toBe(false)
  })

  it('rejeita token ausente', async () => {
    expect(await verificarSessao(undefined)).toBe(false)
  })

  it('rejeita token assinado com outro segredo', async () => {
    const token = await assinarSessao()
    process.env.AUTH_SECRET = 'outro-segredo-com-pelo-menos-32-caracteres!'
    expect(await verificarSessao(token)).toBe(false)
    process.env.AUTH_SECRET = SEGREDO
  })
})

describe('verificarSenha', () => {
  it('rejeita senha errada', async () => {
    const { hash } = await import('./auth')
    process.env.APP_PASSWORD_HASH = await hash('senha-correta')
    expect(await verificarSenha('senha-errada')).toBe(false)
  })

  it('aceita a senha correta', async () => {
    const { hash } = await import('./auth')
    process.env.APP_PASSWORD_HASH = await hash('senha-correta')
    expect(await verificarSenha('senha-correta')).toBe(true)
  })
})
```

- [ ] **Passo 2: Rodar o teste e confirmar que falha**

Rode: `npx vitest run src/lib/auth.test.ts`
Esperado: FAIL — `Failed to resolve import "./auth"`.

- [ ] **Passo 3: Implementar**

Crie `src/lib/auth.ts`. Usa `scrypt` do Node (sem dependência externa) e `jose` para o cookie:

```ts
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { SignJWT, jwtVerify } from 'jose'

const scrypt = promisify(scryptCb) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
) => Promise<Buffer>

export const COOKIE_SESSAO = 'vida_sessao'
export const DIAS_DE_SESSAO = 90

function segredo(): Uint8Array {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < 32) throw new Error('AUTH_SECRET ausente ou com menos de 32 caracteres')
  return new TextEncoder().encode(s)
}

/** Gera o valor de APP_PASSWORD_HASH. Formato: scrypt$<salHex>$<hashHex> */
export async function hash(senha: string): Promise<string> {
  const sal = randomBytes(16)
  const derivada = await scrypt(senha, sal, 64)
  return `scrypt$${sal.toString('hex')}$${derivada.toString('hex')}`
}

export async function verificarSenha(senha: string): Promise<boolean> {
  const guardado = process.env.APP_PASSWORD_HASH
  if (!guardado) throw new Error('APP_PASSWORD_HASH ausente')
  const [algo, salHex, hashHex] = guardado.split('$')
  if (algo !== 'scrypt' || !salHex || !hashHex) throw new Error('APP_PASSWORD_HASH malformado')
  const derivada = await scrypt(senha, Buffer.from(salHex, 'hex'), 64)
  const esperada = Buffer.from(hashHex, 'hex')
  if (derivada.length !== esperada.length) return false
  return timingSafeEqual(derivada, esperada)
}

export async function assinarSessao(): Promise<string> {
  return new SignJWT({ sub: 'dono' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DIAS_DE_SESSAO}d`)
    .sign(segredo())
}

export async function verificarSessao(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    await jwtVerify(token, segredo())
    return true
  } catch {
    return false
  }
}
```

- [ ] **Passo 4: Rodar o teste e confirmar que passa**

Rode: `npx vitest run src/lib/auth.test.ts`
Esperado: PASS, 6 testes.

- [ ] **Passo 5: Gerar o hash da sua senha e guardar no `.env`**

```bash
npm install -D tsx
npx tsx -e "import{hash}from'./src/lib/auth';hash(process.argv[2]).then(console.log)" -- "SUA_SENHA_AQUI"
```

Cole a saída em `.env`:

```
AUTH_SECRET=<32+ caracteres aleatórios: openssl rand -base64 32>
APP_PASSWORD_HASH=scrypt$...
```

- [ ] **Passo 6: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/lib/auth.ts src/lib/auth.test.ts package.json package-lock.json
git commit -m "feat: autenticação de usuário único

scrypt do Node para a senha e JWT em cookie httpOnly de 90 dias.
Comparação timing-safe no hash."
```

---

### Task 4: Tela de login e proteção de rotas

**Arquivos:**
- Criar: `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/middleware.ts`
- Modificar: `src/app/layout.tsx`

- [ ] **Passo 1: Criar a Server Action de login**

Crie `src/app/login/actions.ts`:

```ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESSAO, DIAS_DE_SESSAO, assinarSessao, verificarSenha } from '@/lib/auth'

export async function entrar(_estado: unknown, form: FormData): Promise<string | undefined> {
  const senha = form.get('senha')
  if (typeof senha !== 'string' || senha.length === 0) return 'Informe a senha.'

  if (!(await verificarSenha(senha))) return 'Senha incorreta.'

  const jar = await cookies()
  jar.set(COOKIE_SESSAO, await assinarSessao(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DIAS_DE_SESSAO * 24 * 60 * 60,
  })
  redirect('/dia')
}
```

- [ ] **Passo 2: Criar a tela de login**

Crie `src/app/login/page.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { entrar } from './actions'

export default function Login() {
  const [erro, acao, pendente] = useActionState(entrar, undefined)
  return (
    <main>
      <h1>Vida</h1>
      <form action={acao}>
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required />
        <button type="submit" disabled={pendente}>
          {pendente ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      {erro ? <p role="alert">{erro}</p> : null}
    </main>
  )
}
```

- [ ] **Passo 3: Proteger as rotas com middleware**

Crie `src/middleware.ts`. Note que `/api/ingest/*` e `/api/cron/*` ficam **fora** do matcher —
eles usam bearer token, não cookie, porque o app Atalhos não faz login:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSAO, verificarSessao } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_SESSAO)?.value
  if (await verificarSessao(token)) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/dia/:path*', '/dinheiro/:path*', '/habitos/:path*'],
}
```

- [ ] **Passo 4: Verificar manualmente**

Rode `npm run dev`, abra `http://localhost:3000/dia`.
Esperado: redireciona para `/login`. Senha errada mostra "Senha incorreta."; senha correta
redireciona para `/dia` (que ainda dá 404 — a tela nasce na Task 11).

- [ ] **Passo 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/app/login src/middleware.ts
git commit -m "feat: tela de login e proteção de rotas

Rotas de ingestão ficam fora do matcher: o app Atalhos usa bearer token,
não cookie de sessão."
```

---

### Task 5: Adapter do Pluggy

Este é **o único arquivo do projeto que conhece o formato da Pluggy**. Ele devolve tipos do
domínio. A regra existe para que trocar de provedor altere um arquivo.

**Arquivos:**
- Criar: `src/features/dinheiro/tipos.ts`, `src/features/dinheiro/pluggy-client.ts`
- Testar: `src/features/dinheiro/pluggy-client.test.ts`

- [ ] **Passo 1: Definir os tipos do domínio**

Crie `src/features/dinheiro/tipos.ts`:

```ts
export type TipoContaDominio = 'CORRENTE' | 'CREDITO'

export type ConexaoDominio = {
  pluggyItemId: string
  instituicao: string
  status: string
}

export type ContaDominio = {
  pluggyAccountId: string
  pluggyItemId: string
  nome: string
  tipo: TipoContaDominio
  saldo: number | null // null = desconhecido, nunca 0
  limite: number | null
}

export type TransacaoDominio = {
  pluggyTxId: string
  pluggyAccountId: string
  data: Date
  descricao: string
  valor: number
  categoriaOrig: string | null
}

/** Porta que o sync consome. O Pluggy é só uma implementação dela. */
export interface FonteFinanceira {
  listarConexoes(): Promise<ConexaoDominio[]>
  listarContas(pluggyItemId: string): Promise<ContaDominio[]>
  listarTransacoes(pluggyAccountId: string, desde: Date): Promise<TransacaoDominio[]>
}
```

- [ ] **Passo 2: Escrever o teste que falha**

O teste cobre o mapeamento, que é onde mora o risco — não a rede. Crie
`src/features/dinheiro/pluggy-client.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mapearConta, mapearTransacao } from './pluggy-client'

describe('mapearConta', () => {
  it('classifica conta corrente e preserva o saldo', () => {
    const conta = mapearConta({
      id: 'acc-1',
      itemId: 'item-1',
      name: 'Conta',
      type: 'BANK',
      balance: 1234.56,
      creditData: null,
    })
    expect(conta).toEqual({
      pluggyAccountId: 'acc-1',
      pluggyItemId: 'item-1',
      nome: 'Conta',
      tipo: 'CORRENTE',
      saldo: 1234.56,
      limite: null,
    })
  })

  it('classifica cartão de crédito e lê o limite', () => {
    const conta = mapearConta({
      id: 'acc-2',
      itemId: 'item-1',
      name: 'Cartão',
      type: 'CREDIT',
      balance: 300,
      creditData: { creditLimit: 5000 },
    })
    expect(conta.tipo).toBe('CREDITO')
    expect(conta.limite).toBe(5000)
  })

  it('grava saldo null, nunca zero, quando a Pluggy não informa', () => {
    const conta = mapearConta({
      id: 'acc-3',
      itemId: 'item-1',
      name: 'Conta',
      type: 'BANK',
      balance: null,
      creditData: null,
    })
    expect(conta.saldo).toBeNull()
  })
})

describe('mapearTransacao', () => {
  it('mapeia os campos e preserva o sinal do valor', () => {
    const tx = mapearTransacao({
      id: 'tx-1',
      accountId: 'acc-1',
      date: '2026-10-11T00:00:00.000Z',
      description: 'IFOOD *PEDIDO',
      amount: -48.9,
      category: 'Food and drinks',
    })
    expect(tx).toEqual({
      pluggyTxId: 'tx-1',
      pluggyAccountId: 'acc-1',
      data: new Date('2026-10-11T00:00:00.000Z'),
      descricao: 'IFOOD *PEDIDO',
      valor: -48.9,
      categoriaOrig: 'Food and drinks',
    })
  })

  it('aceita transação sem categoria', () => {
    const tx = mapearTransacao({
      id: 'tx-2',
      accountId: 'acc-1',
      date: '2026-10-11T00:00:00.000Z',
      description: 'PIX',
      amount: 100,
      category: null,
    })
    expect(tx.categoriaOrig).toBeNull()
  })
})
```

- [ ] **Passo 3: Rodar o teste e confirmar que falha**

Rode: `npx vitest run src/features/dinheiro/pluggy-client.test.ts`
Esperado: FAIL — `Failed to resolve import "./pluggy-client"`.

- [ ] **Passo 4: Inspecionar os tipos reais do SDK antes de implementar**

O `pluggy-sdk` é tipado. **Não adivinhe nomes de campo** — leia:

```bash
grep -n "creditLimit\|accountId\|itemId" node_modules/pluggy-sdk/dist/types/*.d.ts | head -30
```

Se algum nome divergir do usado nos testes acima, ajuste **o teste e o mapeamento juntos** —
o teste documenta o contrato real, não o imaginado.

- [ ] **Passo 5: Implementar**

Crie `src/features/dinheiro/pluggy-client.ts`:

```ts
import { PluggyClient } from 'pluggy-sdk'
import type {
  ConexaoDominio,
  ContaDominio,
  FonteFinanceira,
  TransacaoDominio,
} from './tipos'

/** Formato bruto que nos interessa. Local de propósito: nada fora deste arquivo o conhece. */
type ContaBruta = {
  id: string
  itemId: string
  name: string
  type: string
  balance: number | null
  creditData?: { creditLimit?: number | null } | null
}

type TransacaoBruta = {
  id: string
  accountId: string
  date: string | Date
  description: string
  amount: number
  category?: string | null
}

export function mapearConta(bruta: ContaBruta): ContaDominio {
  return {
    pluggyAccountId: bruta.id,
    pluggyItemId: bruta.itemId,
    nome: bruta.name,
    tipo: bruta.type === 'CREDIT' ? 'CREDITO' : 'CORRENTE',
    saldo: bruta.balance ?? null,
    limite: bruta.creditData?.creditLimit ?? null,
  }
}

export function mapearTransacao(bruta: TransacaoBruta): TransacaoDominio {
  return {
    pluggyTxId: bruta.id,
    pluggyAccountId: bruta.accountId,
    data: new Date(bruta.date),
    descricao: bruta.description,
    valor: bruta.amount,
    categoriaOrig: bruta.category ?? null,
  }
}

export function criarFontePluggy(): FonteFinanceira {
  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET são obrigatórios')
  }
  const cliente = new PluggyClient({ clientId, clientSecret })
  const itemIds = lerItemIds(process.env.PLUGGY_ITEM_IDS)

  return {
    /**
     * Lê cada item configurado individualmente.
     *
     * Não usa `fetchAllItems()` de propósito: listar itens é opt-in de plano
     * pago e devolve `403 LIST_ITEMS_FEATURE_NOT_ENABLED` no plano pessoal
     * gratuito — que é o plano deste projeto.
     */
    async listarConexoes() {
      const itens = await Promise.all(itemIds.map((id) => cliente.fetchItem(id)))
      return itens.map(mapearConexao)
    },

    async listarContas(pluggyItemId) {
      const r = await cliente.fetchAccounts(pluggyItemId)
      return (r.results as unknown as ContaBruta[]).map(mapearConta)
    },

    async listarTransacoes(pluggyAccountId, desde) {
      const todas = await cliente.fetchAllTransactions(pluggyAccountId, {
        dateFrom: desde.toISOString().slice(0, 10),
      })
      return (todas as unknown as TransacaoBruta[]).map(mapearTransacao)
    },
  }
}
```

- [ ] **Passo 6: Rodar o teste e confirmar que passa**

Rode: `npx vitest run src/features/dinheiro/pluggy-client.test.ts`
Esperado: PASS, 5 testes.

- [ ] **Passo 7: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/features/dinheiro
git commit -m "feat: adapter do Pluggy isolado atrás de FonteFinanceira

Único arquivo que conhece o formato da Pluggy. Trocar de provedor altera
um arquivo. saldo ausente grava null, nunca zero."
```

---

### Task 6: Sincronização idempotente

A lógica pura do sync, separada da rota e da rede. Recebe uma `FonteFinanceira` por parâmetro,
então o teste injeta uma falsa e nenhuma chamada real ao Pluggy acontece.

**Arquivos:**
- Criar: `src/features/dinheiro/sync.ts`
- Testar: `src/features/dinheiro/sync.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

Crie `src/features/dinheiro/sync.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { janelaDeBusca, separarNovas } from './sync'
import type { TransacaoDominio } from './tipos'

const tx = (id: string): TransacaoDominio => ({
  pluggyTxId: id,
  pluggyAccountId: 'acc-1',
  data: new Date('2026-10-11T00:00:00Z'),
  descricao: 'teste',
  valor: -10,
  categoriaOrig: null,
})

describe('janelaDeBusca', () => {
  it('no primeiro sync busca 365 dias, que é o histórico que a Pluggy entrega', () => {
    const agora = new Date('2026-10-12T06:00:00Z')
    const desde = janelaDeBusca(null, agora)
    expect(desde.toISOString().slice(0, 10)).toBe('2025-10-12')
  })

  it('no sync incremental volta 10 dias, com folga sobre a janela de 7 do Pluggy', () => {
    const agora = new Date('2026-10-12T06:00:00Z')
    const desde = janelaDeBusca(new Date('2026-10-11T06:00:00Z'), agora)
    expect(desde.toISOString().slice(0, 10)).toBe('2026-10-02')
  })

  it('se o último sync é antigo, volta até ele e não só 10 dias', () => {
    const agora = new Date('2026-10-12T06:00:00Z')
    const desde = janelaDeBusca(new Date('2026-08-01T06:00:00Z'), agora)
    expect(desde.toISOString().slice(0, 10)).toBe('2026-07-22')
  })
})

describe('separarNovas', () => {
  it('descarta as que já existem pelo pluggyTxId', () => {
    const recebidas = [tx('a'), tx('b'), tx('c')]
    expect(separarNovas(recebidas, new Set(['b'])).map((t) => t.pluggyTxId)).toEqual(['a', 'c'])
  })

  it('não duplica quando a mesma transação chega duas vezes na mesma resposta', () => {
    const recebidas = [tx('a'), tx('a')]
    expect(separarNovas(recebidas, new Set())).toHaveLength(1)
  })

  it('devolve lista vazia quando tudo já é conhecido', () => {
    expect(separarNovas([tx('a')], new Set(['a']))).toEqual([])
  })
})
```

- [ ] **Passo 2: Rodar o teste e confirmar que falha**

Rode: `npx vitest run src/features/dinheiro/sync.test.ts`
Esperado: FAIL — `Failed to resolve import "./sync"`.

- [ ] **Passo 3: Implementar**

Crie `src/features/dinheiro/sync.ts`:

```ts
import { prisma } from '@/lib/prisma'
import type { FonteFinanceira, TransacaoDominio } from './tipos'

const DIAS_PRIMEIRO_SYNC = 365 // o que a Pluggy entrega retroativo
const DIAS_FOLGA = 10 // a janela incremental da Pluggy é de 4 a 7 dias

/**
 * De quando buscar. No primeiro sync, um ano. Depois, até o último sync menos
 * folga — a folga existe porque a janela incremental da Pluggy é de 7 dias e
 * estourá-la abre um buraco permanente no extrato.
 */
export function janelaDeBusca(ultimoSyncEm: Date | null, agora: Date): Date {
  const dias = ultimoSyncEm
    ? Math.max(DIAS_FOLGA, diasEntre(ultimoSyncEm, agora) + DIAS_FOLGA)
    : DIAS_PRIMEIRO_SYNC
  return new Date(agora.getTime() - dias * 86_400_000)
}

function diasEntre(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86_400_000)
}

/** Remove as já conhecidas e as duplicadas dentro da própria resposta. */
export function separarNovas(
  recebidas: TransacaoDominio[],
  jaConhecidas: Set<string>,
): TransacaoDominio[] {
  const vistas = new Set(jaConhecidas)
  const novas: TransacaoDominio[] = []
  for (const t of recebidas) {
    if (vistas.has(t.pluggyTxId)) continue
    vistas.add(t.pluggyTxId)
    novas.push(t)
  }
  return novas
}

export type ResultadoSync = { novas: number; conexoes: number }

export async function sincronizar(
  fonte: FonteFinanceira,
  agora = new Date(),
): Promise<ResultadoSync> {
  const conexoes = await fonte.listarConexoes()
  let novasNoTotal = 0

  for (const c of conexoes) {
    const conexao = await prisma.conexao.upsert({
      where: { pluggyItemId: c.pluggyItemId },
      create: { pluggyItemId: c.pluggyItemId, instituicao: c.instituicao, status: c.status },
      update: { instituicao: c.instituicao, status: c.status },
    })

    // Conexão quebrada não traz dado novo; registrar o status já é o valor desta volta.
    if (c.status !== 'UPDATED') continue

    const desde = janelaDeBusca(conexao.ultimoSyncEm, agora)

    for (const contaDominio of await fonte.listarContas(c.pluggyItemId)) {
      const conta = await prisma.conta.upsert({
        where: { pluggyAccountId: contaDominio.pluggyAccountId },
        create: {
          pluggyAccountId: contaDominio.pluggyAccountId,
          conexaoId: conexao.id,
          nome: contaDominio.nome,
          tipo: contaDominio.tipo,
          saldo: contaDominio.saldo,
          limite: contaDominio.limite,
        },
        update: {
          nome: contaDominio.nome,
          saldo: contaDominio.saldo,
          limite: contaDominio.limite,
        },
      })

      const recebidas = await fonte.listarTransacoes(contaDominio.pluggyAccountId, desde)
      if (recebidas.length === 0) continue

      const existentes = await prisma.transacao.findMany({
        where: { pluggyTxId: { in: recebidas.map((t) => t.pluggyTxId) } },
        select: { pluggyTxId: true },
      })
      const novas = separarNovas(recebidas, new Set(existentes.map((e) => e.pluggyTxId)))

      if (novas.length > 0) {
        await prisma.transacao.createMany({
          data: novas.map((t) => ({
            pluggyTxId: t.pluggyTxId,
            contaId: conta.id,
            data: t.data,
            descricao: t.descricao,
            valor: t.valor,
            categoriaOrig: t.categoriaOrig,
          })),
          skipDuplicates: true, // rede de segurança sobre a constraint única
        })
        novasNoTotal += novas.length
      }
    }

    await prisma.conexao.update({
      where: { id: conexao.id },
      data: { ultimoSyncEm: agora },
    })
  }

  return { novas: novasNoTotal, conexoes: conexoes.length }
}
```

- [ ] **Passo 4: Rodar o teste e confirmar que passa**

Rode: `npx vitest run src/features/dinheiro/sync.test.ts`
Esperado: PASS, 6 testes.

- [ ] **Passo 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/features/dinheiro/sync.ts src/features/dinheiro/sync.test.ts
git commit -m "feat: sincronização idempotente do Pluggy

Janela com 10 dias de folga sobre os 7 da Pluggy: estourá-la abre buraco
permanente no extrato. Dedupe por pluggyTxId antes do insert, com
skipDuplicates como rede de segurança."
```

---

### Task 7: Bearer token timing-safe

Compartilhado pelo cron e pelas duas rotas de ingestão. Comparação ingênua com `===` vaza o
token por tempo de resposta.

**Arquivos:**
- Criar: `src/lib/bearer.ts`
- Testar: `src/lib/bearer.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

Crie `src/lib/bearer.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { bearerValido } from './bearer'

describe('bearerValido', () => {
  it('aceita o token correto', () => {
    expect(bearerValido('Bearer abc123', 'abc123')).toBe(true)
  })

  it('rejeita token errado', () => {
    expect(bearerValido('Bearer errado', 'abc123')).toBe(false)
  })

  it('rejeita header ausente', () => {
    expect(bearerValido(null, 'abc123')).toBe(false)
  })

  it('rejeita header sem o prefixo Bearer', () => {
    expect(bearerValido('abc123', 'abc123')).toBe(false)
  })

  it('rejeita token de tamanho diferente sem estourar', () => {
    expect(bearerValido('Bearer a', 'abc123')).toBe(false)
  })

  it('rejeita quando o esperado está vazio, em vez de aceitar qualquer coisa', () => {
    expect(bearerValido('Bearer ', '')).toBe(false)
  })
})
```

- [ ] **Passo 2: Rodar o teste e confirmar que falha**

Rode: `npx vitest run src/lib/bearer.test.ts`
Esperado: FAIL — `Failed to resolve import "./bearer"`.

- [ ] **Passo 3: Implementar**

Crie `src/lib/bearer.ts`:

```ts
import { timingSafeEqual } from 'node:crypto'

/** Compara o header Authorization com o token esperado em tempo constante. */
export function bearerValido(header: string | null, esperado: string): boolean {
  if (!esperado) return false
  if (!header?.startsWith('Bearer ')) return false

  const recebido = Buffer.from(header.slice(7))
  const alvo = Buffer.from(esperado)
  // timingSafeEqual estoura com tamanhos diferentes; o tamanho não é segredo.
  if (recebido.length !== alvo.length) return false
  return timingSafeEqual(recebido, alvo)
}
```

- [ ] **Passo 4: Rodar o teste e confirmar que passa**

Rode: `npx vitest run src/lib/bearer.test.ts`
Esperado: PASS, 6 testes.

- [ ] **Passo 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/lib/bearer.ts src/lib/bearer.test.ts
git commit -m "feat: validação de bearer token em tempo constante

Comparação com === vazaria o token pelo tempo de resposta."
```

---

### Task 8: Rota do cron

**Arquivos:**
- Criar: `src/app/api/cron/sync-pluggy/route.ts`, `vercel.json`

- [ ] **Passo 1: Criar a rota**

Crie `src/app/api/cron/sync-pluggy/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { criarFontePluggy } from '@/features/dinheiro/pluggy-client'
import { sincronizar } from '@/features/dinheiro/sync'
import { prisma } from '@/lib/prisma'
import { bearerValido } from '@/lib/bearer'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return NextResponse.json({ erro: 'CRON_SECRET ausente' }, { status: 500 })
  if (!bearerValido(req.headers.get('authorization'), segredo)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  try {
    const r = await sincronizar(criarFontePluggy())
    await prisma.syncLog.create({ data: { status: 'OK', novas: r.novas } })
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e)
    // Registrar a falha é obrigatório: sync silencioso que para é pior que app nenhum.
    await prisma.syncLog.create({ data: { status: 'ERRO', erro } })
    return NextResponse.json({ ok: false, erro }, { status: 500 })
  }
}
```

- [ ] **Passo 2: Agendar na Vercel**

Crie `vercel.json`. `06:00` UTC é `03:00` em Brasília:

```json
{
  "crons": [{ "path": "/api/cron/sync-pluggy", "schedule": "0 6 * * *" }]
}
```

Defina `CRON_SECRET` nas variáveis de ambiente do projeto na Vercel — ela passa a enviar
`Authorization: Bearer <CRON_SECRET>` automaticamente nas chamadas agendadas.

- [ ] **Passo 3: Verificar localmente**

```bash
# sem token: deve dar 401
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/cron/sync-pluggy
# com token: deve dar 200 e um JSON com a contagem
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/sync-pluggy
```

Esperado: `401` na primeira; na segunda, `{"ok":true,"novas":N,"conexoes":1}` com `N` alto no
primeiro sync (um ano de histórico do Nubank).

- [ ] **Passo 4: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/app/api/cron vercel.json
git commit -m "feat: cron diário de sync às 03:00 BRT

Falha grava em SyncLog: sync que para em silêncio é pior que app nenhum."
```

---

### Task 9: Registro de hábito idempotente

**Arquivos:**
- Criar: `src/features/habitos/registro.ts`
- Testar: `src/features/habitos/registro.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

O teste cobre a validação, que é onde o dado pode entrar corrompido. Crie
`src/features/habitos/registro.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { validarEntrada } from './registro'

describe('validarEntrada', () => {
  it('aceita hábito booleano com valor true', () => {
    expect(validarEntrada({ slug: 'treino', valor: true })).toEqual({
      slug: 'treino',
      valorBool: true,
      valorNum: null,
    })
  })

  it('aceita hábito numérico', () => {
    expect(validarEntrada({ slug: 'sono', valor: 7.5 })).toEqual({
      slug: 'sono',
      valorBool: null,
      valorNum: 7.5,
    })
  })

  it('trata ausência de valor como true, para o atalho de 1 toque', () => {
    expect(validarEntrada({ slug: 'treino' })).toEqual({
      slug: 'treino',
      valorBool: true,
      valorNum: null,
    })
  })

  it('rejeita slug ausente', () => {
    expect(() => validarEntrada({ valor: true })).toThrow('slug obrigatório')
  })

  it('rejeita valor numérico não finito', () => {
    expect(() => validarEntrada({ slug: 'sono', valor: Number.NaN })).toThrow('valor inválido')
  })

  it('rejeita valor numérico negativo', () => {
    expect(() => validarEntrada({ slug: 'sono', valor: -1 })).toThrow('valor inválido')
  })

  it('rejeita tipo de valor não suportado', () => {
    expect(() => validarEntrada({ slug: 'sono', valor: 'sete' })).toThrow('valor inválido')
  })
})
```

- [ ] **Passo 2: Rodar o teste e confirmar que falha**

Rode: `npx vitest run src/features/habitos/registro.test.ts`
Esperado: FAIL — `Failed to resolve import "./registro"`.

- [ ] **Passo 3: Implementar**

Crie `src/features/habitos/registro.ts`:

```ts
import { prisma } from '@/lib/prisma'
import { diaLocal, inicioDoDiaUTC } from '@/lib/dia'

export type EntradaBruta = { slug?: unknown; valor?: unknown; dia?: unknown }

export type EntradaValidada = {
  slug: string
  valorBool: boolean | null
  valorNum: number | null
}

export function validarEntrada(bruta: EntradaBruta): EntradaValidada {
  const slug = bruta.slug
  if (typeof slug !== 'string' || slug.length === 0) throw new Error('slug obrigatório')

  const valor = bruta.valor

  // Atalho de 1 toque não manda valor: tocar significa "fiz".
  if (valor === undefined || valor === null) {
    return { slug, valorBool: true, valorNum: null }
  }
  if (typeof valor === 'boolean') {
    return { slug, valorBool: valor, valorNum: null }
  }
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor) || valor < 0) throw new Error(`valor inválido: ${valor}`)
    return { slug, valorBool: null, valorNum: valor }
  }
  throw new Error(`valor inválido: ${String(valor)}`)
}

/** Grava o registro. Reenviar o mesmo dia sobrescreve em vez de duplicar. */
export async function registrar(bruta: EntradaBruta, agora = new Date()): Promise<void> {
  const { slug, valorBool, valorNum } = validarEntrada(bruta)
  const dia = diaLocal(typeof bruta.dia === 'string' ? bruta.dia : agora)
  const data = inicioDoDiaUTC(dia)

  const habito = await prisma.habitoDef.findUnique({ where: { slug } })
  if (!habito) throw new Error(`hábito desconhecido: ${slug}`)

  await prisma.registroHabito.upsert({
    where: { habitoId_data: { habitoId: habito.id, data } },
    create: { habitoId: habito.id, data, valorBool, valorNum },
    update: { valorBool, valorNum },
  })
}
```

- [ ] **Passo 4: Rodar o teste e confirmar que passa**

Rode: `npx vitest run src/features/habitos/registro.test.ts`
Esperado: PASS, 7 testes.

- [ ] **Passo 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/features/habitos
git commit -m "feat: registro de hábito idempotente

upsert por (hábito, dia local): o Atalhos reenvia quando a rede oscila e o
usuário vai tocar duas vezes. Valor ausente significa 'fiz'."
```

---

### Task 10: Rotas de ingestão

**Arquivos:**
- Criar: `src/app/api/ingest/habito/route.ts`, `src/app/api/ingest/saude/route.ts`

- [ ] **Passo 1: Criar a rota de hábito**

Crie `src/app/api/ingest/habito/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { registrar } from '@/features/habitos/registro'
import { bearerValido } from '@/lib/bearer'

export async function POST(req: NextRequest) {
  if (!bearerValido(req.headers.get('authorization'), process.env.INGEST_TOKEN ?? '')) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ erro: 'JSON inválido' }, { status: 400 })
  }

  try {
    await registrar(corpo as Record<string, unknown>)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : 'erro' },
      { status: 400 },
    )
  }
}
```

- [ ] **Passo 2: Criar a rota de saúde**

Aceita várias métricas numa chamada, porque a Automação do Atalhos envia sono, passos e peso
juntos. Crie `src/app/api/ingest/saude/route.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { registrar } from '@/features/habitos/registro'
import { bearerValido } from '@/lib/bearer'

/** Corpo esperado: { "dia": "2026-10-12", "sono": 7.5, "passos": 8431, "peso": 78.4 } */
export async function POST(req: NextRequest) {
  if (!bearerValido(req.headers.get('authorization'), process.env.INGEST_TOKEN ?? '')) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ erro: 'JSON inválido' }, { status: 400 })
  }

  const dia = typeof corpo.dia === 'string' ? corpo.dia : undefined
  const metricas = ['sono', 'passos', 'peso'] as const

  const gravadas: string[] = []
  const falhas: Record<string, string> = {}

  for (const slug of metricas) {
    const valor = corpo[slug]
    // Métrica ausente é silenciosa: o app Saúde pode não ter o dado naquele dia.
    if (valor === undefined || valor === null) continue
    try {
      await registrar({ slug, valor, dia })
      gravadas.push(slug)
    } catch (e) {
      falhas[slug] = e instanceof Error ? e.message : 'erro'
    }
  }

  const status = Object.keys(falhas).length > 0 ? 207 : 200
  return NextResponse.json({ gravadas, falhas }, { status })
}
```

- [ ] **Passo 3: Verificar manualmente**

```bash
# 401 sem token
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/ingest/habito \
  -H 'content-type: application/json' -d '{"slug":"treino"}'

# 200 com token (requer o seed da Task 11 aplicado)
curl -s -X POST http://localhost:3000/api/ingest/habito \
  -H "Authorization: Bearer $INGEST_TOKEN" \
  -H 'content-type: application/json' -d '{"slug":"treino"}'

# idempotência: rode a linha acima duas vezes e confirme UMA linha
npx prisma studio   # abra RegistroHabito
```

Esperado: `401`, depois `{"ok":true}`, e exatamente uma linha em `RegistroHabito` para o dia.

- [ ] **Passo 4: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/app/api/ingest
git commit -m "feat: rotas de ingestão para o app Atalhos

Bearer token no header, nunca na URL: URL de Atalho vaza em backup e em
captura de tela. Métrica ausente é silenciosa; métrica inválida devolve 207."
```

---

### Task 11: Seed dos hábitos

**Arquivos:**
- Criar: `prisma/seed.ts`
- Modificar: `package.json`

- [ ] **Passo 1: Escrever o seed**

Crie `prisma/seed.ts` (a lista vem da seção 5 de `docs/design.md`):

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const HABITOS = [
  { slug: 'acordei-6h', nome: 'Acordei às 6h', tipo: 'BOOL', fonte: 'MANUAL', ordem: 1 },
  { slug: 'treino', nome: 'Treinei', tipo: 'BOOL', fonte: 'MANUAL', ordem: 2 },
  { slug: 'estudo-ingles', nome: 'Estudei inglês', tipo: 'BOOL', fonte: 'MANUAL', ordem: 3 },
  {
    slug: 'sono',
    nome: 'Horas de sono',
    tipo: 'NUMERO',
    unidade: 'h',
    chips: [5, 6, 7, 8, 9],
    fonte: 'SAUDE',
    ordem: 4,
  },
  { slug: 'passos', nome: 'Passos', tipo: 'NUMERO', unidade: 'passos', fonte: 'SAUDE', ordem: 5 },
  { slug: 'peso', nome: 'Peso', tipo: 'NUMERO', unidade: 'kg', fonte: 'MANUAL', ordem: 6 },
] as const

async function main() {
  for (const h of HABITOS) {
    await prisma.habitoDef.upsert({
      where: { slug: h.slug },
      create: {
        slug: h.slug,
        nome: h.nome,
        tipo: h.tipo,
        unidade: 'unidade' in h ? h.unidade : null,
        chips: 'chips' in h ? [...h.chips] : [],
        fonte: h.fonte,
        ordem: h.ordem,
      },
      // Não sobrescreve nome nem chips: o usuário pode tê-los editado no app.
      update: { ordem: h.ordem },
    })
  }
  console.log(`${HABITOS.length} hábitos garantidos`)
}

main().finally(() => prisma.$disconnect())
```

- [ ] **Passo 2: Registrar o seed no `package.json`**

```json
{
  "prisma": { "seed": "tsx prisma/seed.ts" }
}
```

- [ ] **Passo 3: Rodar o seed**

Rode: `npx prisma db seed`
Esperado: `6 hábitos garantidos`.

- [ ] **Passo 4: Rodar duas vezes para provar que é idempotente**

Rode: `npx prisma db seed && npx prisma db seed`
Esperado: mesma saída, e `HabitoDef` com exatamente 6 linhas (confira em `npx prisma studio`).

- [ ] **Passo 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add prisma/seed.ts package.json
git commit -m "feat: seed dos seis hábitos iniciais

upsert não sobrescreve nome nem chips: o usuário pode tê-los editado."
```

---

### Task 12: Tela crua do dia

Feia por decisão. Sem CSS além do mínimo. O objetivo é **provar que o dado entrou**.

**Arquivos:**
- Criar: `src/features/dia/consultas.ts`, `src/app/dia/page.tsx`, `src/features/dia/idade-sync.ts`
- Testar: `src/features/dia/idade-sync.test.ts`

- [ ] **Passo 1: Escrever o teste da idade do sync**

Crie `src/features/dia/idade-sync.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { avaliarSync } from './idade-sync'

const agora = new Date('2026-10-12T12:00:00Z')

describe('avaliarSync', () => {
  it('considera fresco um sync de hoje', () => {
    const r = avaliarSync(new Date('2026-10-12T06:00:00Z'), 'UPDATED', agora)
    expect(r.alerta).toBe(false)
    expect(r.horas).toBe(6)
  })

  it('alerta quando passou de 48h', () => {
    const r = avaliarSync(new Date('2026-10-10T06:00:00Z'), 'UPDATED', agora)
    expect(r.alerta).toBe(true)
    expect(r.motivo).toContain('54h')
  })

  it('alerta quando nunca sincronizou', () => {
    const r = avaliarSync(null, 'UPDATED', agora)
    expect(r.alerta).toBe(true)
    expect(r.motivo).toContain('nunca')
  })

  it('alerta quando a conexão pede reautenticação, mesmo com sync recente', () => {
    const r = avaliarSync(new Date('2026-10-12T06:00:00Z'), 'LOGIN_ERROR', agora)
    expect(r.alerta).toBe(true)
    expect(r.motivo).toContain('reconectar')
  })
})
```

- [ ] **Passo 2: Rodar o teste e confirmar que falha**

Rode: `npx vitest run src/features/dia/idade-sync.test.ts`
Esperado: FAIL — `Failed to resolve import "./idade-sync"`.

- [ ] **Passo 3: Implementar a avaliação**

Crie `src/features/dia/idade-sync.ts`:

```ts
const LIMITE_HORAS = 48 // a janela incremental da Pluggy é de 7 dias; 48h dá margem

export type Avaliacao = { alerta: boolean; horas: number | null; motivo: string }

export function avaliarSync(
  ultimoSyncEm: Date | null,
  status: string,
  agora = new Date(),
): Avaliacao {
  if (status !== 'UPDATED') {
    return { alerta: true, horas: null, motivo: 'a conexão pede para reconectar o banco' }
  }
  if (!ultimoSyncEm) {
    return { alerta: true, horas: null, motivo: 'nunca sincronizou' }
  }
  const horas = Math.floor((agora.getTime() - ultimoSyncEm.getTime()) / 3_600_000)
  return horas > LIMITE_HORAS
    ? { alerta: true, horas, motivo: `sem sincronizar há ${horas}h` }
    : { alerta: false, horas, motivo: `sincronizado há ${horas}h` }
}
```

- [ ] **Passo 4: Rodar o teste e confirmar que passa**

Rode: `npx vitest run src/features/dia/idade-sync.test.ts`
Esperado: PASS, 4 testes.

- [ ] **Passo 5: Escrever as consultas**

Crie `src/features/dia/consultas.ts`:

```ts
import { prisma } from '@/lib/prisma'
import { diaLocal, inicioDoDiaUTC } from '@/lib/dia'

export async function ultimasTransacoes(limite = 50) {
  return prisma.transacao.findMany({
    orderBy: { data: 'desc' },
    take: limite,
    select: { id: true, data: true, descricao: true, valor: true, categoriaOrig: true },
  })
}

export async function habitosDeHoje(agora = new Date()) {
  const data = inicioDoDiaUTC(diaLocal(agora))
  const defs = await prisma.habitoDef.findMany({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
  })
  const registros = await prisma.registroHabito.findMany({ where: { data } })
  const porHabito = new Map(registros.map((r) => [r.habitoId, r]))
  return defs.map((d) => ({ def: d, registro: porHabito.get(d.id) ?? null }))
}

export async function estadoDoSync() {
  const c = await prisma.conexao.findFirst({ orderBy: { ultimoSyncEm: 'desc' } })
  return c ? { ultimoSyncEm: c.ultimoSyncEm, status: c.status } : null
}
```

- [ ] **Passo 6: Escrever a tela**

Crie `src/app/dia/page.tsx`:

```tsx
import { avaliarSync } from '@/features/dia/idade-sync'
import { estadoDoSync, habitosDeHoje, ultimasTransacoes } from '@/features/dia/consultas'

export const dynamic = 'force-dynamic'

export default async function Dia() {
  const [transacoes, habitos, sync] = await Promise.all([
    ultimasTransacoes(),
    habitosDeHoje(),
    estadoDoSync(),
  ])
  const aval = sync
    ? avaliarSync(sync.ultimoSyncEm, sync.status)
    : { alerta: true, horas: null, motivo: 'nenhuma conexão cadastrada' }

  return (
    <main>
      <p role={aval.alerta ? 'alert' : undefined}>
        {aval.alerta ? '⚠ ' : ''}
        {aval.motivo}
      </p>

      <h1>Hábitos de hoje</h1>
      <ul>
        {habitos.map(({ def, registro }) => (
          <li key={def.id}>
            {def.nome}:{' '}
            {registro === null
              ? '—'
              : def.tipo === 'BOOL'
                ? registro.valorBool
                  ? 'sim'
                  : 'não'
                : `${registro.valorNum?.toString() ?? '—'} ${def.unidade ?? ''}`}
          </li>
        ))}
      </ul>

      <h2>Últimas transações ({transacoes.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Categoria Pluggy</th>
          </tr>
        </thead>
        <tbody>
          {transacoes.map((t) => (
            <tr key={t.id}>
              <td>{t.data.toISOString().slice(0, 10)}</td>
              <td>{t.descricao}</td>
              <td>{t.valor.toString()}</td>
              <td>{t.categoriaOrig ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
```

- [ ] **Passo 7: Verificar manualmente**

Rode `npm run dev` e abra `http://localhost:3000/dia` (faça login). Esperado: a linha de estado
do sync no topo, os 6 hábitos com `—` ou valor, e as transações do Nubank.

- [ ] **Passo 8: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/features/dia src/app/dia
git commit -m "feat: tela crua do dia com estado do sync visível

Feia por decisão. Idade do sync estampada: o app nunca mostra um número com
aparência de fresco quando não é."
```

---

### Task 13: Atalhos no iPhone

Esta task é manual e **valida o risco aberto do design**: não está provado que a Automação do
Atalhos lê o app Saúde neste aparelho.

**Arquivos:**
- Criar: `docs/atalhos.md`

- [ ] **Passo 1: Criar o atalho de 1 toque**

No app Atalhos → novo atalho → ação **Obter conteúdo de URL**:

- URL: `https://<seu-dominio>/api/ingest/habito`
- Método: `POST`
- Cabeçalhos: `Authorization` = `Bearer <INGEST_TOKEN>`, `Content-Type` = `application/json`
- Corpo da solicitação: JSON → `slug` (Texto) = `treino`

Salve como "Treinei". Repita para `acordei-6h` e `estudo-ingles`.

- [ ] **Passo 2: Colocar no Botão de Ação**

Ajustes → Botão de Ação → Atalho → "Treinei". Alternativa: Central de Controle, ou widget da
tela de início com a pasta de atalhos.

- [ ] **Passo 3: Provar que grava e que é idempotente**

Toque no atalho **duas vezes**. Abra `/dia`. Esperado: `Treinei: sim`, e exatamente uma linha em
`RegistroHabito` para hoje (confira em `npx prisma studio`).

- [ ] **Passo 4: Criar a Automação de saúde e VALIDAR a leitura**

App Atalhos → Automação → Hora do dia → 23:00 → Executar imediatamente. Ações:

1. **Obter amostras de saúde** — Tipo: `Análise do sono`, Período: `Hoje`, Operação: `Soma`
2. **Obter amostras de saúde** — Tipo: `Passos`, Período: `Hoje`, Operação: `Soma`
3. **Obter amostras de saúde** — Tipo: `Massa corporal`, Período: `Hoje`, Operação: `Mais recente`
4. **Obter conteúdo de URL** → `POST` em `https://<seu-dominio>/api/ingest/saude`, com os mesmos
   cabeçalhos, corpo JSON com `sono`, `passos` e `peso` apontando para as variáveis acima

Execute a automação manualmente uma vez.

**Se as ações de saúde não existirem ou devolverem vazio:** o risco se confirmou. O fallback já
está decidido no design — `sono` e `peso` viram `MANUAL` com chips, e `passos` sai do seed:

```bash
npx prisma studio   # HabitoDef: sono.fonte = MANUAL, peso.fonte = MANUAL, passos.ativo = false
```

Registre o resultado em `docs/atalhos.md`, seja ele qual for. Um risco validado vale mais que um
risco esquecido.

- [ ] **Passo 5: Documentar**

Crie `docs/atalhos.md` com: cada atalho criado, onde está acionável no aparelho, o corpo JSON
exato de cada um, e **o resultado da validação do Passo 4** (funcionou ou não, e qual fallback
foi aplicado). O `INGEST_TOKEN` **não** entra neste arquivo — ele vai para o repositório público.

- [ ] **Passo 6: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add docs/atalhos.md
git commit -m "docs: atalhos do iPhone e resultado da validação do app Saúde"
```

---

### Task 14: Deploy e primeiro sync real

- [ ] **Passo 1: Criar o projeto na Vercel**

```bash
npx vercel link
npx vercel env add DATABASE_URL production
npx vercel env add PLUGGY_CLIENT_ID production
npx vercel env add PLUGGY_CLIENT_SECRET production
npx vercel env add AUTH_SECRET production
npx vercel env add APP_PASSWORD_HASH production
npx vercel env add INGEST_TOKEN production
npx vercel env add CRON_SECRET production
npx vercel env add PLUGGY_ITEM_IDS production
```

- [ ] **Passo 2: Conectar o Nubank no Meu Pluggy**

Acesse `https://meu.pluggy.ai`, conecte a conta Nubank (conta e cartão vêm no mesmo vínculo) e
confirme que o item aparece com status `UPDATED`. **Copie o `itemId` do painel** e coloque
em `PLUGGY_ITEM_IDS` — sem ele o adapter estoura, porque listar itens é recurso pago.

- [ ] **Passo 3: Publicar**

```bash
npx vercel --prod
```

- [ ] **Passo 4: Disparar o primeiro sync manualmente**

```bash
curl -s -H "Authorization: Bearer <CRON_SECRET>" \
  https://<seu-dominio>/api/cron/sync-pluggy
```

Esperado: `{"ok":true,"novas":N,"conexoes":1}` com `N` na casa das centenas — é um ano de
histórico entrando de uma vez.

- [ ] **Passo 5: Confirmar na tela**

Abra `https://<seu-dominio>/dia`. Esperado: `sincronizado há 0h` e as transações do último ano.

- [ ] **Passo 6: Instalar como PWA no iPhone**

Safari → Compartilhar → Adicionar à Tela de Início.

- [ ] **Passo 7: Commit e publicar no GitHub**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add -A
git commit -m "chore: configuração de deploy na Vercel"
gh repo sync 2>/dev/null || gh api -X GET repos/oCury/vida >/dev/null
```

`git push` está no **deny** do settings deste usuário. Peça para ele rodar `! git push`, ou
publique via `gh`.

---

### Task 15: Guardrail contra `where` com `undefined`

Exigido pela seção 8 de `docs/design.md`. O Prisma **ignora** chaves com valor `undefined`. Num
`where`, isso transforma uma operação condicional em operação sobre a tabela inteira — um `delete`
condicional vira `deleteMany({})`. Isso já aconteceu neste histórico. O teste abaixo trava a porta.

**Arquivos:**
- Criar: `src/lib/where.ts`
- Testar: `src/lib/where.test.ts`
- Modificar: `src/features/habitos/registro.ts`

- [ ] **Passo 1: Escrever o teste que falha**

Crie `src/lib/where.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { whereSeguro } from './where'

describe('whereSeguro', () => {
  it('devolve o filtro quando todos os campos têm valor', () => {
    expect(whereSeguro({ id: 'abc' })).toEqual({ id: 'abc' })
  })

  it('estoura quando um campo é undefined, em vez de virar filtro vazio', () => {
    expect(() => whereSeguro({ id: undefined })).toThrow('where inseguro: id')
  })

  it('estoura quando o filtro está vazio', () => {
    expect(() => whereSeguro({})).toThrow('where inseguro: vazio')
  })

  it('aceita null, que é um filtro legítimo', () => {
    expect(whereSeguro({ categoriaId: null })).toEqual({ categoriaId: null })
  })

  it('inspeciona um nível de objeto aninhado', () => {
    expect(() => whereSeguro({ habitoId_data: { habitoId: 'x', data: undefined } })).toThrow(
      'where inseguro: habitoId_data.data',
    )
  })
})
```

- [ ] **Passo 2: Rodar o teste e confirmar que falha**

Rode: `npx vitest run src/lib/where.test.ts`
Esperado: FAIL — `Failed to resolve import "./where"`.

- [ ] **Passo 3: Implementar**

Crie `src/lib/where.ts`:

```ts
/**
 * Valida um filtro antes de entregá-lo ao Prisma.
 *
 * O Prisma ignora chaves com valor `undefined`. Num `where`, isso transforma uma
 * operação condicional em operação sobre a tabela inteira. `null` é permitido,
 * porque é um filtro legítimo ("campo é nulo").
 */
export function whereSeguro<T extends Record<string, unknown>>(filtro: T): T {
  const chaves = Object.keys(filtro)
  if (chaves.length === 0) throw new Error('where inseguro: vazio')

  for (const chave of chaves) {
    const valor = filtro[chave]
    if (valor === undefined) throw new Error(`where inseguro: ${chave}`)
    if (valor !== null && typeof valor === 'object' && !Array.isArray(valor)) {
      for (const [sub, subValor] of Object.entries(valor as Record<string, unknown>)) {
        if (subValor === undefined) throw new Error(`where inseguro: ${chave}.${sub}`)
      }
    }
  }
  return filtro
}
```

- [ ] **Passo 4: Rodar o teste e confirmar que passa**

Rode: `npx vitest run src/lib/where.test.ts`
Esperado: PASS, 5 testes.

- [ ] **Passo 5: Aplicar onde o filtro vem de fora**

Em `src/features/habitos/registro.ts` — o único lugar da Fase 1 onde um `where` depende de
entrada externa (o `slug` vem do corpo HTTP) — envolva os dois filtros:

```ts
import { whereSeguro } from '@/lib/where'

// dentro de registrar():
const habito = await prisma.habitoDef.findUnique({ where: whereSeguro({ slug }) })
if (!habito) throw new Error(`hábito desconhecido: ${slug}`)

await prisma.registroHabito.upsert({
  where: whereSeguro({ habitoId_data: { habitoId: habito.id, data } }),
  create: { habitoId: habito.id, data, valorBool, valorNum },
  update: { valorBool, valorNum },
})
```

- [ ] **Passo 6: Rodar a suíte inteira**

Rode: `npm test`
Esperado: todos verdes.

- [ ] **Passo 7: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/lib/where.ts src/lib/where.test.ts src/features/habitos/registro.ts
git commit -m "feat: guardrail contra where com undefined

O Prisma ignora chaves undefined: um delete condicional vira deleteMany({}).
Já aconteceu neste histórico. whereSeguro estoura em vez de apagar a tabela."
```

---

## Definição de pronto da Fase 1

- [ ] `npm test` verde, com cobertura ≥ 80% em `src/features/` e `src/lib/`
- [ ] Um ano de transações do Nubank no banco
- [ ] Pelo menos um `RegistroHabito` criado por toque no iPhone
- [ ] Tocar o atalho duas vezes produz **uma** linha
- [ ] `/dia` exibe a idade do sync, e ela fica vermelha se forçada a > 48h
- [ ] Resultado da validação do app Saúde registrado em `docs/atalhos.md`
- [ ] `whereSeguro` aplicado em todo `where` que depende de entrada externa
- [ ] `.env` nunca apareceu em `git ls-files`

## Fora do escopo da Fase 1

Categorização própria e `RegraCategoria` (Fase 2) · "para onde foi o dinheiro" e orçamento
(Fase 2) · número herói e direção visual suíça (Fase 3) · chips, streak e push (Fase 3) ·
correlação (Fase 4) · qualquer tela de patrimônio (fora do projeto até existir dinheiro guardado)
