# Regia SEO, mappa del progetto

Pannello che misura, diagnostica e corregge il SEO dei siti di Claudio Brignole.
Gira su Hostinger Business, piano che supporta Node.

## Le cinque cose da sapere prima di toccare qualsiasi cosa

1. **Il registro viene prima dell'automazione.** Nessuna modifica automatica si
   accende se non è possibile annullarla. Ogni scrittura salva il valore
   precedente in `azioni.valore_vecchio` e passa da `lib/registro/`.
2. **Analytics non conta il traffico.** Complianz blocca i tag prima del consenso
   ai cookie, quindi Analytics vede solo chi accetta. Il traffico di ricerca si
   legge dalla Search Console, le vendite da Ecwid. Analytics serve solo per il
   comportamento, e sempre filtrato per nome host, perché la proprietà riceve
   dati falsi inviati da fuori. **Sui siti Biography Library Analytics non si
   installa affatto** (statuto: niente tracciatori sulle pagine).
3. **Due identità separate.** Il perimetro Brignole e l'associazione Biography
   Library usano due account di servizio distinti e non si mescolano mai.
   Vedi `identita` in `siti.config.ts`.
4. **Due banchi pubblicità.** Brignole a pagamento e Biography Library Ad Grants
   non condividono token, manager, schermate ne totali di spesa.
5. **Biography Library senza script di misura.** Search Console si verifica con
   DNS, Cloud serve al pannello. L unica scrittura su Google Ads e il caricamento
   notturno delle conversioni dai moduli del sito (`lib/ads/carica-conversioni.ts`).
   Il banco Brignole resta sola lettura. Nessun CSV a mano.

## Dove sta cosa

- `siti.config.ts` — i siti del perimetro. Aggiungerne uno è una voce qui, non codice.
- `lib/raccolta/` — Search Console, Analytics, Ecwid, Google Ads in lettura.
- `lib/modelli/` — testi: oggi solo Claude. Gemini, Mistral e Grok restano nel codice, spenti.
- `lib/ads/` — bozze, verdetti, e (solo Grants) caricamento conversioni dai moduli.
- `plugin-wp/regia-bl-grants/` — plugin WordPress Biography Library, senza script Google.
- `plugin-wp/regia-robots/` — lascia scrivere robots.txt al pannello (Rank Math o filtro).
- `lib/scansione/crawler.ts` — legge le pagine una per una, con pausa. Gentile per scelta.
- `lib/scansione/tecnici.ts` — fotografia di robots.txt e sitemap XML vera.
- `lib/regole/` — le diagnosi. Una regola, un file. La più importante è `ctr-basso.ts`.
- `lib/esecutori/` — WordPress, GitHub, Ecwid. Gli unici punti che scrivono.
- `lib/registro/` — storico e annullamento.
- `app/api/cron/` — le rotte che i lavori pianificati chiamano.
- `db/schema.sql` — lo schema. Si applica con `npm run db:migra`.
- `docs/decisioni.md` — perché le cose sono come sono, con la data.
- `docs/istruzioni-tue.md` — passi nel browser, per chi non programma.
- `docs/istruzioni-claude.md` — come un agente prova da solo che le funzioni
  rispondono. Comando: `npm run verifica` (ciclo notturno: `--cron`).

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

Controllo quotidiano dell impianto (Search Console, WordPress, GitHub, Ads),
i risultati stanno in /impianto:

    curl -fsS -H "x-chiave-cron: $CRON_CHIAVE" https://seo.brignole.ch/api/cron/impianto

Opzionale, sondaggio citazioni (campione di Claude, non indice
pubblico):

    curl -fsS -H "x-chiave-cron: $CRON_CHIAVE" https://seo.brignole.ch/api/cron/citazioni

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
  modifica su file di dati in `seo/` (`contenuti.json` per i testi, `robots.txt`
  per i crawler), mai sul codice.

## Stato

Vedi `docs/stato.md`: dice cosa è fatto, cosa manca e in che ordine, più i
numeri da cui nasce la regola principale. È il primo file da leggere quando si
riapre il progetto dopo una pausa.

Per **controllare e provare** l’impianto (raccolta, identità, WordPress,
GitHub, pannello): `docs/istruzioni-claude.md` e `npm run verifica`.
Nel pannello: voce **Impianto** (`/impianto`), sveglia `/api/cron/impianto`.

In breve: il ciclo e al posto, la home e un briefing (urgente, importante, quando
puoi) con lezioni a 14 giorni. Pannello in sabbia/inchiostro/arancio, logo B
Brignole. Manca il resto del collegamento operativo. Vedi `docs/istruzioni-tue.md`
e `docs/stato.md`.
