import type { VoceBriefing } from '@/lib/briefing'

export function VoceRegista({ voce }: { voce: VoceBriefing }) {
  const tag =
    voce.livello === 'urgente'
      ? 'al-tag al-tag-urgente'
      : voce.livello === 'importante'
        ? 'al-tag al-tag-importante'
        : 'al-tag al-tag-media'
  const etichetta =
    voce.livello === 'urgente' ? 'Urgente' : voce.livello === 'importante' ? 'Importante' : 'Quando puoi'
  return (
    <article className="al-scheda">
      <span className={tag}>{etichetta}</span>
      <p className="al-muted" style={{ marginTop: 10 }}>
        {voce.nomeSito}
      </p>
      <p>
        <strong>{voce.titolo}</strong>
      </p>
      <p className="al-bersaglio">{voce.motivo}</p>
      {voce.guadagnoStimato != null && (
        <p className="al-muted">Stima: circa {voce.guadagnoStimato} clic in piu nel periodo.</p>
      )}
      <p className="al-muted">{voce.comeSaprai}</p>
      <a className="al-voce-href" href={voce.href}>
        Apri
      </a>
    </article>
  )
}
