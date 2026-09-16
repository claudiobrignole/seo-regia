# 4. Merchant Center di Aelle Store

**Tempo: 2 minuti.** Nessuna urgenza.

## Il punto a cui siamo

La prima meta l hai gia fatta oggi: nel progetto Cloud Brignole la **Content API
for Shopping** e accesa. Si vede dall errore, che e cambiato. Prima diceva:

> Content API for Shopping has not been used in project 1041075545980 before or
> it is disabled

Adesso dice:

> The caller does not have access to the accounts: [5717230535]

Cioe: la porta e aperta, ma l email del pannello non e fra gli utenti del Merchant
Center. Resta un invito, e la cosa piu semplice di tutta la lista.

## Il passo che resta

1. Con la **tua Gmail**, apri
   [merchants.google.com](https://merchants.google.com) e scegli l account
   **5717230535** (quello con le 702 schede di Aelle Store).
2. In basso a sinistra, icona a forma di ingranaggio: **Impostazioni**, poi
   **Utenti e accesso** (in inglese *People and access*, in certe versioni solo
   *Utenti*).
3. **Aggiungi persona** (o **Add person**).
4. Indirizzo email:

   ```
   regia-seo@regia-seo-brignole.iam.gserviceaccount.com
   ```

5. Permesso: **Lettore** (in inglese *Standard* con sole letture, oppure *Read
   only* se la schermata lo chiama cosi). Non serve niente di piu: il pannello
   sul Merchant non scrive mai.
6. Salva. Google puo dire che l invito e in attesa: per un indirizzo di questo
   tipo non arriva nessuna email da accettare, l accesso e immediato.

Se Google rifiuta l indirizzo perche finisce con `iam.gserviceaccount.com`,
fermati e dimmelo: c e una strada alternativa che passa dal collegamento fra il
progetto Cloud e il Merchant.

## Come sai che e andata

1. Pannello, voce **Impianto**, pulsante **Controlla adesso**.
2. La riga **Merchant Center Aelle** deve diventare verde con la scritta *schede
   prodotto leggibili*.
3. Poi, voce **Sveglia**, lavoro **Raccolta**, **Lancia adesso**. Le 702 schede
   entrano nel pannello.

## Se non la fai

Nel pannello non compaiono i controlli sulle schede prodotto: quali sono rifiutate
dal Merchant e perche. Tutto il resto, comprese le vendite lette da Ecwid,
funziona uguale.
