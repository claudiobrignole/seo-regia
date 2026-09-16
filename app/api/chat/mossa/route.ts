import { NextRequest, NextResponse } from 'next/server'
import { applicaMossa } from '@/lib/chat'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Il pulsante di conferma. Dal browser arrivano solo due numeri: quale messaggio
 * e quale mossa. Il testo da mettere nella proposta si rilegge dal database, cosi
 * quello che entra e esattamente quello che Claudio ha letto.
 */
export async function POST(req: NextRequest) {
  let corpo: { messaggioId?: number; indice?: number } = {}
  try {
    corpo = (await req.json()) as typeof corpo
  } catch {
    corpo = {}
  }
  const messaggioId = Number(corpo.messaggioId)
  const indice = Number(corpo.indice)
  if (!Number.isFinite(messaggioId) || messaggioId <= 0 || !Number.isFinite(indice) || indice < 0) {
    return NextResponse.json(
      { ok: false, errore: 'Mossa senza riferimento', cosaFare: 'Ricarica la pagina e riprova.' },
      { status: 400 }
    )
  }

  try {
    const esito = await applicaMossa(messaggioId, indice)
    return NextResponse.json({ ok: true, ...esito })
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        errore: (e as Error).message,
        cosaFare: 'Ricarica la pagina: la scheda ti dice com e adesso, e la conversazione resta.',
      },
      { status: 400 }
    )
  }
}
