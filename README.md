# Regia SEO

Pannello che misura, diagnostica e corregge il SEO di sette siti, con un ciclo
notturno e un registro che permette di annullare ogni modifica.

## Installazione

    npm install
    cp .env.example .env.local     # e riempi i valori
    npm run db:migra
    npm run build && npm start

## I lavori pianificati

Nel pianificatore di hPanel, quattro voci:

| Quando        | Comando |
|---------------|---------|
| 03:00 ogni giorno | `curl -fsS -H "x-chiave-cron: CHIAVE" https://seo.brignole.ch/api/cron/raccolta` |
| 03:30 ogni giorno | `curl -fsS -H "x-chiave-cron: CHIAVE" "https://seo.brignole.ch/api/cron/scansione?sito=aelle"` |
| 04:30 ogni giorno | `curl -fsS -H "x-chiave-cron: CHIAVE" https://seo.brignole.ch/api/cron/diagnosi` |
| 05:00 il lunedì   | `curl -fsS -H "x-chiave-cron: CHIAVE" https://seo.brignole.ch/api/cron/verifica` |

La scansione ruota fra i siti cambiando il parametro `sito` di giorno in giorno.

## Prima di accendere l'automazione

In `siti.config.ts` ogni sito ha `automazioneAttiva: false`. Finché resta falso
il pannello propone e basta. Si accende un sito alla volta, partendo da
brignole.ch, e solo dopo aver verificato che il registro annulli davvero.

## Cosa manca

Il generatore dei testi (`lib/regole/testi.ts`): le regole trovano le
opportunità ma lasciano vuoto il valore nuovo. È il prossimo pezzo.
