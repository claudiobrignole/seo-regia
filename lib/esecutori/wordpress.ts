import type { Sito } from '@/siti.config'

/**
 * Scrittura su WordPress tramite password applicativa.
 * Non e la password del tuo account: e una chiave separata, che revochi
 * dal tuo profilo utente senza toccare nient altro.
 *
 * Su brignole.ch e Aelle passiamo dai campi di Rank Math, cosi le modifiche
 * restano visibili e correggibili a mano dentro WordPress.
 */

function credenziali(s: Sito) {
  if (s.scrittura.tipo !== 'wordpress') throw new Error(`${s.id} non e un sito WordPress`)
  const p = s.scrittura.prefissoCredenziali
  const utente = process.env[`${p}_UTENTE`]
  const password = process.env[`${p}_PASSWORD_APP`]
  if (!utente || !password) {
    throw new Error(
      `Mancano ${p}_UTENTE o ${p}_PASSWORD_APP nelle variabili d ambiente. ` +
        `Crea una password per le applicazioni dal profilo WordPress e mettila in Hostinger.`
    )
  }
  return { utente, password, base: s.scrittura.base }
}

/** Chiamata REST autenticata. Serve anche al caricamento conversioni Grants. */
export async function chiamaWordpress(s: Sito, percorso: string, opzioni: RequestInit = {}) {
  return chiama(s, percorso, opzioni)
}

async function chiama(s: Sito, percorso: string, opzioni: RequestInit = {}) {
  const { utente, password, base } = credenziali(s)
  const autorizzazione = Buffer.from(`${utente}:${password}`).toString('base64')
  const res = await fetch(`${base}/wp-json/${percorso}`, {
    ...opzioni,
    headers: {
      Authorization: `Basic ${autorizzazione}`,
      'Content-Type': 'application/json',
      ...(opzioni.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`WordPress ${percorso}: ${res.status} ${await res.text()}`)
  return res.json()
}

function usaRankMath(s: Sito): boolean {
  return s.scrittura.tipo === 'wordpress' && s.scrittura.seoPlugin === 'rank-math'
}

/** Trova il contenuto a partire dall indirizzo pubblico, inclusa la home. */
export async function trovaContenuto(s: Sito, url: string): Promise<{ id: number; tipo: string } | null> {
  const u = new URL(url)
  const pezzi = u.pathname.split('/').filter(Boolean)

  if (pezzi.length === 0) {
    try {
      const settings = await chiama(s, 'wp/v2/settings')
      const id = Number(settings.page_on_front)
      if (id) return { id, tipo: 'pages' }
    } catch {
      /* l utente applicazione potrebbe non leggere le impostazioni */
    }
    return null
  }

  const slug = pezzi[pezzi.length - 1]
  const tipi = await basiRest(s)
  for (const tipo of tipi) {
    const trovati = await chiama(s, `wp/v2/${tipo}?slug=${encodeURIComponent(slug)}`)
    if (Array.isArray(trovati) && trovati.length) return { id: trovati[0].id, tipo }
  }
  return null
}

async function basiRest(s: Sito): Promise<string[]> {
  try {
    const tipi = await chiama(s, 'wp/v2/types')
    const basi = Object.values(tipi as Record<string, { rest_base?: string; rest_namespace?: string }>)
      .filter((t) => (t.rest_namespace ?? 'wp/v2') === 'wp/v2' && t.rest_base)
      .map((t) => t.rest_base as string)
      .filter((b) => b !== 'types' && b !== 'statuses')
    const preferiti = ['pages', 'posts', ...basi.filter((b) => b !== 'pages' && b !== 'posts')]
    return [...new Set(preferiti)]
  } catch {
    return ['posts', 'pages']
  }
}

/** Legge il valore attuale prima di scrivere: senza il vecchio non si annulla nulla. */
export async function leggiSeo(s: Sito, url: string): Promise<{ titolo: string | null; descrizione: string | null }> {
  const c = await trovaContenuto(s, url)
  if (!c) return { titolo: null, descrizione: null }
  const dato = await chiama(s, `wp/v2/${c.tipo}/${c.id}?context=edit`)
  const meta = dato.meta ?? {}
  if (usaRankMath(s)) {
    return {
      titolo: meta.rank_math_title ?? dato.title?.raw ?? null,
      descrizione: meta.rank_math_description ?? null,
    }
  }
  return {
    titolo: meta._yoast_wpseo_title ?? dato.title?.raw ?? null,
    descrizione: meta._yoast_wpseo_metadesc ?? null,
  }
}

export async function scriviSeo(
  s: Sito,
  url: string,
  campi: { titolo?: string; descrizione?: string }
): Promise<void> {
  const c = await trovaContenuto(s, url)
  if (!c) {
    throw new Error(
      `Nessun contenuto WordPress corrisponde a ${url}. ` +
        `Se e la home, l utente applicazione deve poter leggere le impostazioni del sito.`
    )
  }

  const corpo: Record<string, unknown> = {}
  const meta: Record<string, string> = {}

  if (usaRankMath(s)) {
    if (campi.titolo !== undefined) meta.rank_math_title = campi.titolo
    if (campi.descrizione !== undefined) meta.rank_math_description = campi.descrizione
    corpo.meta = meta
  } else {
    if (campi.titolo !== undefined) {
      meta._yoast_wpseo_title = campi.titolo
      corpo.title = campi.titolo
    }
    if (campi.descrizione !== undefined) meta._yoast_wpseo_metadesc = campi.descrizione
    if (Object.keys(meta).length) corpo.meta = meta
  }

  await chiama(s, `wp/v2/${c.tipo}/${c.id}`, {
    method: 'POST',
    body: JSON.stringify(corpo),
  })
}
