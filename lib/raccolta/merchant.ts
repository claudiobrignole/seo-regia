import { auth } from './google'
import { salvaMisura } from '@/lib/db'
import { giornoIso } from '@/lib/date'

const MERCHANT_AELLE = '5717230535'

/**
 * Schede prodotto del Merchant Center Aelle, sola lettura, identita Brignole.
 * Se l account di servizio non e invitato, si salta.
 */
export async function raccogliMerchant(): Promise<number> {
  let client
  try {
    client = await auth('brignole').getClient()
  } catch {
    return 0
  }
  const token = await client.getAccessToken()
  const accesso = typeof token === 'string' ? token : token?.token
  if (!accesso) return 0

  const giorno = giornoIso(0)
  let n = 0
  let pagina: string | undefined
  try {
    for (;;) {
      const url = new URL(
        `https://shoppingcontent.googleapis.com/content/v2.1/${MERCHANT_AELLE}/productstatuses`
      )
      url.searchParams.set('maxResults', '250')
      if (pagina) url.searchParams.set('pageToken', pagina)
      const res = await fetch(url, { headers: { authorization: `Bearer ${accesso}` } })
      const corpo = await res.json()
      if (!res.ok) {
        console.warn(`[merchant] ${res.status} ${corpo?.error?.message ?? ''}`)
        return n
      }
      for (const p of corpo.resources ?? []) {
        const id = String(p.productId ?? p.id ?? '')
        if (!id) continue
        const destinazioni = p.destinationStatuses ?? []
        const problemi = (p.itemLevelIssues ?? []).map((i: { description?: string }) => i.description).filter(Boolean)
        const approvato = destinazioni.some(
          (d: { status?: string }) => String(d.status).toLowerCase() === 'approved'
        )
        const stato = approvato && problemi.length === 0 ? 'approvato' : problemi.length ? 'problema' : 'in_attesa'
        await salvaMisura({
          sitoId: 'aelle-store',
          fonte: 'merchant',
          giorno,
          chiave: id.slice(0, 500),
          tipoChiave: 'prodotto',
          extra: {
            stato,
            titolo: p.title ?? null,
            motivo: problemi[0] ?? (approvato ? null : 'non ancora approvata'),
          },
        })
        n++
      }
      pagina = corpo.nextPageToken
      if (!pagina) break
    }
  } catch (e) {
    console.warn(`[merchant] ${(e as Error).message}`)
  }
  return n
}
