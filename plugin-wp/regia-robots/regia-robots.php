<?php
/**
 * Plugin Name: Regia robots
 * Description: Lascia scrivere al pannello seo.brignole.ch robots.txt e il titolo SEO delle pagine, senza toccare il codice del tema. Nessuno script Google.
 * Version: 1.1.0
 * Author: Claudio Brignole
 * Text Domain: regia-robots
 */

if (!defined('ABSPATH')) {
  exit;
}

function regia_robots_permesso() {
  return current_user_can('manage_options');
}

function regia_robots_file_fisico() {
  return ABSPATH . 'robots.txt';
}

add_action('rest_api_init', function () {
  register_rest_route('regia-seo/v1', '/robots', [
    'methods' => 'POST',
    'permission_callback' => 'regia_robots_permesso',
    'callback' => 'regia_robots_rest_scrivi',
  ]);
  // Titolo e descrizione SEO. Serve perche wp/v2 accetta soltanto i meta
  // registrati per la REST, e Rank Math non registra i suoi: la scrittura
  // risponde 200 e non cambia niente. Con questa rotta la risposta dice il
  // valore riletto dal database, quindi un ok e un ok davvero.
  register_rest_route('regia-seo/v1', '/meta', [
    [
      'methods' => 'GET',
      'permission_callback' => 'regia_robots_permesso',
      'callback' => 'regia_seo_rest_leggi_meta',
    ],
    [
      'methods' => 'POST',
      'permission_callback' => 'regia_robots_permesso',
      'callback' => 'regia_seo_rest_scrivi_meta',
    ],
  ]);
});

/** Quale plugin SEO comanda su questo sito, e con quali chiavi salva. */
function regia_seo_motore() {
  if (defined('RANK_MATH_VERSION') || class_exists('RankMath\Helper')) {
    return ['nome' => 'rank-math', 'titolo' => 'rank_math_title', 'descrizione' => 'rank_math_description'];
  }
  if (defined('WPSEO_VERSION')) {
    return ['nome' => 'yoast', 'titolo' => '_yoast_wpseo_title', 'descrizione' => '_yoast_wpseo_metadesc'];
  }
  return null;
}

/** Il contenuto esiste ed e modificabile da chi chiama? */
function regia_seo_contenuto(WP_REST_Request $richiesta) {
  $id = (int) $richiesta->get_param('id');
  if ($id <= 0) {
    return new WP_Error('id', 'Manca il numero della pagina o dell articolo.', ['status' => 400]);
  }
  if (!get_post($id)) {
    return new WP_Error('id', "Nessun contenuto con il numero $id su questo sito.", ['status' => 404]);
  }
  if (!current_user_can('edit_post', $id)) {
    return new WP_Error('permesso', "L utente del pannello non puo modificare il contenuto $id.", ['status' => 403]);
  }
  return $id;
}

function regia_seo_stato_meta($id, array $motore) {
  return [
    'ok' => true,
    'motore' => $motore['nome'],
    'id' => $id,
    'titolo' => (string) get_post_meta($id, $motore['titolo'], true),
    'descrizione' => (string) get_post_meta($id, $motore['descrizione'], true),
    // Il titolo del contenuto non e il titolo SEO: quando il secondo e vuoto,
    // il plugin SEO mostra il primo. Il pannello ha bisogno di distinguerli.
    'titolo_contenuto' => get_the_title($id),
  ];
}

function regia_seo_rest_leggi_meta(WP_REST_Request $richiesta) {
  $motore = regia_seo_motore();
  if (!$motore) {
    return new WP_Error('motore', 'Su questo sito non c e ne Rank Math ne Yoast: il titolo SEO non ha un posto dove stare.', ['status' => 501]);
  }
  $id = regia_seo_contenuto($richiesta);
  if (is_wp_error($id)) {
    return $id;
  }
  return regia_seo_stato_meta($id, $motore);
}

function regia_seo_rest_scrivi_meta(WP_REST_Request $richiesta) {
  $motore = regia_seo_motore();
  if (!$motore) {
    return new WP_Error('motore', 'Su questo sito non c e ne Rank Math ne Yoast: il titolo SEO non ha un posto dove stare.', ['status' => 501]);
  }
  $id = regia_seo_contenuto($richiesta);
  if (is_wp_error($id)) {
    return $id;
  }

  $scritti = [];
  foreach (['titolo', 'descrizione'] as $campo) {
    $valore = $richiesta->get_param($campo);
    if ($valore === null) {
      continue;
    }
    if (!is_string($valore)) {
      return new WP_Error($campo, "Il campo $campo deve essere testo.", ['status' => 400]);
    }
    $pulito = trim(wp_strip_all_tags($valore));
    $lunghezza = function_exists('mb_strlen') ? mb_strlen($pulito) : strlen($pulito);
    if ($lunghezza > 500) {
      return new WP_Error($campo, "Il campo $campo supera i 500 caratteri.", ['status' => 400]);
    }
    // wp_slash perche update_post_meta toglie una passata di barre: senza
    // questo un apostrofo in "L hip hop" tornerebbe storpiato.
    update_post_meta($id, $motore[$campo], wp_slash($pulito));
    $scritti[] = $campo;
  }

  if (!$scritti) {
    return new WP_Error('vuoto', 'Non hai passato ne titolo ne descrizione.', ['status' => 400]);
  }

  // Svuota la cache di quel contenuto: chi rilegge subito dopo (il pannello, e
  // il visitatore) deve vedere il valore nuovo, non quello in memoria.
  clean_post_cache($id);

  $stato = regia_seo_stato_meta($id, $motore);
  $stato['scritti'] = $scritti;
  return $stato;
}

function regia_robots_rest_scrivi(WP_REST_Request $richiesta) {
  $testo = $richiesta->get_param('testo');
  if (!is_string($testo) || trim($testo) === '') {
    return new WP_Error('testo', 'Manca il testo di robots.txt.', ['status' => 400]);
  }
  if (strlen($testo) > 50000) {
    return new WP_Error('testo', 'Testo di robots.txt troppo lungo.', ['status' => 400]);
  }

  $file = regia_robots_file_fisico();
  if (file_exists($file)) {
    return new WP_Error(
      'file_fisico',
      'Esiste un file robots.txt nella radice. Cancellalo dal File Manager, poi riprova: Rank Math e questo plugin non lo sovrascrivono.',
      ['status' => 409]
    );
  }

  $generali = get_option('rank-math-options-general');
  if (is_array($generali)) {
    $generali['robots_txt_content'] = $testo;
    update_option('rank-math-options-general', $generali);
    delete_option('regia_robots_txt');
    return ['ok' => true, 'dove' => 'rank-math'];
  }

  update_option('regia_robots_txt', $testo, false);
  return ['ok' => true, 'dove' => 'regia'];
}

/**
 * Se Rank Math non c e, WordPress usa questo filtro. Priorita alta:
 * vince sul testo di default, non su un file fisico (WordPress in quel caso
 * non chiama il filtro).
 */
add_filter('robots_txt', function ($uscita, $pubblico) {
  $nostro = get_option('regia_robots_txt');
  if (is_string($nostro) && trim($nostro) !== '') {
    return $nostro;
  }
  return $uscita;
}, 99, 2);
