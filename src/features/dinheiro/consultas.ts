import { prisma } from '@/lib/prisma'

const OFFSET_BRASILIA_HORAS = 3

/**
 * Primeiro e último instante de um mês `YYYY-MM`, em horário de Brasília.
 *
 * Usa -03:00 fixo: o Brasil não observa horário de verão desde 2019, e o
 * caso histórico, onde o offset realmente varia, é tratado em `lib/dia.ts`,
 * que é quem define o dia dos registros de hábito.
 */
export function intervaloDoMes(mes: string): { de: Date; ate: Date } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes)
  if (!m) throw new Error(`mês inválido: ${mes}`)
  const ano = Number(m[1])
  const numeroMes = Number(m[2])
  if (numeroMes < 1 || numeroMes > 12) throw new Error(`mês inválido: ${mes}`)

  return {
    de: new Date(Date.UTC(ano, numeroMes - 1, 1, OFFSET_BRASILIA_HORAS)),
    ate: new Date(Date.UTC(ano, numeroMes, 1, OFFSET_BRASILIA_HORAS)),
  }
}

export async function transacoesDoMes(mes: string) {
  const { de, ate } = intervaloDoMes(mes)
  return prisma.transacao.findMany({
    where: { data: { gte: de, lt: ate } },
    orderBy: { data: 'desc' },
    select: {
      id: true,
      data: true,
      descricao: true,
      valor: true,
      ignorada: true,
      categoriaOrig: true,
      categoria: { select: { nome: true } },
    },
  })
}

export async function categorias() {
  return prisma.categoria.findMany({ orderBy: { nome: 'asc' } })
}
