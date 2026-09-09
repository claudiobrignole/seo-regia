export type VistaSito = 'modificare' | 'note' | 'storico'

export const CAMPI_DA_MODIFICARE = new Set(['titolo', 'descrizione', 'seo_prodotto', 'robots'])

export function vistaSito(valore: unknown): VistaSito {
  return valore === 'note' || valore === 'storico' ? valore : 'modificare'
}
