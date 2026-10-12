import { describe, expect, it } from 'vitest'
import { padraoDe } from './padrao'

describe('padraoDe', () => {
  it('pega as duas primeiras palavras em maiúsculas', () => {
    expect(padraoDe('IFOOD *PEDIDO 4821')).toBe('IFOOD *PEDIDO')
  })

  it('funciona com descrição de uma palavra só', () => {
    expect(padraoDe('UBER')).toBe('UBER')
  })

  it('normaliza espaço repetido e sobrando', () => {
    expect(padraoDe('  PIX   MARIA SILVA ')).toBe('PIX MARIA')
  })

  it('devolve maiúsculas mesmo vindo minúsculo', () => {
    expect(padraoDe('mercado pague menos')).toBe('MERCADO PAGUE')
  })

  it('não distingue a pessoa quando só há PIX — por isso duas palavras, não uma', () => {
    expect(padraoDe('PIX MARIA')).not.toBe(padraoDe('PIX JOAO'))
  })
})
