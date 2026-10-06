<?php
// Сваляне на събраните имейли като CSV (отваря се в Excel).
// Употреба: https://logix.bg/api/leads.csv?key=ВАШИЯТ_КЛЮЧ

$EXPORT_KEY = 'lx-2519683873954c29fbdb08d7'; // сменете при нужда

if (($_GET['key'] ?? '') !== $EXPORT_KEY) {
  http_response_code(401);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['error' => 'unauthorized']);
  exit;
}

$file = __DIR__ . '/leads/leads.csv';
if (!file_exists($file)) {
  http_response_code(404);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode(['error' => 'Все още няма записани имейли.'], JSON_UNESCAPED_UNICODE);
  exit;
}

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="logix-leads.csv"');
readfile($file);
