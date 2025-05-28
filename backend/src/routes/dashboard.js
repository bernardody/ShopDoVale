const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middlewares/auth');

// Middleware de autenticação e verificação de admin para todas as rotas do dashboard
router.use(auth);
router.use(auth.isAdmin);

// GET /api/dashboard/resumo - Resumo geral do sistema
router.get('/resumo', dashboardController.getResumoGeral);

// GET /api/dashboard/vendas - Estatísticas de vendas
router.get('/vendas', dashboardController.getEstatisticasVendas);

// GET /api/dashboard/vendas/:periodo - Vendas por período (hoje, semana, mes, ano)
router.get('/vendas/:periodo', dashboardController.getVendasPorPeriodo);

// GET /api/dashboard/produtos - Estatísticas de produtos
router.get('/produtos', dashboardController.getEstatisticasProdutos);

// GET /api/dashboard/produtos/mais-vendidos - Produtos mais vendidos
router.get('/produtos/mais-vendidos', dashboardController.getProdutosMaisVendidos);

// GET /api/dashboard/produtos/estoque-baixo - Produtos com estoque baixo
router.get('/produtos/estoque-baixo', dashboardController.getProdutosEstoqueBaixo);

// GET /api/dashboard/usuarios - Estatísticas de usuários
router.get('/usuarios', dashboardController.getEstatisticasUsuarios);

// GET /api/dashboard/usuarios/novos - Novos usuários por período
router.get('/usuarios/novos', dashboardController.getUsuariosNovos);

// GET /api/dashboard/pedidos - Estatísticas de pedidos
router.get('/pedidos', dashboardController.getEstatisticasPedidos);

// GET /api/dashboard/pedidos/status - Distribuição de pedidos por status
router.get('/pedidos/status', dashboardController.getPedidosPorStatus);

// GET /api/dashboard/receita - Receita por período
router.get('/receita', dashboardController.getReceitaPorPeriodo);

// GET /api/dashboard/metricas-tempo-real - Métricas em tempo real
router.get('/metricas-tempo-real', dashboardController.getMetricasTempoReal);

module.exports = router;