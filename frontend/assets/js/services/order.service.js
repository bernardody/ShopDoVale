// OrderService.js - Serviço para gerenciar pedidos
// =====================================================

const OrderService = (() => {
    // Cache de pedidos
    const cache = {
        orders: null,
        lastUpdate: null,
        cacheDuration: 5 * 60 * 1000 // 5 minutos
    };
    
    // Status de pedido
    const STATUS = {
        PENDENTE: 'pendente',
        PROCESSANDO: 'processando',
        CONFIRMADO: 'confirmado',
        PREPARANDO: 'preparando',
        ENVIADO: 'enviado',
        ENTREGUE: 'entregue',
        CANCELADO: 'cancelado'
    };
    
    // Tradução de status
    const STATUS_LABELS = {
        pendente: { label: 'Pendente', color: 'warning', icon: 'pending' },
        processando: { label: 'Processando', color: 'info', icon: 'sync' },
        confirmado: { label: 'Confirmado', color: 'success', icon: 'check_circle' },
        preparando: { label: 'Preparando', color: 'info', icon: 'restaurant' },
        enviado: { label: 'Enviado', color: 'primary', icon: 'local_shipping' },
        entregue: { label: 'Entregue', color: 'success', icon: 'done_all' },
        cancelado: { label: 'Cancelado', color: 'danger', icon: 'cancel' }
    };
    
    // Cria novo pedido
    const create = async (orderData) => {
        try {
            const response = await API.pedidos.create(orderData);
            
            // Invalida cache
            invalidateCache();
            
            // Dispara evento de pedido criado
            dispatchOrderEvent('order:created', response);
            
            return response;
        } catch (error) {
            console.error('Erro ao criar pedido:', error);
            throw error;
        }
    };
    
    // Obtém todos os pedidos do usuário
    const getAll = async (filters = {}) => {
        // Verifica cache
        if (!filters.page && !filters.status && cache.orders && cache.lastUpdate && 
            (Date.now() - cache.lastUpdate < cache.cacheDuration)) {
            return cache.orders;
        }
        
        try {
            const params = {
                page: filters.page || 1,
                limit: filters.limit || 10,
                status: filters.status || null,
                ordenar: filters.ordenar || 'recentes'
            };
            
            const response = await API.pedidos.getAll(params);
            
            // Atualiza cache se não houver filtros
            if (!filters.page && !filters.status) {
                cache.orders = response;
                cache.lastUpdate = Date.now();
            }
            
            return response;
        } catch (error) {
            console.error('Erro ao buscar pedidos:', error);
            throw error;
        }
    };
    
    // Obtém pedido por ID
    const getById = async (orderId) => {
        try {
            const response = await API.pedidos.getById(orderId);
            return response;
        } catch (error) {
            console.error('Erro ao buscar pedido:', error);
            throw error;
        }
    };
    
    // Cancela pedido
    const cancel = async (orderId, motivo = '') => {
        const confirmed = await Modal.confirm(
            'Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.',
            'Cancelar Pedido'
        );
        
        if (!confirmed) return { success: false };
        
        try {
            const response = await API.pedidos.cancel(orderId, { motivo });
            
            // Invalida cache
            invalidateCache();
            
            // Dispara evento
            dispatchOrderEvent('order:cancelled', { orderId });
            
            Toast.success('Pedido cancelado com sucesso');
            return { success: true, data: response };
        } catch (error) {
            console.error('Erro ao cancelar pedido:', error);
            Toast.error(error.message || 'Erro ao cancelar pedido');
            return { success: false, error: error.message };
        }
    };
    
    // Rastreia pedido
    const track = async (orderId) => {
        try {
            const response = await API.get(`/pedidos/${orderId}/rastreamento`);
            return response;
        } catch (error) {
            console.error('Erro ao rastrear pedido:', error);
            throw error;
        }
    };
    
    // Avalia pedido
    const rate = async (orderId, rating, comment = '') => {
        try {
            const response = await API.post(`/pedidos/${orderId}/avaliar`, {
                nota: rating,
                comentario: comment
            });
            
            Toast.success('Avaliação enviada com sucesso');
            return { success: true, data: response };
        } catch (error) {
            console.error('Erro ao avaliar pedido:', error);
            Toast.error('Erro ao enviar avaliação');
            return { success: false, error: error.message };
        }
    };
    
    // Solicita reembolso
    const requestRefund = async (orderId, motivo) => {
        try {
            const response = await API.post(`/pedidos/${orderId}/reembolso`, { motivo });
            
            Toast.success('Solicitação de reembolso enviada');
            return { success: true, data: response };
        } catch (error) {
            console.error('Erro ao solicitar reembolso:', error);
            Toast.error('Erro ao solicitar reembolso');
            return { success: false, error: error.message };
        }
    };
    
    // Obtém estatísticas dos pedidos
    const getStats = async () => {
        try {
            const orders = await getAll();
            
            const stats = {
                total: orders.total || 0,
                totalGasto: 0,
                pedidosAtivos: 0,
                pedidosEntregues: 0,
                pedidosCancelados: 0
            };
            
            if (orders.pedidos) {
                orders.pedidos.forEach(order => {
                    stats.totalGasto += order.total || 0;
                    
                    if (['pendente', 'processando', 'confirmado', 'preparando', 'enviado'].includes(order.status)) {
                        stats.pedidosAtivos++;
                    } else if (order.status === 'entregue') {
                        stats.pedidosEntregues++;
                    } else if (order.status === 'cancelado') {
                        stats.pedidosCancelados++;
                    }
                });
            }
            
            return stats;
        } catch (error) {
            console.error('Erro ao calcular estatísticas:', error);
            return {
                total: 0,
                totalGasto: 0,
                pedidosAtivos: 0,
                pedidosEntregues: 0,
                pedidosCancelados: 0
            };
        }
    };
    
    // Renderiza card de pedido
    const renderOrderCard = (order) => {
        const status = STATUS_LABELS[order.status] || STATUS_LABELS.pendente;
        const dataFormatada = Utils.formatDate(order.createdAt);
        
        return `
            <div class="order-card" data-order-id="${order.id}">
                <div class="order-card-header">
                    <div class="order-info">
                        <h4 class="order-number">Pedido #${order.numero}</h4>
                        <p class="order-date">${dataFormatada}</p>
                    </div>
                    <div class="order-status badge badge-${status.color}">
                        <span class="material-icons">${status.icon}</span>
                        ${status.label}
                    </div>
                </div>
                
                <div class="order-card-body">
                    <div class="order-items-preview">
                        ${order.itens.slice(0, 3).map(item => `
                            <div class="order-item-preview">
                                <img src="${item.produto.imagem || '/assets/images/placeholders/product.jpg'}" 
                                     alt="${item.produto.nome}">
                                <div class="order-item-info">
                                    <p class="order-item-name">${item.produto.nome}</p>
                                    <p class="order-item-quantity">${item.quantidade}x ${Utils.formatCurrency(item.preco)}</p>
                                </div>
                            </div>
                        `).join('')}
                        
                        ${order.itens.length > 3 ? `
                            <p class="order-more-items">+${order.itens.length - 3} mais itens</p>
                        ` : ''}
                    </div>
                    
                    <div class="order-summary">
                        <div class="order-summary-line">
                            <span>Total:</span>
                            <span class="order-total">${Utils.formatCurrency(order.total)}</span>
                        </div>
                        <div class="order-summary-line">
                            <span>Pagamento:</span>
                            <span>${getPaymentMethodLabel(order.metodoPagamento)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="order-card-footer">
                    <a href="/pedidos/${order.id}" class="btn btn-outline btn-sm">
                        Ver Detalhes
                    </a>
                    
                    ${renderOrderActions(order)}
                </div>
            </div>
        `;
    };
    
    // Renderiza ações do pedido baseado no status
    const renderOrderActions = (order) => {
        const actions = [];
        
        // Rastrear (se enviado)
        if (order.status === 'enviado' && order.codigoRastreio) {
            actions.push(`
                <button class="btn btn-primary btn-sm" onclick="OrderService.showTracking('${order.id}')">
                    <span class="material-icons">local_shipping</span>
                    Rastrear
                </button>
            `);
        }
        
        // Cancelar (se pendente ou processando)
        if (['pendente', 'processando'].includes(order.status)) {
            actions.push(`
                <button class="btn btn-danger btn-sm" onclick="OrderService.cancel('${order.id}')">
                    <span class="material-icons">cancel</span>
                    Cancelar
                </button>
            `);
        }
        
        // Avaliar (se entregue e não avaliado)
        if (order.status === 'entregue' && !order.avaliado) {
            actions.push(`
                <button class="btn btn-success btn-sm" onclick="OrderService.showRatingModal('${order.id}')">
                    <span class="material-icons">star</span>
                    Avaliar
                </button>
            `);
        }
        
        // Recomprar
        if (order.status === 'entregue') {
            actions.push(`
                <button class="btn btn-outline btn-sm" onclick="OrderService.reorder('${order.id}')">
                    <span class="material-icons">replay</span>
                    Comprar Novamente
                </button>
            `);
        }
        
        return actions.join('');
    };
    
    // Mostra modal de rastreamento
    const showTracking = async (orderId) => {
        const loadingModal = await Modal.loading('Carregando informações de rastreamento...');
        
        try {
            const tracking = await track(orderId);
            Modal.close(loadingModal);
            
            const content = `
                <div class="tracking-info">
                    <div class="tracking-header">
                        <span class="material-icons">local_shipping</span>
                        <div>
                            <h4>Código de Rastreio</h4>
                            <p class="tracking-code">${tracking.codigo}</p>
                        </div>
                    </div>
                    
                    <div class="tracking-timeline">
                        ${tracking.eventos.map((evento, index) => `
                            <div class="tracking-event ${index === 0 ? 'active' : ''}">
                                <div class="tracking-event-marker"></div>
                                <div class="tracking-event-content">
                                    <div class="tracking-event-time">
                                        ${Utils.formatDateTime(evento.data)}
                                    </div>
                                    <div class="tracking-event-title">${evento.titulo}</div>
                                    <div class="tracking-event-desc">${evento.descricao}</div>
                                    ${evento.local ? `
                                        <div class="tracking-event-location">
                                            <span class="material-icons">place</span>
                                            ${evento.local}
                                        </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            await Modal.create({
                title: 'Rastreamento do Pedido',
                content,
                size: 'md',
                buttons: [
                    { text: 'Fechar', class: 'btn-primary', action: 'close' }
                ]
            });
            
        } catch (error) {
            Modal.close(loadingModal);
            Toast.error('Erro ao carregar rastreamento');
        }
    };
    
    // Mostra modal de avaliação
    const showRatingModal = async (orderId) => {
        let selectedRating = 0;
        
        const content = `
            <div class="rating-modal">
                <p class="mb-3">Como foi sua experiência com este pedido?</p>
                
                <div class="rating-stars" id="rating-stars">
                    ${[1, 2, 3, 4, 5].map(i => `
                        <button class="rating-star" data-rating="${i}">
                            <span class="material-icons">star_outline</span>
                        </button>
                    `).join('')}
                </div>
                
                <div class="form-group mt-3">
                    <label class="form-label">Comentário (opcional)</label>
                    <textarea 
                        class="form-control" 
                        id="rating-comment" 
                        rows="3"
                        placeholder="Conte-nos mais sobre sua experiência..."
                    ></textarea>
                </div>
            </div>
        `;
        
        const modalId = await Modal.create({
            title: 'Avaliar Pedido',
            content,
            size: 'sm',
            buttons: [
                { text: 'Cancelar', class: 'btn-secondary', action: 'close' },
                { text: 'Enviar Avaliação', class: 'btn-primary', action: 'submit' }
            ],
            onOpen: () => {
                // Configura interação das estrelas
                document.querySelectorAll('.rating-star').forEach(star => {
                    star.addEventListener('click', () => {
                        selectedRating = parseInt(star.getAttribute('data-rating'));
                        updateRatingStars(selectedRating);
                    });
                    
                    star.addEventListener('mouseenter', () => {
                        const hoverRating = parseInt(star.getAttribute('data-rating'));
                        updateRatingStars(hoverRating);
                    });
                });
                
                document.getElementById('rating-stars').addEventListener('mouseleave', () => {
                    updateRatingStars(selectedRating);
                });
            },
            onAction: async (action) => {
                if (action === 'submit') {
                    if (selectedRating === 0) {
                        Toast.error('Selecione uma avaliação');
                        return;
                    }
                    
                    const comment = document.getElementById('rating-comment').value;
                    const result = await rate(orderId, selectedRating, comment);
                    
                    if (result.success) {
                        Modal.close(modalId);
                        // Recarrega lista de pedidos
                        invalidateCache();
                    }
                }
            }
        });
        
        Modal.open(modalId);
    };
    
    // Atualiza visualização das estrelas
    const updateRatingStars = (rating) => {
        document.querySelectorAll('.rating-star').forEach((star, index) => {
            const icon = star.querySelector('.material-icons');
            icon.textContent = index < rating ? 'star' : 'star_outline';
            star.classList.toggle('active', index < rating);
        });
    };
    
    // Recomprar pedido
    const reorder = async (orderId) => {
        const confirmed = await Modal.confirm(
            'Deseja adicionar todos os itens deste pedido ao carrinho?',
            'Comprar Novamente'
        );
        
        if (!confirmed) return;
        
        const loadingToast = Toast.loading('Adicionando itens ao carrinho...');
        
        try {
            const order = await getById(orderId);
            let successCount = 0;
            
            for (const item of order.itens) {
                try {
                    await CartService.addItem(item.produtoId, item.quantidade);
                    successCount++;
                } catch (error) {
                    console.error(`Erro ao adicionar produto ${item.produtoId}:`, error);
                }
            }
            
            loadingToast.close();
            
            if (successCount === order.itens.length) {
                Toast.success('Todos os itens foram adicionados ao carrinho');
            } else if (successCount > 0) {
                Toast.warning(`${successCount} de ${order.itens.length} itens foram adicionados`);
            } else {
                Toast.error('Não foi possível adicionar os itens ao carrinho');
            }
            
            // Atualiza widget do carrinho
            CartWidget.update();
            
            // Redireciona para o carrinho
            setTimeout(() => {
                window.location.href = '/carrinho';
            }, 1000);
            
        } catch (error) {
            loadingToast.close();
            Toast.error('Erro ao processar pedido');
        }
    };
    
    // Obtém label do método de pagamento
    const getPaymentMethodLabel = (method) => {
        const labels = {
            credit_card: 'Cartão de Crédito',
            pix: 'PIX',
            boleto: 'Boleto Bancário'
        };
        
        return labels[method] || method;
    };
    
    // Invalida cache
    const invalidateCache = () => {
        cache.orders = null;
        cache.lastUpdate = null;
    };
    
    // Dispara evento customizado
    const dispatchOrderEvent = (eventName, detail) => {
        const event = new CustomEvent(eventName, { detail });
        window.dispatchEvent(event);
    };
    
    // Formata timeline do pedido
    const formatOrderTimeline = (order) => {
        const timeline = [];
        
        // Pedido criado
        timeline.push({
            date: order.createdAt,
            title: 'Pedido Realizado',
            description: 'Seu pedido foi recebido com sucesso',
            icon: 'shopping_cart',
            completed: true
        });
        
        // Pagamento
        if (order.pagamentoConfirmadoEm) {
            timeline.push({
                date: order.pagamentoConfirmadoEm,
                title: 'Pagamento Confirmado',
                description: `Pagamento via ${getPaymentMethodLabel(order.metodoPagamento)} aprovado`,
                icon: 'payment',
                completed: true
            });
        }
        
        // Preparação
        if (order.preparandoDesde) {
            timeline.push({
                date: order.preparandoDesde,
                title: 'Em Preparação',
                description: 'Seu pedido está sendo preparado',
                icon: 'restaurant',
                completed: true
            });
        }
        
        // Envio
        if (order.enviadoEm) {
            timeline.push({
                date: order.enviadoEm,
                title: 'Pedido Enviado',
                description: order.codigoRastreio ? `Código de rastreio: ${order.codigoRastreio}` : 'Seu pedido está a caminho',
                icon: 'local_shipping',
                completed: true
            });
        }
        
        // Entrega
        if (order.entregueEm) {
            timeline.push({
                date: order.entregueEm,
                title: 'Pedido Entregue',
                description: 'Pedido entregue com sucesso',
                icon: 'done_all',
                completed: true
            });
        }
        
        // Cancelamento
        if (order.canceladoEm) {
            timeline.push({
                date: order.canceladoEm,
                title: 'Pedido Cancelado',
                description: order.motivoCancelamento || 'Pedido cancelado',
                icon: 'cancel',
                completed: true,
                error: true
            });
        }
        
        return timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
    };
    
    // API pública
    return {
        STATUS,
        STATUS_LABELS,
        create,
        getAll,
        getById,
        cancel,
        track,
        rate,
        requestRefund,
        getStats,
        renderOrderCard,
        showTracking,
        showRatingModal,
        reorder,
        formatOrderTimeline,
        invalidateCache
    };
})();

// Torna OrderService global
window.OrderService = OrderService;