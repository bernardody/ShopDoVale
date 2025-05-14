// Products Page JavaScript for Shop do Vale

// Mock data
const products = [
  {
    id: '1',
    name: 'Maçã Orgânica',
    description: 'Maçãs orgânicas cultivadas sem pesticidas.',
    price: 8.90,
    image: 'https://images.pexels.com/photos/1510392/pexels-photo-1510392.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 50,
    category: '1',
    categoryName: 'Frutas',
    producerId: '1',
    producer: 'Sítio Bem-Te-Vi'
  },
  {
    id: '2',
    name: 'Alface Crespa',
    description: 'Alface crespa fresca, colhida no mesmo dia.',
    price: 3.50,
    image: 'https://images.pexels.com/photos/2894268/pexels-photo-2894268.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 30,
    category: '2',
    categoryName: 'Verduras',
    producerId: '1',
    producer: 'Sítio Bem-Te-Vi'
  },
  {
    id: '3',
    name: 'Queijo Minas',
    description: 'Queijo minas artesanal produzido com leite fresco.',
    price: 25.00,
    image: 'https://images.pexels.com/photos/773253/pexels-photo-773253.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 15,
    category: '3',
    categoryName: 'Laticínios',
    producerId: '1',
    producer: 'Fazenda Boa Vista'
  },
  {
    id: '4',
    name: 'Feijão Preto',
    description: 'Feijão preto orgânico de alta qualidade.',
    price: 12.90,
    image: 'https://images.pexels.com/photos/7439169/pexels-photo-7439169.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 40,
    category: '4',
    categoryName: 'Grãos',
    producerId: '2',
    producer: 'Cooperativa Rural'
  },
  {
    id: '5',
    name: 'Carne Bovina',
    description: 'Carne bovina de animais criados a pasto.',
    price: 45.00,
    image: 'https://images.pexels.com/photos/618775/pexels-photo-618775.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 10,
    category: '5',
    categoryName: 'Carnes',
    producerId: '3',
    producer: 'Fazenda Santa Clara'
  },
  {
    id: '6',
    name: 'Ovos Caipira',
    description: 'Ovos de galinhas criadas em ambiente livre.',
    price: 15.90,
    image: 'https://images.pexels.com/photos/6941042/pexels-photo-6941042.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 25,
    category: '6',
    categoryName: 'Ovos',
    producerId: '1',
    producer: 'Sítio Bem-Te-Vi'
  },
  {
    id: '7',
    name: 'Banana Prata',
    description: 'Bananas prata maduras e doces.',
    price: 5.50,
    image: 'https://images.pexels.com/photos/1093038/pexels-photo-1093038.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 35,
    category: '1',
    categoryName: 'Frutas',
    producerId: '2',
    producer: 'Cooperativa Rural'
  },
  {
    id: '8',
    name: 'Cenoura',
    description: 'Cenouras frescas cultivadas sem agrotóxicos.',
    price: 4.20,
    image: 'https://images.pexels.com/photos/143133/pexels-photo-143133.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 28,
    category: '2',
    categoryName: 'Verduras',
    producerId: '1',
    producer: 'Sítio Bem-Te-Vi'
  },
  {
    id: '9',
    name: 'Iogurte Natural',
    description: 'Iogurte natural produzido com leite fresco.',
    price: 7.90,
    image: 'https://images.pexels.com/photos/373882/pexels-photo-373882.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 20,
    category: '3',
    categoryName: 'Laticínios',
    producerId: '3',
    producer: 'Fazenda Santa Clara'
  },
  {
    id: '10',
    name: 'Arroz Integral',
    description: 'Arroz integral orgânico de grãos longos.',
    price: 9.90,
    image: 'https://images.pexels.com/photos/4110251/pexels-photo-4110251.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 45,
    category: '4',
    categoryName: 'Grãos',
    producerId: '2',
    producer: 'Cooperativa Rural'
  }
];

const categories = [
  { id: '1', name: 'Frutas' },
  { id: '2', name: 'Verduras' },
  { id: '3', name: 'Laticínios' },
  { id: '4', name: 'Grãos' },
  { id: '5', name: 'Carnes' },
  { id: '6', name: 'Ovos' }
];

const producers = [
  { id: '1', name: 'Sítio Bem-Te-Vi' },
  { id: '2', name: 'Cooperativa Rural' },
  { id: '3', name: 'Fazenda Santa Clara' }
];

// State
let filteredProducts = [...products];
let currentFilters = {
  categories: [],
  minPrice: 0,
  maxPrice: 100,
  producers: []
};
let currentSort = 'name-asc';
let currentPage = 1;
const productsPerPage = 6;

// DOM elements
const productsGrid = document.getElementById('products-grid');
const productsCount = document.getElementById('products-count');
const categoryFilters = document.getElementById('category-filters');
const producerFilters = document.getElementById('producer-filters');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const priceRange = document.getElementById('price-range');
const applyFiltersBtn = document.getElementById('apply-filters');
const clearFiltersBtn = document.getElementById('clear-filters');
const sortSelect = document.getElementById('sort-by');
const paginationContainer = document.getElementById('pagination');
const searchInput = document.getElementById('search-input');

// Initialize products page
function initProductsPage() {
  // Load URL parameters
  loadUrlParams();
  
  // Render filters
  renderCategoryFilters();
  renderProducerFilters();
  
  // Set price range max value
  const maxProductPrice = Math.max(...products.map(p => p.price));
  priceRange.max = maxPriceInput.max = Math.ceil(maxProductPrice);
  maxPriceInput.value = Math.ceil(maxProductPrice);
  currentFilters.maxPrice = Math.ceil(maxProductPrice);
  
  // Apply initial filters and show products
  applyFilters();
  
  // Set up event listeners
  setupEventListeners();
}

// Load URL parameters
function loadUrlParams() {
  const params = window.utils.getURLParams();
  
  // Apply category filter from URL if present
  if (params.category) {
    currentFilters.categories = [params.category];
  }
  
  // Apply producer filter from URL if present
  if (params.producer) {
    currentFilters.producers = [params.producer];
  }
  
  // Apply search query from URL if present
  if (params.search && searchInput) {
    searchInput.value = params.search;
  }
}

// Render category filters
function renderCategoryFilters() {
  if (categoryFilters) {
    categoryFilters.innerHTML = categories.map(category => `
      <div class="filter-option">
        <input type="checkbox" id="category-${category.id}" value="${category.id}" 
          ${currentFilters.categories.includes(category.id) ? 'checked' : ''}>
        <label for="category-${category.id}">${category.name}</label>
      </div>
    `).join('');
  }
}

// Render producer filters
function renderProducerFilters() {
  if (producerFilters) {
    producerFilters.innerHTML = producers.map(producer => `
      <div class="filter-option">
        <input type="checkbox" id="producer-${producer.id}" value="${producer.id}" 
          ${currentFilters.producers.includes(producer.id) ? 'checked' : ''}>
        <label for="producer-${producer.id}">${producer.name}</label>
      </div>
    `).join('');
  }
}

// Apply filters
function applyFilters() {
  // Get filter values
  const categoryCheckboxes = document.querySelectorAll('#category-filters input:checked');
  const producerCheckboxes = document.querySelectorAll('#producer-filters input:checked');
  
  // Update filter state
  currentFilters.categories = Array.from(categoryCheckboxes).map(cb => cb.value);
  currentFilters.producers = Array.from(producerCheckboxes).map(cb => cb.value);
  currentFilters.minPrice = parseFloat(minPriceInput.value);
  currentFilters.maxPrice = parseFloat(maxPriceInput.value);
  
  // Apply search query if present
  const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
  
  // Filter products
  filteredProducts = products.filter(product => {
    // Category filter
    if (currentFilters.categories.length > 0 && !currentFilters.categories.includes(product.category)) {
      return false;
    }
    
    // Producer filter
    if (currentFilters.producers.length > 0 && !currentFilters.producers.includes(product.producerId)) {
      return false;
    }
    
    // Price filter
    if (product.price < currentFilters.minPrice || product.price > currentFilters.maxPrice) {
      return false;
    }
    
    // Search query
    if (searchQuery && !product.name.toLowerCase().includes(searchQuery) && 
        !product.description.toLowerCase().includes(searchQuery)) {
      return false;
    }
    
    return true;
  });
  
  // Sort products
  sortProducts();
  
  // Reset to first page
  currentPage = 1;
  
  // Render products
  renderProducts();
  renderPagination();
  
  // Update count
  if (productsCount) {
    productsCount.textContent = `${filteredProducts.length} produtos encontrados`;
  }
}

// Sort products
function sortProducts() {
  switch (currentSort) {
    case 'name-asc':
      filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'price-asc':
      filteredProducts.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      filteredProducts.sort((a, b) => b.price - a.price);
      break;
  }
}

// Render products
function renderProducts() {
  if (!productsGrid) return;
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * productsPerPage;
  const endIndex = startIndex + productsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  // Clear existing content
  productsGrid.innerHTML = '';
  
  // If no products, show message
  if (paginatedProducts.length === 0) {
    productsGrid.innerHTML = `
      <div class="no-products">
        <p>Nenhum produto encontrado com os filtros selecionados.</p>
        <button class="btn btn-primary" id="reset-filters">Limpar filtros</button>
      </div>
    `;
    
    // Add click event for reset button
    const resetButton = document.getElementById('reset-filters');
    if (resetButton) {
      resetButton.addEventListener('click', clearFilters);
    }
    
    return;
  }
  
  // Render each product
  paginatedProducts.forEach(product => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.dataset.id = product.id;
    
    productCard.innerHTML = `
      <div class="product-image">
        <img src="${product.image}" alt="${product.name}">
        <div class="product-category">${product.categoryName}</div>
      </div>
      <div class="product-content">
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">${window.utils.formatCurrency(product.price)}</div>
        <div class="product-footer">
          <div class="product-producer">${product.producer}</div>
          <div class="product-stock ${product.quantity > 10 ? 'stock-available' : product.quantity > 0 ? 'stock-low' : 'stock-out'}">
            ${product.quantity > 10 ? 'Disponível' : product.quantity > 0 ? 'Estoque baixo' : 'Indisponível'}
          </div>
        </div>
      </div>
    `;
    
    // Add to grid
    productsGrid.appendChild(productCard);
    
    // Add click event
    productCard.addEventListener('click', () => {
      window.location.href = `product-detail.html?id=${product.id}`;
    });
  });
}

// Render pagination
function renderPagination() {
  if (!paginationContainer) return;
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  
  // Clear existing pagination
  paginationContainer.innerHTML = '';
  
  // If only one page, don't show pagination
  if (totalPages <= 1) return;
  
  // Create pagination
  for (let i = 1; i <= totalPages; i++) {
    const pageItem = document.createElement('div');
    pageItem.className = `pagination-item${i === currentPage ? ' active' : ''}`;
    pageItem.textContent = i;
    
    // Add click event
    pageItem.addEventListener('click', () => {
      currentPage = i;
      renderProducts();
      renderPagination();
      
      // Scroll to top of products
      window.scrollTo({
        top: productsGrid.offsetTop - 100,
        behavior: 'smooth'
      });
    });
    
    paginationContainer.appendChild(pageItem);
  }
}

// Clear filters
function clearFilters() {
  // Reset filter state
  currentFilters = {
    categories: [],
    minPrice: 0,
    maxPrice: parseFloat(priceRange.max),
    producers: []
  };
  
  // Reset form elements
  const checkboxes = document.querySelectorAll('#category-filters input, #producer-filters input');
  checkboxes.forEach(cb => cb.checked = false);
  
  minPriceInput.value = 0;
  maxPriceInput.value = priceRange.max;
  priceRange.value = priceRange.max;
  
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Apply filters
  applyFilters();
}

// Setup event listeners
function setupEventListeners() {
  // Apply filters button
  if (applyFiltersBtn) {
    applyFiltersBtn.addEventListener('click', applyFilters);
  }
  
  // Clear filters button
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', clearFilters);
  }
  
  // Sort select
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      applyFilters();
    });
  }
  
  // Price range slider
  if (priceRange) {
    priceRange.addEventListener('input', () => {
      maxPriceInput.value = priceRange.value;
    });
  }
  
  // Price inputs
  if (minPriceInput && maxPriceInput) {
    minPriceInput.addEventListener('change', () => {
      if (parseFloat(minPriceInput.value) > parseFloat(maxPriceInput.value)) {
        minPriceInput.value = maxPriceInput.value;
      }
    });
    
    maxPriceInput.addEventListener('change', () => {
      if (parseFloat(maxPriceInput.value) < parseFloat(minPriceInput.value)) {
        maxPriceInput.value = minPriceInput.value;
      }
      priceRange.value = maxPriceInput.value;
    });
  }
  
  // Search input
  if (searchInput) {
    searchInput.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        applyFilters();
      }
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProductsPage);