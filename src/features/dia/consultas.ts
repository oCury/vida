import { diaLocal, inicioDoDiaUTC } from '@/lib/dia'
import { prisma } from '@/lib/prisma'

const LIMITE_TRANSACOES = 50

export async function ultimasTransacoes(limite = LIMITE_TRANSACOES) {
  return prisma.transacao.findMany({
    orderBy: { data: 'desc' },
    take: limite,
    select: { id: true, data: true, descricao: true, valor: true, categoriaOrig: true },
  })
}

export async function habitosDeHoje(agora = new Date()) {
  const data = inicioDoDiaUTC(diaLocal(agora))
  const defs = await prisma.habitoDef.findMany({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
  })
  const registros = await prisma.registroHabito.findMany({ where: { data } })
  const porHabito = new Map(registros.map((r) => [r.habitoId, r]))
  return defs.map((d) => ({ def: d, registro: porHabito.get(d.id) ?? null }))
}

export async function estadoDoSync() {
  const c = await prisma.conexao.findFirst({ orderBy: { ultimoSyncEm: 'desc' } })
  return c ? { ultimoSyncEm: c.ultimoSyncEm, status: c.status } : null
}
