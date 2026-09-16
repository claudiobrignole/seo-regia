<?php
/**
 * Chiama il pannello seo.brignole.ch dalla sveglia PHP di Hostinger.
 * Non aprire questi file nel browser: la chiave sta in config.php.
 */
declare(strict_types=1);

// Il blocco vale per il web, non per la sveglia: alcuni hosting eseguono i
// lavori pianificati con cgi-fcgi invece di cli, e in quel caso un controllo
// su PHP_SAPI fermerebbe anche la sveglia. Dal web arriva sempre un metodo HTTP.
if (!empty($_SERVER['REQUEST_METHOD']) || !empty($_SERVER['HTTP_HOST'])) {
    http_response_code(403);
    echo 'Solo la sveglia Hostinger, non il browser.';
    exit(1);
}

function svegliaRegia(string $percorso): void
{
    $configFile = __DIR__ . '/config.php';
    if (!is_readable($configFile)) {
        fwrite(STDERR, "Manca config.php. Copia config.example.php, rinominalo config.php, incolla CRON_CHIAVE.\n");
        exit(1);
    }
    // La chiave senza apici e PHP sbagliato: su PHP 8 e un errore fatale e la
    // sveglia muore qui, senza lasciare traccia da nessuna parte. Succede
    // davvero, perche nelle variabili del pannello la chiave va messa senza
    // virgolette e viene naturale fare lo stesso qui. Meglio dirlo.
    try {
        $config = require $configFile;
    } catch (Throwable $e) {
        fwrite(
            STDERR,
            "config.php non e PHP valido: " . $e->getMessage() . "\n"
            . "La riga della chiave deve essere esattamente cosi, apici compresi:\n"
            . "    'chiave' => 'LA_TUA_CRON_CHIAVE',\n"
            . "Gli apici fanno parte del PHP. Nelle variabili di Hostinger non ci vanno, qui si.\n"
        );
        exit(1);
    }
    if (!is_array($config)) {
        fwrite(STDERR, "config.php deve finire con: return ['chiave' => 'LA_TUA_CRON_CHIAVE'];\n");
        exit(1);
    }
    $chiave = trim((string) ($config['chiave'] ?? ''));
    if ($chiave === '' || $chiave === 'INCOLLA_LA_CHIAVE') {
        fwrite(STDERR, "In config.php metti fra gli apici la stessa CRON_CHIAVE delle variabili del pannello.\n");
        exit(1);
    }

    $sep = str_contains($percorso, '?') ? '&' : '?';
    $url = 'https://seo.brignole.ch' . $percorso . $sep . 'chiave=' . rawurlencode($chiave);

    if (!function_exists('curl_init')) {
        fwrite(STDERR, "Su questo hosting manca l estensione curl di PHP. Scrivi a Hostinger e chiedi di accenderla.\n");
        exit(1);
    }

    $c = curl_init($url);
    curl_setopt_array($c, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT => 180,
        CURLOPT_USERAGENT => 'RegiaSveglia/1',
    ]);
    $corpo = curl_exec($c);
    $codice = (int) curl_getinfo($c, CURLINFO_HTTP_CODE);
    $errore = curl_error($c);
    curl_close($c);

    if ($corpo === false) {
        fwrite(STDERR, $errore !== '' ? $errore : 'chiamata al pannello fallita');
        echo "\n";
        exit(1);
    }

    // La riga di intestazione serve a View Output di Hostinger: senza data e
    // codice non si capisce se la sveglia ha chiamato o se e vecchia.
    echo '[', gmdate('Y-m-d H:i:s'), ' UTC] ', $percorso, ' HTTP ', $codice, "\n";
    echo $corpo, "\n";
    if ($codice >= 400) {
        exit(1);
    }
}
