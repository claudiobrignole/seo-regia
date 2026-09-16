import { iniziaEsecuzione, chiudiEsecuzione, query, unaRiga } from '@/lib/db'
import { raccogliRicerca, raccogliAI } from '@/lib/raccolta/search-console'
import { raccogliComportamento } from '@/lib/raccolta/analytics'
import { raccogliVendite } from '@/lib/raccolta/ecwid'
import { raccogliAds } from '@/lib/raccolta/ads'
import { caricaConversioniGrants } from '@/lib/ads/carica-conversioni'
import { raccogliCrux } from '@/lib/raccolta/crux'
import { raccogliMerchant } from '@/lib/raccolta/merchant'
import { raccogliCitazioni } from '@/lib/raccolta/citazioni'
import { sitiPerSearchConsole, sitiPerAnalytics, sitiPerEcwid } from '@/lib/raccolta/perimetro'
import { giornoIso } from '@/lib/date'
import { scansiona } from '@/lib/scansione/crawler'
import { REGOLE } from '@/lib/regole'
import { proponi, aggiornaValoreNuovo, type Azione } from '@/lib/registro'
import { compoTesto } from '@/lib/regole/testi'
import { compoIstruzione } from '@/lib/regole/lacune'
import type { Proposta } from '@/lib/regole/tipi'
import { generaBozzeMancanti } from '@/lib/ads/bozza'
import { emettiVerdetti } from '@/lib/ads/verdetto'
import { chiudiProposteArchivio, propostaIntoccabile } from '@/lib/siti/archivio-aelle'
import { chiudiProposteImpossibili, motivoNonScrivibile } from '@/lib/siti/indirizzi'
import { eseguiESalva } from '@/lib/impianto'
import { SITI, sito } from '@/siti.config'

/**
 * I lavori del ciclo, come funzioni.
 *
 * Stanno qui e non dentro le rotte perche vanno lanciati da due strade:
 * la sveglia notturna (`/api/cron/...`, con chiave) e il pulsante Lancia
 * adesso del pannello (`/api/lavori/esegui`, con la sessione). Un lavoro che
 * si puo lanciare solo di notte non si puo provare, e cosi non si sa se gira.
 */

export type NomeLavoro = 'raccolta' | 'scansione' | 'diagnosi' | 'verifica' | 'impianto' | 'citazioni'

export type EsitoLavoro = {
  lavoro: NomeLavoro
  /** conteggio principale: righe, pagine, proposte, controlli */
  righe: number
  problemi: string[]
  /** una frase in italiano che Claudio possa leggere senza tradurla */
  riassunto: string
  extra?: Record<string, unknown>
}

export const LAVORI: {
  nome: NomeLavoro
  titolo: string
  spiegazione: string
  /** ora attesa della sveglia, in UTC, per confrontarla con l ultima riuscita */
  quando: string
  /** ogni quante ore ci aspettiamo che giri: oltre, il pannello avvisa */
  ogniOre: number
  perSito: boolean
}[] = [
  {
    nome: 'raccolta',
    titolo: 'Raccolta',
    spiegazione:
      'Legge Search Console, Analytics, Ecwid e le due pubblicita. Non cambia niente sui siti: porta i numeri nel pannello.',
    quando: 'ogni giorno 3:00 UTC',
    ogniOre: 30,
    perSito: false,
  },
  {
    nome: 'scansione',
    titolo: 'Scansione',
    spiegazione:
      'Legge le pagine di un sito una per una, con pausa. Un sito per notte: tutti insieme non stanno nel tempo concesso.',
    quando: 'ogni giorno 3:30 UTC, un sito per giorno',
    ogniOre: 30,
    perSito: true,
  },
  {
    nome: 'diagnosi',
    titolo: 'Diagnosi',
    spiegazione:
      'Applica le regole ai dati raccolti e mette le proposte in coda. Riempie prima le schede rimaste vuote, poi ne crea di nuove.',
    quando: 'ogni giorno 4:30 UTC',
    ogniOre: 30,
    perSito: true,
  },
  {
    nome: 'impianto',
    titolo: 'Controllo impianto',
    spiegazione:
      'Prova se Google, WordPress, GitHub, Ecwid e il database rispondono. I risultati stanno nella pagina Impianto.',
    quando: 'ogni giorno 5:15 UTC',
    ogniOre: 30,
    perSito: false,
  },
  {
    nome: 'verifica',
    titolo: 'Verifica a 14 giorni',
    spiegazione:
      'Guarda se le modifiche applicate due settimane prima hanno spostato i clic. Zero e un risultato giusto quando non ci sono modifiche vecchie.',
    quando: 'lunedi 5:00 UTC',
    ogniOre: 8 * 24,
    perSito: false,
  },
  {
    nome: 'citazioni',
    titolo: 'Citazioni (opzionale)',
    spiegazione:
      'Chiede a Claude se cita i siti. E un campione, non l indice pubblico di ChatGPT. Costa gettoni: si puo lasciare spento.',
    quando: 'ogni giorno 5:30 UTC',
    ogniOre: 30,
    perSito: true,
  },
]

function frase(n: number, singolare: string, plurale: string): string {
  return `${n} ${n === 1 ? singolare : plurale}`
}

function chiudi(problemi: string[]): 'ok' | 'parziale' {
  return problemi.length ? 'parziale' : 'ok'
}

/**
 * Un solo motivo per volta nel messaggio salvato: Ads e le conversioni Grants
 * falliscono per la stessa ragione, e leggere due volte la stessa spiegazione
 * fa sembrare che i problemi siano due.
 */
function messaggio(problemi: string[]): string | undefined {
  const unici = [...new Set(problemi)]
  return unici.join(' / ') || undefined
}

export async function eseguiRaccolta(): Promise<EsitoLavoro> {
  const esecuzione = await iniziaEsecuzione('raccolta')
  // La Search Console pubblica i dati con due o tre giorni di ritardo.
  const a = giornoIso(-3)
  const da = giornoIso(-30)
  let righe = 0
  const problemi: string[] = []

  for (const s of sitiPerSearchConsole()) {
    try {
      righe += await raccogliRicerca(s, da, a)
      righe += await raccogliAI(s, da, a)
    } catch (e) {
      problemi.push(`search-console/${s.id}: ${(e as Error).message}`)
    }
  }

  for (const s of sitiPerAnalytics()) {
    try {
      righe += await raccogliComportamento(s, da, a)
    } catch (e) {
      problemi.push(`analytics/${s.id}: ${(e as Error).message}`)
    }
  }

  for (const s of sitiPerEcwid()) {
    try {
      righe += await raccogliVendite(s.id, da, a)
    } catch (e) {
      problemi.push(`ecwid/${s.id}: ${(e as Error).message}`)
    }
  }

  for (const identita of ['brignole', 'biography-library'] as const) {
    try {
      righe += await raccogliAds(identita, da, a)
    } catch (e) {
      problemi.push(`ads/${identita}: ${(e as Error).message}`)
    }
  }

  try {
    righe += await caricaConversioniGrants()
  } catch (e) {
    problemi.push(`grants-conversioni: ${(e as Error).message}`)
  }

  try {
    righe += await raccogliCrux()
  } catch (e) {
    problemi.push(`crux: ${(e as Error).message}`)
  }

  try {
    righe += await raccogliMerchant()
  } catch (e) {
    problemi.push(`merchant: ${(e as Error).message}`)
  }

  await chiudiEsecuzione(esecuzione, chiudi(problemi), righe, messaggio(problemi))
  return {
    lavoro: 'raccolta',
    righe,
    problemi,
    riassunto: `${frase(righe, 'misura salvata', 'misure salvate')} dal ${da} al ${a}`,
    extra: { finestra: { da, a } },
  }
}

/** Un sito per volta: senza indicazione, quello del giorno. */
export function sitoDelGiorno(): string {
  return SITI[new Date().getUTCDay() % SITI.length].id
}

export async function eseguiScansione(sitoId?: string | null): Promise<EsitoLavoro> {
  const scelto = sitoId ? sito(sitoId) : sito(sitoDelGiorno())
  const esecuzione = await iniziaEsecuzione('scansione')
  let pagine = 0
  const problemi: string[] = []
  try {
    pagine += await scansiona(scelto)
  } catch (e) {
    problemi.push(`${scelto.id}: ${(e as Error).message}`)
  }
  await chiudiEsecuzione(esecuzione, chiudi(problemi), pagine, messaggio(problemi))
  return {
    lavoro: 'scansione',
    righe: pagine,
    problemi,
    riassunto: `${scelto.nome}: ${frase(pagine, 'pagina letta', 'pagine lette')}`,
    extra: { sito: scelto.id },
  }
}

const CAMPI_TESTO = new Set(['titolo', 'descrizione', 'seo_prodotto'])
const LIMITE_MS = 40_000
const MAX_TESTI = 6
const MAX_ISTRUZIONI = 2

export async function eseguiDiagnosi(sitoId?: string | null): Promise<EsitoLavoro> {
  let elenco = sitoId ? [sito(sitoId)] : [...SITI]
  if (!sitoId && elenco.length) {
    const scarto = new Date().getUTCDay() % elenco.length
    elenco = [...elenco.slice(scarto), ...elenco.slice(0, scarto)]
  }

  const esecuzione = await iniziaEsecuzione('diagnosi')
  let proposte = 0
  let testiFatti = 0
  let istruzioniFatte = 0
  const problemi: string[] = []
  const inizio = Date.now()

  try {
    const chiuse = await chiudiProposteArchivio()
    if (chiuse) {
      // Non e un errore: i titoli originali non devono stare in coda.
      console.info(`[diagnosi] archivio Aelle: chiuse ${chiuse} proposte`)
    }
  } catch (e) {
    problemi.push(`archivio Aelle: ${(e as Error).message}`)
  }

  try {
    // Schede su indirizzi che non hanno un titolo da cambiare: schede del
    // negozio, pagine tradotte, file caricati. Restavano in coda e si scopriva
    // premendo Approva, una per volta.
    const chiuse = await chiudiProposteImpossibili()
    if (chiuse) console.info(`[diagnosi] chiuse ${chiuse} schede su indirizzi non scrivibili`)
  } catch (e) {
    problemi.push(`indirizzi non scrivibili: ${(e as Error).message}`)
  }

  const daRiempire = await query<Azione>(
    `SELECT * FROM azioni
      WHERE stato IN ('proposta','approvata','fallita')
        AND campo IN ('titolo','descrizione')
        AND (valore_nuovo IS NULL OR TRIM(valore_nuovo) = '')
      ORDER BY COALESCE(guadagno_stimato, 0) DESC, id ASC
      LIMIT ${MAX_TESTI}`
  )
  for (const a of daRiempire) {
    if (testiFatti >= MAX_TESTI || Date.now() - inizio > LIMITE_MS) break
    if (await propostaIntoccabile(a.sito_id, a.bersaglio, a.campo)) continue
    if (motivoNonScrivibile(sito(a.sito_id), a.bersaglio, a.campo)) continue
    try {
      const s = sito(a.sito_id)
      const testo = await compoTesto(s, {
        regola: a.regola,
        bersaglio: a.bersaglio,
        campo: a.campo as Proposta['campo'],
        valoreVecchio: a.valore_vecchio,
        valoreNuovo: '',
        motivo: a.motivo,
        guadagnoStimato: a.guadagno_stimato,
        rischio: a.rischio,
      })
      await aggiornaValoreNuovo(a.id, testo)
      testiFatti++
    } catch (e) {
      problemi.push(`testi/${a.sito_id}/${a.id}: ${(e as Error).message}`)
    }
  }

  ciclo: for (const s of elenco) {
    if (Date.now() - inizio > LIMITE_MS) {
      problemi.push('ripresa: tempo esaurito, il resto la notte dopo')
      break
    }
    for (const regola of REGOLE) {
      if (Date.now() - inizio > LIMITE_MS) {
        problemi.push('ripresa: tempo esaurito, il resto la notte dopo')
        break ciclo
      }
      try {
        for (const p of await regola.esegui(s)) {
          if (await propostaIntoccabile(s.id, p.bersaglio, p.campo)) continue
          if (motivoNonScrivibile(s, p.bersaglio, p.campo)) continue
          if (CAMPI_TESTO.has(p.campo) && !(p.valoreNuovo ?? '').trim()) {
            const gia = await unaRiga<{ valore_nuovo: string }>(
              `SELECT valore_nuovo FROM azioni
                WHERE sito_id = ? AND bersaglio = ? AND campo = ?
                  AND stato IN ('proposta','approvata','fallita','applicata','rifiutata')
                LIMIT 1`,
              [s.id, p.bersaglio, p.campo]
            )
            if ((gia?.valore_nuovo ?? '').trim()) {
              p.valoreNuovo = gia!.valore_nuovo
            } else if (testiFatti < MAX_TESTI && Date.now() - inizio < LIMITE_MS) {
              try {
                p.valoreNuovo = await compoTesto(s, p)
                testiFatti++
              } catch (e) {
                problemi.push(`testi/${s.id}/${regola.nome}: ${(e as Error).message}`)
              }
            }
          }
          if (p.campo === 'istruzione' && !(p.valoreNuovo ?? '').trim()) {
            if (istruzioniFatte < MAX_ISTRUZIONI && testiFatti < MAX_TESTI && Date.now() - inizio < LIMITE_MS) {
              try {
                p.valoreNuovo = await compoIstruzione(s, p)
                istruzioniFatte++
                testiFatti++
              } catch (e) {
                problemi.push(`istruzioni/${s.id}: ${(e as Error).message}`)
              }
            }
          }
          await proponi({
            sito_id: s.id,
            regola: p.regola,
            bersaglio: p.bersaglio,
            campo: p.campo,
            valore_vecchio: p.valoreVecchio,
            valore_nuovo: p.valoreNuovo,
            motivo: p.motivo,
            guadagno_stimato: p.guadagnoStimato,
            rischio:
              s.automazioneAttiva && s.scrittura.tipo !== 'nessuna' && (p.valoreNuovo ?? '').trim()
                ? p.rischio
                : 'da_approvare',
          })
          proposte++
        }
      } catch (e) {
        problemi.push(`${s.id}/${regola.nome}: ${(e as Error).message}`)
      }
    }
  }

  if (Date.now() - inizio < LIMITE_MS) {
    try {
      proposte += await generaBozzeMancanti()
    } catch (e) {
      problemi.push(`bozze-ads: ${(e as Error).message}`)
    }
  }
  if (Date.now() - inizio < LIMITE_MS) {
    try {
      await emettiVerdetti()
    } catch (e) {
      problemi.push(`verdetti-ads: ${(e as Error).message}`)
    }
  }

  await chiudiEsecuzione(esecuzione, chiudi(problemi), proposte, messaggio(problemi))
  return {
    lavoro: 'diagnosi',
    righe: proposte,
    problemi,
    riassunto: `${frase(proposte, 'scheda in coda', 'schede in coda')}, ${frase(testiFatti, 'testo scritto', 'testi scritti')} da Claude`,
  }
}

export async function eseguiVerificaAzioni(): Promise<EsitoLavoro> {
  const esecuzione = await iniziaEsecuzione('verifica')
  const problemi: string[] = []
  let fatte = 0
  try {
    const daVerificare = await query<{ id: number; sito_id: string; bersaglio: string; applicata_il: string }>(
      `SELECT a.id, a.sito_id, a.bersaglio, a.applicata_il
         FROM azioni a
         LEFT JOIN verifiche v ON v.azione_id = a.id AND v.giorni = 14
        WHERE a.stato = 'applicata'
          AND a.applicata_il <= DATE_SUB(NOW(), INTERVAL 14 DAY)
          AND v.id IS NULL
        LIMIT 50`
    )

    for (const a of daVerificare) {
      const prima = await query<{ clic: number; impressioni: number }>(
        `SELECT SUM(clic) AS clic, SUM(impressioni) AS impressioni FROM misure
          WHERE sito_id = ? AND chiave = ? AND fonte = 'search-console'
            AND giorno BETWEEN DATE_SUB(?, INTERVAL 14 DAY) AND ?`,
        [a.sito_id, a.bersaglio, a.applicata_il, a.applicata_il]
      )
      const dopo = await query<{ clic: number; impressioni: number }>(
        `SELECT SUM(clic) AS clic, SUM(impressioni) AS impressioni FROM misure
          WHERE sito_id = ? AND chiave = ? AND fonte = 'search-console'
            AND giorno BETWEEN ? AND DATE_ADD(?, INTERVAL 14 DAY)`,
        [a.sito_id, a.bersaglio, a.applicata_il, a.applicata_il]
      )

      const cp = Number(prima[0]?.clic ?? 0)
      const cd = Number(dopo[0]?.clic ?? 0)
      const ip = Number(prima[0]?.impressioni ?? 0)
      const id2 = Number(dopo[0]?.impressioni ?? 0)

      const ctrP = ip ? cp / ip : null
      const ctrD = id2 ? cd / id2 : null

      let esito: 'migliorata' | 'invariata' | 'peggiorata' | 'dati_insufficienti' = 'dati_insufficienti'
      if (ctrP !== null && ctrD !== null && ip > 100 && id2 > 100) {
        const delta = (ctrD - ctrP) / Math.max(ctrP, 0.0001)
        esito = delta > 0.15 ? 'migliorata' : delta < -0.15 ? 'peggiorata' : 'invariata'
      }

      await query(
        `INSERT INTO verifiche (azione_id, giorni, clic_prima, clic_dopo, ctr_prima, ctr_dopo, esito)
         VALUES (?,14,?,?,?,?,?)`,
        [a.id, cp, cd, ctrP, ctrD, esito]
      )
      fatte++
    }
  } catch (e) {
    problemi.push((e as Error).message)
  }

  await chiudiEsecuzione(esecuzione, chiudi(problemi), fatte, messaggio(problemi))
  return {
    lavoro: 'verifica',
    righe: fatte,
    problemi,
    riassunto: fatte
      ? `${frase(fatte, 'modifica controllata', 'modifiche controllate')} a quattordici giorni`
      : 'Nessuna modifica ha ancora quattordici giorni: zero e il risultato giusto',
  }
}

export async function eseguiImpianto(): Promise<EsitoLavoro> {
  const esecuzione = await iniziaEsecuzione('impianto')
  try {
    const { controlli } = await eseguiESalva()
    const falliti = controlli.filter((c) => c.esito === 'fallito')
    const nAtteso = controlli.filter((c) => c.esito === 'atteso').length
    const nOk = controlli.filter((c) => c.esito === 'ok').length
    const problemi = falliti.map((c) => `${c.codice} ${c.titolo}: ${c.dettaglio}`)
    await chiudiEsecuzione(
      esecuzione,
      chiudi(problemi),
      controlli.length,
      messaggio(problemi) ?? `ok ${nOk}, attesi ${nAtteso}`
    )
    return {
      lavoro: 'impianto',
      righe: controlli.length,
      problemi,
      riassunto: `${nOk} ok, ${falliti.length} da correggere, ${nAtteso} attesi`,
      extra: {
        falliti: falliti.map((c) => ({
          codice: c.codice,
          titolo: c.titolo,
          dettaglio: c.dettaglio,
          cosaFare: c.cosaFare,
        })),
      },
    }
  } catch (e) {
    const messaggio = (e as Error).message
    await chiudiEsecuzione(esecuzione, 'errore', 0, messaggio)
    throw e
  }
}

export async function eseguiCitazioni(sitoId?: string | null): Promise<EsitoLavoro> {
  const esecuzione = await iniziaEsecuzione('citazioni')
  const elenco = sitoId ? [sito(sitoId)] : [...SITI]
  let righe = 0
  const problemi: string[] = []
  const inizio = Date.now()

  for (const s of elenco) {
    if (Date.now() - inizio > 45_000) {
      problemi.push('ripresa: tempo esaurito, il resto la notte dopo')
      break
    }
    try {
      righe += await raccogliCitazioni(s)
    } catch (e) {
      problemi.push(`${s.id}: ${(e as Error).message}`)
    }
  }

  await chiudiEsecuzione(
    esecuzione,
    chiudi(problemi),
    righe,
    messaggio(problemi) ?? 'Campione dei modelli del pannello, non l indice pubblico di ChatGPT.'
  )
  return {
    lavoro: 'citazioni',
    righe,
    problemi,
    riassunto: `${frase(righe, 'risposta registrata', 'risposte registrate')}`,
  }
}

export async function eseguiLavoro(nome: NomeLavoro, sitoId?: string | null): Promise<EsitoLavoro> {
  switch (nome) {
    case 'raccolta':
      return eseguiRaccolta()
    case 'scansione':
      return eseguiScansione(sitoId)
    case 'diagnosi':
      return eseguiDiagnosi(sitoId)
    case 'verifica':
      return eseguiVerificaAzioni()
    case 'impianto':
      return eseguiImpianto()
    case 'citazioni':
      return eseguiCitazioni(sitoId)
    default:
      throw new Error(`Lavoro sconosciuto: ${nome}`)
  }
}
