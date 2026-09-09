import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'
import { raccogliTecnici, sitemapNelRobots, stessoHost, tecnico } from '@/lib/scansione/tecnici'

/** Toglie Crawl-delay, sistema o aggiunge la riga Sitemap. */
export function robotsMigliorato(attuale: string, sitemapXml: string | null, dominio: string): string | null {
  const originale = attuale.replace(/\r\n/g, '\n').trim()
  const haDelay = /crawl-delay/i.test(originale)
  const sm = sitemapNelRobots(originale)
  const smGiusta = Boolean(sitemapXml && sm.length === 1 && sm[0] === sitemapXml)
  const smStessoDominio = sm.length > 0 && sm.every((u) => stessoHost(u, dominio))
  if (!haDelay && smGiusta) return null
  if (!haDelay && !sitemapXml && smStessoDominio) return null

  let linee = originale ? originale.split('\n') : ['User-agent: *', 'Allow: /']
  linee = linee.filter((r) => !/^\s*crawl-delay\s*:/i.test(r))
  const altre = linee.filter((r) => !/^\s*sitemap\s*:/i.test(r))
  while (altre.length && altre[altre.length - 1].trim() === '') altre.pop()
  if (sitemapXml) altre.push('', `Sitemap: ${sitemapXml}`)
  const nuovo = altre.join('\n').trim() + '\n'
  if (nuovo.trim() === originale) return null
  return nuovo
}

export const regolaRobotsSitemap: Regola = {
  nome: 'robots-sitemap',
  descrizione: 'robots.txt e sitemap XML: riga Sitemap, dominio giusto, file XML vero',

  async esegui(s: Sito): Promise<Proposta[]> {
    if (s.piattaforma === 'ecwid') return []

    try {
      const gia = await tecnico(s.id, 'robots')
      const giaSm = await tecnico(s.id, 'sitemap')
      if (!gia || !giaSm) await raccogliTecnici(s)
    } catch (e) {
      return [
        {
          regola: 'robots-sitemap',
          bersaglio: `https://${s.dominio}/robots.txt`,
          campo: 'sitemap',
          valoreVecchio: null,
          valoreNuovo: '',
          motivo:
            'Non riesco a salvare robots e sitemap nel database. Apri /api/setup/migra con la chiave, poi rilancia la diagnosi. ' +
            (e as Error).message,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        },
      ]
    }

    const r = await tecnico(s.id, 'robots')
    const sm = await tecnico(s.id, 'sitemap')
    const robotsTesto = r?.corpo ?? ''
    const sitemapXml = sm && Number(sm.e_xml) === 1 ? sm.url : null
    const proposte: Proposta[] = []

    const nuovo = robotsMigliorato(robotsTesto, sitemapXml, s.dominio)
    if (nuovo) {
      const motivi: string[] = []
      if (!sitemapNelRobots(robotsTesto).length && sitemapXml) {
        motivi.push(`Manca la riga Sitemap nel robots.txt. Va aggiunto ${sitemapXml}.`)
      }
      for (const u of sitemapNelRobots(robotsTesto)) {
        if (sitemapXml && u === sitemapXml) continue
        if (!stessoHost(u, s.dominio)) {
          motivi.push(`Il robots punta a ${u}, che non e il dominio ${s.dominio}.`)
        }
      }
      if (/crawl-delay/i.test(robotsTesto)) {
        motivi.push('Crawl-delay rallenta i motori che lo rispettano e Google lo ignora: meglio toglierlo e indicare la sitemap.')
      }
      if (!robotsTesto.trim()) {
        motivi.push('robots.txt assente o vuoto.')
      }
      if (!motivi.length) motivi.push('robots.txt va allineato alla sitemap XML trovata.')

      const come = s.scrittura.tipo === 'github'
        ? ' Approva apre una richiesta su seo/robots.txt (non sul codice). Finche il sito non lo pubblica, copia il testo anche nel robots.txt in vetrina.'
        : ' Approva lo scrive se e installato il plugin Regia robots. Altrimenti copia il testo: Rank Math in modalita avanzata, Impostazioni generali, Modifica robots.txt. Se in File Manager c e robots.txt nella radice, cancellalo prima.'

      proposte.push({
        regola: 'robots-sitemap',
        bersaglio: `https://${s.dominio}/robots.txt`,
        campo: 'robots',
        valoreVecchio: robotsTesto || null,
        valoreNuovo: nuovo,
        motivo: motivi.join(' ') + come,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      })
    }

    if (!sitemapXml) {
      const url = sm?.url ?? `https://${s.dominio}/sitemap.xml`
      proposte.push({
        regola: 'robots-sitemap',
        bersaglio: url,
        campo: 'sitemap',
        valoreVecchio: null,
        valoreNuovo: '',
        motivo:
          `All indirizzo della sitemap non c e XML, c e una pagina HTML (o manca del tutto). ` +
          (s.scrittura.tipo === 'wordpress'
            ? 'In Rank Math accendi Sitemap. Se usi LiteSpeed, escludi sitemap*.xml dalla cache. Questa nota non si applica da sola.'
            : 'Il sito deve pubblicare un sitemap.xml XML. Questa nota non si applica da sola.'),
        guadagnoStimato: null,
        rischio: 'da_approvare',
      })
    }

    return proposte
  },
}
