'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const VOCI = [
  { href: '/', etichetta: 'Siti', prefisso: false },
  { href: '/pubblicita/brignole', etichetta: 'Pubblicita Brignole', prefisso: true },
  {
    href: '/pubblicita/biography-library',
    etichetta: 'Pubblicita Biography Library',
    prefisso: true,
  },
] as const

export function NavPannello() {
  const percorso = usePathname()
  return (
    <nav className="al-header-nav" aria-label="Pannello">
      {VOCI.map((v) => {
        const attiva = v.prefisso ? percorso.startsWith(v.href) : percorso === v.href
        return (
          <Link key={v.href} href={v.href} aria-current={attiva ? 'page' : undefined}>
            {v.etichetta}
          </Link>
        )
      })}
    </nav>
  )
}
