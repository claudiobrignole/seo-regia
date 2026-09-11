'use client'

import { useEffect, useState } from 'react'
import type { Azione } from '@/lib/registro'
import { CAMPI_DA_MODIFICARE, type VistaSito } from '@/lib/azioni-viste'

const ETICHETTA_STATO: Record<string, string> = {
  proposta: 'Da fare',
  approvata: 'Approvata',
  applicata: 'Applicata',
  fallita: 'Non riuscita',
  rifiutata: 'Rifiutata',
  annullata: 'Annullata',
}

const ETICHETTA_CAMPO: Record<string, string> = {
  titolo: 'titolo',
  descrizione: 'descrizione',
  seo_prodotto: 'scheda prodotto',
  robots: 'robots.txt',
  sitemap: 'sitemap',
  slug: 'collegamento interno',
  jsonld: 'dati strutturati',
  istruzione: 'istruzione',
  h1: 'titolo in pagina',
  canonical: 'canonical',
  spessore: 'testo troppo corto',
  lingua: 'lingua',
  prodotto: 'scheda Merchant',
  vitali: 'vitali Chrome',
}

function quando(v: Date | string | null | undefined): string {
  if (!v) return ''
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('it-CH', { dateStyle: 'short', timeStyle: 'short' })
}

export function SchedaAzione({
  azione,
  sitoId,
  vista,
  evidenziata = false,
}: {
  azione: Azione
  sitoId: string
  vista: VistaSito
  evidenziata?: boolean
}) {
  const [attesa, setAttesa] = useState<'applica' | 'rifiuta' | 'annulla' | null>(null)
  const scrivibile = CAMPI_DA_MODIFICARE.has(azione.campo)
  const inCoda = azione.stato === 'proposta' || azione.stato === 'approvata' || azione.stato === 'fallita'
  const etichettaStato = ETICHETTA_STATO[azione.stato] ?? azione.stato
  const etichettaCampo = ETICHETTA_CAMPO[azione.campo] ?? azione.campo
  const robots = azione.campo === 'robots'
  const fallita = azione.stato === 'fallita'
  const testoNuovo = (azione.valore_nuovo ?? '').trim()

  useEffect(() => {
    if (!evidenziata) return
    document.getElementById(`azione-${azione.id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [evidenziata, azione.id])

  return (
    <article
      id={`azione-${azione.id}`}
      className={`${fallita ? 'al-scheda al-scheda-fallita' : 'al-scheda'}${evidenziata ? ' al-scheda-evidenziata' : ''}`}
      style={evidenziata ? { scrollMarginTop: 16 } : undefined}
    >
      <div className="al-muted">
        {etichettaStato} • {azione.regola} • {etichettaCampo}
        {quando(azione.creata_il) ? ` • ${quando(azione.creata_il)}` : ''}
      </div>
      <p className="al-bersaglio">{azione.bersaglio}</p>
      <p>{azione.motivo}</p>
      <p>
        <strong>Ora sul sito:</strong> {azione.valore_vecchio || '(vuoto)'}
      </p>
      {!scrivibile && inCoda && (
        <p className="al-nota-box">
          Questa e una nota, non un testo da pubblicare. Il pannello non puo scriverla da solo sul sito
          (serve un link in un articolo, o i dati strutturati nel tema). Chiudila se l hai letta, oppure
          sistemala a mano e poi chiudila.
        </p>
      )}
      {scrivibile && inCoda && (
        <p className="al-muted">
          {testoNuovo
            ? 'Puoi correggere il testo sotto, poi Approva. Resta in questa pagina: vedrai se e andata a buon fine.'
            : 'Il testo lo scrive Claude poche schede per notte. Puoi scriverlo tu sotto, oppure aspettare la prossima diagnosi. Approva si accende quando c e un testo.'}
        </p>
      )}
      {azione.guadagno_stimato != null && (
        <p className="al-muted">Stima: circa {azione.guadagno_stimato} clic in piu nel periodo.</p>
      )}
      {azione.stato === 'fallita' && azione.errore && (
        <p style={{ color: 'var(--status-danger)' }}>
          <strong>Perche non e riuscita:</strong> {azione.errore}
        </p>
      )}
      {azione.riferimento_esterno && (
        <p className="al-muted">
          Richiesta: <a href={azione.riferimento_esterno}>{azione.riferimento_esterno}</a>
        </p>
      )}
      {azione.stato === 'applicata' && quando(azione.applicata_il) && (
        <p className="al-muted">Applicata il {quando(azione.applicata_il)}</p>
      )}
      {azione.verifica_esito && azione.verifica_esito !== 'dati_insufficienti' && (
        <p className="al-lezione">
          {azione.verifica_esito === 'migliorata' &&
            `Dopo due settimane i clic sono saliti da ${azione.verifica_clic_prima ?? 0} a ${azione.verifica_clic_dopo ?? 0}. Questo schema ha funzionato.`}
          {azione.verifica_esito === 'peggiorata' &&
            `Dopo due settimane i clic sono scesi da ${azione.verifica_clic_prima ?? 0} a ${azione.verifica_clic_dopo ?? 0}. Non ripetere questo schema.`}
          {azione.verifica_esito === 'invariata' &&
            `Dopo due settimane i clic sono restati sostanzialmente uguali (${azione.verifica_clic_prima ?? 0} poi ${azione.verifica_clic_dopo ?? 0}).`}
        </p>
      )}

      {attesa && (
        <p className="al-attesa">
          {attesa === 'applica' && 'Sto applicando sul sito. Non chiudere la pagina.'}
          {attesa === 'rifiuta' && 'Sto chiudendo la proposta.'}
          {attesa === 'annulla' && 'Sto rimettendo il valore precedente.'}
        </p>
      )}

      {inCoda && (
        <div className="al-riga-azioni">
          {scrivibile && (
            <form
              method="POST"
              action={`/api/azioni/applica?sito=${sitoId}`}
              style={{ flex: '1 1 280px' }}
              onSubmit={() => setAttesa('applica')}
            >
              <input type="hidden" name="id" value={azione.id} />
              <input type="hidden" name="vista" value={vista} />
              <label className="al-label">
                {robots ? 'robots.txt da pubblicare' : 'Testo da pubblicare'}
              </label>
              <textarea
                name="valore_nuovo"
                className={robots ? 'al-area al-campo-mono' : 'al-area'}
                defaultValue={azione.valore_nuovo ?? ''}
                rows={robots ? 14 : 3}
                required
                disabled={!!attesa}
                placeholder={
                  robots
                    ? undefined
                    : 'Vuoto: Claude lo riempie nelle prossime diagnosi, oppure scrivilo tu.'
                }
              />
              <button
                type="submit"
                className="al-btn al-btn-primary"
                style={{ marginTop: 8 }}
                disabled={!!attesa}
              >
                {attesa === 'applica' ? 'Attendi' : 'Approva'}
              </button>
            </form>
          )}
          <form method="POST" action="/api/azioni/rifiuta" onSubmit={() => setAttesa('rifiuta')}>
            <input type="hidden" name="id" value={azione.id} />
            <input type="hidden" name="vista" value={vista} />
            <button type="submit" className="al-btn al-btn-outline" disabled={!!attesa}>
              {scrivibile ? 'Rifiuta' : 'Chiudi'}
            </button>
          </form>
        </div>
      )}

      {azione.stato === 'applicata' && (
        <form method="POST" action="/api/azioni/annulla" style={{ marginTop: 10 }} onSubmit={() => setAttesa('annulla')}>
          <input type="hidden" name="id" value={azione.id} />
          <input type="hidden" name="vista" value="storico" />
          <button type="submit" className="al-btn al-btn-outline" disabled={!!attesa}>
            {attesa === 'annulla' ? 'Attendi' : 'Annulla'}
          </button>
        </form>
      )}
    </article>
  )
}
