import { regolaCtrBasso } from './ctr-basso'
import { regolaMetaMancanti, regolaPagineOrfane, regolaDatiStrutturati } from './base'
import { regolaRobotsSitemap } from './robots-sitemap'
import { regolaIndicizzazione } from './indicizzazione'
import { regolaAiOverview } from './ai-overview'
import { regolaCannibalizzazione } from './cannibalizzazione'
import { regolaPagina } from './pagina'
import { regolaLacune } from './lacune'
import { regolaPosizione } from './posizione'
import { regolaVitali, regolaMerchant } from './vitali-merchant'
import { regolaTitoliNonTradotti } from './traduzioni'
import { regolaNegozio } from './negozio'
import type { Regola } from './tipi'

export const REGOLE: Regola[] = [
  regolaRobotsSitemap,
  regolaIndicizzazione,
  regolaCtrBasso,
  regolaAiOverview,
  regolaPosizione,
  regolaMetaMancanti,
  regolaTitoliNonTradotti,
  regolaNegozio,
  regolaCannibalizzazione,
  regolaPagina,
  regolaLacune,
  regolaDatiStrutturati,
  regolaPagineOrfane,
  regolaVitali,
  regolaMerchant,
]

export type { Regola, Proposta } from './tipi'
