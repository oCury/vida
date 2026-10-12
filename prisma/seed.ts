import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL ausente')

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

const CATEGORIAS = [
  { nome: 'Mercado', grupo: 'VARIAVEL' },
  { nome: 'Delivery', grupo: 'VARIAVEL' },
  { nome: 'Restaurante', grupo: 'VARIAVEL' },
  { nome: 'Transporte', grupo: 'VARIAVEL' },
  { nome: 'Lazer', grupo: 'VARIAVEL' },
  { nome: 'Saúde', grupo: 'VARIAVEL' },
  { nome: 'Outros', grupo: 'VARIAVEL' },
  { nome: 'Moradia', grupo: 'FIXA' },
  { nome: 'Assinaturas', grupo: 'FIXA' },
  { nome: 'Educação', grupo: 'FIXA' },
  { nome: 'Salário', grupo: 'RECEITA' },
  { nome: 'Freelance', grupo: 'RECEITA' },
] as const

const HABITOS = [
  { slug: 'acordei-6h', nome: 'Acordei às 6h', tipo: 'BOOL', fonte: 'MANUAL', ordem: 1 },
  { slug: 'treino', nome: 'Treinei', tipo: 'BOOL', fonte: 'MANUAL', ordem: 2 },
  { slug: 'estudo-ingles', nome: 'Estudei inglês', tipo: 'BOOL', fonte: 'MANUAL', ordem: 3 },
  {
    slug: 'sono',
    nome: 'Horas de sono',
    tipo: 'NUMERO',
    unidade: 'h',
    chips: [5, 6, 7, 8, 9],
    fonte: 'SAUDE',
    ordem: 4,
  },
  { slug: 'passos', nome: 'Passos', tipo: 'NUMERO', unidade: 'passos', fonte: 'SAUDE', ordem: 5 },
  { slug: 'peso', nome: 'Peso', tipo: 'NUMERO', unidade: 'kg', fonte: 'MANUAL', ordem: 6 },
] as const

async function main() {
  for (const c of CATEGORIAS) {
    await prisma.categoria.upsert({
      where: { nome: c.nome },
      create: { nome: c.nome, grupo: c.grupo },
      // Não sobrescreve o grupo: o usuário pode tê-lo mudado no app.
      update: {},
    })
  }
  console.log(`${CATEGORIAS.length} categorias garantidas`)

  for (const h of HABITOS) {
    await prisma.habitoDef.upsert({
      where: { slug: h.slug },
      create: {
        slug: h.slug,
        nome: h.nome,
        tipo: h.tipo,
        unidade: 'unidade' in h ? h.unidade : null,
        chips: 'chips' in h ? [...h.chips] : [],
        fonte: h.fonte,
        ordem: h.ordem,
      },
      // Não sobrescreve nome nem chips: o usuário pode tê-los editado no app.
      update: { ordem: h.ordem },
    })
  }
  console.log(`${HABITOS.length} hábitos garantidos`)
}

main().finally(() => prisma.$disconnect())
