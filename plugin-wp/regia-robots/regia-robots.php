<?php
/**
 * Plugin Name: Regia robots
 * Description: Lascia scrivere robots.txt al pannello seo.brignole.ch, senza toccare il codice del tema. Nessuno script Google.
 * Version: 1.0.0
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
});

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
