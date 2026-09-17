import { query, unaRiga } from '@/lib/db'
import { SITI } from '@/siti.config'
import { coperturaInItaliano } from '@/lib/regole/indicizzazione'

/**
 * Rapporto del lunedi: solo le differenze rispetto alla settimana prima,
 * piu le note di indicizzazione nuove e il briefing urgente/importante.
 */

export type BloccoRapporto = {
  titolo: string
  testo: string
}

export async function rapportoSettimanale(): Promise<{ titolo: string; blocchi: BloccoRapporto[]; testo: string }> {
  const blocchi: BloccoRapporto[] = []

  for (const s of SITI.filter((x) => x.searchConsole)) {
    const sett = await query<{ giorno: string; impressioni: number; clic: number; extra: any }>(
      `SELECT giorno, impressioni, clic, extra FROM misure
        WHERE sito_id = ? AND fonte = 'copertura' AND tipo_chiave = 'sito'
        ORDER BY giorno DESC LIMIT 2`,
      [s.id]
    )
    if (!sett.length) {
      blocchi.push({
        titolo: s.nome,
        testo: 'Ancora nessuna riga di copertura settimanale. Arriva dopo il primo lunedi di ispezioni.',
      })
      continue
    }

    const ora = sett[0]
    const prima = sett[1]
    let extraOra: any = ora.extra
    if (typeof extraOra === 'string') {
      try {
        extraOra = JSON.parse(extraOra)
      } catch {
        extraOra = {}
      }
    }

    const linee: string[] = []
    const ind = Number(ora.impressioni ?? 0)
    const imp = Number(ora.clic ?? 0)
    linee.push(
      `Pagine indicizzate (PASS): ${ind}` +
        (prima ? ` (settimana prima: ${Number(prima.impressioni ?? 0)})` : '')
    )
    linee.push(
      `Pagine con impressioni (7 giorni): ${imp}` +
        (prima ? ` (settimana prima: ${Number(prima.clic ?? 0)})` : '')
    )
    if (extraOra?.pagine_non_indicizzate != null) {
      linee.push(`Non (pienamente) indicizzate: ${extraOra.pagine_non_indicizzate}`)
    }
    if (Array.isArray(extraOra?.motivi) && extraOra.motivi.length) {
      linee.push(
        'Motivi piu frequenti: ' +
          extraOra.motivi.map((m: any) => `${coperturaInItaliano(m.testo)} (${m.quante})`).join('; ')
      )
    }

    if (prima) {
      const dInd = ind - Number(prima.impressioni ?? 0)
      const dImp = imp - Number(prima.clic ?? 0)
      if (dInd !== 0) linee.push(`Differenza indicizzate: ${dInd > 0 ? '+' : ''}${dInd}`)
      if (dImp !== 0) linee.push(`Differenza con impressioni: ${dImp > 0 ? '+' : ''}${dImp}`)
      if (dInd === 0 && dImp === 0) linee.push('Nessuna differenza rispetto alla settimana prima su questi due numeri.')
    }

    const entrate = await query<{ url: string }>(
      `SELECT url FROM indicizzazione
        WHERE sito_id = ? AND esito_chiamata = 'ok' AND verdetto = 'PASS'
          AND aggiornato_il >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        LIMIT 15`,
      [s.id]
    )
    const uscite = await query<{ url: string; copertura: string | null }>(
      `SELECT url, copertura FROM indicizzazione
        WHERE sito_id = ? AND esito_chiamata = 'ok' AND verdetto IN ('FAIL','PARTIAL','NEUTRAL')
          AND aggiornato_il >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        LIMIT 15`,
      [s.id]
    )
    if (entrate.length) {
      linee.push(`Entrate recenti nell indice (campione): ${entrate.length}`)
      for (const e of entrate.slice(0, 5)) linee.push(`  + ${e.url}`)
    }
    if (uscite.length) {
      linee.push(`Problematiche recenti (campione): ${uscite.length}`)
      for (const u of uscite.slice(0, 5)) {
        linee.push(`  - ${u.url} (${coperturaInItaliano(u.copertura)})`)
      }
    }

    blocchi.push({ titolo: s.nome, testo: linee.join('\n') })
  }

  const noteNuove = await query<{ sito_id: string; motivo: string; bersaglio: string }>(
    `SELECT sito_id, motivo, bersaglio FROM azioni
      WHERE regola = 'indicizzazione' AND stato IN ('proposta','fallita')
        AND creata_il >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY id DESC LIMIT 20`
  )
  if (noteNuove.length) {
    blocchi.push({
      titolo: 'Note di indicizzazione della settimana',
      testo: noteNuove.map((n) => `[${n.sito_id}] ${n.bersaglio}\n  ${n.motivo}`).join('\n\n'),
    })
  }

  const titolo = `Rapporto indicizzazione, settimana del ${new Date().toISOString().slice(0, 10)}`
  const testo = [`# ${titolo}`, '', ...blocchi.flatMap((b) => [`## ${b.titolo}`, b.testo, ''])].join('\n')
  return { titolo, blocchi, testo }
}

/** Invia il rapporto se RESEND_API_KEY e RAPPORTO_EMAIL ci sono. Altrimenti non fa niente. */
export async function inviaRapportoSeConfigurato(): Promise<{ inviato: boolean; motivo?: string }> {
  const chiave = process.env.RESEND_API_KEY?.trim()
  const a = process.env.RAPPORTO_EMAIL?.trim()
  if (!chiave || !a) {
    return { inviato: false, motivo: 'Mancano RESEND_API_KEY o RAPPORTO_EMAIL: il rapporto resta solo in /rapporto.' }
  }

  const { titolo, testo } = await rapportoSettimanale()
  const html = `<pre style="font-family:ui-monospace,monospace;white-space:pre-wrap;font-size:14px;line-height:1.45">${testo
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')}</pre>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${chiave}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.RAPPORTO_DA?.trim() || 'Regia SEO <onboarding@resend.dev>',
      to: [a],
      subject: titolo,
      html,
      text: testo,
    }),
  })

  if (!res.ok) {
    const corpo = await res.text()
    throw new Error(`Resend HTTP ${res.status}: ${corpo.slice(0, 300)}`)
  }
  return { inviato: true }
}
