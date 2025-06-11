// ProductDetail.js - Página de detalhes do produto
// =====================================================

const ProductDetailPage = (() => {
    // Estado interno
    let product = null;
    let relatedProducts = [];
    let selectedQuantity = 1;
    let selectedImageIndex = 0;
    let isInWishlist = false;
    
    // Inicializa a página
    const init = async () => {
        // Obtém ID do produto da URL
        const productId = getProductIdFromURL();
        
        if (!productId) {
            showError('Produto não encontrado');
            return;
        }
        
        // Carrega componentes comuns
        await loadComponents();
        
        // Carrega dados do produto
        await loadProduct(productId);
    };
    
    // Obtém ID do produto da URL
    const getProductIdFromURL = () => {
        const pathParts = window.location.pathname.split('/');
        const productIndex = pathParts.indexOf('produto');
        
        if (productIndex !== -1 && pathParts[productIndex + 1]) {
            return pathParts[productIndex + 1];
        }
        
        return null;
    };
    
    // Carrega componentes comuns
    const loadComponents = async () => {
        // Navbar
        const navbar = await Utils.loadComponent('navbar');
        document.getElementById('navbar-container').innerHTML = navbar;
        Navbar.init();
        
        // Footer
        const footer = await Utils.loadComponent('footer');
        document.getElementById('footer-container').innerHTML = footer;
        
        // Product Card Template
        const productCard = await Utils.loadComponent('product-card');
        const template = document.getElementById('product-card-template');
        template.innerHTML = productCard;
        
        // Cart Widget
        CartWidget.init();
    };
    
    // Carrega dados do produto
    const loadProduct = async (productId) => {
        const container = document.getElementById('product-detail');
        
        try {
            // Busca produto
            product = await ProductService.getById(productId);
            
            // Atualiza título da página
            document.title = `${product.nome} - Shop do Vale`;
            
            // Atualiza breadcrumb
            updateBreadcrumb();
            
            // Renderiza produto
            renderProduct();
            
            // Carrega produtos relacionados
            loadRelatedProducts(productId);
            
        } catch (error) {
            console.error('Erro ao carregar produto:', error);
            showError('Erro ao carregar produto');
        }
    };
    
    // Atualiza breadcrumb
    const updateBreadcrumb = () => {
        const breadcrumbCurrent = document.getElementById('breadcrumb-current');
        breadcrumbCurrent.textContent = product.nome;
        
        // Adiciona link da categoria se existir
        const breadcrumb = document.getElementById('breadcrumb');
        if (product.categoria) {
            const categoryLink = document.createElement('a');
            categoryLink.href = `/produtos?categoria=${encodeURIComponent(product.categoria)}`;
            categoryLink.textContent = product.categoria;
            
            const separator = document.createElement('span');
            separator.className = 'material-icons';
            separator.textContent = 'chevron_right';
            
            breadcrumb.insertBefore(separator, breadcrumbCurrent);
            breadcrumb.insertBefore(categoryLink, separator);
        }
    };
    
    // Renderiza produto
    const renderProduct = () => {
        const container = document.getElementById('product-detail');
        
        // Verifica estoque
        const inStock = product.estoque > 0;
        const lowStock = product.estoque > 0 && product.estoque <= 5;
        
        // Imagens do produto
        const images = product.imagens || [product.imagem || '/assets/images/placeholders/product.jpg'];
        
        container.innerHTML = `
            <div class="product-detail-grid">
                <!-- Imagens -->
                <div class="product-images">
                    <div class="main-image">
                        <img src="${images[0]}" alt="${Utils.escapeHtml(product.nome)}" id="main-image">
                    </div>
                    
                    ${images.length > 1 ? `
                        <div class="image-thumbnails">
                            ${images.map((img, index) => `
                                <div class="thumbnail ${index === 0 ? 'active' : ''}" 
                                     onclick="ProductDetailPage.selectImage(${index})">
                                    <img src="${img}" alt="Imagem ${index + 1}">
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <!-- Informações -->
                <div class="product-info">
                    <div class="product-header">
                        <div class="product-category">${Utils.escapeHtml(product.categoria)}</div>
                        <h1 class="product-title">${Utils.escapeHtml(product.nome)}</h1>
                        
                        <div class="product-producer">
                            <img src="${product.produtor?.avatar || '/assets/images/placeholders/user.jpg'}" 
                                 alt="${Utils.escapeHtml(product.produtor?.nome)}">
                            <div class="product-producer-info">
                                <div class="product-producer-name">${Utils.escapeHtml(product.produtor?.nome || 'Produtor')}</div>
                                <div class="product-producer-location">
                                    <span class="material-icons">location_on</span>
                                    ${Utils.escapeHtml(product.produtor?.cidade || 'Local')}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Preço -->
                    <div class="product-pricing">
                        ${product.desconto > 0 ? `
                            <span class="product-old-price">${Utils.formatCurrency(product.preco)}</span>
                            <span class="product-discount">-${product.desconto}%</span>
                        ` : ''}
                        <span class="product-price">
                            ${Utils.formatCurrency(product.desconto > 0 
                                ? product.preco * (1 - product.desconto / 100) 
                                : product.preco)}
                        </span>
                        <span class="product-unit">/${product.unidade || 'un'}</span>
                    </div>
                    
                    <!-- Estoque -->
                    <div class="stock-info ${inStock ? (lowStock ? 'low-stock' : 'in-stock') : 'out-stock'}">
                        <span class="material-icons">
                            ${inStock ? 'check_circle' : 'cancel'}
                        </span>
                        <span>
                            ${inStock 
                                ? (lowStock ? `Apenas ${product.estoque} disponíveis` : 'Em estoque') 
                                : 'Produto esgotado'}
                        </span>
                    </div>
                    
                    <!-- Opções de compra -->
                    <div class="purchase-options">
                        ${inStock ? `
                            <div class="quantity-selector">
                                <label>Quantidade:</label>
                                <div class="quantity-controls">
                                    <button onclick="ProductDetailPage.updateQuantity(-1)">
                                        <span class="material-icons">remove</span>
                                    </button>
                                    <input type="number" 
                                           id="quantity-input" 
                                           value="1" 
                                           min="1" 
                                           max="${product.estoque}"
                                           onchange="ProductDetailPage.setQuantity(this.value)">
                                    <button onclick="ProductDetailPage.updateQuantity(1)">
                                        <span class="material-icons">add</span>
                                    </button>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="purchase-actions">
                            <button class="btn btn-primary" 
                                    onclick="ProductDetailPage.addToCart()"
                                    ${!inStock ? 'disabled' : ''}>
                                <span class="material-icons">shopping_cart</span>
                                ${inStock ? 'Adicionar ao Carrinho' : 'Produto Esgotado'}
                            </button>
                            
                            <button class="btn btn-outline btn-wishlist" 
                                    onclick="ProductDetailPage.toggleWishlist()">
                                <span class="material-icons">
                                    ${isInWishlist ? 'favorite' : 'favorite_border'}
                                </span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Detalhes -->
                    <div class="product-details">
                        ${product.peso ? `
                            <div class="detail-item">
                                <span class="material-icons">scale</span>
                                <span>Peso: ${product.peso}</span>
                            </div>
                        ` : ''}
                        
                        ${product.origem ? `
                            <div class="detail-item">
                                <span class="material-icons">place</span>
                                <span>Origem: ${Utils.escapeHtml(product.origem)}</span>
                            </div>
                        ` : ''}
                        
                        ${product.validade ? `
                            <div class="detail-item">
                                <span class="material-icons">event</span>
                                <span>Validade: ${Utils.formatDate(product.validade)}</span>
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Tabs -->
                    <div class="product-tabs">
                        <div class="tabs-header">
                            <button class="tab-button active" onclick="ProductDetailPage.selectTab('description')">
                                Descrição
                            </button>
                            <button class="tab-button" onclick="ProductDetailPage.selectTab('details')">
                                Detalhes
                            </button>
                            <button class="tab-button" onclick="ProductDetailPage.selectTab('shipping')">
                                Envio
                            </button>
                        </div>
                        
                        <div class="tabs-content">
                            <div class="tab-panel active" id="tab-description">
                                <h3>Descrição do Produto</h3>
                                <p>${Utils.escapeHtml(product.descricao || 'Sem descrição disponível.')}</p>
                                
                                ${product.beneficios ? `
                                    <h3>Benefícios</h3>
                                    <p>${Utils.escapeHtml(product.beneficios)}</p>
                                ` : ''}
                            </div>
                            
                            <div class="tab-panel" id="tab-details">
                                <h3>Informações Técnicas</h3>
                                <p>
                                    ${product.informacoes_tecnicas || 'Informações técnicas não disponíveis.'}
                                </p>
                            </div>
                            
                            <div class="tab-panel" id="tab-shipping">
                                <h3>Informações de Envio</h3>
                                <p>
                                    <strong>Prazo de entrega:</strong> 1-3 dias úteis para a região<br>
                                    <strong>Embalagem:</strong> Produto embalado com cuidado para manter a qualidade<br>
                                    <strong>Política de devolução:</strong> Aceitamos devoluções em até 7 dias
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };
    
    // Seleciona imagem
    const selectImage = (index) => {
        const images = product.imagens || [product.imagem];
        selectedImageIndex = index;
        
        // Atualiza imagem principal
        document.getElementById('main-image').src = images[index];
        
        // Atualiza thumbnails
        document.querySelectorAll('.thumbnail').forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    };
    
    // Seleciona tab
    const selectTab = (tabId) => {
        // Atualiza botões
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Atualiza painéis
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`tab-${tabId}`).classList.add('active');
    };
    
    // Atualiza quantidade
    const updateQuantity = (delta) => {
        const input = document.getElementById('quantity-input');
        const newValue = parseInt(input.value) + delta;
        
        if (newValue >= 1 && newValue <= product.estoque) {
            input.value = newValue;
            selectedQuantity = newValue;
        }
    };
    
    // Define quantidade
    const setQuantity = (value) => {
        const quantity = parseInt(value);
        
        if (quantity >= 1 && quantity <= product.estoque) {
            selectedQuantity = quantity;
            document.getElementById('quantity-input').value = quantity;
        }
    };
    
    // Adiciona ao carrinho
    const addToCart = async () => {
        if (!product || product.estoque === 0) return;
        
        const success = await ProductService.addToCart(product.id, selectedQuantity);
        
        if (success) {
            // Reseta quantidade
            selectedQuantity = 1;
            if (document.getElementById('quantity-input')) {
                document.getElementById('quantity-input').value = 1;
            }
        }
    };
    
    // Toggle wishlist
    const toggleWishlist = async () => {
        if (!Auth.isAuthenticated()) {
            Toast.warning('Faça login para adicionar aos favoritos');
            window.location.href = '/login';
            return;
        }
        
        if (isInWishlist) {
            await ProductService.removeFromWishlist(product.id);
            isInWishlist = false;
        } else {
            await ProductService.addToWishlist(product.id);
            isInWishlist = true;
        }
        
        // Atualiza ícone
        const wishlistBtn = document.querySelector('.btn-wishlist .material-icons');
        if (wishlistBtn) {
            wishlistBtn.textContent = isInWishlist ? 'favorite' : 'favorite_border';
        }
    };
    
    // Carrega produtos relacionados
    const loadRelatedProducts = async (productId) => {
        try {
            relatedProducts = await ProductService.getRelated(productId, 4);
            
            if (relatedProducts.length > 0) {
                const section = document.getElementById('related-products-section');
                const container = document.getElementById('related-products');
                
                section.style.display = 'block';
                ProductService.renderProductList(relatedProducts, container);
            }
        } catch (error) {
            console.error('Erro ao carregar produtos relacionados:', error);
        }
    };
    
    // Mostra erro
    const showError = (message) => {
        const container = document.getElementById('product-detail');
        container.innerHTML = `
            <div class="error-state">
                <span class="material-icons mb-3">error_outline</span>
                <h3>${message}</h3>
                <p>O produto que você está procurando não foi encontrado.</p>
                <a href="/produtos" class="btn btn-primary mt-3">
                    Ver Produtos
                </a>
            </div>
        `;
    };
    
    // API pública
    return {
        init,
        selectImage,
        selectTab,
        updateQuantity,
        setQuantity,
        addToCart,
        toggleWishlist
    };
})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    ProductDetailPage.init();
});