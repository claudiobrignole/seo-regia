import { notFound } from 'next/navigation'
import { query } from '@/lib/db'
import { SITI } from '@/siti.config'
import { Telaio, avviso, esitoOk } from '@/app/componenti/telaio'
import type { Azione } from '@/lib/registro'
import { SchedaAzione } from './scheda-azione'

export const dynamic = 'force-dynamic'

const IN_CODA = new Set(['proposta', 'approvata', 'fallita'])

const BANNER: Record<string, { ok: boolean; testo: string }> = {
  applicata: {
    ok: true,
    testo: 'Modifica applicata. Controlla il sito (o la richiesta su GitHub). La scheda non e sparita: e nello storico in fondo.',
  },
  rifiutata: {
    ok: true,
    testo: 'Proposta chiusa. Resta nello storico: non verra riproposta finche non cambia la pagina.',
  },
  annullata: {
    ok: true,
    testo: 'Valore precedente rimesso sul sito. L azione resta nello storico.',
  },
  fallita: {
    ok: false,
    testo: 'Non e andata a buon fine. La scheda resta in coda, in rosso, con il motivo. Correggi il testo se serve e riprova.',
  },
  annullo_fallito: {
    ok: false,
    testo: 'Annullamento non riuscito. La modifica applicata e ancora sul sito. Riprova dalla scheda nello storico.',
  },
  gia_chiusa: {
    ok: false,
    testo: 'Questa azione era gia chiusa. Guardala nello storico in fondo alla pagina.',
  },
}

export default async function PaginaSito({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ esito?: string; ok?: string }>
}) {
  const { id } = await params
  const q = await searchParams
  const s = SITI.find((x) => x.id === id)
  if (!s) notFound()

  const esito = q.esito || (q.ok === 'applicata' || q.ok === 'rifiutata' || q.ok === 'annullata' ? q.ok : undefined)
  const banner = esito ? BANNER[esito] : undefined

  let azioni: Azione[] = []
  let errore: string | null = null
  let clic = 0
  let impressioni = 0
  try {
    azioni = await query<Azione>(
      `SELECT * FROM azioni WHERE sito_id = ?
        ORDER BY FIELD(stato,'fallita','proposta','approvata','applicata','rifiutata','annullata'), id DESC
        LIMIT 400`,
      [s.id]
    )
    const tot = await query<{ clic: number; impressioni: number }>(
      `SELECT COALESCE(SUM(clic),0) AS clic, COALESCE(SUM(impressioni),0) AS impressioni
         FROM misure WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina'
          AND giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [s.id]
    )
    clic = Number(tot[0]?.clic ?? 0)
    impressioni = Number(tot[0]?.impressioni ?? 0)
  } catch (e) {
    errore = (e as Error).message
  }

  const coda = azioni.filter((a) => IN_CODA.has(a.stato))
  const storico = azioni.filter((a) => !IN_CODA.has(a.stato))
  const zero = clic === 0 && impressioni === 0

  return (
    <Telaio titolo={s.nome} sottotitolo={`${s.dominio}. Automazione ${s.automazioneAttiva ? 'attiva' : 'spenta'}.`}>
      {banner && (
        <div style={banner.ok ? esitoOk : avviso} role="status">
          <strong>{banner.ok ? 'Fatto.' : 'Non e andata a buon fine.'}</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>{banner.testo}</p>
        </div>
      )}

      {errore && (
        <div style={avviso}>
          <strong>Il database non risponde ancora.</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>{errore}</p>
        </div>
      )}

      <p style={{ fontSize: 15 }}>
        Ultimi 30 giorni, Search Console: {clic.toLocaleString('it-CH')} clic, {impressioni.toLocaleString('it-CH')}{' '}
        impressioni.
        {zero ? ' Zero dati: se il sito e nuovo o non promosso, e normale, non e un guasto.' : ''}
      </p>
      {s.note && <p style={{ fontSize: 14, color: '#4A524E' }}>{s.note}</p>}
      {s.scrittura.tipo === 'github' && (
        <p style={{ fontSize: 14, color: '#4A524E' }}>
          Questo sito si aggiorna con una richiesta su GitHub, sui file in seo/ (contenuti.json e robots.txt). Approva apre la richiesta: la vetrina cambia solo quando il sito legge quel file.
        </p>
      )}

      <h2 style={{ fontSize: 18, marginTop: 28 }}>Coda ({coda.length})</h2>
      <p style={{ fontSize: 14, color: '#4A524E' }}>
        Titolo e descrizione: correggi il testo e Approva. robots.txt: Approva lo pubblica (WordPress col plugin, oppure richiesta su seo/robots.txt). Le note (link interni, dati strutturati, sitemap HTML) non hanno Approva: chiudile dopo averle lette.
      </p>
      {coda.length === 0 && !errore && <p>Niente da fare. Le proposte arrivano dopo raccolta, scansione e diagnosi.</p>}
      {coda.map((a) => (
        <SchedaAzione
          key={a.id}
          azione={{
            ...a,
            creata_il: a.creata_il ? new Date(a.creata_il).toISOString() : null,
            applicata_il: a.applicata_il ? new Date(a.applicata_il).toISOString() : null,
          }}
          sitoId={s.id}
        />
      ))}

      <h2 style={{ fontSize: 18, marginTop: 36 }}>Storico ({storico.length})</h2>
      <p style={{ fontSize: 14, color: '#4A524E' }}>
        Tutto quello che hai approvato, rifiutato o annullato resta qui. Niente sparisce.
      </p>
      {storico.length === 0 && !errore && <p>Ancora vuoto: dopo il primo Approva o Rifiuta comparira qui.</p>}
      {storico.map((a) => (
        <SchedaAzione
          key={a.id}
          azione={{
            ...a,
            creata_il: a.creata_il ? new Date(a.creata_il).toISOString() : null,
            applicata_il: a.applicata_il ? new Date(a.applicata_il).toISOString() : null,
          }}
          sitoId={s.id}
        />
      ))}
    </Telaio>
  )
}
