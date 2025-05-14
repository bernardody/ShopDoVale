// Main JavaScript for Shop do Vale

// Toggle password visibility
function setupPasswordToggles() {
  const togglePasswordButtons = document.querySelectorAll('.toggle-password');
  
  togglePasswordButtons.forEach(button => {
    button.addEventListener('click', function() {
      const target = document.getElementById(this.getAttribute('data-target'));
      
      if (target.type === 'password') {
        target.type = 'text';
        this.classList.remove('fa-eye');
        this.classList.add('fa-eye-slash');
      } else {
        target.type = 'password';
        this.classList.remove('fa-eye-slash');
        this.classList.add('fa-eye');
      }
    });
  });
}

// Update cart count in header
function updateCartCount() {
  const cartItems = JSON.parse(localStorage.getItem('shopDoVale_cart')) || [];
  const cartCount = document.getElementById('cart-count');
  
  if (cartCount) {
    const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
    cartCount.textContent = itemCount;
  }
}

// Format currency (BRL)
function formatCurrency(value) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

// Debounce function for performance
function debounce(func, delay) {
  let timeoutId;
  return function(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

// Show notification
function showNotification(message, type = 'success', duration = 3000) {
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    document.body.appendChild(notification);
    
    // Add styles if not already in CSS
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        .notification {
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 15px 20px;
          border-radius: 4px;
          color: white;
          font-weight: 500;
          z-index: 1000;
          transition: transform 0.3s ease, opacity 0.3s ease;
          transform: translateY(100px);
          opacity: 0;
          max-width: 300px;
        }
        .notification.visible {
          transform: translateY(0);
          opacity: 1;
        }
        .notification.success { background-color: #4CAF50; }
        .notification.error { background-color: #F44336; }
        .notification.info { background-color: #2196F3; }
        .notification.warning { background-color: #FFC107; color: #333; }
      `;
      document.head.appendChild(style);
    }
  }
  
  // Set content and type
  notification.textContent = message;
  notification.className = `notification ${type}`;
  
  // Show notification
  setTimeout(() => {
    notification.classList.add('visible');
  }, 10);
  
  // Hide after duration
  setTimeout(() => {
    notification.classList.remove('visible');
  }, duration);
}

// Load categories for footer
function loadFooterCategories() {
  const footerCategoriesEl = document.getElementById('footer-categories');
  
  if (footerCategoriesEl) {
    // Mock categories
    const categories = [
      { id: '1', name: 'Frutas' },
      { id: '2', name: 'Verduras' },
      { id: '3', name: 'Laticínios' },
      { id: '4', name: 'Grãos' },
      { id: '5', name: 'Carnes' }
    ];
    
    footerCategoriesEl.innerHTML = categories.map(category => `
      <li><a href="products.html?category=${category.id}">${category.name}</a></li>
    `).join('');
  }
}

// Create image element with placeholder fallback
function createImageWithFallback(src, alt, className = '') {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    if (className) img.className = className;
    img.alt = alt;
    
    img.onload = () => resolve(img);
    
    img.onerror = () => {
      // Use placeholder if image fails to load
      img.src = '../assets/images/placeholder.jpg';
      resolve(img);
    };
  });
}

// Get URL parameters helper
function getURLParams() {
  const params = {};
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  
  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }
  
  return params;
}

// Smooth scroll to element
function scrollToElement(elementId, offset = 0) {
  const element = document.getElementById(elementId);
  
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;
    
    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

// Enable tab functionality
function setupTabs() {
  const tabButtons = document.querySelectorAll('.product-info-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (tabButtons.length && tabContents.length) {
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab
        button.classList.add('active');
        
        // Show corresponding content
        const targetId = button.getAttribute('data-tab');
        const targetContent = document.getElementById(targetId);
        
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
    
    // Activate first tab by default
    if (tabButtons[0]) {
      tabButtons[0].click();
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Setup password toggles
  setupPasswordToggles();
  
  // Update cart count
  updateCartCount();
  
  // Load footer categories
  loadFooterCategories();
  
  // Setup tabs if they exist
  setupTabs();
  
  // Add animation on scroll
  const animateOnScrollElements = document.querySelectorAll('.animate-on-scroll');
  
  if (animateOnScrollElements.length) {
    const animateOnScroll = () => {
      animateOnScrollElements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        
        if (elementTop < windowHeight * 0.9) {
          element.classList.add('animated');
        }
      });
    };
    
    // Initial check
    animateOnScroll();
    
    // Add scroll listener
    window.addEventListener('scroll', debounce(animateOnScroll, 100));
  }
});

// Export utility functions to window
window.utils = {
  formatCurrency,
  showNotification,
  createImageWithFallback,
  getURLParams,
  scrollToElement,
  updateCartCount
};