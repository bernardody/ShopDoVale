// Login Page JavaScript for Shop do Vale

// DOM elements
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

// Initialize login page
function initLoginPage() {
  // Check if user is already logged in
  if (window.auth && window.auth.checkAuth()) {
    // Redirect to home page or previous page
    redirectAfterLogin();
    return;
  }
  
  // Setup login form
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

// Handle login form submission
function handleLogin(e) {
  e.preventDefault();
  
  // Clear previous errors
  if (loginError) {
    loginError.style.display = 'none';
  }
  
  // Get form data
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const remember = document.getElementById('remember') ? document.getElementById('remember').checked : false;
  
  // Validate form
  if (!email || !password) {
    showLoginError('Por favor, preencha todos os campos.');
    return;
  }
  
  // Disable form and show loading
  setLoginFormLoading(true);
  
  // Attempt login
  if (window.auth && window.auth.login) {
    window.auth.login(email, password)
      .then(() => {
        // Redirect after successful login
        redirectAfterLogin();
      })
      .catch(error => {
        showLoginError(error.message || 'Erro ao fazer login. Verifique suas credenciais.');
        setLoginFormLoading(false);
      });
  } else {
    // Fallback if auth module not loaded
    setTimeout(() => {
      showLoginError('Módulo de autenticação não carregado. Tente novamente mais tarde.');
      setLoginFormLoading(false);
    }, 1000);
  }
}

// Show login error
function showLoginError(message) {
  if (loginError) {
    loginError.textContent = message;
    loginError.style.display = 'block';
  }
}

// Set loading state for login form
function setLoginFormLoading(isLoading) {
  if (!loginForm) return;
  
  const submitButton = loginForm.querySelector('button[type="submit"]');
  
  if (isLoading) {
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
    
    // Disable form inputs
    Array.from(loginForm.elements).forEach(element => {
      if (element !== submitButton) {
        element.disabled = true;
      }
    });
  } else {
    submitButton.disabled = false;
    submitButton.textContent = 'Entrar';
    
    // Enable form inputs
    Array.from(loginForm.elements).forEach(element => {
      if (element !== submitButton) {
        element.disabled = false;
      }
    });
  }
}

// Redirect after login
function redirectAfterLogin() {
  // Check for redirect parameter
  const params = window.utils.getURLParams();
  
  if (params.redirect) {
    window.location.href = params.redirect;
  } else {
    // Redirect to home page
    window.location.href = '../index.html';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initLoginPage);