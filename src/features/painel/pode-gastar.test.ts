import { describe, expect, it } from 'vitest'
import { diasRestantesNoMes, podeGastarHoje } from './pode-gastar'

describe('diasRestantesNoMes', () => {
  it('inclui hoje na contagem', () => {
    // 12 de outubro: restam 20 dias (12 a 31)
    expect(diasRestantesNoMes(new Date('2026-10-12T15:00:00Z'))).toBe(20)
  })

  it('no último dia do mês devolve 1, não 0', () => {
    expect(diasRestantesNoMes(new Date('2026-01-31T15:00:00Z'))).toBe(1)
  })

  it('no primeiro dia devolve o mês inteiro', () => {
    expect(diasRestantesNoMes(new Date('2026-04-01T15:00:00Z'))).toBe(30)
  })

  it('conta fevereiro bissexto corretamente', () => {
    expect(diasRestantesNoMes(new Date('2024-02-01T15:00:00Z'))).toBe(29)
  })

  it('usa o dia de Brasília, não o de UTC', () => {
    // 2026-10-31T23:30-03:00 === 2026-11-01T02:30Z. Em Brasília ainda é dia 31.
    expect(diasRestantesNoMes(new Date('2026-11-01T02:30:00Z'))).toBe(1)
  })
})

describe('podeGastarHoje', () => {
  it('divide a sobra pelos dias restantes', () => {
    expect(podeGastarHoje(2000, 20)).toBe(100)
  })

  it('devolve null quando a sobra é null, nunca um número inventado', () => {
    expect(podeGastarHoje(null, 20)).toBeNull()
  })

  it('devolve negativo quando a sobra é negativa, em vez de esconder em zero', () => {
    expect(podeGastarHoje(-300, 10)).toBe(-30)
  })

  it('devolve null quando não há dias restantes, em vez de dividir por zero', () => {
    expect(podeGastarHoje(1000, 0)).toBeNull()
  })

  it('sobra zero devolve zero, que é informação verdadeira', () => {
    expect(podeGastarHoje(0, 5)).toBe(0)
  })
})
