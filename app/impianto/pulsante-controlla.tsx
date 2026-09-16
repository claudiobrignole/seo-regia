'use client'

import { useState, type FormEvent } from 'react'

export function PulsanteControllaImpianto() {
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAttesa(true)
    setErrore(null)
    try {
      const r = await fetch('/api/impianto/esegui', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      })
      const corpo = (await r.json().catch(() => null)) as { ok?: boolean; cosaFare?: string } | null
      if (!r.ok || !corpo?.ok) {
        setErrore(
          corpo?.cosaFare ||
            'Il controllo non e arrivato in fondo. Riprova e lascia aperta questa pagina, anche un minuto.'
        )
        setAttesa(false)
        return
      }
      window.location.assign('/impianto')
    } catch {
      setErrore('La rete si e interrotta. Riprova Controlla adesso e non chiudere la scheda.')
      setAttesa(false)
    }
  }

  return (
    <form method="POST" action="/api/impianto/esegui" onSubmit={onSubmit} style={{ marginBottom: 24 }}>
      <button type="submit" className="al-btn al-btn-primary" disabled={attesa}>
        {attesa ? 'Attendi' : 'Controlla adesso'}
      </button>
      <p className="al-muted" style={{ marginTop: 8 }}>
        Dopo un deploy premi qui. La tabella e l ultima passata salvata: non si aggiorna da sola.
      </p>
      {attesa && (
        <p className="al-attesa">
          Sto interrogando Google, WordPress e GitHub. Non chiudere: puo durare un minuto.
        </p>
      )}
      {errore && (
        <div className="al-avviso" style={{ marginTop: 12 }}>
          <strong>Non e finito.</strong>
          <p style={{ margin: '8px 0 0' }}>{errore}</p>
        </div>
      )}
    </form>
  )
}
