import { query, unaRiga } from '@/lib/db'

/**
 * La memoria del pannello: le indicazioni e le decisioni di Claudio.
 *
 * Non e un diario. Le righe attive entrano nelle istruzioni di ogni testo che
 * Claude scrive dopo, altrimenti la stessa correzione andrebbe ripetuta ogni
 * notte e la chat servirebbe solo a sfogarsi.
 *
 * Tre portate:
 *   tutti  -> vale su ogni sito
 *   sito   -> vale su un sito solo
 *   pagina -> vale su un indirizzo solo
 */

export type PortataMemoria = 'tutti' | 'sito' | 'pagina'

export type Indicazione = {
  id: number
  ambito: PortataMemoria
  sito_id: string | null
  bersaglio: string | null
  testo: string
  origine: 'chat' | 'mano'
  messaggio_id: number | null
  stato: 'attiva' | 'archiviata'
  quando: Date | string
}

/** Oltre questa lunghezza non e piu una indicazione, e un discorso. */
export const MAX_TESTO = 600

/** Quante indicazioni entrano al massimo nelle istruzioni di un testo. */
const MAX_NEL_PROMPT = 30

export function ripulisci(testo: string): string {
  return testo.replace(/\s+/g, ' ').trim().slice(0, MAX_TESTO).replace(/\u2014/g, '-')
}

/**
 * Registra una indicazione. Se la stessa frase e gia attiva con la stessa
 * portata non la duplica: la memoria deve restare leggibile a occhio.
 */
export async function ricorda(i: {
  ambito: PortataMemoria
  sitoId?: string | null
  bersaglio?: string | null
  testo: string
  origine?: 'chat' | 'mano'
  messaggioId?: number | null
}): Promise<number> {
  const testo = ripulisci(i.testo)
  if (!testo) throw new Error('Indicazione vuota: scrivi in una frase cosa va ricordato')
  const sitoId = i.ambito === 'tutti' ? null : (i.sitoId ?? null)
  const bersaglio = i.ambito === 'pagina' ? (i.bersaglio ?? null) : null
  if (i.ambito !== 'tutti' && !sitoId) {
    throw new Error('Indicazione per un sito senza sito: scegli il sito, oppure mettila su tutti')
  }

  const esiste = await unaRiga<{ id: number }>(
    `SELECT id FROM memoria
      WHERE stato = 'attiva' AND ambito = ? AND testo = ?
        AND ((sito_id IS NULL AND ? IS NULL) OR sito_id = ?)
        AND ((bersaglio IS NULL AND ? IS NULL) OR bersaglio = ?)
      LIMIT 1`,
    [i.ambito, testo, sitoId, sitoId, bersaglio, bersaglio]
  )
  if (esiste) return esiste.id

  const res = await query<any>(
    `INSERT INTO memoria (ambito, sito_id, bersaglio, testo, origine, messaggio_id)
     VALUES (?,?,?,?,?,?)`,
    [i.ambito, sitoId, bersaglio, testo, i.origine ?? 'chat', i.messaggioId ?? null]
  )
  return (res as any).insertId ?? 0
}

export async function archivia(id: number): Promise<void> {
  await query(`UPDATE memoria SET stato = 'archiviata', archiviata_il = NOW() WHERE id = ?`, [id])
}

export async function riattiva(id: number): Promise<void> {
  await query(`UPDATE memoria SET stato = 'attiva', archiviata_il = NULL WHERE id = ?`, [id])
}

/** Le indicazioni che valgono qui: quelle su tutti, quelle del sito, quelle di questa pagina. */
export async function indicazioniAttive(
  sitoId?: string | null,
  bersaglio?: string | null
): Promise<Indicazione[]> {
  return query<Indicazione>(
    `SELECT * FROM memoria
      WHERE stato = 'attiva'
        AND (ambito = 'tutti'
             OR (ambito = 'sito' AND sito_id = ?)
             OR (ambito = 'pagina' AND sito_id = ? AND bersaglio = ?))
      ORDER BY FIELD(ambito,'pagina','sito','tutti'), id DESC
      LIMIT ${MAX_NEL_PROMPT}`,
    [sitoId ?? null, sitoId ?? null, bersaglio ?? null]
  )
}

export async function tutteLeIndicazioni(): Promise<Indicazione[]> {
  return query<Indicazione>(
    `SELECT * FROM memoria ORDER BY stato, FIELD(ambito,'tutti','sito','pagina'), id DESC LIMIT 400`
  )
}

function riga(i: Indicazione): string {
  if (i.ambito === 'pagina') return `- solo per ${i.bersaglio}: ${i.testo}`
  if (i.ambito === 'sito') return `- solo per il sito ${i.sito_id}: ${i.testo}`
  return `- ${i.testo}`
}

/**
 * Il pezzo da aggiungere alle istruzioni del modello. Stringa vuota se non c e
 * niente da dire, cosi chi la usa non deve controllare.
 *
 * Se le tabelle della chat non esistono ancora (migrazione non fatta) non
 * fallisce: un testo notturno non deve saltare per una memoria vuota.
 */
export async function bloccoIndicazioni(
  sitoId?: string | null,
  bersaglio?: string | null
): Promise<string> {
  let righe: Indicazione[] = []
  try {
    righe = await indicazioniAttive(sitoId, bersaglio)
  } catch (e) {
    console.warn(`[memoria] non leggibile, procedo senza: ${(e as Error).message}`)
    return ''
  }
  if (righe.length === 0) return ''
  return (
    `\nIndicazioni decise da Claudio, da rispettare sempre. ` +
    `Se una di queste contrasta con quello che stavi per scrivere, vince l indicazione:\n` +
    righe.map(riga).join('\n') +
    '\n'
  )
}
