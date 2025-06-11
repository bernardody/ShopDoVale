// Cart.js - Página do carrinho de compras
// =====================================================

const CartPage = (() => {
    // Estado interno
    let cartData = null;
    let shippingOptions = null;
    let selectedShipping = null;
    let couponApplied = null;
    let updateTimer = null;
    
    // Inicializa a página
    const init = async () => {
        // Verifica autenticação
        if (!Auth.requireAuth()) return;
        
        // Carrega componentes
        await loadComponents();
        
        // Inicializa serviço do carrinho
        await CartService.init();
        
        // Registra listener para atualizações
        CartService.onUpdate(handleCartUpdate);
        
        // Carrega carrinho
        await loadCart();
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
        
        // Cart Item Template
        const cartItem = await Utils.loadComponent('cart-item');
        const template = document.getElementById('cart-item-template');
        template.innerHTML = cartItem;
        
        // Cart Widget
        CartWidget.init();
    };
    
    // Carrega dados do carrinho
    const loadCart = async () => {
        const loadingToast = Toast.loading('Carregando carrinho...');
        
        try {
            cartData = await CartService.load(true);
            renderCart();
        } catch (error) {
            Toast.error('Erro ao carregar carrinho');
            console.error('Erro ao carregar carrinho:', error);
        } finally {
            loadingToast.close();
        }
    };
    
    // Renderiza carrinho
    const renderCart = () => {
        const container = document.getElementById('cart-container');
        
        if (!cartData || !cartData.itens || cartData.itens.length === 0) {
            renderEmptyCart(container);
            return;
        }
        
        container.innerHTML = `
            <div class="cart-container">
                <!-- Itens do Carrinho -->
                <div class="cart-content">
                    <div class="cart-header">
                        <h2>${cartData.itens.length} ${cartData.itens.length === 1 ? 'item' : 'itens'} no carrinho</h2>
                        <button class="btn btn-sm btn-outline" onclick="CartPage.clearCart()">
                            <span class="material-icons">delete</span>
                            Limpar Carrinho
                        </button>
                    </div>
                    
                    <div class="cart-alerts" id="cart-alerts"></div>
                    
                    <div class="cart-items" id="cart-items">
                        ${cartData.itens.map(item => renderCartItem(item)).join('')}
                    </div>
                </div>
                
                <!-- Resumo do Carrinho -->
                <div class="cart-summary">
                    ${renderSummary()}
                </div>
            </div>
        `;
        
        // Configura event listeners
        setupEventListeners();
        
        // Valida carrinho
        validateCart();
    };
    
    // Renderiza carrinho vazio
    const renderEmptyCart = (container) => {
        container.innerHTML = `
            <div class="empty-cart">
                <span class="material-icons">shopping_cart</span>
                <h2>Seu carrinho está vazio</h2>
                <p>Adicione produtos para continuar comprando</p>
                <a href="/produtos" class="btn btn-primary">
                    Ver Produtos
                </a>
            </div>
        `;
    };
    
    // Renderiza item do carrinho
    const renderCartItem = (item) => {
        const template = document.querySelector('#cart-item-template');
        if (!template) return '';
        
        let html = template.innerHTML;
        
        // Dados básicos
        html = html.replace(/{id}/g, item.id);
        html = html.replace(/{produtoId}/g, item.produto.id);
        html = html.replace(/{name}/g, Utils.escapeHtml(item.produto.nome));
        html = html.replace(/{image}/g, item.produto.imagem || '/assets/images/placeholders/product.jpg');
        html = html.replace(/{category}/g, Utils.escapeHtml(item.produto.categoria));
        html = html.replace(/{producerName}/g, Utils.escapeHtml(item.produto.produtor?.nome || 'Produtor'));
        html = html.replace(/{producerAvatar}/g, item.produto.produtor?.avatar || '/assets/images/placeholders/user.jpg');
        html = html.replace(/{quantity}/g, item.quantidade);
        html = html.replace(/{maxQuantity}/g, item.produto.estoque);
        html = html.replace(/{stock}/g, item.produto.estoque);
        html = html.replace(/{price}/g, Utils.formatCurrency(item.produto.preco));
        html = html.replace(/{unit}/g, item.produto.unidade || 'un');
        
        // Subtotal
        const subtotal = item.produto.preco * item.quantidade;
        html = html.replace(/{subtotal}/g, Utils.formatCurrency(subtotal));
        
        // Preço antigo (se houver desconto)
        if (item.produto.desconto > 0) {
            const oldPrice = item.produto.preco / (1 - item.produto.desconto / 100);
            html = html.replace(/{oldPrice}/g, Utils.formatCurrency(oldPrice));
            html = html.replace(/{oldPriceStyle}/g, '');
        } else {
            html = html.replace(/{oldPrice}/g, '');
            html = html.replace(/{oldPriceStyle}/g, 'display: none;');
        }
        
        // Controles de quantidade
        html = html.replace(/{decreaseDisabled}/g, item.quantidade <= 1 ? 'disabled' : '');
        html = html.replace(/{increaseDisabled}/g, item.quantidade >= item.produto.estoque ? 'disabled' : '');
        
        // Alertas
        const hasAlerts = item.produto.estoque < item.quantidade || !item.produto.ativo;
        html = html.replace(/{alertsStyle}/g, hasAlerts ? '' : 'display: none;');
        
        // Alerta de estoque baixo
        if (item.produto.estoque < item.quantidade) {
            html = html.replace(/{stockAlertStyle}/g, '');
        } else {
            html = html.replace(/{stockAlertStyle}/g, 'display: none;');
        }
        
        // Alerta de produto indisponível
        if (!item.produto.ativo) {
            html = html.replace(/{unavailableAlertStyle}/g, '');
        } else {
            html = html.replace(/{unavailableAlertStyle}/g, 'display: none;');
        }
        
        return html;
    };
    
    // Renderiza resumo do carrinho
    const renderSummary = () => {
        const subtotal = CartService.getSubtotal();
        const desconto = CartService.getDesconto();
        const frete = selectedShipping ? selectedShipping.valor : 0;
        const total = CartService.getTotal(frete);
        
        return `
            <!-- Cupom de Desconto -->
            <div class="summary-card">
                <h3 class="summary-title">Cupom de Desconto</h3>
                ${couponApplied ? `
                    <div class="coupon-applied">
                        <span>
                            <span class="material-icons">local_offer</span>
                            ${couponApplied.codigo} (-${couponApplied.percentual}%)
                        </span>
                        <button onclick="CartPage.removeCoupon()">
                            <span class="material-icons">close</span>
                        </button>
                    </div>
                ` : `
                    <form class="coupon-form" onsubmit="CartPage.applyCoupon(event)">
                        <input 
                            type="text" 
                            class="form-control" 
                            placeholder="Código do cupom"
                            id="coupon-code"
                            required
                        >
                        <button type="submit" class="btn btn-outline">Aplicar</button>
                    </form>
                `}
            </div>
            
            <!-- Calcular Frete -->
            <div class="summary-card">
                <h3 class="summary-title">Calcular Frete</h3>
                <form class="shipping-form" onsubmit="CartPage.calculateShipping(event)">
                    <input 
                        type="text" 
                        class="form-control" 
                        placeholder="CEP"
                        id="shipping-cep"
                        pattern="[0-9]{5}-?[0-9]{3}"
                        maxlength="9"
                        required
                    >
                    <button type="submit" class="btn btn-outline">Calcular</button>
                </form>
                
                ${shippingOptions ? `
                    <div class="shipping-options">
                        ${shippingOptions.map((option, index) => `
                            <label class="shipping-option ${selectedShipping?.id === option.id ? 'selected' : ''}">
                                <input 
                                    type="radio" 
                                    name="shipping" 
                                    value="${option.id}"
                                    ${selectedShipping?.id === option.id ? 'checked' : ''}
                                    onchange="CartPage.selectShipping('${option.id}')"
                                >
                                <div class="shipping-option-details">
                                    <span class="shipping-option-name">${option.nome}</span>
                                    <span class="shipping-option-time">${option.prazo}</span>
                                </div>
                                <span class="shipping-option-price">
                                    ${option.valor === 0 ? 'Grátis' : Utils.formatCurrency(option.valor)}
                                </span>
                            </label>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <!-- Resumo de Valores -->
            <div class="summary-card">
                <h3 class="summary-title">Resumo do Pedido</h3>
                
                <div class="summary-line">
                    <span class="label">Subtotal:</span>
                    <span class="value">${Utils.formatCurrency(subtotal)}</span>
                </div>
                
                ${desconto > 0 ? `
                    <div class="summary-line discount">
                        <span class="label">Desconto:</span>
                        <span class="value">-${Utils.formatCurrency(desconto)}</span>
                    </div>
                ` : ''}
                
                ${couponApplied ? `
                    <div class="summary-line discount">
                        <span class="label">Cupom (${couponApplied.percentual}%):</span>
                        <span class="value">-${Utils.formatCurrency(couponApplied.valor)}</span>
                    </div>
                ` : ''}
                
                ${selectedShipping ? `
                    <div class="summary-line">
                        <span class="label">Frete:</span>
                        <span class="value">
                            ${selectedShipping.valor === 0 ? 'Grátis' : Utils.formatCurrency(selectedShipping.valor)}
                        </span>
                    </div>
                ` : ''}
                
                <div class="summary-line total">
                    <span class="label">Total:</span>
                    <span class="value">${Utils.formatCurrency(total)}</span>
                </div>
                
                <button 
                    class="btn btn-primary btn-block btn-lg mt-3" 
                    onclick="CartPage.proceedToCheckout()"
                    ${!selectedShipping ? 'disabled' : ''}
                >
                    Finalizar Compra
                </button>
                
                ${!selectedShipping ? `
                    <p class="text-center text-gray mt-2 text-sm">
                        Calcule o frete para continuar
                    </p>
                ` : ''}
                
                <a href="/produtos" class="btn btn-outline btn-block mt-2">
                    Continuar Comprando
                </a>
            </div>
        `;
    };
    
    // Configura event listeners
    const setupEventListeners = () => {
        // Remover item
        document.querySelectorAll('[data-action="remove"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemId = parseInt(btn.getAttribute('data-item-id'));
                await removeItem(itemId);
            });
        });
        
        // Alterar quantidade - botões
        document.querySelectorAll('[data-action="decrease"], [data-action="increase"]').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const itemId = parseInt(btn.getAttribute('data-item-id'));
                const item = cartData.itens.find(i => i.id === itemId);
                if (!item) return;
                
                const delta = btn.getAttribute('data-action') === 'increase' ? 1 : -1;
                const newQuantity = item.quantidade + delta;
                
                await updateQuantity(itemId, newQuantity);
            });
        });
        
        // Alterar quantidade - input
        document.querySelectorAll('[data-action="update-quantity"]').forEach(input => {
            input.addEventListener('change', async (e) => {
                const itemId = parseInt(input.getAttribute('data-item-id'));
                const newQuantity = parseInt(input.value);
                
                if (!isNaN(newQuantity) && newQuantity > 0) {
                    await updateQuantity(itemId, newQuantity);
                } else {
                    // Restaura valor anterior
                    const item = cartData.itens.find(i => i.id === itemId);
                    if (item) {
                        input.value = item.quantidade;
                    }
                }
            });
        });
        
        // Máscara de CEP
        const cepInput = document.getElementById('shipping-cep');
        if (cepInput) {
            cepInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 5) {
                    value = value.slice(0, 5) + '-' + value.slice(5, 8);
                }
                e.target.value = value;
            });
        }
    };
    
    // Remove item do carrinho
    const removeItem = async (itemId) => {
        const confirmed = await Modal.confirm(
            'Deseja realmente remover este item do carrinho?',
            'Remover Item'
        );
        
        if (!confirmed) return;
        
        const result = await CartService.removeItem(itemId);
        
        if (result.success) {
            Toast.success('Item removido do carrinho');
            renderCart();
        } else {
            Toast.error('Erro ao remover item');
        }
    };
    
    // Atualiza quantidade
    const updateQuantity = async (itemId, quantity) => {
        clearTimeout(updateTimer);
        
        updateTimer = setTimeout(async () => {
            const result = await CartService.updateItem(itemId, quantity);
            
            if (!result.success) {
                Toast.error(result.error || 'Erro ao atualizar quantidade');
                renderCart(); // Re-renderiza para mostrar valor correto
            } else {
                renderCart();
            }
        }, 500);
    };
    
    // Limpa carrinho
    const clearCart = async () => {
        const confirmed = await Modal.confirm(
            'Deseja realmente limpar todo o carrinho?',
            'Limpar Carrinho'
        );
        
        if (!confirmed) return;
        
        const result = await CartService.clear();
        
        if (result.success) {
            Toast.success('Carrinho limpo');
            renderCart();
        } else {
            Toast.error('Erro ao limpar carrinho');
        }
    };
    
    // Aplica cupom
    const applyCoupon = async (event) => {
        event.preventDefault();
        
        const input = document.getElementById('coupon-code');
        const code = input.value.trim().toUpperCase();
        
        if (!code) return;
        
        const loadingToast = Toast.loading('Aplicando cupom...');
        
        try {
            const result = await CartService.applyCoupon(code);
            
            if (result.success) {
                couponApplied = {
                    codigo: code,
                    percentual: result.desconto,
                    valor: (CartService.getSubtotal() * result.desconto) / 100
                };
                Toast.success('Cupom aplicado com sucesso');
                renderCart();
            } else {
                Toast.error(result.error || 'Cupom inválido');
            }
        } catch (error) {
            Toast.error('Erro ao aplicar cupom');
        } finally {
            loadingToast.close();
        }
    };
    
    // Remove cupom
    const removeCoupon = async () => {
        const result = await CartService.removeCoupon();
        
        if (result.success) {
            couponApplied = null;
            Toast.success('Cupom removido');
            renderCart();
        }
    };
    
    // Calcula frete
    const calculateShipping = async (event) => {
        event.preventDefault();
        
        const input = document.getElementById('shipping-cep');
        const cep = input.value.replace(/\D/g, '');
        
        if (cep.length !== 8) {
            Toast.error('CEP inválido');
            return;
        }
        
        const loadingToast = Toast.loading('Calculando frete...');
        
        try {
            const result = await CartService.calculateShipping(cep);
            
            if (result.success) {
                shippingOptions = result.opcoes;
                
                // Seleciona primeira opção automaticamente
                if (shippingOptions.length > 0) {
                    selectedShipping = shippingOptions[0];
                }
                
                renderCart();
            } else {
                Toast.error(result.error || 'Erro ao calcular frete');
            }
        } catch (error) {
            Toast.error('Erro ao calcular frete');
        } finally {
            loadingToast.close();
        }
    };
    
    // Seleciona opção de frete
    const selectShipping = (shippingId) => {
        selectedShipping = shippingOptions.find(opt => opt.id === shippingId);
        renderCart();
    };
    
    // Valida carrinho
    const validateCart = async () => {
        const validation = await CartService.validate();
        const alertsContainer = document.getElementById('cart-alerts');
        
        if (!alertsContainer) return;
        
        if (validation.valid) {
            alertsContainer.innerHTML = '';
            return;
        }
        
        // Mostra alertas
        alertsContainer.innerHTML = validation.errors.map(error => `
            <div class="alert alert-${error.tipo === 'estoque' ? 'warning' : 'danger'}">
                <span class="material-icons">${error.tipo === 'estoque' ? 'warning' : 'error'}</span>
                <span>${error.mensagem}</span>
            </div>
        `).join('');
    };
    
    // Procede para checkout
    const proceedToCheckout = async () => {
        // Valida carrinho antes de prosseguir
        const validation = await CartService.validate();
        
        if (!validation.valid) {
            Toast.error('Corrija os problemas no carrinho antes de continuar');
            return;
        }
        
        if (!selectedShipping) {
            Toast.error('Selecione uma opção de frete');
            return;
        }
        
        // Salva dados no sessionStorage para o checkout
        Utils.session.set('checkout_data', {
            shipping: selectedShipping,
            coupon: couponApplied
        });
        
        // Redireciona para checkout
        window.location.href = '/checkout';
    };
    
    // Handler para atualizações do carrinho
    const handleCartUpdate = (updatedCart) => {
        cartData = updatedCart;
        // Não re-renderiza automaticamente para evitar perda de estado
    };
    
    // API pública
    return {
        init,
        removeItem,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        calculateShipping,
        selectShipping,
        proceedToCheckout
    };
})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    CartPage.init();
});