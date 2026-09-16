/**
 * Lancia un lavoro del ciclo da terminale, come lo lancerebbe il pannello.
 * Serve a provare la logica senza aspettare la sveglia e senza il browser.
 *
 *   npx tsx scripts/prova-lavoro.mts raccolta
 *   npx tsx scripts/prova-lavoro.mts scansione strangeglyph
 *
 * Scrive nel database (misure, pagine, proposte). Non scrive sui siti.
 */
import { caricaEnv } from './env-locale.mts'

caricaEnv()

const { eseguiLavoro, LAVORI } = await import('../lib/lavori/index.ts')

const nome = process.argv[2]
const sitoId = process.argv[3] ?? null
const nomi = LAVORI.map((l) => l.nome)
if (!nome || !nomi.includes(nome as never)) {
  console.error(`Uso: npx tsx scripts/prova-lavoro.mts <${nomi.join('|')}> [sito]`)
  process.exit(1)
}

const inizio = Date.now()
try {
  const esito = await eseguiLavoro(nome as never, sitoId)
  console.log(`\n${esito.lavoro}: ${esito.riassunto}`)
  console.log(`righe: ${esito.righe}, secondi: ${Math.round((Date.now() - inizio) / 1000)}`)
  if (esito.problemi.length) {
    console.log('problemi:')
    for (const p of esito.problemi) console.log(`  - ${p}`)
  } else {
    console.log('nessun problema')
  }
} catch (e) {
  console.error(`\n${nome} interrotto: ${(e as Error).message}`)
  process.exit(1)
}
process.exit(0)
