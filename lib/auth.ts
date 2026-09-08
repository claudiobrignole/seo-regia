import { NextRequest, NextResponse } from 'next/server'

/**
 * Le rotte notturne sono protette da una chiave, non dalla sessione:
 * i lavori pianificati di hPanel non sanno fare login.
 * Esempio di comando da mettere nel pianificatore:
 *   curl -fsS -H "x-chiave-cron: LA_CHIAVE" https://seo.brignole.ch/api/cron/raccolta
 */
export function verificaChiaveCron(req: NextRequest): NextResponse | null {
  const attesa = process.env.CRON_CHIAVE?.trim()
  if (!attesa) {
    return NextResponse.json(
      {
        errore: 'CRON_CHIAVE non configurata',
        cosaFare:
          'In hPanel, applicazione Node di seo.brignole.ch, variabili d ambiente: aggiungi CRON_CHIAVE, salva e riavvia. Poi riprova l indirizzo della migrazione.',
      },
      { status: 500 }
    )
  }
  const ricevuta = (
    req.headers.get('x-chiave-cron') ?? new URL(req.url).searchParams.get('chiave') ?? ''
  ).trim()
  if (ricevuta !== attesa) {
    return NextResponse.json(
      {
        errore: 'chiave non valida',
        cosaFare:
          'La parola dopo chiave= deve essere identica a CRON_CHIAVE, senza spazi e senza virgolette. Se la chiave contiene # & + % /, usane una fatta solo di lettere e numeri, riavvia, e riprova.',
      },
      { status: 401 }
    )
  }
  return null
}
