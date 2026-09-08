import { google } from 'googleapis'
import { auth } from './google'
import { salvaMisura } from '@/lib/db'
import type { Sito } from '@/siti.config'

/**
 * Due avvertenze scritte qui perche non vadano perse.
 *
 * 1. Complianz blocca i tag prima del consenso ai cookie: Analytics vede solo
 *    chi accetta. Non e un errore, e conformita. Quindi Analytics serve per il
 *    comportamento, mai per contare il traffico di ricerca.
 * 2. La proprieta riceve dati falsi inviati da fuori (864 utenti da Singapore
 *    in una settimana). Per questo filtriamo sempre per nome host: i report del
 *    pannello restano puliti anche se la proprieta non lo e.
 */

export async function raccogliComportamento(s: Sito, da: string, a: string): Promise<number> {
  if (!s.analyticsProperty) return 0

  const api = google.analyticsdata({ version: 'v1beta', auth: auth(s.identita) as any })

  const res = await api.properties.runReport({
    property: s.analyticsProperty,
    requestBody: {
      dateRanges: [{ startDate: da, endDate: a }],
      dimensions: [{ name: 'date' }, { name: 'pagePath' }, { name: 'hostName' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'hostName',
          inListFilter: { values: s.hostnameValidi },
        },
      },
      limit: '10000',
    },
  })

  let n = 0
  for (const r of res.data.rows ?? []) {
    const giornoGrezzo = r.dimensionValues?.[0]?.value ?? ''
    const percorso = r.dimensionValues?.[1]?.value ?? ''
    const host = r.dimensionValues?.[2]?.value ?? ''
    if (!s.hostnameValidi.includes(host)) continue
    const giorno = giornoGrezzo.length === 8
      ? `${giornoGrezzo.slice(0, 4)}-${giornoGrezzo.slice(4, 6)}-${giornoGrezzo.slice(6, 8)}`
      : a
    await salvaMisura({
      sitoId: s.id,
      fonte: 'analytics',
      giorno,
      chiave: `https://${host}${percorso}`,
      tipoChiave: 'pagina',
      clic: Number(r.metricValues?.[0]?.value ?? 0),
      extra: {
        utenti: Number(r.metricValues?.[1]?.value ?? 0),
        secondiCoinvolgimento: Number(r.metricValues?.[2]?.value ?? 0),
        avvertenza: 'solo visitatori che hanno accettato i cookie',
      },
    })
    n++
  }
  return n
}
