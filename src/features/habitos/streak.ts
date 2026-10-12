const MS_POR_DIA = 86_400_000

function diaAnterior(dia: string): string {
  const [ano, mes, d] = dia.split('-').map(Number)
  if (!ano || !mes || !d) throw new Error(`dia inválido: ${dia}`)
  return new Date(Date.UTC(ano, mes - 1, d) - MS_POR_DIA).toISOString().slice(0, 10)
}

/**
 * Dias consecutivos de um hábito, contando para trás.
 *
 * **Hoje não conta como quebra.** Se às 10h da manhã o streak mostrasse `0`
 * porque o treino ainda não aconteceu, o usuário abriria o app e veria
 * fracasso num dia que não terminou — e o app que deveria sustentar o hábito
 * passaria a desencorajá-lo.
 *
 * Então a contagem começa em hoje se houver registro, e em ontem caso não haja.
 *
 * @param diasComRegistro dias no formato YYYY-MM-DD, em qualquer ordem
 * @param hoje dia local de referência, YYYY-MM-DD
 */
export function calcularStreak(diasComRegistro: readonly string[], hoje: string): number {
  const registrados = new Set(diasComRegistro)
  if (registrados.size === 0) return 0

  let cursor = registrados.has(hoje) ? hoje : diaAnterior(hoje)
  let streak = 0

  while (registrados.has(cursor)) {
    streak += 1
    cursor = diaAnterior(cursor)
  }
  return streak
}
