import { NextRequest, NextResponse } from 'next/server'
import { annullaAzione } from '@/lib/esecutori/applica'
import { caricaAzione } from '@/lib/registro'
import { urlPubblica } from '@/lib/url-pubblica'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const modulo = await req.formData()
  const id = Number(modulo.get('id'))
  const a = await caricaAzione(id)
  try {
    await annullaAzione(id)
  } catch (e) {
    return NextResponse.json({ errore: (e as Error).message }, { status: 500 })
  }
  const verso = urlPubblica(req, a ? `/sito/${a.sito_id}` : '/')
  verso.search = 'ok=annullata'
  return NextResponse.redirect(verso, { status: 303 })
}
