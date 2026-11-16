<?php
// Recebe os dados enviados pelo agente.js e guarda o último em dados.json.
// Troque o token abaixo (tem que ser igual ao do agente.js).
$TOKEN = 'awzie41';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo '{"erro":"metodo"}';
  exit;
}

$token = $_SERVER['HTTP_X_TOKEN'] ?? '';
if (!hash_equals($TOKEN, $token)) {
  http_response_code(403);
  echo '{"erro":"token"}';
  exit;
}

$corpo = file_get_contents('php://input', false, null, 0, 200000);
$dados = json_decode($corpo, true);
if (!is_array($dados)) {
  http_response_code(400);
  echo '{"erro":"json"}';
  exit;
}

// horário de chegada, pelo relógio do servidor (em milissegundos)
$dados['recebidoEm'] = (int) round(microtime(true) * 1000);

$tmp = __DIR__ . '/dados.json.tmp';
file_put_contents($tmp, json_encode($dados, JSON_UNESCAPED_UNICODE), LOCK_EX);
rename($tmp, __DIR__ . '/dados.json');

echo '{"ok":true}';
