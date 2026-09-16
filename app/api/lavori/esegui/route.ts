import { NextRequest, NextResponse } from 'next/server'
import { eseguiLavoro, LAVORI, type NomeLavoro } from '@/lib/lavori'
import { SITI } from '@/siti.config'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

const NOMI = new Set(LAVORI.map((l) => l.nome))

/**
 * Lancia un lavoro dal pannello, con la sessione: senza questa strada un
 * lavoro si puo provare solo aspettando la notte, e un lavoro che non si puo
 * provare e un lavoro di cui non si sa niente.
 * Il middleware protegge questa rotta, quindi non serve la chiave della sveglia.
 */
export async function POST(req: NextRequest) {
  let corpo: { lavoro?: string; sito?: string | null } = {}
  try {
    corpo = (await req.json()) as typeof corpo
  } catch {
    corpo = {}
  }
  const nome = String(corpo.lavoro ?? '').trim()
  if (!NOMI.has(nome as NomeLavoro)) {
    return NextResponse.json(
      {
        ok: false,
        errore: `Lavoro sconosciuto: ${nome || '(vuoto)'}`,
        cosaFare: `Usa uno di questi: ${[...NOMI].join(', ')}.`,
      },
      { status: 400 }
    )
  }

  const inizio = Date.now()
  try {
    const esito = await eseguiLavoro(nome as NomeLavoro, corpo.sito ?? null)
    return NextResponse.json({
      ok: esito.problemi.length === 0,
      lavoro: esito.lavoro,
      righe: esito.righe,
      riassunto: esito.riassunto,
      problemi: esito.problemi,
      secondi: Math.round((Date.now() - inizio) / 1000),
    })
  } catch (e) {
    const messaggio = (e as Error).message
    if (/^Sito sconosciuto/.test(messaggio)) {
      return NextResponse.json(
        {
          ok: false,
          lavoro: nome,
          errore: messaggio,
          cosaFare: `Scegli un sito dall elenco a fianco del pulsante: ${SITI.map((s) => s.id).join(', ')}.`,
        },
        { status: 400 }
      )
    }
    return NextResponse.json(
      {
        ok: false,
        lavoro: nome,
        errore: messaggio,
        cosaFare:
          'Riprova e lascia aperta la pagina. Se il messaggio parla di una tabella mancante, apri /api/setup/migra?chiave=LA_CHIAVE. Se parla di permessi Google, la riga corrispondente in Impianto dice quale invito manca.',
        secondi: Math.round((Date.now() - inizio) / 1000),
      },
      { status: 500 }
    )
  }
}
