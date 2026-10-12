import { describe, expect, it } from 'vitest'
import { whereSeguro } from './where'

describe('whereSeguro', () => {
  it('devolve o filtro quando todos os campos têm valor', () => {
    expect(whereSeguro({ id: 'abc' })).toEqual({ id: 'abc' })
  })

  it('estoura quando um campo é undefined, em vez de virar filtro vazio', () => {
    expect(() => whereSeguro({ id: undefined })).toThrow('where inseguro: id')
  })

  it('estoura quando o filtro está vazio', () => {
    expect(() => whereSeguro({})).toThrow('where inseguro: vazio')
  })

  it('aceita null, que é um filtro legítimo', () => {
    expect(whereSeguro({ categoriaId: null })).toEqual({ categoriaId: null })
  })

  it('inspeciona um nível de objeto aninhado', () => {
    expect(() => whereSeguro({ habitoId_data: { habitoId: 'x', data: undefined } })).toThrow(
      'where inseguro: habitoId_data.data',
    )
  })

  it('aceita array como valor, que é filtro legítimo do Prisma (in)', () => {
    expect(whereSeguro({ pluggyTxId: { in: ['a', 'b'] } })).toEqual({
      pluggyTxId: { in: ['a', 'b'] },
    })
  })
})
