import { query } from '@/lib/db'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'
import { urlConImpressioni } from './soglie'

function normalizza(t: string): string {
  return t.toLowerCase().replace(/\s+/g, ' ').trim()
}

export const regolaPagina: Regola = {
  nome: 'pagina',
  descrizione: 'H1, canonical, testo corto o lingua assente, solo su pagine gia viste in ricerca',

  async esegui(s: Sito): Promise<Proposta[]> {
    const viste = await urlConImpressioni(s.id)
    if (viste.size === 0) return []

    const pagine = await query<{
      url: string
      titolo: string | null
      h1: string | null
      ha_canonical: number
      parole: number | null
      lingua: string | null
    }>(
      `SELECT url, titolo, h1, ha_canonical, parole, lingua
         FROM pagine
        WHERE sito_id = ? AND stato_http = 200`,
      [s.id]
    )

    const proposte: Proposta[] = []
    const lingue = new Set(s.lingue.map((l) => l.toLowerCase().slice(0, 2)))

    for (const p of pagine) {
      if (!viste.has(p.url)) continue
      const impressioni = viste.get(p.url) ?? 0

      if (!p.h1 || !p.h1.trim()) {
        proposte.push({
          regola: 'pagina',
          bersaglio: p.url,
          campo: 'h1',
          valoreVecchio: p.h1,
          valoreNuovo: '',
          motivo: `La pagina e vista in ricerca (${impressioni.toLocaleString('it-CH')} impressioni) ma non ha un titolo in pagina (H1). Chi arriva non capisce dove si trova.`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      } else if (p.titolo && normalizza(p.h1) !== normalizza(p.titolo) && p.h1.length > 8 && p.titolo.length > 8) {
        const stessoInizio = normalizza(p.h1).slice(0, 24) === normalizza(p.titolo).slice(0, 24)
        if (!stessoInizio) {
          proposte.push({
            regola: 'pagina',
            bersaglio: p.url,
            campo: 'h1',
            valoreVecchio: p.h1,
            valoreNuovo: '',
            motivo:
              `Il titolo in Google («${p.titolo}») e il titolo in pagina («${p.h1}») dicono due cose diverse. Allineali, o Google e il visitatore restano confusi.`,
            guadagnoStimato: null,
            rischio: 'da_approvare',
          })
        }
      }

      if (!p.ha_canonical) {
        proposte.push({
          regola: 'pagina',
          bersaglio: p.url,
          campo: 'canonical',
          valoreVecchio: null,
          valoreNuovo: '',
          motivo: `Manca il canonical. Se la stessa pagina esiste con parametri o www, Google puo contarla due volte e diluire i clic.`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      }

      if ((p.parole ?? 0) > 0 && (p.parole ?? 0) < 120 && impressioni >= 80) {
        proposte.push({
          regola: 'pagina',
          bersaglio: p.url,
          campo: 'spessore',
          valoreVecchio: String(p.parole),
          valoreNuovo: '',
          motivo: `Questa pagina e vista (${impressioni.toLocaleString('it-CH')} impressioni) ma ha solo ${p.parole} parole: troppo magra per essere citata o per convincere chi arriva.`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      }

      const lang = (p.lingua ?? '').toLowerCase().slice(0, 2)
      if (!lang) {
        proposte.push({
          regola: 'pagina',
          bersaglio: p.url,
          campo: 'lingua',
          valoreVecchio: p.lingua,
          valoreNuovo: '',
          motivo: `Manca l attributo lingua sulla pagina. Sui siti in piu lingue (come questo: ${s.lingue.join(', ')}) le versioni si pestano i piedi.`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      } else if (lingue.size && !lingue.has(lang)) {
        proposte.push({
          regola: 'pagina',
          bersaglio: p.url,
          campo: 'lingua',
          valoreVecchio: p.lingua,
          valoreNuovo: '',
          motivo: `La pagina dichiara lingua «${p.lingua}», che non e tra quelle del sito (${s.lingue.join(', ')}).`,
          guadagnoStimato: null,
          rischio: 'da_approvare',
        })
      }
    }

    return proposte.slice(0, 40)
  },
}
