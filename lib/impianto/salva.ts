import { query, unaRiga } from '@/lib/db'
import type { ControlloImpianto, PassataImpianto } from './tipi'

export async function salvaPassata(controlli: ControlloImpianto[]): Promise<number> {
  const nOk = controlli.filter((c) => c.esito === 'ok').length
  const nFallito = controlli.filter((c) => c.esito === 'fallito').length
  const nAtteso = controlli.filter((c) => c.esito === 'atteso').length
  const inserita = await query(
    `INSERT INTO impianto_passate (n_ok, n_fallito, n_atteso) VALUES (?,?,?)`,
    [nOk, nFallito, nAtteso]
  )
  const id = Number((inserita as { insertId?: number }).insertId ?? 0)
  if (!id) {
    const ultima = await unaRiga<{ id: number }>('SELECT id FROM impianto_passate ORDER BY id DESC LIMIT 1')
    if (!ultima) throw new Error('Non riesco a salvare la passata impianto')
    return salvaEsiti(ultima.id, controlli, nOk, nFallito, nAtteso)
  }
  return salvaEsiti(id, controlli, nOk, nFallito, nAtteso)
}

async function salvaEsiti(
  id: number,
  controlli: ControlloImpianto[],
  nOk: number,
  nFallito: number,
  nAtteso: number
): Promise<number> {
  await query('UPDATE impianto_passate SET finita_il = NOW(), n_ok = ?, n_fallito = ?, n_atteso = ? WHERE id = ?', [
    nOk,
    nFallito,
    nAtteso,
    id,
  ])
  for (const c of controlli) {
    await query(
      `INSERT INTO impianto_esiti (passata_id, codice, titolo, esito, dettaglio, cosa_fare)
       VALUES (?,?,?,?,?,?)`,
      [id, c.codice, c.titolo, c.esito, c.dettaglio, c.cosaFare || null]
    )
  }
  try {
    await query(
      `DELETE FROM impianto_esiti WHERE passata_id IN (
         SELECT id FROM (
           SELECT id FROM impianto_passate ORDER BY id DESC LIMIT 100 OFFSET 40
         ) vecchie
       )`
    )
    await query(
      `DELETE FROM impianto_passate WHERE id IN (
         SELECT id FROM (
           SELECT id FROM impianto_passate ORDER BY id DESC LIMIT 100 OFFSET 40
         ) vecchie
       )`
    )
  } catch {
    /* pulizia non critica */
  }
  return id
}

export async function ultimaPassata(): Promise<(PassataImpianto & { esiti: ControlloImpianto[] }) | null> {
  try {
    const p = await unaRiga<PassataImpianto>(
      `SELECT id, iniziata_il, finita_il, n_ok, n_fallito, n_atteso
         FROM impianto_passate ORDER BY id DESC LIMIT 1`
    )
    if (!p) return null
    const esiti = await query<{
      codice: string
      titolo: string
      esito: ControlloImpianto['esito']
      dettaglio: string
      cosa_fare: string | null
    }>(
      `SELECT codice, titolo, esito, dettaglio, cosa_fare FROM impianto_esiti WHERE passata_id = ? ORDER BY id`,
      [p.id]
    )
    return {
      ...p,
      esiti: esiti.map((e) => ({
        codice: e.codice,
        titolo: e.titolo,
        esito: e.esito,
        dettaglio: e.dettaglio,
        cosaFare: e.cosa_fare ?? '',
      })),
    }
  } catch {
    return null
  }
}
