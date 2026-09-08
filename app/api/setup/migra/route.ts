import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { verificaChiaveCron } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Prepara il database senza bisogno del terminale.
 *   https://seo.brignole.ch/api/setup/migra?chiave=LA_CRON_CHIAVE
 */

async function leggiSchema(): Promise<string> {
  const candidate = [
    join(process.cwd(), 'db', 'schema.sql'),
    join(process.cwd(), '..', 'db', 'schema.sql'),
  ]
  for (const percorso of candidate) {
    try {
      return await readFile(percorso, 'utf8')
    } catch {
      /* prova il successivo */
    }
  }
  throw new Error('file-mancante')
}

function pagina(titolo: string, testo: string, status: number) {
  const html = `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><title>${titolo}</title></head>
<body style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:40em;margin:48px auto;padding:0 20px;line-height:1.5;color:#161A18">
  <h1 style="font-size:22px">${titolo}</h1>
  <p style="white-space:pre-wrap">${testo.replace(/</g, '&lt;')}</p>
</body>
</html>`
  return new NextResponse(html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  })
}

export async function GET(req: NextRequest) {
  const negato = verificaChiaveCron(req)
  if (negato) {
    const corpo = await negato.json()
    return pagina(
      corpo.errore ?? 'Accesso negato',
      corpo.cosaFare ?? 'Controlla CRON_CHIAVE nelle variabili d ambiente e riavvia l applicazione.',
      negato.status
    )
  }

  let schema: string
  try {
    schema = await leggiSchema()
  } catch {
    return pagina(
      'Non trovo lo schema sul server',
      'In hPanel fai un nuovo rilascio da GitHub (ramo main) e verifica che la cartella db sia nel progetto. In alternativa: phpMyAdmin, database della regia, incolla il contenuto di db/schema.sql.',
      500
    )
  }

  try {
    await query('SELECT 1')
  } catch (e) {
    const dettaglio = (e as Error).message
    return pagina(
      'Il database non risponde',
      'La chiave nell indirizzo e giusta. A sbagliare sono i valori DB_.\n\n' +
        '1. DB_HOST = 127.0.0.1 (non localhost)\n' +
        '2. DB_PORT = 3306\n' +
        '3. DB_NAME, DB_USER, DB_PASSWORD: copia esatta da Database MySQL, senza virgolette\n' +
        '4. Salva le variabili e RIAVVIA l applicazione Node\n' +
        '5. Se ancora rifiuta, in Database → MySQL remoto copia il nome srv….hstgr.io e mettilo in DB_HOST\n\n' +
        `Dettaglio tecnico: ${dettaglio}`,
      500
    )
  }

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

  try {
    const tabelle = await query<Record<string, string>>('SHOW TABLES')
    const presenti = tabelle.map((r) => Object.values(r)[0])
    if (problemi.length) {
      return pagina(
        'Migrazione con problemi',
        `Tabelle presenti: ${presenti.join(', ') || '(nessuna)'}\n\n` +
          problemi.join('\n') +
          '\n\nQuasi sempre e un valore DB_ sbagliato, oppure lo schema e stato applicato a meta. Rilancia questa stessa pagina dopo aver corretto.',
        500
      )
    }
    return pagina(
      'Database pronto',
      `Tabelle create: ${presenti.join(', ')}.\n\nOra apri https://seo.brignole.ch e entra con PANNELLO_PASSWORD.`,
      200
    )
  } catch (e) {
    return pagina(
      'Il database non risponde (dopo i comandi)',
      `Dettaglio: ${(e as Error).message}\n\nRivedi DB_HOST=127.0.0.1, porta 3306, e riavvia l applicazione.`,
      500
    )
  }
}
