# Dove siamo, al 17 settembre 2026

## Controllo indicizzazione e chiusura operativa, 17 settembre

Il pannello sa finalmente chiedere a Google se una pagina e nell indice.
Lavoro notturno `indicizzazione` (URL Inspection + sitemap), crawler con meta
robots / canonical / catena redirect, regola solo-nota, sentinella settimanale
(`misure` fonte `copertura`), pagina `/rapporto` (email Resend se configurata).

In piu, per smaltire il lavoro quotidiano: dossier per URL (con hreflang sulle
traduzioni TranslatePress), regola `negozio` su Aelle Store, Approva/Chiudi a
lotti. Resta a Claudio: rilascio, Cron delle `indicizzazione-*.php`, plugin
Regia robots 1.2.0 sui tre WordPress, eventuali `RESEND_API_KEY` e
`RAPPORTO_EMAIL`.

# Dove siamo, al 16 settembre 2026

## Le schede che non si potevano applicare, 16 settembre (notte)

Delle 116 schede aperte su titolo e descrizione, **69 stavano su indirizzi senza un
posto dove scrivere**, e si scopriva premendo Approva. Chiuse, col motivo nel
registro; restano 47 vere. Tre famiglie: schede del negozio Ecwid (32), pagine
tradotte da TranslatePress (33), file caricati in Media (4).

Tutti e tre i siti WordPress usano TranslatePress, che non crea un contenuto per
lingua: `/en/dj-enzo/` e la pagina italiana ridisegnata. Il controllo empirico
(slug del contenuto contro ultimo pezzo dell indirizzo) non bastava, perche
`brignole.ch/en/portfolio/biography-library/` ha lo stesso slug nelle due lingue e
sarebbe passato, cambiando il titolo della pagina italiana. Ora la conoscenza e
dichiarata in `siti.config.ts` (`traduzioni`, `percorsiNegozio`) e `lib/siti/indirizzi.ts`
risponde a regole, ciclo notturno, esecutori e chat.

Regola nuova `titoli-non-tradotti`: una nota per sito con le pagine tradotte che
portano il titolo dell originale (33 su Aelle, zero su brignole.ch). L archivio
1991-2001 ne resta fuori. Per Claudio: `docs/tuo/08-titoli-tradotti.md`.

## Il secondo perche di Approva, 16 settembre (notte)

Col plugin installato sui tre siti, Approva diceva ancora di non essere riuscita:
*rileggendo titolo ho ritrovato (vuoto)*. Il titolo era arrivato, la home di Aelle
lo mostrava. Sbagliava la controprova: LiteSpeed teneva in cache anche le letture
autenticate della REST (`x-litespeed-cache: hit`) e serviva al pannello la
fotografia scattata prima della scrittura. La password applicativa viaggia in un
header e non in un cookie, quindi da fuori quelle letture sembrano visite anonime.

- Le letture di `chiamaGrezza` portano un `regia_adesso` col millisecondo: nuove
  per qualunque cache, hosting configurato come gli pare. Le scritture no.
- Plugin 1.2.0: le rotte si dichiarano da non mettere in cache e dopo la scrittura
  si butta la copia della pagina. Serve al sito pubblico e alla scansione, non al
  pannello, quindi **non e obbligatoria** e non blocca il controllo Impianto.
- L azione della home di Aelle, che era fallita col testo nuovo gia sul sito, e
  tornata applicata dopo una rilettura vera, quindi si puo annullare.
- Un file caricato in Media (i PDF di Biography Library) ora lo dice: non e una
  pagina, il titolo SEO non ha dove stare, si chiude la proposta.

Restano in coda le 43 schede del guasto precedente, mai riprovate: quelle vanno
riapprovate una per una, e adesso arrivano davvero.

## Approva non scriveva, 16 settembre (sera tardi)

Il guasto piu grave trovato finora, e il piu silenzioso. I titoli SEO andavano a
WordPress con `POST wp/v2/{tipo}/{id}` e `meta: { rank_math_title }`. La REST di
WordPress accetta solo i meta registrati con `show_in_rest`, e Rank Math non
registra i suoi: risposta **200**, valore buttato via, scheda segnata applicata.
Verificate una per una tutte le azioni in stato applicata su titolo e descrizione:
**44 su 44 non erano mai arrivate**, su Aelle, brignole.ch e Biography Library.

- I titoli passano ora dalla rotta `regia-seo/v1/meta` del plugin Regia robots
  1.1.0, che scrive con `update_post_meta` e risponde con il valore riletto.
- `applicaAzione` rilegge dal sito e confronta prima di segnare applicata. Se non
  combacia, la scheda diventa rossa col motivo. Vale per WordPress ed Ecwid, non
  per i siti con repository (la modifica e una richiesta) ne per robots.txt (cache).
- Le schede prodotto del negozio (`/store/...`, `/search-products/...`) non si
  scrivono da WordPress: non sono pagine, le disegna Ecwid dentro la pagina del
  negozio. Prima il pannello avrebbe cambiato il titolo di *Search products*.
- Ecwid: `updateCount` a zero e un errore, non un successo.
- Impianto: le righe WordPress diventano rosse se il plugin e la versione vecchia.
- Le 44 schede sono tornate in coda come `fallita`, col motivo scritto sopra, e
  ognuna ha una riga nel registro. Si riapprovano dopo il plugin.

Il plugin 1.1.0 e stato caricato sui tre siti la sera stessa, verificato dalla
rotta dei titoli in `npm run verifica` e nella pagina Impianto.

## Chat interna e memoria, 16 settembre (sera)

Su ogni proposta, campagna e bozza c e **Chiedi a Claude**. Claude legge un dossier
con i numeri veri di quella scheda (Search Console 28 giorni, ricerche della
pagina, titolo e H1 dalla scansione, verdetto della campagna) e risponde in
italiano. Se gli si chiede un cambiamento **non lo fa**: propone una mossa e il
pannello mostra un pulsante. Scelta di Claudio.

- Mosse possibili: *Usa questo testo*, *Chiudi la proposta*, *Scarta la bozza*,
  *Ricorda questa indicazione*. Sulle campagne vere solo l ultima: il banco Ads
  resta in sola lettura.
- Sull archivio Aelle 1991-2001 la mossa *Usa questo testo* non esiste, e il
  dossier spiega a Claude perche. Provato inserendo una proposta finta su un
  articolo di archivio: `cambia_testo` non compare fra le mosse permesse.
- Un testo cambiato dalla chat va nel registro come `testo_cambiato`, con il
  numero del messaggio da cui viene.
- Il testo che entra nella proposta si rilegge dal messaggio salvato, non dal
  browser. Una mossa confermata due volte viene rifiutata.
- **Memoria** (`/memoria`): le indicazioni attive entrano nelle istruzioni di ogni
  testo che Claude scrive di notte (titoli, descrizioni, istruzioni delle lacune,
  bozze pubblicita). Provato: indicazione registrata dalla chat, e
  `bloccoIndicazioni('aelle', ...)` la restituisce subito.
- Tre tabelle nuove: `conversazioni`, `messaggi`, `memoria`. Vanno create una
  volta con `/api/setup/migra`, altrimenti la chat lo dice e spiega come fare.
- Da terminale: `npm run chat -- azione aelle "perche proponi questo titolo"`.
- Il verdetto delle campagne e uscito dalla cella di tabella: ora ogni campagna ha
  una scheda con pro, contro, motivo e la chat sotto.

Per Claudio: `docs/tuo/06-chat-memoria.md`.

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
