# Cosa ti resta da fare (nel browser)

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

Stessa `CRON_CHIAVE` già nelle variabili Hostinger. Incollala dopo `chiave=`,
senza virgolette, senza spazi, senza caratteri come `#` `&` `+`.

Deve comparire del testo JSON, non “chiave non valida” e non una pagina di
accesso. Se compare **chiave non valida**: la parola nell’indirizzo non è
identica a `CRON_CHIAVE`. Controlla, salva, riavvia, riprova.

### 4a. Raccolta (una volta)

Apri:

`https://seo.brignole.ch/api/cron/raccolta?chiave=INCOLLA_LA_CHIAVE`

Aspetta. Può durare un minuto. I `problemi` su Biography Library (se il JSON
BL o gli inviti non sono ancora pronti) e sui token Ads di prova **si
ignorano**. Non è un errore del pannello.

Poi apri `https://seo.brignole.ch`. I siti Brignole dovrebbero avere
clic/impressioni. Luna può restare a zero. Biography Library ha dati solo se
il punto 1 e il punto 3 sono fatti.

### 4b. Scansione, un sito alla volta

Un indirizzo alla volta. Deve comparire JSON con `"pagine"`, non una pagina
bianca.

Aelle è grande: una passata legge un pezzo e si riprende da sola (lunedì
notte, e i lunedì dopo). Se il browser dice **504 Gateway Time-out**, **non
ricaricare in loop**: Hostinger ha tagliato l’attesa. I siti piccoli di solito
finiscono al primo colpo. Il negozio Ecwid sta dentro Aelle, non ha una
scansione sua.

Oggi basta Aelle. Gli altri, uno al giorno, se Aelle non finisce:

- Aelle: `https://seo.brignole.ch/api/cron/scansione?sito=aelle&chiave=INCOLLA_LA_CHIAVE`
- brignole.ch: `https://seo.brignole.ch/api/cron/scansione?sito=brignole&chiave=INCOLLA_LA_CHIAVE`
- Tag Tales: `https://seo.brignole.ch/api/cron/scansione?sito=tagtales&chiave=INCOLLA_LA_CHIAVE`
- Kizunama: `https://seo.brignole.ch/api/cron/scansione?sito=kizunama&chiave=INCOLLA_LA_CHIAVE`
- StrangeGlyph: `https://seo.brignole.ch/api/cron/scansione?sito=strangeglyph&chiave=INCOLLA_LA_CHIAVE`
- Luna Nihongo: `https://seo.brignole.ch/api/cron/scansione?sito=lunanihongo&chiave=INCOLLA_LA_CHIAVE`
- Biography Library (sito): `https://seo.brignole.ch/api/cron/scansione?sito=biography-library&chiave=INCOLLA_LA_CHIAVE`
- Biography Library (app): `https://seo.brignole.ch/api/cron/scansione?sito=biography-library-app&chiave=INCOLLA_LA_CHIAVE`

### 4c. Diagnosi (dopo almeno una scansione)

`https://seo.brignole.ch/api/cron/diagnosi?chiave=INCOLLA_LA_CHIAVE`

Poi ricarica la home: dovrebbero comparire schede (titoli da migliorare, ecc.).

### 4d. Verifica

`https://seo.brignole.ch/api/cron/verifica?chiave=INCOLLA_LA_CHIAVE`

Zero è normale: non ci sono ancora modifiche applicate da quattordici giorni.

### Controllo del punto 4

La raccolta ha risposto JSON. Aelle ha almeno una scansione (anche parziale).
La diagnosi ha girato. La home non è più vuota, oppure dice perché è vuota.

Prova extra, quando vuoi: sulla scheda brignole.ch, **Approva** un titolo e poi
**Annulla**. Il registro deve rimettere il testo di prima.

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

Oggi i due token Ads sono di **prova**. Google li alza a **Basic** in giorni,
a volte una o due settimane. Arriva un’email. Fino ad allora i banchi
pubblicità possono restare vuoti o parziali: è atteso.

Quando arriva **Basic**, due volte, due Gmail:

1. Hostinger, applicazione Node: sostituisci `GOOGLE_ADS_DEVELOPER_TOKEN`
   con il token Brignole (Gmail tua).
2. Sostituisci `BL_ADS_DEVELOPER_TOKEN` con il token dell’associazione
   (altra Gmail). Non è la stessa casella del punto 1.
3. Salva, **riavvia**.
4. Non sommare i due banchi. Non incollare lo stesso token nelle due caselle.

**Campagne** (Aelle Store a pagamento, Grants su Biography Library): solo
quando **tu** le vuoi. Non chiudono il collegamento. Conversioni Grants: niente
CSV a mano, le carica il notturno dopo il plugin già installato.

Dettaglio campagne: `istruzioni-tue.md`, capitolo 7.

### Controllo del punto 6

Dopo il riavvio, **Pubblicità Brignole** e **Pubblicità Biography Library**
restano due schermate. I numeri di spesa non si sommano.

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
