import { query, unaRiga } from '@/lib/db'
import { SITI, type Sito } from '@/siti.config'
import { completa, jsonDaRisposta } from '@/lib/modelli/completa'
import { queryDellaPagina } from '@/lib/regole/testi'

export type BozzaContenuto = {
  obiettivo: string
  rete: string
  lingue: string[]
  zone: string[]
  atterraggio: string
  budgetGiornaliero: number
  motivoBudget: string
  parole: { testo: string; tipo: string }[]
  esclusioni: string[]
  titoli: string[]
  descrizioni: string[]
}

function identitaDi(s: Sito) {
  return s.identita
}

async function haGiaBozza(sitoId: string): Promise<boolean> {
  const r = await unaRiga<{ n: number }>(
    `SELECT COUNT(*) AS n FROM campagne_bozze WHERE sito_id = ? AND stato = 'bozza'`,
    [sitoId]
  )
  return Number(r?.n ?? 0) > 0
}

export async function generaBozzeMancanti(): Promise<number> {
  let n = 0
  for (const s of SITI) {
    const PRIORITARI = new Set(['aelle-store', 'aelle', 'biography-library', 'brignole'])
    if (!PRIORITARI.has(s.id)) continue
    if (await haGiaBozza(s.id)) continue
    try {
      const contenuto = await compoBozza(s)
      const titolo =
        s.identita === 'biography-library'
          ? `Grants: ricerca ${s.nome}`
          : `Ricerca: ${s.nome}`
      await query(
        `INSERT INTO campagne_bozze (identita, sito_id, titolo, contenuto) VALUES (?,?,?,?)`,
        [identitaDi(s), s.id, titolo, JSON.stringify(contenuto)]
      )
      n++
    } catch (e) {
      console.warn(`[bozza] ${s.id}: ${(e as Error).message}`)
    }
  }
  return n
}

async function compoBozza(s: Sito): Promise<BozzaContenuto> {
  const ricerche = await query<{ chiave: string; impressioni: number }>(
    `SELECT chiave, SUM(impressioni) AS impressioni FROM misure
      WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'query'
        AND giorno >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      GROUP BY chiave ORDER BY impressioni DESC LIMIT 20`,
    [s.id]
  )
  const pagine = await query<{ url: string; titolo: string | null; h1: string | null }>(
    `SELECT url, titolo, h1 FROM pagine WHERE sito_id = ? AND stato_http = 200 LIMIT 15`,
    [s.id]
  )
  const zeroDati = ricerche.length === 0
  const grants = s.identita === 'biography-library'

  const sistema =
    `Sei un consulente Google Ads. Rispondi SOLO con JSON. ` +
    `Campi: obiettivo, rete, lingue (array), zone (array), atterraggio, budgetGiornaliero (numero), ` +
    `motivoBudget, parole (array di {testo, tipo}), esclusioni (array), titoli (max 10 stringhe da 30 caratteri), ` +
    `descrizioni (max 4 stringhe da 90 caratteri). ` +
    `Rete sempre "Ricerca". Niente trattino lungo. Non inventare sconti. ` +
    (grants
      ? `Questa e una campagna Google Ad Grants per un associazione no profit. Destinazione solo il sito dell associazione. Budget giornaliero massimo 329 se non sai il tetto attuale. Niente parole di una sola parola troppo generiche. Tasso di clic deve poter stare sopra il cinque per cento.`
      : `Questa e una campagna a pagamento del perimetro Brignole. Non mescolare siti dell associazione Biography Library.`)

  const utente = [
    `Sito: ${s.nome} ${s.dominio}`,
    `Lingue del sito: ${s.lingue.join(', ')}`,
    `Ricerche organiche: ${ricerche.map((r) => r.chiave).join('; ') || 'nessuna, sito non ancora visibile'}`,
    `Pagine: ${pagine.map((p) => p.titolo || p.h1 || p.url).join('; ') || 'scansione non ancora fatta'}`,
    `Query della home: ${(await queryDellaPagina(s.id, `https://${s.dominio}/`)).join('; ') || 'nessuna'}`,
    zeroDati
      ? 'Dati a zero: proponi un budget di apprendimento basso e dillo nel motivoBudget.'
      : 'Usa i volumi per un budget prudente da due settimane di prova.',
  ].join('\n')

  const grezzo = await completa(sistema, utente)
  const parsed = jsonDaRisposta<BozzaContenuto>(grezzo)
  parsed.rete = 'Ricerca'
  parsed.atterraggio = parsed.atterraggio?.startsWith('http')
    ? parsed.atterraggio
    : `https://${s.dominio}/`
  if (grants) {
    const host = new URL(parsed.atterraggio).hostname.replace(/^www\./, '')
    if (!host.endsWith('biographylibrary.org')) {
      parsed.atterraggio = 'https://biographylibrary.org/'
    }
  }
  if (zeroDati && !grants) {
    parsed.budgetGiornaliero = Math.min(Number(parsed.budgetGiornaliero) || 8, 12)
    parsed.motivoBudget =
      parsed.motivoBudget ||
      'Budget di apprendimento: ancora zero dati di ricerca. Due settimane, poi si rivede con i numeri veri.'
  }
  return parsed
}
