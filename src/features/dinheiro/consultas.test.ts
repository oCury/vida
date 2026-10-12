import { describe, expect, it } from 'vitest'
import { intervaloDoMes } from './consultas'

describe('intervaloDoMes', () => {
  it('começa à meia-noite de Brasília do dia 1', () => {
    expect(intervaloDoMes('2026-10').de.toISOString()).toBe('2026-10-01T03:00:00.000Z')
  })

  it('termina na meia-noite de Brasília do dia 1 do mês seguinte', () => {
    expect(intervaloDoMes('2026-10').ate.toISOString()).toBe('2026-11-01T03:00:00.000Z')
  })

  it('vira o ano corretamente em dezembro', () => {
    expect(intervaloDoMes('2026-12').ate.toISOString()).toBe('2027-01-01T03:00:00.000Z')
  })

  it('cobre os 29 dias de fevereiro em ano bissexto', () => {
    const { de, ate } = intervaloDoMes('2024-02')
    expect((ate.getTime() - de.getTime()) / 86_400_000).toBe(29)
  })

  it('rejeita mês 13', () => {
    expect(() => intervaloDoMes('2026-13')).toThrow('mês inválido')
  })

  it('rejeita mês 00', () => {
    expect(() => intervaloDoMes('2026-00')).toThrow('mês inválido')
  })

  it('rejeita formato de dia completo', () => {
    expect(() => intervaloDoMes('2026-10-12')).toThrow('mês inválido')
  })
})
