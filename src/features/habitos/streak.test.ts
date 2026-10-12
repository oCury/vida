import { describe, expect, it } from 'vitest'
import { calcularStreak } from './streak'

const HOJE = '2026-10-12'

describe('calcularStreak', () => {
  it('hoje sem registro NÃO quebra o streak — o dia não acabou', () => {
    expect(calcularStreak(['2026-10-11', '2026-10-10', '2026-10-09'], HOJE)).toBe(3)
  })

  it('hoje registrado soma ao streak', () => {
    expect(calcularStreak(['2026-10-12', '2026-10-11', '2026-10-10'], HOJE)).toBe(3)
  })

  it('ontem sem registro quebra o streak', () => {
    expect(calcularStreak(['2026-10-10', '2026-10-09'], HOJE)).toBe(0)
  })

  it('conta apenas a sequência mais recente quando há buraco', () => {
    expect(
      calcularStreak(['2026-10-11', '2026-10-10', '2026-10-07', '2026-10-06'], HOJE),
    ).toBe(2)
  })

  it('sem nenhum registro devolve zero', () => {
    expect(calcularStreak([], HOJE)).toBe(0)
  })

  it('só hoje registrado devolve 1', () => {
    expect(calcularStreak(['2026-10-12'], HOJE)).toBe(1)
  })

  it('não se confunde com datas duplicadas', () => {
    expect(calcularStreak(['2026-10-11', '2026-10-11', '2026-10-10'], HOJE)).toBe(2)
  })

  it('não se confunde com a ordem do array', () => {
    expect(calcularStreak(['2026-10-09', '2026-10-11', '2026-10-10'], HOJE)).toBe(3)
  })

  it('atravessa a virada de mês', () => {
    expect(calcularStreak(['2026-10-01', '2026-09-30', '2026-09-29'], '2026-10-02')).toBe(3)
  })
})
