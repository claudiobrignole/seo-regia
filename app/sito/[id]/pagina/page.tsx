import { notFound } from 'next/navigation'
import Link from 'next/link'
import { query, unaRiga } from '@/lib/db'
import { SITI } from '@/siti.config'
import { Telaio } from '@/app/componenti/telaio'
import { diagnosiTraduzione } from '@/lib/siti/traduzione-dossier'
import { coperturaInItaliano } from '@/lib/regole/indicizzazione'
import type { Azione } from '@/lib/registro'
import { ChatClaude } from '@/app/componenti/chat-claude'

export const dynamic = 'force-dynamic'

export default async function DossierPagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ url?: string }>
}) {
  const { id } = await params
  const q = await searchParams
  const s = SITI.find((x) => x.id === id)
  if (!s) notFound()
  const url = (q.url ?? '').trim()
  if (!url.startsWith('http')) {
    return (
      <Telaio titolo="Dossier" sottotitolo={s.nome}>
        <p>Manca l indirizzo della pagina. Torna al <Link href={`/sito/${id}`}>sito</Link>.</p>
      </Telaio>
    )
  }

  const pagina = await unaRiga<any>(
    `SELECT * FROM pagine WHERE sito_id = ? AND url = ? LIMIT 1`,
    [id, url]
  )
  const ind = await unaRiga<any>(
    `SELECT * FROM indicizzazione WHERE sito_id = ? AND url = ? LIMIT 1`,
    [id, url]
  )
  const sc = await unaRiga<{ clic: number; impressioni: number; posizione: number | null }>(
    `SELECT SUM(clic) AS clic, SUM(impressioni) AS impressioni, AVG(posizione) AS posizione
       FROM misure
      WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina'
        AND chiave = ? AND giorno >= DATE_SUB(CURDATE(), INTERVAL 28 DAY)`,
    [id, url]
  )
  const queryTop = await query<{ extra: any; impressioni: number; chiave: string }>(
    `SELECT extra, impressioni, chiave FROM misure
      WHERE sito_id = ? AND fonte = 'search-console' AND tipo_chiave = 'pagina_query'
        AND (chiave LIKE ? OR extra LIKE ?)
      ORDER BY impressioni DESC LIMIT 8`,
    [id, `${url}|||%`, `%"pagina":"${url}"%`]
  )
  const azioni = await query<Azione>(
    `SELECT * FROM azioni WHERE sito_id = ? AND bersaglio = ? ORDER BY id DESC LIMIT 20`,
    [id, url]
  )
  const trad = await diagnosiTraduzione(s, url)

  const ricerche: string[] = []
  for (const r of queryTop) {
    let extra = r.extra
    if (typeof extra === 'string') {
      try {
        extra = JSON.parse(extra)
      } catch {
        extra = {}
      }
    }
    const qq = extra?.query ?? r.chiave.split('|||')[1]
    if (qq) ricerche.push(`${qq} (${r.impressioni})`)
  }

  return (
    <Telaio titolo="Dossier pagina" sottotitolo={s.nome}>
      <p className="al-bersaglio" style={{ wordBreak: 'break-all' }}>
        <a href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </p>
      <p>
        <Link href={`/sito/${id}`}>Torna alla coda del sito</Link>
      </p>

      <section className="al-scheda" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Search Console (28 giorni)</h2>
        <p>
          {Number(sc?.impressioni ?? 0)} impressioni, {Number(sc?.clic ?? 0)} clic
          {sc?.posizione != null ? `, posizione media ${Number(sc.posizione).toFixed(1)}` : ''}
        </p>
        {ricerche.length > 0 && (
          <p className="al-muted">Ricerche: {ricerche.join('; ')}</p>
        )}
      </section>

      <section className="al-scheda">
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Scansione</h2>
        {pagina ? (
          <>
            <p>
              <strong>Titolo:</strong> {pagina.titolo || '(vuoto)'}
            </p>
            <p>
              <strong>H1:</strong> {pagina.h1 || '(vuoto)'}
            </p>
            <p>
              <strong>Descrizione:</strong> {pagina.descrizione || '(vuoto)'}
            </p>
            <p>
              <strong>Meta robots:</strong> {pagina.meta_robots || '(assente)'}
              {pagina.x_robots_tag ? ` · X-Robots-Tag: ${pagina.x_robots_tag}` : ''}
            </p>
            <p>
              <strong>Canonical:</strong> {pagina.canonical_url || (pagina.ha_canonical ? '(presente, valore non ancora letto)' : '(assente)')}
            </p>
            <p>
              <strong>HTTP:</strong> {pagina.stato_http}
              {pagina.stato_http_primo != null && pagina.stato_http_primo !== pagina.stato_http
                ? ` (primo: ${pagina.stato_http_primo})`
                : ''}
            </p>
          </>
        ) : (
          <p className="al-muted">Non ancora nella scansione.</p>
        )}
      </section>

      <section className="al-scheda">
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Indicizzazione Google</h2>
        {ind ? (
          <>
            <p>
              <strong>Verdetto:</strong> {ind.verdetto || '—'} · {coperturaInItaliano(ind.copertura)}
            </p>
            <p>
              <strong>Canonical tuo / Google:</strong> {ind.canonical_utente || '—'} /{' '}
              {ind.canonical_google || '—'}
            </p>
            <p className="al-muted">
              Ultima scansione Google: {ind.ultima_scansione_google || 'n.d.'}
              {ind.sitemap_referente ? ` · sitemap: ${ind.sitemap_referente}` : ''}
            </p>
            {ind.esito_chiamata !== 'ok' && (
              <p className="al-nota-box">{ind.messaggio || ind.esito_chiamata}</p>
            )}
          </>
        ) : (
          <p className="al-muted">Non ancora ispezionata. Arriva con il lavoro Indicizzazione.</p>
        )}
      </section>

      {trad && (
        <section className="al-scheda">
          <h2 style={{ fontSize: 18, marginTop: 0 }}>Traduzione (TranslatePress)</h2>
          <p>{trad.nota}</p>
          {trad.originaleUrl && (
            <p>
              <strong>Originale:</strong>{' '}
              <Link href={`/sito/${id}/pagina?url=${encodeURIComponent(trad.originaleUrl)}`}>
                {trad.originaleUrl}
              </Link>
            </p>
          )}
          {trad.hreflang.length > 0 && (
            <ul>
              {trad.hreflang.map((h) => (
                <li key={h.lingua + h.url}>
                  {h.lingua}: {h.url}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="al-scheda">
        <h2 style={{ fontSize: 18, marginTop: 0 }}>Azioni su questa pagina</h2>
        {azioni.length === 0 ? (
          <p className="al-muted">Nessuna scheda ancora.</p>
        ) : (
          <ul>
            {azioni.map((a) => (
              <li key={a.id}>
                <Link href={`/sito/${id}?vista=${a.stato === 'proposta' || a.stato === 'fallita' ? 'modificare' : 'storico'}&azione=${a.id}#azione-${a.id}`}>
                  #{a.id} {a.stato} · {a.campo} · {a.regola}
                </Link>
                <div className="al-muted">{a.motivo}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {azioni[0] && (azioni[0].stato === 'proposta' || azioni[0].stato === 'fallita' || azioni[0].stato === 'approvata') && (
        <section style={{ marginTop: 24 }}>
          <ChatClaude ambito="azione" riferimento={String(azioni[0].id)} ancora={`azione-${azioni[0].id}`} />
        </section>
      )}
    </Telaio>
  )
}
