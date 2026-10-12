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

/** Formato bruto do item (a "conexão" com a instituição). */
type ItemBruto = {
  id: string
  status: string
  connector?: { name?: string } | null
}

export function mapearConexao(bruto: ItemBruto): ConexaoDominio {
  return {
    pluggyItemId: bruto.id,
    instituicao: bruto.connector?.name ?? 'desconhecida',
    status: bruto.status,
  }
}

/** Lê os itemIds configurados. Ver comentário em `listarConexoes`. */
export function lerItemIds(bruto: string | undefined): string[] {
  const ids = (bruto ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  if (ids.length === 0) {
    throw new Error(
      'PLUGGY_ITEM_IDS é obrigatório: o plano gratuito não permite listar itens pela API',
    )
  }
  return ids
}

export function criarFontePluggy(): FonteFinanceira {
  const clientId = process.env.PLUGGY_CLIENT_ID
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET são obrigatórios')
  }
  const cliente = new PluggyClient({ clientId, clientSecret })
  const itemIds = lerItemIds(process.env.PLUGGY_ITEM_IDS)

  return {
    /**
     * Lê cada item configurado individualmente.
     *
     * Não usa `fetchAllItems()` de propósito: listar itens é opt-in de plano
     * pago e devolve `403 LIST_ITEMS_FEATURE_NOT_ENABLED` no plano pessoal
     * gratuito — que é o plano deste projeto. O próprio SDK recomenda guardar
     * o `itemId` e usar `fetchItem`. Os ids ficam em PLUGGY_ITEM_IDS e são
     * copiados do painel do Meu Pluggy depois de conectar o banco.
     */
    async listarConexoes() {
      const itens = await Promise.all(itemIds.map((id) => cliente.fetchItem(id)))
      return itens.map(mapearConexao)
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
