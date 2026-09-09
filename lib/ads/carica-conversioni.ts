import { query, unaRiga } from '@/lib/db'
import { sito } from '@/siti.config'
import { chiamaWordpress } from '@/lib/esecutori/wordpress'
import { adsPost, banco, bancoPronto, gaql } from '@/lib/ads/chiamata'

const IDENTITA = 'biography-library' as const
const NOME_AZIONE = 'Modulo sito, senza pixel'
const CHIAVE_AZIONE = 'conversion_action_id'

type RigaWp = {
  id: number
  gclid: string | null
  quando: string
  tipo_modulo: string
}

function formattaQuandoAds(quando: string): string {
  const d = new Date(quando)
  if (Number.isNaN(d.getTime())) {
    const ora = new Date()
    return `${ora.toISOString().slice(0, 10)} ${ora.toISOString().slice(11, 19)}+00:00`
  }
  const iso = d.toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}+00:00`
}

async function leggiImpostazione(chiave: string): Promise<string | null> {
  const r = await unaRiga<{ valore: string }>(
    `SELECT valore FROM grants_impostazioni WHERE chiave = ?`,
    [chiave]
  )
  return r?.valore ?? null
}

async function scriviImpostazione(chiave: string, valore: string) {
  await query(
    `INSERT INTO grants_impostazioni (chiave, valore) VALUES (?,?)
     ON DUPLICATE KEY UPDATE valore = VALUES(valore)`,
    [chiave, valore]
  )
}

async function accendiAutoTagging() {
  const b = banco(IDENTITA)
  const righe = await gaql(b, `SELECT customer.id, customer.auto_tagging_enabled FROM customer`)
  const acceso = Boolean(righe[0]?.customer?.autoTaggingEnabled)
  if (acceso) return
  await adsPost(IDENTITA, ':mutateCustomer', {
    operation: {
      update: {
        resourceName: `customers/${b.cliente}`,
        autoTaggingEnabled: true,
      },
      updateMask: 'autoTaggingEnabled',
    },
  })
}

async function idAzioneConversione(): Promise<string> {
  const daEnv = (process.env.BL_ADS_CONVERSION_ACTION_ID ?? '').trim()
  if (daEnv) return daEnv
  const salvato = await leggiImpostazione(CHIAVE_AZIONE)
  if (salvato) return salvato

  const b = banco(IDENTITA)
  const esistenti = await gaql(
    b,
    `SELECT conversion_action.id, conversion_action.name, conversion_action.type
     FROM conversion_action
     WHERE conversion_action.status != 'REMOVED'`
  )
  const gia = esistenti.find(
    (r) =>
      r.conversionAction?.name === NOME_AZIONE ||
      r.conversionAction?.type === 'UPLOAD_CLICKS'
  )
  if (gia?.conversionAction?.id) {
    const id = String(gia.conversionAction.id)
    await scriviImpostazione(CHIAVE_AZIONE, id)
    return id
  }

  const creato = await adsPost(IDENTITA, '/conversionActions:mutate', {
    operations: [
      {
        create: {
          name: NOME_AZIONE,
          type: 'UPLOAD_CLICKS',
          category: 'SUBMIT_LEAD_FORM',
          status: 'ENABLED',
          primaryForGoal: true,
        },
      },
    ],
  })
  const nomeRisorsa = creato?.results?.[0]?.resourceName as string | undefined
  const id = nomeRisorsa?.split('/').pop()
  if (!id) {
    throw new Error(
      'Google Ads non ha restituito l id dell azione di conversione. Riprova la raccolta, o crea a mano un azione di tipo caricamento clic e metti BL_ADS_CONVERSION_ACTION_ID.'
    )
  }
  await scriviImpostazione(CHIAVE_AZIONE, id)
  return id
}

async function scaricaDaWordpress(): Promise<RigaWp[]> {
  const s = sito('biography-library')
  try {
    const dati = await chiamaWordpress(s, 'regia-bl/v1/conversioni')
    const elenco = Array.isArray(dati?.conversioni) ? dati.conversioni : []
    return elenco.map((r: any) => ({
      id: Number(r.id),
      gclid: r.gclid ? String(r.gclid) : null,
      quando: String(r.quando ?? ''),
      tipo_modulo: String(r.tipo_modulo ?? 'modulo'),
    }))
  } catch (e) {
    const msg = (e as Error).message
    if (msg.includes('404')) {
      throw new Error(
        'Il plugin regia-bl-grants non risponde su biographylibrary.org. Installalo dalla cartella plugin-wp e attiva. Niente Analytics.'
      )
    }
    throw e
  }
}

async function marcaPrese(ids: number[]) {
  if (!ids.length) return
  const s = sito('biography-library')
  await chiamaWordpress(s, 'regia-bl/v1/conversioni/presa', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

async function importaNuove(): Promise<number> {
  const nuove = await scaricaDaWordpress()
  let n = 0
  const prese: number[] = []
  for (const r of nuove) {
    if (!r.id) continue
    const stato = r.gclid ? 'da_caricare' : 'senza_gclid'
    const quandoSql = r.quando
      ? r.quando.replace('T', ' ').slice(0, 19)
      : new Date().toISOString().replace('T', ' ').slice(0, 19)
    await query(
      `INSERT INTO grants_conversioni (wp_id, gclid, quando, tipo_modulo, stato)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE tipo_modulo = VALUES(tipo_modulo)`,
      [r.id, r.gclid, quandoSql, r.tipo_modulo, stato]
    )
    prese.push(r.id)
    n++
  }
  await marcaPrese(prese)
  return n
}

async function caricaPendenti(azioneId: string): Promise<number> {
  const b = banco(IDENTITA)
  const pendenti = await query<{
    id: number
    wp_id: number | null
    gclid: string
    quando: Date | string
  }>(
    `SELECT id, wp_id, gclid, quando FROM grants_conversioni
      WHERE stato IN ('da_caricare','errore') AND gclid IS NOT NULL AND gclid != ''
      ORDER BY id ASC LIMIT 50`
  )
  if (!pendenti.length) return 0

  const conversions = pendenti.map((r) => ({
    gclid: r.gclid,
    conversionAction: `customers/${b.cliente}/conversionActions/${azioneId}`,
    conversionDateTime: formattaQuandoAds(String(r.quando)),
    orderId: `bl-${r.wp_id ?? r.id}`,
  }))

  const esito = await adsPost(IDENTITA, ':uploadClickConversions', {
    conversions,
    partialFailure: true,
  })

  const indiciErrati = new Set<number>()
  for (const d of esito?.partialFailureError?.details ?? []) {
    for (const e of d.errors ?? []) {
      const i = e.location?.fieldPathElements?.find((p: any) => p.fieldName === 'conversions')?.index
      if (typeof i === 'number') indiciErrati.add(i)
    }
  }

  let ok = 0
  for (let i = 0; i < pendenti.length; i++) {
    const riga = pendenti[i]
    if (indiciErrati.has(i)) {
      const msg =
        (esito?.partialFailureError?.details ?? [])
          .flatMap((d: any) => d.errors ?? [])
          .find((e: any) => e.location?.fieldPathElements?.some((p: any) => p.index === i))
          ?.message ?? 'Google ha rifiutato questa riga. Si ritenta la notte dopo.'
      await query(
        `UPDATE grants_conversioni SET stato = 'errore', messaggio = ?, tentativi = tentativi + 1 WHERE id = ?`,
        [String(msg).slice(0, 500), riga.id]
      )
    } else {
      await query(
        `UPDATE grants_conversioni SET stato = 'caricata', messaggio = NULL, caricata_il = NOW(), tentativi = tentativi + 1 WHERE id = ?`,
        [riga.id]
      )
      ok++
    }
  }
  return ok
}

/**
 * Solo identita Biography Library. Accende auto-tagging e azione di
 * conversione se mancano, legge i moduli dal plugin WordPress, carica su Ads.
 * Non tocca campagne. Non usa il token Brignole.
 */
export async function caricaConversioniGrants(): Promise<number> {
  const b = banco(IDENTITA)
  if (!bancoPronto(b)) {
    console.warn('[grants] credenziali Ads assenti, upload saltato')
    return 0
  }

  await accendiAutoTagging()
  const azioneId = await idAzioneConversione()
  const importate = await importaNuove()
  const caricate = await caricaPendenti(azioneId)
  return importate + caricate
}
