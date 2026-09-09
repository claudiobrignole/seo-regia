import { NextRequest, NextResponse } from 'next/server'
import { urlPubblica } from '@/lib/url-pubblica'
import { vistaSito } from '@/lib/azioni-viste'

export { CAMPI_DA_MODIFICARE, vistaSito, type VistaSito } from '@/lib/azioni-viste'

/**
 * Dopo un clic nel pannello si torna sempre alla stessa vista del sito,
 * con un esito leggibile. Approva riuscito apre Storico: la scheda e li.
 */
export function tornaAlSito(
  req: NextRequest,
  sitoId: string,
  esito: string,
  vista?: unknown
) {
  const verso = urlPubblica(req, `/sito/${sitoId}`)
  verso.searchParams.set('esito', esito)
  const scelta =
    esito === 'applicata' || esito === 'annullata' || esito === 'annullo_fallito' || esito === 'gia_chiusa'
      ? 'storico'
      : vistaSito(vista)
  verso.searchParams.set('vista', scelta)
  return NextResponse.redirect(verso, { status: 303 })
}
