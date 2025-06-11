// Navbar.js - Componente de navegação principal
// =====================================================

const Navbar = (() => {
    // Estado interno
    let navbarElement = null;
    let isInitialized = false;
    let isMobileMenuOpen = false;

    // Elementos DOM
    const elements = {
        toggle: null,
        nav: null,
        searchInput: null,
        loginBtn: null,
        userAvatar: null,
        userInitial: null,
        userImage: null,
        userDropdown: null,
        consumerMenu: null,
        producerMenu: null,
        logoutBtn: null,
        userMenu: null
    };

    // Inicializa a navbar
    const init = async () => {
        if (isInitialized) return;

        try {
            // Carrega HTML da navbar
            const response = await fetch('/components/navbar.html');
            const html = await response.text();
            
            // Insere no DOM
            const navbarRoot = document.getElementById('navbar-root');
            if (!navbarRoot) {
                console.error('Elemento #navbar-root não encontrado');
                return;
            }
            
            navbarRoot.innerHTML = html;
            navbarElement = document.getElementById('navbar');
            
            // Captura elementos
            cacheElements();
            
            // Configura event listeners
            setupEventListeners();
            
            // Atualiza estado baseado na autenticação
            update();
            
            // Marca rota ativa
            setActiveItem(window.location.pathname);
            
            isInitialized = true;
        } catch (error) {
            console.error('Erro ao inicializar navbar:', error);
        }
    };

    // Captura referências dos elementos
    const cacheElements = () => {
        elements.toggle = document.getElementById('navbar-toggle');
        elements.nav = document.getElementById('navbar-nav');
        elements.searchInput = document.getElementById('navbar-search');
        elements.loginBtn = document.getElementById('login-btn');
        elements.userAvatar = document.getElementById('user-avatar');
        elements.userInitial = document.getElementById('user-initial');
        elements.userImage = document.getElementById('user-image');
        elements.userDropdown = document.getElementById('user-dropdown');
        elements.consumerMenu = document.getElementById('consumer-menu');
        elements.producerMenu = document.getElementById('producer-menu');
        elements.logoutBtn = document.getElementById('logout-btn');
        elements.userMenu = document.getElementById('user-menu');
    };

    // Configura event listeners
    const setupEventListeners = () => {
        // Toggle menu mobile
        if (elements.toggle) {
            elements.toggle.addEventListener('click', toggleMobileMenu);
        }

        // Busca
        if (elements.searchInput) {
            elements.searchInput.addEventListener('keypress', handleSearch);
        }

        // Botão de login
        if (elements.loginBtn) {
            elements.loginBtn.addEventListener('click', () => {
                App.navigateTo('/login');
            });
        }

        // Menu do usuário
        if (elements.userAvatar) {
            elements.userAvatar.addEventListener('click', toggleUserMenu);
        }

        // Logout
        if (elements.logoutBtn) {
            elements.logoutBtn.addEventListener('click', handleLogout);
        }

        // Fecha dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!elements.userMenu.contains(e.target)) {
                closeUserMenu();
            }
        });

        // Links de navegação
        const navLinks = navbarElement.querySelectorAll('.navbar-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                App.navigateTo(route);
                closeMobileMenu();
            });
        });

        // Fecha menu mobile ao redimensionar
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                closeMobileMenu();
            }
        });
    };

    // Atualiza estado da navbar baseado na autenticação
    const update = () => {
        if (!isInitialized) return;

        const isAuthenticated = Auth.isAuthenticated();
        const user = Auth.getUser();

        if (isAuthenticated && user) {
            // Esconde botão de login
            Utils.addClass(elements.loginBtn, 'd-none');
            
            // Mostra avatar do usuário
            Utils.removeClass(elements.userAvatar, 'd-none');
            
            // Atualiza avatar
            if (user.avatar) {
                elements.userImage.src = user.avatar;
                Utils.removeClass(elements.userImage, 'd-none');
                Utils.addClass(elements.userInitial, 'd-none');
            } else {
                const initial = user.nome ? user.nome.charAt(0).toUpperCase() : 'U';
                elements.userInitial.textContent = initial;
                Utils.addClass(elements.userImage, 'd-none');
                Utils.removeClass(elements.userInitial, 'd-none');
            }

            // Mostra/esconde menus baseado no tipo de usuário
            if (Auth.isProducer()) {
                Utils.removeClass(elements.producerMenu, 'd-none');
            } else {
                Utils.addClass(elements.producerMenu, 'd-none');
            }
        } else {
            // Mostra botão de login
            Utils.removeClass(elements.loginBtn, 'd-none');
            
            // Esconde avatar do usuário
            Utils.addClass(elements.userAvatar, 'd-none');
        }
    };

    // Toggle menu mobile
    const toggleMobileMenu = () => {
        isMobileMenuOpen = !isMobileMenuOpen;
        
        if (isMobileMenuOpen) {
            Utils.addClass(navbarElement, 'mobile-open');
            document.body.style.overflow = 'hidden';
        } else {
            Utils.removeClass(navbarElement, 'mobile-open');
            document.body.style.overflow = '';
        }
    };

    // Fecha menu mobile
    const closeMobileMenu = () => {
        isMobileMenuOpen = false;
        Utils.removeClass(navbarElement, 'mobile-open');
        document.body.style.overflow = '';
    };

    // Toggle menu do usuário
    const toggleUserMenu = (e) => {
        e.stopPropagation();
        Utils.toggleClass(elements.userMenu, 'active');
    };

    // Fecha menu do usuário
    const closeUserMenu = () => {
        Utils.removeClass(elements.userMenu, 'active');
    };

    // Handle busca
    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = elements.searchInput.value.trim();
            
            if (query) {
                App.navigateTo(`/produtos?busca=${encodeURIComponent(query)}`);
                elements.searchInput.value = '';
                closeMobileMenu();
            }
        }
    };

    // Handle logout
    const handleLogout = async (e) => {
        e.preventDefault();
        
        try {
            await Auth.logout();
            Toast.success('Logout realizado com sucesso');
            closeUserMenu();
        } catch (error) {
            Toast.error('Erro ao fazer logout');
        }
    };

    // Define item ativo no menu
    const setActiveItem = (path) => {
        if (!navbarElement) return;

        // Remove active de todos os links
        const navLinks = navbarElement.querySelectorAll('.navbar-link');
        navLinks.forEach(link => {
            Utils.removeClass(link, 'active');
        });

        // Adiciona active ao link correspondente
        const activeLink = navbarElement.querySelector(`[data-route="${path}"]`);
        if (activeLink) {
            Utils.addClass(activeLink, 'active');
        } else {
            // Tenta encontrar link parcial (para rotas filhas)
            navLinks.forEach(link => {
                const route = link.getAttribute('data-route');
                if (route !== '/' && path.startsWith(route)) {
                    Utils.addClass(link, 'active');
                }
            });
        }
    };

    // Mostra notificação no ícone do carrinho
    const showCartNotification = () => {
        // Delega para CartWidget
        if (window.CartWidget) {
            CartWidget.animate();
        }
    };

    // API pública
    return {
        init,
        update,
        setActiveItem,
        showCartNotification
    };
})();

// Torna Navbar global
window.Navbar = Navbar;