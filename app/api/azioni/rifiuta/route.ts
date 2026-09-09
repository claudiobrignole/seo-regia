import { NextRequest, NextResponse } from 'next/server'
import { caricaAzione, segnaRifiutata, annota } from '@/lib/registro'
import { tornaAlSito } from '@/lib/azioni-http'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const modulo = await req.formData()
  const id = Number(modulo.get('id'))
  const a = await caricaAzione(id)
  if (!a) return NextResponse.json({ errore: 'azione non trovata' }, { status: 404 })
  if (a.stato !== 'proposta' && a.stato !== 'approvata' && a.stato !== 'fallita') {
    return tornaAlSito(req, a.sito_id, 'gia_chiusa')
  }
  await segnaRifiutata(id)
  await annota(a.sito_id, 'rifiutata', id, { rifiutata: true })
  return tornaAlSito(req, a.sito_id, 'rifiutata')
}
