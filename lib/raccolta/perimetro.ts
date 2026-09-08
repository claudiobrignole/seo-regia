import { SITI, type Sito } from '@/siti.config'

/**
 * Una proprieta Search Console si raccoglie una volta sola, sul primo sito
 * che la dichiara. Aelle e il negozio condividono il dominio: i clic stanno
 * su Aelle, le vendite su aelle-store.
 */
export function sitiPerSearchConsole(): Sito[] {
  const visti = new Set<string>()
  const out: Sito[] = []
  for (const s of SITI) {
    const k = `${s.identita}:${s.searchConsole}`
    if (visti.has(k)) continue
    visti.add(k)
    out.push(s)
  }
  return out
}

export function sitiPerAnalytics(): Sito[] {
  const visti = new Set<string>()
  const out: Sito[] = []
  for (const s of SITI) {
    if (!s.analyticsProperty) continue
    if (visti.has(s.analyticsProperty)) continue
    visti.add(s.analyticsProperty)
    out.push(s)
  }
  return out
}

export function sitiPerEcwid(): Sito[] {
  return SITI.filter((s) => s.scrittura.tipo === 'ecwid')
}
