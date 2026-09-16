<?php
/**
 * Chiama il pannello seo.brignole.ch dalla sveglia PHP di Hostinger.
 * Non aprire questi file nel browser: la chiave sta in config.php.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
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
    $config = require $configFile;
    $chiave = trim((string) ($config['chiave'] ?? ''));
    if ($chiave === '' || $chiave === 'INCOLLA_LA_CHIAVE') {
        fwrite(STDERR, "In config.php incolla la stessa CRON_CHIAVE delle variabili del pannello, senza virgolette.\n");
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

    echo $corpo, "\n";
    if ($codice >= 400) {
        exit(1);
    }
}
