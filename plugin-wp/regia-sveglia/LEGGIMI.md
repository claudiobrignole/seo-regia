# Sveglia Regia su brignole.ch

Hostinger accende i Cron Jobs solo sul dominio principale, quindi su **brignole.ch**, non su seo.brignole.ch. Va bene.

Nella casella comando **non** si mette `curl` con un indirizzo che contiene `?` o `&`. Hostinger taglia li: la chiave non arriva, il pannello rifiuta, in home non compare nulla. E quello che e successo con le dodici righe curl.

Qui ci sono file PHP, come `wp-cron.php`. La casella comando ha solo un percorso, senza punti interrogativi.

## Una volta: File Manager

1. hPanel → sito **brignole.ch** → File Manager.
2. Entra in `public_html`.
3. Carica tutta la cartella `regia-sveglia` (questi file).
4. Dentro la cartella, copia `config.example.php` e rinomina la copia `config.php`.
5. Apri `config.php`. Al posto di `INCOLLA_LA_CHIAVE` metti la stessa `CRON_CHIAVE` gia nelle variabili del pannello (applicazione Node seo.brignole.ch). **Cambia solo la parola fra gli apici**: gli apici restano, la virgola in fondo alla riga resta, e la riga `];` sotto non si tocca. Il file intero, commenti a parte, e questo:

   ```php
   <?php
   return [
       'chiave' => 'LATUACHIAVEVERA',
   ];
   ```

   Gli apici sono parte del PHP. Nelle variabili di Hostinger non ci vanno, qui si: senza apici e un errore fatale e la sveglia muore prima di chiamare il pannello, senza lasciare traccia in nessuna schermata.
6. Salva.

Non aprire questi file nel browser. Se per sbaglio lo fai, deve comparire un rifiuto, non un JSON.

## Poi: Cron Jobs

1. Sempre hPanel → **brignole.ch** → Cron Jobs.
2. Cancella le righe vecchie che iniziano con `curl`.
3. Tipo: **PHP** (non Custom).
4. Crea undici lavori. Nella casella comando incolla solo il percorso, niente curl.

Giorno e mese: **ogni** (asterisco o vuoto). Cambia solo il giorno della settimana dove indicato. Orario UTC: le 3:00 UTC sono le 5 in Svizzera d estate.

| Quando | Comando |
| --- | --- |
| Ogni giorno, minuto 0, ora 3 | `public_html/regia-sveglia/raccolta.php` |
| Lunedi (giorno settimana 1), minuto 30, ora 3 | `public_html/regia-sveglia/scansione-aelle.php` |
| Martedi (2), minuto 30, ora 3 | `public_html/regia-sveglia/scansione-brignole.php` |
| Mercoledi (3), minuto 30, ora 3 | `public_html/regia-sveglia/scansione-tagtales.php` |
| Giovedi (4), minuto 30, ora 3 | `public_html/regia-sveglia/scansione-kizunama.php` |
| Venerdi (5), minuto 30, ora 3 | `public_html/regia-sveglia/scansione-strangeglyph.php` |
| Sabato (6), minuto 30, ora 3 | `public_html/regia-sveglia/scansione-lunanihongo.php` |
| Domenica (0), minuto 30, ora 3 | `public_html/regia-sveglia/scansione-biography-library.php` |
| Domenica (0), minuto 0, ora 4 | `public_html/regia-sveglia/scansione-biography-library-app.php` |
| Ogni giorno, minuto 30, ora 4 | `public_html/regia-sveglia/diagnosi.php` |
| Solo lunedi (1), minuto 0, ora 5 | `public_html/regia-sveglia/verifica.php` |
| Ogni giorno, minuto 15, ora 5 | `public_html/regia-sveglia/impianto.php` |

Opzionale, ogni giorno minuto 30 ora 5: `public_html/regia-sveglia/citazioni.php`.

## Prova subito (una volta)

Sulla sola **raccolta**, per una volta scegli orario ogni 5 minuti (o il piu frequente che Hostinger offre). Aspetta 5-10 minuti. Clicca **View Output**: deve comparire JSON con `righe`. In home del pannello, Ultimi lavori notturni, una raccolta di adesso. Poi rimetti la raccolta a ogni giorno ore 3:00.

Se View Output dice che manca config.php o la chiave: ricontrolla il passo File Manager. Se e vuoto dopo 15 minuti: manda uno screenshot di View Output e dell elenco Cron.
