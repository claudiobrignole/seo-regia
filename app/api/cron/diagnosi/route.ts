import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { eseguiDiagnosi } from '@/lib/lavori'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const solo = new URL(req.url).searchParams.get('sito')
  try {
    const esito = await eseguiDiagnosi(solo)
    return NextResponse.json({
      proposte: esito.righe,
      problemi: esito.problemi,
      riassunto: esito.riassunto,
    })
  } catch (e) {
    return NextResponse.json(
      {
        errore: (e as Error).message,
        cosaFare: 'Togli il parametro sito, oppure usa un identificatore del perimetro.',
      },
      { status: 400 }
    )
  }
}
