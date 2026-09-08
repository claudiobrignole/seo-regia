import { NextRequest, NextResponse } from 'next/server'
import { NOME_COOKIE_SESSIONE } from '@/lib/sessione'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const verso = new URL(req.url)
  verso.pathname = '/accesso'
  verso.search = ''
  const risposta = NextResponse.redirect(verso, { status: 303 })
  risposta.cookies.set(NOME_COOKIE_SESSIONE, '', { path: '/', maxAge: 0 })
  return risposta
}
