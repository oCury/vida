import { describe, expect, it } from 'vitest'
import { habitosPendentes } from './pendentes'

const def = (slug: string, fonte: 'MANUAL' | 'SAUDE' = 'MANUAL', ativo = true) => ({
  id: slug,
  slug,
  nome: slug,
  fonte,
  ativo,
})

describe('habitosPendentes', () => {
  it('lista o hábito manual sem registro hoje', () => {
    expect(habitosPendentes([def('treino')], new Set()).map((h) => h.slug)).toEqual(['treino'])
  })

  it('não lista o que já foi registrado', () => {
    expect(habitosPendentes([def('treino')], new Set(['treino']))).toEqual([])
  })

  it('ignora hábito do app Saúde — ele chega sozinho, lembrar seria ruído', () => {
    expect(habitosPendentes([def('passos', 'SAUDE')], new Set())).toEqual([])
  })

  it('ignora hábito arquivado', () => {
    expect(habitosPendentes([def('antigo', 'MANUAL', false)], new Set())).toEqual([])
  })

  it('devolve vazio quando tudo está registrado, para não enviar push inútil', () => {
    expect(habitosPendentes([def('a'), def('b')], new Set(['a', 'b']))).toEqual([])
  })
})
