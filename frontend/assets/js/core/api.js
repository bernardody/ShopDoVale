// API.js - Configuração e gerenciamento de chamadas API
// =====================================================

const API = (() => {
    // Configuração base
    const config = {
        baseURL: 'http://localhost:3000/api',
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // Adiciona token de autenticação ao header
    const getAuthHeaders = () => {
        const token = Auth.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    // Constrói URL completa
    const buildUrl = (endpoint) => {
        return `${config.baseURL}${endpoint}`;
    };

    // Processa resposta da API
    const processResponse = async (response) => {
        // Se não for ok, tenta pegar mensagem de erro
        if (!response.ok) {
            let errorMessage = 'Erro ao processar requisição';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // Se não conseguir fazer parse do JSON, usa status text
                errorMessage = response.statusText || errorMessage;
            }

            // Trata erros específicos
            if (response.status === 401) {
                // Token inválido ou expirado
                Auth.logout();
                window.location.href = '/login';
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            if (response.status === 403) {
                throw new Error('Você não tem permissão para acessar este recurso.');
            }

            if (response.status === 404) {
                throw new Error('Recurso não encontrado.');
            }

            if (response.status === 422) {
                throw new Error(errorMessage);
            }

            if (response.status >= 500) {
                throw new Error('Erro no servidor. Tente novamente mais tarde.');
            }

            throw new Error(errorMessage);
        }

        // Retorna JSON parseado
        try {
            return await response.json();
        } catch (e) {
            // Se não for JSON, retorna resposta em texto
            return response.text();
        }
    };

    // Métodos principais da API
    const api = {
        // GET request
        get: async (endpoint, params = {}) => {
            try {
                // Constrói query string se houver parâmetros
                const queryString = new URLSearchParams(params).toString();
                const url = buildUrl(endpoint) + (queryString ? `?${queryString}` : '');

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        ...config.headers,
                        ...getAuthHeaders()
                    }
                });

                return await processResponse(response);
            } catch (error) {
                console.error('Erro na requisição GET:', error);
                throw error;
            }
        },

        // POST request
        post: async (endpoint, data = {}) => {
            try {
                const response = await fetch(buildUrl(endpoint), {
                    method: 'POST',
                    headers: {
                        ...config.headers,
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify(data)
                });

                return await processResponse(response);
            } catch (error) {
                console.error('Erro na requisição POST:', error);
                throw error;
            }
        },

        // PUT request
        put: async (endpoint, data = {}) => {
            try {
                const response = await fetch(buildUrl(endpoint), {
                    method: 'PUT',
                    headers: {
                        ...config.headers,
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify(data)
                });

                return await processResponse(response);
            } catch (error) {
                console.error('Erro na requisição PUT:', error);
                throw error;
            }
        },

        // PATCH request
        patch: async (endpoint, data = {}) => {
            try {
                const response = await fetch(buildUrl(endpoint), {
                    method: 'PATCH',
                    headers: {
                        ...config.headers,
                        ...getAuthHeaders()
                    },
                    body: JSON.stringify(data)
                });

                return await processResponse(response);
            } catch (error) {
                console.error('Erro na requisição PATCH:', error);
                throw error;
            }
        },

        // DELETE request
        delete: async (endpoint) => {
            try {
                const response = await fetch(buildUrl(endpoint), {
                    method: 'DELETE',
                    headers: {
                        ...config.headers,
                        ...getAuthHeaders()
                    }
                });

                return await processResponse(response);
            } catch (error) {
                console.error('Erro na requisição DELETE:', error);
                throw error;
            }
        },

        // Upload de arquivo
        upload: async (endpoint, formData, onProgress = null) => {
            try {
                // Remove Content-Type para que o browser defina automaticamente com boundary
                const headers = { ...getAuthHeaders() };

                // Se tiver callback de progresso, usa XMLHttpRequest
                if (onProgress) {
                    return new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();

                        xhr.upload.addEventListener('progress', (e) => {
                            if (e.lengthComputable) {
                                const percentComplete = (e.loaded / e.total) * 100;
                                onProgress(percentComplete);
                            }
                        });

                        xhr.addEventListener('load', () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                try {
                                    resolve(JSON.parse(xhr.responseText));
                                } catch (e) {
                                    resolve(xhr.responseText);
                                }
                            } else {
                                reject(new Error(xhr.statusText));
                            }
                        });

                        xhr.addEventListener('error', () => {
                            reject(new Error('Erro no upload'));
                        });

                        xhr.open('POST', buildUrl(endpoint));
                        
                        // Adiciona headers
                        Object.entries(headers).forEach(([key, value]) => {
                            xhr.setRequestHeader(key, value);
                        });

                        xhr.send(formData);
                    });
                }

                // Sem progresso, usa fetch normal
                const response = await fetch(buildUrl(endpoint), {
                    method: 'POST',
                    headers: headers,
                    body: formData
                });

                return await processResponse(response);
            } catch (error) {
                console.error('Erro no upload:', error);
                throw error;
            }
        },

        // Download de arquivo
        download: async (endpoint, filename) => {
            try {
                const response = await fetch(buildUrl(endpoint), {
                    method: 'GET',
                    headers: getAuthHeaders()
                });

                if (!response.ok) {
                    throw new Error('Erro ao baixar arquivo');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename || 'download';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error('Erro no download:', error);
                throw error;
            }
        }
    };

    // Métodos específicos da aplicação
    const endpoints = {
        // Auth
        auth: {
            login: (credentials) => api.post('/auth/login', credentials),
            register: (userData) => api.post('/auth/register', userData),
            logout: () => api.post('/auth/logout'),
            refreshToken: () => api.post('/auth/refresh'),
            forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
            resetPassword: (token, password) => api.post('/auth/reset-password', { token, password })
        },

        // Users
        users: {
            getProfile: () => api.get('/users/profile'),
            updateProfile: (data) => api.put('/users/profile', data),
            changePassword: (passwords) => api.put('/users/change-password', passwords),
            uploadAvatar: (formData) => api.upload('/users/avatar', formData),
            deleteAccount: () => api.delete('/users/account')
        },

        // Produtos
        produtos: {
            getAll: (params) => api.get('/produtos', params),
            getById: (id) => api.get(`/produtos/${id}`),
            getByProducer: (producerId) => api.get(`/produtos/produtor/${producerId}`),
            search: (query) => api.get('/produtos/search', { q: query }),
            create: (data) => api.post('/produtos', data),
            update: (id, data) => api.put(`/produtos/${id}`, data),
            delete: (id) => api.delete(`/produtos/${id}`),
            uploadImage: (id, formData) => api.upload(`/produtos/${id}/imagem`, formData)
        },

        // Carrinho
        carrinho: {
            get: () => api.get('/carrinho'),
            add: (produtoId, quantidade) => api.post('/carrinho', { produtoId, quantidade }),
            update: (itemId, quantidade) => api.put(`/carrinho/${itemId}`, { quantidade }),
            remove: (itemId) => api.delete(`/carrinho/${itemId}`),
            clear: () => api.delete('/carrinho')
        },

        // Pedidos
        pedidos: {
            getAll: (params) => api.get('/pedidos', params),
            getById: (id) => api.get(`/pedidos/${id}`),
            create: (data) => api.post('/pedidos', data),
            updateStatus: (id, status) => api.patch(`/pedidos/${id}/status`, { status }),
            cancel: (id) => api.patch(`/pedidos/${id}/cancelar`)
        },

        // Dashboard
        dashboard: {
            getStats: () => api.get('/dashboard/stats'),
            getSales: (period) => api.get('/dashboard/vendas', { period }),
            getTopProducts: () => api.get('/dashboard/produtos-mais-vendidos'),
            getRecentOrders: () => api.get('/dashboard/pedidos-recentes')
        },

        // Endereços
        enderecos: {
            getAll: () => api.get('/enderecos'),
            getById: (id) => api.get(`/enderecos/${id}`),
            create: (data) => api.post('/enderecos', data),
            update: (id, data) => api.put(`/enderecos/${id}`, data),
            delete: (id) => api.delete(`/enderecos/${id}`),
            setDefault: (id) => api.patch(`/enderecos/${id}/padrao`),
            searchCEP: (cep) => api.get(`/enderecos/cep/${cep}`)
        }
    };

    // Retorna API pública
    return {
        ...api,
        ...endpoints,
        config
    };
})();

// Torna API global
window.API = API;