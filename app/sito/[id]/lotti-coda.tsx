'use client'

import { useState } from 'react'

/**
 * Pulsanti per Approva/Chiudi a lotti sullo stesso gruppo regola+campo.
 */
export function LottiCoda({
  sitoId,
  regola,
  campo,
  quante,
  vista,
  scrivibile,
}: {
  sitoId: string
  regola: string
  campo: string
  quante: number
  vista: string
  scrivibile: boolean
}) {
  const [attesa, setAttesa] = useState(false)
  if (quante < 2) return null

  return (
    <form
      method="POST"
      action="/api/azioni/lotto"
      onSubmit={() => setAttesa(true)}
      style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '8px 0 16px' }}
    >
      <input type="hidden" name="sito_id" value={sitoId} />
      <input type="hidden" name="regola" value={regola} />
      <input type="hidden" name="campo" value={campo} />
      <input type="hidden" name="vista" value={vista} />
      {scrivibile ? (
        <button
          type="submit"
          name="operazione"
          value="applica"
          className="al-btn"
          disabled={attesa}
        >
          {attesa ? 'Attendi…' : `Approva le ${quante} di questo tipo`}
        </button>
      ) : null}
      <button
        type="submit"
        name="operazione"
        value="rifiuta"
        className="al-btn al-btn-tenue"
        disabled={attesa}
      >
        {attesa ? 'Attendi…' : `Chiudi le ${quante} di questo tipo`}
      </button>
    </form>
  )
}
