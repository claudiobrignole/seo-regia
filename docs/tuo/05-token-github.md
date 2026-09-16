# 5. I due token GitHub, nota (nessuna azione)

**Deciso il 16 settembre: si lasciano come sono.** Questo documento non e un
compito. Resta scritto perche il giorno che qualcuno si chiede se la cosa era
sfuggita, trovi la risposta: no, era una scelta.

Nella pagina **Impianto** la riga si chiama *Perimetro dei token GitHub (nota)* e
non conta come errore. La home non ti chiama piu per questo.

## Cos'e la situazione

In Hostinger ci sono due token diversi, `GITHUB_TOKEN` e `GITHUB_TOKEN_BL`, e va
bene: sono due stringhe distinte, ognuna scrive dove deve. Il pannello non le
mescola mai.

Provandoli ho visto che ognuno dei due, oltre al proprio, apre anche i repository
dell altro perimetro:

- il token dell associazione apre `claudiobrignole/TagTales`
- il token tuo apre `biographylibrary/Biography-Library`

Succede perche sono token a grana fine creati senza restringere l elenco dei
repository, quindi ereditano tutto quello a cui tu hai accesso come persona. E la
stessa cosa che vale per te quando entri in GitHub: sei nelle due organizzazioni,
quindi vedi tutto.

## Perche si puo lasciare cosi

Nessuna richiesta di modifica parte da sola: il pannello apre una richiesta su
GitHub solo dopo che tu hai premuto **Approva** su quella scheda, e la scheda dice
sempre di quale sito si tratta. Il rischio che il token largo aggiunge non e
"succede qualcosa da solo", e "se un giorno il codice sbaglia il bersaglio, il
danno non si ferma al confine dell identita".

Con nove siti e un solo utente, e un rischio piccolo. Chiuderlo sarebbe piu
ordine che sicurezza, e costa sei minuti tuoi piu due token da rigenerare quando
scadono.

## Se un giorno cambi idea

Sono due token da rifare, uguali fra loro, cambiando solo l elenco dei
repository.

### Token Brignole

1. Con la tua Gmail, apri
   [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens).
2. **Generate new token** (a grana fine, non il classico).
3. Nome `regia-seo-brignole`, scadenza a piacere.
4. **Resource owner**: il tuo account `claudiobrignole`.
5. **Repository access**: **Only select repositories**, e solo:
   - `claudiobrignole/TagTales`
   - `claudiobrignole/kizunama`
   - `claudiobrignole/strangeglyph`
   - `claudiobrignole/luna-nihongo`
6. **Permissions**, sezione Repository: **Contents** e **Pull requests** su
   *Read and write*. Nient altro.
7. Genera, copia (si vede una volta sola).
8. hPanel, applicazione Node `seo.brignole.ch`, variabili d ambiente: sostituisci
   il valore di **`GITHUB_TOKEN`**.

### Token Biography Library

1. **Generate new token** di nuovo. Nome `regia-seo-biography-library`.
2. **Resource owner**: l organizzazione **biographylibrary**, non il tuo account.
   Se chiede l approvazione di un proprietario e il proprietario sei tu, la
   approvi tu.
3. **Repository access**: **Only select repositories**, solo
   `biographylibrary/Biography-Library`.
4. **Permissions**: **Contents** e **Pull requests** su *Read and write*.
5. hPanel: sostituisci il valore di **`GITHUB_TOKEN_BL`**.
6. Salva e **riavvia** l applicazione Node.

### Come sapresti che e andata

Pannello, **Impianto**, **Controlla adesso**. Devono essere verdi **GitHub
TagTales**, **GitHub Biography Library** e **Perimetro dei token GitHub**, con la
scritta *ogni token vede solo i propri repository*. Se una delle prime due
diventa rossa con un 404, nell elenco *Only select repositories* manca quel
repository.
