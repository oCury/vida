import { acaoIgnorar, acaoRecategorizar } from '@/features/dinheiro/acoes'
import { categorias, transacoesDoMes } from '@/features/dinheiro/consultas'
import { resumoDoMes } from '@/features/dinheiro/resumo'
import { diaLocal } from '@/lib/dia'

export const dynamic = 'force-dynamic'

/**
 * Crua de propósito: hierarquia, número herói e direção suíça são a Fase 3.
 *
 * As ações usam `hidden input` em vez de Server Action com closure sobre o
 * item do laço: closure dentro de `map` depende de serialização e falha de
 * formas difíceis de depurar.
 */
export default async function Dinheiro() {
  const mes = diaLocal(new Date()).slice(0, 7)
  const [transacoes, cats] = await Promise.all([transacoesDoMes(mes), categorias()])

  const resumo = resumoDoMes(
    transacoes.map((t) => ({
      valor: Number(t.valor),
      categoriaNome: t.categoria?.nome ?? null,
      ignorada: t.ignorada,
    })),
  )

  if (transacoes.length === 0) {
    return (
      <main>
        <h1>Dinheiro · {mes}</h1>
        <p>Nenhuma transação neste mês.</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Dinheiro · {mes}</h1>

      <ul>
        <li>Receita: {resumo.receita.toFixed(2)}</li>
        <li>Gasto: {resumo.gasto.toFixed(2)}</li>
        <li>
          Sobra:{' '}
          {resumo.sobra === null
            ? '— (nenhuma receita detectada neste mês)'
            : resumo.sobra.toFixed(2)}
        </li>
      </ul>

      <h2>Para onde foi</h2>
      <ol>
        {resumo.porCategoria.map((c) => (
          <li key={c.nome}>
            {c.nome}: {c.total.toFixed(2)}
          </li>
        ))}
      </ol>

      <h2>Lançamentos</h2>
      <table>
        <tbody>
          {transacoes.map((t) => (
            <tr key={t.id} style={t.ignorada ? { opacity: 0.5 } : undefined}>
              <td>{t.data.toISOString().slice(0, 10)}</td>
              <td>{t.descricao}</td>
              <td>{Number(t.valor).toFixed(2)}</td>
              <td>{t.categoria?.nome ?? t.categoriaOrig ?? '—'}</td>
              <td>
                <form action={acaoRecategorizar}>
                  <input type="hidden" name="transacaoId" value={t.id} />
                  <select name="categoriaId" defaultValue="" aria-label="Categoria">
                    <option value="" disabled>
                      categoria…
                    </option>
                    {cats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                  <button type="submit">ok</button>
                </form>
              </td>
              <td>
                <form action={acaoIgnorar}>
                  <input type="hidden" name="transacaoId" value={t.id} />
                  <button type="submit">{t.ignorada ? 'ignorada' : 'ignorar'}</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
