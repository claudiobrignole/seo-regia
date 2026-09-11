import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { iniziaEsecuzione, chiudiEsecuzione } from '@/lib/db'
import { eseguiESalva } from '@/lib/impianto'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

/**
 * Controllo quotidiano in lettura: Search Console, WordPress, GitHub, Ads, Ecwid.
 * Non scrive sui siti.
 */
export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const esecuzione = await iniziaEsecuzione('impianto')
  try {
    const { controlli } = await eseguiESalva()
    const nFallito = controlli.filter((c) => c.esito === 'fallito').length
    const nAtteso = controlli.filter((c) => c.esito === 'atteso').length
    const nOk = controlli.filter((c) => c.esito === 'ok').length
    const problemi = controlli.filter((c) => c.esito === 'fallito').map((c) => `${c.codice} ${c.titolo}`)
    await chiudiEsecuzione(
      esecuzione,
      nFallito ? 'parziale' : 'ok',
      controlli.length,
      problemi.join(' / ') || `ok ${nOk}, attesi ${nAtteso}`
    )
    return NextResponse.json({
      ok: nFallito === 0,
      nOk,
      nFallito,
      nAtteso,
      falliti: controlli.filter((c) => c.esito === 'fallito').map((c) => ({
        codice: c.codice,
        titolo: c.titolo,
        dettaglio: c.dettaglio,
        cosaFare: c.cosaFare,
      })),
    })
  } catch (e) {
    const messaggio = (e as Error).message
    await chiudiEsecuzione(esecuzione, 'errore', 0, messaggio)
    return NextResponse.json({ errore: messaggio, cosaFare: 'Apri /impianto dopo /api/setup/migra' }, { status: 500 })
  }
}
