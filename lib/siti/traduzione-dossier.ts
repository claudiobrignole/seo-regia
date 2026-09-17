import * as cheerio from 'cheerio'
import type { Sito } from '@/siti.config'

/**
 * Dati di traduzione per il dossier: solo lettura, nessuna scrittura.
 * TranslatePress disegna /en/... al volo; qui si vede se hreflang e canonical
 * puntano all originale giusto.
 */

export type HreflangVoce = { lingua: string; url: string }

export type DiagnosiTraduzione = {
  eTradotta: boolean
  lingua: string | null
  originaleUrl: string | null
  canonical: string | null
  hreflang: HreflangVoce[]
  canonicalCombacia: boolean | null
  hreflangHaOriginale: boolean | null
  hreflangHaSeStessa: boolean | null
  nota: string
}

function linguaDaPercorso(s: Sito, url: string): string | null {
  try {
    const primo = new URL(url).pathname.split('/').filter(Boolean)[0]?.toLowerCase()
    if (!primo) return null
    const altre = s.lingue.slice(1).map((l) => l.toLowerCase())
    return altre.includes(primo) ? primo : null
  } catch {
    return null
  }
}

export async function diagnosiTraduzione(s: Sito, url: string): Promise<DiagnosiTraduzione | null> {
  if (s.traduzioni !== 'translatepress') return null
  const lingua = linguaDaPercorso(s, url)
  if (!lingua) {
    return {
      eTradotta: false,
      lingua: null,
      originaleUrl: null,
      canonical: null,
      hreflang: [],
      canonicalCombacia: null,
      hreflangHaOriginale: null,
      hreflangHaSeStessa: null,
      nota: 'Pagina nella lingua originale del sito.',
    }
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'RegiaSEO/1.0 (+dossier)' },
      signal: AbortSignal.timeout(12_000),
      redirect: 'follow',
    })
    const html = await res.text()
    const $ = cheerio.load(html)
    const canonical = $('link[rel="canonical"]').attr('href')?.trim() || null
    const hreflang: HreflangVoce[] = []
    $('link[rel="alternate"][hreflang]').each((_, el) => {
      const l = $(el).attr('hreflang')?.trim()
      const href = $(el).attr('href')?.trim()
      if (l && href) hreflang.push({ lingua: l, url: href })
    })

    const originale =
      hreflang.find((h) => {
        const l = h.lingua.toLowerCase()
        return l === s.lingue[0]?.toLowerCase() || l.startsWith(`${s.lingue[0]?.toLowerCase()}-`)
      })?.url ?? null

    const norm = (u: string) => u.replace(/\/$/, '').toLowerCase()
    const canonicalCombacia = canonical && originale ? norm(canonical) === norm(url) : null
    const hreflangHaOriginale = originale
      ? hreflang.some((h) => norm(h.url) === norm(originale))
      : null
    const hreflangHaSeStessa = hreflang.some((h) => norm(h.url) === norm(url))

    let nota =
      `Versione ${lingua.toUpperCase()} (TranslatePress). ` +
      (originale ? `Originale = ${originale}. ` : 'Originale non trovato negli hreflang. ')
    if (canonicalCombacia === false) {
      nota += `Il canonical (${canonical}) non punta a questa pagina tradotta. `
    }
    if (hreflangHaSeStessa === false) {
      nota += 'Negli hreflang manca questa stessa pagina. '
    }
    if (hreflangHaOriginale === false) {
      nota += 'Negli hreflang manca l originale. '
    }
    if (canonicalCombacia !== false && hreflangHaSeStessa !== false && hreflangHaOriginale !== false) {
      nota += 'Canonical e hreflang sembrano coerenti.'
    }

    return {
      eTradotta: true,
      lingua,
      originaleUrl: originale,
      canonical,
      hreflang,
      canonicalCombacia,
      hreflangHaOriginale,
      hreflangHaSeStessa,
      nota,
    }
  } catch (e) {
    return {
      eTradotta: true,
      lingua,
      originaleUrl: null,
      canonical: null,
      hreflang: [],
      canonicalCombacia: null,
      hreflangHaOriginale: null,
      hreflangHaSeStessa: null,
      nota: `Non riesco a leggere la pagina per gli hreflang: ${(e as Error).message}`,
    }
  }
}
