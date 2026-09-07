import { NextRequest, NextResponse } from 'next/server'

/**
 * Le rotte notturne sono protette da una chiave, non dalla sessione:
 * i lavori pianificati di hPanel non sanno fare login.
 * Esempio di comando da mettere nel pianificatore:
 *   curl -fsS -H "x-chiave-cron: LA_CHIAVE" https://seo.brignole.ch/api/cron/raccolta
 */
export function verificaChiaveCron(req: NextRequest): NextResponse | null {
  const attesa = process.env.CRON_CHIAVE
  if (!attesa) {
    return NextResponse.json({ errore: 'CRON_CHIAVE non configurata' }, { status: 500 })
  }
  const ricevuta = req.headers.get('x-chiave-cron') ?? new URL(req.url).searchParams.get('chiave')
  if (ricevuta !== attesa) {
    return NextResponse.json({ errore: 'chiave non valida' }, { status: 401 })
  }
  return null
}
