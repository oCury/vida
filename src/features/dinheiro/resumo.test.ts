import { describe, expect, it } from 'vitest'
import { resumoDoMes, type TransacaoResumo } from './resumo'

const tx = (p: Partial<TransacaoResumo>): TransacaoResumo => ({
  valor: -100,
  categoriaNome: 'Mercado',
  ignorada: false,
  ...p,
})

describe('resumoDoMes', () => {
  it('soma receita e gasto separadamente', () => {
    const r = resumoDoMes([tx({ valor: 5000, categoriaNome: 'Salário' }), tx({ valor: -300 })])
    expect(r.receita).toBe(5000)
    expect(r.gasto).toBe(300)
    expect(r.sobra).toBe(4700)
  })

  it('exclui transação ignorada de TODOS os totais', () => {
    const r = resumoDoMes([
      tx({ valor: 5000, categoriaNome: 'Salário' }),
      tx({ valor: -1200, ignorada: true }),
      tx({ valor: -300 }),
    ])
    expect(r.gasto).toBe(300)
    expect(r.porCategoria.find((c) => c.nome === 'Mercado')?.total).toBe(300)
  })

  it('devolve sobra null quando não houve receita, em vez de negativo enganoso', () => {
    const r = resumoDoMes([tx({ valor: -300 })])
    expect(r.receita).toBe(0)
    expect(r.sobra).toBeNull()
  })

  it('ordena o ranking por valor decrescente', () => {
    const r = resumoDoMes([
      tx({ valor: -100, categoriaNome: 'Mercado' }),
      tx({ valor: -500, categoriaNome: 'Delivery' }),
      tx({ valor: -300, categoriaNome: 'Transporte' }),
    ])
    expect(r.porCategoria.map((c) => c.nome)).toEqual(['Delivery', 'Transporte', 'Mercado'])
  })

  it('agrupa várias transações da mesma categoria', () => {
    expect(resumoDoMes([tx({ valor: -100 }), tx({ valor: -50 })]).porCategoria).toEqual([
      { nome: 'Mercado', total: 150 },
    ])
  })

  it('transação sem categoria cai em Outros', () => {
    expect(resumoDoMes([tx({ valor: -80, categoriaNome: null })]).porCategoria).toEqual([
      { nome: 'Outros', total: 80 },
    ])
  })

  it('mês vazio devolve vazio e sobra null, não zeros', () => {
    expect(resumoDoMes([])).toEqual({ receita: 0, gasto: 0, sobra: null, porCategoria: [] })
  })

  it('receita não entra no ranking de gasto', () => {
    const r = resumoDoMes([tx({ valor: 5000, categoriaNome: 'Salário' }), tx({ valor: -100 })])
    expect(r.porCategoria.map((c) => c.nome)).toEqual(['Mercado'])
  })

  it('gasto maior que receita devolve sobra negativa, não null', () => {
    const r = resumoDoMes([tx({ valor: 1000, categoriaNome: 'Salário' }), tx({ valor: -1500 })])
    expect(r.sobra).toBe(-500)
  })
})
