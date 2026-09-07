import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { iniziaEsecuzione, chiudiEsecuzione } from '@/lib/db'
import { REGOLE } from '@/lib/regole'
import { proponi } from '@/lib/registro'
import { SITI } from '@/siti.config'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

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
          await proponi({
            sito_id: s.id,
            regola: p.regola,
            bersaglio: p.bersaglio,
            campo: p.campo,
            valore_vecchio: p.valoreVecchio,
            valore_nuovo: p.valoreNuovo,
            motivo: p.motivo,
            guadagno_stimato: p.guadagnoStimato,
            // Finche automazioneAttiva e false, nulla viene applicato da solo:
            // ogni proposta aspetta un clic, anche quelle marcate sicure.
            rischio:
              s.automazioneAttiva && s.scrittura.tipo !== 'nessuna' ? p.rischio : 'da_approvare',
          })
          proposte++
        }
      } catch (e) {
        problemi.push(`${s.id}/${regola.nome}: ${(e as Error).message}`)
      }
    }
  }

  await chiudiEsecuzione(esecuzione, problemi.length ? 'parziale' : 'ok', proposte, problemi.join(' / ') || undefined)
  return NextResponse.json({ proposte, problemi })
}
