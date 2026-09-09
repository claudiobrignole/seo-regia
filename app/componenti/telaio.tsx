import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'

export function Telaio({
  titolo,
  sottotitolo,
  children,
}: {
  titolo: string
  sottotitolo?: string
  children: ReactNode
}) {
  return (
    <main style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 24px 80px' }}>
      <header style={{ borderBottom: '2px solid #161A18', paddingBottom: 16, marginBottom: 28 }}>
        <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#1F6F5C' }}>
          Pannello interno
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <h1 style={{ margin: '8px 0 0', fontSize: 32, letterSpacing: '-.02em' }}>{titolo}</h1>
          <form method="POST" action="/api/uscita">
            <button type="submit" style={bottoneSecondario}>
              Esci
            </button>
          </form>
        </div>
        {sottotitolo && (
          <p style={{ margin: '10px 0 0', fontSize: 14.5, color: '#4A524E', maxWidth: '70ch' }}>{sottotitolo}</p>
        )}
        <nav style={{ marginTop: 14, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 14 }}>
          <Link href="/" style={linkNav}>
            Siti
          </Link>
          <Link href="/pubblicita/brignole" style={linkNav}>
            Pubblicita Brignole
          </Link>
          <Link href="/pubblicita/biography-library" style={linkNav}>
            Pubblicita Biography Library
          </Link>
        </nav>
      </header>
      {children}
    </main>
  )
}

export const linkNav: CSSProperties = {
  color: '#161A18',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
}

export const bottoneSecondario: CSSProperties = {
  background: 'none',
  border: '1px solid #C4CAC3',
  borderRadius: 4,
  padding: '5px 11px',
  fontSize: 12.5,
  color: '#4A524E',
  cursor: 'pointer',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
}

export const bottonePrimario: CSSProperties = {
  background: '#1F6F5C',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '6px 12px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
}

export const esitoOk: CSSProperties = {
  background: '#E7F2EE',
  borderLeft: '3px solid #1F6F5C',
  padding: '16px 20px',
  marginBottom: 28,
  borderRadius: '0 4px 4px 0',
}

export const avviso: CSSProperties = {
  background: '#F6E7DF',
  borderLeft: '3px solid #A8431C',
  padding: '16px 20px',
  marginBottom: 28,
  borderRadius: '0 4px 4px 0',
}
