// Login.js - Página de login
// =====================================================

(function() {
    'use strict';

    // Elementos do DOM
    const elements = {
        form: null,
        emailInput: null,
        passwordInput: null,
        rememberCheckbox: null,
        submitBtn: null,
        submitBtnText: null,
        submitBtnSpinner: null
    };

    // Estado
    let isSubmitting = false;

    // Inicialização
    const init = () => {
        // Verifica se já está autenticado
        if (Auth.isAuthenticated()) {
            redirectToIntended();
            return;
        }

        // Captura elementos
        elements.form = document.getElementById('login-form');
        elements.emailInput = document.getElementById('email');
        elements.passwordInput = document.getElementById('password');
        elements.rememberCheckbox = document.getElementById('remember');
        elements.submitBtn = document.getElementById('submit-btn');
        elements.submitBtnText = elements.submitBtn.querySelector('span');
        elements.submitBtnSpinner = elements.submitBtn.querySelector('.spinner');

        // Preenche email salvo se houver
        const rememberedEmail = Auth.getRememberedEmail();
        if (rememberedEmail) {
            elements.emailInput.value = rememberedEmail;
            elements.rememberCheckbox.checked = true;
        }

        // Event listeners
        setupEventListeners();

        // Foca no primeiro campo vazio
        if (!elements.emailInput.value) {
            elements.emailInput.focus();
        } else {
            elements.passwordInput.focus();
        }
    };

    // Configura event listeners
    const setupEventListeners = () => {
        // Submit do formulário
        elements.form.addEventListener('submit', handleSubmit);

        // Validação em tempo real
        elements.emailInput.addEventListener('blur', () => validateField('email'));
        elements.passwordInput.addEventListener('blur', () => validateField('password'));

        // Remove erro ao digitar
        elements.emailInput.addEventListener('input', () => clearFieldError('email'));
        elements.passwordInput.addEventListener('input', () => clearFieldError('password'));

        // Enter no campo de senha submete o form
        elements.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isSubmitting) {
                handleSubmit(e);
            }
        });
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting) return;

        // Valida campos
        const isValid = validateForm();
        if (!isValid) return;

        // Prepara dados
        const formData = {
            email: elements.emailInput.value.trim(),
            password: elements.passwordInput.value,
        };

        // Mostra loading
        setLoading(true);

        try {
            // Faz login
            const result = await Auth.login(formData, elements.rememberCheckbox.checked);

            if (result.success) {
                // Mostra mensagem de sucesso
                Toast.success('Login realizado com sucesso!');

                // Aguarda um pouco para mostrar a mensagem
                setTimeout(() => {
                    redirectToIntended();
                }, 500);
            } else {
                // Mostra erro
                handleLoginError(result.error);
            }
        } catch (error) {
            console.error('Erro no login:', error);
            Toast.error('Erro ao fazer login. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Valida formulário
    const validateForm = () => {
        let isValid = true;

        // Valida email
        if (!validateField('email')) {
            isValid = false;
        }

        // Valida senha
        if (!validateField('password')) {
            isValid = false;
        }

        return isValid;
    };

    // Valida campo individual
    const validateField = (fieldName) => {
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'email':
                const email = elements.emailInput.value.trim();
                if (!email) {
                    errorMessage = 'E-mail é obrigatório';
                    isValid = false;
                } else if (!Utils.isValidEmail(email)) {
                    errorMessage = 'E-mail inválido';
                    isValid = false;
                }
                break;

            case 'password':
                const password = elements.passwordInput.value;
                if (!password) {
                    errorMessage = 'Senha é obrigatória';
                    isValid = false;
                } else if (password.length < 6) {
                    errorMessage = 'Senha deve ter no mínimo 6 caracteres';
                    isValid = false;
                }
                break;
        }

        // Mostra ou limpa erro
        if (!isValid) {
            showFieldError(fieldName, errorMessage);
        } else {
            clearFieldError(fieldName);
        }

        return isValid;
    };

    // Mostra erro no campo
    const showFieldError = (fieldName, message) => {
        const field = elements[fieldName + 'Input'];
        const feedback = field.parentElement.parentElement.querySelector('.invalid-feedback');

        field.classList.add('is-invalid');
        feedback.textContent = message;
        feedback.style.display = 'block';
    };

    // Limpa erro do campo
    const clearFieldError = (fieldName) => {
        const field = elements[fieldName + 'Input'];
        const feedback = field.parentElement.parentElement.querySelector('.invalid-feedback');

        field.classList.remove('is-invalid');
        feedback.textContent = '';
        feedback.style.display = 'none';
    };

    // Handle erro de login
    const handleLoginError = (error) => {
        // Mensagens de erro específicas
        if (error.includes('credenciais') || error.includes('senha incorreta')) {
            Toast.error('E-mail ou senha incorretos');
            elements.passwordInput.value = '';
            elements.passwordInput.focus();
        } else if (error.includes('não encontrado')) {
            Toast.error('Usuário não encontrado');
            showFieldError('email', 'E-mail não cadastrado');
        } else if (error.includes('bloqueado') || error.includes('suspenso')) {
            Toast.error('Conta bloqueada. Entre em contato com o suporte.');
        } else {
            Toast.error(error || 'Erro ao fazer login');
        }
    };

    // Mostra/esconde loading
    const setLoading = (loading) => {
        isSubmitting = loading;
        elements.submitBtn.disabled = loading;
        
        if (loading) {
            elements.submitBtnText.classList.add('d-none');
            elements.submitBtnSpinner.classList.remove('d-none');
        } else {
            elements.submitBtnText.classList.remove('d-none');
            elements.submitBtnSpinner.classList.add('d-none');
        }
    };

    // Redireciona após login
    const redirectToIntended = () => {
        // Verifica se tem URL de redirecionamento salva
        const redirectUrl = Utils.session.get('redirect_after_login');
        
        if (redirectUrl) {
            Utils.session.remove('redirect_after_login');
            window.location.href = redirectUrl;
        } else {
            // Redireciona baseado no tipo de usuário
            if (Auth.isProducer()) {
                window.location.href = '/produtor/dashboard';
            } else {
                window.location.href = '/';
            }
        }
    };

    // Inicializa quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();