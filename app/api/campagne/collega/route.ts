import { NextRequest, NextResponse } from 'next/server'
import { query, unaRiga } from '@/lib/db'
import { urlPubblica } from '@/lib/url-pubblica'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const modulo = await req.formData()
  const id = Number(modulo.get('id'))
  const googleId = String(modulo.get('google_id') ?? '').replace(/\D/g, '')
  const banco = String(modulo.get('banco') ?? 'brignole')
  if (!id || !googleId) {
    return NextResponse.json({ errore: 'Mancano id bozza o id campagna' }, { status: 400 })
  }
  const b = await unaRiga<{ identita: string }>('SELECT identita FROM campagne_bozze WHERE id = ?', [id])
  if (!b) return NextResponse.json({ errore: 'bozza non trovata' }, { status: 404 })
  await query(
    `UPDATE campagne_bozze SET campagna_google_id = ?, stato = 'collegata' WHERE id = ?`,
    [googleId, id]
  )
  const verso = urlPubblica(req, `/pubblicita/${banco}`)
  return NextResponse.redirect(verso, { status: 303 })
}
