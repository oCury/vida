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

  it('aceita hábito booleano com valor false', () => {
    expect(validarEntrada({ slug: 'treino', valor: false })).toEqual({
      slug: 'treino',
      valorBool: false,
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

  it('aceita zero, que é um valor legítimo (zero passo, zero página)', () => {
    expect(validarEntrada({ slug: 'passos', valor: 0 }).valorNum).toBe(0)
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

  it('rejeita slug vazio', () => {
    expect(() => validarEntrada({ slug: '', valor: true })).toThrow('slug obrigatório')
  })

  it('rejeita valor numérico não finito', () => {
    expect(() => validarEntrada({ slug: 'sono', valor: Number.NaN })).toThrow('valor inválido')
  })

  it('rejeita valor numérico negativo', () => {
    expect(() => validarEntrada({ slug: 'sono', valor: -1 })).toThrow('valor inválido')
  })

  it('rejeita Infinity', () => {
    expect(() => validarEntrada({ slug: 'sono', valor: Number.POSITIVE_INFINITY })).toThrow(
      'valor inválido',
    )
  })

  it('rejeita tipo de valor não suportado', () => {
    expect(() => validarEntrada({ slug: 'sono', valor: 'sete' })).toThrow('valor inválido')
  })
})
