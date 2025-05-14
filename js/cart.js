// Cart Module for Shop do Vale

// Constants
const STORAGE_KEY = 'shopDoVale_cart';

// Cart state
let cartItems = [];

// DOM elements
const cartItemsContainer = document.getElementById('cart-items-container');
const cartSubtotalEl = document.getElementById('cart-subtotal');
const cartTotalEl = document.getElementById('cart-total');
const cartEmptyEl = document.getElementById('cart-empty');
const cartContentEl = document.getElementById('cart-content');
const clearCartBtn = document.getElementById('clear-cart');
const applyCouponBtn = document.getElementById('apply-coupon');
const couponCodeInput = document.getElementById('coupon-code');
const discountContainerEl = document.getElementById('discount-container');
const cartDiscountEl = document.getElementById('cart-discount');
const proceedCheckoutBtn = document.getElementById('proceed-checkout');

// Mock products for demo
const mockProducts = [
  {
    id: '1',
    name: 'Maçã Orgânica',
    description: 'Maçãs orgânicas cultivadas sem pesticidas.',
    price: 8.90,
    image: '../assets/images/apple.jpg',
    quantity: 50,
    category: 'Frutas',
    producerId: '1'
  },
  {
    id: '2',
    name: 'Alface Crespa',
    description: 'Alface crespa fresca, colhida no mesmo dia.',
    price: 3.50,
    image: '../assets/images/lettuce.jpg',
    quantity: 30,
    category: 'Verduras',
    producerId: '1'
  },
  {
    id: '3',
    name: 'Queijo Minas',
    description: 'Queijo minas artesanal produzido com leite fresco.',
    price: 25.00,
    image: '../assets/images/cheese.jpg',
    quantity: 15,
    category: 'Laticínios',
    producerId: '1'
  }
];

// Initialize cart
function initCart() {
  // Load cart from localStorage
  const storedCart = localStorage.getItem(STORAGE_KEY);
  cartItems = storedCart ? JSON.parse(storedCart) : [];
  
  // Show appropriate view based on cart content
  updateCartView();
  
  // Setup event listeners
  setupEventListeners();
}

// Update cart view
function updateCartView() {
  // Show empty cart message if no items
  if (cartItems.length === 0) {
    cartEmptyEl.style.display = 'block';
    cartContentEl.style.display = 'none';
    return;
  }
  
  // Show cart content if has items
  cartEmptyEl.style.display = 'none';
  cartContentEl.style.display = 'block';
  
  // Clear existing items
  cartItemsContainer.innerHTML = '';
  
  // Render each cart item
  cartItems.forEach(item => {
    // Get product details
    const product = mockProducts.find(p => p.id === item.productId) || {
      name: 'Produto Indisponível',
      price: 0,
      category: '',
      image: '../assets/images/placeholder.jpg'
    };
    
    // Calculate subtotal
    const subtotal = product.price * item.quantity;
    
    // Create cart item element
    const cartItemEl = document.createElement('div');
    cartItemEl.className = 'cart-item';
    cartItemEl.innerHTML = `
      <div class="cart-product">
        <div class="cart-product-image">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="cart-product-details">
          <h4>${product.name}</h4>
          <div class="cart-product-category">${product.category}</div>
        </div>
      </div>
      <div class="cart-price">${window.utils.formatCurrency(product.price)}</div>
      <div class="cart-quantity">
        <button class="cart-quantity-btn" data-action="decrease" data-product-id="${item.productId}">-</button>
        <input type="number" class="cart-quantity-input" value="${item.quantity}" min="1" data-product-id="${item.productId}">
        <button class="cart-quantity-btn" data-action="increase" data-product-id="${item.productId}">+</button>
      </div>
      <div class="cart-subtotal">${window.utils.formatCurrency(subtotal)}</div>
      <div class="cart-remove" data-product-id="${item.productId}">
        <i class="fas fa-trash-alt"></i>
      </div>
    `;
    
    // Add to container
    cartItemsContainer.appendChild(cartItemEl);
  });
  
  // Update summary
  updateCartSummary();
}

// Update cart summary
function updateCartSummary() {
  let subtotal = 0;
  let discount = 0;
  let total = 0;
  
  // Calculate subtotal
  cartItems.forEach(item => {
    const product = mockProducts.find(p => p.id === item.productId);
    if (product) {
      subtotal += product.price * item.quantity;
    }
  });
  
  // Check for applied coupon
  const appliedCoupon = localStorage.getItem('shopDoVale_coupon');
  if (appliedCoupon) {
    // For demo, apply 10% discount
    discount = subtotal * 0.1;
    discountContainerEl.style.display = 'flex';
    cartDiscountEl.textContent = `- ${window.utils.formatCurrency(discount)}`;
  } else {
    discountContainerEl.style.display = 'none';
  }
  
  // Calculate total
  total = subtotal - discount;
  
  // Update DOM
  cartSubtotalEl.textContent = window.utils.formatCurrency(subtotal);
  cartTotalEl.textContent = window.utils.formatCurrency(total);
  
  // Update global cart count
  window.utils.updateCartCount();
}

// Setup event listeners
function setupEventListeners() {
  // Only setup if elements exist
  if (!cartItemsContainer) return;
  
  // Event delegation for cart items
  cartItemsContainer.addEventListener('click', function(e) {
    const target = e.target;
    
    // Handle remove button
    if (target.closest('.cart-remove')) {
      const productId = target.closest('.cart-remove').dataset.productId;
      removeFromCart(productId);
    }
    
    // Handle quantity buttons
    if (target.classList.contains('cart-quantity-btn')) {
      const action = target.dataset.action;
      const productId = target.dataset.productId;
      
      if (action === 'increase') {
        updateItemQuantity(productId, 1);
      } else if (action === 'decrease') {
        updateItemQuantity(productId, -1);
      }
    }
  });
  
  // Handle quantity input changes
  cartItemsContainer.addEventListener('change', function(e) {
    if (e.target.classList.contains('cart-quantity-input')) {
      const productId = e.target.dataset.productId;
      const newQuantity = parseInt(e.target.value, 10);
      
      if (newQuantity > 0) {
        setItemQuantity(productId, newQuantity);
      } else {
        e.target.value = 1;
        setItemQuantity(productId, 1);
      }
    }
  });
  
  // Clear cart button
  if (clearCartBtn) {
    clearCartBtn.addEventListener('click', function() {
      clearCart();
    });
  }
  
  // Apply coupon button
  if (applyCouponBtn && couponCodeInput) {
    applyCouponBtn.addEventListener('click', function() {
      const couponCode = couponCodeInput.value.trim();
      applyCoupon(couponCode);
    });
  }
  
  // Proceed to checkout button
  if (proceedCheckoutBtn) {
    proceedCheckoutBtn.addEventListener('click', function(e) {
      if (!window.auth.checkAuth()) {
        e.preventDefault();
        window.utils.showNotification('Faça login para continuar com a compra.', 'warning');
        setTimeout(() => {
          window.location.href = 'login.html?redirect=checkout.html';
        }, 1500);
      }
    });
  }
}

// Add item to cart
function addToCart(productId, quantity = 1) {
  // Check if item already in cart
  const existingItemIndex = cartItems.findIndex(item => item.productId === productId);
  
  if (existingItemIndex !== -1) {
    // Update quantity if already in cart
    cartItems[existingItemIndex].quantity += quantity;
  } else {
    // Add new item to cart
    cartItems.push({
      productId,
      quantity
    });
  }
  
  // Save to localStorage
  saveCart();
  
  // Update UI
  updateCartView();
  
  return true;
}

// Remove item from cart
function removeFromCart(productId) {
  // Filter out the item
  cartItems = cartItems.filter(item => item.productId !== productId);
  
  // Save to localStorage
  saveCart();
  
  // Update UI
  updateCartView();
  
  // Show notification
  window.utils.showNotification('Produto removido do carrinho.', 'info');
  
  return true;
}

// Update item quantity (increment/decrement)
function updateItemQuantity(productId, change) {
  const itemIndex = cartItems.findIndex(item => item.productId === productId);
  
  if (itemIndex !== -1) {
    // Calculate new quantity
    const newQuantity = cartItems[itemIndex].quantity + change;
    
    if (newQuantity <= 0) {
      // Remove item if quantity would be zero or negative
      removeFromCart(productId);
    } else {
      // Update quantity
      cartItems[itemIndex].quantity = newQuantity;
      
      // Save to localStorage
      saveCart();
      
      // Update UI
      updateCartView();
    }
    
    return true;
  }
  
  return false;
}

// Set item to specific quantity
function setItemQuantity(productId, quantity) {
  const itemIndex = cartItems.findIndex(item => item.productId === productId);
  
  if (itemIndex !== -1) {
    // Update quantity
    cartItems[itemIndex].quantity = quantity;
    
    // Save to localStorage
    saveCart();
    
    // Update UI
    updateCartView();
    
    return true;
  }
  
  return false;
}

// Clear cart
function clearCart() {
  // Confirm before clearing
  if (confirm('Tem certeza que deseja limpar o carrinho?')) {
    cartItems = [];
    
    // Save to localStorage
    saveCart();
    
    // Remove coupon as well
    localStorage.removeItem('shopDoVale_coupon');
    
    // Update UI
    updateCartView();
    
    // Show notification
    window.utils.showNotification('Carrinho limpo com sucesso.', 'info');
  }
}

// Apply coupon
function applyCoupon(code) {
  // For demo, accept any code
  if (code.length > 0) {
    // Store coupon
    localStorage.setItem('shopDoVale_coupon', code);
    
    // Update UI
    updateCartSummary();
    
    // Show notification
    window.utils.showNotification('Cupom aplicado com sucesso!', 'success');
    
    // Clear input
    couponCodeInput.value = '';
  } else {
    window.utils.showNotification('Por favor, insira um código de cupom.', 'warning');
  }
}

// Save cart to localStorage
function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
}

// Get cart items
function getCartItems() {
  return cartItems;
}

// Get cart total
function getCartTotal() {
  let total = 0;
  
  cartItems.forEach(item => {
    const product = mockProducts.find(p => p.id === item.productId);
    if (product) {
      total += product.price * item.quantity;
    }
  });
  
  return total;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initCart();
});

// Export to window for global access
window.cart = {
  addToCart,
  removeFromCart,
  updateItemQuantity,
  setItemQuantity,
  clearCart,
  getCartItems,
  getCartTotal
};