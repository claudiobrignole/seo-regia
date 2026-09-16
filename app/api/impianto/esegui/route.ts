import { NextRequest, NextResponse } from 'next/server'
import { eseguiImpianto } from '@/lib/lavori'
import { urlPubblica } from '@/lib/url-pubblica'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const vuoleJson = (req.headers.get('accept') ?? '').includes('application/json')
  try {
    // Passa da eseguiImpianto, non da eseguiESalva: cosi la passata compare
    // anche fra i lavori, e Claudio vede che qualcosa ha girato davvero.
    const esito = await eseguiImpianto()
    if (vuoleJson) return NextResponse.json({ ok: true, riassunto: esito.riassunto })
    return Response.redirect(urlPubblica(req, '/impianto'), 303)
  } catch (e) {
    const cosaFare =
      'Riprova Controlla adesso e lascia aperta la pagina. Se dura oltre due minuti, Hostinger ha tagliato: ritenta.'
    if (vuoleJson) {
      return NextResponse.json({ ok: false, errore: (e as Error).message, cosaFare }, { status: 500 })
    }
    const verso = urlPubblica(req, '/impianto')
    verso.searchParams.set('errore', '1')
    return Response.redirect(verso, 303)
  }
}
