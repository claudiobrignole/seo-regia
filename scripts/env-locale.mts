/**
 * Legge .env.local per gli script da terminale.
 *
 * In produzione le variabili arrivano da Hostinger e questo file non serve: qui
 * serve solo perche uno script lanciato a mano non ha l ambiente dell applicazione.
 * Sa leggere anche i JSON su piu righe (le credenziali dei due account di servizio).
 */

import { readFileSync, existsSync } from 'node:fs'

function togliApici(valore: string): string {
  const v = valore.trim()
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1)
  }
  return valore
}

export function caricaEnv(): void {
  if (!existsSync('.env.local')) return
  const righe = readFileSync('.env.local', 'utf8').split(/\r?\n/)
  let i = 0
  while (i < righe.length) {
    const tagliata = righe[i].trim()
    i++
    if (!tagliata || tagliata.startsWith('#')) continue
    const m = tagliata.match(/^([A-Z][A-Z0-9_]*)\s*=\s*(.*)$/)
    if (!m) continue
    let valore = togliApici(m[2])
    if (valore.trim().startsWith('{')) {
      const pezzi = [valore]
      while (i < righe.length) {
        const candidato = togliApici(pezzi.join('\n').trim())
        try {
          valore = JSON.stringify(JSON.parse(candidato))
          break
        } catch {
          if (/^[A-Z][A-Z0-9_]*=/.test(righe[i].trim())) break
          pezzi.push(righe[i])
          i++
        }
      }
    }
    if (!process.env[m[1]]) process.env[m[1]] = valore
  }
}
