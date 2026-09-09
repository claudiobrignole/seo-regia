/**
 * I siti del perimetro.
 * Aggiungere un sito significa aggiungere una voce qui, non toccare il codice.
 */

export type Piattaforma = 'wordpress' | 'node' | 'ecwid'

export type Sito = {
  /** identificatore interno, usato nel database e negli indirizzi del pannello */
  id: string
  nome: string
  dominio: string
  piattaforma: Piattaforma
  /** proprieta Search Console; null se lo statuto o il sito non la usano */
  searchConsole: string | null
  /** identificatore proprieta Analytics; null dove non misuriamo */
  analyticsProperty: string | null
  /** nomi host accettati in lettura: serve a scartare i dati falsi */
  hostnameValidi: string[]
  lingue: string[]
  /** true = le azioni sicure vengono applicate da sole */
  automazioneAttiva: boolean
  /** dove il pannello scrive */
  scrittura:
    | { tipo: 'wordpress'; base: string; prefissoCredenziali: string; seoPlugin?: 'rank-math' }
    | { tipo: 'github'; repo: string; ramoBase: string; fileDati: string }
    | { tipo: 'ecwid'; storeId: string }
    // Salvaguardia: un sito senza repository non si tocca, perche senza storico
    // non esiste annullamento. Oggi nessun sito lo usa.
    | { tipo: 'nessuna'; motivo: string }
  /** identita separata: usa il secondo account di servizio */
  identita: 'brignole' | 'biography-library'
  note?: string
}

export const SITI: Sito[] = [
  {
    id: 'aelle',
    nome: 'Aelle Hip Hop Magazine',
    dominio: 'aelle.hiphop',
    piattaforma: 'wordpress',
    searchConsole: 'sc-domain:aelle.hiphop',
    analyticsProperty: 'properties/547064912',
    hostnameValidi: ['aelle.hiphop', 'www.aelle.hiphop'],
    lingue: ['it', 'en'],
    automazioneAttiva: false,
    scrittura: { tipo: 'wordpress', base: 'https://aelle.hiphop', prefissoCredenziali: 'WP_AELLE', seoPlugin: 'rank-math' },
    identita: 'brignole',
    note: 'Archivio 1991-2001. Il negozio Ecwid e incorporato qui, con due sezioni: Aelle e Tag Tales.',
  },
  {
    id: 'aelle-store',
    nome: 'Aelle Store',
    dominio: 'aelle.hiphop',
    piattaforma: 'ecwid',
    searchConsole: 'sc-domain:aelle.hiphop',
    analyticsProperty: 'properties/547064912',
    hostnameValidi: ['aelle.hiphop', 'www.aelle.hiphop'],
    lingue: ['it', 'en'],
    automazioneAttiva: false,
    scrittura: { tipo: 'ecwid', storeId: '127192517' },
    identita: 'brignole',
    note: 'Unico negozio. 702 schede prodotto approvate nel Merchant Center 5717230535.',
  },
  {
    id: 'brignole',
    nome: 'Brignole',
    dominio: 'brignole.ch',
    piattaforma: 'wordpress',
    searchConsole: 'sc-domain:brignole.ch',
    analyticsProperty: 'properties/525716337',
    hostnameValidi: ['brignole.ch', 'www.brignole.ch'],
    lingue: ['it', 'en', 'fr', 'de'],
    automazioneAttiva: false,
    scrittura: { tipo: 'wordpress', base: 'https://brignole.ch', prefissoCredenziali: 'WP_BRIGNOLE', seoPlugin: 'rank-math' },
    identita: 'brignole',
    note: 'Primo sito su cui accendere automazione: e suo e un errore costa meno.',
  },
  {
    id: 'tagtales',
    nome: 'Tag Tales Gallery',
    dominio: 'tagtalesgallery.com',
    piattaforma: 'node',
    searchConsole: 'sc-domain:tagtalesgallery.com',
    analyticsProperty: 'properties/537337606',
    hostnameValidi: ['tagtalesgallery.com', 'www.tagtalesgallery.com'],
    lingue: ['it'],
    automazioneAttiva: false,
    scrittura: { tipo: 'github', repo: 'claudiobrignole/TagTales', ramoBase: 'main', fileDati: 'seo/contenuti.json' },
    identita: 'brignole',
    note: 'Sito della galleria: non vende, la vendita e dentro Aelle Store.',
  },
  {
    id: 'kizunama',
    nome: 'Kizunama',
    dominio: 'kizunama.com',
    piattaforma: 'node',
    searchConsole: 'sc-domain:kizunama.com',
    analyticsProperty: null,
    hostnameValidi: ['kizunama.com', 'www.kizunama.com'],
    lingue: ['it', 'en'],
    automazioneAttiva: false,
    scrittura: { tipo: 'github', repo: 'claudiobrignole/kizunama', ramoBase: 'main', fileDati: 'seo/contenuti.json' },
    identita: 'brignole',
  },
  {
    id: 'strangeglyph',
    nome: 'StrangeGlyph',
    dominio: 'strangeglyph.xyz',
    piattaforma: 'node',
    searchConsole: 'sc-domain:strangeglyph.xyz',
    analyticsProperty: null,
    hostnameValidi: ['strangeglyph.xyz', 'www.strangeglyph.xyz'],
    lingue: ['en'],
    automazioneAttiva: false,
    scrittura: { tipo: 'github', repo: 'claudiobrignole/strangeglyph', ramoBase: 'main', fileDati: 'seo/contenuti.json' },
    identita: 'brignole',
    note: 'Una pagina indicizzata, zero clic in tre mesi.',
  },
  {
    id: 'lunanihongo',
    nome: 'Luna Nihongo',
    dominio: 'lunanihongo.com',
    piattaforma: 'node',
    searchConsole: 'sc-domain:lunanihongo.com',
    analyticsProperty: 'properties/540151782',
    hostnameValidi: ['lunanihongo.com', 'www.lunanihongo.com'],
    lingue: ['it', 'ja'],
    automazioneAttiva: false,
    scrittura: { tipo: 'github', repo: 'claudiobrignole/luna-nihongo', ramoBase: 'main', fileDati: 'seo/contenuti.json' },
    identita: 'brignole',
    note: 'Pronto, non ancora promosso. Stesso ciclo SEO degli altri: prima i testi, poi i dati (all inizio saranno zero). Niente campagna a pagamento finche Claudio non la chiede.',
  },
  {
    id: 'biography-library',
    nome: 'Biography Library',
    dominio: 'biographylibrary.org',
    piattaforma: 'wordpress',
    searchConsole: 'sc-domain:biographylibrary.org',
    analyticsProperty: null,
    hostnameValidi: ['biographylibrary.org', 'www.biographylibrary.org'],
    lingue: ['en', 'de', 'fr', 'it'],
    automazioneAttiva: false,
    scrittura: { tipo: 'wordpress', base: 'https://biographylibrary.org', prefissoCredenziali: 'WP_BL' },
    identita: 'biography-library',
    note: 'Identita separata. Nessuno script di misura sul sito (niente Analytics, GTM, pixel). Search Console solo DNS. Conversioni Grants: plugin regia-bl-grants, upload notturno. robots.txt da rifare: oggi ha solo Crawl-delay e nessuna Sitemap.',
  },
  {
    id: 'biography-library-app',
    nome: 'Biography Library, applicazione',
    dominio: 'app.biographylibrary.org',
    piattaforma: 'node',
    searchConsole: 'sc-domain:biographylibrary.org',
    analyticsProperty: null,
    hostnameValidi: ['app.biographylibrary.org'],
    lingue: ['en', 'de', 'fr', 'it'],
    automazioneAttiva: false,
    scrittura: { tipo: 'github', repo: 'biographylibrary/Biography-Library', ramoBase: 'main', fileDati: 'seo/contenuti.json' },
    identita: 'biography-library',
    note: 'Biografie pubbliche. Niente Analytics. Search Console del dominio, verifica DNS. Gli annunci Grants atterrano su biographylibrary.org, non qui, finche Claudio non decide altrimenti.',
  },
]

export function sito(id: string): Sito {
  const s = SITI.find((x) => x.id === id)
  if (!s) throw new Error(`Sito sconosciuto: ${id}`)
  return s
}

export const SITI_ATTIVI = SITI.filter((s) => s.automazioneAttiva)
