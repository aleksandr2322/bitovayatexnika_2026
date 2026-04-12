<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *"); // Разрешаем запросы с GitHub Pages
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Подключение к базе данных
$host = 'localhost'; // или ваш хост
$dbname = 'technodom_db';
$username = 'root'; // ваш пользователь
$password = ''; // ваш пароль

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    sendError("Ошибка подключения к БД: " . $e->getMessage(), 500);
}

function sendResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function sendError($message, $status = 400) {
    sendResponse(['error' => true, 'message' => $message], $status);
}

// Получение пользователя по токену (для авторизации)
function getUserByToken($pdo) {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? '';
    $token = str_replace('Bearer ', '', $token);
    
    if (empty($token)) {
        return null;
    }
    
    // Проверяем токен в сессиях (предполагаем, что токен = user_id)
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$token]);
    return $stmt->fetch();
}
?>