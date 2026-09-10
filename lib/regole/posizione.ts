import { query } from '@/lib/db'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'

export const regolaPosizione: Regola = {
  nome: 'posizione',
  descrizione: 'Pagine uscite dalla prima pagina di Google, con ancora molte impressioni',

  async esegui(s: Sito): Promise<Proposta[]> {
    const righe = await query<{
      chiave: string
      pos_ora: number
      pos_prima: number
      impressioni: number
      titolo: string | null
    }>(
      `SELECT n.chiave,
              n.pos_ora,
              v.pos_prima,
              n.impressioni,
              p.titolo
         FROM (
           SELECT chiave, AVG(posizione) AS pos_ora, SUM(impressioni) AS impressioni
             FROM misure
            WHERE sito_id = ?
              AND fonte = 'search-console'
              AND tipo_chiave = 'pagina'
              AND giorno >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
            GROUP BY chiave
         ) n
         INNER JOIN (
           SELECT chiave, AVG(posizione) AS pos_prima
             FROM misure
            WHERE sito_id = ?
              AND fonte = 'search-console'
              AND tipo_chiave = 'pagina'
              AND giorno >= DATE_SUB(CURDATE(), INTERVAL 56 DAY)
              AND giorno < DATE_SUB(CURDATE(), INTERVAL 28 DAY)
            GROUP BY chiave
         ) v ON v.chiave = n.chiave
         LEFT JOIN pagine p ON p.sito_id = ? AND p.url = n.chiave
        WHERE v.pos_prima <= 10
          AND n.pos_ora > 10
          AND n.impressioni >= 80
        ORDER BY n.impressioni DESC
        LIMIT 20`,
      [s.id, s.id, s.id]
    )

    return righe.map((r) => ({
      regola: 'posizione',
      bersaglio: r.chiave,
      campo: 'titolo' as const,
      valoreVecchio: r.titolo,
      valoreNuovo: '',
      motivo:
        `Questa pagina era in posizione ${Number(r.pos_prima).toFixed(1)} e ora e ${Number(r.pos_ora).toFixed(1)}, ` +
        `con ancora ${Number(r.impressioni).toLocaleString('it-CH')} impressioni. Un titolo piu chiaro puo aiutarla a risalire. Non e un articolo nuovo.`,
      guadagnoStimato: Math.round(Number(r.impressioni) * 0.02),
      rischio: 'sicura' as const,
    }))
  },
}
