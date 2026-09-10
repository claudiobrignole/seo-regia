import { query } from '@/lib/db'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'

export const regolaCannibalizzazione: Regola = {
  nome: 'cannibalizzazione',
  descrizione: 'Stessa ricerca, due pagine che si spartiscono le impressioni',

  async esegui(s: Sito): Promise<Proposta[]> {
    const righe = await query<{
      query: string
      n: number
      urls: string
      impressioni: number
    }>(
      `SELECT JSON_UNQUOTE(JSON_EXTRACT(extra, '$.query')) AS query,
              COUNT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(extra, '$.pagina'))) AS n,
              GROUP_CONCAT(DISTINCT JSON_UNQUOTE(JSON_EXTRACT(extra, '$.pagina')) SEPARATOR ' | ') AS urls,
              SUM(impressioni) AS impressioni
         FROM misure
        WHERE sito_id = ?
          AND fonte = 'search-console'
          AND tipo_chiave = 'pagina_query'
          AND JSON_EXTRACT(extra, '$.query') IS NOT NULL
        GROUP BY JSON_UNQUOTE(JSON_EXTRACT(extra, '$.query'))
       HAVING n >= 2 AND SUM(impressioni) >= 80
        ORDER BY SUM(impressioni) DESC
        LIMIT 20`,
      [s.id]
    )

    const proposte: Proposta[] = []
    for (const r of righe) {
      const urls = (r.urls ?? '').split(' | ').filter(Boolean)
      if (urls.length < 2 || !r.query) continue
      const secondaria = urls[1]
      proposte.push({
        regola: 'cannibalizzazione',
        bersaglio: secondaria,
        campo: 'slug',
        valoreVecchio: null,
        valoreNuovo: '',
        motivo:
          `La ricerca «${r.query}» porta a ${r.n} pagine diverse (${Number(r.impressioni).toLocaleString('it-CH')} impressioni). ` +
          `Google non sa quale mostrare. Tieni ${urls[0]} come principale e da ${secondaria} metti un link con quel testo verso la principale.`,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      })
    }
    return proposte
  },
}
