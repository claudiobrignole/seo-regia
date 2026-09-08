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
    <main
      style={{
        minHeight: '70vh',
        display: 'grid',
        placeContent: 'center',
        padding: '48px 24px',
      }}
    >
      <form
        method="POST"
        action="/api/accesso"
        style={{
          width: 'min(380px, 100%)',
          background: '#FFFFFF',
          border: '1px solid #DDE1DC',
          borderRadius: 8,
          padding: '30px 28px',
        }}
      >
        <div
          style={{
            fontSize: 11.5,
            letterSpacing: '.13em',
            textTransform: 'uppercase',
            color: '#1F6F5C',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}
        >
          Pannello interno
        </div>
        <h1 style={{ margin: '8px 0 20px', fontSize: 26, letterSpacing: '-.02em' }}>Regia SEO</h1>

        <input type="hidden" name="poi" value={p.poi ?? '/'} />

        <label
          htmlFor="password"
          style={{ display: 'block', fontSize: 13.5, marginBottom: 6, color: '#4A524E' }}
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 15,
            border: '1px solid #C4CAC3',
            borderRadius: 5,
            marginBottom: 16,
            background: '#FFFFFF',
            color: '#161A18',
          }}
        />

        {p.errore && (
          <p style={{ margin: '0 0 14px', fontSize: 13.5, color: '#A8431C' }}>
            Password non valida. Riprova.
          </p>
        )}

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '11px 14px',
            fontSize: 15,
            fontWeight: 600,
            color: '#FFFFFF',
            background: '#1F6F5C',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}
        >
          Entra
        </button>
      </form>
    </main>
  )
}
