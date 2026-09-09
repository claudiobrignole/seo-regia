import { NextRequest, NextResponse } from 'next/server'
import { urlPubblica } from '@/lib/url-pubblica'

/** Dopo un clic nel pannello si torna sempre alla scheda del sito, con un esito leggibile. */
export function tornaAlSito(req: NextRequest, sitoId: string, esito: string) {
  const verso = urlPubblica(req, `/sito/${sitoId}`)
  verso.searchParams.set('esito', esito)
  return NextResponse.redirect(verso, { status: 303 })
}
