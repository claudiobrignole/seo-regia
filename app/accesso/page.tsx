export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Accesso',
  robots: { index: false, follow: false },
}

export default async function Accesso({
  searchParams,
}: {
  searchParams: Promise<{ poi?: string; errore?: string }>
}) {
  const p = await searchParams

  return (
    <main className="al-accesso">
      <form method="POST" action="/api/accesso" className="al-scheda">
        <div className="al-accesso-marca">
          <img src="/marchio/b-brignole.png" alt="" width={48} height={48} />
          <div>
            <p className="al-eyebrow">Pannello interno</p>
            <h1>Regia SEO</h1>
          </div>
        </div>

        <input type="hidden" name="poi" value={p.poi ?? '/'} />

        <label htmlFor="password" className="al-label">
          Password
        </label>
        <input
          id="password"
          className="al-campo"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
        />

        {p.errore && (
          <p className="al-avviso" style={{ marginTop: 16 }}>
            Password non valida. Riprova.
          </p>
        )}

        <button type="submit" className="al-btn al-btn-primary" style={{ marginTop: 16, width: '100%' }}>
          Entra
        </button>
      </form>
    </main>
  )
}
