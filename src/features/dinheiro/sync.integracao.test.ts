import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FonteFinanceira } from './tipos'

/**
 * Testa o fluxo de `sincronizar` com o Prisma simulado.
 *
 * O que importa aqui não são as consultas em si, e sim as decisões: pular
 * conexão quebrada, não reinserir transação conhecida, e gravar `ultimoSyncEm`
 * só quando houve sync de verdade.
 */
const bd = {
  conexao: { upsert: vi.fn(), update: vi.fn() },
  conta: { upsert: vi.fn(), findMany: vi.fn() },
  transacao: { findMany: vi.fn(), createMany: vi.fn() },
  regraCategoria: { findMany: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({ prisma: bd }))

const { sincronizar } = await import('./sync')

const AGORA = new Date('2026-10-12T06:00:00Z')

function fonte(parcial: Partial<FonteFinanceira> = {}): FonteFinanceira {
  return {
    listarConexoes: async () => [
      { pluggyItemId: 'item-1', instituicao: 'Nubank', status: 'UPDATED' },
    ],
    listarContas: async () => [
      {
        pluggyAccountId: 'acc-1',
        pluggyItemId: 'item-1',
        nome: 'Conta',
        tipo: 'CORRENTE',
        saldo: 100,
        limite: null,
      },
    ],
    listarTransacoes: async () => [
      {
        pluggyTxId: 'tx-1',
        pluggyAccountId: 'acc-1',
        data: new Date('2026-10-11T00:00:00Z'),
        descricao: 'MERCADO X',
        valor: -50,
        categoriaOrig: null,
      },
    ],
    ...parcial,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  bd.regraCategoria.findMany.mockResolvedValue([])
  bd.conexao.upsert.mockResolvedValue({ id: 'cx-1', ultimoSyncEm: null })
  bd.conta.upsert.mockResolvedValue({ id: 'ct-1' })
  bd.conta.findMany.mockResolvedValue([{ tipo: 'CORRENTE' }])
  bd.transacao.findMany.mockResolvedValue([])
  bd.transacao.createMany.mockResolvedValue({ count: 1 })
})

describe('sincronizar', () => {
  it('insere a transação nova e conta o resultado', async () => {
    const r = await sincronizar(fonte(), AGORA)
    expect(r).toEqual({ novas: 1, conexoes: 1 })
    expect(bd.transacao.createMany).toHaveBeenCalledOnce()
  })

  it('não reinsere transação já conhecida', async () => {
    bd.transacao.findMany.mockResolvedValue([{ pluggyTxId: 'tx-1' }])
    const r = await sincronizar(fonte(), AGORA)
    expect(r.novas).toBe(0)
    expect(bd.transacao.createMany).not.toHaveBeenCalled()
  })

  it('pula conexão que pede reautenticação, mas grava o status', async () => {
    const listarContas = vi.fn()
    const r = await sincronizar(
      fonte({
        listarConexoes: async () => [
          { pluggyItemId: 'item-1', instituicao: 'Nubank', status: 'LOGIN_ERROR' },
        ],
        listarContas,
      }),
      AGORA,
    )
    expect(r.novas).toBe(0)
    expect(listarContas).not.toHaveBeenCalled()
    expect(bd.conexao.upsert).toHaveBeenCalledOnce() // status foi gravado
    expect(bd.conexao.update).not.toHaveBeenCalled() // ultimoSyncEm NÃO avançou
  })

  it('marca pagamento de fatura como ignorada quando há cartão na conexão', async () => {
    bd.conta.findMany.mockResolvedValue([{ tipo: 'CORRENTE' }, { tipo: 'CREDITO' }])
    await sincronizar(
      fonte({
        listarTransacoes: async () => [
          {
            pluggyTxId: 'tx-fatura',
            pluggyAccountId: 'acc-1',
            data: new Date('2026-10-11T00:00:00Z'),
            descricao: 'Pagamento de fatura',
            valor: -1200,
            categoriaOrig: null,
          },
        ],
      }),
      AGORA,
    )
    const dados = bd.transacao.createMany.mock.calls[0]?.[0]?.data
    expect(dados[0].ignorada).toBe(true)
  })

  it('aplica a regra do usuário na categoria ao inserir', async () => {
    bd.regraCategoria.findMany.mockResolvedValue([
      { padrao: 'MERCADO', categoriaId: 'cat-mercado', ignorar: false, criadaEm: new Date() },
    ])
    await sincronizar(fonte(), AGORA)
    const dados = bd.transacao.createMany.mock.calls[0]?.[0]?.data
    expect(dados[0].categoriaId).toBe('cat-mercado')
  })

  it('avança ultimoSyncEm quando o sync completou', async () => {
    await sincronizar(fonte(), AGORA)
    expect(bd.conexao.update).toHaveBeenCalledWith({
      where: { id: 'cx-1' },
      data: { ultimoSyncEm: AGORA },
    })
  })

  it('não chama o banco de transações quando a conta não tem lançamento', async () => {
    await sincronizar(fonte({ listarTransacoes: async () => [] }), AGORA)
    expect(bd.transacao.findMany).not.toHaveBeenCalled()
    expect(bd.transacao.createMany).not.toHaveBeenCalled()
  })
})
