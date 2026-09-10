import { notFound } from 'next/navigation'
import Link from 'next/link'
import { query } from '@/lib/db'
import { SITI } from '@/siti.config'
import { Telaio } from '@/app/componenti/telaio'
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

export default async function PaginaSito({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ esito?: string; ok?: string; vista?: string; azione?: string }>
}) {
  const { id } = await params
  const q = await searchParams
  const s = SITI.find((x) => x.id === id)
  if (!s) notFound()

  const vista: VistaSito = vistaSito(q.vista)
  const azioneId = Number(q.azione)
  const evidenziataId = Number.isFinite(azioneId) && azioneId > 0 ? azioneId : null
  const esito = q.esito || (q.ok === 'applicata' || q.ok === 'rifiutata' || q.ok === 'annullata' ? q.ok : undefined)
  const banner = esito ? BANNER[esito] : undefined

  let azioni: Azione[] = []
  let errore: string | null = null
  let clic = 0
  let impressioni = 0
  let clicAi = 0
  let impressioniAi = 0
  try {
    try {
      azioni = await query<Azione>(
        `SELECT a.*, v.esito AS verifica_esito, v.clic_prima AS verifica_clic_prima, v.clic_dopo AS verifica_clic_dopo
           FROM azioni a
           LEFT JOIN verifiche v ON v.azione_id = a.id AND v.giorni = 14
          WHERE a.sito_id = ?
          ORDER BY FIELD(a.stato,'fallita','proposta','approvata','applicata','rifiutata','annullata'), a.id DESC
          LIMIT 400`,
        [s.id]
      )
    } catch {
      azioni = await query<Azione>(
        `SELECT * FROM azioni WHERE sito_id = ?
          ORDER BY FIELD(stato,'fallita','proposta','approvata','applicata','rifiutata','annullata'), id DESC
          LIMIT 400`,
        [s.id]
      )
    }
    const tot = await query<{ clic: number; impressioni: number }>(
      `SELECT COALESCE(SUM(clic),0) AS clic, COALESCE(SUM(impressioni),0) AS impressioni
         FROM misure WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina'
          AND giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
      [s.id]
    )
    clic = Number(tot[0]?.clic ?? 0)
    impressioni = Number(tot[0]?.impressioni ?? 0)
    try {
      const ai = await query<{ clic: number; impressioni: number }>(
        `SELECT COALESCE(SUM(clic),0) AS clic, COALESCE(SUM(impressioni),0) AS impressioni
           FROM misure WHERE sito_id = ? AND fonte = 'search-console-ai' AND tipo_chiave = 'pagina'
            AND giorno >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
        [s.id]
      )
      clicAi = Number(ai[0]?.clic ?? 0)
      impressioniAi = Number(ai[0]?.impressioni ?? 0)
    } catch {
      clicAi = 0
      impressioniAi = 0
    }
  } catch (e) {
    errore = (e as Error).message
  }

  const inCoda = azioni.filter((a) => IN_CODA.has(a.stato))
  const daModificare = inCoda.filter((a) => CAMPI_DA_MODIFICARE.has(a.campo))
  const note = inCoda.filter((a) => !CAMPI_DA_MODIFICARE.has(a.campo))
  const storico = azioni.filter((a) => !IN_CODA.has(a.stato))
  const elenco =
    vista === 'note' ? note : vista === 'storico' ? storico : daModificare
  const scelta = evidenziataId ? elenco.find((a) => a.id === evidenziataId) : undefined
  const elencoOrdinato = scelta ? [scelta, ...elenco.filter((a) => a.id !== scelta.id)] : elenco
  const altrove =
    evidenziataId && !scelta
      ? [...daModificare, ...note, ...storico].find((a) => a.id === evidenziataId)
      : undefined
  const vistaAltrove: VistaSito | null = altrove
    ? !IN_CODA.has(altrove.stato)
      ? 'storico'
      : CAMPI_DA_MODIFICARE.has(altrove.campo)
        ? 'modificare'
        : 'note'
    : null
  const zero = clic === 0 && impressioni === 0

  return (
    <Telaio titolo={s.nome} sottotitolo={`${s.dominio}. Automazione ${s.automazioneAttiva ? 'attiva' : 'spenta'}.`}>
      {banner && (
        <div className={banner.ok ? 'al-esito' : 'al-avviso'} role="status">
          <strong>{banner.ok ? 'Fatto.' : 'Non e andata a buon fine.'}</strong>
          <p style={{ margin: '8px 0 0' }}>{banner.testo}</p>
        </div>
      )}

      {errore && (
        <div className="al-avviso">
          <strong>Il database non risponde ancora.</strong>
          <p style={{ margin: '8px 0 0' }}>{errore}</p>
        </div>
      )}

      <p>
        Ultimi 30 giorni, Search Console: {clic.toLocaleString('it-CH')} clic, {impressioni.toLocaleString('it-CH')}{' '}
        impressioni.
        {zero ? ' Zero dati: se il sito e nuovo o non promosso, e normale, non e un guasto.' : ''}
      </p>
      <p className="al-muted">
        {impressioniAi > 0
          ? `Risposte generate da Google: ${impressioniAi.toLocaleString('it-CH')} sguardi, ${clicAi.toLocaleString('it-CH')} clic.`
          : 'Google non ha ancora messo questo sito nelle risposte generate, o il rapporto non e disponibile.'}
      </p>
      {s.note && <p className="al-muted">{s.note}</p>}
      {s.scrittura.tipo === 'github' && (
        <p className="al-muted">
          Questo sito si aggiorna con una richiesta su GitHub, sui file in seo/ (contenuti.json e robots.txt). Approva apre
          la richiesta: la vetrina cambia solo quando il sito legge quel file.
        </p>
      )}

      <nav className="al-tabs" aria-label="Schede del sito">
        <Link
          href={`/sito/${s.id}?vista=modificare`}
          aria-current={vista === 'modificare' ? 'page' : undefined}
        >
          Da modificare ({daModificare.length})
        </Link>
        <Link href={`/sito/${s.id}?vista=note`} aria-current={vista === 'note' ? 'page' : undefined}>
          Note ({note.length})
        </Link>
        <Link href={`/sito/${s.id}?vista=storico`} aria-current={vista === 'storico' ? 'page' : undefined}>
          Storico ({storico.length})
        </Link>
      </nav>

      {vista === 'modificare' && (
        <p className="al-muted" style={{ marginTop: 16 }}>
          Titolo, descrizione, scheda prodotto, robots.txt: correggi se serve e Approva.
        </p>
      )}
      {vista === 'note' && (
        <p className="al-muted" style={{ marginTop: 16 }}>
          Avvisi che il pannello non puo scrivere da solo (link interni, H1, Merchant, vitali Chrome, istruzioni). Chiudili
          dopo averli letti.
        </p>
      )}
      {vista === 'storico' && (
        <p className="al-muted" style={{ marginTop: 16 }}>
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
      {altrove && vistaAltrove && (
        <p className="al-muted">
          Quella proposta sta in{' '}
          <Link href={`/sito/${s.id}?vista=${vistaAltrove}&azione=${altrove.id}#azione-${altrove.id}`}>
            {vistaAltrove === 'note' ? 'Note' : vistaAltrove === 'storico' ? 'Storico' : 'Da modificare'}
          </Link>
          .
        </p>
      )}
      {elencoOrdinato.map((a) => (
        <SchedaAzione
          key={a.id}
          azione={perScheda(a)}
          sitoId={s.id}
          vista={vista}
          evidenziata={scelta?.id === a.id}
        />
      ))}
    </Telaio>
  )
}
