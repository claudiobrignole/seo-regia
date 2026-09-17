import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { eseguiIndicizzazione } from '@/lib/lavori'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * Un sito per volta, come la scansione. La sveglia chiama
 * /api/cron/indicizzazione?sito=brignole. Senza parametro tocca al sito del giorno.
 */
export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const id = new URL(req.url).searchParams.get('sito')
  try {
    const esito = await eseguiIndicizzazione(id)
    return NextResponse.json({
      controlli: esito.righe,
      problemi: esito.problemi,
      riassunto: esito.riassunto,
      ...(esito.extra ?? {}),
    })
  } catch (e) {
    return NextResponse.json(
      {
        errore: (e as Error).message,
        cosaFare:
          'Il parametro sito deve essere uno degli identificatori del perimetro con Search Console.',
      },
      { status: 400 }
    )
  }
}
