import Link from 'next/link'
import { Telaio } from '@/app/componenti/telaio'
import { rapportoSettimanale } from '@/lib/rapporto'

export const dynamic = 'force-dynamic'

export default async function PaginaRapporto() {
  let titolo = 'Rapporto'
  let blocchi: { titolo: string; testo: string }[] = []
  let errore: string | null = null
  try {
    const r = await rapportoSettimanale()
    titolo = r.titolo
    blocchi = r.blocchi
  } catch (e) {
    errore = (e as Error).message
  }

  const emailPronta = Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RAPPORTO_EMAIL?.trim())

  return (
    <Telaio
      titolo="Rapporto settimanale"
      sottotitolo="Copertura e differenze rispetto alla settimana prima. Si aggiorna il lunedi col lavoro Indicizzazione."
    >
      <p className="al-muted">
        {emailPronta
          ? `Invio email attivo verso ${process.env.RAPPORTO_EMAIL}.`
          : 'Per riceverlo per email metti RESEND_API_KEY e RAPPORTO_EMAIL nelle variabili Hostinger.'}{' '}
        <Link href="/sveglia">Sveglia</Link>
      </p>
      {errore && (
        <div className="al-avviso">
          <strong>Non riesco a comporre il rapporto.</strong>
          <p>{errore}</p>
        </div>
      )}
      <h2 style={{ fontSize: 18 }}>{titolo}</h2>
      {blocchi.map((b) => (
        <section key={b.titolo} className="al-scheda">
          <h3 style={{ marginTop: 0, fontSize: 16 }}>{b.titolo}</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{b.testo}</pre>
        </section>
      ))}
    </Telaio>
  )
}
