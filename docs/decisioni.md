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


