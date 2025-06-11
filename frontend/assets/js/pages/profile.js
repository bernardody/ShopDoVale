// Profile.js - Página de perfil do usuário
// =====================================================

(function() {
    'use strict';

    // Estado
    let currentUser = null;
    let currentTab = 'dados-pessoais';
    let isLoading = false;

    // Elementos
    const elements = {
        // Loading
        loading: null,
        
        // User info
        userName: null,
        userEmail: null,
        userType: null,
        avatarInitials: null,
        avatarImage: null,
        avatarInput: null,
        
        // Stats
        statPedidos: null,
        statAndamento: null,
        
        // Tabs
        navItems: null,
        tabs: null,
        
        // Forms
        profileForm: null,
        passwordForm: null,
        notificationsForm: null,
        
        // Lists
        addressesList: null
    };

    // Inicialização
    const init = async () => {
        // Verifica autenticação
        if (!Auth.requireAuth()) return;

        // Captura elementos
        captureElements();

        // Event listeners
        setupEventListeners();

        // Carrega dados do usuário
        await loadUserData();

        // Inicializa componentes
        Navbar.init();
    };

    // Captura elementos do DOM
    const captureElements = () => {
        // Loading
        elements.loading = document.getElementById('profile-loading');
        
        // User info
        elements.userName = document.getElementById('user-name');
        elements.userEmail = document.getElementById('user-email');
        elements.userType = document.getElementById('user-type');
        elements.avatarInitials = document.getElementById('avatar-initials');
        elements.avatarImage = document.getElementById('avatar-image');
        elements.avatarInput = document.getElementById('avatar-input');
        
        // Stats
        elements.statPedidos = document.getElementById('stat-pedidos');
        elements.statAndamento = document.getElementById('stat-andamento');
        
        // Tabs
        elements.navItems = document.querySelectorAll('.profile-nav-item');
        elements.tabs = document.querySelectorAll('.profile-tab');
        
        // Forms
        elements.profileForm = document.getElementById('profile-form');
        elements.passwordForm = document.getElementById('password-form');
        elements.notificationsForm = document.getElementById('notifications-form');
        
        // Lists
        elements.addressesList = document.getElementById('addresses-list');
    };

    // Configura event listeners
    const setupEventListeners = () => {
        // Tab navigation
        elements.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(item.dataset.tab);
            });
        });

        // Avatar
        document.getElementById('avatar-edit-btn').addEventListener('click', () => {
            elements.avatarInput.click();
        });

        elements.avatarInput.addEventListener('change', handleAvatarChange);

        // Forms
        elements.profileForm.addEventListener('submit', handleProfileSubmit);
        elements.passwordForm.addEventListener('submit', handlePasswordSubmit);
        elements.notificationsForm.addEventListener('submit', handleNotificationsSubmit);

        // Privacy actions
        document.getElementById('delete-account-btn').addEventListener('click', handleDeleteAccount);
        document.getElementById('export-data-btn').addEventListener('click', handleExportData);

        // Address
        document.getElementById('add-address-btn').addEventListener('click', handleAddAddress);

        // Masks
        applyMasks();
    };

    // Aplica máscaras aos campos
    const applyMasks = () => {
        const telefoneInput = document.getElementById('telefone');
        telefoneInput.addEventListener('input', (e) => {
            e.target.value = Utils.formatPhone(e.target.value.replace(/\D/g, ''));
        });
    };

    // Carrega dados do usuário
    const loadUserData = async () => {
        setLoading(true);

        try {
            // Busca perfil
            const result = await UserService.getProfile();
            
            if (result.success) {
                currentUser = result.data;
                updateUI();
                
                // Carrega estatísticas
                loadStats();
                
                // Carrega endereços
                if (currentTab === 'enderecos') {
                    loadAddresses();
                }
            } else {
                Toast.error('Erro ao carregar dados do perfil');
            }
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            Toast.error('Erro ao carregar perfil');
        } finally {
            setLoading(false);
        }
    };

    // Atualiza UI com dados do usuário
    const updateUI = () => {
        if (!currentUser) return;

        const userData = UserService.formatUserData(currentUser);

        // User info
        elements.userName.textContent = userData.nome || 'Usuário';
        elements.userEmail.textContent = userData.email || '';
        elements.userType.textContent = userData.tipoExibicao;
        
        // Avatar
        if (userData.avatar_url) {
            elements.avatarImage.src = userData.avatar_url;
            elements.avatarImage.classList.remove('d-none');
            elements.avatarInitials.classList.add('d-none');
        } else {
            elements.avatarInitials.textContent = userData.iniciais;
            elements.avatarInitials.classList.remove('d-none');
            elements.avatarImage.classList.add('d-none');
        }

        // Form fields
        document.getElementById('nome').value = userData.nome || '';
        document.getElementById('email').value = userData.email || '';
        document.getElementById('telefone').value = userData.telefoneFormatado || '';
        document.getElementById('cpf').value = userData.cpfFormatado || '';
        document.getElementById('data_nascimento').value = userData.data_nascimento || '';
    };

    // Carrega estatísticas
    const loadStats = async () => {
        try {
            const result = await UserService.getStats();
            
            if (result.success) {
                const stats = result.data;
                
                if (Auth.isProducer()) {
                    elements.statPedidos.textContent = stats.totalVendas || 0;
                    elements.statAndamento.textContent = stats.pedidosPendentes || 0;
                } else {
                    elements.statPedidos.textContent = stats.totalPedidos || 0;
                    elements.statAndamento.textContent = stats.pedidosAndamento || 0;
                }
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    };

    // Muda de aba
    const switchTab = (tabName) => {
        currentTab = tabName;

        // Update nav
        elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });

        // Update tabs
        elements.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.id === `tab-${tabName}`);
        });

        // Update URL
        window.history.pushState(null, '', `#${tabName}`);

        // Carrega dados específicos da aba
        if (tabName === 'enderecos') {
            loadAddresses();
        }
    };

    // Handle mudança de avatar
    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const loading = Toast.loading('Enviando imagem...');

        try {
            const result = await UserService.uploadAvatar(file);
            
            if (result.success) {
                Toast.success('Avatar atualizado com sucesso!');
                
                // Atualiza UI
                if (result.data.avatar_url) {
                    elements.avatarImage.src = result.data.avatar_url;
                    elements.avatarImage.classList.remove('d-none');
                    elements.avatarInitials.classList.add('d-none');
                }
            } else {
                Toast.error(result.error || 'Erro ao enviar imagem');
            }
        } catch (error) {
            console.error('Erro ao fazer upload:', error);
            Toast.error('Erro ao enviar imagem');
        } finally {
            loading.close();
            e.target.value = ''; // Reset input
        }
    };

    // Handle submit do perfil
    const handleProfileSubmit = async (e) => {
        e.preventDefault();

        if (isLoading) return;

        const formData = new FormData(e.target);
        const data = {
            nome: formData.get('nome').trim(),
            email: formData.get('email').trim(),
            telefone: formData.get('telefone').replace(/\D/g, ''),
            data_nascimento: formData.get('data_nascimento')
        };

        // Validações
        if (!data.nome || data.nome.length < 3) {
            Toast.error('Nome deve ter no mínimo 3 caracteres');
            return;
        }

        if (!Utils.isValidEmail(data.email)) {
            Toast.error('E-mail inválido');
            return;
        }

        setButtonLoading('save-profile-btn', true);

        try {
            const result = await UserService.updateProfile(data);
            
            if (result.success) {
                Toast.success('Perfil atualizado com sucesso!');
                currentUser = result.data;
                updateUI();
            } else {
                Toast.error(result.error || 'Erro ao atualizar perfil');
            }
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            Toast.error('Erro ao atualizar perfil');
        } finally {
            setButtonLoading('save-profile-btn', false);
        }
    };

    // Handle submit de senha
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();

        if (isLoading) return;

        const formData = new FormData(e.target);
        const currentPassword = formData.get('current_password');
        const newPassword = formData.get('new_password');
        const confirmPassword = formData.get('confirm_password');

        setButtonLoading('change-password-btn', true);

        try {
            const result = await UserService.changePassword(
                currentPassword,
                newPassword,
                confirmPassword
            );
            
            if (result.success) {
                Toast.success('Senha alterada com sucesso!');
                e.target.reset();
            } else {
                Toast.error(result.error || 'Erro ao alterar senha');
            }
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            Toast.error('Erro ao alterar senha');
        } finally {
            setButtonLoading('change-password-btn', false);
        }
    };

    // Handle submit de notificações
    const handleNotificationsSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const preferences = {
            email_pedidos: formData.get('email_pedidos') === 'on',
            email_promocoes: formData.get('email_promocoes') === 'on',
            email_newsletter: formData.get('email_newsletter') === 'on',
            sms_pedidos: formData.get('sms_pedidos') === 'on'
        };

        try {
            // Aqui seria feita a chamada para API
            Toast.success('Preferências de notificação atualizadas!');
        } catch (error) {
            Toast.error('Erro ao salvar preferências');
        }
    };

    // Handle adicionar endereço
    const handleAddAddress = () => {
        // Aqui abriria um modal para adicionar endereço
        Toast.info('Funcionalidade de endereços em desenvolvimento');
    };

    // Carrega endereços
    const loadAddresses = async () => {
        elements.addressesList.innerHTML = '<div class="text-center py-4">Carregando endereços...</div>';

        try {
            // Simulação - substituir por chamada real à API
            setTimeout(() => {
                elements.addressesList.innerHTML = `
                    <div class="empty-state">
                        <span class="material-icons">location_off</span>
                        <h3>Nenhum endereço cadastrado</h3>
                        <p>Adicione um endereço para facilitar suas compras</p>
                    </div>
                `;
            }, 1000);
        } catch (error) {
            console.error('Erro ao carregar endereços:', error);
            elements.addressesList.innerHTML = '<div class="text-danger">Erro ao carregar endereços</div>';
        }
    };

    // Handle excluir conta
    const handleDeleteAccount = async () => {
        const confirmed = await Modal.confirm({
            title: 'Excluir conta',
            message: 'Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.',
            confirmText: 'Excluir conta',
            confirmClass: 'btn-danger'
        });

        if (!confirmed) return;

        // Solicita senha
        const password = await Modal.prompt({
            title: 'Confirmar exclusão',
            message: 'Digite sua senha para confirmar a exclusão da conta:',
            inputType: 'password',
            placeholder: 'Sua senha'
        });

        if (!password) return;

        const loading = Toast.loading('Excluindo conta...');

        try {
            const result = await UserService.deleteAccount(password);
            
            if (result.success) {
                Toast.success('Conta excluída com sucesso');
                // Logout será feito automaticamente pelo serviço
            } else {
                Toast.error(result.error || 'Erro ao excluir conta');
            }
        } catch (error) {
            console.error('Erro ao excluir conta:', error);
            Toast.error('Erro ao excluir conta');
        } finally {
            loading.close();
        }
    };

    // Handle exportar dados
    const handleExportData = async () => {
        Toast.info('Funcionalidade de exportação em desenvolvimento');
    };

    // Helpers
    const setLoading = (loading) => {
        isLoading = loading;
        elements.loading.style.display = loading ? 'flex' : 'none';
    };

    const setButtonLoading = (buttonId, loading) => {
        const button = document.getElementById(buttonId);
        const text = button.querySelector('span');
        const spinner = button.querySelector('.spinner');
        
        button.disabled = loading;
        text.classList.toggle('d-none', loading);
        spinner.classList.toggle('d-none', !loading);
    };

    // Inicializa quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();