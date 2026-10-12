import { describe, expect, it } from 'vitest'
import { lerItemIds, mapearConexao, mapearConta, mapearTransacao } from './pluggy-client'

describe('mapearConta', () => {
  it('classifica conta corrente e preserva o saldo', () => {
    const conta = mapearConta({
      id: 'acc-1',
      itemId: 'item-1',
      name: 'Conta',
      type: 'BANK',
      balance: 1234.56,
      creditData: null,
    })
    expect(conta).toEqual({
      pluggyAccountId: 'acc-1',
      pluggyItemId: 'item-1',
      nome: 'Conta',
      tipo: 'CORRENTE',
      saldo: 1234.56,
      limite: null,
    })
  })

  it('classifica cartão de crédito e lê o limite', () => {
    const conta = mapearConta({
      id: 'acc-2',
      itemId: 'item-1',
      name: 'Cartão',
      type: 'CREDIT',
      balance: 300,
      creditData: { creditLimit: 5000 },
    })
    expect(conta.tipo).toBe('CREDITO')
    expect(conta.limite).toBe(5000)
  })

  it('grava saldo null, nunca zero, quando a Pluggy não informa', () => {
    const conta = mapearConta({
      id: 'acc-3',
      itemId: 'item-1',
      name: 'Conta',
      type: 'BANK',
      balance: null,
      creditData: null,
    })
    expect(conta.saldo).toBeNull()
  })
})

describe('mapearTransacao', () => {
  it('mapeia os campos e preserva o sinal do valor', () => {
    const tx = mapearTransacao({
      id: 'tx-1',
      accountId: 'acc-1',
      date: '2026-10-11T00:00:00.000Z',
      description: 'IFOOD *PEDIDO',
      amount: -48.9,
      category: 'Food and drinks',
    })
    expect(tx).toEqual({
      pluggyTxId: 'tx-1',
      pluggyAccountId: 'acc-1',
      data: new Date('2026-10-11T00:00:00.000Z'),
      descricao: 'IFOOD *PEDIDO',
      valor: -48.9,
      categoriaOrig: 'Food and drinks',
    })
  })

  it('aceita transação sem categoria', () => {
    const tx = mapearTransacao({
      id: 'tx-2',
      accountId: 'acc-1',
      date: '2026-10-11T00:00:00.000Z',
      description: 'PIX',
      amount: 100,
      category: null,
    })
    expect(tx.categoriaOrig).toBeNull()
  })
})

describe('mapearConexao', () => {
  it('lê o nome da instituição do connector', () => {
    expect(mapearConexao({ id: 'item-1', status: 'UPDATED', connector: { name: 'Nubank' } })).toEqual(
      { pluggyItemId: 'item-1', instituicao: 'Nubank', status: 'UPDATED' },
    )
  })

  it('não quebra quando o connector não vem', () => {
    expect(mapearConexao({ id: 'item-2', status: 'LOGIN_ERROR' }).instituicao).toBe('desconhecida')
  })

  it('preserva status de erro, que é o que dispara o alerta de reconectar', () => {
    expect(mapearConexao({ id: 'item-3', status: 'LOGIN_ERROR' }).status).toBe('LOGIN_ERROR')
  })
})

describe('lerItemIds', () => {
  it('lê um único id', () => {
    expect(lerItemIds('item-1')).toEqual(['item-1'])
  })

  it('lê vários ids separados por vírgula, ignorando espaços', () => {
    expect(lerItemIds(' item-1 , item-2 ')).toEqual(['item-1', 'item-2'])
  })

  it('descarta entradas vazias de vírgula sobrando', () => {
    expect(lerItemIds('item-1,,')).toEqual(['item-1'])
  })

  it('estoura quando não há id configurado, em vez de sincronizar nada em silêncio', () => {
    expect(() => lerItemIds(undefined)).toThrow('PLUGGY_ITEM_IDS é obrigatório')
  })

  it('estoura quando a variável tem só espaços', () => {
    expect(() => lerItemIds('   ')).toThrow('PLUGGY_ITEM_IDS é obrigatório')
  })
})
