import { eseguiControlli } from './controlli'
import { salvaPassata, ultimaPassata } from './salva'

export { eseguiControlli, salvaPassata, ultimaPassata }
export type { ControlloImpianto, EsitoImpianto, PassataImpianto } from './tipi'

export async function eseguiESalva() {
  const controlli = await eseguiControlli()
  const id = await salvaPassata(controlli)
  return { id, controlli }
}
