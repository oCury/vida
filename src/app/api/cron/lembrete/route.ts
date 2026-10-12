import { NextResponse, type NextRequest } from 'next/server'
import { habitosPendentes } from '@/features/habitos/pendentes'
import { bearerValido } from '@/lib/bearer'
import { diaLocal, inicioDoDiaUTC } from '@/lib/dia'
import { prisma } from '@/lib/prisma'
import { enviarAviso } from '@/lib/push'

/** Lembrete de hábito. Agendado às 21h de Brasília pelo cron da Vercel. */
export async function GET(req: NextRequest) {
  const segredo = process.env.CRON_SECRET
  if (!segredo) return NextResponse.json({ erro: 'CRON_SECRET ausente' }, { status: 500 })
  if (!bearerValido(req.headers.get('authorization'), segredo)) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  const data = inicioDoDiaUTC(diaLocal(new Date()))
  const defs = await prisma.habitoDef.findMany({
    select: { slug: true, nome: true, fonte: true, ativo: true, id: true },
  })
  const registros = await prisma.registroHabito.findMany({
    where: { data },
    select: { habitoId: true },
  })

  const idsRegistrados = new Set(registros.map((r) => r.habitoId))
  const slugsRegistrados = new Set(
    defs.filter((d) => idsRegistrados.has(d.id)).map((d) => d.slug),
  )

  const pendentes = habitosPendentes(defs, slugsRegistrados)
  if (pendentes.length === 0) {
    return NextResponse.json({ ok: true, pendentes: 0, enviados: 0 })
  }

  const enviados = await enviarAviso({
    titulo: 'Faltou marcar hoje',
    corpo: pendentes.map((p) => p.nome).join(' · '),
    url: '/',
  })
  return NextResponse.json({ ok: true, pendentes: pendentes.length, enviados })
}
