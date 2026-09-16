# 1. Rilasciare il codice nuovo

**Tempo: 3 minuti.** Da fare prima delle altre azioni: le altre si controllano
dalla pagina Sveglia, che nasce con questo rilascio.

## Cosa cambia dopo questo passo

- Nel menu compare **Sveglia**: sei lavori, ognuno con **Lancia adesso**.
- Nel menu compare **Memoria**, e sotto ogni proposta un **Chiedi a Claude**
  (vedi [06-chat-memoria.md](06-chat-memoria.md)).
- La raccolta dura sedici secondi invece di sei minuti.
- La scansione di un sito piccolo dura due secondi invece di sessantatre.
- Gli errori di Google Ads dicono cosa fare, non solo il numero 403.
- Ads Brignole comincia a leggere le campagne.
- La home mette in cima le cose da decidere, non la tabella dei numeri.

## I passi

1. Apri [hpanel.hostinger.com](https://hpanel.hostinger.com) ed entra.
2. Menu **Siti web**, scegli `seo.brignole.ch`.
3. A sinistra, voce **Node.js** (in certe versioni si chiama **Applicazione
   Node.js** o **Node.js App**).
4. Nella scheda dell applicazione cerca il pulsante **Deploy** (a volte
   **Rilascia**, o **Deploy from GitHub**). Premilo.
5. Aspetta che la scritta diventi verde o compaia una data di oggi. Puo volerci
   un minuto o due.
6. Se non trovi nessun pulsante Deploy perche Hostinger rilascia da solo a ogni
   invio su GitHub, salta i punti 4 e 5: il codice e gia dentro. Vai al punto 7
   e controlla.
7. **Riavvia** l applicazione (pulsante **Restart** o **Riavvia**).
8. Apri una volta sola questo indirizzo, con la tua chiave al posto di
   `LA_CHIAVE`: `https://seo.brignole.ch/api/setup/migra?chiave=LA_CHIAVE`
   Serve a creare le tre tabelle della chat e della memoria. Deve rispondere
   **Database pronto**. Aprirlo due volte non fa danni.

## Come sai che e andata

1. Apri [seo.brignole.ch](https://seo.brignole.ch) ed entra con la password del
   pannello.
2. Nel menu in alto, fra **Siti** e **Impianto**, devono comparire **Memoria** e
   **Sveglia**. Se non ci sono, il rilascio non e passato: rifai i punti 4 a 7.
3. Apri **Sveglia**. Sul lavoro **Raccolta** premi **Lancia adesso** e aspetta
   senza chiudere la scheda.
4. Dopo una ventina di secondi deve comparire un riquadro verde con una frase
   tipo: *10 347 misure salvate dal 2026-08-17 al 2026-09-13*.

Se invece compare un riquadro con bordo rosso, leggi la frase: dice cosa fare.
L unico messaggio che ti aspetti oggi riguarda Biography Library e il suo token
di prova, ed e l azione 3 di questa lista.

## Se qualcosa va storto

**La pagina dice che il database non risponde.** Le variabili `DB_` sono state
toccate. In hPanel, variabili d ambiente, controlla che `DB_HOST`, `DB_USER`,
`DB_PASSWORD`, `DB_NAME` non abbiano virgolette o spazi. Salva e riavvia.

**Lancia adesso resta su Attendi per piu di tre minuti.** Ricarica la pagina
Sveglia: la riga **Ultima volta** del lavoro ti dice se e arrivato in fondo
comunque. Il lavoro gira sul server, non nel browser: chiudere la scheda non lo
ferma.

**Il menu Sveglia c e ma la pagina e bianca.** Manda uno screenshot con
l indirizzo in alto.
