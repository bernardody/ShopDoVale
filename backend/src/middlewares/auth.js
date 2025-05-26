const { verifyToken, extractTokenFromHeader } = require('../config/auth');
const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Middleware de autenticação básica
 * Verifica se o usuário está autenticado
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acesso requerido',
        error: 'MISSING_TOKEN'
      });
    }

    // Verificar e decodificar o token
    const decoded = verifyToken(token, 'access');
    
    // Buscar usuário no banco para verificar se ainda existe e está ativo
    const userResult = await pool.query(
      'SELECT id, email, nome_completo, tipo_usuario, is_ativo FROM usuarios WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado',
        error: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    if (!user.is_ativo) {
      return res.status(403).json({
        success: false,
        message: 'Conta desativada',
        error: 'ACCOUNT_DISABLED'
      });
    }

    // Adicionar dados do usuário à requisição
    req.user = {
      id: user.id,
      email: user.email,
      nome_completo: user.nome_completo,
      tipo_usuario: user.tipo_usuario,
      is_ativo: user.is_ativo
    };

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);

    if (error.message === 'Token expirado') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
        error: 'TOKEN_EXPIRED'
      });
    }

    if (error.message === 'Token inválido') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
        error: 'INVALID_TOKEN'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

/**
 * Middleware para verificar tipos específicos de usuário
 * @param {string|string[]} allowedTypes - Tipo(s) de usuário permitido(s)
 */
const requireUserType = (allowedTypes) => {
  // Normalizar para array
  const types = Array.isArray(allowedTypes) ? allowedTypes : [allowedTypes];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
        error: 'NOT_AUTHENTICATED'
      });
    }

    if (!types.includes(req.user.tipo_usuario)) {
      return res.status(403).json({
        success: false,
        message: `Acesso negado. Tipos permitidos: ${types.join(', ')}`,
        error: 'INSUFFICIENT_PERMISSIONS',
        required_types: types,
        user_type: req.user.tipo_usuario
      });
    }

    next();
  };
};

/**
 * Middleware para permitir apenas produtores
 */
const requireProdutor = requireUserType('produtor');

/**
 * Middleware para permitir apenas consumidores
 */
const requireConsumidor = requireUserType('consumidor');

/**
 * Middleware para verificar se o usuário é admin (se existir esse tipo)
 */
const requireAdmin = requireUserType('admin');

/**
 * Middleware para verificar se o usuário é o proprietário do recurso
 * Compara o ID do usuário logado com um parâmetro da URL
 * @param {string} paramName - Nome do parâmetro na URL (default: 'id')
 */
const requireOwnership = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
        error: 'NOT_AUTHENTICATED'
      });
    }

    const resourceId = req.params[paramName];
    const userId = req.user.id;

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: `Parâmetro '${paramName}' não encontrado na URL`,
        error: 'MISSING_PARAMETER'
      });
    }

    if (parseInt(resourceId) !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: você só pode acessar seus próprios recursos',
        error: 'ACCESS_DENIED'
      });
    }

    next();
  };
};

/**
 * Middleware para verificar se o usuário é proprietário OU admin
 * @param {string} paramName - Nome do parâmetro na URL (default: 'id')
 */
const requireOwnershipOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
        error: 'NOT_AUTHENTICATED'
      });
    }

    const resourceId = req.params[paramName];
    const userId = req.user.id;
    const userType = req.user.tipo_usuario;

    if (!resourceId) {
      return res.status(400).json({
        success: false,
        message: `Parâmetro '${paramName}' não encontrado na URL`,
        error: 'MISSING_PARAMETER'
      });
    }

    // Admin pode acessar qualquer recurso
    if (userType === 'admin') {
      return next();
    }

    // Usuário comum só pode acessar seus próprios recursos
    if (parseInt(resourceId) !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado: você só pode acessar seus próprios recursos',
        error: 'ACCESS_DENIED'
      });
    }

    next();
  };
};

/**
 * Middleware opcional de autenticação
 * Se o token estiver presente, valida e adiciona o usuário à requisição
 * Se não estiver presente, continua sem erro
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      // Token não fornecido, continua sem autenticação
      return next();
    }

    // Se token foi fornecido, tenta validar
    const decoded = verifyToken(token, 'access');
    
    const userResult = await pool.query(
      'SELECT id, email, nome_completo, tipo_usuario, is_ativo FROM usuarios WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].is_ativo) {
      const user = userResult.rows[0];
      req.user = {
        id: user.id,
        email: user.email,
        nome_completo: user.nome_completo,
        tipo_usuario: user.tipo_usuario,
        is_ativo: user.is_ativo
      };
    }

    next();
  } catch (error) {
    // Se houver erro na validação do token, continua sem autenticação
    // mas loga o erro para debug
    console.warn('Token opcional inválido:', error.message);
    next();
  }
};

/**
 * Middleware para verificar se o token é do tipo refresh
 */
const requireRefreshToken = async (req, res, next) => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization) || req.body.refresh_token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token requerido',
        error: 'MISSING_REFRESH_TOKEN'
      });
    }

    // Verificar se é um refresh token válido
    const decoded = verifyToken(token, 'refresh');
    
    // Buscar usuário
    const userResult = await pool.query(
      'SELECT id, email, nome_completo, tipo_usuario, is_ativo FROM usuarios WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado',
        error: 'USER_NOT_FOUND'
      });
    }

    const user = userResult.rows[0];

    if (!user.is_ativo) {
      return res.status(403).json({
        success: false,
        message: 'Conta desativada',
        error: 'ACCOUNT_DISABLED'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      nome_completo: user.nome_completo,
      tipo_usuario: user.tipo_usuario,
      is_ativo: user.is_ativo
    };

    next();
  } catch (error) {
    console.error('Erro na validação do refresh token:', error);

    if (error.message === 'Token expirado') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expirado',
        error: 'REFRESH_TOKEN_EXPIRED'
      });
    }

    if (error.message === 'Token inválido') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token inválido',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
};

module.exports = {
  authenticate,
  requireUserType,
  requireProdutor,
  requireConsumidor,
  requireAdmin,
  requireOwnership,
  requireOwnershipOrAdmin,
  optionalAuthenticate,
  requireRefreshToken
};