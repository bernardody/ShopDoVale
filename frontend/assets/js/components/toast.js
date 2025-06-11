// Toast.js - Sistema de notificações toast
// =====================================================

const Toast = (() => {
    // Configurações
    const config = {
        duration: 3000, // 3 segundos
        position: 'top-right',
        maxToasts: 5
    };

    // Fila de toasts
    const activeToasts = [];
    let toastCount = 0;

    // Container dos toasts
    let container = null;

    // Inicializa o container de toasts
    const initContainer = () => {
        if (container) return;

        container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
    };

    // Cria um toast
    const create = (message, type = 'info', options = {}) => {
        initContainer();

        // Remove toasts antigos se exceder o limite
        if (activeToasts.length >= config.maxToasts) {
            remove(activeToasts[0]);
        }

        // Configurações do toast
        const toastOptions = {
            duration: config.duration,
            ...options
        };

        // Gera ID único
        const toastId = `toast-${++toastCount}`;

        // Cria elemento do toast
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast toast-${type}`;
        
        // Ícone baseado no tipo
        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        // Conteúdo do toast
        toast.innerHTML = `
            <span class="material-icons toast-icon">${icons[type]}</span>
            <div class="toast-content">
                ${options.title ? `<div class="toast-title">${options.title}</div>` : ''}
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">
                <span class="material-icons">close</span>
            </button>
        `;

        // Adiciona ao container
        container.appendChild(toast);

        // Event listener para fechar
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => remove(toastId));

        // Adiciona à lista de toasts ativos
        activeToasts.push(toastId);

        // Anima entrada
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto remove após duração
        if (toastOptions.duration > 0) {
            setTimeout(() => {
                remove(toastId);
            }, toastOptions.duration);
        }

        return toastId;
    };

    // Remove um toast
    const remove = (toastId) => {
        const toast = document.getElementById(toastId);
        if (!toast) return;

        // Anima saída
        toast.classList.remove('show');

        // Remove do DOM após animação
        setTimeout(() => {
            toast.remove();
            
            // Remove da lista de ativos
            const index = activeToasts.indexOf(toastId);
            if (index > -1) {
                activeToasts.splice(index, 1);
            }
        }, 300);
    };

    // Métodos de conveniência para cada tipo

    const success = (message, options = {}) => {
        return create(message, 'success', options);
    };

    const error = (message, options = {}) => {
        return create(message, 'error', options);
    };

    const warning = (message, options = {}) => {
        return create(message, 'warning', options);
    };

    const info = (message, options = {}) => {
        return create(message, 'info', options);
    };

    // Toast com loading
    const loading = (message = 'Carregando...', options = {}) => {
        const loadingToast = create(
            `<div class="d-flex align-center">
                <div class="spinner mr-2"></div>
                <span>${message}</span>
            </div>`,
            'info',
            { ...options, duration: 0 } // Não remove automaticamente
        );

        return {
            id: loadingToast,
            update: (newMessage) => {
                const toast = document.getElementById(loadingToast);
                if (toast) {
                    const messageEl = toast.querySelector('.toast-message');
                    messageEl.innerHTML = `
                        <div class="d-flex align-center">
                            <div class="spinner mr-2"></div>
                            <span>${newMessage}</span>
                        </div>
                    `;
                }
            },
            close: () => remove(loadingToast)
        };
    };

    // Toast com progresso
    const progress = (message, options = {}) => {
        const progressToast = create(
            `<div>
                <div>${message}</div>
                <div class="toast-progress-bar mt-2">
                    <div class="toast-progress-fill" style="width: 0%"></div>
                </div>
            </div>`,
            'info',
            { ...options, duration: 0 }
        );

        return {
            id: progressToast,
            update: (percent, newMessage) => {
                const toast = document.getElementById(progressToast);
                if (toast) {
                    const progressFill = toast.querySelector('.toast-progress-fill');
                    progressFill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
                    
                    if (newMessage) {
                        const messageEl = toast.querySelector('.toast-message > div:first-child');
                        messageEl.textContent = newMessage;
                    }
                }
            },
            close: () => remove(progressToast)
        };
    };

    // Toast com ações
    const action = (message, actionText, onAction, options = {}) => {
        const actionToast = create(
            `<div class="d-flex align-center justify-between">
                <span>${message}</span>
                <button class="btn btn-sm btn-primary ml-3">${actionText}</button>
            </div>`,
            'info',
            { ...options, duration: 0 }
        );

        const toast = document.getElementById(actionToast);
        const actionBtn = toast.querySelector('.btn');
        
        actionBtn.addEventListener('click', () => {
            if (onAction) onAction();
            remove(actionToast);
        });

        return actionToast;
    };

    // Remove todos os toasts
    const clear = () => {
        [...activeToasts].forEach(toastId => {
            remove(toastId);
        });
    };

    // Estilos CSS para toast de progresso (adiciona ao documento se não existir)
    const addProgressStyles = () => {
        if (document.getElementById('toast-progress-styles')) return;

        const style = document.createElement('style');
        style.id = 'toast-progress-styles';
        style.textContent = `
            .toast-progress-bar {
                height: 4px;
                background-color: rgba(0, 0, 0, 0.1);
                border-radius: 2px;
                overflow: hidden;
            }
            .toast-progress-fill {
                height: 100%;
                background-color: var(--color-primary);
                transition: width 0.3s ease;
            }
        `;
        document.head.appendChild(style);
    };

    // Inicializa estilos adicionais
    addProgressStyles();

    // API pública
    return {
        create,
        success,
        error,
        warning,
        info,
        loading,
        progress,
        action,
        remove,
        clear
    };
})();

// Torna Toast global
window.Toast = Toast;