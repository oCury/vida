import { describe, expect, it } from 'vitest'
import { progressoReserva } from './reserva'

const DEGRAUS = [
  { nome: 'Primeiros R$ 500', valorAlvo: 500 },
  { nome: 'R$ 1.500', valorAlvo: 1500 },
  { nome: 'Um mês de despesa', valorAlvo: 4000 },
]

describe('progressoReserva', () => {
  it('devolve null quando nenhuma conta foi marcada como reserva', () => {
    expect(progressoReserva(null, DEGRAUS)).toBeNull()
  })

  it('no começo aponta o primeiro degrau', () => {
    expect(progressoReserva(100, DEGRAUS)).toEqual({
      degrau: 'Primeiros R$ 500',
      atual: 100,
      alvo: 500,
      percentual: 20,
    })
  })

  it('ao bater o primeiro degrau, pula para o segundo', () => {
    const r = progressoReserva(500, DEGRAUS)
    expect(r?.degrau).toBe('R$ 1.500')
    expect(r?.percentual).toBe(33)
  })

  it('acima de todos os degraus devolve 100% do último', () => {
    expect(progressoReserva(9999, DEGRAUS)).toEqual({
      degrau: 'Um mês de despesa',
      atual: 9999,
      alvo: 4000,
      percentual: 100,
    })
  })

  it('saldo zero com conta marcada mostra 0% do primeiro degrau, não null', () => {
    expect(progressoReserva(0, DEGRAUS)?.percentual).toBe(0)
  })

  it('devolve null quando não há degraus definidos', () => {
    expect(progressoReserva(100, [])).toBeNull()
  })

  it('arredonda o percentual para inteiro', () => {
    expect(progressoReserva(333, DEGRAUS)?.percentual).toBe(67)
  })
})
