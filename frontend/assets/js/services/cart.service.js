// CartService.js - Serviço para gerenciar carrinho
// =====================================================

const CartService = (() => {
    // Estado interno
    let cartData = null;
    let isLoading = false;
    let updateCallbacks = [];
    
    // Cache local para performance
    const cache = {
        data: null,
        lastUpdate: null,
        cacheDuration: 2 * 60 * 1000 // 2 minutos
    };
    
    // Inicializa o serviço
    const init = async () => {
        // Carrega carrinho se usuário estiver autenticado
        if (Auth.isAuthenticated()) {
            await load();
        }
        
        // Listener para mudanças de autenticação
        Auth.onAuthStateChange((isAuthenticated) => {
            if (isAuthenticated) {
                load();
            } else {
                clear();
            }
        });
    };
    
    // Carrega dados do carrinho
    const load = async (forceRefresh = false) => {
        // Verifica cache primeiro
        if (!forceRefresh && cache.data && cache.lastUpdate && 
            (Date.now() - cache.lastUpdate < cache.cacheDuration)) {
            cartData = cache.data;
            notifyUpdate();
            return cartData;
        }
        
        if (isLoading) return cartData;
        isLoading = true;
        
        try {
            const response = await API.carrinho.get();
            cartData = response;
            
            // Atualiza cache
            cache.data = cartData;
            cache.lastUpdate = Date.now();
            
            // Notifica componentes
            notifyUpdate();
            
            return cartData;
        } catch (error) {
            console.error('Erro ao carregar carrinho:', error);
            cartData = { itens: [], total: 0, subtotal: 0 };
            return cartData;
        } finally {
            isLoading = false;
        }
    };
    
    // Adiciona item ao carrinho
    const addItem = async (produtoId, quantidade = 1) => {
        try {
            const response = await API.carrinho.add(produtoId, quantidade);
            
            // Invalida cache
            invalidateCache();
            
            // Recarrega carrinho
            await load(true);
            
            return { success: true, data: response };
        } catch (error) {
            console.error('Erro ao adicionar item:', error);
            return { success: false, error: error.message };
        }
    };
    
    // Atualiza quantidade de um item
    const updateItem = async (itemId, quantidade) => {
        try {
            if (quantidade <= 0) {
                return await removeItem(itemId);
            }
            
            const response = await API.carrinho.update(itemId, quantidade);
            
            // Atualiza localmente para resposta mais rápida
            if (cartData && cartData.itens) {
                const item = cartData.itens.find(i => i.id === itemId);
                if (item) {
                    item.quantidade = quantidade;
                    recalculateTotals();
                    notifyUpdate();
                }
            }
            
            // Invalida cache
            invalidateCache();
            
            return { success: true, data: response };
        } catch (error) {
            console.error('Erro ao atualizar item:', error);
            // Recarrega carrinho em caso de erro
            await load(true);
            return { success: false, error: error.message };
        }
    };
    
    // Remove item do carrinho
    const removeItem = async (itemId) => {
        try {
            await API.carrinho.remove(itemId);
            
            // Remove localmente para resposta mais rápida
            if (cartData && cartData.itens) {
                cartData.itens = cartData.itens.filter(i => i.id !== itemId);
                recalculateTotals();
                notifyUpdate();
            }
            
            // Invalida cache
            invalidateCache();
            
            return { success: true };
        } catch (error) {
            console.error('Erro ao remover item:', error);
            // Recarrega carrinho em caso de erro
            await load(true);
            return { success: false, error: error.message };
        }
    };
    
    // Limpa carrinho
    const clear = async () => {
        try {
            if (Auth.isAuthenticated()) {
                await API.carrinho.clear();
            }
            
            cartData = { itens: [], total: 0, subtotal: 0 };
            invalidateCache();
            notifyUpdate();
            
            return { success: true };
        } catch (error) {
            console.error('Erro ao limpar carrinho:', error);
            return { success: false, error: error.message };
        }
    };
    
    // Obtém dados do carrinho
    const getCart = () => {
        return cartData || { itens: [], total: 0, subtotal: 0 };
    };
    
    // Obtém total de itens
    const getItemCount = () => {
        if (!cartData || !cartData.itens) return 0;
        return cartData.itens.reduce((sum, item) => sum + item.quantidade, 0);
    };
    
    // Obtém subtotal
    const getSubtotal = () => {
        if (!cartData || !cartData.itens) return 0;
        return cartData.itens.reduce((sum, item) => {
            return sum + (item.produto.preco * item.quantidade);
        }, 0);
    };
    
    // Obtém total com descontos e frete
    const getTotal = (frete = 0) => {
        const subtotal = getSubtotal();
        const desconto = getDesconto();
        return subtotal - desconto + frete;
    };
    
    // Obtém desconto total
    const getDesconto = () => {
        if (!cartData || !cartData.itens) return 0;
        return cartData.itens.reduce((sum, item) => {
            const precoOriginal = item.produto.preco;
            const precoComDesconto = item.produto.preco_promocional || precoOriginal;
            const descontoPorItem = (precoOriginal - precoComDesconto) * item.quantidade;
            return sum + descontoPorItem;
        }, 0);
    };
    
    // Verifica se item está no carrinho
    const hasItem = (produtoId) => {
        if (!cartData || !cartData.itens) return false;
        return cartData.itens.some(item => item.produto.id === produtoId);
    };
    
    // Obtém quantidade de um produto no carrinho
    const getItemQuantity = (produtoId) => {
        if (!cartData || !cartData.itens) return 0;
        const item = cartData.itens.find(i => i.produto.id === produtoId);
        return item ? item.quantidade : 0;
    };
    
    // Valida carrinho (estoque, disponibilidade)
    const validate = async () => {
        if (!cartData || cartData.itens.length === 0) {
            return { valid: false, errors: ['Carrinho vazio'] };
        }
        
        const errors = [];
        
        // Verifica cada item
        for (const item of cartData.itens) {
            // Verifica estoque
            if (item.produto.estoque < item.quantidade) {
                errors.push({
                    itemId: item.id,
                    produto: item.produto.nome,
                    tipo: 'estoque',
                    mensagem: `${item.produto.nome} tem apenas ${item.produto.estoque} unidades disponíveis`
                });
            }
            
            // Verifica se produto está ativo
            if (!item.produto.ativo) {
                errors.push({
                    itemId: item.id,
                    produto: item.produto.nome,
                    tipo: 'indisponivel',
                    mensagem: `${item.produto.nome} não está mais disponível`
                });
            }
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    };
    
    // Recalcula totais localmente
    const recalculateTotals = () => {
        if (!cartData) return;
        
        cartData.subtotal = getSubtotal();
        cartData.desconto = getDesconto();
        cartData.total = cartData.subtotal - cartData.desconto;
    };
    
    // Invalida cache
    const invalidateCache = () => {
        cache.data = null;
        cache.lastUpdate = null;
    };
    
    // Registra callback para atualizações
    const onUpdate = (callback) => {
        updateCallbacks.push(callback);
        
        // Retorna função para remover callback
        return () => {
            updateCallbacks = updateCallbacks.filter(cb => cb !== callback);
        };
    };
    
    // Notifica callbacks sobre atualização
    const notifyUpdate = () => {
        updateCallbacks.forEach(callback => {
            try {
                callback(cartData);
            } catch (error) {
                console.error('Erro em callback de atualização:', error);
            }
        });
    };
    
    // Aplica cupom de desconto
    const applyCoupon = async (couponCode) => {
        try {
            const response = await API.post('/carrinho/cupom', { codigo: couponCode });
            
            // Atualiza dados do carrinho
            if (response.carrinho) {
                cartData = response.carrinho;
                invalidateCache();
                notifyUpdate();
            }
            
            return { success: true, desconto: response.desconto };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };
    
    // Remove cupom
    const removeCoupon = async () => {
        try {
            const response = await API.delete('/carrinho/cupom');
            
            // Atualiza dados do carrinho
            if (response.carrinho) {
                cartData = response.carrinho;
                invalidateCache();
                notifyUpdate();
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };
    
    // Calcula frete
    const calculateShipping = async (cep) => {
        try {
            const response = await API.post('/carrinho/calcular-frete', { cep });
            return {
                success: true,
                opcoes: response.opcoes || []
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };
    
    // API pública
    return {
        init,
        load,
        addItem,
        updateItem,
        removeItem,
        clear,
        getCart,
        getItemCount,
        getSubtotal,
        getTotal,
        getDesconto,
        hasItem,
        getItemQuantity,
        validate,
        onUpdate,
        applyCoupon,
        removeCoupon,
        calculateShipping
    };
})();

// Torna CartService global
window.CartService = CartService;