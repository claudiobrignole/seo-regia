# Cosa ti resta da fare (nel browser)

> **Aggiornamento del 16 settembre.** La lista di oggi, corta e con un documento
> per azione, sta in [`tuo/00-indice.md`](tuo/00-indice.md). Questo file resta
> come guida di riferimento: i punti 1, 2 e 3 sono fatti, e per provare i lavori
> non serve piu incollare indirizzi con la chiave (pannello, voce **Sveglia**,
> pulsante **Lancia adesso**).

Aggiornato l’11 settembre 2026. Questo file è la lista di oggi: i passi ancora
tuoi, in ordine, con i clic. Se una schermata ha un nome un po’ diverso, fermati
e manda uno screenshot con l’indirizzo in alto.

## Già fatto (non rifare)

- Codice su GitHub e pannello in produzione (home sabbia/arancio, logo B).
- Migrazione: **Database pronto**.
- Plugin **Regia robots** su Aelle, brignole.ch, Biography Library.
- Plugin **Regia BL Grants** sul sito dell’associazione.
- Le 27 variabili già in Hostinger (WordPress, Ecwid, GitHub, Claude, due
  banchi Ads, JSON Brignole). I token Ads di prova restano così finché Google
  non li alza a Basic.

**Non servono** Gemini, Mistral, Grok, `MODELLO_CLAUDE`, `BL_ADS_CONVERSION_ACTION_ID`.

**Non rifare** le chiavi già presenti. Non collegare l’account Grants sotto il
manager Brignole.

## Ordine

1. Account di servizio Biography Library (`BL_SERVICE_ACCOUNT_JSON`)
2. Inviti Google, identità Brignole
3. Inviti Google, identità Biography Library
4. Prove nel browser (raccolta, scansione Aelle, diagnosi, verifica)
5. Dieci sveglie Hostinger
6. Quando arriva l’email Google **Basic** (giorni o una o due settimane)
7. Opzionale (vitali Chrome, Merchant, citazioni)
8. Dopo, in Cursor: i siti Node devono leggere `seo/contenuti.json`

Finché manca il punto 1, Biography Library in Search Console resta cieca e le
conversioni Grants non si caricano. I punti 4 e 5 fanno vivere il pannello ogni
notte. Il punto 6 è attesa, non un lavoro di oggi.

---

## 1. Account di servizio Biography Library

Hai già `GOOGLE_SERVICE_ACCOUNT_JSON` (Brignole). Manca in Hostinger
**`BL_SERVICE_ACCOUNT_JSON`**. È un altro progetto Cloud, un’altra Gmail, un
altro file JSON. Non copiare il JSON Brignole in questa casella.

### 1a. Entrare nel Cloud giusto

1. Chiudi le schede Google aperte con la Gmail Brignole, o usa una finestra
   riservata / incognito.
2. Entra con la **Gmail dell’associazione**.
3. Apri [console.cloud.google.com](https://console.cloud.google.com).
4. In alto, selettore progetto. Cerca `regia-seo-biography`.
5. Se non c’è: **Nuovo progetto**, nome `regia-seo-biography`, Crea. Aspetta
   che in alto compaia quel nome. Non usare il progetto Brignole.

### 1b. Accendere solo due API

1. Menu (tre linee) → **API e servizi** → **Libreria**.
2. Cerca e **Abilita**, una alla volta:
   - Search Console API
   - Google Ads API
3. **Non** abilitare Analytics Data API. Sui siti dell’associazione non si
   misura con Analytics.

### 1c. Creare l’account di servizio e il JSON

1. **API e servizi** → **Credenziali**.
2. **Crea credenziali** → **Account di servizio**.
3. Nome: `regia-seo`. Crea e continua. Ruoli: puoi saltare (il permesso vero
   arriva dagli inviti Search Console e Ads, punto 3).
4. Fine. Apri l’account `regia-seo`.
5. Scheda **Chiavi** → **Aggiungi chiave** → **Crea nuova chiave** → **JSON**.
6. Si scarica un file. **Non** metterlo su GitHub, non allegarlo a una chat di
   gruppo. Aprilo con un editor di testo.

Dentro vedi una riga `client_email` che finisce con
`iam.gserviceaccount.com`. Copiala su un foglio. Serve al punto 3. È
**un’altra** email rispetto a quella Brignole.

### 1d. Incollare in Hostinger

1. hPanel → applicazione Node `seo.brignole.ch` → variabili d’ambiente.
2. Nuova variabile:
   - nome: `BL_SERVICE_ACCOUNT_JSON`
   - valore: **tutto** il contenuto del file JSON, dalle graffe `{` `}`,
     niente virgolette intorno, niente spazi prima o dopo.
3. Salva.
4. **Riavvia** l’applicazione Node. Senza riavvio la variabile nuova non esiste
   per il programma.

Se Hostinger rifiuta gli a capo del JSON: apri il file, togli gli a capo e
lascia una riga sola, poi incolla. Se fallisce ancora, manda uno screenshot
della casella (nascondi il contenuto) e l’errore.

### Controllo del punto 1

In Hostinger compare `BL_SERVICE_ACCOUNT_JSON`. Hai sul foglio l’email
`…iam.gserviceaccount.com` **dell’associazione**, diversa da quella Brignole.

---

## 2. Inviti Google, identità Brignole

Le variabili non danno da sole il permesso di leggere i dati. Devi invitare
l’email `…iam.gserviceaccount.com` **Brignole** (quella del JSON già in
`GOOGLE_SERVICE_ACCOUNT_JSON`, non quella del punto 1).

Gmail **tua**. Non mescolare con la finestra dell’associazione.

### 2a. Search Console

Apri [search.google.com/search-console](https://search.google.com/search-console).

Per ogni dominio sotto, nel selettore in alto scegli la proprietà **Dominio**
(la riga senza `https://`). Non quella che inizia con `https://`.

Poi: Impostazioni (ingranaggio) → **Utenti e autorizzazioni** → **Aggiungi
utente** → email dell’account di servizio Brignole → permesso **Proprietario**.

Domini:

- aelle.hiphop
- brignole.ch
- tagtalesgallery.com
- kizunama.com
- strangeglyph.xyz
- lunanihongo.com

Se lunanihongo.com non è ancora una proprietà Dominio:

1. Aggiungi proprietà → **Dominio** → `lunanihongo.com`.
2. Google mostra un record DNS **TXT**.
3. hPanel del dominio Luna → DNS → nuovo record TXT, valore copiato da Google.
4. Torna in Search Console → **Verifica**. Può volerci qualche minuto.
5. Poi invita l’email Brignole come sopra.

Se l’invito sta solo sulla proprietà `https://…`, la raccolta di quel sito
fallisce. Ripeti sulla proprietà Dominio.

### 2b. Analytics (solo Brignole)

Apri Analytics. **Non** creare una proprietà per Biography Library.

Per ogni proprietà già usata dai siti Brignole: Amministrazione → Accesso alla
proprietà → aggiungi la stessa email `iam` Brignole → ruolo **Lettore**.

Il pannello filtra da solo per nome host (la proprietà Aelle riceve dati
falsi da fuori). Analytics non conta il traffico di ricerca: quello arriva
dalla Search Console.

### 2c. Google Ads Brignole, sola lettura

1. [ads.google.com](https://ads.google.com), account **Brignole** (nello
   screenshot dell’8 settembre: `712-100-7160`). Controlla in alto che non sia
   Biography Library (`289-519-5392`).
2. Amministrazione (ingranaggio in basso a sinistra) → **Accesso e sicurezza**.
3. Aggiungi l’email `iam` **Brignole**, permesso **Sola lettura**.
4. Non Admin. Non l’email dell’associazione.

Se Google rifiuta l’indirizzo `iam.gserviceaccount.com`, scrivimi: c’è un piano B.

### 2d. Una volta, Pianificatore di parole chiave

Sempre da Ads Brignole: Strumenti → Pianificatore di parole chiave → una ricerca
qualsiasi (es. lezioni di giapponese). Accende lo strumento per i budget
consigliati. Senza questa ricerca, quella parte resta spenta.

### Controllo del punto 2

In Search Console, su ogni proprietà Dominio Brignole, l’email `iam` Brignole
è Proprietario. In Analytics è Lettore. In Ads Brignole è Sola lettura.

---

## 3. Inviti Google, identità Biography Library

Altra Gmail, altra email `iam` (quella copiata al punto 1). Non usare
l’email Brignole. L’account Grants non sta sotto il manager Brignole.

### 3a. Search Console, solo DNS

1. Gmail **dell’associazione**.
2. Search Console → proprietà **Dominio** `biographylibrary.org`.
3. Se la proprietà non c’è: Aggiungi → Dominio → `biographylibrary.org`.
4. Verifica **solo con DNS** (record TXT su Hostinger del dominio
   biographylibrary.org). Niente meta nel tema, nessuno script Google, niente
   file HTML caricato nel sito.
5. Utenti: email `iam` **Biography Library** → **Proprietario**.

L’app `app.biographylibrary.org` sta sulla stessa proprietà Dominio. Non serve
una seconda proprietà.

### 3b. Google Ads Grants, permesso Standard

1. [ads.google.com](https://ads.google.com), account **Biography Library**
   (`289-519-5392`).
2. Accesso e sicurezza.
3. Email `iam` **BL**, permesso **Standard**.
   La sola lettura non basta: di notte il pannello carica le conversioni dei
   moduli. Non Admin. Non l’email Brignole.

### Controllo del punto 3

Search Console del dominio biographylibrary.org verificata con DNS. Email
`iam` BL Proprietario in Console e Standard in Ads Grants.

---

## 4. Prove nel browser (prima delle sveglie)

Qui non entri nel pannello con la password. Apri degli indirizzi, come hai
fatto per **Database pronto**. Ogni indirizzo dice al server: fai questo
lavoro adesso. La chiave nell’indirizzo sostituisce il login.

### 4.0 Copia la chiave

1. hPanel → applicazione Node `seo.brignole.ch` → **Environment variables**
   (variabili d’ambiente).
2. Trova `CRON_CHIAVE`. Copia il valore, nient’altro.
3. Niente virgolette, niente spazio prima o dopo, niente caratteri
   `#` `&` `+`. Se la chiave li contiene, usane una nuova solo di lettere e
   numeri, salva, **riavvia**, poi usa quella.

In ogni indirizzo sotto, al posto di `INCOLLA_LA_CHIAVE` metti quella parola,
attaccata dopo `chiave=`. Esempio (inventato):

`https://seo.brignole.ch/api/cron/raccolta?chiave=abc123def456`

**Cosa deve comparire:** una pagina di testo JSON (graffe `{` `}`, parole come
`righe` o `pagine`). Non la schermata di accesso. Non “chiave non valida”.

**Se compare chiave non valida (HTTP 401):** la parola nell’indirizzo non è
identica a `CRON_CHIAVE`. Ricopia, controlla di non aver preso uno spazio,
riprova.

**Se compare la pagina di accesso:** manca `?chiave=` oppure hai aperto un
indirizzo sbagliato (home, non `/api/cron/...`).

**Se Chrome dice errore 500 / Il database non risponde:** la chiave è giusta,
sbagliano i `DB_*`. Non è questo capitolo.

Fai **4a, 4b, 4c, 4d** in quest’ordine, oggi. 4e è una prova extra, quando vuoi.

### 4a. Raccolta (una volta)

Cosa fa: legge Search Console, Analytics Brignole, Ecwid, Ads (se il token lo
permette) e le mette nel database. Non cambia i siti.

1. Incolla nella barra del browser:

`https://seo.brignole.ch/api/cron/raccolta?chiave=INCOLLA_LA_CHIAVE`

2. Invio. **Aspetta.** Può durare da venti secondi a un paio di minuti.
   Non chiudere la scheda. Non ricaricare se sembra ferma.
3. Deve comparire JSON con `"righe"` (un numero) e `"problemi"` (un elenco,
   anche vuoto) e `"finestra"` con due date.

**Problemi che si ignorano (non sono un bug del pannello):**

- Ads Brignole o Ads Biography Library: *permission* / 403, finché i token
  sono di prova (punto 6).
- Conversioni Grants: stesso 403 Ads.
- CrUX o Merchant: chiave o invito mancante.

**Problema che va corretto:** Search Console di un sito Brignole in
`problemi` *dopo* che hai già invitato l’email `iam`. Allora l’invito sta
sulla proprietà sbagliata (prefisso `https://` invece di Dominio).

4. Apri una scheda nuova: `https://seo.brignole.ch` e entra con
   `PANNELLO_PASSWORD`.
5. Tabella **Siti**: Aelle e brignole.ch devono avere clic e impressioni
   (numeri, non vuoto). Luna può restare a zero: è normale. Biography Library
   ha numeri solo se i punti 1 e 3 sono fatti e Search Console ha già dati.

Se la home è vuota di numeri ma la raccolta ha detto `"righe": 10000` o
simile: ricarica la home. Se resta vuota, manda screenshot di JSON e home.

### 4b. Scansione, un sito alla volta

Cosa fa: legge le pagine del sito (titolo, descrizione, robots, sitemap) e le
fotografa. Non cambia i testi in vetrina. **Un sito per indirizzo.** Se li
metti tutti insieme, Hostinger taglia.

Oggi basta **Aelle**. Gli altri, uno al giorno, se Aelle non finisce (oppure
lasciali alle sveglie del punto 5).

1. Incolla:

`https://seo.brignole.ch/api/cron/scansione?sito=aelle&chiave=INCOLLA_LA_CHIAVE`

2. Invio. Aspetta. Deve comparire JSON con `"pagine"` (un numero) e
   `"problemi"`.
3. Aelle è grande: una passata legge un pezzo (decine di pagine) e si
   riprende da sola il lunedì notte, e i lunedì dopo. `"pagine": 40` è già
   un successo, non zero.
4. Se il browser dice **504 Gateway Time-out**: Hostinger ha tagliato
   l’attesa. **Non ricaricare in loop.** La coda è già sul server. La
   prossima passata (sveglia o stesso indirizzo un’altra volta, dopo un
   po’) continua da dove era.

Il negozio Ecwid sta dentro Aelle: non ha una scansione sua.

Gli altri, quando tocca, cambia solo `sito=`:

- brignole.ch: `sito=brignole`
- Tag Tales: `sito=tagtales`
- Kizunama: `sito=kizunama`
- StrangeGlyph: `sito=strangeglyph`
- Luna Nihongo: `sito=lunanihongo`
- Biography Library sito: `sito=biography-library`
- Biography Library app: `sito=biography-library-app`

Indirizzo intero, stesso schema:

`https://seo.brignole.ch/api/cron/scansione?sito=brignole&chiave=INCOLLA_LA_CHIAVE`

I siti piccoli di solito finiscono al primo colpo (`"pagine"` almeno 1).

### 4c. Diagnosi (dopo almeno una scansione)

Cosa fa: guarda misure e pagine, propone titoli e note, le mette in coda.
Chiama Claude per alcuni testi. Non pubblica nulla finché tu non premi
Approva.

1. Incolla:

`https://seo.brignole.ch/api/cron/diagnosi?chiave=INCOLLA_LA_CHIAVE`

2. Invio. Aspetta (può durare fino a un minuto).
3. JSON con `"proposte"` (un numero: anche 50 o 100 va bene) e `"problemi"`.
   Se compare `ripresa: tempo esaurito`, è normale: il resto la notte dopo.
4. Ricarica `https://seo.brignole.ch`. Devono comparire schede **Da fare
   adesso** / **Da fare** (titoli da migliorare, robots, ecc.).

Se `"proposte": 0` e la home è vuota: o la scansione non ha ancora pagine,
o non ci sono casi. Manda lo JSON.

### 4d. Verifica a 14 giorni

Cosa fa: sulle modifiche **già applicate da due settimane** confronta i clic
prima e dopo. Oggi, se non hai ancora approvato nulla da 14 giorni, torna
zero. Va bene.

1. Incolla:

`https://seo.brignole.ch/api/cron/verifica?chiave=INCOLLA_LA_CHIAVE`

2. JSON con `"verificate": 0` (o un numero piccolo). Zero è il risultato
   atteso all’inizio.

### 4e. Extra, quando vuoi: Approva e Annulla su brignole.ch

Serve a vedere se il registro funziona. **Solo brignole.ch**, un titolo,
poi Annulla subito.

1. Nel pannello apri il sito **Brignole**.
2. Una scheda con **Modifica titolo** e testo nuovo. **Approva**.
3. Deve comparire esito applicata (o Storico). Il titolo pubblico della
   pagina cambia.
4. Stessa scheda, **Annulla**. Il titolo deve tornare quello di prima.

Se Approva fallisce con 401 WordPress: password applicativa (punto già
visto su Aelle/brignole). Non insistere su Tag Tales: apre una richiesta
GitHub.

### 4f. Extra: Impianto (se la voce c’è già nel menu)

Dopo il deploy del controllo impianto: menu **Impianto** → **Controlla
adesso**. Non sostituisce 4a–4d: dice se Google e WordPress rispondono.
Le righe arancio sono da correggere. Le attese (Ads di prova) si ignorano.

### Controllo del punto 4

- Raccolta: JSON con `righe`.
- Home: numeri su Aelle e brignole.ch.
- Scansione Aelle: JSON con `pagine` (anche parziale) oppure un 504 **senza**
  ricaricare in loop.
- Diagnosi: JSON con `proposte`; home con schede.
- Verifica: JSON con `verificate` (zero ok).

---

## 5. Dieci sveglie Hostinger

Non è un programma da scrivere. È una sveglia: ogni notte il server apre da
solo gli stessi indirizzi del punto 4.

1. hPanel → sito `seo.brignole.ch` → Dashboard.
2. A sinistra: **Cron Jobs** (a volte **Lavori Cron**).
3. Tipo: **Custom** (non PHP).
4. Crea **undici** lavori, uno alla volta. Incolla il comando intero. Salva
   dopo ogni riga.

L’orario di Hostinger è **UTC**. Le 3:00 UTC sono le 5 in Svizzera d’estate.

**Un sito per notte.** Non mettere tutti i siti nella stessa sveglia: Aelle da
sola non sta in tre minuti.

Sostituisci `INCOLLA_LA_CHIAVE` con la stessa `CRON_CHIAVE`.

Giorno della settimana: `0` = domenica, `1` = lunedì, … `6` = sabato. Se la
casella “giorno del mese” e “mese” restano `*` (ogni), va bene.

### Ogni giorno, ore 3:00 (minuto 0, ora 3, giorno settimana vuoto o `*`)

```
curl -fsS "https://seo.brignole.ch/api/cron/raccolta?chiave=INCOLLA_LA_CHIAVE"
```

### Scansioni, ore 3:30 (minuto 30, ora 3)

| Giorno | Sito | Comando |
| --- | --- | --- |
| Lunedì (`1`) | Aelle | `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=aelle&chiave=INCOLLA_LA_CHIAVE"` |
| Martedì (`2`) | brignole.ch | `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=brignole&chiave=INCOLLA_LA_CHIAVE"` |
| Mercoledì (`3`) | Tag Tales | `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=tagtales&chiave=INCOLLA_LA_CHIAVE"` |
| Giovedì (`4`) | Kizunama | `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=kizunama&chiave=INCOLLA_LA_CHIAVE"` |
| Venerdì (`5`) | StrangeGlyph | `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=strangeglyph&chiave=INCOLLA_LA_CHIAVE"` |
| Sabato (`6`) | Luna Nihongo | `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=lunanihongo&chiave=INCOLLA_LA_CHIAVE"` |
| Domenica (`0`) | Biography Library sito | `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=biography-library&chiave=INCOLLA_LA_CHIAVE"` |

### Domenica, ore 4:00 (minuto 0, ora 4, giorno `0`)

Biography Library app:

```
curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=biography-library-app&chiave=INCOLLA_LA_CHIAVE"
```

### Ogni giorno, ore 4:30 (minuto 30, ora 4)

```
curl -fsS "https://seo.brignole.ch/api/cron/diagnosi?chiave=INCOLLA_LA_CHIAVE"
```

### Solo lunedì, ore 5:00 (minuto 0, ora 5, giorno `1`)

```
curl -fsS "https://seo.brignole.ch/api/cron/verifica?chiave=INCOLLA_LA_CHIAVE"
```

### Ogni giorno, ore 5:15 (minuto 15, ora 5)

Controllo impianto. I risultati stanno nel pannello, voce Impianto:

```
curl -fsS "https://seo.brignole.ch/api/cron/impianto?chiave=INCOLLA_LA_CHIAVE"
```

Se Hostinger rifiuta il comando (“caratteri non ammessi”), manda uno
screenshot: a volte vuole il tipo Custom, o un file `.sh`. Non serve il
Terminale del Mac.

### Controllo del punto 5

In elenco Cron vedi undici righe (più l’opzionale citazioni, se la vuoi). Il
mattino dopo la raccolta, la home ha dati aggiornati.

---

## 6. Quando arriva l’email Google “Basic”

**Non è un lavoro di oggi.** Lo fai solo quando Google scrive che il token
sviluppatore non è più di prova. Fino ad allora i banchi **Pubblicità
Brignole** e **Pubblicità Biography Library** possono restare vuoti o
parziali: è atteso. Search Console e la coda SEO girano lo stesso.

### Cosa stai aspettando

Hai chiesto il token **due volte, due Gmail**:

- Gmail tua → token Brignole (soldi tuoi)
- Gmail dell’associazione → token Grants

Google dà subito un token di **prova**. Per leggere l’account che spende
davvero deve alzarlo a **Basic**. Tempi: giorni, a volte una o due settimane.
Arriva un’email (oggetto tipico su API / developer token / Basic). Possono
arrivare **due email**, in giorni diversi: una per banco.

Finché l’email non c’è, **non** toccare le variabili Ads. Non sommare i due
banchi. Non incollare lo stesso token nelle due caselle Hostinger.

### Quando l’email c’è: copiare il token nuovo

Fai **un banco alla volta**. Chiudi le schede Google dell’altra Gmail, o usa
una finestra riservata.

**Brignole (Gmail tua)**

1. [ads.google.com](https://ads.google.com). In alto, account **Brignole**
   (nello screenshot dell’8 settembre: `712-100-7160`). Non Biography Library.
2. Devi essere nel **manager** (la cartella), non in una campagna figlia.
   Il Centro API compare solo lì: Strumenti (chiave inglese) → **Centro API**
   (API Center).
3. Copia il **developer token** (stringa lunga). Se la schermata dice ancora
   Test / Prova, l’email Basic non è ancora attiva: aspetta.
4. Non copiare i numeri account (quelli con i trattini): `CUSTOMER_ID` e
   `MANAGER_ID` in Hostinger restano quelli che hai già, senza trattini.

**Biography Library (Gmail associazione)**

1. Chiudi la finestra Brignole. Nuova finestra. Gmail **associazione**.
2. Account **Biography Library** (`289-519-5392`). Manager Grants, non il
   manager Brignole.
3. Centro API, copia l’**altro** token. Non quello del punto Brignole.

### Incollare in Hostinger

1. hPanel → applicazione Node `seo.brignole.ch` → variabili d’ambiente.
2. Trova `GOOGLE_ADS_DEVELOPER_TOKEN`. Sostituisci **solo** il valore con il
   token Brignole nuovo. Non cambiare `GOOGLE_ADS_CUSTOMER_ID` né
   `GOOGLE_ADS_MANAGER_ID`.
3. Trova `BL_ADS_DEVELOPER_TOKEN`. Sostituisci **solo** il valore con il token
   dell’associazione. Non cambiare `BL_ADS_CUSTOMER_ID` né `BL_ADS_MANAGER_ID`.
4. Le due caselle devono contenere **due stringhe diverse**.
5. Salva. **Riavvia** l’applicazione Node. Senza riavvio il programma legge
   ancora i token vecchi.

### Dopo il riavvio, controllo

1. Pannello → **Impianto** → **Controlla adesso** (oppure aspetta la sveglia
   delle 5:15 UTC).
2. Le righe **Ads Brignole (lettura)** e **Ads Biography Library (lettura)**
   devono passare da atteso/403 a **ok**, oppure restare atteso solo se manca
   ancora l’invito dell’email `iam` in Ads (Sola lettura Brignole, Standard
   Grants). In quel caso: Ads → Accesso e sicurezza, stessa email `iam` del
   JSON di quel banco.
3. Apri **Pubblicità Brignole** e **Pubblicità Biography Library**: restano
   **due** schermate. Non esiste un totale unico di spesa.

Se dopo Basic e riavvio Impianto dice ancora *The caller does not have
permission*: manca l’invito `iam` in quel account Ads, o hai incollato il
token nel banco sbagliato. Screenshot della riga Impianto e del menu account
Ads in alto.

### Campagne: non fanno parte di questo punto

Creare campagne Aelle Store o Grants è **un altro momento**, solo quando tu
le vuoi. Non chiude il collegamento. Dettaglio: `istruzioni-tue.md`, capitolo 7.
Conversioni Grants: niente CSV, le carica il notturno dopo il plugin.

### Controllo del punto 6

Email Basic arrivata (anche una sola: fai quel banco e aspetti l’altra).
Token sostituiti nelle **due** caselle giuste, applicazione riavviata. Impianto:
Ads in lettura ok o, se 403, invito `iam` ancora da fare. Due schede
pubblicità, mai una cassa unica.

---

## 7. Opzionale (non blocca il pannello)

### Vitali Chrome

Stesso progetto Cloud **Brignole** (Gmail tua):

1. Libreria → Chrome UX Report API → Abilita.
2. Credenziali → Crea credenziali → **Chiave API**.
3. Hostinger: `CRUX_API_KEY` = quella chiave. Salva, riavvia.

Senza, i vitali Chrome restano vuoti. Non è uno script sul sito.

### Merchant Aelle

Merchant Center `5717230535`: invita l’email `iam` **Brignole**. Senza, i
vitali negozio restano spenti. Il resto del pannello gira lo stesso.

### Sondaggio citazioni

Undicesima sveglia, ogni giorno ore 5:30 UTC:

```
curl -fsS "https://seo.brignole.ch/api/cron/citazioni?chiave=INCOLLA_LA_CHIAVE"
```

È un campione (Claude), non ChatGPT pubblico. Puoi saltarla.

---

## 8. Dopo, non è Hostinger: siti Node

Tag Tales, Kizunama, StrangeGlyph, Luna Nihongo, app Biography Library: il
pannello scrive solo `seo/contenuti.json` e `seo/robots.txt`. Finché il sito
**non legge** quei file, Approva apre la richiesta GitHub ma la vetrina non
cambia.

Ordine in `siti-node.md`: prima StrangeGlyph (una pagina, si capisce se il
meccanismo funziona). Quello è lavoro in Cursor sui repository dei siti, non
una variabile Hostinger. I titoli WordPress (Aelle, brignole.ch, Biography
Library) si applicano già, con Approva.

---

## Hai finito quando

- Entri su `https://seo.brignole.ch` e la home ha numeri dopo una raccolta.
- I siti Brignole hanno clic/impressioni (Luna può restare a zero).
- Biography Library in Search Console ha dati (JSON BL + invito DNS).
- Approva un titolo su brignole.ch e poi Annulla: il testo torna quello di prima.
- I due link pubblicità restano due schermate. Token di prova: vuoti o
  parziali, è atteso.
- Le undici sveglie sono in elenco Cron (compreso il controllo impianto).

Guida lunga (anche i passi già fatti): `istruzioni-tue.md`.
Siti Node: `siti-node.md`.
Perché le cose sono così: `decisioni.md`.
