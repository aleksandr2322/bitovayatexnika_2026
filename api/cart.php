<?php
require_once 'config.php';

// Проверяем авторизацию
$user = getUserByToken($pdo);
if (!$user) {
    sendError('Необходима авторизация', 401);
}

$userId = $user['id'];

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Получить корзину
        $stmt = $pdo->prepare("
            SELECT c.*, p.name, p.price, p.image 
            FROM cart c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = ?
        ");
        $stmt->execute([$userId]);
        $cartItems = $stmt->fetchAll();
        
        $total = 0;
        foreach ($cartItems as &$item) {
            $item['subtotal'] = $item['quantity'] * $item['price'];
            $total += $item['subtotal'];
        }
        
        sendResponse([
            'items' => $cartItems,
            'total' => $total,
            'count' => count($cartItems)
        ]);
        break;
        
    case 'POST':
        // Добавить в корзину
        $data = json_decode(file_get_contents('php://input'), true);
        $productId = $data['product_id'] ?? null;
        $quantity = $data['quantity'] ?? 1;
        
        if (!$productId) {
            sendError('ID товара обязателен');
        }
        
        // Проверяем, есть ли уже такой товар в корзине
        $stmt = $pdo->prepare("SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?");
        $stmt->execute([$userId, $productId]);
        $existing = $stmt->fetch();
        
        if ($existing) {
            // Обновляем количество
            $newQuantity = $existing['quantity'] + $quantity;
            $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE id = ?");
            $stmt->execute([$newQuantity, $existing['id']]);
        } else {
            // Добавляем новый товар
            $stmt = $pdo->prepare("INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)");
            $stmt->execute([$userId, $productId, $quantity]);
        }
        
        sendResponse(['success' => true, 'message' => 'Товар добавлен в корзину']);
        break;
        
    case 'PUT':
        // Обновить количество
        $data = json_decode(file_get_contents('php://input'), true);
        $productId = $data['product_id'] ?? null;
        $quantity = $data['quantity'] ?? 1;
        
        if (!$productId) {
            sendError('ID товара обязателен');
        }
        
        if ($quantity <= 0) {
            // Удаляем товар
            $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$userId, $productId]);
        } else {
            // Обновляем количество
            $stmt = $pdo->prepare("UPDATE cart SET quantity = ? WHERE user_id = ? AND product_id = ?");
            $stmt->execute([$quantity, $userId, $productId]);
        }
        
        sendResponse(['success' => true]);
        break;
        
    case 'DELETE':
        // Очистить корзину
        $stmt = $pdo->prepare("DELETE FROM cart WHERE user_id = ?");
        $stmt->execute([$userId]);
        sendResponse(['success' => true, 'message' => 'Корзина очищена']);
        break;
        
    default:
        sendError('Method not allowed', 405);
}
?>