// Utils.js - Funções utilitárias para Shop do Vale
// =====================================================

const Utils = {
    // ===== FORMATAÇÃO =====
    
    // Formata valor monetário para Real brasileiro
    formatCurrency: (value) => {
        if (typeof value !== 'number') value = parseFloat(value) || 0;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },

    // Formata data para padrão brasileiro
    formatDate: (date, includeTime = false) => {
        if (!date) return '';
        const d = new Date(date);
        const options = {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        };
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return d.toLocaleDateString('pt-BR', options);
    },

    // Formata CEP
    formatCEP: (cep) => {
        if (!cep) return '';
        return cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2');
    },

    // Formata telefone
    formatPhone: (phone) => {
        if (!phone) return '';
        phone = phone.replace(/\D/g, '');
        if (phone.length === 11) {
            return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    },

    // Formata CPF
    formatCPF: (cpf) => {
        if (!cpf) return '';
        return cpf.replace(/\D/g, '')
            .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },

    // ===== VALIDAÇÃO =====

    // Valida email
    isValidEmail: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },

    // Valida CPF
    isValidCPF: (cpf) => {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11) return false;
        
        // Elimina CPFs conhecidos inválidos
        if (/^(\d)\1+$/.test(cpf)) return false;
        
        // Valida dígitos verificadores
        let sum = 0;
        let remainder;
        
        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(9, 10))) return false;
        
        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(10, 11))) return false;
        
        return true;
    },

    // Valida senha (mínimo 6 caracteres)
    isValidPassword: (password) => {
        return password && password.length >= 6;
    },

    // Valida telefone
    isValidPhone: (phone) => {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length === 10 || cleaned.length === 11;
    },

    // ===== STRINGS =====

    // Capitaliza primeira letra
    capitalize: (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Trunca texto
    truncate: (str, length = 50, suffix = '...') => {
        if (!str || str.length <= length) return str;
        return str.substring(0, length).trim() + suffix;
    },

    // Remove acentos
    removeAccents: (str) => {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    },

    // Cria slug a partir de string
    slugify: (str) => {
        return Utils.removeAccents(str)
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/[\s_-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    // ===== OBJETOS E ARRAYS =====

    // Deep clone de objeto
    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },

    // Verifica se objeto está vazio
    isEmpty: (obj) => {
        if (!obj) return true;
        if (Array.isArray(obj)) return obj.length === 0;
        if (typeof obj === 'object') return Object.keys(obj).length === 0;
        return false;
    },

    // Agrupa array por propriedade
    groupBy: (array, key) => {
        return array.reduce((result, item) => {
            const group = item[key];
            if (!result[group]) result[group] = [];
            result[group].push(item);
            return result;
        }, {});
    },

    // Remove duplicatas de array
    uniqueArray: (array, key) => {
        if (!key) return [...new Set(array)];
        const seen = new Set();
        return array.filter(item => {
            const k = item[key];
            return seen.has(k) ? false : seen.add(k);
        });
    },

    // ===== DATAS =====

    // Adiciona dias a uma data
    addDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },

    // Diferença em dias entre duas datas
    daysBetween: (date1, date2) => {
        const oneDay = 24 * 60 * 60 * 1000;
        const firstDate = new Date(date1);
        const secondDate = new Date(date2);
        return Math.round(Math.abs((firstDate - secondDate) / oneDay));
    },

    // Verifica se data é hoje
    isToday: (date) => {
        const today = new Date();
        const compareDate = new Date(date);
        return compareDate.toDateString() === today.toDateString();
    },

    // ===== DOM =====

    // Query selector simplificado
    $: (selector) => document.querySelector(selector),
    $$: (selector) => document.querySelectorAll(selector),

    // Cria elemento HTML
    createElement: (tag, attributes = {}, children = []) => {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key.startsWith('on')) {
                element.addEventListener(key.substring(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        });
        
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        
        return element;
    },

    // Adiciona classe com verificação
    addClass: (element, className) => {
        if (element && !element.classList.contains(className)) {
            element.classList.add(className);
        }
    },

    // Remove classe com verificação
    removeClass: (element, className) => {
        if (element && element.classList.contains(className)) {
            element.classList.remove(className);
        }
    },

    // Toggle classe
    toggleClass: (element, className) => {
        if (element) {
            element.classList.toggle(className);
        }
    },

    // ===== STORAGE =====

    // Local Storage com JSON
    storage: {
        get: (key) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.error('Erro ao ler do localStorage:', e);
                return null;
            }
        },
        
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Erro ao salvar no localStorage:', e);
                return false;
            }
        },
        
        remove: (key) => {
            localStorage.removeItem(key);
        },
        
        clear: () => {
            localStorage.clear();
        }
    },

    // Session Storage com JSON
    session: {
        get: (key) => {
            try {
                const item = sessionStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.error('Erro ao ler do sessionStorage:', e);
                return null;
            }
        },
        
        set: (key, value) => {
            try {
                sessionStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Erro ao salvar no sessionStorage:', e);
                return false;
            }
        },
        
        remove: (key) => {
            sessionStorage.removeItem(key);
        },
        
        clear: () => {
            sessionStorage.clear();
        }
    },

    // ===== URL E NAVEGAÇÃO =====

    // Pega parâmetros da URL
    getUrlParams: () => {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const [key, value] of params) {
            result[key] = value;
        }
        return result;
    },

    // Atualiza parâmetro na URL sem recarregar
    updateUrlParam: (key, value) => {
        const url = new URL(window.location);
        if (value) {
            url.searchParams.set(key, value);
        } else {
            url.searchParams.delete(key);
        }
        window.history.pushState({}, '', url);
    },

    // ===== DEBOUNCE E THROTTLE =====

    // Debounce function
    debounce: (func, wait = 300) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle function
    throttle: (func, limit = 300) => {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // ===== MISC =====

    // Gera ID único
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    // Copia texto para clipboard
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Erro ao copiar:', err);
            return false;
        }
    },

    // Scroll suave para elemento
    scrollToElement: (element, offset = 0) => {
        const targetPosition = element.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    },

    // Detecta dispositivo móvel
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },

    // Formata bytes para tamanho legível
    formatBytes: (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
};

// Torna Utils global
window.Utils = Utils;