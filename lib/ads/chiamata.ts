import { auth, type Identita } from '@/lib/raccolta/google'

/**
 * Chiamate HTTP a Google Ads, una identita alla volta.
 * Brignole e Biography Library non condividono token ne numeri account.
 */

export type BancoAds = {
  identita: Identita
  token?: string
  cliente?: string
  manager?: string
}

export function banco(identita: Identita): BancoAds {
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

export function versioneApi(): string {
  // v19 e spenta: Google risponde con una pagina HTML, non JSON.
  return process.env.GOOGLE_ADS_API_VERSION ?? 'v23'
}

export function bancoPronto(b: BancoAds): boolean {
  return Boolean(b.token && b.cliente)
}

async function intestazioni(b: BancoAds, conManager: boolean): Promise<Record<string, string>> {
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
  const headers: Record<string, string> = {
    Authorization: `Bearer ${access}`,
    'developer-token': b.token,
    'Content-Type': 'application/json',
  }
  // login-customer-id solo se l account campagne sta sotto quel manager.
  // Su Brignole l email iam e invitata sull account 712-100-7160: mandare il
  // manager 150-466-0044 fa 403 USER_PERMISSION_DENIED anche con token buono.
  if (conManager && b.manager && b.manager !== b.cliente) {
    headers['login-customer-id'] = b.manager
  }
  return headers
}

function permessoNegatoComeSottoManager(json: unknown, testo: string): boolean {
  const blob = `${JSON.stringify(json ?? {})} ${testo}`
  return /USER_PERMISSION_DENIED|login-customer-id/i.test(blob)
}

/**
 * Il motivo vero sta in error.details, non in error.message: il messaggio in
 * cima dice sempre "The caller does not have permission" anche quando il
 * problema e il livello del token. Per mesi abbiamo cercato l invito sbagliato
 * per questo.
 */
function motivoAds(json: any): { codice: string; messaggio: string } {
  const errore = json?.error
  const dettaglio = errore?.details?.[0]?.errors?.[0]
  const codice = dettaglio?.errorCode ? Object.values(dettaglio.errorCode)[0] : undefined
  return {
    codice: String(codice ?? errore?.status ?? ''),
    messaggio: String(dettaglio?.message ?? errore?.message ?? '').replace(/\s+/g, ' '),
  }
}

/** Ogni errore Ads dice cosa fare, altrimenti resta un numero e basta. */
function cosaFareAds(identita: Identita, codice: string, messaggio: string, b: BancoAds): string {
  const quale = identita === 'brignole' ? 'Brignole' : 'Biography Library'
  if (/only approved for use with test accounts|ACTION_NOT_PERMITTED|DEVELOPER_TOKEN_NOT_APPROVED/i.test(`${codice} ${messaggio}`)) {
    return (
      `Il token per sviluppatori di ${quale} vale solo per account di prova. ` +
      `Entra nel Google Ads di ${quale}, Strumenti, Centro API, e chiedi l accesso Basic. ` +
      `Fino all approvazione questo banco non legge dati veri: e una attesa, non un errore da correggere nel codice.`
    )
  }
  if (/USER_PERMISSION_DENIED/i.test(codice)) {
    return (
      `L email del pannello non e fra gli utenti dell account ${b.cliente ?? '?'} di ${quale}. ` +
      `In Google Ads, Amministrazione, Accesso e sicurezza, invitala: sola lettura per Brignole, Standard per il Grants.`
    )
  }
  if (/CUSTOMER_NOT_ENABLED|CUSTOMER_NOT_FOUND/i.test(codice)) {
    return `L account ${b.cliente ?? '?'} risulta chiuso o inesistente. Controlla il numero nelle variabili di ${quale}.`
  }
  if (/NOT_ADS_USER/i.test(codice)) {
    return `L email del pannello non ha nessun account Google Ads collegato. Serve l invito dentro Google Ads di ${quale}.`
  }
  return `Guarda la riga Ads ${quale} nella pagina Impianto: dice quale invito o quale variabile manca.`
}

function erroreAds(identita: Identita, status: number, json: any, testo: string, b: BancoAds): Error {
  if (!json) {
    return new Error(
      `Google Ads ${identita}: risposta non JSON (HTTP ${status}). ` +
        `In Hostinger imposta GOOGLE_ADS_API_VERSION=v23, salva, riavvia, e riprova la raccolta. ` +
        testo.replace(/\s+/g, ' ').slice(0, 180)
    )
  }
  const { codice, messaggio } = motivoAds(json)
  const dove = codice ? ` ${codice}` : ''
  return new Error(
    `Google Ads ${identita}: HTTP ${status}${dove}. ${messaggio || 'nessun dettaglio'} ` +
      `Cosa fare: ${cosaFareAds(identita, codice, messaggio, b)}`
  )
}

/**
 * Una volta scoperto se quell account vuole login-customer-id, lo ricordiamo:
 * altrimenti ogni chiamata paga un 403 di prova, e la raccolta fa il doppio
 * delle richieste per niente. Si azzera al riavvio, che e quello che serve
 * quando cambiano le variabili.
 */
const conManagerServe = new Map<Identita, boolean>()

async function adsPostUna(
  b: BancoAds,
  percorso: string,
  corpo: unknown,
  conManager: boolean
): Promise<{ ok: true; json: any } | { ok: false; status: number; json: any; testo: string }> {
  const headers = await intestazioni(b, conManager)
  const url = `https://googleads.googleapis.com/${versioneApi()}/customers/${b.cliente}${percorso}`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(corpo),
  })
  const testo = await res.text()
  let json: any
  try {
    json = JSON.parse(testo)
  } catch {
    return { ok: false, status: res.status, json: null, testo }
  }
  if (!res.ok) return { ok: false, status: res.status, json, testo }
  return { ok: true, json }
}

/** percorso: ":uploadClickConversions" oppure "/conversionActions:mutate" */
export async function adsPost(identita: Identita, percorso: string, corpo: unknown): Promise<any> {
  const b = banco(identita)
  const ricordato = conManagerServe.get(identita)
  const primoTentativo = ricordato ?? true

  const prima = await adsPostUna(b, percorso, corpo, primoTentativo)
  if (prima.ok) {
    conManagerServe.set(identita, primoTentativo)
    return prima.json
  }
  // Un solo ritentativo, e solo se il primo giro aveva il manager in testa:
  // l account campagne puo non stare sotto quel manager pur essendo visibile.
  if (primoTentativo && b.manager && permessoNegatoComeSottoManager(prima.json, prima.testo)) {
    const seconda = await adsPostUna(b, percorso, corpo, false)
    if (seconda.ok) {
      conManagerServe.set(identita, false)
      return seconda.json
    }
    throw erroreAds(identita, seconda.status, seconda.json, seconda.testo, b)
  }
  throw erroreAds(identita, prima.status, prima.json, prima.testo, b)
}

export async function gaql(b: BancoAds, sql: string): Promise<any[]> {
  const corpo = await adsPost(b.identita, '/googleAds:search', { query: sql })
  return corpo.results ?? []
}
