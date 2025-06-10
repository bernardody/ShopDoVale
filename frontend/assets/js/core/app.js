// App.js - Inicialização e roteamento da aplicação
// ================================================

const App = (() => {
    // Configuração de rotas
    const routes = {
        '/': {
            title: 'Início',
            component: 'home',
            public: true
        },
        '/login': {
            title: 'Login',
            component: 'login',
            public: true,
            hideWhenAuth: true
        },
        '/cadastro': {
            title: 'Cadastro',
            component: 'register',
            public: true,
            hideWhenAuth: true
        },
        '/produtos': {
            title: 'Produtos',
            component: 'products',
            public: true
        },
        '/produto/:id': {
            title: 'Produto',
            component: 'product-detail',
            public: true
        },
        '/carrinho': {
            title: 'Carrinho',
            component: 'cart',
            public: true
        },
        '/checkout': {
            title: 'Finalizar Compra',
            component: 'checkout',
            requireAuth: true
        },
        '/perfil': {
            title: 'Meu Perfil',
            component: 'profile',
            requireAuth: true
        },
        '/pedidos': {
            title: 'Meus Pedidos',
            component: 'orders',
            requireAuth: true
        },
        '/produtor/dashboard': {
            title: 'Dashboard',
            component: 'producer-dashboard',
            requireAuth: true,
            requireRole: 'produtor'
        },
        '/produtor/produtos': {
            title: 'Meus Produtos',
            component: 'producer-products',
            requireAuth: true,
            requireRole: 'produtor'
        },
        '/produtor/pedidos': {
            title: 'Pedidos Recebidos',
            component: 'producer-orders',
            requireAuth: true,
            requireRole: 'produtor'
        }
    };

    // Estado da aplicação
    let currentRoute = null;
    let routeParams = {};

    // Elemento principal onde o conteúdo será renderizado
    let appContainer = null;

    // Componentes carregados
    const components = {};

    // Inicializa a aplicação
    const init = () => {
        // Inicializa autenticação
        Auth.init();

        // Pega container principal
        appContainer = document.getElementById('app');
        if (!appContainer) {
            console.error('Container #app não encontrado');
            return;
        }

        // Inicializa componentes globais
        initializeGlobalComponents();

        // Configura listeners
        setupEventListeners();

        // Carrega rota inicial
        loadRoute();

        // Monitora mudanças de autenticação
        Auth.onAuthStateChange((isAuthenticated) => {
            // Atualiza navbar
            if (window.Navbar) {
                Navbar.update();
            }

            // Recarrega rota se necessário
            const route = routes[currentRoute];
            if (route) {
                if (route.hideWhenAuth && isAuthenticated) {
                    navigateTo('/');
                } else if (route.requireAuth && !isAuthenticated) {
                    navigateTo('/login');
                }
            }
        });
    };

    // Inicializa componentes globais
    const initializeGlobalComponents = async () => {
        // Carrega e renderiza navbar
        if (window.Navbar) {
            await Navbar.init();
        }

        // Carrega e renderiza footer
        if (window.Footer) {
            await Footer.init();
        }

        // Inicializa widget do carrinho
        if (window.CartWidget) {
            CartWidget.init();
        }
    };

    // Configura event listeners
    const setupEventListeners = () => {
        // Listener para mudanças de URL (botão voltar/avançar)
        window.addEventListener('popstate', loadRoute);

        // Intercepta cliques em links
        document.addEventListener('click', (e) => {
            // Verifica se é um link interno
            const link = e.target.closest('a[href^="/"]');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                navigateTo(href);
            }
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            // ESC fecha modais
            if (e.key === 'Escape') {
                Modal.closeAll();
            }
        });
    };

    // Navega para uma rota
    const navigateTo = (path, replace = false) => {
        if (replace) {
            history.replaceState(null, '', path);
        } else {
            history.pushState(null, '', path);
        }
        loadRoute();
    };

    // Carrega rota atual
    const loadRoute = async () => {
        const path = window.location.pathname;
        const route = matchRoute(path);

        if (!route) {
            show404();
            return;
        }

        // Verifica permissões
        if (route.config.requireAuth && !Auth.isAuthenticated()) {
            Utils.session.set('redirect_after_login', path);
            navigateTo('/login');
            return;
        }

        if (route.config.requireRole) {
            if (route.config.requireRole === 'produtor' && !Auth.isProducer()) {
                Toast.error('Acesso restrito a produtores');
                navigateTo('/');
                return;
            }
            if (route.config.requireRole === 'admin' && !Auth.isAdmin()) {
                Toast.error('Acesso restrito a administradores');
                navigateTo('/');
                return;
            }
        }

        // Se usuário autenticado tentar acessar página de login/cadastro
        if (route.config.hideWhenAuth && Auth.isAuthenticated()) {
            navigateTo('/');
            return;
        }

        // Atualiza estado
        currentRoute = route.path;
        routeParams = route.params;

        // Atualiza título da página
        document.title = `${route.config.title} - Shop do Vale`;

        // Carrega e renderiza componente
        await loadComponent(route.config.component);

        // Scroll para o topo
        window.scrollTo(0, 0);

        // Atualiza navbar (marca item ativo)
        if (window.Navbar) {
            Navbar.setActiveItem(path);
        }
    };

    // Encontra rota correspondente ao path
    const matchRoute = (path) => {
        // Primeiro tenta match exato
        if (routes[path]) {
            return {
                path,
                config: routes[path],
                params: {}
            };
        }

        // Depois tenta rotas com parâmetros
        for (const [routePath, config] of Object.entries(routes)) {
            const regex = pathToRegex(routePath);
            const match = path.match(regex);
            
            if (match) {
                const params = extractParams(routePath, match);
                return {
                    path: routePath,
                    config,
                    params
                };
            }
        }

        return null;
    };

    // Converte path com parâmetros em regex
    const pathToRegex = (path) => {
        const pattern = path
            .replace(/\//g, '\\/')
            .replace(/:(\w+)/g, '([^/]+)');
        return new RegExp(`^${pattern}$`);
    };

    // Extrai parâmetros da URL
    const extractParams = (routePath, match) => {
        const params = {};
        const paramNames = routePath.match(/:(\w+)/g) || [];
        
        paramNames.forEach((paramName, index) => {
            const name = paramName.substring(1); // Remove :
            params[name] = match[index + 1];
        });
        
        return params;
    };

    // Carrega e executa componente
    const loadComponent = async (componentName) => {
        try {
            // Mostra loading
            showLoading();

            // Verifica se o componente existe
            const component = getComponent(componentName);
            if (!component) {
                console.error(`Componente ${componentName} não encontrado`);
                show404();
                return;
            }

            // Renderiza componente
            if (typeof component.render === 'function') {
                await component.render(appContainer, routeParams);
            } else {
                console.error(`Componente ${componentName} não tem método render`);
                show404();
            }
        } catch (error) {
            console.error('Erro ao carregar componente:', error);
            showError();
        }
    };

    // Obtém componente pelo nome
    const getComponent = (name) => {
        // Mapeia nomes para objetos globais
        const componentMap = {
            'home': window.HomePage,
            'login': window.LoginPage,
            'register': window.RegisterPage,
            'products': window.ProductsPage,
            'product-detail': window.ProductDetailPage,
            'cart': window.CartPage,
            'checkout': window.CheckoutPage,
            'profile': window.ProfilePage,
            'orders': window.OrdersPage,
            'producer-dashboard': window.ProducerDashboard,
            'producer-products': window.ProducerProducts,
            'producer-orders': window.ProducerOrders
        };

        return componentMap[name];
    };

    // Mostra tela de loading
    const showLoading = () => {
        appContainer.innerHTML = `
            <div class="container">
                <div class="d-flex justify-center align-center" style="min-height: 400px;">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
    };

    // Mostra página 404
    const show404 = () => {
        appContainer.innerHTML = `
            <div class="container">
                <div class="text-center" style="padding: 100px 0;">
                    <h1 class="text-primary mb-4">404</h1>
                    <h2 class="mb-3">Página não encontrada</h2>
                    <p class="text-secondary mb-4">
                        A página que você está procurando não existe ou foi removida.
                    </p>
                    <a href="/" class="btn btn-primary">Voltar ao início</a>
                </div>
            </div>
        `;
    };

    // Mostra tela de erro
    const showError = () => {
        appContainer.innerHTML = `
            <div class="container">
                <div class="text-center" style="padding: 100px 0;">
                    <h2 class="mb-3">Ops! Algo deu errado</h2>
                    <p class="text-secondary mb-4">
                        Ocorreu um erro ao carregar a página. Por favor, tente novamente.
                    </p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        Recarregar página
                    </button>
                </div>
            </div>
        `;
    };

    // Helpers públicos
    const getRouteParams = () => routeParams;
    const getCurrentRoute = () => currentRoute;
    
    const getQueryParams = () => {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    };

    // API pública
    return {
        init,
        navigateTo,
        getRouteParams,
        getCurrentRoute,
        getQueryParams
    };
})();

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Torna App global
window.App = App;