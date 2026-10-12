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

  it('rejeita dia de calendário inexistente que casa com o formato', () => {
    expect(() => diaLocal('2026-02-30')).toThrow('dia inválido')
  })

  it('rejeita Date inválido com a mensagem do módulo, não RangeError do V8', () => {
    expect(() => diaLocal(new Date('xx'))).toThrow('dia inválido')
  })
})

describe('inicioDoDiaUTC', () => {
  it('converte um dia local no instante UTC da sua meia-noite em Brasília', () => {
    expect(inicioDoDiaUTC('2026-10-12').toISOString()).toBe('2026-10-12T03:00:00.000Z')
  })

  it('rejeita 30 de fevereiro em vez de rolar para março em silêncio', () => {
    expect(() => inicioDoDiaUTC('2026-02-30')).toThrow('dia inválido')
  })

  it('rejeita 29 de fevereiro em ano não bissexto', () => {
    expect(() => inicioDoDiaUTC('2026-02-29')).toThrow('dia inválido')
  })

  it('aceita 29 de fevereiro em ano bissexto', () => {
    expect(inicioDoDiaUTC('2024-02-29').toISOString()).toBe('2024-02-29T03:00:00.000Z')
  })

  it('usa o offset do horário de verão histórico (-02:00), não o atual', () => {
    expect(inicioDoDiaUTC('2018-01-15').toISOString()).toBe('2018-01-15T02:00:00.000Z')
  })
})
