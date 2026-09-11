import * as cheerio from 'cheerio'
import { query } from '@/lib/db'
import { annota, segnaRifiutata } from '@/lib/registro'

/**
 * Archivio 1991-2001 di Aelle Hip Hop Magazine.
 * I titoli (e le descrizioni, e l H1) sono quelli originali della rivista:
 * non si propongono, non si riscrivono, non si Approva.
 *
 * Categoria WordPress 181 (slug archivio) e i suoi figli, piu le versioni
 * inglesi elencate in /en/archive/. Le interviste e gli articoli nuovi
 * restano modificabili.
 */

export const SITO_ARCHIVIO = 'aelle'
const CATEGORIA_ARCHIVIO = 181
const UA = { 'user-agent': 'RegiaSEO/1.0 (+pannello interno Brignole)' }
const CACHE_MS = 6 * 60 * 60 * 1000

const CAMPI_BLOCCATI = new Set(['titolo', 'descrizione', 'h1'])

const ELENCHI = [
  'https://aelle.hiphop/archivio/',
  'https://aelle.hiphop/en/archive/',
]

let cache: { quando: number; chiavi: Set<string> } | null = null

export function normalizzaUrlPagina(url: string): string {
  try {
    const u = new URL(url)
    let host = u.hostname.toLowerCase()
    if (host.startsWith('www.')) host = host.slice(4)
    const percorso = decodeURIComponent(u.pathname).replace(/\/+$/, '') || '/'
    return `https://${host}${percorso}`
  } catch {
    return url.trim().replace(/\/+$/, '')
  }
}

function percorsoElenco(url: string): boolean {
  try {
    const p = new URL(normalizzaUrlPagina(url)).pathname
    return p === '/archivio' || p.startsWith('/archivio/') || p === '/en/archive' || p.startsWith('/en/archive/')
  } catch {
    return false
  }
}

async function jsonWp<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { headers: UA, redirect: 'follow' })
  if (!res.ok) return null
  return (await res.json()) as T
}

async function linkDaElenco(pagina: string): Promise<string[]> {
  const res = await fetch(pagina, { headers: UA, redirect: 'follow' })
  if (!res.ok) return []
  const $ = cheerio.load(await res.text())
  const out: string[] = []
  $('h3.nectar-blocks-title__text').each((_, el) => {
    const href = $(el).closest('a').attr('href')
    if (href) out.push(href)
  })
  return out
}

async function raccogliChiavi(): Promise<Set<string>> {
  const chiavi = new Set<string>()
  for (const elenco of ELENCHI) {
    chiavi.add(normalizzaUrlPagina(elenco))
  }

  const articoli = await jsonWp<{ link?: string }[]>(
    `https://aelle.hiphop/wp-json/wp/v2/posts?categories=${CATEGORIA_ARCHIVIO}&per_page=100&_fields=link`
  )
  for (const a of articoli ?? []) {
    if (a.link) chiavi.add(normalizzaUrlPagina(a.link))
  }

  for (const base of ELENCHI) {
    for (let n = 1; n <= 12; n++) {
      const pagina = n === 1 ? base : `${base}page/${n}/`
      const trovati = await linkDaElenco(pagina)
      if (!trovati.length) break
      for (const href of trovati) chiavi.add(normalizzaUrlPagina(href))
    }
  }

  return chiavi
}

export async function chiaviArchivioAelle(): Promise<Set<string>> {
  if (cache && Date.now() - cache.quando < CACHE_MS) return cache.chiavi
  try {
    const chiavi = await raccogliChiavi()
    cache = { quando: Date.now(), chiavi }
    return chiavi
  } catch (e) {
    console.warn(`[archivio-aelle] elenco non letto: ${(e as Error).message}`)
    return cache?.chiavi ?? new Set(ELENCHI.map(normalizzaUrlPagina))
  }
}

export function campoArchivioBloccato(campo: string): boolean {
  return CAMPI_BLOCCATI.has(campo)
}

export async function eArticoloArchivioAelle(sitoId: string, url: string): Promise<boolean> {
  if (sitoId !== SITO_ARCHIVIO) return false
  if (percorsoElenco(url)) return true
  const chiavi = await chiaviArchivioAelle()
  return chiavi.has(normalizzaUrlPagina(url))
}

export async function propostaIntoccabile(sitoId: string, bersaglio: string, campo: string): Promise<boolean> {
  if (!campoArchivioBloccato(campo)) return false
  return eArticoloArchivioAelle(sitoId, bersaglio)
}

/** Chiude le proposte gia in coda su titoli e testi dell archivio. Non tocca i siti. */
export async function chiudiProposteArchivio(): Promise<number> {
  const righe = await query<{ id: number; bersaglio: string; campo: string }>(
    `SELECT id, bersaglio, campo FROM azioni
      WHERE sito_id = ?
        AND stato IN ('proposta','approvata','fallita')
        AND campo IN ('titolo','descrizione','h1')`,
    [SITO_ARCHIVIO]
  )
  let n = 0
  for (const r of righe) {
    if (!(await propostaIntoccabile(SITO_ARCHIVIO, r.bersaglio, r.campo))) continue
    await segnaRifiutata(r.id)
    await annota(SITO_ARCHIVIO, 'rifiutata', r.id, {
      motivo: 'Articolo dell archivio 1991-2001: il titolo originale della rivista non si tocca.',
    })
    n++
  }
  return n
}
