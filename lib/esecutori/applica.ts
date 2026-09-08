import { sito } from '@/siti.config'
import {
  annota,
  aggiornaValoreVecchio,
  caricaAzione,
  segnaApplicata,
  segnaAnnullata,
  segnaFallita,
  type Azione,
} from '@/lib/registro'
import { scriviSeo, leggiSeo } from '@/lib/esecutori/wordpress'
import { proponiModifica, leggiFileSeo } from '@/lib/esecutori/github'
import { scriviSeoProdotto, leggiSeoProdotto } from '@/lib/esecutori/ecwid'

const CAMPI_SCRIVIBILI = new Set(['titolo', 'descrizione', 'seo_prodotto'])

function campoSeo(campo: string): 'titolo' | 'descrizione' {
  return campo === 'descrizione' ? 'descrizione' : 'titolo'
}

async function valoreAttuale(a: Azione): Promise<string | null> {
  const s = sito(a.sito_id)
  const campo = campoSeo(a.campo)
  if (s.scrittura.tipo === 'wordpress') {
    const attuale = await leggiSeo(s, a.bersaglio)
    return campo === 'titolo' ? attuale.titolo : attuale.descrizione
  }
  if (s.scrittura.tipo === 'github') {
    const { dati } = await leggiFileSeo(s)
    const voce = dati[a.bersaglio]
    if (!voce) return null
    return campo === 'titolo' ? voce.titolo ?? null : voce.descrizione ?? null
  }
  if (s.scrittura.tipo === 'ecwid') {
    const attuale = await leggiSeoProdotto(Number(a.bersaglio))
    return campo === 'titolo' ? attuale.titolo : attuale.descrizione
  }
  return null
}

async function scrivi(a: Azione, valore: string): Promise<string | undefined> {
  const s = sito(a.sito_id)
  const campo = campoSeo(a.campo)

  if (s.scrittura.tipo === 'wordpress') {
    await scriviSeo(s, a.bersaglio, { [campo]: valore })
    return
  }
  if (s.scrittura.tipo === 'github') {
    return proponiModifica(
      s,
      { [a.bersaglio]: { [campo]: valore } },
      `SEO: ${campo} di ${a.bersaglio}`,
      `${a.motivo}\n\nProposto dal pannello di regia SEO.`
    )
  }
  if (s.scrittura.tipo === 'nessuna') {
    throw new Error(
      `${s.nome} non ha un posto sicuro dove scrivere. ${s.scrittura.motivo} ` +
        `Mettilo su GitHub e cambia la voce in siti.config.ts.`
    )
  }
  await scriviSeoProdotto(Number(a.bersaglio), { [campo]: valore })
}

export async function applicaAzione(id: number): Promise<{ riferimento?: string }> {
  const a = await caricaAzione(id)
  if (!a) throw new Error('azione non trovata')
  if (a.stato !== 'proposta' && a.stato !== 'approvata') {
    throw new Error(`azione gia in stato ${a.stato}`)
  }
  if (!CAMPI_SCRIVIBILI.has(a.campo)) {
    throw new Error(`Il campo ${a.campo} e solo un avviso: non si applica da qui.`)
  }
  if (!(a.valore_nuovo ?? '').trim()) {
    throw new Error('Manca il testo nuovo. Aspetta che il generatore lo componga, oppure scrivilo tu.')
  }

  try {
    const veroVecchio = await valoreAttuale(a)
    if (veroVecchio !== null) await aggiornaValoreVecchio(a.id, veroVecchio)
    const daSalvare = { ...a, valore_vecchio: veroVecchio ?? a.valore_vecchio }
    const riferimento = await scrivi(daSalvare, a.valore_nuovo)
    await annota(a.sito_id, 'applicata', a.id, {
      campo: a.campo,
      vecchio: veroVecchio ?? a.valore_vecchio,
      nuovo: a.valore_nuovo,
      richiesta: riferimento,
    })
    await segnaApplicata(a.id, riferimento)
    return { riferimento }
  } catch (e) {
    const messaggio = (e as Error).message
    await segnaFallita(a.id, messaggio)
    await annota(a.sito_id, 'errore', a.id, { messaggio })
    throw e
  }
}

/** Rimette il valore precedente sul sito, poi marca l azione. */
export async function annullaAzione(id: number): Promise<void> {
  const a = await caricaAzione(id)
  if (!a) throw new Error('azione non trovata')
  if (a.stato !== 'applicata') throw new Error(`Azione ${id} non e stata applicata: nulla da annullare`)
  if (a.valore_vecchio === null) {
    throw new Error(`Azione ${id}: nessun valore precedente registrato, annullamento non sicuro`)
  }
  try {
    await scrivi(a, a.valore_vecchio)
    await segnaAnnullata(a.id)
  } catch (e) {
    const messaggio = (e as Error).message
    await annota(a.sito_id, 'errore', a.id, { messaggio, durante: 'annullo' })
    throw e
  }
}
