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

## Credenziali

In produzione le credenziali arrivano dalle **variabili d'ambiente** del pannello
Hostinger, non da un file: un `.env.local` creato a mano nel gestore file
verrebbe sovrascritto al rilascio successivo da GitHub. In locale si usa
`.env.local`, che `.gitignore` esclude. Il codice legge sempre `process.env`,
quindi le due strade sono equivalenti dal punto di vista del programma.

Il database si prepara con `npm run db:migra` oppure, senza terminale, con una
chiamata a `/api/setup/migra?chiave=LA_CHIAVE`. Lo schema e idempotente.

## Accesso al pannello

Una password sola, in `PANNELLO_PASSWORD`, e un cookie firmato che dura trenta
giorni (`lib/sessione.ts`). Il cookie contiene una scadenza e la sua firma, non
la password. Il `middleware.ts` manda alla pagina di accesso chi non ha il
biglietto, ma lascia passare `/api/cron` e `/api/setup`, che hanno la loro
chiave: un lavoro pianificato non sa fare login.

Cambiare `PANNELLO_PASSWORD` invalida tutte le sessioni aperte, ed e il modo di
chiudere fuori tutti se serve. Non ci sono utenti multipli e non servono: e un
pannello per una persona. Se un giorno dovesse aprirsi a piu persone, il punto
da cambiare e solo questo file piu una tabella utenti.

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

Vedi `docs/stato.md`: dice cosa è fatto, cosa manca e in che ordine, più i
numeri da cui nasce la regola principale. È il primo file da leggere quando si
riapre il progetto dopo una pausa.

In breve: l'impalcatura è completa e collaudata, ma il generatore dei testi
nuovi non c'è ancora. Le regole individuano le opportunità e lasciano
`valore_nuovo` vuoto, quindi nessuna proposta è applicabile finché
`lib/regole/testi.ts` non viene scritto.
