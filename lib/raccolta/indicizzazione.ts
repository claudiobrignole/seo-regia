import { google } from 'googleapis'
import { auth } from './google'
import { query, unaRiga, salvaMisura } from '@/lib/db'
import { riempiCodaGenerica } from '@/lib/scansione/crawler'
import { SITI, type Sito } from '@/siti.config'

/**
 * Ispezione delle pagine in Search Console (URL Inspection) e stato delle sitemap
 * come le vede Google. Distinto da searchanalytics: quella conta le impressioni,
 * questa dice se Google ha la pagina e perche no.
 *
 * Quota: 2000/giorno e 600/minuto per proprieta. aelle e aelle-store condividono
 * https://aelle.hiphop/, quindi il tetto e per searchConsole, non per sito_id.
 */

const PAUSA_MS = 700
const MAX_PASSATA = 300
const MAX_GIORNO_PROPRIETA = 1500
const LIMITE_MS = 30_000

const attendi = (ms: number) => new Promise((r) => setTimeout(r, ms))

function api(s: Sito) {
  return google.searchconsole({ version: 'v1', auth: auth(s.identita) as any })
}

/** Tutti i siti del perimetro che usano la stessa proprieta Search Console. */
function sitiStessaProprieta(proprieta: string): string[] {
  return SITI.filter((x) => x.searchConsole === proprieta).map((x) => x.id)
}

async function ispezioniOggi(proprieta: string): Promise<number> {
  const ids = sitiStessaProprieta(proprieta)
  if (!ids.length) return 0
  const r = await unaRiga<{ n: number }>(
    `SELECT COUNT(*) AS n FROM indicizzazione
      WHERE sito_id IN (${ids.map(() => '?').join(',')})
        AND esito_chiamata = 'ok'
        AND DATE(aggiornato_il) = CURDATE()`,
    ids
  )
  return Number(r?.n ?? 0)
}

async function salvaRiga(
  s: Sito,
  url: string,
  campi: {
    verdetto?: string | null
    copertura?: string | null
    robotsGoogle?: string | null
    indicizzabile?: string | null
    canonicalUtente?: string | null
    canonicalGoogle?: string | null
    ultimaScansioneGoogle?: string | null
    sitemapReferente?: string | null
    esito: 'ok' | 'errore' | 'quota'
    messaggio?: string | null
  }
) {
  await query(
    `INSERT INTO indicizzazione
      (sito_id, url, verdetto, copertura, robots_google, indicizzabile,
       canonical_utente, canonical_google, ultima_scansione_google, sitemap_referente,
       esito_chiamata, messaggio)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       verdetto=VALUES(verdetto), copertura=VALUES(copertura),
       robots_google=VALUES(robots_google), indicizzabile=VALUES(indicizzabile),
       canonical_utente=VALUES(canonical_utente), canonical_google=VALUES(canonical_google),
       ultima_scansione_google=VALUES(ultima_scansione_google),
       sitemap_referente=VALUES(sitemap_referente),
       esito_chiamata=VALUES(esito_chiamata), messaggio=VALUES(messaggio),
       aggiornato_il=CURRENT_TIMESTAMP`,
    [
      s.id,
      url.slice(0, 760),
      campi.verdetto ?? null,
      campi.copertura ?? null,
      campi.robotsGoogle ?? null,
      campi.indicizzabile ?? null,
      campi.canonicalUtente?.slice(0, 760) ?? null,
      campi.canonicalGoogle?.slice(0, 760) ?? null,
      campi.ultimaScansioneGoogle ?? null,
      campi.sitemapReferente?.slice(0, 760) ?? null,
      campi.esito,
      campi.messaggio ?? null,
    ]
  )
}

function eQuota(e: unknown): boolean {
  const msg = (e as Error)?.message ?? String(e)
  const code = (e as { code?: number })?.code
  return code === 429 || /quota|rateLimitExceeded|Quota exceeded/i.test(msg)
}

/** Ispeziona una fetta della coda del sito. Ritorna quante chiamate ok. */
export async function ispezionaCoda(s: Sito): Promise<{ fatte: number; problemi: string[] }> {
  const problemi: string[] = []
  if (!s.searchConsole) {
    return { fatte: 0, problemi: [`${s.nome}: nessuna proprieta Search Console`] }
  }

  const gia = await ispezioniOggi(s.searchConsole)
  if (gia >= MAX_GIORNO_PROPRIETA) {
    return {
      fatte: 0,
      problemi: [
        `${s.nome}: tetto giornaliero della proprieta raggiunto (${gia}/${MAX_GIORNO_PROPRIETA}). Riprende domani.`,
      ],
    }
  }

  await riempiCodaGenerica('indicizzazione_coda', s, { prioritaSitemapSenzaImpressioni: 2000 })

  const sc = api(s)
  const inizio = Date.now()
  let fatte = 0
  let rimanenti = MAX_GIORNO_PROPRIETA - gia

  while (fatte < MAX_PASSATA && rimanenti > 0 && Date.now() - inizio < LIMITE_MS) {
    const prossima = await unaRiga<{ url: string }>(
      `SELECT url FROM indicizzazione_coda
        WHERE sito_id = ? AND stato = 'in_coda'
        ORDER BY priorita DESC LIMIT 1`,
      [s.id]
    )
    if (!prossima) break

    await query(`UPDATE indicizzazione_coda SET stato = 'fatta' WHERE sito_id = ? AND url = ?`, [
      s.id,
      prossima.url,
    ])

    try {
      const res = await sc.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: prossima.url,
          siteUrl: s.searchConsole,
        },
      })
      const st = res.data.inspectionResult?.indexStatusResult
      const sitemap = st?.sitemap?.[0] ?? null
      await salvaRiga(s, prossima.url, {
        verdetto: st?.verdict ?? null,
        copertura: st?.coverageState ?? null,
        robotsGoogle: st?.robotsTxtState ?? null,
        indicizzabile: st?.indexingState ?? null,
        canonicalUtente: st?.userCanonical ?? null,
        canonicalGoogle: st?.googleCanonical ?? null,
        ultimaScansioneGoogle: st?.lastCrawlTime ?? null,
        sitemapReferente: sitemap,
        esito: 'ok',
      })
      fatte++
      rimanenti--
    } catch (e) {
      if (eQuota(e)) {
        await salvaRiga(s, prossima.url, {
          esito: 'quota',
          messaggio: 'Quota Search Console esaurita per oggi. Riprende la notte dopo.',
        })
        problemi.push(`${s.nome}: quota esaurita dopo ${fatte} ispezioni`)
        break
      }
      await salvaRiga(s, prossima.url, {
        esito: 'errore',
        messaggio: ((e as Error).message || String(e)).slice(0, 500),
      })
      problemi.push(`${prossima.url}: ${(e as Error).message}`)
    }

    await attendi(PAUSA_MS)
  }

  const ancora = await unaRiga<{ n: number }>(
    `SELECT COUNT(*) AS n FROM indicizzazione_coda WHERE sito_id = ? AND stato = 'in_coda'`,
    [s.id]
  )
  if (Number(ancora?.n ?? 0) === 0) {
    await query(`DELETE FROM indicizzazione_coda WHERE sito_id = ?`, [s.id])
  }

  return { fatte, problemi }
}

/** Elenca le sitemap in Search Console e ne salva lo stato. */
export async function aggiornaSitemapGoogle(s: Sito): Promise<{ fatte: number; problemi: string[] }> {
  const problemi: string[] = []
  if (!s.searchConsole) return { fatte: 0, problemi: [`${s.nome}: nessuna proprieta Search Console`] }

  const sc = api(s)
  let fatte = 0
  try {
    const elenco = await sc.sitemaps.list({ siteUrl: s.searchConsole })
    const voci = elenco.data.sitemap ?? []
    for (const voce of voci) {
      const path = voce.path
      if (!path) continue
      let errori = Number(voce.errors ?? 0)
      let avvisi = Number(voce.warnings ?? 0)
      let inviati: number | null = voce.contents?.[0]?.submitted
        ? Number(voce.contents[0].submitted)
        : null
      let ultima: string | null = voce.lastDownloaded ?? voce.lastSubmitted ?? null
      let inSospeso = Boolean(voce.isPending)

      try {
        const dettaglio = await sc.sitemaps.get({ siteUrl: s.searchConsole, feedpath: path })
        const d = dettaglio.data
        errori = Number(d.errors ?? errori)
        avvisi = Number(d.warnings ?? avvisi)
        inviati = d.contents?.[0]?.submitted != null ? Number(d.contents[0].submitted) : inviati
        ultima = d.lastDownloaded ?? d.lastSubmitted ?? ultima
        inSospeso = Boolean(d.isPending)
      } catch {
        /* list basta: get a volte fallisce su indici */
      }

      await query(
        `INSERT INTO sitemap_stato
          (sito_id, url, ultima_lettura, inviati, errori, avvisi, in_sospeso)
         VALUES (?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           ultima_lettura=VALUES(ultima_lettura), inviati=VALUES(inviati),
           errori=VALUES(errori), avvisi=VALUES(avvisi), in_sospeso=VALUES(in_sospeso),
           aggiornato_il=CURRENT_TIMESTAMP`,
        [s.id, path.slice(0, 760), ultima, inviati, errori, avvisi, inSospeso ? 1 : 0]
      )
      fatte++
    }
  } catch (e) {
    if (eQuota(e)) {
      problemi.push(`${s.nome}: quota sulle sitemap, riprende dopo`)
    } else {
      problemi.push(`${s.nome} sitemap: ${(e as Error).message}`)
    }
  }
  return { fatte, problemi }
}

/**
 * Riga settimanale di copertura in misure (fonte copertura).
 * Impressioni = pagine indicizzate (PASS). Extra = gli altri conteggi.
 */
export async function salvaCoperturaSettimanale(s: Sito): Promise<void> {
  const lunedi = await unaRiga<{ g: string }>(
    `SELECT DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AS g`
  )
  const giorno = lunedi?.g ?? new Date().toISOString().slice(0, 10)

  const conImpressioni = await unaRiga<{ n: number }>(
    `SELECT COUNT(DISTINCT chiave) AS n FROM misure
      WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina'
        AND giorno >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND impressioni > 0`,
    [s.id]
  )
  const indicizzate = await unaRiga<{ n: number }>(
    `SELECT COUNT(*) AS n FROM indicizzazione
      WHERE sito_id = ? AND esito_chiamata = 'ok' AND verdetto = 'PASS'`,
    [s.id]
  )
  const nonIndicizzate = await unaRiga<{ n: number }>(
    `SELECT COUNT(*) AS n FROM indicizzazione
      WHERE sito_id = ? AND esito_chiamata = 'ok' AND verdetto IN ('FAIL','PARTIAL','NEUTRAL')`,
    [s.id]
  )
  const inSitemap = await unaRiga<{ n: number }>(
    `SELECT COALESCE(SUM(inviati), 0) AS n FROM sitemap_stato WHERE sito_id = ?`,
    [s.id]
  )
  const motivi = await query<{ copertura: string; n: number }>(
    `SELECT copertura, COUNT(*) AS n FROM indicizzazione
      WHERE sito_id = ? AND esito_chiamata = 'ok' AND verdetto <> 'PASS'
        AND copertura IS NOT NULL AND TRIM(copertura) <> ''
      GROUP BY copertura ORDER BY n DESC LIMIT 3`,
    [s.id]
  )

  await salvaMisura({
    sitoId: s.id,
    fonte: 'copertura',
    giorno,
    chiave: s.dominio,
    tipoChiave: 'sito',
    impressioni: Number(indicizzate?.n ?? 0),
    clic: Number(conImpressioni?.n ?? 0),
    extra: {
      pagine_con_impressioni: Number(conImpressioni?.n ?? 0),
      pagine_indicizzate: Number(indicizzate?.n ?? 0),
      pagine_non_indicizzate: Number(nonIndicizzate?.n ?? 0),
      pagine_in_sitemap: Number(inSitemap?.n ?? 0),
      motivi: motivi.map((m) => ({ testo: m.copertura, quante: Number(m.n) })),
    },
  })
}

export function eLunediUtc(): boolean {
  return new Date().getUTCDay() === 1
}
