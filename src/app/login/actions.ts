'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { COOKIE_SESSAO, DIAS_DE_SESSAO, assinarSessao } from '@/lib/sessao'
import { verificarSenha } from '@/lib/senha'

export async function entrar(_estado: unknown, form: FormData): Promise<string | undefined> {
  const senha = form.get('senha')
  if (typeof senha !== 'string' || senha.length === 0) return 'Informe a senha.'

  if (!(await verificarSenha(senha))) return 'Senha incorreta.'

  const jar = await cookies()
  jar.set(COOKIE_SESSAO, await assinarSessao(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DIAS_DE_SESSAO * 24 * 60 * 60,
  })
  redirect('/dia')
}
