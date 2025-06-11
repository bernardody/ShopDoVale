// Checkout.js - Página de finalização de compra
// =====================================================

const CheckoutPage = (() => {
    // Estado interno
    let cartData = null;
    let checkoutData = null;
    let addresses = [];
    let selectedAddress = null;
    let selectedPayment = null;
    let isProcessing = false;
    
    // Inicializa a página
    const init = async () => {
        // Verifica autenticação
        if (!Auth.requireAuth()) return;
        
        // Obtém dados do sessionStorage
        checkoutData = Utils.session.get('checkout_data');
        
        if (!checkoutData || !checkoutData.shipping) {
            Toast.error('Dados de checkout inválidos');
            window.location.href = '/carrinho';
            return;
        }
        
        // Inicializa serviços
        await CartService.init();
        
        // Carrega dados
        await loadCheckoutData();
    };
    
    // Carrega dados do checkout
    const loadCheckoutData = async () => {
        const loadingToast = Toast.loading('Carregando dados...');
        
        try {
            // Carrega carrinho
            cartData = await CartService.load();
            
            if (!cartData || cartData.itens.length === 0) {
                Toast.warning('Carrinho vazio');
                window.location.href = '/carrinho';
                return;
            }
            
            // Carrega endereços
            await loadAddresses();
            
            // Renderiza página
            renderCheckout();
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            Toast.error('Erro ao carregar dados do checkout');
        } finally {
            loadingToast.close();
        }
    };
    
    // Carrega endereços do usuário
    const loadAddresses = async () => {
        try {
            const response = await API.enderecos.getAll();
            addresses = response || [];
            
            // Seleciona endereço padrão
            selectedAddress = addresses.find(addr => addr.padrao) || addresses[0] || null;
        } catch (error) {
            console.error('Erro ao carregar endereços:', error);
            addresses = [];
        }
    };
    
    // Renderiza página de checkout
    const renderCheckout = () => {
        const container = document.getElementById('checkout-container');
        
        container.innerHTML = `
            <div class="checkout-container">
                <!-- Formulário Principal -->
                <div class="checkout-main">
                    <!-- Endereço de Entrega -->
                    <section class="checkout-section">
                        <div class="section-header">
                            <h2 class="section-title">
                                <span class="material-icons">location_on</span>
                                Endereço de Entrega
                            </h2>
                            <button class="btn btn-sm btn-outline" onclick="CheckoutPage.addAddress()">
                                <span class="material-icons">add</span>
                                Novo Endereço
                            </button>
                        </div>
                        
                        ${renderAddresses()}
                    </section>
                    
                    <!-- Forma de Pagamento -->
                    <section class="checkout-section">
                        <div class="section-header">
                            <h2 class="section-title">
                                <span class="material-icons">payment</span>
                                Forma de Pagamento
                            </h2>
                        </div>
                        
                        ${renderPaymentMethods()}
                    </section>
                    
                    <!-- Observações -->
                    <section class="checkout-section">
                        <div class="section-header">
                            <h2 class="section-title">
                                <span class="material-icons">notes</span>
                                Observações (opcional)
                            </h2>
                        </div>
                        
                        <textarea 
                            class="form-control" 
                            id="order-notes"
                            rows="3"
                            placeholder="Instruções especiais para entrega ou preparação..."
                        ></textarea>
                    </section>
                </div>
                
                <!-- Resumo do Pedido -->
                <aside class="checkout-sidebar">
                    ${renderOrderSummary()}
                </aside>
            </div>
        `;
        
        // Configura event listeners
        setupEventListeners();
    };
    
    // Renderiza lista de endereços
    const renderAddresses = () => {
        if (addresses.length === 0) {
            return `
                <div class="empty-state">
                    <p>Nenhum endereço cadastrado</p>
                    <button class="btn btn-primary btn-sm" onclick="CheckoutPage.addAddress()">
                        Adicionar Endereço
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="address-list">
                ${addresses.map(address => `
                    <label class="address-card ${selectedAddress?.id === address.id ? 'selected' : ''}">
                        <input 
                            type="radio" 
                            name="address" 
                            value="${address.id}"
                            ${selectedAddress?.id === address.id ? 'checked' : ''}
                            onchange="CheckoutPage.selectAddress(${address.id})"
                        >
                        <div class="address-details">
                            <div class="address-label">
                                ${address.apelido || 'Endereço Principal'}
                                ${address.padrao ? '<span class="address-tag">Padrão</span>' : ''}
                            </div>
                            <div class="address-text">
                                ${address.rua}, ${address.numero}${address.complemento ? `, ${address.complemento}` : ''}<br>
                                ${address.bairro}<br>
                                ${address.cidade} - ${address.estado}<br>
                                CEP: ${Utils.formatCEP(address.cep)}
                            </div>
                        </div>
                    </label>
                `).join('')}
            </div>
        `;
    };
    
    // Renderiza métodos de pagamento
    const renderPaymentMethods = () => {
        const paymentMethods = [
            {
                id: 'credit_card',
                name: 'Cartão de Crédito',
                desc: 'Pagamento em até 12x',
                icon: 'credit_card'
            },
            {
                id: 'pix',
                name: 'PIX',
                desc: 'Aprovação instantânea',
                icon: 'qr_code'
            },
            {
                id: 'boleto',
                name: 'Boleto Bancário',
                desc: 'Vencimento em 3 dias úteis',
                icon: 'receipt'
            }
        ];
        
        return `
            <div class="payment-methods">
                ${paymentMethods.map(method => `
                    <label class="payment-method ${selectedPayment === method.id ? 'selected' : ''}">
                        <input 
                            type="radio" 
                            name="payment" 
                            value="${method.id}"
                            ${selectedPayment === method.id ? 'checked' : ''}
                            onchange="CheckoutPage.selectPayment('${method.id}')"
                        >
                        <div class="payment-method-icon">
                            <span class="material-icons">${method.icon}</span>
                        </div>
                        <div class="payment-method-details">
                            <div class="payment-method-name">${method.name}</div>
                            <div class="payment-method-desc">${method.desc}</div>
                        </div>
                    </label>
                `).join('')}
            </div>
            
            <!-- Formulários de Pagamento -->
            <div class="payment-form ${selectedPayment === 'credit_card' ? 'active' : ''}" id="form-credit_card">
                ${renderCreditCardForm()}
            </div>
            
            <div class="payment-form ${selectedPayment === 'pix' ? 'active' : ''}" id="form-pix">
                ${renderPixForm()}
            </div>
            
            <div class="payment-form ${selectedPayment === 'boleto' ? 'active' : ''}" id="form-boleto">
                ${renderBoletoForm()}
            </div>
        `;
    };
    
    // Renderiza formulário de cartão de crédito
    const renderCreditCardForm = () => {
        return `
            <div class="card-preview">
                <div class="card-number-preview" id="card-number-preview">•••• •••• •••• ••••</div>
                <div class="card-info-preview">
                    <span id="card-name-preview">NOME DO TITULAR</span>
                    <span id="card-expiry-preview">MM/AA</span>
                </div>
            </div>
            
            <form id="credit-card-form">
                <div class="form-grid">
                    <div class="form-group form-grid-full">
                        <label class="form-label">Número do Cartão</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="card-number"
                            placeholder="0000 0000 0000 0000"
                            maxlength="19"
                            required
                        >
                    </div>
                    
                    <div class="form-group form-grid-full">
                        <label class="form-label">Nome do Titular</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="card-name"
                            placeholder="Como está no cartão"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Validade</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="card-expiry"
                            placeholder="MM/AA"
                            maxlength="5"
                            required
                        >
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">CVV</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="card-cvv"
                            placeholder="000"
                            maxlength="4"
                            required
                        >
                    </div>
                    
                    <div class="form-group form-grid-full">
                        <label class="form-label">CPF do Titular</label>
                        <input 
                            type="text" 
                            class="form-control" 
                            id="card-cpf"
                            placeholder="000.000.000-00"
                            maxlength="14"
                            required
                        >
                    </div>
                    
                    <div class="form-group form-grid-full">
                        <label class="form-label">Parcelas</label>
                        <select class="form-control" id="installments" required>
                            <option value="1">1x sem juros - ${Utils.formatCurrency(getTotal())}</option>
                            ${generateInstallmentOptions()}
                        </select>
                    </div>
                </div>
            </form>
        `;
    };
    
    // Renderiza formulário PIX
    const renderPixForm = () => {
        return `
            <div class="alert alert-info">
                <span class="material-icons">info</span>
                <div>
                    <strong>Pagamento via PIX</strong><br>
                    Após finalizar o pedido, você receberá um QR Code para pagamento.
                    O pedido será confirmado automaticamente após o pagamento.
                </div>
            </div>
        `;
    };
    
    // Renderiza formulário Boleto
    const renderBoletoForm = () => {
        return `
            <div class="alert alert-info">
                <span class="material-icons">info</span>
                <div>
                    <strong>Pagamento via Boleto</strong><br>
                    O boleto será gerado após a finalização do pedido.
                    Prazo de vencimento: 3 dias úteis.
                </div>
            </div>
            
            <div class="form-group">
                <label class="form-label">CPF</label>
                <input 
                    type="text" 
                    class="form-control" 
                    id="boleto-cpf"
                    placeholder="000.000.000-00"
                    maxlength="14"
                    required
                >
            </div>
        `;
    };
    
    // Renderiza resumo do pedido
    const renderOrderSummary = () => {
        const subtotal = CartService.getSubtotal();
        const desconto = CartService.getDesconto();
        const cupom = checkoutData.coupon;
        const frete = checkoutData.shipping.valor;
        const total = getTotal();
        
        return `
            <div class="order-summary">
                <h3 class="order-summary-title">Resumo do Pedido</h3>
                
                <!-- Itens -->
                <div class="order-items">
                    ${cartData.itens.map(item => `
                        <div class="order-item">
                            <div class="order-item-image">
                                <img src="${item.produto.imagem || '/assets/images/placeholders/product.jpg'}" 
                                     alt="${item.produto.nome}">
                            </div>
                            <div class="order-item-details">
                                <div class="order-item-name">${item.produto.nome}</div>
                                <div class="order-item-info">
                                    ${item.quantidade}x ${Utils.formatCurrency(item.produto.preco)}
                                </div>
                            </div>
                            <div class="order-item-price">
                                ${Utils.formatCurrency(item.produto.preco * item.quantidade)}
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="summary-divider"></div>
                
                <!-- Valores -->
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
                
                ${cupom ? `
                    <div class="summary-line discount">
                        <span class="label">Cupom (${cupom.percentual}%):</span>
                        <span class="value">-${Utils.formatCurrency(cupom.valor)}</span>
                    </div>
                ` : ''}
                
                <div class="summary-line">
                    <span class="label">Frete (${checkoutData.shipping.nome}):</span>
                    <span class="value">
                        ${frete === 0 ? 'Grátis' : Utils.formatCurrency(frete)}
                    </span>
                </div>
                
                <div class="summary-divider"></div>
                
                <div class="summary-line total">
                    <span class="label">Total:</span>
                    <span class="value">${Utils.formatCurrency(total)}</span>
                </div>
                
                <!-- Termos -->
                <div class="form-check terms-checkbox">
                    <input 
                        type="checkbox" 
                        class="form-check-input" 
                        id="accept-terms"
                        required
                    >
                    <label class="form-check-label" for="accept-terms">
                        Li e concordo com os <a href="/termos" target="_blank">termos de compra</a>
                    </label>
                </div>
                
                <!-- Botão Finalizar -->
                <button 
                    class="btn btn-primary btn-lg btn-block" 
                    id="place-order-btn"
                    onclick="CheckoutPage.placeOrder()"
                    disabled
                >
                    <span>Finalizar Pedido</span>
                    <div class="spinner d-none"></div>
                </button>
            </div>
        `;
    };
    
    // Configura event listeners
    const setupEventListeners = () => {
        // Checkbox de termos
        const termsCheckbox = document.getElementById('accept-terms');
        if (termsCheckbox) {
            termsCheckbox.addEventListener('change', updateSubmitButton);
        }
        
        // Máscaras de input
        setupInputMasks();
        
        // Preview do cartão
        setupCardPreview();
    };
    
    // Configura máscaras de input
    const setupInputMasks = () => {
        // Número do cartão
        const cardNumber = document.getElementById('card-number');
        if (cardNumber) {
            cardNumber.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = formattedValue;
            });
        }
        
        // Validade
        const cardExpiry = document.getElementById('card-expiry');
        if (cardExpiry) {
            cardExpiry.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                }
                e.target.value = value;
            });
        }
        
        // CVV
        const cardCvv = document.getElementById('card-cvv');
        if (cardCvv) {
            cardCvv.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
        
        // CPF
        ['card-cpf', 'boleto-cpf'].forEach(id => {
            const cpfInput = document.getElementById(id);
            if (cpfInput) {
                cpfInput.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 11) {
                        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
                    }
                    e.target.value = value;
                });
            }
        });
    };
    
    // Configura preview do cartão
    const setupCardPreview = () => {
        const cardNumber = document.getElementById('card-number');
        const cardName = document.getElementById('card-name');
        const cardExpiry = document.getElementById('card-expiry');
        
        if (cardNumber) {
            cardNumber.addEventListener('input', (e) => {
                const preview = document.getElementById('card-number-preview');
                const value = e.target.value || '•••• •••• •••• ••••';
                preview.textContent = value;
            });
        }
        
        if (cardName) {
            cardName.addEventListener('input', (e) => {
                const preview = document.getElementById('card-name-preview');
                const value = e.target.value.toUpperCase() || 'NOME DO TITULAR';
                preview.textContent = value;
            });
        }
        
        if (cardExpiry) {
            cardExpiry.addEventListener('input', (e) => {
                const preview = document.getElementById('card-expiry-preview');
                const value = e.target.value || 'MM/AA';
                preview.textContent = value;
            });
        }
    };
    
    // Seleciona endereço
    const selectAddress = (addressId) => {
        selectedAddress = addresses.find(addr => addr.id === addressId);
        updateSubmitButton();
    };
    
    // Seleciona forma de pagamento
    const selectPayment = (paymentId) => {
        selectedPayment = paymentId;
        
        // Mostra/esconde formulários
        document.querySelectorAll('.payment-form').forEach(form => {
            form.classList.toggle('active', form.id === `form-${paymentId}`);
        });
        
        updateSubmitButton();
    };
    
    // Adiciona novo endereço
    const addAddress = async () => {
        const modalId = await Modal.form({
            title: 'Novo Endereço',
            size: 'md',
            fields: [
                { name: 'apelido', label: 'Apelido (opcional)', placeholder: 'Casa, Trabalho, etc.' },
                { name: 'cep', label: 'CEP', placeholder: '00000-000', required: true },
                { name: 'rua', label: 'Rua', required: true },
                { name: 'numero', label: 'Número', required: true },
                { name: 'complemento', label: 'Complemento', placeholder: 'Apto, Bloco, etc.' },
                { name: 'bairro', label: 'Bairro', required: true },
                { name: 'cidade', label: 'Cidade', required: true },
                { name: 'estado', label: 'Estado', type: 'select', required: true, options: getEstados() }
            ],
            onSubmit: async (data) => {
                try {
                    const response = await API.enderecos.create(data);
                    addresses.push(response);
                    
                    if (!selectedAddress) {
                        selectedAddress = response;
                    }
                    
                    Toast.success('Endereço adicionado');
                    renderCheckout();
                    return true;
                } catch (error) {
                    Toast.error('Erro ao adicionar endereço');
                    return false;
                }
            }
        });
    };
    
    // Obtém lista de estados
    const getEstados = () => {
        return [
            { value: 'AC', label: 'Acre' },
            { value: 'AL', label: 'Alagoas' },
            { value: 'AP', label: 'Amapá' },
            { value: 'AM', label: 'Amazonas' },
            { value: 'BA', label: 'Bahia' },
            { value: 'CE', label: 'Ceará' },
            { value: 'DF', label: 'Distrito Federal' },
            { value: 'ES', label: 'Espírito Santo' },
            { value: 'GO', label: 'Goiás' },
            { value: 'MA', label: 'Maranhão' },
            { value: 'MT', label: 'Mato Grosso' },
            { value: 'MS', label: 'Mato Grosso do Sul' },
            { value: 'MG', label: 'Minas Gerais' },
            { value: 'PA', label: 'Pará' },
            { value: 'PB', label: 'Paraíba' },
            { value: 'PR', label: 'Paraná' },
            { value: 'PE', label: 'Pernambuco' },
            { value: 'PI', label: 'Piauí' },
            { value: 'RJ', label: 'Rio de Janeiro' },
            { value: 'RN', label: 'Rio Grande do Norte' },
            { value: 'RS', label: 'Rio Grande do Sul' },
            { value: 'RO', label: 'Rondônia' },
            { value: 'RR', label: 'Roraima' },
            { value: 'SC', label: 'Santa Catarina' },
            { value: 'SP', label: 'São Paulo' },
            { value: 'SE', label: 'Sergipe' },
            { value: 'TO', label: 'Tocantins' }
        ];
    };
    
    // Gera opções de parcelamento
    const generateInstallmentOptions = () => {
        const total = getTotal();
        const maxInstallments = 12;
        const minInstallmentValue = 50;
        
        let options = [];
        
        for (let i = 2; i <= maxInstallments; i++) {
            const installmentValue = total / i;
            
            if (installmentValue >= minInstallmentValue) {
                options.push(`<option value="${i}">${i}x de ${Utils.formatCurrency(installmentValue)} sem juros</option>`);
            }
        }
        
        return options.join('');
    };
    
    // Obtém total do pedido
    const getTotal = () => {
        const subtotal = CartService.getSubtotal();
        const desconto = CartService.getDesconto();
        const cupom = checkoutData.coupon;
        const frete = checkoutData.shipping.valor;
        
        let total = subtotal - desconto + frete;
        
        if (cupom) {
            total -= cupom.valor;
        }
        
        return total;
    };
    
    // Atualiza botão de submit
    const updateSubmitButton = () => {
        const submitBtn = document.getElementById('place-order-btn');
        const termsAccepted = document.getElementById('accept-terms')?.checked;
        
        const canSubmit = selectedAddress && selectedPayment && termsAccepted && !isProcessing;
        
        if (submitBtn) {
            submitBtn.disabled = !canSubmit;
        }
    };
    
    // Valida formulário de pagamento
    const validatePaymentForm = () => {
        if (!selectedPayment) return false;
        
        if (selectedPayment === 'credit_card') {
            const form = document.getElementById('credit-card-form');
            if (!form.checkValidity()) {
                form.reportValidity();
                return false;
            }
            
            // Validações adicionais
            const cardNumber = document.getElementById('card-number').value.replace(/\s/g, '');
            if (cardNumber.length < 13 || cardNumber.length > 19) {
                Toast.error('Número do cartão inválido');
                return false;
            }
            
            const expiry = document.getElementById('card-expiry').value;
            const [month, year] = expiry.split('/').map(n => parseInt(n));
            const currentYear = new Date().getFullYear() % 100;
            const currentMonth = new Date().getMonth() + 1;
            
            if (month < 1 || month > 12 || year < currentYear || (year === currentYear && month < currentMonth)) {
                Toast.error('Validade do cartão inválida');
                return false;
            }
        }
        
        if (selectedPayment === 'boleto') {
            const cpf = document.getElementById('boleto-cpf')?.value;
            if (!cpf || !Utils.validateCPF(cpf.replace(/\D/g, ''))) {
                Toast.error('CPF inválido');
                return false;
            }
        }
        
        return true;
    };
    
    // Finaliza pedido
    const placeOrder = async () => {
        if (isProcessing) return;
        
        // Validações
        if (!selectedAddress) {
            Toast.error('Selecione um endereço de entrega');
            return;
        }
        
        if (!selectedPayment) {
            Toast.error('Selecione uma forma de pagamento');
            return;
        }
        
        if (!validatePaymentForm()) {
            return;
        }
        
        const confirmed = await Modal.confirm(
            'Confirma a finalização do pedido?',
            'Confirmar Pedido'
        );
        
        if (!confirmed) return;
        
        isProcessing = true;
        updateSubmitButton();
        
        // Mostra loading no botão
        const submitBtn = document.getElementById('place-order-btn');
        const btnText = submitBtn.querySelector('span');
        const btnSpinner = submitBtn.querySelector('.spinner');
        
        btnText.textContent = 'Processando...';
        btnSpinner.classList.remove('d-none');
        
        try {
            // Monta dados do pedido
            const orderData = {
                enderecoId: selectedAddress.id,
                metodoPagamento: selectedPayment,
                observacoes: document.getElementById('order-notes')?.value || '',
                freteId: checkoutData.shipping.id,
                cupomCodigo: checkoutData.coupon?.codigo
            };
            
            // Adiciona dados específicos do pagamento
            if (selectedPayment === 'credit_card') {
                orderData.dadosPagamento = {
                    numeroCartao: document.getElementById('card-number').value.replace(/\s/g, ''),
                    nomeCartao: document.getElementById('card-name').value,
                    validadeCartao: document.getElementById('card-expiry').value,
                    cvvCartao: document.getElementById('card-cvv').value,
                    cpfTitular: document.getElementById('card-cpf').value.replace(/\D/g, ''),
                    parcelas: parseInt(document.getElementById('installments').value)
                };
            } else if (selectedPayment === 'boleto') {
                orderData.dadosPagamento = {
                    cpf: document.getElementById('boleto-cpf').value.replace(/\D/g, '')
                };
            }
            
            // Cria pedido
            const response = await OrderService.create(orderData);
            
            // Limpa carrinho local
            await CartService.clear();
            
            // Limpa dados de checkout
            Utils.session.remove('checkout_data');
            
            // Mostra sucesso
            showSuccess(response);
            
        } catch (error) {
            console.error('Erro ao criar pedido:', error);
            Toast.error(error.message || 'Erro ao processar pedido');
            
            // Restaura botão
            btnText.textContent = 'Finalizar Pedido';
            btnSpinner.classList.add('d-none');
            isProcessing = false;
            updateSubmitButton();
        }
    };
    
    // Mostra tela de sucesso
    const showSuccess = (order) => {
        const container = document.getElementById('checkout-container');
        
        container.innerHTML = `
            <div class="checkout-success">
                <div class="success-icon">
                    <span class="material-icons">check_circle</span>
                </div>
                
                <h2 class="success-title">Pedido Realizado com Sucesso!</h2>
                <p class="success-message">
                    Obrigado por sua compra. Você receberá um e-mail com os detalhes do pedido.
                </p>
                
                <div class="order-number">
                    Pedido #${order.numero}
                </div>
                
                ${renderPaymentInstructions(order)}
                
                <div class="d-flex gap-2 justify-center">
                    <a href="/pedidos/${order.id}" class="btn btn-primary">
                        Ver Detalhes do Pedido
                    </a>
                    <a href="/produtos" class="btn btn-outline">
                        Continuar Comprando
                    </a>
                </div>
            </div>
        `;
        
        // Rola para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    // Renderiza instruções de pagamento
    const renderPaymentInstructions = (order) => {
        if (order.metodoPagamento === 'pix') {
            return `
                <div class="payment-instructions">
                    <h3>Instruções para Pagamento via PIX</h3>
                    <p>Use o QR Code abaixo ou a chave PIX para realizar o pagamento:</p>
                    
                    <div class="qr-code">
                        <img src="${order.pixQRCode}" alt="QR Code PIX">
                    </div>
                    
                    <div class="pix-key">
                        <strong>Chave PIX:</strong><br>
                        <code>${order.pixChave}</code>
                    </div>
                    
                    <p class="text-gray">
                        O pagamento deve ser realizado em até 30 minutos.
                        Após a confirmação, seu pedido será processado.
                    </p>
                </div>
            `;
        }
        
        if (order.metodoPagamento === 'boleto') {
            return `
                <div class="payment-instructions">
                    <h3>Boleto Bancário</h3>
                    <p>Seu boleto foi gerado e enviado para o e-mail cadastrado.</p>
                    
                    <a href="${order.boletoUrl}" target="_blank" class="btn btn-outline mb-3">
                        <span class="material-icons">download</span>
                        Baixar Boleto
                    </a>
                    
                    <p class="text-gray">
                        Vencimento: ${Utils.formatDate(order.boletoVencimento)}<br>
                        O pedido será processado após a confirmação do pagamento.
                    </p>
                </div>
            `;
        }
        
        return '';
    };
    
    // API pública
    return {
        init,
        selectAddress,
        selectPayment,
        addAddress,
        placeOrder
    };
})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    CheckoutPage.init();
});