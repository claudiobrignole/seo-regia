# Cosa resta a te, 16 settembre 2026

Quattro azioni. Due sono da fare oggi e durano pochi minuti, due si possono
rimandare senza che il pannello si fermi. Ogni azione ha il suo documento, con i
clic e con la frase che ti dice se e andata.

Prima due cose che cambiano il modo di lavorare.

**Sveglia.** Ogni lavoro notturno ha un pulsante **Lancia adesso**. Non devi piu
incollare indirizzi con la chiave nel browser, ne aspettare la notte per sapere
se qualcosa funziona: apri Sveglia, premi, leggi la risposta in italiano.

**Chiedi a Claude, e la Memoria.** Sotto ogni proposta, ogni campagna e ogni bozza
c e una casella dove chiedere perche, e farti cambiare il testo parlando. Claude
non tocca niente da solo: propone, e tu premi un pulsante. Quando gli dai una
regola ti propone di ricordarla, e da quel momento vale per tutti i testi che
scrive di notte. Vedi [06-chat-memoria.md](06-chat-memoria.md).

## Oggi (dieci minuti in tutto)

| | Azione | Quanto | Se non la fai |
| --- | --- | --- | --- |
| 1 | [Rilasciare il codice nuovo](01-rilascio.md) | 3 minuti | Resta il pannello vecchio: niente pagina Sveglia, niente chat, e la raccolta continua a durare sei minuti invece di sedici secondi |
| 2 | [Aggiungere la sveglia della raccolta](02-sveglia-raccolta.md) | 5 minuti | I numeri restano fermi: e la ragione per cui sembrava che non funzionasse niente |

## Quando vuoi (nessuna urgenza)

| | Azione | Quanto | Se non la fai |
| --- | --- | --- | --- |
| 3 | [Ads Biography Library, chiedere l accesso Basic](03-ads-biography-library.md) | 5 minuti piu attesa di Google | La schermata Pubblicita Biography Library resta vuota e le conversioni Grants non si caricano. Tutto il resto gira |
| 4 | [Merchant Center di Aelle Store, l invito](04-merchant-content-api.md) | 2 minuti | Le schede prodotto di Aelle Store non entrano nel pannello. L API l hai gia accesa: resta solo l invito |

## Deciso di non fare

I **due token GitHub** restano larghi: ognuno vede anche i repository dell altra
identita. Hai scelto di lasciarli cosi, e nel pannello quella riga e diventata una
nota, non un errore: non ti chiama piu. Il perche, e i passi se un giorno cambi
idea, stanno in [05-token-github.md](05-token-github.md).

## Cosa ho verificato io, oggi, senza disturbarti

Ho fatto girare per davvero tutti e sei i lavori del ciclo contro il database di
produzione. Nessuno era rotto, ma tre erano troppo lenti per il tempo che
Hostinger concede, e uno diceva la cosa sbagliata:

- **Raccolta**: 10 347 misure salvate. Durava 383 secondi, ora dura 16. Scriveva
  una riga per volta, cioe diecimila viaggi al database.
- **Scansione**: StrangeGlyph durava 63 secondi per una pagina sola, ora 2. Aelle
  sta dentro i 31 secondi e riprende dalla coda la notte dopo.
- **Diagnosi**: gira, mette le schede in coda, scrive i testi con Claude.
- **Verifica a 14 giorni**: gira, torna zero perche non ci sono ancora modifiche
  applicate da due settimane. Zero e il risultato giusto.
- **Controllo impianto**: 21 righe su 25 a posto. L unica rossa e l azione 4 di
  questa lista; i token GitHub sono diventati una nota.
- **Citazioni**: gira.

**Google Ads Brignole ora funziona.** Il problema non era il token: il pannello
mandava sempre il numero del manager (150-466-0044) in testa alla richiesta, e
l account campagne (712-100-7160) non sta sotto quel manager. Google rispondeva
403 anche con il token giusto. Ora il pannello prova senza il manager quando
serve, e legge: `Brignole Google Ads`, non un account di prova.

**Search Console dell associazione ora si legge.** Quel pezzo l hai sistemato tu
fra l 11 e oggi: era l ultimo errore rimasto della raccolta di venerdi.

## Una cosa che non e piu vera

Nella guida vecchia c e scritto di provare la raccolta incollando
`https://seo.brignole.ch/api/cron/raccolta?chiave=...` nel browser. Funziona
ancora, ma non serve piu: quella era la sola strada per provare un lavoro, e
adesso c e il pulsante nel pannello. Gli indirizzi con la chiave restano per la
sveglia di Hostinger, che non sa fare login.
