// Product Detail Page JavaScript for Shop do Vale

// Mock product data
const products = [
  {
    id: '1',
    name: 'Maçã Orgânica',
    description: 'Maçãs orgânicas cultivadas sem pesticidas. Doces e suculentas, ótimas para consumo in natura ou em receitas. Cultivadas em sistema agroecológico, respeitando o meio ambiente e sem uso de agrotóxicos.',
    price: 8.90,
    image: 'https://images.pexels.com/photos/1510392/pexels-photo-1510392.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 50,
    category: '1',
    categoryName: 'Frutas',
    producerId: '1',
    producer: 'Sítio Bem-Te-Vi',
    nutritionalInfo: 'Rico em fibras e vitamina C. Contém aproximadamente 52 calorias por 100g.',
    storage: 'Conservar em local fresco ou na gaveta da geladeira por até 2 semanas.',
    weight: '1kg (aproximadamente 6 unidades)',
    origin: 'Serra da Mantiqueira, MG'
  },
  {
    id: '2',
    name: 'Alface Crespa',
    description: 'Alface crespa fresca, colhida no mesmo dia. Folhas crocantes e saborosas, ideais para saladas. Cultivada em sistema hidropônico, garantindo qualidade e limpeza.',
    price: 3.50,
    image: 'https://images.pexels.com/photos/2894268/pexels-photo-2894268.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 30,
    category: '2',
    categoryName: 'Verduras',
    producerId: '1',
    producer: 'Sítio Bem-Te-Vi',
    nutritionalInfo: 'Baixo teor calórico, rico em folato e vitamina K. Contém aproximadamente 15 calorias por 100g.',
    storage: 'Manter refrigerado em saco plástico perfurado por até 1 semana.',
    weight: '1 unidade (aproximadamente 250g)',
    origin: 'Região de Ibiúna, SP'
  },
  {
    id: '3',
    name: 'Queijo Minas',
    description: 'Queijo minas artesanal produzido com leite fresco. Textura macia e sabor suave, perfeito para café da manhã ou lanche. Produzido seguindo técnicas tradicionais mineiras, com leite de vacas criadas a pasto.',
    price: 25.00,
    image: 'https://images.pexels.com/photos/773253/pexels-photo-773253.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 15,
    category: '3',
    categoryName: 'Laticínios',
    producerId: '1',
    producer: 'Fazenda Boa Vista',
    nutritionalInfo: 'Rico em proteínas e cálcio. Contém aproximadamente 320 calorias por 100g.',
    storage: 'Manter refrigerado entre 2°C e 8°C por até 10 dias.',
    weight: '500g',
    origin: 'Serra do Salitre, MG'
  },
  {
    id: '4',
    name: 'Feijão Preto',
    description: 'Feijão preto orgânico de alta qualidade. Grãos selecionados e limpos, ideais para feijoada, sopas e acompanhamentos. Cultivado sem o uso de agrotóxicos e fertilizantes químicos.',
    price: 12.90,
    image: 'https://images.pexels.com/photos/7439169/pexels-photo-7439169.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 40,
    category: '4',
    categoryName: 'Grãos',
    producerId: '2',
    producer: 'Cooperativa Rural',
    nutritionalInfo: 'Rico em proteínas, fibras e ferro. Contém aproximadamente 340 calorias por 100g.',
    storage: 'Armazenar em local seco e fresco, em recipiente fechado, por até 6 meses.',
    weight: '1kg',
    origin: 'Vale do Paraíba, SP'
  },
  {
    id: '5',
    name: 'Carne Bovina',
    description: 'Carne bovina de animais criados a pasto. Corte fresco e de alta qualidade, ideal para churrascos e pratos especiais. Proveniente de gado criado de forma sustentável, sem confinamento.',
    price: 45.00,
    image: 'https://images.pexels.com/photos/618775/pexels-photo-618775.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 10,
    category: '5',
    categoryName: 'Carnes',
    producerId: '3',
    producer: 'Fazenda Santa Clara',
    nutritionalInfo: 'Rico em proteínas, ferro e vitamina B12. Contém aproximadamente 250 calorias por 100g.',
    storage: 'Manter refrigerado entre 0°C e 4°C por até 5 dias, ou congelar por até 3 meses.',
    weight: '1kg (alcatra)',
    origin: 'Pantanal, MS'
  }
];

// DOM elements
const productDetailContainer = document.getElementById('product-detail');
const relatedProductsContainer = document.getElementById('related-products');
const productNameBreadcrumb = document.getElementById('product-name-breadcrumb');

// Initialize product detail page
function initProductDetailPage() {
  // Get product ID from URL
  const params = window.utils.getURLParams();
  const productId = params.id;
  
  if (!productId) {
    // Redirect to products page if no ID provided
    window.location.href = 'products.html';
    return;
  }
  
  // Find product
  const product = products.find(p => p.id === productId);
  
  if (!product) {
    // Show not found message
    renderProductNotFound();
    return;
  }
  
  // Render product details
  renderProductDetail(product);
  
  // Render related products
  renderRelatedProducts(product);
  
  // Update breadcrumb
  if (productNameBreadcrumb) {
    productNameBreadcrumb.textContent = product.name;
  }
}

// Render product detail
function renderProductDetail(product) {
  if (!productDetailContainer) return;
  
  productDetailContainer.innerHTML = `
    <div class="product-detail-image">
      <img src="${product.image}" alt="${product.name}">
    </div>
    <div class="product-detail-content">
      <div class="product-detail-category">${product.categoryName}</div>
      <h1 class="product-detail-title">${product.name}</h1>
      <div class="product-detail-meta">
        <span><i class="fas fa-store"></i> ${product.producer}</span>
        <span><i class="fas fa-map-marker-alt"></i> ${product.origin}</span>
      </div>
      <div class="product-detail-price">${window.utils.formatCurrency(product.price)}</div>
      <p class="product-detail-description">${product.description}</p>
      
      <div class="product-actions">
        <div class="quantity-control">
          <button class="quantity-btn" id="decrease-quantity">-</button>
          <input type="number" id="product-quantity" class="quantity-input" value="1" min="1" max="${product.quantity}">
          <button class="quantity-btn" id="increase-quantity">+</button>
        </div>
        <button class="btn btn-primary" id="add-to-cart">
          <i class="fas fa-shopping-cart"></i> Adicionar ao carrinho
        </button>
      </div>
      
      <div class="product-detail-stock ${product.quantity > 10 ? 'stock-available' : product.quantity > 0 ? 'stock-low' : 'stock-out'}">
        <i class="fas ${product.quantity > 0 ? 'fa-check-circle' : 'fa-times-circle'}"></i>
        ${product.quantity > 10 ? 'Em estoque' : product.quantity > 0 ? 'Estoque baixo - apenas ' + product.quantity + ' unidades' : 'Fora de estoque'}
      </div>
      
      <div class="product-info">
        <div class="product-info-header">
          <div class="product-info-tab active" data-tab="tab-details">Detalhes</div>
          <div class="product-info-tab" data-tab="tab-nutritional">Informações Nutricionais</div>
          <div class="product-info-tab" data-tab="tab-storage">Armazenamento</div>
        </div>
        
        <div id="tab-details" class="tab-content active">
          <h4>Detalhes do Produto</h4>
          <p><strong>Peso:</strong> ${product.weight}</p>
          <p><strong>Origem:</strong> ${product.origin}</p>
          <p><strong>Produtor:</strong> ${product.producer}</p>
        </div>
        
        <div id="tab-nutritional" class="tab-content">
          <h4>Informações Nutricionais</h4>
          <p>${product.nutritionalInfo}</p>
        </div>
        
        <div id="tab-storage" class="tab-content">
          <h4>Armazenamento</h4>
          <p>${product.storage}</p>
        </div>
      </div>
    </div>
  `;
  
  // Setup quantity controls
  const quantityInput = document.getElementById('product-quantity');
  const decreaseBtn = document.getElementById('decrease-quantity');
  const increaseBtn = document.getElementById('increase-quantity');
  
  if (quantityInput && decreaseBtn && increaseBtn) {
    decreaseBtn.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value, 10);
      if (currentValue > 1) {
        quantityInput.value = currentValue - 1;
      }
    });
    
    increaseBtn.addEventListener('click', () => {
      const currentValue = parseInt(quantityInput.value, 10);
      if (currentValue < product.quantity) {
        quantityInput.value = currentValue + 1;
      }
    });
    
    // Validate quantity input
    quantityInput.addEventListener('change', () => {
      let value = parseInt(quantityInput.value, 10);
      
      if (isNaN(value) || value < 1) {
        value = 1;
      } else if (value > product.quantity) {
        value = product.quantity;
      }
      
      quantityInput.value = value;
    });
  }
  
  // Setup add to cart button
  const addToCartBtn = document.getElementById('add-to-cart');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      if (product.quantity <= 0) {
        window.utils.showNotification('Este produto está fora de estoque.', 'error');
        return;
      }
      
      const quantity = parseInt(quantityInput.value, 10);
      if (window.cart && window.cart.addToCart) {
        const success = window.cart.addToCart(product.id, quantity);
        
        if (success) {
          window.utils.showNotification(`${product.name} adicionado ao carrinho.`, 'success');
        }
      } else {
        // Fallback if cart module not loaded
        const cartItems = JSON.parse(localStorage.getItem('shopDoVale_cart')) || [];
        
        // Check if item already in cart
        const existingItemIndex = cartItems.findIndex(item => item.productId === product.id);
        
        if (existingItemIndex !== -1) {
          // Update quantity if already in cart
          cartItems[existingItemIndex].quantity += quantity;
        } else {
          // Add new item to cart
          cartItems.push({
            productId: product.id,
            quantity
          });
        }
        
        // Save to localStorage
        localStorage.setItem('shopDoVale_cart', JSON.stringify(cartItems));
        
        // Update cart count
        window.utils.updateCartCount();
        
        // Show notification
        window.utils.showNotification(`${product.name} adicionado ao carrinho.`, 'success');
      }
    });
  }
  
  // Setup tabs
  const tabButtons = document.querySelectorAll('.product-info-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
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
}

// Render product not found
function renderProductNotFound() {
  if (!productDetailContainer) return;
  
  productDetailContainer.innerHTML = `
    <div class="product-not-found">
      <i class="fas fa-exclamation-circle"></i>
      <h2>Produto não encontrado</h2>
      <p>O produto que você está procurando não existe ou foi removido.</p>
      <a href="products.html" class="btn btn-primary">Ver todos os produtos</a>
    </div>
  `;
  
  // Add styles if not in CSS
  const notFoundStyles = document.createElement('style');
  notFoundStyles.textContent = `
    .product-not-found {
      text-align: center;
      padding: 3rem 1rem;
    }
    .product-not-found i {
      font-size: 3rem;
      color: var(--color-gray-400);
      margin-bottom: 1rem;
    }
    .product-not-found h2 {
      margin-bottom: 0.5rem;
    }
    .product-not-found p {
      margin-bottom: 1.5rem;
      color: var(--color-gray-600);
    }
  `;
  document.head.appendChild(notFoundStyles);
  
  // Update breadcrumb
  if (productNameBreadcrumb) {
    productNameBreadcrumb.textContent = 'Produto não encontrado';
  }
}

// Render related products
function renderRelatedProducts(product) {
  if (!relatedProductsContainer) return;
  
  // Find products in the same category
  const relatedProducts = products.filter(p => 
    p.category === product.category && p.id !== product.id
  ).slice(0, 4); // Limit to 4 products
  
  // If no related products, hide section
  if (relatedProducts.length === 0) {
    const section = relatedProductsContainer.closest('.related-products');
    if (section) {
      section.style.display = 'none';
    }
    return;
  }
  
  // Render related products
  relatedProductsContainer.innerHTML = relatedProducts.map(product => `
    <div class="product-card" data-id="${product.id}">
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
    </div>
  `).join('');
  
  // Add click events
  const productCards = relatedProductsContainer.querySelectorAll('.product-card');
  productCards.forEach(card => {
    card.addEventListener('click', () => {
      const productId = card.dataset.id;
      window.location.href = `product-detail.html?id=${productId}`;
    });
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initProductDetailPage);