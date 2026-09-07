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
    throw new Error(`Mancano ${p}_UTENTE o ${p}_PASSWORD_APP in .env.local`)
  }
  return { utente, password, base: s.scrittura.base }
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

/** Trova il contenuto a partire dall indirizzo pubblico. */
export async function trovaContenuto(s: Sito, url: string): Promise<{ id: number; tipo: string } | null> {
  const slug = new URL(url).pathname.split('/').filter(Boolean).pop()
  if (!slug) return null

  for (const tipo of ['posts', 'pages']) {
    const trovati = await chiama(s, `wp/v2/${tipo}?slug=${encodeURIComponent(slug)}`)
    if (Array.isArray(trovati) && trovati.length) return { id: trovati[0].id, tipo }
  }
  return null
}

/** Legge il valore attuale prima di scrivere: senza il vecchio non si annulla nulla. */
export async function leggiSeo(s: Sito, url: string): Promise<{ titolo: string | null; descrizione: string | null }> {
  const c = await trovaContenuto(s, url)
  if (!c) return { titolo: null, descrizione: null }
  const dato = await chiama(s, `wp/v2/${c.tipo}/${c.id}?context=edit`)
  const meta = dato.meta ?? {}
  return {
    titolo: meta.rank_math_title ?? null,
    descrizione: meta.rank_math_description ?? null,
  }
}

export async function scriviSeo(
  s: Sito,
  url: string,
  campi: { titolo?: string; descrizione?: string }
): Promise<void> {
  const c = await trovaContenuto(s, url)
  if (!c) throw new Error(`Nessun contenuto WordPress corrisponde a ${url}`)

  const meta: Record<string, string> = {}
  if (campi.titolo !== undefined) meta.rank_math_title = campi.titolo
  if (campi.descrizione !== undefined) meta.rank_math_description = campi.descrizione

  await chiama(s, `wp/v2/${c.tipo}/${c.id}`, {
    method: 'POST',
    body: JSON.stringify({ meta }),
  })
}
