import { query } from '@/lib/db'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'

/**
 * La regola che vale piu di tutte le altre messe insieme.
 *
 * Su Aelle: 101.000 impressioni in tre mesi, 757 clic, tasso di clic 0,8 per cento
 * con posizione media 7,6. Per quella posizione l atteso e fra il 2 e il 4.
 * Casi limite: "dj shocca", posizione 1,3 con 2.519 impressioni e zero clic.
 *
 * Qui cerchiamo le pagine dove la distanza fra clic attesi e clic reali e piu
 * grande, e proponiamo un titolo nuovo. Nessun contenuto nuovo, solo la vetrina.
 */

// Tasso di clic tipico per posizione. Valori prudenti, servono a ordinare
// le opportunita, non a promettere risultati.
const CTR_ATTESO: Record<number, number> = {
  1: 0.28, 2: 0.15, 3: 0.11, 4: 0.08, 5: 0.06,
  6: 0.05, 7: 0.04, 8: 0.033, 9: 0.028, 10: 0.025,
}

function attesoPerPosizione(pos: number): number {
  const p = Math.max(1, Math.min(10, Math.round(pos)))
  return CTR_ATTESO[p] ?? 0.02
}

export const regolaCtrBasso: Regola = {
  nome: 'ctr-basso',
  descrizione: 'Pagine con molte impressioni e pochi clic rispetto alla posizione che occupano',

  async esegui(s: Sito): Promise<Proposta[]> {
    const righe = await query<{
      chiave: string
      clic: number
      impressioni: number
      posizione: number
      titolo: string | null
      descrizione: string | null
    }>(
      `SELECT m.chiave, m.clic, m.impressioni, m.posizione, p.titolo, p.descrizione
         FROM misure m
         LEFT JOIN pagine p ON p.sito_id = m.sito_id AND p.url = m.chiave
        WHERE m.sito_id = ?
          AND m.fonte = 'search-console'
          AND m.tipo_chiave = 'pagina'
          AND m.giorno = (SELECT MAX(giorno) FROM misure WHERE sito_id = ? AND fonte = 'search-console')
          AND m.impressioni >= 300
          AND m.posizione IS NOT NULL
          AND m.posizione <= 12
        ORDER BY m.impressioni DESC
        LIMIT 100`,
      [s.id, s.id]
    )

    const proposte: Proposta[] = []

    for (const r of righe) {
      const ctrReale = r.impressioni ? r.clic / r.impressioni : 0
      const atteso = attesoPerPosizione(r.posizione)
      // Solo scarti veri: sotto meta dell atteso.
      if (ctrReale >= atteso * 0.5) continue

      const clicAttesi = Math.round(r.impressioni * atteso)
      const guadagno = Math.max(0, clicAttesi - r.clic)
      if (guadagno < 20) continue

      proposte.push({
        regola: 'ctr-basso',
        bersaglio: r.chiave,
        campo: 'titolo',
        valoreVecchio: r.titolo,
        valoreNuovo: '', // lo compone chi genera i testi, vedi lib/regole/testi.ts
        motivo:
          `${r.impressioni.toLocaleString('it-CH')} impressioni in posizione ${r.posizione.toFixed(1)} ` +
          `ma solo ${r.clic} clic (${(ctrReale * 100).toFixed(2)} per cento contro ${(atteso * 100).toFixed(1)} atteso). ` +
          `Il titolo mostrato non convince chi vede il risultato.`,
        guadagnoStimato: guadagno,
        rischio: 'sicura',
      })
    }

    return proposte.sort((a, b) => (b.guadagnoStimato ?? 0) - (a.guadagnoStimato ?? 0))
  },
}
