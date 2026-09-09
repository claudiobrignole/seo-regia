# Istruzioni tue (senza programmare)

Aggiornato il 9 settembre 2026. Il codice sta su GitHub; tu fai i passi nel browser. Se una schermata ha un nome un po’ diverso, fermati e manda uno screenshot con l’indirizzo in alto.

Due tipi di lavoro:

- **Cursor / chi programma:** codice e push.
- **Tu:** Google, Hostinger, password. Non serve il Terminale, tranne se vuoi lanciare a mano un lavoro notturno.

**Prima cosa, anche oggi:** chiedi i token Google Ads. **Due volte, due Gmail.** Google li approva in giorni.

---

## 1. Due identità, sempre

Pensa a due aziende.

**Brignole (soldi tuoi):** Gmail Brignole. Siti commerciali. Variabili `GOOGLE_`* e `GOOGLE_ADS_*`. Nel pannello: **Pubblicità Brignole**.

**Biography Library (Grants già approvato):** Gmail dell’associazione. Solo i siti dell’associazione. Variabili `BL_`*. Nel pannello: **Pubblicità Biography Library**.

Non collegare l’account Grants sotto il manager Brignole “così si vede tutto insieme”. Non esiste un totale unica di spesa Ads. I fondi Grants sono di Google, per il no profit.

---

## 2. Hostinger e database

1. hPanel → il sito `seo.brignole.ch` come **applicazione Node** (non PHP), Node 20 o più.
2. Collegamento GitHub: `claudiobrignole/seo-regia`, ramo `main`. Avvio: `npm start`.
3. Database MySQL: hPanel → **Database** → **Database MySQL** → **Crea**.
  Annota nome database, utente e password. Per il pannello Node (stesso account):
  - `DB_HOST` = `127.0.0.1` (non `localhost`: su Node spesso non funziona)
  - `DB_PORT` = `3306` (non compare come casella: e sempre questa)
   Se `127.0.0.1` viene rifiutato: **Database** → **MySQL remoto**: in alto c e un nome tipo `srv1234.hstgr.io`. Usa quello come `DB_HOST`, porta sempre `3306`.
4. Nell’applicazione, **Environment variables**, aggiungi almeno:
  - `PANNELLO_PASSWORD` (minimo 12 caratteri)
  - `CRON_CHIAVE` (un’altra stringa lunga a caso)
  - `PANNELLO_URL` = `https://seo.brignole.ch`
  - `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME`
  - `MODELLO_TESTI=claude`
  - `ANTHROPIC_API_KEY`
5. Riavvia l’applicazione se Hostinger lo chiede.
6. Nel browser apri (sostituisci SOLO la parte dopo `chiave=`, con la stessa `CRON_CHIAVE` delle variabili, senza virgolette):
  `https://seo.brignole.ch/api/setup/migra?chiave=`  
   e incolla la chiave attaccata, esempio:  
   `https://seo.brignole.ch/api/setup/migra?chiave=abc123def456`  
   Deve comparire una pagina **Database pronto**.  
   Dopo un aggiornamento del codice da GitHub, apri di nuovo lo stesso indirizzo: crea le tabelle nuove senza cancellare i dati.  
   Se compare **chiave non valida**: la parola nell indirizzo non e identica a CRON_CHIAVE (spazi, virgolette, o caratteri come # & +). Usa una chiave solo di lettere e numeri, salva, riavvia, riprova.  
   Se compare **Il database non risponde** oppure Chrome dice errore 500: la chiave e ok, sbagliano i valori `DB_`. Vedi il punto 3, salva, **riavvia** l applicazione Node, riprova lo stesso indirizzo.

Le altre variabili (Google, WordPress, Ecwid, GitHub, Ads) si aggiungono dopo, senza rifare il sito. Se manca un banco Ads, l’altro deve funzionare lo stesso.

---

## 3. Google Ads, banco Brignole (spiegato per intero)

Questo capitolo e **solo** i soldi tuoi (Luna Nihongo, Aelle, brignole.ch). Biography Library si fa **dopo**, con un altro giro e un’altra Gmail. Non mescolare i due in una sola seduta.

### Scegliere l'account giusto (incognito non obbligatorio)

Se nel menu in alto a destra di Google Ads vedi già i due account, l'incognito non serve. Basta leggere il nome evidenziato: **Brignole Google Ads** per i soldi tuoi, **Biography Library** per il Grants.

Nello screenshot dell'8 settembre 2026: Brignole e `712-100-7160`, Biography Library e `289-519-5392`. Nessuno dei due e un manager. Per questo il Centro API non compare sotto Strumenti (sei su Asset Studio, e un'altra cosa).

### Cosa stai chiedendo a Google, in parole povere

Il pannello seo.brignole.ch deve **leggere** le campagne (clic, spesa, parole) e **non** deve pubblicare, mettere in pausa o cancellare da solo. Per questo Google chiede un permesso speciale, il **token sviluppatore**. Si chiede da un **account manager**.

L’account manager e un contenitore: un account “cartella” che vede sotto di sé gli account che spendono (Luna Nihongo, Aelle, ecc.). Il token si ottiene **solo** da quella cartella, non da un account campagna isolato.

### Passo A: entrare e capire dove sei

1. Apri [ads.google.com](https://ads.google.com) e nel menu in alto a destra seleziona **Brignole Google Ads**.
2. Se vedi due account campagne (Brignole e Biography Library) e nessuno si chiama manager o account di gestione, **il manager manca**. Vai al passo B.
3. Il Centro API non sta in Strumenti / Asset Studio. Compare solo **dentro un manager**, di solito in **Amministratore** (ingranaggio in basso a sinistra).

### Passo B: creare il manager, solo se manca

Istruzioni ufficiali Google: [Creare un account manager](https://support.google.com/google-ads/answer/7456150).

In sintesi, da loggato Brignole:

1. Crea un **account manager** (a volte “account di gestione”).
2. **Collega** sotto di esso solo gli account **a pagamento** che già hai: quelli con cui faresti campagne su lunanihongo.com, aelle.hiphop, brignole.ch. Se Luna Nihongo non ha ancora un account Ads, si potra collegare dopo, quando lo crei.
3. **Non** collegare l’account Grants dell’associazione. Non e una scorciatoia: e proprio ciò che va evitato.

### Passo C: copiare i due numeri

Google mostra i numeri con i trattini: `123-456-7890`. Nelle variabili Hostinger vanno **senza trattini**: `1234567890`.

1. Resta nel manager (la cartella). Il numero di **quel** account, senza trattini, e `GOOGLE_ADS_MANAGER_ID`.
2. Entra nell’account **campagna** a pagamento che userai (Aelle Store, o l’unico account a pagamento se per ora ne hai uno). Il numero di **quello**, senza trattini, e `GOOGLE_ADS_CUSTOMER_ID`.
3. Se hai un solo account e quello e anche il manager, i due numeri possono coincidere: va bene, li metti uguali tutti e due.
4. Scrivili su un foglio. Non su GitHub, non in una chat di gruppo.

### Passo D: chiedere il token (Centro API)

Devi essere **dentro il manager**, non dentro una campagna figlia. Se il menu manca, non sei nel manager: torna all’elenco in alto a sinistra e scegli la cartella.

1. Icona **Strumenti** (chiave inglese, spesso in alto a destra) → **Centro API** (in inglese: Tools → API Center).
2. Compila la richiesta. Dove chiede l’uso previsto, puoi copiare questo testo:

Pannello interno di un titolare. Legge campagne a pagamento per report e bozze. Non crea ne modifica campagne da programma. Non accede ad account Ad Grants. Siti: lunanihongo.com, aelle.hiphop, brignole.ch.

3. Invia. Google da subito un token **di prova**. Per leggere l’account vero (quello che spende) deve alzare il livello a **Basic**: ci vogliono giorni, a volte una o due settimane. Se il pannello dirà che il token e solo di prova, e normale: si aspetta l’email di Google.
4. Quando hai il token (una stringa lunga), in Hostinger, variabili dell’applicazione Node:
   - `GOOGLE_ADS_DEVELOPER_TOKEN` = il token
   - `GOOGLE_ADS_CUSTOMER_ID` = il numero campagne, senza trattini
   - `GOOGLE_ADS_MANAGER_ID` = il numero manager, senza trattini
5. Salva e **riavvia** l’applicazione.

Il token **Biography Library** e un altro giro, altra finestra incognito, altra Gmail, altre variabili (`BL_ADS_...`). Non incollare il token Brignole anche li.

### Passo E: (dopo, non oggi) far leggere l’account al pannello

Quando avrai anche l’account di servizio Google Cloud (capitolo 4), in Google Ads Brignole: **Amministrazione** → **Accesso e sicurezza** → aggiungi l’email `...iam.gserviceaccount.com` del JSON **Brignole**, permesso **Sola lettura**. Non quella dell’associazione.

Una volta, apri **Strumenti** → **Pianificatore di parole chiave** e fai una ricerca qualsiasi (es. lezioni di giapponese): accende lo strumento per i budget consigliati.

Se Google rifiuta l’indirizzo `iam.gserviceaccount.com`, scrivimi: c’è un piano B.

---

## 3b. Google Ads, banco Biography Library (stesso schema, altra Gmail)

1. Chiudi **tutta** la finestra incognito Brignole.
2. Nuova finestra incognito. Gmail **dell’associazione**. [ads.google.com](https://ads.google.com).
3. Manager **solo** Grants. Collega solo i siti dell’associazione. In elenco non devono comparire Luna Nihongo, Aelle, brignole.ch.
4. Numeri senza trattini: `BL_ADS_CUSTOMER_ID` e `BL_ADS_MANAGER_ID`.
5. Centro API, testo da copiare:

Pannello interno dell associazione no profit Biography Library. Legge l account Google Ad Grants gia approvato e carica le conversioni dei moduli del sito (senza script Google sulle pagine). Non crea ne mette in pausa campagne. Non accede ad account Ads commerciali.

6. Hostinger: `BL_ADS_DEVELOPER_TOKEN`. Non riusare il token Brignole.

Il file da caricare al passo documentazione strumento e `docs/google-ads-api-tool-biography-library.pdf` (in questa cartella del progetto).

Poi, sul **progetto Cloud dell’associazione** (capitolo 4): Libreria → Google Ads API e Search Console API → Abilita. **Non** abilitare Analytics Data API. Accesso e sicurezza in Google Ads Grants: email dell’account di servizio **Biography Library**, permesso **Standard** (la sola lettura non basta a caricare le conversioni). Non Admin. Non l’email Brignole.

---

## 4. Google Cloud, Search Console, Analytics

Due progetti Cloud, due file JSON. Analytics **solo** sui siti Brignole.

1. [console.cloud.google.com](https://console.cloud.google.com) con la Gmail giusta.
2. Nuovo progetto: `regia-seo-brignole` oppure `regia-seo-biography`.
3. Libreria, abilita:
  - Brignole: Search Console API, Analytics Data API, Google Ads API.
  - Associazione: Search Console API, Google Ads API. **Niente** Analytics Data API.
4. Credenziali → Account di servizio → nome `regia-seo` → Chiavi → JSON. Il file non va su GitHub.
5. Incolla il JSON in `GOOGLE_SERVICE_ACCOUNT_JSON` o `BL_SERVICE_ACCOUNT_JSON`.
6. Copia `client_email` dal JSON.

Search Console, per ogni dominio di quella identità: Impostazioni → Utenti → Aggiungi → email dell’account di servizio → **Proprietario**. Sull’associazione la verifica e **solo DNS** (record TXT), nessuna meta nel tema e nessuno script.

Domini Brignole: aelle.hiphop, brignole.ch, tagtalesgallery.com, kizunama.com, strangeglyph.xyz, lunanihongo.com.

Associazione: biographylibrary.org.

Se lunanihongo.com non è ancora una proprietà di dominio: Aggiungi proprietà → Dominio → record DNS TXT su Hostinger → Verifica.

Analytics: **solo Brignole.** Amministrazione → Accesso proprietà → Lettore, stessa email, solo sulle proprietà giuste. Analytics non conta il traffico di ricerca (cookie). **Non** creare una proprietà Analytics per Biography Library e **non** installare plugin Analytics, GTM o pixel su biographylibrary.org.

---

## 5. GitHub, WordPress, Ecwid

**GitHub:** [token](https://github.com/settings/tokens) con accesso ai repo TagTales, kizunama, luna-nihongo, strangeglyph e Biography-Library. `GITHUB_TOKEN`.

**WordPress** (Aelle, brignole.ch, Biography Library): profilo → Password per le applicazioni → nome `regia-seo`. Utente + password in `WP_AELLE_`*, `WP_BRIGNOLE_*`, `WP_BL_*`. Non è la password del login.

**Ecwid:** token API → `ECWID_TOKEN`. Store `127192517`.

---

## 5b. Plugin conversioni sul sito dell associazione

Una volta sola, su WordPress di biographylibrary.org:

1. Plugin → Aggiungi → Carica plugin. Zip della cartella `plugin-wp/regia-bl-grants` (dal progetto seo-regia). Attiva **Regia BL Grants**.
2. Controlla che non ci siano gia Google Analytics, Site Kit, Tag Manager, pixel Ads. Se ci sono, disattivali.
3. Password applicativa `WP_BL_*` come al capitolo 5.

Niente JavaScript Google. Se un visitatore arriva da un annuncio, il plugin tiene il `gclid`. Quando invia un modulo di contatto, la riga finisce nel pannello e poi su Ads.

---

## 6. Sveglia notturna

hPanel → Cron. Sostituisci `LA_CHIAVE` con `CRON_CHIAVE`.

- 03:00 ogni giorno  
`curl -fsS -H "x-chiave-cron: LA_CHIAVE" https://seo.brignole.ch/api/cron/raccolta`
- 03:30, un sito a notte, esempio  
`curl -fsS -H "x-chiave-cron: LA_CHIAVE" "https://seo.brignole.ch/api/cron/scansione?sito=aelle"`  
Altre notti: `brignole`, `lunanihongo`, `tagtales`, `kizunama`, `strangeglyph`, `biography-library`. La prima scansione utile e Aelle (il negozio condivide la stessa Search Console).
- 04:30  
`curl -fsS -H "x-chiave-cron: LA_CHIAVE" https://seo.brignole.ch/api/cron/diagnosi`
- Lunedì 05:00  
`curl -fsS -H "x-chiave-cron: LA_CHIAVE" https://seo.brignole.ch/api/cron/verifica`

La prima volta puoi incollare il primo `curl` nel Terminale del Mac (Spotlight → Terminale). Se `problemi` parla di account di servizio, manca l’invito in Search Console. Zero impressioni su Luna Nihongo è normale.

---

## 7. Campagne (quando le scegli tu)

Niente test obbligatorio su Luna Nihongo. Resta indicizzato. Ipotesi di partenza: Grants su Biography Library, spesa Brignole su Aelle Store. Due account, due schede del pannello.

### Aelle Store (soldi tuoi)

Solo **Pubblicità Brignole**. Incognito, Gmail Brignole. Controlla in alto che non sia l’account Grants.

1. Nel pannello apri la bozza Aelle / Aelle Store, correggi se serve.
2. Google Ads → Nuova campagna → obiettivo come da bozza (spesso traffico al sito o vendite).
3. Rete **solo Ricerca**.
4. Budget della bozza (o più basso). Annuncio adattabile: copia titoli e descrizioni senza allungarli.
5. Parole nell’elenco; esclusioni nella sezione esclusioni. Atterraggio il negozio, con `https://`.
6. Pubblica. Copia l’ID campagna nel pannello → Collega.

Pausa e cancellazione restano un tuo clic su Google. Il pannello consiglia e ricorda.

Ottimizza i titoli del sito **prima** di spendere.

### Grants Biography Library

Altra Gmail, altra scheda **Pubblicità Biography Library**. Destinazione solo biographylibrary.org, niente parole troppo generiche, occhio al cinque per cento di clic. Le conversioni **non** si tracciano con Analytics: installi una volta il plugin (capitolo 5b). Il lavoro delle 03:00 le carica su Ads. Non importare file CSV.

---

## 8. Se qualcosa si blocca

Manda lo screenshot della pagina intera. Non serve indovinare il nome del menu.