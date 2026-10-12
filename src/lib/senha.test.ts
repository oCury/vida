import { describe, expect, it } from 'vitest'
import { hash, verificarSenha } from './senha'

describe('hash / verificarSenha', () => {
  it('aceita a senha correta', async () => {
    process.env.APP_PASSWORD_HASH = await hash('senha-correta')
    expect(await verificarSenha('senha-correta')).toBe(true)
  })

  it('rejeita senha errada', async () => {
    process.env.APP_PASSWORD_HASH = await hash('senha-correta')
    expect(await verificarSenha('senha-errada')).toBe(false)
  })

  it('rejeita senha errada de tamanho diferente', async () => {
    process.env.APP_PASSWORD_HASH = await hash('senha-correta')
    expect(await verificarSenha('x')).toBe(false)
  })

  it('gera sal diferente a cada chamada, então o mesmo texto dá hashes distintos', async () => {
    expect(await hash('igual')).not.toBe(await hash('igual'))
  })

  it('estoura quando APP_PASSWORD_HASH está ausente', async () => {
    process.env.APP_PASSWORD_HASH = ''
    await expect(verificarSenha('qualquer')).rejects.toThrow('APP_PASSWORD_HASH')
  })

  it('estoura quando APP_PASSWORD_HASH está malformado', async () => {
    process.env.APP_PASSWORD_HASH = 'lixo-sem-formato'
    await expect(verificarSenha('qualquer')).rejects.toThrow('malformado')
  })
})
