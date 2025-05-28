const express = require('express');
const router = express.Router();

// Importar todas as rotas
const authRoutes = require('./auth');
const userRoutes = require('./users');
const produtoRoutes = require('./produtos');
const carrinhoRoutes = require('./carrinho');
const pedidoRoutes = require('./pedidos');
const dashboardRoutes = require('./dashboard');

// Configurar rotas principais
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/produtos', produtoRoutes);
router.use('/carrinho', carrinhoRoutes);
router.use('/pedidos', pedidoRoutes);
router.use('/dashboard', dashboardRoutes);

// Rota de saúde da API
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API Shop do Vale funcionando',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rota raiz da API
router.get('/', (req, res) => {
  res.json({
    message: 'Bem-vindo à API Shop do Vale',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      produtos: '/api/produtos',
      carrinho: '/api/carrinho',
      pedidos: '/api/pedidos',
      dashboard: '/api/dashboard',
      health: '/api/health'
    },
    documentation: '/api/docs' // Para futuro uso com Swagger
  });
});

module.exports = router;