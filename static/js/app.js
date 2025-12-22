// API base URL
const API_BASE = '/api';

// State
let currentUser = null;
let products = [];
let categories = [];
let cart = { items: [], total: 0, count: 0 };
let orders = [];
let stats = {};

// DOM Elements
const pages = {
    home: document.getElementById('home-page'),
    products: document.getElementById('products-page'),
    cart: document.getElementById('cart-page'),
    orders: document.getElementById('orders-page'),
    admin: document.getElementById('admin-page')
};

const navLinks = document.querySelectorAll('.nav-link');
const pageLinks = document.querySelectorAll('[data-page]');
const cartCount = document.getElementById('cart-count');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize data
    initApp();

    // Set up event listeners
    setupEventListeners();

    // Load initial data
    loadUser();
    loadCategories();
    loadProducts();
    loadCart();
    loadOrders();
    loadStats();
});

// Initialize app data
async function initApp() {
    try {
        const response = await fetch(`${API_BASE}/init`);
        const data = await response.json();
        if (data.success) {
            console.log('App initialized');
        }
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            navigateTo(page);
        });
    });

    // Page links
    pageLinks.forEach(link => {
        if (link.dataset.page) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(link.dataset.page);
            });
        }
    });

    // Product search
    const productSearch = document.getElementById('product-search');
    if (productSearch) {
        productSearch.addEventListener('input', debounce(() => {
            loadProducts();
        }, 300));
    }

    // Category filter
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            loadProducts();
        });
    }

    // Price filter
    const priceFilter = document.getElementById('price-filter');
    if (priceFilter) {
        priceFilter.addEventListener('change', () => {
            loadProducts();
        });
    }

    // Clear cart
    const clearCartBtn = document.getElementById('clear-cart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', clearCart);
    }

    // Checkout
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }

    // Refresh stats
    const refreshStatsBtn = document.getElementById('refresh-stats');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', loadStats);
    }

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', () => {
            closeAllModals();
        });
    });

    // Close modal when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeAllModals();
            }
        });
    });
}

// Navigation
function navigateTo(page) {
    // Update active nav link
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === page) {
            link.classList.add('active');
        }
    });

    // Show selected page
    Object.values(pages).forEach(pageElement => {
        pageElement.classList.remove('active');
    });
    if (pages[page]) {
        pages[page].classList.add('active');
    }

    // Load data for the page if needed
    if (page === 'products') {
        loadProducts();
    } else if (page === 'cart') {
        loadCart();
    } else if (page === 'orders') {
        loadOrders();
    } else if (page === 'admin') {
        loadStats();
    }
}

// Load user data
async function loadUser() {
    try {
        const response = await fetch(`${API_BASE}/users/me`);
        if (response.ok) {
            currentUser = await response.json();
            updateUserUI();
        }
    } catch (error) {
        console.error('Error loading user:', error);
    }
}

// Load categories
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE}/categories/`);
        if (response.ok) {
            const data = await response.json();
            categories = data.categories;
            renderCategories();
            updateCategoryFilter();
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load products
async function loadProducts() {
    try {
        const search = document.getElementById('product-search')?.value || '';
        const categoryId = document.getElementById('category-filter')?.value || '';
        const priceRange = document.getElementById('price-filter')?.value || '';

        let url = `${API_BASE}/products/?limit=100`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (categoryId) url += `&category_id=${categoryId}`;
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            url += `&min_price=${min || 0}`;
            if (max) url += `&max_price=${max}`;
        }

        const response = await fetch(url);
        if (response.ok) {
            const data = await response.json();
            products = data.products;
            renderProducts();
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

// Load cart
async function loadCart() {
    try {
        const response = await fetch(`${API_BASE}/cart/`);
        if (response.ok) {
            const data = await response.json();
            cart = data;
            updateCartUI();
            renderCartItems();
        }
    } catch (error) {
        console.error('Error loading cart:', error);
    }
}

// Load orders
async function loadOrders() {
    try {
        const response = await fetch(`${API_BASE}/orders/`);
        if (response.ok) {
            const data = await response.json();
            orders = data.orders;
            renderOrders();
        }
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats/`);
        if (response.ok) {
            const data = await response.json();
            stats = data;
            renderStats();
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Add to cart
async function addToCart(productId, quantity = 1) {
    try {
        const response = await fetch(`${API_BASE}/cart/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                product_id: productId,
                quantity: quantity
            })
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Product added to cart!', 'success');
            loadCart();
        } else {
            showNotification(data.message || 'Error adding to cart', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding to cart', 'error');
    }
}

// Update cart item quantity
async function updateCartItem(cartItemId, quantity) {
    try {
        const response = await fetch(`${API_BASE}/cart/${cartItemId}?quantity=${quantity}`, {
            method: 'PUT'
        });

        const data = await response.json();
        if (data.success) {
            loadCart();
        }
    } catch (error) {
        console.error('Error updating cart item:', error);
        showNotification('Error updating cart', 'error');
    }
}

// Remove from cart
async function removeFromCart(cartItemId) {
    try {
        const response = await fetch(`${API_BASE}/cart/${cartItemId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Item removed from cart', 'success');
            loadCart();
        }
    } catch (error) {
        console.error('Error removing from cart:', error);
        showNotification('Error removing from cart', 'error');
    }
}

// Clear cart
async function clearCart() {
    if (!confirm('Are you sure you want to clear your cart?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/cart/`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Cart cleared', 'success');
            loadCart();
        }
    } catch (error) {
        console.error('Error clearing cart:', error);
        showNotification('Error clearing cart', 'error');
    }
}

// Checkout
async function checkout() {
    const shippingAddress = document.getElementById('shipping-address')?.value;
    if (!shippingAddress || shippingAddress.trim().length < 10) {
        showNotification('Please enter a valid shipping address (minimum 10 characters)', 'error');
        return;
    }

    if (cart.items.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/orders/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shipping_address: shippingAddress
            })
        });

        const data = await response.json();
        if (data.success) {
            showNotification('Order placed successfully!', 'success');
            navigateTo('orders');
            loadOrders();
            loadCart();
        } else {
            showNotification(data.message || 'Error placing order', 'error');
        }
    } catch (error) {
        console.error('Error during checkout:', error);
        showNotification('Error during checkout', 'error');
    }
}

// View product details
async function viewProduct(productId) {
    try {
        const response = await fetch(`${API_BASE}/products/${productId}`);
        if (response.ok) {
            const product = await response.json();
            showProductModal(product);
        }
    } catch (error) {
        console.error('Error loading product:', error);
    }
}

// View order details
async function viewOrder(orderId) {
    try {
        const response = await fetch(`${API_BASE}/orders/${orderId}`);
        if (response.ok) {
            const order = await response.json();
            showOrderModal(order);
        }
    } catch (error) {
        console.error('Error loading order:', error);
    }
}

// Render categories
function renderCategories() {
    const container = document.getElementById('categories-list');
    if (!container) return;

    if (categories.length === 0) {
        container.innerHTML = '<p>No categories available</p>';
        return;
    }

    const html = categories.map(category => `
        <div class="category-card" onclick="navigateTo('products'); document.getElementById('category-filter').value='${category.id}'">
            <div class="category-image">
                <i class="fas fa-box"></i>
            </div>
            <div class="category-content">
                <h3>${escapeHtml(category.name)}</h3>
                <p>${escapeHtml(category.description || 'Browse products')}</p>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Update category filter
function updateCategoryFilter() {
    const filter = document.getElementById('category-filter');
    if (!filter) return;

    let options = '<option value="">All Categories</option>';
    categories.forEach(category => {
        options += `<option value="${category.id}">${escapeHtml(category.name)}</option>`;
    });
    filter.innerHTML = options;
}

// Render products
function renderProducts() {
    const container = document.getElementById('products-grid');
    const noProducts = document.getElementById('no-products');

    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = '';
        if (noProducts) noProducts.style.display = 'block';
        return;
    }

    if (noProducts) noProducts.style.display = 'none';

    const html = products.map(product => `
        <div class="product-card">
            <div class="product-image" onclick="viewProduct(${product.id})">
                <i class="fas fa-box"></i>
            </div>
            <div class="product-content">
                <h3 onclick="viewProduct(${product.id})" style="cursor: pointer;">
                    ${escapeHtml(product.name)}
                </h3>
                <p class="product-description">${escapeHtml(product.description || 'No description available')}</p>

                <div class="product-price">$${product.price.toFixed(2)}</div>

                <div class="product-stock ${getStockClass(product.stock)}">
                    ${getStockText(product.stock)}
                </div>

                <div class="product-actions">
                    <button class="btn btn-primary" onclick="addToCart(${product.id})" ${product.stock === 0 ? 'disabled' : ''}>
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn btn-secondary" onclick="viewProduct(${product.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Render cart items
function renderCartItems() {
    const container = document.getElementById('cart-items-list');
    const emptyCart = document.getElementById('empty-cart');

    if (!container) return;

    if (cart.items.length === 0) {
        container.innerHTML = '';
        if (emptyCart) emptyCart.style.display = 'block';
        return;
    }

    if (emptyCart) emptyCart.style.display = 'none';

    const html = cart.items.map(item => {
        const product = item.product;
        const subtotal = item.quantity * product.price;

        return `
            <div class="cart-item">
                <div class="cart-item-image">
                    <i class="fas fa-box"></i>
                </div>
                <div class="cart-item-details">
                    <h4>${escapeHtml(product.name)}</h4>
                    <div class="cart-item-price">$${product.price.toFixed(2)} each</div>
                    <div class="cart-item-controls">
                        <button class="quantity-btn" onclick="updateCartItem(${item.id}, ${item.quantity - 1})">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" max="${product.stock}"
                               onchange="updateCartItem(${item.id}, this.value)">
                        <button class="quantity-btn" onclick="updateCartItem(${item.id}, ${item.quantity + 1})" ${item.quantity >= product.stock ? 'disabled' : ''}>+</button>
                        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
                <div class="cart-item-total">$${subtotal.toFixed(2)}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// Render orders
function renderOrders() {
    const container = document.getElementById('orders-list');
    const noOrders = document.getElementById('no-orders');

    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = '';
        if (noOrders) noOrders.style.display = 'block';
        return;
    }

    if (noOrders) noOrders.style.display = 'none';

    const html = orders.map(order => `
        <div class="order-card" onclick="viewOrder(${order.id})">
            <div class="order-header">
                <span class="order-id">Order #${order.id}</span>
                <span class="order-date">${formatDate(order.created_at)}</span>
                <span class="order-status status-${order.status}">${order.status.toUpperCase()}</span>
            </div>
            <div class="order-details">
                <div>
                    <div><strong>Shipping:</strong> ${escapeHtml(order.shipping_address.substring(0, 50))}...</div>
                    <div><strong>Updated:</strong> ${order.updated_at ? formatDate(order.updated_at) : 'N/A'}</div>
                </div>
                <div class="order-total">$${order.total_amount.toFixed(2)}</div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// Render statistics
function renderStats() {
    // Update stat cards
    if (stats.products) {
        document.getElementById('total-products').textContent = stats.products.total;
        document.getElementById('active-products').textContent = stats.products.active;
        document.getElementById('out-of-stock').textContent = stats.products.out_of_stock;
    }

    if (stats.orders) {
        document.getElementById('total-orders').textContent = stats.orders.total;
        document.getElementById('total-revenue').textContent = `$${stats.orders.revenue.toFixed(2)}`;
    }

    // Render category chart
    const chartContainer = document.getElementById('category-chart');
    if (chartContainer && stats.categories) {
        if (stats.categories.length === 0) {
            chartContainer.innerHTML = '<p>No category data available</p>';
            return;
        }

        const maxCount = Math.max(...stats.categories.map(c => c.count));
        const chartHtml = stats.categories.map(cat => {
            const height = cat.count > 0 ? (cat.count / maxCount * 100) : 5;
            return `
                <div class="chart-bar" style="height: ${height}%">
                    <span class="chart-bar-value">${cat.count}</span>
                    <span class="chart-bar-label">${escapeHtml(cat.name)}</span>
                </div>
            `;
        }).join('');

        chartContainer.innerHTML = chartHtml;
    }
}

// Update cart UI
function updateCartUI() {
    // Update cart count badge
    if (cartCount) {
        cartCount.textContent = cart.items_count || 0;
    }

    // Update cart summary
    const subtotalEl = document.getElementById('cart-subtotal');
    const totalEl = document.getElementById('cart-total');

    if (subtotalEl) subtotalEl.textContent = `$${(cart.total_amount || 0).toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${(cart.total_amount || 0).toFixed(2)}`;
}

// Update user UI
function updateUserUI() {
    // In a real app, you would update the user info in the header
    console.log('User loaded:', currentUser);
}

// Show product modal
function showProductModal(product) {
    const modal = document.getElementById('product-modal');
    const content = document.getElementById('modal-content');

    if (!modal || !content) return;

    const html = `
        <div class="product-modal-content">
            <div class="product-modal-image">
                <i class="fas fa-box"></i>
            </div>
            <div class="product-modal-details">
                <h2>${escapeHtml(product.name)}</h2>
                <div class="product-modal-price">$${product.price.toFixed(2)}</div>
                <div class="product-modal-description">
                    ${escapeHtml(product.description || 'No description available')}
                </div>
                <div class="product-modal-stats">
                    <div class="stat-item">
                        <span class="label">Category</span>
                        <span class="value">${getCategoryName(product.category_id)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">Stock</span>
                        <span class="value ${getStockClass(product.stock)}">${product.stock} units</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">Status</span>
                        <span class="value">${product.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                </div>
                <div class="product-modal-actions">
                    <button class="btn btn-primary btn-lg" onclick="addToCart(${product.id}); closeAllModals();">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button class="btn btn-secondary" onclick="closeAllModals()">
                        <i class="fas fa-times"></i> Close
                    </button>
                </div>
            </div>
        </div>
    `;

    content.innerHTML = html;
    modal.style.display = 'flex';
}

// Show order modal
function showOrderModal(order) {
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('order-modal-content');

    if (!modal || !content) return;

    const itemsHtml = order.items.map(item => `
        <tr>
            <td>${item.product_name || `Product #${item.product_id}`}</td>
            <td>${item.quantity}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${item.subtotal.toFixed(2)}</td>
        </tr>
    `).join('');

    const html = `
        <h2>Order #${order.id}</h2>

        <div class="order-info">
            <div class="info-item">
                <span class="label">Status</span>
                <span class="value status-${order.status}">${order.status.toUpperCase()}</span>
            </div>
            <div class="info-item">
                <span class="label">Order Date</span>
                <span class="value">${formatDate(order.created_at)}</span>
            </div>
            <div class="info-item">
                <span class="label">Last Updated</span>
                <span class="value">${order.updated_at ? formatDate(order.updated_at) : 'N/A'}</span>
            </div>
        </div>

        <div class="info-item">
            <span class="label">Shipping Address</span>
            <span class="value">${escapeHtml(order.shipping_address)}</span>
        </div>

        <h3>Order Items</h3>
        <table class="order-items-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
                <tr class="order-total-row">
                    <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                    <td><strong>$${order.total_amount.toFixed(2)}</strong></td>
                </tr>
            </tbody>
        </table>

        <div style="text-align: center; margin-top: 20px;">
            <button class="btn btn-primary" onclick="closeAllModals()">
                <i class="fas fa-times"></i> Close
            </button>
        </div>
    `;

    content.innerHTML = html;
    modal.style.display = 'flex';
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Helper functions
function getStockClass(stock) {
    if (stock === 0) return 'out-of-stock';
    if (stock < 10) return 'low-stock';
    return 'in-stock';
}

function getStockText(stock) {
    if (stock === 0) return 'Out of Stock';
    if (stock < 10) return `Low Stock (${stock} left)`;
    return `In Stock (${stock} available)`;
}

function getCategoryName(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showNotification(message, type = 'info') {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add styles for notification
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                background: white;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 300px;
                max-width: 400px;
                z-index: 3000;
                animation: slideIn 0.3s ease;
                border-left: 4px solid;
            }

            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            .notification-success {
                border-left-color: var(--success-color);
            }

            .notification-error {
                border-left-color: var(--danger-color);
            }

            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .notification-success .notification-content i {
                color: var(--success-color);
            }

            .notification-error .notification-content i {
                color: var(--danger-color);
            }

            .notification-close {
                background: none;
                border: none;
                color: var(--secondary-color);
                cursor: pointer;
                padding: 5px;
                margin-left: 10px;
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto-remove notification after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Make functions available globally
window.navigateTo = navigateTo;
window.viewProduct = viewProduct;
window.viewOrder = viewOrder;
window.addToCart = addToCart;
window.updateCartItem = updateCartItem;
window.removeFromCart = removeFromCart;
window.closeAllModals = closeAllModals;