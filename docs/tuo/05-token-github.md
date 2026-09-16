# 5. Restringere i due token GitHub

**Tempo: 6 minuti.** Nessuna urgenza operativa: oggi tutto funziona. E l unico
punto dove le due identita si toccano, e vale la pena chiuderlo.

## Cosa ho trovato

In Hostinger ci sono due token diversi, `GITHUB_TOKEN` e `GITHUB_TOKEN_BL`, e
questo e giusto. Ho provato cosa vede ciascuno, e vedono entrambi tutto:

- il token dell associazione apre `claudiobrignole/TagTales`
- il token tuo apre `biographylibrary/Biography-Library`

Sono token a grana fine creati senza restringere l elenco dei repository, quindi
ereditano tutto quello a cui tu hai accesso come persona. Non e un errore che
rompe qualcosa: e che se un giorno il pannello sbaglia una richiesta di modifica
sul perimetro dell associazione, quella richiesta puo finire su un repository
tuo, e viceversa. La regola del progetto e che i due perimetri non si mescolano
mai, e questo e il solo posto dove si mescolano.

## I passi

Si fanno due volte la stessa cosa, cambiando solo l elenco dei repository.

### Token Brignole

1. Con la **tua Gmail**, apri
   [github.com/settings/personal-access-tokens](https://github.com/settings/personal-access-tokens).
2. Premi **Generate new token** (a grana fine, non il classico).
3. Nome: `regia-seo-brignole`. Scadenza: quella che preferisci, anche un anno.
4. **Resource owner**: il tuo account `claudiobrignole`.
5. **Repository access**: scegli **Only select repositories** e aggiungi soltanto:
   - `claudiobrignole/TagTales`
   - `claudiobrignole/kizunama`
   - `claudiobrignole/strangeglyph`
   - `claudiobrignole/luna-nihongo`
6. **Permissions**, sezione Repository: metti **Contents** su *Read and write* e
   **Pull requests** su *Read and write*. Nient altro.
7. Genera, copia il token (si vede una volta sola).
8. hPanel, applicazione Node `seo.brignole.ch`, variabili d ambiente: sostituisci
   il valore di **`GITHUB_TOKEN`**. Non toccare l altro.

### Token Biography Library

1. Sempre da GitHub, **Generate new token** di nuovo.
2. Nome: `regia-seo-biography-library`.
3. **Resource owner**: l organizzazione **biographylibrary** (non il tuo
   account). Se l organizzazione chiede l approvazione di un proprietario e il
   proprietario sei tu, la approvi tu stesso.
4. **Repository access**: **Only select repositories**, e solo
   `biographylibrary/Biography-Library`.
5. **Permissions**: **Contents** e **Pull requests** su *Read and write*.
6. Genera, copia.
7. hPanel: sostituisci il valore di **`GITHUB_TOKEN_BL`**.
8. Salva e **riavvia** l applicazione Node.

## Come sai che e andata

1. Pannello, voce **Impianto**, pulsante **Controlla adesso**.
2. Devono essere verdi tre righe:
   - **GitHub TagTales**
   - **GitHub Biography Library**
   - **Token GitHub ognuno nel suo perimetro**, con la scritta *ogni token vede
     solo i propri repository*
3. Se una delle prime due diventa rossa con un numero 404, nell elenco *Only
   select repositories* manca quel repository: torna nel token e aggiungilo.

## Se non la fai

Niente si rompe. La riga **Token GitHub ognuno nel suo perimetro** resta rossa
nella pagina Impianto e la home continua a dirti che ci sono controlli falliti.
Se decidi di lasciare le cose come stanno, dimmelo e la trasformo in una nota
invece che in un errore, cosi non ti chiama piu.
