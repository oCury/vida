import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

/**
 * Cliente único.
 *
 * No Prisma 7 a conexão chega por driver adapter, não pela `url` do schema.
 * Em desenvolvimento o cliente é guardado no escopo global porque o hot reload
 * do Next recria o módulo a cada edição, e sem isso cada recarga abriria um
 * novo pool até esgotar as conexões do Postgres.
 */
function criar(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL ausente')
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? criar()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
