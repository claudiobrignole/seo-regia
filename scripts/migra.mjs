#!/usr/bin/env node
/** Applica db/schema.sql al database configurato in .env.local */
import { readFileSync } from 'node:fs'
import mysql from 'mysql2/promise'

const env = {}
try {
  for (const riga of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = riga.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
} catch {
  console.error('Manca .env.local. Copia .env.example e riempilo.')
  process.exit(1)
}

const conn = await mysql.createConnection({
  host: env.DB_HOST, port: Number(env.DB_PORT ?? 3306),
  user: env.DB_USER, password: env.DB_PASSWORD, database: env.DB_NAME,
  multipleStatements: true,
})

const sql = readFileSync('db/schema.sql', 'utf8')
await conn.query(sql)
console.log('Schema applicato.')
await conn.end()
