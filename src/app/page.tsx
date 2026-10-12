import Link from 'next/link'
import { AtivarPush } from '@/components/AtivarPush'
import { acaoRegistrarHabito } from '@/features/habitos/acoes'
import { avaliarSync } from '@/features/dia/idade-sync'
import {
  degrausDaReserva,
  estadoDoSync,
  habitosComStreak,
  resumoDoMesAtual,
  saldoDaReserva,
} from '@/features/painel/consultas'
import { diasRestantesNoMes, podeGastarHoje } from '@/features/painel/pode-gastar'
import { progressoReserva } from '@/features/painel/reserva'

export const dynamic = 'force-dynamic'

const TOP_CATEGORIAS = 3

function reais(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  })
}

/**
 * A tela principal.
 *
 * Os quatro números pedidos estão todos aqui, mas em hierarquia por contraste
 * de escala — não em paridade. Quatro números do mesmo tamanho viram painel de
 * aeroporto e nenhum é lido.
 */
export default async function Painel() {
  const agora = new Date()
  const chavePush = process.env.VAPID_PUBLIC_KEY ?? ''
  const [resumo, saldoReserva, degraus, habitos, sync] = await Promise.all([
    resumoDoMesAtual(agora),
    saldoDaReserva(),
    degrausDaReserva(agora),
    habitosComStreak(agora),
    estadoDoSync(),
  ])

  const dias = diasRestantesNoMes(agora)
  const heroi = podeGastarHoje(resumo.sobra, dias)
  const reserva = progressoReserva(saldoReserva, degraus)
  const aval = sync
    ? avaliarSync(sync.ultimoSyncEm, sync.status)
    : { alerta: true, horas: null, motivo: 'nenhuma conexão cadastrada' }

  return (
    <main className="painel">
      <p className={aval.alerta ? 'sync sync--alerta' : 'sync'} role={aval.alerta ? 'alert' : undefined}>
        {aval.alerta ? '⚠ ' : ''}
        {aval.motivo}
      </p>

      <section aria-labelledby="heroi-rotulo">
        <span className="heroi-rotulo" id="heroi-rotulo">
          Posso gastar hoje
        </span>
        {heroi === null ? (
          <>
            <span className="heroi heroi--indefinido">—</span>
            <p className="heroi-motivo">
              Nenhuma receita detectada neste mês, então não há sobra a dividir.
            </p>
          </>
        ) : (
          <>
            <span className={heroi < 0 ? 'heroi heroi--negativo' : 'heroi'}>{reais(heroi)}</span>
            <p className="heroi-motivo">
              {reais(resumo.sobra ?? 0)} de sobra ÷ {dias} {dias === 1 ? 'dia' : 'dias'} restantes
            </p>
          </>
        )}
      </section>

      <ul className="secundarios">
        <li>
          <span className="secundario-rotulo">Sobra do mês</span>
          <span className="secundario-valor">
            {resumo.sobra === null ? '—' : reais(resumo.sobra)}
          </span>
        </li>

        <li>
          <span className="secundario-rotulo">Para onde foi</span>
          {resumo.porCategoria.length === 0 ? (
            <span className="secundario-valor">—</span>
          ) : (
            <>
              {resumo.porCategoria.slice(0, TOP_CATEGORIAS).map((c) => (
                <span key={c.nome} style={{ display: 'block', fontSize: 'var(--texto-mini)' }}>
                  {c.nome} · {reais(c.total)}
                </span>
              ))}
              <Link className="link-discreto" href="/dinheiro" style={{ fontSize: 'var(--texto-mini)' }}>
                ver tudo
              </Link>
            </>
          )}
        </li>

        <li>
          <span className="secundario-rotulo">Reserva</span>
          {reserva === null ? (
            <span style={{ fontSize: 'var(--texto-mini)', color: 'var(--cor-texto-fraco)' }}>
              Nenhuma conta marcada como reserva. Crie uma Caixinha no banco e marque aqui.
            </span>
          ) : (
            <>
              <span className="secundario-valor">{reais(reserva.atual)}</span>
              <div
                className="barra"
                role="progressbar"
                aria-valuenow={reserva.percentual}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${reserva.degrau}: ${reserva.percentual}%`}
              >
                <div
                  className="barra-preenchida"
                  style={{ transform: `scaleX(${reserva.percentual / 100})` }}
                />
              </div>
              <span style={{ fontSize: 'var(--texto-mini)', color: 'var(--cor-texto-fraco)' }}>
                {reserva.degrau} · {reserva.percentual}%
              </span>
            </>
          )}
        </li>
      </ul>

      <section className="secao" aria-labelledby="habitos-titulo">
        <h2 className="secundario-rotulo" id="habitos-titulo">
          Hoje
        </h2>
        {chavePush ? (
          <p style={{ margin: 'var(--espaco-2) 0 0' }}>
            <AtivarPush chavePublica={chavePush} />
          </p>
        ) : null}
        <ul className="habitos">
          {habitos.map(({ def, registro, streak }) => {
            const feito = registro?.valorBool === true || registro?.valorNum != null
            return (
              <li className="habito" key={def.id}>
                <span className="habito-nome">{def.nome}</span>
                {streak > 0 ? (
                  <span className="habito-streak">{streak}d seguidos</span>
                ) : null}

                {feito ? (
                  <span className="habito-feito">
                    {registro?.valorNum != null
                      ? `${registro.valorNum.toString()} ${def.unidade ?? ''}`
                      : 'feito'}
                  </span>
                ) : def.tipo === 'BOOL' ? (
                  <form action={acaoRegistrarHabito}>
                    <input type="hidden" name="slug" value={def.slug} />
                    <button className="chip" type="submit">
                      marcar
                    </button>
                  </form>
                ) : def.chips.length > 0 ? (
                  <div className="chips">
                    {def.chips.map((c) => (
                      <form action={acaoRegistrarHabito} key={c}>
                        <input type="hidden" name="slug" value={def.slug} />
                        <input type="hidden" name="valor" value={c} />
                        <button className="chip" type="submit">
                          {c}
                        </button>
                      </form>
                    ))}
                  </div>
                ) : (
                  <span className="habito-streak">
                    {def.fonte === 'SAUDE' ? 'vem do app Saúde' : 'sem chips definidos'}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}
