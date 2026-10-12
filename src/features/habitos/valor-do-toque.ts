/**
 * Interpreta o valor que vem de um toque na tela.
 *
 * Um `FormData` só carrega texto. Botão sim/não não manda campo nenhum
 * (ausência significa "fiz"), e chip manda o número como string.
 */
export function valorDoToque(bruto: FormDataEntryValue | null): number | undefined | string {
  if (bruto === null || bruto === '') return undefined
  const texto = String(bruto)
  const numero = Number(texto)
  return Number.isNaN(numero) ? texto : numero
}
