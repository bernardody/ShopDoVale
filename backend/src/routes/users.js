const express = require('express');
const router = express.Router();

// Controllers
const userController = require('../controllers/userController');

// Middlewares
const { 
  authenticate, 
  requireAdmin, 
  requireOwnership, 
  requireOwnershipOrAdmin 
} = require('../middlewares/auth');
const { 
  validateUserUpdate, 
  validatePasswordChange, 
  validateUserQuery 
} = require('../middlewares/validation');

/**
 * @route   GET /api/users
 * @desc    Listar usuários com filtros e paginação
 * @access  Private (Admin)
 * @query   {
 *   page: number (default: 1),
 *   limit: number (default: 10),
 *   tipo_usuario: 'consumidor' | 'produtor',
 *   is_ativo: boolean,
 *   search: string,
 *   orderBy: 'created_at' | 'nome_completo' | 'email' | 'tipo_usuario',
 *   order: 'ASC' | 'DESC'
 * }
 */
router.get('/', authenticate, requireAdmin, validateUserQuery, userController.getUsers);

/**
 * @route   GET /api/users/stats
 * @desc    Obter estatísticas de usuários
 * @access  Private (Admin)
 */
router.get('/stats', authenticate, requireAdmin, userController.getUserStats);

/**
 * @route   GET /api/users/produtores
 * @desc    Listar apenas produtores (público)
 * @access  Public
 * @query   {
 *   page: number,
 *   limit: number,
 *   search: string,
 *   orderBy: 'created_at' | 'nome_completo' | 'avaliacao_media',
 *   order: 'ASC' | 'DESC'
 * }
 */
router.get('/produtores', userController.getProdutores);

/**
 * @route   GET /api/users/:id
 * @desc    Obter usuário por ID
 * @access  Private (próprio usuário ou admin)
 * @param   id: number
 */
router.get('/:id', authenticate, requireOwnershipOrAdmin, userController.getUserById);

/**
 * @route   PUT /api/users/:id
 * @desc    Atualizar dados do usuário
 * @access  Private (próprio usuário ou admin)
 * @param   id: number
 * @body    {
 *   nome_completo: string,
 *   telefone: string,
 *   cpf_cnpj: string,
 *   foto_perfil: string,
 *   endereco: {
 *     cep: string,
 *     logradouro: string,
 *     numero: string,
 *     complemento: string,
 *     bairro: string,
 *     cidade: string,
 *     estado: string
 *   },
 *   // Para produtores:
 *   produtor: {
 *     nome_loja: string,
 *     descricao_loja: string,
 *     whatsapp: string,
 *     logo_loja: string
 *   }
 * }
 */
router.put('/:id', authenticate, requireOwnershipOrAdmin, validateUserUpdate, userController.updateUser);

/**
 * @route   PUT /api/users/:id/password
 * @desc    Alterar senha do usuário
 * @access  Private (próprio usuário)
 * @param   id: number
 * @body    {
 *   senha_atual: string (required),
 *   nova_senha: string (required),
 *   confirmar_senha: string (required)
 * }
 */
router.put('/:id/password', authenticate, requireOwnership, validatePasswordChange, userController.changePassword);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Ativar/desativar usuário
 * @access  Private (Admin)
 * @param   id: number
 * @body    {
 *   is_ativo: boolean (required)
 * }
 */
router.put('/:id/status', authenticate, requireAdmin, userController.toggleUserStatus);

/**
 * @route   DELETE /api/users/:id
 * @desc    Deletar usuário (soft delete se tiver pedidos, hard delete se não tiver)
 * @access  Private (próprio usuário ou admin)
 * @param   id: number
 */
router.delete('/:id', authenticate, requireOwnershipOrAdmin, userController.deleteUser);

/**
 * @route   POST /api/users/:id/upload-avatar
 * @desc    Upload de foto de perfil
 * @access  Private (próprio usuário)
 * @param   id: number
 * @body    FormData com campo 'avatar'
 */
router.post('/:id/upload-avatar', authenticate, requireOwnership, userController.uploadAvatar);

/**
 * @route   POST /api/users/:id/upload-logo
 * @desc    Upload de logo da loja (apenas produtores)
 * @access  Private (próprio produtor)
 * @param   id: number
 * @body    FormData com campo 'logo'
 */
router.post('/:id/upload-logo', authenticate, requireOwnership, userController.uploadLogo);

/**
 * @route   GET /api/users/:id/pedidos
 * @desc    Obter pedidos do usuário
 * @access  Private (próprio usuário ou admin)
 * @param   id: number
 * @query   {
 *   page: number,
 *   limit: number,
 *   status: string,
 *   orderBy: 'created_at' | 'valor_total',
 *   order: 'ASC' | 'DESC'
 * }
 */
router.get('/:id/pedidos', authenticate, requireOwnershipOrAdmin, userController.getUserPedidos);

module.exports = router;