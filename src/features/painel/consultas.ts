import { intervaloDoMes, transacoesDoMes } from '@/features/dinheiro/consultas'
import { resumoDoMes } from '@/features/dinheiro/resumo'
import { calcularStreak } from '@/features/habitos/streak'
import { diaLocal, inicioDoDiaUTC } from '@/lib/dia'
import { prisma } from '@/lib/prisma'
import type { Degrau } from './reserva'

const DIAS_DE_STREAK = 400 // janela suficiente para qualquer sequência real

/** Saldo da conta marcada como reserva, ou `null` se nenhuma foi marcada. */
export async function saldoDaReserva(): Promise<number | null> {
  const conta = await prisma.conta.findFirst({
    where: { ehReserva: true },
    select: { saldo: true },
  })
  if (!conta) return null
  return conta.saldo === null ? null : Number(conta.saldo)
}

/**
 * Degraus da reserva.
 *
 * Os dois primeiros são fixos e vêm do seed. O terceiro, "um mês de despesa",
 * é calculado da média de gasto dos últimos 3 meses — e só aparece quando
 * existem 3 meses de dado, porque um alvo tirado de um mês seria chute
 * apresentado como meta.
 */
export async function degrausDaReserva(agora = new Date()): Promise<Degrau[]> {
  const fixos = await prisma.meta.findMany({ orderBy: { ordem: 'asc' } })
  const degraus: Degrau[] = fixos.map((m) => ({
    nome: m.nome,
    valorAlvo: Number(m.valorAlvo),
  }))

  const media = await mediaDeGastoMensal(agora)
  if (media !== null) {
    degraus.push({ nome: 'Um mês de despesa', valorAlvo: Math.round(media) })
  }
  return degraus
}

async function mediaDeGastoMensal(agora: Date): Promise<number | null> {
  const meses = tresMesesAnteriores(agora)
  const totais: number[] = []

  for (const mes of meses) {
    const transacoes = await transacoesDoMes(mes)
    if (transacoes.length === 0) return null // sem 3 meses de dado, sem alvo
    const r = resumoDoMes(
      transacoes.map((t) => ({
        valor: Number(t.valor),
        categoriaNome: t.categoria?.nome ?? null,
        ignorada: t.ignorada,
      })),
    )
    totais.push(r.gasto)
  }
  return totais.reduce((a, b) => a + b, 0) / totais.length
}

function tresMesesAnteriores(agora: Date): string[] {
  const [ano, mes] = diaLocal(agora).split('-').map(Number)
  if (!ano || !mes) throw new Error('data inválida')
  return [1, 2, 3].map((atras) => {
    const d = new Date(Date.UTC(ano, mes - 1 - atras, 1))
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  })
}

/** Hábitos de hoje, cada um com o registro do dia e o streak atual. */
export async function habitosComStreak(agora = new Date()) {
  const hoje = diaLocal(agora)
  const dataHoje = inicioDoDiaUTC(hoje)
  const desde = new Date(dataHoje.getTime() - DIAS_DE_STREAK * 86_400_000)

  const defs = await prisma.habitoDef.findMany({
    where: { ativo: true },
    orderBy: { ordem: 'asc' },
  })
  const registros = await prisma.registroHabito.findMany({
    where: { data: { gte: desde } },
    select: { habitoId: true, data: true, valorBool: true, valorNum: true },
  })

  return defs.map((def) => {
    const meus = registros.filter((r) => r.habitoId === def.id)
    // Só dia cumprido entra no streak: valorBool false é "não fiz", não presença.
    const cumpridos = meus
      .filter((r) => r.valorBool === true || r.valorNum !== null)
      .map((r) => r.data.toISOString().slice(0, 10))
    return {
      def,
      registro: meus.find((r) => r.data.getTime() === dataHoje.getTime()) ?? null,
      streak: calcularStreak(cumpridos, hoje),
    }
  })
}

export async function resumoDoMesAtual(agora = new Date()) {
  const mes = diaLocal(agora).slice(0, 7)
  intervaloDoMes(mes) // valida o formato antes de consultar
  const transacoes = await transacoesDoMes(mes)
  return resumoDoMes(
    transacoes.map((t) => ({
      valor: Number(t.valor),
      categoriaNome: t.categoria?.nome ?? null,
      ignorada: t.ignorada,
    })),
  )
}

export async function estadoDoSync() {
  const c = await prisma.conexao.findFirst({ orderBy: { ultimoSyncEm: 'desc' } })
  return c ? { ultimoSyncEm: c.ultimoSyncEm, status: c.status } : null
}
