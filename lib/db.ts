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
  const [righe] = await db().execute(sql, valori)
  return righe as T[]
}

export async function unaRiga<T = any>(sql: string, valori: unknown[] = []): Promise<T | null> {
  const r = await query<T>(sql, valori)
  return r[0] ?? null
}

/** Scrive una misura, sovrascrivendo quella dello stesso giorno se rieseguiamo il lavoro. */
export async function salvaMisura(m: {
  sitoId: string
  fonte: string
  giorno: string
  chiave: string
  tipoChiave: 'pagina' | 'query' | 'prodotto' | 'sito'
  clic?: number
  impressioni?: number
  posizione?: number | null
  valore?: number | null
  extra?: unknown
}) {
  await query(
    `INSERT INTO misure (sito_id, fonte, giorno, chiave, tipo_chiave, clic, impressioni, posizione, valore, extra)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       clic = VALUES(clic), impressioni = VALUES(impressioni),
       posizione = VALUES(posizione), valore = VALUES(valore), extra = VALUES(extra)`,
    [
      m.sitoId, m.fonte, m.giorno, m.chiave.slice(0, 500), m.tipoChiave,
      m.clic ?? 0, m.impressioni ?? 0, m.posizione ?? null, m.valore ?? null,
      m.extra ? JSON.stringify(m.extra) : null,
    ]
  )
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
