import type { NextRequest } from 'next/server'

/**
 * Hostinger (e altri reverse proxy) parlano a Node su 0.0.0.0.
 * Un redirect costruito da req.url manda il browser li, e il login
 * finisce in "connessione negata". Qui usiamo l indirizzo pubblico.
 */

function interno(host: string): boolean {
  const h = host.replace(/:\d+$/, '')
  return h === '0.0.0.0' || h === '127.0.0.1' || h === '[::]' || h === '::'
}

export function originePubblica(req: NextRequest): string {
  const fisso = process.env.PANNELLO_URL?.replace(/\/$/, '')
  if (fisso) return fisso

  const inoltrato = (req.headers.get('x-forwarded-host') ?? '').split(',')[0].trim()
  const host = inoltrato || (req.headers.get('host') ?? '').split(',')[0].trim()
  const protoInoltrato = req.headers.get('x-forwarded-proto')?.split(',')[0].trim()

  if (host && !interno(host)) {
    const proto = protoInoltrato || (host.includes('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }

  if (process.env.NODE_ENV !== 'production') {
    return req.nextUrl.origin
  }

  return 'https://seo.brignole.ch'
}

export function urlPubblica(req: NextRequest, percorso: string): URL {
  const path = percorso.startsWith('/') ? percorso : `/${percorso}`
  return new URL(path, `${originePubblica(req)}/`)
}
