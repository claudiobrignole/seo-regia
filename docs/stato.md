# Dove siamo, all'8 settembre 2026

Questo file esiste per chi riapre il progetto: io, Claude Code, Cursor, o Claudio
fra tre settimane. Dice a che punto è il lavoro e cosa viene dopo, senza dover
ricostruire nulla dalla conversazione in cui è nato.

## Fatto

Impalcatura, login, migrazione dal browser, raccolta giornaliera Search Console
(fonte AI separata, una proprieta una volta sola), Ecwid paginato, scansione a
ripresa, coda SEO nel pannello (approva, rifiuta, annulla che riscrive),
generatore testi (`lib/regole/testi.ts`) con Claude / Gemini / Mistral, due
banchi Ads isolati (Brignole a pagamento vs Grants Biography Library), bozze
campagna e verdetti. Luna Nihongo e nel ciclo come gli altri: indicizzato,
ottimizzazione prima, dati anche a zero.

Guida clic per clic: `docs/istruzioni-tue.md`. Siti Node: `docs/siti-node.md`.

## Da fare, in ordine (operativo, non codice)

1. **Tu:** token Ads due volte (Gmail Brignole e Gmail associazione), progetti
   Cloud, inviti Search Console, variabili Hostinger, migrazione, cron.
   Vedi `docs/istruzioni-tue.md`.
2. Prima raccolta a mano, poi scansione `sito=aelle` e `sito=lunanihongo`.
3. Estrarre `seo/contenuti.json` nei cinque repository Node e far leggere il
   file al sito, partendo da StrangeGlyph poi Luna Nihongo.
4. Una modifica di prova sul titolo home di brignole.ch, poi Annulla. Solo se
   torna il vecchio si puo accendere `automazioneAttiva` e solo li.
5. Prima campagna a pagamento: bozza Luna Nihongo, creata a mano su Google Ads
   Brignole, ID collegato nel pannello. Grants: altro banco, altro account.

## I numeri da cui parte tutto

Su aelle.hiphop, tre mesi al 4 settembre 2026: 101.000 impressioni, 757 clic,
tasso di clic 0,8 per cento con posizione media 7,6, dove l atteso per quella
posizione e fra il 2 e il 4. Casi limite: posizione 1,3 su "dj shocca" con 2.519
impressioni e zero clic; "joe cassano" 4.478 impressioni e un clic. Delle
101.000 impressioni, 9.480 arrivano dalle risposte generate da Google su 193
pagine.

Portare il tasso di clic dallo 0,8 al due per cento significa passare da 757 a
circa 1.900 visite senza pubblicare una riga nuova. E da qui che nasce la regola
`ctr-basso.ts`, ed e la ragione per cui questo progetto esiste.

## Le quattro cose che non vanno dimenticate

Il registro viene prima dell automazione. Analytics non conta il traffico e va
filtrato per nome host. Due identita Google, mai mescolate. Due banchi
pubblicita: spesa Brignole e quota Grants non si sommano mai.
