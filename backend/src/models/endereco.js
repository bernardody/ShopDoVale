const { Pool } = require('pg');

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

class Endereco {
  constructor(data = {}) {
    this.id = data.id;
    this.cep = data.cep;
    this.logradouro = data.logradouro;
    this.numero = data.numero;
    this.complemento = data.complemento;
    this.bairro = data.bairro;
    this.cidade = data.cidade;
    this.estado = data.estado;
    this.created_at = data.created_at;
  }

  // Buscar endereço por ID
  static async findById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM enderecos WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return new Endereco(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Buscar endereços por CEP
  static async findByCep(cep) {
    try {
      const cepLimpo = cep.replace(/\D/g, '');
      
      const result = await pool.query(
        'SELECT * FROM enderecos WHERE cep = $1 ORDER BY created_at DESC',
        [cepLimpo]
      );

      return result.rows.map(row => new Endereco(row));
    } catch (error) {
      throw error;
    }
  }

  // Buscar endereços por cidade e estado
  static async findByCidadeEstado(cidade, estado) {
    try {
      const result = await pool.query(`
        SELECT DISTINCT cep, logradouro, bairro, cidade, estado
        FROM enderecos 
        WHERE UPPER(cidade) = UPPER($1) AND UPPER(estado) = UPPER($2)
        ORDER BY logradouro, bairro
      `, [cidade, estado]);

      return result.rows.map(row => new Endereco(row));
    } catch (error) {
      throw error;
    }
  }

  // Listar endereços com filtros e paginação
  static async findAll(filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        cidade,
        estado,
        bairro,
        search,
        orderBy = 'created_at',
        order = 'DESC'
      } = filters;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams = [];
      let paramCount = 0;

      // Filtros
      if (cidade) {
        paramCount++;
        whereConditions.push(`UPPER(cidade) LIKE UPPER($${paramCount})`);
        queryParams.push(`%${cidade}%`);
      }

      if (estado) {
        paramCount++;
        whereConditions.push(`UPPER(estado) = UPPER($${paramCount})`);
        queryParams.push(estado);
      }

      if (bairro) {
        paramCount++;
        whereConditions.push(`UPPER(bairro) LIKE UPPER($${paramCount})`);
        queryParams.push(`%${bairro}%`);
      }

      if (search) {
        paramCount++;
        whereConditions.push(`(
          UPPER(logradouro) LIKE UPPER($${paramCount}) OR 
          UPPER(bairro) LIKE UPPER($${paramCount}) OR
          UPPER(cidade) LIKE UPPER($${paramCount}) OR
          cep LIKE $${paramCount}
        )`);
        queryParams.push(`%${search}%`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Validar campos de ordenação
      const validOrderFields = ['created_at', 'cidade', 'estado', 'bairro', 'logradouro', 'cep'];
      const orderField = validOrderFields.includes(orderBy) ? orderBy : 'created_at';
      const orderDirection = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      // Query principal
      const query = `
        SELECT *
        FROM enderecos
        ${whereClause}
        ORDER BY ${orderField} ${orderDirection}
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
      `;

      queryParams.push(parseInt(limit), offset);

      const result = await pool.query(query, queryParams);

      // Query para contar total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM enderecos
        ${whereClause}
      `;

      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      const enderecos = result.rows.map(row => new Endereco(row));

      return {
        enderecos,
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

  // Criar endereço
  static async create(enderecoData) {
    try {
      const {
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado
      } = enderecoData;

      // Limpar CEP (remover caracteres não numéricos)
      const cepLimpo = cep.replace(/\D/g, '');

      // Validar CEP
      if (cepLimpo.length !== 8) {
        throw new Error('CEP deve conter 8 dígitos');
      }

      // Validar estado (2 caracteres)
      if (estado.length !== 2) {
        throw new Error('Estado deve conter 2 caracteres');
      }

      const result = await pool.query(`
        INSERT INTO enderecos (cep, logradouro, numero, complemento, bairro, cidade, estado)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        cepLimpo,
        logradouro.trim(),
        numero.trim(),
        complemento ? complemento.trim() : null,
        bairro.trim(),
        cidade.trim(),
        estado.trim().toUpperCase()
      ]);

      return new Endereco(result.rows[0]);
    } catch (error) {
      throw error;
    }
  }

  // Atualizar endereço
  async update(updateData) {
    try {
      const {
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado
      } = updateData;

      const updateFields = [];
      const updateValues = [];
      let paramCount = 0;

      if (cep) {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) {
          throw new Error('CEP deve conter 8 dígitos');
        }
        paramCount++;
        updateFields.push(`cep = $${paramCount}`);
        updateValues.push(cepLimpo);
      }

      if (logradouro) {
        paramCount++;
        updateFields.push(`logradouro = $${paramCount}`);
        updateValues.push(logradouro.trim());
      }

      if (numero) {
        paramCount++;
        updateFields.push(`numero = $${paramCount}`);
        updateValues.push(numero.trim());
      }

      if (complemento !== undefined) {
        paramCount++;
        updateFields.push(`complemento = $${paramCount}`);
        updateValues.push(complemento ? complemento.trim() : null);
      }

      if (bairro) {
        paramCount++;
        updateFields.push(`bairro = $${paramCount}`);
        updateValues.push(bairro.trim());
      }

      if (cidade) {
        paramCount++;
        updateFields.push(`cidade = $${paramCount}`);
        updateValues.push(cidade.trim());
      }

      if (estado) {
        if (estado.length !== 2) {
          throw new Error('Estado deve conter 2 caracteres');
        }
        paramCount++;
        updateFields.push(`estado = $${paramCount}`);
        updateValues.push(estado.trim().toUpperCase());
      }

      if (updateFields.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      paramCount++;
      updateValues.push(this.id);

      const updateQuery = `
        UPDATE enderecos 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, updateValues);

      if (result.rows.length === 0) {
        throw new Error('Endereço não encontrado');
      }

      // Atualizar propriedades do objeto atual
      Object.assign(this, result.rows[0]);
      return this;

    } catch (error) {
      throw error;
    }
  }

  // Deletar endereço
  async delete() {
    try {
      // Verificar se o endereço está sendo usado por usuários
      const usuariosExist = await pool.query(
        'SELECT id FROM usuarios WHERE endereco_id = $1 LIMIT 1',
        [this.id]
      );

      if (usuariosExist.rows.length > 0) {
        throw new Error('Não é possível deletar endereço em uso por usuários');
      }

      // Verificar se o endereço está sendo usado por pedidos
      const pedidosExist = await pool.query(
        'SELECT id FROM pedidos WHERE endereco_entrega_id = $1 LIMIT 1',
        [this.id]
      );

      if (pedidosExist.rows.length > 0) {
        throw new Error('Não é possível deletar endereço em uso por pedidos');
      }

      const result = await pool.query(
        'DELETE FROM enderecos WHERE id = $1 RETURNING id',
        [this.id]
      );

      return result.rows.length > 0;
    } catch (error) {
      throw error;
    }
  }

  // Validar CEP (formato brasileiro)
  static validateCep(cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    return cepLimpo.length === 8 && /^\d{8}$/.test(cepLimpo);
  }

  // Formatar CEP para exibição
  static formatCep(cep) {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      return `${cepLimpo.substr(0, 5)}-${cepLimpo.substr(5, 3)}`;
    }
    return cep;
  }

  // Buscar endereços próximos por CEP (primeiros 5 dígitos)
  static async findNearByCep(cep) {
    try {
      const cepLimpo = cep.replace(/\D/g, '');
      if (cepLimpo.length < 5) {
        throw new Error('CEP deve ter pelo menos 5 dígitos');
      }

      const prefixoCep = cepLimpo.substr(0, 5);

      const result = await pool.query(`
        SELECT DISTINCT cidade, estado, bairro
        FROM enderecos 
        WHERE cep LIKE $1
        ORDER BY cidade, bairro
        LIMIT 20
      `, [`${prefixoCep}%`]);

      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Estatísticas de endereços
  static async getStats() {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_enderecos,
          COUNT(DISTINCT cidade) as total_cidades,
          COUNT(DISTINCT estado) as total_estados,
          COUNT(DISTINCT bairro) as total_bairros,
          cidade as cidade_mais_comum,
          COUNT(*) as frequencia_cidade
        FROM enderecos
        GROUP BY cidade
        ORDER BY COUNT(*) DESC
        LIMIT 1
      `);

      const geral = await pool.query(`
        SELECT 
          COUNT(*) as total_enderecos,
          COUNT(DISTINCT cidade) as total_cidades,
          COUNT(DISTINCT estado) as total_estados,
          COUNT(DISTINCT bairro) as total_bairros
        FROM enderecos
      `);

      const estadosPopulares = await pool.query(`
        SELECT estado, COUNT(*) as total
        FROM enderecos
        GROUP BY estado
        ORDER BY COUNT(*) DESC
        LIMIT 5
      `);

      return {
        ...geral.rows[0],
        cidade_mais_comum: stats.rows[0]?.cidade_mais_comum || null,
        frequencia_cidade_mais_comum: stats.rows[0]?.frequencia_cidade || 0,
        estados_populares: estadosPopulares.rows
      };
    } catch (error) {
      throw error;
    }
  }

  // Formatar endereço completo para exibição
  formatCompleto() {
    let endereco = `${this.logradouro}, ${this.numero}`;
    
    if (this.complemento) {
      endereco += `, ${this.complemento}`;
    }
    
    endereco += ` - ${this.bairro}, ${this.cidade}/${this.estado}`;
    endereco += ` - CEP: ${Endereco.formatCep(this.cep)}`;
    
    return endereco;
  }

  // Validar dados do endereço
  static validateData(enderecoData) {
    const errors = [];

    if (!enderecoData.cep || !this.validateCep(enderecoData.cep)) {
      errors.push('CEP inválido');
    }

    if (!enderecoData.logradouro || enderecoData.logradouro.trim().length < 3) {
      errors.push('Logradouro deve ter pelo menos 3 caracteres');
    }

    if (!enderecoData.numero || enderecoData.numero.trim().length === 0) {
      errors.push('Número é obrigatório');
    }

    if (!enderecoData.bairro || enderecoData.bairro.trim().length < 2) {
      errors.push('Bairro deve ter pelo menos 2 caracteres');
    }

    if (!enderecoData.cidade || enderecoData.cidade.trim().length < 2) {
      errors.push('Cidade deve ter pelo menos 2 caracteres');
    }

    if (!enderecoData.estado || enderecoData.estado.length !== 2) {
      errors.push('Estado deve ter exatamente 2 caracteres');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      cep: Endereco.formatCep(this.cep),
      cep_raw: this.cep,
      logradouro: this.logradouro,
      numero: this.numero,
      complemento: this.complemento,
      bairro: this.bairro,
      cidade: this.cidade,
      estado: this.estado,
      endereco_completo: this.formatCompleto(),
      created_at: this.created_at
    };
  }
}

module.exports = Endereco;