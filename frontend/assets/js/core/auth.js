// Auth.js - Gerenciamento de autenticação
// ========================================

const Auth = (() => {
    // Constantes
    const TOKEN_KEY = 'shopvale_token';
    const USER_KEY = 'shopvale_user';
    const REMEMBER_KEY = 'shopvale_remember';

    // Estado interno
    let currentUser = null;
    let authStateCallbacks = [];

    // Inicializa auth (carrega usuário do storage se existir)
    const init = () => {
        const token = getToken();
        const savedUser = Utils.storage.get(USER_KEY);
        
        if (token && savedUser) {
            currentUser = savedUser;
            notifyAuthStateChange(true);
        }
    };

    // Obtém token armazenado
    const getToken = () => {
        return Utils.storage.get(TOKEN_KEY) || Utils.session.get(TOKEN_KEY);
    };

    // Armazena token
    const setToken = (token, remember = false) => {
        if (remember) {
            Utils.storage.set(TOKEN_KEY, token);
            Utils.session.remove(TOKEN_KEY);
        } else {
            Utils.session.set(TOKEN_KEY, token);
            Utils.storage.remove(TOKEN_KEY);
        }
    };

    // Remove token
    const removeToken = () => {
        Utils.storage.remove(TOKEN_KEY);
        Utils.session.remove(TOKEN_KEY);
    };

    // Obtém usuário atual
    const getUser = () => {
        return currentUser;
    };

    // Atualiza dados do usuário
    const updateUser = (userData) => {
        currentUser = { ...currentUser, ...userData };
        Utils.storage.set(USER_KEY, currentUser);
    };

    // Verifica se está autenticado
    const isAuthenticated = () => {
        return !!getToken() && !!currentUser;
    };

    // Verifica se é produtor
    const isProducer = () => {
        return currentUser?.tipo === 'produtor';
    };

    // Verifica se é admin
    const isAdmin = () => {
        return currentUser?.tipo === 'admin';
    };

    // Login
    const login = async (credentials, remember = false) => {
        try {
            // Faz requisição de login
            const response = await API.auth.login(credentials);

            if (response.token && response.user) {
                // Armazena token
                setToken(response.token, remember);
                
                // Armazena dados do usuário
                currentUser = response.user;
                Utils.storage.set(USER_KEY, currentUser);
                
                // Salva preferência de "lembrar-me"
                if (remember) {
                    Utils.storage.set(REMEMBER_KEY, credentials.email);
                } else {
                    Utils.storage.remove(REMEMBER_KEY);
                }

                // Notifica mudança de estado
                notifyAuthStateChange(true);

                return { success: true, user: currentUser };
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            return { 
                success: false, 
                error: error.message || 'Erro ao fazer login' 
            };
        }
    };

    // Registro
    const register = async (userData) => {
        try {
            const response = await API.auth.register(userData);

            if (response.token && response.user) {
                // Faz login automaticamente após registro
                setToken(response.token, false);
                currentUser = response.user;
                Utils.storage.set(USER_KEY, currentUser);
                notifyAuthStateChange(true);

                return { success: true, user: currentUser };
            } else {
                throw new Error('Resposta inválida do servidor');
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            return { 
                success: false, 
                error: error.message || 'Erro ao criar conta' 
            };
        }
    };

    // Logout
    const logout = async () => {
        try {
            // Tenta fazer logout no servidor (opcional)
            await API.auth.logout().catch(() => {});
        } catch (error) {
            console.error('Erro ao fazer logout no servidor:', error);
        }

        // Limpa dados locais
        removeToken();
        Utils.storage.remove(USER_KEY);
        currentUser = null;

        // Notifica mudança de estado
        notifyAuthStateChange(false);

        // Redireciona para home
        window.location.href = '/';
    };

    // Atualiza token (refresh)
    const refreshToken = async () => {
        try {
            const response = await API.auth.refreshToken();
            if (response.token) {
                const remember = !!Utils.storage.get(TOKEN_KEY);
                setToken(response.token, remember);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao atualizar token:', error);
            return false;
        }
    };

    // Recuperação de senha
    const forgotPassword = async (email) => {
        try {
            await API.auth.forgotPassword(email);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.message || 'Erro ao enviar email de recuperação' 
            };
        }
    };

    // Reset de senha
    const resetPassword = async (token, newPassword) => {
        try {
            await API.auth.resetPassword(token, newPassword);
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                error: error.message || 'Erro ao redefinir senha' 
            };
        }
    };

    // Registra callback para mudanças de autenticação
    const onAuthStateChange = (callback) => {
        authStateCallbacks.push(callback);
        
        // Retorna função para remover o callback
        return () => {
            authStateCallbacks = authStateCallbacks.filter(cb => cb !== callback);
        };
    };

    // Notifica callbacks sobre mudança de estado
    const notifyAuthStateChange = (isAuthenticated) => {
        authStateCallbacks.forEach(callback => {
            try {
                callback(isAuthenticated, currentUser);
            } catch (error) {
                console.error('Erro em auth callback:', error);
            }
        });
    };

    // Verifica e redireciona se não autenticado
    const requireAuth = (redirectTo = '/login') => {
        if (!isAuthenticated()) {
            // Salva URL atual para redirecionar após login
            const currentPath = window.location.pathname + window.location.search;
            Utils.session.set('redirect_after_login', currentPath);
            
            window.location.href = redirectTo;
            return false;
        }
        return true;
    };

    // Verifica e redireciona se não for produtor
    const requireProducer = (redirectTo = '/') => {
        if (!requireAuth()) return false;
        
        if (!isProducer()) {
            Toast.error('Acesso restrito a produtores');
            window.location.href = redirectTo;
            return false;
        }
        return true;
    };

    // Verifica e redireciona se não for admin
    const requireAdmin = (redirectTo = '/') => {
        if (!requireAuth()) return false;
        
        if (!isAdmin()) {
            Toast.error('Acesso restrito a administradores');
            window.location.href = redirectTo;
            return false;
        }
        return true;
    };

    // Obtém email salvo (remember me)
    const getRememberedEmail = () => {
        return Utils.storage.get(REMEMBER_KEY) || '';
    };

    // Middleware para rotas protegidas
    const authMiddleware = (requiredRole = null) => {
        return (params, next) => {
            if (!isAuthenticated()) {
                requireAuth();
                return;
            }

            if (requiredRole === 'produtor' && !isProducer()) {
                requireProducer();
                return;
            }

            if (requiredRole === 'admin' && !isAdmin()) {
                requireAdmin();
                return;
            }

            next(params);
        };
    };

    // API pública
    return {
        init,
        getToken,
        getUser,
        updateUser,
        isAuthenticated,
        isProducer,
        isAdmin,
        login,
        register,
        logout,
        refreshToken,
        forgotPassword,
        resetPassword,
        onAuthStateChange,
        requireAuth,
        requireProducer,
        requireAdmin,
        getRememberedEmail,
        authMiddleware
    };
})();

// Torna Auth global
window.Auth = Auth;