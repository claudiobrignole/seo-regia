import { query } from '@/lib/db'
import { SITI } from '@/siti.config'
import { Telaio } from '@/app/componenti/telaio'
import { VoceRegista } from '@/app/componenti/voce-regista'
import { lezioniRecenti, vociBriefing } from '@/lib/briefing'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Riepilogo = {
  sito_id: string
  clic: number
  impressioni: number
  in_coda: number
}

type Overview = { sito_id: string; clic: number; impressioni: number }

async function riepilogo(): Promise<{
  dati: Riepilogo[]
  overview: Overview[]
  errore: string | null
}> {
  try {
    const perSito = await query<Riepilogo>(
      `SELECT m.sito_id,
              COALESCE(SUM(m.clic), 0) AS clic,
              COALESCE(SUM(m.impressioni), 0) AS impressioni,
              (SELECT COUNT(*) FROM azioni a WHERE a.sito_id = m.sito_id AND a.stato = 'proposta') AS in_coda
         FROM misure m
        WHERE m.fonte = 'search-console'
          AND m.tipo_chiave = 'pagina'
          AND m.giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY m.sito_id`
    )
    let overview: Overview[] = []
    try {
      overview = await query<Overview>(
        `SELECT sito_id,
                COALESCE(SUM(clic), 0) AS clic,
                COALESCE(SUM(impressioni), 0) AS impressioni
           FROM misure
          WHERE fonte = 'search-console-ai'
            AND tipo_chiave = 'pagina'
            AND giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          GROUP BY sito_id`
      )
    } catch {
      overview = []
    }
    return { dati: perSito, overview, errore: null }
  } catch (e) {
    return { dati: [], overview: [], errore: (e as Error).message }
  }
}

type Esecuzione = {
  lavoro: string
  iniziata_il: Date | string
  esito: string | null
  messaggio: string | null
}

export default async function Pannello() {
  const { dati, overview, errore } = await riepilogo()
  const perSito = new Map(dati.map((d) => [d.sito_id, d]))
  const perAi = new Map(overview.map((d) => [d.sito_id, d]))
  const briefing = errore ? null : await vociBriefing()
  const lezioni = errore ? [] : await lezioniRecenti()
  let esecuzioni: Esecuzione[] = []
  if (!errore) {
    try {
      esecuzioni = await query<Esecuzione>(
        `SELECT lavoro, iniziata_il, esito, messaggio FROM esecuzioni ORDER BY id DESC LIMIT 8`
      )
    } catch {
      esecuzioni = []
    }
  }

  const nienteUrgente =
    briefing &&
    briefing.urgente.length === 0 &&
    briefing.importante.length === 0

  return (
    <Telaio
      titolo="Regia SEO"
      sottotitolo="Due banchi pubblicita, mai una cassa unica: Brignole a pagamento, Biography Library solo Grants."
    >
      {errore && (
        <div className="al-avviso">
          <strong>Il database non risponde ancora.</strong>
          <p style={{ margin: '8px 0 0' }}>
            Riempi i valori DB_ e apri <code>/api/setup/migra?chiave=LA_CHIAVE</code>. Dettaglio tecnico:{' '}
            {errore}
          </p>
        </div>
      )}

      <h2>Siti</h2>
      <table className="al-tabella">
        <thead>
          <tr>
            <th>Sito</th>
            <th>Clic 30 giorni</th>
            <th>Impressioni</th>
            <th>Risposte generate</th>
            <th>In attesa di te</th>
            <th>Automazione</th>
          </tr>
        </thead>
        <tbody>
          {SITI.map((s) => {
            const r = perSito.get(s.id)
            const ai = perAi.get(s.id)
            const vuoto = !r || (Number(r.clic) === 0 && Number(r.impressioni) === 0)
            return (
              <tr key={s.id}>
                <td>
                  <Link href={`/sito/${s.id}`} style={{ fontWeight: 700 }}>
                    {s.nome}
                  </Link>
                  <div className="al-muted">{s.dominio}</div>
                </td>
                <td className="al-numeri">
                  {r ? Number(r.clic).toLocaleString('it-CH') : '—'}
                  {s.id === 'lunanihongo' && vuoto ? (
                    <div className="al-muted">zero per ora: e normale</div>
                  ) : null}
                </td>
                <td className="al-numeri">{r ? Number(r.impressioni).toLocaleString('it-CH') : '—'}</td>
                <td className="al-numeri">
                  {ai && Number(ai.impressioni) > 0
                    ? `${Number(ai.impressioni).toLocaleString('it-CH')} sguardi, ${Number(ai.clic).toLocaleString('it-CH')} clic`
                    : 'ancora nessuna'}
                </td>
                <td className="al-numeri">
                  {r && Number(r.in_coda) > 0 ? <strong>{r.in_coda}</strong> : '0'}
                </td>
                <td>{s.automazioneAttiva ? 'attiva' : 'spenta'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <h2>Ultimi lavori notturni</h2>
      {esecuzioni.length === 0 ? (
        <p className="al-sezione-vuota">
          Ancora nessuno. Quando Hostinger chiamera le rotte, compariranno qui.
        </p>
      ) : (
        <ul style={{ paddingLeft: 18, fontSize: 14 }}>
          {esecuzioni.map((e, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <strong>{e.lavoro}</strong> {String(e.iniziata_il).slice(0, 16)}: {e.esito ?? 'in corso'}
              {e.messaggio ? `: ${e.messaggio}` : ''}
            </li>
          ))}
        </ul>
      )}

      {briefing && !briefing.errore && (
        <>
          {nienteUrgente && (
            <p className="al-muted">Questa settimana niente di urgente. Il resto, se c e, sta nelle schede dei siti.</p>
          )}

          {briefing.urgente.length > 0 && (
            <>
              <h2>Da fare adesso</h2>
              <div className="al-griglia-voci">
                {briefing.urgente.map((v, i) => (
                  <VoceRegista key={`u-${v.href}-${i}`} voce={v} />
                ))}
              </div>
            </>
          )}

          {briefing.importante.length > 0 && (
            <>
              <h2>Da fare</h2>
              <div className="al-griglia-voci">
                {briefing.importante.map((v, i) => (
                  <VoceRegista key={`i-${v.href}-${i}`} voce={v} />
                ))}
              </div>
            </>
          )}
          {briefing.nascoste > 0 && (
            <p className="al-muted">
              Altre {briefing.nascoste} {briefing.nascoste === 1 ? 'proposta sta' : 'proposte stanno'} nelle schede
              dei siti: qui solo le piu urgenti.
            </p>
          )}
        </>
      )}

      {lezioni.length > 0 && (
        <>
          <h2>Cosa abbiamo imparato</h2>
          {lezioni.map((l, i) => (
            <article key={`${l.href}-${i}`} className="al-scheda">
              <p className="al-muted">{l.nomeSito}</p>
              <p className="al-bersaglio">{l.bersaglio}</p>
              <p>{l.testo}</p>
              <a className="al-voce-href" href={l.href}>
                Storico
              </a>
            </article>
          ))}
        </>
      )}
    </Telaio>
  )
}
