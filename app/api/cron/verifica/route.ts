import { NextRequest, NextResponse } from 'next/server'
import { verificaChiaveCron } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * A quattordici giorni da ogni modifica applicata guardiamo se ha spostato
 * qualcosa. Senza questo passaggio l automazione e un atto di fede.
 */
export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  const daVerificare = await query<{ id: number; sito_id: string; bersaglio: string; applicata_il: string }>(
    `SELECT a.id, a.sito_id, a.bersaglio, a.applicata_il
       FROM azioni a
       LEFT JOIN verifiche v ON v.azione_id = a.id AND v.giorni = 14
      WHERE a.stato = 'applicata'
        AND a.applicata_il <= DATE_SUB(NOW(), INTERVAL 14 DAY)
        AND v.id IS NULL
      LIMIT 50`
  )

  let fatte = 0
  for (const a of daVerificare) {
    const prima = await query<{ clic: number; impressioni: number }>(
      `SELECT SUM(clic) AS clic, SUM(impressioni) AS impressioni FROM misure
        WHERE sito_id = ? AND chiave = ? AND fonte = 'search-console'
          AND giorno BETWEEN DATE_SUB(?, INTERVAL 14 DAY) AND ?`,
      [a.sito_id, a.bersaglio, a.applicata_il, a.applicata_il]
    )
    const dopo = await query<{ clic: number; impressioni: number }>(
      `SELECT SUM(clic) AS clic, SUM(impressioni) AS impressioni FROM misure
        WHERE sito_id = ? AND chiave = ? AND fonte = 'search-console'
          AND giorno BETWEEN ? AND DATE_ADD(?, INTERVAL 14 DAY)`,
      [a.sito_id, a.bersaglio, a.applicata_il, a.applicata_il]
    )

    const cp = Number(prima[0]?.clic ?? 0)
    const cd = Number(dopo[0]?.clic ?? 0)
    const ip = Number(prima[0]?.impressioni ?? 0)
    const id2 = Number(dopo[0]?.impressioni ?? 0)

    const ctrP = ip ? cp / ip : null
    const ctrD = id2 ? cd / id2 : null

    let esito: 'migliorata' | 'invariata' | 'peggiorata' | 'dati_insufficienti' = 'dati_insufficienti'
    if (ctrP !== null && ctrD !== null && ip > 100 && id2 > 100) {
      const delta = (ctrD - ctrP) / Math.max(ctrP, 0.0001)
      esito = delta > 0.15 ? 'migliorata' : delta < -0.15 ? 'peggiorata' : 'invariata'
    }

    await query(
      `INSERT INTO verifiche (azione_id, giorni, clic_prima, clic_dopo, ctr_prima, ctr_dopo, esito)
       VALUES (?,14,?,?,?,?,?)`,
      [a.id, cp, cd, ctrP, ctrD, esito]
    )
    fatte++
  }

  return NextResponse.json({ verificate: fatte })
}
