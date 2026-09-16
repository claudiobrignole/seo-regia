import { NextRequest, NextResponse } from 'next/server'
import { archivia, riattiva, ricorda, type PortataMemoria } from '@/lib/memoria'
import { SITI } from '@/siti.config'
import { urlPubblica } from '@/lib/url-pubblica'

export const dynamic = 'force-dynamic'

/**
 * La memoria a mano: aggiungere una indicazione senza passare da una chat,
 * archiviarne una che non vale piu, rimetterla in servizio.
 * Archiviare non cancella: una decisione vecchia dice perche si era deciso cosi.
 */

function torna(req: NextRequest, esito: string) {
  const verso = urlPubblica(req, '/memoria')
  verso.searchParams.set('esito', esito)
  return NextResponse.redirect(verso, { status: 303 })
}

export async function POST(req: NextRequest) {
  const modulo = await req.formData()
  const cosa = String(modulo.get('cosa') ?? '')

  try {
    if (cosa === 'archivia') {
      await archivia(Number(modulo.get('id')))
      return torna(req, 'archiviata')
    }
    if (cosa === 'riattiva') {
      await riattiva(Number(modulo.get('id')))
      return torna(req, 'riattivata')
    }
    if (cosa === 'aggiungi') {
      const ambito = String(modulo.get('ambito') ?? 'tutti') as PortataMemoria
      const sitoId = String(modulo.get('sito_id') ?? '') || null
      if (ambito === 'sito' && !SITI.some((s) => s.id === sitoId)) {
        return torna(req, 'sito_sconosciuto')
      }
      await ricorda({
        ambito: ambito === 'sito' ? 'sito' : 'tutti',
        sitoId: ambito === 'sito' ? sitoId : null,
        testo: String(modulo.get('testo') ?? ''),
        origine: 'mano',
      })
      return torna(req, 'aggiunta')
    }
    return torna(req, 'non_capito')
  } catch (e) {
    const verso = urlPubblica(req, '/memoria')
    verso.searchParams.set('esito', 'errore')
    verso.searchParams.set('perche', (e as Error).message.slice(0, 300))
    return NextResponse.redirect(verso, { status: 303 })
  }
}
