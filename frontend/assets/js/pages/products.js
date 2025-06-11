// Products.js - Página de listagem de produtos
// =====================================================

const ProductsPage = (() => {
    // Estado interno
    let products = [];
    let categories = [];
    let currentFilters = {
        categoria: null,
        search: null,
        minPrice: null,
        maxPrice: null,
        ordenar: null,
        page: 1,
        limit: 12
    };
    let totalPages = 1;
    let totalProducts = 0;
    let currentView = 'grid';
    let updateTimer = null;
    
    // Inicializa a página
    const init = async () => {
        // Carrega componentes comuns
        await loadComponents();
        
        // Obtém parâmetros da URL
        parseURLParams();
        
        // Configura event listeners
        setupEventListeners();
        
        // Carrega dados iniciais
        await Promise.all([
            loadCategories(),
            loadProducts()
        ]);
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
    
    // Obtém parâmetros da URL
    const parseURLParams = () => {
        const params = new URLSearchParams(window.location.search);
        
        // Categoria
        if (params.has('categoria')) {
            currentFilters.categoria = params.get('categoria');
            updatePageTitle(currentFilters.categoria);
        }
        
        // Busca
        if (params.has('search')) {
            currentFilters.search = params.get('search');
            updatePageTitle(`Busca: ${currentFilters.search}`);
        }
        
        // Outros filtros
        if (params.has('minPrice')) currentFilters.minPrice = parseFloat(params.get('minPrice'));
        if (params.has('maxPrice')) currentFilters.maxPrice = parseFloat(params.get('maxPrice'));
        if (params.has('ordenar')) currentFilters.ordenar = params.get('ordenar');
        if (params.has('page')) currentFilters.page = parseInt(params.get('page'));
    };
    
    // Atualiza título da página
    const updatePageTitle = (title) => {
        const pageTitle = document.getElementById('page-title');
        pageTitle.textContent = title || 'Todos os Produtos';
    };
    
    // Configura event listeners
    const setupEventListeners = () => {
        // Ordenação
        const sortSelect = document.getElementById('sort-select');
        sortSelect.addEventListener('change', (e) => {
            currentFilters.ordenar = e.target.value;
            currentFilters.page = 1;
            updateURL();
            loadProducts();
        });
        
        // Alternar visualização
        const viewButtons = document.querySelectorAll('.view-toggle button');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-view');
                setView(view);
            });
        });
        
        // Filtros de preço
        const minPrice = document.getElementById('min-price');
        const maxPrice = document.getElementById('max-price');
        
        [minPrice, maxPrice].forEach(input => {
            input.addEventListener('input', () => {
                clearTimeout(updateTimer);
                updateTimer = setTimeout(() => {
                    currentFilters.minPrice = minPrice.value ? parseFloat(minPrice.value) : null;
                    currentFilters.maxPrice = maxPrice.value ? parseFloat(maxPrice.value) : null;
                    currentFilters.page = 1;
                    updateURL();
                    loadProducts();
                }, 500);
            });
        });
    };
    
    // Carrega categorias
    const loadCategories = async () => {
        const container = document.getElementById('categories-filter');
        
        try {
            // Categorias hardcoded por enquanto
            categories = [
                { id: 1, nome: 'Frutas', count: 45 },
                { id: 2, nome: 'Verduras', count: 38 },
                { id: 3, nome: 'Legumes', count: 32 },
                { id: 4, nome: 'Laticínios', count: 28 },
                { id: 5, nome: 'Ovos', count: 15 },
                { id: 6, nome: 'Mel e Geleias', count: 22 }
            ];
            
            container.innerHTML = categories.map(category => `
                <div class="filter-item">
                    <input 
                        type="checkbox" 
                        id="cat-${category.id}" 
                        value="${category.nome}"
                        ${currentFilters.categoria === category.nome ? 'checked' : ''}
                    >
                    <label for="cat-${category.id}">
                        <span>${category.nome}</span>
                        <span class="filter-count">(${category.count})</span>
                    </label>
                </div>
            `).join('');
            
            // Event listeners para checkboxes
            container.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        // Desmarca outras categorias
                        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                            if (cb !== e.target) cb.checked = false;
                        });
                        currentFilters.categoria = e.target.value;
                    } else {
                        currentFilters.categoria = null;
                    }
                    currentFilters.page = 1;
                    updateURL();
                    loadProducts();
                });
            });
            
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    };
    
    // Carrega produtos
    const loadProducts = async () => {
        const container = document.getElementById('products-container');
        const resultsInfo = document.getElementById('results-info');
        
        // Mostra loading
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando produtos...</p>
            </div>
        `;
        
        try {
            // Busca produtos com filtros
            const response = await ProductService.getAll(currentFilters);
            
            products = response.produtos || [];
            totalProducts = response.total || 0;
            totalPages = response.totalPages || 1;
            
            // Atualiza informações de resultados
            resultsInfo.textContent = totalProducts > 0
                ? `${totalProducts} produto${totalProducts > 1 ? 's' : ''} encontrado${totalProducts > 1 ? 's' : ''}`
                : 'Nenhum produto encontrado';
            
            // Renderiza produtos
            if (products.length > 0) {
                container.className = currentView === 'grid' ? 'products-grid' : 'products-list';
                ProductService.renderProductList(products, container);
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons mb-3">inventory_2</span>
                        <h4>Nenhum produto encontrado</h4>
                        <p>Tente ajustar os filtros ou fazer uma nova busca</p>
                        <button class="btn btn-primary mt-3" onclick="ProductsPage.clearFilters()">
                            Limpar Filtros
                        </button>
                    </div>
                `;
            }
            
            // Renderiza paginação
            renderPagination();
            
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            container.innerHTML = `
                <div class="error-state">
                    <span class="material-icons mb-3">error_outline</span>
                    <h4>Erro ao carregar produtos</h4>
                    <p>Ocorreu um erro ao buscar os produtos. Tente novamente.</p>
                    <button class="btn btn-primary mt-3" onclick="ProductsPage.loadProducts()">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    };
    
    // Renderiza paginação
    const renderPagination = () => {
        const container = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Botão anterior
        html += `
            <button 
                onclick="ProductsPage.goToPage(${currentFilters.page - 1})"
                ${currentFilters.page === 1 ? 'disabled' : ''}
            >
                <span class="material-icons">chevron_left</span>
            </button>
        `;
        
        // Páginas
        const maxButtons = 5;
        let startPage = Math.max(1, currentFilters.page - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);
        
        if (endPage - startPage < maxButtons - 1) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }
        
        if (startPage > 1) {
            html += `<button onclick="ProductsPage.goToPage(1)">1</button>`;
            if (startPage > 2) html += `<span>...</span>`;
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button 
                    class="${i === currentFilters.page ? 'active' : ''}"
                    onclick="ProductsPage.goToPage(${i})"
                >
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span>...</span>`;
            html += `<button onclick="ProductsPage.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Botão próximo
        html += `
            <button 
                onclick="ProductsPage.goToPage(${currentFilters.page + 1})"
                ${currentFilters.page === totalPages ? 'disabled' : ''}
            >
                <span class="material-icons">chevron_right</span>
            </button>
        `;
        
        container.innerHTML = html;
    };
    
    // Vai para página específica
    const goToPage = (page) => {
        if (page < 1 || page > totalPages) return;
        
        currentFilters.page = page;
        updateURL();
        loadProducts();
        
        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    // Altera visualização
    const setView = (view) => {
        currentView = view;
        
        // Atualiza botões
        document.querySelectorAll('.view-toggle button').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-view') === view);
        });
        
        // Atualiza container
        const container = document.getElementById('products-container');
        container.className = view === 'grid' ? 'products-grid' : 'products-list';
    };
    
    // Limpa filtros
    const clearFilters = () => {
        // Reset filtros
        currentFilters = {
            categoria: null,
            search: null,
            minPrice: null,
            maxPrice: null,
            ordenar: null,
            page: 1,
            limit: 12
        };
        
        // Limpa UI
        document.getElementById('min-price').value = '';
        document.getElementById('max-price').value = '';
        document.getElementById('sort-select').value = '';
        document.querySelectorAll('#categories-filter input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Atualiza página
        updatePageTitle('Todos os Produtos');
        updateURL();
        loadProducts();
    };
    
    // Toggle sidebar mobile
    const toggleSidebar = () => {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // Previne scroll do body quando sidebar está aberta
        document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    };
    
    // Atualiza URL com filtros
    const updateURL = () => {
        const params = new URLSearchParams();
        
        Object.entries(currentFilters).forEach(([key, value]) => {
            if (value !== null && value !== '' && !(key === 'page' && value === 1)) {
                params.set(key, value);
            }
        });
        
        const newURL = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.replaceState({}, '', newURL);
    };
    
    // API pública
    return {
        init,
        loadProducts,
        goToPage,
        clearFilters,
        toggleSidebar
    };
})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    ProductsPage.init();
});