<?php
require_once 'config.php';

$request_uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Парсим путь
$path = parse_url($request_uri, PHP_URL_PATH);
$path = str_replace('/api/', '', $path);
$segments = explode('/', trim($path, '/'));

$endpoint = $segments[0] ?? '';
$id = $segments[1] ?? null;

// Маршрутизация
switch ($endpoint) {
    case 'products':
        require_once 'products.php';
        break;
    case 'categories':
        require_once 'categories.php';
        break;
    case 'cart':
        require_once 'cart.php';
        break;
    case 'auth':
        require_once 'auth.php';
        break;
    case 'orders':
        require_once 'orders.php';
        break;
    default:
        sendError('API endpoint not found', 404);
}
?>