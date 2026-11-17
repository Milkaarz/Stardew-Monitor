<?php
// Contador de visitas do site. A página chama este arquivo:
//   POST = conta uma visita (uma por sessão do navegador)
//   GET  = só devolve o número atual
// O número fica no arquivo visitas.txt, criado sozinho nesta pasta.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$arquivo = __DIR__ . '/visitas.txt';
$fp = fopen($arquivo, 'c+');
if (!$fp) { http_response_code(500); echo '{"erro":"arquivo"}'; exit; }

flock($fp, LOCK_EX);
$n = (int) trim(stream_get_contents($fp));
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $n++;
  ftruncate($fp, 0);
  rewind($fp);
  fwrite($fp, (string) $n);
}
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['visitas' => $n]);
