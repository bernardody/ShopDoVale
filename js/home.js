// Home page JavaScript for Shop do Vale

// Mock data for home page
const categories = [
  {
    id: '1',
    name: 'Frutas',
    image: 'https://images.pexels.com/photos/1132047/pexels-photo-1132047.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    count: 24
  },
  {
    id: '2',
    name: 'Verduras',
    image: 'https://images.pexels.com/photos/3025236/pexels-photo-3025236.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    count: 18
  },
  {
    id: '3',
    name: 'Laticínios',
    image: 'https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    count: 12
  },
  {
    id: '4',
    name: 'Grãos',
    image: 'https://images.pexels.com/photos/1537169/pexels-photo-1537169.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    count: 9
  },
  {
    id: '5',
    name: 'Carnes',
    image: 'https://images.pexels.com/photos/1927377/pexels-photo-1927377.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    count: 15
  },
  {
    id: '6',
    name: 'Ovos',
    image: 'https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    count: 7
  }
];

const featuredProducts = [
  {
    id: '1',
    name: 'Maçã Orgânica',
    description: 'Maçãs orgânicas cultivadas sem pesticidas.',
    price: 8.90,
    image: 'https://images.pexels.com/photos/1510392/pexels-photo-1510392.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    quantity: 50,
    category: 'Frutas',
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
    category: 'Verduras',
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
    category: 'Laticínios',
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
    category: 'Grãos',
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
    category: 'Carnes',
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
    category: 'Ovos',
    producerId: '1',
    producer: 'Sítio Bem-Te-Vi'
  }
];

const testimonials = [
  {
    id: '1',
    text: 'Compro frutas e verduras todas as semanas e sempre chegam fresquinhas! A qualidade é excelente e os produtores são muito atenciosos.',
    user: {
      name: 'Maria Silva',
      role: 'Consumidora',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
    }
  },
  {
    id: '2',
    text: 'Desde que comecei a vender no Shop do Vale, meu faturamento aumentou 40%. A plataforma conecta diretamente com os consumidores, eliminando intermediários.',
    user: {
      name: 'João Oliveira',
      role: 'Produtor',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
    }
  },
  {
    id: '3',
    text: 'Adoro a variedade de produtos orgânicos disponíveis. É ótimo poder apoiar produtores locais e ainda consumir alimentos mais saudáveis e frescos.',
    user: {
      name: 'Ana Costa',
      role: 'Consumidora',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg'
    }
  },
  {
    id: '4',
    text: 'Como pequeno produtor, sempre tive dificuldade em encontrar canais de venda. O Shop do Vale simplificou tudo e agora tenho clientes fiéis que compram diretamente da minha fazenda.',
    user: {
      name: 'Pedro Santos',
      role: 'Produtor',
      avatar: 'https://randomuser.me/api/portraits/men/75.jpg'
    }
  }
];

// Load categories
function loadCategories() {
  const categoriesContainer = document.getElementById('categories-container');
  
  if (categoriesContainer) {
    categoriesContainer.innerHTML = categories.map(category => `
      <div class="category-card" data-id="${category.id}">
        <div class="category-image">
          <img src="${category.image}" alt="${category.name}">
        </div>
        <div class="category-content">
          <div class="category-name">${category.name}</div>
          <div class="category-count">${category.count} produtos</div>
        </div>
      </div>
    `).join('');
    
    // Add click event
    const categoryCards = categoriesContainer.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
      card.addEventListener('click', () => {
        const categoryId = card.dataset.id;
        window.location.href = `pages/products.html?category=${categoryId}`;
      });
    });
  }
}

// Load featured products
function loadFeaturedProducts() {
  const productsContainer = document.getElementById('featured-products-container');
  
  if (productsContainer) {
    productsContainer.innerHTML = featuredProducts.map(product => `
      <div class="product-card" data-id="${product.id}">
        <div class="product-image">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-category">${product.category}</div>
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
    
    // Add click event
    const productCards = productsContainer.querySelectorAll('.product-card');
    productCards.forEach(card => {
      card.addEventListener('click', () => {
        const productId = card.dataset.id;
        window.location.href = `pages/product-detail.html?id=${productId}`;
      });
    });
  }
}

// Load testimonials
function loadTestimonials() {
  const testimonialsContainer = document.getElementById('testimonials-container');
  
  if (testimonialsContainer) {
    testimonialsContainer.innerHTML = testimonials.map(testimonial => `
      <div class="testimonial">
        <div class="testimonial-content">
          <p class="testimonial-text">${testimonial.text}</p>
        </div>
        <div class="testimonial-author">
          <div class="testimonial-avatar">
            <img src="${testimonial.user.avatar}" alt="${testimonial.user.name}">
          </div>
          <div class="testimonial-info">
            <h4>${testimonial.user.name}</h4>
            <div class="testimonial-role">${testimonial.user.role}</div>
          </div>
        </div>
      </div>
    `).join('');
  }
}

// Handle newsletter form
function setupNewsletterForm() {
  const newsletterForm = document.getElementById('newsletter-form');
  
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const emailInput = newsletterForm.querySelector('input[type="email"]');
      const email = emailInput.value.trim();
      
      if (email) {
        // Simulate API call
        setTimeout(() => {
          // Clear input
          emailInput.value = '';
          
          // Show success message
          window.utils.showNotification('Obrigado por se inscrever na nossa newsletter!', 'success');
        }, 500);
      }
    });
  }
}

// Initialize animations
function initAnimations() {
  // Add animation classes to elements
  const elementsToAnimate = [
    { selector: '.hero-content', class: 'animate-on-scroll' },
    { selector: '.category-card', class: 'animate-on-scroll' },
    { selector: '.product-card', class: 'animate-on-scroll' },
    { selector: '.step', class: 'animate-on-scroll' },
    { selector: '.testimonial', class: 'animate-on-scroll' }
  ];
  
  elementsToAnimate.forEach(item => {
    const elements = document.querySelectorAll(item.selector);
    elements.forEach(element => {
      element.classList.add(item.class);
    });
  });
  
  // Add animation styles if not in CSS already
  if (!document.getElementById('animation-styles')) {
    const style = document.createElement('style');
    style.id = 'animation-styles';
    style.textContent = `
      .animate-on-scroll {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity 0.5s ease, transform 0.5s ease;
      }
      .animate-on-scroll.animated {
        opacity: 1;
        transform: translateY(0);
      }
    `;
    document.head.appendChild(style);
  }
}

// Document ready
document.addEventListener('DOMContentLoaded', () => {
  // Load data
  loadCategories();
  loadFeaturedProducts();
  loadTestimonials();
  
  // Setup forms
  setupNewsletterForm();
  
  // Initialize animations
  initAnimations();
  
  // Add custom home page styles
  const homeStyles = document.createElement('style');
  homeStyles.textContent = `
    .hero {
      background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('https://images.pexels.com/photos/1153417/pexels-photo-1153417.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1');
    }
  `;
  document.head.appendChild(homeStyles);
});