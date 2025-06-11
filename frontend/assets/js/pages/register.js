// Register.js - Página de registro/cadastro
// =====================================================

(function() {
    'use strict';

    // Elementos do DOM
    const elements = {
        form: null,
        accountTypeButtons: null,
        nomeInput: null,
        emailInput: null,
        telefoneInput: null,
        documentoInput: null,
        documentoLabel: null,
        passwordInput: null,
        passwordConfirmationInput: null,
        termsCheckbox: null,
        submitBtn: null,
        submitBtnText: null,
        submitBtnSpinner: null,
        producerFields: null,
        nomePropriedadeInput: null,
        descricaoInput: null
    };

    // Estado
    let isSubmitting = false;
    let accountType = 'consumidor';

    // Máscaras
    const masks = {
        phone: {
            pattern: '(00) 00000-0000',
            lazy: false
        },
        cpf: {
            pattern: '000.000.000-00',
            lazy: false
        },
        cnpj: {
            pattern: '00.000.000/0000-00',
            lazy: false
        }
    };

    // Inicialização
    const init = () => {
        // Verifica se já está autenticado
        if (Auth.isAuthenticated()) {
            window.location.href = '/';
            return;
        }

        // Captura elementos
        captureElements();

        // Event listeners
        setupEventListeners();

        // Aplica máscaras
        applyMasks();

        // Foca no primeiro campo
        elements.nomeInput.focus();
    };

    // Captura elementos do DOM
    const captureElements = () => {
        elements.form = document.getElementById('register-form');
        elements.accountTypeButtons = document.querySelectorAll('.account-type');
        elements.nomeInput = document.getElementById('nome');
        elements.emailInput = document.getElementById('email');
        elements.telefoneInput = document.getElementById('telefone');
        elements.documentoInput = document.getElementById('documento');
        elements.documentoLabel = document.getElementById('documento-label');
        elements.passwordInput = document.getElementById('password');
        elements.passwordConfirmationInput = document.getElementById('password_confirmation');
        elements.termsCheckbox = document.getElementById('terms');
        elements.submitBtn = document.getElementById('submit-btn');
        elements.submitBtnText = elements.submitBtn.querySelector('span');
        elements.submitBtnSpinner = elements.submitBtn.querySelector('.spinner');
        elements.producerFields = document.getElementById('producer-fields');
        elements.nomePropriedadeInput = document.getElementById('nome_propriedade');
        elements.descricaoInput = document.getElementById('descricao');
    };

    // Configura event listeners
    const setupEventListeners = () => {
        // Submit do formulário
        elements.form.addEventListener('submit', handleSubmit);

        // Mudança de tipo de conta
        elements.accountTypeButtons.forEach(button => {
            button.addEventListener('click', () => handleAccountTypeChange(button));
        });

        // Validação em tempo real
        elements.nomeInput.addEventListener('blur', () => validateField('nome'));
        elements.emailInput.addEventListener('blur', () => validateField('email'));
        elements.telefoneInput.addEventListener('blur', () => validateField('telefone'));
        elements.documentoInput.addEventListener('blur', () => validateField('documento'));
        elements.passwordInput.addEventListener('blur', () => validateField('password'));
        elements.passwordConfirmationInput.addEventListener('blur', () => validateField('passwordConfirmation'));

        // Remove erro ao digitar
        ['nome', 'email', 'telefone', 'documento', 'password', 'passwordConfirmation'].forEach(field => {
            const input = elements[field + 'Input'];
            input.addEventListener('input', () => clearFieldError(field));
        });

        // Validação de força da senha
        elements.passwordInput.addEventListener('input', checkPasswordStrength);
    };

    // Aplica máscaras aos campos
    const applyMasks = () => {
        // Telefone
        elements.telefoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                e.target.value = Utils.formatPhone(value);
            }
        });

        // CPF/CNPJ
        elements.documentoInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (accountType === 'consumidor') {
                if (value.length <= 11) {
                    e.target.value = Utils.formatCPF(value);
                }
            } else {
                if (value.length <= 14) {
                    e.target.value = formatCNPJ(value);
                }
            }
        });
    };

    // Formata CNPJ
    const formatCNPJ = (value) => {
        return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5');
    };

    // Handle mudança de tipo de conta
    const handleAccountTypeChange = (button) => {
        // Remove active de todos
        elements.accountTypeButtons.forEach(btn => btn.classList.remove('active'));
        
        // Adiciona active ao clicado
        button.classList.add('active');
        
        // Atualiza tipo
        accountType = button.dataset.type;

        // Atualiza campos baseado no tipo
        if (accountType === 'produtor') {
            elements.documentoLabel.textContent = 'CNPJ';
            elements.documentoInput.placeholder = '00.000.000/0000-00';
            elements.producerFields.classList.remove('d-none');
            elements.nomePropriedadeInput.required = true;
        } else {
            elements.documentoLabel.textContent = 'CPF';
            elements.documentoInput.placeholder = '000.000.000-00';
            elements.producerFields.classList.add('d-none');
            elements.nomePropriedadeInput.required = false;
        }

        // Limpa valor e erro do documento
        elements.documentoInput.value = '';
        clearFieldError('documento');
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
            nome: elements.nomeInput.value.trim(),
            email: elements.emailInput.value.trim(),
            telefone: elements.telefoneInput.value.replace(/\D/g, ''),
            tipo: accountType,
            password: elements.passwordInput.value,
        };

        // Adiciona documento baseado no tipo
        if (accountType === 'consumidor') {
            formData.cpf = elements.documentoInput.value.replace(/\D/g, '');
        } else {
            formData.cnpj = elements.documentoInput.value.replace(/\D/g, '');
            formData.nome_propriedade = elements.nomePropriedadeInput.value.trim();
            formData.descricao = elements.descricaoInput.value.trim();
        }

        // Mostra loading
        setLoading(true);

        try {
            // Faz registro
            const result = await Auth.register(formData);

            if (result.success) {
                // Mostra mensagem de sucesso
                Toast.success('Conta criada com sucesso! Bem-vindo ao Shop do Vale!');

                // Aguarda um pouco para mostrar a mensagem
                setTimeout(() => {
                    // Redireciona baseado no tipo de usuário
                    if (accountType === 'produtor') {
                        window.location.href = '/produtor/dashboard';
                    } else {
                        window.location.href = '/';
                    }
                }, 1000);
            } else {
                // Mostra erro
                handleRegisterError(result.error);
            }
        } catch (error) {
            console.error('Erro no registro:', error);
            Toast.error('Erro ao criar conta. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    // Valida formulário
    const validateForm = () => {
        let isValid = true;

        // Valida campos básicos
        ['nome', 'email', 'telefone', 'documento', 'password', 'passwordConfirmation'].forEach(field => {
            if (!validateField(field)) {
                isValid = false;
            }
        });

        // Valida campos de produtor se necessário
        if (accountType === 'produtor') {
            if (!elements.nomePropriedadeInput.value.trim()) {
                showFieldError('nomePropriedade', 'Nome da propriedade é obrigatório');
                isValid = false;
            }
        }

        // Valida termos
        if (!elements.termsCheckbox.checked) {
            Toast.warning('Você precisa aceitar os termos de uso');
            isValid = false;
        }

        return isValid;
    };

    // Valida campo individual
    const validateField = (fieldName) => {
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'nome':
                const nome = elements.nomeInput.value.trim();
                if (!nome) {
                    errorMessage = 'Nome é obrigatório';
                    isValid = false;
                } else if (nome.length < 3) {
                    errorMessage = 'Nome deve ter no mínimo 3 caracteres';
                    isValid = false;
                } else if (!/\s/.test(nome)) {
                    errorMessage = 'Por favor, informe o nome completo';
                    isValid = false;
                }
                break;

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

            case 'telefone':
                const telefone = elements.telefoneInput.value.replace(/\D/g, '');
                if (!telefone) {
                    errorMessage = 'Telefone é obrigatório';
                    isValid = false;
                } else if (!Utils.isValidPhone(telefone)) {
                    errorMessage = 'Telefone inválido';
                    isValid = false;
                }
                break;

            case 'documento':
                const documento = elements.documentoInput.value.replace(/\D/g, '');
                if (!documento) {
                    errorMessage = accountType === 'consumidor' ? 'CPF é obrigatório' : 'CNPJ é obrigatório';
                    isValid = false;
                } else if (accountType === 'consumidor' && !Utils.isValidCPF(documento)) {
                    errorMessage = 'CPF inválido';
                    isValid = false;
                } else if (accountType === 'produtor' && !isValidCNPJ(documento)) {
                    errorMessage = 'CNPJ inválido';
                    isValid = false;
                }
                break;

            case 'password':
                const password = elements.passwordInput.value;
                if (!password) {
                    errorMessage = 'Senha é obrigatória';
                    isValid = false;
                } else if (!Utils.isValidPassword(password)) {
                    errorMessage = 'Senha deve ter no mínimo 6 caracteres';
                    isValid = false;
                }
                break;

            case 'passwordConfirmation':
                const passwordConfirmation = elements.passwordConfirmationInput.value;
                const passwordOriginal = elements.passwordInput.value;
                if (!passwordConfirmation) {
                    errorMessage = 'Confirmação de senha é obrigatória';
                    isValid = false;
                } else if (passwordConfirmation !== passwordOriginal) {
                    errorMessage = 'As senhas não coincidem';
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

    // Valida CNPJ (simplificado)
    const isValidCNPJ = (cnpj) => {
        if (cnpj.length !== 14) return false;
        if (/^(\d)\1+$/.test(cnpj)) return false;
        // Aqui poderia ter validação mais complexa
        return true;
    };

    // Mostra erro no campo
    const showFieldError = (fieldName, message) => {
        const field = elements[fieldName + 'Input'];
        const parent = field.closest('.form-group');
        const feedback = parent.querySelector('.invalid-feedback');

        field.classList.add('is-invalid');
        feedback.textContent = message;
        feedback.style.display = 'block';
    };

    // Limpa erro do campo
    const clearFieldError = (fieldName) => {
        const field = elements[fieldName + 'Input'];
        const parent = field.closest('.form-group');
        const feedback = parent.querySelector('.invalid-feedback');

        field.classList.remove('is-invalid');
        feedback.textContent = '';
        feedback.style.display = 'none';
    };

    // Verifica força da senha
    const checkPasswordStrength = () => {
        const password = elements.passwordInput.value;
        const formText = elements.passwordInput.parentElement.parentElement.querySelector('.form-text');
        
        if (!password) {
            formText.textContent = 'Mínimo de 6 caracteres';
            formText.style.color = '';
            return;
        }

        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        const messages = [
            'Senha muito fraca',
            'Senha fraca',
            'Senha média',
            'Senha boa',
            'Senha forte'
        ];

        const colors = [
            'var(--color-error)',
            'var(--color-warning)',
            'var(--color-warning)',
            'var(--color-info)',
            'var(--color-success)'
        ];

        formText.textContent = messages[strength];
        formText.style.color = colors[strength];
    };

    // Handle erro de registro
    const handleRegisterError = (error) => {
        // Mensagens de erro específicas
        if (error.includes('já cadastrado') || error.includes('já existe')) {
            if (error.includes('e-mail')) {
                showFieldError('email', 'Este e-mail já está cadastrado');
                Toast.error('E-mail já cadastrado. Faça login ou use outro e-mail.');
            } else if (error.includes('CPF')) {
                showFieldError('documento', 'Este CPF já está cadastrado');
                Toast.error('CPF já cadastrado.');
            } else if (error.includes('CNPJ')) {
                showFieldError('documento', 'Este CNPJ já está cadastrado');
                Toast.error('CNPJ já cadastrado.');
            }
        } else {
            Toast.error(error || 'Erro ao criar conta');
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

    // Inicializa quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();