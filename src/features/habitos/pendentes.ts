export type DefParaLembrete = {
  slug: string
  nome: string
  fonte: 'MANUAL' | 'SAUDE'
  ativo: boolean
}

/**
 * Quais hábitos ainda faltam hoje e valem um lembrete.
 *
 * Hábito de fonte `SAUDE` fica fora: ele chega sozinho pela Automação do
 * Atalhos, e lembrar de algo automático é ruído — e push que vira ruído é
 * push que o usuário desliga.
 */
export function habitosPendentes<T extends DefParaLembrete>(
  defs: readonly T[],
  registradosHoje: ReadonlySet<string>,
): T[] {
  return defs.filter((d) => d.ativo && d.fonte === 'MANUAL' && !registradosHoje.has(d.slug))
}
