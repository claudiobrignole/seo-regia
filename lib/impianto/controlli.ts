import { google } from 'googleapis'
import { query, unaRiga } from '@/lib/db'
import { SITI } from '@/siti.config'
import { auth, type Identita } from '@/lib/raccolta/google'
import { banco, bancoPronto, gaql } from '@/lib/ads/chiamata'
import { chiamaWordpress } from '@/lib/esecutori/wordpress'
import { giornoIso } from '@/lib/date'
import type { ControlloImpianto, EsitoImpianto } from './tipi'

function presente(nome: string): boolean {
  return Boolean(String(process.env[nome] ?? '').trim())
}

function jsonEmail(nome: string): string | null {
  const grezzo = String(process.env[nome] ?? '').trim()
  if (!grezzo) return null
  try {
    const o = JSON.parse(grezzo) as { client_email?: string }
    return o.client_email ?? null
  } catch {
    throw new Error(`${nome} non e un JSON valido`)
  }
}

function accorcia(testo: string, n = 400): string {
  return String(testo ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
}

function adsAtteso(messaggio: string): boolean {
  return /permission|developer token|test account|prova|not allowed|NOT_ADS_USER/i.test(messaggio)
}

async function proprietaSearchConsole(identita: Identita): Promise<{ url: string; permesso: string }[]> {
  const api = google.searchconsole({ version: 'v1', auth: auth(identita) as any })
  const res = await api.sites.list()
  return (res.data.siteEntry ?? []).map((s) => ({
    url: s.siteUrl ?? '',
    permesso: String(s.permissionLevel ?? ''),
  }))
}

async function provaLetturaSearchConsole(identita: Identita, siteUrl: string): Promise<string> {
  const api = google.searchconsole({ version: 'v1', auth: auth(identita) as any })
  const a = giornoIso(-3)
  const da = giornoIso(-30)
  const res = await api.searchanalytics.query({
    siteUrl,
    requestBody: { startDate: da, endDate: a, dimensions: ['date'], rowLimit: 8, type: 'web' },
  })
  const righe = res.data.rows ?? []
  const clic = righe.reduce((n, r) => n + Number(r.clicks ?? 0), 0)
  const impressioni = righe.reduce((n, r) => n + Number(r.impressions ?? 0), 0)
  return `lettura ok ${da} / ${a}: ${righe.length} giorni, ${clic} clic, ${impressioni} impressioni`
}

async function namespacesWp(base: string): Promise<string[]> {
  const res = await fetch(`${base.replace(/\/$/, '')}/wp-json/`, {
    headers: { 'user-agent': 'RegiaSEO/1.0' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`wp-json HTTP ${res.status}`)
  const data = (await res.json()) as { namespaces?: string[] }
  return data.namespaces ?? []
}

async function githubRepo(token: string, repo: string): Promise<{ pulls: boolean; status: number }> {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'user-agent': 'RegiaSEO/1.0',
  }
  const repoRes = await fetch(`https://api.github.com/repos/${repo}`, { headers })
  if (repoRes.status !== 200) return { pulls: false, status: repoRes.status }
  const pulls = await fetch(`https://api.github.com/repos/${repo}/pulls?per_page=1`, { headers })
  return { pulls: pulls.status === 200, status: pulls.status }
}

export async function eseguiControlli(): Promise<ControlloImpianto[]> {
  const out: ControlloImpianto[] = []
  const metti = (
    codice: string,
    titolo: string,
    esito: EsitoImpianto,
    dettaglio: string,
    cosaFare = ''
  ) => {
    out.push({ codice, titolo, esito, dettaglio: accorcia(dettaglio, 600), cosaFare })
  }

  const obbligatorie = [
    'PANNELLO_PASSWORD',
    'CRON_CHIAVE',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'ANTHROPIC_API_KEY',
    'GOOGLE_SERVICE_ACCOUNT_JSON',
  ]
  const manca = obbligatorie.filter((n) => !presente(n))
  metti(
    'B1',
    'Variabili pannello',
    manca.length ? 'fallito' : 'ok',
    manca.length ? `mancano ${manca.join(', ')}` : 'password, cron, database, Claude, JSON Brignole',
    'In Hostinger riempi le variabili e riavvia l applicazione Node'
  )

  let emailB: string | null = null
  let emailL: string | null = null
  try {
    emailB = jsonEmail('GOOGLE_SERVICE_ACCOUNT_JSON')
    metti('B4', 'JSON Brignole', emailB ? 'ok' : 'fallito', emailB || 'vuoto', 'Incolla il JSON in una riga')
  } catch (e) {
    metti('B4', 'JSON Brignole', 'fallito', (e as Error).message, 'Il valore deve essere JSON intero')
  }
  try {
    emailL = jsonEmail('BL_SERVICE_ACCOUNT_JSON')
    metti(
      'B5',
      'JSON Biography Library',
      emailL ? 'ok' : 'fallito',
      emailL || 'vuoto',
      'Progetto Cloud associazione, JSON in BL_SERVICE_ACCOUNT_JSON, una riga, riavvio'
    )
  } catch (e) {
    metti('B5', 'JSON Biography Library', 'fallito', (e as Error).message, 'JSON BL malformato: una riga sola')
  }
  if (emailB && emailL) {
    metti(
      'B6',
      'Email iam distinte',
      emailB !== emailL ? 'ok' : 'fallito',
      `Brignole ${emailB} / BL ${emailL}`,
      'Due progetti Cloud, due account di servizio'
    )
  }

  const adsB = (process.env.GOOGLE_ADS_CUSTOMER_ID ?? '').replace(/-/g, '')
  const adsL = (process.env.BL_ADS_CUSTOMER_ID ?? '').replace(/-/g, '')
  if (adsB && adsL) {
    metti(
      'B7',
      'Customer Ads distinti',
      adsB !== adsL ? 'ok' : 'fallito',
      `Brignole ${adsB} / BL ${adsL}`,
      'Non mettere lo stesso account nei due banchi'
    )
  } else {
    metti('B7', 'Customer Ads distinti', 'atteso', `Brignole ${adsB || '(vuoto)'} / BL ${adsL || '(vuoto)'}`, '')
  }
  metti(
    'B8',
    'Chiave CrUX',
    presente('CRUX_API_KEY') ? 'ok' : 'atteso',
    presente('CRUX_API_KEY') ? 'presente' : 'assente: vitali Chrome vuoti',
    'Opzionale. Chrome UX Report API nel progetto Cloud Brignole'
  )

  const tokenGh = process.env.GITHUB_TOKEN?.trim() ?? ''
  const tokenBl = process.env.GITHUB_TOKEN_BL?.trim() ?? ''
  if (tokenGh && tokenBl) {
    metti(
      'F0',
      'Token GitHub distinti',
      tokenGh !== tokenBl ? 'ok' : 'fallito',
      tokenGh !== tokenBl ? 'GITHUB_TOKEN e GITHUB_TOKEN_BL sono due stringhe diverse' : 'stesso token nelle due caselle',
      'Token a grana fine: uno sui repo Brignole, uno sull organizzazione Biography Library'
    )
  }

  try {
    await query('SELECT 1')
    const tabelle = await query<Record<string, string>>('SHOW TABLES')
    const nomi = tabelle.map((r) => Object.values(r)[0])
    const servono = ['misure', 'pagine', 'azioni', 'registro', 'esecuzioni', 'tecnici']
    const mancaTab = servono.filter((t) => !nomi.includes(t))
    metti(
      'C1',
      'Database',
      mancaTab.length ? 'fallito' : 'ok',
      mancaTab.length ? `mancano ${mancaTab.join(', ')}` : `${nomi.length} tabelle`,
      'Apri /api/setup/migra?chiave= con CRON_CHIAVE'
    )
  } catch (e) {
    metti('C1', 'Database', 'fallito', (e as Error).message, 'Controlla DB_HOST, utente, password, riavvia')
  }

  try {
    const ultima = await unaRiga<{ iniziata_il: Date | string; esito: string | null }>(
      `SELECT iniziata_il, esito FROM esecuzioni WHERE lavoro = 'raccolta' ORDER BY id DESC LIMIT 1`
    )
    if (!ultima) {
      metti('C7', 'Raccolta recente', 'atteso', 'nessuna raccolta in elenco', 'Sveglia /api/cron/raccolta ogni giorno')
    } else {
      const quando = new Date(ultima.iniziata_il)
      const ore = (Date.now() - quando.getTime()) / 3600000
      metti(
        'C7',
        'Raccolta recente',
        ore > 48 ? 'fallito' : 'ok',
        `ultima ${String(ultima.iniziata_il).slice(0, 16)} esito ${ultima.esito ?? '?'} (${Math.round(ore)} ore fa)`,
        'Controlla la sveglia Hostinger della raccolta. Stessa CRON_CHIAVE'
      )
    }
  } catch {
    metti('C7', 'Raccolta recente', 'atteso', 'tabella esecuzioni non disponibile', '')
  }

  const attesiBrignole = [
    'aelle.hiphop',
    'brignole.ch',
    'tagtalesgallery.com',
    'kizunama.com',
    'strangeglyph.xyz',
    'lunanihongo.com',
  ]
  if (emailB) {
    try {
      const siti = await proprietaSearchConsole('brignole')
      const testo = siti.map((s) => s.url).join(' | ') || '(elenco vuoto)'
      const mancaDom = attesiBrignole.filter((d) => !siti.some((s) => s.url.toLowerCase().includes(d)))
      metti(
        'D1',
        'Search Console Brignole',
        mancaDom.length ? 'atteso' : siti.length ? 'ok' : 'fallito',
        mancaDom.length ? `visibili, manca invito su: ${mancaDom.join(', ')}. ${testo}` : testo,
        'Proprieta Dominio, utente iam Brignole, ruolo Proprietario'
      )
      const aelle = SITI.find((s) => s.id === 'aelle')?.searchConsole
      if (aelle) {
        try {
          const lettura = await provaLetturaSearchConsole('brignole', aelle)
          metti('D1b', 'Lettura dati Aelle', 'ok', lettura, '')
        } catch (e) {
          metti(
            'D1b',
            'Lettura dati Aelle',
            'fallito',
            (e as Error).message,
            'Invito sulla stessa proprieta scritta in siti.config.ts'
          )
        }
      }
    } catch (e) {
      metti(
        'D1',
        'Search Console Brignole',
        'fallito',
        (e as Error).message,
        'JSON Brignole, API Search Console accesa, invito Proprietario'
      )
    }
  } else {
    metti('D1', 'Search Console Brignole', 'fallito', 'manca JSON Brignole', '')
  }

  const proprietaBl = SITI.find((s) => s.id === 'biography-library')?.searchConsole ?? 'sc-domain:biographylibrary.org'
  if (emailL) {
    try {
      const siti = await proprietaSearchConsole('biography-library')
      const ha = siti.some((s) => /biographylibrary\.org/i.test(s.url))
      const dominio = siti.find((s) => s.url === proprietaBl)
      metti(
        'D2',
        'Search Console Biography Library',
        dominio ? 'ok' : ha ? 'atteso' : 'fallito',
        siti.length
          ? siti.map((s) => `${s.url} (${s.permesso})`).join(' | ')
          : 'elenco vuoto: l account iam non vede nessuna proprieta',
        dominio
          ? ''
          : 'Search Console, proprieta Dominio biographylibrary.org, invita l email iam BL come Proprietario. Verifica solo DNS'
      )
      if (dominio || ha) {
        try {
          const lettura = await provaLetturaSearchConsole('biography-library', proprietaBl)
          metti('D2b', 'Lettura dati Biography Library', 'ok', lettura, '')
        } catch (e) {
          metti(
            'D2b',
            'Lettura dati Biography Library',
            'fallito',
            (e as Error).message,
            'L invito deve stare sulla proprieta Dominio (sc-domain:biographylibrary.org), non sul prefisso https'
          )
        }
      }
    } catch (e) {
      metti(
        'D2',
        'Search Console Biography Library',
        'fallito',
        (e as Error).message,
        'JSON BL, API Search Console nel progetto associazione, invito Proprietario'
      )
    }
  } else {
    metti(
      'D2',
      'Search Console Biography Library',
      'fallito',
      'manca BL_SERVICE_ACCOUNT_JSON',
      'docs/passi-rimasti.md punto 1'
    )
  }

  const wpSiti: { codice: string; id: string; nome: string; base: string; robots: boolean; grants: boolean }[] = [
    { codice: 'E1', id: 'aelle', nome: 'Aelle', base: 'https://aelle.hiphop', robots: true, grants: false },
    { codice: 'E2', id: 'brignole', nome: 'brignole.ch', base: 'https://brignole.ch', robots: true, grants: false },
    {
      codice: 'E3',
      id: 'biography-library',
      nome: 'Biography Library',
      base: 'https://biographylibrary.org',
      robots: true,
      grants: true,
    },
  ]
  for (const w of wpSiti) {
    const s = SITI.find((x) => x.id === w.id)
    if (!s || s.scrittura.tipo !== 'wordpress') continue
    try {
      const me = (await chiamaWordpress(s, 'wp/v2/users/me')) as { slug?: string; name?: string }
      let ns: string[] = []
      try {
        ns = await namespacesWp(w.base)
      } catch {
        ns = []
      }
      const haRobots = ns.includes('regia-seo/v1')
      const haGrants = ns.includes('regia-bl/v1')
      const problemi: string[] = []
      if (w.robots && !haRobots) problemi.push('manca il plugin Regia robots')
      if (w.grants && !haGrants) problemi.push('manca il plugin Regia BL Grants')
      if (!w.grants && haGrants) problemi.push('plugin Grants su un sito che non e Biography Library: disattivalo')
      metti(
        w.codice,
        `WordPress ${w.nome}`,
        problemi.length ? 'fallito' : 'ok',
        `utente ${me.slug || me.name || '?'}; plugin: ${ns.filter((n) => n.startsWith('regia')).join(', ') || '(nessun regia)'}`,
        problemi.join('. ') || ''
      )
      if (w.grants && !problemi.length) {
        try {
          const conv = (await chiamaWordpress(s, 'regia-bl/v1/conversioni')) as { conversioni?: unknown[] }
          metti(
            'E4',
            'REST conversioni Grants',
            Array.isArray(conv.conversioni) ? 'ok' : 'fallito',
            Array.isArray(conv.conversioni) ? `${conv.conversioni.length} righe nuove` : 'risposta senza elenco',
            'Plugin Regia BL Grants attivo'
          )
        } catch (e) {
          metti('E4', 'REST conversioni Grants', 'fallito', (e as Error).message, 'Plugin Grants e utente con edit_posts')
        }
      }
    } catch (e) {
      metti(
        w.codice,
        `WordPress ${w.nome}`,
        'fallito',
        (e as Error).message,
        'Nome utente di login (non il nome visualizzato), password applicativa valida, utente Amministratore. Se 401 dopo una password nuova, il server puo togliere Authorization (LiteSpeed)'
      )
    }
  }

  try {
    const res = await fetch('https://biographylibrary.org/', {
      headers: { 'user-agent': 'RegiaSEO/1.0' },
      redirect: 'follow',
    })
    const html = await res.text()
    const sporco = /googletagmanager|gtag\(|google-analytics\.com|GTM-|fbevents|facebook\.net/i.test(html)
    metti(
      'E5',
      'HTML Biography Library senza tracker',
      sporco ? 'fallito' : res.ok ? 'ok' : 'atteso',
      sporco ? 'trovato script Google o pixel' : `HTTP ${res.status}, nessun gtag/GTM/pixel`,
      'Disattiva Site Kit, Analytics, GTM, pixel Ads sul sito associazione'
    )
  } catch (e) {
    metti('E5', 'HTML Biography Library senza tracker', 'atteso', (e as Error).message, '')
  }

  if (tokenGh) {
    try {
      const r = await githubRepo(tokenGh, 'claudiobrignole/TagTales')
      metti(
        'F1',
        'GitHub TagTales',
        r.pulls ? 'ok' : 'fallito',
        r.pulls ? 'Contents e Pull requests ok' : `HTTP ${r.status} (serve permesso Pull requests)`,
        'Token a grana fine: Contents e Pull requests in lettura e scrittura'
      )
    } catch (e) {
      metti('F1', 'GitHub TagTales', 'fallito', (e as Error).message, '')
    }
  } else {
    metti('F1', 'GitHub TagTales', 'fallito', 'manca GITHUB_TOKEN', '')
  }
  if (tokenBl) {
    try {
      const r = await githubRepo(tokenBl, 'biographylibrary/Biography-Library')
      metti(
        'F2',
        'GitHub Biography Library',
        r.pulls ? 'ok' : 'fallito',
        r.pulls ? 'Contents e Pull requests ok' : `HTTP ${r.status}`,
        'GITHUB_TOKEN_BL, proprietario organizzazione Biography Library'
      )
    } catch (e) {
      metti('F2', 'GitHub Biography Library', 'fallito', (e as Error).message, '')
    }
  } else {
    metti('F2', 'GitHub Biography Library', 'atteso', 'manca GITHUB_TOKEN_BL', '')
  }

  if (presente('ECWID_TOKEN') && presente('ECWID_STORE_ID')) {
    try {
      const store = process.env.ECWID_STORE_ID
      const r = await fetch(`https://app.ecwid.com/api/v3/${store}/profile`, {
        headers: { Authorization: `Bearer ${process.env.ECWID_TOKEN ?? ''}` },
      })
      let dettaglio = `HTTP ${r.status}`
      if (r.status === 200) {
        dettaglio = `negozio ${store}`
      } else {
        const corpo = accorcia(await r.text(), 180)
        dettaglio = corpo ? `HTTP ${r.status}: ${corpo}` : `HTTP ${r.status}`
      }
      metti(
        'F4',
        'Ecwid',
        r.status === 200 ? 'ok' : 'fallito',
        dettaglio,
        r.status === 200
          ? ''
          : 'Dopo il rilascio del codice: Impianto → Controlla adesso. Se resta 403, in Hostinger ECWID_TOKEN deve essere il secret_ (non il token pubblico), poi riavvia'
      )
    } catch (e) {
      metti('F4', 'Ecwid', 'fallito', (e as Error).message, '')
    }
  } else {
    metti('F4', 'Ecwid', 'atteso', 'mancano ECWID_TOKEN o ECWID_STORE_ID', '')
  }

  for (const identita of ['brignole', 'biography-library'] as const) {
    const b = banco(identita)
    const codice = identita === 'brignole' ? 'P1' : 'P2'
    const titolo = identita === 'brignole' ? 'Ads Brignole (lettura)' : 'Ads Biography Library (lettura)'
    if (!bancoPronto(b)) {
      metti(codice, titolo, 'atteso', 'mancano token o numero account', 'Variabili GOOGLE_ADS_* o BL_ADS_*')
      continue
    }
    try {
      const righe = await gaql(b, 'SELECT campaign.id FROM campaign LIMIT 1')
      metti(codice, titolo, 'ok', `${righe.length} campagne lette (campione)`, '')
    } catch (e) {
      const msg = (e as Error).message
      metti(
        codice,
        titolo,
        adsAtteso(msg) ? 'atteso' : 'fallito',
        msg,
        identita === 'brignole'
          ? 'Token Basic, email iam Brignole in Ads con sola lettura'
          : 'Token Basic, email iam BL in Ads Grants con permesso Standard'
      )
    }
  }

  return out
}
