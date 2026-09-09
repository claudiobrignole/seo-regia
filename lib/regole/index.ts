import { regolaCtrBasso } from './ctr-basso'
import { regolaMetaMancanti, regolaPagineOrfane, regolaDatiStrutturati } from './base'
import { regolaRobotsSitemap } from './robots-sitemap'
import type { Regola } from './tipi'

export const REGOLE: Regola[] = [
  regolaRobotsSitemap,
  regolaCtrBasso,
  regolaMetaMancanti,
  regolaDatiStrutturati,
  regolaPagineOrfane,
]

export type { Regola, Proposta } from './tipi'
