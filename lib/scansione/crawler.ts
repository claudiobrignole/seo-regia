import * as cheerio from 'cheerio'
import { query } from '@/lib/db'
import type { Sito } from '@/siti.config'

/**
 * Scansione gentile: una pagina alla volta, con pausa.
 * Non serve andare veloci, serve non disturbare i siti veri.
 */

const PAUSA_MS = 700
const MAX_PAGINE = 800

export type Fotografia = {
  url: string
  stato: number
  ms: number
  titolo: string | null
  descrizione: string | null
  h1: string | null
  lingua: string | null
  parole: number
  haJsonLd: boolean
  haCanonical: boolean
  linkInterni: string[]
}

const attendi = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function leggiPagina(url: string): Promise<Fotografia | null> {
  const inizio = Date.now()
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'RegiaSEO/1.0 (+pannello interno Brignole)' },
    })
    const ms = Date.now() - inizio
    const html = await res.text()
    const $ = cheerio.load(html)

    const origine = new URL(url).origin
    const linkInterni = new Set<string>()
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href')
      if (!href) return
      try {
        const assoluto = new URL(href, url)
        if (assoluto.origin === origine) {
          assoluto.hash = ''
          linkInterni.add(assoluto.toString())
        }
      } catch {
        /* href non valido: si ignora */
      }
    })

    const testo = $('body').text().replace(/\s+/g, ' ').trim()

    return {
      url,
      stato: res.status,
      ms,
      titolo: $('head title').first().text().trim() || null,
      descrizione: $('meta[name="description"]').attr('content')?.trim() ?? null,
      h1: $('h1').first().text().trim() || null,
      lingua: $('html').attr('lang') ?? null,
      parole: testo ? testo.split(' ').length : 0,
      haJsonLd: $('script[type="application/ld+json"]').length > 0,
      haCanonical: $('link[rel="canonical"]').length > 0,
      linkInterni: [...linkInterni],
    }
  } catch (e) {
    console.warn(`[scansione] ${url}: ${(e as Error).message}`)
    return null
  }
}

/** Percorre il sito partendo dalla sitemap, o dalla home se la sitemap manca. */
export async function scansiona(s: Sito): Promise<number> {
  const partenze = await indirizziDaSitemap(s.dominio)
  const coda = partenze.length ? partenze : [`https://${s.dominio}/`]
  const viste = new Set<string>()
  const entranti = new Map<string, number>()
  let salvate = 0

  while (coda.length && viste.size < MAX_PAGINE) {
    const url = coda.shift()!
    if (viste.has(url)) continue
    viste.add(url)

    const f = await leggiPagina(url)
    await attendi(PAUSA_MS)
    if (!f) continue

    for (const l of f.linkInterni) {
      entranti.set(l, (entranti.get(l) ?? 0) + 1)
      if (!viste.has(l) && coda.length + viste.size < MAX_PAGINE) coda.push(l)
    }

    await query(
      `INSERT INTO pagine
        (sito_id, url, titolo, descrizione, h1, lingua, parole, ha_jsonld, ha_canonical,
         stato_http, ms_risposta, link_interni, ultima_scansione)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW())
       ON DUPLICATE KEY UPDATE
         titolo=VALUES(titolo), descrizione=VALUES(descrizione), h1=VALUES(h1),
         lingua=VALUES(lingua), parole=VALUES(parole), ha_jsonld=VALUES(ha_jsonld),
         ha_canonical=VALUES(ha_canonical), stato_http=VALUES(stato_http),
         ms_risposta=VALUES(ms_risposta), link_interni=VALUES(link_interni),
         ultima_scansione=NOW()`,
      [
        s.id, f.url.slice(0, 760), f.titolo, f.descrizione, f.h1, f.lingua, f.parole,
        f.haJsonLd ? 1 : 0, f.haCanonical ? 1 : 0, f.stato, f.ms, f.linkInterni.length,
      ]
    )
    salvate++
  }

  // Le pagine orfane, quelle che nessun link interno raggiunge, si vedono da qui.
  for (const [url, n] of entranti) {
    await query('UPDATE pagine SET link_entranti = ? WHERE sito_id = ? AND url = ?', [n, s.id, url.slice(0, 760)])
  }

  return salvate
}

async function indirizziDaSitemap(dominio: string): Promise<string[]> {
  const candidate = [
    `https://${dominio}/sitemap_index.xml`,
    `https://${dominio}/sitemap.xml`,
  ]
  for (const url of candidate) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const xml = await res.text()
      const loc = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
      if (!loc.length) continue

      // Indice di sitemap: si scende di un livello.
      if (loc.every((l) => l.endsWith('.xml'))) {
        const tutte: string[] = []
        for (const sub of loc.slice(0, 20)) {
          const r2 = await fetch(sub)
          if (!r2.ok) continue
          const x2 = await r2.text()
          tutte.push(...[...x2.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()))
        }
        return tutte.filter((u) => !u.endsWith('.xml'))
      }
      return loc
    } catch {
      /* si prova la candidata successiva */
    }
  }
  return []
}
