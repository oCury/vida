import { prisma } from '@/lib/prisma'
import { classificar } from './classificar'
import { detectarTransferenciaInterna } from './transferencia'
import type { FonteFinanceira, TransacaoDominio } from './tipos'

const DIAS_PRIMEIRO_SYNC = 365 // o histórico que a Pluggy entrega de uma vez
const DIAS_FOLGA = 10 // a janela incremental da Pluggy é de 4 a 7 dias
const MS_POR_DIA = 86_400_000

/**
 * De quando buscar.
 *
 * No primeiro sync, um ano. Depois, até o último sync menos folga — a folga
 * existe porque a janela incremental da Pluggy é de 7 dias, e estourá-la abre
 * um buraco permanente no extrato, que nenhum sync posterior preenche.
 */
export function janelaDeBusca(ultimoSyncEm: Date | null, agora: Date): Date {
  const dias = ultimoSyncEm
    ? Math.max(DIAS_FOLGA, diasEntre(ultimoSyncEm, agora) + DIAS_FOLGA)
    : DIAS_PRIMEIRO_SYNC
  return new Date(agora.getTime() - dias * MS_POR_DIA)
}

function diasEntre(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / MS_POR_DIA)
}

/** Remove as já conhecidas e as duplicadas dentro da própria resposta. */
export function separarNovas(
  recebidas: readonly TransacaoDominio[],
  jaConhecidas: ReadonlySet<string>,
): TransacaoDominio[] {
  const vistas = new Set(jaConhecidas)
  const novas: TransacaoDominio[] = []
  for (const t of recebidas) {
    if (vistas.has(t.pluggyTxId)) continue
    vistas.add(t.pluggyTxId)
    novas.push(t)
  }
  return novas
}

export type ResultadoSync = { novas: number; conexoes: number }

export async function sincronizar(
  fonte: FonteFinanceira,
  agora = new Date(),
): Promise<ResultadoSync> {
  const conexoes = await fonte.listarConexoes()
  // Carregadas uma vez por sync: são as mesmas para todas as transações, e
  // relê-las por linha seria uma consulta por transação no primeiro sync, que
  // traz um ano de histórico de uma vez.
  const regras = await prisma.regraCategoria.findMany({
    select: { padrao: true, categoriaId: true, ignorar: true, criadaEm: true },
  })
  let novasNoTotal = 0

  for (const c of conexoes) {
    const conexao = await prisma.conexao.upsert({
      where: { pluggyItemId: c.pluggyItemId },
      create: { pluggyItemId: c.pluggyItemId, instituicao: c.instituicao, status: c.status },
      update: { instituicao: c.instituicao, status: c.status },
    })

    // Conexão quebrada não traz dado novo. Gravar o status já é o valor desta
    // volta: é ele que faz a tela pedir para reconectar o banco.
    if (c.status !== 'UPDATED') continue

    const desde = janelaDeBusca(conexao.ultimoSyncEm, agora)

    for (const contaDominio of await fonte.listarContas(c.pluggyItemId)) {
      const conta = await prisma.conta.upsert({
        where: { pluggyAccountId: contaDominio.pluggyAccountId },
        create: {
          pluggyAccountId: contaDominio.pluggyAccountId,
          conexaoId: conexao.id,
          nome: contaDominio.nome,
          tipo: contaDominio.tipo,
          saldo: contaDominio.saldo,
          limite: contaDominio.limite,
        },
        update: {
          nome: contaDominio.nome,
          saldo: contaDominio.saldo,
          limite: contaDominio.limite,
        },
      })

      const recebidas = await fonte.listarTransacoes(contaDominio.pluggyAccountId, desde)
      if (recebidas.length === 0) continue

      const existentes = await prisma.transacao.findMany({
        where: { pluggyTxId: { in: recebidas.map((t) => t.pluggyTxId) } },
        select: { pluggyTxId: true },
      })
      const novas = separarNovas(recebidas, new Set(existentes.map((e) => e.pluggyTxId)))
      if (novas.length === 0) continue

      const contasDaConexao = await prisma.conta.findMany({
        where: { conexaoId: conexao.id },
        select: { tipo: true },
      })

      await prisma.transacao.createMany({
        data: novas.map((t) => {
          const c = classificar({ descricao: t.descricao, categoriaOrig: t.categoriaOrig }, regras)
          const interna = detectarTransferenciaInterna(
            { descricao: t.descricao, valor: t.valor, tipoConta: contaDominio.tipo },
            contasDaConexao,
          )
          return {
            pluggyTxId: t.pluggyTxId,
            contaId: conta.id,
            data: t.data,
            descricao: t.descricao,
            valor: t.valor,
            categoriaOrig: t.categoriaOrig,
            categoriaId: c.categoriaId,
            // Movimentação interna é ignorada mesmo sem regra do usuário:
            // contar os dois lados da fatura dobraria o gasto do mês.
            ignorada: c.ignorar || interna,
          }
        }),
        skipDuplicates: true, // rede de segurança sobre a constraint única
      })
      novasNoTotal += novas.length
    }

    await prisma.conexao.update({ where: { id: conexao.id }, data: { ultimoSyncEm: agora } })
  }

  return { novas: novasNoTotal, conexoes: conexoes.length }
}
