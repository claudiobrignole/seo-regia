-- Schema del pannello di regia SEO.
-- MySQL 8, incluso nel piano Hostinger Business.
-- Si applica con: npm run db:migra

CREATE TABLE IF NOT EXISTS misure (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  sito_id       VARCHAR(64)  NOT NULL,
  fonte         VARCHAR(32)  NOT NULL,   -- search-console | search-console-ai | analytics | ecwid | merchant | ads | crux | citazioni-llm | copertura
  giorno        DATE         NOT NULL,
  chiave        VARCHAR(512) NOT NULL,   -- url della pagina, oppure la query, oppure lo sku
  tipo_chiave   VARCHAR(32)  NOT NULL,   -- pagina | query | pagina_query | prodotto | sito
  clic          INT          NOT NULL DEFAULT 0,
  impressioni   INT          NOT NULL DEFAULT 0,
  posizione     DECIMAL(6,2) NULL,
  valore        DECIMAL(12,2) NULL,      -- ricavo, quando la fonte e Ecwid
  extra         JSON         NULL,
  creato_il     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_misura (sito_id, fonte, giorno, tipo_chiave, chiave(191)),
  KEY idx_sito_giorno (sito_id, giorno),
  KEY idx_ricerca (sito_id, tipo_chiave, giorno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fotografia di ogni pagina, aggiornata dalla scansione notturna.
CREATE TABLE IF NOT EXISTS pagine (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  sito_id         VARCHAR(64)  NOT NULL,
  url             VARCHAR(768) NOT NULL,
  titolo          TEXT         NULL,
  descrizione     TEXT         NULL,
  h1              TEXT         NULL,
  lingua          VARCHAR(8)   NULL,
  parole          INT          NULL,
  ha_jsonld       TINYINT(1)   NOT NULL DEFAULT 0,
  ha_canonical    TINYINT(1)   NOT NULL DEFAULT 0,
  stato_http      SMALLINT     NULL,
  ms_risposta     INT          NULL,
  link_interni    INT          NOT NULL DEFAULT 0,
  link_entranti   INT          NOT NULL DEFAULT 0,   -- quanti link interni la raggiungono
  ultima_scansione TIMESTAMP   NULL,
  UNIQUE KEY uniq_pagina (sito_id, url(500)),
  KEY idx_sito (sito_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Ogni cosa che il sistema propone o applica.
CREATE TABLE IF NOT EXISTS azioni (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  sito_id       VARCHAR(64)  NOT NULL,
  regola        VARCHAR(64)  NOT NULL,
  bersaglio     VARCHAR(768) NOT NULL,   -- url o identificatore prodotto
  campo         VARCHAR(64)  NOT NULL,   -- titolo | descrizione | alt | jsonld | robots | sitemap | slug
  valore_vecchio TEXT        NULL,
  valore_nuovo  TEXT         NOT NULL,
  motivo        TEXT         NOT NULL,
  guadagno_stimato INT       NULL,       -- clic al mese che si stima di recuperare
  rischio       ENUM('sicura','da_approvare') NOT NULL,
  stato         ENUM('proposta','approvata','applicata','annullata','fallita','rifiutata')
                NOT NULL DEFAULT 'proposta',
  riferimento_esterno VARCHAR(255) NULL, -- numero della richiesta di modifica su GitHub
  errore        TEXT         NULL,
  creata_il     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  applicata_il  TIMESTAMP    NULL,
  KEY idx_stato (stato, sito_id),
  KEY idx_bersaglio (sito_id, bersaglio(500))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Il registro: senza questo l automazione non si accende.
CREATE TABLE IF NOT EXISTS registro (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  azione_id     BIGINT       NULL,
  sito_id       VARCHAR(64)  NOT NULL,
  evento        VARCHAR(64)  NOT NULL,  -- applicata | annullata | verificata | errore
  dettaglio     JSON         NULL,
  quando        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_azione (azione_id),
  KEY idx_sito_quando (sito_id, quando)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Effetto misurato a due settimane da ogni modifica applicata.
CREATE TABLE IF NOT EXISTS verifiche (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  azione_id     BIGINT       NOT NULL,
  giorni        SMALLINT     NOT NULL,
  clic_prima    INT          NULL,
  clic_dopo     INT          NULL,
  ctr_prima     DECIMAL(6,3) NULL,
  ctr_dopo      DECIMAL(6,3) NULL,
  esito         ENUM('migliorata','invariata','peggiorata','dati_insufficienti') NULL,
  quando        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_azione (azione_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Conformita Ad Grants: allarme prima che lo noti Google.
CREATE TABLE IF NOT EXISTS adgrants_stato (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  mese          CHAR(7)      NOT NULL,   -- 2026-09
  ctr           DECIMAL(6,3) NULL,
  conversioni   INT          NOT NULL DEFAULT 0,
  conforme      TINYINT(1)   NOT NULL DEFAULT 1,
  avvisi        JSON         NULL,
  aggiornato_il TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_mese (mese)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Esecuzioni dei lavori notturni: per capire se qualcosa non gira piu.
CREATE TABLE IF NOT EXISTS esecuzioni (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  lavoro        VARCHAR(32)  NOT NULL,
  iniziata_il   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finita_il     TIMESTAMP    NULL,
  esito         ENUM('ok','parziale','errore') NULL,
  righe         INT          NULL,
  messaggio     TEXT         NULL,
  KEY idx_lavoro (lavoro, iniziata_il)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coda della scansione: un sito non sta in tre minuti, si riprende la notte dopo.
CREATE TABLE IF NOT EXISTS scansione_coda (
  sito_id   VARCHAR(64)  NOT NULL,
  url       VARCHAR(768) NOT NULL,
  priorita  INT          NOT NULL DEFAULT 0,
  stato     ENUM('in_coda','fatta') NOT NULL DEFAULT 'in_coda',
  PRIMARY KEY (sito_id, url(500)),
  KEY idx_coda (sito_id, stato, priorita)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Campagne Google Ads. identita e obbligatoria: Brignole e Grants non si sommano.
CREATE TABLE IF NOT EXISTS campagne (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  identita            ENUM('brignole','biography-library') NOT NULL,
  sito_id             VARCHAR(64)  NULL,
  google_id           VARCHAR(32)  NOT NULL,
  nome                VARCHAR(255) NOT NULL,
  stato               VARCHAR(32)  NULL,
  budget_giornaliero  DECIMAL(12,2) NULL,
  UNIQUE KEY uniq_camp (identita, google_id),
  KEY idx_identita (identita)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS campagne_giorni (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  identita            ENUM('brignole','biography-library') NOT NULL,
  campagna_google_id  VARCHAR(32)  NOT NULL,
  giorno              DATE         NOT NULL,
  impressioni         INT          NOT NULL DEFAULT 0,
  clic                INT          NOT NULL DEFAULT 0,
  costo               DECIMAL(12,2) NOT NULL DEFAULT 0,
  conversioni         DECIMAL(12,2) NOT NULL DEFAULT 0,
  ctr                 DECIMAL(8,5) NULL,
  cpc                 DECIMAL(12,4) NULL,
  UNIQUE KEY uniq_cg (identita, campagna_google_id, giorno),
  KEY idx_identita_giorno (identita, giorno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS campagne_parole (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  identita            ENUM('brignole','biography-library') NOT NULL,
  campagna_google_id  VARCHAR(32)  NOT NULL,
  parola              VARCHAR(512) NOT NULL,
  giorno              DATE         NOT NULL,
  impressioni         INT          NOT NULL DEFAULT 0,
  clic                INT          NOT NULL DEFAULT 0,
  costo               DECIMAL(12,2) NOT NULL DEFAULT 0,
  conversioni         DECIMAL(12,2) NOT NULL DEFAULT 0,
  UNIQUE KEY uniq_cp (identita, campagna_google_id, parola(191), giorno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS campagne_bozze (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  identita            ENUM('brignole','biography-library') NOT NULL,
  sito_id             VARCHAR(64)  NOT NULL,
  titolo              VARCHAR(255) NOT NULL,
  contenuto           JSON         NOT NULL,
  campagna_google_id  VARCHAR(32)  NULL,
  stato               ENUM('bozza','collegata','scartata') NOT NULL DEFAULT 'bozza',
  creata_il           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_banco (identita, sito_id, stato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS campagne_verdetti (
  id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
  identita            ENUM('brignole','biography-library') NOT NULL,
  campagna_google_id  VARCHAR(32)  NOT NULL,
  giorni              SMALLINT     NOT NULL,
  consiglio           ENUM('continua','ottimizza','pausa','cancella') NOT NULL,
  pro                 TEXT         NOT NULL,
  contro              TEXT         NOT NULL,
  motivo              TEXT         NOT NULL,
  quando              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_cv (identita, campagna_google_id, quando)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Conversioni Grants caricate dai moduli del sito, senza pixel.
CREATE TABLE IF NOT EXISTS grants_conversioni (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  wp_id         BIGINT       NULL,
  gclid         VARCHAR(255) NULL,
  quando        DATETIME     NOT NULL,
  tipo_modulo   VARCHAR(128) NULL,
  stato         ENUM('da_caricare','caricata','errore','senza_gclid') NOT NULL,
  messaggio     TEXT         NULL,
  tentativi     INT          NOT NULL DEFAULT 0,
  caricata_il   TIMESTAMP    NULL,
  UNIQUE KEY uniq_wp (wp_id),
  KEY idx_stato (stato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS grants_impostazioni (
  chiave        VARCHAR(64)  NOT NULL,
  valore        VARCHAR(255) NOT NULL,
  PRIMARY KEY (chiave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fotografia di robots.txt e sitemap (quale URL e davvero XML).
CREATE TABLE IF NOT EXISTS tecnici (
  sito_id        VARCHAR(64)  NOT NULL,
  tipo           ENUM('robots','sitemap') NOT NULL,
  url            VARCHAR(768) NOT NULL,
  stato_http     SMALLINT     NULL,
  content_type   VARCHAR(128) NULL,
  e_xml          TINYINT(1)   NOT NULL DEFAULT 0,
  corpo          MEDIUMTEXT   NULL,
  extra          JSON         NULL,
  aggiornato_il  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sito_id, tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Controllo quotidiano dell impianto: permessi Google, WordPress, GitHub, Ads.
CREATE TABLE IF NOT EXISTS impianto_passate (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  iniziata_il   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finita_il     TIMESTAMP NULL,
  n_ok          INT NOT NULL DEFAULT 0,
  n_fallito     INT NOT NULL DEFAULT 0,
  n_atteso      INT NOT NULL DEFAULT 0,
  KEY idx_quando (iniziata_il)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS impianto_esiti (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  passata_id    BIGINT NOT NULL,
  codice        VARCHAR(16) NOT NULL,
  titolo        VARCHAR(255) NOT NULL,
  esito         ENUM('ok','fallito','atteso') NOT NULL,
  dettaglio     TEXT NOT NULL,
  cosa_fare     TEXT NULL,
  KEY idx_passata (passata_id),
  KEY idx_esito (esito)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Chat interna. Una conversazione per oggetto: si riapre la scheda e si ritrova
-- quello che ci si era detti, altrimenti ogni domanda ricomincia da zero.
CREATE TABLE IF NOT EXISTS conversazioni (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  ambito        ENUM('azione','campagna','bozza') NOT NULL,
  riferimento   VARCHAR(64)  NOT NULL,  -- id azione, identita:id campagna, id bozza
  sito_id       VARCHAR(64)  NULL,
  identita      ENUM('brignole','biography-library') NULL,
  aperta_il     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_il     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_conv (ambito, riferimento),
  KEY idx_sito (sito_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- mosse: le modifiche che Claude propone, in attesa del pulsante di Claudio.
-- Nessuna parte da sola, e ognuna resta scritta anche dopo che e stata fatta.
CREATE TABLE IF NOT EXISTS messaggi (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  conversazione_id BIGINT     NOT NULL,
  ruolo            ENUM('claudio','claude') NOT NULL,
  testo            MEDIUMTEXT NOT NULL,
  mosse            JSON       NULL,
  quando           TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_conv (conversazione_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- La memoria: le indicazioni e le decisioni di Claudio. Le righe attive entrano
-- nelle istruzioni di ogni testo che Claude scrive dopo, altrimenti sarebbe un
-- diario e la stessa correzione andrebbe ripetuta ogni notte.
CREATE TABLE IF NOT EXISTS memoria (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  ambito        ENUM('tutti','sito','pagina') NOT NULL DEFAULT 'tutti',
  sito_id       VARCHAR(64)  NULL,
  bersaglio     VARCHAR(768) NULL,
  testo         TEXT         NOT NULL,
  origine       ENUM('chat','mano') NOT NULL DEFAULT 'chat',
  messaggio_id  BIGINT       NULL,
  stato         ENUM('attiva','archiviata') NOT NULL DEFAULT 'attiva',
  quando        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archiviata_il TIMESTAMP    NULL,
  KEY idx_attiva (stato, ambito),
  KEY idx_sito (sito_id, stato)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Se il database esiste gia, allarga il tipo chiave: CREATE TABLE IF NOT EXISTS non lo fa.
ALTER TABLE misure MODIFY tipo_chiave VARCHAR(32) NOT NULL;

-- Segnali locali che toglgono una pagina dall indice: la scansione li leggeva
-- a meta. CREATE TABLE IF NOT EXISTS non aggiorna le tabelle esistenti.
ALTER TABLE pagine ADD COLUMN meta_robots      VARCHAR(255) NULL;
ALTER TABLE pagine ADD COLUMN canonical_url    VARCHAR(768) NULL;
ALTER TABLE pagine ADD COLUMN x_robots_tag     VARCHAR(255) NULL;
ALTER TABLE pagine ADD COLUMN stato_http_primo SMALLINT     NULL;
ALTER TABLE pagine ADD COLUMN catena_redirect  JSON         NULL;

-- Stato di indicizzazione da URL Inspection: una riga per indirizzo.
CREATE TABLE IF NOT EXISTS indicizzazione (
  sito_id            VARCHAR(64)  NOT NULL,
  url                VARCHAR(768) NOT NULL,
  verdetto           VARCHAR(32)  NULL,
  copertura          VARCHAR(255) NULL,
  robots_google      VARCHAR(64)  NULL,
  indicizzabile      VARCHAR(64)  NULL,
  canonical_utente   VARCHAR(768) NULL,
  canonical_google   VARCHAR(768) NULL,
  ultima_scansione_google DATETIME NULL,
  sitemap_referente  VARCHAR(768) NULL,
  esito_chiamata     ENUM('ok','errore','quota') NOT NULL DEFAULT 'ok',
  messaggio          TEXT         NULL,
  aggiornato_il      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sito_id, url(500)),
  KEY idx_sito_verdetto (sito_id, verdetto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sitemap come le vede Google, distinta da tecnici (fotografia scaricata).
CREATE TABLE IF NOT EXISTS sitemap_stato (
  sito_id       VARCHAR(64)  NOT NULL,
  url           VARCHAR(768) NOT NULL,
  ultima_lettura DATETIME    NULL,
  inviati       INT          NULL,
  errori        INT          NOT NULL DEFAULT 0,
  avvisi        INT          NOT NULL DEFAULT 0,
  in_sospeso    TINYINT(1)   NOT NULL DEFAULT 0,
  aggiornato_il TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (sito_id, url(500))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Coda dell ispezione, gemella di scansione_coda: non si mescolano.
CREATE TABLE IF NOT EXISTS indicizzazione_coda (
  sito_id   VARCHAR(64)  NOT NULL,
  url       VARCHAR(768) NOT NULL,
  priorita  INT          NOT NULL DEFAULT 0,
  stato     ENUM('in_coda','fatta') NOT NULL DEFAULT 'in_coda',
  PRIMARY KEY (sito_id, url(500)),
  KEY idx_coda (sito_id, stato, priorita)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
