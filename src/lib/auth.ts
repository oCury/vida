import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { SignJWT, jwtVerify } from 'jose'

const scrypt = promisify(scryptCb) as (
  senha: string,
  sal: Buffer,
  tamanho: number,
) => Promise<Buffer>

export const COOKIE_SESSAO = 'vida_sessao'
export const DIAS_DE_SESSAO = 90

const TAMANHO_SAL = 16
const TAMANHO_HASH = 64
const MINIMO_SEGREDO = 32

function segredo(): Uint8Array {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < MINIMO_SEGREDO) {
    throw new Error(`AUTH_SECRET ausente ou com menos de ${MINIMO_SEGREDO} caracteres`)
  }
  return new TextEncoder().encode(s)
}

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

export async function assinarSessao(): Promise<string> {
  const chave = segredo()
  return new SignJWT({ sub: 'dono' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DIAS_DE_SESSAO}d`)
    .sign(chave)
}

export async function verificarSessao(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    await jwtVerify(token, segredo())
    return true
  } catch {
    return false
  }
}
