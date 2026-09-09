<?php
/**
 * Plugin Name: Regia BL Grants
 * Description: Tiene il clic Grants (gclid) e registra i moduli di contatto. Nessuno script Google. Per Biography Library.
 * Version: 1.0.0
 * Author: Claudio Brignole
 * Text Domain: regia-bl-grants
 */

if (!defined('ABSPATH')) {
  exit;
}

define('REGIA_BL_COOKIE', 'bl_gclid');
define('REGIA_BL_COOKIE_GIORNI', 90);

function regia_bl_tabella() {
  global $wpdb;
  return $wpdb->prefix . 'regia_bl_conversioni';
}

function regia_bl_pulisci_gclid($grezzo) {
  $gclid = is_string($grezzo) ? trim($grezzo) : '';
  if ($gclid === '' || strlen($gclid) > 255) {
    return '';
  }
  if (!preg_match('/^[A-Za-z0-9_.\-]+$/', $gclid)) {
    return '';
  }
  return $gclid;
}

function regia_bl_gclid_attuale() {
  if (!empty($_GET['gclid'])) {
    $da_url = regia_bl_pulisci_gclid(wp_unslash($_GET['gclid']));
    if ($da_url !== '') {
      return $da_url;
    }
  }
  if (!empty($_COOKIE[REGIA_BL_COOKIE])) {
    return regia_bl_pulisci_gclid(wp_unslash($_COOKIE[REGIA_BL_COOKIE]));
  }
  return '';
}

function regia_bl_salva_cookie() {
  $gclid = '';
  if (!empty($_GET['gclid'])) {
    $gclid = regia_bl_pulisci_gclid(wp_unslash($_GET['gclid']));
  }
  if ($gclid === '') {
    return;
  }
  $scade = time() + REGIA_BL_COOKIE_GIORNI * DAY_IN_SECONDS;
  $sicuro = is_ssl();
  setcookie(REGIA_BL_COOKIE, $gclid, [
    'expires' => $scade,
    'path' => '/',
    'secure' => $sicuro,
    'httponly' => true,
    'samesite' => 'Lax',
  ]);
  $_COOKIE[REGIA_BL_COOKIE] = $gclid;
}

add_action('init', 'regia_bl_salva_cookie');

function regia_bl_installa() {
  global $wpdb;
  $tabella = regia_bl_tabella();
  $charset = $wpdb->get_charset_collate();
  require_once ABSPATH . 'wp-admin/includes/upgrade.php';
  dbDelta("CREATE TABLE {$tabella} (
    id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
    gclid varchar(255) DEFAULT NULL,
    quando datetime NOT NULL,
    tipo_modulo varchar(128) NOT NULL DEFAULT '',
    stato varchar(20) NOT NULL DEFAULT 'nuova',
    PRIMARY KEY  (id),
    KEY stato (stato)
  ) {$charset};");
}

register_activation_hook(__FILE__, 'regia_bl_installa');

/**
 * Da chiamare da un tema o da un altro plugin: regia_bl_registra('nome-modulo').
 */
function regia_bl_registra($tipo_modulo) {
  global $wpdb;
  $gclid = regia_bl_gclid_attuale();
  $wpdb->insert(
    regia_bl_tabella(),
    [
      'gclid' => $gclid !== '' ? $gclid : null,
      'quando' => current_time('mysql'),
      'tipo_modulo' => sanitize_text_field((string) $tipo_modulo),
      'stato' => 'nuova',
    ],
    ['%s', '%s', '%s', '%s']
  );
}

add_action('wpcf7_mail_sent', function ($form) {
  $titolo = method_exists($form, 'title') ? $form->title() : 'contact-form-7';
  regia_bl_registra('cf7:' . $titolo);
});

add_action('wpforms_process_complete', function ($campi, $entry, $form_dati) {
  $titolo = $form_dati['settings']['form_title'] ?? 'wpforms';
  regia_bl_registra('wpforms:' . $titolo);
}, 10, 3);

add_action('gform_after_submission', function ($entry, $form) {
  $titolo = $form['title'] ?? 'gravity';
  regia_bl_registra('gravity:' . $titolo);
}, 10, 2);

add_action('ninja_forms_after_submission', function ($form) {
  $titolo = $form['settings']['title'] ?? 'ninja';
  regia_bl_registra('ninja:' . $titolo);
});

add_action('elementor_pro/forms/new_record', function ($record) {
  $nome = 'elementor';
  if (is_object($record) && method_exists($record, 'get_form_settings')) {
    $nome = $record->get_form_settings('form_name') ?: $nome;
  }
  regia_bl_registra('elementor:' . $nome);
});

function regia_bl_puo_leggere() {
  return current_user_can('edit_posts') || current_user_can('manage_options');
}

add_action('rest_api_init', function () {
  register_rest_route('regia-bl/v1', '/conversioni', [
    'methods' => 'GET',
    'permission_callback' => 'regia_bl_puo_leggere',
    'callback' => function () {
      global $wpdb;
      $tabella = regia_bl_tabella();
      $righe = $wpdb->get_results(
        "SELECT id, gclid, quando, tipo_modulo FROM {$tabella} WHERE stato = 'nuova' ORDER BY id ASC LIMIT 100",
        ARRAY_A
      );
      $out = [];
      foreach ($righe as $r) {
        $quando = $r['quando'];
        $ts = strtotime($quando);
        $out[] = [
          'id' => (int) $r['id'],
          'gclid' => $r['gclid'],
          'quando' => $ts ? gmdate('c', $ts) : $quando,
          'tipo_modulo' => $r['tipo_modulo'],
        ];
      }
      return ['conversioni' => $out];
    },
  ]);

  register_rest_route('regia-bl/v1', '/conversioni/presa', [
    'methods' => 'POST',
    'permission_callback' => 'regia_bl_puo_leggere',
    'callback' => function ($req) {
      global $wpdb;
      $ids = $req->get_param('ids');
      if (!is_array($ids)) {
        return new WP_Error('ids', 'Manca l elenco ids.', ['status' => 400]);
      }
      $puliti = array_values(array_filter(array_map('intval', $ids)));
      if (!$puliti) {
        return ['ok' => true, 'n' => 0];
      }
      $tabella = regia_bl_tabella();
      $n = $wpdb->query(
        $wpdb->prepare(
          "UPDATE {$tabella} SET stato = 'presa' WHERE stato = 'nuova' AND id IN (" . implode(',', array_fill(0, count($puliti), '%d')) . ')',
          ...$puliti
        )
      );
      return ['ok' => true, 'n' => (int) $n];
    },
  ]);
});
