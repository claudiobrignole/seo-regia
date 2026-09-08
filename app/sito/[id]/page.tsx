import { notFound } from 'next/navigation'
import { query } from '@/lib/db'
import { SITI } from '@/siti.config'
import { Telaio, avviso, bottonePrimario, bottoneSecondario } from '@/app/componenti/telaio'
import type { Azione } from '@/lib/registro'

export const dynamic = 'force-dynamic'

const CAMPI_SCRIVIBILI = new Set(['titolo', 'descrizione', 'seo_prodotto'])

export default async function PaginaSito({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string }>
}) {
  const { id } = await params
  const { ok } = await searchParams
  const s = SITI.find((x) => x.id === id)
  if (!s) notFound()

  let azioni: Azione[] = []
  let errore: string | null = null
  let clic = 0
  let impressioni = 0
  try {
    azioni = await query<Azione>(
      `SELECT * FROM azioni WHERE sito_id = ? ORDER BY FIELD(stato,'proposta','approvata','applicata','fallita','rifiutata','annullata'), id DESC LIMIT 80`,
      [s.id]
    )
    const tot = await query<{ clic: number; impressioni: number }>(
      `SELECT COALESCE(SUM(clic),0) AS clic, COALESCE(SUM(impressioni),0) AS impressioni
         FROM misure WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina'
          AND giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [s.id]
    )
    clic = Number(tot[0]?.clic ?? 0)
    impressioni = Number(tot[0]?.impressioni ?? 0)
  } catch (e) {
    errore = (e as Error).message
  }

  const zero = clic === 0 && impressioni === 0

  return (
    <Telaio titolo={s.nome} sottotitolo={`${s.dominio}. Automazione ${s.automazioneAttiva ? 'attiva' : 'spenta'}.`}>
      {ok === 'applicata' && <p>Modifica applicata. Controlla il sito (o la richiesta su GitHub).</p>}
      {ok === 'rifiutata' && <p>Proposta rifiutata: non verra riproposta finche non cambia il bersaglio.</p>}
      {ok === 'annullata' && <p>Valore precedente rimesso sul sito.</p>}

      {errore && (
        <div style={avviso}>
          <strong>Il database non risponde ancora.</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>{errore}</p>
        </div>
      )}

      <p style={{ fontSize: 15 }}>
        Ultimi 30 giorni, Search Console: {clic.toLocaleString('it-CH')} clic, {impressioni.toLocaleString('it-CH')} impressioni.
        {zero ? ' Zero dati: se il sito e nuovo o non promosso, e normale, non e un guasto.' : ''}
      </p>
      {s.note && <p style={{ fontSize: 14, color: '#4A524E' }}>{s.note}</p>}

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Coda</h2>
      {azioni.length === 0 && !errore && <p>Nessuna proposta. Arriveranno dopo raccolta, scansione e diagnosi.</p>}

      {azioni.map((a) => {
        const applicabile = CAMPI_SCRIVIBILI.has(a.campo) && !!(a.valore_nuovo ?? '').trim()
        return (
          <article
            key={a.id}
            style={{
              border: '1px solid #DDE1DC',
              borderRadius: 6,
              padding: 16,
              marginBottom: 12,
              background: '#fff',
            }}
          >
            <div style={{ fontSize: 12, color: '#7C857F' }}>
              {a.regola} · {a.campo} · {a.stato} · {a.bersaglio}
            </div>
            <p style={{ margin: '8px 0' }}>{a.motivo}</p>
            <p style={{ fontSize: 14 }}>
              <strong>Ora:</strong> {a.valore_vecchio || '(vuoto)'}
            </p>
            <p style={{ fontSize: 14 }}>
              <strong>Proposto:</strong> {a.valore_nuovo || '(manca il testo: il generatore non ha ancora scritto)'}
            </p>
            {a.guadagno_stimato != null && (
              <p style={{ fontSize: 13, color: '#4A524E' }}>Stima: circa {a.guadagno_stimato} clic in piu nel periodo.</p>
            )}
            {a.stato === 'proposta' || a.stato === 'approvata' ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                {applicabile && (
                  <form method="POST" action={`/api/azioni/applica?sito=${s.id}`}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" style={bottonePrimario}>
                      Approva e applica
                    </button>
                  </form>
                )}
                <form method="POST" action="/api/azioni/rifiuta">
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" style={bottoneSecondario}>
                    Rifiuta
                  </button>
                </form>
              </div>
            ) : null}
            {a.stato === 'applicata' && (
              <form method="POST" action="/api/azioni/annulla" style={{ marginTop: 10 }}>
                <input type="hidden" name="id" value={a.id} />
                <button type="submit" style={bottoneSecondario}>
                  Annulla (rimetti il valore precedente)
                </button>
              </form>
            )}
            {a.riferimento_esterno && (
              <p style={{ fontSize: 13 }}>
                <a href={a.riferimento_esterno}>{a.riferimento_esterno}</a>
              </p>
            )}
          </article>
        )
      })}
    </Telaio>
  )
}
