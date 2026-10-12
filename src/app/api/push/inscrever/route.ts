import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSAO, verificarSessao } from '@/lib/sessao'
import { prisma } from '@/lib/prisma'

/** Guarda o endpoint de push do aparelho. Protegido por sessão, não por token. */
export async function POST(req: NextRequest) {
  if (!(await verificarSessao(req.cookies.get(COOKIE_SESSAO)?.value))) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  let corpo: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ erro: 'JSON inválido' }, { status: 400 })
  }

  const { endpoint, keys } = corpo
  if (!endpoint || !keys?.p256dh || !keys.auth) {
    return NextResponse.json({ erro: 'inscrição incompleta' }, { status: 400 })
  }

  await prisma.inscricao.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { p256dh: keys.p256dh, auth: keys.auth },
  })
  return NextResponse.json({ ok: true })
}
