import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { iniziaEsecuzione, chiudiEsecuzione } from '@/lib/db'
import { raccogliRicerca, raccogliAI } from '@/lib/raccolta/search-console'
import { raccogliComportamento } from '@/lib/raccolta/analytics'
import { raccogliVendite } from '@/lib/raccolta/ecwid'
import { SITI } from '@/siti.config'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

function giorno(scarto: number): string {
  const d = new Date()
  d.setDate(d.getDate() - scarto)
  return d.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const esecuzione = await iniziaEsecuzione('raccolta')
  // La Search Console pubblica i dati con due o tre giorni di ritardo.
  const a = giorno(3)
  const da = giorno(30)
  let righe = 0
  const problemi: string[] = []

  for (const s of SITI) {
    try {
      righe += await raccogliRicerca(s, da, a)
      righe += await raccogliAI(s, da, a)
      if (s.analyticsProperty) righe += await raccogliComportamento(s, da, a)
      if (s.scrittura.tipo === 'ecwid') righe += await raccogliVendite(s.id, da, a)
    } catch (e) {
      problemi.push(`${s.id}: ${(e as Error).message}`)
    }
  }

  await chiudiEsecuzione(
    esecuzione,
    problemi.length ? 'parziale' : 'ok',
    righe,
    problemi.join(' / ') || undefined
  )
  return NextResponse.json({ righe, problemi, finestra: { da, a } })
}
