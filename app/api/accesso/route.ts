import { NextRequest, NextResponse } from 'next/server'
import { passwordCorretta, creaBiglietto } from '@/lib/sessione'

export const dynamic = 'force-dynamic'

const attendi = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function POST(req: NextRequest) {
  const modulo = await req.formData()
  const password = String(modulo.get('password') ?? '')
  const poi = String(modulo.get('poi') ?? '/')

  // Mezzo secondo su ogni tentativo: rende inutile provare a tentoni.
  await attendi(500)

  let corretta = false
  try {
    corretta = await passwordCorretta(password)
  } catch (e) {
    return NextResponse.json({ errore: (e as Error).message }, { status: 500 })
  }

  const destinazione = new URL(req.url)
  if (!corretta) {
    destinazione.pathname = '/accesso'
    destinazione.search = `?errore=1&poi=${encodeURIComponent(poi)}`
    return NextResponse.redirect(destinazione, { status: 303 })
  }

  destinazione.pathname = poi.startsWith('/') ? poi : '/'
  destinazione.search = ''
  const risposta = NextResponse.redirect(destinazione, { status: 303 })

  const biglietto = await creaBiglietto()
  risposta.cookies.set(biglietto.nome, biglietto.valore, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: biglietto.scadenzaSecondi,
  })
  return risposta
}
