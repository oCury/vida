import { beforeEach, describe, expect, it, vi } from 'vitest'

const bd = {
  habitoDef: { findUnique: vi.fn() },
  registroHabito: { upsert: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({ prisma: bd }))

const { registrar } = await import('./registro')

// 22h de Brasília = 01h do dia seguinte em UTC. O registro deve cair no dia 12.
const NOITE_DE_12 = new Date('2026-10-13T01:00:00Z')

beforeEach(() => {
  vi.clearAllMocks()
  bd.habitoDef.findUnique.mockResolvedValue({ id: 'h-1' })
  bd.registroHabito.upsert.mockResolvedValue({})
})

describe('registrar', () => {
  it('grava no dia LOCAL, não no dia UTC', async () => {
    await registrar({ slug: 'treino' }, NOITE_DE_12)
    const chamada = bd.registroHabito.upsert.mock.calls[0]?.[0]
    expect(chamada.where.habitoId_data.data.toISOString()).toBe('2026-10-12T03:00:00.000Z')
  })

  it('usa upsert, para reenvio do Atalhos não duplicar', async () => {
    await registrar({ slug: 'treino' }, NOITE_DE_12)
    expect(bd.registroHabito.upsert).toHaveBeenCalledOnce()
    const chamada = bd.registroHabito.upsert.mock.calls[0]?.[0]
    expect(chamada.where.habitoId_data.habitoId).toBe('h-1')
  })

  it('toque sem valor grava true', async () => {
    await registrar({ slug: 'treino' }, NOITE_DE_12)
    const chamada = bd.registroHabito.upsert.mock.calls[0]?.[0]
    expect(chamada.create.valorBool).toBe(true)
    expect(chamada.create.valorNum).toBeNull()
  })

  it('valor numérico grava em valorNum', async () => {
    await registrar({ slug: 'sono', valor: 7.5 }, NOITE_DE_12)
    const chamada = bd.registroHabito.upsert.mock.calls[0]?.[0]
    expect(chamada.create.valorNum).toBe(7.5)
    expect(chamada.create.valorBool).toBeNull()
  })

  it('respeita o dia informado explicitamente, para preencher lacuna', async () => {
    await registrar({ slug: 'treino', dia: '2026-10-05' }, NOITE_DE_12)
    const chamada = bd.registroHabito.upsert.mock.calls[0]?.[0]
    expect(chamada.where.habitoId_data.data.toISOString()).toBe('2026-10-05T03:00:00.000Z')
  })

  it('estoura em hábito desconhecido, em vez de criar lixo', async () => {
    bd.habitoDef.findUnique.mockResolvedValue(null)
    await expect(registrar({ slug: 'inventado' }, NOITE_DE_12)).rejects.toThrow(
      'hábito desconhecido',
    )
    expect(bd.registroHabito.upsert).not.toHaveBeenCalled()
  })

  it('rejeita dia inexistente passado explicitamente', async () => {
    await expect(registrar({ slug: 'treino', dia: '2026-02-30' }, NOITE_DE_12)).rejects.toThrow(
      'dia inválido',
    )
  })
})
