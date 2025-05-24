const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class AuthController {
  // Registro de usuário
  async register(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const {
        email,
        senha,
        nome_completo,
        telefone,
        cpf_cnpj,
        tipo_usuario,
        endereco,
        // Dados específicos do produtor
        nome_loja,
        descricao_loja,
        whatsapp
      } = req.body;

      // Validações básicas
      if (!email || !senha || !nome_completo || !tipo_usuario) {
        return res.status(400).json({
          error: 'Campos obrigatórios: email, senha, nome_completo, tipo_usuario'
        });
      }

      if (!['consumidor', 'produtor'].includes(tipo_usuario)) {
        return res.status(400).json({
          error: 'Tipo de usuário deve ser "consumidor" ou "produtor"'
        });
      }

      // Verificar se email já existe
      const emailExists = await client.query(
        'SELECT id FROM usuarios WHERE email = $1',
        [email]
      );

      if (emailExists.rows.length > 0) {
        return res.status(409).json({ error: 'Email já cadastrado' });
      }

      // Verificar CPF/CNPJ se fornecido
      if (cpf_cnpj) {
        const cpfExists = await client.query(
          'SELECT id FROM usuarios WHERE cpf_cnpj = $1',
          [cpf_cnpj]
        );

        if (cpfExists.rows.length > 0) {
          return res.status(409).json({ error: 'CPF/CNPJ já cadastrado' });
        }
      }

      // Hash da senha
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const senha_hash = await bcrypt.hash(senha, saltRounds);

      // Inserir endereço se fornecido
      let endereco_id = null;
      if (endereco) {
        const enderecoResult = await client.query(`
          INSERT INTO enderecos (cep, logradouro, numero, complemento, bairro, cidade, estado)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          endereco.cep,
          endereco.logradouro,
          endereco.numero,
          endereco.complemento || null,
          endereco.bairro,
          endereco.cidade,
          endereco.estado
        ]);
        endereco_id = enderecoResult.rows[0].id;
      }

      // Inserir usuário
      const userResult = await client.query(`
        INSERT INTO usuarios (email, senha_hash, nome_completo, telefone, cpf_cnpj, tipo_usuario, endereco_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, nome_completo, telefone, tipo_usuario, created_at
      `, [
        email,
        senha_hash,
        nome_completo,
        telefone || null,
        cpf_cnpj || null,
        tipo_usuario,
        endereco_id
      ]);

      const usuario = userResult.rows[0];

      // Se for produtor, inserir dados específicos
      if (tipo_usuario === 'produtor') {
        if (!nome_loja) {
          return res.status(400).json({
            error: 'Nome da loja é obrigatório para produtores'
          });
        }

        await client.query(`
          INSERT INTO produtores (usuario_id, nome_loja, descricao_loja, whatsapp)
          VALUES ($1, $2, $3, $4)
        `, [
          usuario.id,
          nome_loja,
          descricao_loja || null,
          whatsapp || null
        ]);
      }

      await client.query('COMMIT');

      // Gerar JWT
      const token = jwt.sign(
        {
          userId: usuario.id,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN,
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE
        }
      );

      // Gerar Refresh Token
      const refreshToken = jwt.sign(
        { userId: usuario.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
      );

      res.status(201).json({
        message: 'Usuário registrado com sucesso',
        user: {
          id: usuario.id,
          email: usuario.email,
          nome_completo: usuario.nome_completo,
          telefone: usuario.telefone,
          tipo_usuario: usuario.tipo_usuario,
          created_at: usuario.created_at
        },
        token,
        refreshToken
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro no registro:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
      client.release();
    }
  }

  // Login
  async login(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({
          error: 'Email e senha são obrigatórios'
        });
      }

      // Buscar usuário
      const result = await pool.query(`
        SELECT 
          u.id, u.email, u.senha_hash, u.nome_completo, u.telefone, 
          u.tipo_usuario, u.is_ativo, u.foto_perfil,
          p.nome_loja, p.descricao_loja, p.avaliacao_media
        FROM usuarios u
        LEFT JOIN produtores p ON u.id = p.usuario_id
        WHERE u.email = $1
      `, [email]);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      const usuario = result.rows[0];

      // Verificar se usuário está ativo
      if (!usuario.is_ativo) {
        return res.status(403).json({ error: 'Conta desativada' });
      }

      // Verificar senha
      const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Gerar tokens
      const token = jwt.sign(
        {
          userId: usuario.id,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN,
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE
        }
      );

      const refreshToken = jwt.sign(
        { userId: usuario.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN }
      );

      // Preparar dados do usuário para resposta
      const userData = {
        id: usuario.id,
        email: usuario.email,
        nome_completo: usuario.nome_completo,
        telefone: usuario.telefone,
        tipo_usuario: usuario.tipo_usuario,
        foto_perfil: usuario.foto_perfil
      };

      // Adicionar dados do produtor se aplicável
      if (usuario.tipo_usuario === 'produtor') {
        userData.loja = {
          nome_loja: usuario.nome_loja,
          descricao_loja: usuario.descricao_loja,
          avaliacao_media: usuario.avaliacao_media
        };
      }

      res.json({
        message: 'Login realizado com sucesso',
        user: userData,
        token,
        refreshToken
      });

    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Refresh Token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token é obrigatório' });
      }

      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

      // Buscar usuário
      const result = await pool.query(`
        SELECT id, email, tipo_usuario, is_ativo 
        FROM usuarios 
        WHERE id = $1
      `, [decoded.userId]);

      if (result.rows.length === 0 || !result.rows[0].is_ativo) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      const usuario = result.rows[0];

      // Gerar novo access token
      const newToken = jwt.sign(
        {
          userId: usuario.id,
          email: usuario.email,
          tipo_usuario: usuario.tipo_usuario
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN,
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE
        }
      );

      res.json({
        token: newToken
      });

    } catch (error) {
      console.error('Erro no refresh token:', error);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' });
      }
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
      }

      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Logout (opcional - para blacklist de tokens)
  async logout(req, res) {
    try {
      // Aqui você pode implementar blacklist de tokens se necessário
      // Por agora, apenas retorna sucesso
      res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Verificar token (middleware helper)
  async verifyToken(req, res) {
    try {
      // O token já foi verificado pelo middleware de autenticação
      const usuario = await pool.query(`
        SELECT 
          u.id, u.email, u.nome_completo, u.telefone, 
          u.tipo_usuario, u.foto_perfil,
          p.nome_loja, p.descricao_loja, p.avaliacao_media
        FROM usuarios u
        LEFT JOIN produtores p ON u.id = p.usuario_id
        WHERE u.id = $1 AND u.is_ativo = true
      `, [req.user.userId]);

      if (usuario.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const user = usuario.rows[0];
      const userData = {
        id: user.id,
        email: user.email,
        nome_completo: user.nome_completo,
        telefone: user.telefone,
        tipo_usuario: user.tipo_usuario,
        foto_perfil: user.foto_perfil
      };

      if (user.tipo_usuario === 'produtor') {
        userData.loja = {
          nome_loja: user.nome_loja,
          descricao_loja: user.descricao_loja,
          avaliacao_media: user.avaliacao_media
        };
      }

      res.json({
        valid: true,
        user: userData
      });

    } catch (error) {
      console.error('Erro na verificação do token:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = new AuthController();