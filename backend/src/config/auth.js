const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Configurações JWT
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'shopdovale_secret_key_dev',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'ShopDoVale',
  audience: process.env.JWT_AUDIENCE || 'shopdovale-users'
};

// Configurações de hash da senha
const BCRYPT_CONFIG = {
  saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12
};

// Configurações de refresh token
const REFRESH_TOKEN_CONFIG = {
  secret: process.env.REFRESH_TOKEN_SECRET || 'shopdovale_refresh_secret_dev',
  expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
};

/**
 * Gera token JWT
 * @param {Object} payload - Dados do usuário
 * @param {string} type - Tipo do token ('access' ou 'refresh')
 * @returns {string} Token JWT
 */
function generateToken(payload, type = 'access') {
  const config = type === 'refresh' ? REFRESH_TOKEN_CONFIG : JWT_CONFIG;
  
  const tokenPayload = {
    id: payload.id,
    email: payload.email,
    tipo_usuario: payload.tipo_usuario,
    nome_completo: payload.nome_completo,
    iat: Math.floor(Date.now() / 1000),
    type
  };

  return jwt.sign(tokenPayload, config.secret, {
    expiresIn: config.expiresIn,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience
  });
}

/**
 * Verifica e decodifica token JWT
 * @param {string} token - Token JWT
 * @param {string} type - Tipo do token ('access' ou 'refresh')
 * @returns {Object} Payload decodificado
 */
function verifyToken(token, type = 'access') {
  try {
    const config = type === 'refresh' ? REFRESH_TOKEN_CONFIG : JWT_CONFIG;
    
    const decoded = jwt.verify(token, config.secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience
    });

    // Verifica se o tipo do token está correto
    if (decoded.type !== type) {
      throw new Error(`Token inválido: esperado '${type}', recebido '${decoded.type}'`);
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    } else if (error.name === 'NotBeforeError') {
      throw new Error('Token ainda não é válido');
    }
    throw error;
  }
}

/**
 * Gera par de tokens (access + refresh)
 * @param {Object} user - Dados do usuário
 * @returns {Object} Objeto com access_token e refresh_token
 */
function generateTokenPair(user) {
  const accessToken = generateToken(user, 'access');
  const refreshToken = generateToken(user, 'refresh');

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: JWT_CONFIG.expiresIn
  };
}

/**
 * Hash da senha
 * @param {string} password - Senha em texto plano
 * @returns {Promise<string>} Hash da senha
 */
async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(BCRYPT_CONFIG.saltRounds);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Erro ao criptografar senha');
  }
}

/**
 * Verifica senha
 * @param {string} password - Senha em texto plano
 * @param {string} hash - Hash armazenado
 * @returns {Promise<boolean>} Verdadeiro se a senha estiver correta
 */
async function verifyPassword(password, hash) {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error('Erro ao verificar senha');
  }
}

/**
 * Extrai token do header Authorization
 * @param {string} authHeader - Header Authorization
 * @returns {string|null} Token extraído ou null
 */
function extractTokenFromHeader(authHeader) {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Valida formato de email
 * @param {string} email - Email para validar
 * @returns {boolean} Verdadeiro se o email for válido
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida força da senha
 * @param {string} password - Senha para validar
 * @returns {Object} Objeto com validade e critérios
 */
function validatePasswordStrength(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const criteria = {
    minLength: password.length >= minLength,
    hasUpperCase,
    hasLowerCase,
    hasNumbers,
    hasSpecialChar
  };
  
  const isValid = Object.values(criteria).every(criterion => criterion);
  
  return {
    isValid,
    criteria,
    score: Object.values(criteria).filter(Boolean).length,
    maxScore: 5
  };
}

/**
 * Gera código de verificação
 * @param {number} length - Comprimento do código
 * @returns {string} Código de verificação
 */
function generateVerificationCode(length = 6) {
  const characters = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Middleware para verificar se o usuário está logado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next function
 */
function requireAuth(req, res, next) {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido'
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message
    });
  }
}

/**
 * Middleware para verificar tipo de usuário
 * @param {string[]} allowedTypes - Tipos permitidos
 * @returns {Function} Middleware function
 */
function requireUserType(allowedTypes) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!allowedTypes.includes(req.user.tipo_usuario)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: tipo de usuário não autorizado'
      });
    }

    next();
  };
}

module.exports = {
  JWT_CONFIG,
  BCRYPT_CONFIG,
  REFRESH_TOKEN_CONFIG,
  generateToken,
  verifyToken,
  generateTokenPair,
  hashPassword,
  verifyPassword,
  extractTokenFromHeader,
  isValidEmail,
  validatePasswordStrength,
  generateVerificationCode,
  requireAuth,
  requireUserType
};