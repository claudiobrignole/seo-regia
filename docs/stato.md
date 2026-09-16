# Dove siamo, al 16 settembre 2026

## Aggiornamento del 16 settembre

Tutti e sei i lavori del ciclo sono stati eseguiti per davvero contro il database
di produzione. Nessuno era rotto; tre erano troppo lenti per il tempo che
Hostinger concede, e uno raccontava la cosa sbagliata.

- **Ads Brignole funziona.** Il pannello mandava sempre `login-customer-id` con
  il manager 150-466-0044, e l account campagne 712-100-7160 non sta sotto quel
  manager: Google rispondeva 403 anche con il token buono. Ora ritenta senza, e
  ricorda la risposta per non pagare due richieste ogni volta.
- **Ads Biography Library e in attesa di Google**, non di un invito: il token di
  quell account vale solo per account di prova (`ACTION_NOT_PERMITTED`). Il
  motivo vero stava in `error.details`, che il codice non leggeva.
- **Search Console dell associazione si legge** (D2 e D2b verdi).
- **Raccolta da 383 a 16 secondi**, scansione di un sito piccolo da 63 a 2:
  le misure e la coda si scrivono a lotti.
- **Pagina Sveglia** (`/sveglia`): ogni lavoro ha ultima esecuzione, orario
  atteso e pulsante Lancia adesso. I lavori vivono in `lib/lavori/`, chiamati sia
  dalla sveglia con la chiave sia dal pannello con la sessione.
- **Impianto**: 21 righe su 25 a posto. Le due rosse sono i token GitHub troppo
  larghi e la Content API del Merchant spenta.
- **La sveglia notturna non aveva ancora avuto occasione di girare**: i file PHP
  sono stati caricati alle dieci del mattino, le sveglie sono fra le 3:00 e le
  5:30 UTC. Manca del tutto la riga `raccolta.php`.

Cosa resta a Claudio, un documento per azione: `docs/tuo/00-indice.md`.

# Dove eravamo, all 11 settembre 2026

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

Guida clic per clic: `docs/istruzioni-tue.md`. Passi rimasti a Claudio:
`docs/passi-rimasti.md`. Prova autonoma per un agente: `docs/istruzioni-claude.md`
(`npm run verifica`). Siti Node: `docs/siti-node.md`.

Home: briefing unico (urgente, importante, quando puoi) e lezioni dalle
verifiche a 14 giorni. Pannello in sabbia/inchiostro/arancio, logo B Brignole,
font Shamgod e Karla. Regole in piu: Overview, cannibalizzazione, H1/canonical,
lacune come istruzioni, caduta di posizione, vitali, Merchant. Raccolta CrUX
e Merchant se ci sono chiave e invito. Cron citazioni a parte, opzionale.

## Da fare, in ordine

Lista clic per clic di ciò che resta a Claudio: `docs/passi-rimasti.md`.

**Già fatto (al 16 settembre):** codice in produzione, Database pronto, plugin
Regia robots sui tre WordPress, Regia BL Grants sul sito associazione, variabili
Hostinger compreso `BL_SERVICE_ACCOUNT_JSON`, inviti Search Console delle due
identità, Analytics Brignole, Ads Brignole in sola lettura. File PHP della sveglia
caricati in `public_html/regia-sveglia` su brignole.ch e dodici Cron Jobs creati.

**Resto, tu nel browser** (dettaglio in `docs/tuo/`): rilasciare il codice nuovo,
aggiungere la sveglia mancante della raccolta, chiedere l accesso Basic per il
token Ads dell associazione, accendere la Content API for Shopping nel progetto
Cloud Brignole, restringere i due token GitHub al loro perimetro.

Opzionale: `CRUX_API_KEY`, cron citazioni.

Poi, in Cursor sui siti Node: lettura `seo/contenuti.json` (prima StrangeGlyph).
Prova titolo home brignole.ch e Annulla.

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

## Le cose che non vanno dimenticate

Il registro viene prima dell automazione. Analytics non conta il traffico e va
filtrato per nome host; sui siti Biography Library non si installa. Due identita
Google, mai mescolate. Due banchi pubblicita: spesa Brignole e quota Grants non
si sommano mai. Conversioni Grants automatiche, niente CSV a mano. Archivio
Aelle 1991-2001: titoli originali della rivista, non si toccano.
