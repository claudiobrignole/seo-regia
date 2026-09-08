/** Date in formato YYYY-MM-DD, fuso UTC come il resto del pannello. */

export function giornoIso(scarto = 0, da = new Date()): string {
  const d = new Date(Date.UTC(da.getUTCFullYear(), da.getUTCMonth(), da.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + scarto)
  return d.toISOString().slice(0, 10)
}

export function giorniFra(da: string, a: string): string[] {
  const out: string[] = []
  const cur = new Date(da + 'T00:00:00Z')
  const fine = new Date(a + 'T00:00:00Z')
  while (cur <= fine) {
    out.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return out
}
