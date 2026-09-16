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

async function chiamaGrezza(
  s: Sito,
  percorso: string,
  opzioni: RequestInit = {}
): Promise<{ status: number; corpo: unknown; testo: string }> {
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
  const testo = await res.text()
  let corpo: unknown = null
  try {
    corpo = JSON.parse(testo)
  } catch {
    /* qualche hosting risponde con una pagina HTML: il testo basta per il messaggio */
  }
  return { status: res.status, corpo, testo }
}

async function chiama(s: Sito, percorso: string, opzioni: RequestInit = {}) {
  const r = await chiamaGrezza(s, percorso, opzioni)
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`WordPress ${percorso}: ${r.status} ${r.testo}`)
  }
  return r.corpo as any
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

async function elencoPerSlug(s: Sito, tipo: string, slug: string): Promise<{ id: number; link?: string }[]> {
  try {
    const trovati = await chiama(s, `wp/v2/${tipo}?slug=${encodeURIComponent(slug)}`)
    return Array.isArray(trovati) ? trovati : []
  } catch {
    return []
  }
}

export type Contenuto = {
  id: number
  tipo: string
  /**
   * Riempito quando l indirizzo chiesto non ha un contenuto suo e finisce
   * dentro un altro: le schede prodotto di Ecwid, o un indirizzo vecchio che
   * rimanda. Chi scrive deve fermarsi, altrimenti cambia il titolo del
   * contenitore credendo di cambiare quello della scheda.
   */
  contenitore?: string
}

/** L ultimo pezzo dell indirizzo: per un contenuto vero e il suo slug. */
function ultimoPezzo(url: string): string {
  try {
    const percorso = decodeURIComponent(new URL(url).pathname).replace(/\/+$/, '')
    return (percorso.split('/').pop() ?? '').toLowerCase()
  } catch {
    return ''
  }
}

/**
 * L indirizzo chiesto e davvero quel contenuto?
 *
 * Quando lo troviamo leggendo l HTML, il numero che ne ricaviamo e quello della
 * pagina che ha disegnato quell HTML, e non e detto che sia la stessa cosa: le
 * schede prodotto di Ecwid vivono tutte dentro la pagina del negozio, e un
 * indirizzo vecchio arriva sulla pagina nuova per via di un rimando. In quei
 * casi lo slug non combacia con l ultimo pezzo dell indirizzo, e scrivere
 * cambierebbe il titolo del contenitore credendo di cambiare quello del
 * prodotto. Il prefisso di lingua non serve al confronto: /en/search-products/
 * ha permalink /search-products/, e resta la stessa pagina.
 */
function combacia(url: string, slug: unknown): boolean {
  const atteso = String(slug ?? '').toLowerCase()
  if (!atteso) return true
  return ultimoPezzo(url) === atteso
}

/** Trova il contenuto a partire dall indirizzo pubblico, inclusa la home. */
export async function trovaContenuto(s: Sito, url: string): Promise<Contenuto | null> {
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

async function trovaDaHtml(s: Sito, url: string, tipi: string[]): Promise<Contenuto | null> {
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
        if (dato?.id) {
          const trovato: Contenuto = { id: Number(dato.id), tipo }
          if (!combacia(url, dato.slug)) trovato.contenitore = String(dato.link || dato.slug)
          return trovato
        }
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

/**
 * Titolo e descrizione SEO passano dal plugin Regia robots, non da wp/v2.
 *
 * wp/v2 accetta soltanto i meta registrati per la REST, e Rank Math non
 * registra i suoi: la scrittura rispondeva 200 e non cambiava niente, quindi il
 * pannello diceva "applicata" a una cosa che non era mai arrivata. Il plugin
 * scrive con update_post_meta e rimanda il valore riletto, cosi un ok e un ok.
 */
const META_PLUGIN = 'regia-seo/v1/meta'

type MetaSeo = { titolo: string; descrizione: string; motore: string }

function erroreMetaPlugin(s: Sito, r: { status: number; corpo: any; testo: string }): Error {
  const detto = String(r.corpo?.message ?? '').trim()
  if (r.status === 404) {
    return new Error(
      `Su ${s.nome} il plugin Regia robots manca o e la versione vecchia (serve la 1.1.0). ` +
        `Il titolo SEO di Rank Math non si puo scrivere da fuori senza quello: WordPress risponde ok e non cambia niente. ` +
        `Vedi docs/tuo/07-plugin-titoli.md, sono tre minuti.`
    )
  }
  if (r.status === 403) {
    return new Error(
      `${s.nome}: l utente della password applicativa non puo modificare questo contenuto. ` +
        `Rendilo Amministratore in WordPress, Utenti. ${detto}`
    )
  }
  if (r.status === 501) {
    return new Error(`${s.nome}: ${detto || 'sul sito non c e ne Rank Math ne Yoast, il titolo SEO non ha dove stare.'}`)
  }
  return new Error(`${s.nome}, titolo SEO: HTTP ${r.status}. ${detto || r.testo.slice(0, 200)}`)
}

/**
 * La rotta dei titoli risponde su questo sito?
 *
 * Serve al controllo Impianto: se il plugin e la versione vecchia, Approva non
 * scrive niente, e questo deve vedersi prima di scoprirlo su una proposta.
 * Chiamata senza il numero della pagina, il plugin nuovo si lamenta (400).
 *
 * Pronto vuol dire 400 oppure 200, non "qualunque cosa tranne 404": un 403 del
 * firewall dell hosting o un plugin di sicurezza che chiude la REST lascerebbe
 * il pannello senza strada per scrivere, e chiamarlo ok sarebbe la stessa
 * bugia da cui siamo partiti. Torna anche il codice, per dirlo nel messaggio.
 */
export async function rottaTitoliPronta(s: Sito): Promise<{ pronta: boolean; status: number }> {
  const r = await chiamaGrezza(s, META_PLUGIN)
  return { pronta: r.status === 400 || r.status === 200, status: r.status }
}

async function metaDalPlugin(s: Sito, id: number): Promise<MetaSeo> {
  const r = await chiamaGrezza(s, `${META_PLUGIN}?id=${id}`)
  if (r.status !== 200) throw erroreMetaPlugin(s, r)
  const c = r.corpo as any
  return {
    titolo: String(c?.titolo ?? ''),
    descrizione: String(c?.descrizione ?? ''),
    motore: String(c?.motore ?? '?'),
  }
}

/**
 * Legge il valore attuale prima di scrivere: senza il vecchio non si annulla nulla.
 *
 * Torna la stringa vuota, non null, quando il titolo SEO non e mai stato
 * scritto: e un valore vero, ed e quello a cui tornare se poi si annulla. Null
 * vuol dire soltanto "questo indirizzo non e un contenuto di WordPress".
 */
export async function leggiSeo(s: Sito, url: string): Promise<{ titolo: string | null; descrizione: string | null }> {
  const c = await trovaContenuto(s, url)
  if (!c || c.contenitore) return { titolo: null, descrizione: null }
  const meta = await metaDalPlugin(s, c.id)
  return { titolo: meta.titolo, descrizione: meta.descrizione }
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
  if (c.contenitore) {
    throw new Error(
      `${url} non ha una pagina sua in WordPress: quell indirizzo viene disegnato dentro ${c.contenitore}. ` +
        `Scrivere qui cambierebbe il titolo di quella pagina, non quello della scheda. ` +
        `Se e un prodotto del negozio, il titolo si cambia su Ecwid (nel pannello, sito Aelle Store); ` +
        `se e un indirizzo vecchio che rimanda altrove, chiudi la proposta.`
    )
  }

  const r = await chiamaGrezza(s, META_PLUGIN, {
    method: 'POST',
    body: JSON.stringify({ id: c.id, titolo: campi.titolo, descrizione: campi.descrizione }),
  })
  if (r.status !== 200) throw erroreMetaPlugin(s, r)

  // Controprova subito, con il valore che il plugin ha riletto dal database.
  const scritto = r.corpo as any
  for (const [campo, atteso] of Object.entries(campi)) {
    if (atteso === undefined) continue
    const ora = String(scritto?.[campo] ?? '')
    if (ora.trim() !== atteso.trim()) {
      throw new Error(
        `${s.nome} ha accettato la richiesta ma il ${campo} risulta ancora "${ora || '(vuoto)'}". ` +
          `Di solito e un plugin di sicurezza o una cache che rifiuta le scritture da fuori: ` +
          `guarda in WordPress se il titolo di quella pagina si cambia a mano.`
      )
    }
  }
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
