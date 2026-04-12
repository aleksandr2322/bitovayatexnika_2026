<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // GET /api/products - список товаров
    // GET /api/products/1 - конкретный товар
    // GET /api/products?category=1&search=холодильник&limit=8
    
    if ($id) {
        // Получить один товар
        $stmt = $pdo->prepare("
            SELECT p.*, c.name as category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE p.id = ? AND p.is_active = 1
        ");
        $stmt->execute([$id]);
        $product = $stmt->fetch();
        
        if (!$product) {
            sendError('Товар не найден', 404);
        }
        
        // Получаем характеристики товара
        $stmt = $pdo->prepare("SELECT attribute_name, attribute_value FROM product_attributes WHERE product_id = ? ORDER BY sort_order");
        $stmt->execute([$id]);
        $product['attributes'] = $stmt->fetchAll();
        
        sendResponse($product);
    } else {
        // Список товаров с фильтрацией
        $category_id = $_GET['category'] ?? null;
        $search = $_GET['search'] ?? '';
        $limit = min($_GET['limit'] ?? 20, 50);
        $offset = $_GET['offset'] ?? 0;
        
        $sql = "SELECT p.*, c.name as category_name 
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.is_active = 1";
        $params = [];
        
        if ($category_id) {
            $sql .= " AND p.category_id = ?";
            $params[] = $category_id;
        }
        
        if ($search) {
            $sql .= " AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)";
            $params[] = "%$search%";
            $params[] = "%$search%";
            $params[] = "%$search%";
        }
        
        $sql .= " ORDER BY p.created_at DESC LIMIT ? OFFSET ?";
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $products = $stmt->fetchAll();
        
        // Получаем общее количество для пагинации
        $countSql = str_replace("SELECT p.*, c.name as category_name", "SELECT COUNT(*) as total", $sql);
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute(array_slice($params, 0, -2));
        $total = $countStmt->fetch()['total'];
        
        sendResponse([
            'products' => $products,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset
        ]);
    }
} else {
    sendError('Method not allowed', 405);
}
?>