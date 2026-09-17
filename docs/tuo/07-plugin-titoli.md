# 7. Il plugin che fa arrivare i titoli su WordPress

**Il plugin lo hai installato, ed e a posto su tutti e tre i siti: l ho
verificato.** Quello che ti serve sapere adesso sta nel primo paragrafo. Il resto
del documento e la storia, che tengo perche spiega perche le cose stanno cosi.

## Il 16 settembre, sera: c era un secondo guaio, ed era la cache

Dopo il plugin, Approva diceva ancora che non era riuscita: *rileggendo titolo ho
ritrovato "(vuoto)"*. Quella volta il titolo **era arrivato sul sito** (la home di
Aelle si chiama davvero *Aelle Hip Hop Magazine - dal 1991 la cultura Hip Hop*,
guardala). Era il controllo a sbagliare: LiteSpeed, la cache di Hostinger, teneva
da parte anche le risposte che il pannello si fa dare per leggere, e gli
ripresentava la fotografia scattata **prima** della scrittura. Il pannello
concludeva in buona fede che non era cambiato niente.

Ora le letture del pannello portano con se un pezzo di indirizzo diverso ogni
volta, che nessuna cache ha mai visto, quindi rispondono col valore vero.
**Questo non ti chiede niente: e nel pannello, e gia in linea.** La scheda della
home di Aelle e tornata verde da sola, e ora si puo annullare.

C e una versione **1.2.0** del plugin: dice a LiteSpeed di non tenere in cache
le nostre rotte, e di buttare via la copia della pagina appena il titolo cambia.
Serve al sito pubblico: senza, il titolo nuovo si vede appena la copia scade;
con, subito. **E nella chiusura del progetto**: cinque minuti, tre siti, stessi
passi di sotto. Lo zip e `plugin-wp/regia-robots.zip` (versione 1.2.0).

## Cosa era rotto (il primo guaio, quello del plugin)

Il pannello scriveva il titolo SEO chiedendolo a WordPress nel modo normale
(`wp-json/wp/v2`). WordPress accetta solo i campi che un plugin ha dichiarato per
quella strada, e Rank Math non dichiara i suoi. Risultato: WordPress rispondeva
**200, tutto bene** e buttava via il titolo. Il pannello si fidava della risposta
e segnava la scheda come applicata.

Ho controllato tutte le schede che risultavano applicate su titolo e descrizione:
**44 su 44 non sono mai arrivate sul sito**, ne su Aelle, ne su brignole.ch, ne su
Biography Library. Non hai fatto niente di sbagliato, e non e cambiato niente sui
siti: e come se quei pulsanti non fossero stati collegati.

Le 44 schede sono tornate nella coda **Da modificare**, in rosso, con scritto il
motivo. Dopo questo passo le riapprovi, e quella volta arrivano davvero.

## Cosa ho cambiato nel pannello

- I titoli passano da una rotta del nostro plugin, che scrive con la funzione di
  WordPress e **rimanda il valore riletto dal database**.
- Dopo ogni scrittura il pannello **rilegge dal sito** e confronta. Se non trova
  il testo nuovo, la scheda diventa rossa con il motivo. Un ok ora vuol dire
  "sono andato a guardare".
- Le schede dei prodotti del negozio (indirizzi `/store/...` e
  `/search-products/...`) non si scrivono piu da WordPress: quegli indirizzi non
  sono pagine, sono schede che Ecwid disegna dentro la pagina del negozio.
  Approvarle avrebbe cambiato il titolo della pagina *Search products*, non
  quello del prodotto. Ora il pannello si ferma e lo spiega.
- Nella pagina **Impianto**, le righe WordPress diventano rosse se su un sito il
  plugin e ancora la versione vecchia. Cosi non serve piu scoprirlo per caso.

## I passi, per ognuno dei tre siti

Lo zip da caricare e nella cartella del progetto sul tuo computer:

    BRIGNOLE PROGETTI E CLIENTI/seo-regia/plugin-wp/regia-robots.zip

Per **aelle.hiphop**, poi **brignole.ch**, poi **biographylibrary.org**:

1. Entra in WordPress come amministratore.
2. Menu **Plugin**, poi **Aggiungi nuovo plugin**, poi **Carica plugin**.
3. Scegli il file `regia-robots.zip` e premi **Installa ora**.
4. WordPress dice che il plugin e **gia installato** e mostra due colonne, la
   versione attuale e quella nuova (1.2.0). Premi **Sostituisci l attuale con
   quello caricato**.
5. Se ti chiede di attivarlo, attivalo. Se era gia attivo resta attivo: non
   perdi il robots.txt che avevi scritto dal pannello.

Non devi toccare niente altro: nessuna impostazione, nessuna schermata di Rank
Math.

## Come sai che e andata

1. Nel pannello, voce **Impianto**, premi **Controlla adesso** e aspetta.
2. Le tre righe **WordPress Aelle**, **WordPress brignole.ch** e **WordPress
   Biography Library** devono essere verdi. Se una resta rossa, la frase dice
   quale sito ha ancora il plugin vecchio.
3. Poi la prova vera: **Siti**, entra in **brignole.ch**, scheda **Da
   modificare**. Prendi una scheda rossa, leggi il titolo proposto e premi
   **Approva**.
4. Deve comparire il riquadro verde. Apri la pagina del sito in un altra scheda
   del browser: il titolo nella linguetta in alto deve essere quello nuovo.

Se invece compare un riquadro rosso, leggilo: adesso dice cosa fare, e ti chiede
di aprire la pagina e guardare il titolo prima di rifare. Se il titolo nuovo sulla
pagina c e, la scrittura e andata e il problema e in mezzo, fra il pannello e il
sito: dimmelo e guardo, e la traccia che mi ha fatto trovare la cache.

## Perche non l ho fatto io

Il pannello non ha accesso ai file dei tuoi siti: sa scrivere contenuti, non
installare plugin. E giusto che sia cosi, ed e la ragione per cui questo passo
resta a te. Da qui in avanti non si ripete: il plugin si aggiorna solo se un
giorno servira una rotta nuova.
