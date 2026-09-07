import { google } from 'googleapis'
import { auth } from './google'
import { salvaMisura } from '@/lib/db'
import type { Sito } from '@/siti.config'

/**
 * La Search Console conta tutti, anche chi rifiuta i cookie:
 * per il traffico di ricerca e questa la fonte, non Analytics.
 */

export type RigaRicerca = {
  chiave: string
  clic: number
  impressioni: number
  ctr: number
  posizione: number
}

async function interroga(
  s: Sito,
  dimensione: 'page' | 'query',
  da: string,
  a: string,
  limite = 5000
): Promise<RigaRicerca[]> {
  const api = google.searchconsole({ version: 'v1', auth: auth(s.identita) as any })
  const righe: RigaRicerca[] = []
  let inizio = 0

  // La Search Console pagina a 25000 righe: si scorre finche restituisce qualcosa.
  for (;;) {
    const res = await api.searchanalytics.query({
      siteUrl: s.searchConsole,
      requestBody: {
        startDate: da,
        endDate: a,
        dimensions: [dimensione],
        rowLimit: Math.min(limite, 25000),
        startRow: inizio,
        type: 'web',
      },
    })
    const lotto = res.data.rows ?? []
    for (const r of lotto) {
      righe.push({
        chiave: r.keys?.[0] ?? '',
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

  for (const [dimensione, tipo] of [
    ['page', 'pagina'],
    ['query', 'query'],
  ] as const) {
    const righe = await interroga(s, dimensione, da, a)
    for (const r of righe) {
      if (!r.chiave) continue
      await salvaMisura({
        sitoId: s.id,
        fonte: 'search-console',
        giorno: a,
        chiave: r.chiave,
        tipoChiave: tipo,
        clic: r.clic,
        impressioni: r.impressioni,
        posizione: Number(r.posizione.toFixed(2)),
        extra: { ctr: r.ctr, finestra: { da, a } },
      })
      scritte++
    }
  }
  return scritte
}

/**
 * Rapporto sulle funzionalita di AI generativa, ancora in prova.
 * Su Aelle vale 9.480 impressioni in tre mesi su 193 pagine: va tenuto
 * su una riga separata, perche sono impressioni che quasi non producono clic.
 */
export async function raccogliAI(s: Sito, da: string, a: string): Promise<number> {
  const api = google.searchconsole({ version: 'v1', auth: auth(s.identita) as any })
  try {
    const res = await api.searchanalytics.query({
      siteUrl: s.searchConsole,
      requestBody: {
        startDate: da,
        endDate: a,
        dimensions: ['page'],
        rowLimit: 5000,
        // Nota: il nome del filtro per le superfici AI cambia mentre il rapporto
        // e in versione di prova. Se l API lo rifiuta non blocchiamo la raccolta.
        dimensionFilterGroups: [
          { filters: [{ dimension: 'searchAppearance', operator: 'equals', expression: 'AI_OVERVIEW' }] },
        ],
        type: 'web',
      },
    })
    let n = 0
    for (const r of res.data.rows ?? []) {
      await salvaMisura({
        sitoId: s.id,
        fonte: 'search-console',
        giorno: a,
        chiave: r.keys?.[0] ?? '',
        tipoChiave: 'pagina',
        clic: r.clicks ?? 0,
        impressioni: r.impressions ?? 0,
        posizione: r.position ?? null,
        extra: { superficie: 'ai', finestra: { da, a } },
      })
      n++
    }
    return n
  } catch (e) {
    // Il rapporto e in versione di prova: se non risponde, si prosegue.
    console.warn(`[ai] ${s.id}: rapporto non disponibile`, (e as Error).message)
    return 0
  }
}
