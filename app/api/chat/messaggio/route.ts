import { NextRequest, NextResponse } from 'next/server'
import { chiedi } from '@/lib/chat'
import type { Ambito } from '@/lib/chat/contesto'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

const AMBITI = new Set(['azione', 'campagna', 'bozza'])

/**
 * Una domanda a Claude su una proposta, una campagna o una bozza.
 * La rotta sta dietro al middleware: serve la sessione del pannello.
 */
export async function POST(req: NextRequest) {
  let corpo: { ambito?: string; riferimento?: string; domanda?: string } = {}
  try {
    corpo = (await req.json()) as typeof corpo
  } catch {
    corpo = {}
  }
  const ambito = String(corpo.ambito ?? '')
  const riferimento = String(corpo.riferimento ?? '')
  if (!AMBITI.has(ambito) || !riferimento) {
    return NextResponse.json(
      {
        ok: false,
        errore: 'Domanda senza oggetto',
        cosaFare: 'Ricarica la pagina e riapri la chat dalla scheda.',
      },
      { status: 400 }
    )
  }

  try {
    const esito = await chiedi(ambito as Ambito, riferimento, String(corpo.domanda ?? ''))
    return NextResponse.json({ ok: true, ...esito })
  } catch (e) {
    const messaggio = (e as Error).message
    return NextResponse.json({ ok: false, errore: messaggio, cosaFare: cosaFare(messaggio) }, { status: 500 })
  }
}

function cosaFare(messaggio: string): string {
  if (/ANTHROPIC_API_KEY/i.test(messaggio)) {
    return 'In hPanel, variabili d ambiente dell applicazione: aggiungi ANTHROPIC_API_KEY, salva e riavvia. La chat e i testi notturni usano quella stessa chiave.'
  }
  if (/messaggi|conversazioni|memoria|doesn't exist|Table/i.test(messaggio)) {
    return 'Le tabelle della chat non ci sono ancora: apri /api/setup/migra?chiave=LA_CHIAVE una volta, poi torna qui.'
  }
  if (/429|rate|overloaded/i.test(messaggio)) {
    return 'Claude e occupato in questo momento. Aspetta un minuto e rifai la domanda: non si perde niente.'
  }
  return 'Riprova. Se si ripete, la stessa domanda scritta piu corta di solito passa.'
}
