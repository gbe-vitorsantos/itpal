<?php
// c:\xampp2\htdocs\itpal\api\upload.php
// Recebe uma imagem (campo "image") e guarda-a em /uploads. Devolve { "url": "uploads/xxx.png" }

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit();
}

if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    $code = isset($_FILES['image']) ? $_FILES['image']['error'] : -1;
    http_response_code(400);
    echo json_encode(["error" => "Nenhuma imagem recebida (código $code)"]);
    exit();
}

$file = $_FILES['image'];
$max_size = 10 * 1024 * 1024; // 10 MB
if ($file['size'] > $max_size) {
    http_response_code(400);
    echo json_encode(["error" => "Imagem demasiado grande (máx. 10 MB)"]);
    exit();
}

// Validar o tipo real do ficheiro (não confiar no nome/extensão enviados)
$allowed = [
    'image/png'  => 'png',
    'image/jpeg' => 'jpg',
    'image/gif'  => 'gif',
    'image/webp' => 'webp',
];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
if (!isset($allowed[$mime]) || @getimagesize($file['tmp_name']) === false) {
    http_response_code(400);
    echo json_encode(["error" => "Formato não suportado (PNG, JPG, GIF ou WEBP)"]);
    exit();
}

$upload_dir = __DIR__ . '/../uploads';
if (!file_exists($upload_dir)) {
    mkdir($upload_dir, 0777, true);
}

$filename = date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '.' . $allowed[$mime];
if (!move_uploaded_file($file['tmp_name'], $upload_dir . '/' . $filename)) {
    http_response_code(500);
    echo json_encode(["error" => "Falha ao guardar a imagem"]);
    exit();
}

echo json_encode(["url" => "uploads/" . $filename]);
