import { describe, expect, it } from 'vitest'
import { classificar, type Regra } from './classificar'

const regra = (padrao: string, categoriaId: string | null, ignorar = false): Regra => ({
  padrao,
  categoriaId,
  ignorar,
  criadaEm: new Date('2026-01-01'),
})

describe('classificar', () => {
  it('usa a regra própria quando a descrição casa', () => {
    expect(
      classificar({ descricao: 'IFOOD *PEDIDO', categoriaOrig: 'Food and drinks' }, [
        regra('IFOOD', 'cat-delivery'),
      ]),
    ).toEqual({ categoriaId: 'cat-delivery', ignorar: false, origem: 'REGRA' })
  })

  it('cai na categoria da Pluggy quando nenhuma regra casa', () => {
    expect(classificar({ descricao: 'PADARIA', categoriaOrig: 'Food and drinks' }, [])).toEqual({
      categoriaId: null,
      ignorar: false,
      origem: 'PLUGGY',
    })
  })

  it('devolve nada quando não há regra nem categoria da Pluggy', () => {
    expect(classificar({ descricao: 'XPTO', categoriaOrig: null }, [])).toEqual({
      categoriaId: null,
      ignorar: false,
      origem: 'NENHUMA',
    })
  })

  it('casa sem diferenciar maiúsculas', () => {
    expect(
      classificar({ descricao: 'ifood pedido', categoriaOrig: null }, [
        regra('IFOOD', 'cat-delivery'),
      ]).categoriaId,
    ).toBe('cat-delivery')
  })

  it('regra de ignorar marca ignorada e não devolve categoria', () => {
    expect(
      classificar({ descricao: 'PIX MARIA', categoriaOrig: 'Transfers' }, [
        regra('PIX MARIA', null, true),
      ]),
    ).toEqual({ categoriaId: null, ignorar: true, origem: 'REGRA' })
  })

  it('entre duas regras que casam, a mais recente ganha', () => {
    const antiga = { ...regra('MERCADO', 'cat-mercado'), criadaEm: new Date('2026-01-01') }
    const nova = { ...regra('MERCADO', 'cat-lazer'), criadaEm: new Date('2026-06-01') }
    expect(
      classificar({ descricao: 'MERCADO X', categoriaOrig: null }, [antiga, nova]).categoriaId,
    ).toBe('cat-lazer')
  })

  it('a ordem do array não altera o resultado — quem decide é criadaEm', () => {
    const antiga = { ...regra('MERCADO', 'cat-mercado'), criadaEm: new Date('2026-01-01') }
    const nova = { ...regra('MERCADO', 'cat-lazer'), criadaEm: new Date('2026-06-01') }
    expect(
      classificar({ descricao: 'MERCADO X', categoriaOrig: null }, [nova, antiga]).categoriaId,
    ).toBe('cat-lazer')
  })

  it('ignora regra de padrão vazio, que casaria com tudo', () => {
    expect(classificar({ descricao: 'QUALQUER', categoriaOrig: null }, [regra('', 'cat-x')]).origem)
      .toBe('NENHUMA')
  })

  it('não altera a lista de regras recebida', () => {
    const regras = [
      { ...regra('A', 'cat-a'), criadaEm: new Date('2026-01-01') },
      { ...regra('B', 'cat-b'), criadaEm: new Date('2026-06-01') },
    ]
    classificar({ descricao: 'A E B', categoriaOrig: null }, regras)
    expect(regras[0]?.padrao).toBe('A')
  })
})
