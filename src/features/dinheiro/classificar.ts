export type Regra = {
  padrao: string
  categoriaId: string | null
  ignorar: boolean
  criadaEm: Date
}

export type ParaClassificar = {
  descricao: string
  categoriaOrig: string | null
}

export type OrigemClassificacao = 'REGRA' | 'PLUGGY' | 'NENHUMA'

export type Classificacao = {
  categoriaId: string | null
  ignorar: boolean
  origem: OrigemClassificacao
}

/**
 * Decide a categoria de uma transação.
 *
 * Precedência: regra própria → categoria da Pluggy → nenhuma. A categoria da
 * Pluggy é o ponto de partida para nenhuma tela nascer vazia, e a regra do
 * usuário sempre manda mais.
 *
 * Entre regras que casam, a MAIS RECENTE ganha — determinístico e explicável.
 * A alternativa ("a mais específica ganha") exigiria definir especificidade e
 * surpreenderia mais.
 */
export function classificar(tx: ParaClassificar, regras: readonly Regra[]): Classificacao {
  const descricao = tx.descricao.toUpperCase()

  const vencedora = regras
    // Padrão vazio casaria com toda transação: não é regra, é acidente.
    .filter((r) => r.padrao.length > 0 && descricao.includes(r.padrao.toUpperCase()))
    // Cópia antes de ordenar: `sort` muta, e a lista vem de quem chamou.
    .slice()
    .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime())[0]

  if (vencedora) {
    return {
      categoriaId: vencedora.ignorar ? null : vencedora.categoriaId,
      ignorar: vencedora.ignorar,
      origem: 'REGRA',
    }
  }

  return {
    categoriaId: null,
    ignorar: false,
    origem: tx.categoriaOrig ? 'PLUGGY' : 'NENHUMA',
  }
}
