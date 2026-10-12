import { NextResponse, type NextRequest } from 'next/server'
import { registrar } from '@/features/habitos/registro'
import { bearerValido } from '@/lib/bearer'

export async function POST(req: NextRequest) {
  if (!bearerValido(req.headers.get('authorization'), process.env.INGEST_TOKEN ?? '')) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  let corpo: unknown
  try {
    corpo = await req.json()
  } catch {
    return NextResponse.json({ erro: 'JSON inválido' }, { status: 400 })
  }

  try {
    await registrar(corpo as Record<string, unknown>)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'erro' }, { status: 400 })
  }
}
