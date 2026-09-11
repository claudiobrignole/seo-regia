import { NextRequest } from 'next/server'
import { eseguiESalva } from '@/lib/impianto'
import { urlPubblica } from '@/lib/url-pubblica'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await eseguiESalva()
  } catch {
    const verso = urlPubblica(req, '/impianto')
    verso.searchParams.set('errore', '1')
    return Response.redirect(verso, 303)
  }
  const verso = urlPubblica(req, '/impianto')
  return Response.redirect(verso, 303)
}
