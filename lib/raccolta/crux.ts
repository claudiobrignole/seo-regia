import { salvaMisura } from '@/lib/db'
import { SITI, type Sito } from '@/siti.config'
import { giornoIso } from '@/lib/date'

function origini(): { origine: string; siti: Sito[] }[] {
  const m = new Map<string, Sito[]>()
  for (const s of SITI) {
    const origine = `https://${s.dominio}`
    const elenco = m.get(origine) ?? []
    elenco.push(s)
    m.set(origine, elenco)
  }
  return [...m.entries()].map(([origine, siti]) => ({ origine, siti }))
}

/**
 * Vitali Chrome (dataset pubblico). Nessuno script sul sito.
 * Se manca CRUX_API_KEY, si salta.
 */
export async function raccogliCrux(): Promise<number> {
  const chiave = process.env.CRUX_API_KEY?.trim()
  if (!chiave) return 0

  const giorno = giornoIso(0)
  let n = 0
  for (const { origine, siti } of origini()) {
    try {
      const extra = await interroga(origine, chiave)
      for (const s of siti) {
        await salvaMisura({
          sitoId: s.id,
          fonte: 'crux',
          giorno,
          chiave: origine,
          tipoChiave: 'sito',
          extra,
        })
        n++
      }
    } catch (e) {
      console.warn(`[crux] ${origine}: ${(e as Error).message}`)
    }
  }
  return n
}

async function interroga(origine: string, chiave: string) {
  const res = await fetch(
    `https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=${encodeURIComponent(chiave)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ origin: origine }),
    }
  )
  const corpo = await res.json()
  if (res.status === 404) {
    return { mancanoDati: true, passano: null as boolean | null }
  }
  if (!res.ok) {
    throw new Error(corpo?.error?.message ?? `HTTP ${res.status}`)
  }
  const m = corpo.record?.metrics ?? {}
  const lcp = p75(m.largest_contentful_paint)
  const inp = p75(m.interaction_to_next_paint)
  const cls = p75(m.cumulative_layout_shift)
  const passano =
    (lcp == null || lcp <= 2500) && (inp == null || inp <= 200) && (cls == null || cls <= 0.1)
  return {
    mancanoDati: false,
    passano,
    lcp: lcp == null ? null : `${(lcp / 1000).toFixed(2)} s`,
    inp: inp == null ? null : `${Math.round(inp)} ms`,
    cls: cls == null ? null : String(cls),
  }
}

function p75(metrica: { percentiles?: { p75?: number } } | undefined): number | null {
  const v = metrica?.percentiles?.p75
  return typeof v === 'number' ? v : null
}
