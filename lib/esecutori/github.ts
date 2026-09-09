import type { Sito } from '@/siti.config'

/**
 * Sui siti Node non tocchiamo mai il sito pubblicato e non tocchiamo il codice.
 * Apriamo una richiesta di modifica su file di dati in seo/: contenuti.json
 * (titoli) o robots.txt. Mai una riga del programma del sito.
 *
 * Il motivo e semplice: un file di dati sbagliato ti da un titolo brutto,
 * una riga di codice sbagliata ti da un sito che non si avvia. E il confronto
 * fra vecchio e nuovo lo legge chiunque, senza saper programmare.
 */

const API = 'https://api.github.com'

function tokenPer(s: Sito): string {
  if (s.identita === 'biography-library') {
    const t = process.env.GITHUB_TOKEN_BL
    if (!t) {
      throw new Error(
        'Manca GITHUB_TOKEN_BL. Metti in Hostinger il token a grana fine dell organizzazione Biography Library, non quello dei repository Brignole.'
      )
    }
    return t
  }
  const t = process.env.GITHUB_TOKEN
  if (!t) {
    throw new Error(
      'Manca GITHUB_TOKEN. Metti in Hostinger il token a grana fine del tuo account (TagTales, kizunama, luna-nihongo, strangeglyph).'
    )
  }
  return t
}

async function gh<T>(s: Sito, percorso: string, opzioni: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${percorso}`, {
    ...opzioni,
    headers: {
      Authorization: `Bearer ${tokenPer(s)}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opzioni.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`GitHub ${percorso}: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

export type VoceSeo = { titolo?: string; descrizione?: string; jsonld?: unknown }
export type FileSeo = Record<string, VoceSeo>

export async function leggiFileSeo(s: Sito): Promise<{ dati: FileSeo; sha: string | null }> {
  if (s.scrittura.tipo !== 'github') throw new Error(`${s.id} non e un sito su repository`)
  const { repo, ramoBase, fileDati } = s.scrittura
  try {
    const r = await gh<{ content: string; sha: string }>(
      s,
      `/repos/${repo}/contents/${fileDati}?ref=${ramoBase}`
    )
    return { dati: JSON.parse(Buffer.from(r.content, 'base64').toString('utf8')), sha: r.sha }
  } catch {
    return { dati: {}, sha: null } // il file non esiste ancora: lo creiamo noi
  }
}

/** Crea un ramo, scrive il file, apre la richiesta di modifica. Restituisce il suo indirizzo. */
export async function proponiModifica(
  s: Sito,
  modifiche: FileSeo,
  titoloRichiesta: string,
  descrizione: string
): Promise<string> {
  if (s.scrittura.tipo !== 'github') throw new Error(`${s.id} non e un sito su repository`)
  const { repo, ramoBase, fileDati } = s.scrittura

  const base = await gh<{ object: { sha: string } }>(s, `/repos/${repo}/git/ref/heads/${ramoBase}`)
  const ramo = `seo/regia-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`

  await gh(s, `/repos/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${ramo}`, sha: base.object.sha }),
  })

  const { dati, sha } = await leggiFileSeo(s)
  const uniti: FileSeo = { ...dati }
  for (const [url, voce] of Object.entries(modifiche)) {
    uniti[url] = { ...(dati[url] ?? {}), ...voce }
  }

  await gh(s, `/repos/${repo}/contents/${fileDati}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: titoloRichiesta,
      content: Buffer.from(JSON.stringify(uniti, null, 2), 'utf8').toString('base64'),
      branch: ramo,
      ...(sha ? { sha } : {}),
    }),
  })

  const pr = await gh<{ html_url: string }>(s, `/repos/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title: titoloRichiesta, head: ramo, base: ramoBase, body: descrizione }),
  })

  return pr.html_url
}

/**
 * Richiesta di modifica su un file nella cartella seo/, mai sul codice del sito.
 * Usato per robots.txt. Il sito deve ancora pubblicare quel file in vetrina.
 */
export async function proponiFileNellaCartellaSeo(
  s: Sito,
  nomeFile: string,
  contenuto: string,
  titoloRichiesta: string,
  descrizione: string
): Promise<string> {
  if (s.scrittura.tipo !== 'github') throw new Error(`${s.id} non e un sito su repository`)
  if (nomeFile !== 'robots.txt') {
    throw new Error('Nella cartella seo/ il pannello scrive solo robots.txt, oltre a contenuti.json.')
  }
  const { repo, ramoBase } = s.scrittura
  const percorso = `seo/${nomeFile}`

  const base = await gh<{ object: { sha: string } }>(s, `/repos/${repo}/git/ref/heads/${ramoBase}`)
  const ramo = `seo/regia-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`

  await gh(s, `/repos/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${ramo}`, sha: base.object.sha }),
  })

  let sha: string | undefined
  try {
    const esistente = await gh<{ sha: string }>(s, `/repos/${repo}/contents/${percorso}?ref=${ramoBase}`)
    sha = esistente.sha
  } catch {
    sha = undefined
  }

  await gh(s, `/repos/${repo}/contents/${percorso}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: titoloRichiesta,
      content: Buffer.from(contenuto, 'utf8').toString('base64'),
      branch: ramo,
      ...(sha ? { sha } : {}),
    }),
  })

  const pr = await gh<{ html_url: string }>(s, `/repos/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title: titoloRichiesta, head: ramo, base: ramoBase, body: descrizione }),
  })
  return pr.html_url
}
