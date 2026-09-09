# Dove siamo, al 9 settembre 2026

Questo file esiste per chi riapre il progetto: io, Claude Code, Cursor, o Claudio
fra tre settimane. Dice a che punto è il lavoro e cosa viene dopo, senza dover
ricostruire nulla dalla conversazione in cui è nato.

## Fatto

Impalcatura, login, migrazione dal browser, raccolta giornaliera Search Console
(fonte AI separata, una proprieta una volta sola), Ecwid paginato, scansione a
ripresa, coda SEO nel pannello (approva, rifiuta, annulla che riscrive),
generatore testi (`lib/regole/testi.ts`) con Claude / Gemini / Mistral, due
banchi Ads isolati, bozze e verdetti. Luna Nihongo e nel ciclo SEO (indicizzato,
dati anche a zero), **senza** campagna a pagamento finche Claudio non la chiede.

Biography Library: niente Analytics sul sito. Conversioni Grants dal plugin
`plugin-wp/regia-bl-grants` e upload notturno (`lib/ads/carica-conversioni.ts`).
Documento token Brignole: `docs/google-ads-api-tool-brignole.pdf`. Documento token
associazione: `docs/google-ads-api-tool-biography-library.pdf`.

Guida clic per clic: `docs/istruzioni-tue.md`. Siti Node: `docs/siti-node.md`.

## Da fare, in ordine

Fase 1 Brignole, **già fatto:** Hostinger Node, GitHub, database pronto, manager
Ads senza Grants, PDF token caricato, variabili `GOOGLE_ADS_*`, API Cloud accese.

**Resto Fase 1 (tu):** JSON account di servizio in Hostinger, inviti Search Console
e Analytics sui siti commerciali, sola lettura in Ads Brignole, password WP Aelle
e brignole.ch, Ecwid, GitHub, cron. Token Basic in attesa da Google.

Poi: prima raccolta e scansione `sito=aelle`. Lettura `seo/contenuti.json` nei
siti Node (StrangeGlyph per il meccanismo). Prova titolo home brignole.ch e Annulla.

**Fase 5 Biography Library (tu, dopo il plugin in repo):** niente GA/pixel sul
sito, installa il plugin, Console DNS, Cloud senza Analytics, manager Grants,
token con il PDF associazione, account di servizio **Standard**, `WP_BL_*`.

**Campagne:** quando Claudio sceglie. Ipotesi Grants su Biography Library, spesa
Brignole su Aelle Store. Non mescolare i due account.

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

## Le cinque cose che non vanno dimenticate

Il registro viene prima dell automazione. Analytics non conta il traffico e va
filtrato per nome host; sui siti Biography Library non si installa. Due identita
Google, mai mescolate. Due banchi pubblicita: spesa Brignole e quota Grants non
si sommano mai. Conversioni Grants automatiche, niente CSV a mano.
