import { auth, type Identita } from '@/lib/raccolta/google'

/**
 * Chiamate HTTP a Google Ads, una identita alla volta.
 * Brignole e Biography Library non condividono token ne numeri account.
 */

export type BancoAds = {
  identita: Identita
  token?: string
  cliente?: string
  manager?: string
}

export function banco(identita: Identita): BancoAds {
  if (identita === 'biography-library') {
    return {
      identita,
      token: process.env.BL_ADS_DEVELOPER_TOKEN,
      cliente: (process.env.BL_ADS_CUSTOMER_ID ?? '').replace(/-/g, ''),
      manager: (process.env.BL_ADS_MANAGER_ID ?? '').replace(/-/g, '') || undefined,
    }
  }
  return {
    identita,
    token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    cliente: (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, ''),
    manager: (process.env.GOOGLE_ADS_MANAGER_ID ?? '').replace(/-/g, '') || undefined,
  }
}

export function versioneApi(): string {
  // v19 e spenta: Google risponde con una pagina HTML, non JSON.
  return process.env.GOOGLE_ADS_API_VERSION ?? 'v23'
}

export function bancoPronto(b: BancoAds): boolean {
  return Boolean(b.token && b.cliente)
}

async function intestazioni(b: BancoAds): Promise<Record<string, string>> {
  if (!b.token || !b.cliente) {
    throw new Error(
      `Mancano il token o il numero account Ads per ${b.identita}. ` +
        `Vedi docs/istruzioni-tue.md, sezione Google Ads.`
    )
  }
  const client = await auth(b.identita).getClient()
  const tok = await client.getAccessToken()
  const access = typeof tok === 'string' ? tok : tok?.token
  if (!access) throw new Error(`Nessun gettone di accesso Google per ${b.identita}`)
  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'developer-token': b.token,
    'Content-Type': 'application/json',
  }
  if (b.manager) headers['login-customer-id'] = b.manager
  return headers
}

/** percorso: ":uploadClickConversions" oppure "/conversionActions:mutate" */
export async function adsPost(identita: Identita, percorso: string, corpo: unknown): Promise<any> {
  const b = banco(identita)
  const headers = await intestazioni(b)
  const url = `https://googleads.googleapis.com/${versioneApi()}/customers/${b.cliente}${percorso}`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(corpo),
  })
  const testo = await res.text()
  let json: any
  try {
    json = JSON.parse(testo)
  } catch {
    throw new Error(
      `Google Ads ${identita}: risposta non JSON (HTTP ${res.status}). ` +
        `In Hostinger imposta GOOGLE_ADS_API_VERSION=v23, salva, riavvia, e riprova la raccolta. ` +
        testo.replace(/\s+/g, ' ').slice(0, 180)
    )
  }
  if (!res.ok) {
    const msg = json?.error?.message ?? JSON.stringify(json).slice(0, 400)
    throw new Error(`Google Ads ${identita}: ${res.status} ${msg}`)
  }
  return json
}

export async function gaql(b: BancoAds, sql: string): Promise<any[]> {
  const corpo = await adsPost(b.identita, '/googleAds:search', { query: sql })
  return corpo.results ?? []
}
