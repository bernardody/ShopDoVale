// Modal.js - Sistema de modais reutilizáveis
// =====================================================

const Modal = (() => {
    // Estado interno
    const activeModals = new Map();
    let modalTemplate = null;
    let modalCount = 0;

    // Configuração padrão
    const defaultOptions = {
        size: 'md', // sm, md, lg, xl
        title: 'Modal',
        content: '',
        footer: '',
        showFooter: true,
        closeOnBackdrop: true,
        closeOnEsc: true,
        onOpen: null,
        onClose: null,
        buttons: []
    };

    // Carrega template do modal
    const loadTemplate = async () => {
        if (modalTemplate) return modalTemplate;
        
        try {
            const response = await fetch('/components/modal.html');
            modalTemplate = await response.text();
            return modalTemplate;
        } catch (error) {
            console.error('Erro ao carregar template do modal:', error);
            return null;
        }
    };

    // Cria um novo modal
    const create = async (options = {}) => {
        // Mescla opções com padrões
        const config = { ...defaultOptions, ...options };
        
        // Gera ID único
        const modalId = `modal-${++modalCount}`;
        
        // Carrega template
        const template = await loadTemplate();
        if (!template) {
            console.error('Template do modal não disponível');
            return null;
        }
        
        // Substitui placeholders no template
        let html = template
            .replace(/{id}/g, modalCount)
            .replace(/{title}/g, config.title)
            .replace(/{content}/g, config.content)
            .replace(/{size}/g, config.size);
        
        // Prepara footer
        let footerContent = config.footer;
        if (config.buttons && config.buttons.length > 0) {
            footerContent = config.buttons.map(btn => 
                `<button class="btn ${btn.class || 'btn-secondary'}" data-action="${btn.action || ''}">${btn.text}</button>`
            ).join('');
        }
        
        html = html
            .replace(/{footer}/g, footerContent)
            .replace(/{footerStyle}/g, config.showFooter && footerContent ? '' : 'style="display: none"');
        
        // Cria elemento temporário para inserir HTML
        const temp = document.createElement('div');
        temp.innerHTML = html;
        
        // Adiciona ao DOM
        const modalRoot = document.getElementById('modal-root') || document.body;
        modalRoot.appendChild(temp.firstElementChild);
        
        // Captura elementos
        const backdrop = document.getElementById(`modal-backdrop-${modalCount}`);
        const modal = document.getElementById(`modal-${modalCount}`);
        const closeBtn = modal.querySelector('.modal-close');
        
        // Configura event listeners
        setupModalListeners(modalId, backdrop, modal, closeBtn, config);
        
        // Armazena referência
        activeModals.set(modalId, {
            backdrop,
            modal,
            config,
            isOpen: false
        });
        
        return modalId;
    };

    // Configura listeners do modal
    const setupModalListeners = (modalId, backdrop, modal, closeBtn, config) => {
        // Botão fechar
        if (closeBtn) {
            closeBtn.addEventListener('click', () => close(modalId));
        }
        
        // Clique no backdrop
        if (config.closeOnBackdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    close(modalId);
                }
            });
        }
        
        // Botões customizados
        const buttons = modal.querySelectorAll('[data-action]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.getAttribute('data-action');
                if (action === 'close') {
                    close(modalId);
                } else if (config.onAction) {
                    config.onAction(action, modalId);
                }
            });
        });
    };

    // Abre um modal
    const open = (modalId) => {
        const modalData = activeModals.get(modalId);
        if (!modalData || modalData.isOpen) return;
        
        const { backdrop, modal, config } = modalData;
        
        // Adiciona classe show com delay para animação
        requestAnimationFrame(() => {
            Utils.addClass(backdrop, 'show');
            Utils.addClass(modal, 'show');
        });
        
        // Marca como aberto
        modalData.isOpen = true;
        
        // Previne scroll do body
        document.body.style.overflow = 'hidden';
        
        // Adiciona listener ESC
        if (config.closeOnEsc) {
            document.addEventListener('keydown', handleEscKey);
        }
        
        // Callback onOpen
        if (config.onOpen) {
            config.onOpen(modalId);
        }
        
        // Foca no modal para acessibilidade
        modal.focus();
    };

    // Fecha um modal
    const close = (modalId) => {
        const modalData = activeModals.get(modalId);
        if (!modalData || !modalData.isOpen) return;
        
        const { backdrop, modal, config } = modalData;
        
        // Remove classes show
        Utils.removeClass(backdrop, 'show');
        Utils.removeClass(modal, 'show');
        
        // Marca como fechado
        modalData.isOpen = false;
        
        // Remove listener ESC
        document.removeEventListener('keydown', handleEscKey);
        
        // Aguarda animação antes de limpar
        setTimeout(() => {
            // Remove do DOM
            backdrop.remove();
            
            // Remove da lista de modais ativos
            activeModals.delete(modalId);
            
            // Restaura scroll se não houver outros modais abertos
            const hasOpenModals = Array.from(activeModals.values()).some(m => m.isOpen);
            if (!hasOpenModals) {
                document.body.style.overflow = '';
            }
        }, 300);
        
        // Callback onClose
        if (config.onClose) {
            config.onClose(modalId);
        }
    };

    // Handler para tecla ESC
    const handleEscKey = (e) => {
        if (e.key === 'Escape') {
            // Fecha o modal mais recente
            const openModals = Array.from(activeModals.entries())
                .filter(([_, data]) => data.isOpen)
                .sort((a, b) => b[0].localeCompare(a[0]));
            
            if (openModals.length > 0) {
                const [modalId, data] = openModals[0];
                if (data.config.closeOnEsc) {
                    close(modalId);
                }
            }
        }
    };

    // Fecha todos os modais
    const closeAll = () => {
        activeModals.forEach((_, modalId) => {
            close(modalId);
        });
    };

    // Métodos de conveniência para modais comuns

    // Modal de confirmação
    const confirm = async (message, title = 'Confirmação') => {
        return new Promise(async (resolve) => {
            const modalId = await create({
                title,
                content: `<p>${message}</p>`,
                size: 'sm',
                closeOnBackdrop: false,
                buttons: [
                    { text: 'Cancelar', class: 'btn-secondary', action: 'cancel' },
                    { text: 'Confirmar', class: 'btn-primary', action: 'confirm' }
                ],
                onAction: (action) => {
                    close(modalId);
                    resolve(action === 'confirm');
                },
                onClose: () => {
                    resolve(false);
                }
            });
            
            open(modalId);
        });
    };

    // Modal de alerta
    const alert = async (message, title = 'Atenção') => {
        const modalId = await create({
            title,
            content: `<p>${message}</p>`,
            size: 'sm',
            buttons: [
                { text: 'OK', class: 'btn-primary', action: 'close' }
            ]
        });
        
        open(modalId);
    };

    // Modal de loading
    const loading = async (message = 'Carregando...') => {
        const modalId = await create({
            title: '',
            content: `
                <div class="text-center p-4">
                    <div class="spinner mb-3"></div>
                    <p>${message}</p>
                </div>
            `,
            size: 'sm',
            showFooter: false,
            closeOnBackdrop: false,
            closeOnEsc: false
        });
        
        open(modalId);
        return modalId;
    };

    // Modal de formulário
    const form = async (options) => {
        const defaultFormOptions = {
            fields: [],
            onSubmit: null,
            submitText: 'Enviar',
            cancelText: 'Cancelar'
        };
        
        const formConfig = { ...defaultFormOptions, ...options };
        
        // Gera HTML do formulário
        const formHtml = `
            <form id="modal-form">
                ${formConfig.fields.map(field => `
                    <div class="form-group">
                        <label class="form-label" for="${field.name}">${field.label}</label>
                        ${generateFieldHtml(field)}
                        ${field.helper ? `<div class="form-helper">${field.helper}</div>` : ''}
                    </div>
                `).join('')}
            </form>
        `;
        
        const modalId = await create({
            title: formConfig.title,
            content: formHtml,
            size: formConfig.size || 'md',
            buttons: [
                { text: formConfig.cancelText, class: 'btn-secondary', action: 'cancel' },
                { text: formConfig.submitText, class: 'btn-primary', action: 'submit' }
            ],
            onAction: async (action, modalId) => {
                if (action === 'submit') {
                    const form = document.getElementById('modal-form');
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData);
                    
                    if (formConfig.onSubmit) {
                        const result = await formConfig.onSubmit(data);
                        if (result !== false) {
                            close(modalId);
                        }
                    }
                } else if (action === 'cancel') {
                    close(modalId);
                }
            }
        });
        
        open(modalId);
        return modalId;
    };

    // Gera HTML para campo de formulário
    const generateFieldHtml = (field) => {
        switch (field.type) {
            case 'textarea':
                return `<textarea class="form-control" name="${field.name}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>${field.value || ''}</textarea>`;
            
            case 'select':
                return `
                    <select class="form-control" name="${field.name}" ${field.required ? 'required' : ''}>
                        ${field.options.map(opt => 
                            `<option value="${opt.value}" ${field.value === opt.value ? 'selected' : ''}>${opt.label}</option>`
                        ).join('')}
                    </select>
                `;
            
            default:
                return `<input type="${field.type || 'text'}" class="form-control" name="${field.name}" value="${field.value || ''}" placeholder="${field.placeholder || ''}" ${field.required ? 'required' : ''}>`;
        }
    };

    // API pública
    return {
        create,
        open,
        close,
        closeAll,
        confirm,
        alert,
        loading,
        form
    };
})();

// Torna Modal global
window.Modal = Modal;