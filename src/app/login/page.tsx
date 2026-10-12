'use client'

import { useActionState } from 'react'
import { entrar } from './actions'

export default function Login() {
  const [erro, acao, pendente] = useActionState(entrar, undefined)
  return (
    <main>
      <h1>Vida</h1>
      <form action={acao}>
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" autoComplete="current-password" required />
        <button type="submit" disabled={pendente}>
          {pendente ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      {erro ? <p role="alert">{erro}</p> : null}
    </main>
  )
}
