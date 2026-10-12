# Fase 2 — Painel de dinheiro · Plano de implementação

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development
> ou superpowers:executing-plans para implementar tarefa por tarefa. Passos usam checkbox (`- [ ]`).

**Objetivo:** Transformar extrato bruto em resposta — para onde o dinheiro foi e quanto sobrou.

**Arquitetura:** Três funções puras carregam todo o risco de o app mentir (`classificar`,
`detectarTransferenciaInterna`, `resumoDoMes`), testadas sem banco. As ações de toque criam
regras, e é assim que a classificação melhora sem pedir nada recorrente ao usuário.

**Stack:** a mesma da Fase 1 — Next.js 15 · TypeScript · Prisma 7 · Vitest.

**Spec:** [`docs/superpowers/specs/2026-10-12-fase-2-painel-dinheiro-design.md`](../specs/2026-10-12-fase-2-painel-dinheiro-design.md)

**Ambiente:** `/usr/bin/git` e `/usr/bin/python3` estão travados na licença do Xcode — use
`export PATH=/opt/homebrew/bin:$PATH` como comando próprio, nunca como prefixo de um comando só.
`git push` está no deny do settings: só commit local.

**Tasks 2, 3 e 4 não precisam do banco** e podem ser feitas antes do `DATABASE_URL` existir.

---

### Task 1: Schema da regra e seed das categorias

**Arquivos:**
- Modificar: `prisma/schema.prisma`, `prisma/seed.ts`

- [ ] **Passo 1: Deixar a regra capaz de ignorar**

Em `prisma/schema.prisma`, substitua o modelo `RegraCategoria` por:

```prisma
model RegraCategoria {
  id          String     @id @default(cuid())
  padrao      String // trecho buscado na descrição, comparado em maiúsculas
  categoriaId String? // nulo quando a regra é de ignorar
  categoria   Categoria? @relation(fields: [categoriaId], references: [id])
  ignorar     Boolean    @default(false)
  criadaEm    DateTime   @default(now())
}
```

Invariante que o Prisma não expressa e o código precisa garantir: `ignorar = true` exige
`categoriaId = null`; `ignorar = false` exige `categoriaId` presente.

- [ ] **Passo 2: Validar e regerar o client**

```bash
export PATH=/opt/homebrew/bin:$PATH
npx prisma validate && npx prisma generate
```
Esperado: `The schema at prisma/schema.prisma is valid 🚀` e `Generated Prisma Client`.

- [ ] **Passo 3: Semear as categorias**

Em `prisma/seed.ts`, acrescente antes de `main()`:

```ts
const CATEGORIAS = [
  { nome: 'Mercado', grupo: 'VARIAVEL' },
  { nome: 'Delivery', grupo: 'VARIAVEL' },
  { nome: 'Restaurante', grupo: 'VARIAVEL' },
  { nome: 'Transporte', grupo: 'VARIAVEL' },
  { nome: 'Lazer', grupo: 'VARIAVEL' },
  { nome: 'Saúde', grupo: 'VARIAVEL' },
  { nome: 'Outros', grupo: 'VARIAVEL' },
  { nome: 'Moradia', grupo: 'FIXA' },
  { nome: 'Assinaturas', grupo: 'FIXA' },
  { nome: 'Educação', grupo: 'FIXA' },
  { nome: 'Salário', grupo: 'RECEITA' },
  { nome: 'Freelance', grupo: 'RECEITA' },
] as const
```

E dentro de `main()`, antes do laço de hábitos:

```ts
  for (const c of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { nome: c.nome },
      create: { nome: c.nome, grupo: c.grupo },
      // Não sobrescreve o grupo: o usuário pode tê-lo mudado no app.
      update: {},
    })
  }
  console.log(`${CATEGORIAS.length} categorias garantidas`)
```

- [ ] **Passo 4: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add prisma
git commit -m "feat: regra que categoriza ou ignora, e seed das categorias"
```

---

### Task 2: `classificar`

**Arquivos:**
- Criar: `src/features/dinheiro/classificar.ts`
- Testar: `src/features/dinheiro/classificar.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

Crie `src/features/dinheiro/classificar.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { classificar, type Regra } from './classificar'

const regra = (padrao: string, categoriaId: string | null, ignorar = false): Regra => ({
  padrao,
  categoriaId,
  ignorar,
  criadaEm: new Date('2026-01-01'),
})

describe('classificar', () => {
  it('usa a regra própria quando a descrição casa', () => {
    const r = classificar({ descricao: 'IFOOD *PEDIDO', categoriaOrig: 'Food and drinks' }, [
      regra('IFOOD', 'cat-delivery'),
    ])
    expect(r).toEqual({ categoriaId: 'cat-delivery', ignorar: false, origem: 'REGRA' })
  })

  it('cai na categoria da Pluggy quando nenhuma regra casa', () => {
    const r = classificar({ descricao: 'PADARIA', categoriaOrig: 'Food and drinks' }, [])
    expect(r).toEqual({ categoriaId: null, ignorar: false, origem: 'PLUGGY' })
  })

  it('devolve nada quando não há regra nem categoria da Pluggy', () => {
    const r = classificar({ descricao: 'XPTO', categoriaOrig: null }, [])
    expect(r).toEqual({ categoriaId: null, ignorar: false, origem: 'NENHUMA' })
  })

  it('casa sem diferenciar maiúsculas', () => {
    const r = classificar({ descricao: 'ifood pedido', categoriaOrig: null }, [
      regra('IFOOD', 'cat-delivery'),
    ])
    expect(r.categoriaId).toBe('cat-delivery')
  })

  it('regra de ignorar marca ignorada e não devolve categoria', () => {
    const r = classificar({ descricao: 'PIX MARIA', categoriaOrig: 'Transfers' }, [
      regra('PIX MARIA', null, true),
    ])
    expect(r).toEqual({ categoriaId: null, ignorar: true, origem: 'REGRA' })
  })

  it('entre duas regras que casam, a mais recente ganha', () => {
    const antiga = { ...regra('MERCADO', 'cat-mercado'), criadaEm: new Date('2026-01-01') }
    const nova = { ...regra('MERCADO', 'cat-lazer'), criadaEm: new Date('2026-06-01') }
    expect(classificar({ descricao: 'MERCADO X', categoriaOrig: null }, [antiga, nova])
      .categoriaId).toBe('cat-lazer')
  })

  it('a ordem do array não altera o resultado — quem decide é criadaEm', () => {
    const antiga = { ...regra('MERCADO', 'cat-mercado'), criadaEm: new Date('2026-01-01') }
    const nova = { ...regra('MERCADO', 'cat-lazer'), criadaEm: new Date('2026-06-01') }
    expect(classificar({ descricao: 'MERCADO X', categoriaOrig: null }, [nova, antiga])
      .categoriaId).toBe('cat-lazer')
  })

  it('ignora regra de padrão vazio, que casaria com tudo', () => {
    const r = classificar({ descricao: 'QUALQUER', categoriaOrig: null }, [regra('', 'cat-x')])
    expect(r.origem).toBe('NENHUMA')
  })
})
```

- [ ] **Passo 2: Rodar e confirmar a falha**

Rode: `npx vitest run src/features/dinheiro/classificar.test.ts`
Esperado: FAIL — `Failed to resolve import "./classificar"`.

- [ ] **Passo 3: Implementar**

Crie `src/features/dinheiro/classificar.ts`:

```ts
export type Regra = {
  padrao: string
  categoriaId: string | null
  ignorar: boolean
  criadaEm: Date
}

export type ParaClassificar = {
  descricao: string
  categoriaOrig: string | null
}

export type OrigemClassificacao = 'REGRA' | 'PLUGGY' | 'NENHUMA'

export type Classificacao = {
  categoriaId: string | null
  ignorar: boolean
  origem: OrigemClassificacao
}

/**
 * Decide a categoria de uma transação.
 *
 * Precedência: regra própria → categoria da Pluggy → nenhuma. A categoria da
 * Pluggy é o ponto de partida para nenhuma tela nascer vazia, e a regra do
 * usuário sempre manda mais.
 *
 * Entre regras que casam, a MAIS RECENTE ganha — determinístico e explicável.
 * A alternativa ("a mais específica ganha") exigiria definir especificidade e
 * surpreenderia mais.
 */
export function classificar(tx: ParaClassificar, regras: readonly Regra[]): Classificacao {
  const descricao = tx.descricao.toUpperCase()

  const casando = regras
    // Padrão vazio casaria com toda transação: descartado, não é regra.
    .filter((r) => r.padrao.length > 0 && descricao.includes(r.padrao.toUpperCase()))
    .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime())

  const vencedora = casando[0]
  if (vencedora) {
    return {
      categoriaId: vencedora.ignorar ? null : vencedora.categoriaId,
      ignorar: vencedora.ignorar,
      origem: 'REGRA',
    }
  }

  return {
    categoriaId: null,
    ignorar: false,
    origem: tx.categoriaOrig ? 'PLUGGY' : 'NENHUMA',
  }
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Rode: `npx vitest run src/features/dinheiro/classificar.test.ts`
Esperado: PASS, 8 testes.

- [ ] **Passo 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/features/dinheiro/classificar.ts src/features/dinheiro/classificar.test.ts
git commit -m "feat: classificação com precedência regra > Pluggy > nenhuma"
```

---

### Task 3: `detectarTransferenciaInterna`

**Arquivos:**
- Criar: `src/features/dinheiro/transferencia.ts`
- Testar: `src/features/dinheiro/transferencia.test.ts`

Esta é a função que impede o painel de **dobrar o gasto do mês**: o pagamento da fatura é um
débito na conta corrente, e as compras daquela fatura já aparecem no cartão.

- [ ] **Passo 1: Escrever o teste que falha**

Crie `src/features/dinheiro/transferencia.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { detectarTransferenciaInterna } from './transferencia'

const COM_CARTAO = [{ tipo: 'CORRENTE' as const }, { tipo: 'CREDITO' as const }]
const SO_CORRENTE = [{ tipo: 'CORRENTE' as const }]

describe('detectarTransferenciaInterna', () => {
  it('detecta pagamento de fatura do cartão', () => {
    expect(
      detectarTransferenciaInterna(
        { descricao: 'Pagamento de fatura', valor: -1200, tipoConta: 'CORRENTE' },
        COM_CARTAO,
      ),
    ).toBe(true)
  })

  it('detecta a variação "pagamento fatura cartão"', () => {
    expect(
      detectarTransferenciaInterna(
        { descricao: 'PAGAMENTO FATURA CARTAO NUBANK', valor: -800, tipoConta: 'CORRENTE' },
        COM_CARTAO,
      ),
    ).toBe(true)
  })

  it('NÃO marca compra comum — falso-positivo aqui esconde gasto real', () => {
    expect(
      detectarTransferenciaInterna(
        { descricao: 'MERCADO PAGUE MENOS', valor: -180, tipoConta: 'CORRENTE' },
        COM_CARTAO,
      ),
    ).toBe(false)
  })

  it('NÃO marca nada quando a conexão não tem cartão', () => {
    expect(
      detectarTransferenciaInterna(
        { descricao: 'Pagamento de fatura', valor: -1200, tipoConta: 'CORRENTE' },
        SO_CORRENTE,
      ),
    ).toBe(false)
  })

  it('NÃO marca lançamento do próprio cartão', () => {
    expect(
      detectarTransferenciaInterna(
        { descricao: 'Pagamento recebido', valor: 1200, tipoConta: 'CREDITO' },
        COM_CARTAO,
      ),
    ).toBe(false)
  })

  it('NÃO marca crédito na conta, só o débito que paga a fatura', () => {
    expect(
      detectarTransferenciaInterna(
        { descricao: 'Pagamento de fatura', valor: 1200, tipoConta: 'CORRENTE' },
        COM_CARTAO,
      ),
    ).toBe(false)
  })

  it('detecta aplicação e resgate entre contas próprias', () => {
    expect(
      detectarTransferenciaInterna(
        { descricao: 'Aplicação RDB', valor: -500, tipoConta: 'CORRENTE' },
        COM_CARTAO,
      ),
    ).toBe(true)
  })
})
```

- [ ] **Passo 2: Rodar e confirmar a falha**

Rode: `npx vitest run src/features/dinheiro/transferencia.test.ts`
Esperado: FAIL — `Failed to resolve import "./transferencia"`.

- [ ] **Passo 3: Implementar**

Crie `src/features/dinheiro/transferencia.ts`:

```ts
export type TipoContaSimples = 'CORRENTE' | 'CREDITO'

export type ParaDetectar = {
  descricao: string
  valor: number
  tipoConta: TipoContaSimples
}

/**
 * Padrões de movimentação entre contas do próprio titular — não são gasto.
 *
 * Comparados sem acento e em maiúsculas, porque a descrição do banco varia
 * ("Pagamento de fatura", "PAGAMENTO FATURA CARTAO").
 */
const PADROES = ['PAGAMENTO DE FATURA', 'PAGAMENTO FATURA', 'APLICACAO', 'RESGATE']

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tira acento
    .toUpperCase()
}

/**
 * Diz se o lançamento é movimentação interna, e portanto não é gasto real.
 *
 * O pagamento da fatura aparece como débito na conta corrente E as compras
 * daquela fatura aparecem no cartão. Contar os dois DOBRA o gasto do mês —
 * e um painel que mente para cima faz o usuário desacreditar e abandonar.
 *
 * Deliberadamente conservador: só marca DÉBITO em conta CORRENTE, e só quando
 * a conexão realmente tem um cartão. Falso-positivo aqui esconderia gasto
 * verdadeiro, que é o erro mais grave dos dois.
 */
export function detectarTransferenciaInterna(
  tx: ParaDetectar,
  contasDaConexao: readonly { tipo: TipoContaSimples }[],
): boolean {
  if (tx.tipoConta !== 'CORRENTE') return false
  if (tx.valor >= 0) return false
  if (!contasDaConexao.some((c) => c.tipo === 'CREDITO')) return false

  const descricao = normalizar(tx.descricao)
  return PADROES.some((p) => descricao.includes(p))
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Rode: `npx vitest run src/features/dinheiro/transferencia.test.ts`
Esperado: PASS, 7 testes.

- [ ] **Passo 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
git add src/features/dinheiro/transferencia.ts src/features/dinheiro/transferencia.test.ts
git commit -m "feat: detectar movimentação interna para não dobrar o gasto"
```

---

### Task 4: `resumoDoMes`

**Arquivos:**
- Criar: `src/features/dinheiro/resumo.ts`
- Testar: `src/features/dinheiro/resumo.test.ts`

- [ ] **Passo 1: Escrever o teste que falha**

Crie `src/features/dinheiro/resumo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { resumoDoMes, type TransacaoResumo } from './resumo'

const tx = (p: Partial<TransacaoResumo>): TransacaoResumo => ({
  valor: -100,
  categoriaNome: 'Mercado',
  ignorada: false,
  ...p,
})

describe('resumoDoMes', () => {
  it('soma receita e gasto separadamente', () => {
    const r = resumoDoMes([tx({ valor: 5000, categoriaNome: 'Salário' }), tx({ valor: -300 })])
    expect(r.receita).toBe(5000)
    expect(r.gasto).toBe(300)
    expect(r.sobra).toBe(4700)
  })

  it('exclui transação ignorada de TODOS os totais', () => {
    const r = resumoDoMes([
      tx({ valor: 5000, categoriaNome: 'Salário' }),
      tx({ valor: -1200, ignorada: true }),
      tx({ valor: -300 }),
    ])
    expect(r.gasto).toBe(300)
    expect(r.porCategoria.find((c) => c.nome === 'Mercado')?.total).toBe(300)
  })

  it('devolve sobra null quando não houve receita, em vez de número negativo enganoso', () => {
    const r = resumoDoMes([tx({ valor: -300 })])
    expect(r.receita).toBe(0)
    expect(r.sobra).toBeNull()
  })

  it('ordena o ranking por valor decrescente', () => {
    const r = resumoDoMes([
      tx({ valor: -100, categoriaNome: 'Mercado' }),
      tx({ valor: -500, categoriaNome: 'Delivery' }),
      tx({ valor: -300, categoriaNome: 'Transporte' }),
    ])
    expect(r.porCategoria.map((c) => c.nome)).toEqual(['Delivery', 'Transporte', 'Mercado'])
  })

  it('agrupa várias transações da mesma categoria', () => {
    const r = resumoDoMes([tx({ valor: -100 }), tx({ valor: -50 })])
    expect(r.porCategoria).toEqual([{ nome: 'Mercado', total: 150 }])
  })

  it('transação sem categoria cai em Outros', () => {
    const r = resumoDoMes([tx({ valor: -80, categoriaNome: null })])
    expect(r.porCategoria).toEqual([{ nome: 'Outros', total: 80 }])
  })

  it('mês vazio devolve vazio e sobra null, não zeros', () => {
    const r = resumoDoMes([])
    expect(r).toEqual({ receita: 0, gasto: 0, sobra: null, porCategoria: [] })
  })

  it('receita não entra no ranking de gasto', () => {
    const r = resumoDoMes([tx({ valor: 5000, categoriaNome: 'Salário' }), tx({ valor: -100 })])
    expect(r.porCategoria.map((c) => c.nome)).toEqual(['Mercado'])
  })
})
```

- [ ] **Passo 2: Rodar e confirmar a falha**

Rode: `npx vitest run src/features/dinheiro/resumo.test.ts`
Esperado: FAIL — `Failed to resolve import "./resumo"`.

- [ ] **Passo 3: Implementar**

Crie `src/features/dinheiro/resumo.ts`:

```ts
export type TransacaoResumo = {
  valor: number // negativo é gasto, positivo é entrada
  categoriaNome: string | null
  ignorada: boolean
}

export type TotalCategoria = { nome: string; total: number }

export type Resumo = {
  receita: number
  gasto: number
  sobra: number | null // null = não houve receita, então não há sobra a afirmar
  porCategoria: TotalCategoria[]
}

const SEM_CATEGORIA = 'Outros'

/**
 * Fecha o mês.
 *
 * Transação `ignorada` fica fora de TODOS os totais — ela é movimentação
 * interna ou entrada que não é receita, e contá-la mentiria nas duas pontas.
 *
 * `sobra` é `null` quando não houve receita no período: afirmar "sobra de
 * -R$ 300" sugere um déficit, quando a verdade é que o app ainda não sabe
 * quanto entrou. Mesma regra do saldo: `null` nunca vira zero.
 */
export function resumoDoMes(transacoes: readonly TransacaoResumo[]): Resumo {
  const validas = transacoes.filter((t) => !t.ignorada)

  let receita = 0
  let gasto = 0
  const porCategoria = new Map<string, number>()

  for (const t of validas) {
    if (t.valor >= 0) {
      receita += t.valor
      continue // entrada não entra no ranking de gasto
    }
    const valor = Math.abs(t.valor)
    gasto += valor
    const nome = t.categoriaNome ?? SEM_CATEGORIA
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + valor)
  }

  return {
    receita,
    gasto,
    sobra: receita > 0 ? receita - gasto : null,
    porCategoria: [...porCategoria]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total),
  }
}
```

- [ ] **Passo 4: Rodar e confirmar que passa**

Rode: `npx vitest run src/features/dinheiro/resumo.test.ts`
Esperado: PASS, 8 testes.

- [ ] **Passo 5: Rodar a suíte inteira e commitar**

```bash
export PATH=/opt/homebrew/bin:$PATH
npx vitest run && npx tsc --noEmit
git add src/features/dinheiro/resumo.ts src/features/dinheiro/resumo.test.ts
git commit -m "feat: resumo do mês com sobra null quando não há receita"
```

---

### Task 5: Tela `/dinheiro` e as ações de um toque

**Arquivos:**
- Criar: `src/features/dinheiro/consultas.ts`, `src/features/dinheiro/acoes.ts`,
  `src/app/dinheiro/page.tsx`

Requer banco: a verificação desta task depende do `DATABASE_URL`.

- [ ] **Passo 1: Consultas do mês**

Crie `src/features/dinheiro/consultas.ts`:

```ts
import { prisma } from '@/lib/prisma'

/** Primeiro e último instante de um mês `YYYY-MM`, em horário de Brasília. */
function intervalo(mes: string): { de: Date; ate: Date } {
  const [ano, m] = mes.split('-').map(Number)
  if (!ano || !m || m < 1 || m > 12) throw new Error(`mês inválido: ${mes}`)
  // -03:00 fixo: o Brasil não observa horário de verão desde 2019, e a função
  // de dia local (src/lib/dia.ts) já cobre o caso histórico onde importa.
  return {
    de: new Date(Date.UTC(ano, m - 1, 1, 3)),
    ate: new Date(Date.UTC(ano, m, 1, 3)),
  }
}

export async function transacoesDoMes(mes: string) {
  const { de, ate } = intervalo(mes)
  return prisma.transacao.findMany({
    where: { data: { gte: de, lt: ate } },
    orderBy: { data: 'desc' },
    select: {
      id: true,
      data: true,
      descricao: true,
      valor: true,
      ignorada: true,
      categoriaOrig: true,
      categoria: { select: { nome: true } },
    },
  })
}

export async function categorias() {
  return prisma.categoria.findMany({ orderBy: { nome: 'asc' } })
}
```

- [ ] **Passo 2: Ações de um toque**

Crie `src/features/dinheiro/acoes.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { whereSeguro } from '@/lib/where'

/**
 * Extrai da descrição um padrão reutilizável.
 *
 * Descrições de banco carregam sufixo variável ("IFOOD *PEDIDO 4821"), então
 * guardar a descrição inteira criaria uma regra que nunca casa de novo. Duas
 * primeiras palavras é o equilíbrio entre casar o futuro e não casar demais.
 */
export function padraoDe(descricao: string): string {
  return descricao.trim().split(/\s+/).slice(0, 2).join(' ').toUpperCase()
}

/** Recategoriza a transação E cria a regra, para as próximas virem certas. */
export async function recategorizar(transacaoId: string, categoriaId: string): Promise<void> {
  const tx = await prisma.transacao.findUnique({
    where: whereSeguro({ id: transacaoId }),
    select: { descricao: true },
  })
  if (!tx) throw new Error('transação não encontrada')

  await prisma.$transaction([
    prisma.transacao.update({
      where: whereSeguro({ id: transacaoId }),
      data: { categoriaId, ignorada: false },
    }),
    prisma.regraCategoria.create({
      data: { padrao: padraoDe(tx.descricao), categoriaId, ignorar: false },
    }),
  ])
  revalidatePath('/dinheiro')
}

/** Marca como ignorada E cria a regra de ignorar. */
export async function ignorar(transacaoId: string): Promise<void> {
  const tx = await prisma.transacao.findUnique({
    where: whereSeguro({ id: transacaoId }),
    select: { descricao: true },
  })
  if (!tx) throw new Error('transação não encontrada')

  await prisma.$transaction([
    prisma.transacao.update({
      where: whereSeguro({ id: transacaoId }),
      data: { ignorada: true, categoriaId: null },
    }),
    prisma.regraCategoria.create({
      data: { padrao: padraoDe(tx.descricao), categoriaId: null, ignorar: true },
    }),
  ])
  revalidatePath('/dinheiro')
}
```

- [ ] **Passo 3: Teste de `padraoDe`**

Crie `src/features/dinheiro/acoes.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { padraoDe } from './acoes'

describe('padraoDe', () => {
  it('pega as duas primeiras palavras em maiúsculas', () => {
    expect(padraoDe('IFOOD *PEDIDO 4821')).toBe('IFOOD *PEDIDO')
  })

  it('funciona com descrição de uma palavra só', () => {
    expect(padraoDe('UBER')).toBe('UBER')
  })

  it('normaliza espaço repetido e sobrando', () => {
    expect(padraoDe('  PIX   MARIA SILVA ')).toBe('PIX MARIA')
  })

  it('devolve maiúsculas mesmo vindo minúsculo', () => {
    expect(padraoDe('mercado pague menos')).toBe('MERCADO PAGUE')
  })
})
```

Rode: `npx vitest run src/features/dinheiro/acoes.test.ts` — esperado PASS, 4 testes.

- [ ] **Passo 4: A tela**

Crie `src/app/dinheiro/page.tsx`:

```tsx
import { categorias, transacoesDoMes } from '@/features/dinheiro/consultas'
import { ignorar, recategorizar } from '@/features/dinheiro/acoes'
import { resumoDoMes } from '@/features/dinheiro/resumo'
import { diaLocal } from '@/lib/dia'

export const dynamic = 'force-dynamic'

/** Crua de propósito: hierarquia e número herói são a Fase 3. */
export default async function Dinheiro() {
  const mes = diaLocal(new Date()).slice(0, 7)
  const [transacoes, cats] = await Promise.all([transacoesDoMes(mes), categorias()])

  const resumo = resumoDoMes(
    transacoes.map((t) => ({
      valor: Number(t.valor),
      categoriaNome: t.categoria?.nome ?? null,
      ignorada: t.ignorada,
    })),
  )

  return (
    <main>
      <h1>Dinheiro · {mes}</h1>

      {transacoes.length === 0 ? (
        <p>Nenhuma transação neste mês.</p>
      ) : (
        <>
          <ul>
            <li>Receita: {resumo.receita.toFixed(2)}</li>
            <li>Gasto: {resumo.gasto.toFixed(2)}</li>
            <li>Sobra: {resumo.sobra === null ? '— (nenhuma receita detectada)' : resumo.sobra.toFixed(2)}</li>
          </ul>

          <h2>Para onde foi</h2>
          <ol>
            {resumo.porCategoria.map((c) => (
              <li key={c.nome}>
                {c.nome}: {c.total.toFixed(2)}
              </li>
            ))}
          </ol>

          <h2>Lançamentos</h2>
          <table>
            <tbody>
              {transacoes.map((t) => (
                <tr key={t.id} style={t.ignorada ? { opacity: 0.5 } : undefined}>
                  <td>{t.data.toISOString().slice(0, 10)}</td>
                  <td>{t.descricao}</td>
                  <td>{Number(t.valor).toFixed(2)}</td>
                  <td>{t.categoria?.nome ?? t.categoriaOrig ?? '—'}</td>
                  <td>
                    <form
                      action={async (form: FormData) => {
                        'use server'
                        await recategorizar(t.id, String(form.get('categoriaId')))
                      }}
                    >
                      <select name="categoriaId" defaultValue="">
                        <option value="" disabled>
                          categoria…
                        </option>
                        {cats.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nome}
                          </option>
                        ))}
                      </select>
                      <button type="submit">ok</button>
                    </form>
                  </td>
                  <td>
                    <form
                      action={async () => {
                        'use server'
                        await ignorar(t.id)
                      }}
                    >
                      <button type="submit">ignorar</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </main>
  )
}
```

- [ ] **Passo 5: Build e commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
npx next build && npx vitest run && npx tsc --noEmit
git add src/features/dinheiro src/app/dinheiro
git commit -m "feat: tela de dinheiro com recategorizar e ignorar em um toque"
```

- [ ] **Passo 6: Verificar com banco** (depende do `DATABASE_URL`)

Abra `/dinheiro`, recategorize um lançamento e confirme em `npx prisma studio` que:
a transação mudou de categoria **e** uma `RegraCategoria` foi criada com o padrão esperado.

---

### Task 6: Aplicar classificação e detecção no sync

**Arquivos:**
- Modificar: `src/features/dinheiro/sync.ts`

Sem esta task, as duas funções das Tasks 2 e 3 existem mas ninguém as chama no caminho real.

- [ ] **Passo 1: Carregar as regras uma vez por sync**

Em `src/features/dinheiro/sync.ts`, dentro de `sincronizar`, antes do laço de conexões:

```ts
  const regras = await prisma.regraCategoria.findMany({
    select: { padrao: true, categoriaId: true, ignorar: true, criadaEm: true },
  })
```

- [ ] **Passo 2: Classificar e detectar ao inserir**

Ainda em `sincronizar`, troque o `createMany` por:

```ts
      const contasDaConexao = await prisma.conta.findMany({
        where: { conexaoId: conexao.id },
        select: { tipo: true },
      })

      await prisma.transacao.createMany({
        data: novas.map((t) => {
          const c = classificar(
            { descricao: t.descricao, categoriaOrig: t.categoriaOrig },
            regras,
          )
          const interna = detectarTransferenciaInterna(
            { descricao: t.descricao, valor: t.valor, tipoConta: contaDominio.tipo },
            contasDaConexao,
          )
          return {
            pluggyTxId: t.pluggyTxId,
            contaId: conta.id,
            data: t.data,
            descricao: t.descricao,
            valor: t.valor,
            categoriaOrig: t.categoriaOrig,
            categoriaId: c.categoriaId,
            // Movimentação interna é ignorada mesmo sem regra do usuário.
            ignorada: c.ignorar || interna,
          }
        }),
        skipDuplicates: true,
      })
```

E adicione os imports no topo:

```ts
import { classificar } from './classificar'
import { detectarTransferenciaInterna } from './transferencia'
```

- [ ] **Passo 3: Build, suíte e commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
npx next build && npx vitest run && npx tsc --noEmit
git add src/features/dinheiro/sync.ts
git commit -m "feat: sync classifica e marca movimentação interna ao inserir"
```

---

## Definição de pronto da Fase 2

- [ ] `npm test` verde, cobertura ≥ 80% em `src/features/` e `src/lib/`
- [ ] `npx next build` compila
- [ ] Pagamento de fatura entra no banco com `ignorada = true`
- [ ] Recategorizar um lançamento cria a `RegraCategoria` correspondente
- [ ] Um mês sem receita detectada mostra sobra `—`, nunca um número
- [ ] Transação ignorada não aparece em nenhum total nem no ranking
