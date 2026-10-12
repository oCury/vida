export type TransacaoResumo = {
  valor: number // negativo é gasto, positivo é entrada
  categoriaNome: string | null
  ignorada: boolean
}

export type TotalCategoria = { nome: string; total: number }

export type Resumo = {
  receita: number
  gasto: number
  sobra: number | null // null = nenhuma receita detectada, então não há sobra a afirmar
  porCategoria: TotalCategoria[]
}

const SEM_CATEGORIA = 'Outros'

/**
 * Fecha o mês.
 *
 * Transação `ignorada` fica fora de TODOS os totais — ela é movimentação
 * interna ou entrada que não é receita, e contá-la mentiria nas duas pontas.
 *
 * `sobra` é `null` quando não houve receita no período: afirmar "sobra de
 * -R$ 300" sugere déficit, quando a verdade é que o app ainda não sabe quanto
 * entrou. Mesma regra do saldo — `null` nunca vira zero.
 */
export function resumoDoMes(transacoes: readonly TransacaoResumo[]): Resumo {
  let receita = 0
  let gasto = 0
  const porCategoria = new Map<string, number>()

  for (const t of transacoes) {
    if (t.ignorada) continue

    if (t.valor >= 0) {
      receita += t.valor
      continue // entrada não entra no ranking de gasto
    }

    const valor = Math.abs(t.valor)
    gasto += valor
    const nome = t.categoriaNome ?? SEM_CATEGORIA
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + valor)
  }

  return {
    receita,
    gasto,
    sobra: receita > 0 ? receita - gasto : null,
    porCategoria: [...porCategoria]
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total),
  }
}
