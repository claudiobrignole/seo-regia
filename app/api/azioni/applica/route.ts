import { NextRequest, NextResponse } from 'next/server'
import { applicaAzione } from '@/lib/esecutori/applica'
import { aggiornaValoreNuovo, caricaAzione } from '@/lib/registro'
import { tornaAlSito } from '@/lib/azioni-http'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const tipo = req.headers.get('content-type') ?? ''
  const dalModulo = !tipo.includes('application/json')
  let id = 0
  let testo: string | null = null
  if (dalModulo) {
    const modulo = await req.formData()
    id = Number(modulo.get('id'))
    const grezzo = modulo.get('valore_nuovo')
    testo = typeof grezzo === 'string' ? grezzo : null
  } else {
    const b = (await req.json()) as { id?: number; valore_nuovo?: string }
    id = Number(b.id)
    testo = b.valore_nuovo ?? null
  }
  if (!id) return NextResponse.json({ errore: 'manca id' }, { status: 400 })

  const a = await caricaAzione(id)
  if (!a) return NextResponse.json({ errore: 'azione non trovata' }, { status: 404 })

  try {
    if (testo != null && testo.trim()) await aggiornaValoreNuovo(id, testo.trim())
    const r = await applicaAzione(id)
    if (dalModulo) return tornaAlSito(req, a.sito_id, 'applicata')
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    const messaggio = (e as Error).message
    if (dalModulo) return tornaAlSito(req, a.sito_id, 'fallita')
    const status = /non trovata/.test(messaggio) ? 404 : /gia in stato|Manca il testo|solo un avviso/.test(messaggio) ? 409 : 500
    return NextResponse.json({ errore: messaggio }, { status })
  }
}
