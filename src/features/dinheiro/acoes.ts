'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { whereSeguro } from '@/lib/where'
import { padraoDe } from './padrao'

async function descricaoDe(transacaoId: string): Promise<string> {
  const tx = await prisma.transacao.findUnique({
    where: whereSeguro({ id: transacaoId }),
    select: { descricao: true },
  })
  if (!tx) throw new Error('transação não encontrada')
  return tx.descricao
}

/**
 * Recategoriza a transação E cria a regra, para as próximas já virem certas.
 *
 * Os dois numa transação do banco: se a regra falhar depois do update, o
 * usuário veria a correção aplicada e ela não se repetiria no mês seguinte —
 * exatamente a frustração que o toque existe para evitar.
 */
export async function acaoRecategorizar(form: FormData): Promise<void> {
  const transacaoId = String(form.get('transacaoId') ?? '')
  const categoriaId = String(form.get('categoriaId') ?? '')
  if (!transacaoId || !categoriaId) throw new Error('transacaoId e categoriaId obrigatórios')

  const descricao = await descricaoDe(transacaoId)

  await prisma.$transaction([
    prisma.transacao.update({
      where: whereSeguro({ id: transacaoId }),
      data: { categoriaId, ignorada: false },
    }),
    prisma.regraCategoria.create({
      data: { padrao: padraoDe(descricao), categoriaId, ignorar: false },
    }),
  ])
  revalidatePath('/dinheiro')
}

/** Marca como ignorada E cria a regra de ignorar. */
export async function acaoIgnorar(form: FormData): Promise<void> {
  const transacaoId = String(form.get('transacaoId') ?? '')
  if (!transacaoId) throw new Error('transacaoId obrigatório')

  const descricao = await descricaoDe(transacaoId)

  await prisma.$transaction([
    prisma.transacao.update({
      where: whereSeguro({ id: transacaoId }),
      data: { ignorada: true, categoriaId: null },
    }),
    prisma.regraCategoria.create({
      data: { padrao: padraoDe(descricao), categoriaId: null, ignorar: true },
    }),
  ])
  revalidatePath('/dinheiro')
}
