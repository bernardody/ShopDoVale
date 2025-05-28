const express = require('express');
const router = express.Router();

// Controllers
const carrinhoController = require('../controllers/carrinhoController');

// Middlewares
const { authenticate, requireOwnership } = require('../middlewares/auth');
const { 
  validateCarrinhoItem, 
  validateCarrinhoUpdate 
} = require('../middlewares/validation');

/**
 * @route   GET /api/carrinho
 * @desc    Obter carrinho do usuário logado
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/', authenticate, carrinhoController.getCarrinho);

/**
 * @route   POST /api/carrinho/items
 * @desc    Adicionar item ao carrinho
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    {
 *   produto_id: number (required),
 *   quantidade: number (required),
 *   observacoes: string (optional)
 * }
 */
router.post('/items', authenticate, validateCarrinhoItem, carrinhoController.addItem);

/**
 * @route   PUT /api/carrinho/items/:itemId
 * @desc    Atualizar item do carrinho
 * @access  Private (proprietário do carrinho)
 * @param   itemId: number
 * @body    {
 *   quantidade: number (required),
 *   observacoes: string (optional)
 * }
 */
router.put('/items/:itemId', authenticate, validateCarrinhoUpdate, carrinhoController.updateItem);

/**
 * @route   DELETE /api/carrinho/items/:itemId
 * @desc    Remover item do carrinho
 * @access  Private (proprietário do carrinho)
 * @param   itemId: number
 */
router.delete('/items/:itemId', authenticate, carrinhoController.removeItem);

/**
 * @route   DELETE /api/carrinho
 * @desc    Limpar carrinho (remover todos os itens)
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.delete('/', authenticate, carrinhoController.clearCarrinho);

/**
 * @route   GET /api/carrinho/resumo
 * @desc    Obter resumo do carrinho (total de itens, valor total)
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/resumo', authenticate, carrinhoController.getResumoCarrinho);

/**
 * @route   POST /api/carrinho/validar
 * @desc    Validar carrinho antes do checkout (estoque, preços, disponibilidade)
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.post('/validar', authenticate, carrinhoController.validarCarrinho);

/**
 * @route   POST /api/carrinho/aplicar-cupom
 * @desc    Aplicar cupom de desconto
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    {
 *   codigo_cupom: string (required)
 * }
 */
router.post('/aplicar-cupom', authenticate, carrinhoController.aplicarCupom);

/**
 * @route   DELETE /api/carrinho/remover-cupom
 * @desc    Remover cupom de desconto aplicado
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.delete('/remover-cupom', authenticate, carrinhoController.removerCupom);

/**
 * @route   POST /api/carrinho/calcular-frete
 * @desc    Calcular frete para o carrinho
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    {
 *   cep_destino: string (required),
 *   endereco_id: number (optional - se não informar CEP)
 * }
 */
router.post('/calcular-frete', authenticate, carrinhoController.calcularFrete);

/**
 * @route   POST /api/carrinho/checkout
 * @desc    Finalizar compra (converter carrinho em pedido)
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    {
 *   endereco_entrega_id: number (required),
 *   forma_pagamento: string (required),
 *   observacoes_pedido: string (optional),
 *   cupom_desconto: string (optional),
 *   dados_pagamento: object (optional - específico para cada forma de pagamento)
 * }
 */
router.post('/checkout', authenticate, carrinhoController.checkout);

/**
 * @route   GET /api/carrinho/historico
 * @desc    Histórico de carrinho abandonado (últimos 30 dias)
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @query   {
 *   page: number,
 *   limit: number
 * }
 */
router.get('/historico', authenticate, carrinhoController.getHistoricoCarrinho);

/**
 * @route   POST /api/carrinho/restaurar/:carrinhoId
 * @desc    Restaurar carrinho abandonado
 * @access  Private (proprietário do carrinho)
 * @param   carrinhoId: number
 */
router.post('/restaurar/:carrinhoId', authenticate, carrinhoController.restaurarCarrinho);

/**
 * @route   POST /api/carrinho/salvar-para-depois
 * @desc    Salvar carrinho atual para depois (lista de desejos temporária)
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    {
 *   nome_lista: string (optional)
 * }
 */
router.post('/salvar-para-depois', authenticate, carrinhoController.salvarParaDepois);

/**
 * @route   GET /api/carrinho/salvos
 * @desc    Obter carrinhos salvos para depois
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/salvos', authenticate, carrinhoController.getCarrinhosSalvos);

/**
 * @route   POST /api/carrinho/compartilhar
 * @desc    Gerar link para compartilhar carrinho
 * @access  Private
 * @header  Authorization: Bearer <token>
 * @body    {
 *   nome_compartilhamento: string (optional),
 *   validade_horas: number (default: 24)
 * }
 */
router.post('/compartilhar', authenticate, carrinhoController.compartilharCarrinho);

/**
 * @route   GET /api/carrinho/compartilhado/:token
 * @desc    Visualizar carrinho compartilhado
 * @access  Public
 * @param   token: string
 */
router.get('/compartilhado/:token', carrinhoController.visualizarCarrinhoCompartilhado);

module.exports = router;