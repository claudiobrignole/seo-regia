import { query } from '@/lib/db'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'
import { eArticoloArchivioAelle } from '@/lib/siti/archivio-aelle'

/**
 * Pagine tradotte che mostrano ancora il titolo dell originale.
 *
 * Con TranslatePress la pagina inglese esiste e si legge in inglese, ma titolo e
 * descrizione restano quelli italiani finche qualcuno non li traduce nell editor
 * delle traduzioni. Per Google sono due pagine diverse con lo stesso titolo, e
 * la versione tradotta parte svantaggiata sulle ricerche in quella lingua.
 *
 * Questa e una nota, non una modifica: il pannello non ha una strada per scrivere
 * dentro TranslatePress, e inventarne una vorrebbe dire scrivere nelle sue
 * tabelle a mano. Una scheda per sito, con l elenco, non una per pagina.
 */
export const regolaTitoliNonTradotti: Regola = {
  nome: 'titoli-non-tradotti',
  descrizione: 'Pagine tradotte che portano il titolo della pagina originale',

  async esegui(s: Sito): Promise<Proposta[]> {
    if (s.traduzioni !== 'translatepress') return []
    const altre = s.lingue.slice(1)
    if (!altre.length) return []

    // `://[^/]+/(en|fr|de)/` prende il prefisso di lingua subito dopo il dominio.
    const prefissi = `://[^/]+/(${altre.join('|')})/`
    const coppie = await query<{ tradotta: string; originale: string; titolo: string }>(
      `SELECT t.url AS tradotta, o.url AS originale, t.titolo
         FROM pagine t
         JOIN pagine o
           ON o.sito_id = t.sito_id AND o.titolo = t.titolo AND o.url <> t.url
        WHERE t.sito_id = ? AND t.stato_http = 200 AND o.stato_http = 200
          AND t.titolo IS NOT NULL AND TRIM(t.titolo) <> ''
          AND t.url REGEXP ? AND o.url NOT REGEXP ?
        ORDER BY t.url
        LIMIT 200`,
      [s.id, prefissi, prefissi]
    )
    // L archivio 1991-2001 esce da questo elenco: quei titoli sono quelli
    // stampati sulla rivista, e tradurli sarebbe riscriverli. Vale sia per
    // l articolo italiano sia per la sua versione in /en/archive/.
    const buone = []
    for (const c of coppie) {
      if (await eArticoloArchivioAelle(s.id, c.tradotta)) continue
      if (await eArticoloArchivioAelle(s.id, c.originale)) continue
      buone.push(c)
    }
    if (!buone.length) return []
    const coppieDaFare = buone

    const esempi = coppieDaFare
      .slice(0, 5)
      .map((c) => `- ${c.tradotta}\n  titolo di ${c.originale}: ${c.titolo}`)
      .join('\n')
    const quante = coppieDaFare.length

    return [
      {
        regola: 'titoli-non-tradotti',
        bersaglio: 'titoli delle pagine tradotte',
        campo: 'istruzione',
        valoreVecchio: null,
        valoreNuovo:
          `In WordPress, TranslatePress, Traduci il sito: apri una di queste pagine nell editor e traduci il ` +
          `titolo, che nell elenco delle stringhe compare come testo della pagina originale.\n\n` +
          `Le prime ${Math.min(quante, 5)} di ${quante}:\n${esempi}\n\n` +
          `Se in TranslatePress il titolo SEO non compare fra le stringhe, quel pezzo lo traduce il componente ` +
          `aggiuntivo SEO di TranslatePress: senza quello le pagine tradotte tengono il titolo italiano, ed e una ` +
          `scelta legittima, purche sia una scelta.`,
        motivo:
          `${quante} pagine tradotte mostrano il titolo della pagina italiana (l archivio 1991-2001 non e in conto: quei titoli sono quelli della rivista). Per Google sono due pagine con lo ` +
          `stesso titolo, e quella tradotta parte indietro sulle ricerche nella sua lingua. Il pannello non puo ` +
          `farlo da se: quei testi stanno dentro TranslatePress, non nei campi SEO della pagina.`,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      },
    ]
  },
}
