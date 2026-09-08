# Regia SEO

Pannello che misura, diagnostica e corregge il SEO di sette siti, con un ciclo
notturno e un registro che permette di annullare ogni modifica.

## Installazione su Hostinger

1. Collega il repository al sottodominio come applicazione Node.
2. Nel pannello dell applicazione, sezione **Environment variables**, aggiungi
   le variabili elencate in `.env.example`. Per partire bastano
   `PANNELLO_PASSWORD`, `CRON_CHIAVE` e le quattro `DB_`.
3. Prepara il database aprendo nel browser
   `https://seo.tuodominio/api/setup/migra?chiave=LA_CHIAVE_CRON`.
4. Apri il pannello.

Installazione e sviluppo in locale: `npm install`, copia `.env.example` in
`.env.local`, `npm run db:migra`, `npm run dev`.

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

## Cosa manca (operativo)

Il codice del ciclo c e. Manca il collegamento: Google Cloud, token Ads
(due identita), variabili Hostinger, prima raccolta. Istruzioni senza
programmare: `docs/istruzioni-tue.md`.

Due banchi pubblicita, mai una cassa unica: `/pubblicita/brignole` e
`/pubblicita/biography-library`.
