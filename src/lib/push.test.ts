import { beforeEach, describe, expect, it, vi } from 'vitest'

const enviar = vi.fn()
vi.mock('web-push', () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: enviar },
}))

const bd = { inscricao: { findMany: vi.fn(), delete: vi.fn() } }
vi.mock('@/lib/prisma', () => ({ prisma: bd }))

const { enviarAviso } = await import('./push')

const AVISO = { titulo: 'Oi', corpo: 'teste' }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.VAPID_PUBLIC_KEY = 'pub'
  process.env.VAPID_PRIVATE_KEY = 'priv'
  process.env.VAPID_SUBJECT = 'mailto:a@b.c'
  bd.inscricao.findMany.mockResolvedValue([
    { id: 'i-1', endpoint: 'https://push/1', p256dh: 'p', auth: 'a' },
  ])
  enviar.mockResolvedValue({})
})

describe('enviarAviso', () => {
  it('envia para cada inscrição e conta os envios', async () => {
    expect(await enviarAviso(AVISO)).toBe(1)
    expect(enviar).toHaveBeenCalledOnce()
  })

  it('não envia nada quando as chaves VAPID não estão configuradas', async () => {
    process.env.VAPID_PRIVATE_KEY = ''
    expect(await enviarAviso(AVISO)).toBe(0)
    expect(enviar).not.toHaveBeenCalled()
  })

  it('remove inscrição morta (410) em vez de reenviar para sempre', async () => {
    enviar.mockRejectedValue({ statusCode: 410 })
    expect(await enviarAviso(AVISO)).toBe(0)
    expect(bd.inscricao.delete).toHaveBeenCalledWith({ where: { id: 'i-1' } })
  })

  it('remove inscrição morta (404) também', async () => {
    enviar.mockRejectedValue({ statusCode: 404 })
    await enviarAviso(AVISO)
    expect(bd.inscricao.delete).toHaveBeenCalledOnce()
  })

  it('NÃO remove em erro transitório — a próxima execução tenta de novo', async () => {
    enviar.mockRejectedValue({ statusCode: 500 })
    expect(await enviarAviso(AVISO)).toBe(0)
    expect(bd.inscricao.delete).not.toHaveBeenCalled()
  })

  it('uma inscrição morta não impede as outras de receber', async () => {
    bd.inscricao.findMany.mockResolvedValue([
      { id: 'i-1', endpoint: 'https://push/1', p256dh: 'p', auth: 'a' },
      { id: 'i-2', endpoint: 'https://push/2', p256dh: 'p', auth: 'a' },
    ])
    enviar.mockRejectedValueOnce({ statusCode: 410 }).mockResolvedValueOnce({})
    expect(await enviarAviso(AVISO)).toBe(1)
    expect(bd.inscricao.delete).toHaveBeenCalledOnce()
  })

  it('sem nenhuma inscrição devolve zero, que é informação e não erro', async () => {
    bd.inscricao.findMany.mockResolvedValue([])
    expect(await enviarAviso(AVISO)).toBe(0)
  })
})
