# Plugin Regia robots

Si installa sui siti WordPress del perimetro (Aelle, brignole.ch, Biography Library): Plugin, Aggiungi, carica lo zip della cartella `plugin-wp/regia-robots`.

Serve all utente della password applicativa (`WP_AELLE_*`, `WP_BRIGNOLE_*`, `WP_BL_*`) il ruolo Amministratore. Il pannello chiama `POST /wp-json/regia-seo/v1/robots`.

Se in File Manager c e un file `robots.txt` nella radice, WordPress e Rank Math lo ignorano: cancellalo, poi Approva di nuovo dalla coda. In Rank Math resta visibile in Impostazioni generali, Modifica robots.txt.

Nessuno script Google, nessun tracciatore.
