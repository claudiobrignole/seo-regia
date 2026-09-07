# Regia SEO, mappa del progetto

Pannello che misura, diagnostica e corregge il SEO dei siti di Claudio Brignole.
Gira su Hostinger Business, piano che supporta Node.

## Le tre cose da sapere prima di toccare qualsiasi cosa

1. **Il registro viene prima dell'automazione.** Nessuna modifica automatica si
   accende se non è possibile annullarla. Ogni scrittura salva il valore
   precedente in `azioni.valore_vecchio` e passa da `lib/registro/`.
2. **Analytics non conta il traffico.** Complianz blocca i tag prima del consenso
   ai cookie, quindi Analytics vede solo chi accetta. Il traffico di ricerca si
   legge dalla Search Console, le vendite da Ecwid. Analytics serve solo per il
   comportamento, e sempre filtrato per nome host, perché la proprietà riceve
   dati falsi inviati da fuori.
3. **Due identità separate.** Il perimetro Brignole e l'associazione Biography
   Library usano due account di servizio distinti e non si mescolano mai.
   Vedi `identita` in `siti.config.ts`.

## Dove sta cosa

- `siti.config.ts` — i siti del perimetro. Aggiungerne uno è una voce qui, non codice.
- `lib/raccolta/` — Search Console, Analytics, Ecwid, Google. Solo lettura.
- `lib/scansione/crawler.ts` — legge le pagine una per una, con pausa. Gentile per scelta.
- `lib/regole/` — le diagnosi. Una regola, un file. La più importante è `ctr-basso.ts`.
- `lib/esecutori/` — WordPress, GitHub, Ecwid. Gli unici punti che scrivono.
- `lib/registro/` — storico e annullamento.
- `app/api/cron/` — le rotte che i lavori pianificati chiamano.
- `db/schema.sql` — lo schema. Si applica con `npm run db:migra`.
- `docs/decisioni.md` — perché le cose sono come sono, con la data.

## Come girano i lavori notturni

Non eseguiamo Node dal pianificatore, perché su questi ambienti la
configurazione cambia con gli aggiornamenti. Il pianificatore di hPanel chiama
delle rotte protette da chiave:

    curl -fsS -H "x-chiave-cron: $CRON_CHIAVE" https://seo.brignole.ch/api/cron/raccolta
    curl -fsS -H "x-chiave-cron: $CRON_CHIAVE" https://seo.brignole.ch/api/cron/scansione?sito=aelle
    curl -fsS -H "x-chiave-cron: $CRON_CHIAVE" https://seo.brignole.ch/api/cron/diagnosi
    curl -fsS -H "x-chiave-cron: $CRON_CHIAVE" https://seo.brignole.ch/api/cron/verifica

La scansione va un sito per notte: con la pausa fra le pagine, farli tutti
insieme supera qualunque limite di tempo.

## Regole di scrittura del codice

- Commenti e nomi in italiano, senza anglicismi dove esiste il termine italiano.
- Niente trattino lungo nei testi.
- Ogni regola diagnostica spiega nel `motivo` **perché** propone una cosa, in
  una frase che Claudio possa leggere senza tradurla.
- Prima di scrivere su un sito si rilegge sempre il valore attuale: se qualcuno
  ha cambiato le cose a mano, il valore da salvare per l'annullamento è quello vero.
- I siti su repository non si toccano mai direttamente: si apre una richiesta di
  modifica su `seo/contenuti.json`, mai sul codice.

## Stato

Impalcatura. Il generatore dei testi nuovi (`valore_nuovo` nelle proposte) non
c'è ancora: le regole individuano le opportunità e lasciano il campo vuoto.
Va scritto in `lib/regole/testi.ts`.
