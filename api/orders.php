<?php
require_once 'config.php';

$user = getUserByToken($pdo);
if (!$user) {
    sendError('Необходима авторизация', 401);
}

$userId = $user['id'];

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Получить заказы пользователя
    $stmt = $pdo->prepare("
        SELECT * FROM orders 
        WHERE user_id = ? 
        ORDER BY created_at DESC
    ");
    $stmt->execute([$userId]);
    $orders = $stmt->fetchAll();
    
    // Получаем товары для каждого заказа
    foreach ($orders as &$order) {
        $stmt = $pdo->prepare("
            SELECT product_name, product_price, quantity, total 
            FROM order_items 
            WHERE order_id = ?
        ");
        $stmt->execute([$order['id']]);
        $order['items'] = $stmt->fetchAll();
    }
    
    sendResponse($orders);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Создать заказ
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Получаем корзину
    $stmt = $pdo->prepare("
        SELECT c.*, p.name, p.price 
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    ");
    $stmt->execute([$userId]);
    $cartItems = $stmt->fetchAll();
    
    if (empty($cartItems)) {
        sendError('Корзина пуста');
    }
    
    $total = 0;
    foreach ($cartItems as $item) {
        $total += $item['quantity'] * $item['price'];
    }
    
    // Генерируем номер заказа
    $orderNumber = 'ORD-' . date('Ymd') . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
    
    // Создаем заказ
    $stmt = $pdo->prepare("
        INSERT INTO orders (order_number, user_id, total_amount, payment_method, shipping_address, shipping_phone, shipping_name, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    $stmt->execute([
        $orderNumber,
        $userId,
        $total,
        $data['payment_method'] ?? 'Картой онлайн',
        $data['shipping_address'] ?? $user['address'] ?? '',
        $data['shipping_phone'] ?? $user['phone'] ?? '',
        $data['shipping_name'] ?? $user['name'],
        $data['comment'] ?? null
    ]);
    
    $orderId = $pdo->lastInsertId();
    
    // Добавляем товары в заказ
    foreach ($cartItems as $item) {
        $stmt = $pdo->prepare("
            INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, total)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $orderId,
            $item['product_id'],
            $item['name'],
            $item['price'],
            $item['quantity'],
            $item['quantity'] * $item['price']
        ]);
    }
    
    // Очищаем корзину
    $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ?");
    $stmt->execute([$userId]);
    
    sendResponse([
        'success' => true,
        'order_id' => $orderId,
        'order_number' => $orderNumber,
        'total' => $total
    ]);
} else {
    sendError('Method not allowed', 405);
}
?>