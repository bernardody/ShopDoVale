// CartWidget.js - Widget do carrinho de compras
// =====================================================

const CartWidget = (() => {
    // Estado interno
    let widgetElement = null;
    let dropdownElement = null;
    let isOpen = false;
    let cartData = null;
    let updateTimer = null;

    // Inicializa o widget
    const init = () => {
        const container = document.getElementById('cart-widget-container');
        if (!container) return;

        // Cria estrutura HTML do widget
        container.innerHTML = `
            <div class="cart-widget" id="cart-widget">
                <button class="cart-widget-button" id="cart-widget-button">
                    <span class="material-icons">shopping_cart</span>
                    <span class="cart-widget-count" id="cart-widget-count" style="display: none;">0</span>
                </button>
                
                <div class="cart-widget-dropdown" id="cart-widget-dropdown">
                    <div class="cart-widget-header">
                        <h4 class="cart-widget-title">Carrinho</h4>
                    </div>
                    
                    <div class="cart-widget-items" id="cart-widget-items">
                        <div class="cart-widget-empty">
                            <span class="material-icons mb-2">shopping_cart</span>
                            <p>Seu carrinho está vazio</p>
                        </div>
                    </div>
                    
                    <div class="cart-widget-footer" id="cart-widget-footer" style="display: none;">
                        <div class="cart-widget-total">
                            <span class="cart-widget-total-label">Total:</span>
                            <span class="cart-widget-total-value" id="cart-widget-total">R$ 0,00</span>
                        </div>
                        <div class="d-flex gap-2">
                            <a href="/carrinho" class="btn btn-outline btn-sm flex-1">Ver Carrinho</a>
                            <a href="/checkout" class="btn btn-primary btn-sm flex-1">Finalizar</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Captura elementos
        widgetElement = document.getElementById('cart-widget');
        dropdownElement = document.getElementById('cart-widget-dropdown');

        // Configura event listeners
        setupEventListeners();

        // Carrega dados do carrinho
        update();

        // Atualiza periodicamente (a cada 30 segundos)
        setInterval(update, 30000);
    };

    // Configura event listeners
    const setupEventListeners = () => {
        const button = document.getElementById('cart-widget-button');
        
        // Toggle dropdown
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            toggle();
        });

        // Fecha ao clicar fora
        document.addEventListener('click', (e) => {
            if (!widgetElement.contains(e.target)) {
                close();
            }
        });

        // Previne fechamento ao clicar no dropdown
        dropdownElement.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    };

    // Toggle dropdown
    const toggle = () => {
        if (isOpen) {
            close();
        } else {
            open();
        }
    };

    // Abre dropdown
    const open = () => {
        Utils.addClass(widgetElement, 'active');
        isOpen = true;
        
        // Atualiza conteúdo ao abrir
        updateDropdownContent();
    };

    // Fecha dropdown
    const close = () => {
        Utils.removeClass(widgetElement, 'active');
        isOpen = false;
    };

    // Atualiza dados do carrinho
    const update = async () => {
        try {
            // Se não estiver autenticado, mostra carrinho vazio
            if (!Auth.isAuthenticated()) {
                updateCount(0);
                return;
            }

            // Busca dados do carrinho
            const response = await API.carrinho.get();
            cartData = response;

            // Atualiza contador
            const totalItems = cartData.itens?.reduce((sum, item) => sum + item.quantidade, 0) || 0;
            updateCount(totalItems);

            // Se dropdown estiver aberto, atualiza conteúdo
            if (isOpen) {
                updateDropdownContent();
            }
        } catch (error) {
            console.error('Erro ao atualizar carrinho:', error);
            updateCount(0);
        }
    };

    // Atualiza contador
    const updateCount = (count) => {
        const countElement = document.getElementById('cart-widget-count');
        
        if (count > 0) {
            countElement.textContent = count > 99 ? '99+' : count;
            countElement.style.display = 'flex';
        } else {
            countElement.style.display = 'none';
        }
    };

    // Atualiza conteúdo do dropdown
    const updateDropdownContent = () => {
        const itemsContainer = document.getElementById('cart-widget-items');
        const footerElement = document.getElementById('cart-widget-footer');
        const totalElement = document.getElementById('cart-widget-total');

        // Se não há dados ou itens
        if (!cartData || !cartData.itens || cartData.itens.length === 0) {
            itemsContainer.innerHTML = `
                <div class="cart-widget-empty">
                    <span class="material-icons mb-2">shopping_cart</span>
                    <p>Seu carrinho está vazio</p>
                    <a href="/produtos" class="btn btn-primary btn-sm mt-3">
                        Ver Produtos
                    </a>
                </div>
            `;
            footerElement.style.display = 'none';
            return;
        }

        // Renderiza itens
        itemsContainer.innerHTML = cartData.itens.map(item => `
            <div class="cart-item" data-item-id="${item.id}">
                <div class="cart-item-image">
                    <img src="${item.produto.imagem || '/assets/images/placeholders/product.jpg'}" 
                         alt="${item.produto.nome}">
                </div>
                
                <div class="cart-item-content">
                    <div class="cart-item-title">${item.produto.nome}</div>
                    <div class="cart-item-price">
                        ${Utils.formatCurrency(item.produto.preco)} x ${item.quantidade}
                    </div>
                    <div class="cart-item-quantity">
                        <button onclick="CartWidget.updateQuantity('${item.id}', ${item.quantidade - 1})">
                            <span class="material-icons">remove</span>
                        </button>
                        <span>${item.quantidade}</span>
                        <button onclick="CartWidget.updateQuantity('${item.id}', ${item.quantidade + 1})">
                            <span class="material-icons">add</span>
                        </button>
                    </div>
                </div>
                
                <button class="cart-item-remove" onclick="CartWidget.removeItem('${item.id}')">
                    <span class="material-icons">close</span>
                </button>
            </div>
        `).join('');

        // Atualiza total
        totalElement.textContent = Utils.formatCurrency(cartData.total || 0);
        footerElement.style.display = 'block';
    };

    // Atualiza quantidade de um item
    const updateQuantity = async (itemId, newQuantity) => {
        // Debounce para evitar múltiplas chamadas
        clearTimeout(updateTimer);
        
        updateTimer = setTimeout(async () => {
            try {
                if (newQuantity <= 0) {
                    await removeItem(itemId);
                    return;
                }

                await API.carrinho.update(itemId, newQuantity);
                Toast.success('Quantidade atualizada');
                update();
            } catch (error) {
                Toast.error('Erro ao atualizar quantidade');
                update(); // Recarrega para mostrar valor correto
            }
        }, 500);
    };

    // Remove item do carrinho
    const removeItem = async (itemId) => {
        const confirmed = await Modal.confirm(
            'Deseja remover este item do carrinho?',
            'Remover Item'
        );

        if (!confirmed) return;

        try {
            await API.carrinho.remove(itemId);
            Toast.success('Item removido do carrinho');
            update();
        } catch (error) {
            Toast.error('Erro ao remover item');
        }
    };

    // Anima o widget (quando adiciona item)
    const animate = () => {
        const button = document.getElementById('cart-widget-button');
        
        // Adiciona classe de animação
        Utils.addClass(button, 'animate-bounce');
        
        // Remove após animação
        setTimeout(() => {
            Utils.removeClass(button, 'animate-bounce');
        }, 600);
    };

    // Limpa carrinho
    const clear = async () => {
        const confirmed = await Modal.confirm(
            'Deseja limpar todo o carrinho?',
            'Limpar Carrinho'
        );

        if (!confirmed) return;

        try {
            await API.carrinho.clear();
            Toast.success('Carrinho limpo');
            update();
            close();
        } catch (error) {
            Toast.error('Erro ao limpar carrinho');
        }
    };

    // Adiciona estilos de animação
    const addAnimationStyles = () => {
        if (document.getElementById('cart-widget-animation-styles')) return;

        const style = document.createElement('style');
        style.id = 'cart-widget-animation-styles';
        style.textContent = `
            @keyframes bounce {
                0%, 100% { transform: scale(1); }
                25% { transform: scale(1.2); }
                50% { transform: scale(0.9); }
                75% { transform: scale(1.1); }
            }
            
            .animate-bounce {
                animation: bounce 0.6s ease-in-out;
            }
        `;
        document.head.appendChild(style);
    };

    // Adiciona estilos de animação ao inicializar
    addAnimationStyles();

    // API pública
    return {
        init,
        update,
        animate,
        updateQuantity,
        removeItem,
        clear
    };
})();

// Torna CartWidget global
window.CartWidget = CartWidget;