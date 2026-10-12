export type Degrau = { nome: string; valorAlvo: number }

export type Progresso = {
  degrau: string
  atual: number
  alvo: number
  percentual: number
}

/**
 * Qual degrau da reserva está em jogo, e o quanto dele já foi vencido.
 *
 * Os degraus são escalonados (R$ 500 → R$ 1.500 → um mês de despesa) porque
 * uma meta única de "6x despesas" deixaria a barra parada em 0% por um ano.
 *
 * Devolve `null` quando nenhuma conta foi marcada como reserva: mostrar 0% de
 * um alvo seria inventar uma meta que o usuário não escolheu, e dar a impressão
 * de que o app sabe algo que não sabe.
 */
export function progressoReserva(
  saldoReserva: number | null,
  degraus: readonly Degrau[],
): Progresso | null {
  if (saldoReserva === null) return null
  if (degraus.length === 0) return null

  const ordenados = [...degraus].sort((a, b) => a.valorAlvo - b.valorAlvo)
  const ativo = ordenados.find((d) => saldoReserva < d.valorAlvo) ?? ordenados[ordenados.length - 1]
  if (!ativo) return null

  return {
    degrau: ativo.nome,
    atual: saldoReserva,
    alvo: ativo.valorAlvo,
    percentual: Math.min(100, Math.round((saldoReserva / ativo.valorAlvo) * 100)),
  }
}
