import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { iniziaEsecuzione, chiudiEsecuzione, query, unaRiga } from '@/lib/db'
import { REGOLE } from '@/lib/regole'
import { proponi, aggiornaValoreNuovo, type Azione } from '@/lib/registro'
import { SITI, sito } from '@/siti.config'
import { compoTesto } from '@/lib/regole/testi'
import type { Proposta } from '@/lib/regole/tipi'
import { compoIstruzione } from '@/lib/regole/lacune'
import { generaBozzeMancanti } from '@/lib/ads/bozza'
import { emettiVerdetti } from '@/lib/ads/verdetto'
import { chiudiProposteArchivio, propostaIntoccabile } from '@/lib/siti/archivio-aelle'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const CAMPI_TESTO = new Set(['titolo', 'descrizione', 'seo_prodotto'])
const LIMITE_MS = 40_000
const MAX_TESTI = 6
const MAX_ISTRUZIONI = 2

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
  let istruzioniFatte = 0
  const problemi: string[] = []
  const inizio = Date.now()

  try {
    const chiuse = await chiudiProposteArchivio()
    if (chiuse) {
      // Non e un errore: i titoli originali non devono stare in coda.
      console.info(`[diagnosi] archivio Aelle: chiuse ${chiuse} proposte`)
    }
  } catch (e) {
    problemi.push(`archivio Aelle: ${(e as Error).message}`)
  }

  const daRiempire = await query<Azione>(
    `SELECT * FROM azioni
      WHERE stato IN ('proposta','approvata','fallita')
        AND campo IN ('titolo','descrizione')
        AND (valore_nuovo IS NULL OR TRIM(valore_nuovo) = '')
      ORDER BY COALESCE(guadagno_stimato, 0) DESC, id ASC
      LIMIT ${MAX_TESTI}`
  )
  for (const a of daRiempire) {
    if (testiFatti >= MAX_TESTI || Date.now() - inizio > LIMITE_MS) break
    if (await propostaIntoccabile(a.sito_id, a.bersaglio, a.campo)) continue
    try {
      const s = sito(a.sito_id)
      const testo = await compoTesto(s, {
        regola: a.regola,
        bersaglio: a.bersaglio,
        campo: a.campo as Proposta['campo'],
        valoreVecchio: a.valore_vecchio,
        valoreNuovo: '',
        motivo: a.motivo,
        guadagnoStimato: a.guadagno_stimato,
        rischio: a.rischio,
      })
      await aggiornaValoreNuovo(a.id, testo)
      testiFatti++
    } catch (e) {
      problemi.push(`testi/${a.sito_id}/${a.id}: ${(e as Error).message}`)
    }
  }

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
          if (await propostaIntoccabile(s.id, p.bersaglio, p.campo)) continue
          if (CAMPI_TESTO.has(p.campo) && !(p.valoreNuovo ?? '').trim()) {
            const gia = await unaRiga<{ valore_nuovo: string }>(
              `SELECT valore_nuovo FROM azioni
                WHERE sito_id = ? AND bersaglio = ? AND campo = ?
                  AND stato IN ('proposta','approvata','fallita','applicata','rifiutata')
                LIMIT 1`,
              [s.id, p.bersaglio, p.campo]
            )
            if ((gia?.valore_nuovo ?? '').trim()) {
              p.valoreNuovo = gia!.valore_nuovo
            } else if (testiFatti < MAX_TESTI && Date.now() - inizio < LIMITE_MS) {
              try {
                p.valoreNuovo = await compoTesto(s, p)
                testiFatti++
              } catch (e) {
                problemi.push(`testi/${s.id}/${regola.nome}: ${(e as Error).message}`)
              }
            }
          }
          if (p.campo === 'istruzione' && !(p.valoreNuovo ?? '').trim()) {
            if (istruzioniFatte < MAX_ISTRUZIONI && testiFatti < MAX_TESTI && Date.now() - inizio < LIMITE_MS) {
              try {
                p.valoreNuovo = await compoIstruzione(s, p)
                istruzioniFatte++
                testiFatti++
              } catch (e) {
                problemi.push(`istruzioni/${s.id}: ${(e as Error).message}`)
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
