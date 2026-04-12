<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    
    if ($action === 'login') {
        // Логин
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        
        if (empty($email) || empty($password)) {
            sendError('Email и пароль обязательны');
        }
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        // Проверка пароля (для тестовых данных с простым паролем)
        // В реальном проекте используйте password_verify()
        if ($user && ($password === '123456' || password_verify($password, $user['password']))) {
            unset($user['password']);
            sendResponse([
                'success' => true,
                'user' => $user,
                'token' => $user['id'] // В реальном проекте используйте JWT
            ]);
        } else {
            sendError('Неверный email или пароль', 401);
        }
    } elseif ($action === 'register') {
        // Регистрация
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        
        if (empty($name) || empty($email) || empty($password)) {
            sendError('Все поля обязательны');
        }
        
        if (strlen($password) < 6) {
            sendError('Пароль должен быть не менее 6 символов');
        }
        
        // Проверка существования email
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            sendError('Пользователь с таким email уже существует');
        }
        
        // Хеширование пароля
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
        $result = $stmt->execute([$name, $email, $hashedPassword]);
        
        if ($result) {
            $userId = $pdo->lastInsertId();
            sendResponse([
                'success' => true,
                'user' => ['id' => $userId, 'name' => $name, 'email' => $email],
                'token' => $userId
            ]);
        } else {
            sendError('Ошибка при регистрации', 500);
        }
    } else {
        sendError('Неизвестное действие');
    }
} else {
    sendError('Method not allowed', 405);
}
?>