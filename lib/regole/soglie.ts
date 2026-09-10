import { query } from '@/lib/db'

/** Impressioni Search Console sotto questa soglia: la nota non vale la coda. */
export const SOGLIA_NOTE = 30

export async function urlConImpressioni(
  sitoId: string,
  soglia = SOGLIA_NOTE
): Promise<Map<string, number>> {
  const righe = await query<{ chiave: string; impressioni: number }>(
    `SELECT chiave, SUM(impressioni) AS impressioni
       FROM misure
      WHERE sito_id = ?
        AND fonte = 'search-console'
        AND tipo_chiave = 'pagina'
        AND giorno >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)
      GROUP BY chiave
     HAVING SUM(impressioni) >= ?
      ORDER BY SUM(impressioni) DESC`,
    [sitoId, soglia]
  )
  return new Map(righe.map((r) => [r.chiave, Number(r.impressioni)]))
}
