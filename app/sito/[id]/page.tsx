import { notFound } from 'next/navigation'
import Link from 'next/link'
import { query } from '@/lib/db'
import { SITI } from '@/siti.config'
import { Telaio, avviso, esitoOk } from '@/app/componenti/telaio'
import type { Azione } from '@/lib/registro'
import { SchedaAzione } from './scheda-azione'
import { CAMPI_DA_MODIFICARE, vistaSito, type VistaSito } from '@/lib/azioni-viste'

export const dynamic = 'force-dynamic'

const IN_CODA = new Set(['proposta', 'approvata', 'fallita'])

const BANNER: Record<string, { ok: boolean; testo: string }> = {
  applicata: {
    ok: true,
    testo: 'Modifica applicata. Controlla il sito (o la richiesta su GitHub). La scheda e in Storico.',
  },
  rifiutata: {
    ok: true,
    testo: 'Proposta chiusa. Resta in Storico: non verra riproposta finche non cambia la pagina.',
  },
  annullata: {
    ok: true,
    testo: 'Valore precedente rimesso sul sito. L azione resta in Storico.',
  },
  fallita: {
    ok: false,
    testo: 'Non e andata a buon fine. La scheda resta qui, in rosso, con il motivo. Correggi il testo se serve e riprova.',
  },
  annullo_fallito: {
    ok: false,
    testo: 'Annullamento non riuscito. La modifica applicata e ancora sul sito. Riprova dalla scheda in Storico.',
  },
  gia_chiusa: {
    ok: false,
    testo: 'Questa azione era gia chiusa. Guardala in Storico.',
  },
}

function perScheda(a: Azione): Azione {
  return {
    ...a,
    creata_il: a.creata_il ? new Date(a.creata_il).toISOString() : null,
    applicata_il: a.applicata_il ? new Date(a.applicata_il).toISOString() : null,
  }
}

function schedaTab(attiva: boolean) {
  return {
    display: 'inline-block',
    padding: '10px 16px',
    fontSize: 15,
    color: attiva ? '#161A18' : '#4A524E',
    textDecoration: 'none',
    borderBottom: attiva ? '2px solid #161A18' : '2px solid transparent',
    fontWeight: attiva ? 600 : 400,
  } as const
}

export default async function PaginaSito({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ esito?: string; ok?: string; vista?: string }>
}) {
  const { id } = await params
  const q = await searchParams
  const s = SITI.find((x) => x.id === id)
  if (!s) notFound()

  const vista: VistaSito = vistaSito(q.vista)
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

  const inCoda = azioni.filter((a) => IN_CODA.has(a.stato))
  const daModificare = inCoda.filter((a) => CAMPI_DA_MODIFICARE.has(a.campo))
  const note = inCoda.filter((a) => !CAMPI_DA_MODIFICARE.has(a.campo))
  const storico = azioni.filter((a) => !IN_CODA.has(a.stato))
  const elenco =
    vista === 'note' ? note : vista === 'storico' ? storico : daModificare
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
          Questo sito si aggiorna con una richiesta su GitHub, sui file in seo/ (contenuti.json e robots.txt). Approva apre
          la richiesta: la vetrina cambia solo quando il sito legge quel file.
        </p>
      )}

      <nav
        aria-label="Schede del sito"
        style={{
          display: 'flex',
          gap: 4,
          marginTop: 28,
          borderBottom: '1px solid #DDE1DC',
          flexWrap: 'wrap',
        }}
      >
        <Link href={`/sito/${s.id}?vista=modificare`} style={schedaTab(vista === 'modificare')} aria-current={vista === 'modificare' ? 'page' : undefined}>
          Da modificare ({daModificare.length})
        </Link>
        <Link href={`/sito/${s.id}?vista=note`} style={schedaTab(vista === 'note')} aria-current={vista === 'note' ? 'page' : undefined}>
          Note ({note.length})
        </Link>
        <Link href={`/sito/${s.id}?vista=storico`} style={schedaTab(vista === 'storico')} aria-current={vista === 'storico' ? 'page' : undefined}>
          Storico ({storico.length})
        </Link>
      </nav>

      {vista === 'modificare' && (
        <p style={{ fontSize: 14, color: '#4A524E', marginTop: 16 }}>
          Titolo, descrizione, scheda prodotto, robots.txt: correggi se serve e Approva.
        </p>
      )}
      {vista === 'note' && (
        <p style={{ fontSize: 14, color: '#4A524E', marginTop: 16 }}>
          Avvisi che il pannello non puo scrivere da solo (link interni, dati strutturati, sitemap HTML). Chiudili dopo
          averli letti.
        </p>
      )}
      {vista === 'storico' && (
        <p style={{ fontSize: 14, color: '#4A524E', marginTop: 16 }}>
          Tutto quello che hai approvato, rifiutato o annullato. Niente sparisce. Da qui puoi ancora Annulla su una
          modifica applicata.
        </p>
      )}

      {elenco.length === 0 && !errore && (
        <p>
          {vista === 'modificare' && 'Niente da modificare. Le proposte arrivano dopo raccolta, scansione e diagnosi.'}
          {vista === 'note' && 'Nessuna nota aperta.'}
          {vista === 'storico' && 'Ancora vuoto: dopo il primo Approva o Rifiuta comparira qui.'}
        </p>
      )}
      {elenco.map((a) => (
        <SchedaAzione key={a.id} azione={perScheda(a)} sitoId={s.id} vista={vista} />
      ))}
    </Telaio>
  )
}
