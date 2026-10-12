import { beforeEach, describe, expect, it, vi } from 'vitest'

const bd = {
  conta: { findFirst: vi.fn() },
  meta: { findMany: vi.fn() },
  habitoDef: { findMany: vi.fn() },
  registroHabito: { findMany: vi.fn() },
  transacao: { findMany: vi.fn() },
  conexao: { findFirst: vi.fn() },
}
vi.mock('@/lib/prisma', () => ({ prisma: bd }))

const { degrausDaReserva, habitosComStreak, saldoDaReserva } = await import('./consultas')

const AGORA = new Date('2026-10-12T15:00:00Z')

beforeEach(() => {
  vi.clearAllMocks()
  bd.meta.findMany.mockResolvedValue([
    { nome: 'Primeiros R$ 500', valorAlvo: 500, ordem: 1 },
    { nome: 'R$ 1.500', valorAlvo: 1500, ordem: 2 },
  ])
  bd.transacao.findMany.mockResolvedValue([])
})

describe('saldoDaReserva', () => {
  it('devolve null quando nenhuma conta está marcada', async () => {
    bd.conta.findFirst.mockResolvedValue(null)
    expect(await saldoDaReserva()).toBeNull()
  })

  it('devolve o saldo da conta marcada', async () => {
    bd.conta.findFirst.mockResolvedValue({ saldo: 750 })
    expect(await saldoDaReserva()).toBe(750)
  })

  it('devolve null quando a conta existe mas o saldo é desconhecido', async () => {
    bd.conta.findFirst.mockResolvedValue({ saldo: null })
    expect(await saldoDaReserva()).toBeNull()
  })
})

describe('degrausDaReserva', () => {
  it('sem 3 meses de histórico, traz só os degraus fixos', async () => {
    expect(await degrausDaReserva(AGORA)).toEqual([
      { nome: 'Primeiros R$ 500', valorAlvo: 500 },
      { nome: 'R$ 1.500', valorAlvo: 1500 },
    ])
  })

  it('com 3 meses de histórico, acrescenta "um mês de despesa" pela média', async () => {
    // cada mês consultado devolve um gasto de 3000
    bd.transacao.findMany.mockResolvedValue([
      { valor: -3000, ignorada: false, categoria: { nome: 'Mercado' } },
    ])
    const degraus = await degrausDaReserva(AGORA)
    expect(degraus).toHaveLength(3)
    expect(degraus[2]).toEqual({ nome: 'Um mês de despesa', valorAlvo: 3000 })
  })

  it('um único mês sem dado já impede o terceiro degrau — meta de chute não entra', async () => {
    bd.transacao.findMany
      .mockResolvedValueOnce([{ valor: -3000, ignorada: false, categoria: null }])
      .mockResolvedValueOnce([])
    expect(await degrausDaReserva(AGORA)).toHaveLength(2)
  })
})

describe('habitosComStreak', () => {
  it('conta streak só de dia cumprido — valorBool false é "não fiz", não presença', async () => {
    bd.habitoDef.findMany.mockResolvedValue([
      { id: 'h-1', slug: 'treino', nome: 'Treinei', tipo: 'BOOL', unidade: null, chips: [], fonte: 'MANUAL' },
    ])
    bd.registroHabito.findMany.mockResolvedValue([
      { habitoId: 'h-1', data: new Date('2026-10-11T03:00:00Z'), valorBool: true, valorNum: null },
      { habitoId: 'h-1', data: new Date('2026-10-10T03:00:00Z'), valorBool: false, valorNum: null },
    ])
    const r = await habitosComStreak(AGORA)
    expect(r[0]?.streak).toBe(1)
  })

  it('encontra o registro de hoje', async () => {
    bd.habitoDef.findMany.mockResolvedValue([
      { id: 'h-1', slug: 'sono', nome: 'Sono', tipo: 'NUMERO', unidade: 'h', chips: [7], fonte: 'SAUDE' },
    ])
    bd.registroHabito.findMany.mockResolvedValue([
      { habitoId: 'h-1', data: new Date('2026-10-12T03:00:00Z'), valorBool: null, valorNum: 7 },
    ])
    const r = await habitosComStreak(AGORA)
    expect(r[0]?.registro?.valorNum).toBe(7)
    expect(r[0]?.streak).toBe(1)
  })

  it('hábito sem registro nenhum tem streak zero e registro nulo', async () => {
    bd.habitoDef.findMany.mockResolvedValue([
      { id: 'h-9', slug: 'novo', nome: 'Novo', tipo: 'BOOL', unidade: null, chips: [], fonte: 'MANUAL' },
    ])
    bd.registroHabito.findMany.mockResolvedValue([])
    const r = await habitosComStreak(AGORA)
    expect(r[0]?.streak).toBe(0)
    expect(r[0]?.registro).toBeNull()
  })
})
