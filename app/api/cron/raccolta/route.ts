import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { iniziaEsecuzione, chiudiEsecuzione } from '@/lib/db'
import { raccogliRicerca, raccogliAI } from '@/lib/raccolta/search-console'
import { raccogliComportamento } from '@/lib/raccolta/analytics'
import { raccogliVendite } from '@/lib/raccolta/ecwid'
import { raccogliAds } from '@/lib/raccolta/ads'
import { caricaConversioniGrants } from '@/lib/ads/carica-conversioni'
import { raccogliCrux } from '@/lib/raccolta/crux'
import { raccogliMerchant } from '@/lib/raccolta/merchant'
import { sitiPerSearchConsole, sitiPerAnalytics, sitiPerEcwid } from '@/lib/raccolta/perimetro'
import { giornoIso } from '@/lib/date'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const esecuzione = await iniziaEsecuzione('raccolta')
  // La Search Console pubblica i dati con due o tre giorni di ritardo.
  const a = giornoIso(-3)
  const da = giornoIso(-30)
  let righe = 0
  const problemi: string[] = []

  for (const s of sitiPerSearchConsole()) {
    try {
      righe += await raccogliRicerca(s, da, a)
      righe += await raccogliAI(s, da, a)
    } catch (e) {
      problemi.push(`search-console/${s.id}: ${(e as Error).message}`)
    }
  }

  for (const s of sitiPerAnalytics()) {
    try {
      righe += await raccogliComportamento(s, da, a)
    } catch (e) {
      problemi.push(`analytics/${s.id}: ${(e as Error).message}`)
    }
  }

  for (const s of sitiPerEcwid()) {
    try {
      righe += await raccogliVendite(s.id, da, a)
    } catch (e) {
      problemi.push(`ecwid/${s.id}: ${(e as Error).message}`)
    }
  }

  for (const identita of ['brignole', 'biography-library'] as const) {
    try {
      righe += await raccogliAds(identita, da, a)
    } catch (e) {
      problemi.push(`ads/${identita}: ${(e as Error).message}`)
    }
  }

  try {
    righe += await caricaConversioniGrants()
  } catch (e) {
    problemi.push(`grants-conversioni: ${(e as Error).message}`)
  }

  try {
    righe += await raccogliCrux()
  } catch (e) {
    problemi.push(`crux: ${(e as Error).message}`)
  }

  try {
    righe += await raccogliMerchant()
  } catch (e) {
    problemi.push(`merchant: ${(e as Error).message}`)
  }

  await chiudiEsecuzione(
    esecuzione,
    problemi.length ? 'parziale' : 'ok',
    righe,
    problemi.join(' / ') || undefined
  )
  return NextResponse.json({ righe, problemi, finestra: { da, a } })
}
