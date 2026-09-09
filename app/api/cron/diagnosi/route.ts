import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { iniziaEsecuzione, chiudiEsecuzione } from '@/lib/db'
import { REGOLE } from '@/lib/regole'
import { proponi } from '@/lib/registro'
import { SITI, sito } from '@/siti.config'
import { compoTesto } from '@/lib/regole/testi'
import { generaBozzeMancanti } from '@/lib/ads/bozza'
import { emettiVerdetti } from '@/lib/ads/verdetto'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const CAMPI_TESTO = new Set(['titolo', 'descrizione', 'seo_prodotto'])
const LIMITE_MS = 40_000
const MAX_TESTI = 4

export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const richiesta = new URL(req.url)
  const solo = richiesta.searchParams.get('sito')
  let elenco = solo ? [sito(solo)] : [...SITI]
  if (!solo && elenco.length) {
    const scarto = new Date().getUTCDay() % elenco.length
    elenco = [...elenco.slice(scarto), ...elenco.slice(0, scarto)]
  }

  const esecuzione = await iniziaEsecuzione('diagnosi')
  let proposte = 0
  let testiFatti = 0
  const problemi: string[] = []
  const inizio = Date.now()

  ciclo: for (const s of elenco) {
    if (Date.now() - inizio > LIMITE_MS) {
      problemi.push('ripresa: tempo esaurito, il resto la notte dopo')
      break
    }
    for (const regola of REGOLE) {
      if (Date.now() - inizio > LIMITE_MS) {
        problemi.push('ripresa: tempo esaurito, il resto la notte dopo')
        break ciclo
      }
      try {
        for (const p of await regola.esegui(s)) {
          if (CAMPI_TESTO.has(p.campo) && !(p.valoreNuovo ?? '').trim()) {
            if (testiFatti < MAX_TESTI && Date.now() - inizio < LIMITE_MS) {
              try {
                p.valoreNuovo = await compoTesto(s, p)
                testiFatti++
              } catch (e) {
                problemi.push(`testi/${s.id}/${regola.nome}: ${(e as Error).message}`)
              }
            }
          }
          await proponi({
            sito_id: s.id,
            regola: p.regola,
            bersaglio: p.bersaglio,
            campo: p.campo,
            valore_vecchio: p.valoreVecchio,
            valore_nuovo: p.valoreNuovo,
            motivo: p.motivo,
            guadagno_stimato: p.guadagnoStimato,
            rischio:
              s.automazioneAttiva && s.scrittura.tipo !== 'nessuna' && (p.valoreNuovo ?? '').trim()
                ? p.rischio
                : 'da_approvare',
          })
          proposte++
        }
      } catch (e) {
        problemi.push(`${s.id}/${regola.nome}: ${(e as Error).message}`)
      }
    }
  }

  if (Date.now() - inizio < LIMITE_MS) {
    try {
      proposte += await generaBozzeMancanti()
    } catch (e) {
      problemi.push(`bozze-ads: ${(e as Error).message}`)
    }
  }
  if (Date.now() - inizio < LIMITE_MS) {
    try {
      await emettiVerdetti()
    } catch (e) {
      problemi.push(`verdetti-ads: ${(e as Error).message}`)
    }
  }

  await chiudiEsecuzione(esecuzione, problemi.length ? 'parziale' : 'ok', proposte, problemi.join(' / ') || undefined)
  return NextResponse.json({ proposte, problemi })
}
