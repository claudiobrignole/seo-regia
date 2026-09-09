import { query, unaRiga } from '@/lib/db'
import type { Sito } from '@/siti.config'

/**
 * Legge robots.txt e cerca una sitemap XML vera.
 * Una URL che risponde 200 con una pagina HTML non e una sitemap.
 */

const UA = 'RegiaSEO/1.0 (+pannello interno Brignole)'

export type FotoTecnico = {
  url: string
  stato: number
  contentType: string
  corpo: string
  eXml: boolean
}

async function scarica(url: string): Promise<FotoTecnico | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(5_000),
    })
    const contentType = res.headers.get('content-type') ?? ''
    const corpo = (await res.text()).slice(0, 80_000)
    return {
      url,
      stato: res.status,
      contentType,
      corpo,
      eXml: eXml(corpo, contentType),
    }
  } catch {
    return null
  }
}

export function eXml(corpo: string, contentType: string): boolean {
  const inizio = corpo.trimStart().slice(0, 200).toLowerCase()
  if (inizio.startsWith('<!doctype html') || inizio.startsWith('<html')) return false
  if (inizio.startsWith('<?xml') || inizio.startsWith('<urlset') || inizio.startsWith('<sitemapindex')) {
    return true
  }
  const t = contentType.toLowerCase()
  return t.includes('xml') && !t.includes('html')
}

export function sitemapNelRobots(corpo: string): string[] {
  const out: string[] = []
  for (const riga of corpo.split(/\r?\n/)) {
    const m = riga.match(/^\s*sitemap:\s*(\S+)/i)
    if (m?.[1]) out.push(m[1].trim())
  }
  return out
}

function hostDi(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function stessoHost(url: string, dominio: string): boolean {
  return hostDi(url) === dominio.replace(/^www\./, '')
}

async function salva(
  s: Sito,
  tipo: 'robots' | 'sitemap',
  foto: FotoTecnico,
  extra?: unknown
) {
  await query(
    `INSERT INTO tecnici (sito_id, tipo, url, stato_http, content_type, e_xml, corpo, extra)
     VALUES (?,?,?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE
       url=VALUES(url), stato_http=VALUES(stato_http), content_type=VALUES(content_type),
       e_xml=VALUES(e_xml), corpo=VALUES(corpo), extra=VALUES(extra), aggiornato_il=CURRENT_TIMESTAMP`,
    [
      s.id,
      tipo,
      foto.url.slice(0, 760),
      foto.stato,
      foto.contentType.slice(0, 128),
      foto.eXml ? 1 : 0,
      tipo === 'robots' ? foto.corpo : foto.eXml ? foto.corpo.slice(0, 20_000) : foto.corpo.slice(0, 400),
      extra ? JSON.stringify(extra) : null,
    ]
  )
}

export async function leggiRobotsPubblico(dominio: string): Promise<string | null> {
  const foto = await scarica(`https://${dominio}/robots.txt`)
  if (!foto || foto.stato >= 400) return null
  return foto.corpo
}

/** Aggiorna la fotografia robots + migliore sitemap XML. */
export async function raccogliTecnici(s: Sito): Promise<void> {
  const robotsUrl = `https://${s.dominio}/robots.txt`
  const robots = (await scarica(robotsUrl)) ?? {
    url: robotsUrl,
    stato: 0,
    contentType: '',
    corpo: '',
    eXml: false,
  }
  await salva(s, 'robots', robots)

  const daRobots = sitemapNelRobots(robots.corpo)
  const sulloStessoHost = daRobots.filter((u) => stessoHost(u, s.dominio))
  const suAltroHost = daRobots.filter((u) => !stessoHost(u, s.dominio))
  const candidati = [
    ...sulloStessoHost,
    `https://${s.dominio}/sitemap_index.xml`,
    `https://${s.dominio}/sitemap.xml`,
    ...suAltroHost,
  ]
  const visti = new Set<string>()
  const prove: { url: string; stato: number; xml: boolean }[] = []
  let migliore: FotoTecnico | null = null

  for (const url of candidati) {
    if (visti.has(url)) continue
    visti.add(url)
    const foto = await scarica(url)
    if (!foto) {
      prove.push({ url, stato: 0, xml: false })
      continue
    }
    prove.push({ url: foto.url, stato: foto.stato, xml: foto.eXml })
    if (foto.eXml && foto.stato < 400 && !migliore) migliore = foto
  }

  if (migliore) {
    await salva(s, 'sitemap', migliore, { candidati: prove })
  } else {
    const ultima = await scarica(`https://${s.dominio}/sitemap.xml`)
    await salva(
      s,
      'sitemap',
      ultima ?? {
        url: `https://${s.dominio}/sitemap.xml`,
        stato: 0,
        contentType: '',
        corpo: '',
        eXml: false,
      },
      { candidati: prove }
    )
  }
}

export async function tecnico(sitoId: string, tipo: 'robots' | 'sitemap') {
  return unaRiga<{
    url: string
    stato_http: number | null
    content_type: string | null
    e_xml: number
    corpo: string | null
    extra: unknown
  }>(`SELECT url, stato_http, content_type, e_xml, corpo, extra FROM tecnici WHERE sito_id = ? AND tipo = ?`, [
    sitoId,
    tipo,
  ])
}
