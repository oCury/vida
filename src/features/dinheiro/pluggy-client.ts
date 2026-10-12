import { PluggyClient } from 'pluggy-sdk'
import type {
  ConexaoDominio,
  ContaDominio,
  FonteFinanceira,
  TransacaoDominio,
} from './tipos'

/** Formato bruto que nos interessa. Local de propósito: nada fora deste arquivo o conhece. */
type ContaBruta = {
  id: string
  itemId: string
  name: string
  type: string
  balance: number | null
  creditData?: { creditLimit?: number | null } | null
}

type TransacaoBruta = {
  id: string
  accountId: string
  date: string | Date
  description: string
  amount: number
  category?: string | null
}

export function mapearConta(bruta: ContaBruta): ContaDominio {
  return {
    pluggyAccountId: bruta.id,
    pluggyItemId: bruta.itemId,
    nome: bruta.name,
    tipo: bruta.type === 'CREDIT' ? 'CREDITO' : 'CORRENTE',
    saldo: bruta.balance ?? null,
    limite: bruta.creditData?.creditLimit ?? null,
  }
}

export function mapearTransacao(bruta: TransacaoBruta): TransacaoDominio {
  return {
    pluggyTxId: bruta.id,
    pluggyAccountId: bruta.accountId,
    data: new Date(bruta.date),
    descricao: bruta.description,
    valor: bruta.amount,
    categoriaOrig: bruta.category ?? null,
  }
}

export function criarFontePluggy(): FonteFinanceira {
  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET são obrigatórios')
  }
  const cliente = new PluggyClient({ clientId, clientSecret })

  return {
    async listarConexoes() {
      const itens = await cliente.fetchAllItems()
      return itens.map(
        (i): ConexaoDominio => ({
          pluggyItemId: i.id,
          instituicao: i.connector?.name ?? 'desconhecida',
          status: i.status,
        }),
      )
    },

    async listarContas(pluggyItemId) {
      const r = await cliente.fetchAccounts(pluggyItemId)
      return r.results.map(mapearConta)
    },

    async listarTransacoes(pluggyAccountId, desde) {
      const todas = await cliente.fetchAllTransactions(pluggyAccountId, {
        dateFrom: desde.toISOString().slice(0, 10),
      })
      return todas.map(mapearTransacao)
    },
  }
}
