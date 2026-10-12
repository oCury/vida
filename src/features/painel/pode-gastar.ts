import { diaLocal } from '@/lib/dia'

/**
 * Quantos dias faltam no mês, incluindo hoje.
 *
 * Inclui hoje porque é o divisor de "posso gastar hoje": no dia 31 o usuário
 * ainda pode gastar, então dividir por zero (ou por 0 dias restantes) seria
 * errado em vez de conservador.
 */
export function diasRestantesNoMes(agora: Date): number {
  const [ano, mes, dia] = diaLocal(agora).split('-').map(Number)
  if (!ano || !mes || !dia) throw new Error('data inválida')
  // Dia 0 do mês seguinte é o último dia deste mês.
  const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  return diasNoMes - dia + 1
}

/**
 * O número herói: quanto dá para gastar hoje sem furar o mês.
 *
 * É o único número do app que muda comportamento no momento da compra — os
 * outros explicam o passado.
 *
 * Devolve `null` quando não há sobra conhecida. Mostrar um número aqui sem
 * saber a receita seria o erro mais perigoso do app: autorizar gasto que não
 * existe.
 */
export function podeGastarHoje(sobra: number | null, diasRestantes: number): number | null {
  if (sobra === null) return null
  if (diasRestantes <= 0) return null
  return sobra / diasRestantes
}
