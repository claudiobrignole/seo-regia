import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

export function db(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT ?? 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      charset: 'utf8mb4',
      timezone: 'Z',
    })
  }
  return pool
}

export async function query<T = any>(sql: string, valori: unknown[] = []): Promise<T[]> {
  // Senza parametri si usa query, non execute: CREATE TABLE in prepared statement
  // su alcuni MySQL di Hostinger viene rifiutato.
  if (valori.length === 0) {
    const [righe] = await db().query(sql)
    return righe as T[]
  }
  const [righe] = await db().execute(sql, valori as never)
  return righe as T[]
}

export async function unaRiga<T = any>(sql: string, valori: unknown[] = []): Promise<T | null> {
  const r = await query<T>(sql, valori)
  return r[0] ?? null
}

export type Misura = {
  sitoId: string
  fonte: string
  giorno: string
  chiave: string
  tipoChiave: 'pagina' | 'query' | 'pagina_query' | 'prodotto' | 'sito'
  clic?: number
  impressioni?: number
  posizione?: number | null
  valore?: number | null
  extra?: unknown
}

function valoriMisura(m: Misura): unknown[] {
  return [
    m.sitoId, m.fonte, m.giorno, m.chiave.slice(0, 500), m.tipoChiave,
    m.clic ?? 0, m.impressioni ?? 0, m.posizione ?? null, m.valore ?? null,
    m.extra ? JSON.stringify(m.extra) : null,
  ]
}

const SOVRASCRIVI_MISURA = `ON DUPLICATE KEY UPDATE
       clic = VALUES(clic), impressioni = VALUES(impressioni),
       posizione = VALUES(posizione), valore = VALUES(valore), extra = VALUES(extra)`

/** Scrive una misura, sovrascrivendo quella dello stesso giorno se rieseguiamo il lavoro. */
export async function salvaMisura(m: Misura) {
  await query(
    `INSERT INTO misure (sito_id, fonte, giorno, chiave, tipo_chiave, clic, impressioni, posizione, valore, extra)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ${SOVRASCRIVI_MISURA}`,
    valoriMisura(m)
  )
}

/**
 * Scrive molte misure in pochi viaggi.
 *
 * Una riga per volta la Search Console ce ne fa diecimila per notte: da fuori
 * il datacentro sono sei minuti di sola attesa di rete, e la raccolta sfora il
 * tempo concesso. A lotti dura una frazione. Il risultato nel database e
 * identico, sovrascrittura compresa.
 */
export async function salvaMisure(righe: Misura[], perLotto = 200): Promise<number> {
  let scritte = 0
  for (let i = 0; i < righe.length; i += perLotto) {
    const lotto = righe.slice(i, i + perLotto)
    const segnaposto = lotto.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',')
    const valori = lotto.flatMap(valoriMisura)
    await query(
      `INSERT INTO misure (sito_id, fonte, giorno, chiave, tipo_chiave, clic, impressioni, posizione, valore, extra)
       VALUES ${segnaposto}
       ${SOVRASCRIVI_MISURA}`,
      valori
    )
    scritte += lotto.length
  }
  return scritte
}

export async function iniziaEsecuzione(lavoro: string): Promise<number> {
  const [res] = await db().execute('INSERT INTO esecuzioni (lavoro) VALUES (?)', [lavoro])
  return (res as mysql.ResultSetHeader).insertId
}

export async function chiudiEsecuzione(
  id: number,
  esito: 'ok' | 'parziale' | 'errore',
  righe: number,
  messaggio?: string
) {
  await query(
    'UPDATE esecuzioni SET finita_il = NOW(), esito = ?, righe = ?, messaggio = ? WHERE id = ?',
    [esito, righe, messaggio ?? null, id]
  )
}
