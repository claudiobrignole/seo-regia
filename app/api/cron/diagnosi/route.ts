import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { iniziaEsecuzione, chiudiEsecuzione } from '@/lib/db'
import { REGOLE } from '@/lib/regole'
import { proponi } from '@/lib/registro'
import { SITI } from '@/siti.config'
import { compoTesto } from '@/lib/regole/testi'
import { generaBozzeMancanti } from '@/lib/ads/bozza'
import { emettiVerdetti } from '@/lib/ads/verdetto'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const CAMPI_TESTO = new Set(['titolo', 'descrizione', 'seo_prodotto'])

export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const esecuzione = await iniziaEsecuzione('diagnosi')
  let proposte = 0
  const problemi: string[] = []

  for (const s of SITI) {
    for (const regola of REGOLE) {
      try {
        for (const p of await regola.esegui(s)) {
          if (CAMPI_TESTO.has(p.campo) && !(p.valoreNuovo ?? '').trim()) {
            try {
              p.valoreNuovo = await compoTesto(s, p)
            } catch (e) {
              problemi.push(`testi/${s.id}/${regola.nome}: ${(e as Error).message}`)
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

  try {
    proposte += await generaBozzeMancanti()
  } catch (e) {
    problemi.push(`bozze-ads: ${(e as Error).message}`)
  }
  try {
    await emettiVerdetti()
  } catch (e) {
    problemi.push(`verdetti-ads: ${(e as Error).message}`)
  }

  await chiudiEsecuzione(esecuzione, problemi.length ? 'parziale' : 'ok', proposte, problemi.join(' / ') || undefined)
  return NextResponse.json({ proposte, problemi })
}
