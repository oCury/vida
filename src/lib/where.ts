/**
 * Valida um filtro antes de entregá-lo ao Prisma.
 *
 * O Prisma **ignora** chaves com valor `undefined`. Num `where`, isso
 * transforma uma operação condicional em operação sobre a tabela inteira —
 * um `delete` condicional vira `deleteMany({})`. Já aconteceu neste histórico.
 *
 * `null` é permitido, porque é um filtro legítimo ("campo é nulo").
 */
export function whereSeguro<T extends Record<string, unknown>>(filtro: T): T {
  const chaves = Object.keys(filtro)
  if (chaves.length === 0) throw new Error('where inseguro: vazio')

  for (const chave of chaves) {
    const valor = filtro[chave]
    if (valor === undefined) throw new Error(`where inseguro: ${chave}`)
    if (valor !== null && typeof valor === 'object' && !Array.isArray(valor)) {
      for (const [sub, subValor] of Object.entries(valor as Record<string, unknown>)) {
        if (subValor === undefined) throw new Error(`where inseguro: ${chave}.${sub}`)
      }
    }
  }
  return filtro
}
