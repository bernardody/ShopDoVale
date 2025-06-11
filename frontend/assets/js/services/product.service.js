// ProductService.js - Serviço para gerenciar produtos
// =====================================================

const ProductService = (() => {
    // Cache de produtos
    const cache = {
        products: null,
        lastUpdate: null,
        cacheDuration: 5 * 60 * 1000, // 5 minutos
        categories: null
    };

    // Obtém todos os produtos
    const getAll = async (filters = {}) => {
        try {
            // Monta query string com filtros
            const queryParams = new URLSearchParams();
            
            if (filters.categoria) queryParams.append('categoria', filters.categoria);
            if (filters.search) queryParams.append('search', filters.search);
            if (filters.minPrice) queryParams.append('minPrice', filters.minPrice);
            if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice);
            if (filters.produtor) queryParams.append('produtor', filters.produtor);
            if (filters.ordenar) queryParams.append('ordenar', filters.ordenar);
            if (filters.page) queryParams.append('page', filters.page);
            if (filters.limit) queryParams.append('limit', filters.limit);

            const response = await API.produtos.getAll(queryParams.toString());
            return response;
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            throw error;
        }
    };

    // Obtém produto por ID
    const getById = async (id) => {
        try {
            const response = await API.produtos.getById(id);
            return response;
        } catch (error) {
            console.error('Erro ao buscar produto:', error);
            throw error;
        }
    };

    // Obtém produtos em destaque
    const getFeatured = async (limit = 8) => {
        try {
            const response = await API.produtos.getFeatured(limit);
            return response;
        } catch (error) {
            console.error('Erro ao buscar produtos em destaque:', error);
            throw error;
        }
    };

    // Obtém produtos relacionados
    const getRelated = async (productId, limit = 4) => {
        try {
            const response = await API.produtos.getRelated(productId, limit);
            return response;
        } catch (error) {
            console.error('Erro ao buscar produtos relacionados:', error);
            return [];
        }
    };

    // Obtém categorias
    const getCategories = async () => {
        // Retorna do cache se disponível
        if (cache.categories) {
            return cache.categories;
        }

        try {
            const response = await API.produtos.getCategories();
            cache.categories = response;
            return response;
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            return [];
        }
    };

    // Busca produtos
    const search = async (query) => {
        try {
            const response = await API.produtos.search(query);
            return response;
        } catch (error) {
            console.error('Erro ao buscar produtos:', error);
            throw error;
        }
    };

    // Adiciona produto ao carrinho
    const addToCart = async (productId, quantity = 1) => {
        try {
            // Verifica se usuário está autenticado
            if (!Auth.isAuthenticated()) {
                Toast.warning('Faça login para adicionar produtos ao carrinho');
                window.location.href = '/login';
                return false;
            }

            const response = await API.carrinho.add(productId, quantity);
            
            // Atualiza widget do carrinho
            CartWidget.update();
            CartWidget.animate();
            
            Toast.success('Produto adicionado ao carrinho');
            return true;
        } catch (error) {
            console.error('Erro ao adicionar ao carrinho:', error);
            Toast.error(error.message || 'Erro ao adicionar produto ao carrinho');
            return false;
        }
    };

    // Adiciona produto aos favoritos
    const addToWishlist = async (productId) => {
        try {
            // Verifica se usuário está autenticado
            if (!Auth.isAuthenticated()) {
                Toast.warning('Faça login para adicionar aos favoritos');
                window.location.href = '/login';
                return false;
            }

            const response = await API.favoritos.add(productId);
            Toast.success('Produto adicionado aos favoritos');
            return true;
        } catch (error) {
            console.error('Erro ao adicionar aos favoritos:', error);
            Toast.error('Erro ao adicionar aos favoritos');
            return false;
        }
    };

    // Remove produto dos favoritos
    const removeFromWishlist = async (productId) => {
        try {
            const response = await API.favoritos.remove(productId);
            Toast.success('Produto removido dos favoritos');
            return true;
        } catch (error) {
            console.error('Erro ao remover dos favoritos:', error);
            Toast.error('Erro ao remover dos favoritos');
            return false;
        }
    };

    // Renderiza card de produto
    const renderProductCard = (product) => {
        // Obtém template do product-card.html
        const template = document.querySelector('#product-card-template');
        if (!template) return '';

        let html = template.innerHTML;

        // Substitui placeholders
        html = html.replace(/{id}/g, product.id);
        html = html.replace(/{name}/g, Utils.escapeHtml(product.nome));
        html = html.replace(/{image}/g, product.imagem || '/assets/images/placeholders/product.jpg');
        html = html.replace(/{category}/g, Utils.escapeHtml(product.categoria));
        html = html.replace(/{producerName}/g, Utils.escapeHtml(product.produtor?.nome || 'Produtor'));
        html = html.replace(/{producerAvatar}/g, product.produtor?.avatar || '/assets/images/placeholders/user.jpg');
        html = html.replace(/{price}/g, Utils.formatCurrency(product.preco));
        html = html.replace(/{unit}/g, product.unidade || 'un');

        // Badge opcional
        if (product.desconto > 0) {
            html = html.replace(/{badgeClass}/g, 'badge-discount');
            html = html.replace(/{badgeStyle}/g, '');
            html = html.replace(/{badgeText}/g, `-${product.desconto}%`);
            
            // Preço antigo
            const oldPrice = product.preco / (1 - product.desconto / 100);
            html = html.replace(/{oldPrice}/g, Utils.formatCurrency(oldPrice));
            html = html.replace(/{oldPriceStyle}/g, '');
        } else {
            html = html.replace(/{badgeClass}/g, '');
            html = html.replace(/{badgeStyle}/g, 'display: none;');
            html = html.replace(/{badgeText}/g, '');
            html = html.replace(/{oldPrice}/g, '');
            html = html.replace(/{oldPriceStyle}/g, 'display: none;');
        }

        return html;
    };

    // Renderiza lista de produtos
    const renderProductList = (products, container) => {
        if (!container) return;

        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <span class="material-icons mb-3">inventory_2</span>
                    <h4>Nenhum produto encontrado</h4>
                    <p>Tente ajustar os filtros ou fazer uma nova busca</p>
                </div>
            `;
            return;
        }

        container.innerHTML = products.map(product => renderProductCard(product)).join('');

        // Adiciona event listeners aos cards
        container.querySelectorAll('.product-card').forEach(card => {
            setupProductCardEvents(card);
        });
    };

    // Configura eventos do card de produto
    const setupProductCardEvents = (card) => {
        // Botão de adicionar ao carrinho
        const addToCartBtn = card.querySelector('[data-action="add-to-cart"]');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = addToCartBtn.getAttribute('data-product-id');
                await addToCart(productId);
            });
        }

        // Botão de visualização rápida
        const quickViewBtn = card.querySelector('[data-action="quick-view"]');
        if (quickViewBtn) {
            quickViewBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = quickViewBtn.getAttribute('data-product-id');
                await showQuickView(productId);
            });
        }

        // Botão de favoritos
        const wishlistBtn = card.querySelector('.product-card-wishlist');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = card.getAttribute('data-product-id');
                
                if (wishlistBtn.querySelector('.material-icons').textContent === 'favorite') {
                    await removeFromWishlist(productId);
                    wishlistBtn.querySelector('.material-icons').textContent = 'favorite_border';
                } else {
                    await addToWishlist(productId);
                    wishlistBtn.querySelector('.material-icons').textContent = 'favorite';
                }
            });
        }
    };

    // Mostra modal de visualização rápida
    const showQuickView = async (productId) => {
        const loadingToast = Toast.loading('Carregando produto...');

        try {
            const product = await getById(productId);
            loadingToast.close();

            const content = `
                <div class="quick-view-content">
                    <div class="quick-view-image">
                        <img src="${product.imagem || '/assets/images/placeholders/product.jpg'}" 
                             alt="${Utils.escapeHtml(product.nome)}">
                    </div>
                    
                    <div class="quick-view-info">
                        <span class="badge badge-category mb-2">${Utils.escapeHtml(product.categoria)}</span>
                        <h3 class="mb-2">${Utils.escapeHtml(product.nome)}</h3>
                        
                        <div class="product-producer mb-3">
                            <img src="${product.produtor?.avatar || '/assets/images/placeholders/user.jpg'}" 
                                 alt="${Utils.escapeHtml(product.produtor?.nome)}">
                            <span>${Utils.escapeHtml(product.produtor?.nome || 'Produtor')}</span>
                        </div>
                        
                        <p class="text-gray mb-3">${Utils.escapeHtml(product.descricao)}</p>
                        
                        <div class="product-price-large mb-4">
                            <span class="price">${Utils.formatCurrency(product.preco)}</span>
                            <span class="unit">/${product.unidade || 'un'}</span>
                        </div>
                        
                        <div class="product-stock mb-4">
                            <span class="material-icons">inventory</span>
                            <span>${product.estoque > 0 ? `${product.estoque} disponíveis` : 'Produto esgotado'}</span>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline" onclick="window.location.href='/produto/${product.id}'">
                                Ver Detalhes
                            </button>
                            <button class="btn btn-primary" onclick="ProductService.addToCart(${product.id})">
                                Adicionar ao Carrinho
                            </button>
                        </div>
                    </div>
                </div>
            `;

            Modal.open(content, {
                title: 'Visualização Rápida',
                size: 'large'
            });
        } catch (error) {
            loadingToast.close();
            Toast.error('Erro ao carregar produto');
        }
    };

    // Limpa cache
    const clearCache = () => {
        cache.products = null;
        cache.lastUpdate = null;
        cache.categories = null;
    };

    // API pública
    return {
        getAll,
        getById,
        getFeatured,
        getRelated,
        getCategories,
        search,
        addToCart,
        addToWishlist,
        removeFromWishlist,
        renderProductCard,
        renderProductList,
        showQuickView,
        clearCache
    };
})();

// Torna ProductService global
window.ProductService = ProductService;