import { SignJWT, jwtVerify } from 'jose'

/**
 * Sessão do painel.
 *
 * Este módulo usa SOMENTE `jose`, de propósito: ele é importado pelo
 * `middleware.ts`, que roda no Edge Runtime, onde `node:crypto` não existe.
 * O hash de senha, que precisa de `node:crypto`, vive em `senha.ts` e nunca
 * pode ser importado daqui.
 */
export const COOKIE_SESSAO = 'vida_sessao'
export const DIAS_DE_SESSAO = 90

const MINIMO_SEGREDO = 32

function segredo(): Uint8Array {
  const s = process.env.AUTH_SECRET
  if (!s || s.length < MINIMO_SEGREDO) {
    throw new Error(`AUTH_SECRET ausente ou com menos de ${MINIMO_SEGREDO} caracteres`)
  }
  return new TextEncoder().encode(s)
}

export async function assinarSessao(): Promise<string> {
  return new SignJWT({ sub: 'dono' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DIAS_DE_SESSAO}d`)
    .sign(segredo())
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
