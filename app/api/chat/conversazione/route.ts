import { NextRequest, NextResponse } from 'next/server'
import { leggiConversazione } from '@/lib/chat'
import type { Ambito } from '@/lib/chat/contesto'

export const dynamic = 'force-dynamic'

const AMBITI = new Set(['azione', 'campagna', 'bozza'])

/** Quello che ci si era detti su questo oggetto, quando si riapre la chat. */
export async function GET(req: NextRequest) {
  const ambito = req.nextUrl.searchParams.get('ambito') ?? ''
  const riferimento = req.nextUrl.searchParams.get('riferimento') ?? ''
  if (!AMBITI.has(ambito) || !riferimento) {
    return NextResponse.json({ ok: false, errore: 'Richiesta senza oggetto' }, { status: 400 })
  }
  try {
    const { messaggi } = await leggiConversazione(ambito as Ambito, riferimento)
    return NextResponse.json({ ok: true, messaggi })
  } catch (e) {
    // Tabelle non ancora create: la chat parte vuota e lo dice quando si scrive.
    return NextResponse.json({ ok: true, messaggi: [], avviso: (e as Error).message })
  }
}
