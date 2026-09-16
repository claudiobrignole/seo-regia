import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { eseguiImpianto } from '@/lib/lavori'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * Controllo quotidiano in lettura: Search Console, WordPress, GitHub, Ads, Ecwid.
 * Non scrive sui siti.
 */
export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  try {
    const esito = await eseguiImpianto()
    return NextResponse.json({
      ok: esito.problemi.length === 0,
      controlli: esito.righe,
      riassunto: esito.riassunto,
      problemi: esito.problemi,
      ...(esito.extra ?? {}),
    })
  } catch (e) {
    return NextResponse.json(
      {
        errore: (e as Error).message,
        cosaFare: 'Se dice che manca una tabella, apri /api/setup/migra?chiave=LA_CHIAVE e riprova.',
      },
      { status: 500 }
    )
  }
}
