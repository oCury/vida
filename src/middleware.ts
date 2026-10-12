import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSAO, verificarSessao } from '@/lib/sessao'

export async function middleware(req: NextRequest) {
  if (await verificarSessao(req.cookies.get(COOKIE_SESSAO)?.value)) {
    return NextResponse.next()
  }
  const url = req.nextUrl.clone()
  url.pathname = '/login'
  return NextResponse.redirect(url)
}

/**
 * `/api/ingest/*` e `/api/cron/*` ficam DE FORA de propósito: elas usam bearer
 * token, porque o app Atalhos do iPhone e o cron da Vercel não fazem login.
 */
export const config = {
  matcher: ['/dia/:path*', '/dinheiro/:path*', '/habitos/:path*'],
}
