import { query } from '@/lib/db'
import { completa, jsonDaRisposta } from '@/lib/modelli/completa'
import type { Proposta } from './tipi'
import type { Sito } from '@/siti.config'

/**
 * Compone titolo o descrizione nuovi. Non decide se c e un problema:
 * quello lo dicono le regole. Qui si riempie solo valore_nuovo.
 */

type TestoNuovo = { titolo?: string; descrizione?: string }

export async function queryDellaPagina(sitoId: string, url: string): Promise<string[]> {
  const righe = await query<{ extra: any; impressioni: number; chiave: string }>(
    `SELECT extra, impressioni, chiave FROM misure
      WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina_query'
        AND (chiave LIKE ? OR extra LIKE ?)
      ORDER BY impressioni DESC
      LIMIT 12`,
    [sitoId, `${url}|||%`, `%"pagina":"${url}"%`]
  )
  const out: string[] = []
  for (const r of righe) {
    let extra = r.extra
    if (typeof extra === 'string') {
      try {
        extra = JSON.parse(extra)
      } catch {
        extra = {}
      }
    }
    const q = extra?.query ?? r.chiave.split('|||')[1]
    if (q) out.push(`${q} (${r.impressioni} impressioni)`)
  }
  return out
}

export async function compoTesto(s: Sito, p: Proposta): Promise<string> {
  if (p.campo !== 'titolo' && p.campo !== 'descrizione') return p.valoreNuovo

  const pagina = await query<{ titolo: string | null; h1: string | null; descrizione: string | null; lingua: string | null }>(
    'SELECT titolo, h1, descrizione, lingua FROM pagine WHERE sito_id = ? AND url = ? LIMIT 1',
    [s.id, p.bersaglio]
  )
  const foto = pagina[0]
  const ricerche = await queryDellaPagina(s.id, p.bersaglio)
  const lingua = foto?.lingua || s.lingue[0] || 'it'

  const sistema =
    `Scrivi testi SEO in ${lingua} per il sito ${s.nome} (${s.dominio}). ` +
    `Rispondi SOLO con un JSON {"titolo":"...","descrizione":"..."}. ` +
    `Niente trattino lungo. Non inventare nomi, date, sconti o fatti. ` +
    `Tieni i nomi propri gia presenti. Titolo max 60 caratteri, descrizione max 155. ` +
    `Se le ricerche sono vuote, usa titolo e H1 della pagina, senza promettere traffico.`

  const utente = [
    `Pagina: ${p.bersaglio}`,
    `Titolo attuale: ${foto?.titolo ?? p.valoreVecchio ?? '(manca)'}`,
    `H1: ${foto?.h1 ?? '(manca)'}`,
    `Descrizione attuale: ${foto?.descrizione ?? '(manca)'}`,
    `Ricerche che portano qui: ${ricerche.length ? ricerche.join('; ') : 'ancora nessuna (sito poco o per nulla visibile, e normale)'}`,
    `Campo da migliorare: ${p.campo}`,
    `Perche: ${p.motivo}`,
  ].join('\n')

  const grezzo = await completa(sistema, utente)
  const parsed = jsonDaRisposta<TestoNuovo>(grezzo)
  const valore = p.campo === 'titolo' ? parsed.titolo : parsed.descrizione
  if (!valore?.trim()) throw new Error('Il modello non ha prodotto il campo richiesto')
  return valore.trim().replace(/\u2014/g, '-')
}
