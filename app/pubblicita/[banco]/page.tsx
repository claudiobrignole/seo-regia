import { notFound } from 'next/navigation'
import { query } from '@/lib/db'
import { Telaio, avviso, bottonePrimario } from '@/app/componenti/telaio'
import type { Identita } from '@/lib/raccolta/google'
import type { BozzaContenuto } from '@/lib/ads/bozza'

export const dynamic = 'force-dynamic'

const BANCHI: Record<string, { identita: Identita; titolo: string; sottotitolo: string }> = {
  brignole: {
    identita: 'brignole',
    titolo: 'Pubblicita Brignole',
    sottotitolo:
      'Soldi tuoi: Aelle Store, Aelle, brignole.ch. Luna Nihongo resta nel ciclo SEO, senza campagna finche non la chiedi. Qui non compare il Grants e non si somma nulla con Biography Library.',
  },
  'biography-library': {
    identita: 'biography-library',
    titolo: 'Pubblicita Biography Library',
    sottotitolo:
      'Solo Ad Grants. Credito Google, non spesa Brignole. Sito senza Analytics ne pixel. Conversioni dai moduli, caricate di notte. Tasso di clic sopra il cinque per cento, destinazione solo i siti dell associazione.',
  },
}

export default async function PaginaPubblicita({ params }: { params: Promise<{ banco: string }> }) {
  const { banco } = await params
  const cfg = BANCHI[banco]
  if (!cfg) notFound()

  let errore: string | null = null
  let campagne: any[] = []
  let giorni: any[] = []
  let bozze: any[] = []
  let verdetti: any[] = []
  let grants: any = null
  let codaConversioni: { stato: string; n: number }[] = []
  let ultimaCaricata: string | null = null

  try {
    campagne = await query(
      `SELECT * FROM campagne WHERE identita = ? ORDER BY nome`,
      [cfg.identita]
    )
    giorni = await query(
      `SELECT campagna_google_id,
              SUM(clic) AS clic, SUM(impressioni) AS impressioni, SUM(costo) AS costo, SUM(conversioni) AS conversioni
         FROM campagne_giorni
        WHERE identita = ? AND giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY campagna_google_id`,
      [cfg.identita]
    )
    bozze = await query(
      `SELECT * FROM campagne_bozze WHERE identita = ? ORDER BY id DESC LIMIT 20`,
      [cfg.identita]
    )
    verdetti = await query(
      `SELECT v.* FROM campagne_verdetti v
        INNER JOIN (
          SELECT campagna_google_id, MAX(id) AS id
            FROM campagne_verdetti WHERE identita = ? GROUP BY campagna_google_id
        ) x ON x.id = v.id`,
      [cfg.identita]
    )
    if (cfg.identita === 'biography-library') {
      const g = await query(`SELECT * FROM adgrants_stato ORDER BY mese DESC LIMIT 1`)
      grants = g[0] ?? null
      try {
        codaConversioni = await query(
          `SELECT stato, COUNT(*) AS n FROM grants_conversioni GROUP BY stato`
        )
        const u = await query<{ quando: Date | string }>(
          `SELECT quando FROM grants_conversioni WHERE stato = 'caricata' ORDER BY caricata_il DESC LIMIT 1`
        )
        ultimaCaricata = u[0]?.quando ? String(u[0].quando).slice(0, 10) : null
      } catch {
        codaConversioni = []
      }
    }
  } catch (e) {
    errore = (e as Error).message
  }

  const perCamp = new Map(giorni.map((g) => [String(g.campagna_google_id), g]))
  const perVerdetto = new Map(verdetti.map((v) => [String(v.campagna_google_id), v]))

  return (
    <Telaio titolo={cfg.titolo} sottotitolo={cfg.sottotitolo}>
      {errore && (
        <div style={avviso}>
          <strong>Dati non ancora disponibili.</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>
            {errore}. Se manca la tabella, lancia di nuovo la migrazione. Se manca il token Ads, vedi le istruzioni tue.
          </p>
        </div>
      )}

      {cfg.identita === 'biography-library' && (
        <div style={{ background: '#EDEFEC', padding: 16, borderRadius: 6, marginBottom: 24, fontSize: 14 }}>
          <strong>Conversioni, senza Analytics sul sito</strong>
          <p style={{ margin: '8px 0 0' }}>
            Le carica il lavoro notturno dai moduli di biographylibrary.org. Non caricare file CSV in Google Ads.
            {codaConversioni.length === 0 && ' Ancora nessuna riga: manca il plugin, o nessuno ha inviato un modulo dopo un clic Grants.'}
            {codaConversioni.map((c) => ` ${c.stato}: ${c.n}.`).join('')}
            {ultimaCaricata ? ` Ultima caricata su Google: ${ultimaCaricata}.` : ''}
          </p>
        </div>
      )}

      {grants && (
        <div
          style={{
            background: grants.conforme ? '#E7F0EA' : '#F6E7DF',
            padding: 16,
            borderRadius: 6,
            marginBottom: 24,
          }}
        >
          <strong>Grants, mese {grants.mese}</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>
            Tasso di clic {grants.ctr != null ? `${(Number(grants.ctr) * 100).toFixed(2)} per cento` : 'n.d.'},
            conversioni {grants.conversioni}. {grants.conforme ? 'Dentro le regole, per ora.' : 'C e un allarme: agisci prima che lo noti Google.'}
          </p>
        </div>
      )}

      <h2 style={{ fontSize: 18 }}>Campagne lette da Google</h2>
      {campagne.length === 0 && !errore && (
        <p>Nessuna campagna in questo banco. E giusto: l altro banco e un account diverso.</p>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginBottom: 32 }}>
        <thead>
          <tr style={{ background: '#EDEFEC', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Nome</th>
            <th style={{ padding: 8 }}>Stato</th>
            <th style={{ padding: 8 }}>Clic 30g</th>
            <th style={{ padding: 8 }}>{cfg.identita === 'biography-library' ? 'Quota usata' : 'Spesa'}</th>
            <th style={{ padding: 8 }}>Consiglio</th>
          </tr>
        </thead>
        <tbody>
          {campagne.map((c) => {
            const g = perCamp.get(String(c.google_id))
            const v = perVerdetto.get(String(c.google_id))
            return (
              <tr key={c.google_id} style={{ borderBottom: '1px solid #DDE1DC' }}>
                <td style={{ padding: 8 }}>{c.nome}</td>
                <td style={{ padding: 8 }}>{c.stato}</td>
                <td style={{ padding: 8 }}>{g ? Number(g.clic).toLocaleString('it-CH') : '—'}</td>
                <td style={{ padding: 8 }}>{g ? Number(g.costo).toFixed(2) : '—'}</td>
                <td style={{ padding: 8, fontSize: 13 }}>
                  {v ? (
                    <>
                      <strong>{v.consiglio}</strong>
                      <div>{v.pro}</div>
                      <div>{v.contro}</div>
                    </>
                  ) : (
                    'Ancora nessun verdetto'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <h2 style={{ fontSize: 18 }}>Bozze da creare a mano su Google Ads</h2>
      <p style={{ fontSize: 14, color: '#4A524E' }}>
        Il pannello non schiaccia Pubblica. Copi questi testi nell account{' '}
        {cfg.identita === 'biography-library' ? 'Grants (Gmail associazione)' : 'a pagamento (Gmail Brignole)'}.
      </p>
      {bozze.map((b) => {
        let c: BozzaContenuto | null = null
        try {
          c = typeof b.contenuto === 'string' ? JSON.parse(b.contenuto) : b.contenuto
        } catch {
          c = null
        }
        return (
          <article key={b.id} style={{ border: '1px solid #DDE1DC', borderRadius: 6, padding: 16, margin: '12px 0', background: '#fff' }}>
            <h3 style={{ marginTop: 0 }}>{b.titolo}</h3>
            <p style={{ fontSize: 13 }}>Stato: {b.stato} · sito {b.sito_id}</p>
            {c && (
              <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>
                <p>Obiettivo: {c.obiettivo}</p>
                <p>Rete: {c.rete} · Budget al giorno: {c.budgetGiornaliero}</p>
                <p>{c.motivoBudget}</p>
                <p>Atterraggio: {c.atterraggio}</p>
                <p>Lingue: {(c.lingue ?? []).join(', ')} · Zone: {(c.zone ?? []).join(', ')}</p>
                <p>Parole: {(c.parole ?? []).map((x) => `${x.testo} (${x.tipo})`).join('; ')}</p>
                <p>Esclusioni: {(c.esclusioni ?? []).join('; ')}</p>
                <p>Titoli:{'\n'}{(c.titoli ?? []).join('\n')}</p>
                <p>Descrizioni:{'\n'}{(c.descrizioni ?? []).join('\n')}</p>
              </div>
            )}
            {b.stato === 'bozza' && (
              <form method="POST" action="/api/campagne/collega" style={{ marginTop: 12 }}>
                <input type="hidden" name="id" value={b.id} />
                <input type="hidden" name="banco" value={banco} />
                <label style={{ fontSize: 13 }}>
                  ID campagna su Google, dopo che l hai creata:{' '}
                  <input name="google_id" required placeholder="1234567890" style={{ padding: 6 }} />
                </label>
                <button type="submit" style={{ ...bottonePrimario, marginLeft: 8 }}>
                  Collega
                </button>
              </form>
            )}
          </article>
        )
      })}
    </Telaio>
  )
}
