import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
) => Promise<Buffer>

const TAMANHO_SAL = 16
const TAMANHO_HASH = 64

/**
 * Hash de senha com scrypt do Node, sem dependência externa.
 *
 * Usa `node:crypto`, que NÃO existe no Edge Runtime — por isso este módulo é
 * separado de `sessao.ts` e nunca pode ser importado pelo `middleware.ts`.
 */

/** Gera o valor de APP_PASSWORD_HASH. Formato: scrypt$<salHex>$<hashHex> */
export async function hash(senha: string): Promise<string> {
  const sal = randomBytes(TAMANHO_SAL)
  const derivada = await scrypt(senha, sal, TAMANHO_HASH)
  return `scrypt$${sal.toString('hex')}$${derivada.toString('hex')}`
}

export async function verificarSenha(senha: string): Promise<boolean> {
  const guardado = process.env.APP_PASSWORD_HASH
  if (!guardado) throw new Error('APP_PASSWORD_HASH ausente')

  const [algo, salHex, hashHex] = guardado.split('$')
  if (algo !== 'scrypt' || !salHex || !hashHex) {
    throw new Error('APP_PASSWORD_HASH malformado')
  }

  const derivada = await scrypt(senha, Buffer.from(salHex, 'hex'), TAMANHO_HASH)
  const esperada = Buffer.from(hashHex, 'hex')
  // timingSafeEqual estoura com tamanhos diferentes; o tamanho não é segredo.
  if (derivada.length !== esperada.length) return false
  return timingSafeEqual(derivada, esperada)
}
