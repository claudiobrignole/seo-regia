import { query } from '@/lib/db'
import { SITI } from '@/siti.config'
import { CAMPI_DA_MODIFICARE } from '@/lib/azioni-viste'
import { ultimaPassata } from '@/lib/impianto/salva'

export type Livello = 'urgente' | 'importante' | 'media'

export type VoceBriefing = {
  livello: Livello
  sitoId: string
  nomeSito: string
  href: string
  titolo: string
  motivo: string
  comeSaprai: string
  guadagnoStimato: number | null
  origine: 'azione' | 'verdetto' | 'grants' | 'lezione' | 'impianto'
}

/** In home solo queste: il resto resta nella scheda del sito. */
const MAX_HOME_URGENTE = 8
const MAX_HOME_IMPORTANTE = 8

export type Lezione = {
  sitoId: string
  nomeSito: string
  href: string
  bersaglio: string
  esito: 'migliorata' | 'peggiorata'
  testo: string
}

function extraComeOggetto(v: unknown): Record<string, unknown> | null {
  if (!v) return null
  if (typeof v === 'object') return v as Record<string, unknown>
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)
      return p && typeof p === 'object' ? (p as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  return null
}

const NOME = new Map(SITI.map((s) => [s.id, s.nome]))

function nomeSito(id: string): string {
  return NOME.get(id) ?? id
}

function comeSaprai(regola: string): string {
  if (regola === 'ctr-basso' || regola === 'ai-overview' || regola === 'posizione' || regola === 'meta-mancanti') {
    return 'Tra due settimane confrontiamo i clic su questa pagina con quelli di prima.'
  }
  if (regola === 'robots-sitemap') {
    return 'Alla prossima scansione controlliamo se robots e sitemap rispondono come previsto.'
  }
  if (regola === 'merchant') {
    return 'Alla prossima raccolta Merchant vediamo se la scheda e di nuovo approvata.'
  }
  if (regola === 'vitali') {
    return 'I vitali Chrome si aggiornano a blocchi di 28 giorni: non e immediato.'
  }
  if (regola === 'cannibalizzazione' || regola === 'pagine-orfane' || regola === 'lacune') {
    return 'Quando hai sistemato, chiudi la nota. I clic sulla query si vedono in Search Console.'
  }
  return 'Tra due settimane il pannello misura se i clic su questa pagina sono cambiati.'
}

function livelloAzione(regola: string, campo: string, guadagno: number | null): Livello {
  if (regola === 'robots-sitemap' && campo === 'robots') return 'urgente'
  if (regola === 'merchant') return 'urgente'
  if (regola === 'ctr-basso' || regola === 'ai-overview' || regola === 'cannibalizzazione' || regola === 'posizione') {
    return 'importante'
  }
  if ((guadagno ?? 0) >= 50) return 'importante'
  if (regola === 'vitali') return 'media'
  return 'media'
}

function hrefAzione(sitoId: string, id: number, vista: 'modificare' | 'note' | 'storico'): string {
  return `/sito/${sitoId}?vista=${vista}&azione=${id}#azione-${id}`
}

function priorita(v: VoceBriefing): number {
  if (v.origine === 'impianto') return 500
  if (v.origine === 'grants') return 400
  if (v.origine === 'lezione') return 350
  if (v.origine === 'verdetto') return 300
  if (v.titolo.toLowerCase().includes('robots')) return 250
  return v.guadagnoStimato ?? 0
}

type RigaAzione = {
  id: number
  sito_id: string
  regola: string
  bersaglio: string
  campo: string
  motivo: string
  guadagno_stimato: number | null
  stato: string
}

type RigaVerdetto = {
  identita: 'brignole' | 'biography-library'
  campagna_google_id: string
  consiglio: string
  motivo: string
  nome: string | null
}

export async function vociBriefing(): Promise<{
  urgente: VoceBriefing[]
  importante: VoceBriefing[]
  nascoste: number
  errore: string | null
}> {
  const vuoto = { urgente: [] as VoceBriefing[], importante: [] as VoceBriefing[], nascoste: 0, errore: null as string | null }

  try {
    const azioni = await query<RigaAzione>(
      `SELECT id, sito_id, regola, bersaglio, campo, motivo, guadagno_stimato, stato
         FROM azioni
        WHERE stato IN ('proposta','approvata','fallita')
        ORDER BY COALESCE(guadagno_stimato, 0) DESC, id DESC
        LIMIT 400`
    )

    const voci: VoceBriefing[] = []

    try {
      const imp = await ultimaPassata()
      if (imp && Number(imp.n_fallito) > 0) {
        const elenco = imp.esiti
          .filter((e) => e.esito === 'fallito')
          .map((e) => e.titolo)
          .slice(0, 6)
        voci.push({
          livello: 'urgente',
          sitoId: 'brignole',
          nomeSito: 'Impianto',
          href: '/impianto',
          titolo:
            Number(imp.n_fallito) === 1
              ? 'Un controllo notturno e fallito'
              : `${imp.n_fallito} controlli notturni sono falliti`,
          motivo: `${elenco.join('; ')}. Apri Impianto: ogni riga dice l errore e cosa fare.`,
          comeSaprai: 'La sveglia /api/cron/impianto ripete i controlli ogni notte. Puoi anche lanciare Controlla adesso.',
          guadagnoStimato: null,
          origine: 'impianto',
        })
      }
    } catch {
      /* tabelle impianto ancora assenti */
    }

    for (const a of azioni) {
      const scrivibile = CAMPI_DA_MODIFICARE.has(a.campo)
      const livello = livelloAzione(a.regola, a.campo, a.guadagno_stimato == null ? null : Number(a.guadagno_stimato))
      voci.push({
        livello,
        sitoId: a.sito_id,
        nomeSito: nomeSito(a.sito_id),
        href: hrefAzione(a.sito_id, a.id, scrivibile ? 'modificare' : 'note'),
        titolo: scrivibile ? `Modifica ${a.campo}` : 'Nota da leggere',
        motivo: a.motivo,
        comeSaprai: comeSaprai(a.regola),
        guadagnoStimato: a.guadagno_stimato == null ? null : Number(a.guadagno_stimato),
        origine: 'azione',
      })
    }

    try {
      const verdetti = await query<RigaVerdetto>(
        `SELECT v.identita, v.campagna_google_id, v.consiglio, v.motivo, c.nome
           FROM campagne_verdetti v
           INNER JOIN (
             SELECT identita, campagna_google_id, MAX(id) AS id
               FROM campagne_verdetti GROUP BY identita, campagna_google_id
           ) x ON x.id = v.id
           LEFT JOIN campagne c ON c.identita = v.identita AND c.google_id = v.campagna_google_id`
      )
      for (const v of verdetti) {
        if (v.consiglio !== 'pausa' && v.consiglio !== 'cancella' && v.consiglio !== 'ottimizza') continue
        const banco = v.identita === 'biography-library' ? 'biography-library' : 'brignole'
        voci.push({
          livello: v.consiglio === 'ottimizza' ? 'importante' : 'urgente',
          sitoId: v.identita,
          nomeSito: v.identita === 'biography-library' ? 'Pubblicita Biography Library' : 'Pubblicita Brignole',
          href: `/pubblicita/${banco}`,
          titolo: v.nome ? `Campagna: ${v.nome}` : `Campagna ${v.campagna_google_id}`,
          motivo: v.motivo,
          comeSaprai: 'Il prossimo verdetto (circa una settimana) dice se il consiglio e cambiato. Il pannello non mette in pausa da solo.',
          guadagnoStimato: null,
          origine: 'verdetto',
        })
      }
    } catch {
      /* tabelle Ads ancora assenti */
    }

    try {
      const grants = await query<{ mese: string; ctr: number | null; conforme: number; conversioni: number }>(
        `SELECT mese, ctr, conforme, conversioni FROM adgrants_stato ORDER BY mese DESC LIMIT 1`
      )
      const g = grants[0]
      if (g && !Number(g.conforme)) {
        voci.push({
          livello: 'urgente',
          sitoId: 'biography-library',
          nomeSito: 'Pubblicita Biography Library',
          href: '/pubblicita/biography-library',
          titolo: `Grants fuori regola, mese ${g.mese}`,
          motivo:
            `Tasso di clic ${g.ctr != null ? `${(Number(g.ctr) * 100).toFixed(2)} per cento` : 'non disponibile'}, ` +
            `conversioni ${g.conversioni}. Agisci sul banco Grants prima che lo noti Google.`,
          comeSaprai: 'Il lavoro notturno aggiorna la riga del mese. Resta sul banco Biography Library, non su Brignole.',
          guadagnoStimato: null,
          origine: 'grants',
        })
      }
    } catch {
      /* Grants non ancora in database */
    }

    try {
      const peggio = await query<{
        azione_id: number
        sito_id: string
        bersaglio: string
        clic_prima: number | null
        clic_dopo: number | null
      }>(
        `SELECT a.id AS azione_id, a.sito_id, a.bersaglio, v.clic_prima, v.clic_dopo
           FROM verifiche v
           INNER JOIN azioni a ON a.id = v.azione_id
          WHERE v.esito = 'peggiorata'
          ORDER BY v.quando DESC
          LIMIT 8`
      )
      for (const r of peggio) {
        voci.push({
          livello: 'urgente',
          sitoId: r.sito_id,
          nomeSito: nomeSito(r.sito_id),
          href: hrefAzione(r.sito_id, r.azione_id, 'storico'),
          titolo: 'Dopo la modifica i clic sono scesi',
          motivo:
            `Su ${r.bersaglio} i clic sono scesi da ${Number(r.clic_prima ?? 0)} a ${Number(r.clic_dopo ?? 0)} in due settimane. ` +
            `Non ripetere questo schema. In Storico puoi Annulla se la modifica e ancora sul sito.`,
          comeSaprai: 'La prossima verifica non parte da sola: Annulla rimette il valore precedente.',
          guadagnoStimato: null,
          origine: 'lezione',
        })
      }
    } catch {
      /* verifiche ancora assenti */
    }

    try {
      const citazioni = await query<{ sito_id: string; chiave: string; extra: unknown }>(
        `SELECT sito_id, chiave, extra FROM misure
          WHERE fonte = 'citazioni-llm' AND tipo_chiave = 'query'
            AND giorno >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          ORDER BY giorno DESC`
      )
      const viste = new Set<string>()
      for (const c of citazioni) {
        const k = `${c.sito_id}:${c.chiave}`
        if (viste.has(k)) continue
        viste.add(k)
        const extra = extraComeOggetto(c.extra)
        if (extra?.citato) continue
        const marche = Array.isArray(extra?.marche) ? extra.marche.filter((m) => typeof m === 'string') : []
        voci.push({
          livello: 'importante',
          sitoId: c.sito_id,
          nomeSito: nomeSito(c.sito_id),
          href: `/sito/${c.sito_id}?vista=note`,
          titolo: `Il modello non cita ${nomeSito(c.sito_id)}`,
          motivo:
            `Su «${c.chiave}» il modello del pannello non ha nominato il sito. E un campione, non l indice pubblico di ChatGPT. ` +
            `Marche citate: ${marche.join(', ') || 'nessuna'}.`,
          comeSaprai: 'Il cron citazioni ripete il sondaggio. Non e una scrittura sul sito.',
          guadagnoStimato: null,
          origine: 'azione',
        })
      }
    } catch {
      /* citazioni non ancora raccolte */
    }

    const urgenteTutte = voci.filter((v) => v.livello === 'urgente').sort((a, b) => priorita(b) - priorita(a))
    const importanteTutte = voci.filter((v) => v.livello === 'importante').sort((a, b) => priorita(b) - priorita(a))
    const mediaN = voci.filter((v) => v.livello === 'media').length
    const urgente = urgenteTutte.slice(0, MAX_HOME_URGENTE)
    const importante = importanteTutte.slice(0, MAX_HOME_IMPORTANTE)
    const nascoste = urgenteTutte.length - urgente.length + importanteTutte.length - importante.length + mediaN
    return { urgente, importante, nascoste, errore: null }
  } catch (e) {
    return { ...vuoto, errore: (e as Error).message }
  }
}

export async function lezioniRecenti(): Promise<Lezione[]> {
  try {
    const righe = await query<{
      sito_id: string
      bersaglio: string
      esito: 'migliorata' | 'peggiorata'
      clic_prima: number | null
      clic_dopo: number | null
    }>(
      `SELECT a.sito_id, a.bersaglio, v.esito, v.clic_prima, v.clic_dopo
         FROM verifiche v
         INNER JOIN azioni a ON a.id = v.azione_id
        WHERE v.esito IN ('migliorata','peggiorata')
        ORDER BY v.quando DESC
        LIMIT 12`
    )
    return righe.map((r) => {
      const prima = Number(r.clic_prima ?? 0)
      const dopo = Number(r.clic_dopo ?? 0)
      const testo =
        r.esito === 'migliorata'
          ? `Il titolo (o la modifica) su questa pagina ha alzato i clic da ${prima} a ${dopo} in due settimane. Il prossimo testo dello stesso tipo puo copiare questo schema.`
          : `Dopo la modifica i clic sono scesi da ${prima} a ${dopo}. Non ripetere questo schema su pagine simili; Annulla se e ancora in Storico.`
      return {
        sitoId: r.sito_id,
        nomeSito: nomeSito(r.sito_id),
        href: `/sito/${r.sito_id}?vista=storico`,
        bersaglio: r.bersaglio,
        esito: r.esito,
        testo,
      }
    })
  } catch {
    return []
  }
}
