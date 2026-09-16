# 3. Ads Biography Library, chiedere l accesso Basic

**Tempo: 5 minuti tuoi, poi si aspetta Google (giorni, a volte una o due
settimane).** Nessuna urgenza: il resto del pannello gira senza.

## Cosa ho scoperto oggi, e perche conta

Fino a stamattina il pannello scriveva questo, per Ads Biography Library:

> 403 The caller does not have permission

Quella frase manda a cercare un invito mancante, e non era quello. Google mette
il motivo vero in un secondo strato della risposta, che il pannello non leggeva.
Adesso lo legge, e il motivo vero e:

> The Google Cloud project is only approved for use with test accounts. To access
> non-test accounts, apply for Explorer, Basic or Standard access.

Tradotto: il **token per sviluppatori** dell associazione vale ancora solo per
account di prova. Non e un invito che manca, non e una variabile sbagliata, non
si risolve nel codice. Si risolve chiedendo a Google di alzare il livello di quel
token.

Nota utile: sul banco Brignole questo problema **non c e**. Il token Brignole e
gia buono, e da oggi legge le campagne. Quindi non toccare le variabili Brignole
per nessun motivo mentre fai questa cosa.

## I passi

1. Chiudi le schede Google aperte con la tua Gmail, oppure apri una finestra di
   navigazione in incognito. Le due identita non vanno mescolate.
2. Entra con la **Gmail dell associazione**.
3. Apri [ads.google.com](https://ads.google.com).
4. In alto controlla il numero dell account: deve essere quello di Biography
   Library, **289-519-5392**. Se vedi `712-100-7160` sei nell account tuo: cambia
   account.
5. Devi essere nel **manager** (la cartella), non dentro una campagna. Il Centro
   API compare solo nel manager.
6. Menu **Strumenti** (icona chiave inglese) poi **Centro API** (in inglese
   *API Center*).
7. Nella scheda vedi il livello di accesso del token. Dira **Test** o **Prova**.
   Cerca il collegamento per fare domanda: si chiama **Apply for Basic access**,
   oppure **Richiedi accesso Basic**.
8. Compila il modulo. Google chiede a cosa serve: puoi scrivere che e un pannello
   interno che legge i dati delle campagne Ad Grants e carica le conversioni
   ricevute dai moduli del sito dell associazione, senza rivendere niente e
   senza accesso di terzi.
9. Invia.

**Non** cambiare il token nelle variabili di Hostinger. Il token resta lo stesso:
Google alza il livello di quello che hai gia.

## Come sai che e andata

Il giorno che arriva l email di Google (oggetto tipico: developer token, Basic
access), non devi fare niente in Hostinger. Solo:

1. Pannello, voce **Impianto**, pulsante **Controlla adesso**.
2. La riga **Ads Biography Library (lettura)** deve passare da attesa a **ok**.
3. Se resta rossa e dice *USER_PERMISSION_DENIED*, allora e davvero un invito:
   in Ads Biography Library, **Amministrazione**, **Accesso e sicurezza**,
   aggiungi l email che finisce con `regia-seo-biography.iam.gserviceaccount.com`
   con permesso **Standard**. Standard e non sola lettura, perche di notte il
   pannello carica le conversioni dei moduli.
4. Poi, voce **Sveglia**, lavoro **Raccolta**, **Lancia adesso**. Le campagne
   Grants compaiono in **Pubblicita Biography Library**.

## Cosa resta spento nel frattempo

- La schermata **Pubblicita Biography Library** resta vuota.
- Le conversioni raccolte dai moduli del sito restano in coda nel database,
  pronte: appena il token e alzato vengono caricate. Non si perdono e non serve
  nessun file CSV a mano.
- Tutto il resto (Search Console dell associazione, scansione, diagnosi, coda
  SEO) funziona come sempre.
