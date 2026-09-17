#!/usr/bin/env node
/**
 * Applica db/schema.sql al database.
 *
 * Legge la configurazione dalle variabili d ambiente, che e il modo giusto
 * quando l hosting le fornisce dal suo pannello (Hostinger lo fa). Se non le
 * trova, ricade su un file .env.local nella cartella del progetto.
 *
 * In alternativa, senza terminale: /api/setup/migra?chiave=LA_CHIAVE
 *
 * Le istruzioni si eseguono una per una: un ALTER che aggiunge una colonna
 * gia presente (1060) o un indice gia presente non ferma il resto.
 */
import { readFileSync, existsSync } from 'node:fs'
import mysql from 'mysql2/promise'

function configurazione() {
  if (process.env.DB_HOST && process.env.DB_NAME) return process.env

  if (!existsSync('.env.local')) {
    console.error(
      'Non trovo la configurazione del database.\n' +
        'Imposta le variabili DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME\n' +
        'nel pannello dell hosting, oppure crea un file .env.local.'
    )
    process.exit(1)
  }

  const env = { ...process.env }
  for (const riga of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m && !env[m[1]]) env[m[1]] = m[2].trim()
  }
  return env
}

/** Spezza lo schema in istruzioni, ignorando i commenti a riga. */
function istruzioni(sql) {
  const senzaCommenti = sql
    .split('\n')
    .filter((r) => !/^\s*--/.test(r))
    .join('\n')
  return senzaCommenti
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

const IGNORA = new Set([
  'ER_DUP_FIELDNAME', // colonna gia presente
  'ER_DUP_KEYNAME', // indice gia presente
  'ER_TABLE_EXISTS_ERROR',
])

const env = configurazione()

const conn = await mysql.createConnection({
  host: env.DB_HOST,
  port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
})

const elenco = istruzioni(readFileSync('db/schema.sql', 'utf8'))
let fatte = 0
for (const sql of elenco) {
  try {
    await conn.query(sql)
    fatte++
  } catch (e) {
    if (IGNORA.has(e.code)) continue
    console.error(`Fallita:\n${sql.slice(0, 200)}\n${e.message}`)
    await conn.end()
    process.exit(1)
  }
}

const [tabelle] = await conn.query('SHOW TABLES')
console.log(
  `Schema applicato (${fatte} istruzioni). Tabelle:`,
  tabelle.map((r) => Object.values(r)[0]).join(', ')
)
await conn.end()
