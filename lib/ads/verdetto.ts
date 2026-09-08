import { query, unaRiga } from '@/lib/db'
import type { Identita } from '@/lib/raccolta/google'

type Consiglio = 'continua' | 'ottimizza' | 'pausa' | 'cancella'

export async function emettiVerdetti(): Promise<number> {
  const campagne = await query<{ google_id: string; identita: Identita; nome: string; stato: string | null }>(
    `SELECT google_id, identita, nome, stato FROM campagne`
  )
  let n = 0
  for (const c of campagne) {
    const ultimo = await unaRiga<{ quando: Date | string }>(
      `SELECT quando FROM campagne_verdetti
        WHERE identita = ? AND campagna_google_id = ?
        ORDER BY quando DESC LIMIT 1`,
      [c.identita, c.google_id]
    )
    if (ultimo && giorniFa(ultimo.quando) < 6) continue
    const stats = await statsGiorni(c.identita, c.google_id, 14)
    const v = giudica(c.identita, c.nome, stats)
    await query(
      `INSERT INTO campagne_verdetti (identita, campagna_google_id, giorni, consiglio, pro, contro, motivo)
       VALUES (?,?,14,?,?,?,?)`,
      [c.identita, c.google_id, v.consiglio, v.pro, v.contro, v.motivo]
    )
    n++
  }
  return n
}

function giorniFa(quando: Date | string): number {
  const t = typeof quando === 'string' ? new Date(quando).getTime() : quando.getTime()
  return (Date.now() - t) / 86400000
}

async function statsGiorni(identita: Identita, id: string, giorni: number) {
  const r = await unaRiga<{
    clic: number
    impressioni: number
    costo: number
    conversioni: number
    giorni_con_dati: number
  }>(
    `SELECT COALESCE(SUM(clic),0) AS clic, COALESCE(SUM(impressioni),0) AS impressioni,
            COALESCE(SUM(costo),0) AS costo, COALESCE(SUM(conversioni),0) AS conversioni,
            COUNT(*) AS giorni_con_dati
       FROM campagne_giorni
      WHERE identita = ? AND campagna_google_id = ?
        AND giorno >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [identita, id, giorni]
  )
  const clic = Number(r?.clic ?? 0)
  const impressioni = Number(r?.impressioni ?? 0)
  return {
    clic,
    impressioni,
    costo: Number(r?.costo ?? 0),
    conversioni: Number(r?.conversioni ?? 0),
    giorni: Number(r?.giorni_con_dati ?? 0),
    ctr: impressioni ? clic / impressioni : 0,
    cpc: clic ? Number(r?.costo ?? 0) / clic : 0,
  }
}

type Stats = {
  clic: number
  impressioni: number
  costo: number
  conversioni: number
  giorni: number
  ctr: number
  cpc: number
}

function giudica(identita: Identita, nome: string, s: Stats): { consiglio: Consiglio; pro: string; contro: string; motivo: string } {
  if (s.giorni < 3 || s.impressioni < 50) {
    return {
      consiglio: 'continua',
      pro: `${nome}: ancora pochi dati (${s.giorni} giorni, ${s.impressioni} impressioni).`,
      contro: 'Non si puo giudicare il rendimento.',
      motivo: 'Aspetta almeno una settimana di raccolta prima di mettere in pausa.',
    }
  }

  if (identita === 'biography-library') {
    if (s.ctr > 0 && s.ctr < 0.05) {
      return {
        consiglio: 'ottimizza',
        pro: `Il Grants sta venendo usato (${s.clic} clic).`,
        contro: `Tasso di clic ${(s.ctr * 100).toFixed(2)} per cento, sotto la soglia del cinque. Rischio sospensione.`,
        motivo: 'Togli parole generiche e annunci deboli. Non aggiungere spesa a pagamento su questo account.',
      }
    }
    if (s.conversioni < 1 && s.giorni >= 20) {
      return {
        consiglio: 'ottimizza',
        pro: `${s.clic} clic nel periodo.`,
        contro: 'Nessuna conversione tracciata: il Grants ne chiede almeno una al mese.',
        motivo: 'Controlla il tracciamento e la pagina di atterraggio. Destinazione solo biographylibrary.org.',
      }
    }
    return {
      consiglio: 'continua',
      pro: `Tasso di clic ${(s.ctr * 100).toFixed(2)} per cento, ${s.conversioni} conversioni. Quota Grants, non soldi Brignole.`,
      contro: s.ctr < 0.08 ? 'Il tasso di clic e accettabile ma non largo: tieni d occhio le parole nuove.' : 'Nessun allarme di conformita in questo periodo.',
      motivo: 'Restare dentro le regole Grants conta piu del volume.',
    }
  }

  if (s.costo > 20 && s.conversioni < 1 && s.clic > 40) {
    return {
      consiglio: 'pausa',
      pro: `${s.clic} clic raccolti, c e materiale per capire le parole.`,
      contro: `Spesi ${s.costo.toFixed(2)} senza conversioni.`,
      motivo: 'Metti in pausa le parole a zero conversioni e alto costo. Non cancellare ancora: serve lo storico.',
    }
  }
  if (s.ctr > 0 && s.ctr < 0.02 && s.impressioni > 500) {
    return {
      consiglio: 'ottimizza',
      pro: `Visibilita c e (${s.impressioni} impressioni).`,
      contro: `Tasso di clic ${(s.ctr * 100).toFixed(2)} per cento: l annuncio non convince.`,
      motivo: 'Riscrivi titoli con la query vera. Budget invariato finche il tasso di clic non sale.',
    }
  }
  if (s.conversioni >= 1) {
    return {
      consiglio: 'continua',
      pro: `${s.conversioni} conversioni, costo ${s.costo.toFixed(2)}, CPC ${s.cpc.toFixed(2)}.`,
      contro: s.cpc > 2 ? 'Il costo per clic e alto: prova a restringere le parole.' : 'Nessun segnale grave.',
      motivo: 'Tieni attiva e sposta budget dalle parole mute verso quelle che convertono.',
    }
  }
  return {
    consiglio: 'continua',
    pro: `${s.clic} clic, spesa ${s.costo.toFixed(2)}.`,
    contro: 'Ancora senza conversioni, ma i dati non bastano per la pausa.',
    motivo: 'Altre due settimane di prova, poi si rivede.',
  }
}
