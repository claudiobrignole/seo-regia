'use client'

import { useState } from 'react'

type Risposta = {
  ok?: boolean
  righe?: number
  riassunto?: string
  problemi?: string[]
  errore?: string
  cosaFare?: string
  secondi?: number
}

export function PulsanteLavoro({
  lavoro,
  etichetta,
  siti,
}: {
  lavoro: string
  etichetta: string
  siti?: { id: string; nome: string }[]
}) {
  const [attesa, setAttesa] = useState(false)
  const [esito, setEsito] = useState<Risposta | null>(null)
  const [scelto, setScelto] = useState(siti?.[0]?.id ?? '')

  async function lancia() {
    setAttesa(true)
    setEsito(null)
    try {
      const r = await fetch('/api/lavori/esegui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ lavoro, sito: siti ? scelto : null }),
      })
      const corpo = (await r.json().catch(() => null)) as Risposta | null
      setEsito(
        corpo ?? {
          ok: false,
          errore: 'Risposta illeggibile',
          cosaFare: 'Riprova. Se si ripete, guarda i registri dell applicazione in hPanel.',
        }
      )
    } catch {
      setEsito({
        ok: false,
        errore: 'La rete si e interrotta',
        cosaFare: 'Riprova senza chiudere la scheda. Il lavoro puo durare piu di un minuto.',
      })
    } finally {
      setAttesa(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {siti && (
          <select
            className="al-campo"
            style={{ width: 'auto', maxWidth: 280 }}
            value={scelto}
            onChange={(e) => setScelto(e.target.value)}
            disabled={attesa}
            aria-label="Sito"
          >
            {siti.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        )}
        <button type="button" className="al-btn al-btn-primary" onClick={lancia} disabled={attesa}>
          {attesa ? 'Attendi' : etichetta}
        </button>
      </div>

      {attesa && (
        <p className="al-attesa">Sto lavorando. Non chiudere la scheda: puo durare piu di un minuto.</p>
      )}

      {esito && (
        <div className={esito.ok ? 'al-esito' : 'al-avviso'} role="status" style={{ marginTop: 12 }}>
          <strong>
            {esito.ok
              ? 'Fatto.'
              : esito.errore
                ? 'Non e arrivato in fondo.'
                : 'Fatto, ma con qualcosa da guardare.'}
          </strong>
          <p style={{ margin: '8px 0 0' }}>
            {esito.riassunto ?? esito.errore}
            {esito.secondi != null ? ` (${esito.secondi} secondi)` : ''}
          </p>
          {esito.cosaFare && <p style={{ margin: '8px 0 0' }}>{esito.cosaFare}</p>}
          {esito.problemi && esito.problemi.length > 0 && (
            <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {esito.problemi.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
          <p style={{ margin: '8px 0 0' }}>
            <a href="/sveglia" className="al-voce-href">
              Aggiorna questa pagina
            </a>
          </p>
        </div>
      )}
    </div>
  )
}
