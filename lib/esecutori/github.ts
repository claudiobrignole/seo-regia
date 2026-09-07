import type { Sito } from '@/siti.config'

/**
 * Sui siti Node non tocchiamo mai il sito pubblicato e non tocchiamo il codice.
 * Apriamo una richiesta di modifica su un solo file di dati, seo/contenuti.json.
 *
 * Il motivo e semplice: un file di dati sbagliato ti da un titolo brutto,
 * una riga di codice sbagliata ti da un sito che non si avvia. E il confronto
 * fra vecchio e nuovo lo legge chiunque, senza saper programmare.
 */

const API = 'https://api.github.com'

function token(): string {
  const t = process.env.GITHUB_TOKEN
  if (!t) throw new Error('Manca GITHUB_TOKEN in .env.local')
  return t
}

async function gh<T>(percorso: string, opzioni: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${percorso}`, {
    ...opzioni,
    headers: {
      Authorization: `Bearer ${token()}`,
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

  const base = await gh<{ object: { sha: string } }>(`/repos/${repo}/git/ref/heads/${ramoBase}`)
  const ramo = `seo/regia-${new Date().toISOString().slice(0, 10)}-${Date.now().toString(36)}`

  await gh(`/repos/${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${ramo}`, sha: base.object.sha }),
  })

  const { dati, sha } = await leggiFileSeo(s)
  const uniti = { ...dati, ...modifiche }

  await gh(`/repos/${repo}/contents/${fileDati}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: titoloRichiesta,
      content: Buffer.from(JSON.stringify(uniti, null, 2), 'utf8').toString('base64'),
      branch: ramo,
      ...(sha ? { sha } : {}),
    }),
  })

  const pr = await gh<{ html_url: string }>(`/repos/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title: titoloRichiesta, head: ramo, base: ramoBase, body: descrizione }),
  })

  return pr.html_url
}
