import { GoogleAuth } from 'google-auth-library'

/**
 * Due identita separate, due account di servizio distinti:
 * il perimetro Brignole e l associazione Biography Library non si mescolano mai.
 */
export type Identita = 'brignole' | 'biography-library'

const AMBITI = [
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/content',
  'https://www.googleapis.com/auth/adwords',
]

const cache = new Map<Identita, GoogleAuth>()

export function auth(identita: Identita): GoogleAuth {
  const esistente = cache.get(identita)
  if (esistente) return esistente

  const grezzo =
    identita === 'biography-library'
      ? process.env.BL_SERVICE_ACCOUNT_JSON
      : process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (!grezzo) {
    throw new Error(
      `Manca l account di servizio per l identita "${identita}". ` +
        `Riempi ${identita === 'biography-library' ? 'BL_SERVICE_ACCOUNT_JSON' : 'GOOGLE_SERVICE_ACCOUNT_JSON'} nelle variabili Hostinger (in locale: .env.local)`
    )
  }

  const credentials = JSON.parse(grezzo)
  const a = new GoogleAuth({ credentials, scopes: AMBITI })
  cache.set(identita, a)
  return a
}
