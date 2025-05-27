class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Função para tratar erros do PostgreSQL
const handlePostgreSQLError = (error) => {
  let message = 'Erro no banco de dados';
  let statusCode = 500;

  switch (error.code) {
    case '23505': // unique_violation
      if (error.detail.includes('email')) {
        message = 'Este email já está cadastrado';
        statusCode = 409;
      } else if (error.detail.includes('cpf_cnpj')) {
        message = 'Este CPF/CNPJ já está cadastrado';
        statusCode = 409;
      } else {
        message = 'Dados duplicados não permitidos';
        statusCode = 409;
      }
      break;

    case '23503': // foreign_key_violation
      message = 'Referência inválida - registro relacionado não encontrado';
      statusCode = 400;
      break;

    case '23502': // not_null_violation
      message = `Campo obrigatório não fornecido: ${error.column}`;
      statusCode = 400;
      break;

    case '23514': // check_violation
      message = 'Dados não atendem às regras de validação';
      statusCode = 400;
      break;

    case '42P01': // undefined_table
      message = 'Recurso não encontrado';
      statusCode = 404;
      break;

    case '42703': // undefined_column
      message = 'Campo não encontrado';
      statusCode = 400;
      break;

    case '08003': // connection_does_not_exist
    case '08006': // connection_failure
      message = 'Erro de conexão com o banco de dados';
      statusCode = 503;
      break;

    case '57014': // query_canceled
      message = 'Operação cancelada por timeout';
      statusCode = 408;
      break;

    default:
      if (error.severity === 'ERROR') {
        message = 'Erro interno do servidor';
        statusCode = 500;
      }
  }

  return new AppError(message, statusCode);
};

// Função para tratar erros do JWT
const handleJWTError = (error) => {
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Token inválido', 401);
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token expirado', 401);
  }
  
  if (error.name === 'NotBeforeError') {
    return new AppError('Token ainda não é válido', 401);
  }

  return new AppError('Erro de autenticação', 401);
};

// Função para tratar erros de validação
const handleValidationError = (error) => {
  // Para erros do express-validator ou joi
  if (error.array && typeof error.array === 'function') {
    const errors = error.array();
    const message = errors.map(err => `${err.path}: ${err.msg}`).join(', ');
    return new AppError(`Dados inválidos: ${message}`, 400);
  }

  // Para erros customizados de validação
  if (error.isJoi || error.name === 'ValidationError') {
    const message = error.details ? 
      error.details.map(detail => detail.message).join(', ') :
      error.message;
    return new AppError(`Dados inválidos: ${message}`, 400);
  }

  return new AppError('Dados de entrada inválidos', 400);
};

// Função para tratar erros de cast (conversão de tipos)
const handleCastError = (error) => {
  const message = `Valor inválido: ${error.value} para o campo ${error.path}`;
  return new AppError(message, 400);
};

// Função para tratar erros de multer (upload de arquivos)
const handleMulterError = (error) => {
  let message = 'Erro no upload de arquivo';
  let statusCode = 400;

  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'Arquivo muito grande';
      break;
    case 'LIMIT_FILE_COUNT':
      message = 'Muitos arquivos enviados';
      break;
    case 'LIMIT_FIELD_KEY':
      message = 'Nome do campo muito longo';
      break;
    case 'LIMIT_FIELD_VALUE':
      message = 'Valor do campo muito longo';
      break;
    case 'LIMIT_FIELD_COUNT':
      message = 'Muitos campos enviados';
      break;
    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Arquivo inesperado';
      break;
    case 'MISSING_FIELD_NAME':
      message = 'Nome do campo em falta';
      break;
    default:
      statusCode = 500;
  }

  return new AppError(message, statusCode);
};

// Função para sanitizar erros em produção
const sendErrorProd = (err, req, res) => {
  // Erro operacional: enviar mensagem para o cliente
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && {
        error: err,
        stack: err.stack
      })
    });
  }

  // Erro de programação: não vazar detalhes
  console.error('ERRO:', err);
  
  return res.status(500).json({
    status: 'error',
    message: 'Algo deu errado!',
    ...(process.env.NODE_ENV === 'development' && {
      error: err,
      stack: err.stack
    })
  });
};

// Função para enviar erros em desenvolvimento
const sendErrorDev = (err, req, res) => {
  return res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    message: err.message,
    error: err,
    stack: err.stack,
    request: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      params: req.params,
      query: req.query
    }
  });
};

// Middleware principal de tratamento de erros
const globalErrorHandler = (err, req, res, next) => {
  // Definir statusCode e status padrão
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log do erro para monitoramento
  console.error('Error occurred:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  let error = { ...err, message: err.message };

  // Tratar diferentes tipos de erro
  if (err.code && err.code.startsWith('23')) {
    // Erros do PostgreSQL
    error = handlePostgreSQLError(err);
  } else if (err.name && err.name.includes('JWT')) {
    // Erros do JWT
    error = handleJWTError(err);
  } else if (err.name === 'ValidationError' || err.isJoi) {
    // Erros de validação
    error = handleValidationError(err);
  } else if (err.name === 'CastError') {
    // Erros de cast/conversão
    error = handleCastError(err);
  } else if (err.code && err.code.startsWith('LIMIT_')) {
    // Erros do Multer
    error = handleMulterError(err);
  } else if (err.type === 'entity.parse.failed') {
    // Erro de parsing JSON
    error = new AppError('JSON inválido no corpo da requisição', 400);
  } else if (err.code === 'ECONNREFUSED') {
    // Erro de conexão
    error = new AppError('Serviço temporariamente indisponível', 503);
  } else if (err.code === 'ETIMEDOUT') {
    // Erro de timeout
    error = new AppError('Timeout da requisição', 408);
  }

  // Enviar resposta baseada no ambiente
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

// Middleware para capturar rotas não encontradas
const notFound = (req, res, next) => {
  const error = new AppError(
    `Rota ${req.originalUrl} não encontrada`,
    404
  );
  next(error);
};

// Middleware para capturar erros assíncronos
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Middleware para capturar erros síncronos não tratados
const uncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  });
};

// Middleware para capturar promises rejeitadas não tratadas
const unhandledRejection = () => {
  process.on('unhandledRejection', (err, promise) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error('Error:', err.message);
    console.error('Promise:', promise);
    process.exit(1);
  });
};

module.exports = {
  AppError,
  globalErrorHandler,
  notFound,
  catchAsync,
  uncaughtException,
  unhandledRejection,
  handlePostgreSQLError,
  handleJWTError,
  handleValidationError
};