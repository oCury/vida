export type TipoContaSimples = 'CORRENTE' | 'CREDITO'

export type ParaDetectar = {
  descricao: string
  valor: number
  tipoConta: TipoContaSimples
}

/** Débito na conta corrente que quita a fatura do próprio cartão. */
const PADROES_PAGA_FATURA = ['PAGAMENTO DE FATURA', 'PAGAMENTO FATURA']

/** O outro lado: o crédito que aparece no extrato do cartão. */
const PADROES_FATURA_PAGA = ['PAGAMENTO RECEBIDO', 'PAGAMENTO DE FATURA']

/** Dinheiro indo ou voltando de investimento do próprio titular. */
const PADROES_INVESTIMENTO = ['APLICACAO', 'RESGATE']

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acento
    .toUpperCase()
}

function casaAlgum(descricao: string, padroes: readonly string[]): boolean {
  return padroes.some((p) => descricao.includes(p))
}

/**
 * Diz se o lançamento é movimentação entre contas do próprio titular, e
 * portanto não é gasto nem receita.
 *
 * O pagamento da fatura tem DOIS lados: o débito na conta corrente e o crédito
 * correspondente no extrato do cartão. Ignorar só o débito faria o crédito
 * entrar como RECEITA — e receita inflada deixa o "posso gastar hoje"
 * otimista, que é o erro mais perigoso deste app. O mesmo vale para resgate de
 * investimento, que chega como crédito e seria contado como salário.
 *
 * Conservador de propósito nas duas pontas: cada padrão só vale no tipo de
 * conta e no sinal onde ele realmente ocorre. Falso-positivo aqui esconderia
 * gasto ou receita verdadeiros.
 */
export function detectarTransferenciaInterna(
  tx: ParaDetectar,
  contasDaConexao: readonly { tipo: TipoContaSimples }[],
): boolean {
  const descricao = normalizar(tx.descricao)

  // Aplicação e resgate não dependem de haver cartão, e ocorrem nos dois sinais.
  if (casaAlgum(descricao, PADROES_INVESTIMENTO)) return true

  const temCartao = contasDaConexao.some((c) => c.tipo === 'CREDITO')
  if (!temCartao) return false

  // Lado da conta: débito que sai para quitar a fatura.
  if (tx.tipoConta === 'CORRENTE' && tx.valor < 0) {
    return casaAlgum(descricao, PADROES_PAGA_FATURA)
  }

  // Lado do cartão: crédito que registra a fatura quitada.
  if (tx.tipoConta === 'CREDITO' && tx.valor > 0) {
    return casaAlgum(descricao, PADROES_FATURA_PAGA)
  }

  return false
}
