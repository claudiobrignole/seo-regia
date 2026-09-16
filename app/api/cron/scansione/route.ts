import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { eseguiScansione } from '@/lib/lavori'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * Un sito per volta: con la pausa fra le pagine, scansionarli tutti insieme
 * supererebbe qualunque limite di tempo. La sveglia chiama
 * /api/cron/scansione?sito=aelle una notte, ?sito=brignole quella dopo.
 * Senza il parametro tocca al sito del giorno, non sempre al primo.
 */
export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const id = new URL(req.url).searchParams.get('sito')
  try {
    const esito = await eseguiScansione(id)
    return NextResponse.json({
      pagine: esito.righe,
      problemi: esito.problemi,
      riassunto: esito.riassunto,
      ...(esito.extra ?? {}),
    })
  } catch (e) {
    return NextResponse.json(
      {
        errore: (e as Error).message,
        cosaFare:
          'Il parametro sito deve essere uno degli identificatori del perimetro: aelle, brignole, tagtales, kizunama, strangeglyph, lunanihongo, biography-library, biography-library-app.',
      },
      { status: 400 }
    )
  }
}
