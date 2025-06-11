// Home.js - Página inicial
// =====================================================

const HomePage = (() => {
    // Estado interno
    let featuredProducts = [];
    let categories = [];
    
    // Inicializa a página
    const init = async () => {
        // Carrega componentes comuns
        await loadComponents();
        
        // Configura busca do hero
        setupHeroSearch();
        
        // Carrega dados
        await Promise.all([
            loadCategories(),
            loadFeaturedProducts()
        ]);
        
        // Anima entrada dos elementos
        animatePageLoad();
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
    
    // Configura busca do hero
    const setupHeroSearch = () => {
        const form = document.getElementById('hero-search-form');
        const input = document.getElementById('hero-search-input');
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = input.value.trim();
            
            if (query) {
                // Redireciona para página de produtos com busca
                window.location.href = `/produtos?search=${encodeURIComponent(query)}`;
            }
        });
        
        // Sugestões de busca (opcional)
        let searchTimer;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            const query = e.target.value.trim();
            
            if (query.length >= 3) {
                searchTimer = setTimeout(() => {
                    // Implementar sugestões de busca se necessário
                }, 300);
            }
        });
    };
    
    // Carrega categorias
    const loadCategories = async () => {
        const container = document.getElementById('categories-grid');
        
        try {
            // Categorias hardcoded por enquanto
            // Em produção, buscar do backend
            categories = [
                { id: 1, nome: 'Frutas', icon: 'nutrition', count: 45 },
                { id: 2, nome: 'Verduras', icon: 'eco', count: 38 },
                { id: 3, nome: 'Legumes', icon: 'grass', count: 32 },
                { id: 4, nome: 'Laticínios', icon: 'breakfast_dining', count: 28 },
                { id: 5, nome: 'Ovos', icon: 'egg', count: 15 },
                { id: 6, nome: 'Mel e Geleias', icon: 'honey', count: 22 }
            ];
            
            container.innerHTML = categories.map(category => `
                <a href="/produtos?categoria=${encodeURIComponent(category.nome)}" 
                   class="category-card">
                    <span class="material-icons">${category.icon}</span>
                    <h3>${category.nome}</h3>
                    <small class="text-gray">${category.count} produtos</small>
                </a>
            `).join('');
            
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            container.innerHTML = '<p class="text-center text-gray">Erro ao carregar categorias</p>';
        }
    };
    
    // Carrega produtos em destaque
    const loadFeaturedProducts = async () => {
        const container = document.getElementById('featured-products');
        
        // Mostra loading
        container.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Carregando produtos...</p>
            </div>
        `;
        
        try {
            // Busca produtos em destaque
            featuredProducts = await ProductService.getFeatured(8);
            
            // Renderiza produtos
            ProductService.renderProductList(featuredProducts, container);
            
        } catch (error) {
            console.error('Erro ao carregar produtos em destaque:', error);
            container.innerHTML = `
                <div class="error-state">
                    <span class="material-icons mb-2">error_outline</span>
                    <p>Erro ao carregar produtos</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="HomePage.loadFeaturedProducts()">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    };
    
    // Anima entrada dos elementos
    const animatePageLoad = () => {
        // Adiciona classes de animação
        const elements = [
            '.hero-content',
            '.categories-section',
            '.featured-section',
            '.benefits-section',
            '.cta-section'
        ];
        
        elements.forEach((selector, index) => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.opacity = '0';
                element.style.transform = 'translateY(20px)';
                element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                
                setTimeout(() => {
                    element.style.opacity = '1';
                    element.style.transform = 'translateY(0)';
                }, index * 100);
            }
        });
    };
    
    // Scroll suave para seções
    const scrollToSection = (sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };
    
    // API pública
    return {
        init,
        loadFeaturedProducts,
        scrollToSection
    };
})();

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    HomePage.init();
});