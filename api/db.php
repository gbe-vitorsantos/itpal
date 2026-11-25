<?php
// c:\xampp2\htdocs\itpal\api\db.php

// Define o caminho para a base de dados
$db_file = __DIR__ . '/../data/notes.sqlite';

// Garante que a diretoria da bd existe
$db_dir = dirname($db_file);
if (!file_exists($db_dir)) {
    mkdir($db_dir, 0777, true);
}

try {
    // Cria (ou abre) a base de dados SQLite
    $pdo = new PDO("sqlite:" . $db_file);
    // Configura o PDO para lançar exceções em caso de erro
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Cria a tabela de notas se não existir
    $create_table_query = "
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            tags TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ";
    
    $pdo->exec($create_table_query);

    // Categorias (uma por nota). "is_frequent" destaca a categoria nos filtros e no editor.
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE COLLATE NOCASE,
            color TEXT NOT NULL DEFAULT '#6366f1',
            is_frequent INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ");

    // Migração: coluna category_id nas notas
    $columns = $pdo->query("PRAGMA table_info(notes)")->fetchAll(PDO::FETCH_COLUMN, 1);
    if (!in_array('category_id', $columns)) {
        $pdo->exec("ALTER TABLE notes ADD COLUMN category_id INTEGER NULL REFERENCES categories(id) ON DELETE SET NULL");
    }

} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    echo json_encode(["error" => "Erro na base de dados: " . $e->getMessage()]);
    exit();
}
?>
