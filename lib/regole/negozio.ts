import { query } from '@/lib/db'
import { prodotti } from '@/lib/raccolta/ecwid'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'

/**
 * Titoli SEO dei prodotti Ecwid, sul sito aelle-store.
 *
 * Prima finivano per sbaglio sotto Aelle (pagine /store/... senza contenuto WP).
 * Qui il bersaglio e il numero prodotto, e Approva scrive su Ecwid.
 */
export const regolaNegozio: Regola = {
  nome: 'negozio',
  descrizione: 'Prodotti Ecwid senza titolo SEO o con titoli ripetuti',

  async esegui(s: Sito): Promise<Proposta[]> {
    if (s.id !== 'aelle-store' || s.scrittura.tipo !== 'ecwid') return []

    let elenco
    try {
      elenco = await prodotti()
    } catch (e) {
      console.warn(`[negozio] ${s.id}: ${(e as Error).message}`)
      return []
    }

    // Solo prodotti principali abilitati: le varianti ereditano.
    const principali = elenco.filter((p) => p.enabled && !p.parentId)
    const proposte: Proposta[] = []

    const senzaTitolo = principali.filter((p) => !(p.seoTitle ?? '').trim()).slice(0, 25)
    for (const p of senzaTitolo) {
      proposte.push({
        regola: 'negozio',
        bersaglio: String(p.id),
        campo: 'titolo',
        valoreVecchio: null,
        valoreNuovo: '',
        motivo:
          `Il prodotto «${p.name}» non ha un titolo SEO in Ecwid. Google mostra il nome grezzo. ` +
          `Approva scrive il titolo SEO sul prodotto (non sulla pagina WordPress del negozio).`,
        guadagnoStimato: null,
        rischio: 'sicura',
      })
    }

    const perTitolo = new Map<string, typeof principali>()
    for (const p of principali) {
      const t = (p.seoTitle ?? '').trim()
      if (!t) continue
      const gruppo = perTitolo.get(t) ?? []
      gruppo.push(p)
      perTitolo.set(t, gruppo)
    }
    for (const [titolo, gruppo] of perTitolo) {
      if (gruppo.length < 2) continue
      for (const p of gruppo.slice(1, 6)) {
        proposte.push({
          regola: 'negozio',
          bersaglio: String(p.id),
          campo: 'titolo',
          valoreVecchio: titolo,
          valoreNuovo: '',
          motivo:
            `Il titolo SEO «${titolo}» e condiviso da ${gruppo.length} prodotti, fra cui «${p.name}». ` +
            `Google non sa quale scheda mostrare. Differenziali nel titolo SEO di Ecwid.`,
          guadagnoStimato: null,
          rischio: 'sicura',
        })
      }
    }

    // Se ci sono vendite recenti senza titolo SEO, priorita (gia coperte sopra se senza titolo).
    const venduti = await query<{ chiave: string }>(
      `SELECT chiave FROM misure
        WHERE sito_id = 'aelle-store' AND fonte = 'ecwid' AND tipo_chiave = 'prodotto'
          AND giorno >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        GROUP BY chiave ORDER BY SUM(valore) DESC LIMIT 40`
    )
    const idsVenduti = new Set(venduti.map((v) => v.chiave))
    for (const p of proposte) {
      if (idsVenduti.has(p.bersaglio)) {
        p.guadagnoStimato = (p.guadagnoStimato ?? 0) + 5
      }
    }
    proposte.sort((a, b) => (b.guadagnoStimato ?? 0) - (a.guadagnoStimato ?? 0))
    return proposte.slice(0, 40)
  },
}
