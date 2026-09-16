# 4. Accendere la Content API del Merchant

**Tempo: 2 minuti.** Nessuna urgenza.

## Cosa manca

Il pannello prova a leggere le 702 schede prodotto del Merchant Center di Aelle
(numero `5717230535`) per dirti quali sono approvate e quali hanno un problema.
Google risponde:

> Content API for Shopping has not been used in project 1041075545980 before or
> it is disabled.

Cioe: l invito nel Merchant c e o non c e, ma prima di quello manca una cosa piu
semplice: nel progetto Cloud Brignole quella singola interfaccia e spenta. Si
accende con un pulsante.

Finora questo errore finiva soltanto nei registri del server, dove non lo vedevi.
Da oggi compare nella pagina **Impianto**, riga **Merchant Center Aelle**.

## I passi

1. Entra con la **tua Gmail** (non quella dell associazione).
2. Apri questo indirizzo, che porta direttamente alla pagina giusta del progetto
   giusto:

   https://console.developers.google.com/apis/api/shoppingcontent.googleapis.com/overview?project=1041075545980

3. Premi **Abilita** (in inglese **Enable**).
4. Aspetta due minuti: Google ci mette un po' a propagare la cosa.

## Come sai che e andata

1. Pannello, voce **Impianto**, pulsante **Controlla adesso**.
2. La riga **Merchant Center Aelle** deve diventare verde con la scritta *schede
   prodotto leggibili*.
3. Se dice ancora 403 ma il messaggio e cambiato e parla di permessi, allora
   serve anche l invito: Merchant Center `5717230535`, voce **Utenti**, aggiungi
   l email che finisce con `regia-seo-brignole.iam.gserviceaccount.com` in **sola
   lettura**.
4. Poi, voce **Sveglia**, lavoro **Raccolta**, **Lancia adesso**. Le schede
   prodotto entrano nel pannello.

## Se non la fai

Nel pannello non compaiono i controlli sulle schede prodotto di Aelle Store: quali
sono rifiutate dal Merchant e perche. Tutto il resto, comprese le vendite lette
da Ecwid, funziona uguale.
