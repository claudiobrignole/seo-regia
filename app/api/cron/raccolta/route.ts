import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { eseguiRaccolta } from '@/lib/lavori'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const esito = await eseguiRaccolta()
  return NextResponse.json({
    righe: esito.righe,
    problemi: esito.problemi,
    riassunto: esito.riassunto,
    ...(esito.extra ?? {}),
  })
}
