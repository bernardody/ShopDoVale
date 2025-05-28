const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const auth = require('../middlewares/auth');
const { validatePedido, validatePedidoUpdate } = require('../middlewares/validation');

// Middleware de autenticação para todas as rotas
router.use(auth);

// GET /api/pedidos - Listar pedidos do usuário logado
router.get('/', pedidoController.getPedidosUsuario);

// GET /api/pedidos/admin - Listar todos os pedidos (apenas admin)
router.get('/admin', auth.isAdmin, pedidoController.getTodosPedidos);

// GET /api/pedidos/:id - Buscar pedido específico
router.get('/:id', pedidoController.getPedidoPorId);

// POST /api/pedidos - Criar novo pedido
router.post('/', validatePedido, pedidoController.criarPedido);

// PUT /api/pedidos/:id/status - Atualizar status do pedido (apenas admin)
router.put('/:id/status', auth.isAdmin, validatePedidoUpdate, pedidoController.atualizarStatusPedido);

// DELETE /api/pedidos/:id - Cancelar pedido
router.delete('/:id', pedidoController.cancelarPedido);

// GET /api/pedidos/:id/historico - Histórico de status do pedido
router.get('/:id/historico', pedidoController.getHistoricoPedido);

// GET /api/pedidos/status/:status - Buscar pedidos por status
router.get('/status/:status', pedidoController.getPedidosPorStatus);

module.exports = router;