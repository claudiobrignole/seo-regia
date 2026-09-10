/**
 * Un solo punto per chiedere un testo. Oggi solo Claude (Sonnet 5).
 * Gemini, Mistral e Grok restano nel file, spenti, se un giorno servono.
 */

function quale(): string {
  return (process.env.MODELLO_TESTI ?? 'claude').toLowerCase()
}

export async function completa(sistema: string, utente: string): Promise<string> {
  const m = quale()
  if (m === 'gemini') return gemini(sistema, utente)
  if (m === 'mistral') return mistral(sistema, utente)
  if (m === 'grok') return grok(sistema, utente)
  return claude(sistema, utente)
}

async function claude(sistema: string, utente: string): Promise<string> {
  const chiave = process.env.ANTHROPIC_API_KEY
  if (!chiave) {
    throw new Error(
      'Manca ANTHROPIC_API_KEY. Mettila nelle variabili di Hostinger, oppure cambia MODELLO_TESTI.'
    )
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': chiave,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: process.env.MODELLO_CLAUDE ?? 'claude-sonnet-5',
      // L API lo pretende. Non e un tetto sui testi: 8192 sta largo per bozze Ads e istruzioni.
      max_tokens: 8192,
      // Sonnet 5 accende il thinking da solo: per titoli e bozze lo spegniamo.
      thinking: { type: 'disabled' },
      system: sistema,
      messages: [{ role: 'user', content: utente }],
    }),
  })
  const corpo = await res.json()
  if (!res.ok) throw new Error(`Claude: ${res.status} ${corpo?.error?.message ?? ''}`)
  const testo =
    corpo.content
      ?.filter((c: { type?: string }) => !c.type || c.type === 'text')
      .map((c: { text?: string }) => c.text ?? '')
      .join('') ?? ''
  if (!testo.trim()) throw new Error('Claude ha risposto vuoto')
  return testo.trim()
}

async function gemini(sistema: string, utente: string): Promise<string> {
  const chiave = process.env.GEMINI_API_KEY
  if (!chiave) throw new Error('Manca GEMINI_API_KEY.')
  const modello = process.env.MODELLO_GEMINI ?? 'gemini-2.0-flash'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modello}:generateContent?key=${chiave}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: [{ role: 'user', parts: [{ text: utente }] }],
      }),
    }
  )
  const corpo = await res.json()
  if (!res.ok) throw new Error(`Gemini: ${res.status} ${JSON.stringify(corpo).slice(0, 300)}`)
  const testo = corpo.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? ''
  if (!testo.trim()) throw new Error('Gemini ha risposto vuoto')
  return testo.trim()
}

async function mistral(sistema: string, utente: string): Promise<string> {
  const chiave = process.env.MISTRAL_API_KEY
  if (!chiave) throw new Error('Manca MISTRAL_API_KEY.')
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${chiave}` },
    body: JSON.stringify({
      model: process.env.MODELLO_MISTRAL ?? 'mistral-small-latest',
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: utente },
      ],
    }),
  })
  const corpo = await res.json()
  if (!res.ok) throw new Error(`Mistral: ${res.status} ${corpo?.error?.message ?? ''}`)
  const testo = corpo.choices?.[0]?.message?.content ?? ''
  if (!testo.trim()) throw new Error('Mistral ha risposto vuoto')
  return testo.trim()
}

async function grok(sistema: string, utente: string): Promise<string> {
  const chiave = process.env.XAI_API_KEY
  if (!chiave) {
    throw new Error(
      'Manca XAI_API_KEY. Grok in Cursor non basta: per il lavoro notturno serve la chiave su console.x.ai.'
    )
  }
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${chiave}` },
    body: JSON.stringify({
      model: process.env.MODELLO_GROK ?? 'grok-4-6',
      messages: [
        { role: 'system', content: sistema },
        { role: 'user', content: utente },
      ],
    }),
  })
  const corpo = await res.json()
  if (!res.ok) throw new Error(`Grok: ${res.status} ${corpo?.error?.message ?? JSON.stringify(corpo).slice(0, 200)}`)
  const testo = corpo.choices?.[0]?.message?.content ?? ''
  if (!testo.trim()) throw new Error('Grok ha risposto vuoto')
  return testo.trim()
}

export function jsonDaRisposta<T>(testo: string): T {
  const blocco = testo.match(/\{[\s\S]*\}/)
  if (!blocco) throw new Error('La risposta del modello non contiene JSON')
  return JSON.parse(blocco[0]) as T
}
