import { NextRequest, NextResponse } from 'next/server'
import { caricaAzione, segnaRifiutata, annota } from '@/lib/registro'
import { urlPubblica } from '@/lib/url-pubblica'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const modulo = await req.formData()
  const id = Number(modulo.get('id'))
  const a = await caricaAzione(id)
  if (!a) return NextResponse.json({ errore: 'azione non trovata' }, { status: 404 })
  if (a.stato !== 'proposta' && a.stato !== 'approvata') {
    return NextResponse.json({ errore: `azione gia in stato ${a.stato}` }, { status: 409 })
  }
  await segnaRifiutata(id)
  await annota(a.sito_id, 'errore', id, { rifiutata: true })
  const verso = urlPubblica(req, `/sito/${a.sito_id}`)
  verso.search = 'ok=rifiutata'
  return NextResponse.redirect(verso, { status: 303 })
}
