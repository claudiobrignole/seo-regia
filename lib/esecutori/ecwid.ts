import type { Prodotto } from '@/lib/raccolta/ecwid'
import { credenzialiEcwid } from '@/lib/ecwid/credenziali'

/**
 * Nel confronto prezzi contano le prime parole del titolo, e la forma che
 * rende e sempre la stessa: marca, tipo di capo, caratteristica, taglia.
 * Le 702 schede approvate sono varianti: si lavora sul prodotto principale
 * e si propaga, non si riscrivono settecento titoli a mano.
 */

const BASE = 'https://app.ecwid.com/api/v3'

function credenziali() {
  const c = credenzialiEcwid()
  if ('manca' in c) throw new Error('Mancano ECWID_STORE_ID o ECWID_TOKEN in .env.local')
  return c
}

export async function leggiSeoProdotto(id: number): Promise<{ titolo: string | null; descrizione: string | null }> {
  const { storeId, token } = credenziali()
  const res = await fetch(`${BASE}/${storeId}/products/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Ecwid prodotto ${id}: ${res.status}`)
  const p = (await res.json()) as Prodotto
  return { titolo: p.seoTitle ?? null, descrizione: p.seoDescription ?? null }
}

export async function scriviSeoProdotto(
  id: number,
  campi: { titolo?: string; descrizione?: string }
): Promise<void> {
  const { storeId, token } = credenziali()
  const corpo: Record<string, string> = {}
  if (campi.titolo !== undefined) corpo.seoTitle = campi.titolo
  if (campi.descrizione !== undefined) corpo.seoDescription = campi.descrizione

  const res = await fetch(`${BASE}/${storeId}/products/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  if (!res.ok) throw new Error(`Ecwid scrittura ${id}: ${res.status} ${await res.text()}`)
}
