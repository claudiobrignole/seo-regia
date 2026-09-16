# 2. Aggiungere la sveglia della raccolta

**Tempo: 5 minuti.** Questa e la ragione per cui i numeri erano fermi.

## Cosa e successo davvero

Nei Cron Jobs di `brignole.ch` hai creato dodici righe, e sono giuste. Ma manca
quella della **raccolta**: ci sono le sette scansioni, la diagnosi, la verifica,
il controllo impianto e le citazioni, e non c e `raccolta.php`.

La raccolta e il lavoro che porta i numeri dentro il pannello. Senza quella
sveglia, tutti gli altri lavori girano su dati di venerdi 11.

Seconda cosa, minore: hai caricato i file PHP stamattina verso le dieci. Le
sveglie sono impostate fra le 3:00 e le 5:30 UTC, cioe fra le cinque e le sette e
mezza del mattino in Svizzera. Erano gia passate. Quindi anche le dodici righe
giuste non avevano ancora avuto occasione di girare: la prima notte utile e
quella fra oggi e domani.

## I passi

1. Apri [hpanel.hostinger.com](https://hpanel.hostinger.com).
2. Menu **Siti web**, scegli **brignole.ch** (il dominio principale, non
   `seo.brignole.ch`: i Cron Jobs esistono solo qui).
3. A sinistra, **Avanzate** poi **Cron Jobs** (a volte **Lavori Cron**).
4. Premi **Crea nuovo cron job**.
5. **Tipo di comando**: scegli **PHP**, come per le righe che hai gia fatto.
6. Nella casella del comando incolla solo questo, niente altro:

   ```
   public_html/regia-sveglia/raccolta.php
   ```

7. Orario, quattro caselle:
   - minuto: `0`
   - ora: `3`
   - giorno del mese: `*` (ogni)
   - mese: `*` (ogni)
   - giorno della settimana: `*` (ogni)
8. Salva.

## Mentre sei in quella schermata, una correzione da trenta secondi

La riga `scansione-aelle.php` ha orario `0 3 * * 1`, cioe le 3:00 esatte del
lunedi: la stessa ora della raccolta che hai appena creato. Meglio non farle
partire insieme. Apri quella riga, modifica il minuto da `0` a `30` (diventa
`30 3 * * 1`, come tutte le altre scansioni) e salva.

Non e grave se te ne dimentichi: sono due lavori che non si danno fastidio. E
solo ordine.

## Come sai che e andata

**Subito, senza aspettare la notte:** pannello, voce **Sveglia**, lavoro
**Raccolta**, pulsante **Lancia adesso**. Se risponde con le misure salvate, il
lavoro funziona. Questo dice che il pannello e a posto, non che la sveglia parte.

**Domani mattina, per sapere se la sveglia parte:** apri **Sveglia**. Su ogni
lavoro c e la riga *Ultima volta*. Se dice un orario fra le cinque e le sette e
mezza di stamattina, Hostinger ha chiamato: la sveglia funziona e non ci pensi
piu. Se dice ancora ieri, allora e la sveglia che non arriva, e a quel punto
serve una cosa sola: in Cron Jobs di brignole.ch, apri la riga della raccolta,
premi **View Output** (o **Vedi output**) e mandami quello che c e scritto. Ora
ogni file PHP scrive in cima la data e il codice della risposta, per esempio
`[2026-09-17 03:00:02 UTC] /api/cron/raccolta HTTP 200`: da quella riga si capisce
in un colpo se ha chiamato e cosa ha risposto il pannello.

## Perche file PHP e non il comando curl

Nella casella comando di Hostinger, un `curl` con `?chiave=` viene tagliato: il
punto interrogativo e la e commerciale non arrivano. Il pannello riceve una
richiesta senza chiave, risponde *chiave non valida*, e nel database non resta
niente. Per questo la chiave sta in `public_html/regia-sveglia/config.php`, che
il web non puo aprire (c e un `.htaccess` che lo vieta: se provi a chiamarlo dal
browser risponde 403, ed e giusto cosi).
