'use client'

import { useState } from 'react'
import { bottonePrimario, bottoneSecondario } from '@/app/componenti/telaio'
import type { Azione } from '@/lib/registro'

const CAMPI_SCRIVIBILI = new Set(['titolo', 'descrizione', 'seo_prodotto', 'robots'])

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
}

function quando(v: Date | string | null | undefined): string {
  if (!v) return ''
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('it-CH', { dateStyle: 'short', timeStyle: 'short' })
}

export function SchedaAzione({ azione, sitoId }: { azione: Azione; sitoId: string }) {
  const [attesa, setAttesa] = useState<'applica' | 'rifiuta' | 'annulla' | null>(null)
  const scrivibile = CAMPI_SCRIVIBILI.has(azione.campo)
  const inCoda = azione.stato === 'proposta' || azione.stato === 'approvata' || azione.stato === 'fallita'
  const etichettaStato = ETICHETTA_STATO[azione.stato] ?? azione.stato
  const etichettaCampo = ETICHETTA_CAMPO[azione.campo] ?? azione.campo
  const robots = azione.campo === 'robots'

  return (
    <article
      style={{
        border: azione.stato === 'fallita' ? '1px solid #A8431C' : '1px solid #DDE1DC',
        borderRadius: 6,
        padding: 16,
        marginBottom: 12,
        background: '#fff',
      }}
    >
      <div style={{ fontSize: 12, color: '#7C857F' }}>
        {etichettaStato} · {azione.regola} · {etichettaCampo}
        {quando(azione.creata_il) ? ` · ${quando(azione.creata_il)}` : ''}
      </div>
      <p style={{ margin: '8px 0', wordBreak: 'break-all' }}>{azione.bersaglio}</p>
      <p style={{ margin: '8px 0' }}>{azione.motivo}</p>
      <p style={{ fontSize: 14 }}>
        <strong>Ora sul sito:</strong> {azione.valore_vecchio || '(vuoto)'}
      </p>
      {!scrivibile && inCoda && (
        <p style={{ fontSize: 14, background: '#EDEFEC', padding: 10, borderRadius: 4 }}>
          Questa e una nota, non un testo da pubblicare. Il pannello non puo scriverla da solo sul sito
          (serve un link in un articolo, o i dati strutturati nel tema). Chiudila se l hai letta, oppure
          sistemala a mano e poi chiudila.
        </p>
      )}
      {scrivibile && inCoda && (
        <p style={{ fontSize: 13, color: '#4A524E' }}>
          Puoi correggere il testo sotto, poi Approva. Resta in questa pagina: vedrai se e andata a buon fine.
        </p>
      )}
      {azione.guadagno_stimato != null && (
        <p style={{ fontSize: 13, color: '#4A524E' }}>Stima: circa {azione.guadagno_stimato} clic in piu nel periodo.</p>
      )}
      {azione.stato === 'fallita' && azione.errore && (
        <p style={{ fontSize: 14, color: '#A8431C' }}>
          <strong>Perche non e riuscita:</strong> {azione.errore}
        </p>
      )}
      {azione.riferimento_esterno && (
        <p style={{ fontSize: 13 }}>
          Richiesta: <a href={azione.riferimento_esterno}>{azione.riferimento_esterno}</a>
        </p>
      )}
      {azione.stato === 'applicata' && quando(azione.applicata_il) && (
        <p style={{ fontSize: 13, color: '#4A524E' }}>Applicata il {quando(azione.applicata_il)}</p>
      )}

      {attesa && (
        <p style={{ fontSize: 14, fontWeight: 600, color: '#1F6F5C' }}>
          {attesa === 'applica' && 'Sto applicando sul sito. Non chiudere la pagina.'}
          {attesa === 'rifiuta' && 'Sto chiudendo la proposta.'}
          {attesa === 'annulla' && 'Sto rimettendo il valore precedente.'}
        </p>
      )}

      {inCoda && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {scrivibile && (
            <form
              method="POST"
              action={`/api/azioni/applica?sito=${sitoId}`}
              style={{ flex: '1 1 280px' }}
              onSubmit={() => setAttesa('applica')}
            >
              <input type="hidden" name="id" value={azione.id} />
              <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                {robots ? 'robots.txt da pubblicare (modificalo se serve)' : 'Testo da pubblicare (modificalo se serve)'}
              </label>
              <textarea
                name="valore_nuovo"
                defaultValue={azione.valore_nuovo ?? ''}
                rows={robots ? 14 : 3}
                required
                disabled={!!attesa}
                style={{
                  width: '100%',
                  font: robots ? '13px ui-monospace, Menlo, monospace' : 'inherit',
                  padding: 8,
                  borderRadius: 4,
                  border: '1px solid #C4CAC3',
                }}
              />
              <button type="submit" style={{ ...bottonePrimario, marginTop: 8 }} disabled={!!attesa}>
                {attesa === 'applica' ? 'Sto applicando...' : 'Approva e applica'}
              </button>
            </form>
          )}
          <form method="POST" action="/api/azioni/rifiuta" onSubmit={() => setAttesa('rifiuta')}>
            <input type="hidden" name="id" value={azione.id} />
            <button type="submit" style={bottoneSecondario} disabled={!!attesa}>
              {scrivibile ? 'Rifiuta' : 'Ho letto, chiudi'}
            </button>
          </form>
        </div>
      )}

      {azione.stato === 'applicata' && (
        <form method="POST" action="/api/azioni/annulla" style={{ marginTop: 10 }} onSubmit={() => setAttesa('annulla')}>
          <input type="hidden" name="id" value={azione.id} />
          <button type="submit" style={bottoneSecondario} disabled={!!attesa}>
            {attesa === 'annulla' ? 'Sto annullando...' : 'Annulla (rimetti il valore precedente)'}
          </button>
        </form>
      )}
    </article>
  )
}
