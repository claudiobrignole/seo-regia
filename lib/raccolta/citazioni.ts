import { query, salvaMisura } from '@/lib/db'
import { completa, jsonDaRisposta } from '@/lib/modelli/completa'
import { SITI, type Sito } from '@/siti.config'
import { giornoIso } from '@/lib/date'

type Esito = { citato: boolean; marche: string[]; fonti: string[] }

/**
 * Campione: Claude, lo stesso dei testi. Non e l indice pubblico di ChatGPT.
 * Pochi prompt a notte, dalle query Search Console piu viste.
 */
export async function raccogliCitazioni(s: Sito): Promise<number> {
  const prompt = await scegliPrompt(s)
  if (!prompt.length) return 0
  const giorno = giornoIso(0)
  let n = 0
  for (const frase of prompt) {
    try {
      const esito = await chiedi(s, frase)
      await salvaMisura({
        sitoId: s.id,
        fonte: 'citazioni-llm',
        giorno,
        chiave: frase.slice(0, 500),
        tipoChiave: 'query',
        extra: {
          motore: process.env.MODELLO_TESTI ?? 'claude',
          citato: esito.citato,
          marche: esito.marche,
          fonti: esito.fonti,
          campione: true,
        },
      })
      n++
    } catch (e) {
      console.warn(`[citazioni] ${s.id}: ${(e as Error).message}`)
    }
  }
  return n
}

async function scegliPrompt(s: Sito): Promise<string[]> {
  const fisse = [
    `chi e ${s.nome}`,
    `${s.nome} sito ufficiale`,
  ]
  const querySc = await query<{ chiave: string }>(
    `SELECT chiave FROM misure
      WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'query'
        AND giorno >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
      GROUP BY chiave
      ORDER BY SUM(impressioni) DESC
      LIMIT 8`,
    [s.id]
  )
  const elenco = [...fisse, ...querySc.map((q) => q.chiave)]
  const unici = [...new Set(elenco.map((x) => x.trim()).filter((x) => x.length > 3))]
  const scarto = new Date().getUTCDate() % Math.max(1, unici.length)
  const ruotati = [...unici.slice(scarto), ...unici.slice(0, scarto)]
  return ruotati.slice(0, 3)
}

async function chiedi(s: Sito, frase: string): Promise<Esito> {
  const sistema =
    `Rispondi in italiano. JSON solo: {"citato":true|false,"marche":["..."],"fonti":["..."]}. ` +
    `citato e true solo se nomini esplicitamente ${s.nome} o ${s.dominio}. ` +
    `marche: nomi di marche o siti che citeresti. fonti: URL o domini. Niente trattino lungo.`
  const grezzo = await completa(sistema, `Domanda di una persona: ${frase}`)
  return jsonDaRisposta<Esito>(grezzo)
}
