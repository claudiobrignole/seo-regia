import { google } from 'googleapis'
import { auth } from './google'
import { salvaMisura } from '@/lib/db'
import type { Sito } from '@/siti.config'

/**
 * La Search Console conta tutti, anche chi rifiuta i cookie:
 * per il traffico di ricerca e questa la fonte, non Analytics.
 *
 * Si salva un giorno per volta (dimensione date). Sommare finestre
 * sovrapposte sulla home produceva numeri falsi.
 */

export type RigaRicerca = {
  giorno: string
  chiave: string
  chiave2?: string
  clic: number
  impressioni: number
  ctr: number
  posizione: number
}

async function interroga(
  s: Sito,
  dimensioni: Array<'date' | 'page' | 'query'>,
  da: string,
  a: string,
  limite = 25000
): Promise<RigaRicerca[]> {
  if (!s.searchConsole) return []
  const api = google.searchconsole({ version: 'v1', auth: auth(s.identita) as any })
  const righe: RigaRicerca[] = []
  let inizio = 0

  for (;;) {
    const res = await api.searchanalytics.query({
      siteUrl: s.searchConsole,
      requestBody: {
        startDate: da,
        endDate: a,
        dimensions: dimensioni,
        rowLimit: Math.min(limite, 25000),
        startRow: inizio,
        type: 'web',
      },
    })
    const lotto = res.data.rows ?? []
    for (const r of lotto) {
      const keys = r.keys ?? []
      const haData = dimensioni[0] === 'date'
      righe.push({
        giorno: haData ? (keys[0] ?? a) : a,
        chiave: haData ? (keys[1] ?? '') : (keys[0] ?? ''),
        chiave2: dimensioni.includes('query') && dimensioni.includes('page')
          ? keys[haData ? 2 : 1]
          : undefined,
        clic: r.clicks ?? 0,
        impressioni: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        posizione: r.position ?? 0,
      })
    }
    if (lotto.length < Math.min(limite, 25000) || righe.length >= limite) break
    inizio += lotto.length
  }
  return righe
}

export async function raccogliRicerca(s: Sito, da: string, a: string): Promise<number> {
  let scritte = 0

  for (const r of await interroga(s, ['date', 'page'], da, a)) {
    if (!r.chiave) continue
    await salvaMisura({
      sitoId: s.id,
      fonte: 'search-console',
      giorno: r.giorno,
      chiave: r.chiave,
      tipoChiave: 'pagina',
      clic: r.clic,
      impressioni: r.impressioni,
      posizione: Number(r.posizione.toFixed(2)),
      extra: { ctr: r.ctr },
    })
    scritte++
  }

  for (const r of await interroga(s, ['date', 'query'], da, a)) {
    if (!r.chiave) continue
    await salvaMisura({
      sitoId: s.id,
      fonte: 'search-console',
      giorno: r.giorno,
      chiave: r.chiave,
      tipoChiave: 'query',
      clic: r.clic,
      impressioni: r.impressioni,
      posizione: Number(r.posizione.toFixed(2)),
      extra: { ctr: r.ctr },
    })
    scritte++
  }

  // Coppie pagina + query: servono a chi scrive i titoli. Una fotografia
  // della finestra, non da sommare sulla home.
  for (const r of await interroga(s, ['page', 'query'], da, a, 10000)) {
    if (!r.chiave || !r.chiave2) continue
    await salvaMisura({
      sitoId: s.id,
      fonte: 'search-console',
      giorno: a,
      chiave: `${r.chiave}|||${r.chiave2}`.slice(0, 500),
      tipoChiave: 'pagina_query',
      clic: r.clic,
      impressioni: r.impressioni,
      posizione: Number(r.posizione.toFixed(2)),
      extra: { ctr: r.ctr, pagina: r.chiave, query: r.chiave2, finestra: { da, a } },
    })
    scritte++
  }

  return scritte
}

/**
 * Rapporto sulle funzionalita di AI generativa, ancora in prova.
 * Fonte distinta: altrimenti sovrascrive i clic del risultato classico.
 */
export async function raccogliAI(s: Sito, da: string, a: string): Promise<number> {
  if (!s.searchConsole) return 0
  const api = google.searchconsole({ version: 'v1', auth: auth(s.identita) as any })
  let n = 0
  n += await salvaAI(api, s, da, a, ['date', 'page'], 'pagina')
  n += await salvaAI(api, s, da, a, ['date', 'query'], 'query')
  return n
}

async function salvaAI(
  api: any,
  s: Sito,
  da: string,
  a: string,
  dimensioni: Array<'date' | 'page' | 'query'>,
  tipoChiave: 'pagina' | 'query'
): Promise<number> {
  try {
    const res = await api.searchanalytics.query({
      siteUrl: s.searchConsole!,
      requestBody: {
        startDate: da,
        endDate: a,
        dimensions: dimensioni,
        rowLimit: 5000,
        dimensionFilterGroups: [
          { filters: [{ dimension: 'searchAppearance', operator: 'equals', expression: 'AI_OVERVIEW' }] },
        ],
        type: 'web',
      },
    })
    let n = 0
    for (const r of res.data.rows ?? []) {
      const giorno = r.keys?.[0] ?? a
      const chiave = r.keys?.[1] ?? ''
      if (!chiave) continue
      await salvaMisura({
        sitoId: s.id,
        fonte: 'search-console-ai',
        giorno,
        chiave,
        tipoChiave,
        clic: r.clicks ?? 0,
        impressioni: r.impressions ?? 0,
        posizione: r.position ?? null,
        extra: { superficie: 'ai' },
      })
      n++
    }
    return n
  } catch (e) {
    console.warn(`[ai] ${s.id}/${tipoChiave}: rapporto non disponibile`, (e as Error).message)
    return 0
  }
}
