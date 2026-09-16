# Decisioni, con la data

Per lo stato del lavoro vedi `stato.md`. Qui ci sono solo le scelte e il perche.

Questo file esiste perché fra sei mesi nessuno si ricorda perché una cosa è
fatta così. Ogni voce dice cosa si è deciso e cosa si è scartato.

## 2026-09-07, Next.js invece di PHP
Claudio ha già tre progetti Node su Hostinger Business e mantiene il codice con
Claude Code e Cursor. Scartato PHP, che pure avrebbe girato su qualunque piano.

## 2026-09-07, MySQL invece di Supabase
MySQL è incluso nel piano e sta accanto all'applicazione. I progetti Supabase
gratuiti vengono messi in pausa dopo un periodo di inattività, e un lavoro
notturno automatico è il caso in cui te ne accorgi tardi e male.

## 2026-09-07, i lavori notturni chiamano rotte, non eseguono Node
Su hosting condiviso la configurazione di Node cambia con gli aggiornamenti e i
processi pianificati si rompono al momento peggiore. Una richiesta HTTP protetta
da chiave funziona sempre, e si può lanciare a mano.

## 2026-09-07, i siti su repository si modificano solo tramite file di dati
Il SEO dei siti Node vive nel codice. Si estrae in `seo/contenuti.json` e il
pannello aggiorna solo quel file, mai il codice: un file di dati sbagliato dà un
titolo brutto, una riga di codice sbagliata dà un sito che non si avvia.

## 2026-09-07, Analytics filtrato per nome host
La proprietà Aelle riceve dati falsi inviati da fuori (864 utenti da Singapore in
una settimana, quasi tutti diretti). Non si può impedire, perché l'identificatore
di misurazione è pubblico in ogni pagina. Si filtra in lettura.

## 2026-09-07, il traffico di ricerca si legge dalla Search Console
Complianz blocca gli script prima del consenso ai cookie: Analytics vede solo chi
accetta, tipicamente fra la metà e i tre quarti dei visitatori. Non è un errore,
è conformità. Quindi Analytics serve solo per il comportamento.

## 2026-09-07, le vendite si leggono da Ecwid
Ecwid conosce tutti gli ordini, indipendentemente dal consenso. È la fonte di
verità sulle conversioni e chiude il cerchio fra una ricerca e un ordine.

## 2026-09-07, due identità Google separate
Biography Library è un'associazione con Ad Grants attivo. Account di servizio
distinto, creato nel progetto dell'associazione. Mescolare le identità creerebbe
proprio il problema di conformità che la separazione evita.

## 2026-09-07, le biografie pubbliche su app.biographylibrary.org
Deciso da Claudio. Resta aperta la raccomandazione di servirle sotto
biographylibrary.org tramite riscrittura, per non spezzare il lavoro fra due
proprietà distinte nella Search Console. Da riprendere prima del lancio.

## 2026-09-07, tutti e cinque i siti Node hanno un repository
In un primo momento StrangeGlyph risultava caricato a mano su Hostinger e lo
avevamo messo in sola lettura. Claudio ha poi trovato il repository, quindi
rientra fra i siti che si modificano con una richiesta di modifica.
Resta nel codice il tipo di scrittura "nessuna": se un domani entrasse nel
perimetro un sito senza repository, il pannello si rifiuta di scrivere invece
di improvvisare, perche senza storico non esiste annullamento.

## 2026-09-07, repository collegati
claudiobrignole/TagTales, claudiobrignole/kizunama, claudiobrignole/luna-nihongo,
claudiobrignole/strangeglyph e biographylibrary/Biography-Library. Quest ultimo sta sotto l organizzazione
dell associazione, coerente con la separazione delle due identita.

## 2026-09-08, credenziali dalle variabili d ambiente, non da un file
Idea di Claudio, ed e la scelta giusta: Hostinger espone una sezione per le
variabili d ambiente nel pannello dell applicazione. Un file .env.local creato
a mano nel gestore file verrebbe sovrascritto al rilascio successivo da GitHub.
Il codice legge process.env, quindi in locale il file resta valido.

## 2026-09-08, la migrazione si puo fare dal browser
Aggiunta la rotta /api/setup/migra protetta dalla stessa chiave dei lavori
notturni: prepara il database senza aprire un terminale. Lo schema usa
CREATE TABLE IF NOT EXISTS, quindi rilanciarla e innocuo.

## 2026-09-08, accesso con password e cookie firmato
Il pannello non e piu raggiungibile da chiunque conosca l indirizzo. Una sola
password in PANNELLO_PASSWORD, un cookie firmato con scadenza a trenta giorni,
nessun servizio esterno e nessuna tabella utenti: e un pannello per una persona.
Le rotte /api/cron e /api/setup restano fuori dal controllo perche hanno la loro
chiave e un lavoro pianificato non sa fare login. Cambiare la password invalida
tutte le sessioni aperte.

## 2026-09-08, Luna Nihongo e pronto
Non si tiene fuori dall indice. Stesso ciclo degli altri: prima i testi, poi i
dati (all inizio a zero). Non e la prima campagna a pagamento: Claudio sceglie
dove partire (ipotesi: Aelle Store a pagamento, Grants su Biography Library).

## 2026-09-08, due banchi Ads, mai una cassa unica
Biography Library e un associazione con Ad Grants gia approvato. Soldi, token,
manager, schermate e suggerimenti restano separati da Luna Nihongo / Aelle /
brignole.ch. Nessun totale Ads unico. Il pannello non crea ne mette in pausa
campagne: consiglia e legge. Eccezione Grants: carica da solo le conversioni
dei moduli del sito, senza pixel e senza CSV a mano.

## 2026-09-09, Biography Library senza tracciatori sul sito
Lo statuto vieta Analytics, Tag Manager e pixel sulle pagine pubbliche.
Search Console si verifica con DNS. Cloud dell associazione serve al pannello,
non si installa sul sito. Account di servizio Ads: accesso Standard (l upload
conversioni non passa in sola lettura). Plugin `plugin-wp/regia-bl-grants`.

## 2026-09-10, robots.txt si sistema, le sitemap enormi no
Si legge robots.txt e si cerca una sitemap che sia davvero XML (200 con HTML
non conta). Si propone un robots migliore: riga Sitemap sul dominio giusto,
niente Crawl-delay. Non si riscrivono a mano gli indici generati da Rank Math
o dal sito: se la sitemap e una pagina HTML, e una nota (accendi Sitemap in
Rank Math, escludi sitemap*.xml da LiteSpeed). Sui siti Node la scrittura e
`seo/robots.txt`, stesso vincolo di `seo/contenuti.json`: dati, non codice.
Su WordPress Approva chiama il plugin `plugin-wp/regia-robots`; se c e un file
fisico in radice, Rank Math non vale e va cancellato dal File Manager.

## 2026-09-10, pannello in faccia Aelle, logo B Brignole
Colori, caratteri e pezzi dal Design System Aelle (sabbia, inchiostro, arancio
#FF4F00, Shamgod e Karla). Nessun logo Aelle nel pannello: in testata il B
Brignole. I due banchi Ads restano due schermate.

## 2026-09-10, briefing a lunghezza variabile
La home elenca prima l urgente (robots, Merchant, Grants, Ads da fermare,
lezione peggiorata), poi al massimo otto importanti. Caduta di posizione e
titoli deboli stanno tra le importanti, non tutte in «adesso». Le medie restano
solo nella scheda sito. Apri porta alla scheda di quella proposta.

## 2026-09-10, Overview, CrUX, Merchant, citazioni
Le AI Overview si leggono dalla Search Console (anche per query), non servono
file magici. CrUX e Merchant sono sola lettura: se manca la chiave o l invito,
la raccolta salta. Le citazioni LLM sono un campione di Claude (stesso modello dei testi),
non l indice pubblico di ChatGPT.

## 2026-09-10, una sola AI: Claude
Titoli, descrizioni, istruzioni, bozze Ads e sondaggio citazioni passano tutti
da Claude Sonnet 5. Gemini, Mistral e Grok restano nel codice ma non si usano.
Niente rotazione e niente secondo cervello finche non lo chiediamo.

## 2026-09-12, titoli originali dell archivio Aelle
Gli articoli 1991-2001 sono testi della rivista, non schede SEO. Titolo,
descrizione e H1 restano identici (italiano e inglese). La diagnosi non li
propone, Approva si ferma, le schede gia in coda su quei campi si chiudono.
Le interviste nuove e il negozio restano nel ciclo. Codice:
`lib/siti/archivio-aelle.ts`. Per Claude: skill `.cursor/skills/aelle-archivio/`.

## 2026-09-12, testi in coda vuoti
La diagnosi crea molte schede e Claude ne riempie poche per passata (limite
di tempo Hostinger). Prima si riempiono le schede gia vuote, poi se ne creano
di nuove. Non si rigenera un testo gia presente. Il campo vuoto in scheda
non e un bug: o e una nota (niente da pubblicare) o il testo arriva la notte
dopo.

## 2026-09-16, Ads Brignole senza login-customer-id obbligatorio
Il token Explorer e l email iam Brignole leggono l account campagne
`712-100-7160`. `GOOGLE_ADS_MANAGER_ID` (`150-466-0044`) e il manager del
Centro API, ma quell account campagne non sta sotto come cliente: mandare
`login-customer-id` fa 403 anche con token e invito giusti. Si prova prima con
il manager, se Google rifiuta si ritenta senza. Non svuotare la variabile
manager: serve a sapere quale MCC possiede il token. Biography Library resta
un altro banco.



## 2026-09-16, i lavori notturni sono funzioni, non solo rotte
Prima ogni lavoro viveva dentro il suo `app/api/cron/*/route.ts`, e si poteva
lanciare solo con la chiave nell indirizzo. Risultato: per sapere se la raccolta
funzionava bisognava aspettare la notte o incollare un indirizzo con un segreto
dentro. Ora il corpo di ogni lavoro sta in `lib/lavori/`, la rotta della sveglia
lo chiama con la chiave e il pannello lo chiama con la sessione
(`/api/lavori/esegui`, pagina `/sveglia`). Un lavoro che non si puo provare e un
lavoro di cui non si sa niente.

## 2026-09-16, le misure si scrivono a lotti
`salvaMisura` faceva una INSERT per riga: sulle diecimila righe di una notte, da
fuori il datacentro, erano 383 secondi di sola attesa di rete, e la raccolta
sforava il tempo concesso da Hostinger. Con `salvaMisure` a lotti di duecento la
stessa raccolta dura 16 secondi. Il contenuto del database e identico,
sovrascrittura compresa. Stessa cura sulla coda di scansione e sui link entranti:
StrangeGlyph e passato da 63 secondi a 2.

## 2026-09-16, il motivo vero di un errore Google Ads sta in error.details
`error.message` dice sempre "The caller does not have permission", anche quando
il problema e il livello del token per sviluppatori. Il codice vero
(`ACTION_NOT_PERMITTED`, `USER_PERMISSION_DENIED`) sta in
`error.details[0].errors[0].errorCode`. Per questo per giorni si e cercato un
invito mancante sul banco Biography Library, quando il blocco era che quel token
vale solo per account di prova. Ora `lib/ads/chiamata.ts` legge il dettaglio e
aggiunge una frase con cosa fare.

## 2026-09-16, un permesso mancante non e uno stato atteso
In `lib/impianto/controlli.ts` qualunque messaggio Ads con la parola *permission*
finiva fra gli attesi, e cosi un invito mai fatto sembrava normale. Ora resta
atteso solo cio che dipende da una approvazione di Google (token ancora per soli
account di prova). Tutto il resto e rosso finche non e sistemato.

## 2026-09-16, il rapporto AI Overview della Search Console resta spento
L API risponde `AI_OVERVIEW is not a valid searchAppearance`: Google non ha
aperto quel filtro. Erano quattordici richieste buttate ogni notte e altrettanti
avvisi che coprivano gli errori veri. Il codice resta, spento, dietro
`SEARCH_CONSOLE_AI=1`.

## 2026-09-16, la home mette prima le decisioni, poi i numeri
La tabella dei siti e l elenco dei lavori stavano sopra il briefing: si apriva il
pannello e la prima cosa erano numeri da guardare, non cose da fare. Ora l ordine
e avvisi, da fare adesso, da fare, tabella dei siti, stato della sveglia. Guardare
i numeri non e un compito.

## 2026-09-16, i due token GitHub restano larghi, ed e una nota
Ognuno dei due token vede anche i repository dell altra identita: sono a grana
fine ma creati senza restringere l elenco, quindi ereditano gli accessi della
persona, che sta in entrambe le organizzazioni. Claudio ha scelto di lasciarli
cosi. Nessuna richiesta di modifica parte senza il suo Approva, e la scheda dice
sempre di quale sito si tratta: il token largo non fa succedere niente da solo,
allarga solo il danno possibile di un bersaglio sbagliato. Il controllo F0b resta
nel pannello come **atteso**, non come fallimento: un allarme che suona per una
cosa decisa insegna a ignorare gli allarmi. Passi per chiuderlo, se un giorno si
vuole: `docs/tuo/05-token-github.md`.

## 2026-09-16, la chat interna propone e Claudio conferma
Ogni proposta arrivava con un `motivo` di una frase, e non c era modo di chiedere
perche. Ora su ogni proposta, campagna e bozza c e una chat con Claude
(`lib/chat/`). Scelta di Claudio: Claude **non** cambia niente da solo nemmeno
quando glielo si chiede a parole. Propone una mossa, il pannello mostra un
pulsante, e finche non lo premi non e cambiato niente. Le mosse possibili le
decide il dossier dell oggetto, non la domanda: su un articolo dell archivio
Aelle la mossa "cambia testo" non esiste, e Claude sa perche. Il testo che entra
nella proposta si rilegge dal messaggio salvato, non dal browser: quello che va
dentro e esattamente quello che Claudio ha letto. Un cambio di testo dalla chat
finisce nel registro come `testo_cambiato`, perche fra un mese si deve poter
capire da dove viene quel titolo.

## 2026-09-16, la memoria entra nelle istruzioni, altrimenti e un diario
Le indicazioni raccolte in chat (`lib/memoria/`, pagina `/memoria`) non servono a
rileggere le decisioni: le righe attive vengono aggiunte alle istruzioni di ogni
testo che Claude scrive dopo, nei titoli e nelle descrizioni (`lib/regole/testi.ts`),
nelle istruzioni per le lacune e nelle bozze pubblicita. Senza questo, una
correzione fatta il lunedi tornerebbe identica il martedi notte, e la chat
servirebbe solo a sfogarsi. Tre portate: tutti i siti, un sito, un indirizzo.
Archiviare non cancella: una decisione vecchia spiega perche a un certo punto si
era deciso cosi. Se le tabelle non esistono ancora, `bloccoIndicazioni` torna
vuota invece di far fallire il lavoro notturno.

## 2026-09-16, la chat passa solo da Claude
`MODELLO_TESTI` puo scegliere il modello dei testi notturni, ma la chat usa Claude
in ogni caso: gli altri tre restano spenti nel file e non hanno mai visto una
conversazione. Un modello che risponde bene su un titolo non risponde
necessariamente bene su dieci battute, e non serve scoprirlo di notte.

## 2026-09-16, il consiglio sulle campagne esce dalla tabella
Il verdetto del pannello (pro, contro, motivo) stava in una cella di tabella,
dove tre frasi non si leggono. Ora la tabella tiene solo i numeri e ogni campagna
ha una sua scheda con il consiglio e la chat sotto. Il banco resta in sola
lettura: dalla chat non si mette in pausa niente e non si tocca un budget, si
capisce cosa conviene fare e lo si fa nel proprio account Google Ads.

## 2026-09-16, in config.php gli apici ci vanno, nelle variabili no
`chiama.php` diceva di incollare la chiave "senza virgolette": vero per le
variabili d ambiente di Hostinger, falso per un file PHP. Claudio ha seguito
l istruzione e ha scritto `'chiave' => ABC123,` senza apici, che in PHP 8 non e
una parola ma una costante inesistente: errore fatale, il file muore prima di
chiamare il pannello, e nel database non resta niente. Puo essere la ragione per
cui la sveglia non produceva risultati anche dopo che i Cron Jobs erano giusti.
Ora il `require` sta in un try/catch che stampa la riga da correggere, l esempio
mostra la riga giusta con gli apici e dice che sono parte del PHP. La lezione piu
generale: un messaggio che dice "senza virgolette" va scritto sapendo in che
formato finisce il valore, perche la stessa frase e giusta in un posto e sbagliata
tre righe piu in la.

## 2026-09-16, il pulsante della chat c era ma era bianco su bianco
Claudio non trovava la chat: il rilascio era passato (le classi `al-chat` erano
nel foglio di stile pubblicato e il server mandava 82 pulsanti sulla pagina di
Aelle), ma il pulsante usava `al-btn-ghost`, che e lo stile del menu scuro, cioe
testo bianco e bordo bianco al 22 per cento. Su una scheda, che ha fondo bianco,
non si vedeva niente. Da qui `al-btn-tenue`, la variante per fondo chiaro:
inchiostro su trasparente, bordo grigio, arancio al passaggio del mouse. Ghost
resta e serve ancora, ma solo dentro l intestazione scura.
La lezione: uno stile che si chiama come un effetto (ghost) e non come il posto
dove vive (fondo scuro) prima o poi finisce sul fondo sbagliato, e un pulsante
invisibile non da errori in nessuna prova. La prova che lo prende non e la build
ne il typecheck: e guardare la pagina.

## 2026-09-16, un ok deve voler dire "sono andato a guardare"
Il pannello scriveva i titoli SEO con `POST wp/v2/{tipo}/{id}` passando
`meta: { rank_math_title }`. WordPress accetta dalla REST soltanto i meta che
qualcuno ha registrato con `show_in_rest`, e Rank Math non registra i suoi: la
richiesta tornava 200 e il valore veniva buttato via. Nessun errore, nessun
sospetto, e `segnaApplicata` scattava comunque. Controllate tutte le azioni in
stato applicata su titolo e descrizione: 44 su 44 non erano mai arrivate sui siti,
su tre siti diversi, da quando il pannello esiste.
Tre conseguenze in questo commit.
Primo: i titoli passano dalla rotta `regia-seo/v1/meta` del plugin Regia robots
(versione 1.1.0), che scrive con `update_post_meta` e risponde con il valore
riletto dal database. La rotta di Rank Math (`rankmath/v1/updateMeta`) non si usa:
su questo hosting risponde 403 con una pagina HTML, tutte le sue rotte sono
bloccate a monte, e comunque e roba interna di un plugin altrui.
Secondo: `applicaAzione` rilegge dal sito e confronta prima di segnare applicata.
Salta i siti con repository, dove la modifica diventa vera quando si accetta la
richiesta, e robots.txt, che passa dalle cache. Costa una lettura in piu per ogni
Approva: e il prezzo di non mentire.
Terzo: `seoPlugin` esce da `siti.config.ts`. Quale plugin SEO ci sia lo riconosce
il plugin dentro WordPress, che e l unico che scrive. Prima Biography Library non
lo dichiarava e il pannello le mandava le chiavi di Yoast piu `title`, cioe stava
per rinominare gli articoli credendo di cambiare il titolo SEO.
La lezione: un codice HTTP dice che la richiesta e arrivata, non che ha fatto
effetto. Dove si scrive su un sistema di qualcun altro, la prova e rileggere.

## 2026-09-16, gli indirizzi del negozio non sono pagine di WordPress
Le schede prodotto di Ecwid vivono sotto `/store/...` e `/search-products/...` ma
non esistono in WordPress: le disegna il JavaScript dentro la pagina del negozio.
`trovaContenuto` non trovava lo slug, leggeva l HTML, ne ricavava il numero della
pagina contenitore e lo restituiva come se fosse la scheda. Approvare un titolo di
prodotto avrebbe cambiato il titolo della pagina *Search products*, e l annulla
avrebbe rimesso il nome di un prodotto su quella pagina. Ora, quando il numero
arriva dall HTML, si controlla che lo slug del contenuto sia l ultimo pezzo
dell indirizzo chiesto; se no, la scrittura si ferma e spiega dove va fatta
davvero. Il confronto per prefisso non bastava: `/en/search-products/...` ha
permalink `/search-products/`, il prefisso di lingua non c e.
Vale anche per i vecchi indirizzi che rimandano altrove: meglio fermarsi che
scrivere sul contenuto sbagliato.

## 2026-09-16, Ecwid: updateCount, non il codice HTTP
`PUT /products/{id}` risponde 200 anche quando non ha aggiornato niente, e lo dice
solo in `updateCount`. Stesso errore di WordPress, altra facciata. Ora zero
diventa un errore che nomina la causa piu probabile, il titolo che vive nella
traduzione di un negozio a piu lingue.

## 2026-09-16, le falle segnalate da Hostinger, e quali riguardavano il pannello
Hostinger ne elencava sei. Tre erano nostre, tre no, e la differenza conta perche
aggiornare a caso rompe cose che funzionano.

Nostre. `next` 15.5.21 aveva due falle gravi, portata a 15.5.25. Di quelle due,
una vale solo per chi ospita su Windows: qui e Linux, non ci toccava. L altra sta
nell ottimizzatore di immagini, che apre i file AVIF con `sharp`, e quella andava
chiusa. Sono due i modi, fatti entrambi: `sharp` sale a 0.35.4, e in
`next.config.mjs` l ottimizzatore si spegne del tutto con `images.unoptimized`.
Il pannello non usa `next/image` in nessuna pagina, quindi non perde niente, e
cosi la rotta `/_next/image` non esiste piu. Quello che non c e non si buca, e la
prossima falla della stessa famiglia ci trovera senza quella porta.

`postcss` era ferma alla 8.4.31 perche Next la fissa a quella versione esatta, non
a un intervallo: aggiornare Next non la muoveva. Ora c e un `overrides` in
`package.json` che la porta alla 8.5.x. Le quattro falle di postcss valgono per
chi da in pasto a postcss il CSS scritto da altri; il nostro CSS e nostro e passa
solo in compilazione, quindi il rischio vero era nullo. L abbiamo aggiornata
comunque: una dipendenza ferma da anni resta ferma anche quando il rischio cambia,
e ogni controllo futuro l avrebbe segnalata di nuovo.

`uuid` 9.0.1 arriva da googleapis. La falla riguarda le funzioni `v3`, `v5` e `v6`
quando chi chiama passa un pezzo di memoria suo; gaxios usa `v4`, che non e fra
quelle. Non ci riguardava. Il consiglio automatico era salire a googleapis 181,
trentasette versioni maggiori sulla libreria che legge Search Console e Analytics:
un rischio molto piu concreto della falla. Risolto con un `overrides` su `uuid`
alla 11, che espone ancora la funzione nel modo in cui gaxios la chiama, provato
caricando le librerie e rifacendo `npm run verifica`. `npm audit` ora dice zero.

La lezione: leggere a cosa serve la parte bucata prima di accettare il rimedio
proposto. `overrides` aggiorna una dipendenza dentro una libreria che la tiene
ferma, senza cambiare la libreria; `npm audit fix --force` avrebbe cambiato Google.

## 2026-09-16, la cache dell hosting rispondeva al posto del sito
Col plugin installato, Approva diceva ancora "rileggendo titolo ho ritrovato
(vuoto)". Il titolo era arrivato: la home di Aelle aveva il testo nuovo nel
`<title>`. Sbagliava la controprova. La lettura di controllo tornava con
`x-litespeed-cache: hit`: LiteSpeed teneva da parte anche le risposte della REST
autenticate e le riserviva per giorni, quindi il pannello rileggeva la fotografia
scattata **prima** della scrittura. La stessa lettura con un pezzo di indirizzo in
piu, mai visto, rispondeva col titolo nuovo: prova che il guaio era in mezzo, non
sul sito.

Perche la cache le ha prese per pagine da salvare: la password applicativa viaggia
in un header, non in un cookie di sessione, quindi da fuori quelle letture
sembrano visite anonime. La risposta portava perfino `no-store, private`, e
LiteSpeed le ha messe in cache comunque.

Rimedio dal lato pannello, quello che non dipende da come e configurato l hosting:
`chiamaGrezza` aggiunge alle sole letture un `regia_adesso` col millisecondo, cosi
ogni lettura e nuova per qualunque cache; i `Cache-Control: no-cache` si mandano
comunque, ma da soli non bastavano. Le scritture non passano dalla cache e restano
come erano. Nel plugin, versione 1.2.0, le stesse rotte si dichiarano da non
mettere in cache e dopo una scrittura si butta la copia della pagina
(`litespeed_purge_post`): serve al sito pubblico e alla scansione notturna, che
altrimenti rilegge il titolo vecchio e ripropone la modifica appena fatta. Non e
obbligatoria, e per questo non blocca niente nel controllo Impianto.

Conta anche per il registro, non solo per il messaggio: il valore da salvare per
l annullamento si legge prima di scrivere, e una lettura dalla cache avrebbe fatto
salvare un valore vecchio come se fosse quello vero.

L azione della home di Aelle era fallita per questo, con il testo nuovo gia sul
sito: riletta senza cache, e tornata applicata, quindi annullabile. Le altre 43 in
coda sono quelle del guaio precedente, mai riprovate: quelle vanno riapprovate.

La lezione, di nuovo la stessa da un altro lato: rileggere prova qualcosa solo se
si e sicuri di stare leggendo il sito, e non qualcuno che parla per lui.
