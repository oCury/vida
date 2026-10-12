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
