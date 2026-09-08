/**
 * Accesso al pannello: una password, un cookie firmato, nessun servizio esterno.
 *
 * Il cookie non contiene la password ma una firma con scadenza, quindi
 * chi lo intercetta non impara il segreto e il biglietto scade da solo.
 * Usa Web Crypto perche deve funzionare anche nel middleware.
 */

const NOME_COOKIE = 'regia_sessione'
const DURATA_GIORNI = 30

function codificatore() {
  return new TextEncoder()
}

function base64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function firma(dati: string, segreto: string): Promise<string> {
  const chiave = await crypto.subtle.importKey(
    'raw',
    codificatore().encode(segreto),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return base64url(await crypto.subtle.sign('HMAC', chiave, codificatore().encode(dati)))
}

async function impronta(testo: string): Promise<string> {
  return base64url(await crypto.subtle.digest('SHA-256', codificatore().encode(testo)))
}

/** Confronto che non rivela quanti caratteri iniziali sono giusti. */
function ugualiSenzaFretta(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diverso = 0
  for (let i = 0; i < a.length; i++) diverso |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diverso === 0
}

function segreto(): string {
  const s = process.env.PANNELLO_PASSWORD
  if (!s || s.length < 12) {
    throw new Error(
      'PANNELLO_PASSWORD manca o e troppo corta (almeno 12 caratteri). ' +
        'Impostala nelle variabili d ambiente del pannello Hostinger.'
    )
  }
  return s
}

/** Vero se la password digitata e quella giusta. */
export async function passwordCorretta(digitata: string): Promise<boolean> {
  const attesa = await impronta(segreto())
  const ricevuta = await impronta(digitata)
  return ugualiSenzaFretta(attesa, ricevuta)
}

export async function creaBiglietto(): Promise<{ nome: string; valore: string; scadenzaSecondi: number }> {
  const scadenza = Date.now() + DURATA_GIORNI * 24 * 60 * 60 * 1000
  const corpo = String(scadenza)
  const valore = `${corpo}.${await firma(corpo, segreto())}`
  return { nome: NOME_COOKIE, valore, scadenzaSecondi: DURATA_GIORNI * 24 * 60 * 60 }
}

export async function biglietttoValido(valore: string | undefined): Promise<boolean> {
  if (!valore) return false
  const punto = valore.lastIndexOf('.')
  if (punto < 1) return false

  const corpo = valore.slice(0, punto)
  const firmaRicevuta = valore.slice(punto + 1)

  const scadenza = Number(corpo)
  if (!Number.isFinite(scadenza) || scadenza < Date.now()) return false

  try {
    return ugualiSenzaFretta(await firma(corpo, segreto()), firmaRicevuta)
  } catch {
    return false
  }
}

export const NOME_COOKIE_SESSIONE = NOME_COOKIE
