import { query, unaRiga } from '@/lib/db'
import { conversa, type Battuta } from '@/lib/modelli/completa'
import { bloccoIndicazioni, ricorda, type PortataMemoria } from '@/lib/memoria'
import { aggiornaValoreNuovo, annota, segnaRifiutata } from '@/lib/registro'
import { contesto, type Ambito, type Contesto, type TipoMossa } from './contesto'

/**
 * La chat interna del pannello.
 *
 * Claude spiega e propone; nessuna mossa parte da sola. Ogni cambiamento passa
 * da un pulsante di Claudio, e resta scritto nella conversazione: fra un mese si
 * puo rileggere perche quel titolo e diventato quello e non un altro.
 *
 * Le mosse permesse le decide il dossier (vedi contesto.ts), non la domanda: se
 * la proposta e su un articolo dell archivio Aelle, cambia_testo non esiste.
 */

export type Mossa = {
  tipo: TipoMossa
  /** cambia_testo: il testo nuovo. */
  valore?: string
  /** ricorda: la frase da tenere a memoria. */
  testo?: string
  /** ricorda: su tutti i siti, su questo sito, su questo indirizzo. */
  ambito?: PortataMemoria
  perche?: string
  /** Riempita quando Claudio ha premuto il pulsante: non si rifa due volte. */
  eseguita_il?: string
}

export type MessaggioChat = {
  id: number
  ruolo: 'claudio' | 'claude'
  testo: string
  mosse: Mossa[]
  quando: Date | string
}

/** Quante battute passate rileggere. Oltre, la conversazione costa e non serve. */
const STORIA = 20
const DOMANDA_MAX = 4000
const BATTUTA_MAX = 4000

const APRI = '<<<MOSSE'
const CHIUDI = 'MOSSE>>>'

const SPIEGA_MOSSA: Record<TipoMossa, string> = {
  cambia_testo:
    'cambia_testo: mette un testo diverso nella proposta, senza toccare il sito. Serve "valore" con il testo pronto.',
  chiudi_proposta:
    'chiudi_proposta: chiude la proposta senza toccare il sito, e resta nello storico. Serve "perche".',
  scarta_bozza: 'scarta_bozza: sposta la bozza fra quelle scartate. Serve "perche".',
  ricorda:
    'ricorda: registra una indicazione nella memoria del pannello, e da quel momento entra nelle istruzioni di tutti i testi che scrivero. Serve "testo" e "ambito", dove ambito e "tutti" per ogni sito, "sito" per questo sito, "pagina" per questo indirizzo.',
}

const ETICHETTA_MOSSA: Record<TipoMossa, string> = {
  cambia_testo: 'Usa questo testo',
  chiudi_proposta: 'Chiudi la proposta',
  scarta_bozza: 'Scarta la bozza',
  ricorda: 'Ricorda questa indicazione',
}

export function etichettaMossa(m: Mossa): string {
  return ETICHETTA_MOSSA[m.tipo] ?? 'Fai questo'
}

function senzaTrattinoLungo(t: string): string {
  return t.replace(/\u2014/g, '-')
}

function leggiMosse(v: unknown): Mossa[] {
  if (!v) return []
  if (Array.isArray(v)) return v as Mossa[]
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v)
      return Array.isArray(p) ? (p as Mossa[]) : []
    } catch {
      return []
    }
  }
  return []
}

async function idConversazione(c: Contesto, creando: boolean): Promise<number | null> {
  const esiste = await unaRiga<{ id: number }>(
    'SELECT id FROM conversazioni WHERE ambito = ? AND riferimento = ? LIMIT 1',
    [c.ambito, c.riferimento]
  )
  if (esiste) return esiste.id
  if (!creando) return null
  const res = await query<any>(
    'INSERT INTO conversazioni (ambito, riferimento, sito_id, identita) VALUES (?,?,?,?)',
    [c.ambito, c.riferimento, c.sitoId, c.identita]
  )
  return (res as any).insertId ?? null
}

async function messaggiDi(conversazioneId: number): Promise<MessaggioChat[]> {
  const righe = await query<any>(
    `SELECT id, ruolo, testo, mosse, quando FROM messaggi
      WHERE conversazione_id = ? ORDER BY id DESC LIMIT ${STORIA}`,
    [conversazioneId]
  )
  return righe.reverse().map((r) => ({
    id: Number(r.id),
    ruolo: r.ruolo,
    testo: String(r.testo),
    mosse: leggiMosse(r.mosse),
    quando: r.quando,
  }))
}

/** La conversazione di un oggetto, per riaprirla dove era rimasta. */
export async function leggiConversazione(
  ambito: Ambito,
  riferimento: string
): Promise<{ messaggi: MessaggioChat[] }> {
  const c = await unaRiga<{ id: number }>(
    'SELECT id FROM conversazioni WHERE ambito = ? AND riferimento = ? LIMIT 1',
    [ambito, riferimento]
  )
  if (!c) return { messaggi: [] }
  return { messaggi: await messaggiDi(c.id) }
}

/** Quante battute ha ogni oggetto, per dirlo sul pulsante senza aprire la chat. */
export async function conteggioPerAmbito(
  ambito: Ambito,
  sitoId?: string | null
): Promise<Map<string, number>> {
  try {
    const righe = await query<{ riferimento: string; n: number }>(
      `SELECT c.riferimento, COUNT(m.id) AS n
         FROM conversazioni c
         INNER JOIN messaggi m ON m.conversazione_id = c.id
        WHERE c.ambito = ?${sitoId ? ' AND c.sito_id = ?' : ''}
        GROUP BY c.riferimento`,
      sitoId ? [ambito, sitoId] : [ambito]
    )
    return new Map(righe.map((r) => [String(r.riferimento), Number(r.n)]))
  } catch {
    // Tabelle non ancora create: il pulsante dira solo Chiedi a Claude.
    return new Map()
  }
}

function istruzioni(c: Contesto, memoria: string): string {
  const mosse = c.permesse.map((t) => `- ${SPIEGA_MOSSA[t]}`).join('\n')
  return [
    'Sei il consulente del pannello Regia SEO di Claudio Brignole. Parli con Claudio, che non programma.',
    '',
    'Come rispondi:',
    '- In italiano, corto, senza anglicismi dove esiste il termine italiano, senza trattino lungo.',
    '- Dieci righe bastano quasi sempre. Se serve piu spazio, prima la risposta e poi il resto.',
    '- Usa solo quello che c e nel dossier qui sotto. Se un numero non c e, dillo: non inventarlo e non stimarlo a occhio.',
    '- Quando dici un numero, di da dove viene (Search Console, Google Ads, scansione del pannello).',
    '- Non promettere traffico. Le stime del pannello sono stime, e si dice.',
    '',
    'Cose vere di questo pannello, da tenere presenti sempre:',
    '- Analytics non conta il traffico: il consenso ai cookie blocca i tag prima. Il traffico di ricerca si legge dalla Search Console, le vendite da Ecwid.',
    '- Brignole e Biography Library sono due identita separate: account, spesa e credito Ad Grants non si mescolano e non si sommano mai.',
    '- Il pannello non scrive su nessun sito da solo: scrive quando Claudio premi Approva, e ogni scrittura si annulla perche il valore precedente resta salvato.',
    '',
    'DOSSIER',
    c.dossier,
    '',
    ...(c.divieti.length ? ['QUELLO CHE QUI NON SI PUO FARE', ...c.divieti.map((d) => `- ${d}`), ''] : []),
    ...(memoria ? ['MEMORIA', memoria.trim(), ''] : []),
    'MOSSE',
    'Non parte niente da sola: Claudio vede un pulsante e decide lui. Se serve una mossa, chiudi il messaggio con questo blocco e non scrivere niente dopo:',
    `${APRI}`,
    '[{"tipo":"cambia_testo","valore":"il testo nuovo","perche":"una frase"}]',
    `${CHIUDI}`,
    '',
    'Mosse disponibili adesso:',
    mosse,
    '',
    'Metti il blocco solo se Claudio ha chiesto un cambiamento, oppure ti ha dato una indicazione da tenere. Se stai solo spiegando, niente blocco.',
    'Quando Claudio dice una regola (come si scrivono i titoli, come si chiama una cosa, cosa non nominare mai), proponi anche ricorda: e il modo in cui questo pannello impara, e senza quello glielo dovra ripetere ogni notte.',
  ].join('\n')
}

/** Merge delle battute dello stesso ruolo: l API vuole che si alternino. */
function alterna(battute: Battuta[]): Battuta[] {
  const out: Battuta[] = []
  for (const b of battute) {
    const testo = b.testo.slice(0, BATTUTA_MAX)
    if (!testo.trim()) continue
    const ultima = out[out.length - 1]
    if (ultima && ultima.ruolo === b.ruolo) {
      ultima.testo = `${ultima.testo}\n\n${testo}`
      continue
    }
    out.push({ ruolo: b.ruolo, testo })
  }
  // La prima battuta deve essere di Claudio.
  while (out.length && out[0].ruolo === 'claude') out.shift()
  return out
}

function staccaMosse(risposta: string): { testo: string; grezze: unknown } {
  const i = risposta.indexOf(APRI)
  if (i === -1) return { testo: risposta.trim(), grezze: null }
  const j = risposta.indexOf(CHIUDI, i)
  const dentro = risposta.slice(i + APRI.length, j === -1 ? undefined : j).trim()
  const testo = (risposta.slice(0, i) + (j === -1 ? '' : risposta.slice(j + CHIUDI.length))).trim()
  try {
    return { testo, grezze: JSON.parse(dentro) }
  } catch {
    // Blocco rotto: meglio perdere la mossa che mostrare parentesi a Claudio.
    console.warn('[chat] blocco MOSSE illeggibile')
    return { testo, grezze: null }
  }
}

/** Tiene solo le mosse che qui si possono fare davvero, e le mette in ordine. */
function ripuliscMosse(grezze: unknown, c: Contesto): Mossa[] {
  if (!Array.isArray(grezze)) return []
  const out: Mossa[] = []
  for (const g of grezze.slice(0, 4)) {
    const tipo = String((g as any)?.tipo ?? '') as TipoMossa
    if (!c.permesse.includes(tipo)) continue
    const perche = (g as any)?.perche ? senzaTrattinoLungo(String((g as any).perche)).slice(0, 400) : undefined
    if (tipo === 'cambia_testo') {
      const valore = senzaTrattinoLungo(String((g as any)?.valore ?? '')).trim()
      if (!valore) continue
      out.push({ tipo, valore: valore.slice(0, 2000), perche })
      continue
    }
    if (tipo === 'ricorda') {
      const testo = senzaTrattinoLungo(String((g as any)?.testo ?? '')).trim()
      if (!testo) continue
      let ambito = String((g as any)?.ambito ?? 'tutti') as PortataMemoria
      if (ambito === 'pagina' && !c.bersaglio) ambito = c.sitoId ? 'sito' : 'tutti'
      if (ambito === 'sito' && !c.sitoId) ambito = 'tutti'
      if (ambito !== 'tutti' && ambito !== 'sito' && ambito !== 'pagina') ambito = 'tutti'
      out.push({ tipo, testo, ambito, perche })
      continue
    }
    out.push({ tipo, perche })
  }
  return out
}

async function salva(
  conversazioneId: number,
  ruolo: 'claudio' | 'claude',
  testo: string,
  mosse?: Mossa[]
): Promise<number> {
  const res = await query<any>(
    'INSERT INTO messaggi (conversazione_id, ruolo, testo, mosse) VALUES (?,?,?,?)',
    [conversazioneId, ruolo, testo, mosse && mosse.length ? JSON.stringify(mosse) : null]
  )
  await query('UPDATE conversazioni SET ultimo_il = NOW() WHERE id = ?', [conversazioneId])
  return (res as any).insertId ?? 0
}

export async function chiedi(
  ambito: Ambito,
  riferimento: string,
  domanda: string
): Promise<{ messaggioId: number; testo: string; mosse: Mossa[] }> {
  const pulita = domanda.trim().slice(0, DOMANDA_MAX)
  if (!pulita) throw new Error('Scrivi la domanda nella casella, poi premi Chiedi.')

  const c = await contesto(ambito, riferimento)
  const conversazioneId = await idConversazione(c, true)
  if (!conversazioneId) {
    throw new Error(
      'Non riesco ad aprire la conversazione. Se il database e nuovo, apri /api/setup/migra?chiave=LA_CHIAVE e riprova.'
    )
  }

  const passate = await messaggiDi(conversazioneId)
  await salva(conversazioneId, 'claudio', pulita)

  const memoria = await bloccoIndicazioni(c.sitoId, c.bersaglio)
  const battute = alterna([
    ...passate.map((m) => ({ ruolo: m.ruolo, testo: m.testo }) as Battuta),
    { ruolo: 'claudio', testo: pulita } as Battuta,
  ])

  const risposta = await conversa(istruzioni(c, memoria), battute)
  const { testo, grezze } = staccaMosse(risposta)
  const mosse = ripuliscMosse(grezze, c)
  const messaggioId = await salva(conversazioneId, 'claude', senzaTrattinoLungo(testo), mosse)
  return { messaggioId, testo: senzaTrattinoLungo(testo), mosse }
}

/**
 * Fa la mossa che Claudio ha confermato.
 *
 * Il testo non arriva dal browser: si rilegge dal messaggio salvato, cosi quello
 * che va nella proposta e esattamente quello che Claudio ha letto. E si ricontrolla
 * il dossier, perche fra la risposta e il clic la proposta puo essere cambiata.
 */
export async function applicaMossa(
  messaggioId: number,
  indice: number
): Promise<{ fatto: string; ricarica: boolean }> {
  const riga = await unaRiga<{
    id: number
    mosse: unknown
    ambito: Ambito
    riferimento: string
  }>(
    `SELECT m.id, m.mosse, c.ambito, c.riferimento
       FROM messaggi m INNER JOIN conversazioni c ON c.id = m.conversazione_id
      WHERE m.id = ? LIMIT 1`,
    [messaggioId]
  )
  if (!riga) throw new Error('Messaggio non trovato. Ricarica la pagina e rifai la domanda.')

  const mosse = leggiMosse(riga.mosse)
  const m = mosse[indice]
  if (!m) throw new Error('Questa mossa non c e piu. Ricarica la pagina.')
  if (m.eseguita_il) throw new Error('Questa mossa era gia stata confermata.')

  const c = await contesto(riga.ambito, riga.riferimento)
  if (!c.permesse.includes(m.tipo)) {
    throw new Error(
      `Adesso non si puo piu: ${c.divieti[0] ?? 'la proposta e cambiata stato'}. Ricarica la pagina.`
    )
  }

  let fatto = ''
  let ricarica = false

  if (m.tipo === 'cambia_testo') {
    const id = Number(c.riferimento)
    await aggiornaValoreNuovo(id, m.valore ?? '')
    await annota(c.sitoId ?? '', 'testo_cambiato', id, {
      da: 'chat',
      messaggio_id: messaggioId,
      valore: m.valore,
      perche: m.perche ?? null,
    })
    fatto = 'Testo messo nella proposta. Nel sito non e ancora cambiato niente: leggilo e premi Approva.'
    ricarica = true
  } else if (m.tipo === 'chiudi_proposta') {
    const id = Number(c.riferimento)
    await segnaRifiutata(id)
    await annota(c.sitoId ?? '', 'rifiutata', id, { da: 'chat', perche: m.perche ?? null })
    fatto = 'Proposta chiusa. Resta nello storico con il motivo, il sito non e stato toccato.'
    ricarica = true
  } else if (m.tipo === 'scarta_bozza') {
    await query(`UPDATE campagne_bozze SET stato = 'scartata' WHERE id = ?`, [Number(c.riferimento)])
    fatto = 'Bozza scartata. Non compare piu fra quelle da creare su Google Ads.'
    ricarica = true
  } else if (m.tipo === 'ricorda') {
    await ricorda({
      ambito: m.ambito ?? 'tutti',
      sitoId: c.sitoId,
      bersaglio: c.bersaglio,
      testo: m.testo ?? '',
      origine: 'chat',
      messaggioId,
    })
    fatto =
      m.ambito === 'pagina'
        ? 'Indicazione registrata per questo indirizzo. La trovi nella pagina Memoria.'
        : m.ambito === 'sito'
          ? 'Indicazione registrata per questo sito: entra nei testi che scrivero qui da adesso.'
          : 'Indicazione registrata per tutti i siti: entra nei testi che scrivero da adesso.'
  }

  mosse[indice] = { ...m, eseguita_il: new Date().toISOString() }
  await query('UPDATE messaggi SET mosse = ? WHERE id = ?', [JSON.stringify(mosse), messaggioId])
  // La conferma resta nella conversazione: al giro dopo Claude sa cosa e stato deciso.
  const conv = await unaRiga<{ conversazione_id: number }>(
    'SELECT conversazione_id FROM messaggi WHERE id = ? LIMIT 1',
    [messaggioId]
  )
  if (conv) await salva(conv.conversazione_id, 'claudio', `Confermato: ${etichettaMossa(m).toLowerCase()}. ${fatto}`)

  return { fatto, ricarica }
}
