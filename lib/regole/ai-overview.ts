import { query } from '@/lib/db'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'

export const regolaAiOverview: Regola = {
  nome: 'ai-overview',
  descrizione: 'Pagine molto viste nelle risposte generate da Google, con titolo debole o pochi clic',

  async esegui(s: Sito): Promise<Proposta[]> {
    const righe = await query<{
      chiave: string
      clic: number
      impressioni: number
      titolo: string | null
    }>(
      `SELECT m.chiave,
              SUM(m.clic) AS clic,
              SUM(m.impressioni) AS impressioni,
              p.titolo
         FROM misure m
         LEFT JOIN pagine p ON p.sito_id = m.sito_id AND p.url = m.chiave
        WHERE m.sito_id = ?
          AND m.fonte = 'search-console-ai'
          AND m.tipo_chiave = 'pagina'
          AND m.giorno >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
        GROUP BY m.chiave, p.titolo
       HAVING SUM(m.impressioni) >= 80
        ORDER BY SUM(m.impressioni) DESC
        LIMIT 40`,
      [s.id]
    )

    const proposte: Proposta[] = []
    for (const r of righe) {
      const impressioni = Number(r.impressioni)
      const clic = Number(r.clic)
      const ctr = impressioni ? clic / impressioni : 0
      const titoloVuoto = !r.titolo || !r.titolo.trim()
      if (!titoloVuoto && ctr >= 0.04) continue
      proposte.push({
        regola: 'ai-overview',
        bersaglio: r.chiave,
        campo: 'titolo',
        valoreVecchio: r.titolo,
        valoreNuovo: '',
        motivo:
          `Google mette questa pagina nelle risposte generate (${impressioni.toLocaleString('it-CH')} sguardi, ${clic} clic). ` +
          `La gente legge la risposta e non clicca: il titolo deve promettere il dettaglio che manca li.`,
        guadagnoStimato: Math.max(0, Math.round(impressioni * 0.04 - clic)),
        rischio: 'sicura',
      })
    }
    return proposte
  },
}
