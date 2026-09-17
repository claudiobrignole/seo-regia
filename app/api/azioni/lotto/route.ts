import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { applicaAzione } from '@/lib/esecutori/applica'
import { segnaRifiutata, annota, type Azione } from '@/lib/registro'
import { CAMPI_DA_MODIFICARE } from '@/lib/azioni-viste'
import { tornaAlSito } from '@/lib/azioni-http'
import { vistaSito } from '@/lib/azioni-viste'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Approva o chiude a lotti le schede dello stesso sito, regola e campo.
 * Una riga nel registro per ciascuna: niente scorciatoie silenziose.
 */
export async function POST(req: NextRequest) {
  const modulo = await req.formData()
  const sitoId = String(modulo.get('sito_id') ?? '')
  const regola = String(modulo.get('regola') ?? '')
  const campo = String(modulo.get('campo') ?? '')
  const operazione = String(modulo.get('operazione') ?? '') // applica | rifiuta
  const vista = vistaSito(modulo.get('vista'))

  if (!sitoId || !regola || !campo || !['applica', 'rifiuta'].includes(operazione)) {
    return NextResponse.json(
      { errore: 'Servono sito_id, regola, campo e operazione (applica o rifiuta).' },
      { status: 400 }
    )
  }

  const elenco = await query<Azione>(
    `SELECT * FROM azioni
      WHERE sito_id = ? AND regola = ? AND campo = ?
        AND stato IN ('proposta','approvata','fallita')
      ORDER BY id ASC
      LIMIT 40`,
    [sitoId, regola, campo]
  )

  let ok = 0
  let fallite = 0
  const messaggi: string[] = []

  for (const a of elenco) {
    try {
      if (operazione === 'rifiuta') {
        await segnaRifiutata(a.id)
        await annota(a.sito_id, 'rifiutata', a.id, { motivo: 'Chiusura a lotti dalla coda del sito.' })
        ok++
        continue
      }
      if (!CAMPI_DA_MODIFICARE.has(a.campo)) {
        messaggi.push(`#${a.id}: e una nota, non si Approva (usa Chiudi).`)
        fallite++
        continue
      }
      if (!(a.valore_nuovo ?? '').trim()) {
        messaggi.push(`#${a.id}: manca il testo nuovo, saltata.`)
        fallite++
        continue
      }
      await applicaAzione(a.id)
      ok++
    } catch (e) {
      fallite++
      messaggi.push(`#${a.id}: ${(e as Error).message}`)
    }
  }

  const esito = fallite && !ok ? 'fallita' : ok ? 'applicata' : 'gia_chiusa'
  // Per il rifiuto a lotti usiamo rifiutata
  const esitoBanner = operazione === 'rifiuta' ? (ok ? 'rifiutata' : 'fallita') : esito
  return tornaAlSito(req, sitoId, esitoBanner, vista)
}
