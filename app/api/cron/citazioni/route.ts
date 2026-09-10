import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { iniziaEsecuzione, chiudiEsecuzione } from '@/lib/db'
import { raccogliCitazioni } from '@/lib/raccolta/citazioni'
import { SITI, sito } from '@/siti.config'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const esecuzione = await iniziaEsecuzione('citazioni')
  const solo = new URL(req.url).searchParams.get('sito')
  const elenco = solo ? [sito(solo)] : [...SITI]
  let righe = 0
  const problemi: string[] = []
  const inizio = Date.now()

  for (const s of elenco) {
    if (Date.now() - inizio > 45_000) {
      problemi.push('ripresa: tempo esaurito, il resto la notte dopo')
      break
    }
    try {
      righe += await raccogliCitazioni(s)
    } catch (e) {
      problemi.push(`${s.id}: ${(e as Error).message}`)
    }
  }

  await chiudiEsecuzione(
    esecuzione,
    problemi.length ? 'parziale' : 'ok',
    righe,
    problemi.join(' / ') ||
      'Campione dei modelli del pannello, non l indice pubblico di ChatGPT.'
  )
  return NextResponse.json({ righe, problemi })
}
