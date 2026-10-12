const LIMITE_HORAS = 48 // a janela incremental da Pluggy é de 7 dias; 48h dá margem
const MS_POR_HORA = 3_600_000

export type Avaliacao = { alerta: boolean; horas: number | null; motivo: string }

/**
 * Traduz o estado do sync em algo que a tela mostra.
 *
 * O princípio: o app nunca mostra um número com aparência de fresco quando não
 * é. Sync parado em silêncio exibiria "você gastou pouco esse mês" quando a
 * verdade é que o app parou de olhar — e pior, passados 7 dias a janela
 * incremental da Pluggy estoura e o extrato ganha um buraco permanente.
 */
export function avaliarSync(
  ultimoSyncEm: Date | null,
  status: string,
  agora = new Date(),
): Avaliacao {
  if (status !== 'UPDATED') {
    return { alerta: true, horas: null, motivo: 'a conexão pede para reconectar o banco' }
  }
  if (!ultimoSyncEm) {
    return { alerta: true, horas: null, motivo: 'nunca sincronizou' }
  }

  const horas = Math.floor((agora.getTime() - ultimoSyncEm.getTime()) / MS_POR_HORA)
  return horas > LIMITE_HORAS
    ? { alerta: true, horas, motivo: `sem sincronizar há ${horas}h` }
    : { alerta: false, horas, motivo: `sincronizado há ${horas}h` }
}
