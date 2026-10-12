import { NextResponse, type NextRequest } from 'next/server'
import { registrar } from '@/features/habitos/registro'
import { bearerValido } from '@/lib/bearer'

const METRICAS = ['sono', 'passos', 'peso'] as const

/** Corpo esperado: { "dia": "2026-10-12", "sono": 7.5, "passos": 8431, "peso": 78.4 } */
export async function POST(req: NextRequest) {
  if (!bearerValido(req.headers.get('authorization'), process.env.INGEST_TOKEN ?? '')) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 })
  }

  let corpo: Record<string, unknown>
  try {
    corpo = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ erro: 'JSON inválido' }, { status: 400 })
  }

  const dia = typeof corpo.dia === 'string' ? corpo.dia : undefined
  const gravadas: string[] = []
  const falhas: Record<string, string> = {}

  for (const slug of METRICAS) {
    const valor = corpo[slug]
    // Métrica ausente é silenciosa: o app Saúde pode não ter o dado naquele dia.
    if (valor === undefined || valor === null) continue
    try {
      await registrar({ slug, valor, dia })
      gravadas.push(slug)
    } catch (e) {
      falhas[slug] = e instanceof Error ? e.message : 'erro'
    }
  }

  return NextResponse.json(
    { gravadas, falhas },
    { status: Object.keys(falhas).length > 0 ? 207 : 200 },
  )
}
