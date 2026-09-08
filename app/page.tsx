import { query } from '@/lib/db'
import { SITI } from '@/siti.config'
import { Telaio, avviso } from '@/app/componenti/telaio'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Riepilogo = {
  sito_id: string
  clic: number
  impressioni: number
  in_coda: number
}

async function riepilogo(): Promise<{ dati: Riepilogo[]; errore: string | null }> {
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
    return { dati: perSito, errore: null }
  } catch (e) {
    return { dati: [], errore: (e as Error).message }
  }
}

type Esecuzione = {
  lavoro: string
  iniziata_il: Date | string
  esito: string | null
  messaggio: string | null
}

export default async function Pannello() {
  const { dati, errore } = await riepilogo()
  const perSito = new Map(dati.map((d) => [d.sito_id, d]))
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

  return (
    <Telaio titolo="Regia SEO" sottotitolo="Due banchi pubblicita, mai una cassa unica: Brignole a pagamento, Biography Library solo Grants.">
      {errore && (
        <div style={avviso}>
          <strong>Il database non risponde ancora.</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>
            Riempi i valori DB_ e apri <code>/api/setup/migra?chiave=LA_CHIAVE</code>. Dettaglio tecnico: {errore}
          </p>
        </div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
        <thead>
          <tr style={{ background: '#EDEFEC', textAlign: 'left' }}>
            <th style={{ padding: '10px 14px' }}>Sito</th>
            <th style={{ padding: '10px 14px' }}>Clic 30 giorni</th>
            <th style={{ padding: '10px 14px' }}>Impressioni</th>
            <th style={{ padding: '10px 14px' }}>In attesa di te</th>
            <th style={{ padding: '10px 14px' }}>Automazione</th>
          </tr>
        </thead>
        <tbody>
          {SITI.map((s) => {
            const r = perSito.get(s.id)
            const vuoto = !r || (Number(r.clic) === 0 && Number(r.impressioni) === 0)
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #DDE1DC' }}>
                <td style={{ padding: '11px 14px' }}>
                  <Link href={`/sito/${s.id}`} style={{ color: '#161A18', fontWeight: 600 }}>
                    {s.nome}
                  </Link>
                  <div style={{ fontSize: 12.5, color: '#7C857F' }}>{s.dominio}</div>
                </td>
                <td style={{ padding: '11px 14px', fontVariantNumeric: 'tabular-nums' }}>
                  {r ? Number(r.clic).toLocaleString('it-CH') : '—'}
                  {s.id === 'lunanihongo' && vuoto ? (
                    <div style={{ fontSize: 12, color: '#7C857F' }}>zero per ora: e normale</div>
                  ) : null}
                </td>
                <td style={{ padding: '11px 14px', fontVariantNumeric: 'tabular-nums' }}>
                  {r ? Number(r.impressioni).toLocaleString('it-CH') : '—'}
                </td>
                <td style={{ padding: '11px 14px', fontVariantNumeric: 'tabular-nums' }}>
                  {r && Number(r.in_coda) > 0 ? <strong>{r.in_coda}</strong> : '0'}
                </td>
                <td style={{ padding: '11px 14px', fontSize: 13 }}>
                  {s.automazioneAttiva ? 'attiva' : 'spenta'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <h2 style={{ marginTop: 40, fontSize: 18 }}>Ultimi lavori notturni</h2>
      {esecuzioni.length === 0 ? (
        <p style={{ fontSize: 14, color: '#4A524E' }}>
          Ancora nessuno. Quando Hostinger chiamera le rotte, compariranno qui.
        </p>
      ) : (
        <ul style={{ paddingLeft: 18, fontSize: 14 }}>
          {esecuzioni.map((e, i) => (
            <li key={i} style={{ marginBottom: 6 }}>
              <strong>{e.lavoro}</strong> {String(e.iniziata_il).slice(0, 16)} — {e.esito ?? 'in corso'}
              {e.messaggio ? `: ${e.messaggio}` : ''}
            </li>
          ))}
        </ul>
      )}
    </Telaio>
  )
}
