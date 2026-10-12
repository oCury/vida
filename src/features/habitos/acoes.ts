'use server'

import { revalidatePath } from 'next/cache'
import { registrar } from './registro'
import { valorDoToque } from './valor-do-toque'

/**
 * Registra um hábito a partir de um toque na tela.
 *
 * Aceita `valor` ausente (o toque de um botão sim/não) e valor numérico vindo
 * de um chip. Nenhum caminho usa teclado livre.
 */
export async function acaoRegistrarHabito(form: FormData): Promise<void> {
  const slug = String(form.get('slug') ?? '')
  if (!slug) throw new Error('slug obrigatório')

  await registrar({ slug, valor: valorDoToque(form.get('valor')) })
  revalidatePath('/')
  revalidatePath('/dia')
}
