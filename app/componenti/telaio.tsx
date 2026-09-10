import type { ReactNode } from 'react'
import Link from 'next/link'
import { NavPannello } from './nav-pannello'

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
    <>
      <header className="al-header">
        <div className="al-header-inner">
          <Link href="/" className="al-header-marca">
            <img src="/marchio/b-brignole.png" alt="" width={40} height={40} />
            <span>Regia SEO</span>
          </Link>
          <NavPannello />
          <form method="POST" action="/api/uscita" className="al-header-azioni">
            <button type="submit" className="al-btn al-btn-ghost">
              Esci
            </button>
          </form>
        </div>
      </header>
      <main className="al-container">
        <p className="al-eyebrow">Pannello interno</p>
        <h1>{titolo}</h1>
        {sottotitolo && <p className="al-pagina-sottotitolo">{sottotitolo}</p>}
        {children}
      </main>
    </>
  )
}
