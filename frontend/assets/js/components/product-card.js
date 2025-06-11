// ProductCard.js - Componente de card de produto
// =====================================================

const ProductCard = (() => {
    // Template do card
    let cardTemplate = null;

    // Carrega template
    const loadTemplate = async () => {
        if (cardTemplate) return cardTemplate;

        try {
            const response = await fetch('/components/product-card.html');
            cardTemplate = await response.text();
            return cardTemplate;
        } catch (error) {
            console.error('Erro ao carregar template do product card:', error);
            return null;
        }
    };

    // Renderiza um card de produto
    const render = async (product, container = null) => {
        const template = await loadTemplate();
        if (!template) return null;

        // Prepara dados do produto
        const productData = {
            id: product.id,
            name: product.nome,
            image: product.imagem || '/assets/images/placeholders/product.jpg',
            category: product.categoria?.nome || 'Sem categoria',
            price: Utils.formatCurrency(product.preco),
            unit: product.unidade || 'un',
            oldPrice: product.preco_antigo ? Utils.formatCurrency(product.preco_antigo) : '',
            oldPriceStyle: product.preco_antigo ? '' : 'display: none',
            producerName: product.produtor?.nome || 'Produtor',
            producerAvatar: product.produtor?.avatar || '/assets/images/placeholders/user.jpg',
            badgeText: getBadgeText(product),
            badgeClass: getBadgeClass(product),
            badgeStyle: getBadgeText(product) ? '' : 'display: none'
        };

        // Substitui placeholders no template
        let html = template;
        Object.entries(productData).forEach(([key, value]) => {
            const regex = new RegExp(`{${key}}`, 'g');
            html = html.replace(regex, value);
        });

        // Se container foi fornecido, adiciona o HTML
        if (container) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;
            const card = tempDiv.firstElementChild;
            container.appendChild(card);
            
            // Configura event listeners
            setupCardListeners(card, product);
            
            return card;
        }

        return html;
    };

    // Renderiza lista de produtos
    const renderList = async (products, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Limpa container
        container.innerHTML = '';

        // Verifica se há produtos
        if (!products || products.length === 0) {
            container.innerHTML = `
                <div class="text-center p-5">
                    <p class="text-secondary">Nenhum produto encontrado</p>
                </div>
            `;
            return;
        }

        // Renderiza cada produto
        for (const product of products) {
            await render(product, container);
        }
    };

    // Renderiza grid de produtos
    const renderGrid = async (products, containerId, columns = 4) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Cria estrutura de grid
        container.innerHTML = `
            <div class="row" id="${containerId}-grid"></div>
        `;

        const grid = document.getElementById(`${containerId}-grid`);

        // Verifica se há produtos
        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div class="col-12">
                    <div class="text-center p-5">
                        <p class="text-secondary">Nenhum produto encontrado</p>
                    </div>
                </div>
            `;
            return;
        }

        // Calcula classe da coluna baseado no número de colunas
        const colClass = `col-${12 / columns}`;

        // Renderiza cada produto
        for (const product of products) {
            const col = document.createElement('div');
            col.className = colClass + ' mb-4';
            grid.appendChild(col);
            
            await render(product, col);
        }
    };

    // Configura event listeners do card
    const setupCardListeners = (card, product) => {
        // Wishlist button
        const wishlistBtn = card.querySelector('.product-card-wishlist');
        if (wishlistBtn) {
            wishlistBtn.addEventListener('click', (e) => {
                e.preventDefault();
                toggleWishlist(product.id, wishlistBtn);
            });
        }

        // Link do produto
        const productLink = card.querySelector('.product-card-title a');
        if (productLink) {
            productLink.addEventListener('click', (e) => {
                e.preventDefault();
                App.navigateTo(`/produto/${product.id}`);
            });
        }

        // Botões de ação
        const actionButtons = card.querySelectorAll('[data-action]');
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                const productId = btn.getAttribute('data-product-id');
                
                if (action === 'quick-view') {
                    quickView(productId);
                } else if (action === 'add-to-cart') {
                    addToCart(productId);
                }
            });
        });
    };

    // Determina texto do badge
    const getBadgeText = (product) => {
        if (product.novo) return 'Novo';
        if (product.desconto) return `-${product.desconto}%`;
        if (product.organico) return 'Orgânico';
        return '';
    };

    // Determina classe do badge
    const getBadgeClass = (product) => {
        if (product.desconto) return 'badge-discount';
        return '';
    };

    // Toggle wishlist
    const toggleWishlist = async (productId, button) => {
        if (!Auth.isAuthenticated()) {
            Toast.warning('Faça login para adicionar aos favoritos');
            App.navigateTo('/login');
            return;
        }

        try {
            // Aqui você faria a chamada para API
            // const result = await API.wishlist.toggle(productId);
            
            // Simula toggle
            const icon = button.querySelector('.material-icons');
            const isActive = button.classList.contains('active');
            
            if (isActive) {
                button.classList.remove('active');
                icon.textContent = 'favorite_border';
                Toast.success('Removido dos favoritos');
            } else {
                button.classList.add('active');
                icon.textContent = 'favorite';
                Toast.success('Adicionado aos favoritos');
            }
        } catch (error) {
            Toast.error('Erro ao atualizar favoritos');
        }
    };

    // Adiciona ao carrinho
    const addToCart = async (productId) => {
        try {
            // Busca dados do produto
            const product = await API.produtos.getById(productId);
            
            // Mostra modal de quantidade
            const modalId = await Modal.form({
                title: 'Adicionar ao Carrinho',
                size: 'sm',
                fields: [
                    {
                        name: 'quantidade',
                        label: `Quantidade (${product.unidade})`,
                        type: 'number',
                        value: '1',
                        placeholder: 'Digite a quantidade',
                        required: true
                    }
                ],
                onSubmit: async (data) => {
                    const quantidade = parseInt(data.quantidade);
                    if (quantidade <= 0) {
                        Toast.error('Quantidade deve ser maior que zero');
                        return false;
                    }

                    try {
                        await API.carrinho.add(productId, quantidade);
                        Toast.success('Produto adicionado ao carrinho');
                        
                        // Atualiza widget do carrinho
                        if (window.CartWidget) {
                            CartWidget.update();
                            CartWidget.animate();
                        }
                        
                        return true;
                    } catch (error) {
                        Toast.error('Erro ao adicionar ao carrinho');
                        return false;
                    }
                }
            });
        } catch (error) {
            Toast.error('Erro ao carregar produto');
        }
    };

    // Quick view do produto
    const quickView = async (productId) => {
        try {
            // Busca dados do produto
            const product = await API.produtos.getById(productId);
            
            // Cria modal com detalhes
            const modalContent = `
                <div class="row">
                    <div class="col-6">
                        <img src="${product.imagem || '/assets/images/placeholders/product.jpg'}" 
                             alt="${product.nome}" 
                             class="img-fluid rounded">
                    </div>
                    <div class="col-6">
                        <div class="mb-2">
                            <span class="badge badge-primary">${product.categoria?.nome || 'Sem categoria'}</span>
                            ${product.organico ? '<span class="badge badge-success ml-2">Orgânico</span>' : ''}
                        </div>
                        
                        <h4 class="mb-3">${product.nome}</h4>
                        
                        <p class="text-secondary mb-3">${product.descricao || 'Sem descrição'}</p>
                        
                        <div class="mb-3">
                            <div class="text-primary text-2xl font-semibold">
                                ${Utils.formatCurrency(product.preco)}
                                <small class="text-secondary">/${product.unidade || 'un'}</small>
                            </div>
                            ${product.preco_antigo ? 
                                `<div class="text-secondary text-line-through">
                                    ${Utils.formatCurrency(product.preco_antigo)}
                                </div>` : ''}
                        </div>
                        
                        <div class="d-flex align-center mb-3">
                            <img src="${product.produtor?.avatar || '/assets/images/placeholders/user.jpg'}" 
                                 alt="${product.produtor?.nome}" 
                                 class="avatar avatar-sm mr-2">
                            <div>
                                <div class="font-medium">${product.produtor?.nome || 'Produtor'}</div>
                                <div class="text-sm text-secondary">${product.produtor?.cidade || ''}</div>
                            </div>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-primary flex-1" data-action="add-to-cart-modal" data-product-id="${product.id}">
                                <span class="material-icons">add_shopping_cart</span>
                                Adicionar ao Carrinho
                            </button>
                            <button class="btn btn-outline" data-action="view-product" data-product-id="${product.id}">
                                Ver Mais
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            const modalId = await Modal.create({
                title: 'Detalhes do Produto',
                content: modalContent,
                size: 'lg',
                showFooter: false
            });
            
            Modal.open(modalId);
            
            // Adiciona event listeners aos botões do modal
            setTimeout(() => {
                const modal = document.getElementById(`modal-${modalId.split('-')[1]}`);
                if (modal) {
                    modal.querySelectorAll('[data-action]').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault();
                            const action = btn.getAttribute('data-action');
                            const productId = btn.getAttribute('data-product-id');
                            
                            if (action === 'add-to-cart-modal') {
                                Modal.close(modalId);
                                addToCart(productId);
                            } else if (action === 'view-product') {
                                Modal.close(modalId);
                                App.navigateTo(`/produto/${productId}`);
                            }
                        });
                    });
                }
            }, 100);
        } catch (error) {
            Toast.error('Erro ao carregar produto');
        }
    };

    // Cria skeleton loader para produtos
    const renderSkeleton = (count = 4, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const skeletons = Array(count).fill(0).map(() => `
            <div class="col-3 mb-4">
                <div class="product-card">
                    <div class="product-card-image skeleton" style="height: 240px;"></div>
                    <div class="product-card-body">
                        <div class="skeleton skeleton-text mb-2" style="width: 60%;"></div>
                        <div class="skeleton skeleton-text mb-2"></div>
                        <div class="skeleton skeleton-text mb-3" style="width: 40%;"></div>
                        <div class="skeleton skeleton-text mb-3" style="width: 70%;"></div>
                        <div class="d-flex gap-2">
                            <div class="skeleton" style="height: 32px; flex: 1;"></div>
                            <div class="skeleton" style="height: 32px; flex: 1;"></div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = `<div class="row">${skeletons}</div>`;
    };

    // API pública
    return {
        render,
        renderList,
        renderGrid,
        renderSkeleton,
        addToCart,
        quickView
    };
})();

// Torna ProductCard global
window.ProductCard = ProductCard;