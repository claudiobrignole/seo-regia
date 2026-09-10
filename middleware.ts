import { NextRequest, NextResponse } from 'next/server'
import { biglietttoValido, NOME_COOKIE_SESSIONE } from '@/lib/sessione'
import { urlPubblica } from '@/lib/url-pubblica'

/**
 * Chi non ha il biglietto finisce sulla pagina di accesso.
 *
 * Restano fuori dal controllo le rotte che i lavori pianificati chiamano:
 * quelle hanno la loro chiave, e un pianificatore non sa fare login.
 */

const APERTE = ['/accesso', '/api/accesso', '/api/cron', '/api/setup']

export async function middleware(req: NextRequest) {
  const percorso = req.nextUrl.pathname
  if (
    percorso.startsWith('/font/') ||
    percorso.startsWith('/marchio/')
  ) {
    return NextResponse.next()
  }
  if (APERTE.some((p) => percorso === p || percorso.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  if (await biglietttoValido(req.cookies.get(NOME_COOKIE_SESSIONE)?.value)) {
    return NextResponse.next()
  }

  const verso = urlPubblica(req, '/accesso')
  verso.searchParams.set('poi', percorso)
  return NextResponse.redirect(verso)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
