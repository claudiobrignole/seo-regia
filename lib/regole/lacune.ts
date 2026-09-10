import { query } from '@/lib/db'
import { completa } from '@/lib/modelli/completa'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'

export const regolaLacune: Regola = {
  nome: 'lacune',
  descrizione: 'Ricerche con molte impressioni senza una pagina che le copra',

  async esegui(s: Sito): Promise<Proposta[]> {
    const ricerche = await query<{ chiave: string; impressioni: number }>(
      `SELECT chiave, SUM(impressioni) AS impressioni
         FROM misure
        WHERE sito_id = ?
          AND fonte = 'search-console'
          AND tipo_chiave = 'query'
          AND giorno >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
        GROUP BY chiave
       HAVING SUM(impressioni) >= 80
        ORDER BY SUM(impressioni) DESC
        LIMIT 40`,
      [s.id]
    )

    const testi = await query<{ titolo: string | null; h1: string | null }>(
      `SELECT titolo, h1 FROM pagine WHERE sito_id = ? AND stato_http = 200`,
      [s.id]
    )
    const corpus = testi
      .map((t) => `${t.titolo ?? ''} ${t.h1 ?? ''}`.toLowerCase())
      .join('\n')

    const proposte: Proposta[] = []
    for (const r of ricerche) {
      const q = r.chiave.trim()
      if (q.length < 4) continue
      const pezzi = q.toLowerCase().split(/\s+/).filter((p) => p.length > 3)
      const coperta =
        corpus.includes(q.toLowerCase()) ||
        (pezzi.length >= 2 && pezzi.every((p) => corpus.includes(p)))
      if (coperta) continue
      proposte.push({
        regola: 'lacune',
        bersaglio: q,
        campo: 'istruzione',
        valoreVecchio: null,
        valoreNuovo: '',
        motivo:
          `«${q}» ha ${Number(r.impressioni).toLocaleString('it-CH')} impressioni e nessuna pagina del sito la copre nel titolo o nell H1. ` +
          `Non e un articolo da pubblicare da soli: sotto, se il modello ha scritto, c e come farla se un giorno la vuoi.`,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      })
      if (proposte.length >= 8) break
    }
    return proposte
  },
}

export async function compoIstruzione(s: Sito, p: Proposta): Promise<string> {
  const esistenti = await query<{ url: string; titolo: string | null }>(
    `SELECT url, titolo FROM pagine WHERE sito_id = ? AND stato_http = 200 AND titolo IS NOT NULL LIMIT 30`,
    [s.id]
  )
  const sistema =
    `Scrivi in italiano, senza trattino lungo, per ${s.nome} (${s.dominio}). ` +
    `Non inventare fatti. Non dire di pubblicare da soli. Massimo 120 parole. ` +
    `Struttura: 1) intento (informativo o negozio) 2) se un giorno si fa la pagina, H1 proposto 3) quali URL gia sul sito collegare.`
  const utente = [
    `Ricerca senza pagina: ${p.bersaglio}`,
    `Pagine gia sul sito: ${esistenti.map((e) => `${e.titolo} (${e.url})`).join('; ') || 'ancora nessuna in scansione'}`,
  ].join('\n')
  return (await completa(sistema, utente)).trim().replace(/\u2014/g, '-')
}
