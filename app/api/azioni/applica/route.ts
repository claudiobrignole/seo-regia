import { NextRequest, NextResponse } from 'next/server'
import { unaRiga } from '@/lib/db'
import { segnaApplicata, segnaFallita, annota, type Azione } from '@/lib/registro'
import { scriviSeo, leggiSeo } from '@/lib/esecutori/wordpress'
import { proponiModifica } from '@/lib/esecutori/github'
import { scriviSeoProdotto, leggiSeoProdotto } from '@/lib/esecutori/ecwid'
import { sito } from '@/siti.config'

export const dynamic = 'force-dynamic'

/**
 * Applica una singola azione approvata.
 * Prima di scrivere rilegge il valore attuale: se qualcuno ha cambiato le cose
 * a mano nel frattempo, il valore che salviamo per l annullamento e quello vero,
 * non quello che avevamo in memoria.
 */
export async function POST(req: NextRequest) {
  const { id } = (await req.json()) as { id: number }
  const a = await unaRiga<Azione>('SELECT * FROM azioni WHERE id = ?', [id])
  if (!a) return NextResponse.json({ errore: 'azione non trovata' }, { status: 404 })
  if (a.stato !== 'proposta' && a.stato !== 'approvata') {
    return NextResponse.json({ errore: `azione gia in stato ${a.stato}` }, { status: 409 })
  }

  const s = sito(a.sito_id)

  try {
    let riferimento: string | undefined

    if (s.scrittura.tipo === 'wordpress') {
      const attuale = await leggiSeo(s, a.bersaglio)
      const vecchio = a.campo === 'titolo' ? attuale.titolo : attuale.descrizione
      await scriviSeo(s, a.bersaglio, {
        [a.campo === 'titolo' ? 'titolo' : 'descrizione']: a.valore_nuovo,
      })
      await annota(s.id, 'applicata', a.id, { campo: a.campo, vecchio, nuovo: a.valore_nuovo })
    } else if (s.scrittura.tipo === 'github') {
      riferimento = await proponiModifica(
        s,
        { [a.bersaglio]: { [a.campo === 'titolo' ? 'titolo' : 'descrizione']: a.valore_nuovo } },
        `SEO: ${a.campo} di ${a.bersaglio}`,
        `${a.motivo}\n\nProposto dal pannello di regia SEO. Valore precedente: ${a.valore_vecchio ?? 'nessuno'}`
      )
      await annota(s.id, 'applicata', a.id, { richiesta: riferimento })
    } else if (s.scrittura.tipo === 'nessuna') {
      // Sito senza repository: non scriviamo. Senza storico non c e annullamento,
      // e senza annullamento l automazione non e accettabile.
      throw new Error(
        `${s.nome} non ha un posto sicuro dove scrivere. ${s.scrittura.motivo} ` +
          `Mettilo su GitHub e cambia la voce in siti.config.ts.`
      )
    } else {
      const idProdotto = Number(a.bersaglio)
      const attuale = await leggiSeoProdotto(idProdotto)
      await scriviSeoProdotto(idProdotto, {
        [a.campo === 'titolo' ? 'titolo' : 'descrizione']: a.valore_nuovo,
      })
      await annota(s.id, 'applicata', a.id, { campo: a.campo, vecchio: attuale })
    }

    await segnaApplicata(a.id, riferimento)
    return NextResponse.json({ ok: true, riferimento })
  } catch (e) {
    const messaggio = (e as Error).message
    await segnaFallita(a.id, messaggio)
    await annota(s.id, 'errore', a.id, { messaggio })
    return NextResponse.json({ errore: messaggio }, { status: 500 })
  }
}
