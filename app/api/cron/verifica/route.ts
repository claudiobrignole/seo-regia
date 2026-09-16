import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { eseguiVerificaAzioni } from '@/lib/lavori'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * A quattordici giorni da ogni modifica applicata guardiamo se ha spostato
 * qualcosa. Senza questo passaggio l automazione e un atto di fede.
 */
export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const esito = await eseguiVerificaAzioni()
  return NextResponse.json({
    verificate: esito.righe,
    problemi: esito.problemi,
    riassunto: esito.riassunto,
  })
}
