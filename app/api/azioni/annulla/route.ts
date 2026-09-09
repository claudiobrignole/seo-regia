import { NextRequest, NextResponse } from 'next/server'
import { annullaAzione } from '@/lib/esecutori/applica'
import { caricaAzione } from '@/lib/registro'
import { tornaAlSito } from '@/lib/azioni-http'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const modulo = await req.formData()
  const id = Number(modulo.get('id'))
  const a = await caricaAzione(id)
  if (!a) return NextResponse.json({ errore: 'azione non trovata' }, { status: 404 })
  try {
    await annullaAzione(id)
    return tornaAlSito(req, a.sito_id, 'annullata')
  } catch {
    return tornaAlSito(req, a.sito_id, 'annullo_fallito')
  }
}
