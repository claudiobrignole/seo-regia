<?php
// Copia questo file come config.php (stessa cartella) e cambia solo la parola
// fra gli apici. La chiave e la stessa CRON_CHIAVE delle variabili del pannello
// seo.brignole.ch.
//
// GLI APICI DEVONO RESTARE. Fanno parte del PHP, non sono decorazione: una
// chiave senza apici e un errore fatale, e la sveglia muore prima di chiamare
// il pannello, senza lasciare traccia in nessuna schermata.
//
// Giusto:     'chiave' => 'ABC123',
// Sbagliato:  'chiave' => ABC123,
return [
    'chiave' => 'INCOLLA_LA_CHIAVE',
];
