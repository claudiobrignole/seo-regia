import { auth, type Identita } from './google'
import { query } from '@/lib/db'

/**
 * Lettura sola delle campagne. Brignole e Biography Library usano
 * token, numeri account e account di servizio distinti. Se manca una
 * chiave, si salta quel banco: l altro deve funzionare lo stesso.
 */

type BancoAds = {
  identita: Identita
  token?: string
  cliente?: string
  manager?: string
}

function banco(identita: Identita): BancoAds {
  if (identita === 'biography-library') {
    return {
      identita,
      token: process.env.BL_ADS_DEVELOPER_TOKEN,
      cliente: (process.env.BL_ADS_CUSTOMER_ID ?? '').replace(/-/g, ''),
      manager: (process.env.BL_ADS_MANAGER_ID ?? '').replace(/-/g, '') || undefined,
    }
  }
  return {
    identita,
    token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    cliente: (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, ''),
    manager: (process.env.GOOGLE_ADS_MANAGER_ID ?? '').replace(/-/g, '') || undefined,
  }
}

function versioneApi(): string {
  return process.env.GOOGLE_ADS_API_VERSION ?? 'v19'
}

async function gaql(b: BancoAds, sql: string): Promise<any[]> {
  if (!b.token || !b.cliente) {
    throw new Error(
      `Mancano il token o il numero account Ads per ${b.identita}. ` +
        `Vedi docs/istruzioni-tue.md, sezione Google Ads.`
    )
  }

  const client = await auth(b.identita).getClient()
  const tok = await client.getAccessToken()
  const access = typeof tok === 'string' ? tok : tok?.token
  if (!access) throw new Error(`Nessun gettone di accesso Google per ${b.identita}`)

  const url = `https://googleads.googleapis.com/${versioneApi()}/customers/${b.cliente}/googleAds:search`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'developer-token': b.token,
    'Content-Type': 'application/json',
  }
  if (b.manager) headers['login-customer-id'] = b.manager

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: sql }),
  })
  const corpo = await res.json()
  if (!res.ok) {
    const msg = corpo?.error?.message ?? JSON.stringify(corpo).slice(0, 400)
    throw new Error(`Google Ads ${b.identita}: ${res.status} ${msg}`)
  }
  return corpo.results ?? []
}

function microsAEuro(micros: string | number | undefined): number {
  const n = Number(micros ?? 0)
  return Number((n / 1_000_000).toFixed(2))
}

export async function raccogliAds(identita: Identita, da: string, a: string): Promise<number> {
  const b = banco(identita)
  if (!b.token || !b.cliente) {
    console.warn(`[ads] ${identita}: credenziali assenti, banco saltato`)
    return 0
  }

  const campagne = await gaql(
    b,
    `SELECT campaign.id, campaign.name, campaign.status, campaign_budget.amount_micros
     FROM campaign
     WHERE campaign.status != 'REMOVED'`
  )

  let n = 0
  for (const r of campagne) {
    const id = String(r.campaign?.id ?? '')
    if (!id) continue
    await query(
      `INSERT INTO campagne (identita, google_id, nome, stato, budget_giornaliero)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE nome=VALUES(nome), stato=VALUES(stato), budget_giornaliero=VALUES(budget_giornaliero)`,
      [
        identita,
        id,
        r.campaign?.name ?? id,
        r.campaign?.status ?? null,
        r.campaignBudget?.amountMicros ? microsAEuro(r.campaignBudget.amountMicros) : null,
      ]
    )
    n++
  }

  const giorni = await gaql(
    b,
    `SELECT campaign.id, segments.date, metrics.impressions, metrics.clicks,
            metrics.cost_micros, metrics.conversions, metrics.ctr, metrics.average_cpc
     FROM campaign
     WHERE segments.date BETWEEN '${da}' AND '${a}'`
  )

  for (const r of giorni) {
    const id = String(r.campaign?.id ?? '')
    const giorno = r.segments?.date
    if (!id || !giorno) continue
    await query(
      `INSERT INTO campagne_giorni
         (identita, campagna_google_id, giorno, impressioni, clic, costo, conversioni, ctr, cpc)
       VALUES (?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         impressioni=VALUES(impressioni), clic=VALUES(clic), costo=VALUES(costo),
         conversioni=VALUES(conversioni), ctr=VALUES(ctr), cpc=VALUES(cpc)`,
      [
        identita,
        id,
        giorno,
        Number(r.metrics?.impressions ?? 0),
        Number(r.metrics?.clicks ?? 0),
        microsAEuro(r.metrics?.costMicros),
        Number(r.metrics?.conversions ?? 0),
        r.metrics?.ctr ?? null,
        r.metrics?.averageCpc ? microsAEuro(r.metrics.averageCpc) : null,
      ]
    )
    n++
  }

  const parole = await gaql(
    b,
    `SELECT campaign.id, ad_group_criterion.keyword.text, segments.date,
            metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions
     FROM keyword_view
     WHERE segments.date BETWEEN '${da}' AND '${a}'
     AND ad_group_criterion.status != 'REMOVED'`
  )

  for (const r of parole) {
    const id = String(r.campaign?.id ?? '')
    const parola = r.adGroupCriterion?.keyword?.text
    const giorno = r.segments?.date
    if (!id || !parola || !giorno) continue
    await query(
      `INSERT INTO campagne_parole
         (identita, campagna_google_id, parola, giorno, impressioni, clic, costo, conversioni)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         impressioni=VALUES(impressioni), clic=VALUES(clic), costo=VALUES(costo),
         conversioni=VALUES(conversioni)`,
      [
        identita,
        id,
        String(parola).slice(0, 500),
        giorno,
        Number(r.metrics?.impressions ?? 0),
        Number(r.metrics?.clicks ?? 0),
        microsAEuro(r.metrics?.costMicros),
        Number(r.metrics?.conversions ?? 0),
      ]
    )
    n++
  }

  if (identita === 'biography-library') {
    await aggiornaGrants(identita, a)
  }

  return n
}

async function aggiornaGrants(identita: Identita, a: string) {
  const mese = a.slice(0, 7)
  const r = await query<{ clic: number; impressioni: number; conversioni: number }>(
    `SELECT COALESCE(SUM(clic),0) AS clic, COALESCE(SUM(impressioni),0) AS impressioni,
            COALESCE(SUM(conversioni),0) AS conversioni
       FROM campagne_giorni
      WHERE identita = ? AND giorno LIKE ?`,
    [identita, `${mese}%`]
  )
  const clic = Number(r[0]?.clic ?? 0)
  const impressioni = Number(r[0]?.impressioni ?? 0)
  const conversioni = Number(r[0]?.conversioni ?? 0)
  const ctr = impressioni ? clic / impressioni : null
  const avvisi: string[] = []
  if (ctr !== null && ctr < 0.05) {
    avvisi.push(
      `Tasso di clic ${(ctr * 100).toFixed(2)} per cento: il Grants chiede di restare sopra il cinque. Rivedi parole troppo generiche.`
    )
  }
  if (conversioni < 1 && Number(a.slice(8, 10)) >= 20) {
    avvisi.push('Manca ancora una conversione tracciata in questo mese: senza, Google puo sospendere il Grants.')
  }
  await query(
    `INSERT INTO adgrants_stato (mese, ctr, conversioni, conforme, avvisi)
     VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE ctr=VALUES(ctr), conversioni=VALUES(conversioni),
       conforme=VALUES(conforme), avvisi=VALUES(avvisi), aggiornato_il=NOW()`,
    [mese, ctr, conversioni, avvisi.length ? 0 : 1, JSON.stringify(avvisi)]
  )
}
