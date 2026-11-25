<?php
// c:\xampp2\htdocs\itpal\api\notes.php

header('Content-Type: application/json');
require_once 'db.php';

// Devolve os nomes dos ficheiros de uploads/ referenciados em <img src="..."> no HTML
function extract_upload_images($html) {
    preg_match_all('#<img[^>]+src=["\'](?:[^"\']*/)?uploads/([A-Za-z0-9_]+\.(?:png|jpg|gif|webp))["\']#i', $html, $m);
    return array_unique($m[1]);
}

// Apaga as imagens que já não são usadas por nenhuma outra nota
function delete_unused_images($pdo, $images) {
    $upload_dir = realpath(__DIR__ . '/../uploads');
    if (!$upload_dir) return;
    $check = $pdo->prepare("SELECT COUNT(*) FROM notes WHERE description LIKE :pattern");
    foreach ($images as $name) {
        $check->execute(['pattern' => '%uploads/' . $name . '%']);
        if ($check->fetchColumn() > 0) continue;
        $path = $upload_dir . DIRECTORY_SEPARATOR . basename($name);
        if (is_file($path)) @unlink($path);
    }
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // Read all notes
        try {
            $stmt = $pdo->query("SELECT * FROM notes ORDER BY updated_at DESC");
            $notes = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($notes);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to fetch notes: " . $e->getMessage()]);
        }
        break;

    case 'POST':
        // Create a new note
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['title']) || empty(trim($data['title']))) {
            http_response_code(400);
            echo json_encode(["error" => "Title is required"]);
            break;
        }

        $title = trim($data['title']);
        $tags = isset($data['tags']) ? trim($data['tags']) : '';
        $description = isset($data['description']) ? trim($data['description']) : '';
        $category_id = !empty($data['category_id']) ? intval($data['category_id']) : null;

        try {
            $stmt = $pdo->prepare("INSERT INTO notes (title, tags, description, category_id) VALUES (:title, :tags, :description, :category_id)");
            $stmt->execute(['title' => $title, 'tags' => $tags, 'description' => $description, 'category_id' => $category_id]);
            $new_id = $pdo->lastInsertId();
            
            // Return the created note
            $stmt = $pdo->prepare("SELECT * FROM notes WHERE id = :id");
            $stmt->execute(['id' => $new_id]);
            echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to create note: " . $e->getMessage()]);
        }
        break;

    case 'PUT':
        // Update an existing note
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['id']) || !isset($data['title']) || empty(trim($data['title']))) {
            http_response_code(400);
            echo json_encode(["error" => "ID and Title are required"]);
            break;
        }

        $id = intval($data['id']);
        $title = trim($data['title']);
        $tags = isset($data['tags']) ? trim($data['tags']) : '';
        $description = isset($data['description']) ? trim($data['description']) : '';
        $category_id = !empty($data['category_id']) ? intval($data['category_id']) : null;

        try {
            // Imagens que existiam antes da alteração
            $stmt = $pdo->prepare("SELECT description FROM notes WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $old_images = extract_upload_images((string) $stmt->fetchColumn());

            $stmt = $pdo->prepare("UPDATE notes SET title = :title, tags = :tags, description = :description, category_id = :category_id, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $stmt->execute(['title' => $title, 'tags' => $tags, 'description' => $description, 'category_id' => $category_id, 'id' => $id]);
            
            if ($stmt->rowCount() > 0) {
                // Apagar as imagens retiradas da nota (se nenhuma outra nota as usar)
                delete_unused_images($pdo, array_diff($old_images, extract_upload_images($description)));

                // Return updated note
                $stmt = $pdo->prepare("SELECT * FROM notes WHERE id = :id");
                $stmt->execute(['id' => $id]);
                echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Note not found or not changed"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to update note: " . $e->getMessage()]);
        }
        break;

    case 'DELETE':
        // Delete a note
        $data = json_decode(file_get_contents("php://input"), true);
        if (!isset($data['id'])) {
            http_response_code(400);
            echo json_encode(["error" => "ID is required"]);
            break;
        }

        $id = intval($data['id']);
        try {
            // Guardar as imagens da nota antes de a apagar
            $stmt = $pdo->prepare("SELECT description FROM notes WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $images = extract_upload_images((string) $stmt->fetchColumn());

            $stmt = $pdo->prepare("DELETE FROM notes WHERE id = :id");
            $stmt->execute(['id' => $id]);
            if ($stmt->rowCount() > 0) {
                delete_unused_images($pdo, $images);
                echo json_encode(["success" => true]);
            } else {
                http_response_code(404);
                echo json_encode(["error" => "Note not found"]);
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to delete note: " . $e->getMessage()]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
        break;
}
?>
