<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '/';
$parts = explode('/', trim($path, '/'));
$resource = $parts[0] ?? '';
$id = $parts[1] ?? null;

// Подключение к базе данных (SQLite)
$db = new PDO('sqlite:db/database.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Создание таблиц
$db->exec("
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        image TEXT NOT NULL,
        badge TEXT,
        color TEXT,
        oldPrice INTEGER,
        rating REAL DEFAULT 0,
        reviews INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        isAdmin INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        items TEXT NOT NULL,
        total INTEGER NOT NULL,
        paymentMethod TEXT NOT NULL,
        status TEXT DEFAULT 'paid',
        bookingDate TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS cart (
        userId INTEGER PRIMARY KEY,
        items TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS price_overrides (
        productId INTEGER PRIMARY KEY,
        price INTEGER NOT NULL
    );
");

// Роутинг
switch ($resource) {
    case 'products':
        handleProducts($db, $method, $id);
        break;
    case 'auth':
        handleAuth($db, $method, $id);
        break;
    case 'cart':
        handleCart($db, $method);
        break;
    case 'orders':
        handleOrders($db, $method);
        break;
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Not found']);
}

function handleProducts($db, $method, $id) {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $db->prepare("SELECT * FROM products WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            } else {
                $stmt = $db->query("SELECT * FROM products");
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            }
            break;
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $stmt = $db->prepare("INSERT INTO products (name, price, image, badge, color, oldPrice) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$data['name'], $data['price'], $data['image'], $data['badge'] ?? null, $data['color'] ?? null, $data['oldPrice'] ?? null]);
            echo json_encode(['id' => $db->lastInsertId()]);
            break;
        case 'PUT':
            $data = json_decode(file_get_contents('php://input'), true);
            $sets = [];
            $params = [];
            foreach ($data as $key => $value) {
                $sets[] = "$key = ?";
                $params[] = $value;
            }
            $params[] = $id;
            $stmt = $db->prepare("UPDATE products SET " . implode(', ', $sets) . " WHERE id = ?");
            $stmt->execute($params);
            echo json_encode(['success' => true]);
            break;
        case 'DELETE':
            $stmt = $db->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
    }
}

function handleAuth($db, $method) {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    
    if ($action === 'register') {
        $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
        $stmt = $db->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
        $stmt->execute([$data['name'], $data['email'], $hashedPassword]);
        echo json_encode(['success' => true]);
    } else if ($action === 'login') {
        $stmt = $db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$data['email']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($user && password_verify($data['password'], $user['password'])) {
            echo json_encode(['user' => $user, 'token' => base64_encode(json_encode(['id' => $user['id']]))]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
        }
    }
}