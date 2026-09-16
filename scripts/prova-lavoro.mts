/**
 * Lancia un lavoro del ciclo da terminale, come lo lancerebbe il pannello.
 * Serve a provare la logica senza aspettare la sveglia e senza il browser.
 *
 *   npx tsx scripts/prova-lavoro.mts raccolta
 *   npx tsx scripts/prova-lavoro.mts scansione strangeglyph
 *
 * Scrive nel database (misure, pagine, proposte). Non scrive sui siti.
 */
import { readFileSync, existsSync } from 'node:fs'

function togliApici(valore: string): string {
  const v = valore.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1)
  }
  return valore
}

function caricaEnv(): void {
  if (!existsSync('.env.local')) return
  const righe = readFileSync('.env.local', 'utf8').split(/\r?\n/)
  let i = 0
  while (i < righe.length) {
    const tagliata = righe[i].trim()
    i++
    if (!tagliata || tagliata.startsWith('#')) continue
    const m = tagliata.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let valore = togliApici(m[2])
    if (valore.trim().startsWith('{')) {
      const pezzi = [valore]
      while (i < righe.length) {
        const candidato = togliApici(pezzi.join('\n').trim())
        try {
          valore = JSON.stringify(JSON.parse(candidato))
          break
        } catch {
          if (/^[A-Z][A-Z0-9_]*=/.test(righe[i].trim())) break
          pezzi.push(righe[i])
          i++
        }
      }
    }
    if (!process.env[m[1]]) process.env[m[1]] = valore
  }
}

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
