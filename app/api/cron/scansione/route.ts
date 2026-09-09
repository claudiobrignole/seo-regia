import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { iniziaEsecuzione, chiudiEsecuzione } from '@/lib/db'
import { scansiona } from '@/lib/scansione/crawler'
import { SITI, sito } from '@/siti.config'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Un sito per volta: con la pausa fra le pagine, scansionarli tutti insieme
 * supererebbe qualunque limite di tempo. Il pianificatore chiama
 * /api/cron/scansione?sito=aelle una notte, ?sito=brignole quella dopo.
 */
export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const id = new URL(req.url).searchParams.get('sito')
  const bersagli = id ? [sito(id)] : SITI.slice(0, 1)

  const esecuzione = await iniziaEsecuzione('scansione')
  let pagine = 0
  const problemi: string[] = []

  for (const s of bersagli) {
    try {
      pagine += await scansiona(s)
    } catch (e) {
      problemi.push(`${s.id}: ${(e as Error).message}`)
    }
  }

  await chiudiEsecuzione(esecuzione, problemi.length ? 'parziale' : 'ok', pagine, problemi.join(' / ') || undefined)
  return NextResponse.json({ pagine, problemi })
}
