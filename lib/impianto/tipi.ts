export type EsitoImpianto = 'ok' | 'fallito' | 'atteso'

export type ControlloImpianto = {
  codice: string
  titolo: string
  esito: EsitoImpianto
  dettaglio: string
  cosaFare: string
}

export type PassataImpianto = {
  id: number
  iniziata_il: Date | string
  finita_il: Date | string | null
  n_ok: number
  n_fallito: number
  n_atteso: number
}
