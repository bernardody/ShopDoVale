const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.email = data.email;
    this.senha_hash = data.senha_hash;
    this.nome_completo = data.nome_completo;
    this.telefone = data.telefone;
    this.cpf_cnpj = data.cpf_cnpj;
    this.tipo_usuario = data.tipo_usuario; // 'consumidor' ou 'produtor'
    this.foto_perfil = data.foto_perfil;
    this.is_ativo = data.is_ativo !== undefined ? data.is_ativo : true;
    this.endereco_id = data.endereco_id;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Buscar usuário por ID
  static async findById(id) {
    try {
      const result = await pool.query(`
        SELECT 
          u.id, u.email, u.nome_completo, u.telefone, u.cpf_cnpj,
          u.tipo_usuario, u.foto_perfil, u.is_ativo, u.created_at, u.updated_at,
          u.endereco_id,
          e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.cidade, e.estado,
          p.nome_loja, p.descricao_loja, p.logo_loja, p.whatsapp,
          p.avaliacao_media, p.total_avaliacoes
        FROM usuarios u
        LEFT JOIN enderecos e ON u.endereco_id = e.id
        LEFT JOIN produtores p ON u.id = p.usuario_id
        WHERE u.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return User.formatUserData(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar usuário por email
  static async findByEmail(email) {
    try {
      const result = await pool.query(`
        SELECT 
          u.*, 
          p.nome_loja, p.descricao_loja, p.avaliacao_media
        FROM usuarios u
        LEFT JOIN produtores p ON u.id = p.usuario_id
        WHERE u.email = $1
      `, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      return new User(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar usuário por CPF/CNPJ
  static async findByCpfCnpj(cpf_cnpj) {
    try {
      const result = await pool.query(
        'SELECT id FROM usuarios WHERE cpf_cnpj = $1',
        [cpf_cnpj]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Listar usuários com filtros e paginação
  static async findAll(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        tipo_usuario,
        is_ativo,
        search,
        orderBy = 'created_at',
        order = 'DESC'
      } = filters;

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
      const users = result.rows.map(row => User.formatUserData(row));

      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      throw error;
    }
  }

  // Criar usuário
  static async create(userData, enderecoData = null, produtorData = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        email,
        senha,
        nome_completo,
        telefone,
        cpf_cnpj,
        tipo_usuario
      } = userData;

      // Hash da senha
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const senha_hash = await bcrypt.hash(senha, saltRounds);

      // Inserir endereço se fornecido
      let endereco_id = null;
      if (enderecoData) {
        const enderecoResult = await client.query(`
          INSERT INTO enderecos (cep, logradouro, numero, complemento, bairro, cidade, estado)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          enderecoData.cep,
          enderecoData.logradouro,
          enderecoData.numero,
          enderecoData.complemento || null,
          enderecoData.bairro,
          enderecoData.cidade,
          enderecoData.estado
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
      if (tipo_usuario === 'produtor' && produtorData) {
        await client.query(`
          INSERT INTO produtores (usuario_id, nome_loja, descricao_loja, whatsapp)
          VALUES ($1, $2, $3, $4)
        `, [
          usuario.id,
          produtorData.nome_loja,
          produtorData.descricao_loja || null,
          produtorData.whatsapp || null
        ]);
      }

      await client.query('COMMIT');
      return new User(usuario);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Atualizar usuário
  async update(updateData, enderecoData = null, produtorData = null) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const {
        nome_completo,
        telefone,
        cpf_cnpj,
        foto_perfil
      } = updateData;

      // Atualizar ou criar endereço
      let endereco_id = this.endereco_id;
      
      if (enderecoData) {
        if (endereco_id) {
          // Atualizar endereço existente
          await client.query(`
            UPDATE enderecos 
            SET cep = $1, logradouro = $2, numero = $3, complemento = $4, 
                bairro = $5, cidade = $6, estado = $7
            WHERE id = $8
          `, [
            enderecoData.cep,
            enderecoData.logradouro,
            enderecoData.numero,
            enderecoData.complemento || null,
            enderecoData.bairro,
            enderecoData.cidade,
            enderecoData.estado,
            endereco_id
          ]);
        } else {
          // Criar novo endereço
          const enderecoResult = await client.query(`
            INSERT INTO enderecos (cep, logradouro, numero, complemento, bairro, cidade, estado)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [
            enderecoData.cep,
            enderecoData.logradouro,
            enderecoData.numero,
            enderecoData.complemento || null,
            enderecoData.bairro,
            enderecoData.cidade,
            enderecoData.estado
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

      if (foto_perfil !== undefined) {
        paramCount++;
        updateFields.push(`foto_perfil = $${paramCount}`);
        updateValues.push(foto_perfil || null);
      }

      if (endereco_id !== this.endereco_id) {
        paramCount++;
        updateFields.push(`endereco_id = $${paramCount}`);
        updateValues.push(endereco_id);
      }

      if (updateFields.length > 0) {
        paramCount++;
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(this.id);

        const updateQuery = `
          UPDATE usuarios 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCount}
        `;

        await client.query(updateQuery, updateValues);
      }

      // Atualizar dados do produtor se aplicável
      if (this.tipo_usuario === 'produtor' && produtorData) {
        const produtorFields = [];
        const produtorValues = [];
        let produtorParamCount = 0;

        if (produtorData.nome_loja) {
          produtorParamCount++;
          produtorFields.push(`nome_loja = $${produtorParamCount}`);
          produtorValues.push(produtorData.nome_loja);
        }

        if (produtorData.descricao_loja !== undefined) {
          produtorParamCount++;
          produtorFields.push(`descricao_loja = $${produtorParamCount}`);
          produtorValues.push(produtorData.descricao_loja || null);
        }

        if (produtorData.whatsapp !== undefined) {
          produtorParamCount++;
          produtorFields.push(`whatsapp = $${produtorParamCount}`);
          produtorValues.push(produtorData.whatsapp || null);
        }

        if (produtorData.logo_loja !== undefined) {
          produtorParamCount++;
          produtorFields.push(`logo_loja = $${produtorParamCount}`);
          produtorValues.push(produtorData.logo_loja || null);
        }

        if (produtorFields.length > 0) {
          produtorParamCount++;
          produtorValues.push(this.id);

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
      const updatedUser = await User.findById(this.id);
      return updatedUser;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Alterar senha
  async changePassword(senhaAtual, novaSenha) {
    try {
      // Verificar senha atual
      const senhaValida = await bcrypt.compare(senhaAtual, this.senha_hash);
      if (!senhaValida) {
        throw new Error('Senha atual incorreta');
      }

      // Gerar hash da nova senha
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const nova_senha_hash = await bcrypt.hash(novaSenha, saltRounds);

      // Atualizar senha
      await pool.query(
        'UPDATE usuarios SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [nova_senha_hash, this.id]
      );

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Alterar status ativo/inativo
  async toggleStatus(isAtivo) {
    try {
      const result = await pool.query(
        'UPDATE usuarios SET is_ativo = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING is_ativo',
        [isAtivo, this.id]
      );

      this.is_ativo = result.rows[0].is_ativo;
      return this.is_ativo;
    } catch (error) {
      throw error;
    }
  }

  // Deletar usuário (soft delete ou hard delete)
  async delete() {
    try {
      // Verificar se usuário tem pedidos
      const pedidosExist = await pool.query(
        'SELECT id FROM pedidos WHERE consumidor_id = $1 OR produtor_id = $1 LIMIT 1',
        [this.id]
      );

      if (pedidosExist.rows.length > 0) {
        // Se tem pedidos, apenas desativa (soft delete)
        await this.toggleStatus(false);
        return { action: 'deactivated' };
      }

      // Se não tem pedidos, pode deletar (hard delete)
      await pool.query('DELETE FROM usuarios WHERE id = $1', [this.id]);
      return { action: 'deleted' };

    } catch (error) {
      throw error;
    }
  }

  // Verificar senha
  async validatePassword(senha) {
    try {
      return await bcrypt.compare(senha, this.senha_hash);
    } catch (error) {
      throw error;
    }
  }

  // Estatísticas de usuários
  static async getStats() {
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

      return stats.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Formatar dados do usuário para resposta
  static formatUserData(row) {
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
    if (row.cep) {
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

    return user;
  }

  // Converter para JSON (remover dados sensíveis)
  toJSON() {
    const { senha_hash, ...userData } = this;
    return userData;
  }
}

module.exports = User;