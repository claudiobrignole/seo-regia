import { query } from '@/lib/db'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'

/** Titoli e descrizioni mancanti o duplicati: il minimo sindacale. */
export const regolaMetaMancanti: Regola = {
  nome: 'meta-mancanti',
  descrizione: 'Pagine senza titolo, senza descrizione, o con titoli identici fra loro',

  async esegui(s: Sito): Promise<Proposta[]> {
    const proposte: Proposta[] = []

    const senzaDescrizione = await query<{ url: string; titolo: string | null }>(
      `SELECT url, titolo FROM pagine
        WHERE sito_id = ? AND stato_http = 200
          AND (descrizione IS NULL OR TRIM(descrizione) = '')
        LIMIT 200`,
      [s.id]
    )
    for (const p of senzaDescrizione) {
      proposte.push({
        regola: 'meta-mancanti',
        bersaglio: p.url,
        campo: 'descrizione',
        valoreVecchio: null,
        valoreNuovo: '',
        motivo: 'La pagina non ha una descrizione: Google ne inventa una prendendo un pezzo di testo a caso.',
        guadagnoStimato: null,
        rischio: 'sicura',
      })
    }

    const titoliDoppi = await query<{ titolo: string; quante: number; urls: string }>(
      `SELECT titolo, COUNT(*) AS quante, GROUP_CONCAT(url SEPARATOR ' | ') AS urls
         FROM pagine
        WHERE sito_id = ? AND stato_http = 200 AND titolo IS NOT NULL AND TRIM(titolo) <> ''
        GROUP BY titolo HAVING quante > 1
        LIMIT 50`,
      [s.id]
    )
    for (const t of titoliDoppi) {
      for (const url of t.urls.split(' | ').slice(1)) {
        proposte.push({
          regola: 'meta-mancanti',
          bersaglio: url,
          campo: 'titolo',
          valoreVecchio: t.titolo,
          valoreNuovo: '',
          motivo: `Questo titolo compare su ${t.quante} pagine diverse: Google non capisce quale mostrare.`,
          guadagnoStimato: null,
          rischio: 'sicura',
        })
      }
    }

    return proposte
  },
}

/** Pagine che nessun link interno raggiunge: esistono ma nessuno ci arriva. */
export const regolaPagineOrfane: Regola = {
  nome: 'pagine-orfane',
  descrizione: 'Pagine nella sitemap che nessun link interno raggiunge',

  async esegui(s: Sito): Promise<Proposta[]> {
    const orfane = await query<{ url: string; titolo: string | null }>(
      `SELECT url, titolo FROM pagine
        WHERE sito_id = ? AND stato_http = 200 AND link_entranti = 0
        LIMIT 100`,
      [s.id]
    )
    return orfane.map((p) => ({
      regola: 'pagine-orfane',
      bersaglio: p.url,
      campo: 'slug' as const,
      valoreVecchio: null,
      valoreNuovo: '',
      motivo:
        'Nessun link interno porta a questa pagina. Va collegata da un articolo pertinente, ' +
        'oppure tolta dalla sitemap se non serve piu.',
      guadagnoStimato: null,
      rischio: 'da_approvare' as const,
    }))
  },
}

/** Dati strutturati assenti: senza, le macchine leggono peggio. */
export const regolaDatiStrutturati: Regola = {
  nome: 'dati-strutturati',
  descrizione: 'Pagine senza dati strutturati',

  async esegui(s: Sito): Promise<Proposta[]> {
    const senza = await query<{ url: string }>(
      `SELECT url FROM pagine
        WHERE sito_id = ? AND stato_http = 200 AND ha_jsonld = 0 AND parole > 250
        LIMIT 100`,
      [s.id]
    )
    return senza.map((p) => ({
      regola: 'dati-strutturati',
      bersaglio: p.url,
      campo: 'jsonld' as const,
      valoreVecchio: null,
      valoreNuovo: '',
      motivo: 'Contenuto lungo senza dati strutturati: motori e assistenti lo interpretano a fatica.',
      guadagnoStimato: null,
      rischio: 'sicura' as const,
    }))
  },
}
