# Dove siamo, all'8 settembre 2026

Questo file esiste per chi riapre il progetto: io, Claude Code, Cursor, o Claudio
fra tre settimane. Dice a che punto è il lavoro e cosa viene dopo, senza dover
ricostruire nulla dalla conversazione in cui è nato.

## Fatto

L'impalcatura completa: configurazione dei siti, schema del database, raccolta
da Search Console e Analytics, lettura di Ecwid, crawler, quattro regole
diagnostiche, esecutori per WordPress, GitHub ed Ecwid, registro con
annullamento, quattro rotte per i lavori notturni, una rotta che prepara il
database dal browser, e l'accesso con password e cookie firmato.

Tutto compila e il login è stato collaudato su richieste reali: pannello
protetto, pagina di accesso raggiungibile, rotte dei lavori pianificati fuori
dal controllo della sessione, biglietto manomesso e biglietto scaduto respinti.

## Da fare, in ordine

1. **Il generatore dei testi**, in `lib/regole/testi.ts`, che non esiste ancora.
   Le regole trovano le opportunità e lasciano `valore_nuovo` vuoto: nessuna
   proposta è quindi applicabile finché non c'è. Va scritto guardando la lista
   vera delle pagine di Aelle, non decidendo a tavolino la forma dei titoli.
2. **Collegare la Search Console** creando il progetto Google Cloud e l'account
   di servizio, poi lanciare `/api/cron/raccolta` una volta a mano.
3. **Il primo giro di scansione** su Aelle, per popolare la tabella `pagine`.
4. **Estrarre i testi SEO dal codice** dei cinque siti Node in
   `seo/contenuti.json`, un sito per volta, e far leggere quel file al sito.
5. **Accendere l'automazione** su brignole.ch, e solo lì, mettendo
   `automazioneAttiva: true` in `siti.config.ts` dopo aver verificato che
   l'annullamento funzioni davvero su una modifica di prova.

## I numeri da cui parte tutto

Su aelle.hiphop, tre mesi al 4 settembre 2026: 101.000 impressioni, 757 clic,
tasso di clic 0,8 per cento con posizione media 7,6, dove l'atteso per quella
posizione è fra il 2 e il 4. Casi limite: posizione 1,3 su "dj shocca" con 2.519
impressioni e zero clic; "joe cassano" 4.478 impressioni e un clic. Delle
101.000 impressioni, 9.480 arrivano dalle risposte generate da Google su 193
pagine.

Portare il tasso di clic dallo 0,8 al due per cento significa passare da 757 a
circa 1.900 visite senza pubblicare una riga nuova. È da qui che nasce la regola
`ctr-basso.ts`, ed è la ragione per cui questo progetto esiste.

## Le tre cose che non vanno dimenticate

Sono scritte anche in CLAUDE.md, ma vale la pena ripeterle perché sono le più
facili da violare per distrazione: il registro viene prima dell'automazione;
Analytics non conta il traffico perché il consenso ai cookie lo blocca, e va
sempre filtrato per nome host; le due identità Google, Brignole e Biography
Library, non si mescolano mai.
