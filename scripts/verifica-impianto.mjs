#!/usr/bin/env node
/**
 * Controllo in lettura (e, a richiesta, ciclo notturno) del pannello.
 * Istruzioni: docs/istruzioni-claude.md
 *
 *   npm run verifica
 *   npm run verifica -- --cron
 *   npm run verifica -- --siti
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import mysql from 'mysql2/promise'
import { GoogleAuth } from 'google-auth-library'

const argomenti = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--base=')))
const cron = argomenti.has('--cron')
const sitiScrivi = argomenti.has('--siti')
const baseArg = process.argv.slice(2).find((a) => a.startsWith('--base='))

function togliApici(valore) {
  const v = valore.trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1)
  }
  return valore
}

function caricaEnv() {
  const env = { ...process.env }
  if (!existsSync('.env.local')) return env
  const righe = readFileSync('.env.local', 'utf8').split(/\r?\n/)
  let i = 0
  while (i < righe.length) {
    const tagliata = righe[i].trim()
    i++
    if (!tagliata || tagliata.startsWith('#')) continue
    const m = tagliata.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    const chiave = m[1]
    let valore = togliApici(m[2])
    if (valore.trim().startsWith('{')) {
      const pezzi = [valore]
      while (i < righe.length) {
        const candidato = togliApici(pezzi.join('\n').trim())
        try {
          JSON.parse(candidato)
          valore = JSON.stringify(JSON.parse(candidato))
          break
        } catch {
          if (/^[A-Z][A-Z0-9_]*=/.test(righe[i].trim())) break
          pezzi.push(righe[i])
          i++
        }
      }
    }
    if (env[chiave] == null || env[chiave] === '') env[chiave] = valore
  }
  return env
}

const env = caricaEnv()
const basePannello = (baseArg ? baseArg.slice(7) : env.PANNELLO_URL || 'https://seo.brignole.ch').replace(
  /\/$/,
  ''
)

/** @typedef {'ok'|'fallito'|'atteso'|'saltato'} Esito */
/** @type {{ id: string, esito: Esito, titolo: string, dettaglio: string, cosaFare: string }[]} */
const prove = []

function registra(id, esito, titolo, dettaglio, cosaFare = '') {
  prove.push({ id, esito, titolo, dettaglio: String(dettaglio ?? '').slice(0, 500), cosaFare })
}

function presente(nome) {
  return Boolean(String(env[nome] ?? '').trim())
}

function jsonServizio(nomeVar) {
  const grezzo = String(env[nomeVar] ?? '').trim()
  if (!grezzo) return null
  try {
    return JSON.parse(grezzo)
  } catch {
    throw new Error(`${nomeVar} non e un JSON valido`)
  }
}

function leggiSiti() {
  const testo = readFileSync('siti.config.ts', 'utf8')
  const blocchi = [...testo.matchAll(/\{\s*id:\s*'([^']+)'([\s\S]*?)\n  \},/g)]
  return blocchi.map((m) => {
    const corpo = m[2]
    const campo = (nome) => {
      const r = corpo.match(new RegExp(`${nome}:\\s*('[^']*'|null)`))
      if (!r) return null
      return r[1] === 'null' ? null : r[1].slice(1, -1)
    }
    const identita = campo('identita')
    const analytics = campo('analyticsProperty')
    const searchConsole = campo('searchConsole')
    const tipo =
      corpo.match(/scrittura:\s*\{\s*tipo:\s*'([^']+)'/)?.[1] ??
      corpo.match(/tipo:\s*'([^']+)'/)?.[1] ??
      '?'
    return {
      id: m[1],
      identita,
      analyticsProperty: analytics,
      searchConsole,
      scrittura: tipo,
    }
  })
}

async function conTimeout(promessa, ms, etichetta) {
  let timer
  try {
    return await Promise.race([
      promessa,
      new Promise((_, no) => {
        timer = setTimeout(() => no(new Error(`tempo esaurito (${etichetta}, ${ms} ms)`)), ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

async function httpJson(url, opzioni = {}, ms = 25000) {
  const res = await conTimeout(
    fetch(url, {
      redirect: 'manual',
      ...opzioni,
      headers: { 'user-agent': 'RegiaSEO-verifica/1.0', ...(opzioni.headers ?? {}) },
    }),
    ms,
    url
  )
  const testo = await res.text()
  let json = null
  try {
    json = JSON.parse(testo)
  } catch {
    /* non JSON */
  }
  return { status: res.status, headers: res.headers, testo, json, url }
}

function authBasic(utente, password) {
  const u = String(utente ?? '').trim()
  const p = String(password ?? '').replace(/\s+/g, '')
  return 'Basic ' + Buffer.from(`${u}:${p}`).toString('base64')
}

async function googleClient(identita) {
  const nome = identita === 'biography-library' ? 'BL_SERVICE_ACCOUNT_JSON' : 'GOOGLE_SERVICE_ACCOUNT_JSON'
  const credentials = jsonServizio(nome)
  if (!credentials) throw new Error(`manca ${nome}`)
  const auth = new GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/analytics.readonly',
      'https://www.googleapis.com/auth/adwords',
    ],
  })
  return { client: await auth.getClient(), email: credentials.client_email, nome }
}

async function elencoSearchConsole(identita) {
  const { client } = await googleClient(identita)
  const res = await client.request({ url: 'https://www.googleapis.com/webmasters/v3/sites' })
  const siti = res.data?.siteEntry ?? []
  return siti.map((s) => s.siteUrl)
}

async function main() {
  // A. codice
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const scriptMancanti = ['dev', 'start', 'db:migra', 'verifica'].filter((s) => !pkg.scripts?.[s])
  registra(
    'A1',
    scriptMancanti.length ? 'fallito' : 'ok',
    'Script npm',
    scriptMancanti.length ? `mancano ${scriptMancanti.join(', ')}` : Object.keys(pkg.scripts).join(', '),
    'Aggiungi gli script in package.json'
  )

  const tsc = spawnSync('npx', ['tsc', '--noEmit'], { encoding: 'utf8', timeout: 120000 })
  if (tsc.status === 0) {
    registra('A0', 'ok', 'TypeScript', 'npx tsc --noEmit senza errori', '')
  } else {
    const out = `${tsc.stdout || ''}${tsc.stderr || ''}`.slice(0, 400)
    const tipiNext = /Cannot find type definition|\.next\/types/.test(out)
    registra(
      'A0',
      tipiNext ? 'atteso' : 'fallito',
      'TypeScript',
      out || `uscita ${tsc.status}`,
      tipiNext ? 'In locale: npm run build, oppure ignora e continua i controlli funzionali.' : 'Correggi gli errori di tipo.'
    )
  }

  let siti = []
  try {
    siti = leggiSiti()
    const ids = siti.map((s) => s.id)
    const bl = siti.filter((s) => s.identita === 'biography-library')
    const analyticsBl = bl.filter((s) => s.analyticsProperty)
    const nodeGithub = siti.filter((s) => s.scrittura === 'github')
    const ecwid = siti.filter((s) => s.scrittura === 'ecwid')
    const ok =
      siti.length >= 8 &&
      analyticsBl.length === 0 &&
      bl.length >= 2 &&
      nodeGithub.length >= 4 &&
      ecwid.some((s) => s.id === 'aelle-store')
    registra(
      'A2',
      ok ? 'ok' : 'fallito',
      'Perimetro siti',
      `${ids.join(', ')}. BL senza Analytics: ${analyticsBl.length === 0}. Node GitHub: ${nodeGithub.map((s) => s.id).join(', ')}`,
      'Controlla siti.config.ts: identita, analyticsProperty null sui siti BL, scrittura github su seo/contenuti.json'
    )
  } catch (e) {
    registra('A2', 'fallito', 'Perimetro siti', e.message, 'Apri siti.config.ts')
  }

  const regole = readFileSync('lib/regole/index.ts', 'utf8')
  const attese = [
    'regolaRobotsSitemap',
    'regolaCtrBasso',
    'regolaAiOverview',
    'regolaPosizione',
    'regolaMetaMancanti',
    'regolaCannibalizzazione',
    'regolaPagina',
    'regolaLacune',
    'regolaDatiStrutturati',
    'regolaPagineOrfane',
    'regolaVitali',
    'regolaMerchant',
  ]
  const regoleMancanti = attese.filter((n) => !regole.includes(n))
  registra(
    'A4',
    regoleMancanti.length ? 'fallito' : 'ok',
    'Regole diagnostiche',
    regoleMancanti.length ? `mancano ${regoleMancanti.join(', ')}` : `${attese.length} regole esportate`,
    'lib/regole/index.ts deve elencare tutte le regole'
  )

  const googleTs = readFileSync('lib/raccolta/google.ts', 'utf8')
  registra(
    'A6',
    googleTs.includes('BL_SERVICE_ACCOUNT_JSON') && googleTs.includes('GOOGLE_SERVICE_ACCOUNT_JSON')
      ? 'ok'
      : 'fallito',
    'Due JSON Google',
    'auth() distingue brignole e biography-library',
    'Non riusare il JSON Brignole per BL'
  )

  const adsTs = readFileSync('lib/ads/chiamata.ts', 'utf8')
  registra(
    'A7',
    adsTs.includes('BL_ADS_DEVELOPER_TOKEN') && adsTs.includes('GOOGLE_ADS_DEVELOPER_TOKEN')
      ? 'ok'
      : 'fallito',
    'Due banchi Ads',
    'banco() usa variabili distinte, API v23 se non override',
    'Non sommare i due banchi'
  )

  const applica = readFileSync('lib/esecutori/applica.ts', 'utf8')
  registra(
    'A8',
    applica.includes('valoreAttuale') && applica.includes('aggiornaValoreVecchio')
      ? 'ok'
      : 'fallito',
    'Registro prima della scrittura',
    'applica rilegge il valore attuale e lo salva',
    'Nessuna scrittura senza valore_vecchio'
  )

  const pluginFiles = [
    'plugin-wp/regia-robots/regia-robots.php',
    'plugin-wp/regia-bl-grants/regia-bl-grants.php',
  ]
  let tracciatori = []
  for (const f of pluginFiles) {
    if (!existsSync(f)) {
      tracciatori.push(`${f} assente`)
      continue
    }
    const t = readFileSync(f, 'utf8')
    if (/googletagmanager|gtag\(|google-analytics|facebook\.net|fbevents/i.test(t)) {
      tracciatori.push(f)
    }
  }
  registra(
    'A10',
    tracciatori.length ? 'fallito' : 'ok',
    'Plugin senza script Google',
    tracciatori.length ? tracciatori.join(', ') : 'robots e grants senza gtag/GTM/pixel',
    'Togli qualsiasi script di misura dai plugin'
  )

  // B. variabili
  const obbligatoriePannello = [
    'PANNELLO_PASSWORD',
    'CRON_CHIAVE',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'ANTHROPIC_API_KEY',
  ]
  const mancaPannello = obbligatoriePannello.filter((n) => !presente(n))
  registra(
    'B1',
    mancaPannello.length ? 'fallito' : 'ok',
    'Variabili pannello',
    mancaPannello.length ? `mancano ${mancaPannello.join(', ')}` : 'password, cron, db, Claude presenti',
    'Riempi .env.local o Hostinger, poi riavvia'
  )
  const pwd = String(env.PANNELLO_PASSWORD ?? '')
  registra(
    'B2',
    pwd.length >= 12 ? 'ok' : 'fallito',
    'Lunghezza password pannello',
    `${pwd.length} caratteri`,
    'PANNELLO_PASSWORD almeno 12 caratteri'
  )
  registra(
    'B3',
    (env.MODELLO_TESTI || 'claude').toLowerCase() === 'claude' ? 'ok' : 'atteso',
    'Modello testi',
    env.MODELLO_TESTI || '(predefinito claude)',
    'In produzione MODELLO_TESTI=claude. Non serve MODELLO_CLAUDE.'
  )

  let emailBrignole = null
  let emailBl = null
  try {
    emailBrignole = jsonServizio('GOOGLE_SERVICE_ACCOUNT_JSON')?.client_email ?? null
    registra(
      'B4',
      emailBrignole ? 'ok' : 'fallito',
      'JSON Brignole',
      emailBrignole || 'GOOGLE_SERVICE_ACCOUNT_JSON vuoto',
      'Incolla il JSON Brignole in una riga'
    )
  } catch (e) {
    registra('B4', 'fallito', 'JSON Brignole', e.message, 'Il valore deve essere JSON intero')
  }
  try {
    emailBl = jsonServizio('BL_SERVICE_ACCOUNT_JSON')?.client_email ?? null
    registra(
      'B5',
      emailBl ? 'ok' : 'atteso',
      'JSON Biography Library',
      emailBl || 'BL_SERVICE_ACCOUNT_JSON vuoto',
      'Vedi docs/passi-rimasti.md punto 1'
    )
  } catch (e) {
    registra('B5', 'fallito', 'JSON Biography Library', e.message, 'JSON BL malformato')
  }
  if (emailBrignole && emailBl) {
    registra(
      'B6',
      emailBrignole !== emailBl ? 'ok' : 'fallito',
      'Email iam distinte',
      `Brignole ${emailBrignole} / BL ${emailBl}`,
      'Due account di servizio, due progetti Cloud'
    )
  } else {
    registra('B6', 'saltato', 'Email iam distinte', 'manca almeno un JSON', '')
  }

  const adsB = (env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/-/g, '')
  const adsL = (env.BL_ADS_CUSTOMER_ID || '').replace(/-/g, '')
  if (adsB && adsL) {
    registra(
      'B7',
      adsB !== adsL ? 'ok' : 'fallito',
      'Customer Ads distinti',
      `Brignole ${adsB} / BL ${adsL}`,
      'Non mettere lo stesso account nei due banchi'
    )
  } else {
    registra(
      'B7',
      'atteso',
      'Customer Ads distinti',
      `Brignole ${adsB || '(vuoto)'} / BL ${adsL || '(vuoto)'}`,
      'Token e numeri Ads in Hostinger'
    )
  }
  registra(
    'B8',
    presente('CRUX_API_KEY') ? 'ok' : 'atteso',
    'Chiave CrUX',
    presente('CRUX_API_KEY') ? 'presente' : 'assente: vitali Chrome vuoti',
    'Opzionale. passi-rimasti.md punto 7'
  )

  const brignoleWp = presente('WP_AELLE_UTENTE') && presente('WP_BRIGNOLE_UTENTE') && presente('WP_BL_UTENTE')
  registra(
    'B9',
    brignoleWp ? 'ok' : 'fallito',
    'Utenti WordPress',
    brignoleWp ? 'Aelle, brignole, BL' : 'manca almeno un WP_*_UTENTE',
    'Password per le applicazioni, non la password di login'
  )

  // C. database
  let conn = null
  if (presente('DB_HOST') && presente('DB_NAME')) {
    try {
      conn = await mysql.createConnection({
        host: env.DB_HOST,
        port: Number(env.DB_PORT ?? 3306),
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
      })
      await conn.query('SELECT 1')
      registra('C1', 'ok', 'Database risponde', `${env.DB_HOST}/${env.DB_NAME}`, '')
      const [tabelle] = await conn.query('SHOW TABLES')
      const nomi = tabelle.map((r) => Object.values(r)[0])
      const servono = [
        'misure',
        'pagine',
        'azioni',
        'registro',
        'verifiche',
        'esecuzioni',
        'tecnici',
        'campagne',
        'grants_conversioni',
      ]
      const mancaTab = servono.filter((t) => !nomi.includes(t))
      registra(
        'C2',
        mancaTab.length ? 'fallito' : 'ok',
        'Tabelle',
        mancaTab.length ? `mancano ${mancaTab.join(', ')}` : nomi.join(', '),
        'Apri /api/setup/migra?chiave= con CRON_CHIAVE'
      )
      if (!mancaTab.includes('misure')) {
        const [fonti] = await conn.query(
          `SELECT fonte, sito_id, COUNT(*) n, MAX(giorno) ultimo
             FROM misure GROUP BY fonte, sito_id ORDER BY fonte, sito_id`
        )
        const sc = fonti.filter((r) => r.fonte === 'search-console')
        const dettaglio =
          fonti.length === 0
            ? 'nessuna misura'
            : fonti.map((r) => `${r.fonte}/${r.sito_id}:${r.n}`).join('; ')
        registra(
          'C3',
          sc.length ? 'ok' : 'atteso',
          'Misure Search Console',
          dettaglio,
          sc.length ? '' : 'Lancia /api/cron/raccolta e gli inviti Search Console'
        )
      }
      if (!mancaTab.includes('pagine')) {
        const [pags] = await conn.query(
          `SELECT sito_id, COUNT(*) n FROM pagine GROUP BY sito_id`
        )
        registra(
          'C4',
          pags.length ? 'ok' : 'atteso',
          'Pagine scansionate',
          pags.length ? pags.map((r) => `${r.sito_id}:${r.n}`).join(', ') : 'nessuna scansione',
          'Lancia /api/cron/scansione?sito=strangeglyph'
        )
      }
      if (!mancaTab.includes('azioni')) {
        const [stati] = await conn.query(`SELECT stato, COUNT(*) n FROM azioni GROUP BY stato`)
        registra(
          'C5',
          'ok',
          'Azioni in coda',
          stati.length ? stati.map((r) => `${r.stato}:${r.n}`).join(', ') : 'zero azioni',
          'Dopo la diagnosi compaiono le proposte'
        )
      }
      if (!mancaTab.includes('campagne')) {
        const [banchi] = await conn.query(
          `SELECT identita, COUNT(*) n FROM campagne GROUP BY identita`
        )
        const mescolati = banchi.some((r) => !r.identita)
        registra(
          'C6',
          mescolati ? 'fallito' : 'ok',
          'Campagne per identita',
          banchi.length ? banchi.map((r) => `${r.identita}:${r.n}`).join(', ') : 'nessuna campagna (token di prova: atteso)',
          'I due banchi non si sommano'
        )
      }
    } catch (e) {
      registra(
        'C1',
        'fallito',
        'Database risponde',
        e.message,
        'DB_HOST=127.0.0.1 in produzione, porta 3306, riavvia. In locale controlla .env.local'
      )
    }
  } else {
    registra('C1', 'saltato', 'Database risponde', 'mancano DB_*', 'Riempi le variabili database')
  }

  // D. Google
  if (emailBrignole) {
    try {
      const urls = await elencoSearchConsole('brignole')
      const testo = urls.join(' | ') || '(elenco vuoto)'
      const haAelle = urls.some((u) => /aelle\.hiphop/i.test(u))
      const haBrignole = urls.some((u) => /brignole\.ch/i.test(u))
      registra(
        'D1',
        haAelle && haBrignole ? 'ok' : urls.length ? 'atteso' : 'atteso',
        'Search Console Brignole',
        testo,
        'Invita l email iam Brignole come Proprietario sulla proprieta Dominio'
      )
    } catch (e) {
      const msg = e.message || String(e)
      const atteso = /403|401|invalid_grant|invalid_client/i.test(msg)
      registra(
        'D1',
        atteso ? 'atteso' : 'fallito',
        'Search Console Brignole',
        msg,
        'JSON Brignole, API Search Console accesa, invito Proprietario'
      )
    }
  } else {
    registra('D1', 'saltato', 'Search Console Brignole', 'niente JSON', '')
  }
  if (emailBl) {
    try {
      const urls = await elencoSearchConsole('biography-library')
      const ha = urls.some((u) => /biographylibrary\.org/i.test(u))
      registra(
        'D2',
        ha ? 'ok' : 'atteso',
        'Search Console Biography Library',
        urls.join(' | ') || '(elenco vuoto)',
        'Verifica DNS e invita l email iam BL'
      )
    } catch (e) {
      const msg = e.message || String(e)
      registra(
        'D2',
        /403|401|invalid/i.test(msg) ? 'atteso' : 'fallito',
        'Search Console Biography Library',
        msg,
        'docs/passi-rimasti.md punti 1 e 3'
      )
    }
  } else {
    registra('D2', 'atteso', 'Search Console Biography Library', 'manca BL_SERVICE_ACCOUNT_JSON', 'passi-rimasti.md punto 1')
  }

  // E. WordPress
  const wpSiti = [
    { id: 'E1', nome: 'Aelle', base: 'https://aelle.hiphop', u: env.WP_AELLE_UTENTE, p: env.WP_AELLE_PASSWORD_APP, robots: true, grants: false },
    { id: 'E2', nome: 'brignole.ch', base: 'https://brignole.ch', u: env.WP_BRIGNOLE_UTENTE, p: env.WP_BRIGNOLE_PASSWORD_APP, robots: true, grants: false },
    { id: 'E3', nome: 'Biography Library', base: 'https://biographylibrary.org', u: env.WP_BL_UTENTE, p: env.WP_BL_PASSWORD_APP, robots: true, grants: true },
  ]
  for (const w of wpSiti) {
    if (!w.u || !w.p) {
      registra(w.id, 'saltato', `WordPress ${w.nome}`, 'mancano utente o password applicativa', '')
      continue
    }
    try {
      const me = await httpJson(`${w.base}/wp-json/wp/v2/users/me`, {
        headers: { Authorization: authBasic(w.u, w.p) },
      })
      if (me.status !== 200) {
        registra(
          w.id,
          'fallito',
          `WordPress ${w.nome}`,
          `users/me HTTP ${me.status} ${(me.testo || '').slice(0, 160)}`,
          'Password per le applicazioni, utente Amministratore per robots'
        )
        continue
      }
      const indice = await httpJson(`${w.base}/wp-json/`)
      const namespaces = indice.json?.namespaces ?? []
      const haRobots = namespaces.includes('regia-seo/v1')
      const haGrants = namespaces.includes('regia-bl/v1')
      const problemi = []
      if (w.robots && !haRobots) problemi.push('manca namespace regia-seo/v1')
      if (w.grants && !haGrants) problemi.push('manca namespace regia-bl/v1')
      if (!w.grants && haGrants) problemi.push('plugin Grants su un sito che non e BL')
      registra(
        w.id,
        problemi.length ? 'fallito' : 'ok',
        `WordPress ${w.nome}`,
        `utente ${me.json?.slug || me.json?.name || '?'}; ns: ${namespaces.filter((n) => String(n).startsWith('regia')).join(', ') || '(nessun regia)'}`,
        problemi.join('. ') || ''
      )
      if (w.grants && haGrants) {
        const conv = await httpJson(`${w.base}/wp-json/regia-bl/v1/conversioni`, {
          headers: { Authorization: authBasic(w.u, w.p) },
        })
        registra(
          'E4',
          conv.status === 200 && Array.isArray(conv.json?.conversioni) ? 'ok' : 'fallito',
          'REST conversioni Grants',
          conv.status === 200
            ? `${conv.json.conversioni.length} righe nuove`
            : `HTTP ${conv.status} ${(conv.testo || '').slice(0, 160)}`,
          'Plugin Regia BL Grants attivo, utente con edit_posts'
        )
      }
    } catch (e) {
      registra(w.id, 'fallito', `WordPress ${w.nome}`, e.message, 'Rete o credenziali WP')
    }
  }
  try {
    const html = await httpJson('https://biographylibrary.org/', {}, 20000)
    const corpo = html.testo || ''
    const sporco = /googletagmanager|gtag\(|google-analytics|GTM-|fbevents|facebook\.net/i.test(corpo)
    registra(
      'E5',
      sporco ? 'fallito' : html.status >= 200 && html.status < 400 ? 'ok' : 'atteso',
      'HTML Biography Library senza tracker',
      sporco ? 'trovato script Google o pixel' : `HTTP ${html.status}, nessun gtag/GTM/pixel nel HTML`,
      'Disattiva Site Kit, Analytics, GTM, pixel Ads'
    )
  } catch (e) {
    registra('E5', 'saltato', 'HTML Biography Library senza tracker', e.message, '')
  }

  // F. GitHub
  async function provaGithub(id, token, repo, deveEntrare) {
    if (!token) {
      registra(id, 'atteso', `GitHub ${repo}`, 'token assente', 'Token a grana fine, Contents e Pull requests')
      return
    }
    try {
      const res = await httpJson(`https://api.github.com/repos/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
      if (res.status === 200 && deveEntrare) {
        const pulls = await httpJson(`https://api.github.com/repos/${repo}/pulls?per_page=1`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        })
        registra(
          id,
          pulls.status === 200 ? 'ok' : 'fallito',
          `GitHub ${repo}`,
          pulls.status === 200
            ? 'Contents e Pull requests ok'
            : `repo ok, pulls HTTP ${pulls.status}: manca permesso Pull requests`,
          pulls.status === 200
            ? ''
            : 'Token a grana fine: Pull requests Read and write. Poi Approva di nuovo.'
        )
      } else if (res.status === 200 && !deveEntrare) {
        registra(
          id,
          'fallito',
          `GitHub ${repo} (deve restare fuori)`,
          'Il token vede un repo dell altra identita',
          'Due token, due proprietari. Non mescolare GITHUB_TOKEN e GITHUB_TOKEN_BL'
        )
      } else if (!deveEntrare && (res.status === 404 || res.status === 403)) {
        registra(id, 'ok', `GitHub ${repo} isolato`, `HTTP ${res.status}: l altro token non entra`, '')
      } else {
        registra(
          id,
          'fallito',
          `GitHub ${repo}`,
          `HTTP ${res.status} ${(res.testo || '').slice(0, 160)}`,
          'Permessi Contents e Pull requests, resource owner giusto'
        )
      }
    } catch (e) {
      registra(id, 'saltato', `GitHub ${repo}`, e.message, '')
    }
  }
  await provaGithub('F1', env.GITHUB_TOKEN, 'claudiobrignole/TagTales', true)
  await provaGithub('F2', env.GITHUB_TOKEN_BL, 'biographylibrary/Biography-Library', true)
  if (env.GITHUB_TOKEN_BL) {
    await provaGithub('F3', env.GITHUB_TOKEN_BL, 'claudiobrignole/TagTales', false)
  } else {
    registra('F3', 'saltato', 'Isolamento token BL', 'niente GITHUB_TOKEN_BL', '')
  }

  // Ecwid
  if (presente('ECWID_TOKEN') && presente('ECWID_STORE_ID')) {
    try {
      const store = env.ECWID_STORE_ID
      const r = await httpJson(`https://app.ecwid.com/api/v3/${store}/profile`, {
        headers: { Authorization: `Bearer ${env.ECWID_TOKEN}` },
      })
      registra(
        'F4',
        r.status === 200 ? 'ok' : 'fallito',
        'Ecwid',
        r.status === 200 ? `negozio ${r.json?.account?.accountName || store}` : `HTTP ${r.status}`,
        r.status === 200 ? '' : 'Stesso secret_ dell app Ecwid, store 127192517, intestazione Authorization'
      )
    } catch (e) {
      registra('F4', 'saltato', 'Ecwid', e.message, '')
    }
  } else {
    registra('F4', 'atteso', 'Ecwid', 'mancano ECWID_*', 'Variabili Hostinger')
  }

  // G. pannello
  try {
    const accesso = await httpJson(`${basePannello}/accesso`)
    const vecchio = /#F6F7F5|#161A18/.test(accesso.testo || '')
    registra(
      'G1',
      accesso.status === 200 && /Accesso|Regia/i.test(accesso.testo || '') ? 'ok' : 'fallito',
      'Pagina accesso',
      `HTTP ${accesso.status}${vecchio ? ' (palette vecchia: deploy incompleto?)' : ''}`,
      'Deploy da GitHub e riavvio Node'
    )
    const home = await httpJson(`${basePannello}/`)
    const versoAccesso = home.status === 307 || home.status === 302 || home.status === 303
    registra(
      'G2',
      versoAccesso || (home.status === 200 && /accesso/i.test(home.headers.get('location') || ''))
        ? 'ok'
        : home.status === 403
          ? 'atteso'
          : 'fallito',
      'Home senza cookie',
      `HTTP ${home.status} location=${home.headers.get('location') || '(nessuna)'}`,
      home.status === 403 ? 'Hostinger o rete ha bloccato il controllo automatico. Apri la pagina nel browser.' : 'middleware deve mandare a /accesso'
    )
    const senzaChiave = await httpJson(`${basePannello}/api/cron/raccolta`)
    registra(
      'G3',
      senzaChiave.status === 401 && senzaChiave.json?.errore ? 'ok' : senzaChiave.status === 403 ? 'atteso' : 'fallito',
      'Cron senza chiave',
      `HTTP ${senzaChiave.status} ${senzaChiave.json?.errore || ''} ${senzaChiave.json?.cosaFare ? 'con cosaFare' : ''}`,
      'La rotta deve restare chiusa'
    )
  } catch (e) {
    registra('G1', 'saltato', 'Pannello HTTP', e.message, 'Rete verso seo.brignole.ch')
  }

  if (cron) {
    const chiave = String(env.CRON_CHIAVE || '').trim()
    if (!chiave) {
      registra('H0', 'saltato', 'Ciclo notturno', 'manca CRON_CHIAVE', '')
    } else {
      const header = { 'x-chiave-cron': chiave }
      try {
        const rac = await httpJson(`${basePannello}/api/cron/raccolta`, { headers: header }, 180000)
        if (rac.status === 401) {
          registra('H1', 'fallito', 'Raccolta', 'chiave non valida', 'Stessa CRON_CHIAVE, senza spazi')
        } else if (rac.status === 504) {
          registra('H1', 'atteso', 'Raccolta', '504: Hostinger ha tagliato. Non ritentare in loop.', '')
        } else if (rac.json && typeof rac.json.righe === 'number') {
          const problemi = rac.json.problemi || []
          const noti = problemi.filter((p) =>
            /BL_SERVICE_ACCOUNT|token di prova|developer token|test account|prova|CRUX|merchant/i.test(p)
          )
          const altri = problemi.filter((p) => !noti.includes(p))
          registra(
            'H1',
            altri.length && rac.json.righe === 0 ? 'fallito' : 'ok',
            'Raccolta',
            `righe=${rac.json.righe} problemi=${problemi.length} finestra=${JSON.stringify(rac.json.finestra || {})} ${problemi.slice(0, 4).join(' / ')}`,
            altri.length ? altri.join(' / ') : 'I problemi su token di prova e JSON BL sono attesi'
          )
        } else {
          registra(
            'H1',
            rac.status === 403 ? 'atteso' : 'fallito',
            'Raccolta',
            `HTTP ${rac.status} ${(rac.testo || '').slice(0, 200)}`,
            'Se 403: apri l indirizzo nel browser'
          )
        }
      } catch (e) {
        registra('H1', /504|esaurito/i.test(e.message) ? 'atteso' : 'fallito', 'Raccolta', e.message, '')
      }
      try {
        const sc = await httpJson(
          `${basePannello}/api/cron/scansione?sito=strangeglyph`,
          { headers: header },
          90000
        )
        if (sc.json && typeof sc.json.pagine === 'number') {
          registra(
            'H2',
            sc.json.pagine >= 1 || (sc.json.problemi || []).length === 0 ? 'ok' : 'atteso',
            'Scansione StrangeGlyph',
            `pagine=${sc.json.pagine} problemi=${(sc.json.problemi || []).join(' / ') || '(nessuno)'}`,
            'Una pagina indicizzata. Se 0, guarda tecnici e sitemap'
          )
        } else {
          registra(
            'H2',
            sc.status === 504 || sc.status === 403 ? 'atteso' : 'fallito',
            'Scansione StrangeGlyph',
            `HTTP ${sc.status} ${(sc.testo || '').slice(0, 200)}`,
            'Non lanciare scansione senza ?sito='
          )
        }
      } catch (e) {
        registra('H2', /504|esaurito/i.test(e.message) ? 'atteso' : 'fallito', 'Scansione StrangeGlyph', e.message, '')
      }
      try {
        const diag = await httpJson(`${basePannello}/api/cron/diagnosi`, { headers: header }, 90000)
        if (diag.json && typeof diag.json.proposte === 'number') {
          registra(
            'H3',
            'ok',
            'Diagnosi',
            `proposte=${diag.json.proposte} problemi=${(diag.json.problemi || []).slice(0, 3).join(' / ') || '(nessuno)'}`,
            ''
          )
        } else {
          registra(
            'H3',
            diag.status === 504 || diag.status === 403 ? 'atteso' : 'fallito',
            'Diagnosi',
            `HTTP ${diag.status} ${(diag.testo || '').slice(0, 200)}`,
            ''
          )
        }
      } catch (e) {
        registra('H3', /504|esaurito/i.test(e.message) ? 'atteso' : 'fallito', 'Diagnosi', e.message, '')
      }
      try {
        const ver = await httpJson(`${basePannello}/api/cron/verifica`, { headers: header }, 60000)
        if (ver.json && typeof ver.json.verificate === 'number') {
          registra(
            'H4',
            'ok',
            'Verifica a 14 giorni',
            `verificate=${ver.json.verificate} (zero e normale senza modifiche vecchie)`,
            ''
          )
        } else {
          registra('H4', ver.status === 403 ? 'atteso' : 'fallito', 'Verifica a 14 giorni', `HTTP ${ver.status}`, '')
        }
      } catch (e) {
        registra('H4', 'fallito', 'Verifica a 14 giorni', e.message, '')
      }
    }
  } else {
    registra('H0', 'saltato', 'Ciclo notturno', 'non richiesto. Rilancia con --cron', 'npm run verifica -- --cron')
  }

  if (sitiScrivi) {
    registra(
      'I0',
      'saltato',
      'Approva e Annulla',
      'Lo script non scrive da solo sui siti. Segui docs/istruzioni-claude.md capitolo I: una proposta titolo su brignole.ch, poi Annulla nella stessa sessione.',
      'Chiedi a Claudio conferma, poi applica via pannello o POST /api/azioni/applica con sessione'
    )
  } else {
    registra('I0', 'saltato', 'Approva e Annulla', '--siti non passato (scrittura sui siti vietata in autonomia)', '')
  }

  if (conn) await conn.end()

  prove.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))

  const conta = { ok: 0, fallito: 0, atteso: 0, saltato: 0 }
  for (const p of prove) conta[p.esito]++

  console.log(`Rapporto prova Regia SEO`)
  console.log(`base: ${basePannello}`)
  console.log(`quando: ${new Date().toISOString()}`)
  console.log('')
  console.log(
    'id'.padEnd(6) +
      'esito'.padEnd(10) +
      'controllo'.padEnd(38) +
      'risultato'
  )
  console.log('-'.repeat(110))
  for (const p of prove) {
    console.log(
      p.id.padEnd(6) +
        p.esito.padEnd(10) +
        p.titolo.slice(0, 36).padEnd(38) +
        p.dettaglio.replace(/\s+/g, ' ')
    )
    if (p.cosaFare && p.esito !== 'ok') {
      console.log('      -> ' + p.cosaFare)
    }
  }
  console.log('-'.repeat(110))
  console.log(
    `ok ${conta.ok}  fallito ${conta.fallito}  atteso ${conta.atteso}  saltato ${conta.saltato}`
  )

  if (conta.fallito) {
    console.log('\nCi sono fallimenti veri. Non dire che l impianto e a posto.')
    process.exit(1)
  }
  console.log('\nNessun fallimento vero. Leggi gli attesi: dipendono da inviti, JSON BL o token Ads di prova.')
}

main().catch((e) => {
  console.error('Lo script si e fermato:', e.message)
  process.exit(1)
})
