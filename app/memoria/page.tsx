import Link from 'next/link'
import { Telaio } from '@/app/componenti/telaio'
import { tutteLeIndicazioni, type Indicazione } from '@/lib/memoria'
import { SITI } from '@/siti.config'

export const dynamic = 'force-dynamic'

const BANNER: Record<string, { ok: boolean; testo: string }> = {
  aggiunta: {
    ok: true,
    testo: 'Indicazione registrata. Da adesso entra nelle istruzioni dei testi che Claude scrive di notte.',
  },
  archiviata: {
    ok: true,
    testo: 'Archiviata: non entra piu nei testi nuovi. Resta scritta qui sotto, perche una decisione vecchia spiega perche si era deciso cosi.',
  },
  riattivata: { ok: true, testo: 'Rimessa in servizio: torna a valere sui testi nuovi.' },
  sito_sconosciuto: {
    ok: false,
    testo: 'Quel sito non e nel perimetro. Scegli un sito dall elenco, oppure metti l indicazione su tutti i siti.',
  },
  non_capito: { ok: false, testo: 'Richiesta non riconosciuta. Riprova dal modulo qui sotto.' },
  errore: { ok: false, testo: 'Non e andata a buon fine.' },
}

function quando(v: Date | string | null | undefined): string {
  if (!v) return ''
  const d = typeof v === 'string' ? new Date(v) : v
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('it-CH', { dateStyle: 'medium' })
}

function dove(i: Indicazione): string {
  if (i.ambito === 'pagina') return `solo ${i.bersaglio}`
  if (i.ambito === 'sito') return `solo ${SITI.find((s) => s.id === i.sito_id)?.nome ?? i.sito_id}`
  return 'tutti i siti'
}

function Riga({ i, attiva }: { i: Indicazione; attiva: boolean }) {
  return (
    <article className="al-scheda">
      <p className="al-muted" style={{ margin: '0 0 6px' }}>
        {dove(i)} • {i.origine === 'chat' ? 'detta in chat' : 'scritta a mano'}
        {quando(i.quando) ? ` • ${quando(i.quando)}` : ''}
      </p>
      <p style={{ margin: '0 0 12px' }}>{i.testo}</p>
      <form method="POST" action="/api/memoria">
        <input type="hidden" name="cosa" value={attiva ? 'archivia' : 'riattiva'} />
        <input type="hidden" name="id" value={i.id} />
        <button type="submit" className="al-btn al-btn-outline">
          {attiva ? 'Archivia' : 'Rimetti in servizio'}
        </button>
      </form>
    </article>
  )
}

export default async function PaginaMemoria({
  searchParams,
}: {
  searchParams: Promise<{ esito?: string; perche?: string }>
}) {
  const q = await searchParams
  const banner = q.esito ? BANNER[q.esito] : undefined

  let indicazioni: Indicazione[] = []
  let errore: string | null = null
  try {
    indicazioni = await tutteLeIndicazioni()
  } catch (e) {
    errore = (e as Error).message
  }

  const attive = indicazioni.filter((i) => i.stato === 'attiva')
  const archiviate = indicazioni.filter((i) => i.stato !== 'attiva')

  return (
    <Telaio
      titolo="Memoria"
      sottotitolo="Le indicazioni e le decisioni che hai preso. Quelle attive entrano nelle istruzioni di ogni testo che Claude scrive, cosi non devi ripetere due volte la stessa correzione."
    >
      {banner && (
        <div className={banner.ok ? 'al-esito' : 'al-avviso'} role="status">
          <strong>{banner.ok ? 'Fatto.' : 'Non e andata a buon fine.'}</strong>
          <p style={{ margin: '8px 0 0' }}>
            {banner.testo}
            {q.perche ? ` ${q.perche}` : ''}
          </p>
        </div>
      )}

      {errore && (
        <div className="al-avviso">
          <strong>La memoria non e leggibile.</strong>
          <p style={{ margin: '8px 0 0' }}>
            {errore}. Se la tabella manca, apri una volta /api/setup/migra?chiave=LA_CHIAVE e ricarica questa
            pagina.
          </p>
        </div>
      )}

      <h2>In servizio ({attive.length})</h2>
      {attive.length === 0 && !errore && (
        <p>
          Ancora niente. La memoria si riempie da sola: quando in una chat dici come vuoi le cose, Claude ti
          propone di ricordarlo e tu confermi. Le proposte le trovi nella pagina di ogni{' '}
          <Link href="/">sito</Link>.
        </p>
      )}
      {attive.map((i) => (
        <Riga key={i.id} i={i} attiva />
      ))}

      <h2>Aggiungine una a mano</h2>
      <form method="POST" action="/api/memoria" className="al-scheda">
        <input type="hidden" name="cosa" value="aggiungi" />
        <label className="al-label" htmlFor="testo-memoria">
          Cosa va ricordato, in una frase
        </label>
        <textarea
          id="testo-memoria"
          name="testo"
          className="al-area"
          rows={2}
          required
          placeholder="Per esempio: nei titoli non mettere mai il nome del sito, tanto Google lo aggiunge da solo."
        />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 12 }}>
          <div>
            <label className="al-label" htmlFor="ambito-memoria">
              Dove vale
            </label>
            <select id="ambito-memoria" name="ambito" className="al-campo" style={{ width: 'auto' }} defaultValue="tutti">
              <option value="tutti">Tutti i siti</option>
              <option value="sito">Un sito solo</option>
            </select>
          </div>
          <div>
            <label className="al-label" htmlFor="sito-memoria">
              Quale sito, se vale per uno solo
            </label>
            <select id="sito-memoria" name="sito_id" className="al-campo" style={{ width: 'auto', maxWidth: 280 }}>
              {SITI.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="al-btn al-btn-primary">
            Ricorda
          </button>
        </div>
      </form>

      {archiviate.length > 0 && (
        <>
          <h2>Archiviate ({archiviate.length})</h2>
          <p className="al-muted">
            Non valgono piu sui testi nuovi. Restano qui: fra sei mesi dicono perche a un certo punto si era
            deciso cosi.
          </p>
          {archiviate.map((i) => (
            <Riga key={i.id} i={i} attiva={false} />
          ))}
        </>
      )}
    </Telaio>
  )
}
