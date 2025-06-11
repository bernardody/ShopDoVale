// UserService.js - Serviço para gerenciamento de usuários
// =====================================================

const UserService = (() => {
    'use strict';

    // Cache de dados do usuário
    let userCache = null;
    let cacheTimestamp = null;
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    // Obtém perfil do usuário
    const getProfile = async (forceRefresh = false) => {
        try {
            // Verifica cache
            if (!forceRefresh && userCache && cacheTimestamp) {
                const now = Date.now();
                if (now - cacheTimestamp < CACHE_DURATION) {
                    return { success: true, data: userCache };
                }
            }

            // Busca dados atualizados
            const data = await API.users.getProfile();
            
            // Atualiza cache
            userCache = data;
            cacheTimestamp = Date.now();
            
            // Atualiza dados no Auth
            Auth.updateUser(data);
            
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao obter perfil:', error);
            return { 
                success: false, 
                error: error.message || 'Erro ao carregar perfil' 
            };
        }
    };

    // Atualiza perfil do usuário
    const updateProfile = async (userData) => {
        try {
            // Valida dados antes de enviar
            const validation = validateProfileData(userData);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Envia atualização
            const data = await API.users.updateProfile(userData);
            
            // Atualiza cache
            userCache = data;
            cacheTimestamp = Date.now();
            
            // Atualiza dados no Auth
            Auth.updateUser(data);
            
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            return { 
                success: false, 
                error: error.message || 'Erro ao atualizar perfil' 
            };
        }
    };

    // Altera senha
    const changePassword = async (currentPassword, newPassword, confirmPassword) => {
        try {
            // Validações
            if (!currentPassword || !newPassword || !confirmPassword) {
                return { success: false, error: 'Todos os campos são obrigatórios' };
            }

            if (newPassword.length < 6) {
                return { success: false, error: 'Nova senha deve ter no mínimo 6 caracteres' };
            }

            if (newPassword !== confirmPassword) {
                return { success: false, error: 'As senhas não coincidem' };
            }

            if (currentPassword === newPassword) {
                return { success: false, error: 'A nova senha deve ser diferente da atual' };
            }

            // Envia alteração
            await API.users.changePassword({
                current_password: currentPassword,
                new_password: newPassword,
                new_password_confirmation: confirmPassword
            });
            
            return { success: true };
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            return { 
                success: false, 
                error: error.message || 'Erro ao alterar senha' 
            };
        }
    };

    // Upload de avatar
    const uploadAvatar = async (file) => {
        try {
            // Valida arquivo
            const validation = validateImageFile(file);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Cria FormData
            const formData = new FormData();
            formData.append('avatar', file);

            // Faz upload com progresso
            const data = await API.users.uploadAvatar(formData, (progress) => {
                // Callback de progresso pode ser usado aqui
                console.log(`Upload: ${progress}%`);
            });

            // Atualiza cache
            if (userCache && data.avatar_url) {
                userCache.avatar_url = data.avatar_url;
                Auth.updateUser({ avatar_url: data.avatar_url });
            }

            return { success: true, data };
        } catch (error) {
            console.error('Erro ao fazer upload de avatar:', error);
            return { 
                success: false, 
                error: error.message || 'Erro ao enviar imagem' 
            };
        }
    };

    // Remove avatar
    const removeAvatar = async () => {
        try {
            await API.users.updateProfile({ avatar_url: null });
            
            // Atualiza cache
            if (userCache) {
                userCache.avatar_url = null;
                Auth.updateUser({ avatar_url: null });
            }

            return { success: true };
        } catch (error) {
            console.error('Erro ao remover avatar:', error);
            return { 
                success: false, 
                error: error.message || 'Erro ao remover imagem' 
            };
        }
    };

    // Deleta conta
    const deleteAccount = async (password) => {
        try {
            if (!password) {
                return { success: false, error: 'Senha é obrigatória para excluir a conta' };
            }

            // Confirma exclusão
            await API.users.deleteAccount({ password });
            
            // Limpa cache e faz logout
            clearCache();
            Auth.logout();
            
            return { success: true };
        } catch (error) {
            console.error('Erro ao deletar conta:', error);
            return { 
                success: false, 
                error: error.message || 'Erro ao excluir conta' 
            };
        }
    };

    // Obtém estatísticas do usuário
    const getStats = async () => {
        try {
            const stats = {
                totalPedidos: 0,
                pedidosAndamento: 0,
                totalGasto: 0,
                produtosFavoritos: 0
            };

            // Se for produtor, busca estatísticas diferentes
            if (Auth.isProducer()) {
                const dashboard = await API.dashboard.getStats();
                return {
                    success: true,
                    data: {
                        totalVendas: dashboard.total_vendas || 0,
                        pedidosPendentes: dashboard.pedidos_pendentes || 0,
                        totalReceita: dashboard.total_receita || 0,
                        produtosAtivos: dashboard.produtos_ativos || 0
                    }
                };
            }

            // Busca pedidos do consumidor
            const pedidos = await API.pedidos.getAll({ limit: 1000 });
            
            if (pedidos && pedidos.data) {
                stats.totalPedidos = pedidos.total || pedidos.data.length;
                stats.pedidosAndamento = pedidos.data.filter(p => 
                    ['pendente', 'processando', 'enviado'].includes(p.status)
                ).length;
                stats.totalGasto = pedidos.data.reduce((sum, p) => sum + (p.total || 0), 0);
            }

            return { success: true, data: stats };
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return { 
                success: false, 
                error: error.message || 'Erro ao carregar estatísticas' 
            };
        }
    };

    // Valida dados do perfil
    const validateProfileData = (data) => {
        if (data.nome && data.nome.length < 3) {
            return { valid: false, error: 'Nome deve ter no mínimo 3 caracteres' };
        }

        if (data.email && !Utils.isValidEmail(data.email)) {
            return { valid: false, error: 'E-mail inválido' };
        }

        if (data.telefone) {
            const telefone = data.telefone.replace(/\D/g, '');
            if (!Utils.isValidPhone(telefone)) {
                return { valid: false, error: 'Telefone inválido' };
            }
        }

        if (data.cpf && !Utils.isValidCPF(data.cpf)) {
            return { valid: false, error: 'CPF inválido' };
        }

        return { valid: true };
    };

    // Valida arquivo de imagem
    const validateImageFile = (file) => {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (!file) {
            return { valid: false, error: 'Nenhum arquivo selecionado' };
        }

        if (file.size > maxSize) {
            return { valid: false, error: 'Arquivo muito grande. Máximo: 5MB' };
        }

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Formato inválido. Use: JPG, PNG ou WebP' };
        }

        return { valid: true };
    };

    // Limpa cache
    const clearCache = () => {
        userCache = null;
        cacheTimestamp = null;
    };

    // Formata dados do usuário para exibição
    const formatUserData = (user) => {
        if (!user) return null;

        return {
            ...user,
            nomeExibicao: user.nome ? user.nome.split(' ')[0] : 'Usuário',
            iniciais: getInitials(user.nome),
            telefoneFormatado: user.telefone ? Utils.formatPhone(user.telefone) : '',
            cpfFormatado: user.cpf ? Utils.formatCPF(user.cpf) : '',
            dataCadastroFormatada: user.created_at ? Utils.formatDate(user.created_at) : '',
            tipoExibicao: getTipoExibicao(user.tipo)
        };
    };

    // Obtém iniciais do nome
    const getInitials = (nome) => {
        if (!nome) return 'U';
        
        const parts = nome.trim().split(' ');
        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }
        
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    // Obtém tipo de usuário para exibição
    const getTipoExibicao = (tipo) => {
        const tipos = {
            consumidor: 'Consumidor',
            produtor: 'Produtor',
            admin: 'Administrador'
        };
        return tipos[tipo] || tipo;
    };

    // API pública
    return {
        getProfile,
        updateProfile,
        changePassword,
        uploadAvatar,
        removeAvatar,
        deleteAccount,
        getStats,
        formatUserData,
        clearCache
    };
})();

// Torna UserService global
window.UserService = UserService;