import { regolaCtrBasso } from './ctr-basso'
import { regolaMetaMancanti, regolaPagineOrfane, regolaDatiStrutturati } from './base'
import type { Regola } from './tipi'

export const REGOLE: Regola[] = [
  regolaCtrBasso,
  regolaMetaMancanti,
  regolaDatiStrutturati,
  regolaPagineOrfane,
]

export type { Regola, Proposta } from './tipi'
