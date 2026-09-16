import { query, unaRiga } from '@/lib/db'
import { SITI, type Sito } from '@/siti.config'
import { CAMPI_DA_MODIFICARE } from '@/lib/azioni-viste'
import { caricaAzione, type Azione } from '@/lib/registro'
import { queryDellaPagina } from '@/lib/regole/testi'
import { propostaIntoccabile } from '@/lib/siti/archivio-aelle'
import type { BozzaContenuto } from '@/lib/ads/bozza'
import type { Identita } from '@/lib/raccolta/google'

/**
 * Il dossier che Claude legge prima di rispondere.
 *
 * Senza questo la chat direbbe cose plausibili e generiche. Con questo dice
 * numeri veri e sa cosa puo e cosa non puo proporre: le mosse permesse
 * dipendono da cosa e quell oggetto, non da come e formulata la domanda.
 */

export type Ambito = 'azione' | 'campagna' | 'bozza'

export type TipoMossa = 'cambia_testo' | 'chiudi_proposta' | 'scarta_bozza' | 'ricorda'

export type Contesto = {
  ambito: Ambito
  riferimento: string
  sitoId: string | null
  identita: Identita | null
  /** L indirizzo a cui una indicazione puo essere legata, quando ce n e uno. */
  bersaglio: string | null
  dossier: string
  permesse: TipoMossa[]
  /** Cose che Claude deve sapere di non poter proporre, con il motivo. */
  divieti: string[]
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function sito(id: string): Sito | undefined {
  return SITI.find((s) => s.id === id)
}

async function numeriPagina(sitoId: string, url: string): Promise<string> {
  const r = await unaRiga<{ clic: number; impressioni: number; posizione: number | null }>(
    `SELECT COALESCE(SUM(clic),0) AS clic, COALESCE(SUM(impressioni),0) AS impressioni,
            AVG(posizione) AS posizione
       FROM misure
      WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina' AND chiave = ?
        AND giorno >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)`,
    [sitoId, url]
  )
  const clic = num(r?.clic)
  const impressioni = num(r?.impressioni)
  if (impressioni === 0) {
    return 'Search Console 28 giorni: nessuna impressione su questa pagina. Non e un guasto se il sito e nuovo o non promosso.'
  }
  const ctr = ((clic / impressioni) * 100).toFixed(2)
  const pos = r?.posizione != null ? Number(r.posizione).toFixed(1) : 'n.d.'
  return `Search Console 28 giorni: ${impressioni} impressioni, ${clic} clic, tasso di clic ${ctr} per cento, posizione media ${pos}.`
}

async function contestoAzione(id: number): Promise<Contesto> {
  const a: Azione | null = await caricaAzione(id)
  if (!a) throw new Error(`Proposta ${id} non trovata. Ricarica la pagina del sito.`)
  const s = sito(a.sito_id)
  const inCoda = a.stato === 'proposta' || a.stato === 'approvata' || a.stato === 'fallita'
  const scrivibile = CAMPI_DA_MODIFICARE.has(a.campo)
  const bloccataArchivio = await propostaIntoccabile(a.sito_id, a.bersaglio, a.campo)

  const pagina = await unaRiga<{
    titolo: string | null
    h1: string | null
    descrizione: string | null
    lingua: string | null
    parole: number | null
  }>(
    'SELECT titolo, h1, descrizione, lingua, parole FROM pagine WHERE sito_id = ? AND url = ? LIMIT 1',
    [a.sito_id, a.bersaglio]
  )
  const ricerche = a.bersaglio.startsWith('http') ? await queryDellaPagina(a.sito_id, a.bersaglio) : []
  const numeri = a.bersaglio.startsWith('http') ? await numeriPagina(a.sito_id, a.bersaglio) : ''
  const verifica = await unaRiga<{ giorni: number; clic_prima: number; clic_dopo: number; esito: string }>(
    'SELECT giorni, clic_prima, clic_dopo, esito FROM verifiche WHERE azione_id = ? ORDER BY id DESC LIMIT 1',
    [id]
  )

  const dossier = [
    `Oggetto della conversazione: una proposta del pannello, numero ${a.id}.`,
    `Sito: ${s?.nome ?? a.sito_id} (${s?.dominio ?? 'dominio sconosciuto'}), lingue ${s?.lingue.join(', ') ?? 'n.d.'}.`,
    `Come si scrive su questo sito: ${s?.scrittura.tipo ?? 'n.d.'}${
      s?.scrittura.tipo === 'github'
        ? ' (richiesta di modifica sui file in seo/, mai sul codice)'
        : ''
    }.`,
    `Regola che l ha proposta: ${a.regola}. Campo: ${a.campo}. Stato: ${a.stato}.`,
    `Indirizzo o bersaglio: ${a.bersaglio}`,
    `Motivo scritto dal pannello: ${a.motivo}`,
    `Valore ora sul sito: ${a.valore_vecchio || '(vuoto)'}`,
    `Valore proposto: ${(a.valore_nuovo || '').trim() || '(ancora vuoto: il testo non e stato scritto)'}`,
    a.guadagno_stimato != null ? `Guadagno stimato dal pannello: ${a.guadagno_stimato} clic nel periodo.` : '',
    a.errore ? `Ultimo tentativo di scrittura fallito: ${a.errore}` : '',
    pagina
      ? `Fotografia della pagina in scansione: titolo "${pagina.titolo ?? '(manca)'}", H1 "${pagina.h1 ?? '(manca)'}", descrizione "${pagina.descrizione ?? '(manca)'}", lingua ${pagina.lingua ?? 'n.d.'}, parole nel testo ${pagina.parole ?? 'n.d.'}.`
      : 'Questa pagina non e ancora nella scansione: della pagina viva non sappiamo niente.',
    numeri,
    `Ricerche che portano su questa pagina: ${ricerche.length ? ricerche.join('; ') : 'ancora nessuna registrata'}`,
    verifica
      ? `Verifica a ${verifica.giorni} giorni di una modifica passata: clic da ${verifica.clic_prima} a ${verifica.clic_dopo}, esito ${verifica.esito}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const permesse: TipoMossa[] = ['ricorda']
  const divieti: string[] = []

  if (bloccataArchivio) {
    divieti.push(
      'Questa e una pagina dell archivio 1991-2001 di Aelle Hip Hop Magazine: titolo, descrizione e H1 sono quelli originali della rivista e non si riscrivono per nessun motivo, nemmeno se il tasso di clic e basso. Puoi spiegare, non riscrivere.'
    )
  } else if (scrivibile && inCoda) {
    permesse.push('cambia_testo')
  } else if (!scrivibile) {
    divieti.push(
      `Il campo ${a.campo} non e un testo che il pannello sappia pubblicare da solo: e una nota da leggere e chiudere. Non proporre di cambiarlo, spiega cosa conviene fare a mano.`
    )
  }
  if (inCoda) permesse.push('chiudi_proposta')
  else divieti.push(`La proposta e in stato ${a.stato}: e chiusa, non si cambia piu. Si puo solo capire com e andata.`)

  return {
    ambito: 'azione',
    riferimento: String(a.id),
    sitoId: a.sito_id,
    identita: s?.identita ?? null,
    bersaglio: a.bersaglio.startsWith('http') ? a.bersaglio : null,
    dossier,
    permesse,
    divieti,
  }
}

async function contestoCampagna(riferimento: string): Promise<Contesto> {
  const [identita, googleId] = riferimento.split(':')
  if (!identita || !googleId) {
    throw new Error('Riferimento campagna incompleto. Ricarica la pagina della pubblicita.')
  }
  const c = await unaRiga<any>(
    'SELECT * FROM campagne WHERE identita = ? AND google_id = ? LIMIT 1',
    [identita, googleId]
  )
  if (!c) throw new Error(`Campagna ${googleId} non trovata in questo banco.`)

  const g = await unaRiga<any>(
    `SELECT SUM(clic) AS clic, SUM(impressioni) AS impressioni, SUM(costo) AS costo,
            SUM(conversioni) AS conversioni
       FROM campagne_giorni
      WHERE identita = ? AND campagna_google_id = ? AND giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
    [identita, googleId]
  )
  const parole = await query<{ parola: string; clic: number; impressioni: number; costo: number }>(
    `SELECT parola, SUM(clic) AS clic, SUM(impressioni) AS impressioni, SUM(costo) AS costo
       FROM campagne_parole
      WHERE identita = ? AND campagna_google_id = ? AND giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY parola ORDER BY impressioni DESC LIMIT 15`,
    [identita, googleId]
  )
  const v = await unaRiga<any>(
    `SELECT * FROM campagne_verdetti WHERE identita = ? AND campagna_google_id = ?
      ORDER BY id DESC LIMIT 1`,
    [identita, googleId]
  )
  const grants = identita === 'biography-library'
  const impressioni = num(g?.impressioni)
  const clic = num(g?.clic)

  const dossier = [
    `Oggetto della conversazione: una campagna Google Ads gia esistente.`,
    grants
      ? 'Banco Ad Grants di Biography Library: credito Google, non soldi di Claudio. Non si somma mai con il banco Brignole.'
      : 'Banco a pagamento Brignole: soldi di Claudio. Non si somma mai con il credito Grants dell associazione.',
    `Nome: ${c.nome}. Stato su Google: ${c.stato ?? 'n.d.'}. Numero: ${c.google_id}.`,
    c.sito_id ? `Sito collegato nel pannello: ${c.sito_id}.` : 'Nessun sito del pannello collegato a questa campagna.',
    c.budget_giornaliero != null ? `Budget al giorno letto da Google: ${c.budget_giornaliero}.` : '',
    impressioni
      ? `Ultimi 30 giorni: ${impressioni} impressioni, ${clic} clic, tasso di clic ${((clic / impressioni) * 100).toFixed(2)} per cento, ${grants ? 'quota usata' : 'spesa'} ${num(g?.costo).toFixed(2)}, conversioni ${num(g?.conversioni)}.`
      : 'Ultimi 30 giorni: nessun dato registrato dal pannello. O la campagna e ferma, o la raccolta Ads non e ancora passata.',
    grants
      ? 'Regole Grants che valgono qui: tasso di clic sopra il cinque per cento, destinazione solo i siti dell associazione, conversioni solo dai moduli del sito caricate di notte, niente pixel ne Analytics sulle pagine.'
      : '',
    parole.length
      ? `Parole con piu impressioni: ${parole.map((p) => `${p.parola} (${num(p.impressioni)} impressioni, ${num(p.clic)} clic)`).join('; ')}`
      : 'Nessuna parola chiave registrata negli ultimi 30 giorni.',
    v
      ? `Ultimo verdetto del pannello a ${v.giorni} giorni: ${v.consiglio}. Pro: ${v.pro} Contro: ${v.contro} Motivo: ${v.motivo}`
      : 'Il pannello non ha ancora dato un verdetto su questa campagna.',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    ambito: 'campagna',
    riferimento,
    sitoId: c.sito_id ?? null,
    identita: identita as Identita,
    bersaglio: null,
    dossier,
    permesse: ['ricorda'],
    divieti: [
      'Il pannello legge Google Ads e non ci scrive: qui non puoi mettere in pausa, cambiare budget ne toccare parole. Puoi spiegare i numeri e dire cosa conviene fare, e Claudio lo fa nel suo account Google Ads.',
    ],
  }
}

async function contestoBozza(id: number): Promise<Contesto> {
  const b = await unaRiga<any>('SELECT * FROM campagne_bozze WHERE id = ? LIMIT 1', [id])
  if (!b) throw new Error(`Bozza ${id} non trovata. Ricarica la pagina della pubblicita.`)
  let c: BozzaContenuto | null = null
  try {
    c = typeof b.contenuto === 'string' ? JSON.parse(b.contenuto) : b.contenuto
  } catch {
    c = null
  }
  const s = sito(b.sito_id)
  const grants = b.identita === 'biography-library'

  const dossier = [
    `Oggetto della conversazione: una bozza di campagna, scritta dal pannello e non ancora creata su Google.`,
    grants
      ? 'Banco Ad Grants di Biography Library: credito Google. Tetto del budget giornaliero 329, tasso di clic sopra il cinque per cento, destinazione solo i siti dell associazione.'
      : 'Banco a pagamento Brignole: soldi di Claudio.',
    `Titolo della bozza: ${b.titolo}. Stato: ${b.stato}. Sito: ${s?.nome ?? b.sito_id} (${s?.dominio ?? 'n.d.'}).`,
    c
      ? [
          `Obiettivo: ${c.obiettivo}`,
          `Rete: ${c.rete}. Budget al giorno proposto: ${c.budgetGiornaliero}. Perche: ${c.motivoBudget}`,
          `Atterraggio: ${c.atterraggio}`,
          `Lingue: ${(c.lingue ?? []).join(', ')}. Zone: ${(c.zone ?? []).join(', ')}`,
          `Parole: ${(c.parole ?? []).map((p) => `${p.testo} (${p.tipo})`).join('; ')}`,
          `Esclusioni: ${(c.esclusioni ?? []).join('; ')}`,
          `Titoli: ${(c.titoli ?? []).join(' | ')}`,
          `Descrizioni: ${(c.descrizioni ?? []).join(' | ')}`,
        ].join('\n')
      : 'Il contenuto della bozza non e leggibile: il JSON salvato e rotto.',
  ]
    .filter(Boolean)
    .join('\n')

  const permesse: TipoMossa[] = ['ricorda']
  if (b.stato === 'bozza') permesse.push('scarta_bozza')

  return {
    ambito: 'bozza',
    riferimento: String(b.id),
    sitoId: b.sito_id,
    identita: b.identita,
    bersaglio: null,
    dossier,
    permesse,
    divieti: [
      'La bozza si crea a mano su Google Ads: il pannello non schiaccia Pubblica. Puoi rivedere i testi e le parole a parole tue, e Claudio le ricopia. Da qui si puo scartare la bozza, non pubblicarla.',
    ],
  }
}

export async function contesto(ambito: Ambito, riferimento: string): Promise<Contesto> {
  if (ambito === 'azione') return contestoAzione(Number(riferimento))
  if (ambito === 'bozza') return contestoBozza(Number(riferimento))
  return contestoCampagna(riferimento)
}
