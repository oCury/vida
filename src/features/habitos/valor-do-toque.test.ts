import { describe, expect, it } from 'vitest'
import { valorDoToque } from './valor-do-toque'

describe('valorDoToque', () => {
  it('campo ausente significa "fiz" — o botão sim/não não manda valor', () => {
    expect(valorDoToque(null)).toBeUndefined()
  })

  it('campo vazio também significa "fiz"', () => {
    expect(valorDoToque('')).toBeUndefined()
  })

  it('chip numérico vira número', () => {
    expect(valorDoToque('7')).toBe(7)
  })

  it('chip decimal vira número', () => {
    expect(valorDoToque('7.5')).toBe(7.5)
  })

  it('zero vira zero, não ausência — zero passo é informação', () => {
    expect(valorDoToque('0')).toBe(0)
  })

  it('texto que não é número volta como texto, para a validação recusar', () => {
    expect(valorDoToque('sete')).toBe('sete')
  })
})
