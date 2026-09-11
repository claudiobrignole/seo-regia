import type { Sito } from '@/siti.config'

/**
 * Scrittura su WordPress tramite password applicativa.
 * Non e la password del tuo account: e una chiave separata, che revochi
 * dal tuo profilo utente senza toccare nient altro.
 *
 * Su brignole.ch e Aelle i titoli passano dai campi di Rank Math.
 * robots.txt passa dal plugin Regia robots (o, se manca, Claudio lo incolla
 * in Rank Math a mano).
 */

function credenziali(s: Sito) {
  if (s.scrittura.tipo !== 'wordpress') throw new Error(`${s.id} non e un sito WordPress`)
  const p = s.scrittura.prefissoCredenziali
  const utente = process.env[`${p}_UTENTE`]?.trim()
  // WordPress mostra la password a gruppi di quattro con spazi: il server li ignora.
  // Li togliamo qui, cosi Hostinger o .env.local possono tenerli o no.
  const password = process.env[`${p}_PASSWORD_APP`]?.replace(/\s+/g, '')
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

/** Basi REST che non sono articoli o pagine: una 404 qui non deve far fallire la scrittura. */
const BASI_NON_CONTENUTO = new Set([
  'types',
  'statuses',
  'global-styles',
  'templates',
  'template-parts',
  'navigation',
  'font-families',
  'font-faces',
  'font-collections',
  'media',
  'blocks',
  'block-types',
  'block-renderer',
  'block-patterns',
  'pattern-directory',
  'menu-items',
  'menus',
  'users',
  'comments',
  'taxonomies',
  'search',
  'settings',
  'themes',
  'plugins',
  'sidebars',
  'widgets',
  'widget-types',
])

async function elencoPerSlug(s: Sito, tipo: string, slug: string): Promise<{ id: number }[]> {
  try {
    const trovati = await chiama(s, `wp/v2/${tipo}?slug=${encodeURIComponent(slug)}`)
    return Array.isArray(trovati) ? trovati : []
  } catch {
    return []
  }
}

/** Trova il contenuto a partire dall indirizzo pubblico, inclusa la home. */
export async function trovaContenuto(s: Sito, url: string): Promise<{ id: number; tipo: string } | null> {
  const u = new URL(url)
  const pezzi = u.pathname.split('/').filter(Boolean)
  const tipi = await basiRest(s)

  if (pezzi.length === 0) {
    try {
      const settings = await chiama(s, 'wp/v2/settings')
      const id = Number(settings.page_on_front)
      if (id) return { id, tipo: 'pages' }
    } catch {
      /* l utente applicazione potrebbe non leggere le impostazioni */
    }
    return (await trovaDaHtml(s, url, tipi)) ?? null
  }

  const slug = pezzi[pezzi.length - 1]
  for (const tipo of tipi) {
    const trovati = await elencoPerSlug(s, tipo, slug)
    if (trovati.length) return { id: trovati[0].id, tipo }
  }
  return trovaDaHtml(s, url, tipi)
}

async function trovaDaHtml(
  s: Sito,
  url: string,
  tipi: string[]
): Promise<{ id: number; tipo: string } | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'RegiaSEO/1.0 (+pannello interno Brignole)' },
    })
    if (!res.ok) return null
    const html = await res.text()
    const id =
      Number(html.match(/[?&]p=(\d+)/)?.[1]) ||
      Number(html.match(/\bpostid-(\d+)\b/)?.[1]) ||
      Number(html.match(/\bpage-id-(\d+)\b/)?.[1]) ||
      0
    if (!id) return null
    for (const tipo of tipi) {
      try {
        const dato = await chiama(s, `wp/v2/${tipo}/${id}`)
        if (dato?.id) return { id: Number(dato.id), tipo }
      } catch {
        /* tipo sbagliato per questo id */
      }
    }
  } catch {
    return null
  }
  return null
}

async function basiRest(s: Sito): Promise<string[]> {
  try {
    const tipi = await chiama(s, 'wp/v2/types')
    const basi = Object.values(tipi as Record<string, { rest_base?: string; rest_namespace?: string }>)
      .filter((t) => (t.rest_namespace ?? 'wp/v2') === 'wp/v2' && t.rest_base)
      .map((t) => t.rest_base as string)
      .filter((b) => !BASI_NON_CONTENUTO.has(b))
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

function erroreRobotsWordpress(e: unknown): Error {
  const m = (e as Error).message
  if (/\b404\b/.test(m)) {
    return new Error(
      'Su WordPress manca il plugin Regia robots (cartella plugin-wp/regia-robots nel progetto). Installa, attiva, e l utente della password applicativa deve essere Amministratore. Oppure copia il testo della scheda: Rank Math in modalita avanzata → Impostazioni generali → Modifica robots.txt. Se in File Manager c e un file robots.txt nella radice, cancellalo prima, sennò Rank Math non vale.'
    )
  }
  if (/\b403\b/.test(m)) {
    return new Error(
      'L utente della password applicativa non puo cambiare le impostazioni del sito. Rendilo Amministratore, oppure copia il testo in Rank Math: modalita avanzata, Impostazioni generali, Modifica robots.txt.'
    )
  }
  if (/\b409\b/.test(m)) {
    return new Error(
      'Esiste un file robots.txt fisico nella radice del sito: Rank Math non lo sovrascrive. In File Manager cancellalo (o sostituiscilo col testo della scheda), poi Approva di nuovo.'
    )
  }
  return e instanceof Error ? e : new Error(String(e))
}

/** Scrive robots.txt via plugin Regia robots (Rank Math o filtro del sito). */
export async function scriviRobots(s: Sito, testo: string): Promise<void> {
  try {
    await chiama(s, 'regia-seo/v1/robots', {
      method: 'POST',
      body: JSON.stringify({ testo }),
    })
  } catch (e) {
    throw erroreRobotsWordpress(e)
  }
}
