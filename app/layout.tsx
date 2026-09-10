import type { ReactNode } from 'react'
import './stili/aelle.css'

export const metadata = {
  title: 'Regia SEO',
  description: 'Pannello interno. Non indicizzabile.',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
