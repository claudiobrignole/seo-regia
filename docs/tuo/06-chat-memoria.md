# 6. La chat con Claude e la memoria

**Tempo: 2 minuti per accenderla.** Poi non c e niente da imparare: e una casella
dove scrivi in italiano.

## Cosa e

In fondo a ogni proposta di un sito, sotto i pulsanti **Approva** e **Rifiuta**,
c e un pulsante **Chiedi a Claude**. Lo trovi anche sotto ogni campagna e ogni
bozza nelle due pagine della pubblicita. Nella home non c e: quella e il
briefing, e da li si passa con **Apri**. Lo apri e chiedi quello che
vuoi: perche il pannello propone quella cosa, cosa cambia per chi cerca, se
stai spendendo bene, cosa toglieresti.

Claude legge i numeri di quella scheda, non indovina: le impressioni e i clic
della Search Console degli ultimi 28 giorni, le ricerche che portano su quella
pagina, il titolo e l H1 veri letti dalla scansione, il verdetto del pannello
sulla campagna. Se un numero non c e, lo dice invece di inventarlo.

## Come si cambia o si cancella una proposta parlando

Gli scrivi cosa vuoi, per esempio *fammelo piu corto* oppure *questa non mi
interessa, chiudila*. Claude non cambia niente da solo: sotto la sua risposta
compare un riquadro con il testo nuovo e un pulsante. Finche non premi il
pulsante non e cambiato niente, ne nella proposta ne sul sito.

I pulsanti che possono comparire:

| Pulsante | Cosa fa | Cosa **non** fa |
| --- | --- | --- |
| **Usa questo testo** | Mette il testo nuovo nella proposta | Non tocca il sito: dopo devi comunque premere **Approva** |
| **Chiudi la proposta** | La chiude e va in Storico con il motivo | Non tocca il sito |
| **Scarta la bozza** | Toglie la bozza da quelle da creare su Google Ads | Non tocca Google Ads |
| **Ricorda questa indicazione** | Registra la tua regola nella Memoria | Non cambia i testi gia proposti |

Sulle campagne vere non ci sono pulsanti oltre a **Ricorda**: il pannello legge
Google Ads e non ci scrive. Se Claude ti dice che una campagna va messa in pausa,
la pausa la metti tu nel tuo account.

Sugli articoli dell **archivio Aelle 1991-2001** il pulsante *Usa questo testo*
non compare affatto, nemmeno se glielo chiedi: quei titoli sono quelli originali
della rivista. Claude te lo dice e ti spiega, ma non riscrive.

## La memoria: la parte che vale piu della chat

Quando in una chat dici come vuoi le cose (*nei titoli non mettere mai la data di
fondazione*, *questo prodotto si chiama cosi*, *non usare mai la parola
esclusivo*), Claude ti propone **Ricorda questa indicazione**. Se confermi, quella
frase entra nella voce **Memoria** del menu, e da quel momento viene aggiunta alle
istruzioni di **ogni testo che Claude scrive di notte**: titoli, descrizioni,
istruzioni per le ricerche scoperte, bozze pubblicita.

Il punto e questo: senza la memoria, una correzione fatta il lunedi torna identica
il martedi notte, e ti tocca rifarla. Con la memoria la dici una volta.

Nella pagina **Memoria** puoi:

- rileggere tutte le indicazioni in servizio;
- aggiungerne una a mano, senza passare da una chat;
- **archiviare** quelle che non valgono piu. Archiviare non cancella: la riga
  resta sotto, e fra sei mesi dice perche a un certo punto si era deciso cosi.

Ogni indicazione vale su tutti i siti oppure su un sito solo (oppure su un
indirizzo solo, se nasce dalla chat di quella pagina). Lo vedi scritto sopra ogni
riga.

## I passi per accenderla

1. Fai il rilascio come nell [azione 1](01-rilascio.md): hPanel, `seo.brignole.ch`,
   Node.js, **Deploy**, poi **Restart**.
2. Apri una volta sola questo indirizzo nel browser, mettendo la tua chiave al
   posto di `LA_CHIAVE`:

   `https://seo.brignole.ch/api/setup/migra?chiave=LA_CHIAVE`

   Serve a creare le tre tabelle nuove (conversazioni, messaggi, memoria). Deve
   comparire una pagina bianca che dice **Database pronto** e l elenco delle
   tabelle. Se ci sono gia, non succede niente di male: si puo riaprire quante
   volte si vuole.
3. Controlla che nel menu in alto, fra **Siti** e **Sveglia**, ci sia **Memoria**.

## Come sai che funziona

1. Apri **Siti**, entra in **Aelle Hip Hop Magazine**, scheda **Da modificare**.
2. Su una proposta premi **Chiedi a Claude**, poi il primo suggerimento
   (*Perche il pannello propone questo, in due righe*).
3. Dopo una decina di secondi arriva la risposta, con i numeri di quella pagina.
4. Scrivi: *nei titoli non mettere mai la data di fondazione, ricordatelo per
   tutti i siti*. Deve comparire il pulsante **Ricorda questa indicazione**.
   Premilo.
5. Apri **Memoria**: la frase e li, con scritto *tutti i siti*.

## Quanto costa

Ogni domanda e una chiamata a Claude con la stessa chiave `ANTHROPIC_API_KEY` che
il pannello usa gia per scrivere i titoli di notte. Una domanda con la risposta
costa nell ordine di un centesimo. Non c e niente da attivare e nessun altro
abbonamento.

## Se qualcosa va storto

**Il pulsante Chiedi a Claude non c e.** Il primo giorno era li ma invisibile:
scritta bianca su scheda bianca, colpa mia. Corretto il 16 settembre, quindi
rifai il rilascio (punto 1) e lo vedi, in fondo alla scheda della proposta, sotto
Approva e Rifiuta. Se dopo il rilascio ancora non c e, controlla di essere dentro
un sito (**Siti**, poi il nome) e non nella home.

**Dice che le tabelle della chat non ci sono.** Hai saltato il punto 2. Apri
l indirizzo della migrazione e riprova: la domanda non si perde, la riscrivi.

**Dice che manca ANTHROPIC_API_KEY.** In hPanel, variabili d ambiente
dell applicazione, controlla che ci sia, salva e riavvia. E la stessa chiave che
serve ai testi notturni: se manca, di notte non vengono scritti nemmeno quelli.

**Dice che Claude e occupato.** Aspetta un minuto e rifai la domanda. Non si
perde niente di quello che vi eravate detti.

**Ho premuto Usa questo testo ma sul sito non e cambiato niente.** E giusto: il
pulsante mette il testo nella proposta. Sul sito ci va quando premi **Approva**,
come sempre, e come sempre si annulla.
