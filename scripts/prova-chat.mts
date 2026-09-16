/**
 * Prova la chat interna da terminale, senza browser.
 *
 * Serve a vedere cosa risponde Claude e quali mosse propone su un oggetto vero,
 * con i numeri veri del database. Non conferma niente: le mosse restano in attesa,
 * come nel pannello.
 *
 *   npm run chat -- azione 12 "perche questa proposta"
 *   npm run chat -- azione aelle "perche questa proposta"   (prima proposta in coda del sito)
 *   npm run chat -- bozza 3 "il budget ha senso"
 *   npm run chat -- campagna brignole:1234567890 "sto spendendo bene"
 */

import { caricaEnv } from './env-locale.mts'

caricaEnv()

const { chiedi } = await import('../lib/chat/index.ts')
const { contesto } = await import('../lib/chat/contesto.ts')
const { unaRiga } = await import('../lib/db.ts')

const ambito = process.argv[2]
let riferimento = process.argv[3] ?? ''
const domanda = process.argv[4] ?? 'Perche il pannello propone questo, in due righe'

if (!ambito || !['azione', 'campagna', 'bozza'].includes(ambito) || !riferimento) {
  console.error('Uso: npm run chat -- <azione|campagna|bozza> <riferimento|sito> "domanda"')
  process.exit(1)
}

// Comodita: al posto del numero si puo dare il sito, e si prende la prima
// proposta in coda. Cosi non serve andare a cercare l id nel database.
if (ambito === 'azione' && !/^\d+$/.test(riferimento)) {
  const a = await unaRiga<{ id: number }>(
    `SELECT id FROM azioni WHERE sito_id = ? AND stato IN ('proposta','approvata','fallita')
      ORDER BY id DESC LIMIT 1`,
    [riferimento]
  )
  if (!a) {
    console.error(`Nessuna proposta in coda per ${riferimento}. Lancia prima: npm run lavoro -- diagnosi`)
    process.exit(1)
  }
  console.log(`Sito ${riferimento}: uso la proposta ${a.id}`)
  riferimento = String(a.id)
}

const c = await contesto(ambito as never, riferimento)
console.log('\n--- DOSSIER CHE CLAUDE LEGGE ---')
console.log(c.dossier)
console.log('\nmosse permesse qui:', c.permesse.join(', '))
if (c.divieti.length) console.log('divieti:', c.divieti.join(' | '))

console.log(`\n--- DOMANDA ---\n${domanda}`)
const esito = await chiedi(ambito as never, riferimento, domanda)
console.log(`\n--- RISPOSTA ---\n${esito.testo}`)
if (esito.mosse.length) {
  console.log('\n--- MOSSE IN ATTESA DEL TUO PULSANTE ---')
  for (const [i, m] of esito.mosse.entries()) {
    console.log(`${i}. ${m.tipo}${m.ambito ? ` (${m.ambito})` : ''}: ${m.valore ?? m.testo ?? m.perche ?? ''}`)
  }
  console.log(`\nPer confermarne una nel pannello: messaggio ${esito.messaggioId}, indice sopra.`)
} else {
  console.log('\nNessuna mossa proposta: era solo una spiegazione.')
}
process.exit(0)
