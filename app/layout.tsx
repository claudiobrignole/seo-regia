import type { ReactNode } from 'react'

export const metadata = {
  title: 'Regia SEO',
  description: 'Pannello interno. Non indicizzabile.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          background: '#F6F7F5',
          color: '#161A18',
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          fontSize: 15,
          lineHeight: 1.55,
        }}
      >
        {children}
      </body>
    </html>
  )
}
