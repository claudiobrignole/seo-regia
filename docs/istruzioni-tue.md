# Istruzioni tue (senza programmare)

Aggiornato l’8 settembre 2026. Il codice sta su GitHub; tu fai i passi nel browser. Se una schermata ha un nome un po’ diverso, fermati e manda uno screenshot con l’indirizzo in alto.

Due tipi di lavoro:

- **Cursor / chi programma:** codice e push.
- **Tu:** Google, Hostinger, password. Non serve il Terminale, tranne se vuoi lanciare a mano un lavoro notturno.

**Prima cosa, anche oggi:** chiedi i token Google Ads. **Due volte, due Gmail.** Google li approva in giorni.

---

## 1. Due identità, sempre

Pensa a due aziende.

**Brignole (soldi tuoi):** Gmail Brignole. Siti commerciali. Variabili `GOOGLE_*` e `GOOGLE_ADS_*`. Nel pannello: **Pubblicità Brignole**.

**Biography Library (Grants già approvato):** Gmail dell’associazione. Solo i siti dell’associazione. Variabili `BL_*`. Nel pannello: **Pubblicità Biography Library**.

Non collegare l’account Grants sotto il manager Brignole “così si vede tutto insieme”. Non esiste un totale unica di spesa Ads. I fondi Grants sono di Google, per il no profit.

---

## 2. Hostinger e database

1. hPanel → il sito `seo.brignole.ch` come **applicazione Node** (non PHP), Node 20 o più.
2. Collegamento GitHub: `claudiobrignole/seo-regia`, ramo `main`. Avvio: `npm start`.
3. Database MySQL: creane uno nuovo, annota host, nome, utente, password, porta (di solito 3306).
4. Nell’applicazione, **Environment variables**, aggiungi almeno:
   - `PANNELLO_PASSWORD` (minimo 12 caratteri)
   - `CRON_CHIAVE` (un’altra stringa lunga a caso)
   - `DB_HOST` `DB_PORT` `DB_USER` `DB_PASSWORD` `DB_NAME`
   - `MODELLO_TESTI=claude`
   - `ANTHROPIC_API_KEY`
5. Riavvia l’applicazione se Hostinger lo chiede.
6. Nel browser apri:  
   `https://seo.brignole.ch/api/setup/migra?chiave=LA_TUA_CRON_CHIAVE`  
   Deve comparire `"esito":"ok"`. Poi entra in `https://seo.brignole.ch` con la password del pannello.

Le altre variabili (Google, WordPress, Ecwid, GitHub, Ads) si aggiungono dopo, senza rifare il sito. Se manca un banco Ads, l’altro deve funzionare lo stesso.

---

## 3. Google Ads (due mondi, due volte)

Serve un **account manager** (contenitore). Il token si chiede da lì: Strumenti → Centro API.

### Brignole

1. Finestra in incognito, Gmail Brignole, [ads.google.com](https://ads.google.com).
2. Se non c’è un manager: [crealo](https://support.google.com/google-ads/answer/7456150) e collega **solo** gli account a pagamento (Luna Nihongo, Aelle, brignole.ch). **Non** il Grants.
3. Annota i numeri da 10 cifre **senza trattini** (`123-456-7890` → `1234567890`): `GOOGLE_ADS_CUSTOMER_ID`, se c’è il manager anche `GOOGLE_ADS_MANAGER_ID`.
4. Centro API: uso previsto, puoi copiare:  
   *Pannello interno di un titolare. Legge campagne a pagamento per report e bozze. Non crea né modifica campagne da programma. Non accede ad account Ad Grants. Siti: lunanihongo.com, aelle.hiphop, brignole.ch.*
5. Quando arriva il token: `GOOGLE_ADS_DEVELOPER_TOKEN` in Hostinger.

### Biography Library

1. Chiudi, nuovo incognito, Gmail **associazione**.
2. Stesso percorso, **altro** manager, solo Grants. Numeri in `BL_ADS_CUSTOMER_ID` e `BL_ADS_MANAGER_ID`.
3. Testo per il token:  
   *Pannello interno dell’associazione no profit Biography Library. Legge solo l’account Google Ad Grants già approvato. Non accede ad account Ads commerciali.*
4. Token in `BL_ADS_DEVELOPER_TOKEN`. Non riusare quello Brignole.

Poi, su **ciascun** progetto Cloud (punto 4): Libreria → Google Ads API → Abilita.

In Google Ads → Amministrazione → Accesso e sicurezza: aggiungi l’email `...iam.gserviceaccount.com` di **quell’identità**, accesso **Sola lettura**. Non incollare l’email Brignole sull’account Grants.

Keyword Planner: una ricerca a caso in ciascun account, per accenderlo.

Se Google rifiuta l’indirizzo dell’account di servizio, scrivimi: c’è un piano B (un consenso una tantum).

---

## 4. Google Cloud, Search Console, Analytics

Due progetti Cloud, due file JSON.

1. [console.cloud.google.com](https://console.cloud.google.com) con la Gmail giusta.
2. Nuovo progetto: `regia-seo-brignole` oppure `regia-seo-biography`.
3. Libreria, abilita: Search Console API, Analytics Data API, Google Ads API.
4. Credenziali → Account di servizio → nome `regia-seo` → Chiavi → JSON. Il file non va su GitHub.
5. Incolla il JSON in `GOOGLE_SERVICE_ACCOUNT_JSON` o `BL_SERVICE_ACCOUNT_JSON`.
6. Copia `client_email` dal JSON.

Search Console, per ogni dominio di quella identità: Impostazioni → Utenti → Aggiungi → email dell’account di servizio → **Proprietario**.

Domini Brignole: aelle.hiphop, brignole.ch, tagtalesgallery.com, kizunama.com, strangeglyph.xyz, lunanihongo.com.

Associazione: biographylibrary.org.

Se lunanihongo.com non è ancora una proprietà di dominio: Aggiungi proprietà → Dominio → record DNS TXT su Hostinger → Verifica.

Analytics: Amministrazione → Accesso proprietà → Lettore, stessa email, solo sulle proprietà giuste. Analytics non conta il traffico di ricerca (cookie).

---

## 5. GitHub, WordPress, Ecwid

**GitHub:** [token](https://github.com/settings/tokens) con accesso ai repo TagTales, kizunama, luna-nihongo, strangeglyph e Biography-Library. `GITHUB_TOKEN`.

**WordPress** (Aelle, brignole.ch, Biography Library): profilo → Password per le applicazioni → nome `regia-seo`. Utente + password in `WP_AELLE_*`, `WP_BRIGNOLE_*`, `WP_BL_*`. Non è la password del login.

**Ecwid:** token API → `ECWID_TOKEN`. Store `127192517`.

---

## 6. Sveglia notturna

hPanel → Cron. Sostituisci `LA_CHIAVE` con `CRON_CHIAVE`.

- 03:00 ogni giorno  
  `curl -fsS -H "x-chiave-cron: LA_CHIAVE" https://seo.brignole.ch/api/cron/raccolta`
- 03:30, un sito a notte, esempio  
  `curl -fsS -H "x-chiave-cron: LA_CHIAVE" "https://seo.brignole.ch/api/cron/scansione?sito=aelle"`  
  Altre notti: `brignole`, `lunanihongo`, `tagtales`, `kizunama`, `strangeglyph`, `biography-library`.
- 04:30  
  `curl -fsS -H "x-chiave-cron: LA_CHIAVE" https://seo.brignole.ch/api/cron/diagnosi`
- Lunedì 05:00  
  `curl -fsS -H "x-chiave-cron: LA_CHIAVE" https://seo.brignole.ch/api/cron/verifica`

La prima volta puoi incollare il primo `curl` nel Terminale del Mac (Spotlight → Terminale). Se `problemi` parla di account di servizio, manca l’invito in Search Console. Zero impressioni su Luna Nihongo è normale.

---

## 7. Prima campagna a pagamento (Luna Nihongo)

Solo **Pubblicità Brignole**. Incognito, Gmail Brignole. Controlla in alto che non sia l’account Grants.

1. Nel pannello apri la bozza, correggi se serve.
2. Google Ads → Nuova campagna → obiettivo come da bozza (spesso traffico al sito).
3. Rete **solo Ricerca**. Italiano e giapponese in gruppi o campagne separati.
4. Budget della bozza (o più basso). Annuncio adattabile: copia titoli e descrizioni senza allungarli.
5. Parole nell’elenco; esclusioni nella sezione esclusioni. Atterraggio `https://...`.
6. Pubblica. Copia l’ID campagna nel pannello → Collega. Da lì nasce lo storico.

Pausa e cancellazione restano un tuo clic su Google. Il pannello consiglia e ricorda.

Per il Grants: stessa idea nell’**altra** scheda, destinazione solo biographylibrary.org, niente parole troppo generiche, occhio al cinque per cento di clic e alla conversione del mese.

Ottimizza i titoli del sito **prima** di spendere.

---

## 8. Se qualcosa si blocca

Manda lo screenshot della pagina intera. Non serve indovinare il nome del menu.
