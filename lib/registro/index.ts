import { query, unaRiga } from '@/lib/db'

/**
 * Il registro e la condizione perche l automazione sia accettabile:
 * ogni modifica applicata resta con il suo valore precedente e si annulla con un clic.
 */

export async function annota(
  sitoId: string,
  evento: 'applicata' | 'annullata' | 'verificata' | 'errore' | 'rifiutata',
  azioneId: number | null,
  dettaglio?: unknown
) {
  await query('INSERT INTO registro (azione_id, sito_id, evento, dettaglio) VALUES (?,?,?,?)', [
    azioneId,
    sitoId,
    evento,
    dettaglio ? JSON.stringify(dettaglio) : null,
  ])
}

export type Azione = {
  id: number
  sito_id: string
  regola: string
  bersaglio: string
  campo: string
  valore_vecchio: string | null
  valore_nuovo: string
  motivo: string
  guadagno_stimato: number | null
  rischio: 'sicura' | 'da_approvare'
  stato: string
  riferimento_esterno?: string | null
  errore?: string | null
  creata_il?: Date | string | null
  applicata_il?: Date | string | null
  verifica_esito?: string | null
  verifica_clic_prima?: number | null
  verifica_clic_dopo?: number | null
}

export async function proponi(a: Omit<Azione, 'id' | 'stato'>): Promise<number> {
  const esiste = await unaRiga<Azione>(
    `SELECT * FROM azioni
     WHERE sito_id = ? AND bersaglio = ? AND campo = ?
       AND stato IN ('proposta','approvata','applicata','rifiutata')
     LIMIT 1`,
    [a.sito_id, a.bersaglio, a.campo]
  )
  if (esiste) {
    // Una proposta vuota non deve bloccare il generatore dei testi.
    if (
      esiste.stato !== 'applicata' &&
      !(esiste.valore_nuovo ?? '').trim() &&
      (a.valore_nuovo ?? '').trim()
    ) {
      await query(
        `UPDATE azioni SET valore_nuovo = ?, valore_vecchio = ?, motivo = ?, guadagno_stimato = ?, rischio = ?
         WHERE id = ?`,
        [a.valore_nuovo, a.valore_vecchio, a.motivo, a.guadagno_stimato, a.rischio, esiste.id]
      )
    }
    return esiste.id
  }

  const righe = await query<any>(
    `INSERT INTO azioni
      (sito_id, regola, bersaglio, campo, valore_vecchio, valore_nuovo, motivo, guadagno_stimato, rischio)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [a.sito_id, a.regola, a.bersaglio, a.campo, a.valore_vecchio, a.valore_nuovo,
     a.motivo, a.guadagno_stimato, a.rischio]
  )
  return (righe as any).insertId ?? 0
}

export async function aggiornaValoreVecchio(id: number, valore: string | null) {
  await query('UPDATE azioni SET valore_vecchio = ? WHERE id = ?', [valore, id])
}

export async function aggiornaValoreNuovo(id: number, valore: string) {
  await query(
    `UPDATE azioni SET valore_nuovo = ?, errore = NULL
      WHERE id = ? AND stato IN ('proposta','approvata','fallita')`,
    [valore, id]
  )
}

export async function segnaApplicata(id: number, riferimento?: string) {
  await query(
    `UPDATE azioni SET stato = 'applicata', applicata_il = NOW(), riferimento_esterno = ?, errore = NULL WHERE id = ?`,
    [riferimento ?? null, id]
  )
}

export async function segnaFallita(id: number, errore: string) {
  await query(`UPDATE azioni SET stato = 'fallita', errore = ? WHERE id = ?`, [errore.slice(0, 2000), id])
}

export async function segnaRifiutata(id: number) {
  await query(`UPDATE azioni SET stato = 'rifiutata' WHERE id = ?`, [id])
}

export async function caricaAzione(id: number): Promise<Azione | null> {
  return unaRiga<Azione>('SELECT * FROM azioni WHERE id = ?', [id])
}

/** Segna annullata dopo che l esecutore ha riscritto il valore precedente. */
export async function segnaAnnullata(id: number): Promise<Azione> {
  const a = await caricaAzione(id)
  if (!a) throw new Error(`Azione ${id} non trovata`)
  if (a.stato !== 'applicata') {
    throw new Error(`Azione ${id} non e stata applicata: nulla da annullare`)
  }
  if (a.valore_vecchio === null) {
    throw new Error(`Azione ${id}: nessun valore precedente registrato, annullamento non sicuro`)
  }
  await query(`UPDATE azioni SET stato = 'annullata' WHERE id = ?`, [id])
  await annota(a.sito_id, 'annullata', id, { campo: a.campo, ripristinato: a.valore_vecchio })
  return a
}
