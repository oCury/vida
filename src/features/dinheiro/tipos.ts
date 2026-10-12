export type TipoContaDominio = 'CORRENTE' | 'CREDITO'

export type ConexaoDominio = {
  pluggyItemId: string
  instituicao: string
  status: string
}

export type ContaDominio = {
  pluggyAccountId: string
  pluggyItemId: string
  nome: string
  tipo: TipoContaDominio
  saldo: number | null // null = desconhecido, nunca 0
  limite: number | null
}

export type TransacaoDominio = {
  pluggyTxId: string
  pluggyAccountId: string
  data: Date
  descricao: string
  valor: number
  categoriaOrig: string | null
}

/** Porta que o sync consome. O Pluggy é só uma implementação dela. */
export interface FonteFinanceira {
  listarConexoes(): Promise<ConexaoDominio[]>
  listarContas(pluggyItemId: string): Promise<ContaDominio[]>
  listarTransacoes(pluggyAccountId: string, desde: Date): Promise<TransacaoDominio[]>
}
