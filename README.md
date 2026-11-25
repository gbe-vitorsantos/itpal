# IT PAL — Notas

Pequena aplicação web para guardar notas e procedimentos de IT, com pesquisa, tags e categorias.

## Funcionalidades

- Editor WYSIWYG (Quill) com títulos, listas, cores, ligações, código e imagens (botão, colar ou arrastar)
- Visualização igual à edição; conteúdo sanitizado com DOMPurify
- Pesquisa por texto, filtro por tags e por categorias
- Categorias com cor; as **frequentes** (★) aparecem em destaque nos filtros e no editor
- Tema claro/escuro
- Imagens removidas de uma nota (ou de uma nota apagada) são apagadas do servidor

## Requisitos

- PHP 8+ com `pdo_sqlite` e `fileinfo` (ex.: XAMPP)
- Apache (o `.htaccess` em `uploads/` impede a execução de scripts)

## Instalação

1. Copiar a pasta para o `htdocs` (ex.: `C:\xampp\htdocs\itpal`).
2. Abrir `http://localhost/itpal/`.

A base de dados SQLite (`data/notes.sqlite`) e a pasta `uploads/` são criadas automaticamente e não fazem parte do repositório.

## Estrutura

```
api/db.php          ligação SQLite + criação/migração das tabelas
api/notes.php       CRUD de notas
api/categories.php  CRUD de categorias
api/upload.php      upload de imagens
js/app.js           interface
css/style.css       estilos
```
