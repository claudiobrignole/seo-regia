import { NextRequest, NextResponse } from 'next/server'
import { applicaAzione } from '@/lib/esecutori/applica'

export const dynamic = 'force-dynamic'

async function idDa(req: NextRequest): Promise<number> {
  const tipo = req.headers.get('content-type') ?? ''
  if (tipo.includes('application/json')) {
    const b = (await req.json()) as { id?: number }
    return Number(b.id)
  }
  const modulo = await req.formData()
  return Number(modulo.get('id'))
}

export async function POST(req: NextRequest) {
  const id = await idDa(req)
  if (!id) return NextResponse.json({ errore: 'manca id' }, { status: 400 })
  try {
    const r = await applicaAzione(id)
    if (req.headers.get('accept')?.includes('text/html') || !(req.headers.get('content-type') ?? '').includes('json')) {
      const verso = new URL(req.url)
      const sito = verso.searchParams.get('sito')
      verso.pathname = sito ? `/sito/${sito}` : '/'
      verso.search = 'ok=applicata'
      return NextResponse.redirect(verso, { status: 303 })
    }
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    const messaggio = (e as Error).message
    const status = /non trovata/.test(messaggio) ? 404 : /gia in stato|Manca il testo|solo un avviso/.test(messaggio) ? 409 : 500
    return NextResponse.json({ errore: messaggio }, { status })
  }
}
