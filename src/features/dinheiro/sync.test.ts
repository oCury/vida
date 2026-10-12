import { describe, expect, it } from 'vitest'
import { janelaDeBusca, separarNovas } from './sync'
import type { TransacaoDominio } from './tipos'

const tx = (id: string): TransacaoDominio => ({
  pluggyTxId: id,
  pluggyAccountId: 'acc-1',
  data: new Date('2026-10-11T00:00:00Z'),
  descricao: 'teste',
  valor: -10,
  categoriaOrig: null,
})

describe('janelaDeBusca', () => {
  it('no primeiro sync busca 365 dias, que é o histórico que a Pluggy entrega', () => {
    const agora = new Date('2026-10-12T06:00:00Z')
    expect(janelaDeBusca(null, agora).toISOString().slice(0, 10)).toBe('2025-10-12')
  })

  it('no sync incremental volta até o último sync MAIS 10 dias de folga', () => {
    const agora = new Date('2026-10-12T06:00:00Z')
    // último sync 1 dia atrás → 1 + 10 de folga = 11 dias
    const desde = janelaDeBusca(new Date('2026-10-11T06:00:00Z'), agora)
    expect(desde.toISOString().slice(0, 10)).toBe('2026-10-01')
  })

  it('a folga cobre a janela de 7 dias do Pluggy com margem, mesmo no caso mais curto', () => {
    const agora = new Date('2026-10-12T06:00:00Z')
    const desde = janelaDeBusca(new Date('2026-10-12T05:00:00Z'), agora)
    const diasCobertos = (agora.getTime() - desde.getTime()) / 86_400_000
    expect(diasCobertos).toBeGreaterThan(7)
  })

  it('se o último sync é antigo, volta até ele e não só 10 dias', () => {
    const agora = new Date('2026-10-12T06:00:00Z')
    const desde = janelaDeBusca(new Date('2026-08-01T06:00:00Z'), agora)
    expect(desde.toISOString().slice(0, 10)).toBe('2026-07-22')
  })

  it('nunca devolve uma janela no futuro, mesmo se o último sync estiver adiantado', () => {
    const agora = new Date('2026-10-12T06:00:00Z')
    const desde = janelaDeBusca(new Date('2026-10-20T06:00:00Z'), agora)
    expect(desde.getTime()).toBeLessThanOrEqual(agora.getTime())
  })
})

describe('separarNovas', () => {
  it('descarta as que já existem pelo pluggyTxId', () => {
    const recebidas = [tx('a'), tx('b'), tx('c')]
    expect(separarNovas(recebidas, new Set(['b'])).map((t) => t.pluggyTxId)).toEqual(['a', 'c'])
  })

  it('não duplica quando a mesma transação chega duas vezes na mesma resposta', () => {
    expect(separarNovas([tx('a'), tx('a')], new Set())).toHaveLength(1)
  })

  it('devolve lista vazia quando tudo já é conhecido', () => {
    expect(separarNovas([tx('a')], new Set(['a']))).toEqual([])
  })

  it('não altera a lista recebida', () => {
    const recebidas = [tx('a'), tx('b')]
    separarNovas(recebidas, new Set(['a']))
    expect(recebidas).toHaveLength(2)
  })
})
