import { query } from '@/lib/db'
import { SITI } from '@/siti.config'

export const dynamic = 'force-dynamic'

type Riepilogo = {
  sito_id: string
  clic: number
  impressioni: number
  in_coda: number
}

async function riepilogo(): Promise<{ dati: Riepilogo[]; errore: string | null }> {
  try {
    const dati = await query<Riepilogo>(
      `SELECT s.sito_id,
              COALESCE(SUM(m.clic), 0)        AS clic,
              COALESCE(SUM(m.impressioni), 0) AS impressioni,
              (SELECT COUNT(*) FROM azioni a
                WHERE a.sito_id = s.sito_id AND a.stato = 'proposta') AS in_coda
         FROM (SELECT DISTINCT sito_id FROM misure) s
         LEFT JOIN misure m
                ON m.sito_id = s.sito_id
               AND m.fonte = 'search-console'
               AND m.tipo_chiave = 'pagina'
               AND m.giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY s.sito_id`
    )
    return { dati, errore: null }
  } catch (e) {
    return { dati: [], errore: (e as Error).message }
  }
}

export default async function Pannello() {
  const { dati, errore } = await riepilogo()
  const perSito = new Map(dati.map((d) => [d.sito_id, d]))

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px 80px' }}>
      <header style={{ borderBottom: '2px solid #161A18', paddingBottom: 20, marginBottom: 32 }}>
        <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#1F6F5C' }}>
          Pannello interno
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
          <h1 style={{ margin: '8px 0 0', fontSize: 34, letterSpacing: '-.02em' }}>Regia SEO</h1>
          <form method="POST" action="/api/uscita">
            <button
              type="submit"
              style={{
                background: 'none',
                border: '1px solid #C4CAC3',
                borderRadius: 4,
                padding: '5px 11px',
                fontSize: 12.5,
                color: '#4A524E',
                cursor: 'pointer',
                fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              }}
            >
              Esci
            </button>
          </form>
        </div>
      </header>

      {errore && (
        <div
          style={{
            background: '#F6E7DF',
            borderLeft: '3px solid #A8431C',
            padding: '16px 20px',
            marginBottom: 28,
            borderRadius: '0 4px 4px 0',
          }}
        >
          <strong>Il database non risponde ancora.</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>
            Riempi i valori DB_ in <code>.env.local</code> e lancia <code>npm run db:migra</code>. Dettaglio
            tecnico: {errore}
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
            return (
              <tr key={s.id} style={{ borderBottom: '1px solid #DDE1DC' }}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ fontWeight: 600 }}>{s.nome}</div>
                  <div style={{ fontSize: 12.5, color: '#7C857F' }}>{s.dominio}</div>
                </td>
                <td style={{ padding: '11px 14px', fontVariantNumeric: 'tabular-nums' }}>
                  {r ? Number(r.clic).toLocaleString('it-CH') : '—'}
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

      <p style={{ marginTop: 32, fontSize: 14, color: '#4A524E', maxWidth: '62ch' }}>
        Le colonne restano vuote finché il primo lavoro notturno non ha girato. Per lanciarlo a mano:{' '}
        <code>curl -H &quot;x-chiave-cron: LA_CHIAVE&quot; https://seo.brignole.ch/api/cron/raccolta</code>
      </p>
    </main>
  )
}
