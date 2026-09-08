import { salvaMisura } from '@/lib/db'

/**
 * Ecwid conosce TUTTI gli ordini, indipendentemente dal consenso ai cookie.
 * Per le vendite e questa la fonte di verita, non Analytics: e il pezzo che
 * chiude il cerchio fra una ricerca su Google e un ordine.
 */

const BASE = 'https://app.ecwid.com/api/v3'

function credenziali() {
  const storeId = process.env.ECWID_STORE_ID
  const token = process.env.ECWID_TOKEN
  if (!storeId || !token) throw new Error('Mancano ECWID_STORE_ID o ECWID_TOKEN in .env.local')
  return { storeId, token }
}

async function chiama<T>(percorso: string, parametri: Record<string, string> = {}): Promise<T> {
  const { storeId, token } = credenziali()
  const url = new URL(`${BASE}/${storeId}/${percorso}`)
  for (const [k, v] of Object.entries(parametri)) url.searchParams.set(k, v)
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`Ecwid ${percorso}: ${res.status} ${await res.text()}`)
  return (await res.json()) as T
}

export type Prodotto = {
  id: number
  sku: string
  name: string
  url?: string
  seoTitle?: string
  seoDescription?: string
  enabled: boolean
  parentId?: number
}

export async function prodotti(): Promise<Prodotto[]> {
  const tutti: Prodotto[] = []
  let offset = 0
  for (;;) {
    const r = await chiama<{ items: Prodotto[]; count: number; total: number }>('products', {
      limit: '100',
      offset: String(offset),
    })
    tutti.push(...r.items)
    offset += r.count
    if (offset >= r.total || r.count === 0) break
  }
  return tutti
}

/** Ordini del periodo, per collegare le vendite alle pagine e alle ricerche. */
export async function raccogliVendite(sitoId: string, da: string, a: string): Promise<number> {
  const perProdotto = new Map<string, { pezzi: number; ricavo: number; nome: string }>()
  let offset = 0

  for (;;) {
    const r = await chiama<{ items: any[]; count?: number; total?: number }>('orders', {
      createdFrom: da,
      createdTo: a,
      limit: '100',
      offset: String(offset),
    })
    const items = r.items ?? []
    for (const ordine of items) {
      for (const riga of ordine.items ?? []) {
        const chiave = String(riga.productId ?? riga.sku ?? 'sconosciuto')
        const acc = perProdotto.get(chiave) ?? { pezzi: 0, ricavo: 0, nome: riga.name ?? '' }
        acc.pezzi += riga.quantity ?? 1
        acc.ricavo += (riga.price ?? 0) * (riga.quantity ?? 1)
        perProdotto.set(chiave, acc)
      }
    }
    offset += items.length
    if (items.length < 100) break
    if (typeof r.total === 'number' && offset >= r.total) break
  }

  for (const [id, v] of perProdotto) {
    await salvaMisura({
      sitoId,
      fonte: 'ecwid',
      giorno: a,
      chiave: id,
      tipoChiave: 'prodotto',
      clic: v.pezzi,
      valore: Number(v.ricavo.toFixed(2)),
      extra: { nome: v.nome, finestra: { da, a } },
    })
  }
  return perProdotto.size
}
