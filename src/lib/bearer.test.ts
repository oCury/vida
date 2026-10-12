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

  it('rejeita o prefixo com caixa diferente', () => {
    expect(bearerValido('bearer abc123', 'abc123')).toBe(false)
  })
})
