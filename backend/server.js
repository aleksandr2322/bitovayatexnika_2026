const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-me';

// Middleware
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', '*'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Пути к файлам базы данных
const DB_PATH = path.join(__dirname, 'db');
const PRODUCTS_FILE = path.join(DB_PATH, 'products.json');
const USERS_FILE = path.join(DB_PATH, 'users.json');
const ORDERS_FILE = path.join(DB_PATH, 'orders.json');
const CART_FILE = path.join(DB_PATH, 'cart.json');
const PRICE_OVERRIDES_FILE = path.join(DB_PATH, 'price_overrides.json');

// Инициализация базы данных
async function initDB() {
    try {
        await fs.mkdir(DB_PATH, { recursive: true });
        
        // Создаем файлы если их нет
        const files = [
            { path: PRODUCTS_FILE, default: getDefaultProducts() },
            { path: USERS_FILE, default: [] },
            { path: ORDERS_FILE, default: {} },
            { path: CART_FILE, default: {} },
            { path: PRICE_OVERRIDES_FILE, default: {} }
        ];
        
        for (const file of files) {
            try {
                await fs.access(file.path);
            } catch {
                await fs.writeFile(file.path, JSON.stringify(file.default, null, 2));
            }
        }
    } catch (error) {
        console.error('Ошибка инициализации БД:', error);
    }
}

function getDefaultProducts() {
    return [
        { id: 1, name: "Холодильник Samsung RB33J3420SA", price: 64990, image: "image copy 2.png", badge: "Акция", color: "Серебристый", oldPrice: 72500, rating: 4.8, reviews: 127 },
        { id: 2, name: "Стиральная машина LG F2J3NS0W", price: 34990, image: "image copy 9.png", badge: "", color: "Белый", oldPrice: null, rating: 4.7, reviews: 89 },
        { id: 3, name: "Электрическая плита Bosch PIE631FB1E", price: 42500, image: "image copy 12.png", badge: "", color: "Черный", oldPrice: null, rating: 4.6, reviews: 56 },
        { id: 4, name: "Посудомоечная машина Siemens SN235I00ME", price: 38990, image: "image copy 15.png", badge: "", color: "Белый", oldPrice: 44500, rating: 4.9, reviews: 34 },
        { id: 5, name: "Микроволновая печь Samsung ME83KR", price: 12990, image: "image copy 17.png", badge: "Новинка", color: "Серебристый", oldPrice: 15990, rating: 4.5, reviews: 213 },
        { id: 6, name: "Пылесос Philips PowerPro FC9332", price: 18990, image: "image copy 18.png", badge: "", color: "Синий", oldPrice: null, rating: 4.4, reviews: 78 },
        { id: 7, name: "Кофемашина De'Longhi Magnifica S", price: 45990, image: "image copy 21.png", badge: "Акция", color: "Черный", oldPrice: 52900, rating: 4.8, reviews: 156 },
        { id: 8, name: "Телевизор LG 55Nano86 4K", price: 52990, image: "image copy 22.png", badge: "Новинка", color: "Черный", oldPrice: 64990, rating: 4.7, reviews: 92 },
        { id: 9, name: "Холодильник LG GC-B247SLUV", price: 79990, image: "image copy 7.png", badge: "Новинка", color: "Серебристый", oldPrice: 89900, rating: 4.9, reviews: 45 },
        { id: 10, name: "Стиральная машина Bosch WAN28281BY", price: 41990, image: "image copy 10.png", badge: "Хит", color: "Белый", oldPrice: 48500, rating: 4.8, reviews: 167 },
        { id: 11, name: "Электрическая плита Gorenje EC 534 WG", price: 37990, image: "image copy 13.png", badge: "Акция", color: "Черный", oldPrice: 44900, rating: 4.3, reviews: 34 },
        { id: 12, name: "Посудомоечная машина Miele G 5210 SCU", price: 64990, image: "image copy 16.png", badge: "Новинка", color: "Белый", oldPrice: 72000, rating: 4.9, reviews: 28 }
    ];
}

// Утилиты для работы с JSON файлами
async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

async function writeJSON(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// Middleware для проверки JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
}

// Middleware для проверки администратора
function checkAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора' });
    }
    next();
}

// ==================== API РОУТЫ ====================

// --- Товары ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки товаров' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        const product = products.find(p => p.id === parseInt(req.params.id));
        if (!product) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки товара' });
    }
});

app.post('/api/products', 
    authenticateToken,
    checkAdmin,
    [
        body('name').notEmpty().withMessage('Название обязательно'),
        body('price').isNumeric().withMessage('Цена должна быть числом'),
        body('image').notEmpty().withMessage('URL изображения обязателен'),
        body('color').optional().isString(),
        body('badge').optional().isString()
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        
        try {
            const products = await readJSON(PRODUCTS_FILE);
            const newProduct = {
                id: products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1,
                ...req.body,
                rating: 0,
                reviews: 0,
                createdAt: new Date().toISOString()
            };
            products.push(newProduct);
            await writeJSON(PRODUCTS_FILE, products);
            res.status(201).json(newProduct);
        } catch (error) {
            res.status(500).json({ error: 'Ошибка добавления товара' });
        }
    }
);

app.put('/api/products/:id',
    authenticateToken,
    checkAdmin,
    async (req, res) => {
        try {
            const products = await readJSON(PRODUCTS_FILE);
            const index = products.findIndex(p => p.id === parseInt(req.params.id));
            if (index === -1) {
                return res.status(404).json({ error: 'Товар не найден' });
            }
            products[index] = { ...products[index], ...req.body };
            await writeJSON(PRODUCTS_FILE, products);
            res.json(products[index]);
        } catch (error) {
            res.status(500).json({ error: 'Ошибка обновления товара' });
        }
    }
);

app.delete('/api/products/:id',
    authenticateToken,
    checkAdmin,
    async (req, res) => {
        try {
            const products = await readJSON(PRODUCTS_FILE);
            const filtered = products.filter(p => p.id !== parseInt(req.params.id));
            await writeJSON(PRODUCTS_FILE, filtered);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Ошибка удаления товара' });
        }
    }
);

// --- Пользователи ---
app.post('/api/auth/register', [
    body('name').notEmpty().withMessage('Имя обязательно'),
    body('email').isEmail().withMessage('Некорректный email'),
    body('password').isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const users = await readJSON(USERS_FILE);
        const { name, email, password } = req.body;
        
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
            name,
            email,
            password: hashedPassword,
            isAdmin: false,
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        await writeJSON(USERS_FILE, users);
        
        // Создаем токен
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, isAdmin: newUser.isAdmin },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                isAdmin: newUser.isAdmin
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

app.post('/api/auth/login', [
    body('email').isEmail().withMessage('Некорректный email'),
    body('password').notEmpty().withMessage('Пароль обязателен')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    
    try {
        const users = await readJSON(USERS_FILE);
        const { email, password } = req.body;
        
        const user = users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Неверный email или пароль' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, isAdmin: user.isAdmin || false },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin || false
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const users = await readJSON(USERS_FILE);
        const user = users.find(u => u.id === req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: user.isAdmin || false
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения данных пользователя' });
    }
});

// --- Корзина ---
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        const cart = await readJSON(CART_FILE);
        res.json(cart[req.user.id] || []);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки корзины' });
    }
});

app.post('/api/cart', authenticateToken, async (req, res) => {
    try {
        const cart = await readJSON(CART_FILE);
        const userId = req.user.id;
        const { productId, quantity = 1 } = req.body;
        
        if (!cart[userId]) cart[userId] = [];
        
        const existingItem = cart[userId].find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            // Получаем информацию о товаре
            const products = await readJSON(PRODUCTS_FILE);
            const product = products.find(p => p.id === productId);
            if (!product) {
                return res.status(404).json({ error: 'Товар не найден' });
            }
            cart[userId].push({
                id: productId,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity
            });
        }
        
        await writeJSON(CART_FILE, cart);
        res.json(cart[userId]);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка добавления в корзину' });
    }
});

app.put('/api/cart/:productId', authenticateToken, async (req, res) => {
    try {
        const cart = await readJSON(CART_FILE);
        const userId = req.user.id;
        const productId = parseInt(req.params.productId);
        const { quantity } = req.body;
        
        if (!cart[userId]) {
            return res.status(404).json({ error: 'Корзина пуста' });
        }
        
        const item = cart[userId].find(item => item.id === productId);
        if (!item) {
            return res.status(404).json({ error: 'Товар не найден в корзине' });
        }
        
        if (quantity <= 0) {
            cart[userId] = cart[userId].filter(item => item.id !== productId);
        } else {
            item.quantity = quantity;
        }
        
        await writeJSON(CART_FILE, cart);
        res.json(cart[userId]);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка обновления корзины' });
    }
});

app.delete('/api/cart/:productId', authenticateToken, async (req, res) => {
    try {
        const cart = await readJSON(CART_FILE);
        const userId = req.user.id;
        const productId = parseInt(req.params.productId);
        
        if (cart[userId]) {
            cart[userId] = cart[userId].filter(item => item.id !== productId);
            await writeJSON(CART_FILE, cart);
        }
        
        res.json(cart[userId] || []);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления из корзины' });
    }
});

app.delete('/api/cart', authenticateToken, async (req, res) => {
    try {
        const cart = await readJSON(CART_FILE);
        cart[req.user.id] = [];
        await writeJSON(CART_FILE, cart);
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка очистки корзины' });
    }
});

// --- Заказы ---
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        const cart = await readJSON(CART_FILE);
        const userId = req.user.id;
        const { paymentMethod } = req.body;
        
        const userCart = cart[userId] || [];
        if (userCart.length === 0) {
            return res.status(400).json({ error: 'Корзина пуста' });
        }
        
        const total = userCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const order = {
            id: Date.now(),
            date: new Date().toISOString(),
            items: userCart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            total,
            paymentMethod,
            status: paymentMethod === 'Бронирование' ? 'pending' : 'paid',
            bookingDate: null
        };
        
        if (!orders[userId]) orders[userId] = [];
        orders[userId].push(order);
        await writeJSON(ORDERS_FILE, orders);
        
        // Очищаем корзину
        cart[userId] = [];
        await writeJSON(CART_FILE, cart);
        
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка оформления заказа' });
    }
});

app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        res.json(orders[req.user.id] || []);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
});

// --- Админ: управление заказами ---
app.get('/api/admin/orders', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        const allOrders = [];
        for (const userId in orders) {
            orders[userId].forEach(order => {
                allOrders.push({
                    ...order,
                    userId: parseInt(userId)
                });
            });
        }
        allOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(allOrders);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки заказов' });
    }
});

app.put('/api/admin/orders/:orderId', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const orders = await readJSON(ORDERS_FILE);
        const { userId, status, bookingDate } = req.body;
        const orderId = parseInt(req.params.orderId);
        
        if (!orders[userId]) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        const orderIndex = orders[userId].findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }
        
        if (status) orders[userId][orderIndex].status = status;
        if (bookingDate !== undefined) orders[userId][orderIndex].bookingDate = bookingDate;
        
        await writeJSON(ORDERS_FILE, orders);
        res.json(orders[userId][orderIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка обновления заказа' });
    }
});

// --- Цены (переопределение) ---
app.get('/api/price-overrides', async (req, res) => {
    try {
        const overrides = await readJSON(PRICE_OVERRIDES_FILE);
        res.json(overrides);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка загрузки переопределений цен' });
    }
});

app.post('/api/price-overrides', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const overrides = await readJSON(PRICE_OVERRIDES_FILE);
        const { productId, price } = req.body;
        overrides[productId] = price;
        await writeJSON(PRICE_OVERRIDES_FILE, overrides);
        res.json(overrides);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сохранения цены' });
    }
});

// --- Статистика для админа ---
app.get('/api/admin/stats', authenticateToken, checkAdmin, async (req, res) => {
    try {
        const products = await readJSON(PRODUCTS_FILE);
        const orders = await readJSON(ORDERS_FILE);
        const users = await readJSON(USERS_FILE);
        
        let totalOrders = 0;
        let totalRevenue = 0;
        let pendingBookings = 0;
        
        for (const userId in orders) {
            orders[userId].forEach(order => {
                totalOrders++;
                totalRevenue += order.total;
                if (order.status === 'pending') pendingBookings++;
            });
        }
        
        res.json({
            totalProducts: products.length,
            totalUsers: users.length,
            totalOrders,
            totalRevenue,
            pendingBookings
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
});

// Запуск сервера
async function startServer() {
    await initDB();
    app.listen(PORT, () => {
        console.log(`🚀 Сервер запущен на порту ${PORT}`);
        console.log(`📍 http://localhost:${PORT}`);
        console.log('\n📋 Доступные эндпоинты:');
        console.log('  GET    /api/products');
        console.log('  GET    /api/products/:id');
        console.log('  POST   /api/products (админ)');
        console.log('  PUT    /api/products/:id (админ)');
        console.log('  DELETE /api/products/:id (админ)');
        console.log('  POST   /api/auth/register');
        console.log('  POST   /api/auth/login');
        console.log('  GET    /api/auth/me');
        console.log('  GET    /api/cart');
        console.log('  POST   /api/cart');
        console.log('  PUT    /api/cart/:productId');
        console.log('  DELETE /api/cart/:productId');
        console.log('  DELETE /api/cart');
        console.log('  POST   /api/orders');
        console.log('  GET    /api/orders');
        console.log('  GET    /api/admin/orders (админ)');
        console.log('  PUT    /api/admin/orders/:orderId (админ)');
        console.log('  GET    /api/price-overrides');
        console.log('  POST   /api/price-overrides (админ)');
        console.log('  GET    /api/admin/stats (админ)');
    });
}

startServer();