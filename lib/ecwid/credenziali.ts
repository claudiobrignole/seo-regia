import https from 'node:https'

/**
 * Token e store Ecwid dalle variabili d ambiente, senza virgolette ne spazi.
 * Hostinger a volte li incolla con apici; WordPress-style spazi vanno tolti.
 */

export function pulisciSegretoEcwid(grezzo: string | undefined): string {
  return String(grezzo ?? '')
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .replace(/\s+/g, '')
}

export function credenzialiEcwid(): { storeId: string; token: string } | { manca: string } {
  const storeId = pulisciSegretoEcwid(process.env.ECWID_STORE_ID)
  const token = pulisciSegretoEcwid(process.env.ECWID_TOKEN)
  if (!storeId || !token) return { manca: 'mancano ECWID_TOKEN o ECWID_STORE_ID' }
  return { storeId, token }
}

export function avvisoTokenEcwid(token: string): string | null {
  if (token.startsWith('public_')) {
    return 'Hai incollato il token pubblico. Serve il secret_ (Show secret token), poi riavvia'
  }
  if (!token.startsWith('secret_')) {
    return 'ECWID_TOKEN deve iniziare con secret_. Copia Show secret token, senza virgolette, salva, riavvia'
  }
  return null
}

export type ProfiloEcwid = {
  status: number
  corpo: string
}

function profiloConHttps(storeId: string, token: string): Promise<ProfiloEcwid> {
  return new Promise((risolvi, rifiuta) => {
    const req = https.request(
      {
        hostname: 'app.ecwid.com',
        path: `/api/v3/${storeId}/profile`,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'User-Agent': 'RegiaSEO/1.0',
        },
      },
      (res) => {
        const pezzi: Buffer[] = []
        res.on('data', (c) => pezzi.push(c as Buffer))
        res.on('end', () =>
          risolvi({
            status: res.statusCode ?? 0,
            corpo: Buffer.concat(pezzi).toString('utf8'),
          })
        )
      }
    )
    req.on('error', rifiuta)
    req.setTimeout(20000, () => {
      req.destroy()
      rifiuta(new Error('Ecwid non risponde entro 20 secondi'))
    })
    req.end()
  })
}

/** Lettura profilo. Se fetch perde l intestazione Authorization (alcuni hosting), ritenta con https. */
export async function leggiProfiloEcwid(): Promise<ProfiloEcwid> {
  const c = credenzialiEcwid()
  if ('manca' in c) return { status: 0, corpo: c.manca }
  const { storeId, token } = c
  const intestazioni = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'User-Agent': 'RegiaSEO/1.0',
  }
  const r = await fetch(`https://app.ecwid.com/api/v3/${storeId}/profile`, { headers: intestazioni })
  const corpo = await r.text()
  if (r.status === 200) return { status: 200, corpo }
  if (r.status === 403 && /token is missing|INVALID_APP_KEYS/i.test(corpo)) {
    return profiloConHttps(storeId, token)
  }
  return { status: r.status, corpo }
}
