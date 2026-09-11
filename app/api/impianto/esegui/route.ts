import { NextRequest } from 'next/server'
import { eseguiESalva } from '@/lib/impianto'
import { urlPubblica } from '@/lib/url-pubblica'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await eseguiESalva()
  } catch {
    /* la pagina mostra l errore o l assenza di passata */
  }
  const verso = urlPubblica(req, '/impianto')
  return Response.redirect(verso, 303)
}
