import { diaLocal, inicioDoDiaUTC } from '@/lib/dia'
import { prisma } from '@/lib/prisma'
import { whereSeguro } from '@/lib/where'

export type EntradaBruta = { slug?: unknown; valor?: unknown; dia?: unknown }

export type EntradaValidada = {
  slug: string
  valorBool: boolean | null
  valorNum: number | null
}

export function validarEntrada(bruta: EntradaBruta): EntradaValidada {
  const slug = bruta.slug
  if (typeof slug !== 'string' || slug.length === 0) throw new Error('slug obrigatório')

  const valor = bruta.valor

  // O atalho de 1 toque não manda valor: tocar significa "fiz".
  if (valor === undefined || valor === null) {
    return { slug, valorBool: true, valorNum: null }
  }
  if (typeof valor === 'boolean') {
    return { slug, valorBool: valor, valorNum: null }
  }
  if (typeof valor === 'number') {
    // Zero é legítimo (zero passo, zero página); negativo e não-finito não são.
    if (!Number.isFinite(valor) || valor < 0) throw new Error(`valor inválido: ${valor}`)
    return { slug, valorBool: null, valorNum: valor }
  }
  throw new Error(`valor inválido: ${String(valor)}`)
}

/** Grava o registro. Reenviar o mesmo dia sobrescreve, em vez de duplicar. */
export async function registrar(bruta: EntradaBruta, agora = new Date()): Promise<void> {
  const { slug, valorBool, valorNum } = validarEntrada(bruta)
  const dia = diaLocal(typeof bruta.dia === 'string' ? bruta.dia : agora)
  const data = inicioDoDiaUTC(dia)

  const habito = await prisma.habitoDef.findUnique({ where: whereSeguro({ slug }) })
  if (!habito) throw new Error(`hábito desconhecido: ${slug}`)

  await prisma.registroHabito.upsert({
    where: whereSeguro({ habitoId_data: { habitoId: habito.id, data } }),
    create: { habitoId: habito.id, data, valorBool, valorNum },
    update: { valorBool, valorNum },
  })
}
