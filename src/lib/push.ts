import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

export type Aviso = { titulo: string; corpo: string; url?: string }

function configurar(): boolean {
  const publica = process.env.VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  const assunto = process.env.VAPID_SUBJECT
  if (!publica || !privada || !assunto) return false
  webpush.setVapidDetails(assunto, publica, privada)
  return true
}

/**
 * Envia um aviso para todos os dispositivos inscritos.
 *
 * Inscrição morta (404/410) é REMOVIDA em vez de reenviada para sempre: o
 * endpoint do navegador expira quando o usuário reinstala o PWA, e manter a
 * linha faria toda execução futura falhar em silêncio.
 *
 * Devolve quantos avisos saíram — zero é informação, não erro.
 */
export async function enviarAviso(aviso: Aviso): Promise<number> {
  if (!configurar()) return 0

  const inscricoes = await prisma.inscricao.findMany()
  let enviados = 0

  for (const i of inscricoes) {
    try {
      await webpush.sendNotification(
        { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
        JSON.stringify(aviso),
      )
      enviados += 1
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await prisma.inscricao.delete({ where: { id: i.id } })
      }
      // Outros erros são transitórios: a próxima execução tenta de novo.
    }
  }
  return enviados
}
