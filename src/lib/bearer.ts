import { timingSafeEqual } from 'node:crypto'

const PREFIXO = 'Bearer '

/**
 * Compara o header Authorization com o token esperado em tempo constante.
 *
 * Comparar com `===` vazaria o token pelo tempo de resposta: a comparação de
 * strings do JS sai no primeiro byte diferente, então um atacante descobre o
 * segredo byte a byte medindo latência.
 */
export function bearerValido(header: string | null, esperado: string): boolean {
  if (!esperado) return false
  if (!header?.startsWith(PREFIXO)) return false

  const recebido = Buffer.from(header.slice(PREFIXO.length))
  const alvo = Buffer.from(esperado)
  // timingSafeEqual estoura com tamanhos diferentes, e o tamanho não é segredo.
  if (recebido.length !== alvo.length) return false
  return timingSafeEqual(recebido, alvo)
}
