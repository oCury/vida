export const TZ = 'America/Sao_Paulo'

const FORMATO_DIA = /^\d{4}-\d{2}-\d{2}$/

/** Dia-calendário em America/Sao_Paulo, no formato YYYY-MM-DD. */
export function diaLocal(valor: Date | string): string {
  if (typeof valor === 'string') {
    if (!FORMATO_DIA.test(valor)) throw new Error(`dia inválido: ${valor}`)
    return valor
  }
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(valor)
}

/**
 * Instante UTC correspondente à meia-noite daquele dia em Brasília.
 * É o valor gravado em `RegistroHabito.data`, para que todo registro de um mesmo
 * dia local colida na constraint única independentemente da hora do envio.
 */
export function inicioDoDiaUTC(dia: string): Date {
  if (!FORMATO_DIA.test(dia)) throw new Error(`dia inválido: ${dia}`)
  // Descobre o offset de Brasília naquela data (o Brasil pode voltar a ter horário de verão).
  const meioDiaUTC = new Date(`${dia}T12:00:00Z`)
  const offsetMin = offsetMinutos(meioDiaUTC)
  return new Date(new Date(`${dia}T00:00:00Z`).getTime() - offsetMin * 60_000)
}

function offsetMinutos(instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    timeZoneName: 'longOffset',
  }).formatToParts(instante)
  const nome = partes.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-03:00'
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(nome)
  if (!m) throw new Error(`offset não reconhecido: ${nome}`)
  const sinal = m[1] === '-' ? -1 : 1
  return sinal * (Number(m[2]) * 60 + Number(m[3]))
}
