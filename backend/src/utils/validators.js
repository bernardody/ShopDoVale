// Funções de validação e formatação para o Shop do Vale

// ===== VALIDAÇÕES DE DOCUMENTOS =====

/**
 * Validar CPF com dígitos verificadores
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} - true se válido
 */
const isValidCPF = (cpf) => {
  if (!cpf) return false;
  
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Valida dígitos verificadores
  let sum = 0;
  let remainder;
  
  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
};

/**
 * Validar CNPJ com dígitos verificadores
 * @param {string} cnpj - CNPJ a ser validado
 * @returns {boolean} - true se válido
 */
const isValidCNPJ = (cnpj) => {
  if (!cnpj) return false;
  
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Verifica se tem 14 dígitos
  if (cleanCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Valida dígitos verificadores
  let length = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, length);
  const digits = cleanCNPJ.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  // Primeiro dígito verificador
  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  // Segundo dígito verificador
  length = length + 1;
  numbers = cleanCNPJ.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

/**
 * Validar CPF ou CNPJ
 * @param {string} cpfCnpj - CPF ou CNPJ
 * @returns {boolean} - true se válido
 */
const isValidCpfCnpj = (cpfCnpj) => {
  if (!cpfCnpj) return false;
  const clean = cpfCnpj.replace(/\D/g, '');
  if (clean.length === 11) return isValidCPF(cpfCnpj);
  if (clean.length === 14) return isValidCNPJ(cpfCnpj);
  return false;
};

// ===== VALIDAÇÕES DE CONTATO =====

/**
 * Validar email
 * @param {string} email - Email a ser validado
 * @returns {boolean} - true se válido
 */
const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validar telefone brasileiro (celular ou fixo)
 * @param {string} phone - Telefone a ser validado
 * @returns {boolean} - true se válido
 */
const isValidPhone = (phone) => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  // Aceita números com 10 dígitos (fixo) ou 11 dígitos (celular com 9)
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
};

/**
 * Validar telefone celular brasileiro (com 9º dígito)
 * @param {string} phone - Telefone celular
 * @returns {boolean} - true se válido
 */
const isValidMobilePhone = (phone) => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, '');
  // Verifica se tem 11 dígitos e se o 3º dígito é 9
  return cleanPhone.length === 11 && cleanPhone[2] === '9';
};

// ===== VALIDAÇÕES DE ENDEREÇO =====

/**
 * Validar CEP brasileiro
 * @param {string} cep - CEP a ser validado
 * @returns {boolean} - true se válido
 */
const isValidCEP = (cep) => {
  if (!cep) return false;
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
};

/**
 * Validar UF brasileira
 * @param {string} uf - Sigla do estado
 * @returns {boolean} - true se válido
 */
const isValidUF = (uf) => {
  if (!uf) return false;
  const estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];
  return estados.includes(uf.toUpperCase());
};

// ===== VALIDAÇÕES DE VALORES =====

/**
 * Validar se é um número positivo
 * @param {any} value - Valor a ser validado
 * @returns {boolean} - true se positivo
 */
const isPositiveNumber = (value) => {
  return !isNaN(value) && parseFloat(value) > 0;
};

/**
 * Validar se é um número inteiro positivo
 * @param {any} value - Valor a ser validado
 * @returns {boolean} - true se inteiro positivo
 */
const isPositiveInteger = (value) => {
  return Number.isInteger(Number(value)) && Number(value) > 0;
};

/**
 * Validar valor monetário brasileiro
 * @param {any} value - Valor monetário
 * @returns {boolean} - true se válido
 */
const isValidCurrency = (value) => {
  if (!value && value !== 0) return false;
  // Aceita valores como: 10, 10.50, 10,50, 1.234,56
  const cleanValue = value.toString().replace(/[R$\s]/g, '').replace(',', '.');
  return !isNaN(cleanValue) && parseFloat(cleanValue) >= 0;
};

/**
 * Validar porcentagem (0-100)
 * @param {any} value - Valor de porcentagem
 * @returns {boolean} - true se válido
 */
const isValidPercentage = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0 && num <= 100;
};

// ===== VALIDAÇÕES DE TEXTO =====

/**
 * Validar comprimento de string
 * @param {string} str - String a validar
 * @param {number} min - Comprimento mínimo
 * @param {number} max - Comprimento máximo
 * @returns {boolean} - true se válido
 */
const isValidLength = (str, min, max) => {
  if (!str) return min === 0;
  const length = str.trim().length;
  return length >= min && length <= max;
};

/**
 * Validar senha forte
 * @param {string} password - Senha a validar
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
const isStrongPassword = (password) => {
  const errors = [];
  if (!password) {
    return { isValid: false, errors: ['Senha é obrigatória'] };
  }
  
  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validar URL
 * @param {string} url - URL a validar
 * @returns {boolean} - true se válida
 */
const isValidUrl = (url) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validar slug (URL amigável)
 * @param {string} slug - Slug a validar
 * @returns {boolean} - true se válido
 */
const isValidSlug = (slug) => {
  if (!slug) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};

// ===== VALIDAÇÕES DE DATA/HORA =====

/**
 * Validar data
 * @param {string} date - Data no formato YYYY-MM-DD ou DD/MM/YYYY
 * @returns {boolean} - true se válida
 */
const isValidDate = (date) => {
  if (!date) return false;
  
  // Tenta diferentes formatos
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/ // DD/MM/YYYY
  ];
  
  const validFormat = formats.some(format => format.test(date));
  if (!validFormat) return false;
  
  // Verifica se é uma data válida
  const parsed = new Date(date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
  return parsed instanceof Date && !isNaN(parsed);
};

/**
 * Validar se data está no futuro
 * @param {string} date - Data a validar
 * @returns {boolean} - true se no futuro
 */
const isFutureDate = (date) => {
  if (!isValidDate(date)) return false;
  const parsed = new Date(date.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
  return parsed > new Date();
};

/**
 * Validar horário
 * @param {string} time - Horário no formato HH:MM
 * @returns {boolean} - true se válido
 */
const isValidTime = (time) => {
  if (!time) return false;
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// ===== VALIDAÇÕES ESPECÍFICAS DO NEGÓCIO =====

/**
 * Validar número de pedido
 * @param {string} orderNumber - Número do pedido
 * @returns {boolean} - true se válido
 */
const isValidOrderNumber = (orderNumber) => {
  if (!orderNumber) return false;
  // Formato esperado: PED-YYYYMMDD-XXXX
  const regex = /^PED-\d{8}-\d{4}$/;
  return regex.test(orderNumber);
};

/**
 * Validar unidade de medida
 * @param {string} unit - Unidade de medida
 * @returns {boolean} - true se válida
 */
const isValidUnit = (unit) => {
  const validUnits = ['kg', 'g', 'unidade', 'litro', 'ml', 'cx', 'pacote', 'dz', 'bandeja'];
  return validUnits.includes(unit);
};

/**
 * Validar status de pedido
 * @param {string} status - Status do pedido
 * @returns {boolean} - true se válido
 */
const isValidOrderStatus = (status) => {
  const validStatuses = [
    'pendente',
    'confirmado',
    'preparando',
    'pronto',
    'saiu_entrega',
    'entregue',
    'cancelado'
  ];
  return validStatuses.includes(status);
};

/**
 * Validar tipo de usuário
 * @param {string} type - Tipo de usuário
 * @returns {boolean} - true se válido
 */
const isValidUserType = (type) => {
  return ['consumidor', 'produtor'].includes(type);
};

/**
 * Validar forma de pagamento
 * @param {string} payment - Forma de pagamento
 * @returns {boolean} - true se válida
 */
const isValidPaymentMethod = (payment) => {
  const validMethods = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito'];
  return validMethods.includes(payment);
};

// ===== SANITIZAÇÃO =====

/**
 * Sanitizar string removendo espaços extras
 * @param {string} str - String a sanitizar
 * @returns {string} - String sanitizada
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
};

/**
 * Sanitizar nome (primeira letra maiúscula)
 * @param {string} name - Nome a sanitizar
 * @returns {string} - Nome sanitizado
 */
const sanitizeName = (name) => {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
};

/**
 * Remover caracteres não numéricos
 * @param {string} str - String com números
 * @returns {string} - Apenas números
 */
const extractNumbers = (str) => {
  if (!str) return '';
  return str.replace(/\D/g, '');
};

/**
 * Sanitizar valor monetário
 * @param {any} value - Valor a sanitizar
 * @returns {number} - Valor numérico
 */
const sanitizeCurrency = (value) => {
  if (!value && value !== 0) return 0;
  const cleanValue = value.toString()
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(cleanValue) || 0;
};

// ===== FORMATAÇÃO =====

/**
 * Formatar CPF
 * @param {string} cpf - CPF a formatar
 * @returns {string} - CPF formatado (XXX.XXX.XXX-XX)
 */
const formatCPF = (cpf) => {
  if (!cpf) return '';
  const clean = extractNumbers(cpf);
  return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formatar CNPJ
 * @param {string} cnpj - CNPJ a formatar
 * @returns {string} - CNPJ formatado (XX.XXX.XXX/XXXX-XX)
 */
const formatCNPJ = (cnpj) => {
  if (!cnpj) return '';
  const clean = extractNumbers(cnpj);
  return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Formatar CEP
 * @param {string} cep - CEP a formatar
 * @returns {string} - CEP formatado (XXXXX-XXX)
 */
const formatCEP = (cep) => {
  if (!cep) return '';
  const clean = extractNumbers(cep);
  return clean.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Formatar telefone
 * @param {string} phone - Telefone a formatar
 * @returns {string} - Telefone formatado
 */
const formatPhone = (phone) => {
  if (!phone) return '';
  const clean = extractNumbers(phone);
  if (clean.length === 11) {
    return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (clean.length === 10) {
    return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
};

/**
 * Formatar valor monetário brasileiro
 * @param {number} value - Valor numérico
 * @returns {string} - Valor formatado (R$ X.XXX,XX)
 */
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Formatar data para exibição
 * @param {string|Date} date - Data a formatar
 * @returns {string} - Data formatada (DD/MM/YYYY)
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';
  return new Intl.DateTimeFormat('pt-BR').format(d);
};

/**
 * Formatar data e hora para exibição
 * @param {string|Date} datetime - Data/hora a formatar
 * @returns {string} - Data/hora formatada
 */
const formatDateTime = (datetime) => {
  if (!datetime) return '';
  const d = new Date(datetime);
  if (isNaN(d)) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(d);
};

// ===== GERADORES =====

/**
 * Gerar slug a partir de texto
 * @param {string} text - Texto para converter em slug
 * @returns {string} - Slug gerado
 */
const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífen
    .replace(/--+/g, '-') // Remove hífens duplicados
    .replace(/^-+/, '') // Remove hífen do início
    .replace(/-+$/, ''); // Remove hífen do final
};

/**
 * Gerar código aleatório
 * @param {number} length - Tamanho do código
 * @param {string} type - Tipo: 'numeric', 'alpha', 'alphanumeric'
 * @returns {string} - Código gerado
 */
const generateCode = (length = 6, type = 'alphanumeric') => {
  let chars = '';
  switch (type) {
    case 'numeric':
      chars = '0123456789';
      break;
    case 'alpha':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      break;
    case 'alphanumeric':
    default:
      chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  }
  
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ===== COMPARADORES =====

/**
 * Comparar datas (ignora horário)
 * @param {string|Date} date1 - Primeira data
 * @param {string|Date} date2 - Segunda data
 * @returns {number} - -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
 */
const compareDates = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
};

/**
 * Verificar se data está dentro de um período
 * @param {string|Date} date - Data a verificar
 * @param {string|Date} startDate - Data inicial
 * @param {string|Date} endDate - Data final
 * @returns {boolean} - true se está no período
 */
const isDateInRange = (date, startDate, endDate) => {
  const d = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return d >= start && d <= end;
};

// Exportar todas as funções
module.exports = {
  // Validações de documentos
  isValidCPF,
  isValidCNPJ,
  isValidCpfCnpj,
  
  // Validações de contato
  isValidEmail,
  isValidPhone,
  isValidMobilePhone,
  
  // Validações de endereço
  isValidCEP,
  isValidUF,
  
  // Validações de valores
  isPositiveNumber,
  isPositiveInteger,
  isValidCurrency,
  isValidPercentage,
  
  // Validações de texto
  isValidLength,
  isStrongPassword,
  isValidUrl,
  isValidSlug,
  
  // Validações de data/hora
  isValidDate,
  isFutureDate,
  isValidTime,
  
  // Validações específicas do negócio
  isValidOrderNumber,
  isValidUnit,
  isValidOrderStatus,
  isValidUserType,
  isValidPaymentMethod,
  
  // Sanitização
  sanitizeString,
  sanitizeName,
  extractNumbers,
  sanitizeCurrency,
  
  // Formatação
  formatCPF,
  formatCNPJ,
  formatCEP,
  formatPhone,
  formatCurrency,
  formatDate,
  formatDateTime,
  
  // Geradores
  generateSlug,
  generateCode,
  
  // Comparadores
  compareDates,
  isDateInRange
};