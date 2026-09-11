import { Telaio } from '@/app/componenti/telaio'
import { ultimaPassata } from '@/lib/impianto'

export const dynamic = 'force-dynamic'

function quando(v: Date | string | null | undefined): string {
  if (!v) return 'in corso'
  const s = String(v)
  return s.length >= 16 ? s.slice(0, 16).replace('T', ' ') : s
}

export default async function PaginaImpianto() {
  const passata = await ultimaPassata()

  return (
    <Telaio
      titolo="Impianto"
      sottotitolo="Ogni notte il pannello prova da solo se Google, WordPress, GitHub e il database rispondono. Qui vedi l errore e cosa fare."
    >
      <form method="POST" action="/api/impianto/esegui" style={{ marginBottom: 24 }}>
        <button type="submit" className="al-btn al-btn-primary">
          Controlla adesso
        </button>
      </form>

      {!passata && (
        <p className="al-sezione-vuota">
          Ancora nessuna passata. Clicca Controlla adesso, oppure aspetta la sveglia notturna
          /api/cron/impianto.
        </p>
      )}

      {passata && (
        <>
          <p className="al-muted">
            Ultima passata {quando(passata.finita_il ?? passata.iniziata_il)}: {passata.n_ok} ok,{' '}
            {passata.n_fallito} da correggere, {passata.n_atteso} attesi (token di prova, CrUX, ecc.).
          </p>

          {passata.n_fallito > 0 && (
            <div className="al-avviso">
              <strong>
                {passata.n_fallito === 1 ? 'C e un problema.' : `Ci sono ${passata.n_fallito} problemi.`}
              </strong>
              <p style={{ margin: '8px 0 0' }}>
                Le righe arancio dicono cosa non risponde e cosa fare. Gli attesi non sono un bug del
                pannello.
              </p>
            </div>
          )}

          {passata.n_fallito === 0 && (
            <div className="al-esito">
              <strong>Nessun fallimento vero.</strong>
              <p style={{ margin: '8px 0 0' }}>
                Se restano righe attese, dipendono da inviti Google, token Ads di prova o chiavi
                opzionali.
              </p>
            </div>
          )}

          <table className="al-tabella">
            <thead>
              <tr>
                <th>Esito</th>
                <th>Controllo</th>
                <th>Risultato</th>
                <th>Cosa fare</th>
              </tr>
            </thead>
            <tbody>
              {passata.esiti.map((e) => (
                <tr key={`${e.codice}-${e.titolo}`} className={e.esito === 'fallito' ? 'al-riga-fallita' : undefined}>
                  <td>
                    <span
                      className={
                        e.esito === 'fallito'
                          ? 'al-tag al-tag-urgente'
                          : e.esito === 'atteso'
                            ? 'al-tag al-tag-media'
                            : 'al-tag al-tag-importante'
                      }
                    >
                      {e.esito === 'fallito' ? 'da correggere' : e.esito === 'atteso' ? 'atteso' : 'ok'}
                    </span>
                  </td>
                  <td>
                    <strong>{e.titolo}</strong>
                    <div className="al-muted">{e.codice}</div>
                  </td>
                  <td>{e.dettaglio}</td>
                  <td>{e.esito === 'ok' ? '' : e.cosaFare}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </Telaio>
  )
}
