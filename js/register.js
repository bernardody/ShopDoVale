// Register Page JavaScript for Shop do Vale

// DOM elements
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');

// Initialize register page
function initRegisterPage() {
  // Check if user is already logged in
  if (window.auth && window.auth.checkAuth()) {
    // Redirect to home page
    window.location.href = '../index.html';
    return;
  }
  
  // Setup register form
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegister);
  }
}

// Handle register form submission
function handleRegister(e) {
  e.preventDefault();
  
  // Clear previous errors
  if (registerError) {
    registerError.style.display = 'none';
  }
  
  // Get form data
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const address = document.getElementById('address').value.trim();
  const role = document.querySelector('input[name="role"]:checked').value;
  const terms = document.getElementById('terms').checked;
  
  // Validate form
  if (!name || !email || !phone || !password || !confirmPassword || !address) {
    showRegisterError('Por favor, preencha todos os campos.');
    return;
  }
  
  if (password !== confirmPassword) {
    showRegisterError('As senhas não coincidem.');
    return;
  }
  
  if (!terms) {
    showRegisterError('Você deve concordar com os Termos de Uso e Política de Privacidade.');
    return;
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showRegisterError('Por favor, insira um e-mail válido.');
    return;
  }
  
  // Disable form and show loading
  setRegisterFormLoading(true);
  
  // Create user data object
  const userData = {
    name,
    email,
    password,
    phone,
    address,
    role
  };
  
  // Attempt registration
  if (window.auth && window.auth.register) {
    window.auth.register(userData)
      .then(() => {
        // Show success notification
        window.utils.showNotification('Cadastro realizado com sucesso!', 'success');
        
        // Redirect to home page after delay
        setTimeout(() => {
          window.location.href = '../index.html';
        }, 1500);
      })
      .catch(error => {
        showRegisterError(error.message || 'Erro ao realizar cadastro. Tente novamente mais tarde.');
        setRegisterFormLoading(false);
      });
  } else {
    // Fallback if auth module not loaded
    setTimeout(() => {
      showRegisterError('Módulo de autenticação não carregado. Tente novamente mais tarde.');
      setRegisterFormLoading(false);
    }, 1000);
  }
}

// Show register error
function showRegisterError(message) {
  if (registerError) {
    registerError.textContent = message;
    registerError.style.display = 'block';
  }
}

// Set loading state for register form
function setRegisterFormLoading(isLoading) {
  if (!registerForm) return;
  
  const submitButton = registerForm.querySelector('button[type="submit"]');
  
  if (isLoading) {
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
    
    // Disable form inputs
    Array.from(registerForm.elements).forEach(element => {
      if (element !== submitButton) {
        element.disabled = true;
      }
    });
  } else {
    submitButton.disabled = false;
    submitButton.textContent = 'Cadastrar';
    
    // Enable form inputs
    Array.from(registerForm.elements).forEach(element => {
      if (element !== submitButton) {
        element.disabled = false;
      }
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initRegisterPage);