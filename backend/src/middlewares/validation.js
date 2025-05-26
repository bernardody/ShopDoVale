// Utilitários de validação
const validationUtils = {
  // Validar email
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validar CPF (formato básico)
  isValidCPF: (cpf) => {
    if (!cpf) return true; // CPF é opcional
    const cleanCPF = cpf.replace(/\D/g, '');
    return cleanCPF.length === 11;
  },

  // Validar CNPJ (formato básico)
  isValidCNPJ: (cnpj) => {
    if (!cnpj) return true; // CNPJ é opcional
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.length === 14;
  },

  // Validar CPF ou CNPJ
  isValidCpfCnpj: (cpfCnpj) => {
    if (!cpfCnpj) return true;
    const clean = cpfCnpj.replace(/\D/g, '');
    return clean.length === 11 || clean.length === 14;
  },

  // Validar CEP
  isValidCEP: (cep) => {
    if (!cep) return false;
    const cleanCEP = cep.replace(/\D/g, '');
    return cleanCEP.length === 8;
  },

  // Validar telefone (formato brasileiro básico)
  isValidPhone: (phone) => {
    if (!phone) return true; // Telefone é opcional
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  },

  // Validar senha
  isValidPassword: (password) => {
    return password && password.length >= 6;
  },

  // Validar se é um número positivo
  isPositiveNumber: (value) => {
    return !isNaN(value) && parseFloat(value) > 0;
  },

  // Validar se é um número inteiro positivo
  isPositiveInteger: (value) => {
    return Number.isInteger(Number(value)) && Number(value) > 0;
  },

  // Validar URL
  isValidUrl: (url) => {
    if (!url) return true; // URL é opcional
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

class ValidationMiddleware {
  // Validação para registro de usuário
  validateRegister(req, res, next) {
    const {
      email,
      senha,
      nome_completo,
      telefone,
      cpf_cnpj,
      tipo_usuario,
      endereco,
      nome_loja,
      whatsapp
    } = req.body;

    const errors = [];

    // Campos obrigatórios
    if (!email) {
      errors.push('Email é obrigatório');
    } else if (!validationUtils.isValidEmail(email)) {
      errors.push('Email deve ter um formato válido');
    }

    if (!senha) {
      errors.push('Senha é obrigatória');
    } else if (!validationUtils.isValidPassword(senha)) {
      errors.push('Senha deve ter pelo menos 6 caracteres');
    }

    if (!nome_completo) {
      errors.push('Nome completo é obrigatório');
    } else if (nome_completo.trim().length < 2) {
      errors.push('Nome completo deve ter pelo menos 2 caracteres');
    }

    if (!tipo_usuario) {
      errors.push('Tipo de usuário é obrigatório');
    } else if (!['consumidor', 'produtor'].includes(tipo_usuario)) {
      errors.push('Tipo de usuário deve ser "consumidor" ou "produtor"');
    }

    // Validações opcionais
    if (telefone && !validationUtils.isValidPhone(telefone)) {
      errors.push('Telefone deve ter um formato válido');
    }

    if (cpf_cnpj && !validationUtils.isValidCpfCnpj(cpf_cnpj)) {
      errors.push('CPF/CNPJ deve ter um formato válido');
    }

    if (whatsapp && !validationUtils.isValidPhone(whatsapp)) {
      errors.push('WhatsApp deve ter um formato válido');
    }

    // Validação específica para produtor
    if (tipo_usuario === 'produtor' && !nome_loja) {
      errors.push('Nome da loja é obrigatório para produtores');
    }

    // Validação de endereço se fornecido
    if (endereco) {
      if (!endereco.cep || !validationUtils.isValidCEP(endereco.cep)) {
        errors.push('CEP é obrigatório e deve ter formato válido');
      }
      if (!endereco.logradouro || endereco.logradouro.trim().length < 3) {
        errors.push('Logradouro é obrigatório e deve ter pelo menos 3 caracteres');
      }
      if (!endereco.numero) {
        errors.push('Número do endereço é obrigatório');
      }
      if (!endereco.bairro || endereco.bairro.trim().length < 2) {
        errors.push('Bairro é obrigatório e deve ter pelo menos 2 caracteres');
      }
      if (!endereco.cidade || endereco.cidade.trim().length < 2) {
        errors.push('Cidade é obrigatória e deve ter pelo menos 2 caracteres');
      }
      if (!endereco.estado || endereco.estado.trim().length !== 2) {
        errors.push('Estado é obrigatório e deve ter 2 caracteres (UF)');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        details: errors
      });
    }

    next();
  }

  // Validação para login
  validateLogin(req, res, next) {
    const { email, senha } = req.body;
    const errors = [];

    if (!email) {
      errors.push('Email é obrigatório');
    } else if (!validationUtils.isValidEmail(email)) {
      errors.push('Email deve ter um formato válido');
    }

    if (!senha) {
      errors.push('Senha é obrigatória');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        details: errors
      });
    }

    next();
  }

  // Validação para atualização de usuário
  validateUserUpdate(req, res, next) {
    const {
      nome_completo,
      telefone,
      cpf_cnpj,
      endereco,
      nome_loja,
      whatsapp
    } = req.body;

    const errors = [];

    // Validações opcionais (apenas se fornecidos)
    if (nome_completo !== undefined) {
      if (!nome_completo || nome_completo.trim().length < 2) {
        errors.push('Nome completo deve ter pelo menos 2 caracteres');
      }
    }

    if (telefone !== undefined && telefone && !validationUtils.isValidPhone(telefone)) {
      errors.push('Telefone deve ter um formato válido');
    }

    if (cpf_cnpj !== undefined && cpf_cnpj && !validationUtils.isValidCpfCnpj(cpf_cnpj)) {
      errors.push('CPF/CNPJ deve ter um formato válido');
    }

    if (whatsapp !== undefined && whatsapp && !validationUtils.isValidPhone(whatsapp)) {
      errors.push('WhatsApp deve ter um formato válido');
    }

    if (nome_loja !== undefined && nome_loja && nome_loja.trim().length < 2) {
      errors.push('Nome da loja deve ter pelo menos 2 caracteres');
    }

    // Validação de endereço se fornecido
    if (endereco) {
      if (!endereco.cep || !validationUtils.isValidCEP(endereco.cep)) {
        errors.push('CEP deve ter formato válido');
      }
      if (!endereco.logradouro || endereco.logradouro.trim().length < 3) {
        errors.push('Logradouro deve ter pelo menos 3 caracteres');
      }
      if (!endereco.numero) {
        errors.push('Número do endereço é obrigatório');
      }
      if (!endereco.bairro || endereco.bairro.trim().length < 2) {
        errors.push('Bairro deve ter pelo menos 2 caracteres');
      }
      if (!endereco.cidade || endereco.cidade.trim().length < 2) {
        errors.push('Cidade deve ter pelo menos 2 caracteres');
      }
      if (!endereco.estado || endereco.estado.trim().length !== 2) {
        errors.push('Estado deve ter 2 caracteres (UF)');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        details: errors
      });
    }

    next();
  }

  // Validação para alteração de senha
  validateChangePassword(req, res, next) {
    const { senha_atual, nova_senha } = req.body;
    const errors = [];

    if (!senha_atual) {
      errors.push('Senha atual é obrigatória');
    }

    if (!nova_senha) {
      errors.push('Nova senha é obrigatória');
    } else if (!validationUtils.isValidPassword(nova_senha)) {
      errors.push('Nova senha deve ter pelo menos 6 caracteres');
    }

    if (senha_atual && nova_senha && senha_atual === nova_senha) {
      errors.push('Nova senha deve ser diferente da senha atual');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        details: errors
      });
    }

    next();
  }

  // Validação para produto
  validateProduct(req, res, next) {
    const {
      nome,
      descricao,
      preco,
      categoria_id,
      estoque,
      unidade_medida,
      peso,
      imagens
    } = req.body;

    const errors = [];

    // Campos obrigatórios
    if (!nome) {
      errors.push('Nome do produto é obrigatório');
    } else if (nome.trim().length < 2) {
      errors.push('Nome do produto deve ter pelo menos 2 caracteres');
    }

    if (!preco) {
      errors.push('Preço é obrigatório');
    } else if (!validationUtils.isPositiveNumber(preco)) {
      errors.push('Preço deve ser um número positivo');
    }

    if (!categoria_id) {
      errors.push('Categoria é obrigatória');
    } else if (!validationUtils.isPositiveInteger(categoria_id)) {
      errors.push('ID da categoria deve ser um número inteiro positivo');
    }

    if (estoque !== undefined && !validationUtils.isPositiveInteger(estoque)) {
      errors.push('Estoque deve ser um número inteiro positivo');
    }

    if (!unidade_medida) {
      errors.push('Unidade de medida é obrigatória');
    } else if (!['kg', 'g', 'unidade', 'litro', 'ml', 'cx', 'pacote'].includes(unidade_medida)) {
      errors.push('Unidade de medida deve ser: kg, g, unidade, litro, ml, cx ou pacote');
    }

    // Validações opcionais
    if (descricao && descricao.trim().length < 10) {
      errors.push('Descrição deve ter pelo menos 10 caracteres');
    }

    if (peso !== undefined && peso && !validationUtils.isPositiveNumber(peso)) {
      errors.push('Peso deve ser um número positivo');
    }

    if (imagens && Array.isArray(imagens)) {
      imagens.forEach((img, index) => {
        if (img.url && !validationUtils.isValidUrl(img.url)) {
          errors.push(`URL da imagem ${index + 1} é inválida`);
        }
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        details: errors
      });
    }

    next();
  }

  // Validação para adicionar item ao carrinho
  validateCartItem(req, res, next) {
    const { produto_id, quantidade } = req.body;
    const errors = [];

    if (!produto_id) {
      errors.push('ID do produto é obrigatório');
    } else if (!validationUtils.isPositiveInteger(produto_id)) {
      errors.push('ID do produto deve ser um número inteiro positivo');
    }

    if (!quantidade) {
      errors.push('Quantidade é obrigatória');
    } else if (!validationUtils.isPositiveInteger(quantidade)) {
      errors.push('Quantidade deve ser um número inteiro positivo');
    } else if (quantidade > 999) {
      errors.push('Quantidade máxima é 999');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        details: errors
      });
    }

    next();
  }

  // Validação para pedido
  validateOrder(req, res, next) {
    const {
      endereco_entrega,
      forma_pagamento,
      observacoes
    } = req.body;

    const errors = [];

    // Validação de endereço de entrega
    if (!endereco_entrega) {
      errors.push('Endereço de entrega é obrigatório');
    } else {
      if (!endereco_entrega.cep || !validationUtils.isValidCEP(endereco_entrega.cep)) {
        errors.push('CEP do endereço de entrega é obrigatório e deve ter formato válido');
      }
      if (!endereco_entrega.logradouro || endereco_entrega.logradouro.trim().length < 3) {
        errors.push('Logradouro do endereço de entrega é obrigatório');
      }
      if (!endereco_entrega.numero) {
        errors.push('Número do endereço de entrega é obrigatório');
      }
      if (!endereco_entrega.bairro || endereco_entrega.bairro.trim().length < 2) {
        errors.push('Bairro do endereço de entrega é obrigatório');
      }
      if (!endereco_entrega.cidade || endereco_entrega.cidade.trim().length < 2) {
        errors.push('Cidade do endereço de entrega é obrigatória');
      }
      if (!endereco_entrega.estado || endereco_entrega.estado.trim().length !== 2) {
        errors.push('Estado do endereço de entrega é obrigatório (UF)');
      }
    }

    // Validação de forma de pagamento
    if (!forma_pagamento) {
      errors.push('Forma de pagamento é obrigatória');
    } else if (!['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'].includes(forma_pagamento)) {
      errors.push('Forma de pagamento deve ser: dinheiro, pix, cartao_credito ou cartao_debito');
    }

    // Validação de observações (opcional)
    if (observacoes && observacoes.length > 500) {
      errors.push('Observações devem ter no máximo 500 caracteres');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Dados de entrada inválidos',
        details: errors
      });
    }

    next();
  }

  // Validação para query parameters de paginação
  validatePagination(req, res, next) {
    const { page, limit } = req.query;

    if (page && (!validationUtils.isPositiveInteger(page) || page < 1)) {
      return res.status(400).json({
        error: 'Parâmetro "page" deve ser um número inteiro positivo'
      });
    }

    if (limit && (!validationUtils.isPositiveInteger(limit) || limit < 1 || limit > 100)) {
      return res.status(400).json({
        error: 'Parâmetro "limit" deve ser um número inteiro entre 1 e 100'
      });
    }

    next();
  }

  // Validação para parâmetros de ID na URL
  validateIdParam(req, res, next) {
    const { id } = req.params;

    if (!id || !validationUtils.isPositiveInteger(id)) {
      return res.status(400).json({
        error: 'ID deve ser um número inteiro positivo'
      });
    }

    next();
  }

  // Validação para status de pedido
  validateOrderStatus(req, res, next) {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status é obrigatório'
      });
    }

    const validStatuses = [
      'pendente',
      'confirmado',
      'preparando',
      'pronto',
      'saiu_entrega',
      'entregue',
      'cancelado'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status deve ser um dos seguintes: ${validStatuses.join(', ')}`
      });
    }

    next();
  }

  // Validação para filtros de busca
  validateSearchFilters(req, res, next) {
    const { orderBy, order } = req.query;

    if (order && !['ASC', 'DESC', 'asc', 'desc'].includes(order)) {
      return res.status(400).json({
        error: 'Parâmetro "order" deve ser ASC ou DESC'
      });
    }

    // Lista de campos válidos para ordenação pode ser customizada por endpoint
    const validOrderFields = req.validOrderFields || ['id', 'created_at', 'updated_at'];
    
    if (orderBy && !validOrderFields.includes(orderBy)) {
      return res.status(400).json({
        error: `Parâmetro "orderBy" deve ser um dos seguintes: ${validOrderFields.join(', ')}`
      });
    }

    next();
  }

  // Sanitização básica de strings
  sanitizeStrings(req, res, next) {
    const sanitizeValue = (value) => {
      if (typeof value === 'string') {
        return value.trim().replace(/\s+/g, ' '); // Remove espaços extras
      }
      return value;
    };

    const sanitizeObject = (obj) => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value)) {
          sanitized[key] = value.map(sanitizeValue);
        } else if (typeof value === 'object') {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = sanitizeValue(value);
        }
      }
      return sanitized;
    };

    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    next();
  }
}

module.exports = new ValidationMiddleware();