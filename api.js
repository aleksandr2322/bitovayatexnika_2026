// config.js - храните здесь настройки API
const API_BASE_URL = 'https://ваш-хостинг.ру/api'; // Замените на ваш URL

// Токен авторизации
let authToken = localStorage.getItem('auth_token') || null;

// Функция для запросов к API
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}/${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Ошибка запроса');
    }
    
    return data;
}

// API функции
const API = {
    // Товары
    getProducts: (filters = {}) => {
        const params = new URLSearchParams(filters);
        return apiRequest(`products?${params.toString()}`);
    },
    
    getProduct: (id) => apiRequest(`products/${id}`),
    
    // Категории
    getCategories: () => apiRequest('categories'),
    
    // Авторизация
    login: async (email, password) => {
        const data = await apiRequest('auth', {
            method: 'POST',
            body: JSON.stringify({ action: 'login', email, password })
        });
        if (data.token) {
            authToken = data.token;
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    },
    
    register: async (name, email, password) => {
        const data = await apiRequest('auth', {
            method: 'POST',
            body: JSON.stringify({ action: 'register', name, email, password })
        });
        if (data.token) {
            authToken = data.token;
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
    },
    
    logout: () => {
        authToken = null;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    },
    
    // Корзина
    getCart: () => apiRequest('cart'),
    
    addToCart: (productId, quantity = 1) => apiRequest('cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity })
    }),
    
    updateCartItem: (productId, quantity) => apiRequest('cart', {
        method: 'PUT',
        body: JSON.stringify({ product_id: productId, quantity })
    }),
    
    clearCart: () => apiRequest('cart', { method: 'DELETE' }),
    
    // Заказы
    getOrders: () => apiRequest('orders'),
    
    createOrder: (orderData) => apiRequest('orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
    }),
    
    // Получить текущего пользователя
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }
};

// Пример использования на странице
async function loadProducts() {
    try {
        const data = await API.getProducts({ limit: 8 });
        console.log('Товары:', data.products);
        // Рендерим товары на страницу
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    
    // Проверяем авторизацию
    const user = API.getCurrentUser();
    if (user) {
        console.log('Пользователь авторизован:', user.name);
        // Обновляем UI
    }
});