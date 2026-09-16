import { query } from '@/lib/db'
import { Telaio } from '@/app/componenti/telaio'
import { LAVORI } from '@/lib/lavori'
import { SITI } from '@/siti.config'
import { PulsanteLavoro } from './pulsante-lavoro'

export const dynamic = 'force-dynamic'

type Riga = {
  lavoro: string
  iniziata_il: Date | string
  finita_il: Date | string | null
  esito: string | null
  righe: number | null
  messaggio: string | null
}

function quando(v: Date | string | null | undefined): string {
  if (!v) return 'mai'
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString('it-CH', { dateStyle: 'short', timeStyle: 'short' })
}

/** Il messaggio salvato puo essere lunghissimo: qui basta il primo pezzo. */
function accorcia(testo: string, n = 300): string {
  const pulito = testo.replace(/\s+/g, ' ').trim()
  return pulito.length > n ? `${pulito.slice(0, n)}...` : pulito
}

function oreDa(v: Date | string | null | undefined): number | null {
  if (!v) return null
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return null
  return (Date.now() - d.getTime()) / 3600000
}

export default async function PaginaSveglia() {
  let ultime: Riga[] = []
  let errore: string | null = null
  try {
    ultime = await query<Riga>(
      `SELECT e.lavoro, e.iniziata_il, e.finita_il, e.esito, e.righe, e.messaggio
         FROM esecuzioni e
         INNER JOIN (
           SELECT lavoro, MAX(id) AS id FROM esecuzioni GROUP BY lavoro
         ) x ON x.id = e.id`
    )
  } catch (e) {
    errore = (e as Error).message
  }
  const perLavoro = new Map(ultime.map((r) => [r.lavoro, r]))
  const sitiSemplici = SITI.map((s) => ({ id: s.id, nome: s.nome }))

  return (
    <Telaio
      titolo="Sveglia e lavori"
      sottotitolo="Ogni riga e un lavoro del ciclo. Puoi lanciarlo adesso senza aspettare la notte: serve a sapere se funziona, non a sostituire la sveglia."
    >
      {errore && (
        <div className="al-avviso">
          <strong>Il database non risponde.</strong>
          <p style={{ margin: '8px 0 0' }}>{errore}</p>
        </div>
      )}

      <div className="al-scheda" style={{ marginBottom: 24 }}>
        <strong>Come leggere questa pagina</strong>
        <p style={{ margin: '8px 0 0' }}>
          Se una riga dice <em>mai</em>, quel lavoro non ha ancora girato: premi Lancia adesso e guarda cosa
          risponde. Se dice un orario di stanotte, la sveglia di Hostinger sta funzionando. Se dice un orario
          vecchio di giorni, la sveglia non arriva: i Cron Jobs stanno su brignole.ch e devono chiamare i file PHP
          della cartella public_html/regia-sveglia.
        </p>
      </div>

      {LAVORI.map((l) => {
        const r = perLavoro.get(l.nome)
        const ore = oreDa(r?.iniziata_il)
        const vecchio = ore != null && ore > l.ogniOre
        const mai = !r
        return (
          <article key={l.nome} className={`al-scheda${mai || vecchio ? ' al-scheda-fallita' : ''}`}>
            <p className="al-muted">{l.quando}</p>
            <h2 style={{ margin: '4px 0 8px' }}>{l.titolo}</h2>
            <p style={{ margin: '0 0 12px' }}>{l.spiegazione}</p>

            <p className="al-muted" style={{ margin: '0 0 12px' }}>
              Ultima volta: <strong>{quando(r?.iniziata_il)}</strong>
              {r ? ` — esito ${r.esito ?? 'in corso'}` : ''}
              {r?.righe != null ? `, ${r.righe} righe` : ''}
              {ore != null ? ` (circa ${Math.round(ore)} ore fa)` : ''}
              {mai && ' — non ha mai girato'}
              {vecchio && ' — piu vecchia del previsto: la sveglia non sta arrivando'}
            </p>

            {r?.messaggio && (
              <p className="al-muted" style={{ margin: '0 0 12px' }}>
                Ultimo messaggio: {accorcia(r.messaggio)}
              </p>
            )}

            <PulsanteLavoro
              lavoro={l.nome}
              etichetta="Lancia adesso"
              siti={l.perSito ? sitiSemplici : undefined}
            />
          </article>
        )
      })}
    </Telaio>
  )
}
