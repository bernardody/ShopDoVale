require('dotenv').config();

const express = require('express');
const path = require('path');
const { 
  globalErrorHandler, 
  notFound, 
  uncaughtException, 
  unhandledRejection 
} = require('./middlewares/errorHandler');

// Importar rotas centralizadas
const routes = require('./routes');

// Inicializar tratamento de erros não capturados
uncaughtException();
unhandledRejection();

// Criar instância do Express
const app = express();

// Configurar trust proxy para produção
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ===== MIDDLEWARES GLOBAIS =====

// Parser de JSON e URL encoded
const maxFileSize = process.env.MAX_FILE_SIZE || '5242880';
app.use(express.json({ limit: maxFileSize }));
app.use(express.urlencoded({ extended: true, limit: maxFileSize }));

// Servir arquivos estáticos (uploads)
const uploadPath = process.env.UPLOAD_PATH || './uploads';
app.use('/uploads', express.static(path.resolve(uploadPath)));

// CORS - Configuração baseada no .env
app.use((req, res, next) => {
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
  const origin = req.headers.origin;
  
  if (corsOrigins.includes(origin) || corsOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Responder imediatamente para requisições OPTIONS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// Headers de segurança
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.removeHeader('X-Powered-By');
  
  // HSTS apenas em produção com HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// Rate limiting baseado nas configurações do .env
const rateLimitWindowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15 minutos
const rateLimitMaxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
const requestCounts = new Map();

app.use((req, res, next) => {
  // Aplicar rate limiting apenas em produção ou se explicitamente habilitado
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_RATE_LIMIT === 'true') {
    const ip = req.ip;
    const now = Date.now();
    
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip).filter(time => now - time < rateLimitWindowMs);
    
    if (requests.length >= rateLimitMaxRequests) {
      return res.status(429).json({
        status: 'error',
        message: 'Muitas requisições. Tente novamente mais tarde.'
      });
    }
    
    requests.push(now);
    requestCounts.set(ip, requests);
  }
  next();
});

// Logging de requisições
app.use((req, res, next) => {
  const start = Date.now();
  const logLevel = process.env.LOG_LEVEL || 'info';
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const shouldLog = 
      logLevel === 'debug' ||
      (logLevel === 'info' && res.statusCode >= 400) ||
      (logLevel === 'error' && res.statusCode >= 500);
    
    if (shouldLog) {
      const timestamp = new Date().toISOString();
      const method = req.method;
      const url = req.originalUrl;
      const status = res.statusCode;
      const ip = req.ip;
      const userAgent = req.get('user-agent')?.substring(0, 50);
      
      console.log(`[${timestamp}] ${method} ${url} ${status} ${duration}ms - ${ip} - ${userAgent}`);
      
      // Log detalhado de erros em desenvolvimento
      if (res.statusCode >= 400 && process.env.NODE_ENV === 'development') {
        console.log('Body:', JSON.stringify(req.body));
        console.log('Query:', JSON.stringify(req.query));
        console.log('Params:', JSON.stringify(req.params));
      }
    }
  });
  
  next();
});

// ===== ROTAS =====

// Rota raiz - informações básicas da API
app.get('/', (req, res) => {
  res.json({
    name: 'Shop do Vale API',
    version: '1.0.0',
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      api: '/api',
      health: '/health',
      docs: '/api-docs'
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  const { healthCheck } = require('./config/database');
  
  try {
    const dbHealth = await healthCheck();
    const isHealthy = dbHealth.status === 'healthy';
    
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Montar rotas da API
app.use('/api', routes);

// Rota para documentação (placeholder)
app.get('/api-docs', (req, res) => {
  res.json({
    message: 'Documentação da API em desenvolvimento',
    info: 'Em breve será implementado Swagger/OpenAPI',
    endpoints: {
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout'
      },
      users: {
        profile: 'GET /api/users/profile',
        update: 'PUT /api/users/profile',
        list: 'GET /api/users (admin)',
        delete: 'DELETE /api/users/:id (admin)'
      },
      produtos: {
        list: 'GET /api/produtos',
        get: 'GET /api/produtos/:id',
        create: 'POST /api/produtos (admin)',
        update: 'PUT /api/produtos/:id (admin)',
        delete: 'DELETE /api/produtos/:id (admin)'
      },
      carrinho: {
        get: 'GET /api/carrinho',
        add: 'POST /api/carrinho/add',
        update: 'PUT /api/carrinho/:produtoId',
        remove: 'DELETE /api/carrinho/:produtoId',
        clear: 'DELETE /api/carrinho'
      },
      pedidos: {
        list: 'GET /api/pedidos',
        get: 'GET /api/pedidos/:id',
        create: 'POST /api/pedidos',
        update: 'PUT /api/pedidos/:id/status (admin)',
        cancel: 'PUT /api/pedidos/:id/cancel'
      },
      dashboard: {
        stats: 'GET /api/dashboard/stats (admin)',
        sales: 'GET /api/dashboard/sales (admin)',
        users: 'GET /api/dashboard/users (admin)',
        products: 'GET /api/dashboard/products (admin)'
      }
    }
  });
});

// ===== TRATAMENTO DE ERROS =====

// Capturar rotas não encontradas
app.use(notFound);

// Handler global de erros
app.use(globalErrorHandler);

// ===== JOBS AGENDADOS =====

// Configurar renovação semanal se habilitada
if (process.env.ENABLE_WEEKLY_RENEWAL === 'true') {
  const { setupWeeklyRenewal } = require('./services/weeklyService');
  
  // Agendar para executar na inicialização se necessário
  setTimeout(() => {
    console.log('Configurando renovação semanal de produtos...');
    setupWeeklyRenewal();
  }, 5000); // Aguardar 5 segundos após inicialização
}

// ===== LIMPEZA PERIÓDICA =====

// Limpar mapa de rate limiting periodicamente
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [ip, requests] of requestCounts) {
    const validRequests = requests.filter(time => now - time < rateLimitWindowMs);
    if (validRequests.length === 0) {
      requestCounts.delete(ip);
      cleaned++;
    } else {
      requestCounts.set(ip, validRequests);
    }
  }
  
  if (cleaned > 0 && process.env.LOG_LEVEL === 'debug') {
    console.log(`[${new Date().toISOString()}] Limpeza de rate limit: ${cleaned} IPs removidos`);
  }
}, rateLimitWindowMs); // Executar no mesmo intervalo do rate limit

// Exportar app
module.exports = app;