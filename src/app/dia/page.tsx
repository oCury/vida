import { estadoDoSync, habitosDeHoje, ultimasTransacoes } from '@/features/dia/consultas'
import { avaliarSync } from '@/features/dia/idade-sync'

export const dynamic = 'force-dynamic'

/**
 * Tela crua, feia por decisão.
 *
 * A Fase 1 existe para o dado começar a entrar — UI atrasada se recupera
 * sempre, dado não registrado é perdido para sempre. O desenho de verdade
 * (número herói, direção suíça editorial) é a Fase 3.
 */
export default async function Dia() {
  const [transacoes, habitos, sync] = await Promise.all([
    ultimasTransacoes(),
    habitosDeHoje(),
    estadoDoSync(),
  ])

  const aval = sync
    ? avaliarSync(sync.ultimoSyncEm, sync.status)
    : { alerta: true, horas: null, motivo: 'nenhuma conexão cadastrada' }

  return (
    <main>
      <p role={aval.alerta ? 'alert' : undefined}>
        {aval.alerta ? '⚠ ' : ''}
        {aval.motivo}
      </p>

      <h1>Hábitos de hoje</h1>
      <ul>
        {habitos.map(({ def, registro }) => (
          <li key={def.id}>
            {def.nome}:{' '}
            {registro === null
              ? '—'
              : def.tipo === 'BOOL'
                ? registro.valorBool
                  ? 'sim'
                  : 'não'
                : `${registro.valorNum?.toString() ?? '—'} ${def.unidade ?? ''}`}
          </li>
        ))}
      </ul>

      <h2>Últimas transações ({transacoes.length})</h2>
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Categoria Pluggy</th>
          </tr>
        </thead>
        <tbody>
          {transacoes.map((t) => (
            <tr key={t.id}>
              <td>{t.data.toISOString().slice(0, 10)}</td>
              <td>{t.descricao}</td>
              <td>{t.valor.toString()}</td>
              <td>{t.categoriaOrig ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
