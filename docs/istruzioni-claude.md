# Istruzioni per Claude: controllo e prova del pannello

Questo file è per un agente (Claude Code, Cursor, o un altro Claude con accesso
al repository). Claudio chiede di **controllare e provare da solo** se le
funzioni ci sono, se rispondono, e se i risultati sono quelli che servono.

Non è la guida per Claudio (`istruzioni-tue.md`, `passi-rimasti.md`).
Non è la mappa del codice (`CLAUDE.md`). Qui c’è solo: cosa lanciare, cosa
deve tornare, cosa è un fallimento vero, cosa è atteso.

Prima di toccare codice o siti, leggi `CLAUDE.md` (cinque vincoli) e
`docs/stato.md`.

## Quando usarlo

Claudio dice di testare, verificare, controllare l’impianto, vedere se la
raccolta gira, se Approva funziona, se i due banchi Ads sono separati, se
Biography Library è senza tracciatori. Allora segui **questo file dall’alto in
basso**, senza saltare i vincoli.

Alla fine consegna un **rapporto** nel formato del capitolo “Rapporto”.
Nel pannello in produzione gli stessi controlli (in lettura) stanno in
**/impianto** e girano ogni notte con `/api/cron/impianto`.
Non dire “tutto ok” senza i risultati. Ogni riga ha un esito e un dato.

## Vincoli. Non si violano neanche in prova

1. **Il registro viene prima.** Nessuna scrittura su un sito senza aver letto
   il valore attuale e salvato `valore_vecchio`. Dopo Approva di prova, **Annulla**
   nella stessa sessione.
2. **Analytics non conta il traffico.** Search Console per i clic, Ecwid per
   le vendite. Analytics sempre filtrato per nome host. Sui siti Biography
   Library **non** si installa Analytics, GTM, pixel.
3. **Due identità.** `GOOGLE_*` e `BL_*` non si mescolano. Due JSON, due email
   `iam.gserviceaccount.com`.
4. **Due banchi Ads.** Token, manager, schermate e totali di spesa restano
   due. Non sommare. Banco Brignole sola lettura. Grants: unica scrittura Ads
   = caricamento conversioni dai moduli (`lib/ads/carica-conversioni.ts`).
5. **Siti Node:** si scrive solo `seo/contenuti.json` e `seo/robots.txt`, mai
   il codice. In prova **non** aprire PR a caso sui repo satellite.

Altri divieti in prova:

- Non commettere, non fare push, se Claudio non l’ha chiesto.
- Non cambiare `PANNELLO_PASSWORD` (invalida le sessioni).
- Non lanciare `scansione` senza `?sito=`: Aelle da sola può fare 504.
- Non ricaricare in loop un 504.
- Non usare `--siti` (Approva/Annulla) se Claudio non ha detto di scrivere
  su un sito vero.
- Non stampare password, token, chiavi private, JSON completo. Email `iam` e
  `client_id` si possono mostrare: servono agli inviti.

## Come partire

Cartella del progetto. Node 20 o più. Credenziali in `.env.local` (locale)
oppure nelle variabili Hostinger (produzione). Il codice legge `process.env`.

Se `.env.local` ha solo segnaposto vuoti, i controlli B/C/E/F escono
`fallito` o `saltato` **sul Mac**, e non dicono se Hostinger è a posto.
Per l’impianto vero: `.env.local` con gli stessi nomi (mai su GitHub),
oppure `PANNELLO_URL=https://seo.brignole.ch` e `--cron` dopo che la
chiave c’è. I controlli G (accesso, middleware, cron senza chiave) parlano
già del pannello in produzione.

```bash
npm run verifica
```

Lo script `scripts/verifica-impianto.mjs` fa i controlli in lettura: codice,
variabili, database, Google, WordPress, GitHub, Ecwid, pannello. Stampa un
rapporto e termina con codice 1 se c’è almeno un **fallito**.

Poi, se le credenziali ci sono e Claudio vuole il ciclo notturno:

```bash
npm run verifica -- --cron
```

Chiama le rotte protette da `CRON_CHIAVE` (base: `PANNELLO_URL` o
`https://seo.brignole.ch`). Scrive nel database (misure, pagine, proposte),
**non** sui siti.

Solo se Claudio chiede esplicitamente di provare Approva e Annulla: lo script
**non** scrive da solo. Segui il capitolo I a mano (una proposta di titolo su
brignole.ch, poi Annulla nella stessa sessione). Se non c’è una proposta
applicabile, **non** inventare scritture.

Tipo TypeScript, a parte:

```bash
npx tsc --noEmit
```

Se manca `.next/types`, `npm run build` in locale oppure ignora gli errori
di tipi Next e continua i controlli funzionali.

## Esiti

| Esito | Significato |
| --- | --- |
| `ok` | La funzione c’è e il risultato è quello atteso. |
| `fallito` | Doveva funzionare e non funziona. Serve un intervento. |
| `atteso` | Risposta sbagliata o vuota **per una causa già nota** (token Ads di prova, JSON BL mancante, CrUX senza chiave). Non è un bug del codice. |
| `saltato` | Manca il prerrequisito (niente DB, niente rete, Claudio ha vietato le scritture). |

Un `atteso` non fa fallire lo script. Un `fallito` sì.

## Catalogo. Cosa deve tornare

Esegui in quest’ordine. Lo script copre A-G in lettura. H è `--cron`. I è
`--siti`. J è ispezione codice (anche a mano se lo script non arriva).

### A. Impianto codice

| Id | Controllo | Risultato necessario |
| --- | --- | --- |
| A1 | `package.json` script `dev`, `start`, `db:migra`, `verifica` | Presenti. Avvio produzione: `npm start`. |
| A2 | `siti.config.ts` | Ogni sito ha `id`, `identita` `brignole` o `biography-library`, `scrittura`. Biography Library e app: `analyticsProperty` **null**. Aelle store: scrittura Ecwid. Node: scrittura GitHub su `seo/contenuti.json`. |
| A3 | `lib/raccolta/perimetro.ts` | Search Console una volta per coppia identità+proprietà (Aelle e negozio non si raddoppiano). Analytics solo siti con proprietà. Ecwid solo `aelle-store`. |
| A4 | `lib/regole/index.ts` | Elenco: robots-sitemap, ctr-basso, ai-overview, posizione, meta-mancanti, cannibalizzazione, pagina, lacune, dati-strutturati, pagine-orfane, vitali, merchant. Ogni regola ha `esegui` che torna `Proposta[]` con `motivo` in italiano, senza trattino lungo. |
| A5 | `lib/modelli/completa.ts` | Predefinito Claude Sonnet 5. `MODELLO_TESTI=claude`. Gemini/Mistral/Grok nel file, spenti. |
| A6 | `lib/raccolta/google.ts` | `auth('brignole')` legge `GOOGLE_SERVICE_ACCOUNT_JSON`. `auth('biography-library')` legge `BL_SERVICE_ACCOUNT_JSON`. Se manca, errore che dice quale casella riempire. |
| A7 | `lib/ads/chiamata.ts` | `banco('brignole')` e `banco('biography-library')` usano variabili diverse. API Ads `v23` se non c’è override. |
| A8 | `lib/esecutori/` | Unico posto che scrive sui siti. `applica.ts` rilegge il valore attuale **prima** di salvare `valore_vecchio`. Campi applicabili: titolo, descrizione, seo_prodotto, robots (`CAMPI_DA_MODIFICARE`). Istruzione/h1/canonical: solo avviso. |
| A9 | `middleware.ts` | Aperte: `/accesso`, `/api/accesso`, `/api/cron`, `/api/setup`, font, marchio. Il resto richiede cookie di sessione. |
| A10 | Plugin `plugin-wp/regia-robots` e `regia-bl-grants` | Nessun `gtag`, GTM, Analytics, pixel. Grants: cookie `bl_gclid` httponly, REST `regia-bl/v1/conversioni`. Robots: REST `POST regia-seo/v1/robots`. |

### B. Variabili d’ambiente

Nomi, non valori. Produzione = Hostinger. Locale = `.env.local`.

Obbligatorie per il pannello: `PANNELLO_PASSWORD` (almeno 12), `CRON_CHIAVE`,
`PANNELLO_URL`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`,
`MODELLO_TESTI=claude`, `ANTHROPIC_API_KEY`.

Obbligatorie per Brignole: `GOOGLE_SERVICE_ACCOUNT_JSON`, `WP_AELLE_*`,
`WP_BRIGNOLE_*`, `ECWID_STORE_ID`, `ECWID_TOKEN`, `GITHUB_TOKEN`.

Obbligatorie per l’associazione: `BL_SERVICE_ACCOUNT_JSON`, `WP_BL_*`,
`GITHUB_TOKEN_BL`.

Ads: `GOOGLE_ADS_*` e `BL_ADS_*` (token, customer, manager). Token di **prova**
= `atteso` se Google risponde che non è Basic.

Opzionali: `CRUX_API_KEY`, `BL_ADS_CONVERSION_ACTION_ID`. Non devono esserci
`GEMINI_API_KEY` / `MISTRAL` / `XAI` usate in produzione.

Controllo identità: `client_email` del JSON Brignole ≠ `client_email` del JSON
BL. Customer Ads Brignole ≠ customer Ads BL. Token GitHub Brignole ≠ token BL.

### C. Database

`SELECT 1` deve riuscire. Tabelle da `db/schema.sql`:

misure, pagine, azioni, registro, verifiche, adgrants_stato, esecuzioni,
scansione_coda, campagne, campagne_giorni, campagne_parole, campagne_bozze,
campagne_verdetti, grants_conversioni, grants_impostazioni, tecnici.

Risultati utili (lettura):

```sql
SELECT lavoro, esito, righe, iniziata_il, LEFT(messaggio,180) AS msg
  FROM esecuzioni ORDER BY id DESC LIMIT 15;

SELECT fonte, sito_id, COUNT(*) n, MAX(giorno) ultimo
  FROM misure GROUP BY fonte, sito_id ORDER BY fonte, sito_id;

SELECT sito_id, COUNT(*) n, MAX(ultima_scansione) ultima
  FROM pagine GROUP BY sito_id;

SELECT stato, COUNT(*) n FROM azioni GROUP BY stato;

SELECT identita, COUNT(*) n FROM campagne GROUP BY identita;
```

Necessario dopo una raccolta Brignole: almeno una riga `misure` con
`fonte='search-console'` su `aelle` o `brignole`. Luna a zero è `ok`.
Biography Library a zero con JSON BL mancante è `atteso`.

`campagne` e `campagne_giorni` devono avere `identita` su ogni riga. Un totale
unico di spesa fra i due banchi è **fallito** (non esiste nel prodotto).

### D. Google in lettura

Account di servizio Brignole: elenco proprietà Search Console. Devono
comparire (Dominio o prefisso, come in `siti.config.ts`): aelle.hiphop,
brignole.ch, tagtalesgallery.com, kizunama.com, strangeglyph.xyz,
lunanihongo.com.

Account BL: deve comparire biographylibrary.org. Se 403/401: invito mancante
(`atteso` finché Claudio non invita; dopo gli inviti diventa `fallito`).

Analytics Data API solo con JSON Brignole, proprietà dei siti Brignole,
filtro host. Chiamare Analytics con JSON BL è **fallito**.

Ads: una query GAQL minima per identità. Token di prova che rifiuta l’account
vero = `atteso`. Token Basic che rifiuta = `fallito` (email `iam` non invitata
o banco sbagliato).

### E. WordPress in lettura

Per Aelle, brignole.ch, Biography Library, con password applicativa:

- `GET /wp-json/wp/v2/users/me` → 200, ruolo che permette i titoli.
- Indice `GET /wp-json/`: namespace `regia-seo/v1` sui tre siti (plugin robots).
- Solo BL: namespace `regia-bl/v1`. `GET /wp-json/regia-bl/v1/conversioni` →
  JSON `{ conversioni: [...] }` (elenco vuoto è `ok`).
- **Non** fare `POST` su robots in questa fase.

Se 401: password applicativa o utente sbagliato. Se robots manca: plugin non
attivo. File `robots.txt` fisico in radice: Approva robots darà 409; segnalalo
come `atteso` operativo, non come bug del pannello.

HTML di biographylibrary.org: niente `googletagmanager`, `gtag(`,
`google-analytics`, pixel Facebook.

### F. GitHub in lettura

`GITHUB_TOKEN`: accesso ai repo TagTales, kizunama, luna-nihongo, strangeglyph.
`GET /repos/{repo}` 200. Un 403 su `GET /repos/{repo}/pulls?per_page=1` vuol
dire che manca il permesso Pull requests: Approva scriverà il ramo e fallirà
dopo (già visto su Tag Tales).

`GITHUB_TOKEN_BL`: solo `biographylibrary/Biography-Library`. Non deve aprire
i repo Brignole (se lo fa, i token sono mescolati: **fallito**).

### G. Pannello HTTP

Base: `PANNELLO_URL` (produzione `https://seo.brignole.ch`).

| Id | Chiamata | Risultato necessario |
| --- | --- | --- |
| G1 | `GET /accesso` | 200, titolo Accesso, niente indicizzazione. |
| G2 | `GET /` senza cookie | 302/303 verso `/accesso`. |
| G3 | `GET /api/cron/raccolta` senza chiave | 401, JSON `errore: chiave non valida` e `cosaFare`. |
| G4 | `GET /api/setup/migra?chiave=SBAGLIATA` | HTML di errore, non Database pronto. |
| G5 | `GET /api/setup/migra?chiave=GIUSTA` | HTML **Database pronto**. Idempotente. |

Login: `POST /api/accesso` con password, poi `GET /` 200. Home: briefing
(Da fare adesso / Da fare), due link pubblicità distinti, logo B Brignole,
sfondo sabbia non grigio-verde vecchio. Senza misure, home vuota di numeri è
`ok` se C non ha ancora search-console.

### H. Ciclo notturno (`--cron`)

Stessa chiave, header `x-chiave-cron` oppure `?chiave=`. Timeout alto.
Un 504 su Aelle **non** si ritenta in loop: è il tetto Hostinger, la coda
riprende.

| Rotta | Risposta JSON necessaria | Note |
| --- | --- | --- |
| `/api/cron/raccolta` | `{ righe, problemi, finestra: { da, a } }` | `righe` può essere 0 se le API rifiutano. `problemi` su ads token prova e su BL senza JSON = `atteso`. Search Console Brignole in `problemi` dopo inviti = `fallito`. |
| `/api/cron/scansione?sito=strangeglyph` | `{ pagine, problemi }` | Sito piccolo. `pagine >= 1` o coda tecnica. Poi `SELECT` su `pagine` e `tecnici` per quel sito. |
| `/api/cron/scansione?sito=aelle` | come sopra o 504 | Una volta, non in loop. |
| `/api/cron/diagnosi` | `{ proposte, problemi }` | Scrive in `azioni`. Chiama Claude per al massimo 6 testi. `proposte` numerico. Motivo di ogni nuova riga: frase italiana. |
| `/api/cron/verifica` | `{ verificate }` | `0` è `ok` se non ci sono azioni applicate da 14 giorni. |
| `/api/cron/citazioni` | `{ righe, problemi }` | Opzionale. Costa token Claude. Non è l’indice pubblico. |

Dopo raccolta, ricontrolla le query del capitolo C. Serve almeno search-console
su un sito Brignole, o un `problemi` esplicito che dice cosa manca.

### I. Scrittura su sito (`--siti`, solo se chiesto)

1. Scegli un’azione `stato='proposta'`, `sito_id='brignole'`, `campo='titolo'`,
   `valore_nuovo` non vuoto.
2. `POST /api/azioni/applica` JSON `{ id }` con cookie di sessione, oppure
   dallo script con la stessa logica di `applicaAzione` **solo** se gira nel
   processo Next. Via HTTP è più sicuro.
3. Risposta `{ ok: true }` oppure redirect `esito=applicata`.
4. `SELECT valore_vecchio, stato FROM azioni WHERE id=?` : stato `applicata`,
   `valore_vecchio` non nullo.
5. `SELECT evento FROM registro WHERE azione_id=?` : c’è `applicata`.
6. Rileggi il titolo pubblico della pagina.
7. `POST /api/azioni/annulla` con lo stesso id.
8. Stato `annullata`, registro `annullata`, titolo pubblico = valore vecchio.

Se fallisce a metà: **non** lasciare il titolo nuovo. Riprova Annulla. Se
Annulla fallisce, riportalo in cima al rapporto.

Non provare Approva su Tag Tales/Kizunama/Luna/StrangeGlyph/app BL in autonomia:
apre PR. Non provare robots se esiste il file fisico.

### J. Funzioni di prodotto (ispezione)

- Home `lib/briefing.ts`: max 8 urgente + 8 importante. Medie non in home.
  `comeSaprai` compilato. Posizione non è più urgente.
- Due pagine `/pubblicita/brignole` e `/pubblicita/biography-library`. Nessun
  totale sommato.
- Conversioni Grants: `caricaConversioniGrants` usa identità
  `biography-library` e nome azione `Modulo sito, senza pixel`.
- Crawler: pausa 700 ms, max 40 pagine a passata, limite 40 s. User-Agent
  `RegiaSEO/1.0`.
- Errori API: campo `cosaFare`, non solo cosa è andato storto.

## Cosa è atteso (non è un bug)

- Token Ads di prova: lettura account vero rifiutata.
- `BL_SERVICE_ACCOUNT_JSON` assente: Search Console e conversioni Grants BL
  in `problemi`.
- `CRUX_API_KEY` assente: vitali Chrome vuoti.
- Merchant senza invito: vitali negozio vuoti.
- `verificate: 0`.
- Luna Nihongo: clic a zero.
- 504 sulla scansione Aelle.
- Diagnosi `ripresa: tempo esaurito`.
- Approva GitHub 403 se il token non ha Pull requests.
- Home senza numeri prima della prima raccolta.

## Rapporto da consegnare a Claudio

Titolo: **Rapporto prova Regia SEO**, data, base (locale o
`https://seo.brignole.ch`).

Poi una tabella:

| Id | Esito | Risultato (numeri, non impressioni) | Cosa fare se non ok |
| --- | --- | --- | --- |

Sezioni obbligatorie in prosa, corte:

1. **Cosa gira:** raccolta, scansione, diagnosi, verifica, login, DB.
2. **Identità:** i due `client_email`, i due customer Ads. Conferma che non
   coincidono.
3. **Siti:** quali hanno misure Search Console, quali pagine scansionate,
   quante azioni in coda.
4. **WordPress / plugin:** robots e Grants visibili in `/wp-json/`. BL senza
   script Google nell’HTML.
5. **Ads:** prova o Basic; se i banchi restano vuoti, dirlo.
6. **Non provato** e perché (es. `--siti` non chiesto).
7. **Prossimi passi tuoi** (inviti, JSON BL, sveglie): solo se un `atteso`
   dipende da Claudio. Rimanda a `docs/passi-rimasti.md`.

Non inventare numeri. Se una chiamata non è partita, `saltato`.

## Se qualcosa si blocca

- Chiave cron: 401 con `cosaFare`. Non provare altre chiavi a caso.
- DB: HTML “Il database non risponde”. Non è la chiave, sono `DB_*`.
- Google 403 sulle proprietà: manca l’invito Proprietario sulla proprietà
  **Dominio**.
- WP 401: password per le applicazioni, utente Amministratore per robots.
- Hostinger 403 dal datacenter: prova dal browser di Claudio o da rete
  diversa; segnala `saltato` rete, non `fallito` codice.
- Screenshot: Claudio manda pagina intera con indirizzo in alto.

## File collegati

- Mappa: `CLAUDE.md`
- Stato: `docs/stato.md`
- Claudio, passi rimasti: `docs/passi-rimasti.md`
- Claudio, guida lunga: `docs/istruzioni-tue.md`
- Siti Node: `docs/siti-node.md`
- Script: `scripts/verifica-impianto.mjs`
