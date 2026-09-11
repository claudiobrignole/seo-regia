---
name: verifica-regia
description: Controlla e prova il pannello Regia SEO in autonomia. Usa quando Claudio chiede di testare, verificare l'impianto, se la raccolta gira, se i due banchi Ads sono separati, se Biography Library e senza tracker, o se le funzioni restituiscono i risultati giusti.
---

# Verifica Regia SEO

Segui `docs/istruzioni-claude.md` dall'alto in basso. Non violare i cinque vincoli in `CLAUDE.md`.

## Comandi

```bash
npm run verifica
npm run verifica -- --cron
npx tsc --noEmit
```

`--cron` scrive nel database (misure, pagine, proposte), non sui siti.
Non fare Approva/Annulla sui siti se Claudio non l'ha chiesto. In quel caso capitolo I del file, solo brignole.ch, poi Annulla subito.

## Uscita

Consegna il rapporto nel formato del file (tabella id / esito / risultato / cosa fare).
Non dire "tutto ok" senza numeri. Distingui `ok`, `fallito`, `atteso` (token Ads di prova, JSON BL mancante), `saltato`.
Non stampare password, token, chiavi private.
