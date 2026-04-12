<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->query("
        SELECT c.*, COUNT(p.id) as products_count 
        FROM categories c
        LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
        WHERE c.is_active = 1
        GROUP BY c.id
        ORDER BY c.sort_order
    ");
    $categories = $stmt->fetchAll();
    sendResponse($categories);
} else {
    sendError('Method not allowed', 405);
}
?>