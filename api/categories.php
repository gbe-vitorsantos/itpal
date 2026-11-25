<?php
// c:\xampp2\htdocs\itpal\api\categories.php
// CRUD de categorias: { id, name, color, is_frequent }

header('Content-Type: application/json');
require_once 'db.php';

function respond_error($code, $message) {
    http_response_code($code);
    echo json_encode(["error" => $message]);
    exit();
}

function clean_color($color) {
    return (is_string($color) && preg_match('/^#[0-9a-fA-F]{6}$/', $color)) ? strtolower($color) : '#6366f1';
}

function get_category($pdo, $id) {
    $stmt = $pdo->prepare("SELECT * FROM categories WHERE id = :id");
    $stmt->execute(['id' => $id]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"), true) ?: [];

try {
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("SELECT * FROM categories ORDER BY is_frequent DESC, name COLLATE NOCASE ASC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;

        case 'POST':
            $name = trim($data['name'] ?? '');
            if ($name === '') respond_error(400, "O nome é obrigatório");
            $stmt = $pdo->prepare("INSERT INTO categories (name, color, is_frequent) VALUES (:name, :color, :freq)");
            try {
                $stmt->execute([
                    'name' => $name,
                    'color' => clean_color($data['color'] ?? null),
                    'freq' => !empty($data['is_frequent']) ? 1 : 0,
                ]);
            } catch (PDOException $e) {
                respond_error(409, "Já existe uma categoria com esse nome");
            }
            echo json_encode(get_category($pdo, $pdo->lastInsertId()));
            break;

        case 'PUT':
            $id = intval($data['id'] ?? 0);
            $current = get_category($pdo, $id);
            if (!$current) respond_error(404, "Categoria não encontrada");

            $name = array_key_exists('name', $data) ? trim($data['name']) : $current['name'];
            if ($name === '') respond_error(400, "O nome é obrigatório");
            $color = array_key_exists('color', $data) ? clean_color($data['color']) : $current['color'];
            $freq = array_key_exists('is_frequent', $data) ? (!empty($data['is_frequent']) ? 1 : 0) : $current['is_frequent'];

            $stmt = $pdo->prepare("UPDATE categories SET name = :name, color = :color, is_frequent = :freq WHERE id = :id");
            try {
                $stmt->execute(['name' => $name, 'color' => $color, 'freq' => $freq, 'id' => $id]);
            } catch (PDOException $e) {
                respond_error(409, "Já existe uma categoria com esse nome");
            }
            echo json_encode(get_category($pdo, $id));
            break;

        case 'DELETE':
            $id = intval($data['id'] ?? 0);
            // As notas desta categoria ficam "sem categoria"
            $pdo->prepare("UPDATE notes SET category_id = NULL WHERE category_id = :id")->execute(['id' => $id]);
            $stmt = $pdo->prepare("DELETE FROM categories WHERE id = :id");
            $stmt->execute(['id' => $id]);
            if ($stmt->rowCount() === 0) respond_error(404, "Categoria não encontrada");
            echo json_encode(["success" => true]);
            break;

        default:
            respond_error(405, "Method not allowed");
    }
} catch (Exception $e) {
    respond_error(500, "Erro nas categorias: " . $e->getMessage());
}
