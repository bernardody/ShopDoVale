const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/authController');

// Middlewares
const { authenticate, requireRefreshToken } = require('../middlewares/auth');
const { validateRegister, validateLogin, validateRefreshToken } = require('../middlewares/validation');

/**
 * @route   POST /api/auth/register
 * @desc    Registrar novo usuário (consumidor ou produtor)
 * @access  Public
 * @body    {
 *   email: string (required),
 *   senha: string (required),
 *   nome_completo: string (required),
 *   telefone: string (optional),
 *   cpf_cnpj: string (optional),
 *   tipo_usuario: 'consumidor' | 'produtor' (required),
 *   endereco: {
 *     cep: string,
 *     logradouro: string,
 *     numero: string,
 *     complemento: string,
 *     bairro: string,
 *     cidade: string,
 *     estado: string
 *   } (optional),
 *   // Para produtores:
 *   nome_loja: string (required for produtor),
 *   descricao_loja: string (optional),
 *   whatsapp: string (optional)
 * }
 */
router.post('/register', validateRegister, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login de usuário
 * @access  Public
 * @body    {
 *   email: string (required),
 *   senha: string (required)
 * }
 */
router.post('/login', validateLogin, authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Renovar token de acesso usando refresh token
 * @access  Public
 * @body    {
 *   refreshToken: string (required)
 * }
 */
router.post('/refresh', validateRefreshToken, authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout do usuário (invalidar tokens)
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/verify
 * @desc    Verificar se o token de acesso é válido
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/verify', authenticate, authController.verifyToken);

/**
 * @route   GET /api/auth/me
 * @desc    Obter dados do usuário logado
 * @access  Private
 * @header  Authorization: Bearer <token>
 */
router.get('/me', authenticate, authController.verifyToken);

module.exports = router;