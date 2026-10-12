import { NextResponse, type NextRequest } from 'next/server'
import { criarFontePluggy } from '@/features/dinheiro/pluggy-client'
import { sincronizar } from '@/features/dinheiro/sync'
import { bearerValido } from '@/lib/bearer'
import { prisma } from '@/lib/prisma'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return NextResponse.json({ erro: 'CRON_SECRET ausente' }, { status: 500 })
  if (!bearerValido(req.headers.get('authorization'), segredo)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  try {
    const r = await sincronizar(criarFontePluggy())
    await prisma.syncLog.create({ data: { status: 'OK', novas: r.novas } })
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    const erro = e instanceof Error ? e.message : String(e)
    // Registrar a falha é obrigatório: sync que para em silêncio é pior que app nenhum.
    await prisma.syncLog.create({ data: { status: 'ERRO', erro } })
    return NextResponse.json({ ok: false, erro }, { status: 500 })
  }
}
