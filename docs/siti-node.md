# Siti Node: file `seo/contenuti.json`

Il pannello non tocca il codice dei siti Next. Apre una richiesta di modifica su un solo file di dati. **Il sito deve leggere quel file**, altrimenti in vetrina non cambia nulla.

Forma del file (chiave = URL pubblico):

```json
{
  "https://lunanihongo.com/": {
    "titolo": "Luna Nihongo, lezioni di giapponese",
    "descrizione": "Frase di una riga, senza trattino lungo."
  }
}
```

Nel sito, in `generateMetadata` (o equivalente): se l’URL e nel file, usa titolo e descrizione di li; altrimenti resta il testo attuale nel codice.

Ordine di lavoro, un repository alla volta:

1. StrangeGlyph (una pagina: si capisce se il meccanismo funziona)
2. Luna Nihongo (e quello da promuovere; italiano e giapponese)
3. TagTales, Kizunama, applicazione Biography Library

Finche il lettore non c e, le proposte del pannello restano in coda: si possono approvare solo dopo.
