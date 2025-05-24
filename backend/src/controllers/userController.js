const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class UserController {
  // Listar usuários com filtros e paginação
  async getUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        tipo_usuario,
        is_ativo,
        search,
        orderBy = 'created_at',
        order = 'DESC'
      } = req.query;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Filtros
      if (tipo_usuario) {
        paramCount++;
        whereConditions.push(`u.tipo_usuario = $${paramCount}`);
        queryParams.push(tipo_usuario);
      }

      if (is_ativo !== undefined) {
        paramCount++;
        whereConditions.push(`u.is_ativo = $${paramCount}`);
        queryParams.push(is_ativo === 'true');
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(
          u.nome_completo ILIKE $${paramCount} OR 
          u.email ILIKE $${paramCount} OR
          p.nome_loja ILIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar campos de ordenação
      const validOrderFields = ['created_at', 'nome_completo', 'email', 'tipo_usuario'];
      const orderField = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
      const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Query principal
      const query = `
        SELECT 
          u.id, u.email, u.nome_completo, u.telefone, u.cpf_cnpj,
          u.tipo_usuario, u.foto_perfil, u.is_ativo, u.created_at,
          e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado,
          p.nome_loja, p.descricao_loja, p.avaliacao_media, p.total_avaliacoes
        FROM usuarios u
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        LEFT JOIN produtores p ON u.id = p.usuario_id
        ${whereClause}
        ORDER BY u.${orderField} ${orderDirection}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM usuarios u
        LEFT JOIN produtores p ON u.id = p.usuario_id
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      // Formatar dados dos usuários
      const users = result.rows.map(row => {
        const user = {
          id: row.id,
          email: row.email,
          nome_completo: row.nome_completo,
          telefone: row.telefone,
          cpf_cnpj: row.cpf_cnpj,
          tipo_usuario: row.tipo_usuario,
          foto_perfil: row.foto_perfil,
          is_ativo: row.is_ativo,
          created_at: row.created_at,
          endereco: null,
          loja: null
        };

        // Adicionar endereço se existir
        if (row.cep) {
          user.endereco = {
            cep: row.cep,
            logradouro: row.logradouro,
            numero: row.numero,
            complemento: row.complemento,
            bairro: row.bairro,
            cidade: row.cidade,
            estado: row.estado
          };
        }

        // Adicionar dados da loja se for produtor
        if (row.tipo_usuario === 'produtor' && row.nome_loja) {
          user.loja = {
            nome_loja: row.nome_loja,
            descricao_loja: row.descricao_loja,
            avaliacao_media: parseFloat(row.avaliacao_media || 0),
            total_avaliacoes: row.total_avaliacoes || 0
          };
        }

        return user;
      });

      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });

    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Buscar usuário por ID
  async getUserById(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(`
        SELECT 
          u.id, u.email, u.nome_completo, u.telefone, u.cpf_cnpj,
          u.tipo_usuario, u.foto_perfil, u.is_ativo, u.created_at, u.updated_at,
          e.id as endereco_id, e.cep, e.logradouro, e.numero, e.complemento, 
          e.bairro, e.cidade, e.estado,
          p.nome_loja, p.descricao_loja, p.logo_loja, p.whatsapp,
          p.avaliacao_media, p.total_avaliacoes
        FROM usuarios u
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        LEFT JOIN produtores p ON u.id = p.usuario_id
        WHERE u.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const row = result.rows[0];
      const user = {
        id: row.id,
        email: row.email,
        nome_completo: row.nome_completo,
        telefone: row.telefone,
        cpf_cnpj: row.cpf_cnpj,
        tipo_usuario: row.tipo_usuario,
        foto_perfil: row.foto_perfil,
        is_ativo: row.is_ativo,
        created_at: row.created_at,
        updated_at: row.updated_at,
        endereco: null,
        loja: null
      };

      // Adicionar endereço se existir
      if (row.endereco_id) {
        user.endereco = {
          id: row.endereco_id,
          cep: row.cep,
          logradouro: row.logradouro,
          numero: row.numero,
          complemento: row.complemento,
          bairro: row.bairro,
          cidade: row.cidade,
          estado: row.estado
        };
      }

      // Adicionar dados da loja se for produtor
      if (row.tipo_usuario === 'produtor' && row.nome_loja) {
        user.loja = {
          nome_loja: row.nome_loja,
          descricao_loja: row.descricao_loja,
          logo_loja: row.logo_loja,
          whatsapp: row.whatsapp,
          avaliacao_media: parseFloat(row.avaliacao_media || 0),
          total_avaliacoes: row.total_avaliacoes || 0
        };
      }

      res.json({ user });

    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar usuário
  async updateUser(req, res) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const { id } = req.params;
      const {
        nome_completo,
        telefone,
        cpf_cnpj,
        endereco,
        // Dados específicos do produtor
        nome_loja,
        descricao_loja,
        whatsapp
      } = req.body;

      // Verificar se usuário existe
      const userExists = await client.query(
        'SELECT id, tipo_usuario, endereco_id FROM usuarios WHERE id = $1',
        [id]
      );

      if (userExists.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const usuario = userExists.rows[0];

      // Verificar CPF/CNPJ duplicado se estiver sendo alterado
      if (cpf_cnpj) {
        const cpfExists = await client.query(
          'SELECT id FROM usuarios WHERE cpf_cnpj = $1 AND id != $2',
          [cpf_cnpj, id]
        );

        if (cpfExists.rows.length > 0) {
          return res.status(409).json({ error: 'CPF/CNPJ já cadastrado' });
        }
      }

      // Atualizar ou criar endereço
      let endereco_id = usuario.endereco_id;
      
      if (endereco) {
        if (endereco_id) {
          // Atualizar endereço existente
          await client.query(`
            UPDATE enderecos 
            SET cep = $1, logradouro = $2, numero = $3, complemento = $4, 
                bairro = $5, cidade = $6, estado = $7
            WHERE id = $8
          `, [
            endereco.cep,
            endereco.logradouro,
            endereco.numero,
            endereco.complemento || null,
            endereco.bairro,
            endereco.cidade,
            endereco.estado,
            endereco_id
          ]);
        } else {
          // Criar novo endereço
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
      }

      // Atualizar dados do usuário
      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      if (nome_completo) {
        paramCount++;
        updateFields.push(`nome_completo = $${paramCount}`);
        updateValues.push(nome_completo);
      }

      if (telefone !== undefined) {
        paramCount++;
        updateFields.push(`telefone = $${paramCount}`);
        updateValues.push(telefone || null);
      }

      if (cpf_cnpj !== undefined) {
        paramCount++;
        updateFields.push(`cpf_cnpj = $${paramCount}`);
        updateValues.push(cpf_cnpj || null);
      }

      if (endereco_id !== usuario.endereco_id) {
        paramCount++;
        updateFields.push(`endereco_id = $${paramCount}`);
        updateValues.push(endereco_id);
      }

      if (updateFields.length > 0) {
        paramCount++;
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);

        const updateQuery = `
          UPDATE usuarios 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
        `;

        await client.query(updateQuery, updateValues);
      }

      // Atualizar dados do produtor se aplicável
      if (usuario.tipo_usuario === 'produtor') {
        const produtorFields = [];
        const produtorValues = [];
        let produtorParamCount = 0;

        if (nome_loja) {
          produtorParamCount++;
          produtorFields.push(`nome_loja = $${produtorParamCount}`);
          produtorValues.push(nome_loja);
        }

        if (descricao_loja !== undefined) {
          produtorParamCount++;
          produtorFields.push(`descricao_loja = $${produtorParamCount}`);
          produtorValues.push(descricao_loja || null);
        }

        if (whatsapp !== undefined) {
          produtorParamCount++;
          produtorFields.push(`whatsapp = $${produtorParamCount}`);
          produtorValues.push(whatsapp || null);
        }

        if (produtorFields.length > 0) {
          produtorParamCount++;
          produtorValues.push(id);

          const updateProdutorQuery = `
            UPDATE produtores 
            SET ${produtorFields.join(', ')}
            WHERE usuario_id = $${produtorParamCount}
          `;

          await client.query(updateProdutorQuery, produtorValues);
        }
      }

      await client.query('COMMIT');

      // Buscar dados atualizados
      const updatedUser = await client.query(`
        SELECT 
          u.id, u.email, u.nome_completo, u.telefone, u.cpf_cnpj,
          u.tipo_usuario, u.foto_perfil, u.is_ativo, u.updated_at,
          e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado,
          p.nome_loja, p.descricao_loja, p.whatsapp, p.avaliacao_media
        FROM usuarios u
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        LEFT JOIN produtores p ON u.id = p.usuario_id
        WHERE u.id = $1
      `, [id]);

      const row = updatedUser.rows[0];
      const userData = {
        id: row.id,
        email: row.email,
        nome_completo: row.nome_completo,
        telefone: row.telefone,
        cpf_cnpj: row.cpf_cnpj,
        tipo_usuario: row.tipo_usuario,
        foto_perfil: row.foto_perfil,
        is_ativo: row.is_ativo,
        updated_at: row.updated_at
      };

      if (row.cep) {
        userData.endereco = {
          cep: row.cep,
          logradouro: row.logradouro,
          numero: row.numero,
          complemento: row.complemento,
          bairro: row.bairro,
          cidade: row.cidade,
          estado: row.estado
        };
      }

      if (row.tipo_usuario === 'produtor' && row.nome_loja) {
        userData.loja = {
          nome_loja: row.nome_loja,
          descricao_loja: row.descricao_loja,
          whatsapp: row.whatsapp,
          avaliacao_media: row.avaliacao_media
        };
      }

      res.json({
        message: 'Usuário atualizado com sucesso',
        user: userData
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    } finally {
      client.release();
    }
  }

  // Alterar senha
  async changePassword(req, res) {
    try {
      const { id } = req.params;
      const { senha_atual, nova_senha } = req.body;

      if (!senha_atual || !nova_senha) {
        return res.status(400).json({
          error: 'Senha atual e nova senha são obrigatórias'
        });
      }

      if (nova_senha.length < 6) {
        return res.status(400).json({
          error: 'Nova senha deve ter pelo menos 6 caracteres'
        });
      }

      // Buscar usuário
      const result = await pool.query(
        'SELECT senha_hash FROM usuarios WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Verificar senha atual
      const senhaValida = await bcrypt.compare(senha_atual, result.rows[0].senha_hash);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }

      // Gerar hash da nova senha
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const nova_senha_hash = await bcrypt.hash(nova_senha, saltRounds);

      // Atualizar senha
      await pool.query(
        'UPDATE usuarios SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [nova_senha_hash, id]
      );

      res.json({ message: 'Senha alterada com sucesso' });

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Alterar status ativo/inativo
  async toggleUserStatus(req, res) {
    try {
      const { id } = req.params;
      const { is_ativo } = req.body;

      if (typeof is_ativo !== 'boolean') {
        return res.status(400).json({
          error: 'Campo is_ativo deve ser boolean'
        });
      }

      const result = await pool.query(
        'UPDATE usuarios SET is_ativo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING is_ativo',
        [is_ativo, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({
        message: `Usuário ${is_ativo ? 'ativado' : 'desativado'} com sucesso`,
        is_ativo: result.rows[0].is_ativo
      });

    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Deletar usuário (soft delete - apenas desativa)
  async deleteUser(req, res) {
    try {
      const { id } = req.params;

      // Verificar se usuário tem pedidos
      const pedidosExist = await pool.query(
        'SELECT id FROM pedidos WHERE consumidor_id = $1 OR produtor_id = $1 LIMIT 1',
        [id]
      );

      if (pedidosExist.rows.length > 0) {
        // Se tem pedidos, apenas desativa
        const result = await pool.query(
          'UPDATE usuarios SET is_ativo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING nome_completo',
          [id]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        return res.json({
          message: 'Usuário desativado (possui histórico de pedidos)',
          action: 'deactivated'
        });
      }

      // Se não tem pedidos, pode deletar
      const result = await pool.query(
        'DELETE FROM usuarios WHERE id = $1 RETURNING nome_completo',
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({
        message: 'Usuário deletado com sucesso',
        action: 'deleted'
      });

    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Estatísticas de usuários
  async getUserStats(req, res) {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_usuarios,
          COUNT(*) FILTER (WHERE tipo_usuario = 'consumidor') as total_consumidores,
          COUNT(*) FILTER (WHERE tipo_usuario = 'produtor') as total_produtores,
          COUNT(*) FILTER (WHERE is_ativo = true) as usuarios_ativos,
          COUNT(*) FILTER (WHERE is_ativo = false) as usuarios_inativos,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as novos_usuarios_mes,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as novos_usuarios_semana
        FROM usuarios
      `);

      res.json({
        stats: stats.rows[0]
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = new UserController();