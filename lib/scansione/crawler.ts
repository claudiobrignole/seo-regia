import * as cheerio from 'cheerio'
import { raccogliTecnici } from './tecnici'
import { query, unaRiga } from '@/lib/db'
import type { Sito } from '@/siti.config'

/**
 * Scansione gentile: una pagina alla volta, con pausa.
 * Hostinger taglia verso i 60 secondi (504): ogni passata deve
 * chiudere prima. Aelle si riprende dalla coda la notte dopo.
 */

const PAUSA_MS = 700
const MAX_PAGINE_PASSATA = 40
/**
 * Il tempo si conta da quando entra in scansiona, non da quando parte il giro
 * delle pagine: robots.txt, sitemap e riempimento coda costavano venti secondi
 * fuori conteggio, e la passata sforava i sessanta di Hostinger proprio mentre
 * scriveva i risultati.
 */
const LIMITE_MS = 30_000
const MAX_URL_SITEMAP = 400
/** Oltre questo non aspettiamo: un sito che non risponde non deve bloccare la notte. */
const ATTESA_PAGINA_MS = 12_000

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
      signal: AbortSignal.timeout(ATTESA_PAGINA_MS),
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

/**
 * Coda a lotti: quattrocento indirizzi messi uno per uno sono quattrocento
 * viaggi al database, cioe piu tempo di quanto ne resti per leggere le pagine.
 */
async function mettiInCoda(sitoId: string, voci: { url: string; priorita: number }[]) {
  const unici = new Map<string, number>()
  for (const v of voci) {
    const corto = v.url.slice(0, 760)
    unici.set(corto, Math.max(unici.get(corto) ?? 0, v.priorita))
  }
  const righe = [...unici.entries()]
  for (let i = 0; i < righe.length; i += 200) {
    const lotto = righe.slice(i, i + 200)
    await query(
      `INSERT INTO scansione_coda (sito_id, url, priorita, stato)
       VALUES ${lotto.map(() => "(?,?,?,'in_coda')").join(',')}
       ON DUPLICATE KEY UPDATE priorita = GREATEST(priorita, VALUES(priorita))`,
      lotto.flatMap(([url, priorita]) => [sitoId, url, priorita])
    )
  }
}

async function riempiCoda(s: Sito) {
  const restano = await unaRiga<{ n: number }>(
    `SELECT COUNT(*) AS n FROM scansione_coda WHERE sito_id = ? AND stato = 'in_coda'`,
    [s.id]
  )
  if (Number(restano?.n ?? 0) > 0) return

  const daSearch = await query<{ chiave: string; impressioni: number }>(
    `SELECT chiave, SUM(impressioni) AS impressioni FROM misure
      WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina'
        AND giorno >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      GROUP BY chiave
      ORDER BY impressioni DESC
      LIMIT 400`,
    [s.id]
  )
  const voci = daSearch
    .filter((r) => r.chiave.startsWith('http'))
    .map((r) => ({ url: r.chiave, priorita: 1000 + Math.min(Number(r.impressioni), 9999) }))

  const sitemap = await indirizziDaSitemap(s.dominio)
  const partenze = sitemap.length ? sitemap : [`https://${s.dominio}/`]
  voci.push(...partenze.map((url) => ({ url, priorita: 10 })))
  await mettiInCoda(s.id, voci)
}

export async function scansiona(s: Sito): Promise<number> {
  const inizio = Date.now()
  try {
    await raccogliTecnici(s)
  } catch (e) {
    console.warn(`[tecnici] ${s.id}: ${(e as Error).message}`)
  }
  await riempiCoda(s)
  let salvate = 0
  const entranti = new Map<string, number>()

  while (salvate < MAX_PAGINE_PASSATA && Date.now() - inizio < LIMITE_MS) {
    const prossima = await unaRiga<{ url: string }>(
      `SELECT url FROM scansione_coda
        WHERE sito_id = ? AND stato = 'in_coda'
        ORDER BY priorita DESC LIMIT 1`,
      [s.id]
    )
    if (!prossima) break

    await query(`UPDATE scansione_coda SET stato = 'fatta' WHERE sito_id = ? AND url = ?`, [s.id, prossima.url])

    const f = await leggiPagina(prossima.url)
    await attendi(PAUSA_MS)
    if (!f) continue

    for (const l of f.linkInterni) entranti.set(l, (entranti.get(l) ?? 0) + 1)
    await mettiInCoda(
      s.id,
      f.linkInterni.map((url) => ({ url, priorita: 1 }))
    )

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

  // Un aggiornamento per ogni link entrante erano centinaia di viaggi: si
  // raggruppano gli indirizzi che hanno lo stesso conteggio.
  const perConteggio = new Map<number, string[]>()
  for (const [url, n] of entranti) {
    const elenco = perConteggio.get(n) ?? []
    elenco.push(url.slice(0, 760))
    perConteggio.set(n, elenco)
  }
  for (const [n, indirizzi] of perConteggio) {
    for (let i = 0; i < indirizzi.length; i += 200) {
      const lotto = indirizzi.slice(i, i + 200)
      await query(
        `UPDATE pagine SET link_entranti = link_entranti + ?
          WHERE sito_id = ? AND url IN (${lotto.map(() => '?').join(',')})`,
        [n, s.id, ...lotto]
      )
    }
  }

  const ancora = await unaRiga<{ n: number }>(
    `SELECT COUNT(*) AS n FROM scansione_coda WHERE sito_id = ? AND stato = 'in_coda'`,
    [s.id]
  )
  if (Number(ancora?.n ?? 0) === 0) {
    await query(`DELETE FROM scansione_coda WHERE sito_id = ?`, [s.id])
  }

  return salvate
}

async function indirizziDaSitemap(dominio: string): Promise<string[]> {
  const candidate = [`https://${dominio}/sitemap_index.xml`, `https://${dominio}/sitemap.xml`]
  for (const url of candidate) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
      if (!res.ok) continue
      const xml = await res.text()
      const loc = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim())
      if (!loc.length) continue

      if (loc.every((l) => l.endsWith('.xml'))) {
        const tutte: string[] = []
        for (const sub of loc.slice(0, 5)) {
          const r2 = await fetch(sub, { signal: AbortSignal.timeout(8_000) })
          if (!r2.ok) continue
          const x2 = await r2.text()
          tutte.push(...[...x2.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()))
          if (tutte.length >= MAX_URL_SITEMAP) break
        }
        return tutte.filter((u) => !u.endsWith('.xml')).slice(0, MAX_URL_SITEMAP)
      }
      return loc.slice(0, MAX_URL_SITEMAP)
    } catch {
      /* si prova la candidata successiva */
    }
  }
  return []
}
