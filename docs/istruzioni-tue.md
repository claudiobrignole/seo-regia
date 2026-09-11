# Istruzioni tue (senza programmare)

Aggiornato il 10 settembre 2026. Il codice sta su GitHub; tu fai i passi nel browser. Se una schermata ha un nome un po’ diverso, fermati e manda uno screenshot con l’indirizzo in alto.

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

Le altre variabili (Google, WordPress, Ecwid, GitHub, Ads, opzionale `CRUX_API_KEY`) si aggiungono dopo, senza rifare il sito. Se manca un banco Ads, l’altro deve funzionare lo stesso.

Quando entri, la home non e una tabella da esperto: prima **Da fare adesso**, poi **Da fare**, poi **Quando puoi** se non ci sono troppe cose urgenti. Ogni riga dice perche e come saprai se ha funzionato. I due banchi pubblicita restano due link, mai una cassa unica.

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
  - Brignole: Search Console API, Analytics Data API, Google Ads API. Opzionale: Chrome UX Report API.
  - Associazione: Search Console API, Google Ads API. **Niente** Analytics Data API.
4. Credenziali → Account di servizio → nome `regia-seo` → Chiavi → JSON. Il file non va su GitHub.
5. Incolla il JSON in `GOOGLE_SERVICE_ACCOUNT_JSON` o `BL_SERVICE_ACCOUNT_JSON`.
6. Copia `client_email` dal JSON.

Search Console, per ogni dominio di quella identità: nel selettore in alto scegli la proprietà **Dominio** (non quella che inizia con `https://`). Impostazioni → Utenti → Aggiungi → email `...iam.gserviceaccount.com` del JSON → **Proprietario**. Se l’invito sta solo sul prefisso URL, la raccolta fallisce. Sull’associazione la verifica e **solo DNS** (record TXT), nessuna meta nel tema e nessuno script.

Domini Brignole: aelle.hiphop, brignole.ch, tagtalesgallery.com, kizunama.com, strangeglyph.xyz, lunanihongo.com.

Associazione: biographylibrary.org.

Se lunanihongo.com non è ancora una proprietà di dominio: Aggiungi proprietà → Dominio → record DNS TXT su Hostinger → Verifica.

Analytics: **solo Brignole.** Amministrazione → Accesso proprietà → Lettore, stessa email, solo sulle proprietà giuste. Analytics non conta il traffico di ricerca (cookie). **Non** creare una proprietà Analytics per Biography Library e **non** installare plugin Analytics, GTM o pixel su biographylibrary.org.

**Opzionale, vitali Chrome:** nello stesso progetto Cloud Brignole accendi Chrome UX Report API, crea una chiave API, mettila in `CRUX_API_KEY`. Senza, la raccolta salta e il pannello non si rompe. Non e uno script sul sito.

**Opzionale, Merchant Aelle:** in Merchant Center 5717230535 invita l email `...iam.gserviceaccount.com` del JSON Brignole. Senza invito, la raccolta Merchant salta.

---

## 5. GitHub, WordPress, Ecwid

**GitHub:** due token a grana fine, non uno solo. GitHub li lega a un proprietario: o il tuo account o un’organizzazione.

- Repo tuoi (TagTales, kizunama, luna-nihongo, strangeglyph): [token a grana fine](https://github.com/settings/tokens?type=beta) sul tuo utente. Hostinger: `GITHUB_TOKEN`.
  - Resource owner: il tuo utente.
  - Repository access: solo quei quattro repository.
  - Permissions (Repository permissions): **Contents** Read and write, **Pull requests** Read and write. Senza Pull requests, Approva scrive il ramo e poi fallisce con 403.
- Repo associazione (`biographylibrary/Biography-Library`): altro token, proprietario l’organizzazione Biography Library. Stessi due permessi. Hostinger: `GITHUB_TOKEN_BL`.

Non usare un token “classic” con accesso a tutto, e non mettere il token Brignole nella casella dell’associazione. Se uno dei due scappa, lo revochi senza toccare l’altro.

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

## 5c. robots.txt (WordPress)

Una volta sola, sugli stessi tre WordPress (Aelle, brignole.ch, Biography Library):

1. Plugin → Aggiungi → Carica plugin. Zip della cartella `plugin-wp/regia-robots`. Attiva **Regia robots**.
2. L utente della password applicativa deve essere **Amministratore** (per i titoli basta un redattore; per robots.txt no).
3. Se in File Manager, nella cartella del sito, c e un file chiamato `robots.txt`, **cancellalo**. Altrimenti Rank Math e il plugin non contano: Google legge quel file e basta.

Dopo scansione e diagnosi, in coda compare una scheda robots.txt se manca la riga Sitemap, se punta a un dominio sbagliato, o se c e Crawl-delay (Biography Library oggi). Approva. Se la sitemap del sito e una pagina HTML (brignole.ch con LiteSpeed), la scheda e solo una nota: in Rank Math accendi Sitemap, e in LiteSpeed escludi `sitemap*.xml` dalla cache. Quella non si applica da sola.

Sui siti Node, Approva apre una richiesta su `seo/robots.txt` (non sul codice). Finche il sito non legge quel file, copia il testo anche nel robots.txt in vetrina (File Manager o `public/robots.txt`).

Poi riapri la migrazione del punto 2 (Database pronto): serve la tabella nuova `tecnici`.

---

## 6. Sveglia notturna

Non e un programma da scrivere. E una sveglia di Hostinger: ogni notte il server apre da solo tre o quattro indirizzi del pannello (come hai fatto tu a mano per “Database pronto”). Cosi Search Console, vendite e diagnosi arrivano senza che tu clicchi.

Usa **la stessa** `CRON_CHIAVE` gia nelle variabili, attaccata dopo `chiave=`, senza virgolette e senza spazi. Sotto, al posto di `INCOLLA_LA_CHIAVE`, metti quella parola.

### Prima, prove nel browser (come la migrazione)

Raccolta (una volta basta; i quattro `problemi` su Biography Library e token Ads di prova si ignorano):

`https://seo.brignole.ch/api/cron/raccolta?chiave=INCOLLA_LA_CHIAVE`

Scansione: **un indirizzo alla volta**. Deve comparire JSON con `"pagine"`, non una pagina bianca. Aelle e grande: una passata legge un pezzo e si riprende da sola (lunedi notte, e le lunedi dopo). Se il browser dice **504 Gateway Time-out**, non ricaricare in loop: Hostinger ha tagliato l attesa. I siti piccoli di solito finiscono al primo colpo. Il negozio Ecwid sta dentro Aelle, non ha una scansione sua.

- Aelle: `https://seo.brignole.ch/api/cron/scansione?sito=aelle&chiave=INCOLLA_LA_CHIAVE`
- brignole.ch: `https://seo.brignole.ch/api/cron/scansione?sito=brignole&chiave=INCOLLA_LA_CHIAVE`
- Tag Tales: `https://seo.brignole.ch/api/cron/scansione?sito=tagtales&chiave=INCOLLA_LA_CHIAVE`
- Kizunama: `https://seo.brignole.ch/api/cron/scansione?sito=kizunama&chiave=INCOLLA_LA_CHIAVE`
- StrangeGlyph: `https://seo.brignole.ch/api/cron/scansione?sito=strangeglyph&chiave=INCOLLA_LA_CHIAVE`
- Luna Nihongo: `https://seo.brignole.ch/api/cron/scansione?sito=lunanihongo&chiave=INCOLLA_LA_CHIAVE`
- Biography Library (sito): `https://seo.brignole.ch/api/cron/scansione?sito=biography-library&chiave=INCOLLA_LA_CHIAVE`
- Biography Library (app): `https://seo.brignole.ch/api/cron/scansione?sito=biography-library-app&chiave=INCOLLA_LA_CHIAVE`

Diagnosi (dopo almeno una scansione):

`https://seo.brignole.ch/api/cron/diagnosi?chiave=INCOLLA_LA_CHIAVE`

Verifica (puo restituire zero: non ci sono ancora modifiche applicate da quattordici giorni):

`https://seo.brignole.ch/api/cron/verifica?chiave=INCOLLA_LA_CHIAVE`

Deve comparire del testo JSON, non “chiave non valida”.

### Poi, la sveglia su Hostinger (undici righe, piu una opzionale)

1. hPanel → sito `seo.brignole.ch` → Dashboard.
2. Nella barra a sinistra cerca **Cron Jobs** (a volte **Lavori Cron**).
3. Tipo: **Custom** (non PHP).
4. Crea **undici** lavori, uno alla volta. Incolla il comando intero nella casella Command / Comando. L orario di Hostinger e UTC: le tre di notte UTC sono le cinque in Svizzera d estate.

La scansione e **un sito per notte**: Aelle da sola non sta in tre minuti, si riprende la settimana dopo. Non mettere tutti i siti nella stessa sveglia.

**Ogni giorno, ore 3:00** (minuto 0, ora 3, giorno della settimana vuoto o asterisco):

`curl -fsS "https://seo.brignole.ch/api/cron/raccolta?chiave=INCOLLA_LA_CHIAVE"`

**Scansioni, ore 3:30** (minuto 30, ora 3). Cambia solo il giorno della settimana:

- Lunedi (giorno 1), Aelle:  
  `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=aelle&chiave=INCOLLA_LA_CHIAVE"`
- Martedi (2), brignole.ch:  
  `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=brignole&chiave=INCOLLA_LA_CHIAVE"`
- Mercoledi (3), Tag Tales:  
  `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=tagtales&chiave=INCOLLA_LA_CHIAVE"`
- Giovedi (4), Kizunama:  
  `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=kizunama&chiave=INCOLLA_LA_CHIAVE"`
- Venerdi (5), StrangeGlyph:  
  `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=strangeglyph&chiave=INCOLLA_LA_CHIAVE"`
- Sabato (6), Luna Nihongo:  
  `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=lunanihongo&chiave=INCOLLA_LA_CHIAVE"`
- Domenica (0), Biography Library sito:  
  `curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=biography-library&chiave=INCOLLA_LA_CHIAVE"`

**Domenica, ore 4:00** (minuto 0, ora 4, giorno 0), Biography Library app:

`curl -fsS "https://seo.brignole.ch/api/cron/scansione?sito=biography-library-app&chiave=INCOLLA_LA_CHIAVE"`

**Ogni giorno, ore 4:30** (minuto 30, ora 4):

`curl -fsS "https://seo.brignole.ch/api/cron/diagnosi?chiave=INCOLLA_LA_CHIAVE"`

**Solo lunedi, ore 5:00** (minuto 0, ora 5, giorno della settimana 1):

`curl -fsS "https://seo.brignole.ch/api/cron/verifica?chiave=INCOLLA_LA_CHIAVE"`

**Ogni giorno, ore 5:15** (minuto 15, ora 5): controllo impianto (Search Console, WordPress, GitHub, Ads). I risultati stanno nel pannello, voce Impianto:

`curl -fsS "https://seo.brignole.ch/api/cron/impianto?chiave=INCOLLA_LA_CHIAVE"`

**Opzionale, ogni giorno ore 5:30** (minuto 30, ora 5), sondaggio citazioni (campione, non ChatGPT pubblico):

`curl -fsS "https://seo.brignole.ch/api/cron/citazioni?chiave=INCOLLA_LA_CHIAVE"`

Senza questa riga il resto del pannello gira lo stesso.

Salva dopo ogni riga. Se Hostinger rifiuta il comando (“caratteri non ammessi”), manda uno screenshot: a volte vuole il tipo Custom, o un file `.sh`. Non serve il Terminale del Mac.

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