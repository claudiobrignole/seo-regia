import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { verificaChiaveCron } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Prepara il database senza bisogno del terminale.
 * Si chiama una volta, dal browser o con una richiesta:
 *   /api/setup/migra?chiave=LA_CHIAVE
 *
 * Lo schema usa CREATE TABLE IF NOT EXISTS, quindi rilanciarla non fa danni:
 * crea quello che manca e lascia stare il resto.
 */
export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) return negato

  let schema: string
  try {
    schema = await readFile(join(process.cwd(), 'db', 'schema.sql'), 'utf8')
  } catch {
    return NextResponse.json(
      {
        errore: 'Non trovo db/schema.sql sul server.',
        cosaFare:
          'Verifica che la cartella db sia stata caricata insieme al resto del progetto. ' +
          'In alternativa apri phpMyAdmin da hPanel e incolla il contenuto di db/schema.sql.',
      },
      { status: 500 }
    )
  }

  // Divide lo schema nei singoli comandi: piu sicuro che permettere
  // l esecuzione di comandi multipli sulla connessione.
  const comandi = schema
    .split('\n')
    .filter((r) => !r.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)

  const create: string[] = []
  const problemi: string[] = []

  for (const comando of comandi) {
    try {
      await query(comando)
      const nome = comando.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i)?.[1]
      if (nome) create.push(nome)
    } catch (e) {
      problemi.push((e as Error).message)
    }
  }

  const tabelle = await query<Record<string, string>>('SHOW TABLES')
  const presenti = tabelle.map((r) => Object.values(r)[0])

  return NextResponse.json({
    esito: problemi.length ? 'con problemi' : 'ok',
    tabelleOra: presenti,
    problemi,
    prossimoPasso: problemi.length
      ? 'Controlla i problemi qui sopra: quasi sempre e un valore DB_ sbagliato.'
      : 'Database pronto. Ora apri il pannello: deve mostrare la tabella dei nove bersagli.',
  })
}
