# Plugin Regia robots

Si installa sui siti WordPress del perimetro (Aelle, brignole.ch, Biography Library): Plugin, Aggiungi, carica lo zip `plugin-wp/regia-robots.zip`. Se c e gia la versione 1.0.0, WordPress propone di sostituirla: si accetta, e il robots.txt scritto prima non si perde.

Serve all utente della password applicativa (`WP_AELLE_*`, `WP_BRIGNOLE_*`, `WP_BL_*`) il ruolo Amministratore.

Due rotte, entrambe chiamate dal pannello:

- `POST /wp-json/regia-seo/v1/robots` scrive robots.txt (Rank Math se c e, altrimenti un filtro del plugin).
- `GET` e `POST /wp-json/regia-seo/v1/meta` leggono e scrivono titolo e descrizione SEO di una pagina o di un articolo, e rispondono con il valore riletto dal database.

## Perche la rotta dei titoli deve esistere

Dalla strada normale (`wp-json/wp/v2`) WordPress accetta soltanto i meta che un plugin ha registrato per la REST, e Rank Math non registra i suoi. La richiesta riceve **200 e non cambia niente**: fino al 16 settembre 2026 il pannello si fidava di quel 200 e segnava le schede come applicate, mentre sui siti non era mai arrivato nulla (44 schede su 44). Qui si scrive con `update_post_meta` e si rilegge, quindi un ok e verificabile.

Il plugin riconosce da solo se sul sito c e Rank Math o Yoast e usa le chiavi giuste: nel pannello non si dichiara piu.

## Cosa aggiunge la 1.2.0, e perche non e obbligatoria

Chiede a LiteSpeed (la cache di Hostinger) di non tenere da parte le risposte di queste rotte, e di buttare la copia della pagina appena il titolo cambia. LiteSpeed teneva in cache anche le letture: il pannello scriveva, rileggeva per controllare, riceveva la fotografia di prima e segnava fallita una modifica riuscita. Quel guaio e chiuso dal lato del pannello, che ora chiede ogni lettura con un pezzo di indirizzo mai visto, e per questo la 1.2.0 non e obbligatoria. Serve al sito pubblico: senza, il titolo nuovo si vede alla scadenza della copia, e la scansione notturna puo rileggere quello vecchio e riproporre la stessa modifica.

Le due righe (`litespeed_control_set_nocache`, `litespeed_purge_post`) non fanno niente sui siti senza LiteSpeed.

Se in File Manager c e un file `robots.txt` nella radice, WordPress e Rank Math lo ignorano: cancellalo, poi Approva di nuovo dalla coda. In Rank Math resta visibile in Impostazioni generali, Modifica robots.txt.

Nessuno script Google, nessun tracciatore.
