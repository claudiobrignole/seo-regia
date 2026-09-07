import type { Sito } from '@/siti.config'

export type Proposta = {
  regola: string
  bersaglio: string
  campo: 'titolo' | 'descrizione' | 'alt' | 'jsonld' | 'robots' | 'slug' | 'seo_prodotto'
  valoreVecchio: string | null
  valoreNuovo: string
  motivo: string
  guadagnoStimato: number | null
  rischio: 'sicura' | 'da_approvare'
}

export type Regola = {
  nome: string
  descrizione: string
  esegui: (s: Sito) => Promise<Proposta[]>
}
