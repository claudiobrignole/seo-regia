'use client'

import { useState } from 'react'

/**
 * La chat sulla singola scheda: si chiede perche, e se serve si cambia.
 *
 * Nessuna mossa parte da sola. Claude propone, qui compare un pulsante, e finche
 * Claudio non lo premi non e cambiato niente: ne nella proposta ne sul sito.
 */

type Mossa = {
  tipo: 'cambia_testo' | 'chiudi_proposta' | 'scarta_bozza' | 'ricorda'
  valore?: string
  testo?: string
  ambito?: 'tutti' | 'sito' | 'pagina'
  perche?: string
  eseguita_il?: string
}

type Messaggio = {
  id: number
  ruolo: 'claudio' | 'claude'
  testo: string
  mosse: Mossa[]
  quando?: string
}

const ETICHETTA: Record<Mossa['tipo'], string> = {
  cambia_testo: 'Usa questo testo',
  chiudi_proposta: 'Chiudi la proposta',
  scarta_bozza: 'Scarta la bozza',
  ricorda: 'Ricorda questa indicazione',
}

function descriviMossa(m: Mossa): string {
  if (m.tipo === 'cambia_testo') return `Testo proposto (${(m.valore ?? '').length} caratteri):`
  if (m.tipo === 'ricorda') {
    const dove =
      m.ambito === 'sito' ? 'per questo sito' : m.ambito === 'pagina' ? 'per questo indirizzo' : 'per tutti i siti'
    return `Da ricordare ${dove}:`
  }
  return 'Motivo:'
}

function contenutoMossa(m: Mossa): string {
  if (m.tipo === 'cambia_testo') return m.valore ?? ''
  if (m.tipo === 'ricorda') return m.testo ?? ''
  return m.perche ?? 'Nessun motivo scritto.'
}

export function ChatClaude({
  ambito,
  riferimento,
  suggerimenti = [],
  battute = 0,
  ancora,
}: {
  ambito: 'azione' | 'campagna' | 'bozza'
  riferimento: string
  suggerimenti?: string[]
  /** Quante battute ci sono gia, per dirlo sul pulsante senza aprire. */
  battute?: number
  /** Dove tornare dopo un ricaricamento della pagina. */
  ancora?: string
}) {
  const [aperta, setAperta] = useState(false)
  const [caricata, setCaricata] = useState(false)
  const [messaggi, setMessaggi] = useState<Messaggio[]>([])
  const [domanda, setDomanda] = useState('')
  const [attesa, setAttesa] = useState(false)
  const [inCorso, setInCorso] = useState<string | null>(null)
  const [errore, setErrore] = useState<{ errore: string; cosaFare?: string } | null>(null)
  const [fatto, setFatto] = useState<string | null>(null)

  async function apri() {
    setAperta(true)
    if (caricata) return
    try {
      const r = await fetch(
        `/api/chat/conversazione?ambito=${ambito}&riferimento=${encodeURIComponent(riferimento)}`,
        { credentials: 'same-origin' }
      )
      const corpo = await r.json()
      setMessaggi(corpo?.messaggi ?? [])
    } catch {
      /* la conversazione passata non si e caricata: si puo comunque chiedere */
    } finally {
      setCaricata(true)
    }
  }

  async function chiedi(testo: string) {
    const pulita = testo.trim()
    if (!pulita || attesa) return
    setAttesa(true)
    setErrore(null)
    setFatto(null)
    setMessaggi((m) => [...m, { id: -Date.now(), ruolo: 'claudio', testo: pulita, mosse: [] }])
    setDomanda('')
    try {
      const r = await fetch('/api/chat/messaggio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ambito, riferimento, domanda: pulita }),
      })
      const corpo = await r.json()
      if (!corpo?.ok) {
        setErrore({ errore: corpo?.errore ?? 'Risposta illeggibile', cosaFare: corpo?.cosaFare })
        return
      }
      setMessaggi((m) => [
        ...m,
        { id: corpo.messaggioId, ruolo: 'claude', testo: corpo.testo, mosse: corpo.mosse ?? [] },
      ])
    } catch {
      setErrore({
        errore: 'La rete si e interrotta',
        cosaFare: 'Riprova senza chiudere la scheda: una risposta puo prendere una ventina di secondi.',
      })
    } finally {
      setAttesa(false)
    }
  }

  async function conferma(messaggioId: number, indice: number) {
    const chiave = `${messaggioId}-${indice}`
    setInCorso(chiave)
    setErrore(null)
    setFatto(null)
    try {
      const r = await fetch('/api/chat/mossa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ messaggioId, indice }),
      })
      const corpo = await r.json()
      if (!corpo?.ok) {
        setErrore({ errore: corpo?.errore ?? 'Non fatto', cosaFare: corpo?.cosaFare })
        return
      }
      setFatto(corpo.fatto ?? 'Fatto.')
      setMessaggi((m) =>
        m.map((x) =>
          x.id === messaggioId
            ? {
                ...x,
                mosse: x.mosse.map((mo, i) =>
                  i === indice ? { ...mo, eseguita_il: new Date().toISOString() } : mo
                ),
              }
            : x
        )
      )
      if (corpo.ricarica) {
        // La scheda sopra mostra ancora il testo vecchio: ricaricare e l unico
        // modo onesto di non far credere a Claudio che sia cambiato altro.
        if (ancora) window.location.hash = ancora
        window.setTimeout(() => window.location.reload(), 900)
      }
    } catch {
      setErrore({ errore: 'La rete si e interrotta', cosaFare: 'Ricarica la pagina e guarda com e adesso.' })
    } finally {
      setInCorso(null)
    }
  }

  if (!aperta) {
    return (
      <button type="button" className="al-btn al-btn-ghost al-chat-apri" onClick={apri}>
        Chiedi a Claude{battute > 0 ? ` (${battute} messaggi)` : ''}
      </button>
    )
  }

  return (
    <section className="al-chat" aria-label="Chat con Claude">
      <div className="al-chat-testa">
        <strong>Chiedi a Claude</strong>
        <button type="button" className="al-btn al-btn-ghost" onClick={() => setAperta(false)}>
          Chiudi
        </button>
      </div>

      {messaggi.length === 0 && caricata && (
        <p className="al-muted" style={{ margin: '0 0 12px' }}>
          Chiedi perche il pannello propone questa cosa, o dettagli che non vedi qui. Claude legge i numeri di
          questa scheda, non indovina. Se gli dai una indicazione, ti propone di ricordarla: da quel momento
          vale per i testi che scrive di notte.
        </p>
      )}

      {messaggi.map((m) => (
        <div key={m.id} className={m.ruolo === 'claudio' ? 'al-chat-mio' : 'al-chat-suo'}>
          <span className="al-chat-chi">{m.ruolo === 'claudio' ? 'Tu' : 'Claude'}</span>
          <p className="al-chat-testo">{m.testo}</p>
          {m.mosse.map((mo, i) => (
            <div key={i} className="al-chat-mossa">
              <span className="al-chat-chi">{descriviMossa(mo)}</span>
              <p className="al-chat-testo">{contenutoMossa(mo)}</p>
              {mo.tipo !== 'ricorda' && mo.perche && <p className="al-muted">{mo.perche}</p>}
              {mo.eseguita_il ? (
                <p className="al-muted">Confermato da te.</p>
              ) : (
                <button
                  type="button"
                  className="al-btn al-btn-primary"
                  onClick={() => conferma(m.id, i)}
                  disabled={inCorso !== null}
                >
                  {inCorso === `${m.id}-${i}` ? 'Attendi' : ETICHETTA[mo.tipo]}
                </button>
              )}
            </div>
          ))}
        </div>
      ))}

      {attesa && <p className="al-attesa">Claude sta leggendo i numeri di questa scheda.</p>}

      {fatto && (
        <div className="al-esito" role="status" style={{ marginBottom: 12 }}>
          <strong>Fatto.</strong>
          <p style={{ margin: '8px 0 0' }}>{fatto}</p>
        </div>
      )}

      {errore && (
        <div className="al-avviso" role="status" style={{ marginBottom: 12 }}>
          <strong>Non e arrivata la risposta.</strong>
          <p style={{ margin: '8px 0 0' }}>{errore.errore}</p>
          {errore.cosaFare && <p style={{ margin: '8px 0 0' }}>{errore.cosaFare}</p>}
        </div>
      )}

      {suggerimenti.length > 0 && messaggi.length === 0 && (
        <div className="al-chat-spunti">
          {suggerimenti.map((s) => (
            <button
              key={s}
              type="button"
              className="al-btn al-btn-outline"
              onClick={() => chiedi(s)}
              disabled={attesa}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <textarea
        className="al-area"
        rows={3}
        value={domanda}
        onChange={(e) => setDomanda(e.target.value)}
        placeholder="Per esempio: perche questo titolo e meglio di quello che c e adesso?"
        disabled={attesa}
      />
      <button
        type="button"
        className="al-btn al-btn-secondary"
        style={{ marginTop: 8 }}
        onClick={() => chiedi(domanda)}
        disabled={attesa || !domanda.trim()}
      >
        {attesa ? 'Attendi' : 'Chiedi'}
      </button>
    </section>
  )
}
