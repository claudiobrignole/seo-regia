import { query } from '@/lib/db'
import type { Regola, Proposta } from './tipi'
import type { Sito } from '@/siti.config'

export const regolaVitali: Regola = {
  nome: 'vitali',
  descrizione: 'Vitali Chrome sotto soglia: non si sistema da Approva',

  async esegui(s: Sito): Promise<Proposta[]> {
    const r = await query<{ extra: unknown; giorno: string }>(
      `SELECT extra, giorno FROM misure
        WHERE sito_id = ? AND fonte = 'crux' AND tipo_chiave = 'sito'
        ORDER BY giorno DESC LIMIT 1`,
      [s.id]
    )
    const extra = parseExtra(r[0]?.extra)
    if (!extra || extra.passano === true) return []
    if (extra.mancanoDati) return []

    const pezzi = [
      extra.lcp ? `LCP ${extra.lcp}` : null,
      extra.inp ? `INP ${extra.inp}` : null,
      extra.cls ? `CLS ${extra.cls}` : null,
    ].filter(Boolean)

    return [
      {
        regola: 'vitali',
        bersaglio: `https://${s.dominio}/`,
        campo: 'vitali',
        valoreVecchio: null,
        valoreNuovo: '',
        motivo:
          `I vitali Chrome su ${s.dominio} non passano (${pezzi.join(', ') || 'soglia non rispettata'}). ` +
          `Il pannello non sistema tema o hosting da Approva. Chiedi a chi cura il sito: LCP sotto 2,5 s, INP sotto 200 ms, CLS sotto 0,1.`,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      },
    ]
  },
}

export const regolaMerchant: Regola = {
  nome: 'merchant',
  descrizione: 'Schede prodotto rifiutate o in attesa nel Merchant Center',

  async esegui(s: Sito): Promise<Proposta[]> {
    if (s.id !== 'aelle-store') return []
    const righe = await query<{ chiave: string; extra: unknown }>(
      `SELECT chiave, extra FROM misure
        WHERE sito_id = ? AND fonte = 'merchant' AND tipo_chiave = 'prodotto'
          AND giorno >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        ORDER BY giorno DESC`,
      [s.id]
    )
    const viste = new Set<string>()
    const proposte: Proposta[] = []
    for (const r of righe) {
      if (viste.has(r.chiave)) continue
      viste.add(r.chiave)
      const extra = parseExtra(r.extra)
      if (extra?.stato === 'approvato') continue
      proposte.push({
        regola: 'merchant',
        bersaglio: r.chiave,
        campo: 'prodotto',
        valoreVecchio: extra?.stato ?? null,
        valoreNuovo: '',
        motivo:
          `Merchant Center: ${extra?.motivo ?? 'scheda non approvata'}. ` +
          `Si sistema su Ecwid o in Merchant, non da Approva sul titolo SEO.`,
        guadagnoStimato: null,
        rischio: 'da_approvare',
      })
      if (proposte.length >= 30) break
    }
    return proposte
  },
}

function parseExtra(v: unknown): Record<string, any> | null {
  if (!v) return null
  if (typeof v === 'object') return v as Record<string, any>
  if (typeof v === 'string') {
    try {
      return JSON.parse(v)
    } catch {
      return null
    }
  }
  return null
}
