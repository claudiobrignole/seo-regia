---
name: aelle-archivio
description: Titoli originali dell archivio Aelle Hip Hop Magazine 1991-2001. Usala quando si parla di Aelle, archivio, rivista storica, titoli da non modificare, Approva su aelle.hiphop, o diagnosi SEO del magazine.
---

# Archivio Aelle 1991-2001: non si tocca

Su **Aelle Hip Hop Magazine** (`aelle.hiphop`, sito `aelle`) gli articoli
dell **archivio 1991-2001** sono testi originali della rivista cartacea.
Titolo, descrizione e H1 devono restare identici. Non si riscrivono per il SEO,
non si Approva, non si propone un testo nuovo, non si chiede a Claude un titolo
alternativo.

Le interviste e gli articoli **nuovi** (Video, Articoli, Rap italiano recente)
restano modificabili. Il negozio Ecwid (`aelle-store`) non e archivio.

## Come si riconoscono

- Categoria WordPress **ARCHIVIO 1991 - 2001** (id 181, slug `archivio`) e i
  figli (`rap-italiano-archivio`, `rap-americano-archivio`, ecc.).
- Elenchi: `https://aelle.hiphop/archivio/` e `https://aelle.hiphop/en/archive/`
  (anche `/page/2/`, `/page/3/`).
- Ogni articolo in quegli elenchi, italiano e inglese (slug diversi, stesso divieto).

Il codice che applica il divieto: `lib/siti/archivio-aelle.ts`.
La diagnosi filtra. Approva si ferma. Le proposte gia in coda su quei campi
vengono chiuse da sole.

## Cosa fare in chat

- Non suggerire titoli nuovi per RUN DMC, Joe Cassano, Articolo 31 d archivio, ecc.
- Se Claudio chiede di migliorare il CTR di una pagina archivio: spiega che
  la vetrina Google resta il titolo storico; si puo lavorare su link interni
  o su **altre** pagine, non sul titolo originale.
- Se una scheda in coda e archivio: Rifiuta / Chiudi, non Approva.

Dettaglio della scelta: `docs/decisioni.md` (12 settembre 2026).
