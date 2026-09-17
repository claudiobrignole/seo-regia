import { query, unaRiga } from '@/lib/db'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'

/**
 * Traduce i coverageState piu frequenti di Google in italiano leggibile.
 * Se non c e una corrispondenza, resta il testo originale.
 */
export function coperturaInItaliano(grezzo: string | null | undefined): string {
  if (!grezzo) return 'stato di copertura sconosciuto'
  const t = grezzo.trim()
  const mappa: Record<string, string> = {
    'Submitted and indexed': 'inviata e indicizzata',
    'Indexed, not submitted in sitemap': 'indicizzata, ma non e in sitemap',
    'Discovered - currently not indexed': 'scoperta, non ancora indicizzata',
    'Crawled - currently not indexed': 'letta da Google, non ancora indicizzata',
    'URL is unknown to Google': 'Google non conosce questo indirizzo',
    'Excluded by ‘noindex’ tag': 'esclusa dal meta noindex',
    "Excluded by 'noindex' tag": 'esclusa dal meta noindex',
    'Blocked by robots.txt': 'bloccata da robots.txt',
    'Not found (404)': 'non trovata (404)',
    'Page with redirect': 'pagina con reindirizzamento',
    'Soft 404': 'soft 404 (pagina vuota o di errore mascherata)',
    'Duplicate without user-selected canonical': 'duplicato senza canonical scelto da te',
    'Duplicate, Google chose different canonical than user':
      'duplicato: Google ha scelto un canonical diverso dal tuo',
    'Alternate page with proper canonical tag': 'pagina alternativa con canonical corretto',
    'Excluded by ‘noindex’ tag on page that is not a soft 404': 'esclusa dal noindex',
  }
  return mappa[t] ?? t
}

function haNoindex(testo: string | null | undefined): boolean {
  if (!testo) return false
  return /\bnoindex\b/i.test(testo)
}

async function indirizziSitemapDaTecnici(s: Sito): Promise<Set<string>> {
  const r = await unaRiga<{ corpo: string | null; e_xml: number }>(
    `SELECT corpo, e_xml FROM tecnici WHERE sito_id = ? AND tipo = 'sitemap' LIMIT 1`,
    [s.id]
  )
  const set = new Set<string>()
  if (!r?.corpo || !r.e_xml) return set
  for (const m of r.corpo.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const u = m[1].trim()
    if (u && !u.endsWith('.xml')) set.add(u)
  }
  return set
}

async function confrontoTreInsiemi(s: Sito): Promise<Proposta[]> {
  const inSitemap = await indirizziSitemapDaTecnici(s)
  const pagine = await query<{ url: string }>(
    `SELECT url FROM pagine WHERE sito_id = ? AND stato_http = 200`,
    [s.id]
  )
  const note = new Set(pagine.map((p) => p.url))
  const conImp = await query<{ chiave: string }>(
    `SELECT DISTINCT chiave FROM misure
      WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina'
        AND giorno >= DATE_SUB(CURDATE(), INTERVAL 28 DAY) AND impressioni > 0`,
    [s.id]
  )
  const viste = new Set(conImp.map((r) => r.chiave))

  const proposte: Proposta[] = []

  const inSitemapMaiViste = [...inSitemap].filter((u) => !viste.has(u)).slice(0, 8)
  if (inSitemapMaiViste.length) {
    proposte.push({
      regola: 'indicizzazione',
      bersaglio: 'in sitemap senza impressioni',
      campo: 'indicizzazione',
      valoreVecchio: null,
      valoreNuovo: inSitemapMaiViste.map((u) => `- ${u}`).join('\n'),
      motivo:
        `${inSitemapMaiViste.length} indirizzi sono in sitemap ma in 28 giorni non hanno avuto impressioni. ` +
        `O non sono indicizzati, o Google non li mostra ancora. Controlla la tabella Indicizzazione e, se serve, ` +
        `la nota urgente sulle pagine non indicizzate.`,
      guadagnoStimato: null,
      rischio: 'da_approvare',
    })
  }

  const conImpFuoriSitemap = [...viste].filter((u) => inSitemap.size && !inSitemap.has(u)).slice(0, 8)
  if (conImpFuoriSitemap.length) {
    proposte.push({
      regola: 'indicizzazione',
      bersaglio: 'con impressioni fuori sitemap',
      campo: 'indicizzazione',
      valoreVecchio: null,
      valoreNuovo: conImpFuoriSitemap.map((u) => `- ${u}`).join('\n'),
      motivo:
        `${conImpFuoriSitemap.length} pagine hanno impressioni ma non compaiono nella sitemap che il pannello legge. ` +
        `Aggiungile alla sitemap, oppure togli dalla Search Console se non devono farsi trovare.`,
      guadagnoStimato: null,
      rischio: 'da_approvare',
    })
  }

  const soloScansione = [...note]
    .filter((u) => !viste.has(u) && !inSitemap.has(u))
    .slice(0, 5)
  if (soloScansione.length) {
    proposte.push({
      regola: 'indicizzazione',
      bersaglio: 'solo nella scansione',
      campo: 'indicizzazione',
      valoreVecchio: null,
      valoreNuovo: soloScansione.map((u) => `- ${u}`).join('\n'),
      motivo:
        `${soloScansione.length} pagine sono note alla scansione ma non risultano in sitemap ne tra quelle con impressioni. ` +
        `Se devono farsi trovare, mettile in sitemap; se no, togli i link interni che le raggiungono.`,
      guadagnoStimato: null,
      rischio: 'da_approvare',
    })
  }

  return proposte
}

async function sentinellaCopertura(s: Sito): Promise<Proposta[]> {
  const settimane = await query<{ giorno: string; impressioni: number; clic: number; extra: any }>(
    `SELECT giorno, impressioni, clic, extra FROM misure
      WHERE sito_id = ? AND fonte = 'copertura' AND tipo_chiave = 'sito'
      ORDER BY giorno DESC LIMIT 4`,
    [s.id]
  )
  if (settimane.length < 2) return []

  const ultima = settimane[0]
  const precedenti = settimane.slice(1, 4)
  const mediaImp =
    precedenti.reduce((a, r) => a + Number(r.clic ?? 0), 0) / Math.max(precedenti.length, 1)
  const mediaInd =
    precedenti.reduce((a, r) => a + Number(r.impressioni ?? 0), 0) / Math.max(precedenti.length, 1)

  const pagineConImp = Number(ultima.clic ?? 0)
  const pagineInd = Number(ultima.impressioni ?? 0)
  const proposte: Proposta[] = []

  if (pagineConImp < 20) {
    if (pagineConImp === 0 && mediaImp > 0) {
      proposte.push({
        regola: 'indicizzazione',
        bersaglio: 'copertura settimanale',
        campo: 'indicizzazione',
        valoreVecchio: String(Math.round(mediaImp)),
        valoreNuovo: '0',
        motivo:
          `Questa settimana nessuna pagina di ${s.nome} ha avuto impressioni, mentre nelle settimane prima ce n erano. ` +
          `Controlla robots.txt, la proprieta Search Console e se il sito risponde.`,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      })
    }
  } else if (mediaImp > 0 && pagineConImp < mediaImp * 0.8) {
    const calo = Math.round((1 - pagineConImp / mediaImp) * 100)
    proposte.push({
      regola: 'indicizzazione',
      bersaglio: 'copertura settimanale',
      campo: 'indicizzazione',
      valoreVecchio: String(Math.round(mediaImp)),
      valoreNuovo: String(pagineConImp),
      motivo:
        `Le pagine con impressioni sono scese del ${calo} per cento rispetto alla media delle settimane prima ` +
        `(da ${Math.round(mediaImp)} a ${pagineConImp}). Apri il rapporto del lunedi e le note di indicizzazione.`,
      guadagnoStimato: null,
      rischio: 'da_approvare',
    })
  }

  if (mediaInd > 0 && pagineInd < mediaInd) {
    proposte.push({
      regola: 'indicizzazione',
      bersaglio: 'pagine indicizzate',
      campo: 'indicizzazione',
      valoreVecchio: String(Math.round(mediaInd)),
      valoreNuovo: String(pagineInd),
      motivo:
        `Le pagine indicizzate (verdetto PASS) sono scese da ${Math.round(mediaInd)} a ${pagineInd}. ` +
        `Guarda le note urgenti: noindex, canonical diversi, o pagine uscite dall indice.`,
      guadagnoStimato: null,
      rischio: 'da_approvare',
    })
  }

  return proposte
}

export const regolaIndicizzazione: Regola = {
  nome: 'indicizzazione',
  descrizione: 'Pagine non indicizzate, noindex, canonical diversi, sitemap e copertura',

  async esegui(s: Sito): Promise<Proposta[]> {
    if (!s.searchConsole) return []
    const proposte: Proposta[] = []

    // noindex su pagina in sitemap: il caso piu grave
    const noindex = await query<{ url: string; meta_robots: string | null; x_robots_tag: string | null }>(
      `SELECT p.url, p.meta_robots, p.x_robots_tag
         FROM pagine p
        WHERE p.sito_id = ? AND p.stato_http = 200
          AND (
            LOWER(COALESCE(p.meta_robots,'')) LIKE '%noindex%'
            OR LOWER(COALESCE(p.x_robots_tag,'')) LIKE '%noindex%'
          )
        LIMIT 40`,
      [s.id]
    )
    const sitemap = await indirizziSitemapDaTecnici(s)
    for (const p of noindex) {
      const dove = haNoindex(p.meta_robots)
        ? `meta robots "${p.meta_robots}"`
        : `intestazione X-Robots-Tag "${p.x_robots_tag}"`
      const inMap = sitemap.has(p.url)
      proposte.push({
        regola: 'indicizzazione',
        bersaglio: p.url,
        campo: 'indicizzazione',
        valoreVecchio: p.meta_robots || p.x_robots_tag,
        valoreNuovo: '',
        motivo: inMap
          ? `Questa pagina e in sitemap ma ha ${dove}: Google non la indicizza. Togli il noindex in WordPress ` +
            `(Rank Math o l editor) oppure toglila dalla sitemap se non deve farsi trovare.`
          : `Questa pagina ha ${dove}. Se deve farsi trovare, togli il noindex; se no, va bene cosi e puoi chiudere la nota.`,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      })
    }

    // Ispezione: non indicizzata, con impressioni o in sitemap
    const fallite = await query<{
      url: string
      verdetto: string | null
      copertura: string | null
      canonical_utente: string | null
      canonical_google: string | null
    }>(
      `SELECT url, verdetto, copertura, canonical_utente, canonical_google
         FROM indicizzazione
        WHERE sito_id = ? AND esito_chiamata = 'ok' AND verdetto IS NOT NULL AND verdetto <> 'PASS'
        LIMIT 80`,
      [s.id]
    )
    const conImp = new Set(
      (
        await query<{ chiave: string }>(
          `SELECT DISTINCT chiave FROM misure
            WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina'
              AND giorno >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) AND impressioni > 0`,
          [s.id]
        )
      ).map((r) => r.chiave)
    )

    for (const f of fallite) {
      const rilevante = conImp.has(f.url) || sitemap.has(f.url)
      if (!rilevante) continue
      const perche = coperturaInItaliano(f.copertura)
      proposte.push({
        regola: 'indicizzazione',
        bersaglio: f.url,
        campo: 'indicizzazione',
        valoreVecchio: f.verdetto,
        valoreNuovo: '',
        motivo:
          `Google dice che questa pagina non e (pienamente) indicizzata: ${perche}. ` +
          `Verdetto ${f.verdetto}. Controlla robots, noindex, canonical e se la pagina risponde 200.`,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      })

      if (
        f.canonical_utente &&
        f.canonical_google &&
        f.canonical_utente.replace(/\/$/, '') !== f.canonical_google.replace(/\/$/, '')
      ) {
        proposte.push({
          regola: 'indicizzazione',
          bersaglio: f.url,
          campo: 'indicizzazione',
          valoreVecchio: f.canonical_utente,
          valoreNuovo: f.canonical_google,
          motivo:
            `Il canonical che dichiari (${f.canonical_utente}) e diverso da quello che Google ha scelto ` +
            `(${f.canonical_google}). Su una pagina tradotta da TranslatePress succede spesso: controlla ` +
            `hreflang e canonical nell editor, senza cambiare il titolo dell originale dal pannello.`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      }
    }

    // Catene lunghe o che finiscono male
    const conCatena = await query<{ url: string; catena_redirect: any; stato_http: number | null; stato_http_primo: number | null }>(
      `SELECT url, catena_redirect, stato_http, stato_http_primo FROM pagine
        WHERE sito_id = ? AND catena_redirect IS NOT NULL
        LIMIT 200`,
      [s.id]
    )
    for (const p of conCatena) {
      let catena: { url: string; stato: number }[] = []
      try {
        catena = typeof p.catena_redirect === 'string' ? JSON.parse(p.catena_redirect) : p.catena_redirect
      } catch {
        continue
      }
      if (!Array.isArray(catena) || catena.length <= 1) continue
      if (catena.length > 3) {
        proposte.push({
          regola: 'indicizzazione',
          bersaglio: p.url,
          campo: 'indicizzazione',
          valoreVecchio: String(catena.length),
          valoreNuovo: '',
          motivo:
            `Questa pagina fa ${catena.length - 1} salti di reindirizzamento prima di arrivare. ` +
            `Accorcia la catena: ogni salto perde tempo di scansione e a volte ranking.`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      }
      const ultimo = catena[catena.length - 1]
      if (ultimo && (ultimo.stato >= 400 || (p.stato_http != null && p.stato_http >= 400))) {
        proposte.push({
          regola: 'indicizzazione',
          bersaglio: p.url,
          campo: 'indicizzazione',
          valoreVecchio: String(p.stato_http_primo ?? catena[0]?.stato),
          valoreNuovo: String(ultimo.stato),
          motivo:
            `La catena di reindirizzamenti finisce in errore HTTP ${ultimo.stato}. ` +
            `Sistema il rimando o togli l indirizzo dalla sitemap.`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      }
    }

    // In sitemap ma non 200
    if (sitemap.size) {
      const brutte = await query<{ url: string; stato_http: number }>(
        `SELECT url, stato_http FROM pagine
          WHERE sito_id = ? AND stato_http IS NOT NULL AND stato_http <> 200
          LIMIT 100`,
        [s.id]
      )
      for (const b of brutte) {
        if (!sitemap.has(b.url)) continue
        proposte.push({
          regola: 'indicizzazione',
          bersaglio: b.url,
          campo: 'indicizzazione',
          valoreVecchio: String(b.stato_http),
          valoreNuovo: '',
          motivo:
            `Questo indirizzo e in sitemap ma risponde ${b.stato_http}. ` +
            `Toglilo dalla sitemap oppure sistema la pagina finche non risponde 200.`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      }
    }

    // Sitemap non inviata o con errori
    const mappeGoogle = await query<{ url: string; errori: number; inviati: number | null }>(
      `SELECT url, errori, inviati FROM sitemap_stato WHERE sito_id = ?`,
      [s.id]
    )
    const urlsGoogle = new Set(mappeGoogle.map((m) => m.url))
    const tecnici = await unaRiga<{ url: string }>(
      `SELECT url FROM tecnici WHERE sito_id = ? AND tipo = 'sitemap' LIMIT 1`,
      [s.id]
    )
    if (tecnici?.url && ![...urlsGoogle].some((u) => u.includes(new URL(tecnici.url).pathname))) {
      proposte.push({
        regola: 'indicizzazione',
        bersaglio: tecnici.url,
        campo: 'indicizzazione',
        valoreVecchio: null,
        valoreNuovo: '',
        motivo:
          `Il pannello vede la sitemap ${tecnici.url}, ma in Search Console non risulta inviata. ` +
          `In Search Console, Sitemap, aggiungi quell indirizzo.`,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      })
    }
    for (const m of mappeGoogle) {
      if (Number(m.errori) > 0) {
        proposte.push({
          regola: 'indicizzazione',
          bersaglio: m.url,
          campo: 'indicizzazione',
          valoreVecchio: String(m.errori),
          valoreNuovo: '',
          motivo:
            `Search Console riporta ${m.errori} errori sulla sitemap ${m.url}. ` +
            `Apri Sitemap in Search Console e correggi gli indirizzi segnalati.`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      }
    }

    proposte.push(...(await confrontoTreInsiemi(s)))
    proposte.push(...(await sentinellaCopertura(s)))

    return proposte
  },
}
