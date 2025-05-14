// User Authentication Module

// Constants
const STORAGE_KEY = 'shopDoVale_userData';
const TOKEN_KEY = 'shopDoVale_token';

// Mock users array (in place of a database)
let users = [
  {
    id: '1',
    name: 'João Produtor',
    email: 'joao@produtor.com',
    password: 'senha123',
    role: 'producer',
    address: 'Rua das Fazendas, 123',
    phone: '(11) 98765-4321'
  },
  {
    id: '2',
    name: 'Maria Consumidora',
    email: 'maria@consumidor.com',
    password: 'senha123',
    role: 'consumer',
    address: 'Avenida Central, 456',
    phone: '(11) 91234-5678'
  }
];

// Auth state
let currentUser = null;
let isAuthenticated = false;

// Initialize auth state from localStorage
function initAuth() {
  const storedUser = localStorage.getItem(STORAGE_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  
  if (storedUser && token) {
    currentUser = JSON.parse(storedUser);
    isAuthenticated = true;
    updateUIForAuthenticatedUser();
  } else {
    updateUIForUnauthenticatedUser();
  }
}

// Register a new user
function registerUser(userData) {
  return new Promise((resolve, reject) => {
    // Simulate server delay
    setTimeout(() => {
      // Check if email already exists
      const emailExists = users.some(user => user.email === userData.email);
      if (emailExists) {
        reject({ message: 'E-mail já cadastrado. Tente outro ou faça login.' });
        return;
      }
      
      // Create new user
      const newUser = {
        ...userData,
        id: generateUserId()
      };
      
      // Add to users array (would be a DB insert in production)
      users.push(newUser);
      
      // Set as current user
      currentUser = newUser;
      isAuthenticated = true;
      
      // Store in localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem(TOKEN_KEY, generateToken());
      
      // Update UI
      updateUIForAuthenticatedUser();
      
      resolve(newUser);
    }, 800); // Simulate network delay
  });
}

// Login user
function loginUser(email, password) {
  return new Promise((resolve, reject) => {
    // Simulate server delay
    setTimeout(() => {
      // Find user by email and password
      const user = users.find(u => u.email === email && u.password === password);
      
      if (user) {
        // Set as current user
        currentUser = user;
        isAuthenticated = true;
        
        // Store in localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        localStorage.setItem(TOKEN_KEY, generateToken());
        
        // Update UI
        updateUIForAuthenticatedUser();
        
        resolve(user);
      } else {
        reject({ message: 'E-mail ou senha inválidos. Tente novamente.' });
      }
    }, 800); // Simulate network delay
  });
}

// Logout user
function logoutUser() {
  return new Promise((resolve) => {
    // Simulate server delay
    setTimeout(() => {
      // Clear user data
      currentUser = null;
      isAuthenticated = false;
      
      // Remove from localStorage
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      
      // Update UI
      updateUIForUnauthenticatedUser();
      
      resolve(true);
    }, 300);
  });
}

// Get current user
function getCurrentUser() {
  return currentUser;
}

// Check if user is authenticated
function checkAuth() {
  return isAuthenticated;
}

// Check if user is a producer
function isProducer() {
  return isAuthenticated && currentUser.role === 'producer';
}

// Check if user is a consumer
function isConsumer() {
  return isAuthenticated && currentUser.role === 'consumer';
}

// Update UI for authenticated user
function updateUIForAuthenticatedUser() {
  // Update UI elements based on authentication state
  const userInfoEl = document.getElementById('user-info');
  if (userInfoEl) {
    userInfoEl.innerHTML = `
      <div class="user-profile">
        <div class="user-avatar">${currentUser.name.charAt(0)}</div>
        <div class="user-details">
          <div class="user-name">${currentUser.name}</div>
          <div class="user-role">${currentUser.role === 'producer' ? 'Produtor' : 'Consumidor'}</div>
        </div>
      </div>
      <ul class="user-menu-list">
        <li><a href="${currentUser.role === 'producer' ? 'producer-dashboard.html' : 'profile.html'}"><i class="fas fa-user"></i> Minha Conta</a></li>
        <li><a href="orders.html"><i class="fas fa-shopping-bag"></i> Meus Pedidos</a></li>
        <li><a href="#" id="logout-button"><i class="fas fa-sign-out-alt"></i> Sair</a></li>
      </ul>
    `;

    // Add logout handler
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', function(e) {
        e.preventDefault();
        logoutUser().then(() => {
          window.location.href = '../index.html';
        });
      });
    }
  }

  // Update mobile nav
  const mobileNav = document.getElementById('mobile-nav');
  if (mobileNav) {
    // Replace login/register links with user-specific links
    const mobileLinks = mobileNav.querySelector('ul');
    if (mobileLinks) {
      // Find and remove login/register links
      const loginLink = mobileLinks.querySelector('a[href="login.html"]');
      const registerLink = mobileLinks.querySelector('a[href="register.html"]');
      
      if (loginLink && loginLink.parentElement) {
        mobileLinks.removeChild(loginLink.parentElement);
      }
      
      if (registerLink && registerLink.parentElement) {
        mobileLinks.removeChild(registerLink.parentElement);
      }
      
      // Add user-specific links
      const userLinks = document.createElement('li');
      userLinks.innerHTML = `<a href="${currentUser.role === 'producer' ? 'producer-dashboard.html' : 'profile.html'}">Minha Conta</a>`;
      mobileLinks.appendChild(userLinks);
      
      const ordersLinks = document.createElement('li');
      ordersLinks.innerHTML = `<a href="orders.html">Meus Pedidos</a>`;
      mobileLinks.appendChild(ordersLinks);
      
      const logoutLinks = document.createElement('li');
      logoutLinks.innerHTML = `<a href="#" id="mobile-logout">Sair</a>`;
      mobileLinks.appendChild(logoutLinks);
      
      // Add mobile logout handler
      const mobileLogoutButton = document.getElementById('mobile-logout');
      if (mobileLogoutButton) {
        mobileLogoutButton.addEventListener('click', function(e) {
          e.preventDefault();
          logoutUser().then(() => {
            window.location.href = '../index.html';
          });
        });
      }
    }
  }
}

// Update UI for unauthenticated user
function updateUIForUnauthenticatedUser() {
  // Update UI elements for logged out state
  const userInfoEl = document.getElementById('user-info');
  if (userInfoEl) {
    userInfoEl.innerHTML = `
      <a href="login.html" class="btn btn-outline">Entrar</a>
      <a href="register.html" class="btn btn-primary">Cadastrar</a>
    `;
  }
}

// Helper: Generate a random user ID
function generateUserId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Helper: Generate a fake authentication token
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  
  // Toggle user dropdown
  const userButton = document.getElementById('user-button');
  const userDropdown = document.getElementById('user-dropdown');
  
  if (userButton && userDropdown) {
    userButton.addEventListener('click', function(e) {
      e.stopPropagation();
      userDropdown.classList.toggle('active');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
      userDropdown.classList.remove('active');
    });
    
    // Prevent closing when clicking inside dropdown
    userDropdown.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }
  
  // Toggle mobile navigation
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileNav = document.getElementById('mobile-nav');
  
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', function() {
      mobileNav.classList.toggle('active');
    });
  }
});

// Export to window for global access
window.auth = {
  register: registerUser,
  login: loginUser,
  logout: logoutUser,
  getCurrentUser,
  checkAuth,
  isProducer,
  isConsumer
};