import { beforeEach, describe, expect, it } from 'vitest'
import { assinarSessao, verificarSessao } from './sessao'

const SEGREDO = 'segredo-de-teste-com-pelo-menos-32-caracteres'

beforeEach(() => {
  process.env.AUTH_SECRET = SEGREDO
})

describe('assinarSessao / verificarSessao', () => {
  it('aceita um token que ela mesma assinou', async () => {
    expect(await verificarSessao(await assinarSessao())).toBe(true)
  })

  it('rejeita token adulterado', async () => {
    const token = await assinarSessao()
    expect(await verificarSessao(`${token.slice(0, -2)}xx`)).toBe(false)
  })

  it('rejeita token ausente', async () => {
    expect(await verificarSessao(undefined)).toBe(false)
  })

  it('rejeita lixo que não é JWT', async () => {
    expect(await verificarSessao('nao-e-um-jwt')).toBe(false)
  })

  it('rejeita token assinado com outro segredo', async () => {
    const token = await assinarSessao()
    process.env.AUTH_SECRET = 'outro-segredo-com-pelo-menos-32-caracteres!'
    expect(await verificarSessao(token)).toBe(false)
  })

  it('estoura se AUTH_SECRET for curto demais, em vez de assinar fraco', async () => {
    process.env.AUTH_SECRET = 'curto'
    await expect(assinarSessao()).rejects.toThrow('AUTH_SECRET')
  })
})
