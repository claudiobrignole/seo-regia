import { SITI, sito, type Sito } from '@/siti.config'
import { query } from '@/lib/db'
import { annota, segnaRifiutata } from '@/lib/registro'

/**
 * Quali indirizzi di un sito hanno un titolo che si possa cambiare.
 *
 * Non tutti gli indirizzi che rispondono 200 sono pagine con un posto dove
 * scrivere. Su Aelle e brignole.ch tre famiglie non lo hanno, e finche il
 * pannello non lo sapeva ne proponeva la modifica e la scoperta arrivava al
 * momento di Approva, una scheda per volta:
 *
 *  - le schede del negozio Ecwid, che vivono dentro la pagina del negozio;
 *  - le pagine tradotte da TranslatePress, che non sono contenuti di WordPress;
 *  - i file caricati in Media, che non sono pagine.
 *
 * Chi propone chiede qui prima di mettere in coda; chi scrive chiede qui prima
 * di provare. La risposta e la frase da mostrare a Claudio, non un codice: deve
 * dire dove si cambia quel testo davvero.
 */

const CAMPI_DI_PAGINA = new Set(['titolo', 'descrizione', 'h1'])

/** Roba caricata in Media: PDF, immagini, archivi. */
const ESTENSIONI_FILE = /\.(pdf|zip|rar|docx?|xlsx?|pptx?|txt|csv|jpe?g|png|gif|webp|svg|avif|mp4|mp3|wav)$/i

function percorsoDi(url: string): string | null {
  try {
    return decodeURIComponent(new URL(url).pathname)
  } catch {
    return null
  }
}

/** Il negozio incorporato in questo dominio, se ce n e uno nel perimetro. */
function negozioDelDominio(s: Sito): Sito | null {
  return (
    SITI.find(
      (a) => a.id !== s.id && a.dominio === s.dominio && a.scrittura.tipo === 'ecwid' && a.percorsiNegozio?.length
    ) ?? null
  )
}

/**
 * La lingua in cui e tradotto questo indirizzo, se e una traduzione.
 *
 * La prima lingua dell elenco e quella originale: `/en/...` su un sito italiano
 * e una traduzione, `/it/...` non esiste. Il confronto e sul primo pezzo del
 * percorso, perche TranslatePress traduce anche il resto: la versione francese
 * di `/portfolio/gondola/` e `/fr/portefeuille/gondole/`.
 */
function linguaTradotta(s: Sito, url: string): string | null {
  const p = percorsoDi(url)
  if (!p) return null
  const primo = p.split('/').filter(Boolean)[0]?.toLowerCase()
  if (!primo) return null
  const altre = s.lingue.slice(1).map((l) => l.toLowerCase())
  return altre.includes(primo) ? primo : null
}

export function motivoNonScrivibile(s: Sito, url: string, campo: string): string | null {
  if (!CAMPI_DI_PAGINA.has(campo)) return null

  const p = percorsoDi(url)
  if (!p) return null

  if (p.includes('/wp-content/') || ESTENSIONI_FILE.test(p)) {
    return (
      'Questo e un file caricato in Media, non una pagina: titolo e descrizione SEO non hanno dove stare. ' +
      'Se quel documento deve farsi trovare, gli serve una pagina che lo presenti e che linki il file.'
    )
  }

  const negozio = negozioDelDominio(s)
  if (negozio && negozio.percorsiNegozio!.some((pre) => p.startsWith(pre))) {
    return (
      `Questa e una scheda del negozio: la disegna Ecwid dentro la pagina ${negozio.percorsiNegozio![0]}, ` +
      `e in WordPress non esiste. Il titolo si cambia nel pannello, sito ${negozio.nome}, dove le schede ` +
      `arrivano dal negozio e non dal sito.`
    )
  }

  const lingua = linguaTradotta(s, url)
  if (lingua && s.traduzioni === 'translatepress') {
    return (
      `Questa e la versione ${lingua.toUpperCase()} di una pagina italiana, disegnata da TranslatePress: ` +
      `un contenuto suo in WordPress non esiste, e scrivere qui cambierebbe il titolo dell originale. ` +
      `La traduzione del titolo si fa in WordPress, TranslatePress, Traduci il sito.`
    )
  }

  return null
}

/** Comodo per le regole: tiene solo gli indirizzi su cui si puo davvero agire. */
export function soloScrivibili<T extends { url: string }>(s: Sito, voci: T[], campo: string): T[] {
  return voci.filter((v) => !motivoNonScrivibile(s, v.url, campo))
}

/**
 * Chiude le schede in coda che non si potrebbero applicare comunque.
 *
 * Le rimette in stato rifiutata con il motivo nel registro, invece di lasciarle
 * in rosso a farsi riprovare: tre schede su quattro erano di questo tipo, e
 * ognuna costava un tentativo e una spiegazione.
 */
export async function chiudiProposteImpossibili(): Promise<number> {
  const righe = await query<{ id: number; sito_id: string; bersaglio: string; campo: string }>(
    `SELECT id, sito_id, bersaglio, campo FROM azioni
      WHERE stato IN ('proposta','approvata','fallita')
        AND campo IN ('titolo','descrizione','h1')`
  )
  let chiuse = 0
  for (const r of righe) {
    let motivo: string | null = null
    try {
      motivo = motivoNonScrivibile(sito(r.sito_id), r.bersaglio, r.campo)
    } catch {
      continue // sito uscito dal perimetro: non e questo il posto per deciderlo
    }
    if (!motivo) continue
    await segnaRifiutata(r.id)
    await annota(r.sito_id, 'rifiutata', r.id, { motivo })
    chiuse++
  }
  return chiuse
}
